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

export function ArrowRight({ className = "h-4 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 46 26"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className={className}
      aria-hidden="true"
    >
      <path d="M0 13h42M31 3l11 10-11 10" />
    </svg>
  );
}

/** The house error block: accent rule, mono label, plain sentence. */
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
    <div role="alert" className="border-ink border">
      <div className="bg-accent flex items-center gap-2.5 px-4 py-2">
        <span className="bg-paper block h-1 w-4" />
        <span className="label text-paper">Something went wrong</span>
      </div>
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-ink-soft text-sm leading-relaxed">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="border-ink text-ink hover:bg-ink hover:text-paper focus-ring label shrink-0 cursor-pointer border px-4 py-2.5 transition-colors"
          >
            {retryLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/** Black chrome bar that tops every screen. */
export function TopBar({
  children,
  right,
}: {
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <header className="bg-ink text-paper flex min-h-[56px] shrink-0 items-stretch">
      <div className="flex flex-1 items-center gap-3 px-4 sm:gap-4 sm:px-6">
        <span className="bg-accent block h-3 w-3 shrink-0" aria-hidden="true" />
        {children}
      </div>
      {right}
    </header>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="border-on-ink-border label-sm border px-2.5 py-1.5">
      {children}
    </span>
  );
}
