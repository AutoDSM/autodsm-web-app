"use client";

import * as React from "react";

interface DashboardShellContextValue {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  toggleSidebar: () => void;
}

const DashboardShellContext = React.createContext<DashboardShellContextValue | null>(
  null,
);

export function DashboardShellProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const toggleSidebar = React.useCallback(() => {
    setSidebarCollapsed((c) => !c);
  }, []);

  const value = React.useMemo(
    () => ({
      sidebarCollapsed,
      setSidebarCollapsed,
      toggleSidebar,
    }),
    [sidebarCollapsed, toggleSidebar],
  );

  return (
    <DashboardShellContext.Provider value={value}>
      {children}
    </DashboardShellContext.Provider>
  );
}

export function useDashboardShell() {
  const ctx = React.useContext(DashboardShellContext);
  if (!ctx) {
    throw new Error("useDashboardShell must be used within DashboardShellProvider");
  }
  return ctx;
}

export function useOptionalDashboardShell() {
  return React.useContext(DashboardShellContext);
}
