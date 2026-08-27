"use client";

import { Beef, CakeSlice, Fish, Salad, Soup, UtensilsCrossed, Wheat, type LucideIcon } from "lucide-react";
import type { Category } from "@/lib/schema";
import { useCategoryPhoto } from "./useCategoryPhoto";

const CATEGORY_STYLE: Record<Category, { icon: LucideIcon; gradient: string }> = {
  pasta: { icon: Wheat, gradient: "from-amber-500 to-amber-800" },
  fish: { icon: Fish, gradient: "from-sky-500 to-blue-800" },
  meat: { icon: Beef, gradient: "from-rose-500 to-red-800" },
  risotto: { icon: Soup, gradient: "from-yellow-500 to-amber-700" },
  dessert: { icon: CakeSlice, gradient: "from-pink-500 to-fuchsia-800" },
  salad: { icon: Salad, gradient: "from-emerald-500 to-green-800" },
  other: { icon: UtensilsCrossed, gradient: "from-slate-500 to-slate-800" },
};

export type CategoryTileProps = {
  category: Category;
  size?: "sm" | "md";
};

/**
 * #7 / #27: a Gemini-generated photo per category when one's available
 * (fetched + cached via useCategoryPhoto), falling back to the gradient +
 * lucide icon whenever there's no key, the call fails, or it's still
 * loading. No photographer attribution needed - these are generated, not
 * sourced stock photography.
 */
export default function CategoryTile({ category, size = "md" }: CategoryTileProps) {
  const photo = useCategoryPhoto(category);
  const { icon: Icon, gradient } = CATEGORY_STYLE[category];
  const dims = size === "sm" ? "size-10" : "size-14";
  const iconSize = size === "sm" ? 18 : 24;

  if (photo) {
    return (
      <div className={`${dims} rounded-card shrink-0 overflow-hidden`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- data URI from our own /api/category-photo, nothing for next/image to optimise */}
        <img src={photo.url} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={`${dims} bg-linear-to-br ${gradient} rounded-card flex shrink-0 items-center justify-center text-white`}
    >
      <Icon size={iconSize} strokeWidth={2} />
    </div>
  );
}
