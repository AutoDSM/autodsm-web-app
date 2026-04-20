import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadMyBrand } from "@/lib/brand/load";
import { getDevPreviewRepoSlug, isDevAuthBypassEnabled } from "@/lib/dev/local-preview";
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

  if (!isDevAuthBypassEnabled() && !user) redirect("/login");

  const brand = await loadMyBrand();
  if (!brand) redirect("/onboarding");

  if (brand.status === "unsupported") {
    redirect(
      `/onboarding/unsupported?repo=${encodeURIComponent(brand.repoSlug)}&reason=${encodeURIComponent(brand.unsupportedReason ?? "")}`,
    );
  }

  let userLabel: string;
  if (isDevAuthBypassEnabled()) {
    userLabel = `Dev preview · ${getDevPreviewRepoSlug()}`;
  } else {
    if (!user) redirect("/login");
    userLabel =
      (user.user_metadata?.user_name as string | undefined) ??
      (user.user_metadata?.full_name as string | undefined) ??
      user.email ??
      "You";
  }

  return (
    <BrandProvider profile={brand.profile} repoSlug={brand.repoSlug}>
      <DashboardShell userLabel={userLabel}>
        {children}
      </DashboardShell>
    </BrandProvider>
  );
}
