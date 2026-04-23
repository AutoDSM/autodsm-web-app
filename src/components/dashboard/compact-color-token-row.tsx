"use client";

import * as React from "react";
import { ColorCard } from "@/components/ui/color-card";
import { CopyButton } from "@/components/ui/copy-button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { brandDashboardCardRadius } from "@/components/ui/brand-card-tokens";
import { cn } from "@/lib/utils";
import { formatColorTitle } from "@/lib/brand/color-label";
import type { BrandColor } from "@/lib/brand/types";

export interface CompactColorTokenRowProps {
  color: BrandColor;
  onCopyHex: (hex: string) => void | Promise<void>;
}

/**
 * One-row list item: swatch, title (scale-style), CSS var, hex pill — details in hover.
 */
export function CompactColorTokenRow({ color, onCopyHex }: CompactColorTokenRowProps) {
  const displayHex = color.value;
  const displayHexLabel = displayHex.length ? displayHex.toUpperCase() : displayHex;
  const title = formatColorTitle(color.name);

  return (
    <ColorCard
      swatchColor={displayHex}
      swatchSlot={
        <HoverCard openDelay={200}>
          <HoverCardTrigger asChild>
            <button
              type="button"
              className={cn(
                "h-12 w-12 shrink-0 cursor-zoom-in border border-[var(--border-default)] transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-canvas)]",
                brandDashboardCardRadius,
              )}
              style={{ backgroundColor: displayHex }}
              aria-label={`Preview ${color.name}`}
            />
          </HoverCardTrigger>
          <HoverCardContent className="w-72 space-y-2">
            <p className="text-h3 font-heading text-foreground">{color.name}</p>
            <p className="break-all font-mono text-[12px] text-muted-foreground">
              {color.cssVariable}
            </p>
            <div className="flex flex-wrap gap-2 text-[12px] text-muted-foreground">
              <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-foreground">
                {displayHex}
              </span>
              <span className="rounded-md bg-muted px-2 py-0.5 font-mono">{color.rgb}</span>
              {color.oklch ? (
                <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[10px]">{color.oklch}</span>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 text-[11px]">
              {color.wcagAANormal ? <Badge variant="outline">AA text</Badge> : null}
              {color.wcagAAA ? <Badge variant="outline">AAA</Badge> : null}
            </div>
            <div className="flex flex-wrap gap-3 border-t border-[var(--border-subtle)] pt-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px]">
                <CopyButton value={color.rgb} label="RGB" iconSize={12} />
                <CopyButton value={color.hsl} label="HSL" iconSize={12} />
                {color.oklch ? <CopyButton value={color.oklch} label="OKLCH" iconSize={12} /> : null}
              </div>
            </div>
            {color.darkModeHex && color.darkModeHex !== color.value ? (
              <Badge variant="outline" className="gap-1.5 py-0.5">
                <span
                  className="inline-block h-3 w-3 rounded-full border border-[var(--border-default)]"
                  style={{ backgroundColor: color.darkModeHex }}
                />
                <span
                  className="text-[11px]"
                  style={{ fontFamily: "var(--font-geist-mono)" }}
                >
                  DARK {color.darkModeHex}
                </span>
              </Badge>
            ) : null}
          </HoverCardContent>
        </HoverCard>
      }
      title={title}
      subtitle={color.cssVariable}
      subtitleClassName="font-[family-name:var(--font-geist-mono)] text-[var(--text-tertiary)]"
      copyLabel={displayHexLabel}
      onCopy={() => onCopyHex(displayHex)}
    />
  );
}
