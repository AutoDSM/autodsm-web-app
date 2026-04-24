import { createRouteHandlerClient } from "@/lib/supabase/route-handler-client";
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

const EMAIL_OTP_TYPES: ReadonlySet<string> = new Set([
  "email",
  "signup",
  "magiclink",
  "recovery",
  "email_change",
]);

function isEmailOtpType(t: string): t is EmailOtpType {
  return EMAIL_OTP_TYPES.has(t);
}

async function finishAuthSession(
  supabase: Awaited<ReturnType<typeof createRouteHandlerClient>>,
  origin: string,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.redirect(`${origin}/login`);

  await supabase
    .from("app_users")
    .upsert(
      {
        id: user.id,
        email: user.email,
        full_name:
          (user.user_metadata?.full_name as string | undefined) ??
          (user.user_metadata?.name as string | undefined) ??
          null,
        avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
        github_login: (user.user_metadata?.user_name as string | undefined) ?? null,
      },
      { onConflict: "id" },
    );

  return NextResponse.redirect(`${origin}/auth/bridge`);
}

/**
 * Supabase auth callback: OAuth PKCE (`code`) or email magic link (`token_hash` + `type`).
 * Ensures app_users row, then /auth/bridge for pending-repo sessionStorage handling.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const otpTypeRaw = searchParams.get("type");
  const otpType = otpTypeRaw?.toLowerCase() ?? "";
  const errorDescription = searchParams.get("error_description");

  if (errorDescription) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription)}`,
    );
  }

  const supabase = await createRouteHandlerClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`,
      );
    }
    return finishAuthSession(supabase, origin);
  }

  if (tokenHash && otpType && isEmailOtpType(otpType)) {
    const { error } = await supabase.auth.verifyOtp({
      type: otpType as EmailOtpType,
      token_hash: tokenHash,
    });
    if (error) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`,
      );
    }
    return finishAuthSession(supabase, origin);
  }

  return NextResponse.redirect(`${origin}/login`);
}
