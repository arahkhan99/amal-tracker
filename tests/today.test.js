// The redesign's Today tab rules (src/today.js), "made up" only after a prayer's time (logging.js),
// the tabs following the chosen features (features.js navTabs) and the old routes redirecting (routes.js).
import { describe, it, expect } from "vitest";
import * as store from "../src/store.js";
import * as F from "../src/features.js";
import { timesFor, windowEnd } from "../src/times.js";
import { dkey } from "../src/util.js";
import { madeUpAllowed } from "../src/logging.js";
import { logButtons, otherOptions, logPrayer, restoreSnapshot, todayChapters, guideLineDue } from "../src/today.js";
import { resolveView, routeName, tabFor } from "../src/routes.js";
import { NAV, TODAY } from "../src/strings.js";

const DAY = new Date(2026, 10, 17);
const K = dkey(DAY);
function fresh(gender = "m") {
  const S = store.defaultState(DAY);
  S.profile.onboarded = true;
  S.createdKey = dkey(new Date(2026, 10, 1));
  store.applyGender(S, gender, { todayKey: K }, DAY);
  return S;
}
const T = S => timesFor(DAY, S.settings);
/** A moment inside ʿAsr's time (it has begun and not ended). */
const inAsr = S => new Date(+T(S).Asr + 20 * 60000);
/** After ʿAsr's time has ended (Maghrib has begun), before the next Fajr. */
const afterAsr = S => new Date(+windowEnd(DAY, "Asr", S.settings) + 10 * 60000);

describe("Now: one-tap buttons by brother / sister", () => {
  it("brothers: Prayed in congregation (primary), then Prayed on time", () => {
    expect(logButtons(fresh("m"))).toEqual(["congregation", "ontime"]);
  });
  it("sisters: Prayed on time, alone", () => {
    expect(logButtons(fresh("f"))).toEqual(["ontime"]);
  });
  it("not set: on time first, congregation second", () => {
    const S = fresh("m"); store.applyGender(S, null, { todayKey: K }, DAY);
    expect(logButtons(S)).toEqual(["ontime", "congregation"]);
  });
  it("the button labels say congregation, never 'with others' or jamāʿah", () => {
    expect(TODAY.button.congregation).toBe("Prayed in congregation");
    expect(TODAY.button.ontime).toBe("Prayed on time");
    expect(JSON.stringify(TODAY)).not.toMatch(/with others/i);
  });
});

describe("Other: what it lists", () => {
  it("brothers, while ʿAsr is open: Missed only (made up isn't offered yet)", () => {
    const S = fresh("m");
    expect(otherOptions(S, K, "Asr", inAsr(S))).toEqual(["missed"]);
  });
  it("sisters, while ʿAsr is open: In congregation, Missed, Excused", () => {
    const S = fresh("f");
    expect(otherOptions(S, K, "Asr", inAsr(S))).toEqual(["congregation", "missed", "excused"]);
  });
  it("'Made up later' appears only once the prayer's time has ended", () => {
    const S = fresh("m");
    expect(otherOptions(S, K, "Asr", afterAsr(S))).toEqual(["madeup", "missed"]);
    const sis = fresh("f");
    expect(otherOptions(sis, K, "Asr", afterAsr(sis))).toEqual(["congregation", "madeup", "missed", "excused"]);
  });
  it("…and not after the next Fajr (the made-up deadline)", () => {
    const S = fresh("m"), next = new Date(+timesFor(new Date(2026, 10, 18), S.settings).Fajr + 60000);
    expect(otherOptions(S, K, "Asr", next)).toEqual(["missed"]);
  });
  it("excused days switched off: no Excused", () => {
    const S = fresh("f"); S.settings.excusedDays = false;
    expect(otherOptions(S, K, "Asr", inAsr(S))).not.toContain("excused");
  });
  it("a Today row's Log lists every status, the buttons' first", () => {
    const S = fresh("m");
    expect(otherOptions(S, K, "Asr", afterAsr(S), { all: true })).toEqual(["congregation", "ontime", "madeup", "missed"]);
  });
});

