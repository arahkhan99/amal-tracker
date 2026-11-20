// 19 Nov 2026 round (part A): Now moves on after logging, the all-five moment, the Good deeds line (always, above
// Make-ups), the nafl add-on counted once, the Sunnah line, tab reset with deep links, the Settings rows (feedback,
// Qibla, the Friday sīrah switch) and the location sheet (current location first, a city as the fallback).
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import * as store from "../src/store.js";
import { timesFor } from "../src/times.js";
import { dkey, addDays, PRAYERS } from "../src/util.js";
import { nowFocus, allFiveMoment, deedsLine, sunnahLine, naflShown, naflTimes } from "../src/today.js";
import { dayProvisions } from "../src/points.js";
import { NAFL_ADDON, NAFL_ADDON_IDS } from "../src/rules/madhhab.js";
import { tabOf, tabToReset, viewsOfTab, landing, resolveView, OVER_PAGES } from "../src/routes.js";
import { planNotifications } from "../src/notify.js";
import { locationSummary } from "../src/travel.js";

const DAY = new Date(2026, 10, 19, 12, 0);
const KEY = dkey(DAY);
const fresh = () => {
  const S = store.defaultState(DAY);
  S.createdKey = "2026-11-01";
  S.profile.onboarded = true;
  S.settings.location = { lat: 41.88, lng: -87.63, label: "Chicago", source: "city" };
  return S;
};
const at = (S, p, mins = 20, d = DAY) => new Date(+timesFor(d, S.settings)[p] + mins * 60000);
const src = f => readFileSync(f, "utf8").replace(/\r\n/g, "\n");

