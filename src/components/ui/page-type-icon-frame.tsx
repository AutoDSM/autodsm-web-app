import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageTypeIconFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Icon or letter (e.g. Lucide `Type`). */
  children: React.ReactNode;
}

/**
 * Small icon tile for page heroes — canvas fill, no hairline border (token pages).
 */
export function PageTypeIconFrame({
  className,
  children,
  ...props
}: PageTypeIconFrameProps) {
  return (
    <div
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-md border-0 bg-[var(--bg-canvas)] text-[var(--text-primary)]",
        className,
      )}
      aria-hidden
      {...props}
    >
      {children}
    </div>
  );
}
