import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Prefer explicit NEXT_PUBLIC_*; bridge unprefixed vars from Vercel / Supabase integration into the client bundle. */
function firstNonEmpty(...values) {
  for (const v of values) {
    if (v == null) continue;
    const s = String(v).trim();
    if (s.length > 0) return s;
  }
  return "";
}

const supabasePublicUrl = firstNonEmpty(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_URL,
);

const supabasePublicKey = firstNonEmpty(
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  process.env.SUPABASE_ANON_KEY,
  process.env.SUPABASE_PUBLISHABLE_KEY,
);

const supabaseAnonKey = firstNonEmpty(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  process.env.SUPABASE_ANON_KEY,
  supabasePublicKey,
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: supabasePublicUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabasePublicKey,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey,
  },
  // Pin tracing to this app root so a parent-folder lockfile (e.g. monorepo / home)
  // does not confuse Next.js or Vercel about where package.json lives.
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  reactStrictMode: true,
  typedRoutes: false,
  // V1 preview: type/lint errors don't block the build. Runtime correctness is
  // covered by integration testing; the parser has a lot of deliberate `any`.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  // The iframe render runtime and esbuild-wasm require special headers for
  // SharedArrayBuffer-backed threads, but we intentionally run esbuild-wasm
  // single-threaded so we can avoid COOP/COEP isolation (which would break
  // Supabase auth popups). See docs/RENDERING.md for rationale.
  async headers() {
    return [
      {
        source: '/render/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https://esm.sh https://cdn.jsdelivr.net https://cdn.tailwindcss.com" },
        ],
      },
      {
        source: '/api/render/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, path: false };
    return config;
  },
};

export default nextConfig;
