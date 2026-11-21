// 20 Nov 2026, three approved changes:
// 1. Read → For today, layout C: only the readings chosen as daily deeds, as Now (in full) · Later today · n · Done · n
//    (each one line that opens on a tap), with the excused-day rules and an empty state that opens Choose daily deeds.
// 2. The This week card, layout A: one slim card at the top of For today ("New" from Sunday until opened), whose sheet
//    has This week and This month; it follows the "This week" readings switch.
// 3. Settings, consolidated: about ten rows on one screen, each opening a page; every earlier setting still reachable;
//    "Carry Qurʾān position forward" always on; Support merged into the one feedback row.
import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import * as store from "../src/store.js";
import { timesFor } from "../src/times.js";

const S = store.defaultState(new Date(2026, 10, 1));
S.profile.onboarded = true;
S.profile.name = "Raheem";
S.createdKey = "2026-11-01";
S.settings.location = { lat: 41.88, lng: -87.63, label: "Chicago, IL", source: "gps" }; // the test machine's time zone
const TUE = new Date(2026, 10, 17), K = "2026-11-17";
const at = (p, min = 20, d = TUE) => new Date(+timesFor(d, S.settings)[p] + min * 60000);
const clock = { now: at("Asr") };
const UI = { view: "tools" };
const A = {};
const renders = [];
const root = { innerHTML: "" }, screen = { scrollTop: 0 };
const sheets = [];
const env = { plat: "web", native: false };
vi.mock("../src/app.js", () => ({
  S, UI, A, $: sel => (sel === "#v-settings" ? root : sel === "#screen" ? screen : null), $$: () => [], NOW: () => clock.now, todayKey: () => K,
  onRender: fn => renders.push(fn), onCommit() {}, commit() {}, render() {}, go() {}, toast() {}, touched() {}, revision: () => 1, avatarBtn: () => "",
  glossBtn: () => "", openSheet: h => sheets.push(h), closeSheet() {}, replaceState() {}, systemIsDark: () => false,
}));
vi.mock("../src/platform.js", () => ({
  isNative: () => env.native, pageUrl: p => p, currentPosition() {}, cityName() {}, searchCity() {}, saveFile() {}, pickFile() {},
  biometryAvailable: async () => true, authenticate: async () => true, requestNotifications: async () => true,
}));
vi.mock("../src/cloud.js", () => ({
  cloud: { available: true, user: null, lastSync: 0 }, signIn() {}, signOut: async () => {}, sync: async () => {}, deleteAccount() {}, keepAccount() {},
  hijriEditors: {}, refreshHijriCommittee: async () => false, saveCommitteeMonth() {}, agreeConsent() {},
}));
vi.mock("../src/notify.js", () => ({ reschedule() {}, askForExactAlarms: async () => true, exactAlarmStatus: async () => true }));
vi.mock("../src/widget-bridge.js", () => ({ refreshWidgets: async () => {}, addTile: async () => null }));
vi.mock("../src/crash.js", () => ({ setCrashReporting() {} }));
vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: () => env.plat, isNativePlatform: () => env.native } }));
globalThis.addEventListener ||= () => {};
globalThis.document ||= { addEventListener() {}, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], documentElement: { dataset: {} } };
const mem = {};
globalThis.localStorage ||= { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };

const { _chapters: R, _grp, weekIsNew, weekItemKey, weekSheet, WEEK_ITEMS } = await import("../src/views/read.js");
const { todayGroups, readWhen, setReadDone } = await import("../src/reading.js");
const { READ, SETTINGS, SETTINGS_X, GUIDE } = await import("../src/strings.js");
const { cloud } = await import("../src/cloud.js");
const F = await import("../src/features.js");
await import("../src/views/settings.js");
await import("../src/views/help.js");
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const ids = list => list.map(i => i.id);

beforeEach(() => {
  S.tools = {}; delete S.days[K]; delete S.settings.dailyDeeds; clock.now = at("Asr");
  _grp.later = _grp.done = false; S.settings.features = { ...S.settings.features, week: true, tools: true };
  S.settings.hiddenTools = [];
});

