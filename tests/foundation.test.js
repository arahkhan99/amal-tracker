// Foundation: madhhab rules, statuses and make-ups, Witr, sunnah logging, excused days, migration,
// feature modules, Saturday weeks, stats, strings and glossary.
import { describe, it, expect } from "vitest";
import * as store from "../src/store.js";
import * as st from "../src/stats.js";
import * as M from "../src/rules/madhhab.js";
import * as F from "../src/features.js";
import { timesFor, ishaBestBefore, madeUpDeadline, canStillMakeUp, startedPrayers, windowEnd, weekIndex, weekDates, weekKey, weekRangeLabel, weeksBetween, manzilFor, WEEK_START } from "../src/times.js";
import { thisWeek } from "../src/content.js";
import { PRAYER_NAME, prayerName, STATUS, MADHHAB_SUMMARY, NAV } from "../src/strings.js";
import { GLOSSARY, glossaryFor } from "../src/glossary.js";
import { dkey, addDays, PRAYERS } from "../src/util.js";

const NOW = new Date(2026, 10, 5, 19, 0); // Thu 5 Nov 2026, 7 PM local
const K = "2026-11-05";
const fresh = (madhhab = "hanafi") => { const S = store.defaultState(NOW); S.createdKey = "2026-10-01"; store.setMadhhab(S, madhhab); return S; };
const LOC = { lat: 51.51, lng: -0.13, label: "London" };

