"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useMenuStore } from "@/lib/store";

const stages = [
  "Extracting text",
  "Translating menu",
  "Analyzing nutrition",
  "Ranking dishes",
] as const;

export default function ProcessingPage() {
  const router = useRouter();
  const [stageIndex, setStageIndex] = useState(0);
  const status = useMenuStore((state) => state.status);
  const error = useMenuStore((state) => state.error);
  const analyze = useMenuStore((state) => state.analyze);
  const started = useRef(false);

  useEffect(() => {
    if (status === "success") {
      router.push("/menu");
      return;
    }
    if (started.current) return;

    started.current = true;
    void analyze();
  }, [analyze, router, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setStageIndex((current) => (current + 1) % stages.length);
    }, 900);

    return () => window.clearTimeout(timer);
  }, [stageIndex]);

  useEffect(() => {
    if (stageIndex === stages.length - 1) {
      const timer = window.setTimeout(() => router.push("/menu"), 800);
      return () => window.clearTimeout(timer);
    }
  }, [router, stageIndex]);

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
        <span style={{ color: "#8b93a3", fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase" }}>
          Processing
        </span>
        <span style={{ color: "#8b93a3", fontSize: 12 }}>Menu analysis</span>
      </div>

      <div>
        <h1 style={{ margin: 0, fontSize: 32 }}>Analyzing your menu</h1>
        <p style={{ margin: "10px 0 0", color: "#8b93a3", lineHeight: 1.5 }}>
          We are reading the menu, translating sections, and matching each dish to your preferences.
        </p>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {stages.map((label, index) => {
          const active = index <= stageIndex;
          return (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 14,
                border: `1px solid ${active ? "#14b8a6" : "#262a33"}`,
                background: active ? "rgba(20, 184, 166, 0.08)" : "#16181d",
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: active ? "#14b8a6" : "#8b93a3",
                  display: "inline-block",
                }}
              />
              <span style={{ color: active ? "#f2f4f7" : "#8b93a3" }}>{label}</span>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: "auto",
          border: "1px solid #262a33",
          borderRadius: 16,
          background: "#16181d",
          padding: 14,
        }}
      >
        <p style={{ margin: 0, color: "#8b93a3", fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase" }}>
          Demo run
        </p>
        <p style={{ margin: "8px 0 0", fontSize: 18, fontWeight: 600 }}>
          {error ?? (status === "analyzing" ? "Reading your menu..." : "Ready to rank your dishes.")}
        </p>
      </div>
    </main>
  );
}
