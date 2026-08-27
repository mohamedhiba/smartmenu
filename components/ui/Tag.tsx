import type { HTMLAttributes, ReactNode } from "react";

export type TagProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
};

/** #7: non-interactive label - reason chips on DishCard/DishDetails, dietary flags. Not a tap target. */
export default function Tag({ className = "", children, ...props }: TagProps) {
  return (
    <span
      className={`bg-surface-2 border-border text-muted rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
