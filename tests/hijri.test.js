import { describe, it, expect, beforeEach } from "vitest";
import { hijriLabel, hijriParts, hijriMonth, calcParts, calendarAvailable, normalizeHijri, setHijriSource, CALENDARS } from "../src/hijri.js";
import {
  dayNum, keyOfDayNum, startOffset, committeeParts, storeCommittee, putMonth, committeeData, resetCommitteeCache,
  monthToSet, plausibleStart, suggestedHijri, monthId,
} from "../src/hijri-committees.js";

const UQ = n => calcParts(n, CALENDARS.umalqura);
const at = (key, st) => hijriParts(key, st);
const mem = {};
globalThis.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };

beforeEach(() => { for (const k in mem) delete mem[k]; resetCommitteeCache(); setHijriSource(() => null); });

describe("calculated dates", () => {
  it("Umm al-Qura: Ramadan 1445 started 11 Mar 2024 and Eid al-Fitr was 10 Apr 2024", () => {
    expect(at("2024-03-10")).toMatchObject({ y: 1445, m: 8, d: 29 });
    expect(at("2024-03-11")).toMatchObject({ y: 1445, m: 9, d: 1 });
    expect(at("2024-04-09")).toMatchObject({ y: 1445, m: 9, d: 30 });
    expect(at("2024-04-10")).toMatchObject({ y: 1445, m: 10, d: 1 });
  });
  it("labels read '1 Ramadan 1445' and the month number is 9 in Ramadan", () => {
    expect(hijriLabel(new Date(2024, 2, 11))).toBe("1 Ramadan 1445");
    expect(hijriMonth(new Date(2024, 2, 20))).toBe(9);
  });
  it("every month has 29 or 30 days and days count up without gaps", () => {
    let prev = at("2025-01-01"), longest = 0;
    for (let n = dayNum("2025-01-02"); n < dayNum("2027-01-01"); n++) {
      const p = UQ(n);
      if (p.d === 1) { expect([29, 30]).toContain(prev.d); longest = Math.max(longest, prev.d); }
      else expect(p.d).toBe(prev.d + 1);
      prev = p;
    }
    expect(longest).toBe(30);
  });
  it("civil and tabular calendars are available and give a nearby date", () => {
    for (const m of ["civil", "tbla"]) {
      expect(calendarAvailable(m)).toBe(true);
      const a = at("2026-11-10", { method: m });
      const b = at("2026-11-10", { method: "umalqura" });
      expect(a.y).toBe(b.y);
      expect(Math.abs((a.m - b.m) * 30 + (a.d - b.d))).toBeLessThanOrEqual(3);
    }
  });
  it("an unknown method or bad adjust falls back safely", () => {
    expect(normalizeHijri({ method: "nope", adjust: 9 })).toEqual({ method: "umalqura", committee: "", adjust: 2 });
    expect(normalizeHijri(null).adjust).toBe(0);
    expect(normalizeHijri({ adjust: -7 }).adjust).toBe(-2);
  });
});

describe("manual adjustment", () => {
  it("moves the date by whole days, across month ends", () => {
    expect(at("2024-03-10", { adjust: 1 })).toMatchObject({ m: 9, d: 1 });
    expect(at("2024-03-11", { adjust: -1 })).toMatchObject({ m: 8, d: 29 });
    expect(at("2024-03-11", { adjust: 2 })).toMatchObject({ m: 9, d: 3 });
    expect(at("2024-03-11", { adjust: -2 })).toMatchObject({ m: 8, d: 28 });
  });
  it("hijriLabel(date) uses the registered settings", () => {
    setHijriSource(() => ({ method: "umalqura", adjust: 1 }));
    expect(hijriLabel(new Date(2024, 2, 10))).toBe("1 Ramadan 1445");
    setHijriSource(() => null);
    expect(hijriLabel(new Date(2024, 2, 10))).toBe("29 Sha'ban 1445");
  });
});

// A committee that started Ramadan a day AFTER Umm al-Qura (12 Mar, calc says 11 Mar), and Shawwal on 10 Apr
const docs = [
  { id: "1445-08", startDate: "2024-02-11" },
  { id: "1445-09", startDate: "2024-03-12" },
  { id: "1445-10", startDate: "2024-04-10" },
];
const follow = { method: "committee", committee: "chc-na", adjust: 0 };

