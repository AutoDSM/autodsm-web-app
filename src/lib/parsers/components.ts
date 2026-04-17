/**
 * Component parser — given a .tsx source string, pull out:
 *   1. The exported component name (default export preferred; first named
 *      React component otherwise).
 *   2. The props interface/type, converted to PropControl[].
 *   3. `cva`/`class-variance-authority` variants when present (these become
 *      the "Configuration" presets).
 *   4. Bare npm imports (for esm.sh resolution) + local relative imports
 *      (for inlining in the render config).
 *
 * We use @babel/parser in TSX mode. It's forgiving enough to accept the
 * *weird* stuff Lovable/v0/Cursor tends to generate. ts-morph is used only
 * for slightly better type text extraction on prop interfaces.
 *
 * Error philosophy: never throw — always return *something* renderable.
 * Unknown prop types collapse to {type: 'unknown', raw: <typeText>}.
 */

import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
// @babel/traverse ships a broken ESM default export; unwrap it.
const traverse: typeof _traverse =
  (_traverse as unknown as { default?: typeof _traverse }).default ?? _traverse;

import type {
  ExportDefaultDeclaration,
  ExportNamedDeclaration,
  FunctionDeclaration,
  Identifier,
  TSType,
  VariableDeclarator,
} from '@babel/types';
import type { ParsedComponent, PropControl, PropControlType } from '../render/types';

// ─── Public API ────────────────────────────────────────────────────────────

export interface ParseOptions {
  filePath: string;
  /** Raw source of the .tsx file. */
  source: string;
  /** Best-effort map of relative import path → source, for local inlining. */
  relatedFiles?: Map<string, string>;
  /**
   * tsconfig `paths` aliases, each value is a list of absolute filesystem
   * prefixes (no leading slash) the alias resolves to. Example:
   *   '@/*' → ['apps/www/', 'packages/ui/src/']
   * The '*' is stripped; caller is responsible for producing clean prefixes.
   */
  aliases?: Record<string, string[]>;
}