describe("Read → For today, layout C: only the daily readings", () => {
  it("shows only what was chosen in Choose daily deeds (settings.dailyDeeds); nothing else", () => {
    S.settings.dailyDeeds = ["evening", "yasinPm", "sadaqah"];
    const g = todayGroups(S, clock.now);
    expect(g.of).toBe(2);
    expect(ids([...g.now, ...g.later, ...g.done]).sort()).toEqual(["evening", "yasinPm"]);
    const h = R.today(clock.now);
    expect(h).toContain(esc(READ.item.evening));
    expect(h).toContain(esc(READ.item.yasinPm));
    for (const id of ["morning", "quran", "hizb", "mulk", "manzil", "durud"]) expect(h).not.toContain(`A.readTick('${id}')`);
    expect(h).toContain(READ.doneOf(0, 2));
  });
  it("the default choice is the deeds list's reading deeds (as the Good deeds sheet counts them)", () => {
    expect(ids(todayGroups(S, clock.now).now)).toEqual(["evening", "quran", "durud"]); // Salawāt on the list: Durūd / Salawāt
  });
  it("groups: Now (due now, in full) · Later today (the rest still to do) · Done", () => {
    S.settings.dailyDeeds = ["morning", "evening", "quran", "mulk", "yasinAm", "yasinPm"];
    setReadDone(S, "quran", true, clock.now);
    const g = todayGroups(S, clock.now);
    expect(ids(g.now)).toEqual(["evening", "yasinPm"]); // ʿAsr: the evening's window is open
    expect(ids(g.later)).toEqual(["mulk", "morning", "yasinAm"]); // al-Mulk from ʿIshāʾ; then the morning's, its window past
    expect(ids(g.done)).toEqual(["quran"]);
    expect(g.now[0].now).toBe(true); // one gold dot, on the first due now
    expect([...g.now.slice(1), ...g.later, ...g.done].some(i => i.now)).toBe(false);
  });
  it("the windows: morning before Fajr is later, after ʿAsr past; al-Mulk is now from ʿIshāʾ", () => {
    const st = S.settings;
    expect(readWhen("morning", at("Fajr", -30), st)).toBe("later");
    expect(readWhen("morning", at("Fajr"), st)).toBe("now");
    expect(readWhen("morning", at("Asr"), st)).toBe("past");
    expect(readWhen("evening", at("Dhuhr"), st)).toBe("later");
    expect(readWhen("evening", at("Isha"), st)).toBe("now");
    expect(readWhen("mulk", at("Maghrib"), st)).toBe("later");
    expect(readWhen("mulk", at("Isha"), st)).toBe("now");
    expect(readWhen("quran", at("Dhuhr"), st)).toBe("now");
  });
  it("Later today and Done are one collapsed line each; a tap opens the list (ticks still work there)", () => {
    S.settings.dailyDeeds = ["morning", "evening", "quran", "mulk"];
    setReadDone(S, "quran", true, clock.now);
    let h = R.today(clock.now);
    expect(h).toContain(esc(READ.laterHead(2)));
    expect(h).toContain(esc(READ.doneHead(1)));
    expect(h).toMatch(/aria-expanded="false" aria-controls="rd-g-later" onclick="A\.readGrp\('later'\)"/);
    // collapsed: the lists are drawn but hidden (a tap only shows them, no redraw)
    expect(h).toMatch(/<div class="rd-gl" id="rd-g-later" hidden>[^]*A\.readTick\('mulk'\)/);
    expect(h).toMatch(/<div class="rd-gl" id="rd-g-done" hidden>[^]*A\.readTick\('quran'\)/);
    expect(h.slice(0, h.indexOf("rd-more"))).not.toContain("A.readTick('mulk')");
    _grp.later = true; _grp.done = true;
    h = R.today(clock.now);
    expect(h).toMatch(/aria-expanded="true" aria-controls="rd-g-later"/);
    expect(h).toContain('<div class="rd-gl" id="rd-g-later">');
    expect(h).toContain("A.readTick('mulk')");
    expect(h).toMatch(/data-f="t-quran" role="checkbox" aria-checked="true"[^>]*onclick="A\.readTick\('quran'\)"/); // untick
  });
  it("leaving Read closes the groups again", () => {
    _grp.later = _grp.done = true;
    UI.view = "home"; for (const r of renders) r();
    expect(_grp).toEqual({ later: false, done: false });
    UI.view = "tools";
  });
  it("an excused day: Listen instead of recitation; Mulk, Kahf, Manzil and Yā-Sīn left off", () => {
    S.settings.dailyDeeds = ["evening", "quran", "mulk", "yasinPm", "manzil", "kahf"];
    store.ensureDay(S, K).excused = true;
    S.amalList.push({ id: "listen", name: "Listen", builtin: true, detail: "none" });
    try {
      const g = todayGroups(S, clock.now), all = ids([...g.now, ...g.later, ...g.done]);
      expect(all).not.toContain("quran");
      for (const id of ["mulk", "yasinPm", "manzil", "kahf"]) expect(all).not.toContain(id);
      expect(R.today(clock.now)).toContain(esc(READ.excusedNote));
    } finally { S.amalList.pop(); }
  });
  it("nothing chosen: a short note and Choose your daily readings (the Good deeds sheet's Choose daily deeds)", () => {
    S.settings.dailyDeeds = ["sadaqah"];
    const h = R.today(clock.now);
    expect(h).toContain("Everything else stays in the Qurʾān and Adhkār chapters.");
    expect(h).toMatch(/onclick="A\.dailyChoose\(\)">Choose your daily readings</);
    expect(h).not.toContain("rd-now");
  });
  it("Qurʾān goal progress stays on the recitation row; Durūd / Salawāt stays one row", () => {
    S.settings.dailyDeeds = ["quran", "durud"];
    S.settings.quranGoal = { type: "pages", n: 5, per: "day" };
    try {
      const h = R.today(clock.now);
      expect(h).toContain("qg-row");
      expect(h.match(/A\.readTick\('durud'\)/g)).toHaveLength(1);
    } finally { delete S.settings.quranGoal; }
  });
});

