import type { HTMLAttributes, ReactNode } from "react";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

/** #7: the raised surface every screen stacks content on. */
export default function Card({ className = "", children, ...props }: CardProps) {
  return (
    <div className={`bg-surface border-border rounded-card border p-4 ${className}`} {...props}>
      {children}
    </div>
  );
}
