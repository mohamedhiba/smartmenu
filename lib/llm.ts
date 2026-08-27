import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import OpenAI from "openai";
import { z } from "zod";
import { AnalyzedMenu, MenuItem, type Prefs } from "./schema";

/**
 * Primary model. Overridable by env - gemini-2.5-flash was retired for new API
 * keys mid-build, so being able to move models without a code change is not
 * hypothetical.
 *
 * flash-lite is the primary because it is measurably better here, not because
 * it is cheaper. On the hardest real menu we have (39 items, laminated, glare)
 * it returns all 20 capped items in 8-10s, where gemini-3.6-flash took 14-25s
 * and was blowing the 40s budget in production once a rate-limited key forced a
 * rotation. Same items, same language, same allergen flags.
 */
export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite";

/**
 * Second Gemini model, tried before crossing to another provider.
 *
 * Rate limits are per model per project, so a different model is a different
 * bucket - which makes this the fallback most likely to actually fire on the
 * free tier. It is also faster than the primary (~7s vs ~11s), so it costs
 * little when we are already short of budget.
 */
export const GEMINI_FALLBACK_MODEL =
  process.env.GEMINI_FALLBACK_MODEL ?? "gemini-3.6-flash";

/**
 * What we ask the model for: the contract minus `id`.
 *
 * Models are unreliable at inventing unique ids and it costs tokens to ask.
 * We slugify `originalName` ourselves after parsing, which also guarantees the
 * uniqueness that /menu/[id] depends on.
 */
const MenuItemDraft = MenuItem.omit({ id: true });
const AnalyzedMenuDraft = AnalyzedMenu.extend({
  items: z.array(MenuItemDraft),
});

/**
 * Gemini's `responseJsonSchema` accepts a subset of JSON Schema. `$schema` and
 * `default` are not in it, and anything optional invites the model to skip it.
 *
 * So we derive the schema from the single source of truth in schema.ts and then
 * sanitise it: drop unsupported keywords, and make every property required so
 * the model always fills the whole object. zod still applies real defaults when
 * it parses the response.
 */
function toModelSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toModelSchema);
  if (node === null || typeof node !== "object") return node;

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key === "$schema" || key === "default") continue;
    out[key] = toModelSchema(value);
  }

  if (out.type === "object" && out.properties) {
    out.required = Object.keys(out.properties as Record<string, unknown>);
    out.additionalProperties = false;
  }
  return out;
}

export const MENU_RESPONSE_SCHEMA = toModelSchema(
  z.toJSONSchema(AnalyzedMenuDraft, { io: "input" }),
);

/**
 * OpenAI's strict structured-output mode accepts an even smaller subset than
 * Gemini: numeric and length constraints are rejected outright. `confidence`
 * carries minimum/maximum, so the fallback needs its own copy with those gone.
 */
const UNSUPPORTED_BY_OPENAI = new Set([
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "minLength",
  "maxLength",
  "minItems",
  "maxItems",
  "pattern",
  "format",
  "multipleOf",
]);

function stripStrictUnsupported(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(stripStrictUnsupported);
  if (node === null || typeof node !== "object") return node;

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (UNSUPPORTED_BY_OPENAI.has(key)) continue;
    out[key] = stripStrictUnsupported(value);
  }
  return out;
}

export const OPENAI_RESPONSE_SCHEMA = stripStrictUnsupported(
  MENU_RESPONSE_SCHEMA,
);

/** "Bruschetta al Pomodoro" -> "bruschetta-al-pomodoro" */
function slugify(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "dish"
  );
}

function withStableIds(items: z.infer<typeof MenuItemDraft>[]) {
  const seen = new Map<string, number>();
  return items.map((item) => {
    const base = slugify(item.originalName || item.translatedName);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return { ...item, id: n === 0 ? base : `${base}-${n + 1}` };
  });
}

