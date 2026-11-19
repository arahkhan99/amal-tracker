/*
 * Provisions & levels: the pure helpers behind the UI (views/provisions.js). No DOM, no clock: pass
 * `today` ("YYYY-MM-DD"). The engine is points.js; the stored switches are S.settings.provisions (store.js).
 * Modular: when provisions are off, every "show it?" helper here says no, so nothing of it appears.
 *
 * `ctx` (optional, last argument): { started, rev }. started: today's prayers already begun
 * (times.startedPrayers), so an excused prayer only counts once its time has come (points.dayProvisions).
 * rev: the app's change counter (app.revision); with it the count is reused until rev, today, `started` or a
 * scoring setting changes. Without it (tests) every call counts afresh.
 */
import { provisions, dayBreakdown, needFor, weekRange, displayLevel } from "./points.js";
import { recordLevel, defaultProvisions } from "./store.js";
import { madhhabOf } from "./rules/madhhab.js";
import { daysBetween, parseKey } from "./util.js";
import { WEEK_START } from "./times.js";

/** Days of use before the one-time Home offer (P3). */
export const OFFER_AFTER_DAYS = 7;

const set = S => S?.settings?.provisions || defaultProvisions();
export const pvOn = S => !!set(S).on;
export const homeChipOn = S => pvOn(S) && !!set(S).home;
export const trackerChipOn = S => pvOn(S) && !!set(S).tracker;

/** Whole days since the install (createdKey) up to today. */
export function daysOfUse(S, today) {
  if (!S?.createdKey || !today) return 0;
  return Math.max(0, daysBetween(parseKey(S.createdKey), parseKey(today)));
}

/** The one-time offer on Home: set up, not on, never offered, and at least 7 days of use. */
export function offerDue(S, today) {
  const p = set(S);
  return !!S?.profile?.onboarded && !p.on && !p.offered && daysOfUse(S, today) >= OFFER_AFTER_DAYS;
}

/**
 * Everything the card, the chip and the sheets show: { total, level (as shown, never down), frac (0..1 to the
 * next level), toNext, next, week, daysLogged, since }. Level and bar use the shown level, so a re-tune that
 * lowers the total keeps the level and the bar simply fills more slowly.
 */
export function pvSummary(S, today, ctx) {
  const all = counted(S, today, ctx);
  const level = displayLevel(S, { level: all.level });
  const lo = needFor(level), hi = needFor(level + 1);
  const frac = Math.max(0, Math.min(1, (all.total - lo) / (hi - lo)));
  const { from } = weekRange(today, WEEK_START);
  const week = Object.entries(all.byDay).reduce((a, [k, n]) => (k >= from && k <= today ? a + n : a), 0);
  return { total: all.total, level, frac, toNext: Math.max(0, hi - all.total), next: level + 1, week, daysLogged: all.daysLogged, since: all.since };
}

/** Turn provisions on (offer or Settings). The history level is recorded silently, so it never shows as a level-up. */
export function turnOn(S, today, ctx) {
  const p = S.settings.provisions || (S.settings.provisions = defaultProvisions());
  p.on = true; p.offered = true;
  recordLevel(S, counted(S, today, ctx).level);
  p.sig = scoringSig(S);
  return pvSummary(S, today, ctx);
}
export function turnOff(S) {
  const p = S.settings.provisions || (S.settings.provisions = defaultProvisions());
  p.on = false;
}
/** "Not now" or ×: the offer never comes back. */
export function dismissOffer(S) {
  const p = S.settings.provisions || (S.settings.provisions = defaultProvisions());
  p.offered = true;
}

/**
 * What decides how the history is counted, besides the log itself: "Prayer at home counts in full" (also set
 * by choosing sister), the weights version, the madhhab (which sunnah / Witr count) and the install day.
 */
export function scoringSig(S) {
  const p = set(S);
  return [p.homeFull ? 1 : 0, p.weights || "", madhhabOf(S), S?.createdKey || ""].join("|");
}

let memo = null;
/** provisions(S, { today, started }), reused while ctx.rev, today, started, the scoring settings and S's log objects stay the same. */
function counted(S, today, { started, rev } = {}) {
  const key = rev == null ? null : `${rev}|${today}|${started ? started.join(",") : "*"}|${scoringSig(S)}`;
  if (key && memo && memo.key === key && memo.S === S && memo.days === S.days && memo.qada === S.qada && memo.tools === S.tools) return memo.r;
  const r = provisions(S, { today, started });
  memo = key ? { key, S, days: S.days, qada: S.qada, tools: S.tools, r } : null;
  return r;
}

/**
 * Level-up detection, after a change: the new level (to show the calm sheet next time the app opens) when
 * recordLevel says it is a new best, else 0. Off: always 0 (and nothing is recorded).
 * A change of scoring settings since the last check (scoringSig: home-in-full on, a sister set-up, a new
 * weights version, another madhhab) re-counts the history without anything new being done, so its level is
 * recorded silently, like turnOn, and never shown as a level-up.
 */
export function checkLevelUp(S, today, ctx) {
  if (!pvOn(S)) return 0;
  const level = counted(S, today, ctx).level, p = S.settings.provisions, sig = scoringSig(S);
  if (p.sig !== sig) {
    const known = p.sig != null; // an older save without a signature: start from here, nothing changed
    p.sig = sig;
    if (known) { recordLevel(S, level); return 0; }
  }
  return recordLevel(S, level) ? level : 0;
}

/** One day's breakdown for the Tracker (P7/P7b), or null when the option is off. */
export function trackerDay(S, key, today, ctx) {
  if (!trackerChipOn(S)) return null;
  return dayBreakdown(S, key, { today, started: ctx?.started });
}
