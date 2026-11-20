/* Shared bits for the Tools screens: router state, saved progress, icons, small helpers. */
import { S, A, $, NOW, todayKey, openSheet, closeSheet, toast, touched } from "../../app.js";
import * as store from "../../store.js";
import { esc, dkey, addDays, topIn, zoomOf } from "../../util.js";
import { gloss } from "../../glossary.js";
import { APP, COMMON } from "../../strings.js";
import { weekKey } from "../../times.js";
import { PREF_DEFAULTS } from "../../guide.js";
import { NAV } from "../../strings.js";
import { TT } from "./strings-tools.js";
import { bandHead, bandCover } from "../../band.js";

export { esc, A, $, S, NOW, todayKey, openSheet, closeSheet, toast, APP, COMMON };

/* ---------- router ---------- */
/** screen: hub | adhkar | durud | durudRead | hizb | hizbRead | quran | picker */
export const T = { screen: "hub", set: null, durudN: 1, manzil: null, resumed: false, bars: false, page: null };
let drawFn = () => {};
export const setDraw = fn => { drawFn = fn; };
export const redraw = () => drawFn();
export function open(screen, extra = {}) {
  Object.assign(T, { screen }, extra);
  if (document.querySelector("#v-tools.view.on")) redraw(); else A.go("tools");
}

/* ---------- saved progress (S.tools, kept inside the normal state so it syncs with the rest) ---------- */
export function tl() { return (S.tools ||= {}); }
export function part(k, init = {}) { const t = tl(); return (t[k] ||= init); }
/** Save without redrawing (tap counters, scroll position). Cloud sync still hears about it (debounced there). */
export function persist() { S.updatedAt = Date.now(); store.save(S); touched(); }
export function prefs() { return part("prefs", { ...PREF_DEFAULTS }); } // a copy: part() stores the object it is given

/** Keep only the newest `n` keys of an object keyed by date or week. */
export function prune(obj, n = 40) {
  const ks = Object.keys(obj).sort();
  while (ks.length > n) delete obj[ks.shift()];
}

/* ---------- amal ticks (a finished reader ticks its good deed once) ---------- */
export function amalIs(id, key = todayKey()) { return !!store.getDay(S, key).amal[id]?.done; }
export function tickAmal(id, key = todayKey(), detail = "") {
  // salawat: the merged Durūd / Salawāt item is always kept in day.amal.salawat (reading.js deedOf)
  if (id !== "salawat" && !S.amalList.some(a => a.id === id)) return false;
  const day = store.ensureDay(S, key);
  if (day.amal[id]?.done) return false;
  day.amal[id] = { done: true, detail, auto: true };
  // Ticked by the app when a reader is finished, not logged by the user: day.first isn't stamped (store.markLogged)
  day.u = Date.now();
  return true;
}
export function untickAmal(id, key = todayKey()) {
  const day = store.getDay(S, key);
  if (day.amal[id]?.auto) { delete day.amal[id]; day.u = Date.now(); return true; }
  return false;
}

/* ---------- explainer (ⓘ) ---------- */
export function info(id, label = "") {
  return `<button type="button" class="tl-info" aria-label="${esc(label || COMMON.whatDoesThisMean)}" onclick="event.stopPropagation();A.tlGloss('${id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg></button>`;
}
A.tlGloss = id => {
  const g = gloss(id);
  if (!g) return;
  openSheet(`<h3>${esc(g.term)} <span class="tl-gar" lang="ar" dir="rtl">${esc(g.ar)}</span></h3><p>${esc(g.meaning)}</p>${g.draft ? `<p class="note">${esc(APP.draftFlag)}</p>` : ""}<div class="cta"><button class="btn primary" onclick="A.closeSheet()">${COMMON.gotIt}</button></div>`);
};

