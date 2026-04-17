/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: false,
  // The iframe render runtime and esbuild-wasm require special headers for
  // SharedArrayBuffer-backed threads, but we intentionally run esbuild-wasm
  // single-threaded so we can avoid COOP/COEP isolation (which would break
  // Supabase auth popups). See docs/RENDERING.md for rationale.
  async headers() {
    return [
      {
        source: '/render/(.*)',
        headers: [
          // Allow the render iframe to be embedded from the same origin.
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https://esm.sh https://cdn.jsdelivr.net" },
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
