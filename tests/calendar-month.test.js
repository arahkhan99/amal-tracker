// The month calendar (19 Nov 2026, declutter): the Hijri day under each day (the user's Hijri settings apply), the
// Hijri month(s) under the title, status bars, a day ahead opens its prayer times only (no logging), past days keep
// the edit sheet, and the month view goes up to 12 months ahead.
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as store from "../src/store.js";
import { timesFor } from "../src/times.js";
import { fmt12 } from "../src/util.js";

const S = store.defaultState(new Date(2026, 9, 1));
const UI = { view: "calendar" };
const clock = { now: new Date(2026, 10, 19, 12, 0) }; // Thursday 19 November 2026 · 9 Jumada al-Akhirah 1448
const el = { innerHTML: "" };
const calls = { sheet: [], render: [] };
vi.mock("../src/app.js", () => ({
  S, UI, A: {}, $: sel => (sel === "#v-calendar" ? el : { classList: { contains: () => false } }), $$: () => [], NOW: () => clock.now,
  todayKey: () => { const d = clock.now; return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; },
  onRender(fn) { calls.render.push(fn); }, onCommit() {}, commit() {}, render() {}, go() {}, tick() {}, syncNav() {}, applyTheme() {}, resolvedTheme: () => "light",
  toast() {}, touched() {}, revision: () => 1, avatarBtn: () => "",
  glossBtn: () => "", openSheet(h) { calls.sheet.push(h); }, closeSheet() {},
}));
vi.mock("../src/platform.js", () => ({ isNative: () => false, pageUrl: p => p }));
vi.mock("../src/cloud.js", () => ({ cloud: { available: false, user: null } }));
vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: () => "web", isNativePlatform: () => false } }));
globalThis.addEventListener ||= () => {};
globalThis.document ||= { addEventListener() {}, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], documentElement: { dataset: {} } };

const { A } = await import("../src/app.js");
const cal = await import("../src/views/calendar.js");
const { setHijriSource, hijriLabel } = await import("../src/hijri.js");
const { CALENDAR } = await import("../src/strings.js");
A.go = () => {};
const draw = () => { for (const f of calls.render) f(); return el.innerHTML; };
/** The month view's cell for day `k` ("YYYY-MM-DD"). */
const cell = (h, k) => { const i = h.indexOf(`data-k="${k}"`); expect(i).toBeGreaterThan(-1); return h.slice(h.lastIndexOf("<button", i), h.indexOf("</button>", i)); };

beforeEach(() => {
  const fresh = store.defaultState(new Date(2026, 9, 1));
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, fresh);
  S.profile.onboarded = true; S.createdKey = "2026-10-01";
  S.settings.location = { lat: 51.51, lng: -0.13, label: "London", source: "city" };
  setHijriSource(() => S.settings.hijri);
  delete S.settings.hijri;
  clock.now = new Date(2026, 10, 19, 12, 0);
  calls.sheet.length = 0;
  A.calOpen();
});

