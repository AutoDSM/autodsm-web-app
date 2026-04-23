"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { buildProjectTintStyle, pickProjectTintColor } from "@/lib/brand/product-tint";
import type { BrandProfile } from "@/lib/brand/types";

/**
 * When a brand profile is present, re-themes the product shell from the project’s
 * primary/brand color (tint, 8% elevated surfaces, WCAG AA on-accent text).
 * Wraps content from BrandProvider; does nothing if no pickable color.
 */
export function ProductTintRoot({
  profile,
  children,
}: {
  profile: BrandProfile | null;
  children: React.ReactNode;
}) {
  const { resolvedTheme } = useTheme();
  const mode: "light" | "dark" = resolvedTheme === "dark" ? "dark" : "light";

  const style = React.useMemo(() => {
    const tint = pickProjectTintColor(profile);
    if (!tint) return undefined;
    return buildProjectTintStyle(tint, mode);
  }, [profile, mode]);

  if (!style) {
    return <>{children}</>;
  }

  return (
    <div className="w-full min-w-0" style={style} data-project-tint="true">
      {children}
    </div>
  );
}
