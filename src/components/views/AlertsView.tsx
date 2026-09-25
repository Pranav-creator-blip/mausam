"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Globe2,
  Info,
  MapPin,
  Radio,
  ShieldAlert,
  ShieldOff,
  XCircle,
} from "lucide-react";
import { useDashboard } from "@/components/providers/DashboardProvider";
import { useUnits } from "@/components/providers/UnitsProvider";
import { Panel, PanelHeader, Reveal } from "@/components/ui/Card";
import { DataStamp, ErrorState, Skeleton, SourceNote, UnavailableState } from "@/components/ui/States";
import { dateTimeLabel, relativeFromNow } from "@/lib/time";
import { formatNumber } from "@/lib/units";
import type { AlertProviderId, AlertRegionStatus, NormalizedAlert } from "@/lib/alerts";

const SEVERITY_ORDER: Record<string, number> = {
  extreme: 4,
  severe: 3,
  moderate: 2,
  minor: 1,
  unknown: 0,
};

function severityTone(severity: string): { label: string; color: string; border: string } {
  switch (severity) {
    case "extreme":
      return { label: "Extreme", color: "#f43f5e", border: "rgba(244,63,94,0.4)" };
    case "severe":
      return { label: "Severe", color: "#fb923c", border: "rgba(251,146,60,0.4)" };
    case "moderate":
      return { label: "Moderate", color: "#facc15", border: "rgba(250,204,21,0.35)" };
    case "minor":
      return { label: "Minor", color: "#38bdf8", border: "rgba(56,189,248,0.35)" };
    default:
      return { label: "Unrated", color: "#94a3b8", border: "rgba(148,163,184,0.35)" };
  }
}

function windowLabel(alert: NormalizedAlert, timeZone: string | undefined, hour12: boolean): string {
  if (alert.expires !== null) {
    return `Until ${dateTimeLabel(alert.expires, timeZone, hour12)} (${relativeFromNow(alert.expires)})`;
  }
  if (alert.effective !== null) {
    return `From ${dateTimeLabel(alert.effective, timeZone, hour12)} · no end time published`;
  }
  return "No validity window published by the provider";
}

