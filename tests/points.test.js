import { describe, it, expect } from "vitest";
import * as store from "../src/store.js";
import * as pts from "../src/points.js";
import { dkey, addDays, parseKey, PRAYERS } from "../src/util.js";

const NOW = new Date(2026, 10, 12, 15, 0); // Thu 12 Nov 2026, 3 PM local
const TODAY = "2026-11-12";
const fresh = (created = "2026-11-01") => { const S = store.defaultState(NOW); S.createdKey = created; return S; };
const allFive = (S, key, status) => { for (const p of PRAYERS) store.setPrayer(S, key, p, status, NOW); };
const W = pts.WEIGHTS.v1;

describe("points: weights", () => {
  it("fard statuses: jamāʿah 5, on time 3, made up 1, missed 0", () => {
    const day = { prayers: { Fajr: "congregation", Dhuhr: "ontime", Asr: "madeup", Maghrib: "missed" }, amal: {} };
    const r = pts.dayProvisions(day);
    expect(r.total).toBe(5 + 3 + 1 + 0);
    expect(r.parts.map(p => p.n)).toEqual([5, 3, 1, 0]);
  });

  it("sisters' rule: on time counts in full (5); jamāʿah stays 5; made up unchanged", () => {
    const day = { prayers: { Fajr: "ontime", Dhuhr: "congregation", Asr: "madeup" }, amal: {} };
    expect(pts.dayProvisions(day, { homeFull: true }).total).toBe(11);
    expect(pts.dayProvisions(day).total).toBe(9);
    const S = fresh(); allFive(S, TODAY, "ontime");
    expect(pts.provisions(S, { today: TODAY }).total).toBe(15);
    S.settings.provisions.homeFull = true;
    expect(pts.provisions(S, { today: TODAY }).total).toBe(25);
  });

  it("Witr 2, made up 1, missed 0; not counted on an excused day", () => {
    expect(pts.dayProvisions({ prayers: {}, witr: "done" }).total).toBe(2);
    expect(pts.dayProvisions({ prayers: {}, witr: "madeup" }).total).toBe(1);
    expect(pts.dayProvisions({ prayers: {}, witr: "missed" }).total).toBe(0);
    expect(pts.dayProvisions({ prayers: {}, witr: "done", excused: true }).total).toBe(5 * W.excused.base);
    expect(pts.dayProvisions({ prayers: { Isha: "excused" }, witr: "done" }).total).toBe(W.excused.base);
  });

  it("sunnah 1 each capped at 10, and only chips still allowed by the fard's status", () => {
    const S = fresh(), k = TODAY;
    store.setPrayer(S, k, "Fajr", "ontime", NOW);
    store.setSunnah(S, k, "fajr-b2", true);
    store.setSunnah(S, k, "dhuhr-b4", true);
    // a chip logged before the fard was marked missed no longer counts
    store.setPrayer(S, k, "Dhuhr", "missed", NOW);
    let r = pts.dayProvisions(S.days[k]);
    expect(r.parts.find(p => p.kind === "sunnah").count).toBe(1);
    // unknown ids never count
    S.days[k].sunnah.nonsense = true;
    expect(pts.dayProvisions(S.days[k]).parts.find(p => p.kind === "sunnah").count).toBe(1);
    // cap
    const many = { prayers: {}, sunnah: {} };
    for (const id of ["fajr-b2", "dhuhr-b4", "dhuhr-a2", "dhuhr-a2n", "asr-b4", "maghrib-a2", "maghrib-awwabin", "isha-b4", "isha-a2", "witr-a2n", "ishraq", "duha", "tahajjud"]) many.sunnah[id] = true;
    r = pts.dayProvisions(many);
    expect(r.parts.find(p => p.kind === "sunnah")).toMatchObject({ count: 13, n: 10 });
  });

  it("Good Deeds 1 each, capped at 10", () => {
    const amal = {};
    for (let i = 0; i < 12; i++) amal["d" + i] = { done: true };
    amal.off = { done: false };
    expect(pts.dayProvisions({ prayers: {}, amal: { a: { done: true }, b: { done: true } } }).total).toBe(2);
    expect(pts.dayProvisions({ prayers: {}, amal }).total).toBe(10);
  });

  it("make-ups 1 each, capped at 5 a day (exact from dayLog)", () => {
    const S = fresh(); S.qada.Fajr = 20; S.qada.fasts = 3;
    for (let i = 0; i < 7; i++) store.madeUpPrayer(S, "Fajr", NOW);
    store.madeUpFast(S, NOW);
    expect(S.qada.dayLog[TODAY]).toEqual({ prayers: 7, fasts: 1 });
    expect(S.qada.monthLog["2026-11"]).toEqual({ prayers: 7, fasts: 1 }); // unchanged format
    const r = pts.provisions(S, { today: TODAY });
    expect(r.total).toBe(5);
    expect(pts.dayBreakdown(S, TODAY, { today: TODAY }).parts).toEqual([{ id: "makeups", kind: "makeups", count: 8, n: 5 }]);
  });

  it("excused: base 3 per prayer time, 5 with remembrance (only on excused prayers)", () => {
    const S = fresh(), k = TODAY;
    store.setExcusedDay(S, k, true, NOW);
    expect(pts.provisions(S, { today: TODAY }).total).toBe(15);
    expect(store.setRemember(S, k, "Fajr", true, NOW)).toBe(true);
    expect(store.setRemember(S, k, "Asr", true, NOW)).toBe(true);
    expect(pts.provisions(S, { today: TODAY }).total).toBe(3 * 3 + 2 * 5);
    // a prayer actually logged on an excused day counts as logged; remembrance can't be ticked for it
    store.setPrayer(S, k, "Maghrib", "ontime", NOW);
    expect(store.setRemember(S, k, "Maghrib", true, NOW)).toBe(false);
    expect(pts.provisions(S, { today: TODAY }).total).toBe(2 * 3 + 2 * 5 + 3);
    // not excused: refused
    expect(store.setRemember(S, "2026-11-10", "Fajr", true, NOW)).toBe(false);
    expect(S.days["2026-11-10"]).toBeUndefined();
    // a stale tick (prayer no longer excused) doesn't count
    S.days[k].remember.Maghrib = true;
    expect(store.remembered(S.days[k], "Maghrib")).toBe(false);
    expect(pts.provisions(S, { today: TODAY }).total).toBe(2 * 3 + 2 * 5 + 3);
    // unticking
    store.setRemember(S, k, "Fajr", false, NOW);
    expect(S.days[k].remember.Fajr).toBeUndefined();
  });

  it("future days and days before createdKey count nothing", () => {
    const S = fresh("2026-11-05");
    S.days["2026-11-04"] = { prayers: { Fajr: "congregation" }, amal: {} };
    S.days["2026-11-13"] = { prayers: { Fajr: "congregation" }, amal: {} };
    S.days["2026-11-06"] = { prayers: { Fajr: "congregation" }, amal: {} };
    const r = pts.provisions(S, { today: TODAY });
    expect(r.total).toBe(5);
    expect(Object.keys(r.byDay)).toEqual(["2026-11-06"]);
    expect(pts.dayBreakdown(S, "2026-11-13", { today: TODAY }).total).toBe(0);
  });

  it("from / to limit the range (week figure)", () => {
    const S = fresh();
    for (let d = 1; d <= 12; d++) S.days[`2026-11-${String(d).padStart(2, "0")}`] = { prayers: { Fajr: "ontime" }, amal: {} };
    const wk = pts.weekRange(TODAY); // Mon 9 to Thu 12
    expect(wk).toEqual({ from: "2026-11-09", to: TODAY });
    expect(pts.provisions(S, { ...wk, today: TODAY }).total).toBe(12);
    expect(pts.provisions(S, { today: TODAY }).total).toBe(36);
  });
});

