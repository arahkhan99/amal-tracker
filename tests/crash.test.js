import { describe, it, expect, vi, beforeEach } from "vitest";

const plat = vi.hoisted(() => ({ native: false, name: "web" }));
const fc = vi.hoisted(() => ({
  setEnabled: vi.fn(async () => {}), setCustomKey: vi.fn(async () => {}), recordException: vi.fn(async () => {}),
  deleteUnsentReports: vi.fn(async () => {}), setUserId: vi.fn(async () => {}), log: vi.fn(async () => {}),
}));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => plat.native, getPlatform: () => plat.name } }));
vi.mock("@capacitor-firebase/crashlytics", () => ({ FirebaseCrashlytics: fc }));

const crash = await import("../src/crash.js");
const flush = () => new Promise(r => setTimeout(r, 0));
const sentKeys = () => fc.setCustomKey.mock.calls.map(c => c[0].key);

beforeEach(() => {
  crash._resetCrash();
  Object.values(fc).forEach(f => f.mockClear());
  plat.native = true; plat.name = "android";
});

describe("crash.js on the web", () => {
  it("does nothing at all", async () => {
    plat.native = false; plat.name = "web";
    const target = new EventTarget();
    expect(await crash.initCrash({ app_version: "1" }, target)).toBe(false);
    await crash.setCrashReporting(true);
    expect(await crash.recordError(new Error("x"))).toBe(false);
    await crash.crashView("home"); await crash.crashTheme("dark");
    target.dispatchEvent(Object.assign(new Event("error"), { error: new Error("boom") }));
    await flush();
    for (const f of Object.values(fc)) expect(f).not.toHaveBeenCalled();
  });
});

describe("crash.js on native", () => {
  it("enables collection and sets only the allowed keys", async () => {
    expect(await crash.initCrash({ enabled: true, app_version: "2026.11.14.1200", view: "home", theme: "system" }, new EventTarget())).toBe(true);
    expect(fc.setEnabled).toHaveBeenCalledWith({ enabled: true });
    expect(sentKeys().sort()).toEqual(["app_version", "platform", "theme", "view"]);
    expect(fc.setCustomKey).toHaveBeenCalledWith({ key: "platform", value: "android", type: "string" });
    expect(fc.setUserId).not.toHaveBeenCalled();
  });

  it("never sends personal fields even if a caller passes them", async () => {
    await crash.initCrash({ enabled: true, app_version: "1", view: "home", theme: "dark", name: "Aisha", email: "a@b.co", location: { lat: 1 }, madhhab: "hanafi", logs: [1] }, new EventTarget());
    for (const k of sentKeys()) expect(crash.CRASH_KEYS).toContain(k);
    const json = JSON.stringify(fc.setCustomKey.mock.calls);
    for (const bad of ["Aisha", "a@b.co", "hanafi", "madhhab", '"lat"', '"location"', '"email"', '"name"', '"logs"']) expect(json).not.toContain(bad);
    expect(crash.safeKeys({ name: "x", email: "y", madhhab: "z", view: "qada" })).toEqual([{ key: "view", value: "qada", type: "string" }]);
  });

  it("records uncaught errors and unhandled rejections as non-fatals with a stack", async () => {
    const target = new EventTarget();
    await crash.initCrash({ enabled: true, app_version: "1" }, target);
    const err = new Error("render failed");
    err.stack = "Error: render failed\n    at renderHome (https://localhost/assets/index-abc.js?v=1:12:34)\n    at https://localhost/assets/vendor.js:5:6";
    target.dispatchEvent(Object.assign(new Event("error"), { error: err }));
    target.dispatchEvent(Object.assign(new Event("unhandledrejection"), { reason: "sync timeout" }));
    await flush(); await flush();
    expect(fc.recordException).toHaveBeenCalledTimes(2);
    const first = fc.recordException.mock.calls[0][0];
    expect(first.message).toBe("Error: render failed");
    expect(first.stacktrace).toEqual([
      { functionName: "renderHome", fileName: "index-abc.js", lineNumber: 12 },
      { functionName: "<anonymous>", fileName: "vendor.js", lineNumber: 5 },
    ]);
    expect(fc.recordException.mock.calls[1][0].message).toBe("sync timeout");
    expect(Object.keys(first).sort()).toEqual(["message", "stacktrace"]);
  });

  it("keeps messages short and scrubs emails and precise numbers", () => {
    expect(crash.shortMessage(new Error("no user a.b@example.com at 41.8781,-87.6298"))).toBe("Error: no user [email] at [n],[n]");
    expect(crash.shortMessage("x".repeat(500)).length).toBeLessThanOrEqual(200);
  });

  it("parses Safari stack frames", () => {
    const e = { stack: "go@capacitor://localhost/assets/index-abc.js:3:9\n@capacitor://localhost/assets/index-abc.js:7:1" };
    expect(crash.stackFrames(e)).toEqual([
      { functionName: "go", fileName: "index-abc.js", lineNumber: 3 },
      { functionName: "<anonymous>", fileName: "index-abc.js", lineNumber: 7 },
    ]);
  });

  it("dedupes repeated errors and caps reports per launch", async () => {
    await crash.initCrash({ enabled: true }, new EventTarget());
    await crash.recordError(new Error("same")); await crash.recordError(new Error("same"));
    expect(fc.recordException).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 30; i++) await crash.recordError(new Error("e" + i));
    expect(fc.recordException).toHaveBeenCalledTimes(10);
  });

  it("updates the view key only when it changes", async () => {
    await crash.initCrash({ enabled: true, view: "home" }, new EventTarget());
    fc.setCustomKey.mockClear();
    await crash.crashView("home");
    expect(fc.setCustomKey).not.toHaveBeenCalled();
    await crash.crashView("settings");
    expect(fc.setCustomKey).toHaveBeenCalledWith({ key: "view", value: "settings", type: "string" });
  });
});

