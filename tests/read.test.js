// The Read tab's rules (src/reading.js): what For today lists, ticks writing the same day log as the Good deeds
// sheet (so stats, Progress and Provisions count them), and the split of good deeds between Read and the sheet.
import { describe, it, expect } from "vitest";
import * as store from "../src/store.js";
import * as F from "../src/features.js";
import * as pts from "../src/points.js";
import * as st from "../src/stats.js";
import { timesFor } from "../src/times.js";
import { dkey } from "../src/util.js";
import { deedInRead, sheetDeeds, sheetCount, readItems, readCount, setReadDone, isReadDone, isJumuah, jumuahKey, READ_DEEDS } from "../src/reading.js";
import { READ } from "../src/strings.js";

const TUE = new Date(2026, 10, 17);
const K = dkey(TUE);
function fresh(day = TUE) {
  const S = store.defaultState(day);
  S.profile.onboarded = true;
  S.createdKey = dkey(new Date(2026, 10, 1));
  return S;
}
const at = (S, day, p, min = 20) => new Date(+timesFor(day, S.settings)[p] + min * 60000);
const ids = list => list.map(a => a.id);

describe("good deeds: reading deeds live in Read, the rest in the sheet", () => {
  it("by default the sheet on Today holds only the non-reading deeds", () => {
    const S = fresh();
    expect(ids(sheetDeeds(S, K))).toEqual(["sadaqah"]);
    expect(sheetCount(S, K)).toEqual({ done: 0, of: 1, inRead: 4 });
    for (const id of ["quran", "morning", "evening", "salawat"]) expect(deedInRead(S, id)).toBe(true);
    expect(deedInRead(S, "sadaqah")).toBe(false);
  });
  it("custom deeds stay in the sheet", () => {
    const S = fresh();
    S.amalList.push({ id: "c1", name: "Call a relative", detail: "none" });
    expect(ids(sheetDeeds(S, K))).toEqual(["sadaqah", "c1"]);
  });
  it("a reading deed whose reader is hidden goes back to the sheet; with Tools off all of them do", () => {
    const S = fresh();
    F.setToolHidden(S, "adhkar", true);
    expect(ids(sheetDeeds(S, K))).toEqual(["morning", "evening", "sadaqah"]);
    F.setFeature(S, "tools", false);
    expect(ids(sheetDeeds(S, K))).toEqual(["quran", "morning", "evening", "salawat", "sadaqah"]);
    expect(sheetCount(S, K).inRead).toBe(0);
  });
  it("every deed is in exactly one place, whatever is switched on (nothing counts twice or goes missing)", () => {
    const configs = [[], ["adhkar"], ["quran"], ["durud"], ["adhkar", "quran", "durud", "hizb", "manzil", "afterSalah"]];
    for (const hide of configs) for (const toolsOn of [true, false]) for (const excused of [false, true]) {
      const S = fresh();
      for (const t of hide) F.setToolHidden(S, t, true);
      F.setFeature(S, "tools", toolsOn);
      if (excused) store.ensureDay(S, K).excused = true;
      const list = store.amalForDay(S, K);
      const inRead = list.filter(a => deedInRead(S, a.id)), inSheet = sheetDeeds(S, K);
      expect(inRead.length + inSheet.length).toBe(list.length);
      expect(inSheet.some(a => deedInRead(S, a.id))).toBe(false);
      // each reading deed in Read has a For today row that ticks it
      const items = readItems(S, at(S, TUE, "Asr"));
      for (const a of inRead) expect(items.some(i => i.deed === a.id)).toBe(true);
    }
  });
  it("only Qurʾān, adhkār and salawāt count as reading deeds", () => {
    expect(Object.keys(READ_DEEDS).sort()).toEqual(["evening", "listen", "morning", "quran", "salawat"]);
  });
});

