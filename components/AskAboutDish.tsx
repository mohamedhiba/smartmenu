"use client";

import { useState } from "react";
import { Send, Sparkles } from "lucide-react";
import type { AskAboutDishProps } from "./types";
import Chip from "./ui/Chip";
import Skeleton from "./ui/Skeleton";

type Turn = { question: string; answer: string };

const SUGGESTIONS = ["Is this spicy?", "Can they make it without cheese?", "Any nuts in this?"];

/** #28: follow-up question box on the dish details page, answered from dish context. */
export default function AskAboutDish({ dish }: AskAboutDishProps) {
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pendingQuestion, setPendingQuestion] = useState<string>();
  const [error, setError] = useState<string>();

  const busy = pendingQuestion !== undefined;

  async function ask(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed || busy) return;

    setPendingQuestion(trimmed);
    setQuestion("");
    setError(undefined);
    try {
      const res = await fetch("/api/ask-dish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dish, question: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setTurns((prev) => [...prev, { question: trimmed, answer: data.answer }]);
    } catch {
      setError("Couldn't get an answer - try again.");
      setQuestion(trimmed);
    } finally {
      setPendingQuestion(undefined);
    }
  }

  return (
    <section className="bg-surface border-border space-y-3 rounded-card border p-4">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-accent" />
        <h3 className="text-sm font-medium">Ask about this dish</h3>
      </div>

      {(turns.length > 0 || pendingQuestion) && (
        <ul className="space-y-3">
          {turns.map((turn, i) => (
            <li key={i} className="space-y-1">
              <p className="text-sm font-medium">{turn.question}</p>
              <p className="text-muted text-sm">{turn.answer}</p>
            </li>
          ))}
          {pendingQuestion && (
            <li className="space-y-1.5">
              <p className="text-sm font-medium">{pendingQuestion}</p>
              <Skeleton className="h-4 w-4/5" />
            </li>
          )}
        </ul>
      )}

      {error && <p className="text-limit text-xs">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <Chip key={suggestion} onClick={() => ask(suggestion)} disabled={busy} className="text-xs">
            {suggestion}
          </Chip>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="flex items-center gap-2"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. is this spicy?"
          disabled={busy}
          maxLength={300}
          className="bg-surface-2 border-border text-text placeholder:text-muted min-h-11 min-w-0 flex-1 rounded-full border px-4 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={busy || !question.trim()}
          aria-label="Ask"
          className="bg-accent text-accent-ink flex size-11 shrink-0 items-center justify-center rounded-full disabled:opacity-50"
        >
          <Send size={18} className={busy ? "animate-pulse" : undefined} />
        </button>
      </form>
    </section>
  );
}
