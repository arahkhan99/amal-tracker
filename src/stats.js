import { PRAYERS, dkey, addDays, monIdx, ymKey, parseKey } from "./util.js";
import { getDay, lastDetail, statusOf, isPrayed, amalForDay, sunnahOpts, genderOf } from "./store.js";
import { madhhabOf, sunnahFor, sunnahAllowed, measureTarget, measuredItems, chipLabel, tierLabel, getMadhhab, isFriday } from "./rules/madhhab.js";
import { startedPrayers, weekDates } from "./times.js";
import { INSIGHT, PRAYER_NAME } from "./strings.js";
import { readsByDay, countedReads } from "./points.js";

/*
 * Statuses: congregation | ontime | madeup | missed | excused (store.STATUSES).
 * Prayed = congregation, ontime, madeup. Excused prayers (and excused days) are left out of every
 * percentage and never break a streak. Unlogged = a past prayer with no status.
 *
 * Most range functions take an optional `opts.settings` (S.settings). With it, today's prayers count as
 * due only once their time has started; without it, today's unlogged prayers are not counted at all.
 */

/** Whether a day falls inside the tracked range (from first use through today). */
export function tracked(S, date, now = new Date()) {
  const k = dkey(date);
  return k >= S.createdKey && k <= dkey(now);
}

const dayOf = (S, d) => getDay(S, dkey(d));
const fullyExcused = day => PRAYERS.every(p => statusOf(day, p) === "excused");

/** Completion 0..100 for a day, or null when the day is outside the tracked range. Excused prayers are left out. */
export function dayPct(S, date, now = new Date()) {
  if (!tracked(S, date, now)) return null;
  const key = dkey(date), day = getDay(S, key);
  const list = amalForDay(S, key);
  let done = 0, total = list.length;
  for (const p of PRAYERS) {
    const s = statusOf(day, p);
    if (s === "excused") continue;
    total++;
    if (isPrayed(s)) done++;
  }
  for (const a of list) if (day.amal[a.id]?.done) done++;
  return total ? Math.round(done / total * 100) : 0;
}

/**
 * Seven completion values for the week containing `now` (shifted by weekOffset); null for future or untracked
 * days. Legacy default is Monday-first (start = 1); pass start = times.WEEK_START (0) for Zad's Sunday week.
 */
export function weekPcts(S, now = new Date(), weekOffset = 0, start = 1) {
  const first = start === 1 ? addDays(now, -monIdx(now) + weekOffset * 7) : weekDates(now, weekOffset, start)[0];
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(first, i);
    return d > now && dkey(d) !== dkey(now) ? null : dayPct(S, d, now);
  });
}

/**
 * The Sunday-first week (This week on Home, Progress Week): one entry per day,
 * { date, key, future, tracked, excused, pct, statuses: { Fajr: status|"unlogged"|"future"|null, ... }, prayed, due }.
 * Status per prayer: a STATUS, "unlogged" (past, nothing logged), "future" (not started yet),
 * or null (today, started, not logged yet — "now"). Pass opts.settings to tell started from not started today.
 */
export function weekSeries(S, now = new Date(), weekOffset = 0, opts = {}) {
  return weekDates(now, weekOffset).map(date => {
    const key = dkey(date), day = getDay(S, key), isTracked = tracked(S, date, now);
    const future = key > dkey(now);
    const started = opts.settings ? startedPrayers(date, now, opts.settings) : (key < dkey(now) ? PRAYERS : []);
    const statuses = {};
    let prayed = 0, due = 0;
    for (const p of PRAYERS) {
      const s = statusOf(day, p);
      if (future) statuses[p] = s === "excused" ? "excused" : "future";
      else if (s) statuses[p] = s;
      else if (key < dkey(now)) statuses[p] = isTracked ? "unlogged" : null;
      else statuses[p] = started.includes(p) ? null : "future";
      if (!isTracked || s === "excused") continue;
      if (isPrayed(s)) { prayed++; due++; } else if (s === "missed" || statuses[p] === "unlogged" || (statuses[p] === null && started.includes(p))) due++;
    }
    return { date, key, future, tracked: isTracked, excused: !!day.excused, pct: future ? null : dayPct(S, date, now), statuses, prayed, due };
  });
}

export function avg(vals) {
  const v = vals.filter(x => x !== null && x !== undefined);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
}

/* ---------- streaks ---------- */
const okAll = s => isPrayed(s) || s === "excused";
const okOnTime = s => s === "congregation" || s === "ontime" || s === "excused";