describe("madhhab rules", () => {
  it("Hanafi is the default, with the later ʿAsr", () => {
    const S = store.defaultState(NOW);
    expect(S.settings.madhhab).toBe("hanafi");
    expect(S.settings.asr).toBe("hanafi");
    expect(M.asrMethod("hanafi")).toBe("hanafi");
    for (const m of ["shafii", "maliki", "hanbali"]) expect(M.asrMethod(m)).toBe("shafi");
    // times follow the madhhab when no asr is set
    const d = new Date(2026, 10, 5, 12);
    expect(timesFor(d, { method: "MuslimWorldLeague", madhhab: "hanafi", location: LOC }).Asr > timesFor(d, { method: "MuslimWorldLeague", madhhab: "shafii", location: LOC }).Asr).toBe(true);
  });

  it("Hanafi: the 12 emphasised, ghayr muʾakkadah outlined, nafl hidden", () => {
    const ids = p => M.sunnahFor("hanafi", p, { date: new Date(2026, 10, 5) }).map(x => x.id);
    expect(ids("Fajr")).toEqual(["fajr-b2"]);
    expect(ids("Dhuhr")).toEqual(["dhuhr-b4", "dhuhr-a2"]);
    expect(ids("Asr")).toEqual(["asr-b4"]);
    expect(ids("Maghrib")).toEqual(["maghrib-a2"]);
    expect(ids("Isha")).toEqual(["isha-b4", "isha-a2"]);
    expect(M.tierLabel("ghayr").display).toBe("outline");
    expect(M.tierLabel("muakkadah").display).toBe("solid");
    expect(M.sunnahFor("hanafi", "Maghrib", { nafl: true }).map(x => x.id)).toEqual(["maghrib-a2", "maghrib-awwabin"]);
    expect(M.sunnahFor("hanafi", "Asr", { ghayr: false })).toEqual([]);
    expect(M.measureTarget("hanafi", { date: new Date(2026, 10, 5) })).toEqual({ kind: "rakahs", of: 12 });
  });

  it("Jumuʿah: 4 before and 4 after on Friday (Hanafi), off when jumuah is off", () => {
    const fri = new Date(2026, 10, 6);
    expect(M.sunnahFor("hanafi", "Dhuhr", { date: fri }).map(M.chipLabel)).toEqual(["4 before", "4 after"]);
    expect(M.sunnahFor("hanafi", "Dhuhr", { date: fri, jumuah: false }).map(x => x.id)).toEqual(["dhuhr-b4", "dhuhr-a2"]);
    expect(M.measureTarget("hanafi", { date: fri }).of).toBe(14);
    expect(prayerName("Dhuhr", { date: fri, jumuah: true })).toBe("Jumuʿah");
  });

  it("Shafiʿi and Hanbali: 10, with 2 before Zuhr; Witr not owed", () => {
    for (const m of ["shafii", "hanbali"]) {
      expect(M.sunnahFor(m, "Dhuhr", { date: new Date(2026, 10, 5) }).filter(x => x.tier === "muakkadah").map(x => x.rakahs)).toEqual([2, 2]);
      expect(M.measureTarget(m, { date: new Date(2026, 10, 5) })).toEqual({ kind: "rakahs", of: 10 });
      expect(M.witrInQada(m)).toBe(false);
      expect(M.witrRule(m).status).toBe("sunnahMuakkadah");
    }
    expect(M.witrInQada("hanafi")).toBe(true);
    expect(M.witrRule("hanafi").status).toBe("wajib");
  });

  it("Maliki uses its own taxonomy and the Raghībah + Witr measure", () => {
    const all = M.catalogue("maliki");
    expect(all.some(x => x.tier === "muakkadah" || x.tier === "ghayr")).toBe(false);
    expect(all.find(x => x.id === "fajr-b2").tier).toBe("raghibah");
    expect(M.tierLabel("raghibah").name).toBe("Raghībah");
    expect(M.tierLabel("nafilahMuakkadah").name).toBe("Nāfilah muʾakkadah");
    expect(M.witrLabel("maliki").tag).toBe("Sunnah");
    expect(M.measureTarget("maliki")).toEqual({ kind: "raghibahWitr", of: 2 });
    expect(M.measureLabel("maliki", 1, 2)).toEqual({ title: "Raghībah + Witr", value: "1/2" });
    expect(M.measureLabel("hanafi", 8, 12).value).toBe("8/12");
  });

  it("summaries match docs/madhhab-rules.md", () => {
    expect(M.summary("hanafi")).toBe("Later ʿAsr · 12 emphasised sunnahs · Witr is wājib");
    expect(M.summary("maliki")).toBe(MADHHAB_SUMMARY.maliki);
    expect(M.madhhabOptions().map(o => o.id)).toEqual(["hanafi", "shafii", "maliki", "hanbali"]);
    expect(M.madhhabOptions()[0].isDefault).toBe(true);
  });

  it("chips are allowed by fard status: missed none, made-up Fajr keeps its 2 before", () => {
    const fb = M.itemById("fajr-b2"), db = M.itemById("dhuhr-b4");
    expect(M.sunnahAllowed(fb, "missed")).toBe(false);
    expect(M.sunnahAllowed(fb, "madeup")).toBe(true);
    expect(M.sunnahAllowed(db, "madeup")).toBe(false);
    expect(M.sunnahAllowed(db, "ontime")).toBe(true);
    expect(M.sunnahAllowed(db, null)).toBe(true);
    expect(M.sunnahAllowed(db, "excused")).toBe(false);
    expect(M.sunnahAllowed(db, "ontime", { excusedDay: true })).toBe(false);
  });

  it("ʿIshāʾ best before is the middle of Maghrib → next Fajr", () => {
    expect(M.middleOfNight(new Date(2026, 0, 1, 18, 0), new Date(2026, 0, 2, 6, 0))).toEqual(new Date(2026, 0, 2, 0, 0));
    const set = { method: "MuslimWorldLeague", asr: "hanafi", location: LOC };
    const d = new Date(2026, 10, 5);
    const mid = ishaBestBefore(d, set);
    expect(mid > timesFor(d, set).Maghrib && mid < timesFor(addDays(d, 1), set).Fajr).toBe(true);
    expect(madeUpDeadline(d, set).getTime()).toBe(timesFor(addDays(d, 1), set).Fajr.getTime());
    const asrEnd = windowEnd(d, "Asr", set);
    expect(canStillMakeUp(d, "Asr", new Date(asrEnd.getTime() + 60000), set)).toBe(true);
    expect(canStillMakeUp(d, "Asr", new Date(asrEnd.getTime() - 60000), set)).toBe(false);
    expect(startedPrayers(d, new Date(2026, 10, 4), set)).toEqual([]);
    expect(startedPrayers(d, new Date(2026, 10, 6), set)).toEqual(PRAYERS);
  });
});

