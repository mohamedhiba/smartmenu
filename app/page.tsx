"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ScanScreen from "@/components/screens/ScanScreen";
import { downscaleToBase64 } from "@/lib/image";
import { useMenuStore } from "@/lib/store";

/**
 * Scan. The page owns the data and the routing; ScanScreen owns everything
 * visible. Neither file needs to know how the other works - the seam is
 * ScanScreenProps in components/types.ts.
 */
export default function ScanPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const handleImage = async (file: File) => {
    setBusy(true);
    setError(undefined);
    try {
      const { base64, mimeType } = await downscaleToBase64(file);
      useMenuStore.getState().setImage({ base64, mimeType });
      router.push("/preferences");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to read that image.",
      );
      setBusy(false);
    }
  };

  return <ScanScreen onImage={handleImage} busy={busy} error={error} />;
}
