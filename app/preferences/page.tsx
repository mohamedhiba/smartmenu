"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMenuStore } from "@/lib/store";

const dietOptions = [
  { value: "none", label: "No preference" },
  { value: "keto", label: "Keto" },
  { value: "vegan", label: "Vegan" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "gluten_free", label: "Gluten-free" },
  { value: "paleo", label: "Paleo" },
] as const;

export default function PreferencesPage() {
  const router = useRouter();
  const prefs = useMenuStore((state) => state.prefs);
  const setStoredPrefs = useMenuStore((state) => state.setPrefs);
  const beginAnalysis = useMenuStore((state) => state.beginAnalysis);

  const toggle = (key: "lowCarb" | "highProtein" | "noNuts") => {
    setStoredPrefs({
      ...prefs,
      [key]: !prefs[key],
    });
  };

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        minHeight: "100%",
        padding: "8px 0",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" style={{ color: "#8b93a3", textDecoration: "none" }}>
          ← Back
        </Link>
        <span style={{ color: "#8b93a3", fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase" }}>
          Step 1 of 4
        </span>
      </div>

      <div>
        <p style={{ margin: 0, color: "#8b93a3", fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase" }}>
          Diet
        </p>
        <h1 style={{ margin: "10px 0 0", fontSize: 32, lineHeight: 1.1 }}>Your preferences</h1>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {dietOptions.map((option) => {
          const active = prefs.diet === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setStoredPrefs({ ...prefs, diet: option.value })}
              style={{
                width: "100%",
                border: `1px solid ${active ? "#14b8a6" : "#262a33"}`,
                borderRadius: 16,
                background: active ? "rgba(20, 184, 166, 0.12)" : "#16181d",
                color: "#f2f4f7",
                padding: "14px 16px",
                textAlign: "left",
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <button
          type="button"
          onClick={() => toggle("lowCarb")}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            border: "1px solid #262a33",
            borderRadius: 16,
            background: "#16181d",
            color: "#f2f4f7",
            padding: "14px 16px",
            fontSize: 16,
          }}
        >
          <span>Low carb</span>
          <span style={{ color: prefs.lowCarb ? "#14b8a6" : "#8b93a3" }}>{prefs.lowCarb ? "On" : "Off"}</span>
        </button>

        <button
          type="button"
          onClick={() => toggle("highProtein")}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            border: "1px solid #262a33",
            borderRadius: 16,
            background: "#16181d",
            color: "#f2f4f7",
            padding: "14px 16px",
            fontSize: 16,
          }}
        >
          <span>High protein</span>
          <span style={{ color: prefs.highProtein ? "#14b8a6" : "#8b93a3" }}>{prefs.highProtein ? "On" : "Off"}</span>
        </button>

        <button
          type="button"
          onClick={() => toggle("noNuts")}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            border: "1px solid #262a33",
            borderRadius: 16,
            background: "#16181d",
            color: "#f2f4f7",
            padding: "14px 16px",
            fontSize: 16,
          }}
        >
          <span>No nuts</span>
          <span style={{ color: prefs.noNuts ? "#14b8a6" : "#8b93a3" }}>{prefs.noNuts ? "On" : "Off"}</span>
        </button>
      </div>

      <button
        type="button"
        onClick={() => {
          beginAnalysis();
          router.push("/processing");
        }}
        style={{
          marginTop: "auto",
          border: "none",
          borderRadius: 16,
          background: "#14b8a6",
          color: "#04231f",
          padding: "16px 18px",
          fontSize: 16,
          fontWeight: 700,
        }}
      >
        Continue
      </button>
    </main>
  );
}
