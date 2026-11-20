// The Qurʾān reading goal (approved 19 Nov 2026): goal math (daily / weekly, pages / juzʾ / minutes, the "Finish the
// Qurʾān" planner with its excused-day pause and gentle catch-up), manual + automatic reading adding together, the
// reader's page debounce and active minutes, the sync merge, and the recitation tick left as it was.
import { describe, it, expect } from "vitest";
import * as store from "../src/store.js";
import * as G from "../src/quran-goal.js";
import { createTracker, PAGE_MS, TURN_MS, IDLE_MS } from "../src/quran-track.js";
import { setReadDone, isReadDone, readItems } from "../src/reading.js";
import { dayProvisions } from "../src/points.js";
import { dkey, addDays } from "../src/util.js";

// Thu 19 Nov 2026, midday; the week (Sunday start) runs Sun 15 – Sat 21 Nov
const NOWD = new Date(2026, 10, 19, 12, 0);
const TODAY = dkey(NOWD);
const fresh = () => {
  const S = store.defaultState(new Date(2026, 9, 1));
  S.profile.onboarded = true; S.createdKey = "2026-10-01";
  S.tools = { quran: { mushaf: "indopak15", pages: { indopak15: 1 } } };
  return S;
};
const pagesOn = (S, key, list) => G.addAutoPages(S, key, list.map(n => `indopak15:${n}`));

describe("reading of a day: automatic and manual add together", () => {
  it("pages from the reader, distinct, plus legacy pages and \"I read…\" pages and juzʾ", () => {
    const S = fresh();
    expect(pagesOn(S, TODAY, [1, 2, 3])).toBe(3);
    expect(pagesOn(S, TODAY, [3, 4])).toBe(1); // page 3 already counted
    S.tools.quran.read = { [TODAY]: ["indopak15:4", "indopak15:5"] }; // the older list: 5 is new
    G.addManual(S, TODAY, { unit: "pages", n: 6 }, NOWD);
    G.addManual(S, TODAY, { unit: "juz", n: 1 }, NOWD);
    const r = G.dayReading(S, TODAY, 610);
    expect(r.autoPages).toBe(5);
    expect(r.manualPages).toBeCloseTo(6 + 610 / 30);
    expect(r.pages).toBeCloseTo(5 + 6 + 610 / 30);
  });
  it("minutes: every phone's active seconds plus manual minutes; minutes never turn into pages", () => {
    const S = fresh();
    G.addAutoSec(S, TODAY, "a", 300); G.addAutoSec(S, TODAY, "b", 330); G.addAutoSec(S, TODAY, "a", 30);
    G.addManual(S, TODAY, { unit: "min", n: 5 }, NOWD);
    const r = G.dayReading(S, TODAY);
    expect(G.autoSec(S, TODAY)).toBe(660);
    expect(r.min).toBe(11 + 5);
    expect(r.pages).toBe(0);
  });
  it("manual entries can be edited and removed (removed ones stay as a note, not counted)", () => {
    const S = fresh();
    const e = G.addManual(S, TODAY, { unit: "pages", n: 4 }, NOWD);
    expect(S.days[TODAY].first).toBeGreaterThan(0); // a user log of the day
    expect(G.editManual(S, TODAY, e.id, { unit: "min", n: 20 }, new Date(+NOWD + 1000))).toBe(true);
    expect(G.manualEntries(S, TODAY)).toMatchObject([{ id: e.id, unit: "min", n: 20 }]);
    expect(G.removeManual(S, TODAY, e.id)).toBe(true);
    expect(G.manualEntries(S, TODAY)).toEqual([]);
    expect(S.days[TODAY].quran.manual).toEqual([expect.objectContaining({ id: e.id, del: expect.any(Number) })]);
    expect(G.editManual(S, TODAY, e.id, { unit: "pages", n: 1 })).toBe(false);
    expect(G.addManual(S, TODAY, { unit: "pages", n: 0 })).toBeNull();
    expect(G.addManual(S, TODAY, { unit: "ruku", n: 2 })).toBeNull();
  });
});

