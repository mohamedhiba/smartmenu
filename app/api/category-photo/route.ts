import { existsSync } from "node:fs";
import path from "node:path";
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

/** Image-capable model. Overridable, since these move often. */
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image";

/**
 * #27: in-memory, process-lifetime cache. Only 7 categories ever exist, so one
 * successful generation per category is all this needs.
 *
 * A *failure* is cached separately and only briefly. Caching null forever meant
 * that once the daily image quota ran out, a long-lived server never tried
 * again even after the quota reset.
 */
const cache = new Map<Category, CategoryPhoto>();
const failedUntil = new Map<Category, number>();
const FAILURE_TTL_MS = 10 * 60 * 1000;

async function generateCategoryPhoto(category: Category): Promise<CategoryPhoto | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });

  // generateImages() + Imagen is Gemini Enterprise / Vertex only - on an AI
  // Studio key it fails with "This method is only supported by the Gemini
  // Enterprise Agent Platform", so it could never have worked here. Image
  // models are driven through generateContent instead.
  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: [{ role: "user", parts: [{ text: CATEGORY_PROMPT[category] }] }],
  });

  const image = response.candidates?.[0]?.content?.parts?.find(
    (part) => part.inlineData,
  )?.inlineData;

  if (!image?.data) return null;

  return { url: `data:${image.mimeType ?? "image/png"};base64,${image.data}` };
}

/**
 * A committed file always wins.
 *
 * Generating on demand costs a daily-quota request and several seconds, on the
 * one screen we least want to slow down. Running `scripts/generate-category-photos.mjs`
 * once writes these into public/dishes/ so the demo serves them statically.
 */
function staticPhoto(category: Category): string | null {
  for (const ext of ["jpg", "png", "webp"]) {
    if (existsSync(path.join(process.cwd(), "public", "dishes", `${category}.${ext}`))) {
      return `/dishes/${category}.${ext}`;
    }
  }
  return null;
}

/** GET /api/category-photo?category=pasta -> CategoryPhoto | null */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("category");

  if (!raw || !(CATEGORIES as readonly string[]).includes(raw)) {
    return NextResponse.json({ error: "Unknown category" }, { status: 400 });
  }
  const category = raw as Category;

  const committed = staticPhoto(category);
  if (committed) return NextResponse.json({ url: committed });

  const cached = cache.get(category);
  if (cached) return NextResponse.json(cached);

  const backoff = failedUntil.get(category);
  if (backoff && Date.now() < backoff) return NextResponse.json(null);

  try {
    const photo = await generateCategoryPhoto(category);
    if (photo) {
      cache.set(category, photo);
      return NextResponse.json(photo);
    }
    failedUntil.set(category, Date.now() + FAILURE_TTL_MS);
    return NextResponse.json(null);
  } catch (error) {
    // No key, daily image quota gone, safety-filtered - the gradient tile covers
    // us either way, so this is never fatal. Retry after the backoff.
    console.warn(`[category-photo] ${category} failed:`, String(error).slice(0, 120));
    failedUntil.set(category, Date.now() + FAILURE_TTL_MS);
    return NextResponse.json(null);
  }
}
