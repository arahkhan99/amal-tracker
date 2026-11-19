/* Set-up (19 Nov 2026): the "Your prayer times" screen leads with one big "Use my location" button and shows
 * "Choose a city" only after location was refused, unavailable or timed out; the full privacy note (M3) is back;
 * the Features step has the "Just prayers" / "Everything" presets again (M4), with Provisions & levels to match. */
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as store from "../src/store.js";

const S = store.defaultState(new Date(2026, 10, 17, 14, 38));
const pos = { fail: null };
vi.mock("../src/app.js", () => ({
  S, UI: { view: "onboard" }, A: {}, $: () => null, $$: () => [], NOW: () => new Date(2026, 10, 17, 14, 38), todayKey: () => "2026-11-17",
  onRender() {}, commit: vi.fn(), go: vi.fn(), toast() {}, touched() {}, glossBtn: () => "",
  openSheet() {}, closeSheet() {},
}));
vi.mock("../src/platform.js", () => ({
  isNative: () => false, pageUrl: p => p,
  currentPosition: async () => { if (pos.fail) throw new Error(pos.fail); return { lat: 51.5, lng: -0.13 }; },
  cityName: async () => "London",
  notificationsGranted: async () => false, requestNotifications: async () => true, authenticate: async () => {},
}));
vi.mock("../src/cloud.js", () => ({ cloud: { available: true, user: null }, signIn: async () => {}, signOut: async () => {}, agreeConsent: async () => {} }));
vi.mock("../src/crash.js", () => ({ setCrashReporting() {} }));
vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: () => "web", isNativePlatform: () => false } }));

const { A } = await import("../src/app.js");
const ob = await import("../src/views/onboarding.js");
const feat = await import("../src/features.js");
const { pvOn } = await import("../src/provisions.js");
const { SETUP_X, SETUP } = await import("../src/strings.js");
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

describe("Set-up: Your prayer times", () => {
  beforeEach(() => { S.settings.location = null; pos.fail = null; ob._loc.reset(); });
  it("leads with one big Use my location button; no Choose a city on the screen", () => {
    const h = ob._screen("times");
    expect(h).toMatch(/class="ob-btn pri"[^>]*onclick="A\.obLocate\(\)"/);
    expect(h).not.toContain("A.obCity()");
    expect(h).not.toContain(esc(SETUP_X.chooseCity));
    expect(h).not.toContain('class="ob-seg"');
    expect(h).toContain(SETUP.useLocation);
  });
  it("shows the full privacy note: who receives the location (M3)", () => {
    expect(ob._screen("times")).toContain(esc(SETUP_X.calcNote));
    expect(SETUP_X.calcNote).toMatch(/only sent to look up your city/);
  });
  for (const why of ["denied", "unsupported", "timeout"]) {
    it(`location ${why}: the small Choose a city link appears`, async () => {
      pos.fail = why;
      await A.obLocate();
      expect(ob._loc.fail).toBe(true);
      const h = ob._screen("times");
      expect(h).toContain("A.obCity()");
      expect(h).toContain(esc(SETUP_X.cantLocate));
      expect(h).toMatch(/onclick="A\.obLocate\(\)"/); // trying again stays possible
    });
  }
  it("location found: the link goes, and the button becomes Looks right", async () => {
    pos.fail = "denied"; await A.obLocate();
    pos.fail = null; await A.obLocate();
    expect(S.settings.location).toMatchObject({ source: "gps", label: "London" });
    const h = ob._screen("times");
    expect(h).not.toContain("A.obCity()");
    expect(h).toContain(esc(SETUP_X.looksRight));
  });
});

describe("Set-up: Features presets (M4)", () => {
  beforeEach(() => { feat.applyPreset(S, "all"); S.settings.provisions = store.defaultProvisions(); });
  it("shows Just prayers and Everything above the list", () => {
    const h = ob._screen("features");
    expect(h).toContain("A.obPreset('prayers')");
    expect(h).toContain("A.obPreset('all')");
    expect(h.indexOf("ob-presets")).toBeLessThan(h.indexOf("ob-feats"));
    expect(h).toContain(esc(SETUP_X.featNote));
  });
  it("Just prayers: every switchable feature off, Provisions off, the chip is on", () => {
    A.obPreset("all"); A.obPreset("prayers");
    for (const f of feat.SWITCHABLE) expect(feat.isOn(S, f)).toBe(false);
    expect(pvOn(S)).toBe(false);
    expect(ob.presetOf()).toBe("prayers");
    expect(ob._screen("features")).toMatch(/class="on" aria-pressed="true" onclick="A\.obPreset\('prayers'\)"/);
  });
  it("Everything: every feature on, Provisions & levels too", () => {
    A.obPreset("prayers"); A.obPreset("all");
    for (const f of feat.SWITCHABLE) expect(feat.isOn(S, f)).toBe(true);
    expect(pvOn(S)).toBe(true);
    expect(ob.presetOf()).toBe("all");
    expect(ob.setupRows().every(r => r.on)).toBe(true);
  });
  it("a mixed choice lights neither chip", () => {
    A.obPreset("all"); A.obFeat("sunnah");
    expect(ob.presetOf()).toBe("");
    expect(ob._screen("features")).not.toContain('aria-pressed="true"');
  });
});
