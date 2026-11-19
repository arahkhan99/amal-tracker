import { describe, it, expect } from "vitest";
import {
  KAABA, bearing, distanceKm, qiblaFor, norm360, angleDiff, smoothHeading, smoothingFactor, headingFromAlpha,
  headingFromWebkit, circularSpread, headingJitter, facing, turnHint, compassPoint, formatDistance, usesMiles,
  validLocation, KM_PER_MI,
} from "../src/qibla.js";
import { qiblaView, QB } from "../src/views/qibla.js";

// Expected values from the great-circle initial-bearing formula (checked by hand against published Qibla tables).
const CITIES = [
  ["London", 51.5074, -0.1278, 118.99, 4794],
  ["New York", 40.7128, -74.006, 58.48, 10306],
  ["Chicago", 41.8781, -87.6298, 48.67, 11146], // often quoted as 46.8°; the great-circle bearing is 48.7°
  ["Jakarta", -6.2088, 106.8456, 295.15, 7920],
  ["Sydney", -33.8688, 151.2093, 277.5, 13236],
  ["Karachi", 24.8607, 67.0011, 267.74, 2800],
  ["Cairo", 30.0444, 31.2357, 136.14, 1287],
  ["Madinah", 24.4686, 39.6142, 176.29, 339],
];

describe("Qibla bearing and distance", () => {
  for (const [name, lat, lng, deg, km] of CITIES) {
    it(`${name}: ${deg}°, ≈${km} km`, () => {
      expect(bearing({ lat, lng })).toBeCloseTo(deg, 1);
      expect(distanceKm({ lat, lng })).toBeGreaterThan(km - 3);
      expect(distanceKm({ lat, lng })).toBeLessThan(km + 3);
    });
  }
  it("rounded (2 dp) saved locations stay within a tenth of a degree", () => {
    expect(Math.abs(bearing({ lat: 51.51, lng: -0.13 }) - 118.99)).toBeLessThan(0.1);
  });
  it("points due north / south / east of the Kaʿbah", () => {
    expect(bearing({ lat: 10, lng: KAABA.lng })).toBeCloseTo(0, 6);   // south of Makkah → face north
    expect(bearing({ lat: 40, lng: KAABA.lng })).toBeCloseTo(180, 6); // north → face south
    expect(bearing({ lat: KAABA.lat, lng: 60 })).toBeGreaterThan(270); // east → roughly west (a bit north on a great circle)
  });
  it("is always in [0, 360)", () => {
    for (let lat = -80; lat <= 80; lat += 20) for (let lng = -180; lng <= 180; lng += 30) {
      const b = bearing({ lat, lng });
      expect(b).toBeGreaterThanOrEqual(0); expect(b).toBeLessThan(360);
    }
  });
  it("miles and qiblaFor", () => {
    const q = qiblaFor({ lat: 51.5074, lng: -0.1278, label: "London" });
    expect(q.mi).toBeCloseTo(q.km / KM_PER_MI, 6);
    expect(q.mi).toBeGreaterThan(2975); expect(q.mi).toBeLessThan(2982);
    expect(q.atKaaba).toBe(false);
    expect(qiblaFor(KAABA).atKaaba).toBe(true);
    expect(qiblaFor(null)).toBe(null);
    expect(qiblaFor({ lat: NaN, lng: 3 })).toBe(null);
    expect(validLocation({ lat: 91, lng: 0 })).toBe(false);
  });
  it("formats distance and compass points", () => {
    expect(formatDistance(4794.3)).toBe("4,794 km");
    expect(formatDistance(4794.3, { miles: true })).toBe("2,979 mi");
    expect(formatDistance(3.42)).toBe("3.4 km");
    expect(usesMiles("en-US")).toBe(true); expect(usesMiles("en_GB")).toBe(true);
    expect(usesMiles("en")).toBe(false); expect(usesMiles("ur-PK")).toBe(false);
    expect(compassPoint(118.99)).toBe("ESE"); expect(compassPoint(359)).toBe("N"); expect(compassPoint(295)).toBe("WNW");
  });
});

