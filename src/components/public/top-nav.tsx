"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ProductWordmark } from "@/components/brand/product-mark";

const CATEGORIES: { slug: string; label: string }[] = [
  { slug: "", label: "Overview" },
  { slug: "colors", label: "Colors" },
  { slug: "typography", label: "Typography" },
  { slug: "spacing", label: "Spacing" },
  { slug: "shadows", label: "Shadows" },
  { slug: "radii", label: "Radii" },
  { slug: "borders", label: "Borders" },
  { slug: "animations", label: "Animations" },
  { slug: "breakpoints", label: "Breakpoints" },
  { slug: "opacity", label: "Opacity" },
  { slug: "zindex", label: "Z-Index" },
  { slug: "gradients", label: "Gradients" },
  { slug: "assets", label: "Assets" },
];

export function PublicTopNav({
  owner,
  repo,
}: {
  owner: string;
  repo: string;
}) {
  const pathname = usePathname();
  const base = `/${owner}/${repo}`;

  return (
    <header className="sticky top-0 z-40 h-14 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/85 backdrop-blur">
      <div className="flex h-full items-center gap-6 px-6">
        {/* Left: wordmark */}
        <Link
          href="/"
          className="flex items-center gap-2 shrink-0 text-[var(--text-primary)] min-w-0"
        >
          <ProductWordmark width={110} height={40} priority />
        </Link>

        {/* Center: repo name */}
        <div
          className="text-[var(--text-secondary)] shrink-0 hidden sm:block"
          style={{
            fontFamily: "var(--font-geist-sans)",
            fontWeight: 500,
            fontSize: 14,
          }}
        >
          {owner}
          <span className="mx-1.5 text-[var(--text-tertiary)]">/</span>
          {repo}
        </div>

        {/* Right: category nav */}
        <nav className="flex-1 min-w-0 overflow-x-auto">
          <ul className="flex items-center gap-5 whitespace-nowrap">
            {CATEGORIES.map((c) => {
              const href = c.slug ? `${base}/${c.slug}` : base;
              const isActive =
                pathname === href ||
                (c.slug === "" && pathname === base);
              return (
                <li key={c.slug || "overview"}>
                  <Link
                    href={href}
                    className={cn(
                      "relative py-5 transition-colors duration-150 [transition-timing-function:var(--ease-standard)]",
                      isActive
                        ? "text-[var(--text-primary)]"
                        : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]",
                    )}
                    style={{
                      fontFamily: "var(--font-geist-sans)",
                      fontWeight: 500,
                      fontSize: 13,
                    }}
                  >
                    {c.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--accent)] rounded-full" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
