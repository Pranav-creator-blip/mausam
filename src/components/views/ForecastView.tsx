"use client";

import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarDays, CloudRain, Droplets, Eye, Gauge, Snowflake, Sun, Thermometer, Wind } from "lucide-react";
import { useDashboard } from "@/components/providers/DashboardProvider";
import { useUnits } from "@/components/providers/UnitsProvider";
import { Panel, PanelHeader, Reveal } from "@/components/ui/Card";
import { ErrorState, Skeleton, SourceNote } from "@/components/ui/States";
import { Segmented, Toggle } from "@/components/ui/Controls";
import { MetricTile, ProgressRow, SunArc, WindCompass } from "@/components/weather/Metrics";
import { WeatherIcon } from "@/components/weather/WeatherIcon";
import { currentHourIndex, precipitationType, type DayPoint, type HourPoint } from "@/lib/forecast";
import { dateLabel, dayLabel, durationLabel, hourLabel, isSameZoneDay, shortHourLabel } from "@/lib/time";
import { compassPoint, formatNumber, uvBand } from "@/lib/units";
import { conditionLabel, iconVariant } from "@/lib/wmo";

const TONE_COLORS: Record<string, string> = {
  emerald: "#7ee0b0",
  amber: "#f6c667",
  orange: "#f59e6b",
  rose: "#ff7a7a",
  violet: "#a597ff",
};

const snowDepth = (centimetres: number | null, imperial: boolean): number | null =>
  centimetres === null ? null : imperial ? centimetres * 0.393701 : centimetres;

type ChartPoint = {
  label: string;
  date: string;
  epoch: number | null;
  index: number;
  observed: boolean;
  temp: number | null;
  feels: number | null;
  pop: number | null;
  tempObs: number | null;
  tempFc: number | null;
  feelsObs: number | null;
  feelsFc: number | null;
};

function bridgeSeries(points: ChartPoint[]) {
  for (let i = 1; i < points.length; i += 1) {
    const previous = points[i - 1];
    const point = points[i];
    if (point.observed && !previous.observed) {
      previous.tempObs = point.tempObs;
      previous.feelsObs = point.feelsObs;
    }
    if (!point.observed && previous.observed) {
      previous.tempFc = point.tempFc;
      previous.feelsFc = point.feelsFc;
    }
  }
  return points;
}

function HourTooltip({
  active,
  payload,
  tempSymbol,
}: {
  active?: boolean;
  payload?: Array<{ payload?: ChartPoint }>;
  tempSymbol: string;
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="rounded-xl border border-line bg-[rgba(9,14,25,0.97)] px-3 py-2 shadow-[var(--shadow-glow)]">
      <p className="muted-dim text-[10px] font-semibold tracking-[0.12em] uppercase">
        {point.date} · {point.label}
      </p>
      <p className="tnum mt-1 text-sm font-semibold text-ink">
        {point.temp === null ? "—" : `${formatNumber(point.temp, 0)}${tempSymbol}`}
        <span className="muted ml-2 text-[11px] font-normal">
          feels {point.feels === null ? "—" : `${formatNumber(point.feels, 0)}${tempSymbol}`}
        </span>
      </p>
      <p className="muted mt-1 text-[11px]">
        Precipitation chance {point.pop === null ? "—" : `${formatNumber(point.pop, 0)}%`}
      </p>
      <p className={`mt-1 text-[10px] font-semibold tracking-[0.1em] uppercase ${point.observed ? "text-mint" : "text-cyan"}`}>
        {point.observed ? "Observed window" : "Forecast"}
      </p>
    </div>
  );
}

