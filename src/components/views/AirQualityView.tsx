"use client";

import { useMemo, useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, Atom, Gauge, Leaf, RefreshCw, Waves } from "lucide-react";
import { useDashboard } from "@/components/providers/DashboardProvider";
import { Segmented } from "@/components/ui/Controls";
import { Panel, PanelHeader, Reveal } from "@/components/ui/Card";
import { DataStamp, ErrorState, Skeleton, SourceNote, UnavailableState } from "@/components/ui/States";
import { MetricTile, ProgressRow } from "@/components/weather/Metrics";
import { POLLUTANTS, aqiBand, aqiBands, aqiProgress, pollutantRatio, type AqiScale } from "@/lib/aqi";
import { buildAirHours } from "@/lib/forecast";
import { dateLabel, shortHourLabel } from "@/lib/time";
import { formatNumber, uvBand } from "@/lib/units";

const TONE_COLORS: Record<string, string> = {
  emerald: "#7ee0b0",
  amber: "#f6c667",
  orange: "#f59e6b",
  rose: "#ff7a7a",
  violet: "#a597ff",
};

const SCALE_LABELS: Record<AqiScale, string> = {
  european: "European AQI",
  us: "US AQI",
};

const SCALE_NOTES: Record<AqiScale, string> = {
  european:
    "The European AQI from the Copernicus Atmosphere Monitoring Service ensemble, reported on the EEA five-band index that runs from 0 upwards.",
  us: "The US AQI from the Copernicus Atmosphere Monitoring Service ensemble, reported on the EPA six-band index where 100 matches the national air quality standard.",
};

type AirChartPoint = {
  label: string;
  date: string;
  epoch: number | null;
  observed: boolean;
  value: number | null;
  valueObs: number | null;
  valueFc: number | null;
  pm25: number | null;
};

type PollutantRow = {
  key: string;
  symbol: string;
  label: string;
  unit: string;
  value: number;
  ratio: number;
  reference: number;
  referenceLabel: string;
  description: string;
  color: string;
};

function AirTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: AirChartPoint }> }) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="rounded-xl border border-line bg-[rgba(9,14,25,0.97)] px-3 py-2 shadow-[var(--shadow-glow)]">
      <p className="muted-dim text-[10px] font-semibold tracking-[0.12em] uppercase">
        {point.date} · {point.label}
      </p>
      <p className="tnum mt-1 text-sm font-semibold text-ink">
        {point.value === null ? "—" : formatNumber(point.value, 0)}
        <span className="muted ml-2 text-[11px] font-normal">index</span>
      </p>
      {point.pm25 !== null ? (
        <p className="muted mt-1 text-[11px]">PM₂.₅ {formatNumber(point.pm25, 1)} µg/m³</p>
      ) : null}
      <p className={`mt-1 text-[10px] font-semibold tracking-[0.1em] uppercase ${point.observed ? "text-mint" : "text-cyan"}`}>
        {point.observed ? "Observed window" : "Forecast"}
      </p>
    </div>
  );
}

