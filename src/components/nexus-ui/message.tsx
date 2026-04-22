"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"

type MessageFrom = "user" | "assistant"

type MessageContextValue = {
  from: MessageFrom
}

const MessageContext = React.createContext<MessageContextValue | null>(null)

function useMessageContext() {
  return React.useContext(MessageContext)
}

type MessageProps = React.HTMLAttributes<HTMLDivElement> & {
  from: MessageFrom
}

function Message({
  className,
  from,
  children,
  "aria-label": ariaLabelProp,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: MessageProps) {
  const ariaLabel =
    ariaLabelProp ??
    (ariaLabelledBy == null
      ? from === "user"
        ? "User message"
        : "Assistant message"
      : undefined)

  return (
    <MessageContext.Provider value={{ from }}>
      <div
        data-slot="message"
        role="article"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className={cn(
          "flex min-w-0 w-full max-w-[90%] items-start gap-2",
          from === "user" ? "ms-auto" : "me-auto",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </MessageContext.Provider>
  )
}

type MessageStackProps = React.HTMLAttributes<HTMLDivElement>

function MessageStack({ className, ...props }: MessageStackProps) {
  const ctx = useMessageContext()
  const from = ctx?.from ?? "assistant"

  return (
    <div
      data-slot="message-stack"
      className={cn(
        "flex w-full flex-col gap-2",
        from === "user" ? "items-end" : "items-start",
        className
      )}
      {...props}
    />
  )
}

type MessageContentProps = React.HTMLAttributes<HTMLDivElement>

function MessageContent({ className, ...props }: MessageContentProps) {
  const ctx = useMessageContext()
  const from = ctx?.from ?? "assistant"

  return (
    <div
      data-slot="message-content"
      className={cn(
        /* User bubble: --bg-canvas = light F3F3F4 / dark 0f0f11 (see globals.css) */
        "min-h-10 min-w-0 rounded-[20px] text-sm leading-6",
        from === "user"
          ? "w-fit max-w-full bg-[var(--bg-canvas)] px-4 py-2 text-foreground"
          : "w-full max-w-full bg-transparent px-2 text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

type MessageMarkdownProps = React.HTMLAttributes<HTMLDivElement> & {
  children?: React.ReactNode
}

function MessageMarkdown({ className, ...props }: MessageMarkdownProps) {
  return (
    <div
      data-slot="message-markdown"
      className={cn("whitespace-pre-wrap break-words", className)}
      {...props}
    />
  )
}

type MessageActionsProps = React.HTMLAttributes<HTMLDivElement>

function MessageActions({ className, ...props }: MessageActionsProps) {
  const ctx = useMessageContext()
  const from = ctx?.from ?? "assistant"

  return (
    <div
      data-slot="message-actions"
      className={cn(
        "flex w-full",
        from === "user" ? "justify-end" : "justify-start",
        className
      )}
      {...props}
    />
  )
}

type MessageActionGroupProps = React.HTMLAttributes<HTMLDivElement>

function MessageActionGroup({ className, ...props }: MessageActionGroupProps) {
  return (
    <div
      data-slot="message-action-group"
      className={cn("flex items-center gap-1", className)}
      {...props}
    />
  )
}

type MessageActionProps = React.HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean
}

function MessageAction({ asChild = false, ...props }: MessageActionProps) {
  const Comp = asChild ? Slot : "div"
  return <Comp data-slot="message-action" {...props} />
}

export {
  Message,
  MessageStack,
  MessageContent,
  MessageMarkdown,
  MessageActions,
  MessageActionGroup,
  MessageAction,
}

