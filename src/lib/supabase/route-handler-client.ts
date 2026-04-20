import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireSupabasePublicConfig } from "./env";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Supabase client for Route Handlers only. Cookie `setAll` must not swallow errors:
 * PKCE verifier cookies for OAuth must be set on the outgoing response.
 */
export async function createRouteHandlerClient() {
  const cookieStore = await cookies();
  const { url, key } = requireSupabasePublicConfig();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value, options }: CookieToSet) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}
