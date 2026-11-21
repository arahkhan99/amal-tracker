// The merged Today page (19 Nov 2026): one list of the five prayers with the current (or next) prayer highlighted,
// tap to log (on time → congregation → clear, for everyone), long press or ⋯ for every status, "Make up now" on a
// missed prayer's row, the one-time "Tap again for congregation" hint, and Undo on every tap.
// Rules: src/today.js (todayFocus, todayRows, rowState, tapNext). Drawing: src/views/home.js (rowHTML, A.rowTap).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import * as store from "../src/store.js";
import { timesFor } from "../src/times.js";
import { dkey, addDays, PRAYERS, fmt12 } from "../src/util.js";
import * as today from "../src/today.js";

const DAY = new Date(2026, 10, 19, 12, 0); // Thursday
const KEY = dkey(DAY);
const S = store.defaultState(new Date(2026, 9, 1));
const UI = { view: "home" };
const clock = { now: DAY };
const calls = { toast: [], sheet: [], commit: 0 };
vi.mock("../src/app.js", () => ({
  S, UI, A: {}, $: () => ({ classList: { contains: () => false } }), $$: () => [], NOW: () => clock.now, todayKey: () => dkey(clock.now),
  onRender() {}, onCommit() {}, commit() { calls.commit++; }, render() {}, go() {}, tick() {}, syncNav() {}, applyTheme() {}, resolvedTheme: () => "light",
  toast(m, o) { calls.toast.push([m, o]); }, touched() {}, revision: () => 1, avatarBtn: () => "",
  glossBtn: id => `<button class="info-btn" data-gl="${id}"></button>`, openSheet(h) { calls.sheet.push(h); }, closeSheet() {},
}));
vi.mock("../src/platform.js", () => ({ isNative: () => false, pageUrl: p => p }));
vi.mock("../src/cloud.js", () => ({ cloud: { available: false, user: null } }));
vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: () => "web", isNativePlatform: () => false } }));
globalThis.addEventListener ||= () => {};
globalThis.document ||= { addEventListener() {}, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], documentElement: { dataset: {} } };

const { A } = await import("../src/app.js");
const home = await import("../src/views/home.js");
const { TODAY } = await import("../src/strings.js");
const { _today, pressStart, pressEnd, pressClick, LONG_MS } = home;

const at = (p, mins = 20, d = DAY) => new Date(+timesFor(d, S.settings)[p] + mins * 60000);
function reset({ gender = "m", hintSeen = true } = {}) {
  const fresh = store.defaultState(new Date(2026, 9, 1));
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, fresh);
  S.profile.onboarded = true;
  S.createdKey = "2026-10-01";
  S.settings.location = { lat: 41.88, lng: -87.63, label: "Chicago", source: "city" }; // the tests run in America/Chicago
  S.settings.method = "MoonsightingCommittee"; S.settings.asr = "hanafi"; S.settings.madhhab = "hanafi";
  store.applyGender(S, gender, { todayKey: KEY }, DAY);
  // something logged earlier, so the first-run guide line is done
  store.setPrayer(S, "2026-11-16", "Fajr", "ontime", new Date(2026, 10, 16, 7));
  S.settings.help = { tour: "done", tips: hintSeen ? { tapAgain: true } : {} };
  calls.toast.length = 0; calls.sheet.length = 0; calls.commit = 0;
  clock.now = at("Asr", 30);
}
const status = (p, key = KEY) => store.prayerStatus(S, key, p);
const lastToast = () => calls.toast.at(-1);
const hero_ = () => { const m = _today.model(clock.now); return _today.heroHTML(m.hero, m.focus, clock.now); };
const html = (p, key = KEY) => {
  const m = _today.model(clock.now), i = m.rows.findIndex(r => r.p === p && r.key === key);
  return _today.rowHTML(m.states[i], clock.now, m.focus);
};

