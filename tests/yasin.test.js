// Sūrah Yā-Sīn in For today, morning AND evening (user, 19 Nov 2026): two readings, each its own good deed and
// provision (the Mulk / Kahf / Manzil mechanism: day.reads plus the reader stamp in S.tools.read), windows as the
// adhkār's, off For today on an excused day (still in the Qurʾān chapter), and an untick that survives a sync.
import { describe, it, expect } from "vitest";
import * as store from "../src/store.js";
import * as pts from "../src/points.js";
import * as st from "../src/stats.js";
import { timesFor } from "../src/times.js";
import { dkey } from "../src/util.js";
import { readItems, setReadDone, isReadDone, YASIN } from "../src/reading.js";
import { READ } from "../src/strings.js";

const TUE = new Date(2026, 10, 17), K = dkey(TUE);
const fresh = () => { const S = store.defaultState(TUE); S.profile.onboarded = true; S.createdKey = dkey(new Date(2026, 10, 1)); return S; };
const at = (S, p, min = 20) => new Date(+timesFor(TUE, S.settings)[p] + min * 60000);
const copy = o => JSON.parse(JSON.stringify(o));
const provisionsOf = (S, key) => pts.provisions(S, { today: key }).total;

describe("Yā-Sīn on For today", () => {
  it("is two items, morning and evening, each with its own title", () => {
    const S = fresh(), ids = readItems(S, at(S, "Dhuhr")).map(i => i.id);
    expect(ids).toContain("yasinAm");
    expect(ids).toContain("yasinPm");
    expect(READ.item.yasinAm).toMatch(/Yā-Sīn/);
    expect(READ.item.yasinPm).toMatch(/Yā-Sīn/);
    expect(READ.item.yasinAm).not.toBe(READ.item.yasinPm);
  });
  it("morning is due now from Fajr until ʿAsr, like the morning adhkār", () => {
    const S = fresh(), now = at(S, "Fajr");
    const am = readItems(S, now).find(i => i.id === "yasinAm"), mo = readItems(S, now).find(i => i.id === "morning");
    expect(am.sub).toBe(READ.nowUntil("ʿAsr"));
    expect(am.sub).toBe(mo.sub);
    expect(readItems(S, at(S, "Maghrib")).find(i => i.id === "yasinAm").sub).toBe(READ.earlierToday);
  });
  it("evening is due from ʿAsr, like the evening adhkār", () => {
    const S = fresh();
    const ev = now => readItems(S, now).find(i => i.id === "yasinPm").sub;
    expect(ev(at(S, "Dhuhr"))).toBe(readItems(S, at(S, "Dhuhr")).find(i => i.id === "evening").sub);
    expect(ev(at(S, "Asr"))).toBe(READ.nowUntil("Maghrib"));
    expect(ev(at(S, "Isha"))).toBe(READ.tonight);
  });
  it("leaves For today on an excused day, like al-Mulk", () => {
    const S = fresh();
    store.ensureDay(S, K).excused = true;
    const ids = readItems(S, at(S, "Dhuhr")).map(i => i.id);
    for (const id of [...YASIN, "mulk"]) expect(ids).not.toContain(id);
  });
  it("follows the Qurʾān reader in Settings → Features", async () => {
    const F = await import("../src/features.js");
    const S = fresh(); F.setToolHidden(S, "quran", true);
    expect(readItems(S, at(S, "Dhuhr")).some(i => YASIN.includes(i.id))).toBe(false);
  });
});

describe("Yā-Sīn counts: two good deeds, two provisions", () => {
  it("each tick writes the day log and the reader stamp", () => {
    const S = fresh(), now = at(S, "Dhuhr");
    setReadDone(S, "yasinAm", true, now);
    expect(S.days[K].reads.yasinAm).toBe(true);
    expect(S.tools.read[K].yasinAm).toBeGreaterThan(0);
    expect(isReadDone(S, "yasinAm", now)).toBe(true);
    expect(isReadDone(S, "yasinPm", now)).toBe(false);
    expect(pts.readsByDay(S)[K]).toEqual(["yasinAm"]);
  });
  it("morning and evening add one provision each", () => {
    const S = fresh(), now = at(S, "Isha");
    const base = provisionsOf(S, K);
    setReadDone(S, "yasinAm", true, now);
    const one = provisionsOf(S, K);
    setReadDone(S, "yasinPm", true, now);
    const two = provisionsOf(S, K);
    const each = pts.weightsFor(pts.CURRENT).deeds.each;
    expect(one - base).toBe(each);
    expect(two - base).toBe(2 * each);
    expect(each).toBe(1);
  });
  it("is a row in the Progress week (done today)", () => {
    const S = fresh(), now = at(S, "Isha");
    setReadDone(S, "yasinPm", true, now);
    expect(st.readDayState(S, K, "yasinPm", now)).toBe("done");
    expect(st.readDayState(S, K, "yasinAm", now)).toBe("pending");
  });
  it("does not count on an excused day (a Qurʾān reading)", () => {
    const S = fresh(), now = at(S, "Isha");
    setReadDone(S, "yasinAm", true, now);
    store.ensureDay(S, K).excused = true;
    expect(pts.countedReads(S.days[K], pts.readsByDay(S)[K])).not.toContain("yasinAm");
  });
});

describe("a Yā-Sīn untick survives the cloud sync", () => {
  for (const id of YASIN) {
    it(`${id}: tick, push, untick, merge → still unticked, both ways, and no provision`, () => {
      const S = fresh(), now = at(S, "Isha");
      setReadDone(S, id, true, now); S.updatedAt = 1000;
      const cloud = copy(S);
      setReadDone(S, id, false, now); S.updatedAt = 2000;
      const merged = store.mergeStates(S, cloud);
      expect(isReadDone(merged, id, now)).toBe(false);
      expect(pts.readsByDay(merged)[K] || []).not.toContain(id);
      expect(isReadDone(store.mergeStates(copy(cloud), copy(merged)), id, now)).toBe(false);
      expect(merged.tools.cleared[`read/${K}/${id}`]).toBeGreaterThan(0);
    });
    it(`${id}: Undo of an untick (restoreTools) keeps it done through the sync`, () => {
      const S = fresh(), now = at(S, "Isha");
      setReadDone(S, id, true, now); S.updatedAt = 1000;
      const cloud = copy(S), snap = copy({ tools: S.tools, day: S.days[K] });
      setReadDone(S, id, false, now);
      store.restoreTools(S, snap.tools); S.days[K] = snap.day; S.days[K].u = Date.now(); S.updatedAt = 3000;
      expect(isReadDone(store.mergeStates(S, cloud), id, now)).toBe(true);
    });
  }
});
