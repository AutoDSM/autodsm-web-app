import type { BrandGradient } from "@/lib/brand/types";
import { toHex } from "./color-utils";

export function parseGradient(
  name: string,
  value: string,
  source: string
): BrandGradient | null {
  let type: BrandGradient["type"];
  if (value.startsWith("linear-gradient")) type = "linear";
  else if (value.startsWith("radial-gradient")) type = "radial";
  else if (value.startsWith("conic-gradient")) type = "conic";
  else return null;

  const inner = value.replace(/^[a-z-]+gradient\(/, "").replace(/\)$/, "");
  const dirMatch = inner.match(/^(to\s+\w+(?:\s+\w+)?|[\d.]+deg|[\d.]+turn)/);
  const direction = dirMatch ? dirMatch[0] : undefined;

  const stops: BrandGradient["stops"] = [];
  const stopRe =
    /(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|var\(--[\w-]+\)|[a-z]+)\s*([\d.]+%)?/g;
  let sm: RegExpExecArray | null;
  while ((sm = stopRe.exec(inner)) !== null) {
    const color = sm[1];
    if (["to", "from", "at", "in", "deg", "turn"].includes(color)) continue;
    const hex = toHex(color) ?? "";
    stops.push({
      color,
      colorHex: hex,
      position: sm[2],
      tokenRef: color.startsWith("var(") ? color : undefined,
    });
  }

  if (stops.length < 2) return null;

  return { name, type, cssValue: value, stops, direction, source };
}

const GRAD_TYPES = ["linear-gradient", "radial-gradient", "conic-gradient"] as const;

/**
 * Find gradient(…) values in raw CSS (e.g. `background: linear-gradient(...)`).
 */
export function extractGradientsFromCss(
  sources: Array<{ path: string; content: string }>
): import("@/lib/brand/types").BrandGradient[] {
  const out: import("@/lib/brand/types").BrandGradient[] = [];
  let n = 0;
  for (const { path, content } of sources) {
    for (const t of GRAD_TYPES) {
      const needle = `${t}(`;
      let from = 0;
      while (from < content.length) {
        const i = content.indexOf(needle, from);
        if (i === -1) break;
        const paren = i + needle.length - 1; // index of (
        let depth = 0;
        let j = paren;
        for (; j < content.length; j++) {
          if (content[j] === "(") depth++;
          if (content[j] === ")") {
            depth--;
            if (depth === 0) {
              j++;
              break;
            }
          }
        }
        const full = content.slice(i, j);
        const parsed = parseGradient(`g-${n}`, full, path);
        if (parsed) {
          out.push(parsed);
          n++;
        }
        from = j;
      }
    }
  }
  return out;
}
