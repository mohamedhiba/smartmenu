"use client";

import Link from "next/link";
import { useMenuStore } from "@/lib/store";

export default function MenuPage() {
  const items = useMenuStore((state) => state.scored);

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
        <Link href="/processing" style={{ color: "#8b93a3", textDecoration: "none" }}>
          ← Back
        </Link>
        <span style={{ color: "#8b93a3", fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase" }}>
          Smart Menu
        </span>
      </div>

      <div>
        <h1 style={{ margin: 0, fontSize: 32 }}>Best matches for you</h1>
        <p style={{ margin: "8px 0 0", color: "#8b93a3" }}>
          Ranked from your preferences using fixture menu data.
        </p>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/menu/${item.id}`}
            style={{
              display: "block",
              textDecoration: "none",
              color: "inherit",
              border: "1px solid #262a33",
              borderRadius: 18,
              background: "#16181d",
              padding: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <div>
                <p style={{ margin: 0, color: "#8b93a3", fontSize: 12, textTransform: "uppercase", letterSpacing: 1.1 }}>
                  {item.category}
                </p>
                <h2 style={{ margin: "8px 0 0", fontSize: 22, lineHeight: 1.2 }}>{item.translatedName}</h2>
              </div>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 999,
                  background: item.label === "recommended" ? "rgba(20, 184, 166, 0.12)" : item.label === "good" ? "rgba(245, 158, 11, 0.12)" : "rgba(239, 68, 68, 0.12)",
                  color: item.label === "recommended" ? "#14b8a6" : item.label === "good" ? "#f59e0b" : "#ef4444",
                  minWidth: 70,
                  padding: "8px 10px",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {item.score}
              </span>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
              {item.reasons.slice(0, 3).map((reason) => (
                <span
                  key={reason}
                  style={{
                    borderRadius: 999,
                    background: "#1e2128",
                    color: "#f2f4f7",
                    padding: "6px 10px",
                    fontSize: 11,
                  }}
                >
                  {reason}
                </span>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, color: "#8b93a3", fontSize: 13 }}>
              <span>{item.nutrition.calories} kcal</span>
              <span>{item.section}</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
