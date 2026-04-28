import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler-client";
import { getOAuthRedirectOrigin } from "@/lib/supabase/oauth-redirect";
import { getSupabasePublicKey, getSupabaseUrl } from "@/lib/supabase/env";
import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side OAuth start (PKCE cookies on the redirect response).
 * Cookie writes must be merged onto `NextResponse.redirect` — see `createSupabaseRouteHandlerClient`.
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function GET(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get("provider");
  if (provider !== "github" && provider !== "google") {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("Invalid provider")}`, request.url),
    );
  }

  if (!getSupabaseUrl() || !getSupabasePublicKey()) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent("Supabase is not configured")}`,
        request.url,
      ),
    );
  }

  let supabase;
  let applyCookies: (r: NextResponse) => NextResponse;
  try {
    const ctx = createSupabaseRouteHandlerClient(request);
    supabase = ctx.supabase;
    applyCookies = ctx.applyCookies;
  } catch {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent("Supabase is not configured")}`,
        request.url,
      ),
    );
  }

  const redirectOrigin = getOAuthRedirectOrigin(request);
  const redirectTo = `${redirectOrigin}/auth/callback`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      scopes:
        provider === "github"
          ? "read:user user:email repo"
          : undefined,
    },
  });

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url),
    );
  }

  if (!data.url) {
    return NextResponse.redirect(
      new URL("/login?error=no_oauth_url", request.url),
    );
  }

  return applyCookies(NextResponse.redirect(data.url));
}
