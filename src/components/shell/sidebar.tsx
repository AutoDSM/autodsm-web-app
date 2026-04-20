"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Palette,
  Type,
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
  Settings as SettingsIcon,
  Pen,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBrandStore } from "@/stores/brand";
import { SIDEBAR_SECTIONS, CATEGORY_LABELS } from "@/lib/brand/types";
import { useDashboardShell } from "./dashboard-shell-context";

const ICONS: Record<string, LucideIcon> = {
  colors: Palette,
  typography: Type,
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

function SidebarNavIcon({
  icon: Icon,
  active,
  muted,
  size,
}: {
  icon: LucideIcon;
  active: boolean;
  muted?: boolean;
  size: number;
}) {
  return (
    <Icon
      size={size}
      strokeWidth={active ? 2.25 : 1.5}
      fill={active ? "currentColor" : "none"}
      className={cn(
        "shrink-0 pointer-events-none transition-[stroke-width,fill] duration-150",
        active ? "font-medium" : "font-semibold",
        active
          ? "text-[var(--accent)]"
          : muted
            ? "text-[var(--text-tertiary)]"
            : "text-[var(--text-secondary)]",
      )}
      aria-hidden
    />
  );
}

function NavLink({
  href,
  label,
  Icon,
  active,
  muted,
  topLevel,
  iconSize,
}: {
  href: string;
  label: string;
  Icon: LucideIcon;
  active: boolean;
  muted?: boolean;
  topLevel?: boolean;
  iconSize?: number;
}) {
  const size = iconSize ?? (topLevel ? 14 : 13);
  return (
    <Link
      href={href}
      className={cn(
        "flex h-8 min-h-8 items-center gap-2 rounded-[8px] text-[12px] leading-4",
        "transition-colors duration-150 [transition-timing-function:var(--ease-standard)]",
        topLevel ? "px-3" : "pl-4 pr-3",
        active
          ? "bg-[var(--accent-subtle)] font-medium text-[var(--accent)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]",
        muted && !active && "text-[var(--text-tertiary)]",
      )}
    >
      <SidebarNavIcon icon={Icon} active={active} muted={muted} size={size} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function Sidebar({ userLabel }: { userLabel?: string }) {
  const pathname = usePathname();
  const profile = useBrandStore((s) => s.profile);
  const { sidebarCollapsed } = useDashboardShell();

  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(SIDEBAR_SECTIONS.map((s) => [s.label, true])),
  );

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  }

  const hidden = sidebarCollapsed;

  return (
    <aside
      aria-hidden={hidden}
      inert={hidden ? true : undefined}
      className={cn(
        "shrink-0 self-stretch min-h-0 sticky top-0 flex flex-col bg-[var(--bg-secondary)] font-medium",
        "transition-[width,opacity,padding] duration-200 ease-out motion-reduce:transition-none",
        hidden
          ? "w-0 max-w-0 overflow-hidden border-0 p-0 opacity-0 pointer-events-none"
          : "w-[240px] overflow-x-hidden pl-[8px] pr-0 pt-0 pb-[12px] opacity-100",
      )}
    >
      <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-0.5">
        <NavLink
          href="/dashboard/agent"
          label="New agent"
          Icon={Pen}
          active={isActive("/dashboard/agent")}
          topLevel
        />
        <NavLink
          href="/dashboard"
          label="Dashboard"
          Icon={LayoutDashboard}
          active={isActive("/dashboard")}
          topLevel
        />

        {SIDEBAR_SECTIONS.map((section) => {
          const open = openSections[section.label] ?? true;
          return (
            <div key={section.label} className="mt-5 first-of-type:mt-5">
              <button
                type="button"
                onClick={() => setOpenSections((s) => ({ ...s, [section.label]: !open }))}
                className="flex w-full items-center justify-between gap-2 px-3 pb-2 text-left text-caption font-semibold tracking-widest text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-secondary)]"
              >
                <span>{section.label}</span>
                {open ? (
                  <ChevronUp size={14} strokeWidth={1.5} className="shrink-0 opacity-70" />
                ) : (
                  <ChevronDown size={14} strokeWidth={1.5} className="shrink-0 opacity-70" />
                )}
              </button>
              {open ? (
                <div className="flex flex-col gap-0.5">
                  {section.items.map((slug) => {
                    const Icon = ICONS[slug];
                    const href = `/dashboard/${slug}`;
                    const hasTokens = profile
                      ? (() => {
                          const key = slug === "zindex" ? "zIndex" : (slug as keyof typeof profile);
                          const val = (profile as unknown as Record<string, unknown>)[key];
                          return Array.isArray(val) && val.length > 0;
                        })()
                      : true;
                    return (
                      <NavLink
                        key={slug}
                        href={href}
                        label={CATEGORY_LABELS[slug]}
                        Icon={Icon}
                        active={isActive(href)}
                        muted={!hasTokens}
                      />
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-[var(--border-subtle)] pt-3">
        <NavLink
          href="/dashboard/settings"
          label="Settings"
          Icon={SettingsIcon}
          active={isActive("/dashboard/settings")}
          topLevel
        />
        {userLabel ? (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-2.5 py-2 text-[12px] leading-4 text-[var(--text-secondary)]">
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--accent-subtle)] text-[12px] font-medium text-[var(--accent)]">
              {userLabel.slice(0, 1).toUpperCase()}
            </div>
            <span className="min-w-0 flex-1 truncate">{userLabel}</span>
            <ChevronDown
              size={14}
              strokeWidth={1.5}
              className="shrink-0 text-[var(--text-tertiary)] opacity-70"
              aria-hidden
            />
          </div>
        ) : null}
      </div>
    </aside>
  );
}
