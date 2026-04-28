import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabasePublicConfig } from "./env";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Route Handler Supabase client where auth cookie writes are captured and applied
 * to the **returned** `NextResponse`.
 *
 * Next.js App Router does not reliably attach `cookies().set()` from `next/headers`
 * to a manually returned `NextResponse.redirect()`. Without this, PKCE verifiers and
 * session cookies never reach the browser → "PKCE code verifier not found in storage".
 *
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export function createSupabaseRouteHandlerClient(request: NextRequest): {
  supabase: SupabaseClient;
  /** Apply every Set-Cookie from this auth exchange onto `response` (typical: redirect). */
  applyCookies: (response: NextResponse) => NextResponse;
} {
  const { url, key } = requireSupabasePublicConfig();
  const cookieWrites = new Map<string, CookieToSet>();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        const incoming = request.cookies.getAll();
        const merged = new Map(incoming.map((c) => [c.name, c]));
        cookieWrites.forEach((c) => {
          merged.set(c.name, { name: c.name, value: c.value });
        });
        return Array.from(merged.values());
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach((c) => {
          cookieWrites.set(c.name, c);
        });
      },
    },
  });

  function applyCookies(response: NextResponse): NextResponse {
    cookieWrites.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
    return response;
  }

  return { supabase, applyCookies };
}
