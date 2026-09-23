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
