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
import { buildSnapshot, serializeSnapshot, parseDeepLink } from "./widgets.js";

const ZadWidgets = registerPlugin("ZadWidgets");

let lastSig = "", timer = null;
function pushSnapshot() {
  timer = null;
  if (!S.profile?.onboarded) return;
  try {
    const { json, sig } = serializeSnapshot(buildSnapshot(S, NOW()));
    if (sig === lastSig) return;
    lastSig = sig;
    ZadWidgets.setSnapshot({ json }).catch(e => { lastSig = ""; console.warn("widgets", e); });
  } catch (e) { console.warn("widgets", e); }
}
/** Coalesce bursts of redraws into one write. */
function schedule() { if (!timer) timer = setTimeout(pushSnapshot, 400); }

function handleUrl(url) {
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
