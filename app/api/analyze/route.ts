import { NextResponse } from "next/server";
import { DEMO_MENU } from "@/lib/fixtures";
import type { AnalyzeError } from "@/lib/schema";

export const runtime = "nodejs";
/** Vercel hobby allows 60s. We budget 25s inside analyzeMenu() and fail fast. */
export const maxDuration = 60;

/**
 * POST /api/analyze  { imageBase64, mimeType, prefs } -> AnalyzedMenu
 *
 * H0.5 stub: always returns the demo menu so the UI is never blocked on the
 * pipeline. Mohamed replaces the body with lib/llm.ts in issue #12; the demo
 * short-circuit below stays forever - it is our stage insurance.
 */
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);

  if (searchParams.get("demo") === "1" || process.env.DEMO_MODE === "1") {
    return NextResponse.json(DEMO_MENU);
  }

  // TODO(#12): parse AnalyzeRequest, call analyzeMenu(), zod-validate the result.
  return NextResponse.json(DEMO_MENU);
}

export async function GET() {
  const body: AnalyzeError = {
    error: "Use POST with { imageBase64, mimeType, prefs }.",
    code: "bad_request",
  };
  return NextResponse.json(body, { status: 405 });
}
