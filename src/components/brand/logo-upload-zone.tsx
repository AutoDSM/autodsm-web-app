"use client";

import * as React from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { BrandProfile } from "@/lib/brand/types";
import { useBrandStore } from "@/stores/brand";

export function LogoUploadZone({
  className,
  onUploaded,
  compact,
}: {
  className?: string;
  /** Called with merged profile after successful upload */
  onUploaded?: (profile: BrandProfile) => void;
  compact?: boolean;
}) {
  const setProfile = useBrandStore((s) => s.setProfile);
  const repoSlug = useBrandStore((s) => s.repoSlug);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File) => {
    setErr(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/brand/logo", {
        method: "POST",
        body: fd,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(body.error ?? `Upload failed (${res.status})`);
        return;
      }
      const profile = body.brand_profile as BrandProfile | undefined;
      if (profile) {
        setProfile(profile, repoSlug);
        onUploaded?.(profile);
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--bg-secondary)]/40 p-4",
        compact ? "p-3" : "p-5",
        className,
      )}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (f) void uploadFile(f);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/svg+xml,image/png,image/webp,image/jpeg"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void uploadFile(f);
          e.target.value = "";
        }}
      />
      <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
          <Upload className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-[var(--text-primary)]">
            Upload a logo
          </p>
          <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
            SVG (sanitized), PNG, WebP, or JPEG — max 2&nbsp;MB.
          </p>
          {err ? (
            <p className="mt-2 text-[12px] text-[var(--error)]">{err}</p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          className="shrink-0 rounded-lg"
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Uploading…" : "Choose file"}
        </Button>
      </div>
    </div>
  );
}
