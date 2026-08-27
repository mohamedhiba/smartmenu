"use client";

import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import type { ProcessingScreenProps } from "@/components/types";
import Button from "@/components/ui/Button";

const STAGE_LABELS = ["Extracting", "Translating", "Analyzing", "Ranking"] as const;

/**
 * #15: turns 10-20s of waiting into part of the pitch. Stages are driven by
 * the page on a timer, not real pipeline events - one model call can't
 * report progress, and that's fine, it narrates what the product is doing.
 */
export default function ProcessingScreen({ stage, error, onRetry }: ProcessingScreenProps) {
  if (error) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
        <p className="text-limit text-sm">{error}</p>
        <Button onClick={onRetry}>Try again</Button>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col justify-center gap-8 py-12">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Reading your menu</h1>
        <p className="text-muted text-balance">
          A few seconds - we&apos;re translating and scoring every dish for your diet.
        </p>
      </div>

      <ol className="space-y-4">
        {STAGE_LABELS.map((label, i) => {
          const status = i < stage ? "done" : i === stage ? "current" : "upcoming";
          return (
            <li key={label} className="flex items-center gap-3">
              {status === "done" && <CheckCircle2 size={22} className="text-recommended shrink-0" />}
              {status === "current" && <Loader2 size={22} className="text-accent shrink-0 animate-spin" />}
              {status === "upcoming" && <Circle size={22} className="text-border shrink-0" />}
              <span
                className={
                  status === "current" ? "text-text text-sm font-medium" : "text-muted text-sm"
                }
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="bg-surface-2 h-1.5 w-full overflow-hidden rounded-full">
        <div className="bg-accent animate-shimmer-sweep h-full w-1/3 rounded-full" />
      </div>
    </main>
  );
}
