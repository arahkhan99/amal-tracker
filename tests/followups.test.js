// Redesign follow-ups (18 Nov 2026, the scholar's answers): Hizb, al-Mulk, al-Kahf and the Manzil earn one provision
// each like any good deed; the excused-day Read rule; "Juzʾ", not "Para"; "Make up Zuhr now?" on the Now chapter and
// "Make-ups · 8 left" on the Today chapter (src/today.js).
import { describe, it, expect } from "vitest";
import * as store from "../src/store.js";
import * as pts from "../src/points.js";
import * as st from "../src/stats.js";
import * as F from "../src/features.js";
import { timesFor } from "../src/times.js";
import { dkey, PRAYERS } from "../src/util.js";
import { readItems, setReadDone, isReadDone, markRead } from "../src/reading.js";
import { forbiddenTime, makeUpNowFor, makeupsLine, FORBIDDEN_MIN } from "../src/today.js";
import { TT } from "../src/views/tools/strings-tools.js";
import { TOOLS_UI, TODAY } from "../src/strings.js";
import { glossaryFor } from "../src/glossary.js";

const TUE = new Date(2026, 10, 17), K = dkey(TUE);
const FRI = new Date(2026, 10, 20), FK = dkey(FRI);
function fresh(day = TUE) {
  const S = store.defaultState(day);
  S.profile.onboarded = true;
  S.createdKey = dkey(new Date(2026, 10, 1));
  return S;
}
const at = (S, day, p, min = 20) => new Date(+timesFor(day, S.settings)[p] + min * 60000);
const deeds = (S, key, today = K) => pts.dayBreakdown(S, key, { today }).parts.find(x => x.kind === "deeds");
const total = (S, today = K) => pts.provisions(S, { today }).total;

