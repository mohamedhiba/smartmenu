import { NextResponse } from "next/server";
import { DEMO_MENU } from "@/lib/fixtures";
import {
  AllKeysExhaustedError,
  AnalyzeTimeoutError,
  InvalidMenuDataError,
  analyzeMenu,
} from "@/lib/llm";
import { AnalyzeRequest, type AnalyzeError } from "@/lib/schema";

export const runtime = "nodejs";
/** Vercel hobby allows 60s. We budget 25s inside analyzeMenu() and fail fast. */
export const maxDuration = 60;

/**
 * Vercel rejects request bodies over 4.5MB before our code ever runs, so we
 * stop short of that ourselves and return an error the UI can explain.
 * base64 is 4 chars per 3 bytes, so this is roughly a 3MB image - far above
 * what lib/image.ts should ever send after downscaling.
 */
const MAX_IMAGE_BASE64_CHARS = 4_000_000;

function fail(code: AnalyzeError["code"], error: string, status: number) {
  return NextResponse.json({ error, code } satisfies AnalyzeError, { status });
}

/**
 * POST /api/analyze  { imageBase64, mimeType, prefs } -> AnalyzedMenu
 *
 * `?demo=1` (or DEMO_MODE=1) returns the fixtures without touching a model.
 * That short-circuit stays in forever - it is our stage insurance.
 *
 * The rule here is that this endpoint never returns a blank 500. Every failure
 * either carries an AnalyzeError the UI can render, or degrades to fixtures.
 */
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);

  if (searchParams.get("demo") === "1" || process.env.DEMO_MODE === "1") {
    return NextResponse.json(DEMO_MENU);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("bad_request", "Body must be JSON.", 400);
  }

  const parsed = AnalyzeRequest.safeParse(body);
  if (!parsed.success) {
    return fail(
      "bad_request",
      "Expected { imageBase64, mimeType, prefs }.",
      400,
    );
  }

  const { imageBase64, mimeType, prefs } = parsed.data;

  if (imageBase64.length > MAX_IMAGE_BASE64_CHARS) {
    return fail(
      "image_too_large",
      "That photo is too large. Try again and it will be resized.",
      413,
    );
  }

  if (!mimeType.startsWith("image/")) {
    return fail("bad_request", "mimeType must be an image type.", 400);
  }

  try {
    const menu = await analyzeMenu(imageBase64, mimeType, prefs);

    if (!menu.isMenu) {
      return NextResponse.json(menu, { status: 422 });
    }

    return NextResponse.json(menu);
  } catch (error) {
    // TODO(#19): try OpenAI before giving up.
    if (error instanceof AnalyzeTimeoutError) {
      console.error("[analyze]", error.message);
      return fail("timeout", "That took too long. Try once more.", 504);
    }

    if (error instanceof AllKeysExhaustedError) {
      console.error("[analyze]", error.message);
      return fail("rate_limited", "Too many requests. Try again shortly.", 429);
    }

    if (error instanceof InvalidMenuDataError) {
      // The model answered twice and broke the contract twice. Rather than show
      // the judge an error, degrade to the demo menu - but say so in a header so
      // the UI can flag it instead of passing fixtures off as their photo.
      console.error("[analyze] falling back to fixtures:", error.message);
      return NextResponse.json(DEMO_MENU, {
        headers: { "X-SmartMenu-Fallback": "fixtures" },
      });
    }

    console.error("[analyze] failed:", error);
    return fail("upstream_failed", "Could not read that menu.", 502);
  }
}

export async function GET() {
  return fail(
    "bad_request",
    "Use POST with { imageBase64, mimeType, prefs }.",
    405,
  );
}
