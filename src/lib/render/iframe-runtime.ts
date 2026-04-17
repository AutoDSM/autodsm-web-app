/**
 * iframe-runtime.ts — shipped **as source text** into the render iframe.
 *
 * Architecture (rev 3):
 *   Null-origin sandboxed iframes (sandbox="allow-scripts") disallow
 *   dynamic import() of blob: URLs. Every previous attempt that used
 *   `await import(blobUrl)` failed with:
 *     "Failed to fetch dynamically imported module: blob:null/..."
 *
 *   Fix: bundle the user's code with esbuild (format=iife, globalName=MOD)
 *   and execute the resulting JS via `new Function(js)()`. No dynamic
 *   imports required at runtime — all dependencies are resolved BEFORE
 *   esbuild is called:
 *
 *   1. Pre-load core deps (react, react-dom/client, lucide-react) with
 *      the iframe's static <script type="importmap"> + regular
 *      <script type="module"> that writes them to window.__autodsm_deps.
 *      (Import map + static module script DOES work; it's the
 *      dynamic import of blob URLs that doesn't.)
 *   2. Expose those deps as globals (React, ReactDOM, LucideIcons).
 *   3. esbuild's virtual-FS plugin rewrites every bare import to a
 *      property access on window.__autodsm_deps — via a generated
 *      shim file in the vfs namespace, not via `external`. This way
 *      the final output is a self-contained IIFE with zero imports.
 *   4. Missing relative imports → tolerant Proxy stub (same as before).
 *   5. Execute via `new Function(js + '; return MOD;')()` → extract
 *      the exported component from the returned namespace object.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export const IFRAME_RUNTIME_SOURCE = /* js */ `
(function () {
  const ESBUILD_WASM_URL = 'https://esm.sh/esbuild-wasm@0.23.1/esbuild.wasm';
  const ESBUILD_ES_URL = 'https://esm.sh/esbuild-wasm@0.23.1/esm/browser.js';
  const ESM_BASE = 'https://esm.sh';

  let esbuild;
  let esbuildReady;
  let currentRoot = null;
  let currentComponent = null;
  let currentProps = {};
  let React_ = null;
  let ReactDOM_ = null;
  let LucideIcons = null;
  /** Dependency cache shared with the generated bundle. */
  const DEPS = (window.__autodsm_deps = window.__autodsm_deps || {});

  function send(msg) {
    parent.postMessage({ source: 'autodsm-iframe', ...msg }, '*');
  }

  function loadEsbuild() {
    if (esbuildReady) return esbuildReady;
    esbuildReady = import(ESBUILD_ES_URL).then(async (mod) => {
      esbuild = mod;
      await mod.initialize({ wasmURL: ESBUILD_WASM_URL, worker: false });
      return mod;
    });
    return esbuildReady;
  }

  /**
   * Loads a module from esm.sh and caches it under the given key in
   * window.__autodsm_deps. These URLs are STATIC (not blob:), and we
   * import them during runtime bootstrap — static-url module imports
   * work fine in null-origin sandboxed iframes. The ban is specifically
   * on blob: URL imports.
   */
  async function loadDep(key, url) {
    if (DEPS[key]) return DEPS[key];
    const m = await import(url);
    DEPS[key] = m;
    return m;
  }

  async function loadCore() {
    if (React_ && ReactDOM_) return;
    const [R, RD, L] = await Promise.all([
      loadDep('react', ESM_BASE + '/react@19'),
      loadDep('react-dom/client', ESM_BASE + '/react-dom@19/client'),
      loadDep('lucide-react', ESM_BASE + '/lucide-react').catch(() => ({})),
    ]);
    React_ = R.default || R;
    ReactDOM_ = RD.default || RD;
    LucideIcons = L;
    // react-dom (non-client) mirrors client so JSX runtime lookups
    // for "react-dom" don't fail when a user component touches it.
    DEPS['react-dom'] = RD;
    DEPS['react'] = R;
    // The automatic JSX runtime imports react/jsx-runtime.
    // Fetch it once and cache under the full path.
    try {
      const jsx = await import(ESM_BASE + '/react@19/jsx-runtime');
      DEPS['react/jsx-runtime'] = jsx;
    } catch (e) {}
    try {
      const jsxDev = await import(ESM_BASE + '/react@19/jsx-dev-runtime');
      DEPS['react/jsx-dev-runtime'] = jsxDev;
    } catch (e) {}
  }

  function loaderFor(path) {
    if (path.endsWith('.ts')) return 'ts';
    if (path.endsWith('.tsx')) return 'tsx';
    if (path.endsWith('.jsx')) return 'jsx';
    return 'js';
  }

  function joinRel(dir, rel) {
    const stack = dir ? dir.split('/') : [];
    for (const seg of rel.split('/')) {
      if (seg === '.' || seg === '') continue;
      if (seg === '..') stack.pop();
      else stack.push(seg);
    }
    return '/' + stack.filter(Boolean).join('/');
  }

  function pickEntryPath(config) {
    const candidates = Object.keys(config.files);
    const entry = (config.entry_module + '').toLowerCase();
    const byName = candidates.find((p) => {
      const base = (p.split('/').pop() || '').replace(/\\.(tsx|ts|jsx|js)$/, '').toLowerCase();
      return base === entry;
    });
    if (byName) return byName;
    return candidates
      .filter((p) => /\\.(tsx|jsx)$/.test(p))
      .sort((a, b) => (config.files[b] || '').length - (config.files[a] || '').length)[0]
      || candidates[0];
  }

  /**
   * Virtual-FS + bare-import-shim plugin.
   *
   * Bare imports are redirected to a virtual shim module whose source
   * simply re-exports whatever the iframe's runtime has cached under
   * window.__autodsm_deps[key]. This keeps the bundle fully self-contained
   * (no external imports), allowing execution via new Function().
   *
   * Unknown bare imports are pre-loaded on demand by queuing them onto
   * a shared promise list; the caller awaits these before executing
   * the bundle.
   */
  function virtualFsPlugin(files, entryPath, pendingLoads, importNames) {
    importNames = importNames || {};
    return {
      name: 'autodsm-virtual-fs',
      setup(build) {
        build.onResolve({ filter: /.*/ }, (args) => {
          const p = args.path;
          if (!args.importer) {
            return { path: entryPath, namespace: 'vfs' };
          }
          if (p.startsWith('./') || p.startsWith('../')) {
            const importerDir = args.resolveDir || args.importer.split('/').slice(0, -1).join('/');
            const base = joinRel(importerDir, p);
            const candidates = [
              base, base + '.ts', base + '.tsx', base + '.js', base + '.jsx',
              base + '/index.ts', base + '/index.tsx', base + '/index.js', base + '/index.jsx',
            ];
            const hit = candidates.find((c) => files[c] != null);
            if (hit) return { path: hit, namespace: 'vfs' };
            return { path: 'stub:' + p, namespace: 'stub', pluginData: { originalSpec: p } };
          }
          // Absolute vfs paths (alias-rewritten by the parser).
          if (p.charAt(0) === '/') {
            const cands = [
              p, p + '.ts', p + '.tsx', p + '.js', p + '.jsx',
              p + '/index.ts', p + '/index.tsx', p + '/index.js', p + '/index.jsx',
            ];
            const ok = cands.find((c) => files[c] != null);
            if (ok) return { path: ok, namespace: 'vfs' };
            return { path: 'stub:' + p, namespace: 'stub', pluginData: { originalSpec: p } };
          }
          // Bare imports → virtual shim referencing window.__autodsm_deps.
          return { path: p, namespace: 'bare' };
        });

        build.onLoad({ filter: /.*/, namespace: 'vfs' }, (args) => {
          const source = files[args.path] != null ? files[args.path] : '';
          return {
            contents: source,
            loader: loaderFor(args.path),
            resolveDir: args.path.split('/').slice(0, -1).join('/'),
          };
        });

        build.onLoad({ filter: /.*/, namespace: 'bare' }, (args) => {
          const key = args.path;
          if (!DEPS[key]) {
            let url = ESM_BASE + '/' + key;
            if (key === 'react') url = ESM_BASE + '/react@19';
            else if (key.startsWith('react/')) url = ESM_BASE + '/react@19/' + key.slice(6);
            else if (key === 'react-dom') url = ESM_BASE + '/react-dom@19';
            else if (key.startsWith('react-dom/')) url = ESM_BASE + '/react-dom@19/' + key.slice(10);
            pendingLoads.push(loadDep(key, url).catch(() => { DEPS[key] = {}; }));
          }
          const safe = JSON.stringify(key);
          const lines = [
            'const __mod = (window.__autodsm_deps && window.__autodsm_deps[' + safe + ']) || {};',
            'const __default = __mod.default !== undefined ? __mod.default : __mod;',
            'export default __default;',
          ];
          // Emit explicit named exports for every identifier used at
          // import sites in the vfs. These resolve at runtime via __mod;
          // if __mod doesn't have them yet (pass 1), they will be
          // undefined — pass 2 re-runs with DEPS populated.
          const need = importNames[key] || [];
          for (const n of need) {
            if (n === 'default' || n === '*') continue;
            if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(n)) continue;
            lines.push('export const ' + n + ' = __mod[' + JSON.stringify(n) + '];');
          }
          return { contents: lines.join('\\n'), loader: 'js' };
        });

        // Stub module for unresolved relative imports.
        // Emits explicit named exports so esbuild's static analysis is
        // satisfied; each exported name is the same tolerant Proxy.
        build.onLoad({ filter: /.*/, namespace: 'stub' }, (args) => {
          const orig = (args.pluginData && args.pluginData.originalSpec) || '';
          const need = importNames[orig] || [];
          const lines = [
            'const proxy = new Proxy(function(){ return null; }, {',
            "  get: (_, k) => k === '__esModule' ? true : proxy,",
            '  apply: () => null,',
            '});',
            'export default proxy;',
            "export const cn = (...a) => a.filter(Boolean).join(' ');",
          ];
          for (const n of need) {
            if (n === 'default' || n === '*' || n === 'cn') continue;
            if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(n)) continue;
            lines.push('export const ' + n + ' = proxy;');
          }
          return { contents: lines.join('\\n'), loader: 'js' };
        });
      },
    };
  }

  /**
   * Because esbuild's onLoad for 'bare' can't produce *named* exports
   * without knowing them up-front, we patch the output: after bundling,
   * we rewrite our shims to use a Proxy that forwards arbitrary named
   * imports to the cached module. The simplest approach: don't rely on
   * named exports at all — instead, run a pre-pass that rewrites all
   * named import statements in the user's code to destructuring from
   * __autodsm_deps. esbuild handles this automatically when the shim
   * module is a plain JS file whose namespace object (from default
   * export) is actually a live reference to window.__autodsm_deps[key].
   *
   * The trick below makes the shim produce a *namespace* object with
   * all the correct keys: we generate a .js module whose content loops
   * over __mod keys and re-assigns them to exports. But ESM requires
   * static export names. So we use: \`export * from <virtual>\` — nope,
   * also static. Solution: use a *two-stage* approach where onResolve
   * can't know names, so we sidestep the problem by emitting \`module\`
   * objects that esbuild knows to passthrough. Since bare imports are
   * rare in component previews and we already handle default + named
   * for most shadcn/radix cases, we simplify: emit __default AND
   * explicitly forward a list of the most common named exports used
   * in shadcn/ui ecosystem. Missing names fall through to proxy.
   */

  /**
   * Pre-scan every vfs file to collect the named imports esbuild will
   * need per specifier. Stubs must emit explicit 'export const X'
   * statements for each of these names, otherwise esbuild fails with
   * "No matching export" at bundle time.
   */
  function collectImportNames(files) {
    const specMap = {};
    const add = (s, n) => { if (!specMap[s]) specMap[s] = new Set(); specMap[s].add(n); };
    // Regex captures: lead default, named block, namespace-as, default-only, spec.
    const re = new RegExp(
      'import\\s+' +
      '(?:([A-Za-z_$][\\w$]*)\\s*,\\s*)?' +
      '(?:\\{([^}]*)\\}|\\*\\s+as\\s+([A-Za-z_$][\\w$]*)|([A-Za-z_$][\\w$]*))?' +
      '\\s*(?:from\\s*)?' +
      '[\\'\"]([^\\'\"]+)[\\'\"]',
      'g'
    );
    for (const src of Object.values(files)) {
      if (!src) continue;
      let m;
      while ((m = re.exec(src)) !== null) {
        const leadDefault = m[1];
        const namedBlock = m[2];
        const nsAs = m[3];
        const onlyDefault = m[4];
        const spec = m[5];
        if (leadDefault) add(spec, 'default');
        if (onlyDefault && !namedBlock) add(spec, 'default');
        if (nsAs) add(spec, '*');
        if (namedBlock) {
          const parts = namedBlock.split(',');
          for (let i = 0; i < parts.length; i++) {
            const token = parts[i].trim();
            if (!token) continue;
            const asMatch = token.match(/^([A-Za-z_$][\w$]*)\s+as\s+[A-Za-z_$][\w$]*$/);
            const name = asMatch ? asMatch[1] : token;
            if (/^[A-Za-z_$][\w$]*$/.test(name)) add(spec, name);
          }
        }
      }
    }
    const out = {};
    for (const k of Object.keys(specMap)) out[k] = Array.from(specMap[k]);
    return out;
  }

  /** Two-pass bundle: pass 1 discovers bare specifiers (populating DEPS),
   *  pass 2 emits the final IIFE with all named exports wired up. */
  async function bundleModule(config) {
    await loadEsbuild();
    const entryPath = pickEntryPath(config);
    const importNames = collectImportNames(config.files);

    // PASS 1: no pendingLoads yet; this primes DEPS via discovery.
    const pending1 = [];
    await esbuild.build({
      entryPoints: [entryPath],
      bundle: true,
      write: false,
      format: 'esm',
      target: 'es2020',
      jsx: 'automatic',
      jsxImportSource: 'react',
      plugins: [virtualFsPlugin(config.files, entryPath, pending1, importNames)],
      logLevel: 'silent',
    }).catch(() => { /* swallow; pass 2 will rebuild */ });
    await Promise.all(pending1);

    // PASS 2: now that DEPS is fully populated, emit shims that
    // enumerate all keys — this allows esbuild to hoist named imports
    // into explicit export statements on the shim, which it then
    // wires into the IIFE closure.
    const result = await esbuild.build({
      entryPoints: [entryPath],
      bundle: true,
      write: false,
      format: 'iife',
      globalName: '__AUTODSM_MOD__',
      target: 'es2020',
      jsx: 'automatic',
      jsxImportSource: 'react',
      plugins: [virtualFsPluginWithNames(config.files, entryPath, importNames)],
      logLevel: 'silent',
    });

    const js = result.outputFiles && result.outputFiles[0] && result.outputFiles[0].text;
    if (!js) throw new Error('esbuild produced no output.');
    return { js, entryPath };
  }

  /** Variant of the plugin whose 'bare' and 'stub' namespaces emit
   *  explicit named exports based on the union of keys present in
   *  window.__autodsm_deps[key] AND the names actually imported by
   *  the user code (importNames). This satisfies esbuild static analysis. */
  function virtualFsPluginWithNames(files, entryPath, importNames) {
    importNames = importNames || {};
    return {
      name: 'autodsm-virtual-fs-v2',
      setup(build) {
        build.onResolve({ filter: /.*/ }, (args) => {
          const p = args.path;
          if (!args.importer) return { path: entryPath, namespace: 'vfs' };
          if (p.startsWith('./') || p.startsWith('../')) {
            const importerDir = args.resolveDir || args.importer.split('/').slice(0, -1).join('/');
            const base = joinRel(importerDir, p);
            const candidates = [
              base, base + '.ts', base + '.tsx', base + '.js', base + '.jsx',
              base + '/index.ts', base + '/index.tsx', base + '/index.js', base + '/index.jsx',
            ];
            const hit = candidates.find((c) => files[c] != null);
            if (hit) return { path: hit, namespace: 'vfs' };
            return { path: 'stub:' + p, namespace: 'stub', pluginData: { originalSpec: p } };
          }
          if (p.charAt(0) === '/') {
            const cands = [
              p, p + '.ts', p + '.tsx', p + '.js', p + '.jsx',
              p + '/index.ts', p + '/index.tsx', p + '/index.js', p + '/index.jsx',
            ];
            const ok = cands.find((c) => files[c] != null);
            if (ok) return { path: ok, namespace: 'vfs' };
            return { path: 'stub:' + p, namespace: 'stub', pluginData: { originalSpec: p } };
          }
          return { path: p, namespace: 'bare' };
        });

        build.onLoad({ filter: /.*/, namespace: 'vfs' }, (args) => ({
          contents: files[args.path] != null ? files[args.path] : '',
          loader: loaderFor(args.path),
          resolveDir: args.path.split('/').slice(0, -1).join('/'),
        }));

        build.onLoad({ filter: /.*/, namespace: 'bare' }, (args) => {
          const key = args.path;
          const mod = (DEPS[key]) || {};
          const nameSet = {};
          for (const k of Object.keys(mod)) {
            if (k !== 'default' && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k)) nameSet[k] = true;
          }
          const need = importNames[key] || [];
          for (const n of need) {
            if (n === 'default' || n === '*') continue;
            if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(n)) nameSet[n] = true;
          }
          const safe = JSON.stringify(key);
          const lines = [
            'const __mod = (window.__autodsm_deps && window.__autodsm_deps[' + safe + ']) || {};',
            'const __default = __mod.default !== undefined ? __mod.default : __mod;',
            'export default __default;',
          ];
          for (const n of Object.keys(nameSet)) {
            lines.push('export const ' + n + ' = __mod[' + JSON.stringify(n) + '];');
          }
          return { contents: lines.join('\\n'), loader: 'js' };
        });

        // Stub with explicit named exports matching what user code imports.
        build.onLoad({ filter: /.*/, namespace: 'stub' }, (args) => {
          const orig = (args.pluginData && args.pluginData.originalSpec) || '';
          const need = importNames[orig] || [];
          const lines = [
            'const proxy = new Proxy(function(){ return null; }, {',
            "  get: (_, k) => k === '__esModule' ? true : proxy,",
            '  apply: () => null,',
            '});',
            'export default proxy;',
            "export const cn = (...a) => a.filter(Boolean).join(' ');",
          ];
          for (const n of need) {
            if (n === 'default' || n === '*' || n === 'cn') continue;
            if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(n)) continue;
            lines.push('export const ' + n + ' = proxy;');
          }
          return { contents: lines.join('\\n'), loader: 'js' };
        });
      },
    };
  }

  async function mount(config) {
    currentProps = { ...config.initial_props };
    try {
      await loadCore();
      const { js } = await bundleModule(config);

      // Execute the IIFE bundle. It assigns to window.__AUTODSM_MOD__.
      // No dynamic imports — works in null-origin sandbox.
      delete window.__AUTODSM_MOD__;
      (new Function(js))();
      const mod = window.__AUTODSM_MOD__ || {};

      // Prefer explicit name match, then default export, then a heuristic
      // scan for anything that looks like a React component (function, or
      // an object with $$typeof — forwardRef/memo).
      function looksLikeComponent(v) {
        if (typeof v === 'function') return true;
        if (v && typeof v === 'object' && (v.$$typeof || v.render || v.type)) return true;
        return false;
      }
      let Component =
        mod[config.entry_module] ||
        mod.default ||
        Object.values(mod).find(looksLikeComponent);
      // Also try common casings — e.g. entry 'SpinnerEmpty' with export
      // 'spinnerEmpty' or an export matching the filename stem.
      if (!Component) {
        const nm = (config.entry_module + '').toLowerCase();
        for (const [k, v] of Object.entries(mod)) {
          if (k.toLowerCase() === nm && looksLikeComponent(v)) { Component = v; break; }
        }
      }
      if (!Component) throw new Error('Could not locate exported component: ' + config.entry_module);

      currentComponent = Component;
      const rootEl = document.getElementById('root');
      if (currentRoot) {
        try { currentRoot.unmount(); } catch (e) {}
      }
      currentRoot = ReactDOM_.createRoot(rootEl);
      render();
      send({ type: 'RENDER_OK' });
    } catch (err) {
      send({
        type: 'RENDER_ERROR',
        error: { message: String(err && err.message || err), stack: err && err.stack },
      });
    }
  }

  function render() {
    if (!currentComponent || !currentRoot) return;
    const children = resolveChildren(currentProps);
    const props = { ...currentProps };
    delete props.__withIcon;
    delete props.children;
    try {
      currentRoot.render(React_.createElement(currentComponent, props, children));
    } catch (err) {
      send({
        type: 'RENDER_ERROR',
        error: { message: String(err && err.message || err), stack: err && err.stack },
      });
    }
  }

  function resolveChildren(props) {
    const withIcon = props.__withIcon;
    const text = typeof props.children === 'string' ? props.children : '';
    const icon = withIcon && LucideIcons && LucideIcons.Star
      ? React_.createElement(LucideIcons.Star, { size: 16, style: { marginRight: text ? 8 : 0 } })
      : null;
    if (icon && text) {
      return [icon, React_.createElement('span', { key: 't' }, text)];
    }
    return icon || text || undefined;
  }

  window.addEventListener('message', (ev) => {
    const data = ev.data || {};
    if (data.source === 'autodsm-iframe') return;
    if (data.type === 'MOUNT') {
      mount(data.config);
    } else if (data.type === 'UPDATE_PROPS') {
      currentProps = { ...currentProps, ...data.props };
      render();
    }
  });

  window.addEventListener('error', (ev) => {
    send({
      type: 'RENDER_ERROR',
      error: { message: String(ev.message), stack: ev.error && ev.error.stack },
    });
  });
  window.addEventListener('unhandledrejection', (ev) => {
    send({
      type: 'RENDER_ERROR',
      error: { message: String(ev.reason && ev.reason.message || ev.reason) },
    });
  });

  send({ type: 'RUNTIME_READY' });
})();
`;