describe("statuses and make-ups", () => {
  it("missed adds one; made up / on time / jamāʿah / excused / clear take it off", () => {
    for (const to of ["madeup", "ontime", "congregation", "excused", null]) {
      const S = fresh();
      store.setPrayer(S, K, "Asr", "missed", NOW);
      expect(S.qada.Asr).toBe(1);
      expect(store.addedToday(S, NOW)).toBe(1);
      store.setPrayer(S, K, "Asr", to, NOW);
      expect(S.qada.Asr).toBe(0);
      expect(store.addedToday(S, NOW)).toBe(0);
    }
  });

  it("made up never adds; re-marking missed doesn't double count", () => {
    const S = fresh();
    store.setPrayer(S, K, "Fajr", "madeup", NOW);
    expect(S.qada.Fajr).toBe(0);
    store.setPrayer(S, K, "Fajr", "missed", NOW);
    store.setPrayer(S, K, "Fajr", "missed", NOW);
    expect(S.qada.Fajr).toBe(1);
    expect(S.days[K].at.Fajr).toBe(NOW.getTime());
  });

  it("Hanafi: missed ʿIshāʾ marks Witr missed (owed), undone when ʿIshāʾ is made up", () => {
    const S = fresh("hanafi");
    store.setPrayer(S, K, "Isha", "missed", NOW);
    expect(S.days[K].witr).toBe("missed");
    expect(S.qada.Witr).toBe(1);
    expect(store.qadaOwed(S)).toBe(2);
    expect(store.qadaKeys(S)).toContain("Witr");
    store.setPrayer(S, K, "Isha", "madeup", NOW);
    expect(S.days[K].witr).toBeUndefined();
    expect(S.qada.Witr).toBe(0);
    expect(store.qadaOwed(S)).toBe(0);
  });

  it("Witr set by hand: missed is owed for Hanafi only, and comes off again", () => {
    const S = fresh("hanafi");
    store.setWitr(S, K, "missed", NOW);
    expect(S.qada.Witr).toBe(1);
    store.setWitr(S, K, "done", NOW);
    expect(S.qada.Witr).toBe(0);
    const T = fresh("shafii");
    store.setPrayer(T, K, "Isha", "missed", NOW);
    expect(T.days[K].witr).toBeUndefined(); // no automatic Witr for non-Hanafi
    store.setWitr(T, K, "missed", NOW);
    expect(T.qada.Witr).toBe(0);
    expect(store.qadaKeys(T)).not.toContain("Witr");
    // a Witr missed under Shafiʿi then switched to Hanafi never takes off what was never added
    store.setMadhhab(T, "hanafi");
    store.setWitr(T, K, "done", NOW);
    expect(T.qada.Witr).toBe(0);
  });

  it("made-up Witr can be prayed back from Make-ups", () => {
    const S = fresh("hanafi");
    S.qada.Witr = 2;
    expect(store.madeUpPrayer(S, "Witr", NOW)).toBe(true);
    expect(S.qada.Witr).toBe(1);
    expect(store.monthLog(S, NOW).prayers).toBe(1);
  });
});

