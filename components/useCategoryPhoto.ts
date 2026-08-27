"use client";

import { useEffect, useState } from "react";
import type { Category } from "@/lib/schema";

export type CategoryPhoto = { url: string };

/**
 * #27: module-level cache + in-flight dedup, shared by every CategoryTile
 * instance in the browser tab. A menu screen can render the same category
 * (e.g. "pasta") several times at once - without this, each mount would
 * fire its own request instead of sharing one.
 */
const cache = new Map<Category, CategoryPhoto | null>();
const inflight = new Map<Category, Promise<CategoryPhoto | null>>();

function fetchCategoryPhoto(category: Category): Promise<CategoryPhoto | null> {
  const existing = inflight.get(category);
  if (existing) return existing;

  const promise = fetch(`/api/category-photo?category=${category}`)
    .then((res) => (res.ok ? res.json() : null))
    .catch(() => null)
    .then((data: CategoryPhoto | null) => {
      cache.set(category, data);
      inflight.delete(category);
      return data;
    });

  inflight.set(category, promise);
  return promise;
}

/** undefined = still loading, null = no photo (use the gradient fallback), CategoryPhoto = show it. */
export function useCategoryPhoto(category: Category): CategoryPhoto | null | undefined {
  // The cache is read straight from render - no need to mirror it into state.
  // This counter exists only to force a re-render once a fetch this hook
  // kicked off resolves and the module-level cache gets a new entry.
  const [, forceRerender] = useState(0);

  useEffect(() => {
    if (cache.has(category)) return;
    let cancelled = false;
    fetchCategoryPhoto(category).then(() => {
      if (!cancelled) forceRerender((n) => n + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [category]);

  return cache.get(category);
}
