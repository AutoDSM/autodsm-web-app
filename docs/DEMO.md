# Public app demo (`/demo`)

The route **`/demo`** is a **no-authentication** copy of the signed-in dashboard shell. It uses the same page modules as [`/dashboard`](../src/app/dashboard) (re-exported from [`src/app/demo`](../src/app/demo)) and the same `DashboardShell`, navigation, and design-token views.

## Purpose

- **Design and UI review** of the core product chrome with **autoDSM** wordmark assets (not the in-app Perplexity marketing mark).
- **Tests**: use `/demo` as a stable, public URL for smoke, E2E, or visual regression of the in-app experience without auth.

## How it is built

- **Layout:** [`src/app/demo/layout.tsx`](../src/app/demo/layout.tsx) — `BrandProvider` with `buildAutodsmProductDemoProfile()` from [`demo-profile.ts`](../src/lib/brand/demo-profile.ts), `appBasePath="/demo"`, `markVariant="autodsm"`.
- **Base path context:** [`DashboardAppChromeProvider`](../src/components/shell/dashboard-app-context.tsx) supplies `appBasePath` so side nav, ⌘K, and in-page links stay under `/demo/...` instead of jumping to `/dashboard/...`.
- **Branding:** `markVariant` in [`dashboard-app-context.tsx`](../src/components/shell/dashboard-app-context.tsx) (`autodsm`) drives the hero in [`DashboardLogoHero`](../src/components/dashboard/dashboard-logo-hero.tsx) and [`ProductWordmark variant="autodsm"`](../src/components/brand/product-mark.tsx) via `/public/brand/autodsm-wordmark-*.svg`.

## Keeping `/dashboard` and `/demo` aligned

1. **Do not duplicate** token page UIs for `/demo` only. Add or change features under `src/components/dashboard/…` and/or `src/app/dashboard/.../page.tsx` so the demo route stays a thin re-export.
2. When adding a **new** top-level route under `app/dashboard/…`, add the matching re-export at `app/demo/.../page.ts`.
3. If you add links inside shared components, use **`useDashboardAppBasePath()`** (or pass `appBasePath`) so links work in both trees.

## Entry points

- In development (or with `NEXT_PUBLIC_ONBOARDING_DEV_PREVIEW=1`), the login page shows **Open app demo (no auth)** under “Preview onboarding”.
- Direct URL: `/demo` (e.g. `http://localhost:3000/demo`).

## Search engines

`layout` metadata sets **`robots: { index: false, follow: false }`** for `/demo` — it is not meant for public SEO.
