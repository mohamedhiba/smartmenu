import { z } from "zod";

/**
 * THE CONTRACT.
 *
 * This file is frozen after the H0.5 milestone. Changing a field name here means
 * changing lib/fixtures.ts, lib/scoring.ts and components/types.ts in the same PR.
 * If you need a new field, post in the team chat first.
 */

export const DIETS = [
  "none",
  "keto",
  "vegan",
  "vegetarian",
  "gluten_free",
  "paleo",
] as const;

export const CATEGORIES = [
  "pasta",
  "fish",
  "meat",
  "risotto",
  "dessert",
  "salad",
  "other",
] as const;

export const SCORE_LABELS = ["recommended", "good", "limit"] as const;

export type Diet = (typeof DIETS)[number];
export type Category = (typeof CATEGORIES)[number];
export type ScoreLabel = (typeof SCORE_LABELS)[number];

/** User dietary preferences, collected on /preferences. */
export const Prefs = z.object({
  diet: z.enum(DIETS).default("none"),
  lowCarb: z.boolean().default(false),
  highProtein: z.boolean().default(false),
  noNuts: z.boolean().default(false),
  targetLang: z.string().default("en"),
});
export type Prefs = z.infer<typeof Prefs>;

export const DEFAULT_PREFS: Prefs = {
  diet: "none",
  lowCarb: false,
  highProtein: false,
  noNuts: false,
  targetLang: "en",
};

/** Per-dish macros. Grams for protein/carbs/fat, kcal for calories. */
export const Nutrition = z.object({
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
});
export type Nutrition = z.infer<typeof Nutrition>;

export const Flags = z.object({
  vegan: z.boolean(),
  vegetarian: z.boolean(),
  glutenFree: z.boolean(),
  containsNuts: z.boolean(),
});
export type Flags = z.infer<typeof Flags>;

export const MenuItem = z.object({
  id: z.string(),
  /** Dish name exactly as printed on the menu. */
  originalName: z.string(),
  /** Dish name in Prefs.targetLang. */
  translatedName: z.string(),
  /** Menu section, translated. "Starters", "First courses", ... */
  section: z.string(),
  category: z.enum(CATEGORIES),
  ingredients: z.array(z.string()),
  nutrition: Nutrition,
  flags: Flags,
  /** 0-1. Below 0.5 the UI shows an "estimated" hint. */
  confidence: z.number().min(0).max(1).default(0.8),
});
export type MenuItem = z.infer<typeof MenuItem>;

export const AnalyzedMenu = z.object({
  /** False when the photo is not a menu. Drives the friendly rejection screen. */
  isMenu: z.boolean().default(true),
  /** Human-readable reason, only set when isMenu is false. */
  rejectionReason: z.string().nullable().default(null),
  /** BCP-47-ish language code detected on the menu, e.g. "it". */
  sourceLang: z.string(),
  items: z.array(MenuItem),
});
export type AnalyzedMenu = z.infer<typeof AnalyzedMenu>;

/** A MenuItem after lib/scoring.ts has ranked it against the user's Prefs. */
export type Scored = MenuItem & {
  /** 0-100. */
  score: number;
  label: ScoreLabel;
  /** Short chips shown on the card: "High protein", "Contains gluten". */
  reasons: string[];
};

/** POST body for /api/analyze. */
export const AnalyzeRequest = z.object({
  /** Bare base64, no "data:image/jpeg;base64," prefix. */
  imageBase64: z.string().min(1),
  mimeType: z.string().default("image/jpeg"),
  prefs: Prefs,
});
export type AnalyzeRequest = z.infer<typeof AnalyzeRequest>;

export const ERROR_CODES = [
  "bad_request",
  "image_too_large",
  "not_a_menu",
  "upstream_failed",
  "timeout",
  "rate_limited",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

/** Every non-200 from /api/analyze has this shape. */
export type AnalyzeError = {
  error: string;
  code: ErrorCode;
};
