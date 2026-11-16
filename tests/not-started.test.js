import { describe, it, expect } from "vitest";
import { notStarted, timesFor } from "../src/times.js";

const settings = { location: { lat: 41.88, lng: -87.63, label: "Chicago" } };
const day = new Date(2026, 10, 5);

describe("prayers can't be logged before their time begins", () => {
  it("is true before the prayer starts and false from its start", () => {
    const t = timesFor(day, settings);
    expect(notStarted(day, "Asr", settings, new Date(+t.Asr - 60000))).toBe(true);
    expect(notStarted(day, "Asr", settings, t.Asr)).toBe(false);
    expect(notStarted(day, "Isha", settings, new Date(2026, 10, 5, 12, 0))).toBe(true);
  });
  it("treats every prayer of a future day as not started, and past days as started", () => {
    const now = new Date(2026, 10, 5, 23, 0);
    expect(notStarted(new Date(2026, 10, 6), "Fajr", settings, now)).toBe(true);
    expect(notStarted(new Date(2026, 10, 4), "Isha", settings, now)).toBe(false);
  });
});