function AlertCard({
  alert,
  timeZone,
  hour12,
  distanceLabel,
}: {
  alert: NormalizedAlert;
  timeZone: string | undefined;
  hour12: boolean;
  distanceLabel: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const reduced = useReducedMotion();
  const tone = severityTone(alert.severity);
  const detail = alert.description?.trim() ?? "";
  const longDetail = detail.length > 240;
  const shown = expanded || !longDetail ? detail : `${detail.slice(0, 240).trimEnd()}…`;

  return (
    <motion.article
      layout={!reduced}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border bg-white/[0.02] p-4"
      style={{ borderColor: tone.border }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-1 rounded-full border px-2 py-[3px] text-[10px] font-bold tracking-[0.12em] uppercase"
              style={{ borderColor: tone.border, color: tone.color, background: "rgba(255,255,255,0.03)" }}
            >
              <AlertTriangle aria-hidden className="h-3 w-3" />
              {tone.label}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-[3px] text-[10px] font-semibold tracking-[0.1em] text-muted uppercase">
              {alert.scope === "local-warning" ? (
                <>
                  <Radio aria-hidden className="h-3 w-3" /> Local official warning
                </>
              ) : (
                <>
                  <Globe2 aria-hidden className="h-3 w-3" /> Large-scale hazard
                </>
              )}
            </span>
            {alert.urgency ? (
              <span className="muted-dim text-[10px] tracking-[0.08em] uppercase">urgency {alert.urgency}</span>
            ) : null}
            {alert.certainty ? (
              <span className="muted-dim text-[10px] tracking-[0.08em] uppercase">certainty {alert.certainty}</span>
            ) : null}
          </div>
          <h3 className="mt-2.5 text-[15px] leading-snug font-semibold text-ink">{alert.event}</h3>
          <p className="muted mt-1 text-xs leading-relaxed">{alert.headline}</p>
        </div>
        {alert.web ? (
          <a
            href={alert.web}
            target="_blank"
            rel="noreferrer noopener"
            title="Open the provider's own page for this alert"
            className="focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-full border border-cyan/40 px-3 py-1.5 text-[11px] font-semibold text-cyan transition hover:bg-cyan/12"
          >
            Source page <ExternalLink aria-hidden className="h-3 w-3" />
          </a>
        ) : null}
      </div>

      <dl className="mt-3 grid gap-2.5 sm:grid-cols-2">
        <div className="flex items-start gap-2">
          <MapPin aria-hidden className="mt-[2px] h-3.5 w-3.5 shrink-0 text-cyan" />
          <div className="min-w-0">
            <dt className="muted-dim text-[10px] font-semibold tracking-[0.12em] uppercase">Area</dt>
            <dd className="mt-0.5 text-[11.5px] leading-snug text-ink-soft">{alert.area}</dd>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Info aria-hidden className="mt-[2px] h-3.5 w-3.5 shrink-0 text-cyan" />
          <div className="min-w-0">
            <dt className="muted-dim text-[10px] font-semibold tracking-[0.12em] uppercase">Validity</dt>
            <dd className="tnum mt-0.5 text-[11.5px] leading-snug text-ink-soft">{windowLabel(alert, timeZone, hour12)}</dd>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Radio aria-hidden className="mt-[2px] h-3.5 w-3.5 shrink-0 text-cyan" />
          <div className="min-w-0">
            <dt className="muted-dim text-[10px] font-semibold tracking-[0.12em] uppercase">Issued by</dt>
            <dd className="mt-0.5 text-[11.5px] leading-snug text-ink-soft">
              {alert.providerLabel}
              {alert.issued !== null ? ` · ${dateTimeLabel(alert.issued, timeZone, hour12)}` : ""}
            </dd>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <MapPin aria-hidden className="mt-[2px] h-3.5 w-3.5 shrink-0 text-cyan" />
          <div className="min-w-0">
            <dt className="muted-dim text-[10px] font-semibold tracking-[0.12em] uppercase">Match against this place</dt>
            <dd className="mt-0.5 text-[11.5px] leading-snug text-ink-soft">
              {alert.matchReason}
              {distanceLabel ? ` · ${distanceLabel}` : ""}
            </dd>
          </div>
        </div>
      </dl>

      {detail ? (
        <div className="mt-3 border-t border-line/70 pt-3">
          <p className="muted text-xs leading-relaxed whitespace-pre-line">{shown}</p>
          {longDetail ? (
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpanded((value) => !value)}
              className="focus-ring mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-cyan"
            >
              {expanded ? "Show less" : "Read the full bulletin"}
              <ChevronDown aria-hidden className={`h-3 w-3 transition ${expanded ? "rotate-180" : ""}`} />
            </button>
          ) : null}
        </div>
      ) : null}

      {alert.instruction ? (
        <div className="mt-3 rounded-xl border border-line bg-white/[0.03] p-3">
          <p className="muted-dim text-[10px] font-semibold tracking-[0.12em] uppercase">Instruction from the agency</p>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-soft whitespace-pre-line">{alert.instruction}</p>
        </div>
      ) : null}

    </motion.article>
  );
}

function ProviderRow({ status }: { status: AlertRegionStatus }) {
  return (
    <div className="flex items-start gap-2.5 border-b border-line/60 py-2.5 last:border-b-0">
      <span className={`mt-[3px] shrink-0 ${status.available ? "text-mint" : "text-muted-dim"}`}>
        {status.available ? <CheckCircle2 aria-hidden className="h-3.5 w-3.5" /> : <XCircle aria-hidden className="h-3.5 w-3.5" />}
      </span>
      <div className="min-w-0">
        <p className="text-[11.5px] font-semibold text-ink-soft">{status.label}</p>
        <p className="muted mt-0.5 text-[11px] leading-relaxed">{status.reason}</p>
        <p className="muted-dim mt-1 text-[10px] leading-relaxed">
          {status.coverage} · {status.attribution}
        </p>
      </div>
    </div>
  );
}

const PROVIDER_ORDER: AlertProviderId[] = ["nws", "sachet", "gdacs", "meteoalarm"];

export function AlertsView() {
  const { alerts, place, timeZone } = useDashboard();
  const { units, convert, symbol } = useUnits();
  const [filter, setFilter] = useState<"all" | "local-warning" | "global-hazard">("all");
  const radiusLabel = units.distance === "mi" ? `${formatNumber(convert.distance(400), 0)} ${symbol.distance}` : "400 km";

  if (alerts.loading && !alerts.data) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass rounded-[18px] p-5 lg:col-span-2">
          <Skeleton className="h-5 w-36" />
          <div className="mt-4 grid gap-3">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        </div>
        <div className="glass rounded-[18px] p-5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-4 h-40 w-full" />
        </div>
      </div>
    );
  }

  if (alerts.error && !alerts.data) {
    return <ErrorState title="Alerts unavailable" message={alerts.error} onRetry={alerts.refresh} />;
  }

  const payload = alerts.data;
  if (!payload) {
    return (
      <UnavailableState
        title="No alert response"
        message="No alert provider responded for this location. Nothing is being shown rather than showing an unverified warning."
      />
    );
  }

  const statuses = [...payload.statuses].sort(
    (a, b) => PROVIDER_ORDER.indexOf(a.provider) - PROVIDER_ORDER.indexOf(b.provider)
  );
  const list = [...payload.alerts]
    .filter((alert) => filter === "all" || alert.scope === filter)
    .sort((a, b) => {
      const rank = (SEVERITY_ORDER[b.severity] ?? 0) - (SEVERITY_ORDER[a.severity] ?? 0);
      return rank !== 0 ? rank : (b.issued ?? 0) - (a.issued ?? 0);
    });

  const localCount = payload.alerts.filter((alert) => alert.scope === "local-warning").length;
  const hazardCount = payload.alerts.filter((alert) => alert.scope === "global-hazard").length;
  const extremeCount = payload.alerts.filter((alert) => alert.severity === "extreme" || alert.severity === "severe").length;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Reveal className="lg:col-span-2">
        <Panel>
          <PanelHeader
            title="Official warnings"
            subtitle={`Alerts published by the agencies listed on the right that match ${place?.name ?? "this location"} within ${radiusLabel}. Nothing here is generated or inferred by AETHER.`}
            icon={<ShieldAlert className="h-4 w-4" />}
          />
          {payload.alerts.length === 0 ? (
            payload.anyProviderSucceeded ? (
              <UnavailableState
                title="No active warnings matched"
                message="Every reachable provider responded without an alert covering this location, or the alerts that exist fall outside the match area. This is a normal result, not an error."
                icon={<ShieldOff aria-hidden className="h-5 w-5" />}
              />
            ) : (
              <UnavailableState
                title="No provider could be reached"
                message="None of the configured alert providers returned a response, so AETHER cannot say whether warnings are in force. Check the provider panel for the individual reasons."
                icon={<ShieldOff aria-hidden className="h-5 w-5" />}
              />
            )
          ) : (
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <div className="inline-flex rounded-full border border-line bg-white/[0.03] p-[3px]">
                  {(
                    [
                      { value: "all" as const, label: `All ${payload.alerts.length}` },
                      { value: "local-warning" as const, label: `Local ${localCount}` },
                      { value: "global-hazard" as const, label: `Hazards ${hazardCount}` },
                    ]
                  ).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={filter === option.value}
                      onClick={() => setFilter(option.value)}
                      className={`focus-ring rounded-full px-3 py-1 text-[10.5px] font-semibold transition ${
                        filter === option.value ? "bg-cyan text-[#06131a]" : "muted hover:text-ink"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <p className="muted-dim text-[10.5px]">
                  {extremeCount} at severe or extreme level · fetched{" "}
                  {relativeFromNow(payload.fetchedAt)}
                </p>
              </div>
              <div className="grid gap-3">
                <AnimatePresence initial={false}>
                  {list.map((alert) => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      timeZone={timeZone ?? undefined}
                      hour12={units.hour12}
                      distanceLabel={
                        alert.distanceKm === null
                          ? null
                          : `${formatNumber(convert.distance(alert.distanceKm), 0)} ${symbol.distance} away`
                      }
                    />
                  ))}
                </AnimatePresence>
                {list.length === 0 ? (
                  <p className="muted text-xs">No alert in this filter. Switch back to All to see every matched alert.</p>
                ) : null}
              </div>
            </div>
          )}
          <DataStamp
            lastUpdated={alerts.lastUpdated}
            stale={alerts.stale}
            refreshing={alerts.refreshing}
            staleLabel="Alert check is overdue."
          />
          <SourceNote>
            Alerts are reproduced from the issuing agency. Severity, area and validity come from the provider payload; distance is
            measured from this place to the alert area centre and is an approximation.
          </SourceNote>
        </Panel>
      </Reveal>

      <Reveal delay={0.06}>
        <Panel>
          <PanelHeader
            title="Provider coverage"
            subtitle="Which official sources are reachable for this location, and which are not."
            icon={<Radio className="h-4 w-4" />}
          />
          <div>
            {statuses.map((status) => (
              <ProviderRow key={status.provider} status={status} />
            ))}
          </div>
          <SourceNote>
            National warning services publish through their own channels. AETHER only reads the public interfaces named above and never
            relabels a forecast as an official warning.
          </SourceNote>
        </Panel>
      </Reveal>
    </div>
  );
}
