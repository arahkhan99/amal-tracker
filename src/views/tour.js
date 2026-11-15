/* The Home tour: coach marks shown once after setup (and again from Settings → Help & tour → Replay).
   Steps come from guide.tourSteps (hidden tabs and features are left out). The overlay sits in #phone,
   outside the views, so Home's redraws never remove it; the page behind is inert while it shows. */
import { S, UI, A, $, onRender, commit } from "../app.js";
import { GUIDE as G } from "../strings.js";
import { esc } from "../util.js";
import { tourSteps, tourDue, endTour } from "../guide.js";
import { isOn } from "../features.js";

let steps = null, idx = 0, el = null, returnFocus = null, starting = false;

const TEXT = {
  prayer: s => [G.prayerT, s.variant === "today" ? G.prayerAltP : G.prayerP],
  status: () => [G.statusT, G.statusP({ excused: S.settings.excusedDays !== false, sunnah: isOn(S, "sunnah") })],
  deeds: () => [G.deedsT, esc(G.deedsP)],
  tools: () => [G.toolsT, esc(G.toolsP)],
  progress: () => [G.progressT, esc(G.progressP)],
  tracker: s => s.variant === "makeups" ? [G.trackerT, G.trackerP] : [G.trackerOnlyT, G.trackerOnlyP],
};

const dots = (n, of) => `<span class="tour-dots" role="img" aria-label="${esc(G.stepOf(n, of))}">${Array.from({ length: of }, (_, i) => `<i class="${i + 1 === n ? "on" : i + 1 < n ? "past" : ""}"></i>`).join("")}</span>`;

/* ---------- geometry (relative to #phone) ---------- */
function rel(r, pad = 0) {
  const ph = $("#phone").getBoundingClientRect();
  return { x: r.left - ph.left - pad, y: r.top - ph.top - pad, w: r.width + pad * 2, h: r.height + pad * 2 };
}
/** Keep a hole on screen: 5px from every edge (from the mockup's edge-case fixes). */
function clampHole(r, W, H) {
  const x2 = Math.min(W - 5, r.x + r.w), y2 = Math.min(H - 5, r.y + r.h);
  r.x = Math.max(5, r.x); r.y = Math.max(5, r.y);
  r.w = Math.max(0, x2 - r.x); r.h = Math.max(0, y2 - r.y);
  return r;
}
/** The holes for a step: [{ x, y, w, h, rad }], or null when its target isn't on screen. */
function holesFor(step) {
  const q = s => $(s);
  if (step.target === "now") { const e = q("#v-home .z-nowB"); return e && [{ ...rel(e.getBoundingClientRect(), 6), rad: 18 }]; }
  if (step.target === "dots") { const e = q("#v-home .z-nowB .z-sq"); return e && [{ ...rel(e.getBoundingClientRect(), 6), rad: 18 }]; }
  if (step.target === "today") { const e = q("#v-home .z-meters .z-mt"); return e && [{ ...rel(e.getBoundingClientRect(), 6), rad: 18 }]; }
  if (step.target === "deeds") {
    const sec = q('#v-home [data-tour="deeds"]'); if (!sec) return null;
    const ph = $("#phone").getBoundingClientRect(), h2 = sec.querySelector("h2"), card = sec.querySelector(".z-card") || sec;
    const a = h2.getBoundingClientRect(), c = card.getBoundingClientRect(), nav = $("#nav");
    const navTop = nav && !nav.hidden ? nav.getBoundingClientRect().top : ph.bottom;
    const y = a.top - ph.top - 16, bottom = Math.min(c.bottom - 8, navTop - 10) - ph.top;
    return [{ x: 10, y, w: ph.width - 20, h: bottom - y, rad: 18 }];
  }
  if (step.target === "tab") {
    const out = step.tabs.map(t => q(`#nav [data-v="${t}"]`)).filter(Boolean).map(e => { const r = rel(e.getBoundingClientRect(), 3); r.y -= 3; r.h += 6; return { ...r, rad: 16 }; });
    return out.length ? out : null;
  }
  return null;
}
const rrect = ({ x, y, w, h, rad }) => {
  const r = Math.max(0, Math.min(rad, w / 2, h / 2));
  return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
};

/* ---------- drawing ---------- */
function scrollFor(step) {
  const scr = $("#screen");
  if (step.target === "deeds") {
    const sec = $('#v-home [data-tour="deeds"]');
    if (sec) { const top = sec.getBoundingClientRect().top - scr.getBoundingClientRect().top + scr.scrollTop; scr.scrollTop = Math.max(0, top - 270); return; }
  }
  scr.scrollTop = 0;
}

