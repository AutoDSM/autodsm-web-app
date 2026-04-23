# Brand

Non-negotiable rules. Break them and the product looks like everyone else.

## Name

**autoDSM.** Lowercase `auto`, uppercase `DSM`. Never:

- ~~AutoDsm~~
- ~~Autodsm~~
- ~~autodsm~~
- ~~AUTODSM~~
- ~~Auto DSM~~

The lockup is one word, no space, no hyphen.

## Colors

The palette is **monotone**. Purple is a spice, not the main dish.

### Dark mode (default)

| Token              | Value         | Usage                                  |
| ------------------ | ------------- | -------------------------------------- |
| `--bg-primary`     | `#0B0B0F`     | App shell background                   |
| `--bg-secondary`   | `#111115`     | Cards, sidebar                         |
| `--bg-tertiary`    | `#18181D`     | Hover, selected                        |
| `--bg-canvas`      | `#0E0E12`     | Render canvas (dot grid overlay)       |
| `--bg-code`        | `#131318`     | Code blocks                            |
| `--text-primary`   | `#F7F7F9`     | Headings, primary text                 |
| `--text-secondary` | `#9699A4`     | Body, descriptions                     |
| `--text-tertiary`  | `#5F6271`     | Metadata, icons                        |
| `--border-default` | `#22222A`     | Dividers                               |
| `--border-strong`  | `#33333D`     | Focused, hovered                       |
| `--accent`         | `#8F23FA`     | **One color** — used sparingly         |
| `--accent-subtle`  | `#8F23FA1F`   | Accent backgrounds at 12% opacity      |
| `--warning`        | `#F5A524`     | Error/repair panels                    |
| `--danger`         | `#F43F5E`     | Destructive confirmations              |

### Light mode

| Token              | Value         |
| ------------------ | ------------- |
| `--bg-primary`     | `#FFFFFF`     |
| `--bg-secondary`   | `#F4F4F6`     |
| `--bg-tertiary`    | `#EBEBEF`     |
| `--bg-canvas`      | `#F7F7F9`     |
| `--bg-code`        | `#F4F4F6`     |
| `--text-primary`   | `#111113`     |
| `--text-secondary` | `#5F6271`     |
| `--text-tertiary`  | `#8D909B`     |
| `--border-default` | `#E5E5EA`     |
| `--border-strong`  | `#D4D4D8`     |
| `--accent`         | `#8F23FA`     |

### Rule

**No hex codes in JSX**. Always reference the CSS variable:

```tsx
// ✗ Don't
<div style={{ color: '#8F23FA' }} />

// ✓ Do
<div style={{ color: 'var(--accent)' }} />
// or
<div className="text-[var(--accent)]" />
```

The landing page is the single exception — it uses a different, lighter palette on purpose.

## Typography

Three families. No exceptions.

| Role     | Family      | Weight                | Usage                                       |
| -------- | ----------- | --------------------- | ------------------------------------------- |
| Heading  | **Manrope** | 600, 700              | Page titles, section headers                |
| Body     | **Sora**    | 400, 500              | Everything else                             |
| Mono     | **Geist Mono** | 400              | Code, file names, tokens, hex values        |

Manrope ships as `next/font/google`. Sora ships as `next/font/google`. Geist Mono is `geist/font/mono`.

### Scale

```
--text-xs:   12px / 16px
--text-sm:   13px / 18px
--text-base: 14px / 20px
--text-md:   15px / 22px
--text-lg:   16px / 24px
--text-xl:   18px / 26px
--text-2xl:  20px / 28px
--text-3xl:  24px / 30px
--text-4xl:  32px / 36px
```

Tailwind utilities bind to these automatically (see `src/app/globals.css`).

### Letter spacing

Headings: `tracking-tight` (`-0.01em`). Body: `normal`.

## Voice and tone

Write like a senior engineer explaining a system they designed. Never marketing. Never hype. Never hedging.

- **Brief.** If a sentence can be cut, cut it.
- **Confident.** "This does X" — not "This should do X" or "This aims to do X".
- **Concrete.** "60 req/hr" — not "fast".
- **No emojis**. Anywhere. Ever.
- **No exclamation points**. Ever.
- **Sentence case** for UI labels: "New agent", not "New Agent".

### Style examples

| ✗ Don't                                          | ✓ Do                                         |
| ------------------------------------------------ | -------------------------------------------- |
| "Welcome to autoDSM!"                            | "Start by pasting a repo URL."               |
| "We're excited to help you build your DSM."      | "Paste a URL. We'll scan it."                |
| "Your design system, supercharged 🚀"            | "The design system manager."                 |
| "Hmm, looks like we couldn't find that repo."    | "Repo not found."                            |

## Iconography

Lucide icons, `strokeWidth={1.5}`, `size={16}` in menus, `size={14}` in inline labels, `size={20}` in empty states. Always wrapped in a `text-t-tertiary` span so the icon color matches the surrounding text hierarchy.

## Motion

Transition tokens:

```
--motion-base:    140ms cubic-bezier(0.4, 0, 0.2, 1)
--motion-fast:     80ms cubic-bezier(0.4, 0, 0.2, 1)
--motion-slow:    280ms cubic-bezier(0.4, 0, 0.2, 1)
```

Use `transition-base` (utility class in `globals.css`) for hover/active. Reserve `slow` for modals and drawers.

Two branded animations:

- `animate-brand-pulse` — slow pulse on the logo while scanning.
- `animate-sweep` — left-to-right gradient sweep on progress bars.

## Logo

**Wordmark (Perplexity Computer)** in `public/brand/`:

- `perplexity-wordmark-light.svg` — light UI (from `Logo-Light-Text.svg`).
- `perplexity-wordmark-dark.svg` — dark UI (from `Logo-Dark-Text.svg.svg` on disk).

**Mark (autoDSM hex)** — compact glyph:

- `autodsm-icon-light.svg` / `autodsm-icon-dark.svg`

Use `ProductWordmark` / `ProductIcon` from [`src/components/brand/product-mark.tsx`](../src/components/brand/product-mark.tsx) so light/dark tracks `next-themes` (`class` on `html`). Do not recolor. `ProductWordmark` keeps the natural **921×329** aspect ratio from width alone.

For the **autodsm** `markVariant` (e.g. `/demo`), `autodsm-wordmark-light.svg` and `autodsm-wordmark-dark.svg` in `public/brand/` are the canonical full wordmarks (sourced from Logo-LightMode / Logo-DarkMode).