describe("angles and smoothing", () => {
  it("norm360 and angleDiff wrap", () => {
    expect(norm360(-1)).toBe(359); expect(norm360(720)).toBe(0); expect(Object.is(norm360(-360), 0)).toBe(true);
    expect(angleDiff(359, 1)).toBe(2); expect(angleDiff(1, 359)).toBe(-2);
    expect(angleDiff(10, 190)).toBe(180); expect(angleDiff(0, 90)).toBe(90);
  });
  it("smoothing 359° → 1° goes through 0°, not round the back", () => {
    let h = 359;
    const seen = [];
    for (let i = 0; i < 40; i++) { h = smoothHeading(h, 1, 0.25); seen.push(h); }
    expect(seen.every(v => v >= 359 || v <= 1)).toBe(true); // never passes through 180
    expect(Math.abs(angleDiff(h, 1))).toBeLessThan(0.01);
    expect(smoothHeading(359, 1, 0.5)).toBeCloseTo(0, 9);
    expect(smoothHeading(1, 359, 0.5)).toBeCloseTo(0, 9);
    expect(smoothHeading(350, 20, 0.5)).toBeCloseTo(5, 9);
    expect(smoothHeading(null, 42)).toBe(42);
  });
  it("frame-rate-independent factor", () => {
    expect(smoothingFactor(0)).toBe(0);
    // two 60 Hz steps equal one 30 Hz step
    const k60 = smoothingFactor(1000 / 60, 120), k30 = smoothingFactor(1000 / 30, 120);
    expect(1 - (1 - k60) ** 2).toBeCloseTo(k30, 9);
  });
  it("spread and jitter across the seam", () => {
    expect(circularSpread([359, 0, 1])).toBeLessThan(1);
    expect(circularSpread([0, 90, 180, 270])).toBe(180);
    // a smooth turn through 0° has ~no jitter; jumping readings have a lot
    expect(headingJitter([354, 356, 358, 0, 2, 4, 6])).toBeCloseTo(0, 9);
    expect(headingJitter([10, 40, 5, 50, 0, 45])).toBeGreaterThan(30);
  });
});

describe("sensor headings", () => {
  it("deviceorientationabsolute alpha → heading (360 − alpha)", () => {
    expect(headingFromAlpha(0)).toBe(0);
    expect(headingFromAlpha(90)).toBe(270);   // alpha grows counter-clockwise
    expect(headingFromAlpha(241)).toBe(119);
    expect(headingFromAlpha(null)).toBe(null);
  });
  it("screen-orientation correction", () => {
    // facing North with the phone turned to landscape (top edge to the left): the device top points West,
    // alpha = 90; the screen's top points North
    expect(headingFromAlpha(90, 90)).toBe(0);
    expect(headingFromAlpha(270, 270)).toBe(0);       // landscape the other way
    expect(headingFromAlpha(180, 180)).toBe(0);       // upside down
    expect(headingFromAlpha(0, 90)).toBe(90);
    expect(headingFromAlpha(0, -90)).toBe(270);       // window.orientation style (−90)
  });
  it("iOS webkitCompassHeading", () => {
    expect(headingFromWebkit(118.9)).toBeCloseTo(118.9, 9);
    expect(headingFromWebkit(300, 90)).toBe(30);
    expect(headingFromWebkit(-1)).toBe(null);        // uncalibrated
    expect(headingFromWebkit(undefined)).toBe(null);
  });
  it("facing within ±3°, with hysteresis to ±5°, and turn hints", () => {
    expect(facing(116.5, 119)).toBe(true);
    expect(facing(115.5, 119)).toBe(false);
    expect(facing(115.5, 119, true)).toBe(true);     // already facing: holds until beyond 5°
    expect(facing(113.5, 119, true)).toBe(false);
    expect(facing(358, 1)).toBe(true);               // across 0°
    expect(turnHint(100, 119, false)).toBe("right");
    expect(turnHint(140, 119, false)).toBe("left");
    expect(turnHint(350, 10, false)).toBe("right");
    expect(turnHint(119, 119, true)).toBe("facing");
  });
});

describe("the page markup", () => {
  it("shows the bearing, the place, Change and the distance", () => {
    const html = qiblaView({ lat: 51.5074, lng: -0.1278, label: "London" }, { locale: "en-GB" });
    expect(html).toMatch(/data-bearing="118\.9[89]\d"/);
    expect(html).toContain(">119<");
    expect(html).toContain("London");
    expect(html).toContain('data-qb="change"');
    expect(html).toContain("2,979 mi");
    expect(html).toContain(QB.none(119));
    expect(html).toContain("Kaʿbah");
  });
  it("escapes the label and handles no location", () => {
    expect(qiblaView({ lat: 1, lng: 2, label: "<b>x</b>" }, { locale: "en" })).toContain("&lt;b&gt;x&lt;/b&gt;");
    const none = qiblaView(null);
    expect(none).toContain('data-mode="noloc"');
    expect(none).toContain(QB.noLocation);
  });
});
