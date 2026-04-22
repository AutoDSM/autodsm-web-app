"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JumpToPalette } from "@/components/shell/jump-to-palette";
import { cn } from "@/lib/utils";

export function NavCommand({ className }: { className?: string }) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(
          "hidden h-8 w-full gap-2 border-0 bg-[var(--bg-tertiary)] px-2.5 text-[12px] text-[var(--text-secondary)] md:inline-flex",
          className,
        )}
        onClick={() => setOpen(true)}
      >
        <Search className="size-3.5 opacity-70" strokeWidth={1.5} />
        <span className="hidden lg:inline">Jump to…</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded-lg bg-[var(--bg-primary)] px-1.5 font-mono text-[10px] font-medium text-[var(--text-tertiary)] sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className="inline-flex h-8 w-8 border-0 bg-[var(--bg-tertiary)] md:hidden"
        aria-label="Open command palette"
        onClick={() => setOpen(true)}
      >
        <Search className="size-3.5" strokeWidth={1.5} />
      </Button>

      <JumpToPalette open={open} onOpenChange={setOpen} />
    </>
  );
}
