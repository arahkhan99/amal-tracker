// "Start on 1 Ramaḍān, finish by Eid" (19 Nov 2026): the Ramaḍān range from the Hijri calendar, a scheduled plan
// before 1 Ramaḍān (nothing read before it counts), the plan during Ramaḍān, the planner's third choice, and the
// finish date in Settings → Qurʾān goal.
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as store from "../src/store.js";
import { dkey, addDays, parseKey } from "../src/util.js";

const S = store.defaultState(new Date(2026, 9, 1));
S.profile.onboarded = true;
S.createdKey = "2026-10-01";
const clock = { now: new Date(2026, 10, 19, 12, 0) };
const sheets = [], toasts = [];
const A = {};
vi.mock("../src/app.js", () => ({
  S, UI: { view: "tools" }, A, $: () => null, $$: () => [], NOW: () => clock.now, todayKey: () => dkey(clock.now),
  onRender() {}, onCommit() {}, commit() {}, render() {}, go() {}, toast: (m, o) => toasts.push([m, o]), touched() {}, revision: () => 1, avatarBtn: () => "",
  glossBtn: () => "", openSheet: h => sheets.push(h), closeSheet() {},
}));
vi.mock("../src/platform.js", () => ({ isNative: () => false, pageUrl: p => p }));
vi.mock("../src/cloud.js", () => ({ cloud: { available: false, user: null } }));
vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: () => "web", isNativePlatform: () => false } }));
globalThis.addEventListener ||= () => {};
globalThis.document ||= { addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], documentElement: { dataset: {} } };
document.getElementById ||= () => null;

const G = await import("../src/quran-goal.js");
const V = await import("../src/views/quran-goal.js");
const { QGOAL: Q } = await import("../src/strings.js");
const { setHijriSource, hijriParts } = await import("../src/hijri.js");
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** A fake Hijri calendar: Ramaḍān 1448 = 8 Feb – 8 Mar 2027 (29 days), 1 Shawwāl on 9 Mar. */
const R0 = "2027-02-08", EID = "2027-03-09";
const fake = d => {
  const k = typeof d === "string" ? d : dkey(d);
  const n = Math.round((parseKey(k) - parseKey(R0)) / 864e5);
  if (n < 0) return { y: 1448, m: 8, d: 2 };
  if (k < EID) return { y: 1448, m: 9, d: n + 1 };
  return { y: 1448, m: 10, d: Math.round((parseKey(k) - parseKey(EID)) / 864e5) + 1 };
};

beforeEach(() => {
  S.tools = { quran: { mushaf: "indopak15" } };
  S.days = {}; delete S.settings.quranGoal; delete S.settings.hijri;
  setHijriSource(() => S.settings.hijri);
  clock.now = new Date(2026, 10, 19, 12, 0);
  sheets.length = 0; toasts.length = 0;
});

describe("the Ramaḍān range", () => {
  it("before Ramaḍān: the next 1 Ramaḍān to the day before Eid", () => {
    expect(G.ramadanRange(new Date(2026, 10, 19), fake)).toEqual({ startKey: R0, endKey: "2027-03-08" });
  });
  it("during Ramaḍān: this Ramaḍān's 1st (already past), not next year's", () => {
    expect(G.ramadanRange(new Date(2027, 1, 20), fake)).toEqual({ startKey: R0, endKey: "2027-03-08" });
  });
  it("from the app's own Hijri calendar (Umm al-Qura by default), and null without one", () => {
    expect(G.ramadanRange(new Date(2026, 10, 19), d => hijriParts(d))).toEqual({ startKey: R0, endKey: "2027-03-08" }); // Umm al-Qura: 1 Ramaḍān 1448 = 8 Feb 2027
    // a +1 adjustment (Settings → Hijri date) moves it a day earlier
    expect(G.ramadanRange(new Date(2026, 10, 19), d => hijriParts(d, { method: "umalqura", adjust: 1 })).startKey).toBe("2027-02-07");
    expect(G.ramadanRange(new Date(2026, 10, 19), () => null)).toBe(null);
  });
});

