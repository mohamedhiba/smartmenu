import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
  children: ReactNode;
};

/** #7: interactive chip - diet selection, toggles, suggestions. Selected state reads at a glance. */
export default function Chip({ selected = false, className = "", children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`min-h-11 rounded-full border px-4 text-sm font-medium transition-colors ${
        selected ? "bg-accent text-accent-ink border-accent" : "bg-surface-2 border-border text-muted"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
