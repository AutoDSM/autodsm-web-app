"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabasePublicConfigured } from "@/lib/supabase/env";
import { ProductIcon } from "@/components/brand/product-mark";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const SUPABASE_SETUP_MESSAGE =
  "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and a public key (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY). On Vercel you can also use SUPABASE_URL and SUPABASE_ANON_KEY from the Supabase integration — then redeploy.";

function parseOAuthReturnError(url: URL): string | null {
  const description = url.searchParams.get("error_description");
  if (description) {
    try {
      return decodeURIComponent(description.replace(/\+/g, " "));
    } catch {
      return description.replace(/\+/g, " ");
    }
  }
  const raw = url.searchParams.get("error");
  if (!raw) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw.replace(/\+/g, " "));
  } catch {
    decoded = raw;
  }
  if (decoded.startsWith("{")) {
    try {
      const parsed = JSON.parse(decoded) as { error?: string; message?: string };
      return parsed.error ?? parsed.message ?? decoded;
    } catch {
      /* fall through */
    }
  }
  return decoded;
}

export default function LoginPage() {
  const [loading, setLoading] = React.useState<"github" | "google" | null>(null);
  const [errorFromQuery, setErrorFromQuery] = React.useState<string | null>(null);
  const supabaseReady = React.useMemo(() => isSupabasePublicConfigured(), []);

  React.useEffect(() => {
    const url = new URL(window.location.href);
    const err = parseOAuthReturnError(url);
    if (err) setErrorFromQuery(err);
  }, []);

  async function signIn(provider: "github" | "google") {
    if (!supabaseReady) {
      toast.error(SUPABASE_SETUP_MESSAGE);
      return;
    }
    setLoading(provider);
    try {
      const supabase = createClient();
      // Prefer NEXT_PUBLIC_APP_URL (e.g. https://autodsm.vercel.app on Vercel) so OAuth always
      // returns to the canonical deploy URL. Fall back to the current origin for local dev when unset.
      const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "").trim();
      const appOrigin =
        fromEnv && fromEnv.length > 0 ? fromEnv : window.location.origin.replace(/\/$/, "");
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${appOrigin}/auth/callback`,
          scopes: provider === "github" ? "read:user user:email" : undefined,
        },
      });
      if (error) toast.error(error.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-[var(--bg-primary)] px-6">
      <div className="w-full max-w-[420px] rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-10">
        <ProductIcon size={36} priority />
        <h2 className="mt-6 text-h2 text-[var(--text-primary)]">Sign in to autoDSM</h2>
        <p className="mt-2 text-body-s text-[var(--text-secondary)]">
          Connect your design system in under a minute.
        </p>

        {errorFromQuery ? (
          <p className="mt-4 text-[13px] leading-[18px] text-[var(--text-secondary)]">
            {errorFromQuery}
          </p>
        ) : null}

        {!supabaseReady ? (
          <div
            className="mt-4 flex gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 text-left"
            role="alert"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--text-primary)] text-[var(--bg-primary)] text-sm font-semibold">
              !
            </span>
            <p className="text-[13px] leading-[18px] text-[var(--text-secondary)]">
              {SUPABASE_SETUP_MESSAGE}
            </p>
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-3">
          <Button
            type="button"
            size="lg"
            className="w-full bg-[var(--text-primary)] text-[var(--bg-primary)] hover:opacity-90"
            onClick={() => signIn("github")}
            disabled={loading !== null || !supabaseReady}
          >
            <GithubGlyph />
            {loading === "github" ? "Redirecting…" : "Continue with GitHub"}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => signIn("google")}
            disabled={loading !== null || !supabaseReady}
          >
            <GoogleGlyph />
            {loading === "google" ? "Redirecting…" : "Continue with Google"}
          </Button>
        </div>

        <p className="mt-8 text-[12px] leading-[18px] text-[var(--text-tertiary)]">
          By continuing you agree to our terms and privacy policy. We read only
          your public profile + the repositories you connect.
        </p>
      </div>
    </div>
  );
}

function GithubGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.93c.57.1.79-.25.79-.55v-2c-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.27-1.68-1.27-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.75 1.18 1.75 1.18 1.02 1.75 2.68 1.24 3.34.94.1-.74.4-1.24.72-1.52-2.55-.29-5.24-1.27-5.24-5.67 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.17a10.9 10.9 0 0 1 5.74 0c2.18-1.48 3.14-1.17 3.14-1.17.63 1.58.24 2.75.12 3.04.74.8 1.18 1.83 1.18 3.08 0 4.41-2.69 5.38-5.25 5.66.41.36.77 1.06.77 2.13v3.16c0 .3.21.66.8.55A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z"/>
    </svg>
  );
}

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.7 3.9-5.5 3.9a6.1 6.1 0 1 1 0-12.2c1.9 0 3.2.8 4 1.5l2.7-2.6C16.9 3 14.7 2 12 2a10 10 0 1 0 0 20c5.8 0 9.6-4 9.6-9.8 0-.7-.1-1.2-.2-1.7H12Z"/>
      <path fill="#4285F4" d="M21.4 10.5H12v3.9h5.5c-.2 1.3-1.7 3.9-5.5 3.9v3.6c5.7 0 9.6-4 9.6-9.8 0-.7-.1-1.2-.2-1.6Z"/>
      <path fill="#FBBC05" d="M6 14.3a6 6 0 0 1 0-4.5l-3-2.4a10 10 0 0 0 0 9.3l3-2.4Z"/>
      <path fill="#34A853" d="M12 22c2.6 0 4.9-.9 6.5-2.4l-3-2.3c-.9.6-2 1-3.5 1-2.7 0-5-1.9-5.8-4.5L3 15.6A10 10 0 0 0 12 22Z"/>
    </svg>
  );
}
