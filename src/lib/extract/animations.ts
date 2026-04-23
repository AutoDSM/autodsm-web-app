import type { BrandAnimation } from "@/lib/brand/types";
import type { ThemeValueMap } from "./tailwind-config";

export function buildAnimations(
  animations: ThemeValueMap,
  keyframesCss: ThemeValueMap,
  cssKeyframes: Array<{ name: string; css: string; source: string }>,
  transitionDuration: ThemeValueMap,
  transitionTiming: ThemeValueMap,
  isCustom: boolean,
  source: string
): BrandAnimation[] {
  const result: BrandAnimation[] = [];

  for (const [name, value] of Object.entries(animations)) {
    const parts = value.split(/\s+/);
    const duration =
      parts.find((p) => /^\d+(?:\.\d+)?(?:ms|s)$/.test(p)) ?? "200ms";
    const timing =
      parts.find(
        (p) =>
          [
            "ease",
            "ease-in",
            "ease-out",
            "ease-in-out",
            "linear",
            "step-start",
            "step-end",
          ].includes(p) || p.startsWith("cubic-bezier")
      ) ?? "ease";
    const kfName = parts[0];
    const kfCss =
      cssKeyframes.find((k) => k.name === kfName)?.css ??
      keyframesCss[kfName] ??
      undefined;

    result.push({
      name,
      type: "keyframes",
      tailwindClass: `animate-${name}`,
      duration,
      timingFunction: timing,
      keyframes: kfCss,
      source,
      isCustom,
    });
  }

  for (const kf of cssKeyframes) {
    if (result.find((a) => a.name === kf.name)) continue;
    result.push({
      name: kf.name,
      type: "keyframes",
      duration: "200ms",
      timingFunction: "ease",
      keyframes: kf.css,
      source: kf.source,
      isCustom: true,
    });
  }

  for (const [name, duration] of Object.entries(transitionDuration)) {
    if (name === "DEFAULT") continue;
    const tim = transitionTiming[name] ?? transitionTiming.DEFAULT ?? "ease";
    result.push({
      name: `transition-${name}`,
      type: "transition",
      duration,
      timingFunction: tim,
      source,
      isCustom: false,
    });
  }

  return result;
}