describe("logging a tap", () => {
  it("logs through the store, stamping day.first", () => {
    const S = fresh("m"), now = inAsr(S);
    const r = logPrayer(S, K, "Asr", "congregation", now);
    expect(r.ok).toBe(true);
    expect(S.days[K].prayers.Asr).toBe("congregation");
    expect(S.days[K].first).toBe(now.getTime());
  });
  it("refuses before the prayer begins (no buttons before it starts)", () => {
    const S = fresh("m"), now = inAsr(S);
    expect(logPrayer(S, K, "Maghrib", "ontime", now)).toEqual({ ok: false, reason: "notStarted" });
    expect(store.prayerStatus(S, K, "Maghrib")).toBe(null);
  });
  it("refuses 'made up' while the prayer's time is still in", () => {
    const S = fresh("m");
    expect(logPrayer(S, K, "Asr", "madeup", inAsr(S))).toEqual({ ok: false, reason: "madeUpEarly" });
    expect(madeUpAllowed(S, K, "Asr", inAsr(S))).toBe(false);
    expect(madeUpAllowed(S, K, "Asr", afterAsr(S))).toBe(true);
    expect(logPrayer(S, K, "Asr", "madeup", afterAsr(S)).ok).toBe(true);
  });
  it("Undo puts the previous value back: status, day.first and make-ups", () => {
    const S = fresh("m"), now = inAsr(S);
    logPrayer(S, K, "Fajr", "ontime", now);
    const first = S.days[K].first;
    const r = logPrayer(S, K, "Asr", "missed", now);
    expect(S.qada.Asr).toBe(1);
    restoreSnapshot(S, r.snap);
    expect(store.prayerStatus(S, K, "Asr")).toBe(null);
    expect(S.qada.Asr).toBe(0);
    expect(S.days[K].first).toBe(first);
    expect(S.days[K].prayers.Fajr).toBe("ontime");
  });
  it("Undo of a change brings back the earlier status", () => {
    const S = fresh("m"), now = inAsr(S);
    logPrayer(S, K, "Asr", "ontime", now);
    const r = logPrayer(S, K, "Asr", "congregation", now);
    expect(r.was).toBe("ontime");
    restoreSnapshot(S, r.snap);
    expect(store.prayerStatus(S, K, "Asr")).toBe("ontime");
  });
  it("Undo of the very first log of a day leaves an empty day", () => {
    const S = fresh("m");
    const r = logPrayer(S, K, "Asr", "ontime", inAsr(S));
    restoreSnapshot(S, r.snap);
    expect(S.days[K].prayers).toEqual({});
    expect(S.days[K].first).toBeUndefined();
  });
});

describe("first-run guide line", () => {
  it("shows until the first log, and goes after it", () => {
    const S = fresh("m");
    expect(guideLineDue(S)).toBe(true);
    logPrayer(S, K, "Asr", "ontime", inAsr(S));
    expect(guideLineDue(S)).toBe(false);
  });
});

describe("tabs follow the chosen features", () => {
  it("everything on: Today · Read · Progress", () => {
    const S = fresh();
    expect(F.navTabs(S).map(t => t.label)).toEqual(["Today", "Read", "Progress"]);
    expect(todayChapters(S)).toEqual(["now", "today"]);
  });
  it("prayers only: one tab (no tab bar) and one chapter (no chapter bar)", () => {
    const S = fresh(); F.applyPreset(S, "prayers");
    expect(F.navTabs(S).map(t => t.id)).toEqual(["home"]);
    expect(todayChapters(S)).toEqual(["today"]);
  });
  it("Read shows for a tool or the weekly readings; Progress for Progress or Make-ups", () => {
    const S = fresh(); F.applyPreset(S, "prayers");
    F.setFeature(S, "week", true);
    expect(F.navTabs(S).map(t => t.id)).toEqual(["home", "tools"]);
    F.setFeature(S, "week", false); F.setFeature(S, "makeups", true);
    expect(F.navTabs(S).map(t => t.id)).toEqual(["home", "progress"]);
  });
  it("Community only with Zad Plus", () => {
    const S = fresh();
    expect(F.navTabs(S).map(t => t.id)).not.toContain("community");
    S.settings.plus = true;
    expect(F.navTabs(S).map(t => t.id)).toEqual(["home", "tools", "progress", "community"]);
    expect(NAV.community).toBe("Community");
  });
});

describe("routes: old names redirect", () => {
  it("#tracker opens the calendar, #tools Read, #home Today, #qada Make-ups", () => {
    expect(resolveView("#tracker")).toBe("calendar");
    expect(resolveView("tools")).toBe("tools");
    expect(resolveView("#read")).toBe("tools");
    expect(resolveView("#home")).toBe("home");
    expect(resolveView("#today")).toBe("home");
    expect(resolveView("#qada")).toBe("qada");
    expect(resolveView("#makeups")).toBe("qada");
    expect(resolveView("#nowhere")).toBe(null);
  });
  it("the address bar uses the new names", () => {
    expect(routeName("home")).toBe("today");
    expect(routeName("tools")).toBe("read");
    expect(routeName("qada")).toBe("makeups");
  });
  it("pushed pages light their tab: the calendar Today, Make-ups Progress", () => {
    expect(tabFor("calendar")).toBe("home");
    expect(tabFor("qada")).toBe("progress");
    expect(tabFor("tools")).toBe("tools");
  });
});
