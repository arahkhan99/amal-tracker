/*
 * The Qurʾān reading goal (approved 19 Nov 2026, docs/plan/launch-and-premium.md "Qurʾān goal (approved spec)").
 * Rules only, no DOM: views/quran-goal.js draws the sheets and the card; views/tools/quran.js feeds the reader's
 * automatic counting (src/quran-track.js); views/read.js and views/progress.js show the progress.
 *
 * The goal (S.settings.quranGoal, synced with the settings):
 *   { type: "pages" | "juz" | "min", n, per: "day" | "week" }                        a daily or weekly amount
 *   { type: "khatm", mushaf, total, start, startKey, endKey?, days? }                 "Finish the Qurʾān"
 *     start: the first page still to read (1 = from the beginning, or the reader's page then); days: "in N days"
 *     (the end moves later by the excused days in the plan, the goal pauses), endKey: "by a date" (fixed).
 *     ramadan: true for "Start on 1 Ramaḍān, finish by Eid" (ramadanRange); until startKey it is scheduled.
 *
 * What was read, per day in the day log (day.quran; it syncs with the day, and mergeQuranDay joins two copies):
 *   { pages: ["indopak15:12", …],   distinct mushaf pages read in the reader (src/quran-track.js debounce)
 *     sec: { [device]: seconds },   active reading time in the reader, per phone (so two phones add up)
 *     manual: [{ id, unit, n, at, e }, …] }  "I read…" entries (a personal mushaf); a removed one stays as { id, del }
 * Manual and automatic add together. Pages and Juzʾ convert (a juzʾ = the mushaf's pages / 30); minutes stand alone.
 *
 * Nothing here scores: the recitation tick (day.amal.quran, 1 provision) is unchanged, and meeting the goal earns
 * nothing extra. No streaks: missing a day changes nothing else, a weekly goal can be caught up, and a plan that is
 * behind is spread gently (never more than PACE_CAP × its first pace a day; the finish date moves instead).
 * Excused days: the goal pauses. They leave the daily and weekly targets and the plan's pace.
 */
import * as store from "./store.js";
import { dkey, addDays, parseKey } from "./util.js";
import { weekDates } from "./times.js";

/** Pages in each mushaf (public/quran/mushafs.json), for the planner before the mushaf's index is loaded. */
export const MUSHAF_PAGES = { indopak15: 610, indopak13: 847, madani15: 604 };
export const pagesIn = id => MUSHAF_PAGES[id] || 610;
export const UNITS = ["pages", "juz", "min"];
/** A plan that is behind asks for at most this much more than its first pace a day. */
export const PACE_CAP = 1.25;

/* ---------- what was read on a day ---------- */
const q = (S, key) => S.days?.[key]?.quran;
function ensureQ(S, key) {
  const day = store.ensureDay(S, key);
  return (day.quran ||= {});
}
/** Distinct pages read in the reader on day `key` (the day log, and the reader's older list S.tools.quran.read). */
export function autoPages(S, key) {
  const a = q(S, key)?.pages || [], b = S.tools?.quran?.read?.[key] || [];
  return b.length ? new Set([...a, ...b.map(String)]).size : a.length;
}
/** Active reading seconds in the reader on day `key`, all phones together. */
export function autoSec(S, key) {
  const s = q(S, key)?.sec;
  return s && typeof s === "object" ? Object.values(s).reduce((t, v) => t + (Number.isFinite(v) ? v : 0), 0) : 0;
}
/** The "I read…" entries of a day that are still there (newest last). */
export const manualEntries = (S, key) => (q(S, key)?.manual || []).filter(m => !m.del && UNITS.includes(m.unit) && m.n > 0);

/**
 * All the reading of day `key`: { pages, min, autoPages, autoMin, manualPages, manualMin }. Juzʾ entries count as
 * pages (total / 30 each, in the mushaf of `total`). Pages and minutes are kept apart.
 */
