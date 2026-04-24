import type { NextRequest } from "next/server";

/**
 * OAuth return URL origin. Prefer NEXT_PUBLIC_APP_URL (e.g. https://autodsm.vercel.app)
 * so production builds always match Supabase Site URL / Redirect URLs.
 * Falls back to the incoming request when unset (local dev).
 */
export function getOAuthRedirectOrigin(request: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "").trim();
  if (fromEnv) return fromEnv;
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  if (host) return `${proto}://${host}`;
  return request.nextUrl.origin;
}

/**
 * Origin for `emailRedirectTo` when magic link is started from the browser.
 * Prefer NEXT_PUBLIC_APP_URL so prod matches Supabase redirect allow-list; otherwise `window.location.origin`.
 */
export function getAuthRedirectOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "").trim();
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}
