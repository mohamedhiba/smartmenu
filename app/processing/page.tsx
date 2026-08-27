"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ProcessingScreen from "@/components/screens/ProcessingScreen";
import type { ProcessingStage } from "@/components/types";
import { useMenuStore } from "@/lib/store";

const LAST_STAGE: ProcessingStage = 3;

export default function ProcessingPage() {
  const router = useRouter();
  const [stage, setStage] = useState<ProcessingStage>(0);
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

  // Decorative only. One model call cannot report progress, so the stages walk
  // forward and hold. They must never drive navigation: the real call takes
  // 10-25s, and a timer would show the user the demo menu instead of their own
  // photo, then skip past any error before it could be read.
  useEffect(() => {
    if (status !== "analyzing" || stage >= LAST_STAGE) return;
    const timer = window.setTimeout(() => {
      setStage((current) => Math.min(current + 1, LAST_STAGE) as ProcessingStage);
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [stage, status]);

  return (
    <ProcessingScreen
      stage={stage}
      error={status === "error" ? (error ?? "Something went wrong.") : undefined}
      onRetry={() => {
        started.current = false;
        setStage(0);
        void analyze();
      }}
    />
  );
}