function draw() {
  const step = steps[idx], n = idx + 1, of = steps.length;
  if (step.id === "finish") {
    el.className = "tour fin";
    el.setAttribute("aria-labelledby", "tourT"); el.setAttribute("aria-describedby", "tourP");
    el.innerHTML = `<div class="tour-card" tabindex="-1"><img class="tour-logo" src="logo/zad-symbol@2x.png" alt="" width="46" height="58"><h3 id="tourT">${esc(G.finishT)}</h3><p id="tourP">${esc(G.finishP)}</p>${dots(n, of)}<button type="button" class="tour-start" onclick="A.tourEnd()">${esc(G.start)}</button></div>`;
    el.querySelector(".tour-card").focus({ preventScroll: true }); // the dialog itself: read as title + text, Tab reaches Start
    return;
  }
  const [title, html] = TEXT[step.id](step);
  el.className = "tour";
  el.setAttribute("aria-labelledby", "tourT"); el.setAttribute("aria-describedby", "tourP");
  el.innerHTML = `<svg class="tour-dim" aria-hidden="true"><path fill-rule="evenodd" d=""/></svg><div class="tour-rings"></div>
    <div class="tour-tip" tabindex="-1"><i class="tour-arrow"></i><h3 id="tourT">${esc(title)}</h3><p id="tourP">${html}</p>
    <div class="tour-ft"><button type="button" class="tour-skip" onclick="A.tourEnd()">${esc(G.skip)}</button>${dots(n, of)}<button type="button" class="tour-next" onclick="A.tourNext()">${esc(G.next)}</button></div></div>`;
  if (!place()) { A.tourNext(); return; }
  el.querySelector(".tour-tip").focus({ preventScroll: true }); // the dialog itself: read as title + text, Tab reaches the buttons
}

/** Position the dim, rings and tip for the current step. False when the target is missing. */
function place() {
  if (!el || !steps) return false;
  const step = steps[idx];
  if (step.id === "finish") return true;
  const ph = $("#phone").getBoundingClientRect(), W = ph.width, H = ph.height;
  const raw = holesFor(step);
  if (!raw) return false;
  const holes = raw.map(r => clampHole(r, W, H)).filter(r => r.w > 0 && r.h > 0);
  if (!holes.length) return false;
  const svg = el.querySelector(".tour-dim");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.querySelector("path").setAttribute("d", `M0 0H${W}V${H}H0Z` + holes.map(rrect).join(""));
  el.querySelector(".tour-rings").innerHTML = holes.map(r => `<div class="tour-hole" style="left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;border-radius:${r.rad}px"></div>`).join("");
  // tip: below or above the holes, whichever fits (prefer the side with more room); never off screen
  const tip = el.querySelector(".tour-tip"), th = tip.offsetHeight;
  const top = Math.min(...holes.map(r => r.y)), bot = Math.max(...holes.map(r => r.y + r.h));
  const fitsBelow = bot + 16 + th <= H - 8, fitsAbove = top - 16 - th >= 8;
  const preferBelow = (top + bot) / 2 < H / 2;
  let side = preferBelow ? (fitsBelow ? "below" : fitsAbove ? "above" : "") : (fitsAbove ? "above" : fitsBelow ? "below" : "");
  let y = side === "below" ? bot + 16 : side === "above" ? top - 16 - th : (preferBelow ? H - th - 8 : 8);
  y = Math.max(8, Math.min(H - th - 8, y));
  tip.classList.remove("below", "above", "flat");
  tip.classList.add(side || "flat");
  tip.style.top = `${Math.round(y)}px`; tip.style.bottom = "auto";
  const h0 = holes[0], cx = Math.max(40, Math.min(W - 40, h0.x + h0.w / 2)) - 18;
  el.querySelector(".tour-arrow").style.left = `${Math.round(cx - 7)}px`;
  return true;
}

/* ---------- flow ---------- */
function start() {
  starting = false;
  if (steps || UI.view !== "home" || !tourDue(S) || $("#scrim").classList.contains("on") || !$("#lock").hidden) return;
  const hasDots = !!$("#v-home .z-nowB .z-sq");
  steps = tourSteps(S, { hasDots }); idx = 0;
  returnFocus = document.activeElement;
  el = document.createElement("div");
  el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true");
  el.addEventListener("keydown", onKey);
  $("#phone").appendChild(el);
  $("#screen").inert = $("#nav").inert = true;
  scrollFor(steps[0]);
  draw();
}
function onKey(e) {
  if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); A.tourEnd(); return; }
  if (e.key !== "Tab") return;
  const f = [...el.querySelectorAll("button")];
  if (!f.length) return;
  const i = f.indexOf(document.activeElement);
  e.preventDefault();
  f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
}
A.tourNext = () => {
  if (!steps) return;
  if (idx >= steps.length - 1) { A.tourEnd(); return; }
  idx++;
  scrollFor(steps[idx]);
  draw();
};
/** Skip, Start, Escape and the Android back button all end it: it never shows again until Replay. */
A.tourEnd = () => {
  if (!steps) return;
  steps = null;
  el?.remove(); el = null;
  $("#screen").inert = $("#nav").inert = false;
  $("#screen").scrollTop = 0;
  endTour(S);
  commit();
  const back = returnFocus && document.contains(returnFocus) && returnFocus !== document.body ? returnFocus : null;
  (back || $("#nav button.on") || $("#v-home button"))?.focus({ preventScroll: true });
  returnFocus = null;
};
A.tourActive = () => !!steps;

onRender(() => {
  if (steps) {
    if (UI.view !== "home") A.tourEnd(); else place();
    return;
  }
  if (!starting && UI.view === "home" && tourDue(S)) { starting = true; setTimeout(start, 450); }
});
addEventListener("resize", () => { if (steps) place(); });