describe("points: levels", () => {
  it("curve boundaries", () => {
    expect(pts.needFor(1)).toBe(0);
    expect(pts.needFor(2)).toBe(200);
    expect(pts.needFor(5)).toBe(2000);
    expect(pts.needFor(10)).toBe(9000);
    expect(pts.levelFor(0)).toBe(1);
    expect(pts.levelFor(199)).toBe(1);
    expect(pts.levelFor(200)).toBe(2);
    expect(pts.levelFor(599)).toBe(2);
    expect(pts.levelFor(600)).toBe(3);
    expect(pts.levelFor(1199)).toBe(3);
    expect(pts.levelFor(1200)).toBe(4);
    expect(pts.levelFor(9000)).toBe(10);
    expect(pts.levelFor(-5)).toBe(1);
    for (let n = 1; n < 60; n++) { expect(pts.levelFor(pts.needFor(n))).toBe(n); expect(pts.levelFor(pts.needFor(n) - 1)).toBe(Math.max(1, n - 1)); }
  });

  it("toNext and need/next", () => {
    const S = fresh();
    S.qada.dayLog = {}; S.days[TODAY] = { prayers: { Fajr: "congregation" }, amal: {} };
    const r = pts.provisions(S, { today: TODAY });
    expect(r).toMatchObject({ total: 5, level: 1, need: 0, next: 200, toNext: 195, version: "v1" });
  });

  it("levels never go down: best is kept when a re-tune lowers the total", () => {
    const S = fresh("2026-01-01");
    for (let d = parseKey("2026-01-01"); dkey(d) <= TODAY; d = addDays(d, 1)) S.days[dkey(d)] = { prayers: { Fajr: "congregation", Dhuhr: "ontime" }, amal: {} };
    const r = pts.provisions(S, { today: TODAY });
    expect(r.level).toBeGreaterThan(3);
    expect(store.recordLevel(S, r.level)).toBe(true);
    expect(store.recordLevel(S, r.level)).toBe(false);
    // a lower-weight version drops the computed level, the shown level stays
    pts.WEIGHTS.vTest = { ...W, fard: { congregation: 0, ontime: 0, madeup: 0, missed: 0 } };
    try {
      const low = pts.provisions(S, { today: TODAY, version: "vTest" });
      expect(low.level).toBe(1);
      expect(pts.displayLevel(S, { today: TODAY, version: "vTest" })).toBe(r.level);
      expect(pts.displayLevel(S, { level: r.level + 1 })).toBe(r.level + 1);
    } finally { delete pts.WEIGHTS.vTest; }
    // unknown version falls back to the current one
    expect(pts.provisions(S, { today: TODAY, version: "nope" }).version).toBe("v1");
  });

  it("retroactive total from a long synthetic history", () => {
    const S = fresh("2025-11-13"); // one year
    let expected = 0, i = 0;
    for (let d = parseKey("2025-11-13"); dkey(d) <= TODAY; d = addDays(d, 1), i++) {
      const k = dkey(d);
      const day = S.days[k] = { prayers: {}, amal: {}, note: "" };
      // a steady pattern: Fajr and ʿIshāʾ in jamāʿah, the rest on time, Witr, 2 sunnah, 3 deeds
      day.prayers = { Fajr: "congregation", Dhuhr: "ontime", Asr: "ontime", Maghrib: "ontime", Isha: "congregation" };
      day.witr = "done"; day.sunnah = { "fajr-b2": true, "maghrib-a2": true }; day.amal = { quran: { done: true }, morning: { done: true }, evening: { done: true } };
      expected += 5 + 3 + 3 + 3 + 5 + 2 + 2 + 3;
      if (i % 10 === 0) { day.prayers.Asr = "missed"; expected -= 3; }
    }
    const r = pts.provisions(S, { today: TODAY });
    expect(r.total).toBe(expected);
    expect(r.daysLogged).toBe(365);
    expect(r.since).toBe("2025-11-13");
    expect(r.level).toBe(pts.levelFor(expected));
    expect(r.total).toBeGreaterThanOrEqual(pts.needFor(r.level));
    expect(r.total).toBeLessThan(pts.needFor(r.level + 1));
  });
});

