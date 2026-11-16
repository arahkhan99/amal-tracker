import { describe, it, expect } from "vitest";
import * as store from "../src/store.js";
import { timesFor } from "../src/times.js";
import { hijriLabel } from "../src/hijri.js";
import { PRAYERS, addDays } from "../src/util.js";
import { buildSnapshot, serializeSnapshot, snapshotInputSig, linkDeduper, widgetModel, fmtCountdown, parseDeepLink, deepLink, SNAPSHOT_VERSION, DAY_OFFSETS, MAX_DEEDS } from "../src/widgets.js";

const NOW = new Date(2026, 10, 5, 14, 18); // Thu 5 Nov 2026, 2:18 PM local (the mockups' sample day)
const KEY = "2026-11-05";
const fresh = () => {
  const S = store.defaultState(NOW);
  S.createdKey = "2026-11-01";
  S.profile.onboarded = true;
  S.settings.location = { lat: 41.88, lng: -87.63, label: "Chicago" };
  return S;
};
const T = S => timesFor(NOW, S.settings);

describe("buildSnapshot", () => {
  it("has yesterday, today and two days ahead with every prayer time", () => {
    const S = fresh(), snap = buildSnapshot(S, NOW);
    expect(snap.v).toBe(SNAPSHOT_VERSION);
    expect(snap.date).toBe(KEY);
    expect(snap.generatedAt).toBe(+NOW);
    expect(snap.days.map(d => d.date)).toEqual(["2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07"]);
    expect(snap.days).toHaveLength(DAY_OFFSETS.length);
    const today = snap.days[1], t = T(S);
    for (const p of PRAYERS) expect(today.times[p]).toBe(+t[p]);
    expect(today.times.Sunrise).toBe(+t.Sunrise);
    expect(today.ishaBest).toBeGreaterThan(today.times.Isha);
    expect(today.ishaBest).toBeLessThan(snap.days[2].times.Fajr);
    expect(today.hijri).toBe(hijriLabel(NOW));
    expect(today.names.Asr).toBe("ʿAsr");
    expect(today.names.Dhuhr).toBe("Zuhr");
  });

  it("names Friday's Dhuhr Jumuʿah unless that's turned off", () => {
    const S = fresh();
    expect(buildSnapshot(S, NOW).days[2].names.Dhuhr).toBe("Jumuʿah"); // Fri 6 Nov
    S.settings.jumuah = false;
    expect(buildSnapshot(S, NOW).days[2].names.Dhuhr).toBe("Zuhr");
  });

  it("carries today's statuses, the excused flag and make-ups owed", () => {
    const S = fresh();
    store.setPrayer(S, KEY, "Fajr", "missed", NOW);
    store.setPrayer(S, KEY, "Dhuhr", "congregation", NOW);
    S.qada.Isha = 2;
    const snap = buildSnapshot(S, NOW), today = snap.days[1];
    expect(today.status).toEqual({ Fajr: "missed", Dhuhr: "congregation", Asr: null, Maghrib: null, Isha: null });
    expect(today.excused).toBe(false);
    expect(snap.makeups).toBe(3); // 2 owed + today's missed Fajr
    expect(snap.days[2].status.Fajr).toBeNull();
  });

  it("marks sunnah logged per prayer, null where the prayer has none or the module is off", () => {
    const S = fresh();
    store.setPrayer(S, KEY, "Fajr", "ontime", NOW);
    const fajrChip = store.sunnahChips(S, KEY, "Fajr")[0];
    store.setSunnah(S, KEY, fajrChip.id, true);
    let today = buildSnapshot(S, NOW).days[1];
    expect(today.sunnah.Fajr).toBe(true);
    expect(today.sunnah.Dhuhr).toBe(false);
    S.settings.features = { ...S.settings.features, sunnah: false };
    today = buildSnapshot(S, NOW).days[1];
    expect(Object.values(today.sunnah).every(v => v === null)).toBe(true);
  });

  it("counts today's Good Deeds and keeps at most six names", () => {
    const S = fresh();
    for (let i = 0; i < 3; i++) S.amalList.push({ id: "x" + i, name: "Deed " + i, hint: "", detail: "none" });
    store.setAmal(S, KEY, "quran", true);
    store.setAmal(S, KEY, "x2", true);
    const { deeds } = buildSnapshot(S, NOW);
    expect(deeds.date).toBe(KEY);
    expect(deeds.total).toBe(8);
    expect(deeds.done).toBe(2);
    expect(deeds.items).toHaveLength(MAX_DEEDS);
    expect(deeds.items[0]).toEqual({ name: S.amalList[0].name, done: true });
  });

  it("drops Good Deeds and make-ups when those modules are off", () => {
    const S = fresh();
    S.settings.features = { ...S.settings.features, deeds: false, makeups: false };
    const snap = buildSnapshot(S, NOW);
    expect(snap.deeds).toBeNull();
    expect(snap.makeups).toBeNull();
  });

  it("serializes to JSON whose signature ignores the write time", () => {
    const S = fresh();
    const a = serializeSnapshot(buildSnapshot(S, NOW));
    const b = serializeSnapshot(buildSnapshot(S, new Date(+NOW + 20000)));
    expect(JSON.parse(a.json).date).toBe(KEY);
    expect(a.sig).toBe(b.sig);
    store.setPrayer(S, KEY, "Asr", "ontime", NOW);
    expect(serializeSnapshot(buildSnapshot(S, NOW)).sig).not.toBe(a.sig);
  });

  it("stays small enough for shared storage", () => {
    expect(serializeSnapshot(buildSnapshot(fresh(), NOW)).json.length).toBeLessThan(4000);
  });
});

