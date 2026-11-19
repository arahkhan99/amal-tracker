/*
 * Sub-tabs inside a chapter (19 Nov 2026: "sub-tabs inside Week, Charts and Make-ups"): a small segmented control
 * under the chapter head, so a chapter shows one section at a time instead of one long scroll.
 * - Only the chosen section is built, so a chapter costs less to draw, and nothing here runs during a swipe:
 *   the bar is plain HTML (no listeners on scroll), and a tap redraws only its own chapter (onSubTab).
 * - Keyboard: role=tablist / tab / tabpanel; arrows, Home and End move and choose (automatic activation).
 * - The bar scrolls sideways when the names don't fit (360 px, large text).
 * - The choice is kept per group (a chapter) until it is reset: views/progress.js resets a chapter when you leave it
 *   and every group when you leave the tab, so a chapter always opens on its first sub-tab.
 * Styles: css/progress.css (.st-*).
 */
import { A } from "../app.js";
import { esc } from "../util.js";

const CUR = {}, LAST = {}, DRAW = {};

/** The sub-tab shown in group g, out of ids (the first one unless another was chosen). */
export function subOf(g, ids) {
  LAST[g] = ids.slice();
  return ids.includes(CUR[g]) ? CUR[g] : ids[0];
}
/** Whether group g shows its first sub-tab. */
export const subIsFirst = g => !CUR[g] || !LAST[g] || CUR[g] === LAST[g][0];
/** Back to the first sub-tab: the groups named, or every group. The caller redraws. */
export function resetSubs(...gs) { for (const g of gs.length ? gs : Object.keys(CUR)) delete CUR[g]; }
/** How group g redraws after a tap (only its own chapter). */
export const onSubTab = (g, fn) => { DRAW[g] = fn; };

const tabId = (g, id) => `st-${g}-${id}`;
/**
 * The bar: items [[id, label], ...], cur the chosen id. label names the bar for screen readers.
 * With one item or none there is no bar.
 */
export function subTabsHTML(g, items, cur, label) {
  if (items.length < 2) return "";
  const btns = items.map(([id, name]) => {
    const on = id === cur;
    return `<button type="button" role="tab" id="${tabId(g, id)}" data-f="${tabId(g, id)}" data-id="${id}" aria-controls="st-${g}-p" aria-selected="${on}" tabindex="${on ? 0 : -1}" class="${on ? "on" : ""}" onclick="A.subTab('${g}','${id}')">${esc(name)}</button>`;
  }).join("");
  return `<div class="st-wrap"><div class="st-bar" role="tablist" aria-label="${esc(label)}" onkeydown="A.subKey(event,'${g}')">${btns}</div></div>`;
}
/** The section under the bar. */
export const subPanel = (g, cur, html, many = true) => (many ? `<div class="st-p" role="tabpanel" id="st-${g}-p" aria-labelledby="${tabId(g, cur)}">${html}</div>` : html);

A.subTab = (g, id, focus = false) => {
  if (CUR[g] === id && !focus) return;
  CUR[g] = id;
  DRAW[g]?.();
  const t = typeof document !== "undefined" ? document.getElementById(tabId(g, id)) : null;
  if (!t) return;
  if (focus) t.focus({ preventScroll: true });
  // the chosen name in the middle of its bar (only the bar scrolls: never the chapters around it)
  const w = t.closest(".st-wrap");
  if (w && w.scrollWidth > w.clientWidth) {
    const a = w.getBoundingClientRect(), b = t.getBoundingClientRect();
    w.scrollLeft += b.left + b.width / 2 - (a.left + a.width / 2);
  }
};
A.subKey = (e, g) => {
  const tabs = [...e.currentTarget.querySelectorAll("[role=tab]")], i = tabs.indexOf(e.target), n = tabs.length;
  if (i < 0) return;
  const k = e.key, to = k === "ArrowRight" ? (i + 1) % n : k === "ArrowLeft" ? (i - 1 + n) % n : k === "Home" ? 0 : k === "End" ? n - 1 : -1;
  if (to < 0) return;
  e.preventDefault();
  e.stopPropagation(); // not the chapter bar's keys
  A.subTab(g, tabs[to].dataset.id, true);
};