export function buildPrompt(prefs: Prefs): string {
  return `You are reading a photograph of a restaurant menu.

Return every dish you can read, in the order it appears on the menu.

For each dish:
- originalName: the dish name exactly as printed, including accents. Do not translate this field.
- translatedName: a natural, appetising name in ${prefs.targetLang}. Translate the meaning, not word for word. "Tagliata di Manzo con Rucola" is "Sliced Beef with Rocket", not "Cut of Beef with Arugula".
- section: the menu section this dish sits under, translated into ${prefs.targetLang} (for example "Starters", "First courses", "Main courses", "Desserts"). If the menu has no sections, infer the most fitting one.
- category: one of pasta, fish, meat, risotto, dessert, salad, other. Pick the closest.
- ingredients: the main ingredients, in ${prefs.targetLang}. Include what the dish obviously contains even if the menu does not spell it out (carbonara contains egg and pork).
- nutrition: your best estimate for one restaurant portion as served. calories in kcal, protein/carbs/fat in grams. A plate of pasta is 600-900 kcal, a green salad is 150-350, a grilled fish main is 350-550. Never return zeros.
- flags: vegan, vegetarian, glutenFree, containsNuts. Be careful and be strict:
  - wheat pasta, bread, breaded or battered dishes and most desserts are NOT glutenFree
  - pesto contains pine nuts, so containsNuts is true; so are most pastries and anything with almonds or walnuts
  - anything with cheese, butter, cream, egg, honey, fish or meat is NOT vegan
  - anything with fish, shellfish or meat is NOT vegetarian
- confidence: 0 to 1, how sure you are about this dish. Lower it when the text is blurry or the dish is unfamiliar.

Also return:
- sourceLang: the language the menu is written in, as a short code such as "it", "fr", "es".
- isMenu: true if this image really is a food or drink menu.
- rejectionReason: null when isMenu is true. When the image is not a menu, set isMenu to false, return an empty items array, and put one short friendly sentence here describing what you actually see, such as "This looks like a photo of a person, not a menu."

Return at most ${MAX_ITEMS} dishes. If the menu lists more than that, return the
first ${MAX_ITEMS} in the order they appear and stop.

Read only what is on the menu. Do not invent dishes that are not there.`;
}

/** Every key we can try, in order. Never log these. */
function geminiKeys(): string[] {
  const raw = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ]
    // A single var may also hold a comma-separated list, which is the easiest
    // thing to paste into one Vercel environment variable.
    .flatMap((value) => (value ?? "").split(","))
    .map((value) => value.trim())
    .filter(Boolean);

  return [...new Set(raw)];
}

/**
 * Where to start in the key list. Rotating the starting point spreads load
 * instead of hammering key 1 until it 429s, which matters because the free
 * tier rate-limits per key and three of us are testing.
 */
let cursor = 0;

/** True for failures another key might survive: quota, rate limit, 5xx. */
function isKeyExhausted(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (status === 429 || status === 500 || status === 503) return true;

  const message = String((error as Error)?.message ?? "").toLowerCase();
  return (
    message.includes("429") ||
    message.includes("resource_exhausted") ||
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("overloaded") ||
    message.includes("unavailable")
  );
}

/**
 * True when the model itself is gone or unusable for this key.
 *
 * Not hypothetical: Google retired gemini-2.5-flash for new API keys during
 * this build and it started returning 404. A retired model is exactly when the
 * second model should be tried, so this counts as worth falling back on - but
 * an obviously wrong request does not.
 */
function isModelUnavailable(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (status === 404) return true;

  const message = String((error as Error)?.message ?? "").toLowerCase();
  return (
    message.includes("is not found") ||
    message.includes("no longer available") ||
    message.includes("not supported for generatecontent")
  );
}

/** Thrown when every key is rate-limited. The route maps this to a 429. */
export class AllKeysExhaustedError extends Error {
  constructor(readonly keyCount: number) {
    super(`All ${keyCount} Gemini key(s) are rate-limited or unavailable`);
    this.name = "AllKeysExhaustedError";
  }
}

/** Thrown when we run out of time. The route maps this to a 504. */
export class AnalyzeTimeoutError extends Error {
  constructor(readonly budgetMs: number) {
    super(`Gave up after ${budgetMs}ms`);
    this.name = "AnalyzeTimeoutError";
  }
}

