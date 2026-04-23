"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useBrandStore } from "@/stores/brand";
import { needsRescan } from "@/lib/brand/needs-rescan";
import { EXTRACTOR_VERSION } from "@/lib/extract/extractor-version";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const BANNER_KEY = "autodsm:rescan-banner:dismissed:v1";

function storageKeyForExtractor(): string {
  return `${BANNER_KEY}:${EXTRACTOR_VERSION}`;
}

export function RescanBanner() {
  const profile = useBrandStore((s) => s.profile);
  const router = useRouter();
  const [dismissed, setDismissed] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const key = storageKeyForExtractor();
    if (sessionStorage.getItem(key) === "1") {
      setDismissed(true);
    } else {
      setDismissed(false);
    }
  }, [profile?.meta?.extractorVersion]);

  if (!profile || !needsRescan(profile)) {
    return null;
  }
  if (dismissed) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      )}
      role="status"
    >
      <p className="min-w-0 text-[13px] text-[var(--text-secondary)]">
        <span className="font-medium text-[var(--text-primary)]">
          Design system extract updated
        </span>
        {". "}
        Re-scan to pull the latest token extraction (engine v{EXTRACTOR_VERSION}
        {typeof profile.meta?.extractorVersion === "number"
          ? `; your profile: v${profile.meta.extractorVersion}`
          : ""}
        ).
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const res = await fetch("/api/scan/refresh", { method: "POST" });
              if (res.ok) {
                sessionStorage.setItem(storageKeyForExtractor(), "0");
                router.refresh();
              }
            } finally {
              setBusy(false);
            }
          }}
        >
          <RefreshCw
            className={cn("mr-1.5 h-3.5 w-3.5", busy && "animate-spin")}
            strokeWidth={2}
            aria-hidden
          />
          Re-scan
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            if (typeof window === "undefined") return;
            sessionStorage.setItem(storageKeyForExtractor(), "1");
            setDismissed(true);
          }}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}