describe("sunnah logging", () => {
  it("chips per fard per day; missed hides them, made-up Fajr keeps 2 before", () => {
    const S = fresh();
    expect(store.setSunnah(S, K, "dhuhr-b4", true)).toBe(true);
    store.setPrayer(S, K, "Dhuhr", "ontime", NOW);
    expect(store.sunnahDone(S, K, "dhuhr-b4")).toBe(true);
    expect(store.sunnahChips(S, K, "Dhuhr").map(c => [c.label, c.done])).toEqual([["4 before", true], ["2 after", false]]);
    store.setPrayer(S, K, "Dhuhr", "missed", NOW);
    expect(store.sunnahChips(S, K, "Dhuhr")).toEqual([]);
    expect(store.sunnahDone(S, K, "dhuhr-b4")).toBe(false); // kept in data, not counted
    expect(store.setSunnah(S, K, "dhuhr-a2", true)).toBe(false);
    store.setPrayer(S, K, "Dhuhr", "ontime", NOW);
    expect(store.sunnahDone(S, K, "dhuhr-b4")).toBe(true); // restored if the status is corrected
    store.setPrayer(S, K, "Fajr", "madeup", NOW);
    expect(store.setSunnah(S, K, "fajr-b2", true)).toBe(true);
    store.setPrayer(S, K, "Asr", "madeup", NOW);
    expect(store.setSunnah(S, K, "asr-b4", true)).toBe(false);
    expect(store.setSunnah(S, K, "nope", true)).toBe(false);
  });

  it("settings hide ghayr muʾakkadah and show nafl", () => {
    const S = fresh();
    S.settings.sunnahGhayr = false;
    expect(store.sunnahChips(S, K, "Isha").map(c => c.id)).toEqual(["isha-a2"]);
    S.settings.sunnahNafl = true;
    expect(store.sunnahChips(S, K, "Isha").map(c => c.id)).toEqual(["isha-a2", "witr-a2n"]);
    expect(store.sunnahChips(S, K, "day").map(c => c.id)).toEqual(["ishraq", "duha", "tahajjud"]);
  });

  it("Witr chip carries the madhhab's tag", () => {
    const S = fresh();
    expect(store.witrChip(S, K)).toMatchObject({ chip: "Witr 3", tag: "wājib", inQada: true, status: null, allowed: true });
    store.setWitr(S, K, "done", NOW);
    expect(store.witrChip(S, K).done).toBe(true);
  });
});

describe("excused days", () => {
  it("a flagged day counts its prayers as excused and takes missed ones off make-ups", () => {
    const S = fresh();
    store.setPrayer(S, K, "Fajr", "ontime", NOW);
    store.setPrayer(S, K, "Asr", "missed", NOW);
    store.setPrayer(S, K, "Isha", "missed", NOW);
    expect(store.qadaOwed(S)).toBe(3); // Asr, Isha, Witr
    store.setExcusedDay(S, K, true, NOW);
    expect(store.qadaOwed(S)).toBe(0);
    expect(store.prayerStatus(S, K, "Fajr")).toBe("ontime");
    expect(store.prayerStatus(S, K, "Asr")).toBe("excused");
    expect(store.witrChip(S, K).allowed).toBe(false);
    expect(store.sunnahChips(S, K, "Fajr")).toEqual([]);
    store.setExcusedDay(S, K, false, NOW);
    expect(store.prayerStatus(S, K, "Asr")).toBeNull();
  });

  it("recitation becomes Listen to Qurʾān, with Duʿāʾ & istighfār", () => {
    const S = fresh();
    store.setExcusedDay(S, K, true, NOW);
    const ids = store.amalForDay(S, K).map(a => a.id);
    expect(ids).toContain("listen");
    expect(ids).toContain("dua");
    expect(ids).not.toContain("quran");
    expect(store.amalForDay(S, K).find(a => a.id === "listen").name).toBe("Listen to Qurʾān");
    expect(store.amalForDay(S, "2026-11-04").map(a => a.id)).toContain("quran");
    expect(st.amalDayState(S, K, "quran", NOW)).toBe("excused");
  });

  it("excused mode carries forward and ends with started prayers stamped excused", () => {
    const S = fresh();
    store.startExcused(S, "2026-11-02", NOW);
    expect(store.syncExcusedMode(S, K)).toBe(3);
    expect(store.isExcusedDay(S, "2026-11-04")).toBe(true);
    store.endExcused(S, K, { excusedPrayers: ["Fajr", "Dhuhr"] }, NOW);
    expect(S.excusedMode).toBeNull();
    expect(store.isExcusedDay(S, K)).toBe(false);
    expect(store.prayerStatus(S, K, "Dhuhr")).toBe("excused");
    expect(store.prayerStatus(S, K, "Asr")).toBeNull();
    expect(store.setExcusedRange(S, "2026-11-10", "2026-11-08", true, NOW)).toBe(3);
  });

  it("stats leave excused days out of percentages and streaks", () => {
    const S = fresh();
    S.amalList = [];
    for (let i = 1; i <= 5; i++) { const k = dkey(addDays(NOW, -i)); for (const p of PRAYERS) store.setPrayer(S, k, p, "ontime", NOW); }
    store.setExcusedDay(S, dkey(addDays(NOW, -3)), true, NOW);
    for (const p of PRAYERS) store.setPrayer(S, dkey(addDays(NOW, -3)), p, null, NOW);
    expect(st.dayPct(S, addDays(NOW, -3), NOW)).toBe(0); // nothing due, nothing to complete
    expect(st.prayerStreak(S, NOW)).toBe(4); // the excused day is skipped, not a break
    const c = st.statusCounts(S, 6, NOW);
    expect(c.excused).toBe(5);
    expect(c.excusedDays).toBe(1);
    expect(c.ontime).toBe(20);
  });
});