/** Thrown when the model answered but the answer does not fit the contract. */
export class InvalidMenuDataError extends Error {
  constructor(readonly detail: string) {
    super(`Model returned data that does not match the contract: ${detail}`);
    this.name = "InvalidMenuDataError";
  }
}

/**
 * Total wall-clock budget for one analyze request.
 *
 * This was 25s, which measurement showed was simply too tight: a 20-item menu
 * takes 20-25s to generate and was 504ing on roughly two runs in three. The
 * work genuinely takes that long, so failing it early just turned a slow
 * success into a failure.
 *
 * 40s leaves headroom for a large menu plus one fallback attempt, and still
 * sits inside Vercel's 60s function ceiling. A small menu is unaffected - those
 * come back in 9-15s. The processing screen narrates the wait so it does not
 * read as a hang.
 */
export const ANALYZE_BUDGET_MS = 40_000;

/**
 * Below this there is no point starting another attempt - a successful read
 * takes about 9-12s, so anything less is almost certainly wasted wall clock.
 */
const MIN_ATTEMPT_MS = 8_000;

/**
 * Gemini rejects a manually set deadline under 10s outright
 * ("Minimum allowed deadline is 10s"), so we only pass httpOptions.timeout when
 * we have that much left. The AbortController still bounds shorter windows.
 */
const MIN_SERVER_DEADLINE_MS = 10_000;

/** A two-page menu should not blow up the payload or the UI. */
export const MAX_ITEMS = 20;

/**
 * Plausible ranges for a single restaurant portion.
 *
 * The model is estimating, not looking anything up, so it will occasionally
 * produce a 5000 kcal salad or a steak with no protein. Those are the errors a
 * judge spots instantly, and they poison the scoring too - scoreDish() reads
 * these numbers directly, so one absurd value moves a dish to the top or bottom
 * of the ranking for no reason.
 */
const SANE = {
  calories: [50, 2000],
  protein: [0, 150],
  carbs: [0, 250],
  fat: [0, 150],
} as const;

/** Grams of macro cannot exceed the calories they would have to supply. */
const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 } as const;

function isImplausible(n: {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}): boolean {
  for (const [key, [min, max]] of Object.entries(SANE)) {
    const value = n[key as keyof typeof SANE];
    if (!Number.isFinite(value) || value < min || value > max) return true;
  }

  // A dish whose macros imply far more energy than its own calorie count is
  // internally inconsistent, whatever the individual numbers look like.
  const implied =
    n.protein * KCAL_PER_G.protein +
    n.carbs * KCAL_PER_G.carbs +
    n.fat * KCAL_PER_G.fat;

  return implied > n.calories * 2.2 || implied < n.calories * 0.35;
}

/** Names of dishes whose numbers we do not believe. */
export function implausibleDishes(items: { translatedName: string; nutrition: Parameters<typeof isImplausible>[0] }[]) {
  return items.filter((i) => isImplausible(i.nutrition)).map((i) => i.translatedName);
}

/** Appended on the one repair attempt, after the model broke the contract. */
const REPAIR_HINT = `

Your previous response was rejected. Return ONLY valid JSON matching the schema
exactly - every field is required, and no commentary.

Check the nutrition especially. Each dish is ONE restaurant portion: 50-2000 kcal,
and the macros must roughly add up to the calories (protein and carbs are 4 kcal
per gram, fat is 9). A salad is not 5000 kcal and a steak is not 0g protein.`;

function isAbort(error: unknown): boolean {
  const name = (error as Error)?.name ?? "";
  const status = (error as { status?: number })?.status;
  const message = String((error as Error)?.message ?? "").toLowerCase();
  return (
    name === "AbortError" ||
    name === "TimeoutError" ||
    // Gemini reports its own server-side deadline as a 504 DEADLINE_EXCEEDED.
    // That is a timeout, not a generic upstream failure, and the difference
    // matters: the UI tells the user to retry rather than to change the photo.
    status === 504 ||
    message.includes("deadline") ||
    message.includes("aborted") ||
    message.includes("timed out") ||
    message.includes("timeout")
  );
}