describe("tap cycle: on time → in congregation → clear (everyone)", () => {
  beforeEach(() => reset());
  it("each tap moves the stored state on, and the mark changes each time", () => {
    expect(html("Asr")).toMatch(/class="z-mk\s+z-now"/); // empty ring, current prayer
    A.rowTap("Asr");
    expect(status("Asr")).toBe("ontime");
    expect(html("Asr")).toContain("z-mk z-o"); // single check
    A.rowTap("Asr");
    expect(status("Asr")).toBe("congregation");
    expect(html("Asr")).toContain("z-mk z-c"); // double check
    A.rowTap("Asr");
    expect(status("Asr")).toBe(null);
    expect(calls.toast.map(t => t[0])).toEqual([`${"ʿAsr"}: On time`, "ʿAsr: In congregation", "ʿAsr: clear"].map(s => s.replace("ʿAsr", home.pName("Asr", KEY))));
  });
  it("is the same for sisters", () => {
    reset({ gender: "f" });
    A.rowTap("Asr"); A.rowTap("Asr");
    expect(status("Asr")).toBe("congregation");
  });
  it("is a cycle on what is stored, not a timed double tap (no delay: each tap writes at once)", () => {
    A.rowTap("Fajr");
    expect(status("Fajr")).toBe("ontime");
    expect(calls.commit).toBe(1);
    expect(today.tapNext(null)).toBe("ontime");
    expect(today.tapNext("ontime")).toBe("congregation");
    expect(today.tapNext("congregation")).toBe(null);
    for (const s of ["madeup", "missed", "excused"]) expect(today.tapNext(s)).toBe("sheet");
  });
  it("a tap on a Missed or Made up prayer opens its options instead of overwriting it", () => {
    store.setPrayer(S, KEY, "Dhuhr", "missed", clock.now);
    A.rowTap("Dhuhr");
    expect(status("Dhuhr")).toBe("missed");
    expect(calls.sheet.at(-1)).toContain("A.logTap('Dhuhr','madeup'");
  });
  it("Undo after every tap restores exactly what was there", () => {
    A.rowTap("Asr");
    lastToast()[1].undo();
    expect(status("Asr")).toBe(null);
    A.rowTap("Asr"); A.rowTap("Asr");
    expect(status("Asr")).toBe("congregation");
    lastToast()[1].undo();
    expect(status("Asr")).toBe("ontime");
  });
  it("the row is a button whose label says what it is and what a tap does", () => {
    const n = home.pName("Asr", KEY);
    expect(html("Asr")).toContain(`aria-label="${n}, not logged, current prayer. Tap to log it as prayed on time."`);
    A.rowTap("Asr");
    expect(html("Fajr")).toMatch(/<button type="button" class="zt-tap" data-tap="Fajr"[^>]*aria-label="Fajr, not logged\. Tap to log it as prayed on time\."/);
    expect(html("Asr")).toContain(`${n}, prayed on time. Tap again for in congregation.`);
    A.rowTap("Asr");
    expect(html("Asr")).toContain(`${n}, prayed in congregation. Tap to clear it.`);
  });
});

describe("prayers that haven't begun can't be tapped", () => {
  beforeEach(() => reset());
  it("no button, no data-tap, no ⋯; one thin line: name, time (small AM/PM), no mark and no words under it", () => {
    const h = html("Isha");
    expect(h).not.toContain("data-tap");
    expect(h).not.toContain("<button");
    expect(h).not.toContain("Begins at"); // Direction B: the time is on the right, nothing repeated
    expect(h).toMatch(/<span class="zt-tm">\d{1,2}:\d\d<small>PM<\/small><\/span>/);
    expect(h).toContain("z-later");
    expect(today.rowState(S, { p: "Isha", key: KEY }, clock.now).tap).toBe("none");
  });
  it("a tap that still reaches it logs nothing", () => {
    A.rowTap("Isha");
    expect(status("Isha")).toBe(null);
    expect(calls.commit).toBe(0);
  });
});