describe("daily and weekly goals", () => {
  it("daily pages: 3 of 5 today, met at 5", () => {
    const S = fresh(); G.setGoal(S, { type: "pages", n: 5, per: "day" });
    pagesOn(S, TODAY, [10, 11, 12]);
    let st = G.goalStatus(S, NOWD);
    expect(st).toMatchObject({ unit: "pages", per: "day", target: 5, done: 3, met: false, pct: 60 });
    G.addManual(S, TODAY, { unit: "pages", n: 2 }, NOWD);
    st = G.goalStatus(S, NOWD);
    expect(st).toMatchObject({ done: 5, met: true, pct: 100 });
  });
  it("daily juzʾ: pages count as part of a juzʾ (the mushaf's pages / 30)", () => {
    const S = fresh(); G.setGoal(S, { type: "juz", n: 1, per: "day" });
    pagesOn(S, TODAY, Array.from({ length: 10 }, (_, i) => i + 1));
    expect(G.goalStatus(S, NOWD).done).toBeCloseTo(0.5, 1);
    G.addManual(S, TODAY, { unit: "pages", n: 10 }, NOWD);
    expect(G.goalStatus(S, NOWD).met).toBe(true); // 20 of 20.3 pages rounds to 1.0 juzʾ
  });
  it("daily minutes: 12 of 20 min; pages don't count", () => {
    const S = fresh(); G.setGoal(S, { type: "min", n: 20, per: "day" });
    G.addAutoSec(S, TODAY, "a", 7 * 60 + 40);
    G.addManual(S, TODAY, { unit: "min", n: 5 }, NOWD);
    pagesOn(S, TODAY, [1, 2, 3]);
    expect(G.goalStatus(S, NOWD)).toMatchObject({ unit: "min", done: 12, target: 20, met: false });
  });
  it("weekly: the week's reading adds up and can be caught up on any day", () => {
    const S = fresh(); G.setGoal(S, { type: "pages", n: 35, per: "week" });
    pagesOn(S, "2026-11-15", [1, 2, 3, 4, 5, 6, 7, 8]); // Sunday
    G.addManual(S, "2026-11-17", { unit: "pages", n: 10 }, NOWD); // Tuesday, own mushaf
    G.addManual(S, "2026-11-14", { unit: "pages", n: 50 }, NOWD); // last week: not this week's
    let st = G.goalStatus(S, NOWD);
    expect(st).toMatchObject({ per: "week", target: 35, done: 18, met: false });
    G.addManual(S, TODAY, { unit: "pages", n: 17 }, NOWD); // a day of catching up
    expect(G.goalStatus(S, NOWD).met).toBe(true);
  });
  it("weekly juzʾ and minutes", () => {
    const S = fresh();
    G.setGoal(S, { type: "juz", n: 2, per: "week" });
    G.addManual(S, "2026-11-16", { unit: "juz", n: 1 }, NOWD);
    expect(G.goalStatus(S, NOWD)).toMatchObject({ target: 2, done: 1 });
    G.setGoal(S, { type: "min", n: 90, per: "week" });
    G.addManual(S, "2026-11-16", { unit: "min", n: 30 }, NOWD);
    G.addAutoSec(S, TODAY, "a", 1800);
    expect(G.goalStatus(S, NOWD)).toMatchObject({ target: 90, done: 60 });
  });
  it("excused days: a daily goal pauses; a weekly target is lowered by them", () => {
    const S = fresh(); G.setGoal(S, { type: "pages", n: 5, per: "day" });
    store.ensureDay(S, TODAY).excused = true;
    expect(G.goalStatus(S, NOWD)).toMatchObject({ paused: true, target: 0, met: false });
    G.setGoal(S, { type: "pages", n: 35, per: "week" });
    store.ensureDay(S, "2026-11-18").excused = true;
    const st = G.goalStatus(S, NOWD);
    expect(st.target).toBe(25); // 35 × 5 / 7
    expect(st.activeDays).toBe(5);
    expect(st.weekPaused).toBe(false);
  });
  it("no goal, or a broken one, is null; clearing removes it", () => {
    const S = fresh();
    expect(G.goalStatus(S, NOWD)).toBeNull();
    S.settings.quranGoal = { type: "pages", n: 0, per: "day" };
    expect(G.goalStatus(S, NOWD)).toBeNull();
    G.setGoal(S, { type: "pages", n: 5, per: "day" }); G.setGoal(S, null);
    expect(S.settings.quranGoal).toBeUndefined();
  });
});