describe("migration", () => {
  const v1 = (settings, onboarded = true) => ({ version: 1, profile: { name: "A", onboarded }, settings: { method: "NorthAmerica", ...settings }, days: {}, qada: { Fajr: 3 },
    amalList: [{ id: "quran", name: "Quran recitation", hint: "", detail: "quran", builtin: true }, { id: "evening", name: "Evening dhikr", hint: "After Asr", detail: "none", builtin: true }] });

  it("old default shafi becomes Hanafi and asks once (set-up users)", () => {
    const N = store.normalize(v1({ asr: "shafi" }));
    expect(N.version).toBe(2);
    expect(N.settings.madhhab).toBe("hanafi");
    expect(N.settings.asr).toBe("hanafi");
    expect(N.settings.madhhabAsk).toBe(true);
    expect(N.settings.asrBefore).toBe("shafi");
    expect(N.qada.Fajr).toBe(3);
    expect(N.qada.Witr).toBe(0);
    store.answerMadhhabAsk(N, "shafii");
    expect(N.settings.asr).toBe("shafi");
    expect(N.settings.madhhabAsk).toBeUndefined();
    expect(store.normalize(v1({ asr: "shafi" }, false)).settings.madhhabAsk).toBeUndefined();
  });

  it("an explicit Hanafi choice is kept; a v2 madhhab is never overridden", () => {
    const N = store.normalize(v1({ asr: "hanafi" }));
    expect(N.settings).toMatchObject({ madhhab: "hanafi", asr: "hanafi", asrChosen: true });
    expect(N.settings.madhhabAsk).toBeUndefined();
    const T = store.normalize({ ...v1({ asr: "shafi", madhhab: "maliki" }) });
    expect(T.settings.madhhab).toBe("maliki");
    expect(T.settings.asr).toBe("shafi");
    expect(T.settings.madhhabAsk).toBeUndefined();
    // running it again changes nothing
    expect(store.normalize(JSON.parse(JSON.stringify(N)))).toEqual(N);
  });

  it("built-in good deeds get new names unless renamed; features fill in", () => {
    const N = store.normalize(v1({ asr: "shafi" }));
    expect(N.amalList[0].name).toBe("Qurʾān recitation");
    expect(N.amalList[1].name).toBe("Evening dhikr"); // renamed by the user: kept
    expect(N.amalList[1].hint).toBe("After ʿAsr");
    expect(N.settings.features).toEqual(F.defaultFeatures());
    expect(N.settings.hiddenTools).toEqual([]);
    expect(N.settings.sunnahNafl).toBe(false);
    const P = store.normalize({ days: {}, qada: {}, settings: { madhhab: "hanafi", features: { tools: false, future: 1 } } });
    expect(P.settings.features.tools).toBe(false);
    expect(P.settings.features.sunnah).toBe(true);
    expect(P.settings.features.future).toBe(1); // never drop fields
  });

  it("merge keeps the new day fields", () => {
    const a = fresh(), b = fresh();
    a.profile.onboarded = b.profile.onboarded = true;
    store.setSunnah(b, K, "fajr-b2", true);
    store.setWitr(b, K, "done", NOW);
    b.days[K].u = 99999999999999;
    const m = store.mergeStates(a, b);
    expect(m.days[K].sunnah["fajr-b2"]).toBe(true);
    expect(m.days[K].witr).toBe("done");
  });
});

