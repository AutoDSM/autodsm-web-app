"use client";

import * as React from "react";
import { ArrowUp, Plus, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import PromptInput, {
  PromptInputAction,
  PromptInputActionGroup,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/nexus-ui/prompt-input";
import {
  Message,
  MessageContent,
  MessageMarkdown,
  MessageStack,
  MessageActions,
} from "@/components/nexus-ui/message";
import { Thread, ThreadContent, ThreadScrollToBottom } from "@/components/nexus-ui/thread";
import {
  Citation,
  CitationContent,
  CitationItem,
  CitationTrigger,
  type CitationSourceInput,
} from "@/components/nexus-ui/citation";

/* Send button — purple gradient + glow when actionable, raised+muted when idle.
 * Mirrors the spec primary CTA (§5.1) and the circular composer send (§5.2). */
function sendButtonClassName(input: string, isLoading: boolean): string {
  const canSend = input.trim().length > 0 && !isLoading;
  return cn(
    "rounded-full border-0 transition-all duration-150 [transition-timing-function:var(--ease-standard)]",
    "focus-visible:[box-shadow:0_0_0_2px_var(--bg-elevated),0_0_0_4px_var(--accent)]!",
    canSend
      ? [
          "bg-[var(--accent)] text-[var(--accent-fg)]",
          "shadow-[0_0_0_1px_var(--accent),inset_0_1px_0_rgba(255,255,255,0.16),0_0_24px_var(--accent-glow)]",
          "hover:bg-[var(--accent-hover)]",
          "hover:shadow-[0_0_0_1px_var(--accent-hover),inset_0_1px_0_rgba(255,255,255,0.2),0_0_32px_var(--accent-glow)]",
          "active:translate-y-px",
        ].join(" ")
      : [
          "bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] shadow-none",
          "hover:bg-[var(--bg-tertiary)]",
        ].join(" "),
  );
}

export default function AgentPage() {
  const [input, setInput] = React.useState("");
  const [messages, setMessages] = React.useState<
    {
      id: string;
      role: "user" | "assistant";
      text: string;
      citations?: CitationSourceInput[];
    }[]
  >([]);

  const isLoading = false;

  function submitPrompt(value?: string) {
    const text = (value ?? input).trim();
    if (!text) return;
    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), role: "user", text },
      {
        id: crypto.randomUUID(),
        role: "assistant",
        text:
          "Design system answers will appear here once this route is connected to your AI backend. For now, keep exploring tokens in the sidebar.",
        citations: [
          {
            url: "https://nexus-ui.dev/docs/components/thread",
            title: "Thread | Nexus UI",
            description:
              "A viewport for stacked Message turns that sticks to the bottom as content grows.",
          },
          {
            url: "https://nexus-ui.dev/docs/components/message",
            title: "Message | Nexus UI",
            description:
              "Composable user + assistant chat turns (Message, MessageContent, MessageMarkdown, and more).",
          },
          {
            url: "https://nexus-ui.dev/docs/components/citation",
            title: "Citation | Nexus UI",
            description:
              "Inline source chip with hover preview for one or more citations.",
          },
        ],
      },
    ]);
    setInput("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitPrompt();
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
      {messages.length === 0 ? (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center px-4 py-8 sm:px-8 sm:py-10">
          <h1 className="font-heading w-full min-w-0 max-w-[520px] px-1 text-center text-[20px] font-bold leading-[1.15] tracking-[-0.025em] text-[var(--text-primary)]">
            Let&apos;s design autoDSM
          </h1>

          <form
            onSubmit={handleSubmit}
            className="mt-4 w-full min-w-0 max-w-[560px]"
          >
            <PromptInput
              onSubmit={(value) => submitPrompt(value)}
              className="min-h-[140px]"
            >
              <PromptInputTextarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask any questions about your design system or brand"
                disabled={isLoading}
                className="min-h-[92px] font-sans"
              />
              <PromptInputActions>
                <PromptInputActionGroup>
                  <PromptInputAction asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className={cn(
                        "rounded-full",
                        "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]",
                        "hover:bg-[var(--bg-secondary)] active:bg-[var(--bg-secondary)]",
                        "dark:hover:bg-[var(--bg-tertiary)] dark:active:bg-[var(--bg-elevated)]",
                        "disabled:opacity-60",
                      )}
                      aria-label="Attach"
                      disabled
                    >
                      <Plus className="size-4" />
                    </Button>
                  </PromptInputAction>
                </PromptInputActionGroup>

                <PromptInputActionGroup>
                  <PromptInputAction asChild>
                    <Button
                      type="submit"
                      size="icon-sm"
                      className={sendButtonClassName(input, isLoading)}
                      disabled={isLoading || !input.trim()}
                      aria-label="Send"
                    >
                      {isLoading ? (
                        <Square className="size-3.5 fill-current" />
                      ) : (
                        <ArrowUp className="size-4" />
                      )}
                    </Button>
                  </PromptInputAction>
                </PromptInputActionGroup>
              </PromptInputActions>
            </PromptInput>
          </form>
        </div>
      ) : (
        <>
          <div className="min-h-0 min-w-0 flex-1 overflow-hidden px-4 py-4 sm:px-8">
            <div className="mx-auto h-full min-w-0 max-w-2xl">
              <Thread className="h-full">
                <ThreadContent className="items-stretch">
                  {messages.map((msg, idx) => {
                    const isLastAssistant =
                      msg.role === "assistant" &&
                      idx === messages.length - 1;
                    return (
                    <Message
                      key={msg.id}
                      from={msg.role === "user" ? "user" : "assistant"}
                      active={isLastAssistant}
                    >
                      <MessageStack>
                        <MessageContent>
                          <MessageMarkdown>{msg.text}</MessageMarkdown>
                        </MessageContent>

                        {msg.citations?.length ? (
                          <MessageActions className="pt-0.5">
                            <Citation citations={msg.citations}>
                              <CitationTrigger className="cursor-pointer" />
                              <CitationContent>
                                <CitationItem />
                              </CitationContent>
                            </Citation>
                          </MessageActions>
                        ) : null}
                      </MessageStack>
                    </Message>
                    );
                  })}
                </ThreadContent>
                <ThreadScrollToBottom />
              </Thread>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="shrink-0 border-t border-[var(--border-subtle)] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6"
          >
            <div className="mx-auto min-w-0 max-w-2xl">
              <PromptInput
                onSubmit={(value) => submitPrompt(value)}
                className="min-h-[112px]"
              >
                <PromptInputTextarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask any questions about your design system or brand"
                  disabled={isLoading}
                  className="font-sans"
                />
                <PromptInputActions>
                  <PromptInputActionGroup />
                  <PromptInputActionGroup>
                    <PromptInputAction asChild>
                      <Button
                        type="submit"
                        size="icon-sm"
                        className={sendButtonClassName(input, isLoading)}
                        disabled={isLoading || !input.trim()}
                        aria-label="Send"
                      >
                        {isLoading ? (
                          <Square className="size-3.5 fill-current" />
                        ) : (
                          <ArrowUp className="size-4" />
                        )}
                      </Button>
                    </PromptInputAction>
                  </PromptInputActionGroup>
                </PromptInputActions>
              </PromptInput>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
