import { NextResponse } from "next/server";
import { z } from "zod";
import { MenuItem } from "@/lib/schema";

export const runtime = "nodejs";
/** Text-only, no image - this should be fast. Fail over to the heuristic well before Vercel's limit. */
export const maxDuration = 20;
const MODEL_TIMEOUT_MS = 8000;

/**
 * POST /api/ask-dish  { dish, question } -> { answer }
 *
 * Issue #28. Deliberately its own tiny endpoint instead of extending
 * /api/analyze: no image in the request, so it stays fast and cheap even
 * while the vision pipeline is slow or rate-limited.
 */
const AskDishRequest = z.object({
  dish: MenuItem,
  question: z.string().min(1).max(300),
});

type AskDishError = {
  error: string;
  code: "bad_request" | "upstream_failed";
};

const SPICY_WORDS = [
  "chili",
  "chile",
  "chilli",
  "peperoncino",
  "pepperoncini",
  "jalape",
  "cayenne",
  "harissa",
  "sriracha",
  "nduja",
  "hot pepper",
];

const CHEESE_WORDS = [
  "cheese",
  "mozzarella",
  "parmesan",
  "parmigiano",
  "pecorino",
  "ricotta",
  "mascarpone",
  "burrata",
  "provolone",
  "gorgonzola",
];

/** Keyword fallback. Runs with no API key, on model failure, and in ?demo=1 - it must never leave the user with nothing. */
function answerHeuristically(dish: z.infer<typeof MenuItem>, question: string): string {
  const q = question.toLowerCase();
  const ingredientsText = dish.ingredients.join(", ").toLowerCase();
  const mentionsAny = (words: string[]) => words.some((w) => ingredientsText.includes(w));

  if (/spicy|heat|hot\b/.test(q)) {
    return mentionsAny(SPICY_WORDS)
      ? `${dish.translatedName} lists ingredients that usually bring heat, so expect some spice. Ask your server to confirm how hot it's made.`
      : `Nothing in ${dish.translatedName}'s listed ingredients points to heat, so it's likely mild. Worth double-checking with the kitchen if you're sensitive to spice.`;
  }

  if (/cheese|dairy|lactose/.test(q)) {
    const hasCheese = mentionsAny(CHEESE_WORDS);
    return hasCheese
      ? `Yes, ${dish.translatedName} contains cheese (${dish.ingredients.filter((i) => CHEESE_WORDS.some((w) => i.toLowerCase().includes(w))).join(", ")}). Ask staff if the kitchen can leave it off.`
      : `${dish.translatedName} isn't listed with cheese, but it's worth confirming with staff in case it's used in a sauce or garnish.`;
  }

  if (/gluten/.test(q)) {
    return dish.flags.glutenFree
      ? `Yes, ${dish.translatedName} is marked gluten-free.`
      : `${dish.translatedName} isn't marked gluten-free based on its ingredients.`;
  }

  if (/vegan/.test(q)) {
    return dish.flags.vegan
      ? `Yes, ${dish.translatedName} is vegan.`
      : `${dish.translatedName} isn't vegan as listed - it includes ${dish.ingredients.join(", ")}.`;
  }

  if (/vegetarian/.test(q)) {
    return dish.flags.vegetarian
      ? `Yes, ${dish.translatedName} is vegetarian.`
      : `${dish.translatedName} isn't vegetarian - it includes meat or fish.`;
  }

  if (/nut/.test(q)) {
    return dish.flags.containsNuts
      ? `Yes, ${dish.translatedName} contains nuts.`
      : `${dish.translatedName} isn't flagged as containing nuts, but always confirm with staff if it's an allergy.`;
  }

  return `${dish.translatedName} is made with ${dish.ingredients.join(", ")}. For anything beyond that, your server can confirm with the kitchen.`;
}

function buildPrompt(dish: z.infer<typeof MenuItem>, question: string): string {
  return `You are a helpful restaurant assistant answering a diner's question about one dish on the menu. Use only the facts below - never invent ingredients or preparation details that aren't listed.

Dish: ${dish.translatedName} (menu name: ${dish.originalName})
Ingredients: ${dish.ingredients.join(", ")}
Nutrition per portion: ${dish.nutrition.calories} kcal, ${dish.nutrition.protein}g protein, ${dish.nutrition.carbs}g carbs, ${dish.nutrition.fat}g fat
Flags: vegan=${dish.flags.vegan}, vegetarian=${dish.flags.vegetarian}, glutenFree=${dish.flags.glutenFree}, containsNuts=${dish.flags.containsNuts}

Diner's question: "${question}"

Reply in 1-2 short sentences. If the listed facts don't cover it (e.g. a substitution the kitchen may or may not do), say so and suggest asking the server. Do not repeat the question back.`;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    const body: AskDishError = { error: "Malformed JSON body.", code: "bad_request" };
    return NextResponse.json(body, { status: 400 });
  }

  const parsed = AskDishRequest.safeParse(json);
  if (!parsed.success) {
    const body: AskDishError = {
      error: "Use POST with { dish: MenuItem, question: string }.",
      code: "bad_request",
    };
    return NextResponse.json(body, { status: 400 });
  }

  const { dish, question } = parsed.data;
  const { searchParams } = new URL(request.url);
  const forceDemo = searchParams.get("demo") === "1" || process.env.DEMO_MODE === "1";

  if (forceDemo || !process.env.GEMINI_API_KEY) {
    return NextResponse.json({ answer: answerHeuristically(dish, question) });
  }

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const result = await withTimeout(
      ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: buildPrompt(dish, question),
      }),
      MODEL_TIMEOUT_MS,
    );
    const answer = result.text?.trim();
    if (!answer) throw new Error("empty response");
    return NextResponse.json({ answer });
  } catch {
    // Model down, rate-limited or slow - the keyword fallback still answers. Never surface a 5xx here.
    return NextResponse.json({ answer: answerHeuristically(dish, question) });
  }
}

export async function GET() {
  const body: AskDishError = {
    error: "Use POST with { dish: MenuItem, question: string }.",
    code: "bad_request",
  };
  return NextResponse.json(body, { status: 405 });
}
