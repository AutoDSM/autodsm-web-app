"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ProductIcon } from "@/components/brand/product-mark";

/**
 * Client-side hop after OAuth. Reads sessionStorage pending repo and routes:
 *   1. If pending repo → /onboarding/scanning?repo=<slug>
 *   2. Else check DB for existing repo → /dashboard
 *   3. Else → /onboarding
 */
export default function AuthBridge() {
  const router = useRouter();

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      let pending: string | null = null;
      try {
        pending = sessionStorage.getItem("autodsm.pendingRepo");
        if (pending) sessionStorage.removeItem("autodsm.pendingRepo");
      } catch {
        // ignore
      }

      if (pending) {
        router.replace(`/onboarding/scanning?repo=${encodeURIComponent(pending)}`);
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data } = await supabase
        .from("brand_repos")
        .select("owner,name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      router.replace(data ? "/dashboard" : "/onboarding");
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="min-h-screen grid place-items-center bg-[var(--bg-primary)]">
      <div className="flex flex-col items-center gap-3">
        <ProductIcon size={32} className="autodsm-pulse" />
        <p className="text-body-s text-[var(--text-secondary)]">Signing you in…</p>
      </div>
    </div>
  );
}
