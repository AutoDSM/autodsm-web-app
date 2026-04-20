# Deployment

V1 is a local preview. V2 is multi-tenant, persisted, webhook-driven. This doc is the runbook for both.

## V1 — local preview

```bash
pnpm install
pnpm dev
```

That's it. No database, no auth, no env vars required.

### Why it works with no env vars

- **GitHub API** is hit anonymously (60 req/hr).
- **Scan results** live in an in-memory LRU (`src/lib/scan/cache.ts`).
- **Session state** — the "currently connected repo" — lives in `sessionStorage` and a Zustand store.
- **AI repair** degrades gracefully: if no key is set, the fallback panel hides the "Try AI repair" button.

### Hitting rate limits

If the anonymous quota runs out, three options:

1. Wait 60 minutes.
2. Set `GITHUB_API_TOKEN=ghp_...` in `.env.local` (fine-grained PAT with `Contents: read` scope). Now it's 5,000 req/hr server-side.
3. Paste a token in **Settings → GitHub access**. Client-side only, raises your own rate limit.

---

## V2 — production

Target: Vercel + Supabase + GitHub App.

### Vercel + Supabase Auth (contribute build on `brand-book-v1`)

For the **`autodsm`** Vercel project, GitHub **`brand-book-v1`**, and Supabase project **`mujlucfkoqvghvdikkhw`**, follow the step-by-step checklist:

- **[docs/VERCEL_SUPABASE_CHECKLIST.md](./VERCEL_SUPABASE_CHECKLIST.md)**

### 1. Supabase project

```bash
supabase init
supabase start            # local
supabase link --project-ref <your-ref>
supabase db push
```

The migration at `supabase/migrations/0001_init.sql` creates:

- `workspaces` — one per user or team.
- `repos` — many per workspace.
- `components` — one per rendered .tsx file; stores the `RenderConfig` as JSONB.
- `tokens` — one per design token; grouped by category.
- `scans` — audit trail, one per scan run.
- `assets` — uploads (compiled Tailwind bundles, pinned commits).

Row-level security policies scope everything to `workspace_id` via `auth.uid()`.

### 2. GitHub App

1. Create at `https://github.com/settings/apps/new`.
2. Permissions:
   - **Repository** → **Contents: Read-only**.
   - **Repository** → **Metadata: Read-only**.
3. Subscribe to events: `push`.
4. Callback URL: `${NEXT_PUBLIC_APP_URL}/auth/callback`.
5. Setup URL: `${NEXT_PUBLIC_APP_URL}/onboarding` (redirect after install).
6. Download the private key, paste into `.env` as `GITHUB_APP_PRIVATE_KEY` (with literal `\n` newlines).
7. Note the App ID, slug, webhook secret.

### 3. Env vars

Copy `.env.example` → `.env.local` and fill:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
# Prefer publishable key (newer projects); anon key still supported
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# GitHub App
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n"
GITHUB_APP_SLUG=autodsm
GITHUB_APP_WEBHOOK_SECRET=...

# Fallback for public repos when no install is present
GITHUB_API_TOKEN=ghp_...

# AI
GEMINI_API_KEY=AIza...

# App
NEXT_PUBLIC_APP_URL=https://autodsm.app
```

### 4. Vercel

```bash
vercel link
vercel env pull .env.local
vercel deploy --prod
```

Settings:

- **Framework preset**: Next.js.
- **Edge functions** enabled (used by `/api/render/iframe` and `/api/scan/stream`).
- **Node version**: 20.
- **Install command**: `pnpm install --frozen-lockfile`.

### 5. Webhook

Point the GitHub App webhook to `${NEXT_PUBLIC_APP_URL}/api/webhooks/github`. The handler (V2) verifies the signature with `GITHUB_APP_WEBHOOK_SECRET`, enqueues a re-scan, and invalidates the cached `RenderConfig` rows for any changed components.

### 6. Observability

- **Vercel Analytics** for RUM.
- **Supabase logs** for DB queries.
- **Sentry** (V2.1) for the iframe runtime's `RENDER_ERROR` messages — they are invaluable for finding real-world breakage.

---

## Rollback plan

All scans are idempotent: re-running a scan for `owner/repo` produces a full replacement row set and bumps `scan.completed_at`. If a bad parser ships:

1. Revert the deploy.
2. Delete affected rows: `DELETE FROM components WHERE scan_id >= <bad_id>;`
3. Re-run the scan on the workspace.

No data loss — the raw scan payload is retained in `scans.payload` JSONB.

## Scaling knobs

| Knob                         | Where                                    | Default | Notes                                 |
| ---------------------------- | ---------------------------------------- | ------- | ------------------------------------- |
| Files per scan               | `src/lib/scan/orchestrator.ts`           | 80      | Cap — prevents runaway scans.         |
| Bytes per file               | `src/lib/scan/orchestrator.ts`           | 60 KB   | Bigger files are skipped, not chunked.|
| Concurrent GitHub fetches    | `src/lib/github/files.ts`                | 8       | Below GitHub's secondary rate limits. |
| Cache size                   | `src/lib/scan/cache.ts`                  | 10      | LRU entries, process-memory.          |
| Prop update debounce         | `src/components/components-view/RenderCanvas.tsx` | 200ms | Lower feels better; higher saves CPU. |

## Known issues

- **`/api/render/iframe` requires Edge runtime.** The file declares `export const runtime = 'edge'`. Deploying to Node will break streaming.
- **esbuild-wasm 0.23.x** has a known issue with certain Babel decorator syntax. If a user's component uses experimental decorators, it falls back to the AI repair path.
- **esm.sh sometimes 5xxs.** We don't retry in V1. V2 adds one retry with a different CDN region.
