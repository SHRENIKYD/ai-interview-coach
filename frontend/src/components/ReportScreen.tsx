"use client";

import type { Difficulty, Report } from "@/lib/api";
import { ArrowRight, ErrorNote, Spinner } from "./ui";

const BAND_MARKS = [
  { at: 55, label: "55 Pass", accent: true },
  { at: 70, label: "70", accent: false },
  { at: 85, label: "85", accent: false },
];

function scorecardText(report: Report) {
  const line = "=".repeat(58);
  const list = (items: string[]) =>
    items.length ? items.map((s, i) => `  ${i + 1}. ${s}`).join("\n") : "  —";

  return [
    line,
    "AI INTERVIEW COACH — SCORECARD",
    line,
    `Topic       ${report.topic}`,
    `Difficulty  ${report.difficulty}`,
    `Score       ${report.score} / 100`,
    `Band        ${report.band}`,
    `Result      ${report.result}`,
    "",
    "WHAT LANDED",
    list(report.strengths),
    "",
    "WHAT DIDN'T",
    list(report.weaknesses),
    "",
    "GO REVISE",
    list(report.topics_to_revise),
    "",
    "VERDICT",
    `  ${report.verdict}`,
    "",
    line,
  ].join("\n");
}

function saveScorecard(report: Report) {
  const slug = report.topic.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const blob = new Blob([scorecardText(report)], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `scorecard-${slug}-${report.score}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function FindingList({
  title,
  items,
  tone,
  emptyNote,
}: {
  title: string;
  items: string[];
  tone: "good" | "bad";
  emptyNote: string;
}) {
  return (
    <section className="flex flex-col">
      <div className="border-ink flex items-center gap-2.5 border-b px-5 py-3.5 sm:px-7">
        <span
          className={`block h-1 w-4 ${tone === "good" ? "bg-success" : "bg-accent"}`}
          aria-hidden="true"
        />
        <h3 className="label">{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="text-muted px-5 py-4 text-sm sm:px-7">{emptyNote}</p>
      ) : (
        items.map((item, index) => (
          <div
            key={index}
            className={`flex gap-4 px-5 py-4 sm:px-7 ${
              index < items.length - 1 ? "border-rule border-b" : ""
            }`}
          >
            <span className="label-sm text-muted pt-1">
              {String(index + 1).padStart(2, "0")}
            </span>
            <p className="text-[0.9375rem] leading-relaxed text-pretty sm:text-base">
              {item}
            </p>
          </div>
        ))
      )}
    </section>
  );
}

export default function ReportScreen({
  topic,
  difficulty,
  report,
  isLoading,
  error,
  onRetry,
  onRestart,
}: {
  topic: string;
  difficulty: Difficulty;
  report: Report | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onRestart: () => void;
}) {
  if (isLoading) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
        <Spinner className="text-accent h-9 w-9" />
        <div className="flex flex-col gap-2">
          <p className="text-2xl font-black tracking-[-0.03em] uppercase">
            Marking your paper
          </p>
          <p className="label text-muted">
            Reading back through everything you said
          </p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center gap-6 px-5 sm:px-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-black tracking-[-0.03em] uppercase">
            No scorecard
          </h1>
          <p className="text-muted-deep text-sm">
            The interview finished, but the report didn&apos;t come through.
          </p>
        </div>
        <ErrorNote
          message={error ?? "The report came back empty. Please try again."}
          onRetry={onRetry}
          retryLabel="Retry"
        />
        <button
          type="button"
          onClick={onRestart}
          className="border-ink label hover:bg-ink hover:text-paper focus-ring cursor-pointer border px-5 py-3.5 transition-colors"
        >
          Start a new interview
        </button>
      </div>
    );
  }

  const passed = report.result === "Pass";

  return (
    <div className="flex min-h-dvh flex-col">
      {/* ---------- Chrome ---------- */}
      <header className="bg-ink text-paper flex min-h-[56px] shrink-0 flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3.5">
          <span className="bg-accent block h-3 w-3" aria-hidden="true" />
          <span className="label">Scorecard</span>
        </div>
        <span className="label-sm text-on-ink-muted">
          {topic} / {difficulty}
        </span>
      </header>

      {/* ---------- Grade block ---------- */}
      <div className="border-ink animate-rise flex flex-col border-b-[3px] lg:flex-row lg:items-stretch">
        <div className="border-ink flex flex-col px-5 py-7 sm:px-8 lg:w-[470px] lg:shrink-0 lg:border-r-[3px] lg:px-9">
          <span className="label text-muted mb-1.5">Score</span>
          <div className="flex items-end gap-3.5">
            <span className="text-[clamp(6rem,18vw,11rem)] leading-[0.76] font-black tracking-[-0.06em] tabular-nums">
              {report.score}
            </span>
            <span className="label-sm text-muted pb-3.5">/100</span>
          </div>
        </div>

        <div className="flex flex-1 flex-col">
          <div className="border-ink flex flex-1 flex-col justify-center gap-3 border-t border-b px-5 py-6 sm:px-8 lg:border-t-0">
            <div className="flex items-baseline justify-between gap-4">
              <span className="label text-muted">Band</span>
              <span className="text-[clamp(1.5rem,5vw,2.125rem)] leading-none font-black tracking-[-0.03em] uppercase">
                {report.band}
              </span>
            </div>
            <div
              className="border-ink relative flex h-3.5 border"
              role="img"
              aria-label={`Score ${report.score} out of 100`}
            >
              <div
                className="bg-ink"
                style={{ width: `${Math.max(0, Math.min(100, report.score))}%` }}
              />
            </div>
            <div className="relative h-4">
              <span className="label-sm text-muted absolute left-0">0</span>
              {BAND_MARKS.map((mark) => (
                <span
                  key={mark.at}
                  className={`label-sm absolute -translate-x-1/2 ${mark.accent ? "text-accent" : "text-muted"}`}
                  style={{ left: `${mark.at}%` }}
                >
                  {mark.label}
                </span>
              ))}
              <span className="label-sm text-muted absolute right-0">100</span>
            </div>
          </div>

          <div
            className={`flex min-h-[74px] items-center justify-between px-5 py-5 sm:px-8 ${
              passed ? "bg-success text-paper" : "bg-accent text-paper"
            }`}
          >
            <span
              className={`label ${passed ? "text-success-soft" : "text-paper/70"}`}
            >
              Result
            </span>
            <span className="text-[clamp(2rem,7vw,2.875rem)] leading-none font-black tracking-[-0.03em] uppercase">
              {report.result}
            </span>
          </div>
        </div>
      </div>

      {/* ---------- Findings ---------- */}
      <div className="border-ink grid border-b-[3px] lg:grid-cols-2">
        <div className="border-ink border-b lg:border-r-[3px] lg:border-b-0">
          <FindingList
            title="What landed"
            items={report.strengths}
            tone="good"
            emptyNote="Nothing stood out as a clear strength."
          />
        </div>
        <FindingList
          title="What didn't"
          items={report.weaknesses}
          tone="bad"
          emptyNote="No specific weaknesses were recorded."
        />
      </div>

      {/* ---------- Revise ---------- */}
      {report.topics_to_revise.length > 0 && (
        <div className="border-ink flex flex-col border-b-[3px] lg:flex-row lg:items-stretch">
          <div className="border-ink flex items-center border-b px-5 py-3.5 sm:px-7 lg:w-[200px] lg:shrink-0 lg:border-r lg:border-b-0 lg:py-0">
            <h3 className="label">Go revise</h3>
          </div>
          <div className="flex flex-1 flex-wrap">
            {report.topics_to_revise.map((item, index) => (
              <span
                key={index}
                className={`label-sm px-5 py-4 sm:px-6 ${
                  index < report.topics_to_revise.length - 1
                    ? "border-rule border-r border-b lg:border-b-0"
                    : ""
                }`}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ---------- Verdict ---------- */}
      <div className="flex flex-1 flex-col lg:flex-row lg:items-stretch">
        <div className="border-ink flex items-center border-b px-5 py-3.5 sm:px-7 lg:w-[200px] lg:shrink-0 lg:border-r lg:border-b-0 lg:py-6">
          <h3 className="label">Verdict</h3>
        </div>
        <div className="flex-1 px-5 py-6 sm:px-8 lg:px-9">
          <p className="max-w-4xl text-[clamp(1.0625rem,2.4vw,1.375rem)] leading-snug font-medium tracking-[-0.015em] text-pretty">
            {report.verdict}
          </p>
        </div>
      </div>

      {/* ---------- Actions ---------- */}
      <div className="border-ink flex shrink-0 flex-col border-t-[3px] sm:flex-row sm:items-stretch">
        <button
          type="button"
          onClick={onRestart}
          className="bg-ink text-paper focus-ring flex min-h-[80px] flex-1 cursor-pointer items-center justify-between gap-4 px-5 sm:px-8 lg:min-h-[92px] lg:px-9"
        >
          <span className="text-[clamp(1.625rem,4.5vw,2.25rem)] leading-none font-black tracking-[-0.03em] uppercase">
            Go again
          </span>
          <ArrowRight className="h-6 w-11 shrink-0" />
        </button>
        <button
          type="button"
          onClick={() => saveScorecard(report)}
          className="border-ink label hover:bg-paper-sunk focus-ring flex min-h-[62px] cursor-pointer items-center justify-center gap-3 border-t-[3px] px-6 transition-colors sm:w-[300px] sm:shrink-0 sm:border-t-0 sm:border-l-[3px]"
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="M12 3v13M7 11l5 5 5-5M4 20h16" />
          </svg>
          Save scorecard
        </button>
      </div>
    </div>
  );
}
