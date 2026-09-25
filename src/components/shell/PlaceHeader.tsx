"use client";

import { AnimatePresence, motion } from "motion/react";
import { Bookmark, BookmarkCheck, Crosshair, Loader2, RefreshCw, X } from "lucide-react";
import { useLocations } from "@/components/providers/LocationsProvider";
import { SavedPlaces } from "@/components/shell/SavedPlaces";
import { UnitSettings } from "@/components/shell/UnitSettings";
import { InfoHint } from "@/components/ui/Controls";
import { InlineSpinner } from "@/components/ui/States";
import { coordinateLabel, placeSubtitle, type Place } from "@/lib/place";
import { relativeFromNow } from "@/lib/time";

export function PlaceHeader({
  place,
  timeZoneLabel,
  isDay,
  onRefresh,
  refreshing,
  lastUpdated,
  stale,
}: {
  place: Place;
  timeZoneLabel: string | null;
  isDay: boolean | null;
  onRefresh: () => void;
  refreshing: boolean;
  lastUpdated: number | null;
  stale: boolean;
}) {
  const { toggleSaved, isSaved, locationStatus, locationError, requestMyLocation, clearLocationError } = useLocations();
  const saved = isSaved(place.id);
  const locating = locationStatus === "locating";

  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">{place.name}</h1>
            {isDay !== null ? (
              <span className="muted-dim rounded-full border border-line px-2 py-[2px] text-[10px] font-semibold tracking-[0.12em] uppercase">
                {isDay ? "Day" : "Night"}
              </span>
            ) : null}
          </div>
          <p className="muted mt-1 truncate text-xs">
            {[placeSubtitle(place), timeZoneLabel].filter(Boolean).join(" · ") || coordinateLabel(place)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => toggleSaved(place)}
            aria-pressed={saved}
            title={saved ? "Remove from saved locations" : "Save this location"}
            className={`focus-ring inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
              saved ? "border-cyan/40 bg-cyan/12 text-cyan" : "border-line bg-white/[0.04] text-ink-soft hover:bg-white/[0.09]"
            }`}
          >
            {saved ? <BookmarkCheck aria-hidden className="h-4 w-4" /> : <Bookmark aria-hidden className="h-4 w-4" />}
            <span className="hidden sm:inline">{saved ? "Saved" : "Save"}</span>
          </button>

          <SavedPlaces />
          <UnitSettings />

          <button
            type="button"
            onClick={requestMyLocation}
            disabled={locating}
            title="Use my current location (asks the browser for permission)"
            className="focus-ring inline-flex items-center gap-2 rounded-xl border border-line bg-white/[0.04] px-3 py-2 text-xs font-semibold text-ink-soft transition hover:bg-white/[0.09] disabled:opacity-60"
          >
            {locating ? <Loader2 aria-hidden className="anim-spin h-4 w-4" /> : <Crosshair aria-hidden className="h-4 w-4" />}
            <span className="hidden sm:inline">{locating ? "Locating…" : "My location"}</span>
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            title="Fetch the latest observation and forecast from Open-Meteo"
            className="focus-ring inline-flex items-center gap-2 rounded-xl border border-cyan/40 bg-cyan/12 px-3 py-2 text-xs font-semibold text-cyan transition hover:bg-cyan/20 disabled:opacity-60"
          >
            {refreshing ? <Loader2 aria-hidden className="anim-spin h-4 w-4" /> : <RefreshCw aria-hidden className="h-4 w-4" />}
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      <div className="muted flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px]">
        <span className="tnum inline-flex items-center gap-1.5">
          {coordinateLabel(place)}
          <InfoHint label="About coordinates">
            Coordinates come from the Open-Meteo geocoding database for searched places, or from the browser Geolocation API for
            “My location”. Every reading on this dashboard is fetched for exactly these coordinates.
          </InfoHint>
        </span>
        <span className="hidden sm:inline">·</span>
        <span className="tnum">
          {refreshing ? (
            <span className="inline-flex items-center gap-1.5 text-cyan">
              <InlineSpinner /> Fetching latest
            </span>
          ) : lastUpdated ? (
            `Data updated ${relativeFromNow(lastUpdated)}`
          ) : (
            "Awaiting first response"
          )}
        </span>
        {stale ? (
          <span className="rounded-full border border-amber/35 bg-amber/10 px-2 py-[2px] font-semibold text-amber">
            Older than expected — refresh for the latest
          </span>
        ) : null}
      </div>

      <AnimatePresence>
        {locationError ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-start gap-3 rounded-xl border border-amber/30 bg-amber/[0.08] px-3 py-2 text-xs text-amber">
              <span className="flex-1 leading-relaxed">{locationError}</span>
              <button
                type="button"
                aria-label="Dismiss location message"
                onClick={clearLocationError}
                className="focus-ring rounded-full p-0.5 transition hover:text-ink"
              >
                <X aria-hidden className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
