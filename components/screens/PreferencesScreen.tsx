"use client";

import type { PrefsScreenProps } from "@/components/types";
import { DIETS, type Diet } from "@/lib/schema";
import Chip from "@/components/ui/Chip";
import Button from "@/components/ui/Button";

const DIET_LABELS: Record<Diet, string> = {
  none: "None",
  keto: "Keto",
  vegan: "Vegan",
  vegetarian: "Vegetarian",
  gluten_free: "Gluten-free",
  paleo: "Paleo",
};

/** #26 stretch: lets a judge who reads another language see the menu in it. */
const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "it", label: "Italian" },
  { code: "de", label: "German" },
  { code: "pt", label: "Portuguese" },
  { code: "ja", label: "Japanese" },
  { code: "zh", label: "Chinese" },
  { code: "ar", label: "Arabic" },
  { code: "hi", label: "Hindi" },
] as const;

const TOGGLES = [
  { key: "lowCarb", label: "Low carb" },
  { key: "highProtein", label: "High protein" },
  { key: "noNuts", label: "No nuts" },
] as const;

/** #10: three taps to a personalised menu. Controlled - value in, onChange out; #11 persists it. */
export default function PreferencesScreen({ value, onChange, onContinue }: PrefsScreenProps) {
  return (
    <main className="flex flex-1 flex-col gap-8 py-12">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Your preferences</h1>
        <p className="text-muted text-balance">Three taps to a menu that&apos;s actually for you.</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Diet</h2>
        <div className="flex flex-wrap gap-2">
          {DIETS.map((diet) => (
            <Chip key={diet} selected={value.diet === diet} onClick={() => onChange({ ...value, diet })}>
              {DIET_LABELS[diet]}
            </Chip>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Also avoid</h2>
        <div className="flex flex-wrap gap-2">
          {TOGGLES.map((toggle) => (
            <Chip
              key={toggle.key}
              selected={value[toggle.key]}
              onClick={() => onChange({ ...value, [toggle.key]: !value[toggle.key] })}
            >
              {toggle.label}
            </Chip>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Translate to</h2>
        <select
          value={value.targetLang}
          onChange={(e) => onChange({ ...value, targetLang: e.target.value })}
          className="bg-surface-2 border-border text-text rounded-card min-h-11 w-full border px-4 text-sm"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
      </section>

      <Button onClick={onContinue} className="w-full">
        Continue
      </Button>
    </main>
  );
}
