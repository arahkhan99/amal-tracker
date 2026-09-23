import { PRAYERS, dkey, addDays, monIdx, ymKey } from "./util.js";
import { getDay, lastDetail } from "./store.js";

/** Whether a day falls inside the tracked range (from first use through today). */
export function tracked(S, date, now = new Date()) {
  const k = dkey(date);
  return k >= S.createdKey && k <= dkey(now);
}

/** Completion 0..100 for a day, or null when the day is outside the tracked range. */
export function dayPct(S, date, now = new Date()) {
  if (!tracked(S, date, now)) return null;
  const day = getDay(S, dkey(date));
  let done = 0;
  const total = PRAYERS.length + S.amalList.length;
  for (const p of PRAYERS) if (day.prayers[p] && day.prayers[p] !== "missed") done++;
  for (const a of S.amalList) if (day.amal[a.id]?.done) done++;
  return total ? Math.round(done / total * 100) : 0;
}

/** Seven values Mon..Sun for the week containing `now`; null for future or untracked days. */
export function weekPcts(S, now = new Date(), weekOffset = 0) {
  const monday = addDays(now, -monIdx(now) + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(monday, i);
    return d > now && dkey(d) !== dkey(now) ? null : dayPct(S, d, now);
  });
}

export function avg(vals) {
  const v = vals.filter(x => x !== null && x !== undefined);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
}

/** Days in a row with all five prayers prayed. Today counts once complete. */
export function prayerStreak(S, now = new Date()) {
  const full = d => { const day = getDay(S, dkey(d)); return PRAYERS.every(p => day.prayers[p] && day.prayers[p] !== "missed"); };
  let d = full(now) ? now : addDays(now, -1), n = 0;
  while (tracked(S, d, now) && full(d)) { n++; d = addDays(d, -1); }
  return n;
}

/** Days in a row an amal was done, counting back from today (or yesterday if today isn't done yet). */
export function amalStreak(S, id, now = new Date()) {
  const done = d => !!getDay(S, dkey(d)).amal[id]?.done;
  let d = done(now) ? now : addDays(now, -1), n = 0;
  while (tracked(S, d, now) && done(d)) { n++; d = addDays(d, -1); }
  return n;
}

/** Prayer status counts over the last `n` days (including today). */
export function statusCounts(S, n = 7, now = new Date()) {
  const c = { congregation: 0, ontime: 0, missed: 0 };
  for (let i = 0; i < n; i++) {
    const d = addDays(now, -i);
    if (!tracked(S, d, now)) continue;
    const day = getDay(S, dkey(d));
    for (const p of PRAYERS) if (day.prayers[p]) c[day.prayers[p]]++;
  }
  return c;
}

/** Per-prayer count of a status over the last n days. */
function perPrayer(S, status, n, now) {
  const c = Object.fromEntries(PRAYERS.map(p => [p, 0]));
  let days = 0;
  for (let i = 0; i < n; i++) {
    const d = addDays(now, -i);
    if (!tracked(S, d, now)) continue;
    days++;
    const day = getDay(S, dkey(d));
    for (const p of PRAYERS) if (day.prayers[p] === status) c[p]++;
  }
  return { c, days };
}

/** Share of tracked days (last n, excluding today while it's in progress) each amal was done. */
export function amalRates(S, n = 30, now = new Date()) {
  const out = [];
  for (const a of S.amalList) {
    let days = 0, done = 0;
    for (let i = 1; i <= n; i++) {
      const d = addDays(now, -i);
      if (!tracked(S, d, now)) continue;
      days++;
      if (getDay(S, dkey(d)).amal[a.id]?.done) done++;
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
    const day = getDay(S, dkey(d));
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

/**
 * Plain-language strengths and gaps from the last week and month of logs.
 * Each item: {title, sub}.
 */
export function insights(S, now = new Date()) {
  const good = [], warn = [];

  // Strongest congregation habit this week
  const cong = perPrayer(S, "congregation", 7, now);
  const bestCong = PRAYERS.map(p => [p, cong.c[p]]).sort((a, b) => b[1] - a[1])[0];
  if (bestCong && bestCong[1] >= 2) good.push({ title: `${bestCong[0]} in congregation ${bestCong[1]} of the last ${cong.days} days`, sub: "Your strongest congregation habit right now." });

  // Quran streak
  const qs = amalStreak(S, "quran", now);
  if (qs >= 3 && S.amalList.some(a => a.id === "quran")) {
    const last = lastDetail(S, "quran", null);
    good.push({ title: `Quran read on ${qs} straight days`, sub: last ? `${last.detail.split(" · ")[0]} as of your last entry. Keep the thread going.` : "Keep the thread going." });
  }

  // All five prayed streak
  const ps = prayerStreak(S, now);
  if (ps >= 3) good.push({ title: `All five prayers on ${ps} days in a row`, sub: "Consistency is the whole game. Keep going." });

  // Best amal over the month
  const rates = amalRates(S, 30, now).filter(r => r.days >= 3);
  const sorted = [...rates].sort((a, b) => b.rate - a.rate);
  if (sorted[0] && sorted[0].rate >= 70 && !(sorted[0].a.id === "quran" && qs >= 3)) good.push({ title: `${sorted[0].a.name} at ${sorted[0].rate}%`, sub: `Done on most days over the last ${Math.min(30, sorted[0].days)} days.` });

  // Most missed prayer this week
  const miss = perPrayer(S, "missed", 7, now);
  const worst = PRAYERS.map(p => [p, miss.c[p]]).sort((a, b) => b[1] - a[1])[0];
  if (worst && worst[1] >= 1) {
    const tip = !S.settings.preQada ? "Turn on the pre-qada reminder in Settings." :
      S.settings.leadMin < 30 ? `Your pre-qada reminder is set to ${S.settings.leadMin} minutes; try 30.` : "Try praying it as soon as the time comes in.";
    warn.push({ title: `${worst[0]} missed ${worst[1]} time${worst[1] > 1 ? "s" : ""} this week`, sub: tip });
  }

  // Weakest amal
  const weakest = sorted[sorted.length - 1];
  if (weakest && sorted.length > 1 && weakest.rate < 60) {
    const best = sorted[0];
    warn.push({ title: `${weakest.a.name} at ${weakest.rate}%`, sub: best.rate > weakest.rate ? `${best.a.name} is at ${best.rate}%. Try pairing ${weakest.a.name.toLowerCase()} with something you already do daily.` : "Try pairing it with a prayer you rarely miss." });
  }

  // Unlogged prayers in the last week (excluding today)
  let unlogged = 0;
  for (let i = 1; i <= 7; i++) {
    const d = addDays(now, -i);
    if (!tracked(S, d, now)) continue;
    const day = getDay(S, dkey(d));
    unlogged += PRAYERS.filter(p => !day.prayers[p]).length;
  }
  if (unlogged >= 3) warn.push({ title: `${unlogged} prayers left unlogged this week`, sub: "Fill them in from the Tracker so your progress stays accurate." });

  return { good, warn };
}
