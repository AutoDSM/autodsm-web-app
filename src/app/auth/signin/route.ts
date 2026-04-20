import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const provider = searchParams.get("provider");

  if (provider !== "github" && provider !== "google") {
    return NextResponse.redirect(`${origin}/login?error=invalid_provider`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback`,
      scopes: provider === "github" ? "read:user user:email" : undefined,
    },
  });

  if (error || !data?.url) {
    const message = error?.message ?? "OAuth redirect could not be created";
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`);
  }

  return NextResponse.redirect(data.url);
}

