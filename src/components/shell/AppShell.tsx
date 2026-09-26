"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useDashboard, type ViewId } from "@/components/providers/DashboardProvider";
import { useLocations } from "@/components/providers/LocationsProvider";
import { Onboarding } from "@/components/shell/Onboarding";
import { PlaceHeader } from "@/components/shell/PlaceHeader";
import { Brand, ShellNav } from "@/components/shell/ShellNav";
import { SearchBox } from "@/components/shell/SearchBox";
import { AlertsView } from "@/components/views/AlertsView";
import { AirQualityView } from "@/components/views/AirQualityView";
import { ForecastView } from "@/components/views/ForecastView";
import { MapView } from "@/components/views/MapView";
import { OverviewView } from "@/components/views/OverviewView";
import { WeatherBackground } from "@/components/weather/WeatherBackground";
import { useNetworkOnline } from "@/lib/appearance";
import { OfflineNotice } from "@/components/ui/States";
import { weatherIntensity, sceneVariant } from "@/lib/wmo";

function ViewBody({ view }: { view: ViewId }) {
  switch (view) {
    case "map":
      return <MapView />;
    case "forecast":
      return <ForecastView />;
    case "air":
      return <AirQualityView />;
    case "alerts":
      return <AlertsView />;
    default:
      return <OverviewView />;
  }
}

export function AppShell() {
  const { hydrated } = useLocations();
  const { place, view, setView, current, weather, refreshAll, refreshing, alerts } = useDashboard();
  const online = useNetworkOnline();
  const [drawer, setDrawer] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    setDrawer(false);
  }, [view]);

  if (!hydrated) {
    return (
      <div className="relative z-10 mx-auto w-full max-w-3xl px-4 py-16">
        <div className="glass h-52 rounded-[22px] p-6">
          <div className="skeleton h-8 w-44 rounded-lg" />
          <div className="skeleton mt-4 h-4 w-full rounded" />
          <div className="skeleton mt-2 h-4 w-2/3 rounded" />
        </div>
      </div>
    );
  }

  const scene = place ? sceneVariant(current?.weatherCode ?? null, current?.isDay ?? true) : "clear-night";
  const intensity = weatherIntensity(current?.weatherCode ?? null);

  return (
    <div className="relative min-h-dvh">
      <WeatherBackground scene={scene} intensity={intensity} />

      <div className="relative z-10 flex min-h-dvh">
        <aside className="border-line/70 sticky top-0 hidden h-dvh w-[272px] shrink-0 flex-col border-r bg-[rgba(7,11,20,0.55)] px-4 py-5 backdrop-blur-xl lg:flex">
          <Brand />
          <div className="mt-5">
            <SearchBox />
          </div>
          <div className="mt-5 flex-1 overflow-y-auto scroll-thin">
            <p className="muted-dim mb-2 px-3 text-[10px] font-semibold tracking-[0.2em] uppercase">Sections</p>
            <ShellNav view={view} onSelect={setView} />
          </div>
          <div className="border-line/70 mt-4 border-t pt-3">
            <p className="muted-dim text-[10px] leading-relaxed">
              Weather data by Open-Meteo (CC BY 4.0) · Radar by RainViewer · Alerts by NWS, NDMA SACHET and GDACS.
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="border-line/70 sticky top-0 z-30 flex items-center gap-3 border-b bg-[rgba(7,11,20,0.82)] px-4 py-3 backdrop-blur-xl lg:hidden">
            <button
              type="button"
              aria-label="Open navigation"
              aria-expanded={drawer}
              onClick={() => setDrawer(true)}
              className="focus-ring rounded-xl border border-line bg-white/[0.04] p-2 text-ink-soft"
            >
              <Menu aria-hidden className="h-4 w-4" />
            </button>
            <Brand compact />
            <span className="muted ml-auto truncate text-xs">{place?.name ?? "Choose a location"}</span>
          </div>

          <AnimatePresence>
            {drawer ? (
              <motion.div
                className="fixed inset-0 z-50 lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <button
                  type="button"
                  aria-label="Close navigation"
                  className="absolute inset-0 bg-black/60"
                  onClick={() => setDrawer(false)}
                />
                <motion.div
                  initial={reduced ? { x: 0 } : { x: -280 }}
                  animate={{ x: 0 }}
                  exit={reduced ? { opacity: 0 } : { x: -280 }}
                  transition={{ type: "spring", stiffness: 380, damping: 34 }}
                  className="border-line relative h-full w-[280px] border-r bg-[rgba(7,11,20,0.98)] px-4 py-5 backdrop-blur-xl"
                >
                  <div className="flex items-center justify-between">
                    <Brand />
                    <button
                      type="button"
                      aria-label="Close navigation"
                      onClick={() => setDrawer(false)}
                      className="focus-ring muted rounded-lg border border-line p-1.5"
                    >
                      <X aria-hidden className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-5">
                    <SearchBox />
                  </div>
                  <div className="mt-5">
                    <ShellNav view={view} onSelect={setView} variant="drawer" />
                  </div>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <main className="flex-1 px-4 pt-5 pb-10 sm:px-6 lg:px-7">
            {!place ? (
              <Onboarding />
            ) : (
              <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-5">
                {!online ? <OfflineNotice onRetry={refreshAll} /> : null}

                <PlaceHeader
                  place={place}
                  timeZoneLabel={weather.data?.timezone_abbreviation ?? weather.data?.timezone ?? null}
                  isDay={current ? current.isDay : null}
                  onRefresh={refreshAll}
                  refreshing={refreshing}
                  lastUpdated={weather.lastUpdated}
                  stale={weather.stale}
                />

                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={view}
                    initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <ViewBody view={view} />
                  </motion.div>
                </AnimatePresence>

                <footer className="border-line/70 muted-dim mt-2 flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-[10.5px]">
                  <span>
                    AETHER WEATHER · weather and air quality by Open-Meteo (CC BY 4.0), radar by RainViewer, alerts by their named
                    agencies.
                  </span>
                  <span className="tnum">
                    {alerts.data ? `${alerts.data.alerts.length} active alert${alerts.data.alerts.length === 1 ? "" : "s"} matched` : "Alerts pending"}
                  </span>
                </footer>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
