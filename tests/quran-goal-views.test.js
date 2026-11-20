// The Qurʾān goal on screen: Read → For today's recitation row, the card in Read → Qurʾān, the sheets
// (set goal, planner, "I read…"), Progress → Charts → Qurʾān and Settings → Read.
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as store from "../src/store.js";

const S = store.defaultState(new Date(2026, 9, 1));
S.profile.onboarded = true;
S.createdKey = "2026-10-01";
const NOWD = new Date(2026, 10, 19, 12, 0); // Thursday
const sheets = [], toasts = [], fields = {};
const A = {};
vi.mock("../src/app.js", () => ({
  S, UI: { view: "tools" }, A, $: () => null, $$: () => [], NOW: () => NOWD, todayKey: () => "2026-11-19",
  onRender() {}, onCommit() {}, commit() {}, render() {}, go() {}, toast: (m, o) => toasts.push([m, o]), touched() {}, revision: () => 1, avatarBtn: () => "",
  glossBtn: () => "", openSheet: h => sheets.push(h), closeSheet() {},
}));
vi.mock("../src/platform.js", () => ({ isNative: () => false, pageUrl: p => p }));
vi.mock("../src/cloud.js", () => ({ cloud: { available: false, user: null } }));
vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: () => "web", isNativePlatform: () => false } }));
globalThis.addEventListener ||= () => {};
globalThis.document ||= { addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], documentElement: { dataset: {} } };
document.getElementById = id => fields[id] || null;

const { _chapters: R } = await import("../src/views/read.js");
const V = await import("../src/views/quran-goal.js");
const { _chapters: PR } = await import("../src/views/progress.js");
const G = await import("../src/quran-goal.js");
const { QGOAL: Q, READ } = await import("../src/strings.js");
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const KEY = "2026-11-19";

beforeEach(() => {
  S.tools = { quran: { mushaf: "indopak15", pages: { indopak15: 212 } } };
  S.days = {}; delete S.settings.quranGoal;
  sheets.length = 0; toasts.length = 0;
  for (const k of Object.keys(fields)) delete fields[k];
});

describe("Read → For today", () => {
  it("without a goal the recitation row is as before (Open, the tick)", () => {
    const h = R.today(NOWD);
    expect(h).toContain(`A.readOpen('quran')`);
    expect(h).not.toContain("A.qgRead()");
  });
  it("daily: \"3 of 5 pages today\", a bar, the text opens the reader, \"I read…\", and the same tick", () => {
    G.setGoal(S, { type: "pages", n: 5, per: "day" });
    G.addAutoPages(S, KEY, ["indopak15:1", "indopak15:2", "indopak15:3"]);
    const h = R.today(NOWD);
    expect(h).toContain(esc(Q.of(3, 5, "pages", "day")));
    expect(Q.of(3, 5, "pages", "day")).toBe("3 of 5 pages today");
    expect(h).toContain('class="qg-bar"');
    expect(h).toContain(`class="t rd-tt" data-f="o-quran" onclick="A.readOpen('quran')"`);
    expect(h).toContain(`onclick="A.qgRead()"`);
    expect(h).toContain(`onclick="A.readTick('quran')"`);
  });
  it("minutes and weekly wording", () => {
    G.setGoal(S, { type: "min", n: 20, per: "day" });
    G.addManual(S, KEY, { unit: "min", n: 12 }, NOWD);
    expect(R.today(NOWD)).toContain("12 of 20 min today");
    G.setGoal(S, { type: "pages", n: 35, per: "week" });
    G.addManual(S, "2026-11-16", { unit: "pages", n: 18 }, NOWD);
    expect(R.today(NOWD)).toContain("18 of 35 pages this week");
  });
  it("an excused day: Listen to Qurʾān with \"Goal paused today\"", () => {
    G.setGoal(S, { type: "pages", n: 5, per: "day" });
    store.ensureDay(S, KEY).excused = true;
    const h = R.today(NOWD);
    expect(h).toContain(esc(READ.item.listen));
    expect(h).toContain(esc(Q.pausedShort));
    expect(h).not.toContain("A.qgRead()");
  });
});

describe("Read → Qurʾān: the goal card", () => {
  it("no goal: Set a goal and I read…", () => {
    const h = R.quran(NOWD);
    expect(h).toContain("A.qgSet()");
    expect(h).toContain(esc(Q.cardNone));
  });
  it("a plan: today's pages, pages to go, and the finish date", () => {
    G.setGoal(S, G.khatmGoal({ days: 30 }, new Date(2026, 10, 19, 9)));
    const h = R.quran(NOWD);
    expect(h).toContain(esc(Q.goalName(S.settings.quranGoal)));
    expect(h).toContain(esc(Q.pagesLeft(610)));
    expect(h).toContain(esc(Q.expected("Fri 18 Dec")));
    expect(h).toContain('qg-bar lg');
  });
  it("an excused day: paused, no I read…", () => {
    G.setGoal(S, { type: "pages", n: 5, per: "day" });
    store.ensureDay(S, KEY).excused = true;
    const h = V.goalCard(NOWD);
    expect(h).toContain(esc(Q.paused));
    expect(h).not.toContain("A.qgRead()");
  });
});

