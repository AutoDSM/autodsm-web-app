# autoDSM

The design system manager built for the AI era. Paste a GitHub repo URL, get a live, interactive design system in seconds — every component rendered, every token catalogued, every variant explorable.

This is the **V1 local preview**. It ships the rendering experience end to end. Auth, persistence, and collaboration are stubbed out and will land in V2.

---

## Quick start

```bash
pnpm install
pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000) and paste a public GitHub URL. No login required for the local preview — onboarding stores the repo in session state and scans it directly against the public GitHub API.

```bash
# Alternatives
npm install && npm run dev
yarn && yarn dev
```

Requires Node 20+.

### Optional: raise the rate limit

The public GitHub API allows 60 requests per hour per IP. For any real repo you'll hit that ceiling during the first scan. Two ways to fix it:

1. Paste a personal access token into **Settings → GitHub access**. It's stored in `localStorage` only, never sent to the server.
2. Or set `GITHUB_API_TOKEN` in `.env.local` — the server reads it as a fallback.

### Required for production scans

- **`BRAND_ASSETS_BUCKET`** — name of the public Supabase Storage bucket where
  scanned logos/icons are uploaded. The migration in
  `supabase/migrations/20260423000000_brand_assets_storage.sql` creates the
  default `brand-assets` bucket and the matching RLS policies. If the variable
  is unset the scan still completes but `BrandProfile.meta.assetsStorageWarning`
  is set to `bucket-missing` and the dashboard surfaces a banner.
- **GitHub App env vars** — `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`,
  `GITHUB_APP_SLUG`, `GITHUB_APP_WEBHOOK_SECRET`. The scan resolver
  (`src/lib/github/auth.ts`) prefers an installation token, then OAuth, then
  `GITHUB_API_TOKEN`, then anonymous.
- **Vercel function timeout** — `vercel.json` sets `maxDuration: 300` for
  `/api/scan` and `/api/scan/refresh` so monorepo scans have headroom on Fluid
  Compute.

### Optional: AI repair

If a component fails to render (missing provider, unresolved import, runtime error), you can click **Try AI repair** in the fallback panel. Add a Gemini API key in **Settings → AI repair key** (stored locally) or set `GEMINI_API_KEY` in `.env.local`. Uses `gemini-2.5-flash-lite` by default.

---

## What works in V1

- **Paste-a-URL onboarding.** Public GitHub repos, any TypeScript React project.
- **Component rendering.** Every `.tsx` file that looks like a component gets a live iframe preview with prop controls.
- **Token extraction.** Tailwind config + CSS custom properties + DTCG JSON are all parsed. Colors, typography, spacing, radii, shadows, motion.
- **Prop controls.** Enum props become segmented pills. Booleans become toggles. Strings become inputs. Everything streams back into the iframe on change with a 200ms debounce.
- **AI repair (opt-in).** When a render fails, an optional Gemini Flash-Lite call proposes a patch. Nothing is sent automatically.
- **Dark-first design.** Toggle in Settings.

## What's deferred to V2

- Auth and multi-workspace persistence (schema already drafted in `supabase/migrations/0001_init.sql`, see `docs/DEPLOYMENT.md`).
- Pre-compiled Tailwind per repo. V1 lets components resolve Tailwind utility imports via esm.sh at runtime — slower cold start, zero build overhead. V2 will run a scoped Tailwind build and cache the CSS bundle.
- Webhook-driven re-scans.
- Figma / Storybook round-trip.

---

## Project layout

```
autodsm/
├── src/
│   ├── app/                    Next 15 App Router
│   │   ├── page.tsx            Landing (paste-a-URL)
│   │   ├── onboarding/         Repo intake + scanning screen
│   │   ├── dashboard/          Shell, tokens, components, agent, settings
│   │   └── api/
│   │       ├── scan/           SSE stream + final result
│   │       ├── render/iframe/  Iframe runtime HTML (served once, cached)
│   │       └── ai/repair/      Gemini Flash-Lite repair endpoint
│   ├── components/
│   │   ├── shell/              Sidebar, TopBar
│   │   ├── components-view/    RenderCanvas, PreferencesRail, FallbackPanel
│   │   ├── tokens/             Color/typography/generic token views
│   │   └── ui/                 shadcn-style primitives
│   ├── lib/
│   │   ├── render/             iframe runtime + types (the contract)
│   │   ├── parsers/            Babel component parser + token parser
│   │   ├── github/             Tree + file fetchers
│   │   ├── scan/               Orchestrator + in-memory cache
│   │   └── ai/                 Repair request/response types
│   ├── stores/                 Zustand scan store
│   └── styles/                 Font loaders
├── public/brand/               Wordmarks and icons
├── supabase/migrations/        V2 schema
└── docs/
    ├── RENDERING.md            How the iframe runtime works
    ├── TOKEN_EXTRACTION.md     How tokens are parsed
    ├── BRAND.md                Colors, typography, voice
    └── DEPLOYMENT.md           V2 production runbook
```

## Scripts

| Script             | What it does                               |
| ------------------ | ------------------------------------------ |
| `pnpm dev`         | Next.js dev server on :3000.               |
| `pnpm build`       | Production build.                          |
| `pnpm start`       | Serve the production build.                |
| `pnpm lint`        | `next lint`.                               |
| `pnpm typecheck`   | `tsc --noEmit`.                            |

## Tech stack

- **Next.js 15** (App Router, edge + node runtimes)
- **React 19 RC**
- **Tailwind CSS 4 alpha** with CSS variables for tokens
- **Zustand** for scan state
- **Babel** + regex-based token parser for repo analysis
- **esbuild-wasm** inside the iframe for on-the-fly TSX → ESM
- **esm.sh** for bare-import resolution
- **Gemini 2.5 Flash-Lite** (optional) for render repair

## Licensing & legal

The app is unlicensed pending the launch license. See `docs/BRAND.md` for the product voice and lockup rules. Don't use `AutoDsm` or `autodsm` — it's **autoDSM**.
