import { describe, it, expect } from "vitest";
import * as store from "../src/store.js";
import * as pv from "../src/provisions.js";
import { needFor } from "../src/points.js";
import { PRAYERS, dkey, addDays, parseKey } from "../src/util.js";
import { PROVISIONS } from "../src/strings.js";

const NOW = new Date(2026, 10, 12, 15, 0); // Thu 12 Nov 2026
const TODAY = "2026-11-12";
const fresh = (created = "2026-11-01") => { const S = store.defaultState(NOW); S.createdKey = created; S.profile.onboarded = true; return S; };
const back = n => dkey(addDays(parseKey(TODAY), -n));
/** n days of all five in jamāʿah (25 a day), ending today. */
const fill = (S, n, status = "congregation") => { for (let i = 0; i < n; i++) for (const p of PRAYERS) store.setPrayer(S, back(i), p, status, NOW); };

describe("provisions UI: the one-time offer (P3)", () => {
  it("is due only after 7 days of use", () => {
    expect(pv.offerDue(fresh(back(6)), TODAY)).toBe(false);
    expect(pv.offerDue(fresh(back(7)), TODAY)).toBe(true);
    expect(pv.daysOfUse(fresh(back(7)), TODAY)).toBe(7);
  });
  it("never before set-up, once offered, or when already on", () => {
    const a = fresh(back(30)); a.profile.onboarded = false;
    expect(pv.offerDue(a, TODAY)).toBe(false);
    const b = fresh(back(30)); pv.dismissOffer(b);
    expect(pv.offerDue(b, TODAY)).toBe(false);
    expect(b.settings.provisions.on).toBe(false);
    const c = fresh(back(30)); pv.turnOn(c, TODAY);
    expect(pv.offerDue(c, TODAY)).toBe(false);
    expect(c.settings.provisions.offered).toBe(true);
  });
});

describe("provisions UI: turning on and the history result (P3b)", () => {
  it("records the history level silently, so it is never shown as a level-up", () => {
    const S = fresh(back(60)); fill(S, 30); // 30 × 25 = 750 → Level 3
    const s = pv.turnOn(S, TODAY);
    expect(s.total).toBe(750);
    expect(s.level).toBe(3);
    expect(s.toNext).toBe(needFor(4) - 750);
    expect(s.daysLogged).toBe(30);
    expect(s.since).toBe(back(29));
    expect(S.settings.provisions.best).toBe(3);
    expect(pv.checkLevelUp(S, TODAY)).toBe(0);
  });
});

describe("provisions UI: level-up detection (P6) via recordLevel", () => {
  it("reports a new level once, then not again", () => {
    const S = fresh(back(60)); fill(S, 7); // 175 → Level 1
    pv.turnOn(S, TODAY);
    expect(pv.checkLevelUp(S, TODAY)).toBe(0);
    fill(S, 8); // + 25 → 200 → Level 2
    expect(pv.checkLevelUp(S, TODAY)).toBe(2);
    expect(S.settings.provisions.best).toBe(2);
    expect(pv.checkLevelUp(S, TODAY)).toBe(0);
  });
  it("levels never go down: a lower total keeps the shown level", () => {
    const S = fresh(back(60)); fill(S, 8); pv.turnOn(S, TODAY); // Level 2
    for (const p of PRAYERS) store.setPrayer(S, TODAY, p, null, NOW);
    const s = pv.pvSummary(S, TODAY);
    expect(s.total).toBeLessThan(200);
    expect(s.level).toBe(2);
    expect(s.frac).toBe(0);
    expect(pv.checkLevelUp(S, TODAY)).toBe(0);
  });
  it("records nothing while off", () => {
    const S = fresh(back(60)); fill(S, 30);
    expect(pv.checkLevelUp(S, TODAY)).toBe(0);
    expect(S.settings.provisions.best).toBe(1);
  });
});

describe("provisions UI: nothing when off", () => {
  it("chips and the day breakdown are hidden unless on AND their option is on", () => {
    const S = fresh(back(30)); fill(S, 3);
    S.settings.provisions.home = true; S.settings.provisions.tracker = true;
    expect(pv.pvOn(S)).toBe(false);
    expect(pv.homeChipOn(S)).toBe(false);
    expect(pv.trackerDay(S, TODAY, TODAY)).toBeNull();
    pv.turnOn(S, TODAY);
    expect(pv.homeChipOn(S)).toBe(true);
    expect(pv.trackerDay(S, TODAY, TODAY).total).toBe(25);
    S.settings.provisions.tracker = false;
    expect(pv.trackerDay(S, TODAY, TODAY)).toBeNull();
    pv.turnOff(S);
    expect(pv.homeChipOn(S)).toBe(false);
  });
  it("this week sums from Sunday (the app's week) to today", () => {
    const S = fresh(back(30)); fill(S, 10); // Thu 12: the week is Sun 8 – Thu 12, 5 days
    pv.turnOn(S, TODAY);
    expect(pv.pvSummary(S, TODAY).week).toBe(5 * 25);
  });
});

