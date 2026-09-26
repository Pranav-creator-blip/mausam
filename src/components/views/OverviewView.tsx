"use client";

import {
  ArrowRight,
  Cloud,
  CloudRain,
  Compass,
  Droplets,
  Eye,
  Gauge,
  Sun,
  Sunrise,
  Thermometer,
  Wind,
} from "lucide-react";
import { useAlertPreferences } from "@/components/providers/AlertPreferencesProvider";
import { useDashboard } from "@/components/providers/DashboardProvider";
import { useUnits } from "@/components/providers/UnitsProvider";
import { Button } from "@/components/ui/Button";
import { Panel, PanelHeader, Reveal } from "@/components/ui/Card";
import { ErrorState, Skeleton, SourceNote } from "@/components/ui/States";
import { MetricTile, ProgressRow, SunArc, WindCompass } from "@/components/weather/Metrics";
import { WeatherIcon } from "@/components/weather/WeatherIcon";
import { aqiBand, aqiProgress } from "@/lib/aqi";
import { peakIndex, precipitationType, currentHourIndex } from "@/lib/forecast";
import { dayLabel, dateLabel, durationLabel, hourLabel, isSameZoneDay, shortHourLabel } from "@/lib/time";
import { beaufort, compassPoint, formatNumber, humidityBand, uvBand, visibilityBand } from "@/lib/units";
import { conditionLabel, iconVariant } from "@/lib/wmo";
import { getRainAlertSummary } from "@/lib/weather-alerts";

const TONE_COLORS: Record<string, string> = {
  emerald: "#7ee0b0",
  amber: "#f6c667",
  orange: "#f59e6b",
  rose: "#ff7a7a",
  violet: "#a597ff",
};

