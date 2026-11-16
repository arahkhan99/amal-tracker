export const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
export const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const MON3 = MON.map(m => m.slice(0, 3));

const pad = n => String(n).padStart(2, "0");

/** Local calendar key, e.g. "2026-09-22". */
export function dkey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
export function ymKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; }
export function parseKey(k) { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); }
export function addDays(d, n) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }
export function daysBetween(a, b) { return Math.round((parseKey(dkey(b)) - parseKey(dkey(a))) / 864e5); }

/** "5:12 AM" from a Date. */
export function fmt12(d) {
  const h = d.getHours(), m = d.getMinutes();
  return `${(h % 12) || 12}:${pad(m)} ${h < 12 ? "AM" : "PM"}`;
}

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/** Monday-based index 0..6. */
export function monIdx(d) { return (d.getDay() + 6) % 7; }

/**
 * Round a coordinate to 2 decimal places. Zad only keeps approximate location: the rounded point is
 * within about 785 m of the real one (at most 0.005° off in each direction), which changes prayer
 * times by well under a minute.
 */
export const roundCoord = v => Math.round(v * 100) / 100;

/* ---------- scroll positions under CSS zoom ----------
   On tablets src/css/tablet.css zooms each `.view` (1.15) while the #screen scroller stays at zoom 1, so
   offsetTop / offsetHeight / computed lengths inside a view are unzoomed CSS px but scrollTop and
   getBoundingClientRect() are screen px. Mixing the two puts scroll targets off by 15%. Use these instead. */

/** Screen px per CSS px for el (1 on phones, 1.15 inside a zoomed tablet view). */
export function zoomOf(el) {
  const h = el?.offsetHeight;
  return h ? (el.getBoundingClientRect().height / h) || 1 : 1;
}
/** Top of el in the scroller's scroll coordinates, in screen px: the units of scroller.scrollTop. */
export function topIn(el, scroller) {
  return el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
}
/** Screen px from the scroller's top edge to the bottom of a stuck `position: sticky` bar (its height plus its CSS top). */
export function stickyBottom(bar, fallback = 44) {
  if (!bar) return fallback;
  return bar.getBoundingClientRect().height + (parseFloat(getComputedStyle(bar).top) || 0) * zoomOf(bar);
}