describe("provisions UI: wording", () => {
  it("says provisions and gathered, never points, earn, won or Ṣaḥīḥ", () => {
    const text = JSON.stringify(PROVISIONS, (k, v) => (typeof v === "function" ? v(4, 5, "3 March") : v));
    expect(text).not.toMatch(/\bpoints?\b|\bearned\b|\bwon\b|XP|Ṣaḥīḥ|Sahih|Draft/i);
    expect(text).toMatch(/gathered/);
    expect(PROVISIONS.niyyahSrc).toBe("al-Bukhārī 1");
  });
});

describe("provisions UI: scoring settings changes are recorded silently (no level-up)", () => {
  it("turning on 'Prayer at home counts in full' re-counts the history without a level-up", () => {
    const S = fresh(back(60)); fill(S, 8, "ontime"); // 8 × 15 = 120 → Level 1
    pv.turnOn(S, TODAY);
    expect(S.settings.provisions.best).toBe(1);
    S.settings.provisions.homeFull = true; // 8 × 25 = 200 → Level 2, nothing new was done
    expect(pv.checkLevelUp(S, TODAY)).toBe(0);
    expect(S.settings.provisions.best).toBe(2); // recorded, so it never shows later either
    expect(pv.checkLevelUp(S, TODAY)).toBe(0);
    // a real level reached afterwards still shows
    fill(S, 24, "ontime"); // 24 × 25 = 600 → Level 3
    expect(pv.checkLevelUp(S, TODAY)).toBe(3);
  });
  it("choosing sister (applyGender sets homeFull) doesn't show a level-up", () => {
    const S = fresh(back(60)); fill(S, 8, "ontime");
    pv.turnOn(S, TODAY);
    store.applyGender(S, "f", { todayKey: TODAY }, NOW);
    expect(S.settings.provisions.homeFull).toBe(true);
    expect(pv.checkLevelUp(S, TODAY)).toBe(0);
    expect(S.settings.provisions.best).toBe(2);
  });
  it("a new weights version is a settings change too; an older save without a signature starts from its first check", () => {
    const S = fresh(back(60)); fill(S, 7); pv.turnOn(S, TODAY); // 175
    S.settings.provisions.weights = "v9"; // unknown versions fall back to v1: the signature still changed
    expect(pv.checkLevelUp(S, TODAY)).toBe(0);
    const T = fresh(back(60)); fill(T, 7); pv.turnOn(T, TODAY);
    delete T.settings.provisions.sig; // saved before the signature existed
    fill(T, 8); // 200 → Level 2, earned
    expect(pv.checkLevelUp(T, TODAY)).toBe(2);
  });
});

describe("provisions UI: one count per state (memo on the app's revision)", () => {
  it("repeated calls with the same revision reuse the count; a new revision, day, started list or setting re-counts", () => {
    const S = fresh(back(60)); fill(S, 4); pv.turnOn(S, TODAY); // 100
    const c1 = { rev: 1, started: PRAYERS };
    expect(pv.pvSummary(S, TODAY, c1).total).toBe(100);
    fill(S, 5); // +25, but the app's revision hasn't moved (as with touched(): tool counters only)
    expect(pv.pvSummary(S, TODAY, c1).total).toBe(100); // reused, not re-scored
    expect(pv.checkLevelUp(S, TODAY, c1)).toBe(0);
    expect(pv.pvSummary(S, TODAY, { rev: 2, started: PRAYERS }).total).toBe(125);
    expect(pv.pvSummary(S, back(-1), { rev: 2, started: PRAYERS }).total).toBe(125); // another today: re-counted (same here)
    // same revision, but a scoring setting changed: re-counted
    const T = fresh(back(60)); fill(T, 2, "ontime"); pv.turnOn(T, TODAY);
    const c = { rev: 7, started: PRAYERS };
    expect(pv.pvSummary(T, TODAY, c).total).toBe(30);
    T.settings.provisions.homeFull = true;
    expect(pv.pvSummary(T, TODAY, c).total).toBe(50);
    // without a revision (tests, one-off callers) nothing is reused
    fill(T, 3, "ontime");
    expect(pv.pvSummary(T, TODAY).total).toBe(75);
  });
  it("today's excused prayers wait for their time (ctx.started), and a new started list re-counts", () => {
    const S = fresh(back(60)); pv.turnOn(S, TODAY);
    store.setExcusedDay(S, TODAY, true, NOW);
    expect(pv.pvSummary(S, TODAY, { rev: 1, started: ["Fajr", "Dhuhr"] }).total).toBe(6);
    expect(pv.pvSummary(S, TODAY, { rev: 1, started: ["Fajr", "Dhuhr", "Asr"] }).total).toBe(9);
    expect(pv.trackerDay(S, TODAY, TODAY, { started: ["Fajr"] })).toBeNull(); // tracker chip off
    S.settings.provisions.tracker = true;
    expect(pv.trackerDay(S, TODAY, TODAY, { started: ["Fajr"] }).total).toBe(3);
  });
  it("pvSummary's level is points.displayLevel (never below the best shown)", () => {
    const S = fresh(back(60)); fill(S, 2); pv.turnOn(S, TODAY);
    S.settings.provisions.best = 5;
    expect(pv.pvSummary(S, TODAY).level).toBe(5);
  });
});
