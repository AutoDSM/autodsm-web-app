"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { isSupabasePublicConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/client";
import { getAuthRedirectOrigin } from "@/lib/supabase/oauth-redirect";
import { ProductWordmark } from "@/components/brand/product-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GithubGlyph, GoogleGlyph } from "@/components/auth/oauth-glyphs";
import { setPreviewOnboarding } from "@/lib/onboarding/storage";
import { toast } from "sonner";

const SUPABASE_SETUP_MESSAGE =
  "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and a public key (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY). On Vercel you can also use SUPABASE_URL and SUPABASE_ANON_KEY from the Supabase integration — then redeploy.";

/** Shown when Supabase Auth returns "requested path is invalid" (often Site URL = *.supabase.co). */
const SITE_URL_FIX_HINT =
  "In Supabase Dashboard → Authentication → URL Configuration: set Site URL to https://autodsm.vercel.app (your app), not https://…supabase.co. Add https://autodsm.vercel.app/auth/callback to Redirect URLs. In GitHub OAuth App settings, the callback must stay Supabase’s URL (…/auth/v1/callback).";

function decodeOAuthParam(s: string): string {
  try {
    return decodeURIComponent(s.replace(/\+/g, " "));
  } catch {
    return s.replace(/\+/g, " ");
  }
}

function parseErrorParam(raw: string | null): string | null {
  if (!raw) return null;
  const decoded = decodeOAuthParam(raw);
  if (decoded.startsWith("{")) {
    try {
      const parsed = JSON.parse(decoded) as { error?: string; message?: string };
      return parsed.error ?? parsed.message ?? decoded;
    } catch {
      return decoded;
    }
  }
  return decoded;
}

function parseOAuthReturnError(url: URL): string | null {
  const description = url.searchParams.get("error_description");
  if (description) return decodeOAuthParam(description);
  return parseErrorParam(url.searchParams.get("error"));
}

function parseOAuthReturnErrorFromHash(hash: string): string | null {
  if (!hash || hash.length < 2) return null;
  const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const description = params.get("error_description");
  if (description) return decodeOAuthParam(description);
  return parseErrorParam(params.get("error"));
}

const DEV_PREVIEW = process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_ONBOARDING_DEV_PREVIEW === "1";

