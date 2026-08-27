import { NextResponse } from "next/server";
import { DEMO_MENU } from "@/lib/fixtures";
import { analyzeMenu } from "@/lib/llm";
import { AnalyzeRequest, type AnalyzeError } from "@/lib/schema";

export const runtime = "nodejs";
/** Vercel hobby allows 60s. We budget 25s inside analyzeMenu() and fail fast. */
export const maxDuration = 60;

function fail(code: AnalyzeError["code"], error: string, status: number) {
  return NextResponse.json({ error, code } satisfies AnalyzeError, { status });
}

/**
 * POST /api/analyze  { imageBase64, mimeType, prefs } -> AnalyzedMenu
 *
 * `?demo=1` (or DEMO_MODE=1) returns the fixtures without touching a model.
 * That short-circuit stays in forever - it is our stage insurance.
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

  try {
    const menu = await analyzeMenu(imageBase64, mimeType, prefs);

    if (!menu.isMenu) {
      return NextResponse.json(menu, { status: 422 });
    }

    return NextResponse.json(menu);
  } catch (error) {
    // TODO(#18): timeout, repair retry, item cap. TODO(#19): OpenAI fallback.
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