describe("This week, layout A: one slim card at the top of For today", () => {
  const SUN = new Date(2026, 10, 15, 10), SAT = new Date(2026, 10, 21, 10), NEXT = new Date(2026, 10, 22, 10);
  it("sits at the top; the old block at the bottom is gone", () => {
    const h = R.today(clock.now);
    expect(h.indexOf("rd-wk")).toBeGreaterThan(-1);
    expect(h.indexOf("rd-wk")).toBeLessThan(h.indexOf("zt-chh"));
    expect(h).not.toContain("rd-week");
    expect(fs.readFileSync("src/views/read.js", "utf8")).not.toContain("A.weekTiles");
  });
  it("New from Sunday until its sheet is opened that week", () => {
    const wk = "2026-11-15";
    expect(weekIsNew(wk, {})).toBe(true);
    expect(weekIsNew(wk, { [`${wk}wk`]: 1 })).toBe(false);
    expect(weekIsNew("2026-11-22", { [`${wk}wk`]: 1 })).toBe(true); // the next Sunday: new again
    clock.now = SUN;
    expect(R.today(SUN)).toContain('class="rd-new"');
    weekSheet(SUN); // opening the sheet
    expect(R.today(SAT)).not.toContain('class="rd-new"');
    expect(R.today(NEXT)).toContain('class="rd-new"');
  });
  it("the sheet: This week (āyah, hadīth, duʿāʾ, sīrah) and This month (Sahābī, sunnah), each opening its reading", () => {
    const h = weekSheet(SAT);
    expect(WEEK_ITEMS).toEqual({ week: ["ayah", "hadith", "dua", "seerah"], month: ["sahabi", "sunnah"] });
    const iw = h.indexOf(`<h4 class="rd-wsh">${READ.thisWeek}</h4>`), im = h.indexOf(`<h4 class="rd-wsh">${READ.thisMonth}</h4>`);
    expect(iw).toBeGreaterThan(-1);
    expect(im).toBeGreaterThan(iw);
    for (const id of WEEK_ITEMS.week) { const i = h.indexOf(`A.weekItem('${id}')`); expect(i).toBeGreaterThan(iw); expect(i).toBeLessThan(im); }
    for (const id of WEEK_ITEMS.month) expect(h.indexOf(`A.weekItem('${id}')`)).toBeGreaterThan(im);
  });
  it("an item's dot uses Home's opened keys (week, month, the Sahābī's day)", () => {
    expect(weekItemKey("ayah", SAT, "2026-11-15")).toBe("2026-11-15ayah");
    expect(weekItemKey("sunnah", SAT, "2026-11-15")).toBe("2026-10sunnah");
    expect(weekItemKey("sahabi", SAT, "2026-11-15")).toBe("2026-10-21sahabi");
  });
  it("follows the This week readings switch", () => {
    F.setFeature(S, "week", false);
    expect(R.today(clock.now)).not.toContain("rd-wk");
    F.setFeature(S, "week", true);
    expect(R.today(clock.now)).toContain("rd-wk");
  });
});