describe("Hizb, al-Mulk, al-Kahf and the Manzil earn one provision each", () => {
  it("each tick in Read adds one, as a good deed, without touching the deeds list", () => {
    const S = fresh(), now = at(S, TUE, "Isha"), list = JSON.stringify(S.amalList);
    const t0 = total(S);
    setReadDone(S, "mulk", true, now);
    expect(total(S)).toBe(t0 + 1);
    setReadDone(S, "hizb", true, now);
    setReadDone(S, "manzil", true, now);
    expect(total(S)).toBe(t0 + 3);
    expect(deeds(S, K)).toEqual({ id: "deeds", kind: "deeds", count: 3, n: 3, reads: ["hizb", "mulk", "manzil"] });
    expect(JSON.stringify(S.amalList)).toBe(list);
    expect(store.getDay(S, K).amal).toEqual({});
  });
  it("al-Kahf counts on Friday (also when ticked on Thursday night, which belongs to Friday)", () => {
    const S = fresh(), thuNight = at(S, new Date(2026, 10, 19), "Maghrib", 30);
    setReadDone(S, "kahf", true, thuNight);
    expect(pts.readsByDay(S)).toEqual({ [FK]: ["kahf"] });
    expect(deeds(S, FK, FK).count).toBe(1);
    expect(pts.dayBreakdown(S, "2026-11-19", { today: FK }).parts.find(x => x.kind === "deeds")).toBeUndefined();
  });
  it("one provision a day each: ticking twice, or the day log and the reader both saying so, count once", () => {
    const S = fresh(), now = at(S, TUE, "Asr");
    setReadDone(S, "mulk", true, now);
    setReadDone(S, "mulk", true, now);
    expect(store.getDay(S, K).reads).toEqual({ mulk: true });
    expect(S.tools.read[K].mulk).toBe(+now);
    expect(deeds(S, K).count).toBe(1);
  });
  it("they share the good deeds' daily cap (10)", () => {
    const S = fresh(), now = at(S, TUE, "Isha");
    for (let i = 0; i < 9; i++) store.ensureDay(S, K).amal["d" + i] = { done: true };
    const t0 = total(S);
    for (const id of ["hizb", "mulk", "manzil"]) setReadDone(S, id, true, now);
    expect(deeds(S, K)).toMatchObject({ count: 12, n: pts.WEIGHTS.v1.deeds.cap });
    expect(total(S)).toBe(t0 + 1);
  });
  it("unticking takes it off again (the day log and the reader's state)", () => {
    const S = fresh(), now = at(S, TUE, "Asr");
    const t0 = total(S);
    setReadDone(S, "hizb", true, now);
    setReadDone(S, "hizb", false, now);
    expect(store.getDay(S, K).reads).toBeUndefined();
    expect(total(S)).toBe(t0);
  });
  it("an excused day: al-Mulk, al-Kahf and the Manzil count nothing (not recited then); the Hizb (duʿāʾ) still counts", () => {
    const S = fresh();
    store.ensureDay(S, FK).excused = true;
    for (const id of ["hizb", "mulk", "kahf", "manzil"]) store.setRead(S, FK, id, true);
    expect(deeds(S, FK, FK)).toEqual({ id: "deeds", kind: "deeds", count: 1, n: 1, reads: ["hizb"] });
    expect(st.readDayState(S, FK, "mulk", at(S, FRI, "Isha"))).toBe("excused");
    expect(st.readDayState(S, FK, "hizb", at(S, FRI, "Isha"))).toBe("done");
  });
  it("past days count from the readers' own dated state (ticked before this change)", () => {
    const S = fresh();
    // what the readers saved before day.reads existed: Hizb week from Sat 14 Nov (manzil 2 = Sunday 15),
    // the Manzil on Mon 16, al-Mulk on Sun 15, al-Kahf on Fri 13
    S.tools = {
      hizb: { weeks: { "2026-11-14": { read: { 2: 1 } } }, khatms: 0 },
      manzil: { "2026-11-16": { evening: 1 } },
      read: { "2026-11-15": { mulk: 1 }, "2026-11-13": { kahf: 1 } },
    };
    expect(pts.readsByDay(S)).toEqual({ "2026-11-15": ["mulk", "hizb"], "2026-11-16": ["manzil"], "2026-11-13": ["kahf"] });
    expect(total(S)).toBe(4);
    expect(pts.provisions(S, { today: K }).byDay).toMatchObject({ "2026-11-15": 2, "2026-11-16": 1, "2026-11-13": 1 });
  });
  it("the day log keeps them after the readers prune their history", () => {
    const S = fresh(), now = at(S, TUE, "Asr");
    for (const id of ["hizb", "mulk", "manzil"]) setReadDone(S, id, true, now);
    const t = total(S);
    S.tools = {}; // pruned / cleared
    expect(total(S)).toBe(t);
  });
  it("the Manzil reader's tick marks the day log while either half (morning or evening) is done", () => {
    const S = fresh(), now = at(S, TUE, "Asr");
    S.tools = { manzil: { [K]: { morning: 5 } } };
    markRead(S, "manzil", now);
    expect(store.getDay(S, K).reads).toEqual({ manzil: true });
    delete S.tools.manzil[K].morning;
    markRead(S, "manzil", now);
    expect(store.getDay(S, K).reads).toBeUndefined();
  });
  it("levels and the shown level use them (provisions are recounted from history)", () => {
    const S = fresh(), now = at(S, TUE, "Asr");
    setReadDone(S, "mulk", true, now);
    expect(pts.provisions(S, { today: K, from: K, to: K }).total).toBe(1);
  });
  it("Progress's good-deeds week: done, missed, today pending, al-Kahf only on Friday", () => {
    const S = fresh(), now = at(S, TUE, "Asr");
    setReadDone(S, "mulk", true, now);
    expect(st.readDayState(S, K, "mulk", now)).toBe("done");
    expect(st.readDayState(S, K, "hizb", now)).toBe("pending");
    expect(st.readDayState(S, "2026-11-16", "mulk", now)).toBe("missed");
    expect(st.readDayState(S, "2026-11-16", "kahf", now)).toBe("na");
    expect(st.readDayState(S, FK, "kahf", now)).toBe("future");
    expect(st.readDayState(S, "2026-10-20", "mulk", now)).toBe("untracked");
  });
});

describe("excused days in Read (rule kept as built)", () => {
  it("For today: Listen to Qurʾān replaces recitation; al-Mulk, al-Kahf and the Manzil leave the list", () => {
    const S = fresh();
    store.ensureDay(S, FK).excused = true;
    const ids = readItems(S, at(S, FRI, "Asr")).map(i => i.id);
    expect(ids).toContain("listen");
    expect(ids).toContain("hizb");
    for (const id of ["quran", "mulk", "kahf", "manzil"]) expect(ids).not.toContain(id);
  });
  it("the Qurʾān chapter stays (al-Kahf, al-Mulk and the Manzil are still there to open)", () => {
    const S = fresh();
    store.ensureDay(S, FK).excused = true;
    expect(F.toolVisible(S, "quran")).toBe(true);
    expect(F.toolVisible(S, "manzil")).toBe(true);
    // views/read.js readChapters: Qurʾān shows while the Qurʾān or the Manzil is on, excused or not
  });
  it("a reading ticked before the day was marked excused is not counted (and isn't shown as done)", () => {
    const S = fresh(), now = at(S, FRI, "Asr");
    setReadDone(S, "mulk", true, now);
    expect(deeds(S, FK, FK).count).toBe(1);
    store.ensureDay(S, FK).excused = true;
    expect(deeds(S, FK, FK)).toBeUndefined();
    expect(readItems(S, now).some(i => i.id === "mulk")).toBe(false);
    expect(isReadDone(S, "mulk", now)).toBe(true); // the tick itself is kept, it just doesn't count
  });
});

