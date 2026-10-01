/* Shared app state and UI helpers (sheet, toast, routing). */
import * as store from "./store.js";
import { reschedule } from "./notify.js";
import { dkey } from "./util.js";
import { setStatusBar } from "./platform.js";

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

export function go(v) {
  UI.view = v;
  $$(".view").forEach(e => e.classList.toggle("on", e.id === "v-" + v));
  $$("#nav button").forEach(b => b.classList.toggle("on", b.dataset.v === v));
  $("#nav").hidden = v === "onboard";
  $("#phone").dataset.view = v;
  setStatusBar(v === "home" || v === "onboard");
  $("#screen").scrollTop = 0;
  render();
}
A.go = go;

export function toast(m) {
  const t = $("#toast");
  t.textContent = m; t.classList.add("on");
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("on"), 1800);
}

export function openSheet(html) { $("#sheet").innerHTML = '<div class="grab"></div>' + html; $("#scrim").classList.add("on"); }
export function closeSheet() { $("#scrim").classList.remove("on"); }
A.closeSheet = closeSheet;
