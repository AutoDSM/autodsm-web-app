"use client";

import * as React from "react";
import { GitBranch, Menu, PanelLeft, PanelRight } from "lucide-react";
import { DashboardShellProvider, useDashboardShell } from "./dashboard-shell-context";
import { Sidebar } from "./sidebar";
import { TopBar } from "./topbar";
import { NavCommand } from "./nav-command";
import { DashboardNavLinks } from "./dashboard-nav-links";
import { useBrandStore } from "@/stores/brand";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RescanBanner } from "@/components/dashboard/token-page-kit";

function ShellTopBar({ userLabel }: { userLabel?: string }) {
  const { sidebarCollapsed, toggleSidebar } = useDashboardShell();
  const repoUrl = useBrandStore((s) => s.profile?.repo?.url);
  const repoSlug = useBrandStore((s) => s.repoSlug);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  const titleClasses =
    "text-center text-[12px] font-medium tracking-tight sm:text-[13px]";

  const repoLabel = repoSlug ?? "auto-dsm-ai";

  return (
    <>
      <div className="relative box-border flex h-[45px] shrink-0 items-center justify-center px-[12px] py-[6px]">
        <div className="absolute left-[12px] top-1/2 z-10 flex -translate-y-1/2 items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-expanded={!sidebarCollapsed}
                onClick={toggleSidebar}
                className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-md text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] active:scale-[0.97] md:inline-flex"
              >
                {sidebarCollapsed ? (
                  <PanelRight size={18} strokeWidth={1.5} />
                ) : (
                  <PanelLeft size={18} strokeWidth={1.5} />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[200px]">
              {sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Open navigation menu"
                onClick={() => setMobileNavOpen(true)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] active:scale-[0.97] md:hidden"
              >
                <Menu size={18} strokeWidth={1.5} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="md:hidden">
              Menu
            </TooltipContent>
          </Tooltip>

          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetContent
              side="left"
              className="w-[min(100%,280px)] gap-0 rounded-r-2xl border-0 p-0 shadow-[var(--shadow-lg)]"
            >
              <SheetHeader className="border-0 px-4 py-3 text-left">
                <SheetTitle className="text-h3 font-heading">Navigate</SheetTitle>
                <SheetDescription className="text-body-s">
                  Token categories and settings
                </SheetDescription>
              </SheetHeader>
              <ScrollArea className="h-[calc(100dvh-120px)] px-2 py-3">
                <DashboardNavLinks
                  userLabel={userLabel}
                  onNavigate={() => setMobileNavOpen(false)}
                />
              </ScrollArea>
            </SheetContent>
          </Sheet>

          <NavCommand />
        </div>

        {repoUrl ? (
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex max-w-[min(220px,calc(100%-180px))] items-center justify-center gap-1.5 sm:max-w-[min(280px,calc(100%-180px))] ${titleClasses} text-[var(--text-secondary)] underline decoration-[var(--text-tertiary)] decoration-1 underline-offset-[3px] transition-colors hover:text-[var(--text-primary)] hover:decoration-[var(--text-primary)]`}
            aria-label="Open connected repository on GitHub"
          >
            <GitBranch
              size={14}
              strokeWidth={1.75}
              className="shrink-0 text-[var(--text-tertiary)]"
              aria-hidden
            />
            <span className="truncate">{repoLabel}</span>
          </a>
        ) : (
          <span
            className={`pointer-events-none max-w-[min(220px,calc(100%-180px))] truncate sm:max-w-[min(280px,calc(100%-180px))] ${titleClasses} text-[var(--text-secondary)]`}
          >
            {repoLabel}
          </span>
        )}
      </div>
    </>
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
      <div className="flex h-[100dvh] max-h-[100dvh] min-h-0 flex-col overflow-hidden overflow-x-hidden bg-[var(--bg-canvas)]">
        <ShellTopBar userLabel={userLabel} />
        <div className="flex min-h-0 min-w-0 flex-1">
          <Sidebar userLabel={userLabel} />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col pt-0 px-3 pb-3">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-[var(--shadow-sm)]">
              <TopBar />
              <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
                <RescanBanner />
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShellProvider>
  );
}
