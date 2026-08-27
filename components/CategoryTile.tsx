import { Beef, CakeSlice, Fish, Salad, Soup, UtensilsCrossed, Wheat, type LucideIcon } from "lucide-react";
import type { Category } from "@/lib/schema";

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
 * #7: gradient + icon per category, no photo assets (see issue #27 for real
 * photography - keep this as the fallback whenever a category has no photo).
 */
export default function CategoryTile({ category, size = "md" }: CategoryTileProps) {
  const { icon: Icon, gradient } = CATEGORY_STYLE[category];
  const dims = size === "sm" ? "size-10" : "size-14";
  const iconSize = size === "sm" ? 18 : 24;

  return (
    <div
      className={`${dims} bg-linear-to-br ${gradient} rounded-card flex shrink-0 items-center justify-center text-white`}
    >
      <Icon size={iconSize} strokeWidth={2} />
    </div>
  );
}
