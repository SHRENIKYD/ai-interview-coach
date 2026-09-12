"use client";

import { useState } from "react";
import { DIFFICULTIES, type Difficulty } from "@/lib/api";
import { ErrorNote, Screen, Spinner } from "./ui";

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

  const trimmed = topic.trim();
  const topicInvalid = touched && trimmed.length < 2;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (trimmed.length < 2 || isStarting) return;
    onStart(trimmed, difficulty);
  }

  return (
    <Screen>
      <div className="flex flex-1 flex-col justify-center py-8">
        <header className="animate-rise mb-10 text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            AI Interview Coach
          </h1>
          <p className="text-muted mx-auto mt-3 max-w-md text-sm leading-relaxed sm:text-base">
            Pick a topic, pick your level, and sit a real technical interview. One
            question at a time, no hints — then a scored report at the end.
          </p>
        </header>

        <form
          onSubmit={submit}
          noValidate
          className="border-border-subtle bg-surface animate-rise rounded-2xl border p-5 shadow-2xl shadow-black/30 sm:p-7"
        >
          <div className="mb-6">
            <label
              htmlFor="topic"
              className="mb-2 block text-sm font-medium"
            >
              Topic
            </label>
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
              placeholder="e.g. Binary Trees"
              aria-invalid={topicInvalid}
              aria-describedby={topicInvalid ? "topic-error" : undefined}
              className={`focus-ring bg-surface-raised placeholder:text-muted/70 w-full rounded-xl border px-4 py-3 text-base transition-colors disabled:opacity-60 ${
                topicInvalid ? "border-danger" : "border-border-subtle focus:border-border-strong"
              }`}
            />
            {topicInvalid && (
              <p id="topic-error" className="text-danger mt-2 text-sm">
                Enter a topic to interview on.
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
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
                  className="border-border-subtle text-muted hover:border-border-strong hover:text-foreground focus-ring cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <fieldset className="mb-7" disabled={isStarting}>
            <legend className="mb-2 text-sm font-medium">Difficulty</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {DIFFICULTIES.map((level) => {
                const active = difficulty === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setDifficulty(level)}
                    aria-pressed={active}
                    className={`focus-ring cursor-pointer rounded-xl border px-4 py-3 text-left transition-colors disabled:opacity-60 ${
                      active
                        ? "border-accent bg-accent/12 text-foreground"
                        : "border-border-subtle bg-surface-raised text-muted hover:border-border-strong hover:text-foreground"
                    }`}
                  >
                    <span className="block text-sm font-semibold">{level}</span>
                    <span className="text-muted mt-0.5 block text-xs leading-snug">
                      {DIFFICULTY_BLURB[level]}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {error && (
            <div className="mb-5">
              <ErrorNote message={error} />
            </div>
          )}

          <button
            type="submit"
            disabled={isStarting}
            className="bg-accent text-accent-contrast hover:bg-accent-hover focus-ring flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isStarting ? (
              <>
                <Spinner />
                Preparing your interview…
              </>
            ) : (
              "Start Interview"
            )}
          </button>
        </form>

        <p className="text-muted mt-6 text-center text-xs">
          The interviewer decides when the interview is over.
        </p>
      </div>
    </Screen>
  );
}
