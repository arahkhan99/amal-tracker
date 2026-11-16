/* Crash reporting (Firebase Crashlytics), native builds only; every call is a no-op on the web.
 * Privacy: only error messages, stack frames and the four keys in CRASH_KEYS are sent. Never add names,
 * emails, locations, madhhab, prayer logs or any other personal or religious-practice data here.
 * Opt-in: S.settings.crashReports === true is the only "on" (undefined = not asked yet = off). Asked in set-up
 * (onboarding "Help us fix bugs?") and switchable in Settings. Native auto-collection is off in AndroidManifest.xml /
 * Info.plist until setEnabled({ enabled: true }) runs here. */
import { Capacitor } from "@capacitor/core";

/** The only custom keys ever sent. Tests check nothing else gets through. */
export const CRASH_KEYS = ["app_version", "view", "platform", "theme"];
const MAX_MSG = 200, MAX_FRAMES = 20, MAX_PER_RUN = 10;

const native = () => Capacitor.isNativePlatform();
let plugin = null, enabled = false, sent = 0, lastView = "", base = {};
const seen = new Set();

async function crashlytics() {
  if (!plugin) plugin = (await import("@capacitor-firebase/crashlytics")).FirebaseCrashlytics;
  return plugin;
}

/** Keep only the allowed keys, as short strings. */
export function safeKeys(ctx = {}) {
  return CRASH_KEYS.filter(k => ctx[k] != null && ctx[k] !== "")
    .map(k => ({ key: k, value: String(ctx[k]).slice(0, 40), type: "string" }));
}

/** A short message with anything that looks like an email or a long number scrubbed out. */
export function shortMessage(err) {
  let m = err instanceof Error ? `${err.name}: ${err.message}` : typeof err === "string" ? err : (() => { try { return JSON.stringify(err); } catch (e) { return String(err); } })();
  m = String(m ?? "Unknown error")
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "[email]")
    .replace(/-?\d+\.\d{3,}/g, "[n]") // coordinates and other precise numbers
    .replace(/\d{6,}/g, "[n]");
  return m.length > MAX_MSG ? m.slice(0, MAX_MSG - 1) + "…" : m;
}

/** Stack frames from a JS Error: file name (no query string), function name, line number. */
export function stackFrames(err) {
  const stack = err && typeof err.stack === "string" ? err.stack : "";
  const out = [];
  for (const line of stack.split("\n")) {
    // Chrome/WebView: "    at fn (https://localhost/assets/index-abc.js:12:34)" or "    at https://...:12:34"
    // Safari/WKWebView: "fn@capacitor://localhost/assets/index-abc.js:12:34"
    const m = line.match(/^\s*at (?:(.+?) \()?(.+?):(\d+):\d+\)?\s*$/) || line.match(/^(.*?)@(.+?):(\d+):\d+\s*$/);
    if (!m) continue;
    const file = m[2].split(/[?#]/)[0].split("/").pop() || "unknown";
    out.push({ functionName: (m[1] || "<anonymous>").trim().slice(0, 80), fileName: file.slice(0, 80), lineNumber: +m[3] });
    if (out.length >= MAX_FRAMES) break;
  }
  return out;
}

/** Record a non-fatal error (deduplicated, at most MAX_PER_RUN per launch). */
export async function recordError(err) {
  if (!native() || !enabled) return false;
  const message = shortMessage(err);
  if (!message || /^Script error\.?$/.test(message) || seen.has(message) || sent >= MAX_PER_RUN) return false;
  seen.add(message); sent++;
  try {
    await (await crashlytics()).recordException({ message, stacktrace: stackFrames(err) });
    return true;
  } catch (e) { return false; }
}

/** Update the "view" key when the screen changes. */
export async function crashView(view) {
  if (!native() || !enabled || !view || view === lastView) return;
  lastView = view;
  try { await (await crashlytics()).setCustomKey(safeKeys({ view })[0]); } catch (e) { /* ignore */ }
}

/** Settings switch: turn collection on or off (applies fully from the next launch; unsent reports are dropped when off). */
export async function setCrashReporting(on) {
  if (!native()) return;
  enabled = !!on;
  try {
    const c = await crashlytics();
    await c.setEnabled({ enabled });
    if (!enabled) await c.deleteUnsentReports();
  } catch (e) { /* ignore */ }
  if (enabled) await setKeys();
}

/** Theme key (system, light or dark) when Appearance changes. */
export async function crashTheme(theme) {
  if (!native() || base.theme === theme) return;
  base.theme = theme;
  if (enabled) await setKeys();
}

/**
 * Start-up: apply the setting, set the debugging keys and listen for uncaught errors.
 * ctx: { enabled, app_version, view, theme }; target defaults to window.
 */
export async function initCrash(ctx = {}, target = globalThis.window) {
  if (!native()) return false;
  base = { app_version: ctx.app_version, theme: ctx.theme, platform: Capacitor.getPlatform() };
  lastView = ctx.view || "";
  // Listeners stay attached; recordError checks the switch, so turning it on later works without a restart
  target?.addEventListener?.("error", e => { recordError(e?.error || e?.message); });
  target?.addEventListener?.("unhandledrejection", e => { recordError(e?.reason); });
  await setCrashReporting(ctx.enabled === true); // opt-in: anything but true is off
  return enabled;
}

async function setKeys() {
  try {
    const c = await crashlytics();
    for (const kv of safeKeys({ ...base, view: lastView })) await c.setCustomKey(kv);
  } catch (e) { /* ignore */ }
}

/** Tests only. */
export function _resetCrash() { plugin = null; enabled = false; sent = 0; lastView = ""; base = {}; seen.clear(); }
