"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type TokenSortKey = "name" | "value" | "source";
export type TokenSortDir = "asc" | "desc";

export function TokenSortMenu({
  value,
  onChange,
  className,
}: {
  value: `${TokenSortKey}-${TokenSortDir}`;
  onChange: (v: `${TokenSortKey}-${TokenSortDir}`) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-caption text-[var(--text-tertiary)]">Sort</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 w-[180px] text-left text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="name-asc">Name (A–Z)</SelectItem>
          <SelectItem value="name-desc">Name (Z–A)</SelectItem>
          <SelectItem value="value-asc">Value (low → high)</SelectItem>
          <SelectItem value="value-desc">Value (high → low)</SelectItem>
          <SelectItem value="source-asc">Source (A–Z)</SelectItem>
          <SelectItem value="source-desc">Source (Z–A)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export function defaultSortString(): `${TokenSortKey}-${TokenSortDir}` {
  return "name-asc";
}

export function parseSortString(
  v: string
): { key: TokenSortKey; dir: TokenSortDir } {
  const [k, d] = v.split("-") as [TokenSortKey, TokenSortDir];
  if (
    k === "name" ||
    k === "value" ||
    k === "source"
  ) {
    if (d === "asc" || d === "desc") return { key: k, dir: d };
  }
  return { key: "name", dir: "asc" };
}
