"use client";

import * as React from "react";
import { Clapperboard, Play, Timer, Activity } from "lucide-react";
import { useBrandStore } from "@/stores/brand";
import { EmptyState } from "@/components/ui/empty-state";
import {
  BrandTokenPageHero,
  BrandTokenPageLayout,
  LastUpdatedLabel,
  TokenPageProvenanceLine,
} from "@/components/dashboard/brand-token-page-layout";
import { SectionHeading } from "@/components/dashboard/section-heading";
import { TokenCard } from "@/components/dashboard/token-card";
import { cn } from "@/lib/utils";
import type { BrandAnimation } from "@/lib/brand/types";

const HERO_DESC =
  "Keyframes and transition timings extracted from your theme — hit Replay on any card to preview the motion.";

function AnimatedPreview({ anim, nonce }: { anim: BrandAnimation; nonce: number }) {
  const dur = anim.duration || "400ms";
  const ease = anim.timingFunction || "cubic-bezier(0.4, 0, 0.2, 1)";

  // Two visual modes so common names get legible demos.
  const kind: "pulse" | "slide" | "spin" | "fade" = (() => {
    const n = anim.name.toLowerCase();
    if (/spin|rotate/.test(n)) return "spin";
    if (/slide|enter|exit|in$|out$/.test(n)) return "slide";
    if (/pulse|ping|bounce|beat/.test(n)) return "pulse";
    return "fade";
  })();

  const common: React.CSSProperties = {
    animationDuration: dur,
    animationTimingFunction: ease,
    animationIterationCount: kind === "pulse" || kind === "spin" ? "infinite" : "1",
    animationFillMode: "forwards",
  };

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <div
        key={`${anim.name}-${nonce}`}
        className={cn(
          "h-10 w-10 rounded-[8px] bg-[var(--accent)]",
          kind === "pulse" && "anim-pulse",
          kind === "slide" && "anim-slide",
          kind === "spin" && "anim-spin",
          kind === "fade" && "anim-fade",
        )}
        style={common}
      />
      {/* scoped keyframes */}
      <style jsx>{`
        .anim-pulse {
          animation-name: adm-pulse;
        }
        .anim-slide {
          animation-name: adm-slide;
        }
        .anim-spin {
          animation-name: adm-spin;
        }
        .anim-fade {
          animation-name: adm-fade;
        }
        @keyframes adm-pulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.18);
            opacity: 0.65;
          }
        }
        @keyframes adm-slide {
          0% {
            transform: translateX(-28px);
            opacity: 0;
          }
          100% {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes adm-spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        @keyframes adm-fade {
          0% {
            opacity: 0;
            transform: translateY(6px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default function AnimationsPage() {
  const profile = useBrandStore((s) => s.profile);
  const [ticks, setTicks] = React.useState<Record<string, number>>({});
  const [allTick, setAllTick] = React.useState(0);

  const replay = React.useCallback((name: string) => {
    setTicks((t) => ({ ...t, [name]: (t[name] ?? 0) + 1 }));
  }, []);

  const replayAll = React.useCallback(() => {
    setAllTick((t) => t + 1);
    setTicks({}); // reset individual overrides
  }, []);

  if (!profile || profile.animations.length === 0) {
    return (
      <BrandTokenPageLayout
        hero={
          <BrandTokenPageHero
            title="Animations"
            description={HERO_DESC}
            icon={
              <Clapperboard size={20} strokeWidth={1.75} className="shrink-0" aria-hidden />
            }
          />
        }
        metaRight={profile?.scannedAt ? <LastUpdatedLabel scannedAt={profile.scannedAt} /> : undefined}
      >
        <EmptyState
          title="No animations detected"
          description="We didn't find any keyframes or transition tokens in this repo."
        />
      </BrandTokenPageLayout>
    );
  }

  const source = profile.meta.cssSource || profile.meta.tailwindConfigPath || "repo";

  return (
    <BrandTokenPageLayout
      hero={
        <BrandTokenPageHero
          title="Animations"
          description={HERO_DESC}
          icon={<Clapperboard size={20} strokeWidth={1.75} className="shrink-0" aria-hidden />}
        />
      }
      metaRight={<LastUpdatedLabel scannedAt={profile.scannedAt} />}
    >
      <div className="space-y-8">
        <TokenPageProvenanceLine>
          Auto-extracted from {source} · {profile.animations.length} tokens
        </TokenPageProvenanceLine>

        <section>
          <SectionHeading
            description="Previews are indicative — exact motion may vary based on where your app applies the token."
            action={
              <button
                type="button"
                onClick={replayAll}
                className="inline-flex h-7 items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 text-[11px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
              >
                <Play size={12} strokeWidth={1.6} />
                Play all
              </button>
            }
          >
            Motion
          </SectionHeading>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {profile.animations.map((anim) => {
              const css =
                anim.type === "keyframes"
                  ? `${anim.name} ${anim.duration} ${anim.timingFunction}${anim.delay ? ` ${anim.delay}` : ""}`
                  : `${anim.duration} ${anim.timingFunction}${anim.delay ? ` ${anim.delay}` : ""}`;
              return (
                <TokenCard
                  key={anim.name}
                  eyebrow={anim.type === "keyframes" ? "KEYFRAMES" : "TRANSITION"}
                  tag={anim.tailwindClass ?? (anim.isCustom ? "custom" : undefined)}
                  previewHeight={140}
                  preview={
                    <AnimatedPreview
                      anim={anim}
                      nonce={(ticks[anim.name] ?? 0) + allTick}
                    />
                  }
                  name={anim.name}
                  subtitle={anim.tailwindClass}
                  specs={[
                    { icon: <Timer strokeWidth={1.6} />, label: anim.duration },
                    { icon: <Activity strokeWidth={1.6} />, label: anim.timingFunction },
                  ]}
                  copyValue={css}
                  copyLabel={css}
                  footer={
                    <button
                      type="button"
                      onClick={() => replay(anim.name)}
                      className="inline-flex h-7 items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 text-[11px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                    >
                      <Play size={12} strokeWidth={1.6} />
                      Replay
                    </button>
                  }
                />
              );
            })}
          </div>
        </section>
      </div>
    </BrandTokenPageLayout>
  );
}
