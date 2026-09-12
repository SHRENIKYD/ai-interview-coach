"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, Message } from "@/lib/api";
import { ErrorNote, Pill, Spinner } from "./ui";

export default function InterviewScreen({
  topic,
  difficulty,
  messages,
  isThinking,
  isWrappingUp,
  error,
  onSend,
  onRetry,
  onQuit,
}: {
  topic: string;
  difficulty: Difficulty;
  messages: Message[];
  isThinking: boolean;
  isWrappingUp: boolean;
  error: string | null;
  onSend: (answer: string) => void;
  onRetry: () => void;
  onQuit: () => void;
}) {
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const locked = isThinking || isWrappingUp;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isThinking, isWrappingUp, error]);

  useEffect(() => {
    if (!locked) inputRef.current?.focus();
  }, [locked]);

  // Grow the textarea with its content, up to a ceiling.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [draft]);

  function send() {
    const answer = draft.trim();
    if (!answer || locked) return;
    onSend(answer);
    setDraft("");
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="border-border-subtle bg-surface/85 shrink-0 border-b backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold sm:text-base">{topic}</h1>
            <p className="text-muted mt-0.5 text-xs">Interview in progress</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Pill>{difficulty}</Pill>
            <button
              type="button"
              onClick={onQuit}
              className="text-muted hover:text-foreground focus-ring cursor-pointer rounded-lg px-2 py-1 text-xs transition-colors"
            >
              End
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6">
          {messages.map((message, index) => {
            const fromInterviewer = message.role === "interviewer";
            return (
              <div
                key={index}
                className={`flex ${fromInterviewer ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`animate-rise max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap sm:max-w-[75%] sm:text-[0.95rem] ${
                    fromInterviewer
                      ? "border-border-subtle bg-surface rounded-bl-sm border"
                      : "bg-accent text-accent-contrast rounded-br-sm font-medium"
                  }`}
                >
                  <span
                    className={`mb-1 block text-[0.65rem] font-semibold tracking-wider uppercase ${
                      fromInterviewer ? "text-muted" : "text-accent-contrast/70"
                    }`}
                  >
                    {fromInterviewer ? "Interviewer" : "You"}
                  </span>
                  {message.content}
                </div>
              </div>
            );
          })}

          {isThinking && (
            <div className="flex justify-start">
              <div className="border-border-subtle bg-surface text-muted flex items-center gap-2 rounded-2xl rounded-bl-sm border px-4 py-3 text-sm">
                <Spinner className="h-3.5 w-3.5" />
                Interviewer is thinking…
              </div>
            </div>
          )}

          {isWrappingUp && (
            <div className="text-muted flex items-center justify-center gap-2 py-2 text-sm">
              <Spinner className="h-3.5 w-3.5" />
              Interview complete — preparing your report…
            </div>
          )}

          {error && <ErrorNote message={error} onRetry={onRetry} />}

          <div ref={endRef} />
        </div>
      </div>

      <div className="border-border-subtle bg-surface/85 shrink-0 border-t backdrop-blur">
        <div className="mx-auto w-full max-w-3xl px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onKeyDown}
              disabled={locked}
              rows={1}
              maxLength={4000}
              placeholder={locked ? "Waiting for the interviewer…" : "Type your answer…"}
              aria-label="Your answer"
              className="focus-ring border-border-subtle bg-surface-raised placeholder:text-muted/70 focus:border-border-strong max-h-[180px] min-h-[48px] flex-1 resize-none rounded-xl border px-4 py-3 text-sm leading-relaxed transition-colors disabled:opacity-60"
            />
            <button
              type="button"
              onClick={send}
              disabled={locked || !draft.trim()}
              className="bg-accent text-accent-contrast hover:bg-accent-hover focus-ring h-12 shrink-0 cursor-pointer rounded-xl px-5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            >
              Send
            </button>
          </div>
          <p className="text-muted mt-2 hidden text-xs sm:block">
            Enter to send · Shift + Enter for a new line
          </p>
        </div>
      </div>
    </div>
  );
}