describe("long press and ⋯ open the options sheet", () => {
  beforeEach(() => { reset(); vi.useFakeTimers(); });
  afterEach(() => vi.useRealTimers());
  it("every begun row has a ⋯ (for keyboards and screen readers; touch uses long press) that opens it", () => {
    expect(html("Fajr")).toContain(`onclick="A.rowMore('Fajr','${KEY}')"`);
    A.rowMore("Fajr");
    const h = calls.sheet.at(-1);
    for (const k of ["congregation", "ontime", "madeup", "missed"]) expect(h).toContain(`A.logTap('Fajr','${k}'`);
  });
  it("a long press (450 ms) opens it and the click that ends the press is swallowed", () => {
    const el = { dataset: { tap: "Fajr", key: KEY } };
    pressStart(el, 10, 10);
    vi.advanceTimersByTime(LONG_MS.row - 1);
    expect(calls.sheet.length).toBe(0);
    vi.advanceTimersByTime(1);
    expect(calls.sheet.length).toBe(1);
    expect(pressClick()).toBe(false); // the click after the long press does not also log
    expect(status("Fajr")).toBe(null);
  });
  it("a short tap does not open it", () => {
    pressStart({ dataset: { tap: "Fajr", key: KEY } });
    vi.advanceTimersByTime(200); pressEnd(); vi.advanceTimersByTime(1000);
    expect(calls.sheet.length).toBe(0);
    expect(pressClick()).toBe(true);
  });
  it("Made up later only once the prayer's time has ended; the current status is marked; Clear when stored", () => {
    A.rowMore("Asr");
    expect(calls.sheet.at(-1)).not.toContain("'madeup'");
    store.setPrayer(S, KEY, "Fajr", "ontime", clock.now);
    A.rowMore("Fajr");
    const h = calls.sheet.at(-1);
    expect(h).toContain("'madeup'");
    expect(h).toMatch(/data-f="opt-ontime" aria-pressed="true"/);
    expect(h).toContain(`A.setPrayer('Fajr',null,'${KEY}')`);
  });
  it("Excused only for sisters with excused days on; on an excused day the prayer's own sheet opens", () => {
    A.rowMore("Fajr");
    expect(calls.sheet.at(-1)).not.toContain("'excused'");
    reset({ gender: "f" });
    A.rowMore("Fajr");
    expect(calls.sheet.at(-1)).toContain("A.logTap('Fajr','excused'");
    store.setExcusedDay(S, KEY, true, clock.now);
    A.rowTap("Fajr");
    expect(calls.sheet.at(-1)).toContain("A.excusedToday");
  });
});