describe("Finish the Qurʾān (planner)", () => {
  const day0 = new Date(2026, 10, 1, 9, 0); // plan starts Sun 1 Nov
  const atDay = i => new Date(2026, 10, 1 + i, 12, 0);
  it("30 days from the start of a 610-page mushaf: 21 pages a day, finishing on day 30", () => {
    const S = fresh();
    const g = G.khatmGoal({ mushaf: "indopak15", days: 30 }, day0);
    expect(g).toMatchObject({ type: "khatm", total: 610, start: 1, startKey: "2026-11-01", days: 30 });
    G.setGoal(S, g);
    const p = G.planStatus(S, g, day0);
    expect(p).toMatchObject({ daily: 21, base: 21, toRead: 610, endKey: "2026-11-30", finishKey: "2026-11-30", late: false });
  });
  it("from the reader's page, by a date: the pages from there, the date kept", () => {
    const S = fresh();
    const g = G.khatmGoal({ mushaf: "madani15", start: 305, endKey: "2026-11-30" }, day0);
    const p = G.planStatus(S, g, day0);
    expect(p.toRead).toBe(604 - 305 + 1);
    expect(p.daily).toBe(Math.ceil(300 / 30));
    expect(p.endKey).toBe("2026-11-30");
  });
  it("today's reading doesn't move today's target; reading counts towards the khatm", () => {
    const S = fresh(); const g = G.khatmGoal({ days: 30 }, day0); G.setGoal(S, g);
    G.addManual(S, "2026-11-01", { unit: "pages", n: 30 }, day0);
    const p0 = G.planStatus(S, g, atDay(0));
    expect(p0).toMatchObject({ daily: 21, doneToday: 30, read: 30, left: 580 });
    const p1 = G.planStatus(S, g, atDay(1));
    expect(p1.daily).toBe(Math.ceil(580 / 29)); // 20: ahead, so a lighter day
  });
  it("behind: spread over the days left, gently (at most 1.25 × the first pace); then the finish date moves", () => {
    const S = fresh(); const g = G.khatmGoal({ days: 30 }, day0); G.setGoal(S, g);
    const p5 = G.planStatus(S, g, atDay(5)); // nothing read for 5 days: 610 over 25 days
    expect(p5).toMatchObject({ daily: 25, late: false, finishKey: "2026-11-30" });
    const p15 = G.planStatus(S, g, atDay(15)); // nothing for 15 days: 41 a day would be too steep
    expect(p15.daily).toBe(Math.ceil(21 * G.PACE_CAP)); // 27
    expect(p15.late).toBe(true);
    expect(p15.finishKey).toBe(dkey(addDays(atDay(15), Math.ceil(610 / 27) - 1)));
    const st = G.goalStatus(S, atDay(15));
    expect(st).toMatchObject({ per: "plan", unit: "pages", target: 27, met: false });
  });
  it("excused days pause the plan: N days end later by each one, and today's target is 0", () => {
    const S = fresh(); const g = G.khatmGoal({ days: 30 }, day0); G.setGoal(S, g);
    for (const i of [2, 3, 4]) store.ensureDay(S, dkey(atDay(i))).excused = true;
    const p4 = G.planStatus(S, g, atDay(4));
    expect(p4.paused).toBe(true);
    expect(p4.daily).toBe(0);
    expect(G.goalStatus(S, atDay(4))).toMatchObject({ paused: true, met: false });
    const p5 = G.planStatus(S, g, atDay(5));
    expect(p5.endKey).toBe("2026-12-03"); // 30 Nov + 3 excused days
    // the 3 excused days aren't in the pace: the pages left over the 28 reading days left
    G.addManual(S, "2026-11-01", { unit: "pages", n: 21 }, day0); G.addManual(S, "2026-11-02", { unit: "pages", n: 21 }, day0);
    expect(G.planStatus(S, g, atDay(5)).daily).toBe(Math.ceil((610 - 42) / 28));
  });
  it("a fixed date skips excused days in its pace", () => {
    const S = fresh(); const g = G.khatmGoal({ endKey: "2026-11-30" }, day0);
    for (let i = 10; i < 16; i++) store.ensureDay(S, dkey(atDay(i))).excused = true;
    // 610 pages over the 15 reading days left would be 41 a day: the gentle cap (27) instead
    expect(G.planStatus(S, g, atDay(9)).daily).toBe(27);
    expect(G.planStatus(S, g, atDay(9)).endKey).toBe("2026-11-30");
  });
  it("complete once every page is read", () => {
    const S = fresh(); const g = G.khatmGoal({ days: 2 }, day0);
    G.addManual(S, "2026-11-01", { unit: "juz", n: 30 }, day0);
    expect(G.planStatus(S, g, atDay(1))).toMatchObject({ complete: true, left: 0, daily: 0 });
    G.setGoal(S, g);
    expect(G.goalStatus(S, atDay(1))).toMatchObject({ met: true, paused: false });
  });
  it("the day before the next 1 Shawwāl, from any Hijri source", () => {
    const fake = d => (dkey(d) === "2027-03-10" ? { y: 1448, m: 10, d: 1 } : { y: 1448, m: 9, d: 2 });
    expect(G.eidEve(NOWD, fake)).toBe("2027-03-09");
    expect(G.eidEve(NOWD, () => null)).toBe("");
  });
});

