// One-tap logging: the snapshot fields the native widgets / tile / Now notification read (src/widgets.js), and the
// prayer-time notification buttons (src/notify.js).
import { describe, it, expect } from "vitest";
import * as store from "../src/store.js";
import { buildSnapshot, snapshotInputSig, WIDGET_LABELS, SNAPSHOT_VERSION } from "../src/widgets.js";
import { planNotifications, actionTypes, actionTypeFor, actionLog, ACTION_TYPES, NOTIFY_ACTION } from "../src/notify.js";

const NOW = new Date(2026, 10, 5, 14, 18);
const KEY = "2026-11-05";
const fresh = () => {
  const S = store.defaultState(NOW);
  S.createdKey = "2026-11-01";
  S.profile.onboarded = true;
  S.settings.location = { lat: 41.88, lng: -87.63, label: "Chicago", source: "city" };
  return S;
};

describe("snapshot: one-tap fields (top level, still version 1)", () => {
  it("defaults: no gender, not excused, times only / Now notification / lock dots off", () => {
    const snap = buildSnapshot(fresh(), NOW);
    expect(snap.v).toBe(SNAPSHOT_VERSION);
    expect(snap).toMatchObject({ gender: null, excused: false, showTimesOnly: false, ongoingNow: false, lockDots: false });
  });
  it("follows the profile and settings", () => {
    const S = fresh();
    store.applyGender(S, "f", { todayKey: KEY }, NOW);
    S.settings.showTimesOnly = true; S.settings.ongoingNow = true; S.settings.lockDots = true;
    store.setExcusedDay(S, KEY, true, NOW);
    const snap = buildSnapshot(S, NOW);
    expect(snap).toMatchObject({ gender: "f", excused: true, showTimesOnly: true, ongoingNow: true, lockDots: true });
    expect(snap.days[1].excused).toBe(true);
  });
  it("carries remembrance per day", () => {
    const S = fresh();
    store.setExcusedDay(S, KEY, true, NOW);
    store.setRemember(S, KEY, "Dhuhr", true, NOW);
    const today = buildSnapshot(S, NOW).days[1];
    expect(today.remember).toEqual({ Dhuhr: true });
    expect(buildSnapshot(S, NOW).days[0].remember).toEqual({});
  });
  it("has the shared label keys", () => {
    for (const k of ["onTime", "congregation", "logged", "undo", "begins", "beginsShort", "remembrance", "notLogged", "madeup", "missed", "excused", "logOnTime", "nothingOpen"])
      expect(typeof WIDGET_LABELS[k]).toBe("string");
    expect(WIDGET_LABELS.logged).toContain("{p}");
    expect(WIDGET_LABELS.begins).toMatch(/\{p\}.*\{t\}/);
  });
  it("a gender change alone changes the input signature (so the widgets get it)", () => {
    const S = fresh(), a = snapshotInputSig(S, NOW);
    S.profile.gender = "f";
    expect(snapshotInputSig(S, NOW)).not.toBe(a);
  });
});

describe("prayer-time notification buttons", () => {
  it("brothers and 'prefer not to say' get In congregation + On time, sisters On time", () => {
    const S = fresh();
    expect(actionTypeFor(S)).toBe(ACTION_TYPES.m);
    S.profile.gender = "m";
    expect(actionTypeFor(S)).toBe(ACTION_TYPES.m);
    S.profile.gender = "f";
    expect(actionTypeFor(S)).toBe(ACTION_TYPES.f);
    const types = Object.fromEntries(actionTypes().map(t => [t.id, t.actions.map(a => a.title)]));
    expect(types[ACTION_TYPES.m]).toEqual([NOTIFY_ACTION.congregation, NOTIFY_ACTION.ontime]);
    expect(types[ACTION_TYPES.f]).toEqual([NOTIFY_ACTION.ontime]);
  });
  it("only prayer-time notifications carry the prayer and day to log", () => {
    const S = fresh();
    S.settings.prayerAlerts = true;
    const plan = planNotifications(S, new Date(2026, 10, 5, 0, 5));
    const prayerTime = plan.filter(n => n.id >= 1000 && n.id < 2000);
    expect(prayerTime.length).toBeGreaterThan(0);
    expect(prayerTime.every(n => n.log && /^\d{4}-\d{2}-\d{2}$/.test(n.log.date))).toBe(true);
    expect(prayerTime.find(n => n.id === 1002).log).toEqual({ p: "Asr", date: KEY });
    expect(plan.filter(n => n.id >= 2000).every(n => !n.log)).toBe(true);
  });
  it("reads a button press; a plain tap or a foreign notification logs nothing", () => {
    const n = { id: 1002, extra: { p: "Asr", date: KEY } };
    expect(actionLog({ actionId: "congregation", notification: n })).toEqual({ date: KEY, p: "Asr", status: "congregation" });
    expect(actionLog({ actionId: "ontime", notification: n })).toEqual({ date: KEY, p: "Asr", status: "ontime" });
    expect(actionLog({ actionId: "tap", notification: n })).toBe(null);
    expect(actionLog({ actionId: "ontime", notification: { id: 3000 } })).toBe(null);
    expect(actionLog({ actionId: "ontime", notification: { extra: { p: "Sunrise", date: KEY } } })).toBe(null);
  });
});