function formatMagicLinkError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("rate limit") ||
    lower.includes("over_email_send") ||
    lower.includes("email rate limit") ||
    lower.includes("too many requests")
  ) {
    return "Too many sign-in emails were sent from this network. Wait a few minutes and try again. If you use local Supabase, restart after changing limits: supabase stop && supabase start. If you use hosted Supabase, raise OTP/email limits under Dashboard → Authentication → Rate limits.";
  }
  return message;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isSignup = searchParams.get("mode") === "signup";
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState<"email" | "github" | "google" | null>(null);
  const [emailSent, setEmailSent] = React.useState(false);
  const [emailFieldError, setEmailFieldError] = React.useState<string | null>(null);
  const [errorFromQuery, setErrorFromQuery] = React.useState<string | null>(null);
  const supabaseReady = React.useMemo(() => isSupabasePublicConfigured(), []);

  React.useEffect(() => {
    const url = new URL(window.location.href);
    const err =
      parseOAuthReturnError(url) || parseOAuthReturnErrorFromHash(window.location.hash);
    if (err) setErrorFromQuery(err);
  }, []);

  React.useEffect(() => {
    setEmailSent(false);
    setEmailFieldError(null);
  }, [isSignup]);

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!supabaseReady) {
      toast.error(SUPABASE_SETUP_MESSAGE);
      return;
    }
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailFieldError("Enter your email address.");
      return;
    }
    setEmailFieldError(null);
    setLoading("email");
    try {
      // Must run in the browser so PKCE verifier lives in the same cookie jar as /auth/callback
      // (Route Handler POST + fetch() often drops verifier → "PKCE code verifier not found").
      const supabase = createClient();
      const origin = getAuthRedirectOrigin() || window.location.origin;
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: `${origin}/auth/callback`,
          shouldCreateUser: true,
        },
      });
      if (error) {
        setEmailFieldError(formatMagicLinkError(error.message));
        return;
      }
      setEmailSent(true);
    } catch {
      setEmailFieldError("Network error. Try again.");
    } finally {
      setLoading(null);
    }
  }

  function signIn(provider: "github" | "google") {
    if (!supabaseReady) {
      toast.error(SUPABASE_SETUP_MESSAGE);
      return;
    }
    setLoading(provider);
    window.location.assign(`/auth/oauth?provider=${encodeURIComponent(provider)}`);
  }

  function previewOnboarding() {
    setPreviewOnboarding(true);
    router.push("/onboarding/welcome?preview=1");
  }

  const title = isSignup ? "Create your account" : "Sign in to autoDSM";
  const subtitle = isSignup
    ? "Start building your branding system."
    : "Connect your design system in under a minute.";

  return (
    <div className="min-h-screen grid place-items-center bg-[var(--bg-primary)] px-6">
      <div className="w-full max-w-[420px] rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-10">
        <ProductWordmark width={160} priority />
        <h2 className="mt-6 text-h2 text-[var(--text-primary)]">{title}</h2>
        <p className="mt-2 text-body-s text-[var(--text-secondary)]">{subtitle}</p>

        {errorFromQuery ? (
          <div className="mt-4 space-y-2">
            <p className="text-[13px] leading-[18px] text-[var(--text-secondary)]">
              {errorFromQuery}
            </p>
            {errorFromQuery.toLowerCase().includes("requested path") ? (
              <p className="text-[13px] leading-[18px] text-[var(--text-secondary)]">
                {SITE_URL_FIX_HINT}
              </p>
            ) : null}
          </div>
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

        {supabaseReady ? (
          <div className="mt-8 flex flex-col gap-3">
            {emailSent ? (
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 text-left">
                <p className="text-[13px] leading-[18px] text-[var(--text-primary)] font-medium">
                  Check your email
                </p>
                <p className="mt-1 text-[13px] leading-[18px] text-[var(--text-secondary)]">
                  We sent a link to <span className="text-[var(--text-primary)]">{email.trim()}</span>. Open it to
                  sign in; if you are new here, the same link creates your account. You can close this tab after you
                  use the link.
                </p>
                <button
                  type="button"
                  className="mt-3 text-[13px] font-medium text-[var(--text-primary)] hover:underline underline-offset-2 [font-family:var(--font-geist-sans)]"
                  onClick={() => {
                    setEmailSent(false);
                    setEmailFieldError(null);
                  }}
                >
                  Use a different email
                </button>
              </div>
            ) : (
              <form className="flex flex-col gap-3" onSubmit={submitEmail}>
                <label htmlFor="login-email" className="sr-only">
                  Email
                </label>
                <Input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(ev) => {
                    setEmail(ev.target.value);
                    if (emailFieldError) setEmailFieldError(null);
                  }}
                  disabled={loading !== null}
                  className="bg-[var(--bg-secondary)]"
                />
                {emailFieldError ? (
                  <p className="text-[13px] leading-[18px] text-[var(--text-secondary)]" role="alert">
                    {emailFieldError}
                  </p>
                ) : null}
                <Button type="submit" size="lg" className="w-full" disabled={loading !== null}>
                  {loading === "email" ? "Sending link…" : "Continue with Email"}
                </Button>
              </form>
            )}

            <div className="relative my-1" aria-hidden="true">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--border-default)]" />
              </div>
              <div className="relative flex justify-center text-[12px]">
                <span className="bg-[var(--bg-elevated)] px-3 text-[var(--text-secondary)] [font-family:var(--font-geist-sans)]">
                  or
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full border border-[var(--border-default)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-canvas)] dark:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-tertiary)]"
              onClick={() => signIn("github")}
              disabled={loading !== null}
            >
              <GithubGlyph />
              {loading === "github" ? "Redirecting…" : "Continue with GitHub"}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full border border-[var(--border-default)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-canvas)] dark:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-tertiary)]"
              onClick={() => signIn("google")}
              disabled={loading !== null}
            >
              <GoogleGlyph />
              {loading === "google" ? "Redirecting…" : "Continue with Google"}
            </Button>
          </div>
        ) : null}

        {isSignup ? (
          <p className="mt-8 text-center text-[14px] text-[var(--text-secondary)] [font-family:var(--font-geist-sans)]">
            Already have an account?{" "}
            <Link
              href="/login?mode=login"
              className="font-medium text-[var(--text-primary)] hover:underline underline-offset-2"
            >
              Log in
            </Link>
          </p>
        ) : (
          <p className="mt-8 text-center text-[14px] text-[var(--text-secondary)] [font-family:var(--font-geist-sans)]">
            New to autoDSM?{" "}
            <Link
              href="/login?mode=signup"
              className="font-medium text-[var(--text-primary)] hover:underline underline-offset-2"
            >
              Create an account
            </Link>
          </p>
        )}

        <p className="mt-4 text-center text-[12px] leading-[18px] text-[var(--text-tertiary)]">
          By continuing you agree to our terms and privacy policy. We read only
          your public profile + the repositories you connect.
        </p>

        {DEV_PREVIEW ? (
          <div className="mt-8 border-t border-[var(--border-subtle)] pt-6">
            <p className="text-[12px] text-center text-[var(--text-tertiary)] mb-2">Developer</p>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-[13px] text-[var(--text-secondary)]"
              onClick={previewOnboarding}
            >
              Preview onboarding (no auth)
            </Button>
            <Button asChild variant="ghost" className="mt-2 w-full text-[13px] text-[var(--text-secondary)]">
              <Link href="/demo">Open app demo (no auth)</Link>
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
