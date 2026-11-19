/* Redesign phase 2c: What's new (existing users, once), the Google-only consent text while Apple is hidden,
 * the ʿAsr "Change" sheet setting the madhhab, and the Appearance size variables. */
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as store from "../src/store.js";

// One state object shared with the mocked app.js, as the real app shares S.
const S = store.defaultState(new Date(2026, 10, 17, 14, 38));
const sheet = { html: "" };
vi.mock("../src/app.js", () => ({
  S, UI: { view: "onboard" }, A: {}, $: () => null, $$: () => [], NOW: () => new Date(2026, 10, 17, 14, 38), todayKey: () => "2026-11-17",
  onRender() {}, commit: vi.fn(), go: vi.fn(), toast() {}, touched() {}, glossBtn: () => "",
  openSheet: h => { sheet.html = h; }, closeSheet() {},
}));
vi.mock("../src/platform.js", () => ({
  isNative: () => false, pageUrl: p => p, currentPosition: async () => ({ lat: 51.5, lng: -0.13 }), cityName: async () => "London",
  notificationsGranted: async () => false, requestNotifications: async () => true, authenticate: async () => {},
}));
vi.mock("../src/cloud.js", () => ({ cloud: { available: true, user: null }, signIn: async () => {}, signOut: async () => {}, agreeConsent: async () => {} }));
vi.mock("../src/crash.js", () => ({ setCrashReporting() {} }));
vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: () => "web", isNativePlatform: () => false } }));

const { A } = await import("../src/app.js");
const wn = await import("../src/views/whatsnew.js");
const consent = await import("../src/views/consent.js");
const ob = await import("../src/views/onboarding.js");
const ap = await import("../src/appearance.js");
const { CONSENT, MADHHAB_NAME } = await import("../src/strings.js");

describe("What's new", () => {
  it("is due only for someone who finished set-up before this version, and only once", () => {
    const old = { profile: { onboarded: true } };
    expect(wn.whatsNewDue(old)).toBe(true);
    wn.markWhatsNewSeen(old);
    expect(wn.whatsNewDue(old)).toBe(false);
    expect(old.profile.whatsNew).toBe(wn.WHATS_NEW_ID);
  });
  it("is never due for a new user, before or after set-up", () => {
    const st = store.defaultState();
    expect(wn.whatsNewDue(st)).toBe(false); // still setting up
    // finishing set-up marks it seen (onboarding completeSetup)
    Object.assign(S.profile, { onboarded: false, whatsNew: undefined });
    A.obReadyOpen();
    expect(S.profile.onboarded).toBe(true);
    expect(wn.whatsNewDue(S)).toBe(false);
  });
  it("keeps the flag through store.normalize (it survives a save / restore)", () => {
    const st = store.normalize({ profile: { onboarded: true, whatsNew: wn.WHATS_NEW_ID }, settings: {}, days: {}, qada: {} });
    expect(wn.whatsNewDue(st)).toBe(false);
    const older = store.normalize({ profile: { onboarded: true }, settings: {}, days: {}, qada: {} });
    expect(wn.whatsNewDue(older)).toBe(true);
  });
  it("names the four changes and nothing else", () => {
    const html = wn.whatsNewBody("");
    expect(html).toContain("Zad has a new look");
    expect(html.match(/class="ob-row"/g)).toHaveLength(4);
  });
});

describe("Log-in consent text", () => {
  it("says Google only while Sign in with Apple is hidden (APPLE_READY false)", () => {
    expect(consent.APPLE_READY).toBe(false);
    const t = consent.consentWhat();
    expect(t).toContain("linked to your Google account");
    expect(t).not.toMatch(/Apple/);
    expect(consent.loginBodyHtml()).not.toMatch(/Apple/);
    expect(consent.loginButtonsHtml()).not.toMatch(/Apple/);
    expect(consent.signInSheetHtml()).not.toMatch(/Apple/);
  });
  it("names both once Apple is ready", () => {
    expect(CONSENT.what(true)).toContain("Google or Apple account");
  });
  it("starts unticked, with the Google button disabled", () => {
    const body = consent.loginBodyHtml(), btns = consent.loginButtonsHtml();
    expect(body).toMatch(/<input type="checkbox" id="obOk"(?![^>]*checked)/);
    expect(btns).toMatch(/data-consent disabled/);
    expect(btns).toContain(CONSENT.notNow);
  });
});

