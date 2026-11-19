/*
 * Provisions & levels (zād = provision for the journey). A pure function over the stored history:
 * same input, same output. No writes, no clock, no DOM. Pass `today` ("YYYY-MM-DD") in from the caller.
 *
 * Nothing here is stored or synced. Totals are always recalculated from S.days and S.qada (and the readers' dated state in S.tools, readsByDay), so a new
 * WEIGHTS version simply re-counts the whole history. The only stored values are in
 * S.settings.provisions: the weights version in use and the best level shown (levels never go down).
 *
 * Rules shared with the rest of the app:
 * - Fard: statusOf (an unlogged prayer on an excused day is "excused"; a status logged on an excused day counts as logged).
 * - Sunnah: only chips that are logged AND still allowed by their fard's status (store.sunnahDone's rule:
 *   no chips after a missed or excused fard; after "made up" only Fajr's 2 before; none on an excused day).
 *   Visibility settings (ghayr / nafl / Jumuʿah) don't remove what was logged.
 * - Witr: only where the Witr chip is allowed (store.witrChip: not on an excused day, not when ʿIshāʾ is excused).
 * - Remembrance at prayer time: only on a prayer whose status is excused.
 * - Readings done in Read (Hizb, al-Mulk, al-Kahf, the Manzil; readsByDay) count as good deeds, one each a
 *   day, inside the same daily cap. Al-Mulk, al-Kahf and the Manzil are recitation, so they count nothing on
 *   an excused day (Read leaves them off that day's list too); the Hizb is duʿāʾ and still counts.
 * - Days before S.createdKey and days after `today` count as nothing.
 * - Today: an excused prayer (and its remembrance) counts only once its time has begun. The caller passes
 *   `started`, today's prayers already begun (times.startedPrayers), since this file never reads the clock.
 *   Past days count in full; without `started` every prayer counts.
 */
import { PRAYERS, dkey, addDays, parseKey } from "./util.js";
import { statusOf } from "./store.js";
import { madhhabOf, itemById, sunnahAllowed } from "./rules/madhhab.js";

/** Versioned weights. The scholar tunes a new version (v2, ...); everything is recalculated from history. */
export const WEIGHTS = {
  v1: {
    fard: { congregation: 5, ontime: 3, madeup: 1, missed: 0 },
    fardOntimeHomeFull: 5,                 // "Prayer at home counts in full" (sisters): on time = 5
    excused: { base: 3, remembrance: 5 },  // approved by the scholar (Nov 2026): 3 per prayer time, 5 with remembrance at prayer time
    witr: { done: 2, madeup: 1, missed: 0 },
    sunnah: { each: 1, cap: 10 },          // sunnah muʾakkadah, ghayr, nafl, Ḍuḥā, Tahajjud, ...
    deeds: { each: 1, cap: 10 },           // Good Deeds ticked done
    makeups: { each: 1, cap: 5 },          // make-up prayers and fasts completed that day
  },
};
export const CURRENT = "v1";
export const weightsFor = version => WEIGHTS[version] || WEIGHTS[CURRENT];

/**
 * Readings that count as one good deed each when done that day (scholar, 18 Nov 2026), without being on the
 * editable deeds list. QURAN_READS are left out on an excused day.
 */
export const READ_IDS = ["hizb", "mulk", "kahf", "manzil"];
const QURAN_READS = new Set(["mulk", "kahf", "manzil"]);
const isKey = k => /^\d{4}-\d{2}-\d{2}$/.test(k);

/**
 * Readings done per day: { "YYYY-MM-DD": ["hizb", "mulk", ...] } (each id at most once a day). Joined from
 * - day.reads (store.setRead: written by Read's ticks and the readers, kept in the day log so the count stays
 *   after the readers' own history below is pruned), and
 * - the readers' own dated state, so days done before day.reads existed count too:
 *   S.tools.read[day].mulk / .kahf (al-Kahf under its Friday), S.tools.manzil[day] (morning or evening), and
 *   the Hizb weeks (S.tools.hizb.weeks[saturday].read[m]: manzil m is the one due on the week's m-th day).
 */
