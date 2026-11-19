// Progress sub-tabs (user, 19 Nov 2026): Week, Charts and Make-ups each show one section at a time, behind a small
// segmented control (views/subtabs.js); a chapter goes back to its first sub-tab when it is left. Also: the numbers
// restored inside them (parity M9 / decision c) and the status-mark legend that is centred again.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import * as store from "../src/store.js";

const DAY = new Date(2026, 10, 19, 21, 0); // Thursday after ʿIshāʾ
const S = store.defaultState(new Date(2026, 9, 1));
S.profile.onboarded = true;
S.createdKey = "2026-10-01";
const UI = { view: "home", progressCh: "week" };
vi.mock("../src/app.js", () => ({
  S, UI, A: {}, $: () => null, $$: () => [], NOW: () => DAY, todayKey: () => "2026-11-19",
  onRender() {}, onCommit() {}, commit() {}, render() {}, go() {}, tick() {}, syncNav() {}, applyTheme() {}, resolvedTheme: () => "light", toast() {}, touched() {}, revision: () => 1, avatarBtn: () => "",
  glossBtn: id => `<button class="info-btn" data-gl="${id}"></button>`, openSheet() {}, closeSheet() {},
}));
vi.mock("../src/platform.js", () => ({ isNative: () => false, pageUrl: p => p }));
vi.mock("../src/cloud.js", () => ({ cloud: { available: false, user: null } }));
vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: () => "web", isNativePlatform: () => false } }));

globalThis.addEventListener ||= () => {}; // views/chapters.js listens for resize
// views/home.js (statusMark) sets up one delegated listener at import
globalThis.document ||= { addEventListener() {}, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], documentElement: { dataset: {} } };
const { A } = await import("../src/app.js");
const sub = await import("../src/views/subtabs.js");
const { _chapters: C } = await import("../src/views/progress.js");
const { PROG, PROGRESS_L: L, DEEDS } = await import("../src/strings.js");