/* ---------- icons ---------- */
const ic = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const I = {
  sun: ic('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  moon: ic('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'),
  sunmoon: ic('<path d="M19 14.500A7.500 7.500 0 1 1 9.500 5a6 6 0 0 0 9.500 9.500z"/><path d="M17 3v3M15.500 4.500h3"/>'),
  shield: ic('<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>'),
  flower: ic('<path d="M12 21v-8"/><path d="M12 13c-3 0-5-2.2-5-5.5C10 7.5 12 9 12 13zM12 13c3 0 5-2.2 5-5.5-3 0-5 1.5-5 5.5z"/><path d="M12 9c-1.5-1-1.5-3.500 0-5 1.500 1.500 1.500 4 0 5z"/>'),
  book: ic('<path d="M12 6.5C10 5 7 4.500 3.500 5v13c3.500-.5 6.500 0 8.500 1.500 2-1.500 5-2 8.500-1.500V5C17 4.500 14 5 12 6.500z"/><path d="M12 6.500v13"/>'),
  sliders: ic('<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>'),
  back: ic('<path d="M15 5l-7 7 7 7"/>'),
  chev: ic('<path d="M9 5l7 7-7 7"/>'),
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.500l4.500 4.500L19 7.500"/></svg>',
  play: ic('<path d="M7 5l12 7-12 7z" fill="currentColor"/>'),
  bookmark: ic('<path d="M6 3h12v18l-6-4.500L6 21z"/>'),
  bookmarkOn: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12v18l-6-4.500L6 21z"/></svg>',
  hand: ic('<path d="M9 11V5.500a1.500 1.500 0 0 1 3 0V10m0-1.500a1.500 1.500 0 0 1 3 0V11m0-1a1.500 1.500 0 0 1 3 0v5a6 6 0 0 1-6 6h-1.500a5 5 0 0 1-4-2L4 15.500a1.500 1.500 0 0 1 2.500-1.500L9 16"/>'),
  list: ic('<path d="M4 6h16M4 12h10M4 18h7"/>'),
  layers: ic('<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>'),
  qibla: ic('<circle cx="12" cy="12" r="9"/><path d="M15.500 8.500l-2 5-5 2 2-5z"/>'),
  beads: ic('<circle cx="12" cy="5" r="1.800"/><circle cx="17" cy="9" r="1.800"/><circle cx="17" cy="15" r="1.800"/><circle cx="12" cy="19" r="1.800"/><circle cx="7" cy="15" r="1.800"/><circle cx="7" cy="9" r="1.800"/>'),
  lantern: ic('<path d="M9 3h6M10 3v3M14 3v3"/><rect x="7" y="6" width="10" height="13" rx="3"/><path d="M12 9v7M9 21h6"/>'),
  translate: ic('<path d="M4 6h8M8 4v2M6 6c0 4 3 7 6 8M11 6c0 3-3 6-6 8"/><path d="M13 20l4-9 4 9M14.500 17h5"/>'),
  info: ic('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
};

/* ---------- text helpers ---------- */
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
export const arNum = n => String(n).replace(/\d/g, d => AR_DIGITS[d]);
const HARAKAT = /[ً-ٰٟۖ-ۭـ]/g;
export const bare = s => s.replace(HARAKAT, "");
/** The first `n` words of an Arabic string, never cut mid-word, with an ellipsis. */
export function headWords(s, n = 5) {
  const w = s.replace(/\s+/g, " ").trim().split(" ");
  return w.length <= n ? w.join(" ") : w.slice(0, n).join(" ") + " …";
}
/** Wrap the words that differ between two same-length Arabic strings (the evening swaps). */
export function markSwaps(text, other) {
  const a = text.split(" "), b = (other || "").split(" ");
  if (a.length !== b.length) return esc(text);
  return a.map((w, i) => (w !== b[i] ? `<mark class="tl-sw">${esc(w)}</mark>` : esc(w))).join(" ");
}

export const dayName = d => ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getDay()];
export function minutesFor(words, wpm = 95) { return Math.max(1, Math.round(words / wpm)); }
export const wordCount = s => (s || "").split(/\s+/).filter(Boolean).length;

/* ---------- the readers' header: the time-of-day band (band.js) with "‹ Read", the title, Aa, and extras ---------- */
/** Where Back goes from this screen (as tools/index.js A.tlBack): its name for the "‹ …" link. */
const UP = { adhkar: "hub", durud: "hub", hizb: "hub", quran: "hub", durudRead: "durud", hizbRead: "hizb", picker: "quran", manzil: "hub", afterSalah: "hub" };
export function backName() {
  const up = T.entry === T.screen ? "hub" : UP[T.screen];
  return up === "durud" ? TT.durudTitle : up === "hizb" ? (TT.toolName?.hizb || "Hizb al-Aʿzam") : up === "quran" ? TT.mushafTitle : up === "hub" ? NAV.tools : NAV.home;
}
/**
 * A reader's band: "‹ Read" (or its parent), the title in Amiri, Aa at the right (aa: the tool id), a quiet lead line
 * and extras (chips for the set, the progress bar and "n of m"). cls: extra classes (the readers' own hooks).
 */
export function readerHead({ title, aa = "", lead = "", extra = "", right = "", back = "A.tlBack()", cls = "" }) {
  const r = right || (aa ? `<button type="button" class="zb-ib aa tl-aab" aria-label="${TT.aa}" onclick="A.tlAa('${aa}')">Aa</button>` : "");
  return bandCover() + bandHead({ title, back, backLabel: backName(), right: r, lead, extra, cls: "tl-band" + (cls ? " " + cls : "") });
}
/** Page header used by the light sub-screens (back, title, sub line, right action): the same band. */
export function head({ title, ar = "", sub = "", right = "", back = "A.tlBack()" }) {
  return readerHead({ title, lead: sub ? esc(sub) : "", right: right.replace("tl-hbtn lite aa", "zb-ib aa tl-aab"), back });
}

export { dkey, addDays, weekKey, store, topIn, zoomOf };
