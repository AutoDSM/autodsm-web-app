import { redirect } from "next/navigation";
import { loadMyBrand } from "@/lib/brand/load";
import { OnboardingReviewClient } from "./review-client";

export default async function OnboardingReviewPage() {
  const brand = await loadMyBrand();
  if (!brand?.profile) {
    redirect("/onboarding/connect");
  }
  return (
    <OnboardingReviewClient
      initialProfile={brand.profile}
      repoSlug={brand.repoSlug}
      status={brand.status}
      lastScanError={brand.lastScanError}
    />
  );
}
