import type { AnalyzedMenu, MenuItem, Prefs, Scored } from "@/lib/schema";

/**
 * Deterministic ranking. No model involved.
 *
 * Same dish and same preferences always produce the same score, and the score
 * can explain itself - that is the whole point. The model handles perception;
 * this handles judgement.
 */

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/** Above this a dish is not keto, whatever it is called. */
const KETO_CARB_LIMIT = 15;
/** Above this a dish is not low carb. */
const LOW_CARB_LIMIT = 30;
/** At or above this a dish counts as high protein. */
const HIGH_PROTEIN = 25;

/**
 * Does this dish break the diet outright?
 *
 * A hard break is not a penalty, it is a veto. Someone who cannot eat gluten is
 * not helped by a coeliac-unsafe dish scoring 60 out of 100.
 */
function dietViolation(item: MenuItem, prefs: Prefs): string | null {
  switch (prefs.diet) {
    case "keto":
      return item.nutrition.carbs > KETO_CARB_LIMIT
        ? `${item.nutrition.carbs}g carbs - not keto`
        : null;
    case "vegan":
      return item.flags.vegan ? null : "Not vegan";
    case "vegetarian":
      return item.flags.vegetarian ? null : "Not vegetarian";
    case "gluten_free":
      return item.flags.glutenFree ? null : "Contains gluten";
    case "paleo":
      // No paleo flag in the contract, so approximate: grains and dairy-heavy
      // desserts are out. Carbs are the best proxy we have.
      return item.category === "pasta" ||
        item.category === "risotto" ||
        item.category === "dessert"
        ? "Not paleo"
        : null;
    default:
      return null;
  }
}

/**
 * How badly a dish breaks the rule, 0 (barely) to 1 (hopelessly).
 *
 * Keto has a natural gradient - carbs over the limit. The other diets are
 * binary, so there is no honest gradient to read; calorie load is used purely
 * as a tiebreak, to keep the list ordered rather than flat.
 */
function violationSeverity(
  item: MenuItem,
  prefs: Prefs,
  nutConflict: boolean,
): number {
  // An allergy is not a spectrum. Nut dishes sink to the bottom.
  if (nutConflict) return 1;

  if (prefs.diet === "keto") {
    return clamp((item.nutrition.carbs - KETO_CARB_LIMIT) / 60, 0.05, 1);
  }

  return clamp(0.35 + item.nutrition.calories / 2500, 0.35, 1);
}

/** Grams of protein per 100 kcal. Small, deterministic, always non-negative. */
function proteinDensity(item: MenuItem): number {
  const calories = Math.max(item.nutrition.calories, 1);
  return (item.nutrition.protein / calories) * 100;
}

export function scoreDish(item: MenuItem, prefs: Prefs): Scored {
  const reasons: string[] = [];
  let score = 80;

  // Hard blocks first. These cap the score no matter what else is good.
  const violation = dietViolation(item, prefs);
  const nutConflict = prefs.noNuts && item.flags.containsNuts;

  if (violation) reasons.push(violation);
  if (nutConflict) reasons.push("Contains nuts");

  // Soft preferences.
  if (prefs.lowCarb) {
    if (item.nutrition.carbs > LOW_CARB_LIMIT) {
      score -= 18;
      reasons.push(`High carb (${item.nutrition.carbs}g)`);
    } else {
      score += 5;
      reasons.push(`Low carb (${item.nutrition.carbs}g)`);
    }
  }

  if (prefs.highProtein) {
    if (item.nutrition.protein >= HIGH_PROTEIN) {
      score += 10;
      reasons.push(`High protein (${item.nutrition.protein}g)`);
    } else {
      score -= 12;
      reasons.push(`Low protein (${item.nutrition.protein}g)`);
    }
  }

  if (item.nutrition.calories > 700) {
    score -= 12;
    reasons.push(`${item.nutrition.calories} kcal`);
  }

  // Nice-to-haves worth surfacing even when the user did not ask.
  if (!violation) {
    if (prefs.diet === "keto") reasons.push("Keto friendly");
    if (prefs.diet === "gluten_free") reasons.push("Gluten-free");
    if (prefs.diet === "vegan") reasons.push("Vegan");
  }

  if (reasons.length === 0) reasons.push("Balanced choice");

  // Without this, whole groups of dishes land on the same round number and the
  // ranked list looks arbitrary. Protein per 100 kcal is a reasonable, honest
  // tiebreak: it separates a lean fish from a rich one without changing labels.
  //
  // Scaled rather than clamped straight: most real dishes sit above 6g/100kcal,
  // so clamping there saturated and five dishes in a row still read "86".
  score += clamp(proteinDensity(item) * 0.4, 0, 8);

  // A dish that breaks the diet or the allergy can never be better than "limit".
  const blocked = Boolean(violation) || nutConflict;

  // But blocked dishes still have to rank against each other. On a menu where
  // nothing fits the diet, flattening every dish to the same number produces a
  // wall of identical red cards in arbitrary order - which is worse than
  // useless, because the dish closest to acceptable gets buried. Spread them
  // across the band below "limit" by how badly they break the rule.
  const finalScore = blocked
    ? clamp(Math.round(34 - 30 * violationSeverity(item, prefs, nutConflict)), 1, 34)
    : clamp(score, 20, 100);

  const label: Scored["label"] = blocked
    ? "limit"
    : finalScore >= 75
      ? "recommended"
      : finalScore >= 55
        ? "good"
        : "limit";

  return {
    ...item,
    // Round: this lands in a badge, and "85.48387096774194" is not a score.
    score: Math.round(clamp(finalScore, 0, 100)),
    label,
    reasons,
  };
}

/** Score a whole menu and sort it best-first. */
export function scoreMenu(menu: AnalyzedMenu, prefs: Prefs): Scored[] {
  return menu.items
    .map((item) => scoreDish(item, prefs))
    .sort((a, b) => b.score - a.score);
}