/**
 * The one call that replaces OCR, structuring, translation and nutrition lookup.
 *
 * Everything happens inside one wall-clock budget. Within it we may rotate past
 * a rate-limited key and spend one attempt repairing a response that broke the
 * contract - but we never run past the deadline, because a spinner that never
 * resolves is worse than an error.
 *
 * The OpenAI cross-provider fallback lands in #19.
 */
export async function analyzeMenu(
  imageBase64: string,
  mimeType: string,
  prefs: Prefs,
  budgetMs: number = ANALYZE_BUDGET_MS,
): Promise<AnalyzedMenu> {
  const deadline = Date.now() + budgetMs;

  try {
    return await analyzeWithGemini(
      imageBase64,
      mimeType,
      prefs,
      deadline,
      GEMINI_MODEL,
    );
  } catch (error) {
    // Only fall back when the failure is one a different model or provider
    // might not share. A blown deadline is not: there is no time left, and a
    // second attempt only makes the wait worse.
    const worthFallback =
      error instanceof AllKeysExhaustedError ||
      error instanceof InvalidMenuDataError ||
      (!(error instanceof AnalyzeTimeoutError) &&
        (isKeyExhausted(error) || isModelUnavailable(error)));

    if (!worthFallback) throw error;

    // Tier 2: a different Gemini model. Rate limits are per model per project,
    // so this is a different bucket and the tier most likely to actually fire.
    if (deadline - Date.now() >= MIN_ATTEMPT_MS) {
      try {
        console.warn(`[analyze] ${GEMINI_MODEL} failed, trying ${GEMINI_FALLBACK_MODEL}`);
        return await analyzeWithGemini(
          imageBase64,
          mimeType,
          prefs,
          deadline,
          GEMINI_FALLBACK_MODEL,
        );
      } catch (secondModelError) {
        if (isAbort(secondModelError)) throw new AnalyzeTimeoutError(budgetMs);
        console.warn("[analyze] second Gemini model also failed");
      }
    }

    // Tier 3: another provider entirely.
    if (!openAIKey() || deadline - Date.now() < MIN_ATTEMPT_MS) throw error;

    console.warn("[analyze] falling back to OpenAI");
    try {
      return await analyzeWithOpenAI(
        imageBase64,
        mimeType,
        prefs,
        deadline - Date.now(),
      );
    } catch (fallbackError) {
      if (isAbort(fallbackError)) throw new AnalyzeTimeoutError(budgetMs);
      // Report the original failure - it is the more informative one.
      console.error("[analyze] OpenAI fallback also failed:", fallbackError);
      throw error;
    }
  }
}

async function analyzeWithGemini(
  imageBase64: string,
  mimeType: string,
  prefs: Prefs,
  deadline: number,
  model: string,
): Promise<AnalyzedMenu> {
  const keys = geminiKeys();
  if (keys.length === 0) throw new Error("No GEMINI_API_KEY is set");

  const budgetMs = deadline - Date.now();
  const start = cursor++ % keys.length;

  let repairUsed = false;
  let lastInvalid: InvalidMenuDataError | null = null;

  // One extra pass beyond the key count leaves room for the repair attempt.
  for (let attempt = 0; attempt <= keys.length; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining < MIN_ATTEMPT_MS) {
      if (lastInvalid) throw lastInvalid;
      throw new AnalyzeTimeoutError(budgetMs);
    }

    const index = (start + attempt) % keys.length;
    try {
      return await callGemini(
        keys[index],
        imageBase64,
        mimeType,
        prefs,
        remaining,
        repairUsed,
        model,
      );
    } catch (error) {
      if (isAbort(error)) throw new AnalyzeTimeoutError(budgetMs);

      if (error instanceof InvalidMenuDataError) {
        // The model answered, so its key is fine. Spend one attempt telling it
        // to try again properly; a second failure is not worth the wall clock.
        if (repairUsed) throw error;
        repairUsed = true;
        lastInvalid = error;
        console.warn("[analyze] contract violation, attempting one repair");
        continue;
      }

      if (isKeyExhausted(error)) {
        console.warn(
              `[analyze] ${model} key ${index + 1}/${keys.length} exhausted, rotating`,
        );
        continue;
      }

      throw error;
    }
  }

  if (lastInvalid) throw lastInvalid;
  throw new AllKeysExhaustedError(keys.length);
}