export function readsByDay(S) {
  const out = {};
  const add = (k, id) => { if (!isKey(k)) return; const l = (out[k] ||= []); if (!l.includes(id)) l.push(id); };
  for (const [k, d] of Object.entries(S.days || {})) for (const id of READ_IDS) if (d?.reads?.[id]) add(k, id);
  const t = S.tools || {};
  for (const [k, r] of Object.entries(t.read || {})) { if (r?.mulk) add(k, "mulk"); if (r?.kahf) add(k, "kahf"); }
  for (const [k, m] of Object.entries(t.manzil || {})) if (m?.morning || m?.evening) add(k, "manzil");
  for (const [wk, w] of Object.entries(t.hizb?.weeks || {})) {
    if (!isKey(wk)) continue;
    for (const [m, at] of Object.entries(w?.read || {})) {
      const n = Number(m);
      if (at && n >= 1 && n <= 7) add(dkey(addDays(parseKey(wk), n - 1)), "hizb");
    }
  }
  return out;
}
/** The readings that count on a day record: QURAN_READS not on an excused day. */
export const countedReads = (day, reads) => (reads || []).filter(id => READ_IDS.includes(id) && !(day?.excused && QURAN_READS.has(id)));

/** Provisions needed to reach level n: 100·n·(n−1). L1 0, L2 200, L3 600, L4 1,200, L5 2,000, L10 9,000. */
export const needFor = n => 100 * n * (n - 1);

/** Level for a total: the largest n with needFor(n) <= total (at least 1). */
export function levelFor(total) {
  const t = Math.max(0, Number(total) || 0);
  let n = Math.max(1, Math.floor((1 + Math.sqrt(1 + t / 25)) / 2));
  while (needFor(n + 1) <= t) n++;
  while (n > 1 && needFor(n) > t) n--;
  return n;
}

/**
 * Provisions for one day record: { total, parts: [{ id, kind, n, ... }] } (drives the day breakdown).
 * opts: { w (weights object, default CURRENT), homeFull (sisters' rule), makeups (completed that day),
 *         reads (readings done that day, from readsByDay: they join the good deeds and their cap),
 *         madhhab (for sunnah item lookup, default Hanafi), started (for today: the prayers whose time has
 *         begun; an excused prayer not in it counts nothing yet. Omit for a past day: all have begun) }
 */
export function dayProvisions(day, { w = WEIGHTS[CURRENT], homeFull = false, makeups = 0, reads, madhhab, started } = {}) {
  const parts = [];
  if (day) {
    const excusedDay = !!day.excused;
    for (const p of PRAYERS) {
      const s = statusOf(day, p);
      if (!s) continue;
      if (s === "excused" && started && !started.includes(p)) continue; // its time hasn't begun yet
      let n, remember = false;
      if (s === "excused") { remember = !!day.remember?.[p]; n = remember ? w.excused.remembrance : w.excused.base; }
      else if (s === "ontime" && homeFull) n = w.fardOntimeHomeFull;
      else n = w.fard[s] ?? 0;
      parts.push(remember ? { id: p, kind: "fard", status: s, remember, n } : { id: p, kind: "fard", status: s, n });
    }
    const witrAllowed = !excusedDay && statusOf(day, "Isha") !== "excused";
    if (day.witr && witrAllowed) parts.push({ id: "witr", kind: "witr", status: day.witr, n: w.witr[day.witr] ?? 0 });
    const m = madhhabOf({ madhhab });
    const sun = Object.keys(day.sunnah || {}).filter(id => {
      if (!day.sunnah[id]) return false;
      const item = itemById(id, m);
      return !!item && sunnahAllowed(item, item.prayer ? statusOf(day, item.prayer) : null, { excusedDay });
    }).length;
    if (sun) parts.push({ id: "sunnah", kind: "sunnah", count: sun, n: Math.min(sun * w.sunnah.each, w.sunnah.cap) });
  }
  // good deeds, and the readings (a day with only a reading may have no day record)
  const rd = countedReads(day, reads);
  const deeds = Object.values(day?.amal || {}).filter(a => a?.done).length + rd.length;
  if (deeds) parts.push({ id: "deeds", kind: "deeds", count: deeds, n: Math.min(deeds * w.deeds.each, w.deeds.cap), ...(rd.length ? { reads: rd } : {}) });
  if (makeups > 0) parts.push({ id: "makeups", kind: "makeups", count: makeups, n: Math.min(makeups * w.makeups.each, w.makeups.cap) });
  return { total: parts.reduce((a, b) => a + b.n, 0), parts };
}

const daysInMonth = ym => { const [y, m] = ym.split("-").map(Number); return new Date(y, m, 0).getDate(); };
const logCount = v => (v?.prayers || 0) + (v?.fasts || 0);

/**
 * Make-ups completed per day: { "YYYY-MM-DD": n }. Exact from qada.dayLog (prayers + fasts).
 * Older months were only counted per month (qada.monthLog), so whatever a month's total holds beyond its
 * dayLog entries is approximated, prayers and fasts each on their own: spread evenly over the month's days
 * from max(month start, createdKey) to the month's end, skipping only days whose dayLog has a non-zero count
 * of that kind, at most `cap` a day. So the month earns min(remainder, cap × those days), the same 5-a-day
 * limit as exact days. Remainders (when it doesn't divide evenly) go to the month's later days.
 * The split never depends on `today`, so a past day's share stays put as time goes on; days after `today`
 * just aren't credited yet. Spread days are listed in `approx`.
 */