/** Current run of days meeting `ok` for every prayer. Fully excused days are skipped (they never break it). */
function runBack(S, ok, now) {
  const meets = d => PRAYERS.every(p => ok(statusOf(dayOf(S, d), p)));
  let d = meets(now) ? now : addDays(now, -1), n = 0;
  while (tracked(S, d, now)) {
    const day = dayOf(S, d);
    if (fullyExcused(day)) { d = addDays(d, -1); continue; }
    if (!meets(d)) break;
    n++; d = addDays(d, -1);
  }
  return n;
}

/** Best run ever (tracked range), same rules as runBack. */
function bestRun(S, ok, now) {
  let best = 0, cur = 0;
  for (let d = parseKey(S.createdKey); dkey(d) <= dkey(now); d = addDays(d, 1)) {
    const day = dayOf(S, d);
    if (fullyExcused(day)) continue;
    if (PRAYERS.every(p => ok(statusOf(day, p)))) { cur++; best = Math.max(best, cur); }
    else if (dkey(d) !== dkey(now)) cur = 0; // today still in progress doesn't break the run
  }
  return best;
}

/** Days in a row with all five prayed (made up counts; excused days skipped). Today counts once complete. */
export function prayerStreak(S, now = new Date()) { return runBack(S, okAll, now); }

/** Days in a row with all five in jamāʿah or on time. */
export function onTimeStreak(S, now = new Date()) { return runBack(S, okOnTime, now); }

/** Both streaks with their bests: { all: { cur, best }, onTime: { cur, best } }. */
export function streaks(S, now = new Date()) {
  const all = prayerStreak(S, now), on = onTimeStreak(S, now);
  return { all: { cur: all, best: Math.max(all, bestRun(S, okAll, now)) }, onTime: { cur: on, best: Math.max(on, bestRun(S, okOnTime, now)) } };
}

/** Days in a row a good deed was done, counting back from today (or yesterday if today isn't done yet). */
export function amalStreak(S, id, now = new Date()) {
  const done = d => !!dayOf(S, d).amal[id]?.done;
  let d = done(now) ? now : addDays(now, -1), n = 0;
  while (tracked(S, d, now) && done(d)) { n++; d = addDays(d, -1); }
  return n;
}

/* ---------- "How you prayed" ---------- */
const emptyCounts = () => ({ congregation: 0, ontime: 0, madeup: 0, missed: 0, excused: 0, unlogged: 0, prayed: 0, due: 0 });

function addStatus(c, s) {
  if (s === "excused") { c.excused++; return; }
  if (!s) c.unlogged++; else c[s]++;
  c.due++;
  if (isPrayed(s)) c.prayed++;
}

/** Whether prayer p of date is due for counting (past day, or started today when settings are given). */
function dueFilter(S, now, opts) {
  const today = dkey(now), startedToday = opts.settings ? startedPrayers(now, now, opts.settings) : null;
  return (key, p, s) => key < today || !!s || (startedToday ? startedToday.includes(p) : false);
}

/**
 * Status counts over dates from..to (inclusive, tracked days only):
 * { congregation, ontime, madeup, missed, excused, unlogged, prayed, due, excusedDays, days }.
 * `due` = every non-excused prayer counted; `prayed` = congregation + ontime + madeup.
 */
export function statusCountsRange(S, from, to, now = new Date(), opts = {}) {
  const c = { ...emptyCounts(), excusedDays: 0, days: 0 };
  const isDue = dueFilter(S, now, opts);
  for (let d = from; dkey(d) <= dkey(to); d = addDays(d, 1)) {
    if (!tracked(S, d, now)) continue;
    const key = dkey(d), day = getDay(S, key);
    c.days++;
    if (day.excused) c.excusedDays++;
    for (const p of PRAYERS) {
      const s = statusOf(day, p);
      if (!isDue(key, p, s)) continue;
      addStatus(c, s);
    }
  }
  return c;
}

/** Prayer status counts over the last `n` days (including today). Same shape as statusCountsRange. */
export function statusCounts(S, n = 7, now = new Date(), opts = {}) {
  return statusCountsRange(S, addDays(now, -(n - 1)), now, now, opts);
}

/**
 * Per-prayer counts over from..to (for jamāʿah tiles and CH1 "Each prayer"):
 * { Fajr: { congregation, ontime, madeup, missed, excused, unlogged, prayed, due }, ... }
 */
export function perPrayerCounts(S, from, to, now = new Date(), opts = {}) {
  const out = Object.fromEntries(PRAYERS.map(p => [p, emptyCounts()]));
  const isDue = dueFilter(S, now, opts);
  for (let d = from; dkey(d) <= dkey(to); d = addDays(d, 1)) {
    if (!tracked(S, d, now)) continue;
    const key = dkey(d), day = getDay(S, key);
    for (const p of PRAYERS) {
      const s = statusOf(day, p);
      if (isDue(key, p, s)) addStatus(out[p], s);
    }
  }
  return out;
}

