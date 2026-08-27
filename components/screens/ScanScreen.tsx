"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Camera, Loader2, RotateCcw } from "lucide-react";
import type { ScanScreenProps } from "@/components/types";
import Button from "@/components/ui/Button";

/** #8: first screen a judge sees. capture="environment" works on iOS and Android without getUserMedia. */
export default function ScanScreen({ onImage, busy, error }: ScanScreenProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string>();

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    onImage(file);
  }

  return (
    <main className="flex flex-1 flex-col justify-center gap-6 py-12">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">SmartMenu</h1>
        <p className="text-muted text-balance">
          Photograph a menu in any language. Get it translated, scored and ranked for your diet.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
      />

      {!previewUrl ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="bg-accent text-accent-ink rounded-card flex min-h-48 flex-col items-center justify-center gap-3 px-5 py-8 text-center font-medium"
        >
          <Camera size={32} />
          Scan a menu
        </button>
      ) : (
        <div className="space-y-3">
          <div className="border-border rounded-card relative overflow-hidden border">
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL, not a remote asset */}
            <img src={previewUrl} alt="Menu preview" className="max-h-72 w-full object-cover" />
            {busy && (
              <div className="bg-bg/70 absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm">
                <Loader2 size={28} className="animate-spin" />
                Reading your menu...
              </div>
            )}
          </div>
          {!busy && (
            <Button
              variant="secondary"
              onClick={() => inputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2"
            >
              <RotateCcw size={16} />
              Retake
            </Button>
          )}
        </div>
      )}

      {error && <p className="text-limit text-sm">{error}</p>}

      <p className="text-muted text-xs">Works best in good light, straight on to the menu.</p>
    </main>
  );
}
