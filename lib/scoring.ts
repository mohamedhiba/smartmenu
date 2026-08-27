import type { AnalyzedMenu, Prefs, Scored } from "@/lib/schema";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function scoreMenu(menu: AnalyzedMenu, prefs: Prefs): Scored[] {
  return [...menu.items]
    .map((item) => {
      let score = 80;

      if (prefs.diet === "keto" && item.category === "pasta") score -= 30;
      if (prefs.diet === "vegan" && !item.flags.vegan) score -= 20;
      if (prefs.diet === "vegetarian" && !item.flags.vegetarian) score -= 18;
      if (prefs.diet === "gluten_free" && !item.flags.glutenFree) score -= 25;
      if (prefs.lowCarb && item.nutrition.carbs > 30) score -= 18;
      if (prefs.highProtein && item.nutrition.protein < 25) score -= 12;
      if (prefs.noNuts && item.flags.containsNuts) score -= 30;

      if (item.flags.containsNuts) score -= 8;
      if (item.nutrition.calories > 700) score -= 12;

      const label: Scored["label"] = score >= 75 ? "recommended" : score >= 55 ? "good" : "limit";
      const reasons: string[] = [];

      if (prefs.lowCarb && item.nutrition.carbs <= 30) reasons.push("Low carb");
      if (prefs.highProtein && item.nutrition.protein >= 25) reasons.push("High protein");
      if (prefs.noNuts && !item.flags.containsNuts) reasons.push("Nut free");
      if (item.flags.glutenFree) reasons.push("Gluten-free");
      if (item.flags.vegan) reasons.push("Vegan");

      if (reasons.length === 0) reasons.push("Balanced choice");

      return {
        ...item,
        score: clamp(score, 20, 100),
        label,
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score);
}