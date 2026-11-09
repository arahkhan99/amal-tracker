/* Shared app state and UI helpers (sheet, toast, routing). */
import * as store from "./store.js";
import { reschedule } from "./notify.js";
import { dkey } from "./util.js";
import { setStatusBar } from "./platform.js";
import { navTabs } from "./features.js";
import { NAV } from "./strings.js";

export const S = store.load();
export const UI = { view: "home", range: "day", selDay: 0, trkDay: 0 };
export const A = (window.A = {}); // actions callable from inline handlers

let now = new Date();
export const NOW = () => now;
export const tick = () => { const was = dkey(now); now = new Date(); return was !== dkey(now); };
export const todayKey = () => dkey(now);

export const $ = s => document.querySelector(s);
export const $$ = s => document.querySelectorAll(s);

const renderers = [];
export function onRender(fn) { renderers.push(fn); }
export function render() { for (const r of renderers) r(); }

const commitHooks = [];
/** Run after every user change (cloud sync listens here). */
export function onCommit(fn) { commitHooks.push(fn); }

/** A change saved without a redraw (tool counters, reading position): only tell the listeners (cloud sync). */
export function touched() { for (const h of commitHooks) h(); }

/** Persist, refresh reminders and redraw. */
export function commit() {
  S.updatedAt = Date.now();
  store.save(S);
  reschedule(S);
  render();
  for (const h of commitHooks) h();
}

/** Replace the whole state object's contents (restore / reset). */
export function replaceState(next) {
  applyState(next);
  commit();
}

/** Swap in a new state without counting it as a user change (used when merging the cloud copy). */
export function applyState(next) {
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, next);
  store.save(S);
  reschedule(S);
  render();
}

/* ---------- appearance: S.settings.appearance = "system" | "light" | "dark" ---------- */
const darkQuery = typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: dark)") : null;
export const systemIsDark = () => !!darkQuery?.matches;
export function resolvedTheme() {
  const a = S.settings.appearance || "system";
  return a === "dark" || (a === "system" && systemIsDark()) ? "dark" : "light";
}
export function applyTheme() {
  const t = resolvedTheme();
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t === "dark" ? "#0C1613" : "#0F3D2E");
}
darkQuery?.addEventListener?.("change", () => { applyTheme(); render(); });

/* ---------- bottom bar N2 (tabs come from features.navTabs) ---------- */
// Outline icons (IC-O). The active tab fills in (see theme.css).
const NAV_ICON = {
  home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  tracker: '<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 9h18M8 2v4M16 2v4"/>',
  tools: '<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><path d="M17.25 13.5v7.5M13.5 17.25H21"/>',
  qada: '<path d="M12 3a9 9 0 1 0 9 9"/><path d="M12 7v5l3 2"/><path d="M21 3v6h-6"/>',
  progress: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
};
let navSig = "";
function renderNav() {
  const tabs = navTabs(S);
  const sig = tabs.map(t => t.id).join() + "|" + UI.view;
  if (sig === navSig) return;
  navSig = sig;
  $("#nav").innerHTML = tabs.map(t => `<button type="button" data-v="${t.id}" class="${t.id === UI.view ? "on" : ""}"${t.id === UI.view ? ' aria-current="page"' : ""} onclick="A.go('${t.id}')"><svg viewBox="0 0 24 24" aria-hidden="true">${NAV_ICON[t.id]}</svg>${NAV[t.id] || t.label}</button>`).join("");
}
onRender(() => { applyTheme(); renderNav(); });

export function go(v) {
  UI.view = v;
  $$(".view").forEach(e => e.classList.toggle("on", e.id === "v-" + v));
  $("#nav").hidden = v === "onboard";
  $("#phone").dataset.view = v;
  setStatusBar(v === "home" || v === "onboard");
  $("#screen").scrollTop = 0;
  render();
}
A.go = go;

/**
 * Show a short message. Pass { undo: fn } to add an Undo button (shown longer, 5 s);
 * tapping it runs fn once and hides the toast.
 */
export function toast(m, { undo } = {}) {
  const t = $("#toast");
  t.textContent = m;
  if (undo) {
    const b = document.createElement("button");
    b.className = "toast-undo"; b.type = "button"; b.textContent = "Undo";
    b.onclick = () => { t.classList.remove("on"); clearTimeout(t._h); undo(); };
    t.append(" ", b);
  }
  t.classList.toggle("has-undo", !!undo);
  t.classList.add("on");
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("on"), undo ? 5000 : 1800);
}

/* Sheets act as modal dialogs: focus moves into them, the page behind is inert, and focus
   returns to where it was on close. Redrawing an open sheet keeps focus on the same control. */
const FOCUSABLE = "button:not([disabled]),input,select,textarea,a[href],[tabindex]:not([tabindex='-1'])";
let returnFocus = null;
export function openSheet(html) {
  const sheet = $("#sheet"), wasOpen = $("#scrim").classList.contains("on");
  const prev = wasOpen ? [...sheet.querySelectorAll(FOCUSABLE)].indexOf(document.activeElement) : -1;
  if (!wasOpen) returnFocus = document.activeElement;
  sheet.innerHTML = '<div class="grab"></div>' + html;
  sheet.setAttribute("aria-label", sheet.querySelector("h3")?.textContent.trim() || "Dialog");
  $("#scrim").classList.add("on");
  $("#screen").inert = $("#nav").inert = true;
  const again = prev >= 0 && sheet.querySelectorAll(FOCUSABLE)[prev];
  (again || sheet).focus({ preventScroll: true });
}
export function closeSheet() {
  if (!$("#scrim").classList.contains("on")) return;
  $("#scrim").classList.remove("on");
  $("#screen").inert = $("#nav").inert = false;
  if (returnFocus && document.contains(returnFocus) && !$("#lock").contains(returnFocus)) returnFocus.focus({ preventScroll: true });
  returnFocus = null;
}
A.closeSheet = closeSheet;
applyTheme();

/* ---------- glossary explainers ("?" / ⓘ next to an Arabic term) ---------- */
import { gloss } from "./glossary.js";
import { APP as APP_STR, COMMON } from "./strings.js";
const escH = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
/** Small ⓘ button that opens the explainer for a glossary id. Put it next to the term. */
export function glossBtn(id) {
  const g = gloss(id);
  return g ? `<button type="button" class="info-btn" aria-label="${escH(COMMON.whatDoesThisMean)}: ${escH(g.term)}" onclick="event.stopPropagation();A.gloss('${id}')"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.01"/></svg></button>` : "";
}
A.gloss = id => {
  const g = gloss(id); if (!g) return;
  openSheet(`<h3>${escH(g.term)} <span class="gl-ar" lang="ar" dir="rtl">${escH(g.ar)}</span></h3><p class="gl-body">${escH(g.meaning)}</p>${g.draft ? `<p class="gl-draft">${escH(APP_STR.draftFlag)}</p>` : ""}
    <div class="cta"><button class="btn primary" onclick="A.closeSheet()">${escH(COMMON.gotIt)}</button></div>`);
};
