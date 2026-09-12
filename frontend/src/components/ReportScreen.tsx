"use client";

import type { Band, Difficulty, Report } from "@/lib/api";
import { ErrorNote, Pill, Screen, Spinner } from "./ui";

const BAND_TONE: Record<Band, { text: string; ring: string; label: string }> = {
  Excellent: { text: "text-success", ring: "stroke-success", label: "Excellent" },
  Good: { text: "text-success", ring: "stroke-success", label: "Good" },
  Adequate: { text: "text-warning", ring: "stroke-warning", label: "Adequate" },
  Weak: { text: "text-danger", ring: "stroke-danger", label: "Weak" },
};

function ScoreDial({ score, band }: { score: number; band: Band }) {
  const tone = BAND_TONE[band];
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.max(0, Math.min(100, score)) / 100) * circumference;

  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth="9"
          className="stroke-border-subtle"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          className={tone.ring}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-semibold tabular-nums ${tone.text}`}>
          {score}
        </span>
        <span className="text-muted text-[0.65rem] tracking-wider uppercase">
          out of 100
        </span>
      </div>
    </div>
  );
}

function Section({
  title,
  items,
  emptyNote,
  marker,
}: {
  title: string;
  items: string[];
  emptyNote: string;
  marker: string;
}) {
  return (
    <section className="border-border-subtle bg-surface rounded-2xl border p-5">
      <h3 className="mb-3 text-sm font-semibold tracking-wide uppercase">{title}</h3>
      {items.length === 0 ? (
        <p className="text-muted text-sm">{emptyNote}</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((item, index) => (
            <li key={index} className="flex gap-3 text-sm leading-relaxed">
              <span className="text-muted mt-0.5 shrink-0 select-none">{marker}</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
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
      <Screen>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <Spinner className="text-accent h-8 w-8" />
          <div>
            <p className="text-base font-medium">Scoring your interview…</p>
            <p className="text-muted mt-1 text-sm">
              Reading back through everything you said.
            </p>
          </div>
        </div>
      </Screen>
    );
  }

  if (error || !report) {
    return (
      <Screen>
        <div className="flex flex-1 flex-col justify-center gap-5">
          <div className="text-center">
            <h1 className="text-xl font-semibold">Couldn&apos;t build your report</h1>
            <p className="text-muted mt-1 text-sm">
              Your interview finished, but the report didn&apos;t come through.
            </p>
          </div>
          <ErrorNote
            message={error ?? "The report was empty. Please try again."}
            onRetry={onRetry}
            retryLabel="Retry"
          />
          <button
            type="button"
            onClick={onRestart}
            className="border-border-subtle text-muted hover:border-border-strong hover:text-foreground focus-ring mx-auto cursor-pointer rounded-xl border px-4 py-2 text-sm transition-colors"
          >
            Start a new interview
          </button>
        </div>
      </Screen>
    );
  }

  const tone = BAND_TONE[report.band];
  const passed = report.result === "Pass";

  return (
    <Screen>
      <div className="animate-rise flex flex-col gap-5 pb-10">
        <header className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Interview Complete
          </h1>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <Pill>{topic}</Pill>
            <Pill>{difficulty}</Pill>
          </div>
        </header>

        <section className="border-border-subtle bg-surface flex flex-col items-center gap-6 rounded-2xl border p-6 sm:flex-row sm:gap-8 sm:p-7">
          <ScoreDial score={report.score} band={report.band} />
          <div className="flex-1 text-center sm:text-left">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold ${
                passed
                  ? "bg-success/15 text-success"
                  : "bg-danger/15 text-danger"
              }`}
            >
              {passed ? "Pass" : "Fail"}
            </span>
            <p className={`mt-3 text-lg font-medium ${tone.text}`}>{tone.label}</p>
            <p className="text-muted mt-1 text-sm leading-relaxed">
              {passed
                ? "You cleared the bar for this interview."
                : "You didn't clear the bar this time — the notes below say why."}
            </p>
          </div>
        </section>

        <Section
          title="What you did well"
          items={report.strengths}
          emptyNote="Nothing stood out as a clear strength in this interview."
          marker="+"
        />

        <Section
          title="Areas for improvement"
          items={report.weaknesses}
          emptyNote="No specific weaknesses were recorded."
          marker="−"
        />

        <Section
          title="Topics to revise"
          items={report.topics_to_revise}
          emptyNote="No revision topics were suggested."
          marker="→"
        />

        <section className="border-border-subtle bg-surface rounded-2xl border p-5">
          <h3 className="mb-3 text-sm font-semibold tracking-wide uppercase">
            Interviewer&apos;s verdict
          </h3>
          <p className="text-muted-strong text-sm leading-relaxed">{report.verdict}</p>
        </section>

        <button
          type="button"
          onClick={onRestart}
          className="bg-accent text-accent-contrast hover:bg-accent-hover focus-ring w-full cursor-pointer rounded-xl px-4 py-3.5 text-base font-semibold transition-colors"
        >
          Start New Interview
        </button>
      </div>
    </Screen>
  );
}