/**
 * CH1 "Each prayer" (stacked bars): one row per prayer over the last `days` days (default 30) —
 * [{ p, name, counts, prayedPct, onTimePct, jamaahPct }] (percentages of due, excused left out; null when nothing due).
 */
export function eachPrayerSeries(S, now = new Date(), { days = 30, settings = null, from = null, to = null } = {}) {
  const a = from || addDays(now, -(days - 1)), b = to || now;
  const c = perPrayerCounts(S, a, b, now, { settings });
  const pct = (n, d) => d ? Math.round(n / d * 100) : null;
  return PRAYERS.map(p => ({
    p, name: PRAYER_NAME[p], counts: c[p],
    prayedPct: pct(c[p].prayed, c[p].due),
    onTimePct: pct(c[p].congregation + c[p].ontime, c[p].due),
    jamaahPct: pct(c[p].congregation, c[p].due),
  }));
}

/** Per-prayer count of a status over the last n days. */
function perPrayer(S, status, n, now) {
  const c = Object.fromEntries(PRAYERS.map(p => [p, 0]));
  let days = 0;
  for (let i = 0; i < n; i++) {
    const d = addDays(now, -i);
    if (!tracked(S, d, now)) continue;
    days++;
    const day = dayOf(S, d);
    for (const p of PRAYERS) if (statusOf(day, p) === status) c[p]++;
  }
  return { c, days };
}

/* ---------- sunnah ---------- */

/** Whether a logged sunnah counts on a day (logged and allowed by its fard's status). */
function sunnahCounts(day, item) {
  return !!day.sunnah?.[item.id] && sunnahAllowed(item, item.prayer ? statusOf(day, item.prayer) : null, { excusedDay: !!day.excused });
}

/**
 * The sunnah measure for one day: { kind: "rakahs"|"raghibahWitr", got, of, excused }.
 * Hanafi: rak'ahs of sunnah muʾakkadah done, of 12 (14 on a Jumuʿah Friday). Shāfiʿī/Hanbalī: of 10.
 * Mālikī: Raghībah done + Witr done, of 2. Witr is never counted as a sunnah for Hanafīs. Excused days: of = 0.
 */
export function sunnahMeasureDay(S, key) {
  const m = madhhabOf(S), day = getDay(S, key), o = sunnahOpts(S, key);
  const t = measureTarget(m, o);
  if (day.excused || fullyExcused(day)) return { kind: t.kind, got: 0, of: 0, excused: true };
  let got = 0;
  for (const x of measuredItems(m, o)) if (sunnahCounts(day, x)) got += t.kind === "rakahs" ? x.rakahs : 1;
  if (t.kind === "raghibahWitr" && (day.witr === "done" || day.witr === "madeup")) got++;
  return { kind: t.kind, got, of: t.of, excused: false };
}

/**
 * Sunnah over a range (Progress Sunnah chapter): {
 *   kind, got, of, pct,                      // the measure summed over the days (excused days left out)
 *   items: [{ id, prayer, when, rakahs, tier, label, display, tierName, done, due }],  // one row per chip seen
 *   witr: { done, due, pct, inQada, tier },  // nights Witr was prayed, of non-excused nights
 *   excusedDays, days: [{ key, measure }]    // per-day measure for the week grid
 * }
 * Rows include ghayr muʾakkadah / nafl only when their settings are on.
 */
export function sunnahRange(S, from, to, now = new Date()) {
  const m = madhhabOf(S), rows = new Map(), days = [];
  let got = 0, of = 0, witrDone = 0, witrDue = 0, excusedDays = 0;
  for (let d = from; dkey(d) <= dkey(to); d = addDays(d, 1)) {
    if (!tracked(S, d, now)) continue;
    const key = dkey(d), day = getDay(S, key), o = sunnahOpts(S, key);
    const ms = sunnahMeasureDay(S, key);
    days.push({ key, measure: ms });
    if (ms.excused) { excusedDays++; continue; }
    got += ms.got; of += ms.of;
    for (const p of PRAYERS) {
      for (const x of sunnahFor(m, p, o)) {
        if (!rows.has(x.id)) { const t = tierLabel(x.tier); rows.set(x.id, { ...x, label: chipLabel(x), display: t.display, tierName: t.name, done: 0, due: 0 }); }
        const r = rows.get(x.id);
        r.due++;
        if (sunnahCounts(day, x)) r.done++;
      }
    }
    witrDue++;
    if (day.witr === "done" || day.witr === "madeup") witrDone++;
  }
  const w = getMadhhab(m).witr;
  return {
    kind: measureTarget(m).kind, got, of, pct: of ? Math.round(got / of * 100) : null,
    items: [...rows.values()],
    witr: { done: witrDone, due: witrDue, pct: witrDue ? Math.round(witrDone / witrDue * 100) : null, inQada: w.inQada, tier: w.tier },
    excusedDays, days,
  };
}

