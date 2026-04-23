"use client";

import * as React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Palette,
  ClipboardType,
  Image as ImageIcon,
  Ruler,
  Square,
  CornerDownRight,
  Minus,
  Play,
  Layers,
  Droplets,
  LayoutPanelTop,
  MonitorSmartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS, type BrandCategory } from "@/lib/brand/types";
import { brandDashboardCardRadius } from "@/components/ui/brand-card-tokens";
import { useDashboardAppBasePath } from "@/components/shell/dashboard-app-context";

const TOKEN_ICONS: Record<BrandCategory, LucideIcon> = {
  colors: Palette,
  typography: ClipboardType,
  assets: ImageIcon,
  spacing: Ruler,
  shadows: Square,
  radii: CornerDownRight,
  borders: Minus,
  animations: Play,
  gradients: Layers,
  opacity: Droplets,
  zindex: LayoutPanelTop,
  breakpoints: MonitorSmartphone,
};

/** One-line blurb for each token category (dashboard overview). */
export const DASHBOARD_TOKEN_DESCRIPTIONS: Record<BrandCategory, string> = {
  colors: "Palette, contrast, and semantic color roles from your theme.",
  typography: "Type scale, font families, and text styles.",
  assets: "Logos, icons, and media discovered in your repository.",
  spacing: "Padding, margin, and gap values from your scale.",
  shadows: "Elevation and depth for cards, modals, and focus.",
  radii: "Corner radii for buttons, inputs, and surfaces.",
  borders: "Width, style, and color for outlines and dividers.",
  animations: "Keyframes, durations, and easing for motion.",
  gradients: "Linear, radial, and conic fills for backgrounds.",
  opacity: "Alpha steps for overlays, glass, and disabled states.",
  zindex: "Stacking order for layers, modals, and toasts.",
  breakpoints: "Min-width steps for responsive layouts and grids.",
};

export function dashboardHrefForToken(
  token: BrandCategory,
  appBasePath: string = "/dashboard",
): string {
  return `${appBasePath}/${token}`;
}

export type DashboardCardProps = {
  token: BrandCategory;
  className?: string;
};

/**
 * Overview tile: large tinted preview (primary at 8% opacity), token icon, title, and short description.
 * Matches the in-app “dashboard card” reference.
 */
export function DashboardCard({ token, className }: DashboardCardProps) {
  const appBasePath = useDashboardAppBasePath();
  const Icon = TOKEN_ICONS[token];
  const href = dashboardHrefForToken(token, appBasePath);
  const title = CATEGORY_LABELS[token] ?? token;
  const description = DASHBOARD_TOKEN_DESCRIPTIONS[token];

  return (
    <Link
      href={href}
      className={cn(
        "group block min-w-0 outline-none transition-[opacity,transform] duration-150 [transition-timing-function:var(--ease-standard)]",
        "hover:opacity-[0.97] active:scale-[0.99]",
        "focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-canvas)]",
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:gap-3.5">
        {/* Golden ratio (φ) frame; icon tracks container width via cqw + clamp. */}
        <div
          className={cn(
            brandDashboardCardRadius,
            "[container-type:inline-size] flex w-full items-center justify-center",
            "aspect-[1.618/1] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]",
          )}
        >
          <Icon
            className="h-[clamp(1.5rem,17.5cqw,2.75rem)] w-[clamp(1.5rem,17.5cqw,2.75rem)] shrink-0 text-[var(--accent)]"
            strokeWidth={1.75}
            aria-hidden
          />
        </div>
        <div className="min-w-0 px-0.5">
          <h3
            className="text-[15px] font-semibold leading-snug tracking-tight text-[var(--text-primary)] sm:text-base"
            style={{ fontFamily: "var(--font-geist-sans)" }}
          >
            {title}
          </h3>
          <p
            className="mt-1 text-[13px] leading-relaxed text-[var(--text-secondary)] sm:text-[14px]"
            style={{ fontFamily: "var(--font-geist-sans)" }}
          >
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
}

export { TOKEN_ICONS as DASHBOARD_TOKEN_ICONS };
