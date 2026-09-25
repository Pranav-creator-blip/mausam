"use client";

import { Activity, LayoutDashboard, Map as MapIcon, ShieldAlert, Wind } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ViewId } from "@/components/providers/DashboardProvider";

export const NAV_ITEMS: Array<{ id: ViewId; label: string; hint: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "overview", label: "Overview", hint: "Current conditions and the next 24 hours", icon: LayoutDashboard },
  { id: "map", label: "Live map", hint: "Radar, layers and sampled weather fields", icon: MapIcon },
  { id: "forecast", label: "Forecast", hint: "Hourly charts and the multi-day outlook", icon: Activity },
  { id: "air", label: "Air quality", hint: "AQI bands and pollutant breakdown", icon: Wind },
  { id: "alerts", label: "Alerts", hint: "Official warnings and global hazards", icon: ShieldAlert },
];

export function ShellNav({
  view,
  onSelect,
  variant = "sidebar",
}: {
  view: ViewId;
  onSelect: (view: ViewId) => void;
  variant?: "sidebar" | "drawer";
}) {
  const reduced = useReducedMotion();
  return (
    <nav aria-label="Dashboard sections" className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active = item.id === view;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            aria-current={active ? "page" : undefined}
            title={item.hint}
            className={`focus-ring group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
              active ? "text-ink" : "text-[rgba(163,176,199,0.9)] hover:text-ink"
            } ${variant === "drawer" ? "w-full" : ""}`}
          >
            {active ? (
              reduced ? (
                <span className="absolute inset-0 rounded-xl border border-cyan/30 bg-cyan/12" />
              ) : (
                <motion.span
                  layoutId={`nav-${variant}`}
                  className="absolute inset-0 rounded-xl border border-cyan/30 bg-cyan/12"
                  transition={{ type: "spring", stiffness: 420, damping: 36 }}
                />
              )
            ) : (
              <span className="absolute inset-0 rounded-xl opacity-0 transition group-hover:bg-white/[0.05] group-hover:opacity-100" />
            )}
            <Icon className={`relative z-10 h-4 w-4 shrink-0 ${active ? "text-cyan" : ""}`} />
            <span className="relative z-10 min-w-0">
              <span className="block text-[13px] font-semibold">{item.label}</span>
              <span className="muted-dim block truncate text-[10.5px]">{item.hint}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-cyan/35 bg-cyan/10">
        <Wind className="h-4 w-4 text-cyan" />
        <span className="absolute inset-0 rounded-xl border border-cyan/20 anim-pulse" />
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] leading-tight font-semibold tracking-[0.24em] text-ink">AETHER</span>
        {!compact ? (
          <span className="muted-dim block text-[10px] tracking-[0.34em] uppercase">Weather intelligence</span>
        ) : null}
      </span>
    </div>
  );
}