export function dayReading(S, key, total = pagesIn(mushafOf(S))) {
  const jp = total / 30;
  let mp = 0, mm = 0;
  for (const m of manualEntries(S, key)) { if (m.unit === "min") mm += m.n; else mp += m.unit === "juz" ? m.n * jp : m.n; }
  const ap = autoPages(S, key), am = Math.floor(autoSec(S, key) / 60);
  return { pages: ap + mp, min: am + mm, autoPages: ap, autoMin: am, manualPages: mp, manualMin: mm };
}
/** A day's reading in one unit: pages, juzʾ (pages / (total / 30)) or minutes. */
export function amountIn(r, unit, total) {
  return unit === "min" ? r.min : unit === "juz" ? r.pages / (total / 30) : r.pages;
}

/** Add pages read in the reader (keys "mushaf:page") to day `key`. Returns how many were new. Caller saves. */
export function addAutoPages(S, key, keys) {
  const list = keys.map(String).filter(Boolean);
  if (!list.length) return 0;
  const cur = q(S, key)?.pages || [];
  const add = list.filter(k => !cur.includes(k));
  if (!add.length) return 0;
  const d = ensureQ(S, key);
  d.pages = [...(d.pages || []), ...add];
  S.days[key].u = Date.now();
  return add.length;
}
/** Add active reading seconds from this phone (`dev`) to day `key`. Caller saves. */
export function addAutoSec(S, key, dev, sec) {
  sec = Math.round(sec);
  if (!(sec > 0)) return;
  const d = ensureQ(S, key);
  d.sec = { ...(d.sec || {}) };
  d.sec[dev] = (d.sec[dev] || 0) + sec;
  S.days[key].u = Date.now();
}
let seq = 0;
const newId = now => `${now.toString(36)}${(seq++ % 1296).toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
/** "I read…": add { unit, n } to day `key`. A user log of the day (day.first). Returns the entry. Caller commits. */
export function addManual(S, key, { unit, n }, now = new Date()) {
  n = Math.round(Number(n) * 10) / 10;
  if (!UNITS.includes(unit) || !(n > 0)) return null;
  const d = ensureQ(S, key), t = now.getTime();
  const e = { id: newId(t), unit, n, at: t, e: t };
  d.manual = [...(d.manual || []), e];
  const day = S.days[key];
  store.markLogged(day, now);
  day.u = Date.now();
  return e;
}
/** Change an "I read…" entry. False if it isn't there. Caller commits. */
export function editManual(S, key, id, { unit, n }, now = new Date()) {
  n = Math.round(Number(n) * 10) / 10;
  const list = q(S, key)?.manual || [], i = list.findIndex(m => m.id === id && !m.del);
  if (i < 0 || !UNITS.includes(unit) || !(n > 0)) return false;
  const d = ensureQ(S, key);
  d.manual = list.map((m, j) => (j === i ? { ...m, unit, n, e: now.getTime() } : m));
  S.days[key].u = Date.now();
  return true;
}
/** Remove an "I read…" entry. It stays as { id, del } so a sync can't bring it back. Caller commits. */
export function removeManual(S, key, id, now = new Date()) {
  const list = q(S, key)?.manual || [];
  if (!list.some(m => m.id === id && !m.del)) return false;
  const d = ensureQ(S, key);
  d.manual = list.map(m => (m.id === id ? { id, del: now.getTime() } : m));
  S.days[key].u = Date.now();
  return true;
}

/* ---------- the goal ---------- */
export const goalOf = S => {
  const g = S.settings?.quranGoal;
  if (!g || typeof g !== "object") return null;
  if (g.type === "khatm") return g.startKey && (g.endKey || g.days > 0) ? g : null;
  return UNITS.includes(g.type) && g.n > 0 && (g.per === "day" || g.per === "week") ? g : null;
};
export const mushafOf = S => S.tools?.quran?.mushaf || "indopak15";
/** Set (or with null clear) the goal. Caller commits. */
export function setGoal(S, g) {
  if (!g) { delete S.settings.quranGoal; return; }
  S.settings.quranGoal = JSON.parse(JSON.stringify(g));
}
/** A "Finish the Qurʾān" goal: { days } or { endKey }; from the beginning (start 1) or from page `start`. */
export function khatmGoal({ mushaf = "indopak15", total = pagesIn(mushaf), start = 1, days = 0, endKey = "" }, now = new Date()) {
  const g = { type: "khatm", mushaf, total, start: Math.min(total, Math.max(1, Math.round(start) || 1)), startKey: dkey(now) };
  if (endKey) g.endKey = endKey < g.startKey ? g.startKey : endKey; else g.days = Math.max(1, Math.round(days) || 30);
  return g;
}

const excused = (S, key) => store.isExcusedDay(S, key);
const keysFrom = (a, b) => { const out = []; for (let d = parseKey(a); dkey(d) <= b; d = addDays(d, 1)) out.push(dkey(d)); return out; };

/**
 * Where a "Finish the Qurʾān" plan stands on day `now`: {
 *   daily (pages to read today), read (pages read since the start, today included), toRead, left (after today's),
 *   doneToday, endKey (the planned last day: an N-days plan moves later by its excused days), finishKey (expected
 *   last day: endKey, or later when a gentle pace can't make it), late (finishKey after endKey), complete, paused,
 *   base (the first pace) }.
 * Today's target is set from what was read before today, so reading today never moves it.
 */
export function planStatus(S, g, now = new Date()) {
  const today = dkey(now);
  const total = g.total || pagesIn(g.mushaf), toRead = Math.max(1, total - (g.start || 1) + 1);
  // a plan that starts later (a Ramaḍān plan before 1 Ramaḍān): scheduled, nothing to read yet, nothing counted
  if (g.startKey > today) {
    const endKey = g.endKey || dkey(addDays(parseKey(g.startKey), Math.max(1, g.days || 30) - 1));
    const planned = Math.max(1, g.days || keysFrom(g.startKey, endKey < g.startKey ? g.startKey : endKey).length);
    return { daily: 0, read: 0, toRead, left: toRead, doneToday: 0, endKey, finishKey: endKey, late: false, complete: false, paused: false, base: Math.ceil(toRead / planned), scheduled: true, startKey: g.startKey };
  }
  const startKey = g.startKey;
  const pagesOn = k => dayReading(S, k, total).pages;
  let before = 0;
  for (const k of keysFrom(startKey, dkey(addDays(now, -1)))) before += pagesOn(k);
  const doneToday = pagesOn(today), paused = excused(S, today);
  // the planned end: "in N days" pauses on excused days (the end moves later by each one so far); "by a date" is fixed
  let endKey = g.endKey;
  if (!endKey) {
    let ex = 0;
    for (const k of keysFrom(startKey, today)) if (excused(S, k)) ex++;
    endKey = dkey(addDays(parseKey(startKey), g.days - 1 + ex));
  }
  const planKeys = keysFrom(startKey, endKey < startKey ? startKey : endKey);
  const planned = Math.max(1, g.days || planKeys.filter(k => !excused(S, k) || k > today).length);
  const base = Math.ceil(toRead / planned), cap = Math.max(base, Math.ceil(base * PACE_CAP));
  const remaining = Math.max(0, toRead - before);
  const leftKeys = keysFrom(today, endKey < today ? today : endKey).filter(k => !excused(S, k));
  const need = remaining ? Math.ceil(remaining / Math.max(1, leftKeys.length)) : 0;
  const daily = paused ? 0 : Math.min(need, cap);
  // expected finish: the planned end, or, at the gentle pace, the day the remaining pages run out
  let finishKey = endKey;
  if (need > cap || endKey < today) {
    let left = remaining, d = now;
    for (let i = 0; i < 4000 && left > 0; i++, d = addDays(d, 1)) { const k = dkey(d); if (k === today && paused) continue; if (excused(S, k) && k <= today) continue; left -= cap; finishKey = k; }
  }
  const read = Math.min(toRead, before + doneToday);
  return { daily, read, toRead, left: Math.max(0, toRead - read), doneToday, endKey, finishKey, late: finishKey > endKey, complete: read >= toRead, paused, base, scheduled: false, startKey };
}

/**
 * The goal's progress on day `now`: null without a goal, else {
 *   goal, unit ("pages" | "juz" | "min"), per ("day" | "week" | "plan"), target, done, met, paused, pct (0–100),
 *   plan (planStatus, for a khatm) }.
 * Daily: today's reading against n; paused on an excused day. Weekly: this week's reading (Sunday to Saturday)
 * against n × (days not excused / 7), so a weekly goal can be caught up any day and excused days lower it.
 */
export function goalStatus(S, now = new Date()) {
  const g = goalOf(S);
  if (!g) return null;
  const key = dkey(now);
  if (g.type === "khatm") {
    const p = planStatus(S, g, now);
    if (p.scheduled) return { goal: g, unit: "pages", per: "plan", target: 0, done: 0, met: false, paused: false, pct: 0, plan: p, scheduled: true };
    const target = p.complete ? p.doneToday : p.daily;
    return { goal: g, unit: "pages", per: "plan", target, done: p.doneToday, met: p.complete || (target > 0 && p.doneToday >= target), paused: p.paused && !p.complete, pct: pctOf(p.doneToday, target), plan: p };
  }
  const total = pagesIn(mushafOf(S)), unit = g.type;
  if (g.per === "day") {
    const paused = excused(S, key);
    const done = round1(amountIn(dayReading(S, key, total), unit, total));
    return { goal: g, unit, per: "day", target: paused ? 0 : g.n, done, met: !paused && done >= g.n, paused, pct: paused ? 0 : pctOf(done, g.n) };
  }
  const days = weekDates(now).map(dkey);
  const active = days.filter(k => !excused(S, k)).length;
  const target = active ? round1(unit === "min" || unit === "pages" ? Math.max(1, Math.round(g.n * active / 7)) : Math.max(0.5, g.n * active / 7)) : 0;
  let sum = 0;
  for (const k of days) if (k <= key) sum += amountIn(dayReading(S, k, total), unit, total);
  const done = round1(sum);
  return { goal: g, unit, per: "week", target, done, met: target > 0 && done >= target, paused: active === 0 || excused(S, key), weekPaused: active === 0, pct: pctOf(done, target), activeDays: active };
}
const round1 = x => Math.round(x * 10) / 10;
const pctOf = (a, b) => (b > 0 ? Math.min(100, Math.round(a / b * 100)) : 0);

/** The reading per day for the Progress chart: [{ key, pages, min, excused }] from `from` to `to` (Dates). */
export function readingSeries(S, from, to) {
  const out = [], total = pagesIn(mushafOf(S));
  for (let d = from; dkey(d) <= dkey(to); d = addDays(d, 1)) {
    const key = dkey(d), r = dayReading(S, key, total);
    out.push({ key, pages: Math.round(r.pages), min: r.min, excused: excused(S, key) });
  }
  return out;
}

/** The day before the next 1 Shawwāl (Eid al-Fiṭr) from `now`, via hijriParts; "" if the calendar isn't there. */
export function eidEve(now, hijriParts) {
  try {
    for (let i = 1; i < 400; i++) {
      const d = addDays(now, i), p = hijriParts(d);
      if (p?.m === 10 && p.d === 1) return dkey(addDays(d, -1));
    }
  } catch (e) { /* no Hijri calendar here */ }
  return "";
}

/**
 * "Start on 1 Ramaḍān, finish by Eid" (19 Nov 2026): { startKey, endKey } of the Ramaḍān holding `now`, or of the
 * next one, from the Hijri calendar (hijriParts: the user's method, committee and adjustment apply). startKey is
 * 1 Ramaḍān, endKey the day before 1 Shawwāl (Eid al-Fiṭr). Null when the Hijri calendar isn't there.
 */
export function ramadanRange(now, hijriParts) {
  try {
    const p = hijriParts(now);
    let start = null;
    if (p?.m === 9) start = addDays(now, -(p.d - 1));
    else for (let i = 1; i < 400 && !start; i++) { const d = addDays(now, i), x = hijriParts(d); if (x?.m === 9 && x.d === 1) start = d; }
    if (!start) return null;
    const end = eidEve(addDays(start, 27), hijriParts); // Ramaḍān has 29 or 30 days: look from day 29 on
    return end ? { startKey: dkey(start), endKey: end } : null;
  } catch (e) { return null; }
}
/** A "Finish the Qurʾān" plan over Ramaḍān (ramadanRange): scheduled until 1 Ramaḍān, then a plan by a date. */
export function ramadanGoal({ mushaf = "indopak15", total = pagesIn(mushaf), start = 1, range }) {
  if (!range) return null;
  return { type: "khatm", mushaf, total, start: Math.min(total, Math.max(1, Math.round(start) || 1)), startKey: range.startKey, endKey: range.endKey, ramadan: true };
}
