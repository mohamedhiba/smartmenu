"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { downscaleToBase64 } from "@/lib/image";
import { useMenuStore } from "@/lib/store";

export default function ScanPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | null | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);

    try {
      const { base64, mimeType } = await downscaleToBase64(file);
      useMenuStore.getState().setImage({ base64, mimeType });
      router.push("/preferences");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to process this image.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex flex-1 flex-col justify-center gap-8 py-12">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">SmartMenu</h1>
        <p className="text-muted text-balance">
          Photograph a menu in any language. Get it translated, scored and
          ranked for your diet.
        </p>
      </div>

      <label
        className="bg-accent text-accent-ink rounded-card px-5 py-4 text-center font-medium"
        style={{ display: "block", cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1 }}
      >
        <input
          type="file"
          accept="image/*"
          capture="environment"
          disabled={busy}
          onChange={(event) => handleFile(event.target.files?.[0])}
          style={{ display: "none" }}
        />
        {busy ? "Processing photo…" : "Scan a menu"}
      </label>

      {error ? (
        <p className="text-red-400 text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <p className="text-muted text-xs">
        Demo-safe: the app downscales the upload before it can hit the Vercel size cap.
      </p>
    </main>
  );
}