describe("For today: what is due", () => {
  it("in ʿAsr: evening adhkār first, due now until Maghrib; the rest in order", () => {
    const S = fresh(), now = at(S, TUE, "Asr");
    const items = readItems(S, now);
    expect(items.map(i => i.id)).toEqual(["evening", "morning", "hizb", "quran", "yasinAm", "yasinPm", "manzil", "mulk", "durud"]);
    expect(items[0].now).toBe(true);
    expect(items[0].sub).toBe(READ.nowUntil("Maghrib"));
    expect(items.filter(i => i.now)).toHaveLength(1); // one gold dot
    expect(items.find(i => i.id === "hizb").sub).toBe(READ.hizbSub(4, "Tue")); // Saturday is manzil 1
    expect(readCount(S, now)).toEqual({ done: 0, of: 9 });
  });
  it("in the morning: morning adhkār is due now until ʿAsr, evening starts at ʿAsr", () => {
    const S = fresh(), now = at(S, TUE, "Fajr");
    const items = readItems(S, now);
    expect(items[0].id).toBe("morning");
    expect(items[0].sub).toBe(READ.nowUntil("ʿAsr"));
    expect(items.find(i => i.id === "evening").sub.startsWith(READ.fromAt("ʿAsr", "").slice(0, 7))).toBe(true);
  });
  it("done items move to the end and say when", () => {
    const S = fresh(), now = at(S, TUE, "Asr");
    setReadDone(S, "morning", true, at(S, TUE, "Fajr"));
    const items = readItems(S, now);
    expect(items.at(-1).id).toBe("morning");
    expect(items.at(-1).done).toBe(true);
    expect(items.at(-1).sub).toMatch(/^Done at /);
    expect(readCount(S, now)).toEqual({ done: 1, of: 9 });
  });
  it("al-Kahf on Jumuʿah: from Thursday's Maghrib, kept under Friday", () => {
    const S = fresh(), thu = new Date(2026, 10, 19), fri = new Date(2026, 10, 20);
    expect(readItems(S, at(S, thu, "Asr")).some(i => i.id === "kahf")).toBe(false);
    const thuNight = at(S, thu, "Maghrib");
    expect(isJumuah(thuNight, S.settings)).toBe(true);
    expect(jumuahKey(thuNight, S.settings)).toBe(dkey(fri));
    setReadDone(S, "kahf", true, thuNight);
    expect(isReadDone(S, "kahf", at(S, fri, "Fajr"))).toBe(true);
  });
  it("durūd shows daily while Salawāt is on the list, otherwise only on Jumuʿah", () => {
    const S = fresh();
    S.amalList = S.amalList.filter(a => a.id !== "salawat");
    expect(readItems(S, at(S, TUE, "Asr")).some(i => i.id === "durud")).toBe(false);
    expect(readItems(S, at(S, new Date(2026, 10, 20), "Asr")).some(i => i.id === "durud")).toBe(true);
  });
  it("an excused day: listening instead of recitation, and no sūrahs or Manzil on the list", () => {
    const S = fresh();
    store.ensureDay(S, K).excused = true;
    const list = readItems(S, at(S, TUE, "Asr")).map(i => i.id);
    expect(list).toContain("listen");
    for (const id of ["quran", "mulk", "kahf", "manzil"]) expect(list).not.toContain(id);
  });
  it("items follow Settings → Features: hidden readers leave the list, Tools off empties it", () => {
    const S = fresh(), now = at(S, TUE, "Asr");
    F.setToolHidden(S, "hizb", true); F.setToolHidden(S, "manzil", true);
    expect(readItems(S, now).map(i => i.id)).toEqual(["evening", "morning", "quran", "yasinAm", "yasinPm", "mulk", "durud"]);
    F.setFeature(S, "tools", false);
    expect(readItems(S, now)).toEqual([]);
    // Read's tab stays while "This week" is on, and hides when nothing is left
    expect(F.navTabs(S).map(t => t.id)).toContain("tools");
    F.setFeature(S, "week", false);
    expect(F.navTabs(S).map(t => t.id)).not.toContain("tools");
  });
});

