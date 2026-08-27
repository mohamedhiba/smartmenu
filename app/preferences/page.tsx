"use client";

import { useRouter } from "next/navigation";
import PreferencesScreen from "@/components/screens/PreferencesScreen";
import { useMenuStore } from "@/lib/store";

export default function PreferencesPage() {
  const router = useRouter();
  const prefs = useMenuStore((state) => state.prefs);
  const setPrefs = useMenuStore((state) => state.setPrefs);
  const beginAnalysis = useMenuStore((state) => state.beginAnalysis);

  return (
    <PreferencesScreen
      value={prefs}
      onChange={setPrefs}
      onContinue={() => {
        beginAnalysis();
        router.push("/processing");
      }}
    />
  );
}