export function makeupsByDay(S, { today, cap = WEIGHTS[CURRENT].makeups.cap } = {}) {
  const q = S.qada || {}, dl = q.dayLog || {}, out = {}, approx = new Set();
  const created = S.createdKey || "";
  for (const [k, v] of Object.entries(dl)) { const n = logCount(v); if (n > 0) out[k] = n; }
  for (const [ym, v] of Object.entries(q.monthLog || {})) {
    for (const kind of ["prayers", "fasts"]) {
      let rest = v?.[kind] || 0;
      for (const [k, x] of Object.entries(dl)) if (k.startsWith(ym + "-")) rest -= x?.[kind] || 0;
      if (rest <= 0) continue;
      const free = [];
      for (let d = 1, len = daysInMonth(ym); d <= len; d++) {
        const k = `${ym}-${String(d).padStart(2, "0")}`;
        if (k < created || dl[k]?.[kind] > 0) continue;
        free.push(k);
      }
      if (!free.length) continue;
      const give = Math.min(rest, cap * free.length), each = Math.floor(give / free.length), extra = give % free.length;
      free.forEach((k, i) => {
        const n = each + (i >= free.length - extra ? 1 : 0);
        if (n > 0 && !(today && k > today)) { out[k] = (out[k] || 0) + n; approx.add(k); }
      });
    }
  }
  return { byDay: out, approx };
}

/**
 * Provisions over the history: { total, level, need, next, toNext, byDay, version, daysLogged, since }.
 * opts: { version (default settings.provisions.weights), from, to (inclusive keys), today (key; days after it
 *         count nothing), started (today's prayers already begun, see dayProvisions),
 *         homeFull (default settings.provisions.homeFull) }
 * byDay holds each counted day's total; daysLogged = days with provisions; since = the first such day.
 */
export function provisions(S, { version, from, to, today, started, homeFull } = {}) {
  const set = S.settings?.provisions || {};
  const ver = WEIGHTS[version] ? version : WEIGHTS[set.weights] ? set.weights : CURRENT;
  const w = WEIGHTS[ver];
  const hf = homeFull ?? !!set.homeFull;
  const madhhab = madhhabOf(S);
  const made = makeupsByDay(S, { today, cap: w.makeups.cap }).byDay;
  const reads = readsByDay(S);
  const created = S.createdKey || "";
  const byDay = {};
  let total = 0, daysLogged = 0, since = null;
  for (const key of [...new Set([...Object.keys(S.days || {}), ...Object.keys(made), ...Object.keys(reads)])].sort()) {
    if (key < created || (today && key > today) || (from && key < from) || (to && key > to)) continue;
    const t = dayProvisions(S.days?.[key], { w, homeFull: hf, makeups: made[key] || 0, reads: reads[key], madhhab, started: key === today ? started : undefined }).total;
    byDay[key] = t;
    total += t;
    if (t > 0) { daysLogged++; since ||= key; }
  }
  const level = levelFor(total);
  return { total, level, need: needFor(level), next: needFor(level + 1), toNext: needFor(level + 1) - total, byDay, version: ver, daysLogged, since };
}

/** One day's breakdown with the app's settings applied (for the Tracker sheet). started: as provisions(). */
export function dayBreakdown(S, key, { today, version, started } = {}) {
  const set = S.settings?.provisions || {};
  const w = weightsFor(version || set.weights);
  if (key < (S.createdKey || "") || (today && key > today)) return { total: 0, parts: [] };
  const made = makeupsByDay(S, { today, cap: w.makeups.cap }).byDay[key] || 0;
  return dayProvisions(S.days?.[key], { w, homeFull: !!set.homeFull, makeups: made, reads: readsByDay(S)[key], madhhab: madhhabOf(S), started: key === today ? started : undefined });
}

/**
 * The level to show: never lower than the best level shown before (settings.provisions.best), even when a
 * new weights version lowers the total. opts as provisions(), or { level } to skip the recount.
 */
export function displayLevel(S, opts = {}) {
  const level = opts.level ?? provisions(S, opts).level;
  return Math.max(S.settings?.provisions?.best || 1, level);
}

/** Monday..today of the week holding `today`, as { from, to } keys (for "This week so far"). */
export function weekRange(today, start = 1) {
  const d = parseKey(today);
  const back = (d.getDay() - start + 7) % 7;
  return { from: dkey(addDays(d, -back)), to: today };
}