describe("Settings, consolidated", () => {
  const page = p => { UI.view = "settings"; A.settingsPage(p); return root.innerHTML; };
  const MAIN_ROWS = ["you", "plus", "times", "tracking", "reminders", "shows", "appearance", "help", "data", "about"];
  it("the main page: the profile card and nine rows, each opening its page with a summary", () => {
    const h = page("main");
    const opens = [...h.matchAll(/onclick="(A\.settingsPage\('(\w+)'\)|A\.helpOpen\(\))"/g)].map(m => m[2] || "help");
    expect(opens).toEqual(MAIN_ROWS);
    expect(h).toContain(">Chicago · Hanafī<"); // Prayer times
    expect(h).toMatch(/Reminders &amp; widgets<\/b><\/span><span class="val">\d+ on</);
    expect(h).toContain(`${esc(SETTINGS_X.pages.shows)}</b></span><span class="val">7 of 7`);
    expect(h).not.toContain("switch"); // no switches on the main page
    expect(page("reminders")).not.toContain("newtag"); // the NEW badge on the make-up nudge is gone
  });
  it("each group page has \"‹ Settings\" in the band; Features and Sunnah go back to their group", () => {
    for (const p of ["you", "times", "tracking", "reminders", "shows", "data", "about", "appearance"]) expect(page(p)).toContain(`${SETTINGS.title}`);
    page("features"); A.settingsBack(); expect(root.innerHTML).toContain("A.settingsPage('features')"); // back on What Zad shows
    page("sunnah"); A.settingsBack(); expect(root.innerHTML).toContain("A.settingsPage('sunnah')"); // back on Prayers & tracking
    expect(page("features")).toContain(esc(SETTINGS_X.pages.shows)); // its back label
  });
  it("every earlier setting is still reachable from a page", () => {
    env.plat = "android"; env.native = true; cloud.user = { email: "a@b.c", uid: "u1" };
    S.settings.features = { ...S.settings.features, makeups: true, deeds: true, sunnah: true };
    try {
      const all = ["main", "you", "times", "tracking", "reminders", "shows", "data", "about", "features", "help", "appearance", "sunnah"].map(page).join("\n");
      const need = [
        "A.nameSheet()", "A.genderSheet()", "A.cloudSheet()", "A.cloudSignOut()", "A.settingsPage('plus')",
        "A.locationSheet()", 'key: "autoLocation"', "A.methodSheet()", "A.madhhabSheet()", "A.hijriSheet()", "A.openQibla()",
        "A.settingsPage('sunnah')", "A.excusedCal()", "A.goalSheet()", "A.dailyChoose()", "A.amalListSheet()",
        "A.widgetToggle('showTimesOnly')", "A.widgetToggle('ongoingNow')", "A.addTile()",
        "A.settingsPage('features')", "A.featToggle('week')", "A.qgSet()", "A.setAppearance(",
        "A.helpReplay()", "A.feedback()", "A.exportCsv()", "A.backup()", "A.restore()", "privacy.html", "terms.html",
        "A.resetSheet()", "A.deleteSheet()", "release-notes.html", "A.crashToggle()",
      ].filter(x => !x.startsWith("key:"));
      for (const x of need) expect(all, x).toContain(x);
      for (const k of ["autoLocation", "jumuah", "preQada", "makeupNudge", "prayerAlerts", "evening", "seerahNotify", "excusedDays", "lock"]) expect(all, k).toContain(`A.toggle('${k}')`);
      env.plat = "ios";
      expect(page("reminders")).toContain("A.widgetToggle('lockDots')");
      // ʿAsr on its own: in the Madhhab & ʿAsr sheet
      sheets.length = 0; A.madhhabSheet();
      expect(sheets.pop()).toMatch(/A\.pickAsr\('shafi'\)[\s\S]*A\.pickAsr\('hanafi'\)/);
      // signed out: Sign in, and the page about deleting an account
      cloud.user = null;
      expect(page("you")).toContain(esc(SETTINGS_X.signIn));
      expect(page("data")).toContain("delete-account.html");
    } finally { env.plat = "web"; env.native = false; cloud.user = null; }
  });
  it("Madhhab & ʿAsr is one row on Prayer times (the madhhab sets ʿAsr)", () => {
    const h = page("times");
    expect(h).toContain(esc(SETTINGS_X.madhhabAsr));
    expect(h).not.toContain("A.asrSheet()");
    store.setMadhhab(S, "shafii");
    expect(S.settings.asr).toBe("shafi");
    store.setMadhhab(S, "hanafi");
  });
  it("Carry Qurʾān position forward is gone and always on (older saves migrate to true)", () => {
    const all = ["main", "you", "times", "tracking", "reminders", "shows", "data", "about", "features"].map(page).join("");
    expect(all).not.toContain(esc(SETTINGS.carryQuran));
    expect(fs.readFileSync("src/views/settings.js", "utf8")).not.toContain("carryQuran");
    expect(store.normalize({ settings: { carryQuran: false }, profile: { onboarded: true } }).settings.carryQuran).toBe(true);
  });
  it("one Send feedback / Report a mistake row: Support merged into it", () => {
    const help = page("help"), all = ["main", "about", "data", "help"].map(page).join("");
    expect(help).toContain(esc(SETTINGS.feedbackRow));
    expect(help).toContain(esc(SETTINGS_X.feedbackSub));
    expect(all.match(/onclick="A\.feedback\(\)"/g)).toHaveLength(1);
    expect(all).not.toContain("support.html");
    expect(help).toContain(esc(GUIDE.helpTitle));
  });
});
