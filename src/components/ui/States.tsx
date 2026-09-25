"use client";

import { AlertTriangle, CloudOff, Info, Loader2, RefreshCw, WifiOff } from "lucide-react";
import { relativeFromNow } from "@/lib/time";

export function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  return <div className={`skeleton rounded-md ${className}`} />;
}

export function CardSkeleton({ rows = 3, className = "" }: { rows?: number; className?: string }) {
  return (
    <div className={`glass rounded-[18px] p-5 ${className}`}>
      <Skeleton className="h-3 w-28" />
      <Skeleton className="mt-4 h-9 w-40" />
      <div className="mt-5 grid gap-2">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-3 w-full opacity-70" />
        ))}
      </div>
    </div>
  );
}

export function InlineSpinner({ className = "" }: { className?: string }) {
  return <Loader2 aria-hidden className={`anim-spin h-3.5 w-3.5 ${className}`} />;
}

export function ErrorState({
  title = "Data unavailable",
  message,
  onRetry,
  compact = false,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  compact?: boolean;
}) {
  return (
    <div
      role="alert"
      className={`flex flex-col gap-3 rounded-2xl border border-coral/30 bg-coral/[0.07] ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle aria-hidden className="mt-[2px] h-4 w-4 shrink-0 text-coral" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{title}</p>
          <p className="muted mt-1 text-xs leading-relaxed break-words">{message}</p>
        </div>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="focus-ring inline-flex w-fit items-center gap-2 rounded-full border border-coral/40 px-3 py-1.5 text-xs font-semibold text-coral transition hover:bg-coral/15"
        >
          <RefreshCw aria-hidden className="h-3.5 w-3.5" />
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function UnavailableState({
  title,
  message,
  icon,
}: {
  title: string;
  message: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-white/[0.02] px-4 py-8 text-center">
      <span className="muted-dim">{icon ?? <CloudOff aria-hidden className="h-5 w-5" />}</span>
      <p className="text-sm font-semibold text-ink-soft">{title}</p>
      <p className="muted max-w-md text-xs leading-relaxed">{message}</p>
    </div>
  );
}

export function OfflineNotice({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber/30 bg-amber/[0.08] px-3 py-2 text-xs text-amber">
      <WifiOff aria-hidden className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1">You appear to be offline. Showing the last successful response.</span>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="focus-ring rounded-full border border-amber/40 px-2.5 py-1 font-semibold">
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function DataStamp({
  lastUpdated,
  stale,
  refreshing,
  staleLabel = "This reading is older than expected.",
}: {
  lastUpdated: number | null;
  stale?: boolean;
  refreshing?: boolean;
  staleLabel?: string;
}) {
  return (
    <div className="muted flex flex-wrap items-center gap-2 text-[11px]">
      {refreshing ? (
        <span className="inline-flex items-center gap-1.5 text-cyan">
          <InlineSpinner /> Updating
        </span>
      ) : null}
      <span className="tnum">
        {lastUpdated ? `Updated ${relativeFromNow(lastUpdated)}` : "Awaiting first response"}
      </span>
      {stale ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber/35 bg-amber/10 px-2 py-[2px] font-semibold text-amber">
          <Info aria-hidden className="h-3 w-3" /> {staleLabel}
        </span>
      ) : null}
    </div>
  );
}

export function SourceNote({ children }: { children: React.ReactNode }) {
  return <p className="muted-dim mt-3 text-[10.5px] leading-relaxed">{children}</p>;
}
