"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, Message } from "@/lib/api";
import { ArrowRight, Chip, ErrorNote, Spinner } from "./ui";

/** Roughly how long an interview runs, for the progress segments. The
 *  interviewer decides the real length, so this never claims a percentage. */
const EXPECTED_TURNS = 6;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Gutter label: turn number + who is speaking. */
function Gutter({
  tag,
  who,
  accent,
}: {
  tag: string;
  who: string;
  accent?: boolean;
}) {
  return (
    <div className="border-rule flex shrink-0 gap-2.5 px-4 py-4 sm:w-[148px] sm:flex-col sm:gap-1.5 sm:border-r sm:px-5 sm:py-5">
      <span
        className={`label-sm font-medium ${accent ? "text-accent" : "text-ink"}`}
      >
        {tag}
      </span>
      <span className="label-sm text-muted">{who}</span>
    </div>
  );
}

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
  const asked = messages.filter((m) => m.role === "interviewer").length;
  const answered = messages.filter((m) => m.role === "candidate").length;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isThinking, isWrappingUp, error]);

  useEffect(() => {
    if (!locked) inputRef.current?.focus();
  }, [locked]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
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

  // The last interviewer turn is the live one; it carries the accent bar.
  const lastInterviewerIndex = messages.reduce(
    (last, m, i) => (m.role === "interviewer" ? i : last),
    -1,
  );

  return (
    <div className="flex h-dvh flex-col">
      {/* ---------- Chrome ---------- */}
      <header className="bg-ink text-paper shrink-0">
        <div className="flex min-h-[56px] items-stretch">
          <div className="flex min-w-0 flex-1 items-center gap-3 px-4 sm:gap-4 sm:px-6">
            <span className="bg-accent block h-3 w-3 shrink-0" aria-hidden="true" />
            <h1 className="truncate text-base font-extrabold tracking-[-0.02em] uppercase sm:text-xl">
              {topic}
            </h1>
            <Chip>{difficulty}</Chip>
          </div>

          <div className="border-on-ink-rule hidden items-center gap-3 border-l px-5 lg:flex">
            <span className="label-sm text-on-ink-muted">Progress</span>
            <div className="flex gap-1" aria-hidden="true">
              {Array.from({ length: Math.max(EXPECTED_TURNS, asked) }).map(
                (_, i) => (
                  <span
                    key={i}
                    className={`block h-[7px] w-5 ${i < asked ? "bg-accent" : "bg-on-ink-border"}`}
                  />
                ),
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onQuit}
            className="border-on-ink-rule label-sm text-on-ink-muted hover:text-paper focus-ring shrink-0 cursor-pointer border-l px-5 transition-colors"
          >
            End
          </button>
        </div>

        {/* Progress moves under the title on narrow screens. */}
        <div className="flex gap-[3px] px-4 pb-3 lg:hidden" aria-hidden="true">
          {Array.from({ length: Math.max(EXPECTED_TURNS, asked) }).map((_, i) => (
            <span
              key={i}
              className={`h-[5px] flex-1 ${i < asked ? "bg-accent" : "bg-on-ink-border"}`}
            />
          ))}
        </div>
      </header>

      {/* ---------- Transcript ---------- */}
      <div className="border-ink flex-1 overflow-y-auto border-b-[3px]">
        {messages.map((message, index) => {
          const fromInterviewer = message.role === "interviewer";
          const turn = messages
            .slice(0, index + 1)
            .filter((m) => m.role === message.role).length;
          const live = index === lastInterviewerIndex && !isWrappingUp;

          return (
            <article
              key={index}
              // Every row reserves the 6px marker so the live one doesn't shift
              // the column. border-l-* must come after border-rule to win.
              className={`animate-rise border-rule flex flex-col border-b border-l-[6px] sm:flex-row sm:items-stretch ${
                fromInterviewer ? "" : "bg-paper-sunk"
              } ${live ? "border-l-accent" : "border-l-transparent"}`}
            >
              <Gutter
                tag={`${fromInterviewer ? "Q" : "A"} ${pad(turn)}`}
                who={fromInterviewer ? "Interviewer" : "You"}
                accent={!fromInterviewer}
              />
              <div className="flex flex-1 items-center px-4 pb-4 sm:px-7 sm:py-5">
                <p
                  className={`whitespace-pre-wrap ${
                    fromInterviewer
                      ? "text-[1.0625rem] leading-snug font-medium tracking-[-0.01em] text-pretty sm:text-[1.1875rem]"
                      : "text-ink-soft text-[0.9375rem] leading-relaxed text-pretty sm:text-base"
                  }`}
                >
                  {message.content}
                </p>
              </div>
            </article>
          );
        })}

        {isThinking && (
          <div className="flex items-center gap-3 px-4 py-5 sm:px-5">
            <span className="bg-ink animate-blink block h-2.5 w-2.5" />
            <span className="label-sm text-muted">Interviewer is thinking</span>
          </div>
        )}

        {isWrappingUp && (
          <div className="flex items-center gap-3 px-4 py-5 sm:px-5">
            <Spinner className="text-accent h-3.5 w-3.5" />
            <span className="label-sm text-muted">
              Interview complete — building your scorecard
            </span>
          </div>
        )}

        {error && (
          <div className="px-4 py-5 sm:px-5">
            <ErrorNote message={error} onRetry={onRetry} />
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* ---------- Composer: same grid as the answers ---------- */}
      <div className="flex shrink-0 flex-col sm:flex-row sm:items-stretch">
        <div className="border-rule hidden shrink-0 flex-col gap-1.5 border-r px-5 py-5 sm:flex sm:w-[148px]">
          <span className="label-sm text-accent font-medium">
            A {pad(answered + 1)}
          </span>
          <span className="label-sm text-muted">You</span>
        </div>

        <div className="border-rule flex flex-1 flex-col gap-2 border-b px-4 py-3 sm:border-b-0 sm:px-7 sm:py-5">
          <div className="flex items-center justify-between sm:hidden">
            <span className="label-sm text-accent font-medium">
              A {pad(answered + 1)}
            </span>
            <span className="label-sm text-muted">{draft.length} / 4000</span>
          </div>
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
            className="placeholder:text-muted/70 max-h-[200px] min-h-[52px] w-full flex-1 resize-none bg-transparent text-[0.9375rem] leading-relaxed outline-none disabled:opacity-50 sm:text-base"
          />
          <span className="label-sm text-muted hidden sm:block">
            Enter to send &nbsp;·&nbsp; Shift + Enter for a new line
          </span>
        </div>

        <button
          type="button"
          onClick={send}
          disabled={locked || !draft.trim()}
          className="bg-ink text-paper focus-ring flex min-h-[62px] shrink-0 cursor-pointer items-center justify-center gap-3 transition-opacity disabled:cursor-not-allowed disabled:opacity-35 sm:min-h-0 sm:w-[168px] sm:flex-col sm:gap-2.5"
        >
          {locked ? (
            <Spinner className="h-5 w-5" />
          ) : (
            <ArrowRight className="h-5 w-8" />
          )}
          <span className="text-lg font-extrabold tracking-[0.06em] sm:text-[0.9375rem]">
            SEND
          </span>
        </button>
      </div>
    </div>
  );
}
