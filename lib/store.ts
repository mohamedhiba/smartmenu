"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEMO_MENU } from "@/lib/fixtures";
import { scoreMenu } from "@/lib/scoring";
import {
  DEFAULT_PREFS,
  type AnalyzedMenu,
  type ErrorCode,
  type Prefs,
  type Scored,
} from "@/lib/schema";

export type AnalysisStatus = "idle" | "analyzing" | "success" | "error";

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
  /** Set when what is on screen is the demo menu, not the user's photo. */
  isSampleData: boolean;
  image: ImagePayload | null;
  setPrefs: (prefs: Prefs) => void;
  setImage: (image: ImagePayload) => void;
  beginAnalysis: () => void;
  analyze: () => Promise<void>;
};

const fixtureScore = scoreMenu(DEMO_MENU, DEFAULT_PREFS);

/**
 * What to tell the user for each failure the API can report.
 *
 * /api/analyze is careful to return a distinct code for each situation, so the
 * least we can do is say something true about it. "Menu analysis failed" for a
 * photo of someone's face is not an explanation.
 */
const MESSAGES: Record<ErrorCode, string> = {
  not_a_menu: "That does not look like a menu. Try another photo.",
  image_too_large: "That photo is too large. Try taking it again.",
  rate_limited: "We are getting a lot of requests. Try again in a moment.",
  timeout: "That took too long. Try once more.",
  upstream_failed: "We could not read that menu. Try another photo.",
  bad_request: "Something went wrong sending that photo.",
};

export const useMenuStore = create<MenuStore>()(
  persist(
    (set, get) => ({
      prefs: DEFAULT_PREFS,
      analyzedMenu: DEMO_MENU,
      scored: fixtureScore,
      status: "success",
      error: null,
      isSampleData: true,
      image: null,

      setPrefs: (prefs) =>
        set({ prefs, scored: scoreMenu(get().analyzedMenu, prefs) }),

      setImage: (image) => set({ image, status: "idle", error: null }),

      beginAnalysis: () => set({ status: "idle", error: null }),

      analyze: async () => {
        const { image, prefs } = get();
        set({ status: "analyzing", error: null });

        // With no photo there is nothing to read, so ask for the demo menu
        // explicitly rather than posting a placeholder the model cannot decode.
        const url = image ? "/api/analyze" : "/api/analyze?demo=1";

        try {
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageBase64: image?.base64 ?? "",
              mimeType: image?.mimeType ?? "image/jpeg",
              prefs,
            }),
          });

          const payload = await response.json();

          if (!response.ok) {
            const code = (payload?.code as ErrorCode) ?? "upstream_failed";
            // A rejected photo is not a crash - keep the previous menu on screen
            // and say why, rather than passing the demo menu off as their photo.
            set({
              status: "error",
              error: MESSAGES[code] ?? MESSAGES.upstream_failed,
              image: null,
            });
            return;
          }

          const analyzedMenu = payload as AnalyzedMenu;

          set({
            analyzedMenu,
            scored: scoreMenu(analyzedMenu, prefs),
            status: "success",
            error: null,
            // The route sets this header when the model failed twice and it fell
            // back to fixtures, so the UI can say so instead of lying.
            isSampleData:
              response.headers.get("X-SmartMenu-Fallback") === "fixtures" ||
              !image,
            image: null,
          });
        } catch {
          // Network-level failure: the request never completed.
          set({
            status: "error",
            error: "No connection. Check your network and try again.",
            image: null,
          });
        }
      },
    }),
    {
      name: "smartmenu-state",
      storage: createJSONStorage(() => sessionStorage),
      // The image base64 is deliberately not persisted - a phone photo would
      // blow the ~5MB sessionStorage quota and silently break persistence.
      partialize: ({ prefs, analyzedMenu, scored, status, error, isSampleData }) => ({
        prefs,
        analyzedMenu,
        scored,
        status,
        error,
        isSampleData,
      }),
    },
  ),
);

export const selectDishById = (id: string) => (state: MenuStore) =>
  state.scored.find((dish) => dish.id === id);

export const useDishById = (id: string) => useMenuStore(selectDishById(id));
