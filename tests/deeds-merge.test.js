// 19 Nov 2026 (night): the Good deeds sheet holds the reading too (Reading · Deeds · Nafl prayers), Durūd and
// Salawāt are ONE item ("Durūd / Salawāt": one good deed, 1 provision a day, old data counted once), and
// "Good deeds · n of m" counts only the items chosen as daily deeds ("Choose daily deeds").
// Rules: src/today.js deedGroups / dailyChoices / setDaily, src/store.js dailyIds, src/reading.js (durud → salawat),
// src/points.js (readsByDay / countedReads). Drawing: src/views/home.js A.deedsSheet / A.dailyChoose.
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as store from "../src/store.js";
import { timesFor } from "../src/times.js";
import { dkey } from "../src/util.js";
import * as today from "../src/today.js";
import { readItems, setReadDone, isReadDone } from "../src/reading.js";
import { dayProvisions, readsByDay, provisions } from "../src/points.js";

const DAY = new Date(2026, 10, 19, 15, 0); // Thursday afternoon (not Jumuʿah yet)
const KEY = dkey(DAY);
const S = store.defaultState(new Date(2026, 9, 1));
const clock = { now: DAY };
const calls = { toast: [], sheet: [], commit: 0 };
vi.mock("../src/app.js", () => ({
  S, UI: { view: "home" }, A: {}, $: sel => clock.dom?.[sel] || ({ classList: { contains: () => false } }), $$: () => [], NOW: () => clock.now, todayKey: () => dkey(clock.now),
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
await import("../src/views/home.js");
const { TODAY, READ, DEED_NAME } = await import("../src/strings.js");
const { tickAmal } = await import("../src/views/tools/core.js");

function reset() {
  const fresh = store.defaultState(new Date(2026, 9, 1));
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, fresh);
  S.profile.onboarded = true;
  S.createdKey = "2026-10-01";
  S.settings.location = { lat: 41.88, lng: -87.63, label: "Chicago", source: "city" };
  S.settings.method = "MoonsightingCommittee"; S.settings.asr = "hanafi";
  calls.toast.length = 0; calls.sheet.length = 0; calls.commit = 0;
  clock.now = DAY;
}
const deedsOn = key => dayProvisions(S.days[key], { reads: readsByDay(S)[key] }).parts.find(p => p.kind === "deeds")?.count || 0;

describe("Durūd / Salawāt: one item", () => {
  beforeEach(reset);
  it("is named \"Durūd / Salawāt\" in Read and in the deeds list (an unchanged old name is migrated)", () => {
    expect(READ.item.durud).toBe("Durūd / Salawāt");
    expect(DEED_NAME.salawat).toBe("Durūd / Salawāt");
    for (const old of ["Salawat", "Salawāt"]) {
      const n = store.normalize({ profile: { onboarded: true }, settings: {}, amalList: [{ id: "salawat", name: old, hint: "", detail: "count", builtin: true }] });
      expect(n.amalList[0].name).toBe("Durūd / Salawāt");
      expect(n.amalList[0].detail).toBe("count"); // keeps the count option
    }
    const mine = store.normalize({ profile: { onboarded: true }, settings: {}, amalList: [{ id: "salawat", name: "My salawāt", detail: "count", builtin: true }] });
    expect(mine.amalList[0].name).toBe("My salawāt");
  });
  it("For today shows it once (daily while it is a daily deed, else on Jumuʿah); the sheet always has it", () => {
    const ids = readItems(S, DAY).map(i => i.id);
    expect(ids.filter(i => i === "durud").length).toBe(1);
    S.settings.dailyDeeds = ["sadaqah"];
    expect(readItems(S, DAY).some(i => i.id === "durud")).toBe(false);
    expect(readItems(S, DAY, { all: true }).some(i => i.id === "durud")).toBe(true);
    const friday = new Date(2026, 10, 20, 10);
    expect(readItems(S, friday).some(i => i.id === "durud")).toBe(true);
  });
  it("a tick in Read or the sheet writes the one deed (day.amal.salawat) and the reader's stamp: 1 good deed", () => {
    setReadDone(S, "durud", true, DAY);
    expect(S.days[KEY].amal.salawat.done).toBe(true);
    expect(S.tools.read[KEY].durud).toBeGreaterThan(0);
    expect(deedsOn(KEY)).toBe(1);
    setReadDone(S, "durud", false, DAY);
    expect(S.days[KEY].amal.salawat).toBeUndefined();
    expect(S.tools.cleared[`read/${KEY}/durud`]).toBeGreaterThan(0); // the same tombstone as Read's untick
    expect(deedsOn(KEY)).toBe(0);
  });
  it("still ticks when the salawāt deed was removed from the list (the merged item is always kept)", () => {
    S.amalList = S.amalList.filter(a => a.id !== "salawat");
    setReadDone(S, "durud", true, DAY);
    expect(S.days[KEY].amal.salawat.done).toBe(true);
    expect(isReadDone(S, "durud", DAY)).toBe(true);
    expect(tickAmal("salawat", "2026-11-18", "40")).toBe(true); // the forty durūd finished: the reader ticks it too
  });
  it("old data: a salawāt deed and a durūd reader tick on the same day count once; a reader tick alone now counts", () => {
    // before the merge: durūd read (the forty, or Read's tick) with the salawāt deed also ticked
    S.days["2026-11-10"] = { prayers: {}, amal: { salawat: { done: true, detail: "100 salawāt" } }, note: "" };
    S.tools = { read: { "2026-11-10": { durud: 1 }, "2026-11-11": { durud: 1 } }, durud: { "2026-11-13": { read: [1, 2], done: 5 } } };
    expect(deedsOn("2026-11-10")).toBe(1);
    // durūd read without the salawāt deed (it wasn't on the list): counts as the merged item's one deed
    expect(deedsOn("2026-11-11")).toBe(1);
    expect(deedsOn("2026-11-13")).toBe(1);
    // and both on Friday's key at once: still one
    S.tools.read["2026-11-13"] = { durud: 9 };
    expect(deedsOn("2026-11-13")).toBe(1);
    const p = provisions(S, { today: "2026-11-19" });
    expect(p.byDay["2026-11-10"]).toBe(1);
    expect(p.byDay["2026-11-11"]).toBe(1);
  });
});

describe("the Good deeds sheet: Reading · Deeds · Nafl prayers", () => {
  beforeEach(reset);
  it("groups the items; the merged item sits in Reading only (no separate Salawāt deed)", () => {
    const g = today.deedGroups(S, KEY, DAY);
    expect(g.reading.map(i => i.id)).toEqual(expect.arrayContaining(["morning", "evening", "quran", "mulk", "durud"]));
    expect(g.reading.filter(i => i.id === "durud").length).toBe(1);
    expect(g.deeds.map(i => i.id)).toEqual(["sadaqah"]);
    expect(g.nafl.map(i => i.id)).toEqual(["ishraq", "duha", "awwabin", "tahajjud"]);
  });
  it("draws ticks that are Read's own tick, a Read button that opens the reader, Count on the merged item, and Choose daily deeds", () => {
    A.deedsSheet(KEY);
    const h = calls.sheet.at(-1);
    for (const g of [TODAY.groupReading, TODAY.groupDeeds]) expect(h).toContain(`>${g}<`);
    expect(h).not.toContain(">Nafl prayers<"); // none chosen as daily by default
    expect(h).toContain(`onclick="A.readTick('morning')"`);
    expect(h).toContain(`onclick="A.readTick('durud')"`);
    expect(h).toContain(`onclick="A.deedRead('durud')"`);
    expect(h).toContain(`onclick="A.detailSheet('salawat','${KEY}','deeds')"`); // the salawāt count
    expect(h).toContain(`onclick="A.tapAmal('sadaqah','${KEY}','deeds')"`);
    expect(h).toContain(`onclick="A.dailyChoose('${KEY}','')"`);
    expect(h).toContain(TODAY.deedsDaily("Thursday", 0, 5));
    expect((h.match(/<b>Durūd \/ Salawāt<\/b>/g) || []).length).toBe(1); // one item
    expect(h).not.toContain("<b>Salawāt</b>");
  });
  it("Read opens the reader (closing the sheet)", () => {
    let opened = "";
    A.readOpen = id => { opened = id; };
    A.deedRead("mulk");
    expect(opened).toBe("mulk");
  });
  it("one good deed when ticked from the sheet or from Read: the same storage", () => {
    setReadDone(S, "morning", true, DAY);
    const g = today.deedGroups(S, KEY, DAY);
    expect(g.reading.find(i => i.id === "morning").done).toBe(true);
    expect(today.deedsLine(S, KEY, DAY)).toMatchObject({ done: 1, of: 5 });
    expect(deedsOn(KEY)).toBe(1);
  });
});

describe("Choose daily deeds", () => {
  beforeEach(reset);
  it("the default is the deeds list; choosing changes only what the pill counts", () => {
    expect(store.dailyIds(S)).toEqual(["quran", "morning", "evening", "durud", "sadaqah"]);
    setReadDone(S, "mulk", true, DAY); // an extra: done, but not a daily goal
    expect(today.deedsLine(S, KEY, DAY)).toMatchObject({ done: 0, of: 5 });
    A.dailyToggle("mulk");
    expect(S.settings.dailyDeeds).toContain("mulk");
    expect(today.deedsLine(S, KEY, DAY)).toMatchObject({ done: 1, of: 6 });
    A.dailyToggle("evening");
    expect(today.deedsLine(S, KEY, DAY)).toMatchObject({ done: 1, of: 5 });
  });
  it("nafl count only when chosen; a new deed added from the sheet is a daily goal", () => {
    store.setSunnah(S, KEY, "duha", true, DAY);
    expect(today.deedsLine(S, KEY, DAY).done).toBe(0);
    today.setDaily(S, "duha", true);
    expect(today.deedsLine(S, KEY, DAY)).toMatchObject({ done: 1, of: 6 });
    S.settings.dailyDeeds = store.dailyIds(S);
    clock.dom = { "#nIn": { value: "Visit the sick", focus() {} }, "#nType": { value: "none" } };
    A.saveAmal();
    clock.dom = null;
    const added = S.amalList.at(-1);
    expect(added.name).toBe("Visit the sick");
    expect(S.settings.dailyDeeds).toContain(added.id);
    expect(today.deedGroups(S, KEY, DAY).deeds.map(i => i.id)).toContain(added.id);
  });
  it("the chooser lists Reading, Deeds and Nafl with switches", () => {
    A.dailyChoose(KEY);
    const h = calls.sheet.at(-1);
    expect(h).toContain(TODAY.chooseDaily);
    for (const id of ["morning", "durud", "mulk", "sadaqah", "ishraq"]) expect(h).toContain(`data-f="daily-${id}"`);
    expect(h).toMatch(/data-f="daily-durud"[^>]*>/);
    expect(h).toContain('aria-checked="true" aria-label="Durūd / Salawāt"');
    expect(h).toContain('aria-checked="false" aria-label="Sūrat al-Mulk"');
  });
});

// 20 Nov 2026: on Today the Good deeds sheet lists ONLY the daily deeds (settings.dailyDeeds); everything else is
// behind "Add or change daily deeds" (Choose daily deeds, with "+ Add your own"). Same ticks, same storage.
describe("the Good deeds sheet on Today: only the daily deeds", () => {
  beforeEach(reset);
  const sheet = () => { A.deedsSheet(KEY); return calls.sheet.at(-1); };
  const ticks = h => [...h.matchAll(/data-f="(?:deed|nafl)-([a-z]+)"/g)].map(m => m[1]);
  it("four chosen (a reading, the Qurʾān, a deed, a nafl): just those, then the one quiet row", () => {
    S.settings.dailyDeeds = ["morning", "quran", "sadaqah", "duha"];
    const h = sheet();
    expect(ticks(h)).toEqual(["morning", "quran", "sadaqah", "duha"]);
    for (const id of ["evening", "mulk", "durud", "ishraq", "tahajjud"]) expect(h).not.toContain(`-${id}"`);
    expect(h).toContain(">Nafl prayers<");
    expect(h).toContain(`data-f="choose-daily" onclick="A.dailyChoose('${KEY}','')"`);
    expect(h).toContain(TODAY.dailyEdit);
    expect(h.indexOf('data-f="choose-daily"')).toBeGreaterThan(h.indexOf('data-f="nafl-duha"')); // at the bottom
    expect(h).not.toContain('data-f="add-deed"'); // "+ Add" lives in Choose daily deeds now
    expect(h).not.toContain('data-f="nafl-choose"');
    expect(h).toContain(TODAY.deedsDaily("Thursday", 0, 4));
    expect(today.deedsLine(S, KEY, DAY)).toMatchObject({ done: 0, of: 4, empty: false }); // the pill: chosen only
  });
  it("ticking from the sheet writes the same storage as before (no double counting)", () => {
    S.settings.dailyDeeds = ["morning", "quran", "sadaqah", "duha"];
    expect(sheet()).toContain(`onclick="A.readTick('morning')"`); // Read's own tick (the For today log)
    setReadDone(S, "morning", true, DAY);
    A.tapAmal("sadaqah", KEY, "deeds");
    A.naflTick("duha", KEY);
    expect(S.days[KEY].amal.sadaqah.done).toBe(true);
    expect(store.sunnahDone(S, KEY, "duha")).toBe(true);
    expect(isReadDone(S, "morning", DAY)).toBe(true);
    expect(today.deedsLine(S, KEY, DAY)).toMatchObject({ done: 3, of: 4 });
    const h = sheet();
    expect(h).toMatch(/aria-checked="true" aria-label="Morning adhkār"/);
    expect(h).toMatch(/aria-checked="true" aria-label="Sadaqah"/);
    // an extra done in Read (not daily) is not on the sheet and not in the pill
    setReadDone(S, "mulk", true, DAY);
    expect(sheet()).not.toContain('data-f="deed-mulk"');
    expect(today.deedsLine(S, KEY, DAY)).toMatchObject({ done: 3, of: 4 });
  });
  it("Read's For today is unaffected: it still lists every reading, daily or not", () => {
    const before = readItems(S, DAY).map(i => i.id);
    S.settings.dailyDeeds = ["morning", "quran", "sadaqah", "durud"]; // keeps Durūd daily (its own For today rule)
    sheet();
    const after = readItems(S, DAY).map(i => i.id);
    expect(after).toEqual(before);
    expect(after).toEqual(expect.arrayContaining(["morning", "evening", "quran", "mulk", "durud"]));
  });
  it("nothing chosen: a short note and the same row; the pill offers to choose", () => {
    S.settings.dailyDeeds = [];
    const h = sheet();
    expect(h).toContain('data-f="deeds-empty"');
    expect(h).toContain(TODAY.deedsEmpty);
    expect(h).toContain('data-f="choose-daily"');
    expect(ticks(h)).toEqual([]);
    expect(h).not.toContain("z-gbar");
    expect(today.deedsLine(S, KEY, DAY)).toMatchObject({ of: 0, empty: true });
  });
  it("Choose daily deeds offers every item (all nafl, even hidden ones) and \"+ Add your own\", which returns there", () => {
    S.settings.naflShow = ["ishraq"];
    A.dailyChoose(KEY);
    let h = calls.sheet.at(-1);
    for (const k of ["ishraq", "duha", "awwabin", "tahajjud", "mulk", "kahf", "sadaqah"]) expect(h).toContain(`data-f="daily-${k}"`);
    expect(h).toContain(`data-f="add-own" onclick="A.addAmal('${KEY}','','choose')"`);
    expect(h).toContain(TODAY.addOwn);
    A.dailyToggle("tahajjud"); // chosen: shown and counted
    expect(S.settings.naflShow).toEqual(["ishraq", "tahajjud"]);
    expect(sheet()).toContain('data-f="nafl-tahajjud"');
    A.addAmal(KEY, "", "choose");
    clock.dom = { "#nIn": { value: "Visit the sick", focus() {} }, "#nType": { value: "none" } };
    A.saveAmal();
    clock.dom = null;
    h = calls.sheet.at(-1);
    expect(h).toContain(TODAY.chooseDailyLead); // back in Choose daily deeds
    const id = S.amalList.at(-1).id;
    expect(h).toContain(`aria-checked="true" aria-label="Visit the sick"`);
    expect(sheet()).toContain(`data-f="deed-${id}"`); // a new deed is a daily deed, so it is on the sheet
  });
  it("from a day in the calendar the sheet still lists all that day's deeds", () => {
    S.settings.dailyDeeds = ["sadaqah"];
    A.deedsSheet("2026-11-18", "day");
    const h = calls.sheet.at(-1);
    expect(h).toContain('data-f="deed-sadaqah"');
    expect(h).toContain('data-f="nafl-ishraq"'); // not daily, still listed for that day
  });
});