describe("Juzʾ, not Para", () => {
  it("every mushaf says Juzʾ 16", () => {
    expect(TT.paraN(16)).toBe("Juzʾ\u00a016"); // no line break before the number
    expect(TT.juzN(16)).toBe("Juzʾ\u00a016");
    expect(TT.tabPara).toBe("Juzʾ");
    expect(TOOLS_UI.para(3)).toBe("Juzʾ\u00a03");
  });
  it("the glossary still finds it as juz or para", () => {
    expect(glossaryFor("Juzʾ")).toBeTruthy();
    expect(glossaryFor("Para")).toBe(glossaryFor("Juz"));
    expect(glossaryFor("Juz").term.startsWith("Juzʾ")).toBe(true);
  });
});

describe("forbidden times (Hanafi default: sunrise, zawāl, sunset)", () => {
  const S = fresh(), t = timesFor(TUE, S.settings), m = 60000;
  const off = (d, min) => new Date(+d + min * m);
  it("sunrise until 15 minutes after", () => {
    expect(forbiddenTime(off(t.Sunrise, -1), S.settings)).toBe("");
    expect(forbiddenTime(t.Sunrise, S.settings)).toBe("sunrise");
    expect(forbiddenTime(off(t.Sunrise, FORBIDDEN_MIN.afterSunrise - 1), S.settings)).toBe("sunrise");
    expect(forbiddenTime(off(t.Sunrise, FORBIDDEN_MIN.afterSunrise), S.settings)).toBe("");
  });
  it("10 minutes before Zuhr until Zuhr begins", () => {
    expect(forbiddenTime(off(t.Dhuhr, -11), S.settings)).toBe("");
    expect(forbiddenTime(off(t.Dhuhr, -10), S.settings)).toBe("zawal");
    expect(forbiddenTime(off(t.Dhuhr, -1), S.settings)).toBe("zawal");
    expect(forbiddenTime(t.Dhuhr, S.settings)).toBe("");
  });
  it("from about 20 minutes before Maghrib until Maghrib; after ʿAsr and after Fajr stay open", () => {
    expect(forbiddenTime(off(t.Maghrib, -21), S.settings)).toBe("");
    expect(forbiddenTime(off(t.Maghrib, -20), S.settings)).toBe("sunset");
    expect(forbiddenTime(off(t.Maghrib, -1), S.settings)).toBe("sunset");
    expect(forbiddenTime(t.Maghrib, S.settings)).toBe("");
    expect(forbiddenTime(off(t.Asr, 30), S.settings)).toBe("");
    expect(forbiddenTime(off(t.Fajr, 10), S.settings)).toBe("");
  });
});

describe("Make up Zuhr now? (which prayer is offered)", () => {
  // something logged earlier, so it isn't the first-run guide state
  const logged = () => { const S = fresh(); store.setPrayer(S, "2026-11-16", "Fajr", "ontime", new Date(2026, 10, 16, 7)); return S; };
  it("the most recent of today's prayers whose time has ended, missed or unlogged", () => {
    const S = logged(), now = at(S, TUE, "Asr", 30);
    expect(makeUpNowFor(S, now)).toBe("Dhuhr"); // Fajr and Zuhr unlogged: Zuhr is the latest
    store.setPrayer(S, K, "Dhuhr", "ontime", now);
    expect(makeUpNowFor(S, now)).toBe("Fajr");
    store.setPrayer(S, K, "Fajr", "missed", now);
    expect(makeUpNowFor(S, now)).toBe("Fajr");
    store.setPrayer(S, K, "Fajr", "madeup", now);
    expect(makeUpNowFor(S, now)).toBe("");
  });
  it("never the prayer whose time is still open, and never ʿIshāʾ (its time runs to Fajr)", () => {
    const S = logged();
    for (const p of ["Fajr", "Dhuhr", "Asr", "Maghrib"]) store.setPrayer(S, K, p, "ontime", at(S, TUE, "Isha"));
    expect(makeUpNowFor(S, at(S, TUE, "Isha", 90))).toBe("");
    store.setPrayer(S, K, "Maghrib", "missed", at(S, TUE, "Isha"));
    expect(makeUpNowFor(S, at(S, TUE, "Isha", 90))).toBe("Maghrib");
  });
  it("Not now hides it for that prayer; no older prayer takes its place", () => {
    const S = logged(), now = at(S, TUE, "Asr", 30);
    expect(makeUpNowFor(S, now, { dismissed: ["Dhuhr"] })).toBe("");
  });
  it("not during a forbidden time, not on an excused day, not with the nudge or Make-ups off, not before any log", () => {
    const S = logged(), t = timesFor(TUE, S.settings);
    store.setPrayer(S, K, "Fajr", "missed", at(S, TUE, "Fajr"));
    expect(makeUpNowFor(S, new Date(+t.Sunrise + 5 * 60000))).toBe("");
    expect(makeUpNowFor(S, new Date(+t.Sunrise + 30 * 60000))).toBe("Fajr");
    expect(makeUpNowFor(S, new Date(+t.Dhuhr - 5 * 60000))).toBe("");
    S.settings.makeupNudge = false;
    expect(makeUpNowFor(S, new Date(+t.Sunrise + 30 * 60000))).toBe("");
    S.settings.makeupNudge = true;
    F.setFeature(S, "makeups", false);
    expect(makeUpNowFor(S, new Date(+t.Sunrise + 30 * 60000))).toBe("");
    F.setFeature(S, "makeups", true);
    store.ensureDay(S, K).excused = true;
    expect(makeUpNowFor(S, new Date(+t.Sunrise + 30 * 60000))).toBe("");
    const first = fresh();
    expect(makeUpNowFor(first, at(first, TUE, "Asr", 30))).toBe("");
  });
  it("I made it up: Missed → Made up takes it off the make-ups again (the same-day rule)", () => {
    const S = logged(), now = at(S, TUE, "Asr", 30);
    store.setPrayer(S, K, "Dhuhr", "missed", now);
    expect(S.qada.Dhuhr).toBe(1);
    store.setPrayer(S, K, "Dhuhr", "madeup", now);
    expect(S.qada.Dhuhr).toBe(0);
  });
});