export function parseComponent({ filePath, source, relatedFiles, aliases }: ParseOptions): ParsedComponent | null {
  let ast;
  try {
    ast = parse(source, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'decorators-legacy', 'classProperties'],
      errorRecovery: true,
    });
  } catch {
    return null;
  }

  const state = {
    imports: new Map<string, { defaultImport?: string; named: string[] }>(),
    components: [] as { name: string; propsTypeRef?: string }[],
    defaultExportName: undefined as string | undefined,
    propsTypes: new Map<string, TypeShape>(),
    cvaVariants: new Map<string, Record<string, string[]>>(),
  };

  traverse(ast, {
    ImportDeclaration(path) {
      const src = path.node.source.value;
      const bucket = state.imports.get(src) ?? { named: [] };
      for (const s of path.node.specifiers) {
        if (s.type === 'ImportDefaultSpecifier') bucket.defaultImport = s.local.name;
        if (s.type === 'ImportSpecifier') {
          const imported = s.imported.type === 'Identifier' ? s.imported.name : s.imported.value;
          bucket.named.push(imported);
        }
      }
      state.imports.set(src, bucket);
    },
    TSInterfaceDeclaration(path) {
      const name = path.node.id.name;
      const shape: TypeShape = { kind: 'object', properties: [] };
      for (const member of path.node.body.body) {
        if (member.type === 'TSPropertySignature' && member.key.type === 'Identifier') {
          shape.properties.push({
            name: member.key.name,
            optional: !!member.optional,
            type: readTsType(member.typeAnnotation?.typeAnnotation),
          });
        }
      }
      state.propsTypes.set(name, shape);
    },
    TSTypeAliasDeclaration(path) {
      const name = path.node.id.name;
      state.propsTypes.set(name, { kind: 'raw', raw: typeText(path.node.typeAnnotation) });
    },
    VariableDeclarator(path) {
      if (path.node.id.type !== 'Identifier') return;
      const name = path.node.id.name;
      const init = path.node.init;
      if (!init) return;

      // const Button = (props: Props) => <>...</>
      if (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression') {
        if (isLikelyComponentName(name)) {
          const propsRef = extractPropsTypeRefFromParam(init.params[0]);
          state.components.push({ name, propsTypeRef: propsRef });
        }
      }

      // const buttonVariants = cva("base", { variants: { ... } })
      if (
        init.type === 'CallExpression' &&
        init.callee.type === 'Identifier' &&
        init.callee.name === 'cva'
      ) {
        const variants = extractCvaVariants(init);
        if (variants) state.cvaVariants.set(name, variants);
      }
    },
    FunctionDeclaration(path) {
      const node = path.node as FunctionDeclaration;
      if (node.id && isLikelyComponentName(node.id.name)) {
        const propsRef = extractPropsTypeRefFromParam(node.params[0]);
        state.components.push({ name: node.id.name, propsTypeRef: propsRef });
      }
    },
    ExportDefaultDeclaration(path) {
      const node = path.node as ExportDefaultDeclaration;
      if (node.declaration.type === 'Identifier') {
        state.defaultExportName = node.declaration.name;
      } else if (
        node.declaration.type === 'FunctionDeclaration' &&
        node.declaration.id
      ) {
        state.defaultExportName = node.declaration.id.name;
      }
    },
    ExportNamedDeclaration(path) {
      const node = path.node as ExportNamedDeclaration;
      if (node.declaration?.type === 'VariableDeclaration') {
        for (const d of node.declaration.declarations) {
          if (d.id.type === 'Identifier' && isLikelyComponentName(d.id.name)) {
            // already recorded above in VariableDeclarator; nothing to do.
          }
        }
      }
    },
  });

  // Pick the primary component. default export wins; otherwise the first
  // PascalCase name.
  const primary =
    state.components.find((c) => c.name === state.defaultExportName) ??
    state.components[0];
  if (!primary) return null;

  // Build props
  const propsShape = primary.propsTypeRef ? state.propsTypes.get(primary.propsTypeRef) : undefined;
  const variantForComponent = findVariantsForComponent(primary.name, state.cvaVariants);

  const props = buildPropControls(propsShape, variantForComponent);
  const initial_props = buildInitialProps(props);
  const presets = buildPresets(primary.name, variantForComponent, props);

  // Imports → dependency buckets. Relative imports are resolved against the
  // current file's directory and looked up in the `relatedFiles` virtual FS
  // (whose keys are absolute, e.g. `/src/components/button.tsx`). We follow
  // a shallow transitive closure so nested relatives also get inlined.
  const dependencies: Record<string, string> = {};
  const localImports: ParsedComponent['local_imports'] = [];
  const seenLocal = new Set<string>();
  const fileDir = ('/' + filePath).split('/').slice(0, -1).join('/');

  function joinRel(dir: string, rel: string): string {
    const stack = dir ? dir.split('/') : [];
    for (const seg of rel.split('/')) {
      if (seg === '.' || seg === '') continue;
      if (seg === '..') stack.pop();
      else stack.push(seg);
    }
    return '/' + stack.filter(Boolean).join('/');
  }

  function tryResolve(dir: string, rel: string): { key: string; source: string } | null {
    if (!relatedFiles) return null;
    const base = joinRel(dir, rel);
    const candidates = [
      base, base + '.ts', base + '.tsx', base + '.js', base + '.jsx',
      base + '/index.ts', base + '/index.tsx', base + '/index.js', base + '/index.jsx',
    ];
    for (const k of candidates) {
      const s = relatedFiles.get(k);
      if (s != null) return { key: k, source: s };
    }
    return null;
  }

  /**
   * Try to resolve an aliased import (e.g. `@/components/ui/button`).
   * For each alias prefix, try joining + standard extension candidates.
   * Returns the first hit.
   */
  function resolveAlias(spec: string): { key: string; source: string } | null {
    if (!aliases || !relatedFiles) return null;
    for (const [aliasKey, prefixes] of Object.entries(aliases)) {
      // aliasKey is bare like '@/' or '~/' (trailing slash implied).
      const stripped = aliasKey.endsWith('/') ? aliasKey.slice(0, -1) : aliasKey;
      if (spec !== stripped && !spec.startsWith(stripped + '/')) continue;
      const tail = spec.slice(stripped.length).replace(/^\//, '');
      for (const prefix of prefixes) {
        const base = '/' + prefix.replace(/^\//, '').replace(/\/$/, '') + (tail ? '/' + tail : '');
        const candidates = [
          base, base + '.ts', base + '.tsx', base + '.js', base + '.jsx',
          base + '/index.ts', base + '/index.tsx', base + '/index.js', base + '/index.jsx',
        ];
        for (const k of candidates) {
          const s = relatedFiles.get(k);
          if (s != null) return { key: k, source: s };
        }
      }
    }
    return null;
  }

  function isAliased(spec: string): boolean {
    if (!aliases) return false;
    for (const aliasKey of Object.keys(aliases)) {
      const stripped = aliasKey.endsWith('/') ? aliasKey.slice(0, -1) : aliasKey;
      if (spec === stripped || spec.startsWith(stripped + '/')) return true;
    }
    return false;
  }

  const queue: Array<{ fromDir: string; rel: string }> = [];
  for (const [src] of state.imports) {
    if (src.startsWith('.') || src.startsWith('/')) {
      queue.push({ fromDir: fileDir, rel: src });
    } else if (isAliased(src)) {
      const hit = resolveAlias(src);
      if (hit && !seenLocal.has(hit.key)) {
        seenLocal.add(hit.key);
        localImports.push({ from: src, resolved_path: hit.key, source: hit.source });
        const nextDir = hit.key.split('/').slice(0, -1).join('/');
        const re = /(?:from|import)\s*['"]([^'"]+)['"]/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(hit.source)) !== null) {
          const s = m[1];
          if (s.startsWith('.') || s.startsWith('/')) {
            queue.push({ fromDir: nextDir, rel: s });
          } else if (isAliased(s)) {
            const h2 = resolveAlias(s);
            if (h2 && !seenLocal.has(h2.key)) {
              seenLocal.add(h2.key);
              localImports.push({ from: s, resolved_path: h2.key, source: h2.source });
              queue.push({ fromDir: h2.key.split('/').slice(0, -1).join('/'), rel: '.' });
            }
          } else if (!s.startsWith('react') && s !== 'react-dom') {
            dependencies[s] = 'latest';
          }
        }
      }
    } else if (!src.startsWith('react') && src !== 'react-dom') {
      dependencies[src] = 'latest';
    }
  }

  while (queue.length) {
    const { fromDir, rel } = queue.shift()!;
    if (rel === '.' || rel === '') continue;
    const hit = tryResolve(fromDir, rel);
    if (!hit || seenLocal.has(hit.key)) continue;
    seenLocal.add(hit.key);
    localImports.push({ from: rel, resolved_path: hit.key, source: hit.source });
    // Enqueue nested imports from this newly-inlined file.
    const nextDir = hit.key.split('/').slice(0, -1).join('/');
    const re = /(?:from|import)\s*['"]([^'"]+)['"]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(hit.source)) !== null) {
      const s = m[1];
      if (s.startsWith('.') || s.startsWith('/')) {
        queue.push({ fromDir: nextDir, rel: s });
      } else if (isAliased(s)) {
        const h2 = resolveAlias(s);
        if (h2 && !seenLocal.has(h2.key)) {
          seenLocal.add(h2.key);
          localImports.push({ from: s, resolved_path: h2.key, source: h2.source });
          // Walk its relatives too.
          const subDir = h2.key.split('/').slice(0, -1).join('/');
          const sre = /(?:from|import)\s*['"](\.[^'"]+|\/[^'"]+)['"]/g;
          let sm: RegExpExecArray | null;
          while ((sm = sre.exec(h2.source)) !== null) {
            queue.push({ fromDir: subDir, rel: sm[1] });
          }
        }
      } else if (!s.startsWith('react') && s !== 'react-dom') {
        dependencies[s] = 'latest';
      }
    }
  }

  /**
   * Rewrite aliased imports in a source file to absolute virtual-FS paths
   * (leading slash) so the runtime bundler doesn't treat them as bare.
   *
   * We rewrite ALWAYS when the spec matches an alias key — even if the
   * target file isn't present in `relatedFiles`. That way, when the
   * runtime can't find the file in its vfs, it stubs it with a tolerant
   * Proxy instead of falling through to the `bare` namespace (which would
   * try to resolve it as an npm package on esm.sh, and fail).
   */
  function rewriteAliases(src: string): string {
    if (!aliases) return src;
    return src.replace(
      /((?:from|import)\s*['"])([^.\/][^'"]*)(['"])/g,
      (full, pre, spec, post) => {
        if (!isAliased(spec)) return full;
        // Try full resolution first (gives us the right extension path).
        const hit = resolveAlias(spec);
        if (hit) return pre + hit.key + post;
        // Fallback: rewrite to a best-guess absolute path using the first
        // alias target. Runtime will stub this if the file is absent.
        for (const [aliasKey, prefixes] of Object.entries(aliases!)) {
          const stripped = aliasKey.endsWith('/') ? aliasKey.slice(0, -1) : aliasKey;
          if (spec !== stripped && !spec.startsWith(stripped + '/')) continue;
          const tail = spec.slice(stripped.length).replace(/^\//, '');
          const prefix = (prefixes[0] || '').replace(/^\//, '').replace(/\/$/, '');
          const guess = '/' + [prefix, tail].filter(Boolean).join('/');
          return pre + guess + post;
        }
        return full;
      },
    );
  }

  const rewrittenSource = rewriteAliases(source);
  const rewrittenLocalImports = localImports.map((li) => ({
    ...li,
    source: rewriteAliases(li.source),
  }));

  return {
    name: primary.name,
    slug: slugify(primary.name),
    file_path: filePath,
    source_code: rewrittenSource,
    props,
    initial_props,
    presets,
    dependencies,
    local_imports: rewrittenLocalImports,
  };
}

// ─── Type-shape plumbing ───────────────────────────────────────────────────

type TypeShape =
  | { kind: 'raw'; raw: string }
  | {
      kind: 'object';
      properties: {
        name: string;
        optional: boolean;
        type: { kind: PropControlType; raw?: string; values?: string[] };
      }[];
    };

function readTsType(t: TSType | undefined | null): {
  kind: PropControlType;
  raw?: string;
  values?: string[];
} {
  if (!t) return { kind: 'unknown' };
  const raw = typeText(t);
  switch (t.type) {
    case 'TSBooleanKeyword':
      return { kind: 'boolean', raw };
    case 'TSStringKeyword':
      return { kind: 'string', raw };
    case 'TSNumberKeyword':
      return { kind: 'number', raw };
    case 'TSFunctionType':
      return { kind: 'function', raw };
    case 'TSUnionType': {
      const lits = t.types.filter((x) => x.type === 'TSLiteralType');
      if (lits.length && lits.length === t.types.length) {
        const values = lits
          .map((x) => {
            // @ts-ignore narrowed above
            const lit = x.literal;
            if (lit.type === 'StringLiteral') return lit.value;
            return null;
          })
          .filter((v): v is string => !!v);
        if (values.length) return { kind: 'enum', raw, values };
      }
      return { kind: 'unknown', raw };
    }
    case 'TSTypeReference': {
      const nameNode = t.typeName;
      const name = nameNode.type === 'Identifier' ? nameNode.name : 'ref';
      if (name === 'ReactNode' || name === 'ReactElement' || name === 'JSX.Element') {
        return { kind: 'node', raw };
      }
      return { kind: 'unknown', raw };
    }
    default:
      return { kind: 'unknown', raw };
  }
}

function typeText(t: TSType | null | undefined): string {
  if (!t) return 'unknown';
  // Light-weight serializer — good enough for prop labels.
  switch (t.type) {
    case 'TSStringKeyword': return 'string';
    case 'TSNumberKeyword': return 'number';
    case 'TSBooleanKeyword': return 'boolean';
    case 'TSAnyKeyword': return 'any';
    case 'TSUnknownKeyword': return 'unknown';
    case 'TSVoidKeyword': return 'void';
    case 'TSLiteralType': {
      const lit = t.literal;
      if (lit.type === 'StringLiteral') return `"${lit.value}"`;
      if (lit.type === 'NumericLiteral') return String(lit.value);
      if (lit.type === 'BooleanLiteral') return String(lit.value);
      return '?';
    }
    case 'TSUnionType': return t.types.map(typeText).join(' | ');
    case 'TSTypeReference': {
      const n = t.typeName;
      return n.type === 'Identifier' ? n.name : 'ref';
    }
    case 'TSFunctionType': return '(...args) => any';
    case 'TSArrayType': return `${typeText(t.elementType)}[]`;
    default: return t.type;
  }
}

function extractPropsTypeRefFromParam(param: unknown): string | undefined {
  if (!param) return undefined;
  // @ts-ignore — Babel union is wide
  const anno = param.typeAnnotation?.typeAnnotation;
  if (!anno) return undefined;
  if (anno.type === 'TSTypeReference' && anno.typeName?.type === 'Identifier') {
    return anno.typeName.name;
  }
  return undefined;
}

function extractCvaVariants(call: unknown): Record<string, string[]> | null {
  // call is a CallExpression whose args[1] is an ObjectExpression with
  // a property "variants" → ObjectExpression whose props are variant axes.
  // @ts-ignore — loose structural parse
  const arg = call.arguments?.[1];
  if (!arg || arg.type !== 'ObjectExpression') return null;
  const variantsProp = arg.properties.find(
    // @ts-ignore
    (p) => p.type === 'ObjectProperty' && p.key?.name === 'variants',
  );
  if (!variantsProp) return null;
  // @ts-ignore
  const variantsObj = variantsProp.value;
  if (variantsObj.type !== 'ObjectExpression') return null;
  const out: Record<string, string[]> = {};
  for (const p of variantsObj.properties) {
    // @ts-ignore
    if (p.type !== 'ObjectProperty' || p.key?.type !== 'Identifier') continue;
    // @ts-ignore
    const name = p.key.name;
    // @ts-ignore
    if (p.value.type !== 'ObjectExpression') continue;
    // @ts-ignore
    const keys: string[] = p.value.properties
      .map((kp: { type: string; key?: { type: string; name?: string; value?: string } }) =>
        kp.type === 'ObjectProperty' && kp.key
          ? kp.key.type === 'Identifier'
            ? kp.key.name
            : kp.key.value
          : null,
      )
      .filter((k: string | null) => k != null);
    out[name] = keys;
  }
  return out;
}

function findVariantsForComponent(
  _componentName: string,
  allVariants: Map<string, Record<string, string[]>>,
): Record<string, string[]> | null {
  // shadcn convention: `buttonVariants` → `Button`. We take the first cva
  // definition in the file as belonging to the primary component.
  const first = allVariants.values().next();
  return first.done ? null : first.value;
}

function buildPropControls(
  shape: TypeShape | undefined,
  variants: Record<string, string[]> | null,
): PropControl[] {
  const out: PropControl[] = [];

  if (shape?.kind === 'object') {
    for (const p of shape.properties) {
      if (p.type.kind === 'enum') {
        out.push({
          name: p.name,
          type: 'enum',
          raw: p.type.raw,
          values: p.type.values,
          required: !p.optional,
        });
      } else {
        out.push({
          name: p.name,
          type: p.type.kind,
          raw: p.type.raw,
          required: !p.optional,
        });
      }
    }
  }

  // Merge cva variants — if a prop name matches an axis, upgrade it to enum
  // with the discovered values.
  if (variants) {
    for (const [axis, values] of Object.entries(variants)) {
      const existing = out.find((c) => c.name === axis);
      if (existing) {
        existing.type = 'enum';
        existing.values = values;
      } else {
        out.push({
          name: axis,
          type: 'enum',
          values,
          required: false,
        });
      }
    }
  }

  // Always expose children if not already present (most components want it).
  if (!out.find((c) => c.name === 'children')) {
    out.push({ name: 'children', type: 'node', required: false });
  }

  return out;
}

function buildInitialProps(controls: PropControl[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const c of controls) {
    switch (c.type) {
      case 'enum':
        out[c.name] = c.values?.[0] ?? '';
        break;
      case 'boolean':
        out[c.name] = false;
        break;
      case 'string':
        out[c.name] = c.name === 'className' ? '' : 'value';
        break;
      case 'number':
        out[c.name] = 0;
        break;
      case 'node':
        out[c.name] = c.name === 'children' ? defaultChildrenGuess() : undefined;
        break;
    }
  }
  return out;
}

function defaultChildrenGuess() {
  // Preview text is plain text — the iframe runtime wraps it.
  return 'Button';
}

function buildPresets(
  componentName: string,
  variants: Record<string, string[]> | null,
  controls: PropControl[],
) {
  const presets: { label: string; props: Record<string, unknown> }[] = [];
  // Always produce a "Label only" preset matching the initial render.
  presets.push({
    label: 'Label only',
    props: { children: componentName },
  });
  presets.push({
    label: 'Label & icon',
    props: { children: componentName, __withIcon: true },
  });
  presets.push({ label: 'Icon only', props: { children: '', __withIcon: true } });
  if (controls.find((c) => c.name === 'disabled')) {
    presets.push({ label: 'Disabled', props: { children: componentName, disabled: true } });
  }
  if (controls.find((c) => c.name === 'loading')) {
    presets.push({ label: 'Loading', props: { children: componentName, loading: true } });
  }
  void variants;
  return presets;
}

export function slugify(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[^\w-]+/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function isLikelyComponentName(name: string): boolean {
  return /^[A-Z]/.test(name);
}
