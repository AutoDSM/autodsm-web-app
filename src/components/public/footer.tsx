"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ProductWordmark } from "@/components/brand/product-mark";

export function PublicFooter() {
  return (
    <footer className="border-t border-[var(--border-subtle)] py-12 mt-16">
      <div className="flex flex-col items-center gap-5">
        <Link
          href="/"
          aria-label="Perplexity Computer — home"
          className="inline-flex items-center text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors duration-150 [transition-timing-function:var(--ease-standard)]"
        >
          <ProductWordmark width={100} />
        </Link>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] px-5 py-2.5 transition-colors duration-150 [transition-timing-function:var(--ease-standard)]"
          style={{
            fontFamily: "var(--font-geist-sans)",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          Scan your own repo
          <ArrowUpRight size={14} strokeWidth={1.8} />
        </Link>
      </div>
    </footer>
  );
}
