"use client";

import * as React from "react";
import { GitBranch, PanelLeft, PanelRight } from "lucide-react";
import { DashboardShellProvider, useDashboardShell } from "./dashboard-shell-context";
import { Sidebar } from "./sidebar";
import { TopBar } from "./topbar";
import { useBrandStore } from "@/stores/brand";

function ShellTopBar() {
  const { sidebarCollapsed, toggleSidebar } = useDashboardShell();
  const repoUrl = useBrandStore((s) => s.profile?.repo?.url);

  const titleClasses =
    "text-center text-[12px] font-medium tracking-tight sm:text-[13px]";

  return (
    <div className="relative box-border flex h-[45px] shrink-0 items-center justify-center bg-[#f7f7f8] px-[12px] py-[6px]">
      <button
        type="button"
        aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-expanded={!sidebarCollapsed}
        onClick={toggleSidebar}
        className="absolute left-[12px] top-1/2 z-10 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[8px] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] active:scale-[0.97]"
      >
        {sidebarCollapsed ? (
          <PanelRight size={18} strokeWidth={1.5} />
        ) : (
          <PanelLeft size={18} strokeWidth={1.5} />
        )}
      </button>
      {repoUrl ? (
        <a
          href={repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex max-w-[min(280px,calc(100%-96px))] items-center justify-center gap-1.5 ${titleClasses} text-[var(--text-secondary)] underline decoration-[var(--text-tertiary)] decoration-1 underline-offset-[3px] transition-colors hover:text-[var(--text-primary)] hover:decoration-[var(--text-primary)]`}
          aria-label="Open connected repository on GitHub"
        >
          <GitBranch
            size={14}
            strokeWidth={1.75}
            className="shrink-0 text-[var(--text-tertiary)]"
            aria-hidden
          />
          <span className="truncate">auto-dsm-ai</span>
        </a>
      ) : (
        <span
          className={`pointer-events-none max-w-[min(280px,calc(100%-96px))] truncate ${titleClasses} text-[var(--text-secondary)]`}
        >
          auto-dsm-ai
        </span>
      )}
    </div>
  );
}

/** On small viewports, default to collapsed sidebar so the main card gets width; user can still expand via toggle. */
function MobileSidebarFold() {
  const { setSidebarCollapsed } = useDashboardShell();

  React.useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(max-width: 767px)").matches) setSidebarCollapsed(true);
  }, [setSidebarCollapsed]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const onChange = () => {
      if (mq.matches) setSidebarCollapsed(true);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [setSidebarCollapsed]);

  return null;
}

export function DashboardShell({
  children,
  userLabel,
}: {
  children: React.ReactNode;
  userLabel?: string;
}) {
  return (
    <DashboardShellProvider>
      <MobileSidebarFold />
      {/* h/max-h + overflow-hidden: canvas fills one viewport; scroll lives inside white card + sidebar nav only */}
      <div className="flex h-[100dvh] max-h-[100dvh] min-h-0 flex-col overflow-hidden overflow-x-hidden bg-[var(--bg-canvas)]">
        <ShellTopBar />
        <div className="flex min-h-0 min-w-0 flex-1">
          <Sidebar userLabel={userLabel} />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col pt-0 px-3 pb-3">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-[var(--shadow-lg)]">
              <TopBar />
              <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShellProvider>
  );
}
