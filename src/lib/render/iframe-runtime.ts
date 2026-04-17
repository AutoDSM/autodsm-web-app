/**
 * iframe-runtime.ts — shipped **as source text** into the render iframe.
 *
 * Responsibilities:
 *   1. Initialise esbuild-wasm (single-threaded, no SAB required).
 *   2. On MOUNT: transform every .ts/.tsx/.js/.jsx in config.files into JS,
 *      rewrite bare imports to esm.sh URLs, rewrite relative imports to
 *      sibling blob URLs, then `import()` the entry module via a blob URL.
 *   3. Render the resolved component with initial props, mount into #root.
 *   4. On UPDATE_PROPS: re-render with new props using the same root.
 *   5. Any error → postMessage RENDER_ERROR back to the parent.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export const IFRAME_RUNTIME_SOURCE = /* js */ `
(function () {
  const ESBUILD_WASM_URL = 'https://esm.sh/esbuild-wasm@0.23.1/esbuild.wasm';
  const ESBUILD_ES_URL = 'https://esm.sh/esbuild-wasm@0.23.1/esm/browser.js';
  const ESM_BASE = 'https://esm.sh';

  let esbuild;
  let esbuildReady;
  let currentConfig = null;
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

  // Rewrite bare imports: "clsx" → "https://esm.sh/clsx?bundle".
  function rewriteBareImports(code) {
    return code.replace(
      /(from\\s+|import\\s+)(['"])([^'"./][^'"]*)\\2/g,
      (_, kw, q, spec) => {
        if (spec === 'react' || spec.startsWith('react/')) {
          const tail = spec === 'react' ? '' : spec.slice(5);
          return kw + q + ESM_BASE + '/react@19' + tail + q;
        }
        if (spec === 'react-dom' || spec.startsWith('react-dom/')) {
          return kw + q + ESM_BASE + '/' + spec.replace('react-dom', 'react-dom@19') + q;
        }
        return kw + q + ESM_BASE + '/' + spec + '?bundle' + q;
      },
    );
  }

  function loaderFor(path) {
    if (path.endsWith('.ts')) return 'ts';
    if (path.endsWith('.tsx')) return 'tsx';
    if (path.endsWith('.jsx')) return 'jsx';
    return 'js';
  }

  async function transformAllFiles(config) {
    await loadEsbuild();

    // Pass 1: transform each source file (JSX → JS), keep relative imports
    // intact. Rewrite bare imports to esm.sh URLs.
    const transformed = new Map();
    for (const [path, source] of Object.entries(config.files)) {
      const out = await esbuild.transform(source, {
        loader: loaderFor(path),
        jsx: 'automatic',
        jsxImportSource: 'react',
        target: 'es2020',
        format: 'esm',
        sourcemap: 'inline',
      });
      transformed.set(path, rewriteBareImports(out.code));
    }

    // Pass 2: reserve a placeholder for each path so relative imports can
    // refer to siblings before we mint blob URLs.
    const placeholder = new Map();
    for (const path of transformed.keys()) {
      placeholder.set(
        path,
        '__AUTODSM_BLOB_' + Math.random().toString(36).slice(2) + '__',
      );
    }

    // Stub module — returned when a relative import can't be resolved to a
    // file in the virtual FS. Using a Proxy makes it tolerate arbitrary
    // member access so the component still tries to render.
    const stubSource = [
      "const proxy = new Proxy(function(){ return null; }, {",
      "  get: (_, k) => k === '__esModule' ? true : proxy,",
      "  apply: () => null,",
      "});",
      "export default proxy;",
      "export const cn = (...a) => a.filter(Boolean).join(' ');",
    ].join('\\n');
    const stubUrl = URL.createObjectURL(new Blob([stubSource], { type: 'text/javascript' }));
    const missingImports = new Set();

    // Pass 3: rewrite relative imports to placeholders (or stub when missing).
    const withPlaceholders = new Map();
    for (const [path, code] of transformed.entries()) {
      const rewritten = code.replace(
        /(from\\s+|import\\s+)(['"])(\\.[^'"]+)\\2/g,
        (m, kw, q, rel) => {
          const candidates = [
            resolveRel(path, rel),
            resolveRel(path, rel + '.ts'),
            resolveRel(path, rel + '.tsx'),
            resolveRel(path, rel + '.js'),
            resolveRel(path, rel + '.jsx'),
            resolveRel(path, rel + '/index.ts'),
            resolveRel(path, rel + '/index.tsx'),
            resolveRel(path, rel + '/index.js'),
          ];
          const hit = candidates.find((c) => placeholder.has(c));
          if (hit) return kw + q + placeholder.get(hit) + q;
          missingImports.add(rel);
          return kw + q + stubUrl + q;
        },
      );
      withPlaceholders.set(path, rewritten);
    }
    if (missingImports.size > 0) {
      try { console.warn('[autoDSM] stubbed unresolved imports:', Array.from(missingImports)); } catch (e) {}
    }

    // Pass 4: mint real blob URLs, then swap placeholders for the real URLs
    // via a second string replacement. (Blob URLs don't allow self-reference,
    // so we have to do the swap in the source text before createObjectURL.)
    const blobFor = new Map();
    for (const [path, code] of withPlaceholders.entries()) {
      const blob = new Blob([code], { type: 'text/javascript' });
      blobFor.set(path, URL.createObjectURL(blob));
    }
    const finalUrls = new Map();
    for (const [path, code] of withPlaceholders.entries()) {
      let stitched = code;
      for (const [otherPath, ph] of placeholder.entries()) {
        if (stitched.indexOf(ph) !== -1) {
          stitched = stitched.split(ph).join(blobFor.get(otherPath));
        }
      }
      const b = new Blob([stitched], { type: 'text/javascript' });
      finalUrls.set(path, URL.createObjectURL(b));
    }
    // Best-effort: release the first-generation blob URLs we no longer need.
    for (const u of blobFor.values()) {
      try { URL.revokeObjectURL(u); } catch (e) {}
    }
    return finalUrls;
  }

  function resolveRel(fromPath, rel) {
    const stack = fromPath.split('/');
    stack.pop();
    for (const seg of rel.split('/')) {
      if (seg === '.' || seg === '') continue;
      if (seg === '..') stack.pop();
      else stack.push(seg);
    }
    return '/' + stack.filter(Boolean).join('/');
  }

  async function mount(config) {
    currentConfig = config;
    currentProps = { ...config.initial_props };
    try {
      await loadCore();
      const urls = await transformAllFiles(config);
      const entryPath = pickEntryPath(config, urls);
      if (!entryPath) throw new Error('Entry module not found in render config files.');
      const mod = await import(/* @vite-ignore */ urls.get(entryPath));
      const Component =
        mod[config.entry_module] ||
        mod.default ||
        Object.values(mod).find((v) => typeof v === 'function');
      if (!Component) throw new Error('Could not locate exported component: ' + config.entry_module);

      currentComponent = Component;
      const rootEl = document.getElementById('root');
      // Unmount any prior root before creating a new one.
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

  function pickEntryPath(config, urls) {
    const candidates = Array.from(urls.keys());
    const entry = (config.entry_module + '').toLowerCase();
    // 1) case-insensitive basename match, any extension.
    const exact = candidates.find((p) => {
      const base = p.split('/').pop() || '';
      const noExt = base.replace(/\\.(tsx|ts|jsx|js)$/, '').toLowerCase();
      return noExt === entry;
    });
    if (exact) return exact;
    // 2) largest tsx/jsx file as a proxy for "the main one".
    return candidates
      .filter((p) => /\\.(tsx|jsx)$/.test(p))
      .sort((a, b) => (config.files[b] || '').length - (config.files[a] || '').length)[0]
      || candidates[0];
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
    if (data.source === 'autodsm-iframe') return; // ignore echoes
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