describe("the highlighted row is the current prayer, or the next one", () => {
  beforeEach(() => reset());
  it("an open, unlogged prayer is the current row (gold dot, open ring) and the hero: Now, its time left, Qibla, Prayed, ⋯", () => {
    const f = today.todayFocus(S, clock.now);
    expect(f).toMatchObject({ kind: "now", p: "Asr", key: KEY });
    const h = html("Asr");
    expect(h).toContain('class="zt-row cur"');
    expect(h).toContain("zt-cdot");
    expect(h).toMatch(/class="z-mk\s+z-now"/);
    expect(html("Dhuhr")).not.toContain("zt-row cur");
    const hero = hero_();
    expect(hero).toContain(`>${TODAY.now}<`);
    expect(hero).toMatch(/<p class="zt-cd">\d+ h \d+ min left<\/p>/); // the countdown once, no "until 4:09"
    for (const f of ['data-f="qibla"', 'data-f="pray"', 'data-f="hmore"']) expect(hero).toContain(f);
    expect(hero).toContain("zt-arch");
  });
  it("once it is logged, the hero shows the next prayer (Next · Maghrib · Begins in …) with no Prayed button, only Qibla", () => {
    A.rowTap("Asr");
    expect(today.todayFocus(S, clock.now)).toMatchObject({ kind: "next", p: "Maghrib" });
    const h = html("Maghrib");
    expect(h).toContain("zt-row cur up");
    expect(h).not.toContain("data-tap");
    const hero = hero_();
    expect(hero).toContain(`>${TODAY.next}<`);
    expect(hero).toContain(">Maghrib<");
    expect(hero).toMatch(/Begins in \d+ h \d+ min</);
    expect(hero).not.toContain('data-f="pray"');
    expect(hero).toContain('class="zt-qb"');
  });
  it("the big Prayed button is one tap on the current prayer; ʿIshāʾ's row tap then moves it on to congregation", () => {
    A.heroPray("Asr", KEY);
    expect(status("Asr")).toBe("ontime");
    clock.now = at("Isha", 30);
    A.heroPray("Isha", KEY);
    expect(status("Isha")).toBe("ontime");
    expect(hero_()).not.toContain('data-f="pray"'); // the hero has moved on to tomorrow's Fajr
    A.rowTap("Isha", KEY);
    expect(status("Isha")).toBe("congregation");
  });
  it("between sunrise and Zuhr, the next prayer is Zuhr", () => {
    clock.now = new Date(+timesFor(DAY, S.settings).Sunrise + 60 * 60000);
    expect(today.todayFocus(S, clock.now)).toMatchObject({ kind: "next", p: "Dhuhr", key: KEY });
  });
  it("during Fajr the time left counts to sunrise (the Sunrise row shows when)", () => {
    clock.now = at("Fajr", 10);
    const t = timesFor(DAY, S.settings), left = Math.round((t.Sunrise - clock.now) / 60000);
    expect(_today.countdown(today.todayFocus(S, clock.now), clock.now)).toBe(TODAY.leftShort(TODAY.hm(Math.floor(left / 60), left % 60)));
  });
  it("ʿIshāʾ: the time left to the middle of the night with \"best before\" under it, then \"until Fajr\"", () => {
    clock.now = at("Isha", 30);
    expect(hero_()).toMatch(/<p class="zt-cd2">best before \d+:\d\d PM<\/p>/);
    clock.now = new Date(2026, 10, 20, 3, 0);
    expect(_today.countdown(today.todayFocus(S, clock.now), clock.now)).toMatch(/left · until Fajr$/);
  });
  it("ʿIshāʾ logged at 21:00: the hero is tomorrow's Fajr (\"Tomorrow 5:48 AM · begins in …\"), no Prayed button, Qibla chip", () => {
    clock.now = new Date(2026, 10, 19, 21, 0);
    A.rowTap("Isha");
    const tk = dkey(addDays(DAY, 1)), fajr = timesFor(addDays(DAY, 1), S.settings).Fajr;
    const f = today.todayFocus(S, clock.now);
    expect(f).toMatchObject({ kind: "next", p: "Fajr", key: tk, tomorrow: true });
    expect(+f.time).toBe(+fajr);
    const left = Math.round((fajr - clock.now) / 60000);
    expect(_today.countdown(f, clock.now)).toBe(TODAY.beginsTomorrow(fmt12(fajr), TODAY.hm(Math.floor(left / 60), left % 60)));
    expect(_today.countdown(f, clock.now)).toMatch(/^Tomorrow [0-9]+:[0-9][0-9] AM · begins in [0-9]+ h [0-9]+ min$/);
    const h = hero_();
    expect(h).toContain(`>${TODAY.next}<`);
    expect(h).toContain(">Fajr<");
    expect(h).not.toContain('data-f="pray"');
    expect(h).toContain('class="zt-qb"');
    expect(h).not.toContain("data-witr"); // Witr is on ʿIshāʾ's row now
    expect(_today.model(clock.now).states.some(st => st && st.hl)).toBe(false); // tomorrow's Fajr isn't on the page
  });
  it("ʿIshāʾ logged: Witr is a ring toggle on ʿIshāʾ's row (not before ʿIshāʾ is logged)", () => {
    clock.now = new Date(2026, 10, 19, 21, 0);
    expect(html("Isha")).not.toContain("data-witr");
    expect(hero_()).toContain('data-witr="1"'); // unlogged: Witr stays in the hero, as before
    A.rowTap("Isha");
    let r = html("Isha");
    expect(r).toContain(`class="zt-chip zt-wr" data-witr="1" data-key="${KEY}"`);
    expect(r).toContain('aria-pressed="false"');
    store.setWitr(S, KEY, "done", clock.now);
    r = html("Isha");
    expect(r).toContain("zt-wr d");
    expect(r).toContain('aria-pressed="true"');
  });
  it("after midnight with last night's ʿIshāʾ logged: the hero is this morning's Fajr", () => {
    const y = dkey(addDays(DAY, -1));
    clock.now = new Date(2026, 10, 19, 1, 30);
    store.setPrayer(S, y, "Isha", "ontime", clock.now);
    const f = today.todayFocus(S, clock.now);
    expect(f).toMatchObject({ kind: "next", p: "Fajr", key: KEY, tomorrow: false });
    expect(_today.countdown(f, clock.now)).toMatch(/^Begins in [0-9]+ h [0-9]+ min$/);
    expect(hero_()).not.toContain('data-f="pray"');
    expect(html("Isha", y)).toContain("data-witr"); // Witr on last night's row
  });
  it("ʿIshāʾ not logged: unchanged (current until its time ends; after midnight last night's ʿIshāʾ)", () => {
    clock.now = new Date(2026, 10, 19, 21, 0);
    expect(today.todayFocus(S, clock.now)).toMatchObject({ kind: "now", p: "Isha", key: KEY });
    expect(hero_()).toContain('data-f="pray"');
    clock.now = new Date(2026, 10, 19, 1, 30);
    expect(today.todayFocus(S, clock.now)).toMatchObject({ kind: "now", p: "Isha", key: dkey(addDays(DAY, -1)) });
  });
  it("after midnight last night's ʿIshāʾ comes first, highlighted, and can still be logged", () => {
    clock.now = new Date(2026, 10, 19, 1, 30);
    const y = dkey(addDays(DAY, -1));
    const rows = today.todayRows(S, clock.now);
    expect(rows[0]).toEqual({ p: "Isha", key: y, lastNight: true });
    expect(rows.length).toBe(7);
    expect(today.todayFocus(S, clock.now)).toMatchObject({ kind: "now", p: "Isha", key: y });
    A.rowTap("Isha", y);
    expect(status("Isha", y)).toBe("ontime");
  });
});

