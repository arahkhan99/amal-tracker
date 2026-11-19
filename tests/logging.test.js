// The one "can this be logged yet?" rule (src/logging.js) used by every UI write that adds a log.
import { describe, it, expect } from "vitest";
import * as store from "../src/store.js";
import { canLog, logAllowed } from "../src/logging.js";
import { timesFor, startedPrayers, currentWindow } from "../src/times.js";
import { PRAYERS, dkey } from "../src/util.js";

const DAY = new Date(2026, 10, 5);
const KEY = "2026-11-05";
const fresh = () => {
  const S = store.defaultState(DAY);
  S.profile.onboarded = true;
  S.settings.location = { lat: 41.88, lng: -87.63, label: "Chicago", source: "city" };
  return S;
};
const T = S => timesFor(DAY, S.settings);

describe("canLog", () => {
  it("is false before the prayer begins and true from its start", () => {
    const S = fresh(), t = T(S);
    expect(canLog(S, KEY, "Asr", new Date(+t.Asr - 60000))).toBe(false);
    expect(canLog(S, KEY, "Asr", t.Asr)).toBe(true);
  });
  it("treats a future day as not begun and a past day as begun", () => {
    const S = fresh(), now = new Date(2026, 10, 5, 23, 0);
    expect(canLog(S, "2026-11-06", "Fajr", now)).toBe(false);
    expect(canLog(S, "2026-11-04", "Isha", now)).toBe(true);
  });
  it("has no start time for the day's nafl chips (prayer 'day')", () => {
    expect(canLog(fresh(), KEY, "day", new Date(2026, 10, 5, 1, 0))).toBe(true);
  });
  it("follows a location change that moves a prayer later (the status already there doesn't matter)", () => {
    const S = fresh(), t = T(S);
    const now = new Date(+t.Maghrib + 60000);
    store.setPrayer(S, KEY, "Maghrib", "ontime", now);
    expect(canLog(S, KEY, "Maghrib", now)).toBe(true);
    // Moving far west: Maghrib now starts later than `now`
    S.settings.location = { lat: 41.88, lng: -100, label: "West", source: "city" };
    expect(T(S).Maghrib > now).toBe(true);
    expect(canLog(S, KEY, "Maghrib", now)).toBe(false);
  });
});

describe("logAllowed: adding is guarded, removing never is", () => {
  const S = fresh(), early = new Date(+T(fresh()).Isha - 3600e3);
  it("refuses a status, a tick or a Witr before the prayer begins", () => {
    expect(logAllowed(S, KEY, "Isha", "ontime", early)).toBe(false);
    expect(logAllowed(S, KEY, "Isha", true, early)).toBe(false); // sunnah / remembrance tick
    expect(logAllowed(S, KEY, "Isha", "done", early)).toBe(false); // Witr
  });
  it("always allows clearing and unticking", () => {
    for (const v of [null, undefined, false]) expect(logAllowed(S, KEY, "Isha", v, early)).toBe(true);
  });
  it("allows everything once the prayer has begun", () => {
    const later = new Date(+T(S).Isha + 60000);
    expect(logAllowed(S, KEY, "Isha", "ontime", later)).toBe(true);
    expect(logAllowed(S, KEY, "Isha", true, later)).toBe(true);
  });
  it("lets an excused day's not-yet prayer be cleared but not re-logged", () => {
    const S2 = fresh(), t = T(S2), before = new Date(+t.Asr - 60000);
    store.setPrayer(S2, KEY, "Asr", "excused", new Date(+t.Asr + 1)); // logged earlier, before a time change
    expect(store.prayerStatus(S2, KEY, "Asr")).toBe("excused");
    expect(logAllowed(S2, KEY, "Asr", "ontime", before)).toBe(false);
    expect(logAllowed(S2, KEY, "Asr", null, before)).toBe(true);
  });
});

describe("ending excused mode only writes prayers that have begun", () => {
  it("stores 'excused' for the started prayers (minus the open one) and leaves the rest unlogged", () => {
    const S = fresh(), t = T(S);
    const now = new Date(+t.Asr + 60000); // ʿAsr is open; Maghrib and ʿIshāʾ haven't begun
    store.startExcused(S, KEY, now);
    const cur = currentWindow(now, S.settings);
    const prayers = startedPrayers(now, now, S.settings).filter(p => !(cur && dkey(cur.date) === KEY && cur.p === p));
    store.endExcused(S, KEY, { excusedPrayers: prayers }, now);
    const day = S.days[KEY];
    expect(day.prayers).toEqual({ Fajr: "excused", Dhuhr: "excused" });
    for (const p of PRAYERS) if (day.prayers[p]) expect(canLog(S, KEY, p, now)).toBe(true);
    expect(store.prayerStatus(S, KEY, "Maghrib")).toBe(null);
    expect(store.prayerStatus(S, KEY, "Isha")).toBe(null);
  });
});

describe("every Home write path that adds a log goes through logAllowed", () => {
  // home.js needs the DOM, so check the wiring in its source: each handler asks the shared rule before writing
  it("applyStatus, toggleChip, rememberAt and the catch-up save use it; the sheet uses canLog", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync(new URL("../src/views/home.js", import.meta.url), "utf8");
    const body = name => { const i = src.indexOf(name); expect(i).toBeGreaterThan(-1); return src.slice(i, src.indexOf("\n}", i) + 2); };
    // the log sheet, the one-tap buttons and Other go through today.js logPrayer, which asks logAllowed first
    expect(body("export function applyStatus(")).toMatch(/logPrayer\(S, key, p, status/);
    expect(src.slice(src.indexOf("A.logTap ="), src.indexOf("A.logTap =") + 200)).toMatch(/logPrayer\(S, key, p, status/);
    const today = fs.readFileSync(new URL("../src/today.js", import.meta.url), "utf8");
    expect(today.slice(today.indexOf("export function logPrayer("), today.indexOf("export function logPrayer(") + 300)).toMatch(/logAllowed\(S, key, p, status, now\)/);
    const cal = fs.readFileSync(new URL("../src/views/calendar.js", import.meta.url), "utf8");
    expect(cal.slice(cal.indexOf("A.dayPick ="), cal.indexOf("A.dayPick =") + 300)).toMatch(/logPrayer\(S, key, p, next/);
    expect(body("function toggleChip(")).toMatch(/logAllowed\(S, key, "Isha", next/);
    expect(body("function toggleChip(")).toMatch(/logAllowed\(S, key, owner, !was/);
    expect(src.slice(src.indexOf("A.rememberAt ="), src.indexOf("A.rememberAt =") + 400)).toMatch(/logAllowed\(S, key, p, on/);
    expect(src.slice(src.indexOf("A.cuSave ="), src.indexOf("A.cuSave =") + 500)).toMatch(/logAllowed\(S, yk, p, k/);
    expect(src.slice(src.indexOf("A.prayerSheet ="), src.indexOf("A.prayerSheet =") + 600)).toMatch(/!canLog\(S, key, p, NOW\(\)\)/);
    expect(src).not.toMatch(/notStarted\(/); // no second copy of the rule
  });
});
