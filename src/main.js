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
import "./css/progress.css";
import "./css/settings.css";

import { S, UI, A, $, go, render, tick, closeSheet, commit, todayKey } from "./app.js";
import { syncExcusedMode } from "./store.js";
import { reschedule } from "./notify.js";
import { isNative, authenticate, onBackButton, setStatusBar } from "./platform.js";
import "./views/home.js";
import "./views/tracker.js";
import "./views/qada.js";
import "./views/progress.js";
import "./views/settings.js";
// Tools: registers the #v-tools renderer and the Home cards
import "./views/tools/index.js";
import { startOnboarding } from "./views/onboarding.js";
import { initCloud } from "./cloud.js";

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
  if (UI.view === "tools" && A.toolsBack?.()) return true; // closes a sheet, or steps back inside Tools
  if ($("#scrim").classList.contains("on")) { closeSheet(); return true; }
  if (UI.view === "settings" && A.settingsBack) { A.settingsBack(); return true; } // sub-page → Settings (or back to Tools)
  if (UI.view !== "home" && UI.view !== "onboard") { go("home"); return true; }
  return false;
});

// Keep the countdown live and roll over at midnight
setInterval(() => {
  const newDay = tick();
  if (newDay) { UI.trkDay = 0; UI.selDay = 0; if (syncExcusedMode(S, todayKey())) commit(); else reschedule(S); }
  if (!$("#scrim").classList.contains("on") || newDay) render();
}, 20000);

/* ---------- app lock (Android) ---------- */
let hiddenAt = 0;
A.unlock = async () => {
  try { await authenticate(); $("#lock").hidden = true; } catch (e) { /* stay locked */ }
};
function lockIfNeeded() {
  if (isNative() && S.settings.lock) { $("#lock").hidden = false; A.unlock(); }
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { hiddenAt = Date.now(); return; }
  const newDay = tick();
  if (newDay) { UI.trkDay = 0; UI.selDay = 0; }
  if (syncExcusedMode(S, todayKey())) commit(); else { render(); reschedule(S); }
  if (Date.now() - hiddenAt > 30000) lockIfNeeded();
});

/* ---------- start ---------- */
// If excused mode is on, flag every day from its start to today
if (syncExcusedMode(S, todayKey())) commit();
if (S.profile.onboarded) go("home"); else startOnboarding();
lockIfNeeded();
reschedule(S);
initCloud().then(render).catch(e => console.warn("cloud", e));
// Capacitor injects the safe-area insets shortly after load; re-pick the status bar icon colour then
setTimeout(() => setStatusBar(UI.view === "home" || UI.view === "onboard"), 1500);

// Ask the browser not to evict our data under storage pressure
navigator.storage?.persist?.().catch(() => {});

if (!isNative() && "serviceWorker" in navigator) {
  import("virtual:pwa-register").then(({ registerSW }) => registerSW({ immediate: true })).catch(() => {});
}