describe("the Send crash reports switch", () => {
  it("is opt-in: unanswered (undefined), null, false or truthy non-true values all start off", async () => {
    for (const enabled of [undefined, null, false, "yes", 1]) {
      crash._resetCrash(); Object.values(fc).forEach(f => f.mockClear());
      const target = new EventTarget();
      expect(await crash.initCrash({ enabled, app_version: "1" }, target)).toBe(false);
      expect(fc.setEnabled).toHaveBeenCalledWith({ enabled: false });
      target.dispatchEvent(Object.assign(new Event("error"), { error: new Error("boom") }));
      await flush();
      expect(fc.recordException).not.toHaveBeenCalled();
    }
  });

  it("main.js, the Settings switch and the set-up step treat only crashReports === true as on", async () => {
    const fs = await import("node:fs");
    const main = fs.readFileSync("src/main.js", "utf8"), settings = fs.readFileSync("src/views/settings.js", "utf8");
    expect(main).toContain("initCrash({ enabled: S.settings.crashReports === true");
    expect(settings).toContain("on: st.crashReports === true");
    expect(settings).not.toContain("crashReports !== false");
    const store = await import("../src/store.js");
    expect(store.defaultState().settings.crashReports).toBeUndefined();
    // native auto-collection stays off until the user says yes
    expect(fs.readFileSync("android/app/src/main/AndroidManifest.xml", "utf8")).toContain('firebase_crashlytics_collection_enabled" android:value="false"');
    expect(fs.readFileSync("ios/App/App/Info.plist", "utf8")).toMatch(/<key>FirebaseCrashlyticsCollectionEnabled<\/key>\s*<false\/>/);
  });

  it("starts off when the setting is off, and sends nothing", async () => {
    const target = new EventTarget();
    expect(await crash.initCrash({ enabled: false }, target)).toBe(false);
    expect(fc.setEnabled).toHaveBeenCalledWith({ enabled: false });
    expect(fc.deleteUnsentReports).toHaveBeenCalled();
    target.dispatchEvent(Object.assign(new Event("error"), { error: new Error("boom") }));
    await flush();
    expect(fc.recordException).not.toHaveBeenCalled();
    expect(fc.setCustomKey).not.toHaveBeenCalled();
  });

  it("turning it off stops reports and drops unsent ones; turning it on again resumes", async () => {
    await crash.initCrash({ enabled: true }, new EventTarget());
    await crash.setCrashReporting(false);
    expect(fc.setEnabled).toHaveBeenLastCalledWith({ enabled: false });
    expect(fc.deleteUnsentReports).toHaveBeenCalledTimes(1);
    expect(await crash.recordError(new Error("a"))).toBe(false);
    await crash.setCrashReporting(true);
    expect(fc.setEnabled).toHaveBeenLastCalledWith({ enabled: true });
    expect(await crash.recordError(new Error("b"))).toBe(true);
  });
});
