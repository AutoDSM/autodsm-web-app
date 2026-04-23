"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function TokenSearchInput({
  value,
  onValueChange,
  placeholder = "Search tokens…",
  className,
  "aria-label": ariaLabel = "Filter tokens",
}: {
  value: string;
  onValueChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <div className={cn("relative max-w-sm", className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]"
        strokeWidth={1.5}
        aria-hidden
      />
      <Input
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 pl-9 text-sm"
        aria-label={ariaLabel}
      />
    </div>
  );
}

export function useDeferredQuery(raw: string) {
  const deferred = React.useDeferredValue(raw.trim().toLowerCase());
  return deferred;
}
