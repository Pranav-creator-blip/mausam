"use client";

import { Bell, BellRing, LocateFixed, ShieldCheck } from "lucide-react";
import { useLocations } from "@/components/providers/LocationsProvider";
import { useAlertPreferences } from "@/components/providers/AlertPreferencesProvider";
import { Popover } from "@/components/ui/Popover";
import { Segmented, Toggle } from "@/components/ui/Controls";

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="border-line/70 flex flex-col gap-2 border-b py-2.5 last:border-0">
      <div>
        <p className="text-xs font-semibold text-ink-soft">{label}</p>
        {hint ? <p className="muted-dim mt-0.5 text-[10.5px]">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function AlertSettings() {
  const { requestMyLocation } = useLocations();
  const {
    prefs,
    permission,
    setRainThreshold,
    setNotificationsEnabled,
    setSmsEnabled,
    setAlertTimingMinutes,
    setGeolocationEnabled,
    requestNotificationPermission,
  } = useAlertPreferences();

  const permissionLabel =
    permission === "granted" ? "Allowed" : permission === "denied" ? "Blocked" : permission === "unsupported" ? "Unsupported" : "Not set";

  return (
    <Popover label="Alerts" title="Rain and notification settings" icon={<BellRing className="h-4 w-4" />}>
      <Row label="Rain threshold" hint="Alert level used before we notify you.">
        <Segmented
          ariaLabel="Rain threshold"
          size="sm"
          value={String(prefs.rainThreshold) as "30" | "50" | "70" | "80"}
          onChange={(value) => setRainThreshold(Number(value) as 30 | 50 | 70 | 80)}
          options={[
            { value: "30", label: "30%" },
            { value: "50", label: "50%" },
            { value: "70", label: "70%" },
            { value: "80", label: "80%" },
          ]}
        />
      </Row>

      <Row label="Alert timing" hint="How soon before a rain window should a reminder appear.">
        <Segmented
          ariaLabel="Alert timing"
          size="sm"
          value={String(prefs.alertTimingMinutes)}
          onChange={(value) => setAlertTimingMinutes(Number(value))}
          options={[
            { value: "15", label: "15m" },
            { value: "30", label: "30m" },
            { value: "45", label: "45m" },
            { value: "60", label: "60m" },
          ]}
        />
      </Row>

      <div className="py-2.5">
        <Toggle
          label="Browser notifications"
          hint={permissionLabel === "Allowed" ? "Allowed in this browser." : "Notify on rain alerts when permission is granted."}
          checked={prefs.notificationsEnabled}
          onChange={(value) => {
            setNotificationsEnabled(value);
            if (value && permission !== "granted") {
              void requestNotificationPermission();
            }
          }}
        />
        <div className="mt-2 flex items-center justify-between rounded-xl border border-line bg-white/[0.02] px-2.5 py-2 text-[10.5px] text-ink-soft">
          <span className="inline-flex items-center gap-1.5"><Bell className="h-3.5 w-3.5" /> Permission</span>
          <span className="font-semibold text-cyan">{permissionLabel}</span>
        </div>
      </div>

      <div className="py-2.5">
        <Toggle label="SMS alerts" hint="Send text alerts through the secure backend route when enabled." checked={prefs.smsEnabled} onChange={setSmsEnabled} />
      </div>

      <div className="py-2.5">
        <Toggle
          label="Location-aware alerting"
          hint="Use the current browser location when available."
          checked={prefs.geolocationEnabled}
          onChange={setGeolocationEnabled}
        />
        <button
          type="button"
          onClick={requestMyLocation}
          className="focus-ring mt-2 inline-flex items-center gap-2 rounded-lg border border-line bg-white/[0.04] px-2.5 py-1.5 text-[10.5px] font-semibold text-ink-soft"
        >
          <LocateFixed className="h-3.5 w-3.5" /> Use my location
        </button>
      </div>

      <div className="border-line/70 border-t pt-3">
        <p className="muted-dim text-[10.5px] leading-relaxed">
          <span className="inline-flex items-center gap-1.5 font-semibold text-ink-soft"><ShieldCheck className="h-3.5 w-3.5" /> Private</span> — SMS credentials stay on the server and are never exposed to the browser.
        </p>
      </div>
    </Popover>
  );
}
