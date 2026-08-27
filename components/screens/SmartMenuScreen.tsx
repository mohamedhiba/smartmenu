"use client";

import type { SmartMenuScreenProps } from "@/components/types";
import DishCard from "@/components/DishCard";

/** #16: the money shot. Items arrive already sorted by score - never re-sort here. */
export default function SmartMenuScreen({ items, onSelect, onRescan, isSampleData }: SmartMenuScreenProps) {
  return (
    <main className="flex flex-1 flex-col gap-4 py-8">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Your menu</h1>
        <button
          type="button"
          onClick={onRescan}
          className="text-muted min-h-11 px-2 text-sm font-medium"
        >
          Rescan
        </button>
      </div>

      {isSampleData ? (
        <p className="border-border text-muted rounded-card border border-dashed px-4 py-3 text-sm">
          This is our sample menu, not your photo.{" "}
          <button type="button" onClick={onRescan} className="text-accent font-medium underline">
            Scan a real one
          </button>
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="text-muted py-12 text-center text-sm">No dishes found - try a clearer photo.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li key={item.id}>
              <DishCard dish={item} onSelect={onSelect} index={index} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