describe("feature modules", () => {
  it("prayers are always on; modules and tools switch", () => {
    const S = fresh();
    expect(F.isOn(S, "prayers")).toBe(true);
    expect(F.setFeature(S, "prayers", false)).toBe(false);
    expect(F.featureCount(S)).toEqual({ on: 7, of: 7 });
    expect(F.navTabs(S).map(t => t.id)).toEqual(["home", "tracker", "tools", "qada", "progress"]);
    expect(F.navTabs(S).find(t => t.id === "qada").label).toBe("Make-ups");
    F.setFeature(S, "makeups", false);
    expect(F.navTabs(S).map(t => t.id)).toEqual(["home", "tracker", "tools", "progress"]);
    F.setToolHidden(S, "hizb", true);
    expect(F.visibleTools(S)).toEqual(["adhkar", "durud", "quran"]);
    expect(F.toolVisible(S, "hizb")).toBe(false);
    F.setToolHidden(S, "hizb", false);
    expect(F.visibleTools(S)).toEqual(F.TOOLS);
    F.applyPreset(S, "prayers");
    expect(F.navTabs(S).map(t => t.id)).toEqual(["home", "tracker"]);
    expect(F.visibleTools(S)).toEqual([]);
    expect(F.featureRows(S)[0]).toMatchObject({ id: "prayers", locked: true, on: true });
  });
});

describe("Saturday weeks", () => {
  it("weeks start on Saturday; Saturday is manzil 1", () => {
    expect(WEEK_START).toBe(6);
    const sat = new Date(2026, 10, 7), fri = new Date(2026, 10, 13), thu = new Date(2026, 10, 5);
    expect(weekIndex(sat)).toBe(0);
    expect(weekIndex(fri)).toBe(6);
    expect(manzilFor(sat)).toBe(1);
    expect(manzilFor(fri)).toBe(7);
    expect(manzilFor(thu)).toBe(6);
    expect(weekDates(fri).map(dkey)[0]).toBe("2026-11-07");
    expect(weekKey(thu)).toBe("2026-10-31");
    expect(weekRangeLabel(sat)).toBe("Sat 7 – Fri 13 Nov");
    expect(weekRangeLabel(thu)).toBe("Sat 31 Oct – Fri 6 Nov");
    expect(weeksBetween(thu, sat)).toBe(1);
    expect(weekIndex(new Date(2026, 10, 9), 1)).toBe(0); // Monday-first still available
  });

  it("thisWeek() and weekSeries() use the Saturday week", () => {
    const w = thisWeek(new Date(2026, 10, 10));
    expect(w.weekKey).toBe("2026-11-07");
    expect(dkey(w.weekEnd)).toBe("2026-11-13");
    expect(w.weekIndex).toBe(3);
    expect(w.ayah.src).toBeTruthy();
    expect(thisWeek(new Date(2026, 10, 13)).weekKey).toBe(thisWeek(new Date(2026, 10, 7)).weekKey);
    const S = fresh();
    store.setPrayer(S, "2026-11-03", "Fajr", "madeup", NOW);
    store.setPrayer(S, "2026-11-03", "Asr", "missed", NOW);
    const ws = st.weekSeries(S, NOW);
    expect(ws.map(d => d.key)).toEqual(["2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06"]);
    expect(ws[3].statuses).toMatchObject({ Fajr: "madeup", Asr: "missed", Dhuhr: "unlogged" });
    expect(ws[3]).toMatchObject({ prayed: 1, due: 5 });
    expect(ws[6].future).toBe(true);
    expect(st.weekPcts(S, NOW, 0, 6).length).toBe(7);
  });
});

