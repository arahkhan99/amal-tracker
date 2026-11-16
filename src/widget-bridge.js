/*
 * Bridge to the home-screen widgets (native plugin "ZadWidgets", see docs/build/widgets.md).
 * - After every redraw (app.js onRender, which also runs after each commit / cloud merge), write the
 *   widget snapshot to shared storage, but only when it changed. The native side then refreshes the widgets.
 * - Open the right sheet for zad:// links from a widget tap (log sheet, Today, or a tab).
 * On the web nothing here runs.
 */
import { registerPlugin } from "@capacitor/core";
import { S, A, NOW, onRender, go, todayKey } from "./app.js";
import { isNative } from "./platform.js";
import { navTabs } from "./features.js";
import { buildSnapshot, serializeSnapshot, snapshotInputSig, linkDeduper, parseDeepLink } from "./widgets.js";

const ZadWidgets = registerPlugin("ZadWidgets");

let lastSig = "", lastInput = "", timer = null;
function pushSnapshot() {
  timer = null;
  if (!S.profile?.onboarded) return;
  try {
    // Most redraws (the 20 s tick, view switches) change nothing the snapshot reads: skip building it
    const now = NOW(), input = snapshotInputSig(S, now);
    if (input === lastInput) return;
    lastInput = input;
    const { json, sig } = serializeSnapshot(buildSnapshot(S, now));
    if (sig === lastSig) return;
    lastSig = sig;
    ZadWidgets.setSnapshot({ json }).catch(e => { lastSig = ""; lastInput = ""; console.warn("widgets", e); });
  } catch (e) { lastInput = ""; console.warn("widgets", e); }
}
/** Coalesce bursts of redraws into one write. */
function schedule() { if (!timer) timer = setTimeout(pushSnapshot, 400); }

// A cold start delivers the widget's URL twice (appUrlOpen and App.getLaunchUrl): handle it once
const firstTime = linkDeduper(2000);
function handleUrl(url) {
  if (!firstTime(url)) return;
  const link = parseDeepLink(url);
  if (!link || !S.profile?.onboarded) return;
  if (link.kind === "open") {
    go(navTabs(S).some(t => t.id === link.view) ? link.view : "home");
    return;
  }
  go("home");
  if (link.kind === "today") { A.todaySheet?.(); return; }
  // Never open a future day's sheet (a stale widget could ask for one); fall back to Today
  if (link.date > todayKey()) { A.todaySheet?.(); return; }
  A.prayerSheet?.(link.p, link.date);
}

export async function initWidgets() {
  if (!isNative()) return;
  onRender(schedule);
  schedule();
  try {
    const { App } = await import("@capacitor/app");
    App.addListener("appUrlOpen", e => handleUrl(e.url));
    const launch = await App.getLaunchUrl();
    if (launch?.url) handleUrl(launch.url);
  } catch (e) { console.warn("widgets", e); }
}