export function OverviewView() {
  const { weather, air, alerts, current, hours, days, timeZone, place, setView } = useDashboard();
  const { prefs, history } = useAlertPreferences();
  const { units, convert, symbol } = useUnits();

  if (weather.loading && !weather.data) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass rounded-[18px] p-5 lg:col-span-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-6 h-16 w-56" />
          <Skeleton className="mt-6 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-3/4" />
        </div>
        <div className="glass rounded-[18px] p-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-4 h-40 w-full" />
        </div>
      </div>
    );
  }

  if (weather.error && !weather.data) {
    return <ErrorState title="Weather data unavailable" message={weather.error} onRetry={weather.refresh} />;
  }

  if (!current || !place) {
    return (
      <ErrorState
        title="No observation returned"
        message="Open-Meteo responded without a current observation for these coordinates. Try refreshing or selecting a nearby place."
        onRetry={weather.refresh}
      />
    );
  }

  const now = Date.now();
  const today = days.find((day) => day.epoch !== null && isSameZoneDay(day.epoch, now, timeZone ?? undefined)) ?? days[0] ?? null;
  const hourStart = currentHourIndex(hours, now);
  const next24 = hours.slice(hourStart, hourStart + 24);
  const next3h = hours.slice(hourStart, hourStart + 3);
  const next3Precip = next3h.reduce((total, hour) => total + (hour.precipitation ?? 0), 0);
  const next3Snow = next3h.reduce((total, hour) => total + (hour.snowfall ?? 0), 0);
  const next3Showers = next3h.reduce((total, hour) => total + (hour.showers ?? 0), 0);
  const next3Rain = next3h.reduce((total, hour) => total + (hour.rain ?? 0), 0);
  const hasNext3Data = next3h.length > 0;
  const uv = uvBand(current.uvIndex);
  const wind = beaufort(current.windSpeed);
  const visibility = current.visibility !== null ? convert.distance(current.visibility / 1000) : null;
  const peakUvDay = days.length ? days[peakIndex(days.map((day) => day.uvMax ?? null)) ?? 0] : null;

  const sunProgress =
    today?.sunrise && today?.sunset && today.sunset > today.sunrise
      ? (now - today.sunrise) / (today.sunset - today.sunrise)
      : null;

  const airCurrent = air.data?.current ?? null;
  const airBand = aqiBand(airCurrent?.european_aqi ?? null, "european");
  const airProgress = airCurrent?.european_aqi != null ? aqiProgress(airCurrent.european_aqi, "european") : null;
  const topAlert = alerts.data?.alerts?.[0] ?? null;
  const rainSummary = getRainAlertSummary(hours, now, prefs.rainThreshold);
  const currentWeatherCode = current.weatherCode ?? -1;
  const currentPrecipitation = current.precipitation ?? 0;
  const weatherStatus = [
    { label: "Clear", active: currentWeatherCode >= 0 && currentWeatherCode <= 2, tone: "cyan" },
    { label: "Cloudy", active: currentWeatherCode >= 3 && currentWeatherCode <= 48, tone: "iris" },
    { label: "Rain", active: currentWeatherCode >= 51 || currentPrecipitation > 0, tone: "cyan" },
    { label: "Thunderstorm", active: currentWeatherCode >= 95, tone: "coral" },
    { label: "Fog", active: current.visibility !== null && current.visibility < 1000, tone: "amber" },
    { label: "Windy", active: (current.windSpeed ?? 0) > 25, tone: "mint" },
    { label: "Hot", active: (current.temperature ?? 0) >= 30, tone: "coral" },
    { label: "Cold", active: (current.temperature ?? 0) <= 5, tone: "amber" },
  ];

  const temp = convert.temp(current.temperature);
  const high = today ? convert.temp(today.tempMax) : null;
  const low = today ? convert.temp(today.tempMin) : null;
  const feels = convert.temp(current.apparent);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Reveal className="lg:col-span-2">
        <Panel className="relative overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="muted-dim text-[10px] font-semibold tracking-[0.16em] uppercase">Observed now</span>
                <span className="rounded-full border border-cyan/30 bg-cyan/10 px-2 py-[2px] text-[10px] font-semibold text-cyan">
                  {current.iso ? hourLabel(current.epoch, timeZone ?? undefined, units.hour12) : "—"}
                </span>
                <span className="muted-dim text-[10px]">{isSameZoneDay(current.epoch ?? now, now, timeZone ?? undefined) ? "today" : "latest reading"}</span>
              </div>
              <div className="mt-3 flex items-end gap-4">
                <WeatherIcon variant={iconVariant(current.weatherCode, current.isDay)} size={92} className="shrink-0" />
                <div className="min-w-0">
                  <p className="flex items-baseline gap-1">
                    <span className="tnum text-[52px] leading-none font-semibold tracking-tight text-ink">
                      {formatNumber(temp, 0)}
                    </span>
                    <span className="text-lg font-medium text-ink-soft">{symbol.temp}</span>
                  </p>
                  <p className="mt-1.5 text-sm font-semibold text-ink-soft">{conditionLabel(current.weatherCode)}</p>
                  <p className="muted mt-1 text-xs">
                    Feels like {formatNumber(feels, 0)}
                    {symbol.temp}
                    {high !== null && low !== null ? ` · Today ${formatNumber(high, 0)}° / ${formatNumber(low, 0)}°` : ""}
                  </p>
                </div>
              </div>
            </div>
            <div className="w-full max-w-[240px] sm:w-auto">
              <div className="glass-soft rounded-2xl px-3.5 py-3">
                <p className="muted-dim text-[10px] font-semibold tracking-[0.14em] uppercase">Next 3 hours</p>
                {hasNext3Data ? (
                  <>
                    <p className="tnum mt-1.5 text-lg leading-none font-semibold text-ink">
                      {formatNumber(convert.precip(next3Precip), units.precipitation === "in" ? 2 : 1)} {symbol.precip}
                    </p>
                    <p className="muted-dim mt-1.5 text-[11px] leading-snug">
                      {next3Precip > 0 || next3Snow > 0
                        ? `${precipitationType(
                            next3h[0]?.weatherCode ?? null,
                            next3Snow,
                            next3Showers,
                            next3Rain
                          )} expected · peak chance ${formatNumber(
                            Math.max(...next3h.map((hour) => hour.precipProbability ?? 0)),
                            0
                          )}%`
                        : "No measurable precipitation signalled"}
                    </p>
                  </>
                ) : (
                  <p className="muted mt-1.5 text-xs">Hourly series not returned for this location.</p>
                )}
              </div>
              {high !== null && low !== null ? (
                <div className="mt-2">
                  <ProgressRow
                    label="Today's range"
                    value={temp}
                    max={Math.max(high, low, temp ?? 0) + 2}
                    display={`${formatNumber(low, 0)}° – ${formatNumber(high, 0)}°`}
                    color="linear-gradient(90deg,#7fb4ff,#79e4e8,#f6c667)"
                    info="The bar compares the current temperature with today's forecast minimum and maximum for this exact location."
                  />
                </div>
              ) : null}
            </div>
          </div>
        </Panel>
      </Reveal>

      <Reveal delay={0.05}>
        <Panel>
          <PanelHeader
            title="Rain alert"
            icon={<CloudRain className="h-4 w-4" />}
            subtitle="Rain risk modelled from the next few hours of the forecast."
          />
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-cyan/35 bg-cyan/10 px-3 py-2">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.14em] text-cyan uppercase">Status</p>
                <p className="mt-1 text-sm font-semibold text-ink">{rainSummary.alertMessage}</p>
              </div>
              <span className="tnum rounded-full border border-cyan/50 bg-white/[0.04] px-2 py-1 text-[11px] font-semibold text-cyan">
                {rainSummary.maxProbability}%
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="glass-soft rounded-2xl px-2.5 py-2">
                <p className="muted-dim text-[10px] font-semibold tracking-[0.1em] uppercase">Next rain</p>
                <p className="tnum mt-1 text-sm font-semibold text-ink">
                  {rainSummary.nextRainMinutes === null ? "—" : `${rainSummary.nextRainMinutes} min`}
                </p>
              </div>
              <div className="glass-soft rounded-2xl px-2.5 py-2">
                <p className="muted-dim text-[10px] font-semibold tracking-[0.1em] uppercase">Today</p>
                <p className="mt-1 text-sm font-semibold text-ink">{rainSummary.rainExpectedToday ? "Yes" : "No"}</p>
              </div>
              <div className="glass-soft rounded-2xl px-2.5 py-2">
                <p className="muted-dim text-[10px] font-semibold tracking-[0.1em] uppercase">Heavy rain</p>
                <p className="mt-1 text-sm font-semibold text-ink">{rainSummary.heavyRainPossible ? "Possible" : "Unlikely"}</p>
              </div>
            </div>
          </div>
          <SourceNote>
            Threshold: {prefs.rainThreshold}% · expected rainfall in the next 24 hours: {formatNumber(rainSummary.expectedRainMm, 1)} {symbol.precip}
          </SourceNote>
        </Panel>
      </Reveal>

      <Reveal delay={0.08}>
        <Panel>
          <PanelHeader
            title="Sun cycle"
            icon={<Sunrise className="h-4 w-4" />}
            subtitle={today ? `${dayLabel(today.epoch, timeZone ?? undefined, "long")} · ${dateLabel(today.epoch, timeZone ?? undefined)}` : undefined}
          />
          {today?.sunrise && today?.sunset ? (
            <>
              <SunArc
                sunrise={hourLabel(today.sunrise, timeZone ?? undefined, units.hour12)}
                sunset={hourLabel(today.sunset, timeZone ?? undefined, units.hour12)}
                now={hourLabel(now, timeZone ?? undefined, units.hour12)}
                progress={sunProgress}
                lockedLabel="Daylight progress needs both sunrise and sunset for today."
              />
              <p className="muted-dim mt-2 text-center text-[10.5px]">
                Daylight {durationLabel(today.daylightSeconds)}
                {peakUvDay?.uvMax != null ? ` · peak UV this week ${formatNumber(peakUvDay.uvMax, 1)}` : ""}
              </p>
            </>
          ) : (
            <p className="muted text-xs">No sunrise or sunset was returned for this location and date.</p>
          )}
        </Panel>
      </Reveal>

      <Reveal delay={0.11} className="lg:col-span-2">
        <Panel>
          <PanelHeader
            title="Atmospheric detail"
            icon={<Thermometer className="h-4 w-4" />}
            subtitle="Every value is the observed current reading from the Open-Meteo forecast endpoint, converted to your selected units."
          />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <MetricTile
              label="Humidity"
              icon={<Droplets className="h-3.5 w-3.5" />}
              value={formatNumber(current.humidity, 0)}
              unit="%"
              detail={humidityBand(current.humidity) ?? undefined}
              info="Relative humidity of the air at 2 metres above ground from the current observation."
            />
            <MetricTile
              label="Pressure"
              icon={<Gauge className="h-3.5 w-3.5" />}
              value={formatNumber(convert.pressure(current.pressure), units.pressure === "inhg" ? 2 : 0)}
              unit={symbol.pressure}
              detail={current.surfacePressure !== null ? `Surface ${formatNumber(convert.pressure(current.surfacePressure), units.pressure === "inhg" ? 2 : 0)} ${symbol.pressure}` : undefined}
              info="Mean sea level pressure is used for comparison between locations; surface pressure is the actual pressure at this elevation."
            />
            <MetricTile
              label="Cloud cover"
              icon={<Cloud className="h-3.5 w-3.5" />}
              value={formatNumber(current.cloudCover, 0)}
              unit="%"
              detail={current.cloudCover !== null ? (current.cloudCover > 80 ? "Overcast" : current.cloudCover > 40 ? "Broken cloud" : current.cloudCover > 10 ? "Scattered" : "Mostly clear") : undefined}
              info="Total cloud cover fraction in the current hour."
            />
            <MetricTile
              label="UV index"
              icon={<Sun className="h-3.5 w-3.5" />}
              value={formatNumber(current.uvIndex, 1)}
              detail={uv ? `${uv.label} exposure band` : "Not reported for this hour"}
              accent={uv ? TONE_COLORS[uv.tone] : undefined}
              info="UV index comes from the same Open-Meteo hourly model that drives the forecast charts; it is reported as-is with no interpolation."
            />
            <MetricTile
              label="Precipitation"
              icon={<CloudRain className="h-3.5 w-3.5" />}
              value={formatNumber(convert.precip(current.precipitation), units.precipitation === "in" ? 2 : 1)}
              unit={symbol.precip}
              detail={`${precipitationType(current.weatherCode, current.snowfall, current.showers, current.rain)} in the current hour`}
              info="Total precipitation (rain, showers and snowfall water equivalent) for the current hour."
            />
            <MetricTile
              label="Visibility"
              icon={<Eye className="h-3.5 w-3.5" />}
              value={formatNumber(visibility, units.distance === "mi" ? 1 : 0)}
              unit={symbol.distance}
              detail={visibilityBand(current.visibility === null ? null : current.visibility / 1000) ?? "Not reported"}
              info="Visibility at ground level as modelled for this hour."
            />
            <MetricTile
              label="Dew point"
              icon={<Thermometer className="h-3.5 w-3.5" />}
              value={formatNumber(convert.temp(current.dewPoint), 0)}
              unit={symbol.temp}
              detail={current.dewPoint !== null ? (current.dewPoint >= 20 ? "Muggy air" : current.dewPoint >= 12 ? "Comfortable moisture" : "Dry air") : undefined}
              info="The temperature at which air would saturate. Values above roughly 20 °C feel humid."
            />
            <WindCompass
              direction={current.windDirection}
              label={compassPoint(current.windDirection)}
              speedLabel={formatNumber(convert.wind(current.windSpeed), 0)}
              gustLabel={current.windGust !== null ? formatNumber(convert.wind(current.windGust), 0) : null}
              unit={symbol.wind}
            />
            <MetricTile
              label="Wind character"
              icon={<Compass className="h-3.5 w-3.5" />}
              value={wind ? String(wind.force) : "—"}
              unit="Bft"
              detail={wind ? `${wind.label} on the Beaufort scale` : undefined}
              info="The Beaufort force is derived from the measured wind speed, which stays in km/h from Open-Meteo and is converted for display only."
            />
          </div>
          <SourceNote>{weather.data?.attribution}</SourceNote>
        </Panel>
      </Reveal>

      <Reveal delay={0.11}>
        <Panel>
          <PanelHeader title="Weather status" icon={<CloudRain className="h-4 w-4" />} subtitle="Quick status summary for this place." />
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {weatherStatus.map((status) => (
              <div
                key={status.label}
                className={`rounded-2xl border px-2.5 py-2 text-left transition ${
                  status.active
                    ? "border-cyan/35 bg-cyan/10 text-cyan"
                    : "border-line bg-white/[0.02] text-ink-soft"
                }`}
              >
                <p className="text-[10px] font-semibold tracking-[0.1em] uppercase">{status.label}</p>
                <p className="mt-1 text-[11px] font-medium">{status.active ? "Active" : "Not active"}</p>
              </div>
            ))}
          </div>
        </Panel>
      </Reveal>

      <Reveal delay={0.14}>
        <Panel>
          <PanelHeader
            title="Air quality"
            icon={<Wind className="h-4 w-4" />}
            subtitle="European AQI from the Open-Meteo air quality endpoint."
            action={
              <Button variant="ghost" onClick={() => setView("air")} title="Open the air quality section">
                Details <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            }
          />
          {air.loading && !air.data ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ) : air.error && !air.data ? (
            <ErrorState compact title="Air quality unavailable" message={air.error} onRetry={air.refresh} />
          ) : airBand ? (
            <div>
              <div className="flex items-end gap-3">
                <p className="tnum text-[38px] leading-none font-semibold" style={{ color: airBand.color }}>
                  {formatNumber(airCurrent?.european_aqi, 0)}
                </p>
                <div className="pb-1">
                  <p className="text-sm font-semibold" style={{ color: airBand.color }}>
                    {airBand.label}
                  </p>
                  <p className="muted-dim text-[10.5px]">European AQI</p>
                </div>
              </div>
              {airProgress !== null ? (
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
                  <div className="h-full rounded-full" style={{ width: `${airProgress}%`, background: airBand.color }} />
                </div>
              ) : null}
              <p className="muted mt-3 text-[11px] leading-relaxed">{airBand.guidance}</p>
            </div>
          ) : (
            <p className="muted text-xs">No AQI value was returned for these coordinates.</p>
          )}
          <SourceNote>{air.data?.attribution ?? "Air quality data by Open-Meteo (CAMS ensemble)."}</SourceNote>
        </Panel>
      </Reveal>

      <Reveal delay={0.17} className="lg:col-span-3">
        <Panel>
          <PanelHeader title="Alert history" icon={<CloudRain className="h-4 w-4" />} subtitle="Recent rain and weather notifications for this browser." />
          {history.length === 0 ? (
            <p className="muted text-xs">No alerts have been generated yet. The app stores recent notifications locally on this device.</p>
          ) : (
            <div className="grid gap-2">
              {history.slice(0, 5).map((entry) => (
                <div key={entry.id} className="flex items-start justify-between gap-3 rounded-2xl border border-line bg-white/[0.02] px-3 py-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-soft">{entry.type.replace("-", " ")}</p>
                    <p className="mt-1 text-xs text-ink-soft">{entry.message}</p>
                  </div>
                  <div className="text-right">
                    <p className="tnum text-[10px] text-muted">{entry.date}</p>
                    <p className="tnum text-[10px] text-muted">{entry.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </Reveal>

      <Reveal delay={0.20} className="lg:col-span-3">
        <Panel>
          <PanelHeader
            title="Next 24 hours"
            icon={<Wind className="h-4 w-4" />}
            subtitle="Hours are labelled in the location's own time zone. The first card is the hour containing local now."
          />
          {next24.length === 0 ? (
            <p className="muted text-xs">The hourly series was not returned for this location.</p>
          ) : (
            <div className="scroll-thin -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1">
              {next24.map((hour, index) => (
                <div
                  key={hour.iso}
                  className={`glass-soft flex w-[86px] shrink-0 flex-col items-center gap-1.5 rounded-2xl px-2 py-3 ${
                    index === 0 ? "border-cyan/35" : ""
                  }`}
                >
                  <span className="muted-dim text-[10px] font-semibold tracking-[0.08em] uppercase">
                    {index === 0 ? "Now" : shortHourLabel(hour.epoch, timeZone ?? undefined, units.hour12)}
                  </span>
                  <WeatherIcon variant={iconVariant(hour.weatherCode, isDayAt(hour.epoch, today))} size={30} animate={index === 0} />
                  <span className="tnum text-sm font-semibold text-ink">{formatNumber(convert.temp(hour.temperature), 0)}°</span>
                  <span className="tnum muted-dim text-[10px]">
                    {hour.precipProbability === null ? "—" : `${formatNumber(hour.precipProbability, 0)}%`}
                  </span>
                </div>
              ))}
            </div>
          )}
          <SourceNote>
            Chance of precipitation shown beneath each temperature. Times use the {timeZone ?? "location"} zone reported by the
            provider.
          </SourceNote>
        </Panel>
      </Reveal>

      <Reveal delay={0.17} className="lg:col-span-2">
        <Panel>
          <PanelHeader
            title="Multi-day outlook"
            icon={<Sun className="h-4 w-4" />}
            subtitle={`${days.length} days returned by Open-Meteo for these coordinates.`}
            action={
              <Button variant="ghost" onClick={() => setView("forecast")} title="Open the full forecast explorer">
                Forecast <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            }
          />
          <ul className="divide-line/70 divide-y">
            {days.slice(0, 7).map((day) => {
              const max = convert.temp(day.tempMax);
              const min = convert.temp(day.tempMin);
              return (
                <li key={day.iso} className="flex items-center gap-3 py-2.5">
                  <span className="w-[74px] shrink-0 text-xs font-semibold text-ink-soft">
                    {dayLabel(day.epoch, timeZone ?? undefined, "short")}
                    <span className="muted-dim block text-[10px] font-normal">{dateLabel(day.epoch, timeZone ?? undefined)}</span>
                  </span>
                  <WeatherIcon variant={iconVariant(day.weatherCode, true)} size={30} animate={false} />
                  <span className="muted hidden min-w-0 flex-1 truncate text-[11px] sm:block">{conditionLabel(day.weatherCode)}</span>
                  <span className="tnum shrink-0 text-xs">
                    <span className="font-semibold text-ink">{formatNumber(max, 0)}°</span>
                    <span className="muted-dim"> / {formatNumber(min, 0)}°</span>
                  </span>
                  <span className="tnum muted-dim w-[38px] shrink-0 text-right text-[11px]">
                    {day.precipProbabilityMax === null ? "—" : `${formatNumber(day.precipProbabilityMax, 0)}%`}
                  </span>
                </li>
              );
            })}
          </ul>
          {days.length === 0 ? <p className="muted text-xs">No daily series was returned for this location.</p> : null}
        </Panel>
      </Reveal>

      <Reveal delay={0.2}>
        <Panel>
          <PanelHeader
            title="Warnings"
            icon={<CloudRain className="h-4 w-4" />}
            subtitle="Official alerts matched to these coordinates."
            action={
              <Button variant="ghost" onClick={() => setView("alerts")} title="Open the alerts section">
                All <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            }
          />
          {alerts.loading && !alerts.data ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ) : topAlert ? (
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-[3px] text-[10px] font-semibold tracking-[0.1em] uppercase"
                style={{ borderColor: `${topAlert.color}55`, color: topAlert.color, background: `${topAlert.color}18` }}>
                {topAlert.severity} · {topAlert.providerLabel}
              </span>
              <p className="mt-2 text-sm font-semibold text-ink">{topAlert.event}</p>
              <p className="muted mt-1 line-clamp-3 text-[11px] leading-relaxed">{topAlert.headline}</p>
              {alerts.data && alerts.data.alerts.length > 1 ? (
                <p className="muted-dim mt-2 text-[10.5px]">
                  +{alerts.data.alerts.length - 1} more active alert{alerts.data.alerts.length - 1 === 1 ? "" : "s"} matched within the
                  search radius.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="muted text-xs">
              No active alert matched this location in the last refresh. The alerts section lists which agencies were queried and
              whether each one answered.
            </p>
          )}
        </Panel>
      </Reveal>
    </div>
  );
}

function isDayAt(epoch: number | null, today: { sunrise: number | null; sunset: number | null } | null): boolean {
  if (epoch === null || !today?.sunrise || !today?.sunset) return true;
  return epoch >= today.sunrise && epoch <= today.sunset;
}