export function ForecastView() {
  const { weather, hours, days, timeZone, place } = useDashboard();
  const { units, convert, symbol } = useUnits();
  const tz = timeZone ?? undefined;

  const now = Date.now();
  const hourStart = currentHourIndex(hours, now);
  const forecastHourCount = hours.filter((hour) => hour.isForecast).length;

  const [range, setRange] = useState<"48" | "72">("48");
  const [showFeels, setShowFeels] = useState(true);
  const [showPop, setShowPop] = useState(true);
  const [selectedHourIndex, setSelectedHourIndex] = useState<number | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [dayRange, setDayRange] = useState<"7" | "14">("7");

  const rangeHours = useMemo(() => {
    const count = range === "48" ? 48 : 72;
    return hours.slice(hourStart, hourStart + count);
  }, [hours, hourStart, range]);

  const chartData = useMemo<ChartPoint[]>(() => {
    const points = rangeHours.map((hour) => {
      const temp = convert.temp(hour.temperature);
      const feels = convert.temp(hour.apparent);
      return {
        label: hourLabel(hour.epoch, tz, units.hour12),
        date: dateLabel(hour.epoch, tz),
        epoch: hour.epoch,
        index: hour.index,
        observed: !hour.isForecast,
        temp,
        feels,
        pop: hour.precipProbability,
        tempObs: hour.isForecast ? null : temp,
        tempFc: hour.isForecast ? temp : null,
        feelsObs: hour.isForecast ? null : feels,
        feelsFc: hour.isForecast ? feels : null,
      };
    });
    return bridgeSeries(points);
  }, [rangeHours, convert, tz, units.hour12]);

  const nowLabel = useMemo(() => {
    const observed = chartData.filter((point) => point.observed);
    return observed.length > 0 ? observed[observed.length - 1].label : chartData[0]?.label ?? null;
  }, [chartData]);

  const activeHour: HourPoint | null =
    selectedHourIndex !== null
      ? hours[selectedHourIndex] ?? null
      : rangeHours[0] ?? hours[hourStart] ?? null;

  const visibleDays = useMemo(
    () => days.slice(0, dayRange === "7" ? 7 : 14),
    [days, dayRange]
  );

  const activeDay: DayPoint | null =
    selectedDayIndex !== null ? days[selectedDayIndex] ?? null : visibleDays[0] ?? days[0] ?? null;

  const dayBounds = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const day of visibleDays) {
      const low = convert.temp(day.tempMin);
      const high = convert.temp(day.tempMax);
      if (low !== null) min = Math.min(min, low);
      if (high !== null) max = Math.max(max, high);
    }
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null;
    return { min, max };
  }, [visibleDays, convert]);

  if (weather.loading && !weather.data) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass rounded-[18px] p-5 lg:col-span-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-5 h-52 w-full" />
        </div>
        <div className="glass rounded-[18px] p-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-5 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-2/3" />
        </div>
      </div>
    );
  }

  if (weather.error && !weather.data) {
    return <ErrorState title="Forecast unavailable" message={weather.error} onRetry={weather.refresh} />;
  }

  if (hours.length === 0 || days.length === 0) {
    return (
      <ErrorState
        title="No forecast series returned"
        message="Open-Meteo answered without an hourly or daily series for these coordinates. Try refreshing or choosing a nearby place."
        onRetry={weather.refresh}
      />
    );
  }

  const uv = activeHour ? uvBand(activeHour.uvIndex) : null;
  const activeDayUv = activeDay ? uvBand(activeDay.uvMax) : null;
  const selectedDayIsToday = activeDay ? isSameZoneDay(activeDay.epoch ?? now, now, tz) : false;
  const daySunProgress =
    activeDay?.sunrise && activeDay?.sunset && activeDay.sunset > activeDay.sunrise && selectedDayIsToday
      ? (now - activeDay.sunrise) / (activeDay.sunset - activeDay.sunrise)
      : null;

  const chartInterval = Math.max(0, Math.floor(chartData.length / 8));

  const handleChartClick = (state: unknown) => {
    const next = state as { activeTooltipIndex?: number | string | null; activeLabel?: string | number | null };
    const index =
      typeof next.activeTooltipIndex === "number"
        ? next.activeTooltipIndex
        : chartData.findIndex((point) => point.label === next.activeLabel);
    if (index >= 0 && index < chartData.length) setSelectedHourIndex(chartData[index].index);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Reveal className="lg:col-span-2">
        <Panel>
          <PanelHeader
            title="Hourly outlook"
            icon={<Thermometer className="h-4 w-4" />}
            subtitle={`Temperature, feels-like and precipitation chance for ${place?.name ?? "this location"}, labelled in its own time zone.`}
            action={
              <Segmented
                ariaLabel="Hourly range"
                size="sm"
                value={range}
                onChange={(value) => setRange(value)}
                options={[
                  { value: "48", label: "48 h", title: "Next 48 hours" },
                  { value: "72", label: "72 h", title: "Next 72 hours" },
                ]}
              />
            }
          />
          {chartData.length === 0 ? (
            <p className="muted text-xs">The hourly series was not returned for this location.</p>
          ) : (
            <>
              <div className="h-[248px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chartData}
                    margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
                    onClick={handleChartClick as never}
                  >
                    <defs>
                      <linearGradient id="fx-pop" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#79e4e8" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#79e4e8" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(159,184,221,0.12)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      interval={chartInterval}
                      minTickGap={16}
                      tickMargin={8}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#8d9ab2", fontSize: 10 }}
                    />
                    <YAxis
                      yAxisId="temp"
                      width={36}
                      domain={["dataMin - 3", "dataMax + 3"]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#8d9ab2", fontSize: 10 }}
                      tickFormatter={(value: number) => `${Math.round(value)}°`}
                    />
                    <YAxis
                      yAxisId="pop"
                      orientation="right"
                      width={34}
                      domain={[0, 100]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#63708a", fontSize: 10 }}
                      tickFormatter={(value: number) => `${value}%`}
                    />
                    <Tooltip
                      cursor={{ stroke: "rgba(121,228,232,0.4)", strokeWidth: 1 }}
                      content={<HourTooltip tempSymbol={symbol.temp} />}
                    />
                    {showPop ? (
                      <Area
                        yAxisId="pop"
                        type="monotone"
                        dataKey="pop"
                        name="Precipitation chance"
                        stroke="#79e4e8"
                        strokeOpacity={0.7}
                        strokeWidth={1}
                        fill="url(#fx-pop)"
                        isAnimationActive={false}
                      />
                    ) : null}
                    {nowLabel ? (
                      <ReferenceLine
                        yAxisId="temp"
                        x={nowLabel}
                        stroke="rgba(126,224,176,0.65)"
                        strokeDasharray="3 3"
                        label={{ value: "now", position: "insideTopRight", fill: "#7ee0b0", fontSize: 10 }}
                      />
                    ) : null}
                    <Line
                      yAxisId="temp"
                      type="monotone"
                      dataKey="tempObs"
                      name="Observed"
                      stroke="#f2f6ff"
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                    <Line
                      yAxisId="temp"
                      type="monotone"
                      dataKey="tempFc"
                      name="Forecast"
                      stroke="#79e4e8"
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      dot={false}
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                    {showFeels ? (
                      <>
                        <Line
                          yAxisId="temp"
                          type="monotone"
                          dataKey="feelsObs"
                          name="Feels like (observed)"
                          stroke="#a597ff"
                          strokeWidth={1.4}
                          dot={false}
                          connectNulls={false}
                          isAnimationActive={false}
                        />
                        <Line
                          yAxisId="temp"
                          type="monotone"
                          dataKey="feelsFc"
                          name="Feels like (forecast)"
                          stroke="#a597ff"
                          strokeWidth={1.4}
                          strokeDasharray="4 4"
                          dot={false}
                          connectNulls={false}
                          isAnimationActive={false}
                        />
                      </>
                    ) : null}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10.5px]">
                <span className="inline-flex items-center gap-1.5 text-ink-soft">
                  <span className="h-[2px] w-5 rounded-full bg-[#f2f6ff]" /> Observed window
                </span>
                <span className="inline-flex items-center gap-1.5 text-ink-soft">
                  <span className="h-[2px] w-5 rounded-full bg-cyan" style={{ backgroundImage: "repeating-linear-gradient(90deg,#79e4e8 0 4px,transparent 4px 7px)" }} />{" "}
                  Forecast
                </span>
                <span className="inline-flex items-center gap-1.5 text-ink-soft">
                  <span className="h-[2px] w-5 rounded-full bg-[#a597ff]" /> Feels like
                </span>
                <span className="inline-flex items-center gap-1.5 text-ink-soft">
                  <span className="h-2 w-3 rounded-sm bg-cyan/35" /> Precipitation chance
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line/70 pt-3">
                <div className="flex flex-wrap gap-4">
                  <div className="w-[188px]">
                    <Toggle checked={showFeels} onChange={setShowFeels} label="Feels-like line" hint="Apparent temperature" />
                  </div>
                  <div className="w-[188px]">
                    <Toggle checked={showPop} onChange={setShowPop} label="Precipitation chance" hint="Hourly probability band" />
                  </div>
                </div>
                <p className="muted-dim text-[10.5px]">
                  Click or tap anywhere on the chart to inspect that hour.
                </p>
              </div>

              <SourceNote>
                Select a point on the chart to load it into the hour detail panel. Hours from the current one onward are forecast
                values; hours before it come from the provider&apos;s analysis window and are marked “Observed window”.{" "}
                {forecastHourCount < Number(range)
                  ? `Only ${forecastHourCount} forecast hours were returned, so the chart ends early.`
                  : `${forecastHourCount} forecast hours were returned by the provider.`}
              </SourceNote>
            </>
          )}
        </Panel>
      </Reveal>

      <Reveal delay={0.05}>
        <Panel className="h-full">
          <PanelHeader
            title="Hour detail"
            icon={<Droplets className="h-4 w-4" />}
            subtitle={
              activeHour
                ? `${dateLabel(activeHour.epoch, tz)} · ${hourLabel(activeHour.epoch, tz, units.hour12)} ${activeHour.isForecast ? "forecast" : "observed"}`
                : undefined
            }
            action={
              activeHour ? (
                <span
                  className={`rounded-full border px-2 py-[3px] text-[10px] font-semibold tracking-[0.1em] uppercase ${
                    activeHour.isForecast ? "border-cyan/35 bg-cyan/10 text-cyan" : "border-mint/35 bg-mint/10 text-mint"
                  }`}
                >
                  {activeHour.isForecast ? "Forecast" : "Observed"}
                </span>
              ) : null
            }
          />
          {!activeHour ? (
            <p className="muted text-xs">No hour is available to inspect.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <WeatherIcon
                  variant={iconVariant(activeHour.weatherCode, isDayAt(activeHour.epoch, activeDay))}
                  size={46}
                  animate={false}
                />
                <div className="min-w-0">
                  <p className="tnum text-[26px] leading-none font-semibold text-ink">
                    {formatNumber(convert.temp(activeHour.temperature), 0)}
                    <span className="text-sm font-medium text-ink-soft">{symbol.temp}</span>
                  </p>
                  <p className="muted mt-1 text-[11px]">{conditionLabel(activeHour.weatherCode)}</p>
                </div>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <MetricTile
                  label="Feels like"
                  icon={<Thermometer className="h-3.5 w-3.5" />}
                  value={formatNumber(convert.temp(activeHour.apparent), 0)}
                  unit={symbol.temp}
                  info="Apparent temperature combines wind chill, humidity and solar radiation as modelled for this hour."
                />
                <MetricTile
                  label="Precip. chance"
                  icon={<CloudRain className="h-3.5 w-3.5" />}
                  value={formatNumber(activeHour.precipProbability, 0)}
                  unit="%"
                  info="Probability that measurable precipitation falls at this location during the hour."
                />
                <MetricTile
                  label="Precipitation"
                  icon={<CloudRain className="h-3.5 w-3.5" />}
                  value={formatNumber(convert.precip(activeHour.precipitation), units.precipitation === "in" ? 2 : 1)}
                  unit={symbol.precip}
                  detail={precipitationType(activeHour.weatherCode, activeHour.snowfall, activeHour.showers, activeHour.rain)}
                  info="Rain, showers and the water equivalent of snowfall combined for the hour."
                />
                <MetricTile
                  label="Humidity"
                  icon={<Droplets className="h-3.5 w-3.5" />}
                  value={formatNumber(activeHour.humidity, 0)}
                  unit="%"
                />
                <MetricTile
                  label="UV index"
                  icon={<Sun className="h-3.5 w-3.5" />}
                  value={formatNumber(activeHour.uvIndex, 1)}
                  detail={uv ? uv.label : "Not reported"}
                  accent={uv ? TONE_COLORS[uv.tone] : undefined}
                />
                <MetricTile
                  label="Cloud cover"
                  icon={<CloudRain className="h-3.5 w-3.5" />}
                  value={formatNumber(activeHour.cloudCover, 0)}
                  unit="%"
                />
                <MetricTile
                  label="Visibility"
                  icon={<Eye className="h-3.5 w-3.5" />}
                  value={formatNumber(activeHour.visibility === null ? null : convert.distance(activeHour.visibility / 1000), units.distance === "mi" ? 1 : 0)}
                  unit={symbol.distance}
                />
                <MetricTile
                  label="Pressure"
                  icon={<Gauge className="h-3.5 w-3.5" />}
                  value={formatNumber(convert.pressure(activeHour.pressure), units.pressure === "inhg" ? 2 : 0)}
                  unit={symbol.pressure}
                />
              </div>
              <WindCompass
                direction={activeHour.windDirection}
                label={compassPoint(activeHour.windDirection)}
                speedLabel={formatNumber(convert.wind(activeHour.windSpeed), 0)}
                gustLabel={activeHour.windGust !== null ? formatNumber(convert.wind(activeHour.windGust), 0) : null}
                unit={symbol.wind}
              />
              {activeHour.snowfall !== null && activeHour.snowfall > 0 ? (
                <MetricTile
                  label="Snowfall"
                  icon={<Snowflake className="h-3.5 w-3.5" />}
                  value={formatNumber(snowDepth(activeHour.snowfall, units.precipitation === "in"), units.precipitation === "in" ? 2 : 1)}
                  unit={units.precipitation === "in" ? "in" : "cm"}
                  info="Snowfall depth reported by the provider for this hour, converted from centimetres."
                />
              ) : null}
            </div>
          )}
        </Panel>
      </Reveal>

      <Reveal delay={0.08} className="lg:col-span-3">
        <Panel>
          <PanelHeader
            title="Hour by hour"
            icon={<Wind className="h-4 w-4" />}
            subtitle="Every returned hour for the selected range. Choose one to load it into the detail panel above."
          />
          <div className="scroll-thin -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {rangeHours.map((hour, position) => {
              const isActive = activeHour?.iso === hour.iso;
              return (
                <button
                  key={hour.iso}
                  type="button"
                  onClick={() => setSelectedHourIndex(hour.index)}
                  aria-pressed={isActive}
                  title={`${dateLabel(hour.epoch, tz)} ${hourLabel(hour.epoch, tz, units.hour12)} — ${conditionLabel(hour.weatherCode)}`}
                  className={`focus-ring glass-soft flex w-[84px] shrink-0 flex-col items-center gap-1.5 rounded-2xl px-2 py-3 transition ${
                    isActive ? "border-cyan/45 bg-cyan/[0.08]" : "hover:border-cyan/25"
                  }`}
                >
                  <span className={`text-[10px] font-semibold tracking-[0.06em] uppercase ${hour.isForecast ? "text-cyan" : "text-mint"}`}>
                    {position === 0 ? "Now" : shortHourLabel(hour.epoch, tz, units.hour12)}
                  </span>
                  <WeatherIcon variant={iconVariant(hour.weatherCode, isDayAt(hour.epoch, activeDay))} size={28} animate={false} />
                  <span className="tnum text-sm font-semibold text-ink">{formatNumber(convert.temp(hour.temperature), 0)}°</span>
                  <span className="tnum muted-dim text-[10px]">
                    {hour.precipProbability === null ? "—" : `${formatNumber(hour.precipProbability, 0)}%`}
                  </span>
                </button>
              );
            })}
          </div>
          <SourceNote>
            Day and night icons use the sunrise and sunset of the selected day. Times are rendered with the {timeZone ?? "location"}{" "}
            zone returned by Open-Meteo.
          </SourceNote>
        </Panel>
      </Reveal>

      <Reveal delay={0.11} className="lg:col-span-2">
        <Panel>
          <PanelHeader
            title="Daily forecast"
            icon={<CalendarDays className="h-4 w-4" />}
            subtitle={`${days.length} days returned for these coordinates.`}
            action={
              days.length > 7 ? (
                <Segmented
                  ariaLabel="Daily range"
                  size="sm"
                  value={dayRange}
                  onChange={(value) => setDayRange(value)}
                  options={[
                    { value: "7", label: "7 days" },
                    { value: "14", label: "14 days" },
                  ]}
                />
              ) : null
            }
          />
          <ul className="divide-line/70 divide-y">
            {visibleDays.map((day) => {
              const low = convert.temp(day.tempMin);
              const high = convert.temp(day.tempMax);
              const isActive = activeDay?.iso === day.iso;
              const left = dayBounds && low !== null ? ((low - dayBounds.min) / (dayBounds.max - dayBounds.min)) * 100 : 0;
              const width =
                dayBounds && low !== null && high !== null
                  ? Math.max(4, ((high - low) / (dayBounds.max - dayBounds.min)) * 100)
                  : 0;
              return (
                <li key={day.iso}>
                  <button
                    type="button"
                    onClick={() => setSelectedDayIndex(day.index)}
                    aria-pressed={isActive}
                    className={`focus-ring flex w-full items-center gap-3 rounded-xl px-1 py-2.5 text-left transition ${
                      isActive ? "bg-cyan/[0.07]" : "hover:bg-white/[0.03]"
                    }`}
                  >
                    <span className="w-[68px] shrink-0 text-xs font-semibold text-ink-soft">
                      {isSameZoneDay(day.epoch ?? now, now, tz) ? "Today" : dayLabel(day.epoch, tz, "short")}
                      <span className="muted-dim block text-[10px] font-normal">{dateLabel(day.epoch, tz)}</span>
                    </span>
                    <WeatherIcon variant={iconVariant(day.weatherCode, true)} size={28} animate={false} />
                    <span className="tnum muted w-[38px] shrink-0 text-right text-[11px]">{formatNumber(low, 0)}°</span>
                    <span className="relative hidden h-1.5 min-w-0 flex-1 rounded-full bg-white/[0.06] sm:block">
                      {dayBounds ? (
                        <span
                          className="absolute inset-y-0 rounded-full"
                          style={{
                            left: `${left}%`,
                            width: `${width}%`,
                            background: "linear-gradient(90deg,#7fb4ff,#79e4e8,#f6c667)",
                          }}
                        />
                      ) : null}
                    </span>
                    <span className="tnum w-[38px] shrink-0 text-right text-[11px] font-semibold text-ink">{formatNumber(high, 0)}°</span>
                    <span className="tnum muted-dim w-[36px] shrink-0 text-right text-[10.5px]">
                      {day.precipProbabilityMax === null ? "—" : `${formatNumber(day.precipProbabilityMax, 0)}%`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <SourceNote>
            Highs, lows and precipitation chance as returned by Open-Meteo for the whole local day at this location.
          </SourceNote>
        </Panel>
      </Reveal>

      <Reveal delay={0.14}>
        <Panel className="h-full">
          <PanelHeader
            title="Day detail"
            icon={<Sun className="h-4 w-4" />}
            subtitle={activeDay ? `${dayLabel(activeDay.epoch, tz, "long")} · ${dateLabel(activeDay.epoch, tz)}` : undefined}
            action={
              <span className="rounded-full border border-cyan/35 bg-cyan/10 px-2 py-[3px] text-[10px] font-semibold tracking-[0.1em] text-cyan uppercase">
                Forecast
              </span>
            }
          />
          {!activeDay ? (
            <p className="muted text-xs">No day is available to inspect.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <WeatherIcon variant={iconVariant(activeDay.weatherCode, true)} size={46} animate={false} />
                <div className="min-w-0">
                  <p className="tnum text-[24px] leading-none font-semibold text-ink">
                    {formatNumber(convert.temp(activeDay.tempMax), 0)}°
                    <span className="muted text-base"> / {formatNumber(convert.temp(activeDay.tempMin), 0)}°</span>
                  </p>
                  <p className="muted mt-1 text-[11px]">{conditionLabel(activeDay.weatherCode)}</p>
                </div>
              </div>
              <ProgressRow
                label="Precipitation chance"
                value={activeDay.precipProbabilityMax}
                max={100}
                display={activeDay.precipProbabilityMax === null ? "—" : `${formatNumber(activeDay.precipProbabilityMax, 0)}%`}
                color="linear-gradient(90deg,#7fb4ff,#79e4e8)"
                info="Highest hourly precipitation probability returned for this local day."
              />
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <MetricTile
                  label="Total precipitation"
                  icon={<CloudRain className="h-3.5 w-3.5" />}
                  value={formatNumber(convert.precip(activeDay.precipitationSum), units.precipitation === "in" ? 2 : 1)}
                  unit={symbol.precip}
                  detail={`Rain ${formatNumber(convert.precip(activeDay.rainSum), units.precipitation === "in" ? 2 : 1)} · Showers ${formatNumber(convert.precip(activeDay.showersSum), units.precipitation === "in" ? 2 : 1)}`}
                />
                <MetricTile
                  label="Feels-like range"
                  icon={<Thermometer className="h-3.5 w-3.5" />}
                  value={`${formatNumber(convert.temp(activeDay.apparentMax), 0)}° / ${formatNumber(convert.temp(activeDay.apparentMin), 0)}°`}
                />
                <MetricTile
                  label="UV index max"
                  icon={<Sun className="h-3.5 w-3.5" />}
                  value={formatNumber(activeDay.uvMax, 1)}
                  detail={activeDayUv ? activeDayUv.label : "Not reported"}
                  accent={activeDayUv ? TONE_COLORS[activeDayUv.tone] : undefined}
                />
                <MetricTile
                  label="Daylight"
                  icon={<Sun className="h-3.5 w-3.5" />}
                  value={durationLabel(activeDay.daylightSeconds)}
                />
                <MetricTile
                  label="Wind max"
                  icon={<Wind className="h-3.5 w-3.5" />}
                  value={formatNumber(convert.wind(activeDay.windMax), 0)}
                  unit={symbol.wind}
                  detail={`Gusts ${formatNumber(convert.wind(activeDay.gustMax), 0)} ${symbol.wind}`}
                />
                <MetricTile
                  label="Dominant wind"
                  icon={<Wind className="h-3.5 w-3.5" />}
                  value={compassPoint(activeDay.windDirection)}
                  unit={activeDay.windDirection === null ? undefined : `${Math.round(activeDay.windDirection)}°`}
                />
              </div>
              {activeDay.snowfallSum !== null && activeDay.snowfallSum > 0 ? (
                <MetricTile
                  label="Snowfall"
                  icon={<Snowflake className="h-3.5 w-3.5" />}
                  value={formatNumber(snowDepth(activeDay.snowfallSum, units.precipitation === "in"), units.precipitation === "in" ? 2 : 1)}
                  unit={units.precipitation === "in" ? "in" : "cm"}
                />
              ) : null}
              {activeDay.sunrise && activeDay.sunset ? (
                <SunArc
                  sunrise={hourLabel(activeDay.sunrise, tz, units.hour12)}
                  sunset={hourLabel(activeDay.sunset, tz, units.hour12)}
                  now={hourLabel(now, tz, units.hour12)}
                  progress={daySunProgress}
                  lockedLabel="Progress along the arc is only drawn for today; sunrise and sunset are shown for the selected date."
                />
              ) : (
                <p className="muted text-xs">No sunrise or sunset was returned for this date.</p>
              )}
            </div>
          )}
        </Panel>
      </Reveal>
    </div>
  );
}

function isDayAt(epoch: number | null, day: DayPoint | null): boolean {
  if (epoch === null || !day?.sunrise || !day?.sunset) return true;
  return epoch >= day.sunrise && epoch <= day.sunset;
}
