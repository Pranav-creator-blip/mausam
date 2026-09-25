"use client";

import { InfoHint } from "@/components/ui/Controls";

export function MetricTile({
  label,
  value,
  unit,
  detail,
  info,
  icon,
  accent,
}: {
  label: string;
  value: string;
  unit?: string;
  detail?: string;
  info?: React.ReactNode;
  icon?: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="glass-soft rounded-2xl px-3.5 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="muted-dim flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.14em] uppercase">
          {icon}
          {label}
        </span>
        {info ? <InfoHint label={`About ${label}`}>{info}</InfoHint> : null}
      </div>
      <p className="mt-2 flex items-baseline gap-1">
        <span className="tnum text-[22px] leading-none font-semibold" style={accent ? { color: accent } : undefined}>
          {value}
        </span>
        {unit ? <span className="muted text-[11px] font-medium">{unit}</span> : null}
      </p>
      {detail ? <p className="muted mt-1.5 text-[11px] leading-snug">{detail}</p> : null}
    </div>
  );
}

export function WindCompass({
  direction,
  label,
  speedLabel,
  gustLabel,
  unit,
}: {
  direction: number | null;
  label: string;
  speedLabel: string;
  gustLabel: string | null;
  unit: string;
}) {
  const rotation = direction === null ? 0 : direction;
  return (
    <div className="glass-soft flex items-center gap-3.5 rounded-2xl px-3.5 py-3">
      <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full border border-line bg-white/[0.03]">
        <span className="muted-dim absolute top-0.5 text-[9px] font-bold">N</span>
        <span className="muted-dim absolute right-1 text-[9px]">E</span>
        <span className="muted-dim absolute bottom-0.5 text-[9px] font-bold">S</span>
        <span className="muted-dim absolute left-1 text-[9px]">W</span>
        <svg viewBox="0 0 40 40" className="absolute inset-0 h-full w-full" style={{ transform: `rotate(${rotation}deg)` }}>
          <path d="M20 7l5 12-5-3-5 3z" fill="#79e4e8" />
          <path d="M20 33l-5-12 5 3 5-3z" fill="#3b4d68" />
        </svg>
      </div>
      <div className="min-w-0">
        <p className="muted-dim text-[10px] font-semibold tracking-[0.14em] uppercase">Wind</p>
        <p className="tnum mt-1 text-[20px] leading-none font-semibold text-ink">
          {speedLabel} <span className="muted text-[11px] font-medium">{unit}</span>
        </p>
        <p className="muted mt-1 text-[11px]">
          From {label}
          {direction !== null ? ` (${Math.round(direction)}°)` : ""}
        </p>
        {gustLabel ? <p className="muted-dim mt-0.5 text-[11px]">Gusts {gustLabel} {unit}</p> : null}
      </div>
    </div>
  );
}

export function SunArc({
  sunrise,
  sunset,
  now,
  progress,
  lockedLabel,
}: {
  sunrise: string;
  sunset: string;
  now: string;
  progress: number | null;
  lockedLabel: string;
}) {
  const clamped = progress === null ? null : Math.max(0, Math.min(1, progress));
  const angle = clamped === null ? null : Math.PI * clamped;
  const x = angle === null ? null : 50 - Math.cos(angle) * 42;
  const y = angle === null ? null : 60 - Math.sin(angle) * 46;
  return (
    <div>
      <svg viewBox="0 0 100 70" className="h-[86px] w-full">
        <defs>
          <linearGradient id="sun-arc" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#f6c667" stopOpacity="0.25" />
            <stop offset="50%" stopColor="#f6c667" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#f6c667" stopOpacity="0.25" />
          </linearGradient>
        </defs>
        <path d="M8 60 A 42 46 0 0 1 92 60" fill="none" stroke="rgba(159,184,221,0.2)" strokeWidth="1.4" strokeDasharray="4 4" />
        {clamped !== null ? (
          <path
            d="M8 60 A 42 46 0 0 1 92 60"
            fill="none"
            stroke="url(#sun-arc)"
            strokeWidth="2"
            pathLength={1}
            style={{ strokeDasharray: `${clamped} 1` }}
          />
        ) : null}
        <line x1="6" y1="60" x2="94" y2="60" stroke="rgba(159,184,221,0.24)" strokeWidth="1" />
        {x !== null && y !== null ? (
          <>
            <circle cx={x} cy={y} r="9" fill="rgba(246,198,103,0.18)" />
            <circle cx={x} cy={y} r="4.4" fill="#f6c667" />
          </>
        ) : null}
      </svg>
      <div className="mt-1 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="muted-dim text-[10px] font-semibold tracking-[0.12em] uppercase">Sunrise</p>
          <p className="tnum mt-0.5 text-xs font-semibold text-ink">{sunrise}</p>
        </div>
        <div>
          <p className="muted-dim text-[10px] font-semibold tracking-[0.12em] uppercase">Local time</p>
          <p className="tnum mt-0.5 text-xs font-semibold text-cyan">{now}</p>
        </div>
        <div>
          <p className="muted-dim text-[10px] font-semibold tracking-[0.12em] uppercase">Sunset</p>
          <p className="tnum mt-0.5 text-xs font-semibold text-ink">{sunset}</p>
        </div>
      </div>
      {clamped === null ? <p className="muted-dim mt-2 text-center text-[10.5px]">{lockedLabel}</p> : null}
    </div>
  );
}

export function ProgressRow({
  label,
  value,
  max,
  display,
  color,
  info,
}: {
  label: string;
  value: number | null;
  max: number;
  display: string;
  color: string;
  info?: React.ReactNode;
}) {
  const percent = value === null ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="muted flex items-center gap-1.5 text-[11px] font-medium">
          {label}
          {info ? <InfoHint label={`About ${label}`}>{info}</InfoHint> : null}
        </span>
        <span className="tnum text-[11px] font-semibold text-ink-soft">{display}</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${percent}%`, background: color }}
        />
      </div>
    </div>
  );
}
