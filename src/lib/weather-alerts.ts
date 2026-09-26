export type RainAlertLevel = "none" | "low" | "likely" | "heavy";

export type RainAlertSummary = {
  level: RainAlertLevel;
  nextRainMinutes: number | null;
  alertMessage: string;
  rainExpectedToday: boolean;
  heavyRainPossible: boolean;
  startTime: number | null;
  endTime: number | null;
  maxProbability: number;
  expectedRainMm: number;
};

type RainHourLike = {
  epoch: number | null;
  precipProbability: number | null;
  rain: number | null;
  showers: number | null;
  snowfall: number | null;
  weatherCode: number | null;
};

function sameDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

export function getRainAlertSummary(hours: RainHourLike[], now: number = Date.now(), threshold = 70): RainAlertSummary {
  const upcoming = [...hours]
    .filter((hour) => hour.epoch !== null && hour.epoch >= now)
    .sort((a, b) => (a.epoch ?? 0) - (b.epoch ?? 0));

  if (!upcoming.length) {
    return {
      level: "none",
      nextRainMinutes: null,
      alertMessage: "No rain expected",
      rainExpectedToday: false,
      heavyRainPossible: false,
      startTime: null,
      endTime: null,
      maxProbability: 0,
      expectedRainMm: 0,
    };
  }

  const maxProbability = Math.max(...upcoming.map((hour) => hour.precipProbability ?? 0), 0);
  const expectedRainMm = upcoming
    .slice(0, 24)
    .reduce((total, hour) => total + ((hour.rain ?? 0) + (hour.showers ?? 0) + (hour.snowfall ?? 0) * 0.3), 0);

  const rainLikelyWindow = upcoming.filter(
    (hour) => (hour.precipProbability ?? 0) >= threshold || (hour.rain ?? 0) >= 1 || (hour.showers ?? 0) >= 1
  );
  const heavyRainPossible = upcoming.some(
    (hour) => (hour.precipProbability ?? 0) >= 80 || (hour.rain ?? 0) >= 3 || (hour.showers ?? 0) >= 2 || (hour.weatherCode ?? 0) >= 65
  );
  const rainExpectedToday = upcoming.some((hour) => hour.epoch !== null && sameDay(hour.epoch, now));

  const nextRain = rainLikelyWindow[0] ?? null;
  const nextRainMinutes = nextRain?.epoch != null && nextRain.epoch >= now ? Math.max(0, Math.round((nextRain.epoch - now) / 60000)) : null;

  const startTime = nextRain?.epoch ?? null;
  const endTime =
    rainLikelyWindow.length > 0
      ? rainLikelyWindow[rainLikelyWindow.length - 1]?.epoch ?? null
      : null;

  let level: RainAlertLevel = "none";
  if (maxProbability > 0 && maxProbability < threshold) level = "low";
  if (nextRain && (nextRain.precipProbability ?? 0) >= threshold) level = "likely";
  if (heavyRainPossible) level = "heavy";

  if (level === "none") {
    return {
      level,
      nextRainMinutes: null,
      alertMessage: "Low chance of rain",
      rainExpectedToday: rainExpectedToday && maxProbability > 0,
      heavyRainPossible: false,
      startTime: null,
      endTime: null,
      maxProbability,
      expectedRainMm,
    };
  }

  if (level === "heavy") {
    return {
      level,
      nextRainMinutes,
      alertMessage:
        nextRainMinutes !== null && nextRainMinutes <= 60
          ? `Heavy rain possible in ${nextRainMinutes} minutes.`
          : "Heavy rain possible today.",
      rainExpectedToday: rainExpectedToday,
      heavyRainPossible: true,
      startTime,
      endTime,
      maxProbability,
      expectedRainMm,
    };
  }

  if (level === "low") {
    return {
      level,
      nextRainMinutes: null,
      alertMessage: "Low chance of rain",
      rainExpectedToday: rainExpectedToday,
      heavyRainPossible: false,
      startTime: null,
      endTime: null,
      maxProbability,
      expectedRainMm,
    };
  }

  if (nextRainMinutes !== null && nextRainMinutes <= 60) {
    return {
      level: "likely",
      nextRainMinutes,
      alertMessage: `Rain likely in ${nextRainMinutes} minutes.`,
      rainExpectedToday: rainExpectedToday,
      heavyRainPossible: false,
      startTime,
      endTime,
      maxProbability,
      expectedRainMm,
    };
  }

  return {
    level: "likely",
    nextRainMinutes,
    alertMessage: nextRainMinutes !== null ? `Rain likely in ${Math.max(1, Math.round(nextRainMinutes / 60))} hour(s).` : "Rain likely today.",
    rainExpectedToday: rainExpectedToday,
    heavyRainPossible: false,
    startTime,
    endTime,
    maxProbability,
    expectedRainMm,
  };
}
