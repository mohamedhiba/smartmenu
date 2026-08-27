import type { Prefs, Scored } from "@/lib/schema";

/**
 * THE UI CONTRACT.
 *
 * Abigail builds everything in components/. Brandon builds app/**\/page.tsx.
 * These props are the seam between them, so neither has to open the other's files.
 *
 * Rule: pages own data, routing and state. Components own everything visible.
 * A page should contain no Tailwind class beyond layout.
 */

export type ScanScreenProps = {
  /** Fired with the raw File from the picker. The page handles downscale + upload. */
  onImage: (file: File) => void;
  /** True while the page is downscaling or waiting on /api/analyze. */
  busy: boolean;
  error?: string;
};

export type PrefsScreenProps = {
  value: Prefs;
  onChange: (next: Prefs) => void;
  onContinue: () => void;
};

/** 0 Extracting - 1 Translating - 2 Analyzing - 3 Ranking. */
export type ProcessingStage = 0 | 1 | 2 | 3;

export type ProcessingScreenProps = {
  stage: ProcessingStage;
  error?: string;
  onRetry: () => void;
};

export type SmartMenuScreenProps = {
  /** Already sorted by score, descending. The page does the sorting. */
  items: Scored[];
  onSelect: (id: string) => void;
  onRescan: () => void;
};

export type DishDetailsScreenProps = {
  dish: Scored;
  onBack: () => void;
};

/**
 * #28. Self-contained: it fetches /api/ask-dish itself rather than taking
 * onAsk/answer/busy props, since no page owns dish-details state yet.
 */
export type AskAboutDishProps = {
  dish: Scored;
};