describe("the reader: page debounce and active minutes", () => {
  const rig = () => {
    let t = 1e6; const pages = [], secs = [];
    const tr = createTracker({ now: () => t, onPages: k => pages.push(...k), onSec: s => secs.push(s) });
    return { tr, pages, secs, adv: ms => { t += ms; }, total: () => secs.reduce((a, b) => a + b, 0) };
  };
  it("flicking through pages counts nothing", () => {
    const { tr, pages, adv } = rig();
    for (let p = 1; p <= 10; p++) { tr.show([`m:${p}`]); adv(2000); tr.turn(true); }
    tr.stop();
    expect(pages).toEqual([]);
  });
  it("a page counts after 20 s on screen (on the next beat)", () => {
    const { tr, pages, adv } = rig();
    tr.show(["m:5"]); adv(PAGE_MS - 1000); tr.tick();
    expect(pages).toEqual([]);
    adv(1000); tr.tick(); tr.tick();
    expect(pages).toEqual(["m:5"]);
  });
  it("turning forward past a page after 10 s counts it; turning back doesn't; a spread counts both pages", () => {
    const { tr, pages, adv } = rig();
    tr.show(["m:5"]); adv(TURN_MS); tr.turn(true);
    tr.show(["m:6"]); adv(TURN_MS + 500); tr.turn(false);
    tr.show(["m:7", "m:8"]); adv(TURN_MS); tr.turn(true);
    expect(pages).toEqual(["m:5", "m:7", "m:8"]);
  });
  it("redrawing the same page doesn't restart its time", () => {
    const { tr, pages, adv } = rig();
    tr.show(["m:9"]); adv(15000); tr.show(["m:9"]); adv(5000); tr.tick();
    expect(pages).toEqual(["m:9"]);
  });
  it("active minutes stop 2 min after the last touch and start again on the next", () => {
    const { tr, adv, total } = rig();
    tr.show(["m:1"]);
    adv(60000); tr.interact();
    adv(10 * 60000); tr.tick(); // idle for 10 min: only 2 of them count
    tr.interact(); adv(30000); tr.stop();
    expect(total()).toBe(60 + IDLE_MS / 1000 + 30);
  });
  it("hidden: no minutes and no page time while the app is in the background", () => {
    const { tr, pages, adv, total } = rig();
    tr.show(["m:3"]); adv(15000);
    tr.hidden(true); adv(10 * 60000); tr.tick();
    expect(pages).toEqual([]);
    expect(total()).toBe(15);
    tr.hidden(false); adv(4000); tr.tick();
    expect(pages).toEqual([]); // 19 s visible
    adv(1000); tr.tick();
    expect(pages).toEqual(["m:3"]);
    tr.stop();
    expect(total()).toBe(20);
  });
  it("seconds are handed over about once a minute, not on every beat", () => {
    const { tr, secs, adv } = rig();
    tr.show(["m:1"]);
    for (let i = 0; i < 11; i++) { adv(5000); tr.interact(); tr.tick(); }
    expect(secs).toEqual([]);
    adv(5000); tr.interact(); tr.tick();
    expect(secs).toEqual([60]);
  });
});

