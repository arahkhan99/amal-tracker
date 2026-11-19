/*
 * Bridge to the home-screen widgets (native plugin "ZadWidgets", see docs/build/widgets.md).
 * - After every redraw (app.js onRender, which also runs after each commit / cloud merge), write the
 *   widget snapshot to shared storage, but only when it changed. The native side then refreshes the widgets,
 *   the Quick Settings tile and the optional ongoing "Now" notification.
 *   The snapshot (widgets.js buildSnapshot) carries the one-tap fields too: gender, excused, showTimesOnly,
 *   ongoingNow, lockDots (from S.profile.gender and S.settings.showTimesOnly / ongoingNow / lockDots).
 * - addTile(): the system prompt to add the Quick Settings tile (Android 13+).
 * - refreshWidgets() pushes at once (pending.js calls it after merging the one-tap queue, before clearing it).
 * - Open the right sheet for zad:// links from a widget tap (log sheet, Today, or a tab).
 * On the web nothing here runs.
 */
import { Capacitor, registerPlugin } from "@capacitor/core";
import { S, A, NOW, onRender, go, todayKey } from "./app.js";
import { isNative } from "./platform.js";
import { navTabs, isOn } from "./features.js";
import { resolveView, tabFor } from "./routes.js";
import { buildSnapshot, serializeSnapshot, snapshotInputSig, linkDeduper, parseDeepLink } from "./widgets.js";

const ZadWidgets = registerPlugin("ZadWidgets");

let lastSig = "", lastInput = "", timer = null;
/** Write the snapshot if it changed. Returns a promise that settles when the native side has it. */
function pushSnapshot() {
  timer = null;
  if (!S.profile?.onboarded) return Promise.resolve();
  try {
    // Most redraws (the 20 s tick, view switches) change nothing the snapshot reads: skip building it
    const now = NOW(), input = snapshotInputSig(S, now);
    if (input === lastInput) return Promise.resolve();
    lastInput = input;
    const { json, sig } = serializeSnapshot(buildSnapshot(S, now));
    if (sig === lastSig) return Promise.resolve();
    lastSig = sig;
    return ZadWidgets.setSnapshot({ json }).catch(e => { lastSig = ""; lastInput = ""; console.warn("widgets", e); });
  } catch (e) { lastInput = ""; console.warn("widgets", e); return Promise.resolve(); }
}
/** Coalesce bursts of redraws into one write. */
function schedule() { if (!timer) timer = setTimeout(pushSnapshot, 400); }

/** Push the snapshot now (skipping the 400 ms coalescing), e.g. right after merging one-tap logs. */
export async function refreshWidgets() {
  if (!isNative()) return;
  if (timer) { clearTimeout(timer); timer = null; }
  lastInput = ""; // NOW() may not have ticked since the last push: rebuild from S as it is
  await pushSnapshot();
}

/**
 * Ask Android to add the Quick Settings tile ("Log ʿAsr"), for the "Add" button in More → Widgets.
 * Resolves { added: true|false, result } on Android 13+ (the system prompt), { unsupported: true } on older Android
 * (show the help steps instead), and null on the web / iPhone.
 */
export async function addTile() {
  if (!isNative()) return null;
  if (Capacitor.getPlatform() !== "android") return null;
  try { return await ZadWidgets.requestAddTile(); } catch (e) { console.warn("widgets", e); return { added: false, error: true }; }
}

// A cold start delivers the widget's URL twice (appUrlOpen and App.getLaunchUrl): handle it once
const firstTime = linkDeduper(2000);
function handleUrl(url) {
  if (!firstTime(url)) return;
  const link = parseDeepLink(url);
  if (!link || !S.profile?.onboarded) return;
  if (link.kind === "open") {
    // Old names (tracker, qada, tools) redirect through routes.js; a view whose feature is off falls back to Today
    const v = resolveView(link.view);
    const ok = v === "calendar" || (v === "qada" ? isOn(S, "makeups") : !!v && navTabs(S).some(t => t.id === tabFor(v)));
    go(ok ? v : "home");
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
  // Redraw every placed widget with this version's layouts straight away (after an update the system may still
  // show what the previous version drew until the next boundary), then write the fresh snapshot.
  ZadWidgets.reload().catch(e => console.warn("widgets", e));
  schedule();
  try {
    const { App } = await import("@capacitor/app");
    App.addListener("appUrlOpen", e => handleUrl(e.url));
    const launch = await App.getLaunchUrl();
    if (launch?.url) handleUrl(launch.url);
  } catch (e) { console.warn("widgets", e); }
}