describe("Make-ups · 8 left (the Today chapter line)", () => {
  it("shows what is owed; with fasts: prayers · fasts", () => {
    const S = fresh();
    expect(makeupsLine(S, K)).toBeNull(); // nothing owed, nothing logged before
    S.qada.Fajr = 5; S.qada.Asr = 3;
    expect(makeupsLine(S, K)).toEqual({ prayers: 8, fasts: 0 });
    expect(TODAY.makeupsLeft(8, 0)).toBe("8 left");
    S.qada.fasts = 2;
    expect(TODAY.makeupsLeft(3, 2)).toBe("3 prayers · 2 fasts");
    expect(TODAY.makeupsLeft(0, 2)).toBe("2 fasts");
    expect(TODAY.makeupsLeft(1, 1)).toBe("1 prayer · 1 fast");
  });
  it("all caught up only after make-ups were logged; hidden on an excused day and with Make-ups off", () => {
    const S = fresh();
    S.qada.Fajr = 1;
    store.madeUpPrayer(S, "Fajr", TUE);
    expect(makeupsLine(S, K)).toEqual({ prayers: 0, fasts: 0, clear: true });
    S.qada.Fajr = 2;
    store.ensureDay(S, K).excused = true;
    expect(makeupsLine(S, K)).toBeNull();
    store.ensureDay(S, K).excused = false;
    F.setFeature(S, "makeups", false);
    expect(makeupsLine(S, K)).toBeNull();
  });
});

describe("unchanged scoring for everything else", () => {
  it("a day without readings scores exactly as before", () => {
    const S = fresh();
    for (const p of PRAYERS) store.setPrayer(S, K, p, "ontime", at(S, TUE, "Isha"));
    expect(total(S)).toBe(15);
    expect(pts.readsByDay(S)).toEqual({});
  });
});

describe("sunrise on Today (when Fajr's time ends)", () => {
  it("the Today rows have Sunrise between Fajr and Zuhr; nothing that counts includes it", async () => {
    const { TODAY_ROWS } = await import("../src/today.js");
    expect(TODAY_ROWS).toEqual(["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"]);
    expect(PRAYERS).not.toContain("Sunrise");
    const S = fresh(), now = at(S, TUE, "Isha", 60);
    for (const p of PRAYERS) store.setPrayer(S, K, p, "ontime", now);
    expect(st.dayPct(S, TUE, now)).toBe(Math.round(5 / (5 + store.amalForDay(S, K).length) * 100));
    expect(pts.dayProvisions(store.getDay(S, K)).parts.filter(x => x.kind === "fard").map(x => x.id)).toEqual(PRAYERS);
    expect(makeUpNowFor(S, now)).toBe("");
  });
  it("Fajr's time ends at sunrise: the wording says so", () => {
    const S = fresh(), t = timesFor(TUE, S.settings);
    expect(TODAY.endsAtSunrise("7:20 AM")).toBe("Ends at sunrise 7:20 AM");
    expect(TODAY.leftLineSunrise("40 min", "7:20 AM")).toBe("40 min left · until sunrise 7:20 AM");
    expect(t.Sunrise > t.Fajr && t.Sunrise < t.Dhuhr).toBe(true);
  });
});
