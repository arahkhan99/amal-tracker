/*
 * Haptics (polish pass, 25 Nov 2026), through @capacitor/haptics so they work on iPhone too (navigator.vibrate does
 * nothing there, and buzzes coarsely on Android).
 * - logged(): a prayer was logged. On time / made up: a light tap; congregation: a firmer one; the fifth prayer of
 *   the day prayed: a gentle "success". Missed and Clear: nothing.
 * - tick() / done(): a dhikr counter step, and reaching its count. tick(true) is the Qibla lining up.
 * On the web only the counters fall back to a short vibration (what they did before); everything else is silent.
 * Every call is fire-and-forget: a missing plugin or a refused call never gets in the way of the tap itself.
 */
import { isNative } from "./platform.js";
import { PRAYERS } from "./util.js";
import { prayerStatus } from "./store.js";

let plugin = null;
const load = () => (plugin ||= import("@capacitor/haptics").catch(() => null));
const PRAYED = ["congregation", "ontime", "madeup"];

function impact(style) {
  if (!isNative()) return;
  load().then(m => m?.Haptics.impact({ style: m.ImpactStyle[style] })).catch(() => {});
}
function success() {
  if (!isNative()) return;
  load().then(m => m?.Haptics.notification({ type: m.NotificationType.Success })).catch(() => {});
}
function buzz(ms) { try { navigator.vibrate?.(ms); } catch { /* not available */ } }

/** Which haptic a log gets: "success" | "medium" | "light" | null. Pure, for tests. */
export function logFeel(S, key, status) {
  if (!PRAYED.includes(status)) return null;
  if (PRAYERS.every(p => PRAYED.includes(prayerStatus(S, key, p)))) return "success";
  return status === "congregation" ? "medium" : "light";
}

/** Call after a prayer's status was saved. */
export function logged(S, key, status) {
  const f = logFeel(S, key, status);
  if (f === "success") success();
  else if (f === "medium") impact("Medium");
  else if (f === "light") impact("Light");
}

/** One step of a counter (adhkār, after-ṣalāh), or the Qibla lining up. */
export function tick(ms = 10) {
  if (isNative()) impact("Light"); else buzz(ms);
}

/** A counter reached its count. */
export function done(ms = 25) {
  if (isNative()) success(); else buzz(ms);
}
