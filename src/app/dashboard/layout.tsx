import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadMyBrand } from "@/lib/brand/load";
import { getDevPreviewRepoSlug, isDevAuthBypassEnabled } from "@/lib/dev/local-preview";
import { isTestDashboardBypassEnabled } from "@/lib/dev/test-dashboard-bypass";
import { BrandProvider } from "@/components/brand/brand-provider";
import { DashboardShell } from "@/components/shell/dashboard-shell";

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

  if (brand.status === "unsupported") {
    redirect(
      `/onboarding/unsupported?repo=${encodeURIComponent(brand.repoSlug)}&reason=${encodeURIComponent(brand.unsupportedReason ?? "")}`,
    );
  }

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

  return (
    <BrandProvider profile={brand.profile} repoSlug={brand.repoSlug}>
      <DashboardShell
        userLabel={userLabel}
        showPreviewOnboardingLink={showPreviewOnboardingLink}
      >
        {children}
      </DashboardShell>
    </BrandProvider>
  );
}