/** Whether a date shows the Jumuʿah list (Friday with settings.jumuah on). For the "JUM" mark. */
export const isJumuahDay = (S, date) => S.settings.jumuah !== false && isFriday(date);

/* ---------- good deeds ---------- */

/**
 * State of one good deed on a day: "done" | "missed" | "excused" | "pending" (today, not yet) | "future" | "untracked".
 * On excused days Qurʾān recitation is "excused" (not missed); "listen"/"dua" only exist on excused days.
 */
export function amalDayState(S, key, id, now = new Date()) {
  const date = parseKey(key);
  if (key > dkey(now)) return "future";
  if (!tracked(S, date, now)) return "untracked";
  const day = getDay(S, key);
  if (day.amal[id]?.done) return "done";
  const list = amalForDay(S, key);
  if (!list.some(a => a.id === id)) return day.excused ? "excused" : "untracked";
  return key === dkey(now) ? "pending" : "missed";
}

/**
 * State of a reading that counts as a good deed (points.READ_IDS: hizb, mulk, kahf, manzil) on a day, for the
 * Progress week: "done" | "missed" | "pending" (today) | "excused" (al-Mulk, al-Kahf, the Manzil on an excused
 * day: not recited then) | "na" (al-Kahf on any day but Friday) | "future" | "untracked".
 * reads: points.readsByDay(S); pass it in when drawing many days.
 */
export function readDayState(S, key, id, now = new Date(), reads = readsByDay(S)) {
  const date = parseKey(key);
  if (key > dkey(now)) return "future";
  if (!tracked(S, date, now)) return "untracked";
  if (id === "kahf" && date.getDay() !== 5) return "na";
  const day = getDay(S, key);
  if (countedReads(day, reads[key]).includes(id)) return "done";
  if (day.excused && id !== "hizb") return "excused";
  return key === dkey(now) ? "pending" : "missed";
}

/**
 * Share of tracked days (last n, excluding today while it's in progress) each good deed was done.
 * Excused days are left out for Qurʾān recitation; the excused-only deeds ("listen", "dua") are rated
 * over excused days only and appear only if there were any.
 */
export function amalRates(S, n = 30, now = new Date()) {
  const out = [];
  const extra = new Map();
  for (let i = 1; i <= n; i++) {
    const d = addDays(now, -i), key = dkey(d);
    if (!tracked(S, d, now) || !getDay(S, key).excused) continue;
    for (const a of amalForDay(S, key)) if ((a.swappedFrom || a.excusedOnly) && !extra.has(a.id)) extra.set(a.id, a);
  }
  for (const a of [...S.amalList, ...extra.values()]) {
    let days = 0, done = 0;
    for (let i = 1; i <= n; i++) {
      const d = addDays(now, -i), key = dkey(d);
      if (!tracked(S, d, now)) continue;
      if (!amalForDay(S, key).some(x => x.id === a.id)) continue;
      days++;
      if (getDay(S, key).amal[a.id]?.done) done++;
    }
    if (days) out.push({ a, rate: Math.round(done / days * 100), days });
  }
  return out;
}

/** Days of the month so far, as {date, pct}. */
export function monthDays(S, now = new Date()) {
  const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return Array.from({ length: dim }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), i + 1);
    return { date: d, pct: d > now && dkey(d) !== dkey(now) ? null : dayPct(S, d, now) };
  });
}

export function congregationCount(S, from, to, now = new Date()) {
  let n = 0;
  for (let d = from; dkey(d) <= dkey(to); d = addDays(d, 1)) {
    if (!tracked(S, d, now)) continue;
    const day = dayOf(S, d);
    for (const p of PRAYERS) if (day.prayers[p] === "congregation") n++;
  }
  return n;
}

/** Average completion per month of a year (null for months with no tracked days). */
export function yearMonths(S, year, now = new Date()) {
  return Array.from({ length: 12 }, (_, m) => {
    const dim = new Date(year, m + 1, 0).getDate();
    const vals = [];
    for (let i = 1; i <= dim; i++) vals.push(dayPct(S, new Date(year, m, i), now));
    return avg(vals);
  });
}

