"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProductIcon } from "@/components/brand/product-mark";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

function UnsupportedPageInner() {
  const params = useSearchParams();
  const repo = params.get("repo");
  const reason = params.get("reason");
  const [email, setEmail] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast.error("Enter a valid email address.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("brand_waitlist")
      .insert({ email, repo, framework: reason ?? null });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSubmitted(true);
  }

  return (
    <div className="grid min-h-screen min-w-0 place-items-center bg-[var(--bg-primary)] px-4 py-8 sm:px-6">
      <div className="w-full min-w-0 max-w-[460px] rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-6 sm:p-8 md:p-10">
        <ProductIcon size={28} />
        <h2 className="mt-6 text-h2 text-[var(--text-primary)]">
          autoDSM currently supports React + TypeScript.
        </h2>
        <p className="mt-2 text-body-s text-[var(--text-secondary)]">
          {repo ? (
            <>
              We couldn&apos;t detect a supported framework in{" "}
              <code className="text-mono text-[12px] text-[var(--text-primary)]">{repo}</code>.
            </>
          ) : (
            "Tell us what framework you use and we'll let you know when support arrives."
          )}
        </p>

        {submitted ? (
          <div className="mt-6 rounded-[8px] border border-[color-mix(in_srgb,var(--success)_40%,transparent)] bg-[color-mix(in_srgb,var(--success)_8%,transparent)] p-4 text-[13px] text-[var(--success)]">
            Thanks — we&apos;ll email you when {reason ? reason : "your framework"} is supported.
          </div>
        ) : (
          <form className="mt-6 flex flex-col gap-3" onSubmit={submit}>
            <Input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11"
            />
            <Button type="submit" size="lg" disabled={loading}>
              {loading ? "Submitting…" : "Notify me"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function UnsupportedPage() {
  return (
    <React.Suspense fallback={null}>
      <UnsupportedPageInner />
    </React.Suspense>
  );
}