describe("widgetModel (reference for the native widgets)", () => {
  it("shows the next prayer and its countdown when the current one is logged", () => {
    const S = fresh();
    store.setPrayer(S, KEY, "Fajr", "ontime", NOW);
    store.setPrayer(S, KEY, "Dhuhr", "congregation", NOW);
    const snap = buildSnapshot(S, NOW), t = T(S);
    const m = widgetModel(snap, +NOW);
    expect(m.mode).toBe("next");
    expect(m.focus.p).toBe("Asr");
    expect(m.countdownTo).toBe(+t.Asr);
    expect(m.countdown).toBe(fmtCountdown(+t.Asr - +NOW));
    expect(m.countdownLabel).toBe("until ʿAsr");
    expect(m.logTarget).toBeNull();
    expect(m.prayers.map(x => x.state)).toEqual(["ontime", "congregation", "next", "upcoming", "upcoming"]);
    expect(m.prayers[2].focus).toBe(true);
    expect(m.prayed).toBe(2);
    expect(m.hijri).toBe(hijriLabel(NOW));
  });

  it("switches to the open prayer when its time is in and it isn't logged", () => {
    const S = fresh(), t = T(S);
    store.setPrayer(S, KEY, "Fajr", "ontime", NOW);
    const snap = buildSnapshot(S, NOW);
    const m = widgetModel(snap, +NOW); // 2:18 PM: Zuhr's time, not logged
    expect(m.mode).toBe("now");
    expect(m.focus.p).toBe("Dhuhr");
    expect(m.countdownTo).toBe(+t.Asr);
    expect(m.countdownLabel).toBe("left");
    expect(m.logTarget).toEqual({ p: "Dhuhr", date: KEY });
    expect(m.prayers[1].state).toBe("due");
  });

  it("works out later moments from the same snapshot without the app", () => {
    const S = fresh(), t = T(S);
    store.setPrayer(S, KEY, "Fajr", "ontime", NOW);
    store.setPrayer(S, KEY, "Dhuhr", "ontime", NOW);
    const snap = buildSnapshot(S, NOW);
    // a minute after ʿAsr starts: ʿAsr is due and counts down to Maghrib
    let m = widgetModel(snap, +t.Asr + 60000);
    expect(m.mode).toBe("now");
    expect(m.focus.p).toBe("Asr");
    expect(m.countdownTo).toBe(+t.Maghrib);
    // after ʿIshāʾ starts: counts to the middle of the night first
    m = widgetModel(snap, +t.Isha + 60000);
    expect(m.focus.p).toBe("Isha");
    expect(m.countdownTo).toBe(snap.days[1].ishaBest);
    expect(m.countdownLabel).toBe("to middle of night");
    // between sunrise and Zuhr nothing is due: next is Zuhr
    const s2 = buildSnapshot(fresh(), NOW);
    m = widgetModel(s2, +t.Sunrise + 60000);
    expect(m.mode).toBe("next");
    expect(m.focus.p).toBe("Dhuhr");
    expect(m.prayers[0].state).toBe("due"); // Fajr passed unlogged
  });

  it("rolls over to tomorrow after midnight, with last night's ʿIshāʾ still open", () => {
    const S = fresh();
    for (const p of PRAYERS) store.setPrayer(S, KEY, p, "ontime", NOW);
    const snap = buildSnapshot(S, NOW);
    const tomorrow = addDays(NOW, 1), tt = timesFor(tomorrow, S.settings);
    const at1am = +new Date(2026, 10, 6, 1, 0);
    const m = widgetModel(snap, at1am);
    expect(m.date).toBe("2026-11-06");
    expect(m.mode).toBe("next"); // last night's ʿIshāʾ is logged
    expect(m.focus.p).toBe("Fajr");
    expect(m.countdownTo).toBe(+tt.Fajr);
    expect(m.prayers.every(x => x.state === "upcoming" || x.state === "next")).toBe(true);
    // unlogged ʿIshāʾ last night: still "now" until Fajr, and the log target is yesterday
    const S2 = fresh();
    const m2 = widgetModel(buildSnapshot(S2, NOW), at1am);
    expect(m2.mode).toBe("now");
    expect(m2.logTarget).toEqual({ p: "Isha", date: KEY });
    expect(m2.countdownTo).toBe(+tt.Fajr);
  });

  it("clears Good Deeds on a new day and gives up when the snapshot is too old", () => {
    const S = fresh();
    store.setAmal(S, KEY, "quran", true);
    const snap = buildSnapshot(S, NOW);
    expect(widgetModel(snap, +NOW).deeds.done).toBe(1);
    const next = widgetModel(snap, +new Date(2026, 10, 6, 12, 0));
    expect(next.deeds.done).toBe(0);
    expect(next.deeds.items.some(x => x.done)).toBe(false);
    expect(widgetModel(snap, +new Date(2026, 10, 9, 12, 0))).toBeNull();
    expect(widgetModel(null, +NOW)).toBeNull();
    expect(widgetModel({ ...snap, v: 99 }, +NOW)).toBeNull();
  });

  it("shows excused days as excused", () => {
    const S = fresh();
    store.setExcusedDay(S, KEY, true, NOW);
    const m = widgetModel(buildSnapshot(S, NOW), +NOW);
    expect(m.mode).toBe("next");
    expect(m.prayers.every(x => x.state === "excused")).toBe(true);
  });

  it("names the next time it must redraw", () => {
    const S = fresh(), t = T(S);
    const m = widgetModel(buildSnapshot(S, NOW), +NOW);
    expect(m.nextChange).toBe(+t.Asr);
  });
});

