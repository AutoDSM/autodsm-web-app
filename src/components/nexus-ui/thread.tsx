"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { ArrowDown } from "lucide-react"
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom"

import { cn } from "@/lib/utils"

type ThreadProps = React.ComponentProps<typeof StickToBottom>

function Thread({
  className,
  resize = "smooth",
  initial = "smooth",
  ...props
}: ThreadProps) {
  return (
    <StickToBottom
      data-slot="thread"
      className={cn("relative h-full w-full", className)}
      resize={resize}
      initial={initial}
      {...props}
    />
  )
}

type ThreadContentProps = React.ComponentProps<typeof StickToBottom.Content>

function ThreadContent({ className, ...props }: ThreadContentProps) {
  return (
    <StickToBottom.Content
      data-slot="thread-content"
      className={cn("flex w-full flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

type ThreadScrollToBottomProps = React.ComponentProps<"button"> & {
  asChild?: boolean
}

function ThreadScrollToBottom({
  asChild = false,
  className,
  children,
  onClick,
  ...props
}: ThreadScrollToBottomProps) {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext()

  if (isAtBottom) return null

  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="thread-scroll-to-bottom"
      type={asChild ? undefined : "button"}
      className={cn(
        !asChild &&
          [
            "absolute bottom-4 left-1/2 -translate-x-1/2",
            "flex h-8 w-8 items-center justify-center rounded-full",
            "border border-[var(--border-default)] bg-[var(--bg-elevated)]",
            "text-[var(--text-secondary)] shadow-[var(--shadow-sm)]",
            "transition-[background-color,border-color,color,box-shadow,transform] duration-150 [transition-timing-function:var(--ease-standard)]",
            "hover:text-[var(--text-primary)] hover:border-[var(--accent)]",
            "hover:[box-shadow:0_0_0_1px_var(--accent),0_0_24px_var(--accent-glow-soft)]",
            "active:scale-[0.96]",
          ].join(" "),
        className
      )}
      onClick={(event) => {
        scrollToBottom()
        onClick?.(event)
      }}
      aria-label="Scroll to bottom"
      {...props}
    >
      {children ?? <ArrowDown className="size-4" />}
    </Comp>
  )
}

export { Thread, ThreadContent, ThreadScrollToBottom }

