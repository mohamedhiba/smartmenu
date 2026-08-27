"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEMO_MENU } from "@/lib/fixtures";
import { scoreMenu } from "@/lib/scoring";
import { DEFAULT_PREFS, type AnalyzedMenu, type Prefs, type Scored } from "@/lib/schema";

export type AnalysisStatus = "idle" | "analyzing" | "success";

type ImagePayload = {
  base64: string;
  mimeType: string;
};

type MenuStore = {
  prefs: Prefs;
  analyzedMenu: AnalyzedMenu;
  scored: Scored[];
  status: AnalysisStatus;
  error: string | null;
  image: ImagePayload | null;
  setPrefs: (prefs: Prefs) => void;
  setImage: (image: ImagePayload) => void;
  beginAnalysis: () => void;
  analyze: () => Promise<void>;
};

const fixtureScore = scoreMenu(DEMO_MENU, DEFAULT_PREFS);

export const useMenuStore = create<MenuStore>()(
  persist(
    (set, get) => ({
      prefs: DEFAULT_PREFS,
      analyzedMenu: DEMO_MENU,
      scored: fixtureScore,
      status: "success",
      error: null,
      image: null,
      setPrefs: (prefs) => set({ prefs, scored: scoreMenu(get().analyzedMenu, prefs) }),
      setImage: (image) => set({ image, status: "idle", error: null }),
      beginAnalysis: () => set({ status: "idle", error: null }),
      analyze: async () => {
        const { image, prefs } = get();
        set({ status: "analyzing", error: null });

        try {
          const response = await fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageBase64: image?.base64 ?? "demo",
              mimeType: image?.mimeType ?? "image/jpeg",
              prefs,
            }),
          });

          if (!response.ok) {
            throw new Error("Menu analysis failed.");
          }

          const analyzedMenu = (await response.json()) as AnalyzedMenu;
          set({
            analyzedMenu,
            scored: scoreMenu(analyzedMenu, prefs),
            status: "success",
            image: null,
          });
        } catch (caught) {
          const message = caught instanceof Error ? caught.message : "Menu analysis failed.";
          set({
            analyzedMenu: DEMO_MENU,
            scored: scoreMenu(DEMO_MENU, prefs),
            status: "success",
            error: `${message} Showing demo menu instead.`,
            image: null,
          });
        }
      },
    }),
    {
      name: "smartmenu-state",
      storage: createJSONStorage(() => sessionStorage),
      partialize: ({ prefs, analyzedMenu, scored, status, error }) => ({
        prefs,
        analyzedMenu,
        scored,
        status,
        error,
      }),
    },
  ),
);

export const selectDishById = (id: string) => (state: MenuStore) =>
  state.scored.find((dish) => dish.id === id);

export const useDishById = (id: string) => useMenuStore(selectDishById(id));