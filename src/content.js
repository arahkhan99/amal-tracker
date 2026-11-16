/**
 * Weekly and monthly content for the "This week" card on Home.
 * Weeks start on SUNDAY (user, 14 Nov 2026; the Hizb al-Aʿzam keeps Saturday = manzil 1 separately); items rotate by
 * Sunday-week and by calendar month.
 *
 * The āyah, hadith, Sīrah, Sunnah, duʿā and Sahābah sets are scholar-approved (14 Nov 2026; the āyāt on 15 Nov 2026)
 * and generated from docs/content/*.md by scripts/build-content.cjs into src/content/*.js (draft:false, status
 * "approved"; no reviewer notes, sources as book + printed page, no gradings). They are a separate chunk, loaded with loadContent() (started
 * as soon as this module loads); until it arrives thisWeek() returns empty items and contentReady() is false.
 * The weekly āyāt (A01–A52) rotate like the hadith and duʿā: A01 in the epoch week. Their Arabic is DigitalKhatt-encoded
 * IndoPak text and must be shown in the "DigitalKhatt IndoPak" font (Home sheet: class "ar q").
 *
 * thisWeek(date) → {
 *   ayah:   { title, ar, en, src },                                  // weekly (ar: verbatim DigitalKhatt IndoPak, ۝n markers)
 *   hadith: { title, en, narrator?, collection?, src },              // weekly
 *   dua:    { title, ar, tr, en, narrator?, collection?, src },      // weekly (tr = simple transliteration)
 *   seerah: { title, text, src },                                    // weekly
 *   sahabi: { name, title, facts[], srcs[], day, fact, text, src, earlier[], monthKey }, // monthly, ONE fact per day
 *           // fact/text/src = today's fact, facts[day-1]. Companions have 26–31 facts: on a day past the last one
 *           // fact is null and recap = { highlights: [{ day, text, src }] } (first, two middle, last fact) instead;
 *           // otherwise recap is null. earlier = the facts before today (in a recap, all of them), newest first.
 *   sunnah: { title, text, narrator?, collection?, src },            // monthly
 *   weekKey,                               // "2026-11-08" (the Sunday)
 *   weekStart, weekEnd,                    // Date (Sunday), Date (Saturday)
 *   weekIndex,                             // 0..6 position of `date` in its week (Sun 0 … Sat 6)
 *   weekLabel, monthLabel, rangeLabel      // "This week", "This month", "Sun 8 – Sat 14 Nov"
 * }
 * pastSahabi(date, n) → [{ monthKey, label, name, title, facts[], srcs[] }]   // earlier months, newest first
 */
import { weekStartDate, weekKey, weekIndex, weeksBetween, weekRangeLabel } from "./times.js";
import { addDays } from "./util.js";
import { WEEK_UI, HOME } from "./strings.js";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthIdx = date => date.getFullYear() * 12 + date.getMonth();

// Rotation is counted from this Sunday, so every phone shows the same item in the same week.
const EPOCH = new Date(2026, 0, 4); // Sun 4 Jan 2026

/* ---------- approved sets (src/content/, a lazy chunk) ---------- */
let D = null, loading = null;
let importer = () => import("./content/index.js");
// Views that want to redraw when the sets land (a Set, so a view that asks on every render is called once).
const waiting = new Set();
// After a failed import: no new attempt from renders; retry after a back-off (60 s, doubling to 10 min) or when back online.
const RETRY_MS = 60000, RETRY_MAX = 600000;
let fails = 0, retryT = 0;
const onOnline = () => retryNow();
function retryNow() {
  clearTimeout(retryT); retryT = 0;
  if (typeof window !== "undefined") window.removeEventListener?.("online", onOnline);
  ensure();
}
function scheduleRetry() {
  if (retryT) return;
  retryT = setTimeout(retryNow, Math.min(RETRY_MAX, RETRY_MS * 2 ** Math.max(0, fails - 1)));
  if (typeof window !== "undefined") window.addEventListener?.("online", onOnline);
}
/** Loads the approved sets once; resolves to the module. A direct call (a tap) always tries, even during a back-off. */
export function loadContent() {
  return loading ||= importer().then(m => {
    D = m; fails = 0; clearTimeout(retryT); retryT = 0;
    const fns = [...waiting]; waiting.clear();
    for (const fn of fns) { try { fn(); } catch (e) { console.warn("content", e); } }
    return m;
  }).catch(e => { loading = null; fails++; scheduleRetry(); throw e; });
}
/** Start loading unless it is loaded, in flight or waiting out a back-off. */
function ensure() { if (!D && !loading && !retryT) loadContent().catch(e => console.warn("content", e)); }
/** Call fn (once) when the sets have loaded; safe to call on every render. */
export function whenContent(fn) {
  if (D) return;
  waiting.add(fn);
  ensure();
}
export const contentReady = () => !!D;
/** For tests: swap the chunk loader and forget the loaded state. */
export function _resetContent(fn = () => import("./content/index.js")) {
  importer = fn; D = null; loading = null; fails = 0; clearTimeout(retryT); retryT = 0; waiting.clear();
}
loadContent().catch(() => {});