describe("Now moves on to the next prayer after logging", () => {
  it("an open, unlogged prayer shows its buttons (kind open)", () => {
    const S = fresh(), now = at(S, "Asr");
    expect(nowFocus(S, now)).toMatchObject({ kind: "open", p: "Asr", key: KEY });
  });
  it("once ʿAsr is logged, Now shows Maghrib (not begun: no buttons) and no 'ʿAsr ✓ Change'", () => {
    const S = fresh(), now = at(S, "Asr");
    store.setPrayer(S, KEY, "Asr", "ontime", now);
    const f = nowFocus(S, now);
    expect(f).toMatchObject({ kind: "next", p: "Maghrib", key: KEY, tomorrow: false, after: "Asr" });
    expect(+f.time).toBe(+timesFor(DAY, S.settings).Maghrib);
    const home = src("src/views/home.js");
    expect(home).not.toMatch(/function (loggedCard|nowChapter|openCard|nextCard)\(/); // no Now chapter any more (merged Today)
  });
  it("after ʿIshāʾ is logged, the next prayer is tomorrow's Fajr", () => {
    const S = fresh(), now = at(S, "Isha", 30);
    store.setPrayer(S, KEY, "Isha", "congregation", now);
    const f = nowFocus(S, now);
    expect(f).toMatchObject({ kind: "next", p: "Fajr", tomorrow: true, key: dkey(addDays(DAY, 1)) });
  });
  it("after midnight, a logged ʿIshāʾ (last night's) points to this morning's Fajr", () => {
    const S = fresh(), y = dkey(addDays(DAY, -1));
    const now = new Date(+timesFor(DAY, S.settings).Fajr - 60 * 60000);
    store.setPrayer(S, y, "Isha", "ontime", now);
    expect(nowFocus(S, now)).toMatchObject({ kind: "next", p: "Fajr", tomorrow: false, key: KEY });
  });
});

describe("all five prayed (M6)", () => {
  it("shows once the fifth fard is logged, with the run of days", () => {
    const S = fresh(), now = at(S, "Isha", 30), y = dkey(addDays(DAY, -1));
    for (const p of PRAYERS) store.setPrayer(S, y, p, "ontime", now);
    for (const p of PRAYERS.slice(0, 4)) store.setPrayer(S, KEY, p, "ontime", now);
    expect(allFiveMoment(S, now)).toBe(null);
    store.setPrayer(S, KEY, "Isha", "ontime", now);
    expect(allFiveMoment(S, now)).toEqual({ key: KEY, streak: 2 });
  });
  it("is not shown on an excused day", () => {
    const S = fresh(), now = at(S, "Isha", 30);
    for (const p of PRAYERS) store.setPrayer(S, KEY, p, "ontime", now);
    store.setExcusedDay(S, KEY, true, now);
    expect(allFiveMoment(S, now)).toBe(null);
  });
});

describe("Good deeds pill on Today (19 Nov 2026: only the daily deeds)", () => {
  it("shows whenever the feature is on; empty when no daily deed is chosen", () => {
    const S = fresh();
    S.settings.dailyDeeds = [];
    expect(deedsLine(S, KEY, DAY)).toMatchObject({ done: 0, of: 0, empty: true });
    S.settings.features.deeds = false;
    expect(deedsLine(S, KEY, DAY)).toBe(null);
  });
  it("counts the deeds list by default (readings in Read included, merged Durūd / Salawāt once), nafl only when chosen", () => {
    const S = fresh();
    const ids = store.dailyIds(S);
    expect(ids).toEqual(["quran", "morning", "evening", "durud", "sadaqah"]);
    expect(deedsLine(S, KEY, DAY)).toMatchObject({ done: 0, of: 5 });
    store.setSunnah(S, KEY, "duha", true, DAY); // shown in the sheet, not chosen: an extra
    store.setAmal(S, KEY, "sadaqah", true, "");
    expect(deedsLine(S, KEY, DAY)).toMatchObject({ done: 1, of: 5 });
    S.settings.dailyDeeds = [...ids, "duha"];
    expect(deedsLine(S, KEY, DAY)).toMatchObject({ done: 2, of: 6 });
  });
  it("is a pill above (before) the Make-ups pill and opens the deeds sheet, which offers Add a good deed", () => {
    const home = src("src/views/home.js");
    const body = home.slice(home.indexOf("function restHTML("), home.indexOf("/* \"Welcome, {name}\""));
    expect(body).toMatch(/const dl = deedsLine\(S, key, now\);\n\s*if \(dl\) pills\.push/);
    expect(body.indexOf('"deeds"))')).toBeGreaterThan(-1);
    expect(body.indexOf('"deeds"))')).toBeLessThan(body.indexOf('"mkline"'));
    expect(body).toMatch(/A\.deedsSheet\('\$\{key\}'\)/);
    expect(home).toMatch(/onclick="A\.addAmal\('\$\{key\}','\$\{back\}'\)"/);
    expect(home).toMatch(/<option value="count">/);
    // the Settings editor gets the type too
    expect(src("src/views/settings.js")).toMatch(/id="edType"/);
  });
});

describe("the nafl add-on (Ishrāq, Duhā, Awwābīn, Tahajjud)", () => {
  it("reuses the existing sunnah items, so a tick and a chip are one log", () => {
    expect(NAFL_ADDON.map(x => x.key)).toEqual(["ishraq", "duha", "awwabin", "tahajjud"]);
    expect(NAFL_ADDON_IDS).toEqual(["ishraq", "duha", "maghrib-awwabin", "tahajjud"]);
    const S = fresh();
    S.settings.madhhab = "shafii"; // Awwābīn is still found (itemById looks across madhhabs)
    expect(naflShown(S).map(x => x.item.id)).toEqual(NAFL_ADDON_IDS);
  });
  it("each counts once, as a good deed (not also as sunnah)", () => {
    const S = fresh(), now = at(S, "Maghrib", 30);
    store.setPrayer(S, KEY, "Maghrib", "ontime", now);
    for (const id of NAFL_ADDON_IDS) expect(store.setSunnah(S, KEY, id, true, now)).toBe(true);
    store.setSunnah(S, KEY, "maghrib-a2", true, now);
    store.setAmal(S, KEY, "sadaqah", true, "");
    const r = dayProvisions(S.days[KEY]);
    expect(r.parts.find(p => p.kind === "sunnah")).toMatchObject({ count: 1, n: 1 });
    expect(r.parts.find(p => p.kind === "deeds")).toMatchObject({ count: 5, n: 5, nafl: NAFL_ADDON_IDS });
    // ticking again (the sheet and a chip write the same place) changes nothing
    store.setSunnah(S, KEY, "duha", true, now);
    expect(dayProvisions(S.days[KEY]).total).toBe(r.total);
  });
  it("Awwābīn after a missed Maghrib is refused, like its chip", () => {
    const S = fresh(), now = at(S, "Isha");
    store.setPrayer(S, KEY, "Maghrib", "missed", now);
    expect(store.setSunnah(S, KEY, "maghrib-awwabin", true, now)).toBe(false);
  });
  it("timing guidance uses today's real times", () => {
    const S = fresh(), t = timesFor(DAY, S.settings), tm = naflTimes(KEY, S.settings, DAY);
    expect(+tm.ishraq).toBe(+t.Sunrise + 15 * 60000);
    expect(+tm.duha).toBe(+t.Dhuhr - 10 * 60000);
    expect(+tm.awwabin).toBe(+t.Maghrib);
    expect(+tm.tahajjud).toBe(+timesFor(addDays(DAY, 1), S.settings).Fajr); // after today's Fajr: the coming night
  });
  it("none on an excused day (not in the sheet or the count)", () => {
    const S = fresh();
    store.setExcusedDay(S, KEY, true, DAY);
    expect(naflShown(S, KEY)).toEqual([]);
    S.settings.dailyDeeds = ["sadaqah", "ishraq", "duha"];
    expect(deedsLine(S, KEY, DAY).of).toBe(2); // sadaqah, and Duʿāʾ & istighfār on an excused day; no nafl
  });
  it("the user chooses which show (settings.naflShow; old saves get all four)", () => {
    const S = fresh();
    S.settings.naflShow = ["ishraq", "duha"];
    expect(naflShown(S).map(x => x.key)).toEqual(["ishraq", "duha"]);
    const old = store.normalize({ settings: {}, profile: { onboarded: true } });
    expect(old.settings.naflShow).toEqual(["ishraq", "duha", "awwabin", "tahajjud"]);
  });
});

describe("Sunnah line (M7)", () => {
  it("rakʿahs of the measure and Witr, only with the Sunnah feature on", () => {
    const S = fresh(), now = at(S, "Isha", 30);
    store.setPrayer(S, KEY, "Fajr", "ontime", now);
    store.setSunnah(S, KEY, "fajr-b2", true, now);
    store.setWitr(S, KEY, "done", now);
    expect(sunnahLine(S, KEY)).toMatchObject({ kind: "rakahs", got: 2, of: 12, witr: "done" });
    S.settings.features.sunnah = false;
    expect(sunnahLine(S, KEY)).toBe(null);
  });
});

describe("leaving a tab resets it; deep links still land", () => {
  it("only the tab being left is reset; pages over a tab leave it alone", () => {
    expect(tabToReset("home", "tools")).toBe("home");
    expect(tabToReset("tools", "progress")).toBe("tools");
    expect(tabToReset("home", "calendar")).toBe(null); // the calendar is part of Today
    expect(tabToReset("progress", "qada")).toBe(null);
    for (const v of OVER_PAGES) { expect(tabOf(v)).toBe(null); expect(tabToReset("home", v)).toBe(null); }
    expect(tabToReset("", "home")).toBe(null);
    expect(viewsOfTab("home")).toEqual(["home", "calendar"]);
    expect(viewsOfTab("progress")).toEqual(["progress", "qada"]);
  });
  it("go() resets before applying a deep link's chapter, so #makeups and the Provisions chip still land", () => {
    const app = src("src/app.js");
    const go = app.slice(app.indexOf("export function go("), app.indexOf("A.go = go;"));
    expect(go.indexOf("tabToReset(UI.lastTab, v)")).toBeGreaterThan(-1);
    expect(go.indexOf("tabToReset(UI.lastTab, v)")).toBeLessThan(go.indexOf("UI.progressCh = land.chapter"));
    const S = fresh();
    expect(landing(resolveView("makeups"), S)).toEqual({ view: "progress", chapter: "makeups" });
    // the Provisions chip and A.readChapter set their chapter before go(): the arriving tab is never reset
    expect(src("src/views/provisions.js")).toMatch(/UI\.progressCh = "provisions";[^\n]*\n\s*go\("progress"\)/);
  });
  it("tapping the tab you are on goes back to its first chapter at the top (Today, Read, Progress share it)", () => {
    const app = src("src/app.js");
    const tab = app.slice(app.indexOf("A.tab = id =>"), app.indexOf("export function go("));
    expect(tab).toMatch(/if \(tabOf\(UI\.view\) !== id\) \{ go\(to\); return; \}/);
    expect(tab).toMatch(/resetTab\(id, true\)/);
    const ch = src("src/views/chapters.js");
    expect(ch).toMatch(/export function resetChapters\(/);
    expect(ch).toMatch(/ALL\.add\(/); // every makeChapters frame (Today, Read, Progress) registers itself
    expect(ch.slice(ch.indexOf("function reset("), ch.indexOf("function reset(") + 600)).toMatch(/set\(ids\[0\]\)/);
  });
});

describe("Settings: feedback, Qibla, the Friday sīrah switch, location", () => {
  const set = src("src/views/settings.js");
  it("has a direct Send feedback / Report a mistake row and a Qibla finder row", () => {
    const about = set.slice(set.indexOf("T.groups.about"), set.indexOf("APP.madeWithCare"));
    expect(about).toMatch(/onclick: "A\.feedback\(\)"/);
    expect(set).toMatch(/onclick: "A\.openQibla\(\)"/);
  });
  it("the Friday sīrah notification follows its switch (on by default)", () => {
    const S = fresh();
    const friday = new Date(2026, 10, 20, 6, 0);
    expect(store.defaultState().settings.seerahNotify).toBe(true);
    expect(planNotifications(S, friday).some(n => n.id >= 4000 && n.id < 5000)).toBe(true);
    S.settings.seerahNotify = false;
    expect(planNotifications(S, friday).some(n => n.id >= 4000 && n.id < 5000)).toBe(false);
    expect(set).toMatch(/key: "seerahNotify"/);
  });
  it("location: current location is the default way, a city the fallback", () => {
    expect(locationSummary({ location: { lat: 51.5, lng: -0.1, label: "London", source: "gps" } })).toEqual({ kind: "gps", label: "London", follows: true });
    expect(locationSummary({ location: { lat: 51.5, lng: -0.1, label: "London", source: "gps" }, autoLocation: false }).follows).toBe(false);
    expect(locationSummary({ location: { lat: 51.5, lng: -0.1, label: "London", source: "city" } }).kind).toBe("city");
    expect(locationSummary({ location: null }).kind).toBe("none");
    const sheet = set.slice(set.indexOf("A.locationSheet = ("), set.indexOf("A.locTravel ="));
    expect(sheet).toMatch(/class="btn primary" id="locGps" onclick="A\.useGps\(\)"/);
    expect(sheet).toMatch(/class="loccity"><button type="button" class="link"/); // a small link, not a peer button
    const shown = sheet.slice(sheet.indexOf("openSheet("));
    expect(shown.indexOf("locGps")).toBeGreaterThan(-1);
    expect(shown.indexOf("locGps")).toBeLessThan(shown.indexOf("${cityPart}")); // the city link sits underneath
    expect(set.slice(set.indexOf("A.useGps ="), set.indexOf("A.useGps =") + 400)).toMatch(/autoLocation = true/);
    expect(src("src/views/qibla-page.js")).toMatch(/A\.openLocation = \(\) => A\.locationSheet/);
  });
});
