import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { AnalyzedMenu, MenuItem, type Prefs } from "./schema";

export const GEMINI_MODEL = "gemini-2.5-flash";

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

/**
 * The one call that replaces OCR, structuring, translation and nutrition lookup.
 *
 * Throws on transport or parse failure. Timeout, retry and provider fallback
 * are deliberately not here yet - they land in #18 and #19.
 */
export async function analyzeMenu(
  imageBase64: string,
  mimeType: string,
  prefs: Prefs,
): Promise<AnalyzedMenu> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType, data: imageBase64 } },
          { text: buildPrompt(prefs) },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: MENU_RESPONSE_SCHEMA,
      // The menu is in the image; there is nothing to reason about at length.
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const text = response.text;
  if (!text) throw new Error("Gemini returned an empty response");

  const draft = AnalyzedMenuDraft.parse(JSON.parse(text));

  return AnalyzedMenu.parse({
    ...draft,
    items: withStableIds(draft.items),
  });
}
