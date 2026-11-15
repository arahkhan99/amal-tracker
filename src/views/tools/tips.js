/* One-time tool tips (Adhkār, Qurʾān, Hizb): a gold note the first time a tool opens, gone after "Got it".
   Seen flags live in S.settings.help.tips (guide.js), so they sync; Replay the tour brings them back. */
import { S, A, persist } from "./core.js";
import { tipDue, dismissTip } from "../../guide.js";
import { GUIDE as G } from "../../strings.js";

const ICON = {
  adhkar: '<path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10m0-1.5a1.5 1.5 0 0 1 3 0V11m0-1a1.5 1.5 0 0 1 3 0v5a6 6 0 0 1-6 6h-1.5a5 5 0 0 1-4-2L4 15.5a1.5 1.5 0 0 1 2.5-1.5L9 16"/>',
  quran: '<path d="M4 12h12M12 8l4 4-4 4"/><path d="M20 5v14"/>',
  hizb: '<path d="M6 4h12v17l-6-4-6 4z"/>',
};
const TEXT = { adhkar: G.tipAdhkar, quran: G.tipQuran, hizb: G.tipHizb }; // HTML from strings.js

/** The tip's HTML, or "" once it has been dismissed. cls: "float" (Qurʾān, over the page) | "hz" (Hizb reader). */
export function toolTip(tool, cls = "") {
  if (!tipDue(S, tool)) return "";
  return `<div class="tl-tip ${cls}" role="note" data-tip="${tool}"><span class="tl-tip-ic"><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[tool]}</svg></span><div class="tl-tip-b"><p>${TEXT[tool]}</p><button type="button" class="tl-tip-btn" onclick="event.stopPropagation();A.tipGot('${tool}')">${G.gotIt}</button></div></div>`;
}

/** Got it: remember it (synced) and remove the note without redrawing, so the reader keeps its place. */
A.tipGot = tool => {
  dismissTip(S, tool);
  persist();
  const el = document.querySelector(`[data-tip="${tool}"]`);
  if (el?.contains(document.activeElement)) document.querySelector("#v-tools .aa, #v-tools .tl-back, #v-tools .tl-hbtn")?.focus({ preventScroll: true });
  el?.remove();
};

/** The Qurʾān reader is full-screen, so its tip floats over the page inside #phone (added and removed by the Tools draw). */
export function syncFloatTip(on) {
  const ph = document.querySelector("#phone"); if (!ph) return;
  const el = ph.querySelector('.tl-tip.float[data-tip="quran"]');
  if (on && tipDue(S, "quran")) {
    if (!el) ph.insertAdjacentHTML("beforeend", toolTip("quran", "float"));
    document.querySelector("#qhint")?.classList.add("gone"); // the tip already says "tap the page"
  } else el?.remove();
}
