/* Shared app state and UI helpers (sheet, toast, routing). */
import * as store from "./store.js";
import { reschedule } from "./notify.js";
import { dkey } from "./util.js";

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

/** Persist, refresh reminders and redraw. */
export function commit() {
  store.save(S);
  reschedule(S);
  render();
}

/** Replace the whole state object's contents (restore / reset). */
export function replaceState(next) {
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, next);
  commit();
}

export function go(v) {
  UI.view = v;
  $$(".view").forEach(e => e.classList.toggle("on", e.id === "v-" + v));
  $$("#nav button").forEach(b => b.classList.toggle("on", b.dataset.v === v));
  $("#nav").hidden = v === "onboard";
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
