"use client";

/**
 * cmdk primitives for command palettes. Dashboard “Jump to” uses `JumpToPalette`
 * (`shell/jump-to-palette.tsx`) for its own dialog + search field styling.
 */

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";

import { cn } from "@/lib/utils";
import { brandDashboardCardRadius } from "@/components/ui/brand-card-tokens";

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      "flex h-full w-full flex-col overflow-hidden bg-[var(--bg-elevated)] text-[var(--text-primary)]",
      brandDashboardCardRadius,
      className,
    )}
    {...props}
  />
));
Command.displayName = CommandPrimitive.displayName ?? "Command";

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn(
      "max-h-[min(50vh,340px)] overflow-y-auto overflow-x-hidden bg-[var(--bg-elevated)]",
      className,
    )}
    {...props}
  />
));
CommandList.displayName = CommandPrimitive.List.displayName;

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className="py-8 text-center text-[13px] text-[var(--text-tertiary)]"
    {...props}
  />
));
CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      "overflow-hidden p-1.5 text-[var(--text-primary)]",
      "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-[var(--text-tertiary)]",
      className,
    )}
    {...props}
  />
));
CommandGroup.displayName = CommandPrimitive.Group.displayName;

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 h-px bg-[var(--border-subtle)]", className)}
    {...props}
  />
));
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      "group relative flex cursor-pointer select-none items-center gap-3 rounded-md px-3 py-2.5 text-[13px] leading-snug outline-none",
      "text-[var(--text-secondary)] transition-colors duration-150 [transition-timing-function:var(--ease-standard)]",
      "hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]",
      "active:bg-[var(--bg-tertiary)] active:text-[var(--text-primary)]",
      "data-[selected=true]:bg-[var(--bg-secondary)] data-[selected=true]:text-[var(--text-primary)]",
      "aria-selected:bg-[var(--bg-secondary)] aria-selected:text-[var(--text-primary)]",
      "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
      className,
    )}
    {...props}
  />
));
CommandItem.displayName = CommandPrimitive.Item.displayName;

function CommandShortcut({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "ml-auto shrink-0 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-1.5 py-0.5",
        "font-mono text-[10px] font-medium tracking-wide text-[var(--text-tertiary)]",
        "group-data-[selected=true]:border-[var(--border-default)] group-data-[selected=true]:bg-[var(--bg-elevated)] group-data-[selected=true]:text-[var(--text-secondary)]",
        "group-aria-selected:border-[var(--border-default)] group-aria-selected:bg-[var(--bg-elevated)] group-aria-selected:text-[var(--text-secondary)]",
        className,
      )}
      {...props}
    />
  );
}
CommandShortcut.displayName = "CommandShortcut";

export {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
};
