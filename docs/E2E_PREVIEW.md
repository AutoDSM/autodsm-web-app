# E2E and Vercel Preview: dashboard test bypass

This is an **internal runbook** for teams that need to open `/dashboard` with a synthetic brand profile (no Supabase session, no completed onboarding) for QA or E2E.

- **Do not** set any of these in **Vercel → Production** (the server refuses them when `VERCEL_ENV=production`).
- **Do not** commit real values in `.env`, `.env.local`, or any tracked file. Use Vercel **Preview** environment variables and/or a **gitignored** `.env.local` locally.

## Enabling (Vercel Preview)

1. Vercel → Project → **Settings** → **Environment Variables**.
2. Scope: **Preview** (not Production).
3. Set:

| Variable | Value | Notes |
| -------- | ----- | ----- |
| `TEST_DASHBOARD_BYPASS` | `true` | Must be the literal string `true`. |
| `TEST_DASHBOARD_BYPASS_SECRET` | 32+ character string | e.g. `openssl rand -hex 32` — same value in both **Secret** and **Verify** (next row). |
| `TEST_DASHBOARD_BYPASS_SECRET_VERIFY` | **Same value** as the row above | Duplicate field so the server can compare the pair with a constant-time digest check. |

The second and third values must be **identical** (e.g. paste the same token twice in Vercel’s UI). Mismatches or too-short values disable the bypass on Preview.

Redeploy the preview so the server sees the new variables.

## Enabling (local E2E / `next dev`)

In **`.env.local`** (gitignored), not in a committed file:

```bash
TEST_DASHBOARD_BYPASS=true
E2E_DASHBOARD_BYPASS=1
# optional: demo repo label in the shell
# DEV_PREVIEW_REPO=acme/corp
```

`E2E_DASHBOARD_BYPASS=1` is required so a normal local dev session does not enable the bypass by accident. The `TEST_DASHBOARD_BYPASS_SECRET` requirement **does not** apply to this local E2E path (only to `VERCEL_ENV=preview`).

## Onboarding on the same deployment

- The bypass only affects the **dashboard** server layout at [`src/app/dashboard/layout.tsx`](../src/app/dashboard/layout.tsx) (login + demo brand load).
- **Onboarding** at [`src/app/onboarding`](../src/app/onboarding) is a separate route tree. With the bypass on, you can still open `/onboarding/...` in the browser to exercise the real sign-up and connect flows.
- Production behavior is unchanged as long as these variables are not set in the Production environment.

## Implementation reference

- [`src/lib/dev/test-dashboard-bypass.ts`](../src/lib/dev/test-dashboard-bypass.ts)
- [`src/lib/brand/load.ts`](../src/lib/brand/load.ts) (demo `BrandProfile` when bypass is on)
- [`src/app/dashboard/layout.tsx`](../src/app/dashboard/layout.tsx) (skips login when bypass is on)
