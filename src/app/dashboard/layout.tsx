import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadMyBrand } from "@/lib/brand/load";
import { getDevPreviewRepoSlug, isDevAuthBypassEnabled } from "@/lib/dev/local-preview";
import { isTestDashboardBypassEnabled } from "@/lib/dev/test-dashboard-bypass";
import { BrandProvider } from "@/components/brand/brand-provider";
import { DashboardRepoIssueBanner } from "@/components/dashboard/dashboard-repo-issue-banner";
import { DashboardShell } from "@/components/shell/dashboard-shell";
import { shouldShowRepoLoadBanner } from "@/lib/brand/repo-load-issue";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isDevAuthBypassEnabled() && !isTestDashboardBypassEnabled() && !user) {
    redirect("/login");
  }

  const brand = await loadMyBrand();
  if (!brand) redirect("/onboarding");

  let userLabel: string;
  if (isTestDashboardBypassEnabled() && !isDevAuthBypassEnabled()) {
    userLabel = `Test preview · ${getDevPreviewRepoSlug()}`;
  } else if (isDevAuthBypassEnabled()) {
    userLabel = `Dev preview · ${getDevPreviewRepoSlug()}`;
  } else {
    const repoName = brand.profile?.repo?.name ?? brand.repoSlug.split("/")[1] ?? "Project";
    userLabel = brand.profile?.meta?.projectName ?? repoName;
  }

  const showPreviewOnboardingLink =
    isTestDashboardBypassEnabled() &&
    !isDevAuthBypassEnabled() &&
    process.env.VERCEL_ENV === "preview";

  const repoIssueBanner =
    shouldShowRepoLoadBanner(brand.status) ? (
      <DashboardRepoIssueBanner
        repoSlug={brand.repoSlug}
        status={brand.status}
        reasonCode={brand.unsupportedReason}
        lastScanError={brand.lastScanError}
      />
    ) : null;

  return (
    <BrandProvider profile={brand.profile} repoSlug={brand.repoSlug}>
      <DashboardShell
        userLabel={userLabel}
        showPreviewOnboardingLink={showPreviewOnboardingLink}
        repoIssueBanner={repoIssueBanner}
      >
        {children}
      </DashboardShell>
    </BrandProvider>
  );
}
