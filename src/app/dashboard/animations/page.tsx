"use client";

import * as React from "react";
import { Clapperboard, Play, Timer, Activity } from "lucide-react";
import { useBrandStore } from "@/stores/brand";
import { EmptyState } from "@/components/ui/empty-state";
import {
  BrandTokenPageHero,
  BrandTokenPageLayout,
  LastUpdatedLabel,
} from "@/components/dashboard/brand-token-page-layout";
import { SectionHeading } from "@/components/dashboard/section-heading";
import { TokenPagePillTabs } from "@/components/dashboard/token-page-pill-tabs";
import { TokenCard } from "@/components/dashboard/token-card";
import { brandDashboardCardRadius } from "@/components/ui/brand-card-tokens";
import { cn } from "@/lib/utils";
import type { BrandAnimation } from "@/lib/brand/types";

const HERO_DESC =
  "Keyframes and transition timings extracted from your theme — hit Replay on any card to preview the motion.";

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

function keyframeNameFromCss(css: string | undefined): string | null {
  if (!css) return null;
  const m = css.match(/@keyframes\s+([\w-]+)/);
  return m?.[1] ?? null;
}

function AnimatedPreview({ anim, nonce }: { anim: BrandAnimation; nonce: number }) {
  const reduced = usePrefersReducedMotion();
  const dur = anim.duration || "400ms";
  const ease = anim.timingFunction || "cubic-bezier(0.4, 0, 0.2, 1)";

  if (reduced) {
    return (
      <div className="flex h-full w-full items-center justify-center px-3 text-center text-[11px] text-[var(--text-tertiary)]">
        Motion reduced
      </div>
    );
  }

  if (anim.type === "keyframes" && anim.keyframes) {
    const kf = keyframeNameFromCss(anim.keyframes) ?? anim.name;
    return (
      <div className="relative flex h-full w-full items-center justify-center" key={nonce}>
        <style>{anim.keyframes}</style>
        <div
          className="h-10 w-10 rounded-[8px] bg-[var(--accent)]"
          style={{
            animation: `${kf} ${dur} ${ease} infinite`,
          }}
        />
      </div>
    );
  }

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

function EmptyTabStrip({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        brandDashboardCardRadius,
        "border border-dashed border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-8 text-center text-[13px] text-[var(--text-tertiary)]",
      )}
    >
      {children}
    </div>
  );
}

function MotionGrid({
  list,
  ticks,
  allTick,
  replay,
}: {
  list: BrandAnimation[];
  ticks: Record<string, number>;
  allTick: number;
  replay: (name: string) => void;
}) {
  if (list.length === 0) {
    return (
      <EmptyTabStrip>No tokens of this type were found in this repository.</EmptyTabStrip>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {list.map((anim) => {
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
            copyValue={
              anim.keyframes
                ? `${css}\n\n${anim.keyframes}`
                : css
            }
            copyLabel="Animation"
            footer={
              <div className="space-y-1">
                {anim.keyframes ? (
                  <pre
                    className="max-h-24 overflow-auto rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-2 text-[9px] text-[var(--text-tertiary)]"
                    style={{ fontFamily: "var(--font-geist-mono)" }}
                  >
                    {anim.keyframes.slice(0, 500)}
                    {anim.keyframes.length > 500 ? "…" : ""}
                  </pre>
                ) : null}
                <button
                  type="button"
                  onClick={() => replay(anim.name)}
                  className="inline-flex h-7 items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 text-[11px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                >
                  <Play size={12} strokeWidth={1.6} />
                  Replay
                </button>
              </div>
            }
          />
        );
      })}
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
    setTicks({});
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

  const keyframesList = profile.animations.filter((a) => a.type === "keyframes");
  const transitionsList = profile.animations.filter((a) => a.type === "transition");
  const defaultTab = keyframesList.length > 0 ? "keyframes" : "transitions";

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
      <div className="space-y-6">
        <TokenPagePillTabs
          defaultValue={defaultTab}
          tabs={[
            {
              value: "keyframes",
              label: "Keyframes",
              content: (
                <section>
                  {keyframesList.length > 0 ? (
                    <div className="mb-4 flex justify-end">
                      <button
                        type="button"
                        onClick={replayAll}
                        className="inline-flex h-7 items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 text-[11px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                      >
                        <Play size={12} strokeWidth={1.6} />
                        Play all
                      </button>
                    </div>
                  ) : null}
                  <MotionGrid
                    list={keyframesList}
                    ticks={ticks}
                    allTick={allTick}
                    replay={replay}
                  />
                </section>
              ),
            },
            {
              value: "transitions",
              label: "Transitions",
              content: (
                <section>
                  <SectionHeading
                    description="Duration and easing pairs extracted from your theme."
                    action={
                      transitionsList.length > 0 ? (
                        <button
                          type="button"
                          onClick={replayAll}
                          className="inline-flex h-7 items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 text-[11px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                        >
                          <Play size={12} strokeWidth={1.6} />
                          Play all
                        </button>
                      ) : undefined
                    }
                  >
                    Transitions
                  </SectionHeading>
                  <MotionGrid
                    list={transitionsList}
                    ticks={ticks}
                    allTick={allTick}
                    replay={replay}
                  />
                </section>
              ),
            },
          ]}
        />
      </div>
    </BrandTokenPageLayout>
  );
}
