/**
 * Scan orchestrator — the pipeline that turns `{owner, repo}` into:
 *   • a list of ParsedComponents (each with render_config)
 *   • a list of Tokens
 *   • repo-level metadata (commits, framework, etc.)
 *
 * Designed to be driven by the SSE route handler — each phase emits a
 * progress event on the provided `emit` callback.
 */

import { GitHubClient } from '../github/files';
import { parseComponent } from '../parsers/components';
import { extractTokens, type Token } from '../parsers/tokens';
import type { ParsedComponent, RenderConfig } from '../render/types';

export type ScanEvent =
  | { phase: 'fetching'; message: string }
  | { phase: 'framework_ok'; message: string }
  | { phase: 'parsing'; current: number; total: number; message: string }
  | { phase: 'tokens'; message: string }
  | { phase: 'assets'; message: string }
  | { phase: 'done'; message: string; result: ScanResult }
  | { phase: 'unsupported'; reason: string; message: string }
  | { phase: 'error'; message: string };

export interface ScanResult {
  framework: string;
  components: ParsedComponent[];
  tokens: Token[];
  assets: { name: string; file_path: string }[];
  commits: Array<{ sha: string; message: string; author: string; date: string; url: string }>;
  render_configs: Record<string, RenderConfig>; // slug → config
}

export async function scanRepo(
  owner: string,
  name: string,
  emit: (ev: ScanEvent) => void,
): Promise<ScanResult | null> {
  const gh = new GitHubClient();
  try {
    emit({ phase: 'fetching', message: 'Fetching repository…' });
    const defaultBranch = await gh.getDefaultBranch({ owner, name });
    const tree = await gh.getTree({ owner, name, branch: defaultBranch });

    // ─── Framework gate ───────────────────────────────────────────────
    emit({ phase: 'fetching', message: 'Detecting framework…' });
    // Collect every package.json — root + up to ~20 sub-packages (handles
    // monorepos like shadcn-ui/ui, turborepo, nx layouts).
    const pkgEntries = tree
      .filter((t) => t.type === 'blob' && (t.path === 'package.json' || /\bpackage\.json$/.test(t.path)))
      .filter((t) => !/\bnode_modules\b/.test(t.path))
      .slice(0, 20);
    if (pkgEntries.length === 0) {
      emit({ phase: 'unsupported', reason: 'no_package_json', message: 'No package.json detected.' });
      return null;
    }
    let hasReact = false;
    let sawNonReactFramework = false;
    for (const p of pkgEntries) {
      let parsed: ReturnType<typeof safeParseJson> = null;
      try {
        parsed = safeParseJson(
          await gh.getFile({ owner, name, branch: defaultBranch }, p.path),
        );
      } catch { /* ignore */ }
      if (!parsed) continue;
      const deps = {
        ...(parsed.dependencies ?? {}),
        ...(parsed.devDependencies ?? {}),
        ...(parsed.peerDependencies ?? {}),
      };
      if (deps['react']) hasReact = true;
      if (deps['vue'] || deps['svelte'] || deps['@angular/core'] || deps['solid-js']) {
        sawNonReactFramework = true;
      }
    }
    if (!hasReact && sawNonReactFramework) {
      emit({ phase: 'unsupported', reason: 'non_react_framework', message: 'Non-React framework detected.' });
      return null;
    }
    if (!hasReact) {
      emit({ phase: 'unsupported', reason: 'no_react', message: 'React not found in dependencies.' });
      return null;
    }
    emit({ phase: 'framework_ok', message: 'Framework: React + TypeScript ✓' });

    // ─── Component candidates ─────────────────────────────────────────
    const tsxFiles = tree.filter(
      (t) =>
        t.type === 'blob' &&
        t.path.endsWith('.tsx') &&
        !/\b(__tests__|stories|node_modules|\.next|dist|build|out|coverage|e2e|playwright)\b/.test(t.path) &&
        !/\.(test|spec|stories)\.tsx$/.test(t.path) &&
        (t.size ?? 0) < 60_000 &&
        looksLikeComponentFile(t.path),
    );

    // Build a local-files map for relative-import resolution during parsing.
    // We pre-populate it with *every* .ts/.tsx under src or packages (capped)
    // so that relative imports like `./container` or `../utils` resolve even
    // when the imported file isn't itself a top-level component.
    const relatedFiles = new Map<string, string>();
    const siblingFiles = tree.filter(
      (t) =>
        t.type === 'blob' &&
        /\.(tsx?|jsx?)$/.test(t.path) &&
        !/\b(node_modules|\.next|dist|build|out|coverage)\b/.test(t.path) &&
        !/\.(test|spec|stories)\.(tsx?|jsx?)$/.test(t.path) &&
        (t.size ?? 0) < 60_000,
    ).slice(0, 300);

    const components: ParsedComponent[] = [];
    const render_configs: Record<string, RenderConfig> = {};

    const candidates = tsxFiles.slice(0, 80); // safety cap
    // Pre-fetch siblings referenced by any candidate so their relatives resolve.
    // Pass 1: fetch all candidates (sources needed for parsing).
    const sources = new Map<string, string>();
    for (let i = 0; i < candidates.length; i++) {
      const entry = candidates[i];
      try {
        const src = await gh.getFile({ owner, name, branch: defaultBranch }, entry.path);
        sources.set(entry.path, src);
        relatedFiles.set('/' + entry.path, src);
      } catch {
        /* ignore */
      }
    }

    // Pass 2: opportunistically fetch non-component siblings referenced by
    // relative imports in the primary sources. Only pay for files that are
    // actually needed; cap total extra fetches.
    const neededSiblings = new Set<string>();
    for (const [path, src] of sources) {
      const dir = path.split('/').slice(0, -1).join('/');
      const re = /(?:from|import)\s*['"](\.[^'"]+)['"]/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src)) !== null) {
        const rel = m[1];
        const joined = joinRel(dir, rel);
        for (const ext of ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx']) {
          const candidate = joined + ext;
          if (relatedFiles.has('/' + candidate)) break;
          const hit = siblingFiles.find((f) => f.path === candidate);
          if (hit) {
            neededSiblings.add(hit.path);
            break;
          }
        }
      }
    }
    let extraFetched = 0;
    for (const p of neededSiblings) {
      if (extraFetched >= 120) break;
      if (relatedFiles.has('/' + p)) continue;
      try {
        const src = await gh.getFile({ owner, name, branch: defaultBranch }, p);
        relatedFiles.set('/' + p, src);
        extraFetched++;
      } catch { /* ignore */ }
    }

    // Pass 3: parse each candidate with the enriched relatedFiles map.
    for (let i = 0; i < candidates.length; i++) {
      const entry = candidates[i];
      emit({
        phase: 'parsing',
        current: i + 1,
        total: candidates.length,
        message: `Parsing components… ${i + 1}/${candidates.length}`,
      });
      const source = sources.get(entry.path);
      if (!source) continue;
      const parsed = parseComponent({ filePath: entry.path, source, relatedFiles });
      if (!parsed) continue;
      components.push(parsed);
      render_configs[parsed.slug] = buildRenderConfig(parsed);
    }

    // ─── Tokens ───────────────────────────────────────────────────────
    emit({ phase: 'tokens', message: 'Extracting design tokens…' });
    const tokenFilePaths = tree
      .filter((t) =>
        t.type === 'blob' &&
        (t.path.endsWith('tailwind.config.ts') ||
          t.path.endsWith('tailwind.config.js') ||
          t.path.endsWith('tailwind.config.cjs') ||
          t.path.endsWith('tailwind.config.mjs') ||
          /\.tokens\.json$/.test(t.path) ||
          /tokens\/[^/]+\.json$/.test(t.path) ||
          t.path.endsWith('globals.css') ||
          t.path.endsWith('global.css') ||
          /app\/.*\.css$/.test(t.path) ||
          /styles\/.*\.css$/.test(t.path)),
      )
      .slice(0, 10);

    const tokenFiles: Record<string, string> = {};
    for (const p of tokenFilePaths) {
      try {
        tokenFiles[p.path] = await gh.getFile({ owner, name, branch: defaultBranch }, p.path);
      } catch {
        /* ignore */
      }
    }
    const tokens = extractTokens({ files: tokenFiles });

    // ─── Assets ───────────────────────────────────────────────────────
    emit({ phase: 'assets', message: 'Scanning assets…' });
    const assets = tree
      .filter((t) => /\.(svg|png|jpg|webp|ico)$/.test(t.path) && !/node_modules/.test(t.path))
      .slice(0, 200)
      .map((t) => ({ name: t.path.split('/').pop() ?? t.path, file_path: t.path }));

    // ─── Commits ──────────────────────────────────────────────────────
    const commits = await gh.getCommits({ owner, name });

    const result: ScanResult = {
      framework: 'react-typescript',
      components,
      tokens,
      assets,
      commits,
      render_configs,
    };
    emit({ phase: 'done', message: 'Done. Redirecting…', result });
    return result;
  } catch (err) {
    emit({ phase: 'error', message: String((err as Error)?.message ?? err) });
    return null;
  }
}