function openAIKey(): string | null {
  return process.env.OPENAI_API_KEY?.trim() || null;
}

/** Overridable so we can move models without a code change mid-hackathon. */
export const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o";

/**
 * The cross-provider fallback. Same signature, same contract out - nothing
 * outside this file should know two providers exist.
 *
 * Only reached when every Gemini key is spent or Gemini keeps breaking the
 * contract, which is exactly when a second opinion is worth the wall clock.
 *
 * Exported so the fallback can be exercised on its own - otherwise the only way
 * to test it is to wait for Gemini to actually fail.
 */
export async function analyzeWithOpenAI(
  imageBase64: string,
  mimeType: string,
  prefs: Prefs,
  remainingMs: number,
): Promise<AnalyzedMenu> {
  const apiKey = openAIKey();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const client = new OpenAI({ apiKey, timeout: remainingMs, maxRetries: 0 });

  const completion = await client.chat.completions.create(
    {
      model: OPENAI_MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: buildPrompt(prefs) },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${imageBase64}` },
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "analyzed_menu",
          strict: true,
          schema: OPENAI_RESPONSE_SCHEMA as Record<string, unknown>,
        },
      },
    },
    { timeout: remainingMs },
  );

  const text = completion.choices[0]?.message?.content;
  if (!text) throw new InvalidMenuDataError("empty response from OpenAI");

  let draft;
  try {
    draft = AnalyzedMenuDraft.parse(JSON.parse(text));
  } catch (error) {
    throw new InvalidMenuDataError(
      error instanceof Error ? error.message.slice(0, 200) : "unparseable",
    );
  }

  draft.items = draft.items.slice(0, MAX_ITEMS);

  return AnalyzedMenu.parse({
    ...draft,
    items: withStableIds(draft.items),
  });
}

async function callGemini(
  apiKey: string,
  imageBase64: string,
  mimeType: string,
  prefs: Prefs,
  remainingMs: number,
  repair: boolean,
  model: string,
): Promise<AnalyzedMenu> {
  const ai = new GoogleGenAI({ apiKey });

  // Two belts: the SDK's own HTTP timeout, and an abort signal so we stop
  // waiting even if the socket stays open.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), remainingMs);

  let response;
  try {
    response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: imageBase64 } },
            { text: buildPrompt(prefs) + (repair ? REPAIR_HINT : "") },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: MENU_RESPONSE_SCHEMA,
        // The menu is in the image; there is little to reason about at length.
        // Default thinking costs ~21s on a printed menu, LOW gets the same answer
        // in ~9s. Gemini 3.x replaced thinkingBudget with thinkingLevel.
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        abortSignal: controller.signal,
        ...(remainingMs >= MIN_SERVER_DEADLINE_MS
          ? { httpOptions: { timeout: remainingMs } }
          : {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }

  const text = response.text;
  if (!text) throw new InvalidMenuDataError("empty response");

  let draft;
  try {
    draft = AnalyzedMenuDraft.parse(JSON.parse(text));
  } catch (error) {
    throw new InvalidMenuDataError(
      error instanceof Error ? error.message.slice(0, 200) : "unparseable",
    );
  }

  // Cap before validating so a huge menu cannot blow up the payload.
  draft.items = draft.items.slice(0, MAX_ITEMS);

  // Nutrition is estimated, so it is occasionally nonsense - a 5000 kcal salad,
  // a steak with no protein. Those are what a judge notices, and scoreDish()
  // reads these numbers directly, so one bad value distorts the ranking. Treat
  // it as a contract violation on the first pass so the repair attempt can fix
  // it; accept it on the repair rather than failing the whole request.
  if (!repair && draft.isMenu) {
    const bad = implausibleDishes(draft.items);
    if (bad.length > 0) {
      throw new InvalidMenuDataError(
        `implausible nutrition for: ${bad.slice(0, 3).join(", ")}`,
      );
    }
  }

  return AnalyzedMenu.parse({
    ...draft,
    items: withStableIds(draft.items),
  });
}