describe("countdown and deep links", () => {
  it("formats countdowns like the app, rounding up", () => {
    expect(fmtCountdown(84 * 60000)).toBe("1h 24m");
    expect(fmtCountdown(83 * 60000 + 1)).toBe("1h 24m");
    expect(fmtCountdown(5 * 60000)).toBe("5m");
    expect(fmtCountdown(-1)).toBe("0m");
  });

  it("round-trips widget links and rejects anything else", () => {
    expect(parseDeepLink(deepLink.log("Asr", KEY))).toEqual({ kind: "log", p: "Asr", date: KEY });
    expect(parseDeepLink(deepLink.today())).toEqual({ kind: "today" });
    expect(parseDeepLink(deepLink.open("qada"))).toEqual({ kind: "open", view: "qada" });
    expect(parseDeepLink("zad://log?p=Lunch&d=2026-11-05")).toBeNull();
    expect(parseDeepLink("zad://log?p=Asr&d=tomorrow")).toBeNull();
    expect(parseDeepLink("https://example.com/log?p=Asr&d=2026-11-05")).toBeNull();
    expect(parseDeepLink("zad://open?v=<x>")).toBeNull();
    expect(parseDeepLink("not a url")).toBeNull();
  });
});

describe("snapshotInputSig (skip rebuilding the snapshot when nothing it reads changed)", () => {
  it("stays the same across the 20 s tick and a prayer boundary on the same day", () => {
    const S = fresh();
    const a = snapshotInputSig(S, NOW);
    expect(snapshotInputSig(S, new Date(+NOW + 20000))).toBe(a);
    expect(snapshotInputSig(S, new Date(+T(S).Maghrib + 1000))).toBe(a);
    // ...and the snapshot really is the same then (generatedAt aside)
    expect(serializeSnapshot(buildSnapshot(S, new Date(+T(S).Maghrib + 1000))).sig).toBe(serializeSnapshot(buildSnapshot(S, NOW)).sig);
  });
  it("changes at the day change", () => {
    const S = fresh();
    expect(snapshotInputSig(S, new Date(2026, 10, 6, 0, 0, 5))).not.toBe(snapshotInputSig(S, NOW));
  });
  it("changes with a log, a setting that moves the times, the Hijri setting, deeds and make-ups", () => {
    const S = fresh();
    const seen = new Set([snapshotInputSig(S, NOW)]);
    const changed = () => { const s = snapshotInputSig(S, NOW); expect(seen.has(s)).toBe(false); seen.add(s); };
    store.setPrayer(S, KEY, "Dhuhr", "ontime", NOW); changed();
    S.settings.location = { lat: 51.5, lng: -0.12, label: "London", source: "city" }; changed();
    S.settings.method = "MuslimWorldLeague"; changed();
    S.settings.asr = "shafii"; changed();
    S.settings.jumuah = false; changed();
    S.settings.excusedDays = false; changed();
    S.settings.hijri = { method: "civil", committee: "", adjust: 1 }; changed();
    store.setAmal(S, KEY, S.amalList[0].id, true, "", NOW); changed();
    store.setPrayer(S, "2026-11-06", "Fajr", "missed", NOW); changed(); // tomorrow's record, and make-ups
  });
  it("ignores days outside the snapshot", () => {
    const S = fresh(), a = snapshotInputSig(S, NOW);
    store.setPrayer(S, "2026-10-01", "Fajr", "ontime", NOW);
    expect(snapshotInputSig(S, NOW)).toBe(a); // an on-time log far back touches nothing the snapshot reads
  });
});

describe("linkDeduper (a cold start delivers the widget URL twice)", () => {
  it("handles a URL once within the window, again after it, and a different URL at once", () => {
    const first = linkDeduper(2000), url = deepLink.log("Asr", KEY);
    expect(first(url, 1000)).toBe(true);
    expect(first(url, 2500)).toBe(false); // appUrlOpen + getLaunchUrl
    expect(first(deepLink.today(), 2600)).toBe(true);
    expect(first(url, 2700)).toBe(true);
    expect(first(url, 4600)).toBe(false);
    expect(first(url, 2700 + 2000)).toBe(true);
    expect(first("", 9000)).toBe(false);
  });
});
