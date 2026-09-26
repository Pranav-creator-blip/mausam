"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { readStorage, STORAGE_KEYS, writeStorage } from "@/lib/storage";

export type NotificationState = "default" | "granted" | "denied" | "unsupported";
export type AlertType = "rain" | "heavy-rain" | "temperature" | "weather-warning";

export type AlertHistoryEntry = {
  id: string;
  type: AlertType;
  date: string;
  time: string;
  location: string;
  message: string;
  status: "sent" | "queued" | "suppressed";
  timestamp: number;
};

export type AlertPreferences = {
  rainThreshold: 30 | 50 | 70 | 80;
  notificationsEnabled: boolean;
  smsEnabled: boolean;
  alertTimingMinutes: number;
  geolocationEnabled: boolean;
};

type AlertPreferencesContextValue = {
  prefs: AlertPreferences;
  history: AlertHistoryEntry[];
  permission: NotificationState;
  setRainThreshold: (value: AlertPreferences["rainThreshold"]) => void;
  setNotificationsEnabled: (value: boolean) => void;
  setSmsEnabled: (value: boolean) => void;
  setAlertTimingMinutes: (value: number) => void;
  setGeolocationEnabled: (value: boolean) => void;
  requestNotificationPermission: () => Promise<boolean>;
  addHistoryEntry: (entry: Omit<AlertHistoryEntry, "id" | "date" | "time" | "timestamp"> & { location?: string }) => void;
  sendNotification: (message: string, type?: AlertType, location?: string) => boolean;
};

const AlertPreferencesContext = createContext<AlertPreferencesContextValue | null>(null);

const defaultPreferences: AlertPreferences = {
  rainThreshold: 70,
  notificationsEnabled: true,
  smsEnabled: false,
  alertTimingMinutes: 30,
  geolocationEnabled: true,
};

function getPermissionState(): NotificationState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  const state = Notification.permission;
  if (state === "default" || state === "granted" || state === "denied") return state;
  return "default";
}

export function AlertPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<AlertPreferences>(defaultPreferences);
  const [permission, setPermission] = useState<NotificationState>(getPermissionState());
  const [history, setHistory] = useState<AlertHistoryEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const storedPref = readStorage<AlertPreferences | null>(STORAGE_KEYS.alertPrefs, null);
    const storedHistory = readStorage<AlertHistoryEntry[]>(STORAGE_KEYS.alertHistory, []);
    if (storedPref) {
      setPrefs({ ...defaultPreferences, ...storedPref });
    }
    setHistory(storedHistory);
    setPermission(getPermissionState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeStorage(STORAGE_KEYS.alertPrefs, prefs);
  }, [prefs, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    writeStorage(STORAGE_KEYS.alertHistory, history.slice(0, 30));
  }, [history, hydrated]);

  const setRainThreshold = useCallback((value: AlertPreferences["rainThreshold"]) => {
    setPrefs((current) => ({ ...current, rainThreshold: value }));
  }, []);

  const setNotificationsEnabled = useCallback((value: boolean) => {
    setPrefs((current) => ({ ...current, notificationsEnabled: value }));
  }, []);

  const setSmsEnabled = useCallback((value: boolean) => {
    setPrefs((current) => ({ ...current, smsEnabled: value }));
  }, []);

  const setAlertTimingMinutes = useCallback((value: number) => {
    setPrefs((current) => ({ ...current, alertTimingMinutes: value }));
  }, []);

  const setGeolocationEnabled = useCallback((value: boolean) => {
    setPrefs((current) => ({ ...current, geolocationEnabled: value }));
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return false;
    }
    const result = await Notification.requestPermission();
    setPermission(result === "granted" ? "granted" : result === "denied" ? "denied" : "default");
    return result === "granted";
  }, []);

  const addHistoryEntry = useCallback(
    (entry: Omit<AlertHistoryEntry, "id" | "date" | "time" | "timestamp"> & { location?: string }) => {
      const timestamp = Date.now();
      const nextEntry: AlertHistoryEntry = {
        ...entry,
        id: `${entry.type}-${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
        date: new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
        time: new Date(timestamp).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
        location: entry.location ?? "Current location",
        timestamp,
      };
      setHistory((current) => {
        const dedupe = current.find(
          (item) =>
            item.message === nextEntry.message &&
            item.location === nextEntry.location &&
            Date.now() - item.timestamp < 1000 * 60 * 30
        );
        if (dedupe) return current;
        return [nextEntry, ...current].slice(0, 30);
      });
    },
    []
  );

  const sendNotification = useCallback(
    (message: string, type: AlertType = "rain", location: string = "Current location") => {
      if (typeof window === "undefined") return false;
      if (!prefs.notificationsEnabled || permission !== "granted") return false;
      const duplicate = history.some(
        (item) => item.message === message && item.location === location && Date.now() - item.timestamp < 1000 * 60 * 30
      );
      if (duplicate) return false;
      const notification = new Notification(type === "heavy-rain" ? "⚠️ Rain Alert" : "🌧️ Weather Alert", {
        body: `${location}: ${message}`,
        icon: "/icon.png",
      });
      notification.onclick = () => window.focus();
      addHistoryEntry({ type, location, message, status: "sent" });
      return true;
    },
    [addHistoryEntry, history, permission, prefs.notificationsEnabled]
  );

  const value = useMemo<AlertPreferencesContextValue>(
    () => ({
      prefs,
      history,
      permission,
      setRainThreshold,
      setNotificationsEnabled,
      setSmsEnabled,
      setAlertTimingMinutes,
      setGeolocationEnabled,
      requestNotificationPermission,
      addHistoryEntry,
      sendNotification,
    }),
    [prefs, history, permission, setRainThreshold, setNotificationsEnabled, setSmsEnabled, setAlertTimingMinutes, setGeolocationEnabled, requestNotificationPermission, addHistoryEntry, sendNotification]
  );

  return <AlertPreferencesContext.Provider value={value}>{children}</AlertPreferencesContext.Provider>;
}

export function useAlertPreferences(): AlertPreferencesContextValue {
  const context = useContext(AlertPreferencesContext);
  if (!context) throw new Error("useAlertPreferences must be used inside AlertPreferencesProvider");
  return context;
}
