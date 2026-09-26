import test from "node:test";
import assert from "node:assert/strict";
import { getRainAlertSummary, type RainAlertSummary } from "./weather-alerts";

type TestHour = {
  epoch: number;
  precipProbability: number;
  rain: number;
  showers: number;
  snowfall: number;
  weatherCode: number;
};

const summarize = (hours: TestHour[], now: number, threshold: number): RainAlertSummary =>
  getRainAlertSummary(hours, now, threshold);

const hours = [
  { epoch: 1_700_000_000_000, precipProbability: 5, rain: 0, showers: 0, snowfall: 0, weatherCode: 1 },
  { epoch: 1_700_000_060_000, precipProbability: 24, rain: 0.2, showers: 0, snowfall: 0, weatherCode: 51 },
  { epoch: 1_700_000_120_000, precipProbability: 72, rain: 1.8, showers: 0.8, snowfall: 0, weatherCode: 61 },
  { epoch: 1_700_000_180_000, precipProbability: 84, rain: 3.4, showers: 1, snowfall: 0, weatherCode: 65 },
];

test("rain alert summary flags high risk and explains the next rain window", () => {
  const now = 1_699_999_990_000;
  const summary = summarize(hours, now, 70);

  assert.equal(summary.level, "heavy");
  assert.equal(summary.rainExpectedToday, true);
  assert.equal(summary.heavyRainPossible, true);
  assert.ok(summary.alertMessage.includes("Heavy rain"));
  assert.ok(summary.nextRainMinutes !== null && summary.nextRainMinutes <= 30);
});

test("rain alert summary is calm when the chance stays below threshold", () => {
  const summary = getRainAlertSummary(
    [
      { epoch: 1_700_000_000_000, precipProbability: 8, rain: 0, showers: 0, snowfall: 0, weatherCode: 1 },
      { epoch: 1_700_000_060_000, precipProbability: 22, rain: 0, showers: 0, snowfall: 0, weatherCode: 2 },
    ],
    1_699_999_900_000,
    70
  );

  assert.equal(summary.level, "low");
  assert.equal(summary.heavyRainPossible, false);
  assert.ok(summary.alertMessage.includes("Low chance of rain"));
});
