"use client";

import * as React from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AgentPage() {
  const [input, setInput] = React.useState("");
  const [messages, setMessages] = React.useState<
    { id: string; role: "user" | "assistant"; text: string }[]
  >([]);

  function submitPrompt() {
    const text = input.trim();
    if (!text) return;
    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), role: "user", text },
      {
        id: crypto.randomUUID(),
        role: "assistant",
        text:
          "Design system answers will appear here once this route is connected to your AI backend. For now, keep exploring tokens in the sidebar.",
      },
    ]);
    setInput("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitPrompt();
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col">
      {messages.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-5 py-10 sm:px-8">
          <h1
            className="max-w-[520px] text-center text-[var(--text-primary)]"
            style={{
              fontFamily: "Manrope",
              fontWeight: 700,
              fontSize: "20px",
              letterSpacing: "-0.025em",
              lineHeight: 1.15,
            }}
          >
            Let&apos;s design autoDSM
          </h1>

          <form
            onSubmit={handleSubmit}
            className="mt-9 w-full max-w-[560px] sm:mt-10"
          >
            <div className="relative rounded-2xl bg-[var(--bg-secondary)] p-4 pb-12 shadow-[var(--shadow-sm)]">
              <label htmlFor="agent-prompt" className="sr-only">
                Ask about your design system or brand
              </label>
              <textarea
                id="agent-prompt"
                rows={5}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask any questions about your design system or brand"
                className={cn(
                  "w-full resize-none border-0 bg-transparent text-sm leading-relaxed text-[var(--text-primary)]",
                  "placeholder:text-[var(--text-tertiary)] focus:outline-none",
                )}
                style={{ fontFamily: "var(--font-geist-sans)" }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitPrompt();
                  }
                }}
              />
              <button
                type="submit"
                className={cn(
                  "absolute bottom-3 right-3 inline-flex h-10 w-10 items-center justify-center rounded-full",
                  "bg-[var(--accent)] text-[var(--accent-fg)] shadow-md",
                  "transition-opacity hover:opacity-90 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-35",
                )}
                disabled={!input.trim()}
                aria-label="Send"
              >
                <ArrowUp size={18} strokeWidth={2.25} />
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8">
            <ul className="mx-auto flex max-w-2xl flex-col gap-4">
              {messages.map((msg) => (
                <li
                  key={msg.id}
                  className={cn(
                    "rounded-xl px-4 py-3 text-body-s leading-relaxed",
                    msg.role === "user"
                      ? "ml-6 bg-[var(--bg-tertiary)] text-[var(--text-primary)] sm:ml-8"
                      : "mr-6 border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] sm:mr-8",
                  )}
                >
                  {msg.text}
                </li>
              ))}
            </ul>
          </div>

          <form
            onSubmit={handleSubmit}
            className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-4 sm:px-6"
          >
            <div className="relative mx-auto max-w-2xl rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 pb-14">
              <label htmlFor="agent-prompt-thread" className="sr-only">
                Continue the conversation
              </label>
              <textarea
                id="agent-prompt-thread"
                rows={3}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask any questions about your design system or brand"
                className={cn(
                  "w-full resize-none border-0 bg-transparent text-[15px] leading-relaxed text-[var(--text-primary)]",
                  "placeholder:text-[var(--text-tertiary)] focus:outline-none",
                )}
                style={{ fontFamily: "var(--font-geist-sans)" }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitPrompt();
                  }
                }}
              />
              <button
                type="submit"
                className={cn(
                  "absolute bottom-3 right-3 inline-flex h-10 w-10 items-center justify-center rounded-full",
                  "bg-[var(--accent)] text-[var(--accent-fg)] shadow-md",
                  "transition-opacity hover:opacity-90 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-35",
                )}
                disabled={!input.trim()}
                aria-label="Send"
              >
                <ArrowUp size={18} strokeWidth={2.25} />
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
