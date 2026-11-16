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
