"use client";

import { ArrowLeft, Check } from "lucide-react";
import type { DishDetailsScreenProps } from "@/components/types";
import CategoryTile from "@/components/CategoryTile";
import ScoreBadge from "@/components/ScoreBadge";
import Tag from "@/components/ui/Tag";
import AskAboutDish from "@/components/AskAboutDish";

const MACROS = [
  { key: "calories", label: "Calories" },
  { key: "protein", label: "Protein (g)" },
  { key: "carbs", label: "Carbs (g)" },
  { key: "fat", label: "Fat (g)" },
] as const;

/** #21: proves the app understood the dish. "Why this score" gets the most visual weight. */
export default function DishDetailsScreen({ dish, onBack }: DishDetailsScreenProps) {
  return (
    <main className="flex flex-1 flex-col gap-6 py-6">
      <button
        type="button"
        onClick={onBack}
        className="text-muted flex min-h-11 w-fit items-center gap-1.5 text-sm font-medium"
      >
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <CategoryTile category={dish.category} />
          <div className="min-w-0 flex-1 space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">{dish.translatedName}</h1>
            <p className="text-muted text-sm">{dish.originalName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ScoreBadge label={dish.label} score={dish.score} />
          {dish.confidence < 0.5 && (
            <span className="text-muted text-xs italic">Estimated - low confidence read</span>
          )}
        </div>
      </div>

      <section className="bg-surface border-accent/40 rounded-card space-y-3 border-2 p-5">
        <h2 className="text-accent text-sm font-semibold tracking-wide uppercase">Why this score</h2>
        {dish.reasons.length > 0 ? (
          <ul className="space-y-2">
            {dish.reasons.map((reason) => (
              <li key={reason} className="flex items-start gap-2 text-sm">
                <Check size={16} className="text-accent mt-0.5 shrink-0" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted text-sm">No specific flags for your preferences.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Macros</h2>
        <div className="grid grid-cols-4 gap-2">
          {MACROS.map((macro) => (
            <div key={macro.key} className="bg-surface-2 rounded-card space-y-0.5 p-3 text-center">
              <p className="text-lg font-semibold">{dish.nutrition[macro.key]}</p>
              <p className="text-muted text-[11px]">{macro.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Ingredients</h2>
        <div className="flex flex-wrap gap-1.5">
          {dish.ingredients.map((ingredient) => (
            <Tag key={ingredient}>{ingredient}</Tag>
          ))}
        </div>
      </section>

      <AskAboutDish dish={dish} />
    </main>
  );
}