export function qadaClearedInYear(S, year) {
  return Object.entries(S.qada.monthLog).filter(([k]) => k.startsWith(year + "-")).reduce((s, [, v]) => s + (v.prayers || 0), 0);
}

export function qadaClearedInMonth(S, now = new Date()) {
  return S.qada.monthLog[ymKey(now)]?.prayers || 0;
}

/** Make-ups prayed back over all time (the "56 restored" figure). */
export function qadaClearedTotal(S) {
  return Object.values(S.qada.monthLog).reduce((s, v) => s + (v.prayers || 0), 0);
}

/**
 * Plain-language strengths and gaps from the last week and month of logs.
 * Each item: {title, sub}. Wording from strings.INSIGHT; prayers by display name.
 */
export function insights(S, now = new Date()) {
  const good = [], warn = [];
  const name = p => PRAYER_NAME[p] || p;

  // Strongest jamāʿah habit this week
  const cong = perPrayer(S, "congregation", 7, now);
  const bestCong = PRAYERS.map(p => [p, cong.c[p]]).sort((a, b) => b[1] - a[1])[0];
  // (left out for sisters: genderOf "f"; the Jamāʿah chapter itself stays in Progress)
  if (bestCong && bestCong[1] >= 2 && genderOf(S) !== "f") good.push({ title: INSIGHT.congTitle(name(bestCong[0]), bestCong[1], cong.days), sub: INSIGHT.congSub });

  // Qurʾān streak
  const qs = amalStreak(S, "quran", now);
  if (qs >= 3 && S.amalList.some(a => a.id === "quran")) {
    const last = lastDetail(S, "quran", null);
    good.push({ title: INSIGHT.quranTitle(qs), sub: INSIGHT.quranSub(last ? last.detail.split(" · ")[0] : "") });
  }

  // All five prayed streak
  const ps = prayerStreak(S, now);
  if (ps >= 3) good.push({ title: INSIGHT.allFiveTitle(ps), sub: INSIGHT.allFiveSub });

  // Witr kept every night this week (where it's wājib)
  if (getMadhhab(madhhabOf(S)).witr.inQada) {
    const w = sunnahRange(S, addDays(now, -7), addDays(now, -1), now).witr;
    if (w.due >= 3 && w.done === w.due) good.push({ title: INSIGHT.witrTitle(w.done), sub: INSIGHT.witrSub });
  }

  // Best good deed over the month
  const rates = amalRates(S, 30, now).filter(r => r.days >= 3);
  const sorted = [...rates].sort((a, b) => b.rate - a.rate);
  if (sorted[0] && sorted[0].rate >= 70 && !(sorted[0].a.id === "quran" && qs >= 3)) good.push({ title: INSIGHT.rateTitle(sorted[0].a.name, sorted[0].rate), sub: INSIGHT.rateSub(Math.min(30, sorted[0].days)) });

  // Most missed prayer this week
  const miss = perPrayer(S, "missed", 7, now);
  const worst = PRAYERS.map(p => [p, miss.c[p]]).sort((a, b) => b[1] - a[1])[0];
  if (worst && worst[1] >= 1) {
    const tip = !S.settings.preQada ? INSIGHT.tipTurnOn : S.settings.leadMin < 30 ? INSIGHT.tipLonger(S.settings.leadMin) : INSIGHT.tipPrayEarly;
    warn.push({ title: INSIGHT.missedTitle(name(worst[0]), worst[1]), sub: tip });
  }

  // Weakest good deed: salawāt and sadaqah have no daily target, so a low daily rate isn't "something to work on"
  const NO_TARGET = new Set(["salawat", "sadaqah"]);
  const targeted = sorted.filter(r => !NO_TARGET.has(r.a.id));
  const weakest = targeted[targeted.length - 1];
  if (weakest && sorted.length > 1 && weakest.rate < 60) {
    const best = sorted[0];
    warn.push({ title: INSIGHT.rateTitle(weakest.a.name, weakest.rate), sub: best.rate > weakest.rate ? INSIGHT.weakSub(best.a.name, best.rate, weakest.a.name.toLowerCase()) : INSIGHT.weakSubAlt });
  }

  // Unlogged prayers in the last week (excluding today; excused don't count)
  let unlogged = 0;
  for (let i = 1; i <= 7; i++) {
    const d = addDays(now, -i);
    if (!tracked(S, d, now)) continue;
    const day = dayOf(S, d);
    unlogged += PRAYERS.filter(p => !statusOf(day, p)).length;
  }
  if (unlogged >= 3) warn.push({ title: INSIGHT.unloggedTitle(unlogged), sub: INSIGHT.unloggedSub });

  return { good, warn };
}
