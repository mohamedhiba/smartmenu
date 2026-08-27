"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useDishById } from "@/lib/store";

const LABEL_COLOUR = {
  recommended: "#14b8a6",
  good: "#f59e0b",
  limit: "#ef4444",
} as const;

const LABEL_TEXT = {
  recommended: "Recommended",
  good: "Good choice",
  limit: "Limit",
} as const;

/**
 * Raw field names were reaching the screen as "No vegan" and "No containsNuts".
 * Each flag needs a phrase for both states, because "not gluten free" is the
 * half a coeliac actually needs to see.
 */
const FLAG_TEXT: Record<string, [on: string, off: string]> = {
  vegan: ["Vegan", "Not vegan"],
  vegetarian: ["Vegetarian", "Not vegetarian"],
  glutenFree: ["Gluten-free", "Contains gluten"],
  containsNuts: ["Contains nuts", "Nut-free"],
};

/** containsNuts is the one flag where true is the warning, not the reassurance. */
const FLAG_GOOD_WHEN: Record<string, boolean> = {
  vegan: true,
  vegetarian: true,
  glutenFree: true,
  containsNuts: false,
};

export default function MenuItemPage() {
  const { id } = useParams<{ id: string }>();
  const dish = useDishById(id);

  if (!dish) {
    return <main>Dish not found.</main>;
  }

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 18,
        minHeight: "100%",
        padding: "8px 0",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/menu" style={{ color: "#8b93a3", textDecoration: "none" }}>
          ← Back
        </Link>
        <span style={{ color: "#8b93a3", fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase" }}>
          Details
        </span>
      </div>

      <div
        style={{
          border: "1px solid #262a33",
          borderRadius: 18,
          background: "#16181d",
          padding: 18,
          display: "grid",
          gap: 16,
        }}
      >
        <div>
          <p style={{ margin: 0, color: "#8b93a3", fontSize: 12, textTransform: "uppercase", letterSpacing: 1.1 }}>
            {dish.section}
          </p>
          <h1 style={{ margin: "10px 0 0", fontSize: 30, lineHeight: 1.15 }}>{dish.translatedName}</h1>
          <p style={{ margin: "8px 0 0", color: "#8b93a3", fontStyle: "italic" }}>{dish.originalName}</p>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
            <span
              style={{
                background: LABEL_COLOUR[dish.label],
                color: "#04231f",
                fontWeight: 700,
                fontSize: 18,
                borderRadius: 999,
                padding: "6px 14px",
              }}
            >
              {dish.score}
            </span>
            <span style={{ color: LABEL_COLOUR[dish.label], fontWeight: 600 }}>
              {LABEL_TEXT[dish.label]}
            </span>
          </div>
        </div>

        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>Why this score</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {dish.reasons.map((reason) => (
              <span
                key={reason}
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  background: "#1e2128",
                  color: "#f2f4f7",
                  fontSize: 13,
                }}
              >
                {reason}
              </span>
            ))}
          </div>
          {dish.confidence < 0.5 ? (
            <p style={{ margin: "12px 0 0", color: "#8b93a3", fontSize: 12 }}>
              The menu text was hard to read here, so these numbers are a rough estimate.
            </p>
          ) : null}
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #262a33", paddingBottom: 10 }}>
            <span style={{ color: "#8b93a3" }}>Calories</span>
            <strong>{dish.nutrition.calories} kcal</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #262a33", paddingBottom: 10 }}>
            <span style={{ color: "#8b93a3" }}>Protein</span>
            <strong>{dish.nutrition.protein}g</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #262a33", paddingBottom: 10 }}>
            <span style={{ color: "#8b93a3" }}>Carbs</span>
            <strong>{dish.nutrition.carbs}g</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#8b93a3" }}>Fat</span>
            <strong>{dish.nutrition.fat}g</strong>
          </div>
        </div>

        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>Ingredients</h2>
          <ul style={{ margin: "10px 0 0", paddingLeft: 18, color: "#f2f4f7", lineHeight: 1.8 }}>
            {dish.ingredients.map((ingredient) => (
              <li key={ingredient}>{ingredient}</li>
            ))}
          </ul>
        </div>

        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>Flags</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {Object.entries(dish.flags).map(([key, value]) => {
              const [on, off] = FLAG_TEXT[key] ?? [key, `No ${key}`];
              const good = value === FLAG_GOOD_WHEN[key];
              return (
                <span
                  key={key}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    background: good ? "rgba(20, 184, 166, 0.12)" : "#1e2128",
                    color: good ? "#14b8a6" : "#8b93a3",
                    fontSize: 12,
                  }}
                >
                  {value ? on : off}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
