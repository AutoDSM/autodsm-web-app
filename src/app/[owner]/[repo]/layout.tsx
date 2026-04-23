import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadPublicBrand } from "@/lib/brand/load";
import { BrandProvider } from "@/components/brand/brand-provider";
import { PublicTopNav } from "@/components/public/top-nav";
import { PublicFooter } from "@/components/public/footer";

type Params = Promise<{ owner: string; repo: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { owner, repo } = await params;
  const brand = await loadPublicBrand(owner, repo);
  if (!brand || !brand.profile) {
    return {
      title: `${owner}/${repo} — autoDSM`,
      robots: { index: false, follow: false },
    };
  }
  return {
    title: `${owner} / ${repo} — Brand Book | autoDSM`,
    description: `Auto-generated brand book for ${owner}/${repo} — colors, typography, spacing, and more.`,
    robots: { index: brand.isPublic, follow: brand.isPublic },
    openGraph: {
      title: `${owner} / ${repo} — Brand Book`,
      description: `Auto-generated brand book for ${owner}/${repo}.`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${owner} / ${repo} — Brand Book`,
      description: `Auto-generated brand book for ${owner}/${repo}.`,
    },
  };
}

export default async function PublicBrandLayout({
  params,
  children,
}: {
  params: Params;
  children: React.ReactNode;
}) {
  const { owner, repo } = await params;
  const brand = await loadPublicBrand(owner, repo);

  if (!brand || !brand.isPublic) {
    notFound();
  }

  return (
    <BrandProvider profile={brand.profile} repoSlug={brand.repoSlug}>
      <div className="min-h-screen bg-[var(--bg-primary)]">
        <PublicTopNav owner={owner} repo={repo} />
        <main className="w-full min-w-0">
          {children}
        </main>
        <PublicFooter />
      </div>
    </BrandProvider>
  );
}
