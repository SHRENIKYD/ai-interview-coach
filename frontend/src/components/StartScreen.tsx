"use client";

import { useEffect, useState } from "react";
import { DIFFICULTIES, warmUp, type Difficulty } from "@/lib/api";
import { ArrowRight, ErrorNote, Spinner, TopBar } from "./ui";

const DIFFICULTY_BLURB: Record<Difficulty, string> = {
  Easy: "Definitions and recall",
  Medium: "Applied problems",
  Hard: "Trade-offs and system thinking",
};

const SUGGESTIONS = [
  "Binary Trees",
  "React Hooks",
  "SQL Indexing",
  "System Design",
  "Python Generators",
];

export default function StartScreen({
  onStart,
  isStarting,
  error,
  onDismissError,
}: {
  onStart: (topic: string, difficulty: Difficulty) => void;
  isStarting: boolean;
  error: string | null;
  onDismissError: () => void;
}) {
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const [touched, setTouched] = useState(false);

  // The API sleeps on a free instance; wake it while the user is still choosing
  // so the first real request doesn't eat the cold start.
  useEffect(() => {
    void warmUp();
  }, []);

  const trimmed = topic.trim();
  const topicInvalid = touched && trimmed.length < 2;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (trimmed.length < 2 || isStarting) return;
    onStart(trimmed, difficulty);
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar
        right={
          <div className="border-on-ink-rule hidden items-center gap-6 border-l px-6 lg:flex">
            <span className="label-sm text-on-ink-muted">
              One question at a time
            </span>
            <span className="label-sm text-on-ink-muted">No hints</span>
          </div>
        }
      >
        <span className="label">Interview Coach</span>
      </TopBar>

      <form
        onSubmit={submit}
        noValidate
        className="border-ink flex flex-1 flex-col border-b-[3px] lg:grid lg:grid-cols-2"
      >
        {/* ---------- Statement ---------- */}
        <section className="border-ink flex flex-col justify-between gap-10 px-5 py-10 sm:px-8 lg:border-r-[3px] lg:px-11 lg:py-14">
          <div className="flex flex-col">
            <span className="label text-muted mb-6">01 — Set up</span>
            <h1 className="mb-6 text-[clamp(3.25rem,9vw,6rem)] leading-[0.82] font-black tracking-[-0.05em] uppercase">
              Prove
              <br />
              you
              <br />
              <span className="bg-accent text-paper inline-block px-2.5">
                know it
              </span>
            </h1>
            <p className="max-w-md text-base leading-relaxed text-pretty sm:text-[1.0625rem]">
              An interviewer asks one question at a time, follows up when
              you&apos;re half-right, and moves on when you&apos;re wrong. It
              decides when you&apos;re done — then it grades you.
            </p>
          </div>

          <dl className="border-ink hidden border sm:flex">
            <div className="border-ink flex flex-1 flex-col gap-1 border-r px-4 py-3.5">
              <dt className="label-sm text-muted">Typical</dt>
              <dd className="text-[1.0625rem] font-extrabold">5–8 Q</dd>
            </div>
            <div className="border-ink flex flex-1 flex-col gap-1 border-r px-4 py-3.5">
              <dt className="label-sm text-muted">Pass mark</dt>
              <dd className="text-[1.0625rem] font-extrabold">55</dd>
            </div>
            <div className="flex flex-1 flex-col gap-1 px-4 py-3.5">
              <dt className="label-sm text-muted">Ended by</dt>
              <dd className="text-[1.0625rem] font-extrabold">Them</dd>
            </div>
          </dl>
        </section>

        {/* ---------- The form ---------- */}
        <section className="flex flex-col">
          <div className="border-ink flex flex-col border-t px-5 py-8 sm:px-8 lg:border-t-0 lg:border-b lg:px-11 lg:py-10">
            <label htmlFor="topic" className="label text-muted mb-4">
              Topic
            </label>
            <div
              className={`flex items-center gap-3 border-b-[3px] pb-3 ${
                topicInvalid ? "border-accent" : "border-ink"
              }`}
            >
              <input
                id="topic"
                value={topic}
                onChange={(event) => {
                  setTopic(event.target.value);
                  if (error) onDismissError();
                }}
                onBlur={() => setTouched(true)}
                disabled={isStarting}
                maxLength={120}
                autoFocus
                placeholder="Type a topic"
                aria-invalid={topicInvalid}
                aria-describedby={topicInvalid ? "topic-error" : undefined}
                // Lighter and lower-weight than a real value, so an empty field
                // never reads as a filled one at this type size.
                className="placeholder:text-muted/40 min-h-[44px] min-w-0 flex-1 bg-transparent text-[clamp(1.75rem,5vw,2.75rem)] font-extrabold tracking-[-0.035em] uppercase outline-none placeholder:font-normal placeholder:tracking-normal placeholder:normal-case disabled:opacity-50"
              />
              <span
                className="bg-accent animate-blink block h-7 w-3.5 shrink-0"
                aria-hidden="true"
              />
            </div>
            {topicInvalid && (
              <p id="topic-error" className="label text-accent mt-3">
                Enter a topic
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={isStarting}
                  onClick={() => {
                    setTopic(suggestion);
                    setTouched(false);
                    if (error) onDismissError();
                  }}
                  className="border-ink label-sm hover:bg-ink hover:text-paper focus-ring inline-flex min-h-[44px] cursor-pointer items-center border px-3.5 transition-colors disabled:opacity-40"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <fieldset
            disabled={isStarting}
            className="flex flex-col px-5 pt-8 sm:px-8 lg:px-11 lg:pt-10"
          >
            <legend className="label text-muted mb-4">Difficulty</legend>
            <div className="border-ink flex flex-col border">
              {DIFFICULTIES.map((level, index) => {
                const active = difficulty === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setDifficulty(level)}
                    aria-pressed={active}
                    className={`focus-ring flex min-h-[56px] cursor-pointer items-center gap-4 px-5 py-4 text-left transition-colors sm:gap-5 ${
                      index < DIFFICULTIES.length - 1 ? "border-ink border-b" : ""
                    } ${
                      active
                        ? "bg-ink text-paper"
                        : "hover:bg-paper-sunk text-ink"
                    }`}
                  >
                    <span
                      className={`label-sm ${active ? "text-on-ink-muted" : "text-muted"}`}
                    >
                      0{index + 1}
                    </span>
                    <span className="w-[88px] shrink-0 text-lg font-semibold uppercase sm:w-[104px]">
                      {level}
                    </span>
                    <span
                      className={`hidden text-sm sm:block ${active ? "text-paper/70" : "text-muted-deep"}`}
                    >
                      {DIFFICULTY_BLURB[level]}
                    </span>
                    {active && (
                      <span
                        className="bg-accent ml-auto block h-2.5 w-2.5 shrink-0"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {error && (
            <div className="px-5 pt-8 sm:px-8 lg:px-11">
              <ErrorNote message={error} />
            </div>
          )}

          <div className="flex-1 pb-8 lg:pb-0" />
        </section>

        {/* ---------- Start ---------- */}
        <button
          type="submit"
          disabled={isStarting}
          className="bg-accent text-paper hover:bg-accent-hover focus-ring flex min-h-[80px] cursor-pointer items-center justify-between gap-4 px-5 transition-colors disabled:cursor-not-allowed disabled:opacity-80 sm:px-8 lg:col-span-2 lg:min-h-[92px] lg:px-9"
        >
          <span className="text-[clamp(1.75rem,5vw,2.5rem)] leading-none font-black tracking-[-0.03em] uppercase">
            {isStarting ? "Starting…" : "Start interview"}
          </span>
          {isStarting ? (
            <Spinner className="h-7 w-7 shrink-0" />
          ) : (
            <ArrowRight className="h-6 w-11 shrink-0" />
          )}
        </button>
      </form>
    </div>
  );
}