describe("a scheduled plan before 1 Ramaḍān", () => {
  const g = () => G.ramadanGoal({ mushaf: "indopak15", total: 610, start: 1, range: G.ramadanRange(clock.now, fake) });
  it("is a khatm goal over Ramaḍān, marked ramadan", () => {
    expect(g()).toEqual({ type: "khatm", mushaf: "indopak15", total: 610, start: 1, startKey: R0, endKey: "2027-03-08", ramadan: true });
    expect(G.ramadanGoal({ range: null })).toBe(null);
  });
  it("nothing to read yet and nothing read before it counts; the pace is spread over Ramaḍān's days", () => {
    G.addManual(S, dkey(clock.now), { unit: "pages", n: 40 }, clock.now);
    const p = G.planStatus(S, g(), clock.now);
    expect(p).toMatchObject({ scheduled: true, daily: 0, read: 0, left: 610, paused: false, complete: false, startKey: R0, finishKey: "2027-03-08", base: Math.ceil(610 / 29) });
    G.setGoal(S, g());
    expect(G.goalStatus(S, clock.now)).toMatchObject({ per: "plan", scheduled: true, target: 0, done: 0, met: false, paused: false });
  });
  it("For today and the card say when it starts, with no bar", () => {
    G.setGoal(S, g());
    setHijriSource(() => null);
    const st = G.goalStatus(S, clock.now);
    expect(V.goalLine(st)).toBe(Q.starts(true, "Mon 8 Feb"));
    expect(Q.starts(true, "Mon 8 Feb")).toBe("Starts on 1 Ramaḍān · Mon 8 Feb");
    expect(V.goalBar(st)).toBe("");
    const card = V.goalCard(clock.now);
    expect(card).toContain(esc(Q.starts(true, "Mon 8 Feb")));
    expect(card).toContain(esc(Q.planSum(Math.ceil(610 / 29), "Mon 8 Mar")));
    expect(card).not.toContain("qg-bar");
  });
  it("from 1 Ramaḍān it is an ordinary plan by Eid: reading counts from the 1st", () => {
    G.setGoal(S, g());
    clock.now = new Date(2027, 1, 10, 12); // 3 Ramaḍān
    G.addManual(S, "2027-02-08", { unit: "pages", n: 21 }, new Date(2027, 1, 8, 12));
    G.addManual(S, "2027-02-09", { unit: "pages", n: 21 }, new Date(2027, 1, 9, 12));
    const p = G.planStatus(S, S.settings.quranGoal, clock.now);
    expect(p.scheduled).toBe(false);
    expect(p.read).toBe(42);
    expect(p.endKey).toBe("2027-03-08");
    expect(p.daily).toBe(Math.ceil((610 - 42) / 27));
  });
});

describe("the planner and Settings", () => {
  it("the planner's third choice shows 1 Ramaḍān and Eid, and saves the Ramaḍān plan from the beginning", () => {
    setHijriSource(() => ({ method: "umalqura", committee: "", adjust: 0 }));
    A.qgPlan({ mode: "ramadan" });
    const h = sheets.at(-1);
    expect(h).toContain('data-f="qg-m-ram"');
    expect(h).toContain(esc(Q.ramadanTitle));
    expect(Q.ramadanTitle).toBe("Start on 1 Ramaḍān, finish by Eid");
    expect(h).toContain(esc(Q.ramadanStart("Mon 8 Feb")));
    expect(h).toContain(esc(Q.ramadanEnd("Mon 8 Mar")));
    expect(h).toContain(esc(Q.planSum(Math.ceil(610 / 29), "Mon 8 Mar")));
    A.qgPlanSave();
    expect(S.settings.quranGoal).toMatchObject({ type: "khatm", ramadan: true, start: 1, startKey: "2027-02-08", endKey: "2027-03-08" });
    // editing it again opens on the Ramaḍān choice, and saving keeps 1 Ramaḍān as the start
    A.qgPlan();
    expect(sheets.at(-1)).toMatch(/aria-checked="true" class="on" data-f="qg-m-ram"/);
  });
  it("Settings → Qurʾān goal shows a plan's finish date", () => {
    expect(V.goalSummary(null)).toBe(Q.notSet);
    expect(V.goalSummary({ type: "pages", n: 5, per: "day" })).toBe("5 pages a day");
    const plan = G.khatmGoal({ total: 610, start: 1, endKey: "2027-03-09" }, clock.now);
    expect(V.goalSummary(plan)).toBe("Finish by 9 Mar");
    const ram = G.ramadanGoal({ total: 610, range: { startKey: R0, endKey: "2027-03-08" } });
    expect(V.goalSummary(ram)).toBe("Starts 8 Feb · finish by 8 Mar");
  });
  it("the Settings row is wired to goalSummary", async () => {
    const fs = await import("node:fs");
    const set = fs.readFileSync("src/views/settings.js", "utf8");
    expect(set).toMatch(/title: QGOAL\.settingsRow, sub: goalSummary\(g\)/);
  });
});
