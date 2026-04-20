# Vercel `autodsm` + Supabase auth (contribute build)

Use this checklist so the **contribute build** on Vercel uses **`brand-book-v1`** and **Supabase Auth (GitHub OAuth)** works end-to-end.

## 1. Git ↔ Vercel (source of truth)

| Check | Action |
|--------|--------|
| Repository | **GitHub**: `sebmendo1/auto-dsm` |
| Contribute branch | **`brand-book-v1`** (contains auth routes: `/auth/signin`, `/auth/callback`, `/auth/bridge`) |
| Vercel project | Open [Vercel Dashboard](https://vercel.com) → project **`autodsm`** → **Settings → Git** |

**If “contribute build” = Production**

- **Settings → Git → Production Branch** → set to **`brand-book-v1`**.
- Redeploy Production (or push to `brand-book-v1`).

**If “contribute build” = Preview only**

- Keep Production Branch as `main` (or your default).
- Open a PR from `brand-book-v1` → default branch, or push to `brand-book-v1` and confirm a **Preview** deployment is created for that branch.

## 2. Build settings (Vercel)

| Setting | Value |
|---------|--------|
| Framework | Next.js |
| Install | `npm install` (repo uses `package-lock.json`; `pnpm` is optional if you align lockfiles) |
| Build | `npm run build` |
| Output | Default (Next.js) |

## 3. Environment variables (Vercel)

Set in **Project → Settings → Environment Variables** for **Preview** and/or **Production** (match where you test).

### Supabase (this project)

- **Project URL**: `https://mujlucfkoqvghvdikkhw.supabase.co`
- **Project ref**: `mujlucfkoqvghvdikkhw`

| Name | Notes |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://mujlucfkoqvghvdikkhw.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | From Supabase Dashboard → **Project Settings → API** (publishable / anon-style key used by the browser) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional legacy fallback if you do not use publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only; only if routes need to bypass RLS (keep out of client) |
| `NEXT_PUBLIC_APP_URL` | **Exact** deployed origin, e.g. `https://autodsm.vercel.app` or your custom domain (no trailing slash) |

After changing env vars, **redeploy** so the build picks them up.

## 4. Supabase Auth (Dashboard)

Project: [Supabase Dashboard](https://supabase.com/dashboard) → project **`mujlucfkoqvghvdikkhw`**.

### URL configuration

**Authentication → URL Configuration**

- **Site URL**: use your primary deployed URL (e.g. production: `https://<your-vercel-domain>`).
- **Redirect URLs**: add every origin you use for OAuth return:

```
https://<your-production-domain>/auth/callback
https://<your-preview-deployment>.vercel.app/auth/callback
```

For rotating Vercel preview URLs, either:

- Add each preview URL after deploy, or  
- Use a **wildcard** redirect pattern if your Supabase plan/settings allow (e.g. `https://*.vercel.app/auth/callback` — confirm in Supabase docs for your project).

OAuth uses `redirectTo` built from the **request origin** in [`src/app/auth/signin/route.ts`](../src/app/auth/signin/route.ts), so the callback path is always **`/auth/callback`** on whatever host Vercel serves.

### GitHub provider

**Authentication → Providers → GitHub**

- Enable GitHub.
- Paste **Client ID** and **Client Secret** from a GitHub OAuth App whose **Authorization callback URL** is Supabase’s (shown in the Supabase GitHub provider setup — typically `https://mujlucfkoqvghvdikkhw.supabase.co/auth/v1/callback`).

### Google provider (optional)

Same section → **Google** — only if you use “Continue with Google” on `/login`.

## 5. End-to-end verification (deployed URL)

**Smoke (no OAuth):** `GET https://autodsm.vercel.app/login` should return **200** once the latest build is live.

On the Vercel deployment URL (e.g. deployment overview: [autodsm deployment](https://vercel.com)):

1. Open **`/login`**.
2. Click **Continue with GitHub** (navigates to `/auth/signin?provider=github`).
3. Complete GitHub consent.
4. Expect: **`/auth/callback`** → **`/auth/bridge`** → **`/dashboard`** or **`/onboarding`**.
5. Refresh **`/dashboard`** — session should persist (cookies + middleware in [`src/middleware.ts`](../src/middleware.ts)).

### Failure quick map

| Symptom | Likely fix |
|---------|------------|
| “Redirect URL not allowed” | Add exact `https://<host>/auth/callback` to Supabase Redirect URLs. |
| Login button does nothing / instant error | Missing or wrong `NEXT_PUBLIC_SUPABASE_*` in Vercel; redeploy. |
| Callback then always `/login` | `exchangeCodeForSession` failing — check Supabase logs; confirm Site URL / redirect allowlist. |

## 6. Related code paths

- OAuth start: `src/app/auth/signin/route.ts`
- Code exchange: `src/app/auth/callback/route.ts`
- Client bridge: `src/app/auth/bridge/page.tsx`
- Supabase clients: `src/lib/supabase/{client,server,middleware}.ts`
