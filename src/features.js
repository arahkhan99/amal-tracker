/*
 * Feature modules: what Zad helps with. Prayers is always on; every other module can be switched off,
 * and each tool can be hidden on its own. Turning something off only hides it: no data is deleted,
 * and Missed prayers still add to make-ups in the background.
 *
 * Stored in S.settings.features and S.settings.hiddenTools, so they persist with the rest of the
 * settings and sync through cloud.js with no change there (settings travel in users/{uid}).
 */
import { FEATURE, TOOL_NAME, TOOL_SUB, NAV } from "./strings.js";

/** Switchable modules, in Settings order. "prayers" is listed first but can't be switched off. */
export const FEATURES = ["prayers", "sunnah", "deeds", "makeups", "week", "progress", "tools"];
export const SWITCHABLE = FEATURES.filter(f => f !== "prayers");
/** Tools that can be hidden one by one. */
export const TOOLS = ["adhkar", "durud", "hizb", "quran"];

/** Every module on (the default for a new install and for anything missing in an older save). */
export function defaultFeatures() { return Object.fromEntries(SWITCHABLE.map(f => [f, true])); }

/** "Just prayers" preset from setup: everything off except the five prayers. */
export function justPrayersFeatures() { return Object.fromEntries(SWITCHABLE.map(f => [f, false])); }

/** Fill in missing modules (true) and drop non-booleans. Used by store.normalize. */
export function normalizeFeatures(f) {
  const out = defaultFeatures();
  if (f && typeof f === "object") for (const k of SWITCHABLE) if (typeof f[k] === "boolean") out[k] = f[k];
  // keep unknown keys from a newer app version (never drop fields)
  if (f && typeof f === "object") for (const [k, v] of Object.entries(f)) if (!(k in out)) out[k] = v;
  return out;
}

/** Whether a module is on. "prayers" is always true. */
export function isOn(S, f) {
  if (f === "prayers") return true;
  const v = S?.settings?.features?.[f];
  return v === undefined ? true : !!v;
}

/** Switch a module on or off. Returns false for "prayers" or an unknown module. Caller commits. */
export function setFeature(S, f, on) {
  if (!SWITCHABLE.includes(f)) return false;
  S.settings.features = { ...normalizeFeatures(S.settings.features), [f]: !!on };
  return true;
}

/** Apply a preset: "all" | "prayers" (Just prayers). */
export function applyPreset(S, preset) {
  S.settings.features = preset === "prayers" ? justPrayersFeatures() : defaultFeatures();
  if (preset !== "prayers") S.settings.hiddenTools = [];
}

/** Count of modules on, including Prayers: { on, of } (e.g. 7 of 7). */
export function featureCount(S) {
  return { on: FEATURES.filter(f => isOn(S, f)).length, of: FEATURES.length };
}

/** Whether one tool shows: the Tools module is on AND this tool isn't hidden. */
export function toolVisible(S, t) {
  return isOn(S, "tools") && !(S?.settings?.hiddenTools || []).includes(t);
}

/** Hide or show a single tool. Caller commits. */
export function setToolHidden(S, t, hidden) {
  if (!TOOLS.includes(t)) return false;
  const set = new Set(S.settings.hiddenTools || []);
  if (hidden) set.add(t); else set.delete(t);
  S.settings.hiddenTools = TOOLS.filter(x => set.has(x));
  return true;
}

/** The tools that show, in order. Empty when the Tools module is off. */
export function visibleTools(S) { return TOOLS.filter(t => toolVisible(S, t)); }

/**
 * Bottom-bar tabs, in order (view ids): home, tracker, tools?, qada?, progress?.
 * "Prayers only" gives two tabs: Home and Tracker. Labels: strings.NAV[id] (qada → "Make-ups").
 */
export function navTabs(S) {
  const tabs = ["home", "tracker"];
  if (isOn(S, "tools") && visibleTools(S).length) tabs.push("tools");
  if (isOn(S, "makeups")) tabs.push("qada");
  if (isOn(S, "progress")) tabs.push("progress");
  return tabs.map(id => ({ id, label: NAV[id] }));
}

/** Rows for the Features page: [{ id, name, sub, on, locked }]. */
export function featureRows(S) {
  return FEATURES.map(f => ({ id: f, name: FEATURE.names[f], sub: FEATURE.subs[f], on: isOn(S, f), locked: f === "prayers" }));
}

/** Rows for the Tools settings page: [{ id, name, sub, visible }]. */
export function toolRows(S) {
  return TOOLS.map(t => ({ id: t, name: TOOL_NAME[t], sub: TOOL_SUB[t], visible: !(S?.settings?.hiddenTools || []).includes(t) }));
}
