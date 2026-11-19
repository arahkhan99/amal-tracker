/* The Qibla page as a route (#qibla, view "qibla"): a full page with no tab bar, opened from the "Qibla 119°" button
   on the Now card and from Settings → Qibla finder. Back returns to where it was opened. The page itself (markup,
   sensors) is views/qibla.js; the maths src/qibla.js; styles css/qibla.css. The sensors run only while the page
   is showing: leaving it calls unmountQibla(). */
import { S, UI, A, onRender, go } from "../app.js";
import { qiblaView, mountQibla, unmountQibla } from "./qibla.js";
import { qiblaFor } from "../qibla.js";

let mounted = "";

/** Open the Qibla page; back returns to the current view. */
A.openQibla = () => {
  if (UI.view !== "qibla") UI.qiblaFrom = UI.view;
  go("qibla");
};
A.closeQibla = () => go(UI.qiblaFrom && UI.qiblaFrom !== "qibla" ? UI.qiblaFrom : "home");
/** "Change" / "Set location" on the Qibla page: the app's location sheet (views/settings.js). */
A.openLocation = () => A.locationSheet?.();

/** The Qibla bearing from the saved location, rounded (null when no location is set). */
export function qiblaDegrees(location = S.settings.location) {
  const q = qiblaFor(location);
  return q && !q.atKaaba ? Math.round(q.bearing) % 360 : null;
}

function renderQibla() {
  const el = document.getElementById("v-qibla");
  if (!el) return;
  if (UI.view !== "qibla") {
    if (mounted) { unmountQibla(); el.innerHTML = ""; mounted = ""; }
    return;
  }
  // Redraw only when the location changed (the 20 s tick and other redraws leave the live dial alone)
  const loc = S.settings.location;
  const sig = loc ? `${loc.lat},${loc.lng},${loc.label || ""}` : "none";
  if (sig === mounted) return;
  if (mounted) unmountQibla();
  el.innerHTML = qiblaView(loc);
  mountQibla(el, { onBack: A.closeQibla });
  mounted = sig;
}
onRender(renderQibla);
