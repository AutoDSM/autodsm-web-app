"use client";

/**
 * Dashboard “Jump to” command palette (⌘K).
 * Self-contained surface + search field; generic cmdk primitives stay in `command.tsx`.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command as CommandPrimitive } from "cmdk";
import {
  LayoutDashboard,
  Pen,
  Settings,
  Search,
  type LucideIcon,
} from "lucide-react";

import { brandDashboardCardRadius } from "@/components/ui/brand-card-tokens";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CATEGORY_LABELS, SIDEBAR_SECTIONS } from "@/lib/brand/types";
import { DASHBOARD_CATEGORY_ICONS } from "@/lib/dashboard-category-icons";
import { useDashboardAppBasePath } from "@/components/shell/dashboard-app-context";
import { cn } from "@/lib/utils";

import styles from "./jump-to-palette.module.css";

const ICON_STROKE = 1.75 as const;

function PaletteRowIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span
      className={cn(
        "pointer-events-none flex size-8 shrink-0 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-tertiary)]",
        "transition-[color,background-color,border-color] duration-150 [transition-timing-function:var(--ease-standard)]",
        "group-data-[selected=true]:border-[var(--border-default)] group-data-[selected=true]:bg-[var(--bg-elevated)] group-data-[selected=true]:text-[var(--text-primary)]",
        "group-aria-selected:border-[var(--border-default)] group-aria-selected:bg-[var(--bg-elevated)] group-aria-selected:text-[var(--text-primary)]",
      )}
      aria-hidden
    >
      <Icon className="size-4" strokeWidth={ICON_STROKE} />
    </span>
  );
}

function JumpToPaletteSearch({ placeholder }: { placeholder: string }) {
  return (
    <div className={styles.searchRow} cmdk-input-wrapper="">
      <div className="flex min-h-10 items-center gap-2.5">
        <Search
          className="size-4 shrink-0 text-[var(--text-tertiary)]"
          strokeWidth={ICON_STROKE}
          aria-hidden
        />
        <div className={styles.chamber}>
          <CommandPrimitive.Input
            placeholder={placeholder}
            className={styles.input}
            aria-label="Search"
          />
        </div>
      </div>
    </div>
  );
}

export type JumpToPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function JumpToPalette({ open, onOpenChange }: JumpToPaletteProps) {
  const router = useRouter();
  const appBasePath = useDashboardAppBasePath();
  const quick = React.useMemo(
    () =>
      [
        { href: appBasePath, label: "Dashboard", icon: LayoutDashboard },
        { href: `${appBasePath}/agent`, label: "New agent", icon: Pen },
        { href: `${appBasePath}/settings`, label: "Settings", icon: Settings },
      ] as { href: string; label: string; icon: LucideIcon }[],
    [appBasePath],
  );

  const go = React.useCallback(
    (href: string) => {
      router.push(href);
      onOpenChange(false);
    },
    [router, onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-slot="jump-to-palette"
        className={cn(
          "gap-0 overflow-hidden border border-[var(--border-subtle)] p-0 shadow-[var(--shadow-lg)] sm:max-w-lg",
          brandDashboardCardRadius,
        )}
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Jump to</DialogTitle>
          <DialogDescription>Search pages and token categories</DialogDescription>
        </DialogHeader>

        <Command
          className={cn(
            "[&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-1.5 [&_[cmdk-list]]:px-1.5 [&_[cmdk-list]]:pb-2 [&_[cmdk-list]]:pt-1",
          )}
        >
          <JumpToPaletteSearch placeholder="Search pages..." />

          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>

            <CommandGroup heading="Quick">
              {quick.map(({ href, label, icon: Icon }) => (
                <CommandItem
                  key={href}
                  value={`${label} ${href}`}
                  onSelect={() => go(href)}
                >
                  <PaletteRowIcon icon={Icon} />
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />

            {SIDEBAR_SECTIONS.map((section) => (
              <CommandGroup key={section.label} heading={section.label}>
                {section.items.map((slug) => {
                  const href = `${appBasePath}/${slug}`;
                  const label = CATEGORY_LABELS[slug];
                  const CategoryIcon = DASHBOARD_CATEGORY_ICONS[slug] ?? LayoutDashboard;
                  return (
                    <CommandItem
                      key={href}
                      value={`${label} ${slug} ${href}`}
                      onSelect={() => go(href)}
                    >
                      <PaletteRowIcon icon={CategoryIcon} />
                      <span className="min-w-0 flex-1 truncate">{label}</span>
                      <CommandShortcut>{slug}</CommandShortcut>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
