import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { CATEGORIES, type Category } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 30;

type CategoryPhoto = { url: string };

const CATEGORY_PROMPT: Record<Category, string> = {
  pasta: "A professional overhead food photograph of a plate of pasta, restaurant menu style, appetizing, natural light, shallow depth of field",
  fish: "A professional overhead food photograph of a cooked fish dish, restaurant menu style, appetizing, natural light, shallow depth of field",
  meat: "A professional overhead food photograph of a cooked meat dish, restaurant menu style, appetizing, natural light, shallow depth of field",
  risotto: "A professional overhead food photograph of a bowl of risotto, restaurant menu style, appetizing, natural light, shallow depth of field",
  dessert: "A professional overhead food photograph of a plated dessert, restaurant menu style, appetizing, natural light, shallow depth of field",
  salad: "A professional overhead food photograph of a fresh salad, restaurant menu style, appetizing, natural light, shallow depth of field",
  other: "A professional overhead food photograph of a beautifully plated restaurant dish, appetizing, natural light, shallow depth of field",
};

/**
 * #27: in-memory, process-lifetime cache. Only 7 categories ever exist, so
 * one successful generation per category is all this needs - never
 * regenerate a category once we have (or definitively don't have) an image
 * for it. Resets on a cold serverless start, same tradeoff the rest of this
 * app already makes by keeping everything in memory instead of a database.
 */
const cache = new Map<Category, CategoryPhoto | null>();

async function generateCategoryPhoto(category: Category): Promise<CategoryPhoto | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateImages({
    model: "imagen-4.0-generate-001",
    prompt: CATEGORY_PROMPT[category],
    config: { numberOfImages: 1 },
  });

  const image = response.generatedImages?.[0]?.image;
  if (!image?.imageBytes) return null;

  return { url: `data:${image.mimeType ?? "image/png"};base64,${image.imageBytes}` };
}

/** GET /api/category-photo?category=pasta -> CategoryPhoto | null */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("category");

  if (!raw || !(CATEGORIES as readonly string[]).includes(raw)) {
    return NextResponse.json({ error: "Unknown category" }, { status: 400 });
  }
  const category = raw as Category;

  if (cache.has(category)) {
    return NextResponse.json(cache.get(category));
  }

  try {
    const photo = await generateCategoryPhoto(category);
    cache.set(category, photo);
    return NextResponse.json(photo);
  } catch {
    // No key, rate-limited, safety-filtered, whatever - the gradient tile covers us either way.
    cache.set(category, null);
    return NextResponse.json(null);
  }
}
