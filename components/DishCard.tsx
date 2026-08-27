"use client";

import CategoryTile from "@/components/CategoryTile";
import ScoreBadge from "@/components/ScoreBadge";
import Tag from "@/components/ui/Tag";
import type { Scored } from "@/lib/schema";

export type DishCardProps = {
  dish: Scored;
  onSelect: (id: string) => void;
  /** #22: position in the list, staggers the ScoreBadge pop-in. */
  index?: number;
};

/** #16: CategoryTile, translated name over original, kcal, score badge, reason chips. */
export default function DishCard({ dish, onSelect, index = 0 }: DishCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(dish.id)}
      className="bg-surface border-border rounded-card flex w-full gap-3 border p-3 text-left"
    >
      <CategoryTile category={dish.category} size="sm" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{dish.translatedName}</p>
            <p className="text-muted truncate text-xs">{dish.originalName}</p>
          </div>
          <ScoreBadge label={dish.label} score={dish.score} delayMs={index * 60} />
        </div>
        <p className="text-muted text-xs">{dish.nutrition.calories} kcal</p>
        {dish.reasons.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {dish.reasons.map((reason) => (
              <Tag key={reason}>{reason}</Tag>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}
