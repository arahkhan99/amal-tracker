import { describe, it, expect } from "vitest";
import * as store from "../src/store.js";
import * as st from "../src/stats.js";
import { timesFor, currentWindow, nextPrayer, windowEnd } from "../src/times.js";
import { hijriLabel } from "../src/hijri.js";
import { planNotifications } from "../src/notify.js";
import { dkey, addDays, fmt12, PRAYERS } from "../src/util.js";
import { REFLECTIONS, reflectionFor } from "../src/reflections.js";

const NOW = new Date(2026, 8, 22, 14, 0); // Tue 22 Sep 2026, 2 PM local
const fresh = (created = "2026-09-01") => { const S = store.defaultState(NOW); S.createdKey = created; return S; };

describe("store: prayers and qada", () => {
  it("marking missed adds to qada and changing it removes it", () => {
    const S = fresh();
    store.setPrayer(S, "2026-09-22", "Asr", "missed", NOW);
    expect(S.qada.Asr).toBe(1);
    expect(store.addedToday(S, NOW)).toBe(1);
    store.setPrayer(S, "2026-09-22", "Asr", "ontime", NOW);
    expect(S.qada.Asr).toBe(0);
    expect(store.addedToday(S, NOW)).toBe(0);
    store.setPrayer(S, "2026-09-22", "Asr", "missed", NOW);
    store.setPrayer(S, "2026-09-22", "Asr", null, NOW);
    expect(S.qada.Asr).toBe(0);
    expect(S.days["2026-09-22"].prayers.Asr).toBeUndefined();
  });

  it("re-marking missed doesn't double count", () => {
    const S = fresh();
    store.setPrayer(S, "2026-09-22", "Fajr", "missed", NOW);
    store.setPrayer(S, "2026-09-22", "Fajr", "missed", NOW);
    expect(S.qada.Fajr).toBe(1);
  });

  it("made-up prayers count toward this month's goal and reset next month", () => {
    const S = fresh();
    S.qada.Fajr = 3;
    expect(store.madeUpPrayer(S, "Fajr", NOW)).toBe(true);
    expect(store.madeUpPrayer(S, "Fajr", NOW)).toBe(true);
    expect(S.qada.Fajr).toBe(1);
    expect(store.monthLog(S, NOW).prayers).toBe(2);
    expect(store.monthLog(S, new Date(2026, 9, 1)).prayers).toBe(0);
    S.qada.Dhuhr = 0;
    expect(store.madeUpPrayer(S, "Dhuhr", NOW)).toBe(false);
  });

  it("fasts", () => {
    const S = fresh(); S.qada.fasts = 1;
    expect(store.madeUpFast(S, NOW)).toBe(true);
    expect(store.madeUpFast(S, NOW)).toBe(false);
    expect(store.monthLog(S, NOW).fasts).toBe(1);
  });

  it("save/load round trip and normalize fills gaps", () => {
    const mem = { v: null, getItem() { return this.v; }, setItem(k, v) { this.v = v; } };
    const S = fresh(); S.profile.name = "Test"; store.setAmal(S, "2026-09-22", "quran", true, "Al-Baqarah 142");
    store.save(S, mem);
    const L = store.load(mem);
    expect(L.profile.name).toBe("Test");
    expect(L.days["2026-09-22"].amal.quran.detail).toBe("Al-Baqarah 142");
    const N = store.normalize({ days: {}, qada: { Fajr: 5 } });
    expect(N.qada.Fajr).toBe(5);
    expect(N.qada.monthLog).toEqual({});
    expect(N.settings.method).toBe("NorthAmerica");
  });

  it("lastDetail finds the most recent earlier entry", () => {
    const S = fresh();
    store.setAmal(S, "2026-09-20", "quran", true, "Al-Baqarah 100");
    store.setAmal(S, "2026-09-21", "quran", true, "Al-Baqarah 120");
    expect(store.lastDetail(S, "quran", "2026-09-22").detail).toBe("Al-Baqarah 120");
    expect(store.lastDetail(S, "quran", "2026-09-21").detail).toBe("Al-Baqarah 100");
  });
});

describe("prayer times", () => {
  const settings = { method: "NorthAmerica", asr: "shafi", location: { lat: 41.8781, lng: -87.6298, label: "Chicago" } };

  it("Chicago ISNA times are in a sane order and range", () => {
    // Process TZ may differ from Chicago; compare against UTC reference (Chicago is UTC-5 in September).
    const t = timesFor(new Date(2026, 8, 22, 12), settings);
    for (let i = 1; i < PRAYERS.length; i++) expect(t[PRAYERS[i]] > t[PRAYERS[i - 1]]).toBe(true);
    const utcH = d => d.getUTCHours() + d.getUTCMinutes() / 60;
    expect(utcH(t.Dhuhr)).toBeGreaterThan(17.5); // ~12:44 CDT = 17:44 UTC
    expect(utcH(t.Dhuhr)).toBeLessThan(18.2);
    expect(utcH(t.Fajr)).toBeGreaterThan(10); // ~5:25 CDT
    expect(utcH(t.Fajr)).toBeLessThan(11);
  });

  it("Hanafi Asr is later than standard", () => {
    const d = new Date(2026, 8, 22, 12);
    expect(timesFor(d, { ...settings, asr: "hanafi" }).Asr > timesFor(d, settings).Asr).toBe(true);
  });

  it("current window and next prayer", () => {
    const t = timesFor(NOW, settings);
    const mid = new Date((t.Dhuhr.getTime() + t.Asr.getTime()) / 2);
    const cur = currentWindow(mid, settings);
    expect(cur.p).toBe("Dhuhr");
    expect(cur.end.getTime()).toBe(t.Asr.getTime());
    expect(nextPrayer(mid, settings).p).toBe("Asr");
    const beforeFajr = new Date(t.Fajr.getTime() - 60000);
    expect(currentWindow(beforeFajr, settings).p).toBe("Isha");
    const afterSunrise = new Date(t.Sunrise.getTime() + 60000);
    expect(currentWindow(afterSunrise, settings)).toBeNull();
    expect(windowEnd(NOW, "Fajr", settings).getTime()).toBe(t.Sunrise.getTime());
  });

  it("falls back to a default location", () => {
    const t = timesFor(NOW, { method: "NorthAmerica", asr: "shafi", location: null });
    expect(t.Fajr instanceof Date).toBe(true);
  });
});

