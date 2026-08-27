import type { ScoreLabel } from "@/lib/schema";

const LABEL_TEXT: Record<ScoreLabel, string> = {
  recommended: "Recommended",
  good: "Good",
  limit: "Limit",
};

const LABEL_CLASSES: Record<ScoreLabel, string> = {
  recommended: "bg-recommended/15 text-recommended border-recommended/40",
  good: "bg-good/15 text-good border-good/40",
  limit: "bg-limit/15 text-limit border-limit/40",
};

export type ScoreBadgeProps = {
  label: ScoreLabel;
  score: number;
};

/** #16: teal / amber / red, readable at arm's length. */
export default function ScoreBadge({ label, score }: ScoreBadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${LABEL_CLASSES[label]}`}
    >
      {LABEL_TEXT[label]} · {score}
    </span>
  );
}