describe("sync: the day's Qurʾān reading is joined, so manual entries stay", () => {
  const two = () => {
    const a = fresh(), b = fresh();
    a.updatedAt = 1; b.updatedAt = 2;
    return { a, b };
  };
  it("entries from both phones, both phones' minutes, all pages", () => {
    const { a, b } = two();
    G.addManual(a, TODAY, { unit: "pages", n: 5 }, NOWD); G.addAutoSec(a, TODAY, "pa", 120); pagesOn(a, TODAY, [1, 2]);
    G.addManual(b, TODAY, { unit: "min", n: 10 }, NOWD); G.addAutoSec(b, TODAY, "pb", 240); pagesOn(b, TODAY, [2, 3]);
    b.days[TODAY].u = a.days[TODAY].u + 10; // b edited the day last
    const m = store.mergeStates(a, b);
    expect(G.manualEntries(m, TODAY).map(e => e.unit).sort()).toEqual(["min", "pages"]);
    expect(G.autoSec(m, TODAY)).toBe(360);
    expect(G.autoPages(m, TODAY)).toBe(3);
  });
  it("a removed entry stays removed, and the later edit wins", () => {
    const { a, b } = two();
    const e1 = G.addManual(a, TODAY, { unit: "pages", n: 5 }, NOWD);
    const e2 = G.addManual(a, TODAY, { unit: "pages", n: 7 }, NOWD);
    b.days[TODAY] = JSON.parse(JSON.stringify(a.days[TODAY]));
    G.removeManual(a, TODAY, e1.id, new Date(+NOWD + 5000));
    G.editManual(b, TODAY, e2.id, { unit: "pages", n: 9 }, new Date(+NOWD + 9000));
    b.days[TODAY].u = a.days[TODAY].u + 10;
    const m = store.mergeStates(a, b);
    expect(G.manualEntries(m, TODAY)).toMatchObject([{ id: e2.id, n: 9 }]);
    expect(store.mergeStates(b, a).days[TODAY].quran.manual.find(x => x.id === e1.id).del).toBeGreaterThan(0);
  });
  it("a day with no reading on one side is kept as it is", () => {
    const { a, b } = two();
    G.addManual(a, TODAY, { unit: "pages", n: 5 }, NOWD);
    store.ensureDay(b, "2026-11-18").note = "x";
    const m = store.mergeStates(a, b);
    expect(G.manualEntries(m, TODAY)).toHaveLength(1);
    expect(store.mergeQuranDay(null, { pages: ["m:1"] })).toEqual({ pages: ["m:1"] });
  });
});

describe("the recitation tick is unchanged", () => {
  it("the goal and its reading neither tick recitation nor add provisions; the tick is still 1 good deed", () => {
    const S = fresh(); G.setGoal(S, { type: "pages", n: 5, per: "day" });
    pagesOn(S, TODAY, [1, 2, 3, 4, 5]); G.addManual(S, TODAY, { unit: "pages", n: 5 }, NOWD);
    expect(G.goalStatus(S, NOWD).met).toBe(true);
    expect(isReadDone(S, "quran", NOWD)).toBe(false);
    const before = dayProvisions(S.days[TODAY]).total;
    const noQuran = { ...S.days[TODAY] }; delete noQuran.quran;
    expect(before).toBe(dayProvisions(noQuran).total);
    setReadDone(S, "quran", true, NOWD);
    expect(S.days[TODAY].amal.quran).toEqual({ done: true, detail: "" });
    const after = dayProvisions(S.days[TODAY]);
    expect(after.parts.find(p => p.kind === "deeds")).toMatchObject({ count: 1 });
    expect(readItems(S, NOWD).find(i => i.id === "quran").done).toBe(true);
  });
  it("on an excused day Listen to Qurʾān stays the day's item", () => {
    const S = fresh(); G.setGoal(S, { type: "pages", n: 5, per: "day" });
    store.ensureDay(S, TODAY).excused = true;
    const ids = readItems(S, NOWD).map(i => i.id);
    expect(ids).toContain("listen");
    expect(ids).not.toContain("quran");
  });
});