function buildRenderConfig(parsed: ParsedComponent): RenderConfig {
  // Build the in-memory virtual filesystem for the iframe runtime.
  const files: Record<string, string> = {};
  const primaryKey = '/' + parsed.file_path;
  files[primaryKey] = parsed.source_code;
  for (const local of parsed.local_imports) {
    const key = local.resolved_path.startsWith('/') ? local.resolved_path : '/' + local.resolved_path;
    files[key] = local.source;
  }
  return {
    entry_module: parsed.name,
    files,
    dependencies: parsed.dependencies,
    providers: [],
    initial_props: parsed.initial_props,
    prop_controls: parsed.props,
    presets: parsed.presets,
  };
}

function looksLikeComponentFile(path: string): boolean {
  const base = path.split('/').pop() ?? '';
  const name = base.replace(/\.tsx$/, '');
  // Must start uppercase (PascalCase) OR live under a components/ui folder.
  // Covers shadcn-style lowercase `button.tsx` inside `/ui/`, `/components/`,
  // or `/registry/**/ui/`.
  return (
    /^[A-Z]/.test(name) ||
    /\/components\//.test(path) ||
    /\/ui\//.test(path) ||
    /\/registry\//.test(path)
  );
}

function joinRel(dir: string, rel: string): string {
  const stack = dir ? dir.split('/') : [];
  for (const seg of rel.split('/')) {
    if (seg === '.' || seg === '') continue;
    if (seg === '..') stack.pop();
    else stack.push(seg);
  }
  return stack.filter(Boolean).join('/');
}

function safeParseJson(s: string): { dependencies?: Record<string, string>; devDependencies?: Record<string, string>; peerDependencies?: Record<string, string> } | null {
  try { return JSON.parse(s); } catch { return null; }
}
