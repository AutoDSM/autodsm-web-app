"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProductIcon } from "@/components/brand/product-mark";
import { Progress } from "@/components/ui/progress";

const STEPS = [
  "Fetching repository…",
  "Detecting framework…",
  "Parsing CSS variables…",
  "Parsing Tailwind config…",
  "Extracting 12 token categories…",
  "Scanning assets…",
  "Done. Redirecting…",
];

function ScanningPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const repo = params.get("repo");
  const projectName = params.get("projectName");
  const [log, setLog] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!repo) {
      router.replace("/onboarding");
      return;
    }

    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch("/api/scan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ repo, projectName }),
          signal: controller.signal,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          if (body.unsupported) {
            router.replace(
              `/onboarding/unsupported?repo=${encodeURIComponent(repo)}&reason=${encodeURIComponent(body.unsupported)}`,
            );
            return;
          }
          setError(body.error ?? `Scan failed (${res.status})`);
          return;
        }
        const body = await res.json();
        if (body.status === "completed") {
          await router.refresh();
          router.replace("/dashboard");
        } else if (body.unsupported) {
          router.replace(
            `/onboarding/unsupported?repo=${encodeURIComponent(repo)}&reason=${encodeURIComponent(body.unsupported)}`,
          );
        } else {
          setError(body.error ?? "Unknown scan status");
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setError((e as Error).message);
        }
      }
    })();

    // Fake progress ticker (real SSE hookup can replace this)
    let i = 0;
    const tick = setInterval(() => {
      if (i >= STEPS.length) {
        clearInterval(tick);
        return;
      }
      setLog((l) => [...l, STEPS[i]]);
      i++;
    }, 700);

    return () => {
      controller.abort();
      clearInterval(tick);
    };
  }, [repo, router]);

  return (
    <div className="grid min-h-screen min-w-0 place-items-center bg-[var(--bg-primary)] px-4 py-8 sm:px-6">
      <div className="w-full min-w-0 max-w-[520px] rounded-2xl border-0 bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-md)] sm:p-8 md:p-10">
        <ProductIcon
          size={32}
          className="autodsm-pulse"
        />
        <h2 className="mt-6 text-h2 text-[var(--text-primary)]">{repo ?? "—"}</h2>
        <p className="mt-2 text-body-s text-[var(--text-secondary)]">
          Building your brand book.
        </p>

        <div className="mt-6 space-y-1 font-[var(--font-geist-mono)] text-[13px] text-[var(--text-secondary)]">
          {log.map((line, idx) => (
            <div
              key={idx}
              className={
                idx === log.length - 1
                  ? "text-[var(--text-primary)]"
                  : "text-[var(--text-tertiary)]"
              }
            >
              {line}
            </div>
          ))}
        </div>

        {error ? (
          <div className="mt-6 rounded-lg border-0 bg-[color-mix(in_srgb,var(--error)_12%,transparent)] p-3 text-[13px] text-[var(--error)] shadow-[var(--shadow-sm)]">
            {error}
          </div>
        ) : (
          <div className="mt-6 space-y-2">
            <Progress
              value={Math.min(100, Math.round((log.length / Math.max(STEPS.length, 1)) * 100))}
              className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-tertiary)]"
            />
            <p className="text-[11px] text-[var(--text-tertiary)]">
              Step {Math.min(log.length, STEPS.length)} of {STEPS.length}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ScanningPage() {
  return (
    <React.Suspense fallback={null}>
      <ScanningPageInner />
    </React.Suspense>
  );
}
