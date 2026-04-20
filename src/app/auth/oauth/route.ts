import { createRouteHandlerClient } from "@/lib/supabase/route-handler-client";
import { getOAuthRedirectOrigin } from "@/lib/supabase/oauth-redirect";
import { getSupabasePublicKey, getSupabaseUrl } from "@/lib/supabase/env";
import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side OAuth start (PKCE cookies on the response). Avoids client-only cookie edge cases.
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
  try {
    supabase = await createRouteHandlerClient();
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
      // public_repo: list repos via GET /user/repos; read:user + email for profile
      scopes:
        provider === "github"
          ? "read:user user:email public_repo"
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

  return NextResponse.redirect(data.url);
}