// a month of log: congregation most days, all five on most days, salawāt and sadaqah some days
const P5 = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
for (let d = new Date(2026, 9, 1); d < new Date(2026, 10, 19); d.setDate(d.getDate() + 1)) {
  const day = store.ensureDay(S, `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  for (const p of P5) day.prayers[p] = d.getDate() % 7 === 0 && p === "Fajr" ? "missed" : d.getDate() % 3 ? "congregation" : "ontime";
  if (d.getDate() % 2) day.amal.salawat = { done: true, detail: "100" };
  if (d.getDate() % 5 === 0) day.amal.sadaqah = { done: true, detail: "" };
}
const tabsOf = h => [...h.matchAll(/role="tab"[^>]*data-id="([^"]+)"/g)].map(m => m[1]);
const selected = h => h.match(/role="tab"[^>]*data-id="([^"]+)"[^>]*aria-selected="true"/)?.[1];
const panels = h => (h.match(/role="tabpanel"/g) || []).length;

describe("sub-tabs: one section at a time", () => {
  beforeEach(() => sub.resetSubs());
  it("Week: Days · Streaks · Congregation · Sunnah · Good deeds, Days first; only the Days section is built", () => {
    const h = C.week();
    expect(tabsOf(h)).toEqual(["days", "streaks", "cong", "sunnah", "deeds"]);
    expect(selected(h)).toBe("days");
    expect(panels(h)).toBe(1);
    expect(h).toContain('class="pr-days"');
    expect(h).not.toContain(PROG.streaks === "Streaks" ? "pr-gr hd" : "x"); // no grids of the other sections
    expect(h).not.toContain(esc(PROG.congWeekSub));
  });
  it("tapping a sub-tab shows that section only, and redraws its own chapter", () => {
    let drawn = 0; sub.onSubTab("week", () => { drawn++; });
    A.subTab("week", "deeds");
    expect(drawn).toBe(1);
    const h = C.week();
    expect(selected(h)).toBe("deeds");
    expect(h).toContain("pr-gr hd");
    expect(h).not.toContain('class="pr-days"');
    expect(panels(h)).toBe(1);
  });
  it("Charts: Prayers · Each prayer · Congregation · Sunnah · Good deeds; the 30 days / Year switch is inside", () => {
    const h = C.charts();
    expect(tabsOf(h)).toEqual(["prayers", "each", "cong", "sunnah", "deeds"]);
    expect(selected(h)).toBe("prayers");
    expect(h).toContain("A.prRange('year')");
    A.subTab("charts", "each");
    const e = C.charts();
    expect(e).toContain("pr-hb");
    expect(e).not.toContain("pr-pd");
    expect(e).toContain("A.prRange('year')");
  });
  it("Make-ups: Left · Goal · History", () => {
    S.qada.Fajr = 20;
    const h = C.makeups();
    expect(tabsOf(h)).toEqual(["left", "goal", "history"]);
    expect(h).toContain("A.mkPick()");
    expect(h).not.toContain("mk-mile");
    A.subTab("makeups", "history");
    expect(C.makeups()).toContain("mk-mile");
    A.subTab("makeups", "goal");
    expect(C.makeups()).toContain("mk-bar");
  });
  it("reset puts every chapter back on its first sub-tab", () => {
    A.subTab("week", "sunnah"); A.subTab("charts", "deeds"); A.subTab("makeups", "history");
    expect(sub.subIsFirst("week")).toBe(false);
    sub.resetSubs("week");
    expect(selected(C.week())).toBe("days");
    expect(selected(C.charts())).toBe("deeds");
    sub.resetSubs();
    expect(selected(C.charts())).toBe("prayers");
    expect(selected(C.makeups())).toBe("left");
  });
  it("is keyboard accessible: a tablist of tabs, one in the tab order, panel labelled by its tab", () => {
    const h = C.week();
    expect(h).toMatch(/role="tablist" aria-label="Week sections" onkeydown="A\.subKey\(event,'week'\)"/);
    expect((h.match(/tabindex="0"/g) || []).length).toBeGreaterThanOrEqual(1);
    expect(h.match(/role="tab"[^>]*tabindex="0"/g)).toHaveLength(1);
    expect(h).toMatch(/role="tabpanel" id="st-week-p" aria-labelledby="st-week-days"/);
    // arrow keys move and choose
    const tabs = ["days", "streaks", "cong", "sunnah", "deeds"].map(id => ({ dataset: { id } }));
    const ev = { key: "ArrowLeft", target: tabs[0], currentTarget: { querySelectorAll: () => tabs }, preventDefault() {}, stopPropagation() {} };
    A.subKey(ev, "week");
    expect(selected(C.week())).toBe("deeds");
  });
  it("a sister sees no Congregation sub-tab in a week without any", () => {
    const keep = JSON.parse(JSON.stringify(S.days));
    S.profile.gender = "f";
    for (const d of ["15", "16", "17", "18"]) for (const p of P5) S.days[`2026-11-${d}`].prayers[p] = "ontime";
    try {
      expect(tabsOf(C.week())).not.toContain("cong");
      S.days["2026-11-16"].prayers.Asr = "congregation";
      expect(tabsOf(C.week())).toContain("cong"); // a week with some: shown
    } finally { delete S.profile.gender; S.days = keep; }
  });
});

describe("restored numbers (parity M9, decision c)", () => {
  beforeEach(() => sub.resetSubs());
  it("Charts → Prayers: % prayed, on time %, days with all five", () => {
    const h = C.charts();
    expect(h).toContain(L.onTime);
    expect(h).toContain(L.prayedDays);
    expect(h).toMatch(/<b>\d+<span>\/\d+<\/span><\/b><small>days with all five/);
  });
  it("Charts → Congregation: about 1 in N, with the ⓘ explainer", () => {
    A.subTab("charts", "cong");
    const h = C.charts();
    expect(h).toMatch(/About <b>1 in \d+<\/b> prayers in congregation/);
    expect(h).toContain('data-gl="jamaah"');
  });
  it("Week → Congregation: N prayers and, in the best week, your best week yet; ⓘ on the heading", () => {
    A.subTab("week", "cong");
    const h = C.week();
    expect(h).toMatch(/<b>\d+ prayers<\/b> in congregation\./);
    expect(h).toContain('data-gl="jamaah"');
    // this week has more congregation than any before it? Make it so: every prayer this week in congregation
    expect(h).not.toContain(PROG.bestWeek); // most weeks were the same
    for (let d = 15; d <= 19; d++) for (const p of P5) store.ensureDay(S, `2026-11-${d}`).prayers[p] = "congregation";
    for (const d of ["08", "09", "10", "11", "12", "13", "14"]) for (const p of P5) S.days[`2026-11-${d}`].prayers[p] = "ontime";
    expect(C.week()).toContain(PROG.bestWeek);
  });
  it("Week → Sunnah has the ⓘ explainer", () => {
    A.subTab("week", "sunnah");
    expect(C.week()).toContain('data-gl="sunnah"');
    A.subTab("charts", "sunnah");
    expect(C.charts()).toContain('data-gl="sunnah"');
  });
  it("Week → Good deeds: salawāt and sadaqah counted", () => {
    A.subTab("week", "deeds");
    const h = C.week();
    expect(h).toContain(PROG.salawatDays);
    expect(h).toContain(PROG.sadaqahDays);
    expect(h).toMatch(/\d+ salawāt in all/);
    expect(h).toContain(esc(DEEDS.noTarget));
  });
});

describe("the status-mark legend is centred", () => {
  beforeEach(() => sub.resetSubs());
  it("legend items are not plain spans any more (the old rule turned the mark's grid into a left-aligned flex)", () => {
    const h = C.week();
    expect(h).toMatch(/<span class="pr-li"><span class="z-mk/);
    const css = readFileSync("src/css/progress.css", "utf8");
    expect(css).not.toMatch(/\.pr-leg span\{/);
    const home = readFileSync("src/css/home.css", "utf8");
    expect(home).toMatch(/\.z-mk\{[^}]*justify-content:center[^}]*align-items:center/);
  });
});

function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