describe("stats for Progress", () => {
  it("How you prayed counts every status; made up counts as prayed", () => {
    const S = fresh();
    const k = "2026-11-04";
    ["congregation", "ontime", "madeup", "missed", "excused"].forEach((s, i) => store.setPrayer(S, k, PRAYERS[i], s, NOW));
    const c = st.statusCountsRange(S, new Date(2026, 10, 4), new Date(2026, 10, 4), NOW);
    expect(c).toMatchObject({ congregation: 1, ontime: 1, madeup: 1, missed: 1, excused: 1, unlogged: 0, prayed: 3, due: 4 });
    const pp = st.perPrayerCounts(S, new Date(2026, 10, 4), new Date(2026, 10, 4), NOW);
    expect(pp.Asr.madeup).toBe(1);
    const ch = st.eachPrayerSeries(S, NOW, { from: new Date(2026, 10, 4), to: new Date(2026, 10, 4) });
    expect(ch.map(r => r.name)).toEqual(["Fajr", "Zuhr", "ʿAsr", "Maghrib", "ʿIshāʾ"]);
    expect(ch[0]).toMatchObject({ prayedPct: 100, jamaahPct: 100 });
    expect(ch[4].prayedPct).toBeNull(); // only excused: nothing due
    expect(st.streaks(S, NOW).all.cur).toBe(0);
  });

  it("sunnah measure: Hanafi rakʿahs of 12, Maliki Raghībah + Witr", () => {
    const S = fresh("hanafi");
    store.setSunnah(S, K, "fajr-b2", true);
    store.setSunnah(S, K, "dhuhr-b4", true);
    store.setSunnah(S, K, "asr-b4", true); // ghayr: not in the measure
    store.setWitr(S, K, "done", NOW); // Witr never counted as a Hanafi sunnah
    expect(st.sunnahMeasureDay(S, K)).toEqual({ kind: "rakahs", got: 6, of: 12, excused: false });
    const r = st.sunnahRange(S, new Date(2026, 10, 4), NOW, NOW);
    expect(r.got).toBe(6);
    expect(r.of).toBe(24);
    expect(r.witr).toMatchObject({ done: 1, due: 2, inQada: true });
    expect(r.items.find(x => x.id === "asr-b4")).toMatchObject({ done: 1, due: 2, display: "outline" });
    const L = fresh("maliki");
    store.setSunnah(L, K, "fajr-b2", true);
    store.setWitr(L, K, "done", NOW);
    expect(st.sunnahMeasureDay(L, K)).toEqual({ kind: "raghibahWitr", got: 2, of: 2, excused: false });
    store.setExcusedDay(L, K, true, NOW);
    expect(st.sunnahMeasureDay(L, K).excused).toBe(true);
  });

  it("streaks: made up keeps the all-five streak, not the on-time one", () => {
    const S = fresh();
    for (let i = 1; i <= 3; i++) { const k = dkey(addDays(NOW, -i)); for (const p of PRAYERS) store.setPrayer(S, k, p, i === 2 && p === "Fajr" ? "madeup" : "ontime", NOW); }
    const s = st.streaks(S, NOW);
    expect(s.all.cur).toBe(3);
    expect(s.onTime.cur).toBe(1);
    expect(s.onTime.best).toBe(1);
  });
});

describe("strings and glossary", () => {
  it("display names use light transliteration; keys unchanged", () => {
    expect(PRAYER_NAME).toMatchObject({ Fajr: "Fajr", Dhuhr: "Zuhr", Asr: "ʿAsr", Maghrib: "Maghrib", Isha: "ʿIshāʾ" });
    expect(Object.keys(STATUS)).toEqual(store.STATUSES);
    expect(NAV.qada).toBe("Make-ups");
  });

  it("every required term has a draft meaning", () => {
    const need = ["Salāh", "Sunnah", "Sunnah muʾakkadah", "Ghayr muʾakkadah", "Nafl", "Witr", "Wājib", "Fard", "Jamāʿah", "Jumuʿah", "Awwābīn", "Ishrāq", "Duhā", "Tahajjud", "Qadāʾ", "Madhhab", "Hayd", "Nifās", "Adhkār", "Durūd", "Hizb al-Aʿzam", "Manzil", "Para", "Juz", "Mushaf", "Raghībah", "Ākhirah"];
    for (const t of need) expect(glossaryFor(t), t).toBeTruthy();
    for (const g of Object.values(GLOSSARY)) { expect(g.draft).toBe(true); expect(g.meaning.length).toBeLessThan(220); }
    expect(glossaryFor("jamaah")).toBe(GLOSSARY.jamaah); // plain spelling finds it too
  });
});
