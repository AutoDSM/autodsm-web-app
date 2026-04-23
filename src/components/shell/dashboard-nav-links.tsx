"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Settings as SettingsIcon,
  Pen,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBrandStore } from "@/stores/brand";
import {
  SIDEBAR_SECTIONS,
  CATEGORY_LABELS,
  countCategory,
  type BrandCategory,
} from "@/lib/brand/types";
import { DASHBOARD_CATEGORY_ICONS } from "@/lib/dashboard-category-icons";
import { useDashboardAppBasePath } from "@/components/shell/dashboard-app-context";

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
      strokeWidth={active ? 2.25 : 2}
      fill="none"
      className={cn(
        "shrink-0 pointer-events-none transition-[stroke-width,fill] duration-150",
        active ? "font-medium" : "font-semibold",
        active
          ? "text-[var(--text-primary)]"
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
  onNavigate,
}: {
  href: string;
  label: string;
  Icon: LucideIcon;
  active: boolean;
  muted?: boolean;
  topLevel?: boolean;
  iconSize?: number;
  onNavigate?: () => void;
}) {
  const size = iconSize ?? (topLevel ? 14 : 13);
  return (
    <Link
      href={href}
      onClick={() => onNavigate?.()}
      className={cn(
        "flex h-8 min-h-8 items-center gap-2 rounded-md text-[12px] leading-4",
        "transition-colors duration-150 [transition-timing-function:var(--ease-standard)]",
        topLevel ? "w-[224px] px-3" : "w-[224px] pl-4 pr-1",
        active
          ? [
              "bg-[var(--bg-elevated)] font-medium text-[var(--text-primary)]",
              "border border-[var(--border-subtle)] shadow-[var(--shadow-sm)]",
            ].join(" ")
          : [
              "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
              "hover:bg-[var(--bg-secondary)] active:bg-[var(--bg-secondary)]",
              "dark:hover:bg-[var(--bg-tertiary)] dark:active:bg-[var(--bg-elevated)]",
            ].join(" "),
        muted && !active && "text-[var(--text-tertiary)]",
      )}
    >
      <SidebarNavIcon icon={Icon} active={active} muted={muted} size={size} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function DashboardNavLinks({
  onNavigate,
  userLabel,
}: {
  onNavigate?: () => void;
  userLabel?: string;
}) {
  const pathname = usePathname();
  const appBasePath = useDashboardAppBasePath();
  const profile = useBrandStore((s) => s.profile);

  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(SIDEBAR_SECTIONS.map((s) => [s.label, true])),
  );

  function isActive(href: string) {
    if (href === appBasePath) return pathname === appBasePath;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col justify-center items-stretch">
      <nav className="flex h-fit w-full flex-col gap-3">
        <div className="flex flex-col gap-0">
          <NavLink
            href={`${appBasePath}/agent`}
            label="New agent"
            Icon={Pen}
            active={isActive(`${appBasePath}/agent`)}
            topLevel
            onNavigate={onNavigate}
          />
          <NavLink
            href={appBasePath}
            label="Dashboard"
            Icon={LayoutDashboard}
            active={isActive(appBasePath)}
            topLevel
            onNavigate={onNavigate}
          />
        </div>

        {SIDEBAR_SECTIONS.map((section) => {
          const visibleSlugs = section.items.filter((slug) => {
            if (!profile) return true;
            return countCategory(profile, slug as BrandCategory) > 0;
          });
          if (visibleSlugs.length === 0) return null;

          const open = openSections[section.label] ?? true;
          return (
            <div key={section.label} className="mt-5 first-of-type:mt-5">
              <button
                type="button"
                onClick={() => setOpenSections((s) => ({ ...s, [section.label]: !open }))}
                className={[
                  "flex w-[224px] items-center justify-between gap-2 px-3 pb-2 text-left text-caption font-semibold tracking-widest",
                  "text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-secondary)]",
                  "hover:bg-[var(--bg-secondary)]/40 active:bg-[var(--bg-secondary)]/55",
                  "dark:hover:bg-[var(--bg-tertiary)]/35 dark:active:bg-[var(--bg-elevated)]/55",
                  "rounded-md",
                ].join(" ")}
              >
                <span>{section.label}</span>
                {open ? (
                  <ChevronUp size={14} strokeWidth={1.5} className="shrink-0 opacity-70" />
                ) : (
                  <ChevronDown size={14} strokeWidth={1.5} className="shrink-0 opacity-70" />
                )}
              </button>
              {open ? (
                <div className="flex flex-col gap-0">
                  {visibleSlugs.map((slug) => {
                    const Icon = DASHBOARD_CATEGORY_ICONS[slug] ?? LayoutDashboard;
                    const href = `${appBasePath}/${slug}`;
                    return (
                      <NavLink
                        key={slug}
                        href={href}
                        label={CATEGORY_LABELS[slug]}
                        Icon={Icon}
                        active={isActive(href)}
                        onNavigate={onNavigate}
                      />
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="mt-auto flex h-fit w-full shrink-0 flex-col pt-3">
        <NavLink
          href={`${appBasePath}/settings`}
          label="Settings"
          Icon={SettingsIcon}
          active={isActive(`${appBasePath}/settings`)}
          topLevel
          onNavigate={onNavigate}
        />
        {userLabel ? (
          <div className="mt-2 flex items-center gap-2 rounded-lg border-0 [background:unset] px-2.5 py-2 text-[12px] leading-4 text-[var(--text-secondary)] shadow-none">
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-[12px] font-medium text-white">
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
    </div>
  );
}
