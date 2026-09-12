import type { ReactNode } from "react";

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M12 2a10 10 0 0 1 10 10h-3a7 7 0 0 0-7-7V2Z"
      />
    </svg>
  );
}

export function ErrorNote({
  message,
  onRetry,
  retryLabel = "Try again",
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div
      role="alert"
      className="border-danger/40 bg-danger/10 flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-danger text-sm leading-relaxed">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="border-danger/50 text-danger hover:bg-danger/15 focus-ring shrink-0 cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}

export function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="border-border-subtle bg-surface-raised text-muted-strong rounded-full border px-2.5 py-1 text-xs font-medium">
      {children}
    </span>
  );
}

export function Screen({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 py-6 sm:px-6 sm:py-10">
      {children}
    </main>
  );
}
