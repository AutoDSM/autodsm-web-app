"use client";

import * as React from "react";

export const DEFAULT_DASHBOARD_APP_BASE_PATH = "/dashboard";

export type AppMarkVariant = "perplexity" | "autodsm";

type AppChrome = {
  appBasePath: string;
  markVariant: AppMarkVariant;
};

const AppChromeContext = React.createContext<AppChrome>({
  appBasePath: DEFAULT_DASHBOARD_APP_BASE_PATH,
  markVariant: "perplexity",
});

export function DashboardAppChromeProvider({
  appBasePath = DEFAULT_DASHBOARD_APP_BASE_PATH,
  markVariant = "perplexity",
  children,
}: {
  appBasePath?: string;
  markVariant?: AppMarkVariant;
  children: React.ReactNode;
}) {
  const value = React.useMemo(
    () => ({ appBasePath, markVariant }),
    [appBasePath, markVariant],
  );
  return <AppChromeContext.Provider value={value}>{children}</AppChromeContext.Provider>;
}

export function useDashboardAppChrome(): AppChrome {
  return React.useContext(AppChromeContext);
}

export function useDashboardAppBasePath(): string {
  return React.useContext(AppChromeContext).appBasePath;
}

export function useAppMarkVariant(): AppMarkVariant {
  return React.useContext(AppChromeContext).markVariant;
}
