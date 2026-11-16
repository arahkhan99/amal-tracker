import { describe, it, expect } from "vitest";
import * as store from "../src/store.js";
import * as pts from "../src/points.js";
import { insights } from "../src/stats.js";
import { dkey, addDays, PRAYERS } from "../src/util.js";
import { GENDER } from "../src/strings.js";

const NOW = new Date(2026, 10, 13, 13, 0); // Fri 13 Nov 2026, 1 PM local
const TODAY = "2026-11-13";
const fresh = () => { const S = store.defaultState(NOW); S.createdKey = "2026-11-01"; return S; };

describe("gender: profile field and migration", () => {
  it("new installs start not set", () => {
    expect(store.defaultState(NOW).profile.gender).toBe(null);
  });
  it("existing users (no field) stay not set, settings untouched", () => {
    const old = { profile: { name: "A", onboarded: true }, settings: { method: "Karachi", madhhab: "hanafi", excusedDays: false, jumuah: true } };
    const S = store.normalize(old, NOW);
    expect(S.profile.gender).toBe(null);
    expect(store.genderOf(S)).toBe(null);
    expect(S.settings.excusedDays).toBe(false);
    expect(S.settings.jumuah).toBe(true);
  });
  it("keeps a stored value and drops anything unknown", () => {
    expect(store.normalize({ profile: { gender: "f" } }, NOW).profile.gender).toBe("f");
    expect(store.normalize({ profile: { gender: "m" } }, NOW).profile.gender).toBe("m");
    expect(store.normalize({ profile: { gender: "x" } }, NOW).profile.gender).toBe(null);
  });
});

describe("gender: applyGender", () => {
  it("sister: excused days on, Jumuʿah off, prayer at home counts in full", () => {
    const S = fresh(); S.settings.excusedDays = false;
    expect(store.applyGender(S, "f", {}, NOW)).toBe("f");
    expect(S.profile.gender).toBe("f");
    expect(S.settings.excusedDays).toBe(true);
    expect(S.settings.jumuah).toBe(false);
    expect(S.settings.provisions.homeFull).toBe(true);
    // the sisters' rule then applies to provisions without passing it in
    store.setPrayer(S, TODAY, "Fajr", "ontime", NOW);
    expect(pts.provisions(S, { today: TODAY }).total).toBe(pts.WEIGHTS.v1.fardOntimeHomeFull);
  });
  it("brother: excused days off, Jumuʿah on, home-in-full off", () => {
    const S = fresh(); S.settings.jumuah = false; S.settings.provisions.homeFull = true;
    store.applyGender(S, "m", {}, NOW);
    expect(S.profile.gender).toBe("m");
    expect(S.settings.excusedDays).toBe(false);
    expect(S.settings.jumuah).toBe(true);
    expect(S.settings.provisions.homeFull).toBe(false);
  });
  it("prefer not to say: today's behaviour (both on), home-in-full left alone", () => {
    const S = fresh(); store.applyGender(S, "f", {}, NOW);
    store.applyGender(S, null, {}, NOW);
    expect(S.profile.gender).toBe(null);
    expect(S.settings.excusedDays).toBe(true);
    expect(S.settings.jumuah).toBe(true);
    expect(S.settings.provisions.homeFull).toBe(true);
    expect(store.applyGender(S, "anything", {}, NOW)).toBe(null);
  });
  it("each setting keeps its own switch after", () => {
    const S = fresh(); store.applyGender(S, "f", {}, NOW);
    S.settings.jumuah = true;
    expect(store.genderOf(S)).toBe("f");
    expect(S.settings.jumuah).toBe(true);
  });
  it("brother never unflags past excused days, and ends excused mode", () => {
    const S = fresh();
    const past = dkey(addDays(NOW, -10));
    store.setExcusedRange(S, past, dkey(addDays(NOW, -4)), true, NOW);
    store.startExcused(S, dkey(addDays(NOW, -1)), NOW);
    store.syncExcusedMode(S, TODAY);
    expect(store.isExcusedDay(S, TODAY)).toBe(true);
    store.applyGender(S, "m", { todayKey: TODAY, excusedPrayers: ["Fajr"] }, NOW);
    expect(S.excusedMode).toBe(null);
    expect(store.isExcusedDay(S, past)).toBe(true);
    expect(store.isExcusedDay(S, dkey(addDays(NOW, -1)))).toBe(true);
    expect(store.isExcusedDay(S, TODAY)).toBe(false); // today is due again, as with "End"
    expect(S.days[TODAY].prayers.Fajr).toBe("excused"); // already started while excused
  });
  it("gender is not sent with crash reports", async () => {
    const crash = await import("../src/crash.js");
    const keys = crash.CRASH_KEYS || [];
    expect(JSON.stringify(keys)).not.toMatch(/gender/);
  });
});

describe("gender: remembrance at prayer time", () => {
  it("only on excused prayers", () => {
    const S = fresh();
    expect(store.setRemember(S, TODAY, "Dhuhr", true, NOW)).toBe(false);
    store.setPrayer(S, TODAY, "Asr", "ontime", NOW);
    expect(store.setRemember(S, TODAY, "Asr", true, NOW)).toBe(false);
    store.setExcusedDay(S, TODAY, true, NOW);
    expect(store.setRemember(S, TODAY, "Dhuhr", true, NOW)).toBe(true);
    expect(store.remembered(S.days[TODAY], "Dhuhr")).toBe(true);
    expect(store.setRemember(S, TODAY, "Asr", true, NOW)).toBe(false); // prayed before the flag stays prayed
    store.setExcusedDay(S, TODAY, false, NOW);
    expect(store.remembered(S.days[TODAY], "Dhuhr")).toBe(false); // no longer excused: does not count
    expect(store.setRemember(S, TODAY, "Dhuhr", false, NOW)).toBe(true);
    expect(S.days[TODAY].remember).toBeUndefined();
  });
  it("never counts as a prayer", () => {
    const S = fresh(); store.setExcusedDay(S, TODAY, true, NOW);
    store.setRemember(S, TODAY, "Dhuhr", true, NOW);
    for (const p of PRAYERS) expect(store.isPrayed(store.prayerStatus(S, TODAY, p))).toBe(false);
  });
  it("wording mentions wuḍūʾ and the prayer place", () => {
    expect(GENDER.remember).toBe("Remembrance at prayer time");
    expect(GENDER.rememberSub).toMatch(/wuḍūʾ/);
    expect(GENDER.rememberSub).toMatch(/prayer place/);
  });
});

describe("gender: Progress insight", () => {
  it("sisters do not get the jamāʿah insight", () => {
    const S = fresh();
    for (let i = 1; i <= 6; i++) store.setPrayer(S, dkey(addDays(NOW, -i)), "Fajr", "congregation", NOW);
    const has = s => insights(s, NOW).good.some(x => /jam/i.test(x.title));
    expect(has(S)).toBe(true);
    store.applyGender(S, "f", {}, NOW);
    expect(has(S)).toBe(false);
  });
});