describe("sheets", () => {
  it("set a goal: kinds, units, stepper; saving writes settings.quranGoal", () => {
    A.qgSet();
    const h = sheets.at(-1);
    for (const k of ["day", "week", "plan"]) expect(h).toContain(`data-f="qg-k-${k}"`);
    for (const u of ["pages", "juz", "min"]) expect(h).toContain(`data-f="qg-u-${u}"`);
    A.qgSet({ per: "week", unit: "juz", n: 2 });
    fields.qgN = { value: "3" };
    A.qgSave();
    expect(S.settings.quranGoal).toEqual({ type: "juz", n: 3, per: "week" });
    A.qgClear();
    expect(S.settings.quranGoal).toBeUndefined();
    toasts.at(-1)[1].undo();
    expect(S.settings.quranGoal).toEqual({ type: "juz", n: 3, per: "week" });
  });
  it("planner: 30 / 60 / 90 / custom or a date, from here or the start, with the pages a day", () => {
    S.tools.quran.read = {};
    A.qgPlan();
    let h = sheets.at(-1);
    for (const n of [30, 60, 90]) expect(h).toContain(`data-f="qg-d${n}"`);
    expect(h).toContain(esc(Q.fromHere(212)));
    expect(h).toContain(esc(Q.planSum(Math.ceil(399 / 30), "Fri 18 Dec")));
    A.qgPlan({ from: "start", days: 60 });
    h = sheets.at(-1);
    expect(h).toContain(esc(Q.planSum(Math.ceil(610 / 60), "Sun 17 Jan")));
    A.qgPlanSave();
    expect(S.settings.quranGoal).toMatchObject({ type: "khatm", start: 1, days: 60, startKey: KEY });
    A.qgPlan({ mode: "date", endKey: "2026-12-18" });
    expect(sheets.at(-1)).toContain('type="date"');
  });
  it("I read…: adds pages (and the recitation tick when asked), lists, edits and removes entries", () => {
    A.qgRead();
    expect(sheets.at(-1)).toContain('id="qgTick"');
    fields.qgN = { value: "4" }; fields.qgTick = { checked: true };
    A.qgAdd(KEY);
    expect(G.manualEntries(S, KEY)).toMatchObject([{ unit: "pages", n: 4 }]);
    expect(S.days[KEY].amal.quran?.done).toBe(true);
    toasts.at(-1)[1].undo();
    expect(G.manualEntries(S, KEY)).toEqual([]);
    expect(S.days[KEY].amal.quran).toBeUndefined();
    A.qgRead(); fields.qgN = { value: "6" }; fields.qgTick = { checked: false }; A.qgAdd(KEY);
    const e = G.manualEntries(S, KEY)[0];
    expect(S.days[KEY].amal.quran).toBeUndefined();
    A.qgRead(KEY, {});
    expect(sheets.at(-1)).toContain(`A.qgRemove('${KEY}','${e.id}')`);
    A.qgRead(KEY, { edit: e.id, unit: "min", n: 6 }); fields.qgN = { value: "25" }; A.qgAdd(KEY);
    expect(G.manualEntries(S, KEY)).toMatchObject([{ id: e.id, unit: "min", n: 25 }]);
    A.qgRemove(KEY, e.id);
    expect(G.manualEntries(S, KEY)).toEqual([]);
  });
  it("I read… for an earlier day (the calendar): no tick, back to the day sheet", () => {
    A.daySheet = vi.fn();
    A.qgRead("2026-11-17");
    const h = sheets.at(-1);
    expect(h).not.toContain('id="qgTick"');
    expect(h).toContain(`A.daySheet('2026-11-17')`);
    fields.qgN = { value: "3" }; A.qgAdd("2026-11-17");
    expect(G.manualEntries(S, "2026-11-17")).toHaveLength(1);
    expect(A.daySheet).toHaveBeenCalledWith("2026-11-17");
  });
  it("I read… on an excused day says the goal is paused", () => {
    store.ensureDay(S, KEY).excused = true;
    A.qgRead();
    expect(sheets.at(-1)).toContain(esc(Q.excusedRead));
    expect(sheets.at(-1)).not.toContain("A.qgAdd");
  });
});

describe("Progress → Charts → Qurʾān", () => {
  it("a sub-tab with the pages per day (or minutes), a text summary for screen readers", () => {
    for (let i = 1; i <= 5; i++) G.addManual(S, `2026-11-${String(10 + i).padStart(2, "0")}`, { unit: "pages", n: i * 2 }, NOWD);
    G.addAutoSec(S, KEY, "a", 600);
    A.subTab?.("charts", "quran");
    const h = PR.charts();
    expect(h).toContain('data-id="quran"');
    expect(h).toContain('class="pr-pd qg-pd" role="img"');
    expect(h).toContain(esc(Q.chartAria("pages", "21 Oct", "19 Nov", 30, 6)));
    A.prQUnit("min");
    expect(PR.charts()).toContain(esc(Q.chartAria("min", "21 Oct", "19 Nov", 10, 6)));
    A.prQUnit("pages");
  });
});
