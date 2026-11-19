/* Shared app state and UI helpers (sheet, toast, routing). */
import * as store from "./store.js";
import { reschedule } from "./notify.js";
import { dkey } from "./util.js";
import { setStatusBar } from "./platform.js";
import { navTabs, isOn } from "./features.js";
import { resolveView, routeName, tabFor, landing } from "./routes.js";
import { NAV } from "./strings.js";
import { applyScales } from "./appearance.js";

export const S = store.load();
export const UI = { view: "home", range: "day", selDay: 0, trkDay: 0, lastView: "home", todayCh: 0, progressCh: "" };
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

/**
 * A change saved without a redraw (tool counters, reading position): only tell the listeners (cloud sync).
 * Only for S.tools / reader prefs: anything that changes the log, settings or make-ups goes through commit().
 */
export function touched() { for (const h of commitHooks) h(); }

// Bumped by commit() and applyState() (not touched()), so a view can reuse work done for the same state
// (views/provisions.js keeps the provisions count until the log or settings change).
let rev = 0;
export const revision = () => rev;

/** Persist, refresh reminders and redraw. */
export function commit() {
  rev++;
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
  rev++;
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
  applyScales(S); // Settings → Appearance: text size and Arabic text size (--ui-scale, --ar-scale)
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t === "dark" ? "#16221C" : "#F8F4EA");
}
darkQuery?.addEventListener?.("change", () => { applyTheme(); render(); });
/** Light status-bar icons on dark backdrops: every view in dark mode (the redesign has no forest Home hero, and
 *  set-up follows the theme too). */
let sbSig = "";
/** Pick the status-bar icon colour for the current view and theme. force: set it again even if unchanged
 *  (main.js does this once after start-up, when Capacitor has injected the safe-area insets). */
export function syncStatusBar({ force = false } = {}) {
  const dark = resolvedTheme() === "dark";
  if (!force && String(dark) === sbSig) return;
  sbSig = String(dark);
  setStatusBar(dark);
}

/* ---------- bottom bar: Today · Read · Progress (+ Community with Zad Plus); tabs come from features.navTabs ---------- */
// Outline icons. The active tab is drawn in the accent colour.
const NAV_ICON = {
  home: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2.5 12h2M19.5 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  tools: '<path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5z"/><path d="M12 6.5v13"/>',
  progress: '<path d="M5 20V11M12 20V5M19 20v-6"/>',
  community: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2a5 5 0 0 1 5.5 5.8"/>',
};
let navSig = "";
/** Views without the bottom bar: set-up, and Settings (a full page with its own back). */
const NO_NAV = ["onboard", "settings"];
function renderNav() {
  const tabs = navTabs(S), on = tabFor(UI.view);
  // With one tab only (prayers only) there is no tab bar at all. A reader (Read) hides it too (UI.navHidden).
  const hide = NO_NAV.includes(UI.view) || tabs.length < 2 || !!UI.navHidden;
  $("#nav").hidden = hide;
  $("#phone").dataset.nav = hide ? "off" : "on";
  const sig = tabs.map(t => t.id).join() + "|" + on;
  if (sig === navSig) return;
  navSig = sig;
  $("#nav").innerHTML = tabs.map(t => `<button type="button" data-v="${t.id}" class="${t.id === on ? "on" : ""}"${t.id === on ? ' aria-current="page"' : ""} onclick="A.tab('${t.id}')"><svg viewBox="0 0 24 24" aria-hidden="true">${NAV_ICON[t.id]}</svg>${NAV[t.id] || t.label}</button>`).join("");
}
onRender(() => { applyTheme(); syncStatusBar(); renderNav(); });
A.syncNav = renderNav;

/** A bottom-bar tab. Progress opens Make-ups when Progress itself is off. */
A.tab = id => go(id === "progress" && !isOn(S, "progress") ? "qada" : id);

/**
 * Show a view. Takes a view id or a route name; old names redirect (routes.js): "tracker" opens the calendar,
 * "tools" / "read" the Read tab, "home" / "today" the Today tab. Unknown names go to Today.
 * The address bar follows (#today, #read …) without adding history entries.
 */
export function go(v) {
  v = resolveView(v) || "home";
  // Make-ups is a chapter of Progress while Progress is on: #makeups, #qada and old links land there
  const land = landing(v, S);
  if (land.chapter) { v = land.view; UI.progressCh = land.chapter; }
  if (v !== "settings" && v !== "onboard") UI.lastView = v; // where Settings goes back to
  if (v !== "tools") UI.navHidden = false; // a reader in Read hides the bar while it is open
  UI.view = v;
  $$(".view").forEach(e => e.classList.toggle("on", e.id === "v-" + v));
  $("#phone").dataset.view = v;
  syncStatusBar();
  $("#screen").scrollTop = 0;
  const name = routeName(v);
  try { if (name && location.hash !== "#" + name) history.replaceState(null, "", "#" + name); } catch (e) { /* file: or sandboxed */ }
  render();
}
A.go = go;
/** Settings, from the initial at the top right. Back returns to where it was opened. */
A.openSettings = () => go("settings");
A.settingsDone = () => go(UI.lastView || "home");

/** The initial at the top right of every tab: it opens Settings. extra: HTML placed before it (the Lv chip). */
export function avatarBtn(extra = "") {
  const n = (S.profile?.name || "").trim();
  const ch = (n ? [...n][0] : "Z").toUpperCase();
  return `<div class="zt-tr">${extra}<button type="button" class="zt-av" aria-label="${NAV.settings}" onclick="A.openSettings()">${escH(ch)}</button></div>`;
}

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