describe("the month view", () => {
  it("title in Amiri with the Hijri months under it", () => {
    const h = draw();
    expect(h).toContain(`<h1 class="zc-title">November 2026</h1>`);
    expect(h).toContain(`<p class="zc-hj">Jumada al-Ula – Jumada al-Akhirah 1448</p>`);
    expect(cal.hijriMonths({ y: 1447, m: 12, d: 20 }, { y: 1448, m: 1, d: 19 })).toBe("Dhu al-Hijjah 1447 – Muharram 1448");
    expect(cal.hijriMonths({ y: 1448, m: 9, d: 1 }, { y: 1448, m: 9, d: 30 })).toBe("Ramadan 1448");
  });
  it("the Hijri day under each day; the 1st of a month reads '1 Jum II' in the accent colour", () => {
    const h = draw();
    expect(cell(h, "2026-11-19")).toContain('<span class="h">9</span>');
    expect(cell(h, "2026-11-01")).toContain('<span class="h">21</span>');
    expect(cell(h, "2026-11-11")).toContain('<span class="h m">1 Jum II</span>');
    expect(cell(h, "2026-11-19")).toContain("9 Jumada al-Akhirah 1448"); // read out with the day
  });
  it("follows the user's Hijri settings (an adjustment of +1 moves every day)", () => {
    S.settings.hijri = { method: "umalqura", committee: "", adjust: 1 };
    const h = draw();
    expect(cell(h, "2026-11-19")).toContain('<span class="h">10</span>');
    expect(cell(h, "2026-11-10")).toContain('<span class="h m">1 Jum II</span>');
  });
  it("past days: one bar per prayer by status (missed is its own class); today has the ring; days ahead have no bars", () => {
    store.setPrayer(S, "2026-11-18", "Fajr", "congregation", clock.now);
    store.setPrayer(S, "2026-11-18", "Dhuhr", "ontime", clock.now);
    store.setPrayer(S, "2026-11-18", "Asr", "madeup", clock.now);
    store.setPrayer(S, "2026-11-18", "Maghrib", "missed", clock.now);
    const h = draw();
    expect(cell(h, "2026-11-18")).toContain('<span class="pp"><i class="c"></i><i class="o"></i><i class="u"></i><i class="x"></i><i class=""></i></span>');
    expect(cell(h, "2026-11-19")).toContain("zc-dc today");
    expect(cell(h, "2026-11-26")).not.toContain('class="pp"');
    expect(h).toContain(CALENDAR.legendBars.congregation);
    expect(h).toContain('<i class="lp x"></i>');
  });
  it("today and past days open the edit sheet; a day ahead opens its prayer times", () => {
    const h = draw();
    expect(cell(h, "2026-11-18")).toContain(`onclick="A.daySheet('2026-11-18')"`);
    expect(cell(h, "2026-11-19")).toContain(`onclick="A.daySheet('2026-11-19')"`);
    expect(cell(h, "2026-11-26")).toContain(`onclick="A.dayTimes('2026-11-26')"`);
    expect(cell(h, "2026-11-26")).not.toContain("disabled");
  });
  it("goes up to 12 months ahead; further is refused", () => {
    for (let i = 0; i < 12; i++) A.calStep(1);
    let h = draw();
    expect(h).toContain("November 2027");
    expect(h).toMatch(/aria-label="Next month" disabled/);
    A.calStep(1);
    expect(draw()).toContain("November 2027");
    A.calStep(-1);
    expect(draw()).toContain("October 2027");
  });
});

describe("a day ahead: prayer times only", () => {
  it("the date, the Hijri date and the place, then the six times with a small AM/PM; nothing to log", () => {
    A.dayTimes("2026-11-26");
    const h = calls.sheet.at(-1);
    expect(h).toContain("Thursday 26 November");
    expect(h).toContain(`${hijriLabel("2026-11-26")} · London`);
    expect(hijriLabel("2026-11-26")).toBe("16 Jumada al-Akhirah 1448");
    for (const n of ["Fajr", "Sunrise", "Zuhr", "ʿAsr", "Maghrib", "ʿIshāʾ"]) expect(h).toContain(n);
    const t = timesFor(new Date(2026, 10, 26), S.settings);
    expect(h).toContain(fmt12(t.Fajr).replace(/ (AM|PM)$/, "<small>$1</small>"));
    expect(h).toContain(fmt12(t.Isha).replace(/ (AM|PM)$/, "<small>$1</small>"));
    expect(h).toContain(CALENDAR.futureNote);
    expect(h).not.toMatch(/A\.dayPick|A\.prayerSheet|A\.setPrayer|A\.logTap|data-tap/);
  });
  it("the edit sheet still refuses a day ahead; a past day still opens it", () => {
    A.daySheet("2026-11-26");
    expect(calls.sheet.length).toBe(0);
    A.daySheet("2026-11-18");
    expect(calls.sheet.at(-1)).toContain("A.dayPick('Fajr'");
  });
});
