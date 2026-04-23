"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CopyButton({
  text,
  label = "Copy",
  className,
  variant = "ghost",
  size = "sm",
  "aria-label": ariaLabel,
}: {
  text: string;
  label?: string;
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  "aria-label"?: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const liveRef = React.useRef<HTMLSpanElement>(null);

  const copy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }, [text]);

  React.useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <div className="inline-flex items-center gap-1.5">
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={copy}
        className={cn("gap-1.5", className)}
        aria-label={ariaLabel ?? label}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : label}
      </Button>
      <span ref={liveRef} className="sr-only" role="status" aria-live="polite">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </div>
  );
}
