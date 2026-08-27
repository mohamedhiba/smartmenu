import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { z } from "zod";
import { AnalyzedMenu, MenuItem, type Prefs } from "./schema";

export const GEMINI_MODEL = "gemini-3.6-flash";

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
 * Vercel would let us run to 60s, but a judge staring at a spinner gives up
 * long before that. Failing at 25s and showing something is better than
 * succeeding at 50s.
 */
export const ANALYZE_BUDGET_MS = 25_000;

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

/** Appended on the one repair attempt, after the model broke the contract. */
const REPAIR_HINT = `

Your previous response did not match the required schema. Return ONLY valid JSON
matching the schema exactly. Every field is required. Do not add commentary.`;

function isAbort(error: unknown): boolean {
  const name = (error as Error)?.name ?? "";
  const message = String((error as Error)?.message ?? "").toLowerCase();
  return (
    name === "AbortError" ||
    name === "TimeoutError" ||
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
  const keys = geminiKeys();
  if (keys.length === 0) throw new Error("No GEMINI_API_KEY is set");

  const deadline = Date.now() + budgetMs;
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
          `[analyze] key ${index + 1}/${keys.length} exhausted, rotating`,
        );
        continue;
      }

      throw error;
    }
  }

  if (lastInvalid) throw lastInvalid;
  throw new AllKeysExhaustedError(keys.length);
}

async function callGemini(
  apiKey: string,
  imageBase64: string,
  mimeType: string,
  prefs: Prefs,
  remainingMs: number,
  repair: boolean,
): Promise<AnalyzedMenu> {
  const ai = new GoogleGenAI({ apiKey });

  // Two belts: the SDK's own HTTP timeout, and an abort signal so we stop
  // waiting even if the socket stays open.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), remainingMs);

  let response;
  try {
    response = await ai.models.generateContent({
      model: GEMINI_MODEL,
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

  return AnalyzedMenu.parse({
    ...draft,
    items: withStableIds(draft.items),
  });
}