const NONE = { title: "", en: "", text: "", src: "" };
const NO_SAHABI = { name: "", title: "", facts: [""], srcs: [""] };

// Sequential from the user's first month (Abū Bakr), then ʿUmar, and so on (order in src/content/sahabah.js).
// Without one, from the epoch month.
let sahabiStart = null;
/** Home passes S.settings.sahabiStart (a month index: year * 12 + month). */
export function setSahabiStart(m) { sahabiStart = Number.isInteger(m) ? m : null; }
export const monthIndex = monthIdx;
const startMonth = () => sahabiStart ?? monthIdx(EPOCH);
const sahabiFor = m => (D ? pick(D.SAHABAH, m - startMonth()) : NO_SAHABI);

const pick = (list, n) => list[((n % list.length) + list.length) % list.length];
const pickD = (key, n) => (D ? pick(D[key], n) : NONE);

/** Number of Sunday-weeks since the rotation epoch (can be negative before it). */
export function weekNumber(date = new Date()) { return weeksBetween(EPOCH, date); }

/** Which fact (1-based) shows on day `day` of the month for a Companion with `n` facts. */
export const sahabiFactDay = (day, n) => Math.max(1, Math.min(day, n));

/** Recap highlights for a Companion with `n` facts: the first, two from the middle and the last (0-based, unique, in order). */
export const recapPicks = n => [...new Set([0, Math.round((n - 1) / 3), Math.round((2 * (n - 1)) / 3), n - 1])].filter(i => i >= 0 && i < n);

/** The month's Sahabi with the facts revealed so far on `date` (one per day, today's last). Past the last fact
 *  (e.g. days 27–31 for a 26-fact Companion) there is no new fact: `recap` holds highlights of the month instead,
 *  and earlier[] holds every fact of the month. */
function sahabiOn(date) {
  const base = sahabiFor(monthIdx(date)), n = base.facts.length, day = date.getDate();
  const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
  const all = (k) => base.facts.slice(0, k).map((text, i) => ({ day: i + 1, text })).reverse();
  if (D && day > n) {
    const highlights = recapPicks(n).map(i => ({ day: i + 1, text: base.facts[i], src: base.srcs[i] }));
    return { ...base, day, fact: null, text: null, src: null, recap: { highlights }, earlier: all(n), monthKey };
  }
  const shown = sahabiFactDay(day, n), cur = base.facts[shown - 1];
  return { ...base, day, fact: cur, text: cur, src: base.srcs[shown - 1], recap: null, earlier: all(shown - 1), monthKey };
}

/** Earlier months' Sahabi (newest first, back to the rotation epoch, at most `n`), each with all of its facts. */
export function pastSahabi(date = new Date(), n = 12) {
  const out = [], first = startMonth();
  for (let m = monthIdx(date) - 1; m >= first && out.length < n; m--) {
    const y = Math.floor(m / 12), mo = m % 12;
    out.push({ ...sahabiFor(m), monthKey: `${y}-${mo}`, label: `${MONTHS[mo]} ${y}` });
  }
  return out;
}

export function thisWeek(date = new Date()) {
  const w = weekNumber(date), m = monthIdx(date);
  const start = weekStartDate(date);
  return {
    ayah: pickD("AYAH", w), hadith: pickD("HADITH", w), dua: pickD("DUA", w), seerah: pickD("SEERAH", w),
    sahabi: sahabiOn(date), sunnah: pickD("SUNNAH", m),
    weekKey: weekKey(date), weekStart: start, weekEnd: addDays(start, 6), weekIndex: weekIndex(date),
    weekLabel: HOME.thisWeek, monthLabel: WEEK_UI.thisMonth, rangeLabel: weekRangeLabel(date),
  };
}
