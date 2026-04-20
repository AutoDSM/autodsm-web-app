"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ProductIcon } from "@/components/brand/product-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeRepoInput } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowRight, Github } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [value, setValue] = React.useState("");
  const [provider, setProvider] = React.useState<"github" | "google" | null>(null);

  React.useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      const appMetaProvider =
        (user?.app_metadata?.provider as string | undefined) ?? null;
      if (appMetaProvider === "github") setProvider("github");
      else if (appMetaProvider === "google") setProvider("google");
    });
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalizeRepoInput(value);
    if (!normalized) {
      toast.error("Enter owner/repo or a github.com URL.");
      return;
    }
    router.push(`/onboarding/scanning?repo=${encodeURIComponent(normalized)}`);
  }

  return (
    <div className="min-h-screen grid place-items-center bg-[var(--bg-primary)] px-6">
      <div className="w-full max-w-[460px] rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-10">
        <ProductIcon size={28} priority />
        <h2 className="mt-6 text-h2 text-[var(--text-primary)]">Connect a repository</h2>
        <p className="mt-2 text-body-s text-[var(--text-secondary)]">
          Paste a GitHub URL or <code className="text-mono text-[12px] text-[var(--text-primary)]">owner/repo</code>.
          {provider === "google"
            ? " Install the GitHub App for private repos."
            : " Public repos work out of the box."}
        </p>

        <form className="mt-6 flex flex-col gap-3" onSubmit={submit}>
          <Input
            placeholder="vercel/next.js"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-11 text-[14px]"
            autoFocus
          />
          <Button type="submit" size="lg" className="w-full">
            Scan repository
            <ArrowRight size={15} strokeWidth={1.8} />
          </Button>
        </form>

        {provider !== "github" && (
          <div className="mt-6 pt-6 border-t border-[var(--border-subtle)]">
            <a
              href="https://github.com/apps/autodsm"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <Github size={14} strokeWidth={1.5} />
              Install autoDSM on GitHub →
            </a>
            <p className="mt-2 text-[12px] text-[var(--text-tertiary)]">
              Required for private repositories.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
