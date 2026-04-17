/**
 * iframe-runtime.ts — shipped **as source text** into the render iframe.
 *
 * Responsibilities:
 *   1. Initialise esbuild-wasm (single-threaded, no SAB required).
 *   2. On MOUNT: bundle all files in config.files into a single ESM module
 *      (via an in-memory virtual-filesystem plugin), with:
 *        - bare imports routed to esm.sh as externals
 *        - relative imports resolved against the virtual FS
 *        - missing relative imports stubbed with a tolerant Proxy
 *      Then execute by dynamic-importing a blob URL created inside this
 *      iframe (same null-origin as the document \u2014 import() works).
 *   3. Render the resolved component with initial props, mount into #root.
 *   4. On UPDATE_PROPS: re-render with new props using the same root.
 *   5. Any error \u2192 postMessage RENDER_ERROR back to the parent.
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

  async function loadCore() {
    if (React_ && ReactDOM_) return;
    const [R, RD, L] = await Promise.all([
      import(ESM_BASE + '/react@19'),
      import(ESM_BASE + '/react-dom@19/client'),
      import(ESM_BASE + '/lucide-react').catch(() => ({})),
    ]);
    React_ = R.default || R;
    ReactDOM_ = RD.default || RD;
    LucideIcons = L;
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

  // Virtual-FS plugin. All import resolution (entry, relatives, bare) routes
  // through here. Bare imports become \`external\` URLs to esm.sh \u2014 esbuild
  // leaves them untouched in the output, which the browser then fetches
  // directly at import-time.
  function virtualFsPlugin(files, entryPath) {
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
            return { path: 'stub:' + p, namespace: 'stub' };
          }
          // Bare imports \u2192 esm.sh URLs, marked external so esbuild emits
          // them as literal import statements in the output bundle.
          if (p === 'react' || p.startsWith('react/')) {
            const tail = p === 'react' ? '' : p.slice(5);
            return { path: ESM_BASE + '/react@19' + tail, external: true };
          }
          if (p === 'react-dom' || p.startsWith('react-dom/')) {
            return { path: ESM_BASE + '/' + p.replace('react-dom', 'react-dom@19'), external: true };
          }
          return { path: ESM_BASE + '/' + p + '?bundle', external: true };
        });

        build.onLoad({ filter: /.*/, namespace: 'vfs' }, (args) => {
          const source = files[args.path] != null ? files[args.path] : '';
          return {
            contents: source,
            loader: loaderFor(args.path),
            resolveDir: args.path.split('/').slice(0, -1).join('/'),
          };
        });

        // Stub module for unresolved relative imports. A tolerant Proxy
        // stands in for the default export and common named exports, so
        // the importer's render path survives.
        build.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
          contents: [
            \`const proxy = new Proxy(function(){ return null; }, {\`,
            \`  get: (_, k) => k === '__esModule' ? true : proxy,\`,
            \`  apply: () => null,\`,
            \`});\`,
            \`export default proxy;\`,
            \`export const cn = (...a) => a.filter(Boolean).join(' ');\`,
          ].join('\\n'),
          loader: 'js',
        }));
      },
    };
  }

  async function bundleModule(config) {
    await loadEsbuild();
    const entryPath = pickEntryPath(config);
    const result = await esbuild.build({
      entryPoints: [entryPath],
      bundle: true,
      write: false,
      format: 'esm',
      target: 'es2020',
      jsx: 'automatic',
      jsxImportSource: 'react',
      sourcemap: 'inline',
      plugins: [virtualFsPlugin(config.files, entryPath)],
      logLevel: 'silent',
    });
    const js = result.outputFiles && result.outputFiles[0] && result.outputFiles[0].text;
    if (!js) throw new Error('esbuild produced no output.');
    return { js, entryPath };
  }

  async function mount(config) {
    currentProps = { ...config.initial_props };
    try {
      await loadCore();
      const { js } = await bundleModule(config);

      // Execute the bundle via a blob-URL dynamic import. Blob URLs are
      // same-origin with the iframe's document (both are null), so import()
      // resolves them even under sandbox="allow-scripts".
      const blob = new Blob([js], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      let mod;
      try {
        mod = await import(/* @vite-ignore */ url);
      } finally {
        try { URL.revokeObjectURL(url); } catch (e) {}
      }

      const Component =
        mod[config.entry_module] ||
        mod.default ||
        Object.values(mod).find((v) => typeof v === 'function');
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