export function AirQualityView() {
  const { air, timeZone } = useDashboard();
  const tz = timeZone ?? undefined;

  const now = Date.now();
  const [scale, setScale] = useState<AqiScale>("european");
  const [range, setRange] = useState<"24" | "48" | "72">("24");

  const airHours = useMemo(() => (air.data ? buildAirHours(air.data) : []), [air.data]);
  const startIndex = useMemo(() => {
    const found = airHours.findIndex((hour) => hour.epoch !== null && hour.epoch >= now - 1800000);
    return found === -1 ? Math.max(0, airHours.length - 1) : found;
  }, [airHours, now]);

  const availableForecast = airHours.length - startIndex;

  if (air.loading && !air.data) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass rounded-[18px] p-5 lg:col-span-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-5 h-14 w-40" />
          <Skeleton className="mt-5 h-32 w-full" />
        </div>
        <div className="glass rounded-[18px] p-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-4 h-48 w-full" />
        </div>
      </div>
    );
  }

  if (air.error && !air.data) {
    return (
      <ErrorState
        title="Air quality unavailable"
        message={air.error}
        onRetry={air.refresh}
      />
    );
  }

  if (!air.data) {
    return (
      <UnavailableState
        title="No air quality response"
        message="The air quality endpoint returned no usable payload for these coordinates. Try refreshing or choosing a different place."
        icon={<RefreshCw aria-hidden className="h-5 w-5" />}
      />
    );
  }

  const currentRaw = air.data.current ?? null;
  const readCurrent = (key: string): number | null => {
    const raw = currentRaw ? (currentRaw as Record<string, unknown>)[key] : undefined;
    return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
  };

  const scaleKey = scale === "us" ? "us_aqi" : "european_aqi";
  const aqiNow = readCurrent(scaleKey);
  const band = aqiBand(aqiNow, scale);
  const progress = aqiNow === null ? null : aqiProgress(aqiNow, scale);
  const bands = aqiBands(scale);
  const otherAqi = readCurrent(scale === "us" ? "european_aqi" : "us_aqi");

  const rangeCount = range === "24" ? 24 : range === "48" ? 48 : 72;
  const rangeHours = airHours.slice(startIndex, startIndex + Math.min(rangeCount, Math.max(availableForecast, 0)));

  const chartData = useMemo<AirChartPoint[]>(() => {
    const points = rangeHours.map((hour) => {
      const value = scale === "us" ? hour.usAqi : hour.europeanAqi;
      return {
        label: shortHourLabel(hour.epoch, tz, true),
        date: dateLabel(hour.epoch, tz),
        epoch: hour.epoch,
        observed: !hour.isForecast,
        value,
        valueObs: hour.isForecast ? null : value,
        valueFc: hour.isForecast ? value : null,
        pm25: hour.pm25,
      };
    });
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1];
      const point = points[index];
      if (point.observed && !previous.observed) {
        previous.valueObs = point.valueObs;
      }
      if (!point.observed && previous.observed) {
        previous.valueFc = point.valueFc;
      }
    }
    return points;
  }, [rangeHours, scale, tz]);

  const peak = useMemo(() => {
    let best: AirChartPoint | null = null;
    for (const point of chartData) {
      if (point.value === null) continue;
      if (!best || (best.value !== null && point.value > best.value)) best = point;
    }
    return best;
  }, [chartData]);

  const pollutants: PollutantRow[] = POLLUTANTS.map((info) => {
    const value = readCurrent(info.key);
    if (value === null) return null;
    const ratio = pollutantRatio(value, info.reference);
    if (ratio === null) return null;
    return {
      key: info.key,
      symbol: info.symbol,
      label: info.label,
      unit: info.unit,
      value,
      ratio,
      reference: info.reference,
      referenceLabel: info.referenceLabel,
      description: info.description,
      color: ratio <= 0.5 ? "#7ee0b0" : ratio <= 1 ? "#f6c667" : ratio <= 2 ? "#fb923c" : "#f87171",
    };
  }).filter((row): row is PollutantRow => row !== null);

  const peakPollutant = pollutants.reduce<PollutantRow | null>(
    (worst, row) => (!worst || row.ratio > worst.ratio ? row : worst),
    null
  );

  const uv = uvBand(readCurrent("uv_index"));
  const dust = readCurrent("dust");
  const aerosol = readCurrent("aerosol_optical_depth");
  const rangeOptions = (["24", "48", "72"] as const).filter((option) => {
    const count = option === "24" ? 24 : option === "48" ? 48 : 72;
    return availableForecast >= Math.min(count, 12);
  });

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Reveal className="lg:col-span-2">
        <Panel>
          <PanelHeader
            title="Air quality now"
            subtitle={SCALE_NOTES[scale]}
            icon={<Leaf className="h-4 w-4" />}
            action={
              <Segmented
                value={scale}
                onChange={setScale}
                size="sm"
                ariaLabel="Air quality index scale"
                options={[
                  { value: "european", label: "European", title: "European AQI (EEA five-band index)" },
                  { value: "us", label: "US", title: "US AQI (EPA six-band index)" },
                ]}
              />
            }
          />
          {aqiNow === null || !band ? (
            <UnavailableState
              title={`${SCALE_LABELS[scale]} not published here`}
              message="The air quality model returned no index value for these coordinates, so no band, guidance or pollutant summary can be shown. Pollutant values below are only displayed when the model supplies them."
            />
          ) : (
            <div>
              <div className="flex flex-wrap items-end gap-4">
                <p className="tnum text-[48px] leading-none font-semibold" style={{ color: band.color }}>
                  {formatNumber(aqiNow, 0)}
                </p>
                <div className="pb-1.5">
                  <p className="text-[15px] font-semibold" style={{ color: band.color }}>
                    {band.label}
                  </p>
                  <p className="muted-dim text-[11px]">
                    {SCALE_LABELS[scale]} · band {formatNumber(band.min, 0)}–{formatNumber(band.max, 0)}
                  </p>
                </div>
                {otherAqi !== null ? (
                  <p className="muted ml-auto pb-1.5 text-[11px]">
                    {scale === "us" ? "European" : "US"} index here:{" "}
                    <span className="tnum font-semibold text-ink-soft">{formatNumber(otherAqi, 0)}</span>
                  </p>
                ) : null}
              </div>

              {progress !== null ? (
                <div className="mt-4">
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/[0.07]">
                    <div className="h-full rounded-full" style={{ width: `${progress}%`, background: band.color }} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {bands.map((entry) => (
                      <span
                        key={entry.label}
                        title={`${entry.min}–${entry.max}: ${entry.guidance}`}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-[3px] text-[10px] font-semibold ${
                          entry.label === band.label ? "border-white/25 bg-white/[0.07] text-ink" : "border-line text-muted"
                        }`}
                      >
                        <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
                        {entry.label}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <p className="muted mt-3 text-[11.5px] leading-relaxed">{band.guidance}</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <MetricTile
                  label="Peak in window"
                  icon={<Activity className="h-3.5 w-3.5" />}
                  value={peak && peak.value !== null ? formatNumber(peak.value, 0) : "—"}
                  unit="index"
                  accent={peak ? aqiBand(peak.value, scale)?.color : undefined}
                  detail={peak ? `${peak.date} around ${peak.label}` : "No hourly index in this window"}
                  info={`Highest ${SCALE_LABELS[scale]} value in the hours shown below.`}
                />
                <MetricTile
                  label="Worst pollutant"
                  icon={<Atom className="h-3.5 w-3.5" />}
                  value={peakPollutant ? peakPollutant.symbol : "—"}
                  accent={peakPollutant?.color}
                  detail={
                    peakPollutant
                      ? `${formatNumber(peakPollutant.ratio * 100, 0)}% of the ${peakPollutant.referenceLabel}`
                      : "No pollutant values returned"
                  }
                  info="Measured against the WHO air quality guideline values for a 24-hour mean, except ozone which uses the 8-hour guideline."
                />
                <MetricTile
                  label="UV index"
                  icon={<Waves className="h-3.5 w-3.5" />}
                  value={uv ? formatNumber(readCurrent("uv_index"), 0) : "—"}
                  accent={uv ? TONE_COLORS[uv.tone] : undefined}
                  detail={uv ? uv.label : "Not returned for this location"}
                  info="UV index from the same CAMS model run as the air quality values."
                />
              </div>
            </div>
          )}
          <DataStamp lastUpdated={air.lastUpdated} stale={air.stale} refreshing={air.refreshing} staleLabel="Air quality reading is older than expected." />
          <SourceNote>
            {air.data.attribution} · current values timestamped{" "}
            {air.data.current?.time ? `${air.data.current.time} (${air.data.timezone})` : "not supplied"}
          </SourceNote>
        </Panel>
      </Reveal>

      <Reveal delay={0.06}>
        <Panel>
          <PanelHeader
            title="Pollutant breakdown"
            subtitle="Current concentrations against WHO guideline values."
            icon={<Gauge className="h-4 w-4" />}
          />
          {pollutants.length === 0 ? (
            <UnavailableState
              title="No pollutant values"
              message="The model did not return individual pollutant concentrations for these coordinates, so a breakdown cannot be drawn."
            />
          ) : (
            <div>
              <div className="h-[188px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pollutants.map((row) => ({ ...row, percent: Math.round(row.ratio * 100) }))} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid horizontal={false} stroke="rgba(159,184,221,0.12)" />
                    <XAxis
                      type="number"
                      tick={{ fill: "rgba(159,184,221,0.75)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      domain={[0, "dataMax + 20"]}
                      unit="%"
                    />
                    <YAxis
                      type="category"
                      dataKey="symbol"
                      width={52}
                      tick={{ fill: "rgba(200,214,235,0.85)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <ReferenceLine x={100} stroke="rgba(246,198,103,0.6)" strokeDasharray="3 3" />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.04)" }}
                      content={({ active, payload }) => {
                        const row = (payload?.[0]?.payload ?? null) as (PollutantRow & { percent?: number }) | null;
                        if (!active || !row) return null;
                        return (
                          <div className="rounded-xl border border-line bg-[rgba(9,14,25,0.97)] px-3 py-2 shadow-[var(--shadow-glow)]">
                            <p className="text-[11px] font-semibold text-ink">
                              {row.label} · {formatNumber(row.value, row.value < 10 ? 1 : 0)} {row.unit}
                            </p>
                            <p className="muted mt-1 text-[10.5px]">
                              {formatNumber(row.ratio * 100, 0)}% of the {row.referenceLabel} ({formatNumber(row.reference, 0)} {row.unit})
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="percent" name="Percent of guideline" radius={[0, 6, 6, 0]} maxBarSize={16} isAnimationActive={false}>
                      {pollutants.map((row) => (
                        <Cell key={row.key} fill={row.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 grid gap-2.5">
                {pollutants.map((row) => (
                  <div key={row.key}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[11.5px] font-semibold text-ink-soft" title={row.description}>
                        {row.symbol}
                        <span className="muted-dim ml-2 font-normal">{row.label}</span>
                      </span>
                      <span className="tnum text-[11.5px] font-semibold text-ink">
                        {formatNumber(row.value, row.value < 10 ? 1 : 0)}
                        <span className="muted ml-1 text-[10px] font-medium">{row.unit}</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
                      <div
                        className="h-full rounded-full transition-[width] duration-700"
                        style={{ width: `${Math.min(100, row.ratio * 100)}%`, background: row.color }}
                      />
                    </div>
                    <p className="muted-dim mt-1 text-[10px]">
                      {formatNumber(row.ratio * 100, 0)}% of the {row.referenceLabel}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <SourceNote>Guideline values are the WHO global air quality guidelines; concentrations come from the CAMS ensemble.</SourceNote>
        </Panel>
      </Reveal>

      <Reveal delay={0.1} className="lg:col-span-2">
        <Panel>
          <PanelHeader
            title="Index forecast"
            subtitle="Only the hours returned by the provider are charted; the solid line is the observed window and the dashed line is modelled forecast."
            icon={<Activity className="h-4 w-4" />}
            action={
              rangeOptions.length > 1 ? (
                <Segmented
                  value={range}
                  onChange={setRange}
                  size="sm"
                  ariaLabel="Air quality chart range"
                  options={rangeOptions.map((option) => ({ value: option, label: `${option}h`, title: `Show ${option} hours` }))}
                />
              ) : null
            }
          />
          {chartData.length === 0 ? (
            <UnavailableState
              title="No hourly index returned"
              message="The provider did not include hourly air quality values for these coordinates, so no forecast chart is available. Current values above are shown exactly as returned."
            />
          ) : (
            <div className="h-[248px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 8, right: 10, bottom: 0, left: -12 }}>
                  <defs>
                    <linearGradient id="aq-area" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={band?.color ?? "#79e4e8"} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={band?.color ?? "#79e4e8"} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(159,184,221,0.12)" />
                  <XAxis
                    dataKey="label"
                    interval={Math.max(0, Math.floor(chartData.length / 8) - 1)}
                    tick={{ fill: "rgba(159,184,221,0.75)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "rgba(159,184,221,0.75)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={38}
                    domain={["dataMin - 5", "dataMax + 5"]}
                  />
                  <Tooltip content={<AirTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name={SCALE_LABELS[scale]}
                    stroke="none"
                    fill="url(#aq-area)"
                    isAnimationActive={false}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="valueObs"
                    name="Observed"
                    stroke="#7ee0b0"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="valueFc"
                    name="Forecast"
                    stroke={band?.color ?? "#79e4e8"}
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={false}
                    isAnimationActive={false}
                    connectNulls={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="muted-dim mt-2 flex flex-wrap items-center gap-4 text-[10.5px]">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-[2px] w-5 rounded-full bg-[#7ee0b0]" /> Observed window
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-[2px] w-5 rounded-full border-t-2 border-dashed" style={{ borderColor: band?.color ?? "#79e4e8" }} /> Forecast
            </span>
            <span>Timestamps are local to {air.data.timezone}</span>
          </div>
        </Panel>
      </Reveal>

      <Reveal delay={0.14}>
        <Panel>
          <PanelHeader title="Model detail" subtitle="Extra variables returned by the same air quality request." icon={<Gauge className="h-4 w-4" />} />
          <div className="grid gap-3">
            <ProgressRow
              label="PM₂.₅ share of WHO guideline"
              value={readCurrent("pm2_5")}
              max={60}
              display={readCurrent("pm2_5") === null ? "—" : `${formatNumber((readCurrent("pm2_5") ?? 0) / 15 * 100, 0)}%`}
              color="#79e4e8"
              info="Current PM2.5 divided by the WHO 24-hour guideline of 15 µg/m³. The bar is capped at four times the guideline."
            />
            <MetricTile
              label="Dust"
              icon={<Atom className="h-3.5 w-3.5" />}
              value={dust === null ? "—" : formatNumber(dust, dust < 10 ? 1 : 0)}
              unit={dust === null ? undefined : "µg/m³"}
              detail={dust === null ? "Not returned" : "Desert dust fraction of particulate matter"}
              info="Desert dust concentration returned by the CAMS model."
            />
            <MetricTile
              label="Aerosol optical depth"
              icon={<Waves className="h-3.5 w-3.5" />}
              value={aerosol === null ? "—" : formatNumber(aerosol, 2)}
              detail={aerosol === null ? "Not returned" : "Column extinction of sunlight by aerosols"}
              info="A unitless measure of how much sunlight is blocked by airborne particles through the whole atmospheric column."
            />
            <MetricTile
              label="Ozone"
              icon={<Leaf className="h-3.5 w-3.5" />}
              value={readCurrent("ozone") === null ? "—" : formatNumber(readCurrent("ozone"), 0)}
              unit={readCurrent("ozone") === null ? undefined : "µg/m³"}
              detail="Ground-level ozone from the same model run"
              info="Ground-level ozone, which peaks on sunny afternoons when traffic and industrial emissions react in sunlight."
            />
          </div>
          <SourceNote>
            Values are model output on a grid, not measurements from a physical monitoring station. Local street-level conditions can differ.
          </SourceNote>
        </Panel>
      </Reveal>
    </div>
  );
}
