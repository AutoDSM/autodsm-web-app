import * as React from "react";
import { buildProjectTintStyle, pickProjectTintColor } from "@/lib/brand/product-tint";
import type { BrandProfile } from "@/lib/brand/types";

/**
 * Re-themes the product shell from the project's primary/brand color.
 *
 * SSR-friendly: the chosen tint comes from `profile.meta.tintHex` (cached
 * server-side at scan time) and the wrapper is always rendered so SSR and
 * CSR trees match — no `useTheme()` call, no hydration mismatch, no
 * first-paint flash. Dark-mode hover/pressed nuances are handled in CSS via
 * the existing `.dark` / `[data-theme="dark"]` ancestors.
 */
export function ProductTintRoot({
  profile,
  children,
}: {
  profile: BrandProfile | null;
  children: React.ReactNode;
}) {
  const tint =
    profile?.meta?.tintHex ?? pickProjectTintColor(profile, "light") ?? null;

  const style = React.useMemo<React.CSSProperties | undefined>(() => {
    if (!tint) return undefined;
    return buildProjectTintStyle(tint, "light");
  }, [tint]);

  return (
    <div
      className="w-full min-w-0"
      style={style}
      data-project-tint={tint ? "true" : "false"}
    >
      {children}
    </div>
  );
}