describe("Set-up: the ʿAsr sheet", () => {
  beforeEach(() => { S.settings.location = { lat: 51.5074, lng: -0.1278, label: "London, UK", source: "city" }; store.setMadhhab(S, "hanafi"); });
  it("lists the four madhhabs, each with its ʿAsr time, Hanafī marked default", () => {
    A.obAsrSheet();
    for (const m of Object.values(MADHHAB_NAME)) expect(sheet.html).toContain(m);
    expect(sheet.html.match(/role="radio"/g)).toHaveLength(4);
    expect(sheet.html).toContain(ob.asrFor("hanafi"));
    expect(sheet.html).toContain(ob.asrFor("shafii"));
    expect(ob.asrFor("hanafi")).not.toBe(ob.asrFor("shafii")); // the later ʿAsr differs
    expect(sheet.html).toMatch(/Hanafī <em class="ob-tag">Default<\/em>/);
  });
  it("tapping a madhhab sets the madhhab and its ʿAsr", () => {
    A.obMadhhab("shafii");
    expect(S.settings.madhhab).toBe("shafii");
    expect(S.settings.asr).toBe("shafi");
    expect(sheet.html).toMatch(/aria-checked="true"[^>]*onclick="A\.obMadhhab\('shafii'\)"/);
    A.obMadhhab("hanafi");
    expect(S.settings.madhhab).toBe("hanafi");
    expect(S.settings.asr).toBe("hanafi");
  });
  it("ignores an unknown madhhab", () => {
    A.obMadhhab("nope");
    expect(S.settings.madhhab).toBe("hanafi");
  });
});

describe("Set-up: steps and the Welcome āyah", () => {
  it("has the seven steps in order (make-ups only when chosen, crash reports only on the phone app)", () => {
    S.settings.features = { ...S.settings.features, makeups: true };
    expect(ob.stepList()).toEqual(["name", "times", "read", "features", "owe", "reminders"]);
  });
  it("uses 2:197 from reflections.js, ending in alif maqṣūra + dagger alif (no dotted yāʾ)", () => {
    expect(ob.AYAH_2_197).toBe("وَتَزَوَّدُوا فَإِنَّ خَيْرَ الزَّادِ التَّقْوَىٰ");
    expect(ob.AYAH_2_197.endsWith("ىٰ")).toBe(true);
    expect(ob.AYAH_2_197).not.toContain("يٰ");
  });
});

describe("Appearance: text size and Arabic text size", () => {
  const root = () => { const props = {}; return { props, style: { setProperty: (k, v) => { props[k] = v; }, getPropertyValue: k => props[k] ?? "" } }; };
  it("defaults to the phone's size and the designed Arabic size", () => {
    const r = root();
    ap.applyScales({ settings: {} }, r);
    expect(r.props["--ui-scale"]).toBe("1");
    expect(r.props["--ar-scale"]).toBe("1");
  });
  it("sets --ar-scale on its own, without changing the text size", () => {
    const st = { settings: {} }, r = root();
    expect(ap.setSize(st, "ar", 4)).toBe(4);
    ap.applyScales(st, r);
    expect(r.props["--ar-scale"]).toBe(String(ap.AR_SIZES[4]));
    expect(Number(r.props["--ar-scale"])).toBeGreaterThan(1);
    expect(r.props["--ui-scale"]).toBe("1");
  });
  it("clamps out-of-range steps and ignores bad saved values", () => {
    const st = { settings: {} };
    expect(ap.setSize(st, "text", 99)).toBe(ap.TEXT_SIZES.length - 1);
    expect(ap.setSize(st, "ar", -3)).toBe(0);
    expect(ap.arScale({ settings: { arSize: "big" } })).toBe(1);
    expect(ap.textScale({ settings: { textSize: 2.5 } })).toBe(1);
  });
});
