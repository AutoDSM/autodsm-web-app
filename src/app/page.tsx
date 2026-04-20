"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ArrowRight,
  Palette,
  Type,
  Ruler,
  Sparkles,
  Layers,
  CircleDot,
  MousePointer2,
  Monitor,
  Droplet,
  Square,
  Image as ImageIcon,
  Share2,
  RefreshCw,
  Github,
  Lock,
  Moon,
  Sun,
} from "lucide-react";
import { normalizeRepoInput } from "@/lib/utils";
import { toast } from "sonner";
import { ProductWordmark } from "@/components/brand/product-mark";

/**
 * Landing page — deep product explainer for the Brand Book MVP.
 * Theme-agnostic via CSS tokens. Light is default (set in root layout).
 * Every CTA funnels to /login.
 */
export default function LandingPage() {
  const router = useRouter();
  const [value, setValue] = React.useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const normalized = normalizeRepoInput(value);
    if (!normalized) {
      toast.error("Enter a GitHub repo as owner/repo or a github.com URL.");
      return;
    }
    try {
      sessionStorage.setItem("autodsm.pendingRepo", normalized);
    } catch {
      /* ignore */
    }
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <TopNav />

      <main>
        <Hero
          value={value}
          setValue={setValue}
          onSubmit={handleSubmit}
        />
        <SocialProof />
        <HowItWorks />
        <WhatsExtracted />
        <BrandBookSection />
        <WhyAutoDSM />
        <MvpScope />
        <FinalCta />
      </main>

      <Footer />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Top nav                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

function TopNav() {
  const links: { label: string; href: string }[] = [
    { label: "How it works", href: "#how" },
    { label: "What's inside", href: "#inside" },
    { label: "Brand book", href: "#brand-book" },
    { label: "MVP scope", href: "#scope" },
  ];

  return (
    <header className="sticky top-0 z-40 h-[72px] px-6 sm:px-8 bg-[var(--bg-primary)]/80 backdrop-blur-lg border-b border-[var(--border-subtle)]">
      <div className="max-w-[1200px] mx-auto h-full flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <ProductWordmark width={120} height={43} priority />
        </Link>

        <nav className="hidden md:flex items-center gap-1 bg-[var(--bg-secondary)] rounded-full p-1 border border-[var(--border-subtle)]">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="px-4 h-9 inline-flex items-center rounded-full text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors duration-150"
              style={{ fontFamily: "var(--font-geist-sans)", fontWeight: 500 }}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          <Link
            href="/login"
            className="hidden sm:inline-flex items-center h-10 px-4 rounded-full text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-150"
            style={{ fontFamily: "var(--font-geist-sans)", fontWeight: 500 }}
          >
            Log in
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center h-10 px-5 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] text-[13px] transition-colors duration-150"
            style={{ fontFamily: "var(--font-geist-sans)", fontWeight: 500 }}
          >
            Create account
          </Link>
        </div>
      </div>
    </header>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="h-9 w-9 inline-flex items-center justify-center rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors duration-150"
    >
      {mounted ? (
        isDark ? (
          <Sun size={16} strokeWidth={1.5} />
        ) : (
          <Moon size={16} strokeWidth={1.5} />
        )
      ) : (
        <span className="w-4 h-4" />
      )}
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Hero                                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

function Hero({
  value,
  setValue,
  onSubmit,
}: {
  value: string;
  setValue: (v: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="relative overflow-hidden">
      <BackgroundGlow />
      <div className="relative max-w-[1200px] mx-auto px-6 sm:px-8 pt-20 pb-24 md:pt-28 md:pb-32 flex flex-col items-center text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3.5 py-1.5 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors duration-150"
          style={{ fontFamily: "var(--font-geist-sans)", fontWeight: 500 }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
          MVP is live — try the brand book on your repo
          <ArrowRight size={12} strokeWidth={1.8} />
        </Link>

        <h1
          className="mt-6 max-w-[880px] text-[var(--text-primary)]"
          style={{
            fontFamily: "var(--font-manrope)",
            fontWeight: 700,
            fontSize: "clamp(36px, 5.6vw, 60px)",
            lineHeight: 1.05,
            letterSpacing: "-0.025em",
          }}
        >
          Your design system,{" "}
          <span style={{ color: "var(--accent)" }}>already written</span>{" "}
          in your codebase.
        </h1>

        <p
          className="mt-5 max-w-[640px] text-[var(--text-secondary)]"
          style={{
            fontFamily: "var(--font-geist-sans)",
            fontWeight: 400,
            fontSize: "17px",
            lineHeight: 1.55,
          }}
        >
          autoDSM connects to your GitHub repo and auto-generates a premium,
          shareable brand book. Every color, font, spacing value, shadow, border,
          animation, breakpoint, and asset — extracted from your code, not
          hand-curated.
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-10 flex items-center gap-1 h-14 w-full max-w-[520px] bg-[var(--bg-elevated)] rounded-full border border-[var(--border-default)] pl-5 pr-1.5 shadow-[var(--shadow-md)]"
        >
          <Github
            size={16}
            strokeWidth={1.5}
            className="text-[var(--text-tertiary)] shrink-0"
          />
          <input
            type="text"
            placeholder="owner/repo or github.com URL"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            spellCheck={false}
            aria-label="GitHub repository"
            className="flex-1 h-full bg-transparent outline-none text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] ml-3"
            style={{ fontFamily: "var(--font-geist-sans)" }}
          />
          <button
            type="submit"
            className="h-11 px-5 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] text-[14px] transition-colors duration-150"
            style={{ fontFamily: "var(--font-geist-sans)", fontWeight: 500 }}
          >
            Get started
            <ArrowRight size={15} strokeWidth={1.8} />
          </button>
        </form>

        <p
          className="mt-5 text-[12px] text-[var(--text-tertiary)] inline-flex items-center gap-2"
          style={{ fontFamily: "var(--font-geist-sans)" }}
        >
          <Lock size={12} strokeWidth={1.5} />
          Works with public repos. Private repos supported via the autoDSM
          GitHub App.
        </p>
      </div>
    </section>
  );
}

function BackgroundGlow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-70"
      style={{
        background:
          "radial-gradient(60% 40% at 50% 0%, var(--accent-subtle) 0%, transparent 70%)",
      }}
    />
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Social proof / validators                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

function SocialProof() {
  const items = [
    "Built for Tailwind v3 & v4",
    "Works with shadcn/ui",
    "CSS variables",
    "next/font & Geist",
    "PostCSS, Babel AST",
  ];
  return (
    <section className="border-y border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
      <div className="max-w-[1200px] mx-auto px-6 sm:px-8 py-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
        <span
          className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          Extractor supports
        </span>
        {items.map((t) => (
          <span
            key={t}
            className="text-[13px] text-[var(--text-secondary)]"
            style={{ fontFamily: "var(--font-geist-sans)", fontWeight: 500 }}
          >
            {t}
          </span>
        ))}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* How it works                                                               */
/* ────────────────────────────────────────────────────────────────────────── */

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Connect your repo",
      desc: "Sign in with GitHub and authorize the autoDSM App on any public or private repository. Zero config files to write.",
    },
    {
      n: "02",
      title: "We scan the code",
      desc: "Our extractor reads your globals.css, tailwind.config, components.json, fonts, and assets — detecting every token through AST parsing.",
    },
    {
      n: "03",
      title: "Brand book is live",
      desc: "A beautiful, interactive reference site is generated in seconds with every token rendered, copyable, and shareable with your team.",
    },
  ];

  return (
    <section id="how" className="scroll-mt-24 py-24 sm:py-32">
      <div className="max-w-[1200px] mx-auto px-6 sm:px-8">
        <SectionLabel>How it works</SectionLabel>
        <SectionTitle>From GitHub to brand book in under a minute.</SectionTitle>
        <SectionSubtitle>
          No migration. No manual curation. Your codebase is the single source of
          truth — autoDSM just gives it a beautiful surface.
        </SectionSubtitle>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5">
          {steps.map((s) => (
            <div
              key={s.n}
              className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-8"
            >
              <div
                className="text-[var(--accent)]"
                style={{
                  fontFamily: "var(--font-geist-mono)",
                  fontSize: 12,
                  letterSpacing: "0.08em",
                }}
              >
                {s.n}
              </div>
              <h3
                className="mt-4 text-[var(--text-primary)]"
                style={{
                  fontFamily: "var(--font-manrope)",
                  fontWeight: 600,
                  fontSize: 22,
                  letterSpacing: "-0.015em",
                }}
              >
                {s.title}
              </h3>
              <p
                className="mt-3 text-[var(--text-secondary)]"
                style={{
                  fontFamily: "var(--font-geist-sans)",
                  fontSize: 14.5,
                  lineHeight: 1.6,
                }}
              >
                {s.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] h-11 px-5 text-[14px] transition-colors duration-150"
            style={{ fontFamily: "var(--font-geist-sans)", fontWeight: 500 }}
          >
            Start your brand book
            <ArrowRight size={15} strokeWidth={1.8} />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* What's extracted — 13 categories                                           */
/* ────────────────────────────────────────────────────────────────────────── */

function WhatsExtracted() {
  const cats: {
    icon: React.ElementType;
    title: string;
    desc: string;
  }[] = [
    {
      icon: Palette,
      title: "Colors",
      desc: "Every token with WCAG contrast matrix (AA/AAA) and light/dark pairs.",
    },
    {
      icon: Type,
      title: "Typography",
      desc: "Font cards with weight pills plus an editable type ladder across every size.",
    },
    {
      icon: Ruler,
      title: "Spacing",
      desc: "Scale ladder rendered as a rhythm diagram with applied p/gap/px examples.",
    },
    {
      icon: Layers,
      title: "Shadows",
      desc: "Shadow progression on light and dark surfaces. Every layer parsed.",
    },
    {
      icon: CircleDot,
      title: "Radii",
      desc: "Radius progression plus a grid of buttons, inputs, and cards per token.",
    },
    {
      icon: Square,
      title: "Borders",
      desc: "Width, style, color, and token references for every border variant.",
    },
    {
      icon: MousePointer2,
      title: "Animations",
      desc: "Live demo for each token plus an SVG easing curve visualizer.",
    },
    {
      icon: Monitor,
      title: "Breakpoints",
      desc: "Device overlay diagram with a live viewport indicator.",
    },
    {
      icon: Droplet,
      title: "Opacity",
      desc: "Opacity scale on a checkerboard so transparency reads clearly.",
    },
    {
      icon: Layers,
      title: "Z-Index",
      desc: "Stacking diagram plus inferred role for every z-index value.",
    },
    {
      icon: Sparkles,
      title: "Gradients",
      desc: "Linear, radial, and conic gradient previews with per-stop inspector.",
    },
    {
      icon: ImageIcon,
      title: "Assets",
      desc: "Logos, icons, illustrations, and favicons — grouped and dimension-aware.",
    },
  ];

  return (
    <section
      id="inside"
      className="scroll-mt-24 py-24 sm:py-32 bg-[var(--bg-secondary)] border-y border-[var(--border-subtle)]"
    >
      <div className="max-w-[1200px] mx-auto px-6 sm:px-8">
        <SectionLabel>What's inside</SectionLabel>
        <SectionTitle>
          Twelve token categories, auto-extracted and rendered.
        </SectionTitle>
        <SectionSubtitle>
          Every category has its own dedicated page in your brand book — with
          visualizations designed to make sharing and spec-ing a pleasure.
        </SectionSubtitle>

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {cats.map((c) => (
            <div
              key={c.title}
              className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-5"
            >
              <div className="w-9 h-9 rounded-lg bg-[var(--accent-subtle)] flex items-center justify-center mb-4">
                <c.icon
                  size={18}
                  strokeWidth={1.5}
                  className="text-[var(--accent)]"
                />
              </div>
              <h4
                className="text-[var(--text-primary)]"
                style={{
                  fontFamily: "var(--font-manrope)",
                  fontWeight: 600,
                  fontSize: 16,
                }}
              >
                {c.title}
              </h4>
              <p
                className="mt-1.5 text-[var(--text-secondary)]"
                style={{
                  fontFamily: "var(--font-geist-sans)",
                  fontSize: 13,
                  lineHeight: 1.55,
                }}
              >
                {c.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Brand book — public sharing preview                                        */
/* ────────────────────────────────────────────────────────────────────────── */

function BrandBookSection() {
  const swatches = [
    "#8F23FA",
    "#AA56FF",
    "#7A1DD6",
    "#F5EBFF",
    "#111113",
    "#6B6B70",
    "#E5E5E7",
    "#22C55E",
  ];
  return (
    <section id="brand-book" className="scroll-mt-24 py-24 sm:py-32">
      <div className="max-w-[1200px] mx-auto px-6 sm:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div>
          <SectionLabel>Brand book</SectionLabel>
          <SectionTitle>
            Share a link. Everyone gets the same source of truth.
          </SectionTitle>
          <p
            className="mt-5 text-[var(--text-secondary)] max-w-[520px]"
            style={{
              fontFamily: "var(--font-geist-sans)",
              fontSize: 16,
              lineHeight: 1.6,
            }}
          >
            Every scanned repo gets a public brand book at{" "}
            <code
              className="text-[var(--text-primary)] bg-[var(--bg-code)] rounded px-1.5 py-0.5"
              style={{ fontFamily: "var(--font-geist-mono)", fontSize: 14 }}
            >
              autodsm.app/owner/repo
            </code>
            . Send it to clients, contractors, new engineers, your PM — no signup
            required for viewers, and private repos stay private.
          </p>

          <ul className="mt-8 space-y-3">
            {[
              {
                icon: Share2,
                text: "Public link with zero auth friction",
              },
              {
                icon: Lock,
                text: "Private repos 404 by default — no info leak",
              },
              {
                icon: RefreshCw,
                text: "Rescan on demand when tokens change",
              },
            ].map((f) => (
              <li
                key={f.text}
                className="flex items-center gap-3 text-[var(--text-primary)]"
              >
                <span className="w-7 h-7 rounded-full bg-[var(--accent-subtle)] flex items-center justify-center shrink-0">
                  <f.icon
                    size={13}
                    strokeWidth={1.8}
                    className="text-[var(--accent)]"
                  />
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-geist-sans)",
                    fontSize: 14.5,
                  }}
                >
                  {f.text}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-10">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] h-11 px-5 text-[14px] transition-colors duration-150"
              style={{ fontFamily: "var(--font-geist-sans)", fontWeight: 500 }}
            >
              Create your brand book
              <ArrowRight size={15} strokeWidth={1.8} />
            </Link>
          </div>
        </div>

        {/* Visual mock */}
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] overflow-hidden shadow-[var(--shadow-lg)]">
          <div className="flex items-center gap-2 px-4 h-10 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--text-placeholder)] opacity-40" />
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--text-placeholder)] opacity-40" />
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--text-placeholder)] opacity-40" />
            <span
              className="ml-4 text-[12px] text-[var(--text-tertiary)]"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              autodsm.app/acme/design-system
            </span>
          </div>
          <div className="p-7">
            <div
              className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              Brand book
            </div>
            <div
              className="mt-2 text-[var(--text-primary)]"
              style={{
                fontFamily: "var(--font-manrope)",
                fontWeight: 700,
                fontSize: 32,
                letterSpacing: "-0.025em",
                lineHeight: 1.05,
              }}
            >
              acme
              <span className="text-[var(--text-tertiary)]"> / </span>
              design-system
            </div>

            <div className="mt-6 flex rounded-xl overflow-hidden h-16 border border-[var(--border-subtle)]">
              {swatches.map((c) => (
                <div
                  key={c}
                  className="flex-1"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                { label: "Colors", v: "42" },
                { label: "Type styles", v: "18" },
                { label: "Assets", v: "54" },
              ].map((m) => (
                <div
                  key={m.label}
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3"
                >
                  <div
                    className="text-[var(--text-primary)]"
                    style={{
                      fontFamily: "var(--font-manrope)",
                      fontWeight: 600,
                      fontSize: 22,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {m.v}
                  </div>
                  <div
                    className="text-[var(--text-tertiary)] mt-0.5"
                    style={{
                      fontFamily: "var(--font-geist-sans)",
                      fontSize: 11.5,
                      fontWeight: 500,
                    }}
                  >
                    {m.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Why autoDSM                                                                */
/* ────────────────────────────────────────────────────────────────────────── */

function WhyAutoDSM() {
  const rows: { old: string; now: string }[] = [
    {
      old: "Design system docs in Notion, edited manually",
      now: "Brand book auto-generated from your code — always current",
    },
    {
      old: "Tokens maintained across Figma, code, and docs",
      now: "Code is the single source of truth. No sync headaches.",
    },
    {
      old: "New engineers dig through Tailwind configs",
      now: "New engineers get a link. Onboarding in minutes.",
    },
    {
      old: "Clients ask for the palette, fonts, spacing specs",
      now: "Send one URL. They see everything, can copy any value.",
    },
  ];

  return (
    <section className="py-24 sm:py-32 bg-[var(--bg-secondary)] border-y border-[var(--border-subtle)]">
      <div className="max-w-[1040px] mx-auto px-6 sm:px-8">
        <SectionLabel>Why autoDSM</SectionLabel>
        <SectionTitle>Stop maintaining two sources of truth.</SectionTitle>
        <SectionSubtitle>
          Traditional design systems drift. Your repo and your docs slowly
          diverge. autoDSM removes the docs layer entirely — the repo is the
          spec, and the brand book is just a view of it.
        </SectionSubtitle>

        <div className="mt-14 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] divide-y divide-[var(--border-subtle)] overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 bg-[var(--bg-secondary)]">
            <div className="p-4 border-r border-[var(--border-subtle)]">
              <div
                className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                Before autoDSM
              </div>
            </div>
            <div className="p-4">
              <div
                className="text-[11px] uppercase tracking-[0.12em] text-[var(--accent)]"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                With autoDSM
              </div>
            </div>
          </div>

          {rows.map((r, i) => (
            <div
              key={i}
              className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)]"
            >
              <div
                className="p-5 text-[var(--text-secondary)]"
                style={{
                  fontFamily: "var(--font-geist-sans)",
                  fontSize: 14.5,
                  lineHeight: 1.55,
                }}
              >
                {r.old}
              </div>
              <div
                className="p-5 text-[var(--text-primary)]"
                style={{
                  fontFamily: "var(--font-geist-sans)",
                  fontSize: 14.5,
                  lineHeight: 1.55,
                  fontWeight: 500,
                }}
              >
                {r.now}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* MVP scope                                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

function MvpScope() {
  const inScope = [
    "GitHub App (public + private repos)",
    "13 token categories, fully rendered",
    "Public shareable brand books",
    "Tailwind v3 + v4 + CSS variables",
    "shadcn/ui + next/font + Geist support",
    "Dark and light mode",
    "Rescan on demand",
    "OG images for sharing",
  ];
  const roadmap = [
    "Live component rendering",
    "Design token linting + CI checks",
    "CLI (autodsm brand)",
    "Figma plugin",
    "Multi-repo / teams",
    "DTCG export",
    "AI-assisted token cleanup",
  ];

  return (
    <section id="scope" className="scroll-mt-24 py-24 sm:py-32">
      <div className="max-w-[1200px] mx-auto px-6 sm:px-8">
        <SectionLabel>MVP scope</SectionLabel>
        <SectionTitle>
          Focused: extract design tokens and render them beautifully.
        </SectionTitle>
        <SectionSubtitle>
          The V1 scope is intentionally narrow. Everything you see is
          shippable today. Here's what's in and what's next.
        </SectionSubtitle>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-8">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
              <div
                className="text-[var(--text-primary)]"
                style={{
                  fontFamily: "var(--font-manrope)",
                  fontWeight: 600,
                  fontSize: 18,
                }}
              >
                Shipping in MVP
              </div>
            </div>
            <ul className="mt-5 space-y-3">
              {inScope.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-[var(--text-secondary)]"
                >
                  <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />
                  <span
                    style={{
                      fontFamily: "var(--font-geist-sans)",
                      fontSize: 14.5,
                    }}
                  >
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-8">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--text-tertiary)]" />
              <div
                className="text-[var(--text-primary)]"
                style={{
                  fontFamily: "var(--font-manrope)",
                  fontWeight: 600,
                  fontSize: 18,
                }}
              >
                On the roadmap
              </div>
            </div>
            <ul className="mt-5 space-y-3">
              {roadmap.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-[var(--text-tertiary)]"
                >
                  <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-[var(--border-strong)] shrink-0" />
                  <span
                    style={{
                      fontFamily: "var(--font-geist-sans)",
                      fontSize: 14.5,
                    }}
                  >
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Final CTA                                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

function FinalCta() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32 border-t border-[var(--border-subtle)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 100%, var(--accent-subtle) 0%, transparent 70%)",
        }}
      />
      <div className="relative max-w-[880px] mx-auto px-6 sm:px-8 text-center">
        <h2
          className="text-[var(--text-primary)]"
          style={{
            fontFamily: "var(--font-manrope)",
            fontWeight: 700,
            fontSize: "clamp(30px, 4.5vw, 44px)",
            lineHeight: 1.08,
            letterSpacing: "-0.025em",
          }}
        >
          Ready to see your design system?
        </h2>
        <p
          className="mt-5 text-[var(--text-secondary)]"
          style={{
            fontFamily: "var(--font-geist-sans)",
            fontSize: 17,
            lineHeight: 1.55,
          }}
        >
          One click with GitHub. Brand book in under a minute.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] h-12 px-6 text-[15px] transition-colors duration-150"
            style={{ fontFamily: "var(--font-geist-sans)", fontWeight: 500 }}
          >
            Create account
            <ArrowRight size={16} strokeWidth={1.8} />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center rounded-full border border-[var(--border-default)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] h-12 px-6 text-[15px] transition-colors duration-150"
            style={{ fontFamily: "var(--font-geist-sans)", fontWeight: 500 }}
          >
            Log in
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Footer                                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="border-t border-[var(--border-subtle)] py-10">
      <div className="max-w-[1200px] mx-auto px-6 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <ProductWordmark width={120} height={43} />
          <span
            className="text-[12px] text-[var(--text-tertiary)]"
            style={{ fontFamily: "var(--font-geist-sans)" }}
          >
            The design system manager for the AI era.
          </span>
        </div>
        <div className="flex items-center gap-5">
          <a
            href="#how"
            className="text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-150"
            style={{ fontFamily: "var(--font-geist-sans)" }}
          >
            How it works
          </a>
          <a
            href="#inside"
            className="text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-150"
            style={{ fontFamily: "var(--font-geist-sans)" }}
          >
            What's inside
          </a>
          <Link
            href="/login"
            className="text-[13px] text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors duration-150"
            style={{ fontFamily: "var(--font-geist-sans)", fontWeight: 500 }}
          >
            Log in →
          </Link>
        </div>
      </div>
    </footer>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Section primitives                                                         */
/* ────────────────────────────────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[11px] uppercase tracking-[0.14em] text-[var(--accent)]"
      style={{ fontFamily: "var(--font-geist-mono)" }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="mt-3 text-[var(--text-primary)] max-w-[720px]"
      style={{
        fontFamily: "var(--font-manrope)",
        fontWeight: 700,
        fontSize: "clamp(28px, 4vw, 40px)",
        lineHeight: 1.1,
        letterSpacing: "-0.025em",
      }}
    >
      {children}
    </h2>
  );
}

function SectionSubtitle({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mt-4 text-[var(--text-secondary)] max-w-[620px]"
      style={{
        fontFamily: "var(--font-geist-sans)",
        fontSize: 16,
        lineHeight: 1.6,
      }}
    >
      {children}
    </p>
  );
}
