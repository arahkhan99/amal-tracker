// Follow-ups that live in views: "Provisions & levels" as a set-up Features choice (and the later offer), and the
// "I made one up" sheet opened from Today's Make-ups line (a fast too, See all make-ups, Undo).
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as store from "../src/store.js";

const S = store.defaultState(new Date(2026, 10, 17, 14, 38));
const sheet = { html: "" }, toasts = [];
const UI = { view: "home" };
vi.mock("../src/app.js", () => ({
  S, UI, A: {}, $: () => null, $$: () => [], NOW: () => new Date(2026, 10, 17, 14, 38), todayKey: () => "2026-11-17",
  onRender() {}, commit: vi.fn(), go: vi.fn(), toast: (m, o) => toasts.push({ m, o }), touched() {}, glossBtn: () => "", avatarBtn: () => "",
  openSheet: h => { sheet.html = h; }, closeSheet() {},
}));
vi.mock("../src/platform.js", () => ({
  isNative: () => false, pageUrl: p => p, currentPosition: async () => ({ lat: 51.5, lng: -0.13 }), cityName: async () => "London",
  notificationsGranted: async () => false, requestNotifications: async () => true, authenticate: async () => {},
}));
vi.mock("../src/cloud.js", () => ({ cloud: { available: true, user: null }, signIn: async () => {}, signOut: async () => {}, agreeConsent: async () => {} }));
vi.mock("../src/crash.js", () => ({ setCrashReporting() {} }));
vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: () => "web", isNativePlatform: () => false } }));

const app = await import("../src/app.js");
const { A } = app;
const ob = await import("../src/views/onboarding.js");
await import("../src/views/qada.js");
const pv = await import("../src/provisions.js");
const { SETUP_X, MAKEUPS_X } = await import("../src/strings.js");

describe("set-up Features: Provisions & levels", () => {
  beforeEach(() => { S.settings.provisions = store.defaultProvisions(); });
  it("is a choice after Progress, off by default, with its own line", () => {
    const rows = ob.setupRows(), i = rows.findIndex(r => r.id === "provisions");
    expect(rows[i - 1].id).toBe("progress");
    expect(rows[i]).toMatchObject({ name: "Provisions & levels", sub: SETUP_X.featProvisionsSub, on: false, locked: false });
    expect(SETUP_X.featProvisionsSub).not.toMatch(/points?/i); // the app's wording: provisions, never points
  });
  it("choosing it turns provisions on, so the later offer never shows", () => {
    A.obFeat("provisions");
    expect(pv.pvOn(S)).toBe(true);
    expect(ob.setupRows().find(r => r.id === "provisions").on).toBe(true);
    const later = { ...S, profile: { ...S.profile, onboarded: true }, createdKey: "2026-11-01" };
    expect(pv.offerDue(later, "2026-11-17")).toBe(false);
  });
  it("unticked again in set-up: off, and the offer still comes after a week for someone who didn't choose it", () => {
    A.obFeat("provisions");
    A.obFeat("provisions");
    expect(pv.pvOn(S)).toBe(false);
    const later = { ...S, profile: { ...S.profile, onboarded: true }, createdKey: "2026-11-01" };
    expect(pv.offerDue(later, "2026-11-17")).toBe(true);
  });
});

describe("the I made one up sheet from Today", () => {
  beforeEach(() => { Object.assign(S.qada, { Fajr: 2, Dhuhr: 0, Asr: 1, Maghrib: 0, Isha: 0, Witr: 0, fasts: 2, monthLog: {}, dayLog: {} }); toasts.length = 0; });
  it("lists the prayers, a fast when fasts are owed, and See all make-ups", () => {
    A.mkPick("today");
    expect(sheet.html).toContain(MAKEUPS_X.aFast);
    expect(sheet.html).toContain(MAKEUPS_X.seeAll);
    expect(sheet.html).toContain("A.mkTap('Fajr')");
    A.mkPick();
    expect(sheet.html).not.toContain(MAKEUPS_X.seeAll); // from the Make-ups chapter itself: no link back to it
    S.qada.fasts = 0;
    A.mkPick("today");
    expect(sheet.html).not.toContain(MAKEUPS_X.aFast);
  });
  it("a tap logs it with Undo, which puts everything back", () => {
    const before = JSON.stringify(S.qada);
    A.mkTap("Fajr");
    expect(S.qada.Fajr).toBe(1);
    expect(toasts.at(-1).o?.undo).toBeTypeOf("function");
    toasts.at(-1).o.undo();
    expect(JSON.stringify(S.qada)).toBe(before);
    A.mkTap("fast");
    expect(S.qada.fasts).toBe(1);
    expect(store.monthLog(S, new Date(2026, 10, 17)).fasts).toBe(1);
    toasts.at(-1).o.undo();
    expect(JSON.stringify(S.qada)).toBe(before);
  });
  it("See all make-ups opens Progress → Make-ups (or the Make-ups page while Progress is off)", () => {
    A.mkSeeAll();
    expect(UI.progressCh).toBe("makeups");
    expect(app.go).toHaveBeenLastCalledWith("progress");
    S.settings.features = { ...S.settings.features, progress: false };
    A.mkSeeAll();
    expect(app.go).toHaveBeenLastCalledWith("qada");
    S.settings.features = { ...S.settings.features, progress: true };
  });
});