describe("points: make-ups from monthLog (old months) vs dayLog", () => {
  it("an old month without dayLog: min(total, 5 × days), spread evenly", () => {
    const S = fresh("2026-09-01");
    S.qada.monthLog["2026-09"] = { prayers: 40, fasts: 5 }; // 45 over 30 days: 1 or 2 a day
    S.qada.monthLog["2026-10"] = { prayers: 500, fasts: 0 }; // over the cap: 5 × 31
    const { byDay, approx } = pts.makeupsByDay(S, { today: TODAY });
    const sep = Object.entries(byDay).filter(([k]) => k.startsWith("2026-09"));
    expect(sep.length).toBe(30);
    expect(sep.reduce((a, [, n]) => a + n, 0)).toBe(45);
    expect(Math.max(...sep.map(([, n]) => n)) - Math.min(...sep.map(([, n]) => n))).toBeLessThanOrEqual(1);
    expect(byDay["2026-09-30"]).toBe(2); // remainders go to the later days
    expect(approx.has("2026-09-01")).toBe(true);
    const r = pts.provisions(S, { today: TODAY });
    expect(r.total).toBe(45 + 5 * 31);
  });

  it("only days in range count for the spread (created mid-month, current month up to today)", () => {
    const S = fresh("2026-09-21"); // 10 days of September
    S.qada.monthLog["2026-09"] = { prayers: 100, fasts: 0 };
    S.qada.monthLog["2026-11"] = { prayers: 100, fasts: 0 }; // only 1..12 Nov so far
    expect(pts.provisions(S, { today: TODAY }).total).toBe(5 * 10 + 5 * 12);
  });

  it("a month with dayLog: exact days, and only the remainder is spread", () => {
    const S = fresh("2026-11-01");
    S.qada.Fajr = 50;
    S.qada.monthLog["2026-11"] = { prayers: 4, fasts: 0 }; // logged before dayLog existed
    for (let i = 0; i < 3; i++) store.madeUpPrayer(S, "Fajr", NOW); // 3 on the 12th, exact
    expect(S.qada.monthLog["2026-11"].prayers).toBe(7);
    const { byDay } = pts.makeupsByDay(S, { today: TODAY });
    expect(byDay[TODAY]).toBe(3);
    expect(Object.values(byDay).reduce((a, b) => a + b, 0)).toBe(7);
    expect(pts.provisions(S, { today: TODAY }).total).toBe(7);
    // a fully exact month spreads nothing
    const T = fresh("2026-11-01"); T.qada.Fajr = 9;
    for (let i = 0; i < 9; i++) store.madeUpPrayer(T, "Fajr", NOW);
    expect(pts.makeupsByDay(T, { today: TODAY }).byDay).toEqual({ [TODAY]: 9 });
    expect(pts.provisions(T, { today: TODAY }).total).toBe(5);
  });
});