describe("ticks write the same day log, so stats and Provisions count them", () => {
  it("ticking evening adhkār in Read ticks the good deed and the reader's own state", () => {
    const S = fresh(), now = at(S, TUE, "Asr");
    expect(setReadDone(S, "evening", true, now)).toBe(true);
    expect(store.getDay(S, K).amal.evening).toEqual({ done: true, detail: "" });
    expect(S.tools.adhkar[K].evening.done).toBe(+now);
    expect(isReadDone(S, "evening", now)).toBe(true);
  });
  it("Read ticks count in the day's completion and in Progress's good deeds", () => {
    const S = fresh(), now = at(S, TUE, "Asr");
    const before = st.dayPct(S, TUE, now);
    setReadDone(S, "morning", true, now);
    setReadDone(S, "quran", true, now);
    expect(st.dayPct(S, TUE, now)).toBeGreaterThan(before);
    expect(st.amalDayState(S, K, "morning", now)).toBe("done");
    expect(st.amalDayState(S, K, "quran", now)).toBe("done");
  });
  it("Read ticks count in Provisions exactly like ticks in the Good deeds sheet", () => {
    const viaRead = fresh(), viaSheet = fresh(), now = at(viaRead, TUE, "Asr");
    setReadDone(viaRead, "morning", true, now);
    setReadDone(viaRead, "durud", true, now);
    store.setAmal(viaSheet, K, "morning", true, "", now);
    store.setAmal(viaSheet, K, "salawat", true, "", now);
    const d = S => pts.dayProvisions(store.getDay(S, K)).parts.find(p => p.kind === "deeds");
    expect(d(viaRead)).toEqual({ id: "deeds", kind: "deeds", count: 2, n: 2 });
    expect(d(viaRead)).toEqual(d(viaSheet));
    expect(pts.provisions(viaRead, { today: K }).total).toBe(pts.provisions(viaSheet, { today: K }).total);
  });
  it("readings without a good deed (Hizb, Manzil, al-Mulk) earn one provision each, off the deeds list", () => {
    const S = fresh(), now = at(S, TUE, "Asr");
    const before = pts.provisions(S, { today: K }).total;
    for (const id of ["hizb", "manzil", "mulk"]) setReadDone(S, id, true, now);
    expect(store.getDay(S, K).amal).toEqual({});
    expect(store.getDay(S, K).reads).toEqual({ hizb: true, manzil: true, mulk: true });
    expect(pts.provisions(S, { today: K }).total).toBe(before + 3);
    expect(S.tools.hizb.weeks[Object.keys(S.tools.hizb.weeks)[0]].read[4]).toBe(+now);
    expect(readCount(S, now).done).toBe(3);
  });
  it("the sheet's count leaves out reading deeds ticked in Read (no double count on Today)", () => {
    const S = fresh(), now = at(S, TUE, "Asr");
    setReadDone(S, "morning", true, now);
    store.setAmal(S, K, "sadaqah", true, "", now);
    expect(sheetCount(S, K)).toEqual({ done: 1, of: 1, inRead: 4 });
    expect(readCount(S, now).done).toBe(1);
  });
  it("unticking clears the deed and the reader's state; a deed ticked from the sheet shows as done in Read", () => {
    const S = fresh(), now = at(S, TUE, "Asr");
    setReadDone(S, "evening", true, now);
    setReadDone(S, "evening", false, now);
    expect(store.getDay(S, K).amal.evening).toBeUndefined();
    expect(S.tools.adhkar[K].evening.done).toBeUndefined();
    expect(isReadDone(S, "evening", now)).toBe(false);
    store.setAmal(S, K, "quran", true, "Maryam", now);
    expect(readItems(S, now).find(i => i.id === "quran").done).toBe(true);
  });
  it("a finished reader counts as done (the forty durūd, a manzil of the Hizb)", () => {
    const S = fresh(), now = at(S, TUE, "Asr");
    S.tools = { durud: { [K]: { read: [], done: 1 } } };
    expect(isReadDone(S, "durud", now)).toBe(true);
  });
  it("seven manzils in a week make one khatm, counted once", () => {
    const S = fresh();
    for (let d = 14; d <= 20; d++) { setReadDone(S, "hizb", true, at(S, new Date(2026, 10, d), "Asr")); }
    expect(S.tools.hizb.khatms).toBe(1);
    setReadDone(S, "hizb", false, at(S, new Date(2026, 10, 20), "Asr"));
    setReadDone(S, "hizb", true, at(S, new Date(2026, 10, 20), "Asr"));
    expect(S.tools.hizb.khatms).toBe(1);
  });
});
