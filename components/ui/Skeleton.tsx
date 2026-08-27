import type { HTMLAttributes } from "react";

/** #7 / #22: loading placeholder - swap in for real content so layout never jumps. */
export default function Skeleton({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`bg-surface-2 animate-pulse rounded-md ${className}`} {...props} />;
}
