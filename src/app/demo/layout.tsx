import type { Metadata } from "next";
import { buildAutodsmProductDemoProfile } from "@/lib/brand/demo-profile";
import { BrandProvider } from "@/components/brand/brand-provider";
import { DashboardShell } from "@/components/shell/dashboard-shell";

export const metadata: Metadata = {
  title: "autoDSM — Product demo",
  robots: { index: false, follow: false },
};

/**
 * Public, no-auth app shell with synthetic brand data and core AutoDSM (not Perplexity) chrome.
 * See `docs/DEMO.md`.
 */
export default function DemoLayout({ children }: { children: React.ReactNode }) {
  const profile = buildAutodsmProductDemoProfile();
  return (
    <BrandProvider profile={profile} repoSlug="autodsm/product-demo">
      <DashboardShell userLabel="autoDSM demo" appBasePath="/demo" markVariant="autodsm">
        {children}
      </DashboardShell>
    </BrandProvider>
  );
}
