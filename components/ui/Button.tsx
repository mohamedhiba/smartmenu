import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
};

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink",
  secondary: "bg-surface-2 border-border text-text border",
  ghost: "text-muted",
};

/** #7: shared button primitive. min-h-11 keeps every tap target >= 44px (#22). */
export default function Button({ variant = "primary", className = "", children, ...props }: ButtonProps) {
  return (
    <button
      className={`rounded-card min-h-11 px-5 py-3 text-center font-medium transition-opacity disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
