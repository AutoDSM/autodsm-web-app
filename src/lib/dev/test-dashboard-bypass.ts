import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Non-production "test" dashboard access: skip Supabase login and the onboarding
 * flow by serving the synthetic demo BrandProfile (same as DEV_AUTH_BYPASS).
 *
 * Safety:
 * - Refused when `VERCEL_ENV=production` (Vercel Production) even if flags are set.
 * - For local `next dev`, requires `E2E_DASHBOARD_BYPASS=1` in addition to
 *   `TEST_DASHBOARD_BYPASS` so the bypass cannot be enabled by accident in dev.
 * - Vercel Preview: `TEST_DASHBOARD_BYPASS=true` plus a strong
 *   `TEST_DASHBOARD_BYPASS_SECRET` (see `docs/E2E_PREVIEW.md`). The secret is
 *   compared to a second env var with `timingSafeEqual` so a partial leak is not
 *   enough to enable the bypass.
 */

const MIN_BYPASS_SECRET_LEN = 32;

function verifyBypassSecretPair(preview: string | undefined, confirm: string | undefined): boolean {
  if (preview == null || confirm == null) return false;
  if (preview.length < MIN_BYPASS_SECRET_LEN || confirm.length < MIN_BYPASS_SECRET_LEN) {
    return false;
  }
  // Fixed-length digests so timingSafeEqual is always 32 bytes.
  const a = createHash("sha256").update(preview, "utf8").digest();
  const b = createHash("sha256").update(confirm, "utf8").digest();
  return a.length === b.length && timingSafeEqual(a, b);
}

export function isTestDashboardBypassEnabled(): boolean {
  if (process.env.TEST_DASHBOARD_BYPASS !== "true") return false;

  if (process.env.VERCEL_ENV === "production") return false;

  if (process.env.VERCEL_ENV === "preview") {
    return verifyBypassSecretPair(
      process.env.TEST_DASHBOARD_BYPASS_SECRET,
      process.env.TEST_DASHBOARD_BYPASS_SECRET_VERIFY,
    );
  }

  if (process.env.E2E_DASHBOARD_BYPASS === "1") {
    return true;
  }

  return false;
}
