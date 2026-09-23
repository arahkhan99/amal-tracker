import "@fontsource/amiri/400.css";
import "@fontsource/amiri/700.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "./styles.css";

import { S, UI, A, $, $$, go, render, tick, closeSheet } from "./app.js";
import { reschedule } from "./notify.js";
import { isNative, authenticate, onBackButton, setStatusBar } from "./platform.js";
import "./views/home.js";
import "./views/tracker.js";
import "./views/qada.js";
import "./views/progress.js";
import "./views/settings.js";
import { startOnboarding } from "./views/onboarding.js";

$$("#nav button").forEach(b => (b.onclick = () => go(b.dataset.v)));
$("#scrim").onclick = e => { if (e.target.id === "scrim") closeSheet(); };

onBackButton(() => {
  if ($("#scrim").classList.contains("on")) { closeSheet(); return true; }
  if (UI.view !== "home" && UI.view !== "onboard") { go("home"); return true; }
  return false;
});

// Keep the countdown live and roll over at midnight
setInterval(() => {
  const newDay = tick();
  if (newDay) { UI.trkDay = 0; UI.selDay = 0; reschedule(S); }
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
  tick(); render(); reschedule(S);
  if (Date.now() - hiddenAt > 30000) lockIfNeeded();
});

/* ---------- start ---------- */
if (S.profile.onboarded) go("home"); else startOnboarding();
lockIfNeeded();
reschedule(S);
// Capacitor injects the safe-area insets shortly after load; re-pick the status bar icon colour then
setTimeout(() => setStatusBar(UI.view === "home" || UI.view === "onboard"), 1500);

// Ask the browser not to evict our data under storage pressure
navigator.storage?.persist?.().catch(() => {});

if (!isNative() && "serviceWorker" in navigator) {
  import("virtual:pwa-register").then(({ registerSW }) => registerSW({ immediate: true })).catch(() => {});
}