describe("Make up now on a missed prayer's row", () => {
  beforeEach(() => reset());
  it("a missed (or ended, unlogged) prayer of today gets it; it logs Made up with Undo", () => {
    store.setPrayer(S, KEY, "Dhuhr", "missed", clock.now);
    expect(html("Dhuhr")).toContain(`onclick="A.mkNow('Dhuhr','${KEY}')"`);
    expect(today.rowState(S, { p: "Fajr", key: KEY }, clock.now).mkNow).toBe(true); // ended, unlogged
    expect(today.rowState(S, { p: "Asr", key: KEY }, clock.now).mkNow).toBe(false); // still open
    A.mkNow("Dhuhr");
    expect(status("Dhuhr")).toBe("madeup");
    lastToast()[1].undo();
    expect(status("Dhuhr")).toBe("missed");
  });
  it("is hidden at the forbidden times, with the nudge off, on an excused day, and after Not now", () => {
    store.setPrayer(S, KEY, "Dhuhr", "missed", clock.now);
    const t = timesFor(DAY, S.settings);
    clock.now = new Date(+t.Maghrib - 10 * 60000); // sunset: no ṣalāh
    expect(html("Dhuhr")).not.toContain("A.mkNow(");
    clock.now = at("Asr", 30);
    expect(html("Dhuhr")).toContain("A.mkNow(");
    S.settings.makeupNudge = false;
    expect(html("Dhuhr")).not.toContain("A.mkNow(");
    S.settings.makeupNudge = true;
    expect(today.makeUpNowOn(S, KEY, "Dhuhr", clock.now, { dismissed: ["Dhuhr"] })).toBe(false);
    store.setExcusedDay(S, KEY, true, clock.now);
    expect(today.makeUpNowOn(S, KEY, "Dhuhr", clock.now)).toBe(false);
  });
  it("the separate Make up card is gone", () => {
    const src = readFileSync("src/views/home.js", "utf8");
    expect(src).not.toMatch(/function makeUpNowCard\(/);
  });
});

describe("the one-time hint: Tap again for congregation", () => {
  it("shows on the first tap ever, is remembered, and doesn't come back", () => {
    reset({ hintSeen: false });
    expect(today.tapHintDue(S)).toBe(true);
    A.rowTap("Asr");
    expect(S.settings.help.tips.tapAgain).toBe(true); // saved with the commit
    expect(lastToast()[1].sub).toBe(TODAY.tapHintToast); // in the toast ("Tap the tick again for congregation")
    expect(typeof lastToast()[1].undo).toBe("function");
    A.rowTap("Asr"); // congregation: the hint has done its job
    expect(lastToast()[1].sub).toBeUndefined();
    A.rowTap("Fajr");
    expect(lastToast()[1].sub).toBeUndefined();
    expect(today.tapHintDue(S)).toBe(false);
  });
});

describe("the page and its speed", () => {
  beforeEach(() => reset());
  it("below the list: two pills, Good deeds then Make-ups; no Sunnah line, no This week line", () => {
    S.qada.Fajr = 3;
    const h = _today.restHTML(clock.now, KEY, false);
    expect(h).toContain('class="zt-pills"');
    expect((h.match(/class="zt-pill"/g) || []).length).toBe(2);
    expect(h.indexOf('data-f="deeds"')).toBeGreaterThan(-1);
    expect(h.indexOf('data-f="deeds"')).toBeLessThan(h.indexOf('data-f="mkline"'));
    expect(h).not.toContain('data-f="sunnah"');
    expect(h).not.toContain(TODAY.thisWeek);
    expect(h).toContain(`${TODAY.makeups}<em>${TODAY.makeupsLeft(3, 0)}</em>`);
  });
  it("all five prayed: no line on Today any more (it lives in Progress)", () => {
    clock.now = at("Isha", 30);
    for (const p of PRAYERS) store.setPrayer(S, KEY, p, "ontime", clock.now);
    expect(_today.leadHTML(clock.now, KEY)).not.toContain("Alhamdulillah");
    expect(_today.leadHTML(clock.now, KEY)).not.toContain("zt-five");
  });
  it("the first-run guide line reads 'Tap a prayer when you've prayed it'", () => {
    expect(TODAY.guide).toBe("Tap a prayer when you've prayed it");
  });
  it("a 20 s tick inside the same prayer changes nothing but the time left (no redraw of the rows)", () => {
    const a = _today.model(clock.now);
    clock.now = new Date(+clock.now + 20000);
    const b = _today.model(clock.now);
    expect(b.sig).toBe(a.sig);
    expect(_today.countdown(b.focus, clock.now)).toMatch(/^\d+ h \d+ min left$/);
    clock.now = at("Maghrib", 1); // a boundary: Maghrib begins
    expect(_today.model(clock.now).sig).not.toBe(a.sig);
  });
  it("no Now · Today chapters and no :has() in the page's styles", () => {
    const src = readFileSync("src/views/home.js", "utf8");
    expect(src).not.toMatch(/makeChapters|todayChapter|function nowChapter/);
    expect(readFileSync("src/css/today.css", "utf8")).not.toMatch(/:has\(/);
  });
});

describe("Direction B: the header band follows the time of day", () => {
  beforeEach(() => reset());
  it("dawn from Fajr to sunrise, day to ʿAsr, afternoon to Maghrib, dusk to ʿIshāʾ, night to Fajr", () => {
    const t = timesFor(DAY, S.settings), m = 60000;
    const at_ = (d, k) => today.bandAt(new Date(+d + k * m), S.settings);
    expect(at_(t.Fajr, -1)).toBe("night");
    expect(at_(t.Fajr, 0)).toBe("dawn");
    expect(at_(t.Sunrise, -1)).toBe("dawn");
    expect(at_(t.Sunrise, 0)).toBe("day");
    expect(at_(t.Dhuhr, 30)).toBe("day");
    expect(at_(t.Asr, -1)).toBe("day");
    expect(at_(t.Asr, 0)).toBe("afternoon");
    expect(at_(t.Maghrib, 0)).toBe("dusk");
    expect(at_(t.Isha, -1)).toBe("dusk");
    expect(at_(t.Isha, 0)).toBe("night");
    expect(today.bandAt(new Date(2026, 10, 19, 23, 59), S.settings)).toBe("night");
    expect(today.BANDS).toEqual(["dawn", "day", "afternoon", "dusk", "night"]);
  });
  it("the band is part of the page's signature, so the 20 s tick switches it at the boundary (and only then)", () => {
    const t = timesFor(DAY, S.settings);
    clock.now = new Date(+t.Maghrib - 30000);
    const a = _today.model(clock.now);
    expect(a.band).toBe("afternoon");
    clock.now = new Date(+t.Maghrib + 1000);
    const b = _today.model(clock.now);
    expect(b.band).toBe("dusk");
    expect(b.sig).not.toBe(a.sig);
  });
  it("is static CSS: five palettes, light and dark, no animation, no :has()", () => {
    // the band's tokens moved to css/band.css (19 Nov 2026: every page header uses the same tint); <html data-band>
    const band = readFileSync("src/css/band.css", "utf8");
    for (const b of ["dawn", "afternoon", "dusk", "night"]) {
      expect(band).toContain(`:root[data-band=${b}] .zb{`);
      expect(band).toContain(`:root[data-theme=dark][data-band=${b}] .zb{`);
    }
    expect(band).toContain(":root[data-band=night] .zb{--ba:#0F3D2E"); // the night band: the deep green
    expect(band.replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(/animation|transition|@keyframes|:has\(/);
    const css = readFileSync("src/css/today.css", "utf8");
    const block = css.slice(css.indexOf("/* ---------- Today: one page, Direction B"), css.indexOf("/* status marks in sheets"));
    expect(block.replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(/animation|transition|@keyframes/);
  });
});

describe("Direction B: the hero and the rows", () => {
  beforeEach(() => reset());
  it("the sunnah toggle reads \"Sunnah · 4 before\" on its own; ʿIshāʾ lists 4 before · 2 after · Witr (never wājib)", () => {
    expect(hero_()).toMatch(/Sunnah · <b>4<\/b> before/);
    clock.now = at("Isha", 30);
    const h = hero_();
    expect(h).toContain("<b>4</b> before");
    expect(h).toContain("<b>2</b> after");
    expect(h).toContain('data-witr="1"');
    expect(h).toContain("<b>Witr</b>");
    expect(h.toLowerCase()).not.toMatch(/w[aā]jib/);
  });
  it("no status words under the names and no \"Begins at\" anywhere in the list", () => {
    store.setPrayer(S, KEY, "Fajr", "congregation", clock.now);
    const m = _today.model(clock.now);
    const all = m.rows.map((r, i) => (m.states[i] ? _today.rowHTML(m.states[i], clock.now) : "")).join("");
    expect(all).not.toMatch(/<small>(In congregation|On time|Not logged|Begins at)/);
    expect(all).not.toContain("Begins at");
  });
  it("Make up now only on a missed row", () => {
    store.setPrayer(S, KEY, "Dhuhr", "missed", clock.now);
    const m = _today.model(clock.now);
    const rows = m.rows.map((r, i) => (m.states[i] ? [r.p, _today.rowHTML(m.states[i], clock.now)] : null)).filter(Boolean);
    for (const [p, h] of rows) expect(h.includes("A.mkNow(")).toBe(p === "Dhuhr" || p === "Fajr"); // Fajr ended unlogged
  });
  it("an excused day: the hero offers remembrance at prayer time instead of Prayed; the band line is above the list", () => {
    reset({ gender: "f" });
    store.setExcusedDay(S, KEY, true, clock.now);
    const h = hero_();
    expect(h).toContain('data-f="remember"');
    expect(h).not.toContain('data-f="pray"');
    expect(_today.leadHTML(clock.now, KEY)).toContain("zt-band");
    expect(_today.restHTML(clock.now, KEY, false)).not.toContain('data-f="mkline"'); // make-ups aren't prayed on an excused day
  });
  it("prayers-only mode: no pills at all", () => {
    for (const f of ["sunnah", "deeds", "makeups", "week", "progress", "tools"]) S.settings.features[f] = false;
    S.qada.Fajr = 3;
    const h = _today.restHTML(clock.now, KEY, true);
    expect(h).not.toContain("zt-pill");
    expect(hero_()).not.toContain("zt-chip"); // no sunnah toggles with Sunnah off
  });
  it("the top row: the greeting, then the date · Hijri date", () => {
    S.profile.name = "Raheem";
    const h = _today.topBar(clock.now);
    // the name on its own second line, under "As-salāmu ʿalaykum,"; read out as one line
    expect(h).toContain(`<b class="zt-hi two"><span class="zt-hi1">As-salāmu ʿalaykum,</span> <span class="zt-hin">Raheem</span></b>`);
    expect(h.replace(/<[^>]+>/g, "")).toContain("As-salāmu ʿalaykum, Raheem");
    // the date · Hijri line is no longer in the band: it heads the prayer list, right above Fajr
    expect(h).not.toContain("zt-date");
    expect(_today.leadHTML(clock.now, KEY)).toMatch(/<p class="zt-date zt-ldate">Thu 19 November · \d+ [A-Za-z' -]+ 14\d\d<\/p>$/);
  });
  it("without a name: the greeting alone, on one line", () => {
    S.profile.name = "  ";
    const h = _today.topBar(clock.now);
    expect(h).toContain(`<b class="zt-hi">As-salāmu ʿalaykum</b>`);
    expect(h).not.toContain("zt-hin");
  });
  it("the name line is larger and heavier than the greeting line (css/today.css)", () => {
    const css = readFileSync("src/css/today.css", "utf8");
    const rule = sel => css.slice(css.indexOf(`.zt-head .${sel}{`)).split("}")[0];
    const px = sel => +rule(sel).match(/font-size:([\d.]+)px/)[1];
    const wt = sel => +rule(sel).match(/font-weight:(\d+)/)[1];
    expect(px("zt-hin")).toBeGreaterThan(px("zt-hi1"));
    expect(wt("zt-hin")).toBeGreaterThan(wt("zt-hi1"));
    expect(css).toContain(".zt-head b.zt-hi.two{display:flex;flex-direction:column");
  });
});
