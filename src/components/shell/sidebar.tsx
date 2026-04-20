"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ProductWordmark } from "@/components/brand/product-mark";
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
  PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBrandStore } from "@/stores/brand";
import { SIDEBAR_SECTIONS, CATEGORY_LABELS } from "@/lib/brand/types";

const ICONS: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
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

function NavLink({
  href,
  label,
  icon,
  active,
  muted,
  topLevel,
}: {
  href: string;
  label: string;
  icon?: React.ReactNode;
  active: boolean;
  muted?: boolean;
  topLevel?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex items-center gap-2.5 py-1.5 rounded-[8px] text-[13px]",
        "transition-colors duration-150 [transition-timing-function:var(--ease-standard)]",
        topLevel ? "px-3" : "pl-4 pr-3",
        active
          ? "bg-[var(--accent-subtle)] text-[var(--text-primary)] font-medium"
          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]",
        muted && !active && "text-[var(--text-tertiary)]",
      )}
    >
      {active ? (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-[var(--accent)]" />
      ) : null}
      {icon}
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function Sidebar({ userLabel }: { userLabel?: string }) {
  const pathname = usePathname();
  const profile = useBrandStore((s) => s.profile);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="w-[240px] shrink-0 h-screen sticky top-0 flex flex-col bg-[var(--bg-primary)] px-3 py-4">
      <div className="flex items-center justify-between px-2 pb-4">
        <Link href="/dashboard" className="flex items-center min-w-0">
          <ProductWordmark width={100} height={36} />
        </Link>
        <button
          aria-label="Toggle sidebar"
          className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <PanelLeft size={16} strokeWidth={1.5} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto pr-0.5">
        <NavLink
          href="/dashboard"
          label="Overview"
          icon={<LayoutDashboard size={16} strokeWidth={1.5} />}
          active={isActive("/dashboard")}
          topLevel
        />

        {SIDEBAR_SECTIONS.map((section) => (
          <div key={section.label} className="mt-6 mb-2 first-of-type:mt-6">
            <div className="px-3 pb-2 text-caption text-[var(--text-tertiary)] tracking-widest">
              {section.label}
            </div>
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
                    icon={Icon ? <Icon size={14} strokeWidth={1.5} /> : null}
                    active={isActive(href)}
                    muted={!hasTokens}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="pt-3 border-t border-[var(--border-subtle)] mt-2">
        <NavLink
          href="/dashboard/settings"
          label="Settings"
          icon={<SettingsIcon size={16} strokeWidth={1.5} />}
          active={isActive("/dashboard/settings")}
          topLevel
        />
        {userLabel ? (
          <div className="mt-3 px-2 py-2 flex items-center gap-2 rounded-[8px]">
            <div className="h-7 w-7 rounded-full bg-[var(--accent-subtle)] grid place-items-center text-[12px] font-medium text-[var(--accent)]">
              {userLabel.slice(0, 1).toUpperCase()}
            </div>
            <span className="text-[13px] text-[var(--text-secondary)] truncate">
              {userLabel}
            </span>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