describe("stats", () => {
  function withHistory() {
    const S = fresh("2026-09-01");
    for (let i = 1; i <= 21; i++) {
      const k = dkey(addDays(NOW, -i));
      for (const p of PRAYERS) store.setPrayer(S, k, p, p === "Asr" && i <= 3 ? "missed" : p === "Fajr" ? "congregation" : "ontime", NOW);
      store.setAmal(S, k, "quran", true, "Al-Baqarah " + (100 + i));
      store.setAmal(S, k, "morning", true);
      if (i % 3 === 0) store.setAmal(S, k, "evening", true);
    }
    return S;
  }

  it("dayPct counts prayed prayers and done amal", () => {
    const S = fresh();
    store.setPrayer(S, "2026-09-22", "Fajr", "ontime", NOW);
    store.setPrayer(S, "2026-09-22", "Dhuhr", "missed", NOW);
    store.setAmal(S, "2026-09-22", "quran", true);
    expect(st.dayPct(S, NOW, NOW)).toBe(20); // 2 of 10
    expect(st.dayPct(S, new Date(2026, 7, 1), NOW)).toBeNull(); // before tracking
    expect(st.dayPct(S, addDays(NOW, 1), NOW)).toBeNull(); // future
  });

  it("week values: Monday-based, future null", () => {
    const S = withHistory();
    const w = st.weekPcts(S, NOW);
    expect(w.length).toBe(7);
    expect(w[0]).not.toBeNull(); // Monday
    expect(w[2]).toBeNull(); // Wednesday is in the future
  });

  it("streaks and insights reflect the data", () => {
    const S = withHistory();
    expect(st.amalStreak(S, "quran", NOW)).toBe(21);
    expect(st.prayerStreak(S, NOW)).toBe(0); // Asr missed yesterday
    const { good, warn } = st.insights(S, NOW);
    expect(good.some(g => g.title.startsWith("Fajr in congregation"))).toBe(true);
    expect(good.some(g => g.title.startsWith("Quran read on 21"))).toBe(true);
    expect(warn.some(w => w.title.startsWith("Asr missed 3 times"))).toBe(true);
    expect(warn.some(w => w.title.includes("at 0%") || w.title.includes("Salawat"))).toBe(true);
  });

  it("status counts, month and year", () => {
    const S = withHistory();
    const c = st.statusCounts(S, 7, NOW);
    expect(c.missed).toBe(3);
    expect(c.congregation).toBe(6);
    expect(st.monthDays(S, NOW).length).toBe(30);
    const y = st.yearMonths(S, 2026, NOW);
    expect(y[8]).not.toBeNull();
    expect(y[0]).toBeNull();
    expect(st.congregationCount(S, new Date(2026, 8, 1), NOW, NOW)).toBe(21);
  });

  it("empty history gives no insights and no crash", () => {
    const S = fresh("2026-09-22");
    const { good, warn } = st.insights(S, NOW);
    expect(good).toEqual([]);
    expect(warn).toEqual([]);
  });
});

describe("notifications plan", () => {
  it("schedules pre-qada reminders only for unlogged prayers and respects toggles", () => {
    const S = fresh(); S.settings.location = { lat: 41.8781, lng: -87.6298, label: "Chicago" };
    const early = new Date(2026, 8, 22, 0, 5);
    let plan = planNotifications(S, early);
    const ids = new Set(plan.map(n => n.id));
    expect(ids.size).toBe(plan.length); // unique ids
    expect(plan.every(n => n.at > early)).toBe(true);
    expect(plan.some(n => n.title.startsWith("Evening"))).toBe(true);
    store.setPrayer(S, dkey(early), "Dhuhr", "ontime", early);
    plan = planNotifications(S, early);
    expect(plan.some(n => n.id === 2001)).toBe(false); // today's Dhuhr reminder dropped
    S.settings.preQada = false; S.settings.evening = false;
    expect(planNotifications(S, early).length).toBe(0);
  });
});

describe("misc", () => {
  it("hijri label", () => {
    expect(hijriLabel(new Date(2026, 8, 22))).toMatch(/^\d{1,2} [A-Za-z' -]+ 14\d\d$/);
  });
  it("fmt12", () => {
    expect(fmt12(new Date(2026, 0, 1, 0, 5))).toBe("12:05 AM");
    expect(fmt12(new Date(2026, 0, 1, 13, 40))).toBe("1:40 PM");
  });
  it("reflections rotate", () => {
    expect(REFLECTIONS.length).toBeGreaterThan(50);
    expect(reflectionFor(NOW).en).toBeTruthy();
  });
});
