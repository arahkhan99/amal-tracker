import "@fontsource/amiri/400.css";
import "@fontsource/amiri/700.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "./styles.css";
import "./css/theme.css";
import "./css/onboarding.css";
import "./css/home.css";
import "./css/today.css";
import "./css/progress.css";
import "./css/settings.css";
import "./css/tour.css";
import "./css/gender.css";

import { S, UI, A, $, go, render, tick, closeSheet, commit, todayKey, toast, syncStatusBar } from "./app.js";
import { resolveView } from "./routes.js";
import { syncExcusedMode } from "./store.js";
import { reschedule } from "./notify.js";
import { isNative, authenticate, onBackButton, locationGranted, quietPosition, cityName } from "./platform.js";
import { checkTravel, heldToast } from "./travel.js";
import { isOn } from "./features.js";
import "./views/home.js";
import "./views/calendar.js";
import "./views/community.js";
import "./views/qada.js";
import "./views/progress.js";
import "./views/settings.js";
// Tools: registers the #v-tools renderer and the Home cards
import "./views/tools/index.js";
// Home tour (coach marks), after Home so its overlay finds the drawn cards
import "./views/tour.js";
// Send feedback / Report a mistake (one sheet, opened from Help & tour, the content sheets and the readers)
import "./views/feedback.js";
import "./css/feedback.css";
// Provisions & levels (off by default; nothing shows unless Settings → Features turns it on)
import { pvOnOpen } from "./views/provisions.js";
import "./css/provisions.css";
import { startOnboarding, showWhatsNew } from "./views/onboarding.js";
import { whatsNewDue } from "./views/whatsnew.js";
import { initCloud } from "./cloud.js";
import { initWidgets } from "./widget-bridge.js";
// One-tap logs from widgets, notifications and the Quick Settings tile (native queue, same canLog rules; src/pending.js)
import { mergePendingLogs } from "./pending.js";
import { initCrash, crashView, crashTheme } from "./crash.js";
import { onRender } from "./app.js";
import { APP_VERSION } from "./views/settings.js";
// Tablet and iPad layout (768px+); imported last so it comes after every view's CSS, tools.css included
import "./css/tablet.css";

// The bottom bar is built by app.js (renderNav, from features.navTabs); its buttons call A.go themselves.
$("#scrim").onclick = e => { if (e.target.id === "scrim") closeSheet(); };

// Keyboard: Escape closes an open sheet; Enter/Space activate non-button elements with role=button
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && $("#scrim").classList.contains("on")) { e.preventDefault(); closeSheet(); return; }
  const t = e.target;
  if ((e.key === "Enter" || e.key === " ") && t.getAttribute?.("role") === "button" && t.tagName !== "BUTTON") {
    e.preventDefault(); t.click();
  }
});

onBackButton(() => {
  if (A.tourActive?.()) { A.tourEnd(); return true; } // back skips the tour
  if (UI.view === "tools" && A.toolsBack?.()) return true; // closes a sheet, or steps back inside Tools
  if ($("#scrim").classList.contains("on")) { closeSheet(); return true; }
  if (UI.view === "settings" && A.settingsBack) { A.settingsBack(); return true; } // sub-page → Settings → where it was opened
  if (UI.view === "qada" && isOn(S, "progress")) { go("progress"); return true; } // Make-ups is pushed from Progress
  if (UI.view === "onboard") return !!A.obHardwareBack?.(); // one set-up step back
  if (UI.view !== "home") { go("home"); return true; }
  return false;
});

// Keep the countdown live and roll over at midnight
setInterval(() => {
  const newDay = tick();
  if (newDay) { if (syncExcusedMode(S, todayKey())) commit(); else reschedule(S); }
  if (!$("#scrim").classList.contains("on") || newDay) render();
}, 20000);

/* ---------- app lock (Android) ---------- */
let hiddenAt = 0;
// Toasts that must not show over the lock screen (travel's "Location updated") wait here until unlock
const afterUnlock = heldToast(() => !$("#lock").hidden, toast);
A.unlock = async () => {
  try { await authenticate(); $("#lock").hidden = true; afterUnlock.flush(); } catch (e) { /* stay locked */ }
};
function lockIfNeeded() {
  if (isNative() && S.settings.lock) { $("#lock").hidden = false; A.unlock(); }
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { hiddenAt = Date.now(); return; }
  mergePendingLogs(S);
  const newDay = tick();
  if (syncExcusedMode(S, todayKey())) commit(); else { render(); reschedule(S); }
  if (Date.now() - hiddenAt > 30000) { lockIfNeeded(); pvOnOpen(); }
  travelCheck();
});

/* ---------- travel: prayer times follow where you are (src/travel.js; throttled to once per 30 min) ---------- */
function travelCheck() {
  if (!S.profile.onboarded) return;
  // Its toast waits for unlock when the app lock is up (the check itself runs, so times are right on unlock)
  checkTravel(S, { locationGranted, quietPosition, cityName, commit, toast: afterUnlock.toast }).catch(() => {});
}

/* ---------- start ---------- */
// Crash reports (native only, opt-in: set-up step or Settings → Send crash reports; undefined = off). Keys: app version, view, platform, theme. Nothing personal.
initCrash({ enabled: S.settings.crashReports === true, app_version: APP_VERSION, view: UI.view, theme: S.settings.appearance || "system" });
onRender(() => { crashView(UI.view); crashTheme(S.settings.appearance || "system"); });
// If excused mode is on, flag every day from its start to today
if (syncExcusedMode(S, todayKey())) commit();
// A link to a place (#read, #calendar …; old names redirect: #tracker → calendar, #tools → Read) opens there
// Someone who used Zad before the redesign sees "What's new" once first (views/whatsnew.js); new users never do
if (S.profile.onboarded) { if (whatsNewDue(S)) showWhatsNew(startView()); else go(startView()); } else startOnboarding();
function startView() {
  const v = resolveView(location.hash);
  return v && v !== "onboard" ? v : "home";
}
addEventListener("hashchange", () => { const v = resolveView(location.hash); if (S.profile.onboarded && v && v !== "onboard" && v !== UI.view) go(v); });
lockIfNeeded();
pvOnOpen(); // the calm level-up sheet, once, if a new level was reached last time
reschedule(S);
travelCheck();
initCloud().then(render).catch(e => console.warn("cloud", e));
// Home-screen widgets: keep their snapshot current and open the log sheet from a widget tap
initWidgets();
mergePendingLogs(S);
// Capacitor injects the safe-area insets shortly after load; re-pick the status bar icon colour then
setTimeout(() => syncStatusBar({ force: true }), 1500);

// Ask the browser not to evict our data under storage pressure
navigator.storage?.persist?.().catch(() => {});

if (!isNative() && "serviceWorker" in navigator) {
  import("virtual:pwa-register").then(({ registerSW }) => registerSW({ immediate: true })).catch(() => {});
}