describe("committee dates", () => {
  beforeEach(() => { storeCommittee("chc-na", docs, UQ); });

  it("counts from the committee's month start", () => {
    expect(at("2024-03-11", follow)).toMatchObject({ m: 8, d: 30, source: "committee" });
    expect(at("2024-03-12", follow)).toMatchObject({ y: 1445, m: 9, d: 1, source: "committee" });
    expect(at("2024-03-20", follow)).toMatchObject({ m: 9, d: 9 });
  });
  it("29 / 30 day boundary: a 29-day Ramadan ends on day 29 and ʿĪd (1 Shawwal) is the next day", () => {
    expect(at("2024-04-09", follow)).toMatchObject({ m: 9, d: 29 });
    expect(at("2024-04-10", follow)).toMatchObject({ m: 10, d: 1 });
  });
  it("a 30-day month reaches day 30", () => {
    expect(at("2024-03-11", follow).d).toBe(30); // 11 Feb -> 12 Mar is 30 days
  });
  it("after the latest known start, uses the calculated date plus the cached offset", () => {
    expect(committeeData("chc-na").offset).toBe(0);
    expect(at("2024-04-25", follow)).toMatchObject({ m: 10, d: 16, source: "committee" });
  });
  it("applies a differing offset while the next month is undecided, predicting the boundary", () => {
    storeCommittee("chc-na", docs.slice(0, 2), UQ); // latest = Ramadan, a day later than calc
    expect(committeeData("chc-na").offset).toBe(-1);
    expect(at("2024-04-08", follow)).toMatchObject({ m: 9, d: 28 });
    expect(at("2024-04-09", follow)).toMatchObject({ m: 9, d: 29 });
    expect(at("2024-04-10", follow)).toMatchObject({ m: 9, d: 30 });
    expect(at("2024-04-11", follow)).toMatchObject({ m: 10, d: 1 });
  });
  it("a long time after the last decision it is marked as a fallback", () => {
    expect(at("2024-08-01", follow).source).toBe("fallback");
  });
  it("no data at all: the plain calculated date", () => {
    resetCommitteeCache(); for (const k in mem) delete mem[k];
    expect(at("2024-03-11", follow)).toMatchObject({ m: 9, d: 1, source: "calc" });
  });
  it("manual adjustment applies on top of a committee", () => {
    expect(at("2024-03-12", { ...follow, adjust: 1 })).toMatchObject({ m: 9, d: 2 });
    expect(at("2024-03-11", { ...follow, adjust: 1 })).toMatchObject({ m: 9, d: 1 });
  });
  it("Ramadan: days over the whole month are 1..29 with no repeats", () => {
    const days = [];
    for (let n = dayNum("2024-03-12"); n < dayNum("2024-04-10"); n++) days.push(at(keyOfDayNum(n), follow));
    expect(days.map(p => p.d)).toEqual(Array.from({ length: 29 }, (_, i) => i + 1));
    expect(new Set(days.map(p => p.m))).toEqual(new Set([9]));
  });
  it("bad rows from the server are ignored", () => {
    storeCommittee("x", [{ id: "1445-09", startDate: "not a date" }, { id: "bad", startDate: "2024-03-12" }, { id: "1445-10", startDate: "2024-02-31" }], UQ);
    expect(committeeData("x").months).toEqual({});
  });
  it("is cached in localStorage, so it works offline after a restart", () => {
    resetCommitteeCache();
    expect(at("2024-03-12", follow)).toMatchObject({ m: 9, d: 1 });
  });
  it("an editor's own save applies at once", () => {
    putMonth("chc-na", 1445, 11, "2024-05-09", UQ);
    expect(at("2024-05-08", follow)).toMatchObject({ m: 10 });
    expect(at("2024-05-09", follow)).toMatchObject({ m: 11, d: 1 });
    expect(Object.keys(committeeData("chc-na").months)).toContain(monthId(1445, 11));
  });
});

describe("helpers", () => {
  it("startOffset finds the nearest calculated first", () => {
    expect(startOffset(dayNum("2024-03-11"), UQ)).toBe(0);
    expect(startOffset(dayNum("2024-03-12"), UQ)).toBe(-1);
    expect(startOffset(dayNum("2024-03-10"), UQ)).toBe(1);
  });
  it("monthToSet picks the next month late in a month, rolling the year", () => {
    expect(monthToSet({ y: 1447, m: 5, d: 10 })).toEqual({ y: 1447, m: 5 });
    expect(monthToSet({ y: 1447, m: 5, d: 27 })).toEqual({ y: 1447, m: 6 });
    expect(monthToSet({ y: 1447, m: 12, d: 29 })).toEqual({ y: 1448, m: 1 });
  });
  it("plausibleStart accepts dates near the calculated 1st and rejects typos", () => {
    expect(plausibleStart("2024-03-12", 1445, 9, UQ)).toBe(true);
    expect(plausibleStart("2024-03-20", 1445, 9, UQ)).toBe(false);
    expect(plausibleStart("2024-13-01", 1445, 9, UQ)).toBe(false);
  });
  it("suggests the CHC for US and Canada, calculated for everyone else", () => {
    expect(suggestedHijri({ lang: "en-US" }).method).toBe("committee");
    expect(suggestedHijri({ lang: "en", tz: "America/Toronto" }).committee).toBe("chc-na");
    expect(suggestedHijri({ lang: "en-GB", tz: "Europe/London" }).method).toBe("umalqura");
    expect(suggestedHijri({ lang: "ar-SA", tz: "Asia/Riyadh" }).method).toBe("umalqura");
  });
  it("committeeParts works with plain data too", () => {
    const d = { months: { "1445-09": { startDate: "2024-03-12" } }, offset: null };
    expect(committeeParts(d, dayNum("2024-03-12"), UQ)).toMatchObject({ m: 9, d: 1 });
  });
});