describe("store: day.first, remembrance, provisions settings", () => {
  it("day.first is set once on the first log and never overwritten", () => {
    const S = fresh();
    const t1 = new Date(2026, 10, 12, 6, 0), t2 = new Date(2026, 10, 12, 9, 0);
    store.getDay(S, TODAY); // viewing doesn't create or stamp
    expect(S.days[TODAY]).toBeUndefined();
    store.setPrayer(S, TODAY, "Fajr", "ontime", t1);
    expect(S.days[TODAY].first).toBe(t1.getTime());
    store.setPrayer(S, TODAY, "Fajr", "congregation", t2);
    store.setWitr(S, TODAY, "done", t2);
    store.setAmal(S, TODAY, "quran", true, "", t2);
    store.setSunnah(S, TODAY, "fajr-b2", true, t2);
    expect(S.days[TODAY].first).toBe(t1.getTime());
    // each kind of log stamps an empty day
    const k = "2026-11-10";
    store.setAmal(S, k, "quran", true, "", t2); expect(S.days[k].first).toBe(t2.getTime());
    store.setSunnah(S, "2026-11-09", "fajr-b2", true, t1); expect(S.days["2026-11-09"].first).toBe(t1.getTime());
    store.setWitr(S, "2026-11-08", "done", t1); expect(S.days["2026-11-08"].first).toBe(t1.getTime());
    store.setExcusedDay(S, "2026-11-07", true, t1); expect(S.days["2026-11-07"].first).toBeUndefined();
    store.setRemember(S, "2026-11-07", "Fajr", true, t2); expect(S.days["2026-11-07"].first).toBe(t2.getTime());
    // clearing doesn't stamp
    store.setPrayer(S, "2026-11-06", "Fajr", null, t1); expect(S.days["2026-11-06"].first).toBeUndefined();
  });

  it("merge keeps the earliest day.first, whichever copy's edit wins", () => {
    const a = fresh(), b = fresh();
    a.profile.onboarded = b.profile.onboarded = true;
    a.days[TODAY] = { prayers: { Fajr: "ontime" }, amal: {}, note: "", first: 1000, u: 5000 };
    b.days[TODAY] = { prayers: { Fajr: "congregation" }, amal: {}, note: "", first: 2000, u: 9000 };
    a.days["2026-11-10"] = { prayers: { Fajr: "ontime" }, amal: {}, note: "", u: 10 };
    b.days["2026-11-10"] = { prayers: { Fajr: "missed" }, amal: {}, note: "", first: 300, u: 5 };
    const m = store.mergeStates(a, b);
    expect(m.days[TODAY].prayers.Fajr).toBe("congregation");
    expect(m.days[TODAY].first).toBe(1000);
    expect(m.days["2026-11-10"].prayers.Fajr).toBe("ontime");
    expect(m.days["2026-11-10"].first).toBe(300);
    expect(b.days[TODAY].first).toBe(2000); // inputs untouched
    expect(a.days["2026-11-10"].first).toBeUndefined();
    const m2 = store.mergeStates(b, a);
    expect(m2.days[TODAY].first).toBe(1000);
  });

  it("merge keeps the higher best level", () => {
    const a = fresh(), b = fresh();
    a.profile.onboarded = b.profile.onboarded = true;
    a.settings.provisions.best = 6; a.updatedAt = 1;
    b.settings.provisions.best = 3; b.updatedAt = 2;
    expect(store.mergeStates(a, b).settings.provisions.best).toBe(6);
  });

  it("old saves get provisions settings, dayLog and keep everything else", () => {
    const old = {
      version: 2, createdKey: "2026-03-01", profile: { name: "R", onboarded: true },
      settings: { madhhab: "hanafi", asr: "hanafi", method: "Karachi" },
      days: { "2026-03-02": { prayers: { Fajr: "ontime" }, amal: {}, note: "", u: 1 } },
      qada: { Fajr: 3, monthLog: { "2026-03": { prayers: 2, fasts: 0 } }, addedLog: {} },
    };
    const S = store.normalize(old, NOW);
    expect(S.settings.provisions).toEqual({ on: false, homeFull: false, home: false, tracker: false, best: 1, weights: "v1", offered: false });
    expect(S.qada.dayLog).toEqual({});
    expect(S.qada.monthLog).toEqual({ "2026-03": { prayers: 2, fasts: 0 } });
    expect(S.days["2026-03-02"].first).toBeUndefined();
    expect(pts.provisions(S, { today: TODAY }).total).toBe(3 + 2);
    // partial / bad provisions settings are filled in
    const P = store.normalize({ settings: { provisions: { on: true, best: "x", weights: 4 } } }, NOW);
    expect(P.settings.provisions).toMatchObject({ on: true, best: 1, weights: "v1", homeFull: false });
    expect(store.normalize({ settings: { provisions: { on: true, best: 4 } } }, NOW).settings.provisions.best).toBe(4);
    // new installs
    expect(store.defaultState(NOW).settings.provisions.on).toBe(false);
  });
});
