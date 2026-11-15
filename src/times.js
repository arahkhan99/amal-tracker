import { Coordinates, CalculationMethod, PrayerTimes, Madhab } from "adhan";
import { PRAYERS, addDays, dkey, MON } from "./util.js";
import { ASR_LABEL } from "./strings.js";
import { asrMethod, middleOfNight } from "./rules/madhhab.js";

export const METHODS = {
  NorthAmerica: "ISNA (North America)",
  MuslimWorldLeague: "Muslim World League",
  Egyptian: "Egyptian General Authority",
  Karachi: "University of Islamic Sciences, Karachi",
  UmmAlQura: "Umm al-Qura, Makkah",
  Dubai: "Dubai",
  MoonsightingCommittee: "Moonsighting Committee",
  Kuwait: "Kuwait",
  Qatar: "Qatar",
  Singapore: "Singapore",
  Turkey: "Diyanet, Turkey",
  Tehran: "Tehran",
};
export const METHOD_SHORT = { NorthAmerica: "ISNA", MuslimWorldLeague: "MWL", Egyptian: "Egyptian", Karachi: "Karachi", UmmAlQura: "Umm al-Qura", Dubai: "Dubai", MoonsightingCommittee: "Moonsighting", Kuwait: "Kuwait", Qatar: "Qatar", Singapore: "Singapore", Turkey: "Diyanet", Tehran: "Tehran" };
/** ʿAsr method labels, keyed by settings.asr (wording in strings.js). */
export const ASR = ASR_LABEL;

/** Used until the user shares a location. */
export const FALLBACK_LOCATION = { lat: 41.8781, lng: -87.6298, label: "Chicago, IL" };

/**
 * Best guess of where the user is before they set a location (e.g. from the phone's time zone).
 * Returns { lat, lng, label, method, guessed: true }. Placeholder until the fixes agent fills it in.
 */
export function defaultLocation() {
  return { ...FALLBACK_LOCATION, method: "NorthAmerica", guessed: true };
}

function params(settings) {
  const make = CalculationMethod[settings.method] || CalculationMethod.NorthAmerica;
  const p = make();
  // settings.asr wins; without it the madhhab decides (Hanafi default → the later ʿAsr)
  const asr = settings.asr || asrMethod(settings.madhhab);
  p.madhab = asr === "hanafi" ? Madhab.Hanafi : Madhab.Shafi;
  return p;
}

/** Prayer start times (plus sunrise) for a local calendar date. */
export function timesFor(date, settings) {
  const loc = settings.location || FALLBACK_LOCATION;
  const pt = new PrayerTimes(new Coordinates(loc.lat, loc.lng), date, params(settings));
  return { Fajr: pt.fajr, Sunrise: pt.sunrise, Dhuhr: pt.dhuhr, Asr: pt.asr, Maghrib: pt.maghrib, Isha: pt.isha };
}

/** When a prayer's window closes (Fajr at sunrise, Isha at next Fajr, others at the next prayer). */
export function windowEnd(date, p, settings, t = timesFor(date, settings)) {
  if (p === "Fajr") return t.Sunrise;
  if (p === "Isha") return timesFor(addDays(date, 1), settings).Fajr;
  return t[PRAYERS[PRAYERS.indexOf(p) + 1]];
}

/**
 * The prayer whose window contains `now`, as {p, date, end}. Before today's
 * Fajr that is last night's Isha (dated yesterday). Between sunrise and Dhuhr
 * nothing is due, so it returns null.
 */
export function currentWindow(now, settings) {
  const t = timesFor(now, settings);
  if (now < t.Fajr) return { p: "Isha", date: addDays(now, -1), end: t.Fajr };
  for (let i = PRAYERS.length - 1; i >= 0; i--) {
    const p = PRAYERS[i];
    if (now >= t[p]) {
      const end = windowEnd(now, p, settings, t);
      return now < end ? { p, date: now, end } : null;
    }
  }
  return null;
}

export function nextPrayer(now, settings) {
  const t = timesFor(now, settings);
  const p = PRAYERS.find(x => t[x] > now);
  if (p) return { p, time: t[p], tomorrow: false };
  return { p: "Fajr", time: timesFor(addDays(now, 1), settings).Fajr, tomorrow: true };
}

/* ---------- ʿIshāʾ "best before" and Made up deadline ---------- */

/**
 * ʿIshāʾ "best before": the middle of the night, counted from Maghrib to the next Fajr
 * (docs/madhhab-rules.md). `date` is the calendar day the ʿIshāʾ belongs to.
 */
export function ishaBestBefore(date, settings) {
  return middleOfNight(timesFor(date, settings).Maghrib, timesFor(addDays(date, 1), settings).Fajr);
}

/**
 * "Made up" means prayed after its window ended but before the next Fajr. This is that Fajr
 * (the day after `date`) for every prayer of `date`. The status itself is stored as-is; the UI uses
 * this to offer "I made it up" and the make-up nudge only while it's still true.
 */
export function madeUpDeadline(date, settings) {
  return timesFor(addDays(date, 1), settings).Fajr;
}

/** Whether a prayer of `date` can still be marked "Made up" at `now` (its window is over and the next Fajr hasn't come). */
export function canStillMakeUp(date, p, now, settings) {
  return now >= windowEnd(date, p, settings) && now < madeUpDeadline(date, settings);
}

/** Prayers of `date` whose start time has passed at `now` (all five for past days, none for future days). */
export function startedPrayers(date, now, settings) {
  const k = dkey(date), today = dkey(now);
  if (k < today) return PRAYERS.slice();
  if (k > today) return [];
  const t = timesFor(date, settings);
  return PRAYERS.filter(p => t[p] <= now);
}

/* ---------- weeks (Sunday first) ----------
 * Zad's weeks (This week on Home, Progress, the weekly content rotation) start on Sunday (user, 14 Nov 2026).
 * Day index within the week: Sun 0, Mon 1, … Sat 6.
 * The Hizb al-Aʿzam keeps its own traditional week: Saturday = manzil 1 (HIZB_WEEK_START).
 */
export const WEEK_START = 0; // Date.getDay() of Sunday
export const HIZB_WEEK_START = 6; // Date.getDay() of Saturday

/** 0..6 position of a date in its week (Sunday = 0 by default; pass start = 1 for Monday-first). */
export function weekIndex(date, start = WEEK_START) { return (date.getDay() - start + 7) % 7; }

/** Local midnight of the first day of the week containing `date`, shifted by `offset` weeks. */
export function weekStartDate(date, offset = 0, start = WEEK_START) { return addDays(date, -weekIndex(date, start) + offset * 7); }

/** The seven dates of the week containing `date` (shifted by `offset` weeks), first day first. */
export function weekDates(date, offset = 0, start = WEEK_START) {
  const first = weekStartDate(date, offset, start);
  return Array.from({ length: 7 }, (_, i) => addDays(first, i));
}

/** Stable key of a week: the dkey of its first day (e.g. "2026-11-08" for Sun 8 Nov). */
export function weekKey(date, start = WEEK_START) { return dkey(weekStartDate(date, 0, start)); }

/** Whole weeks between the week of `a` and the week of `b` (b later → positive). Useful for weekly rotation. */
export function weeksBetween(a, b, start = WEEK_START) {
  return Math.round((weekStartDate(b, 0, start) - weekStartDate(a, 0, start)) / (7 * 864e5));
}

/** Short label of a week, e.g. "Sun 8 – Sat 14 Nov" or "Sun 29 Nov – Sat 5 Dec". */
export function weekRangeLabel(date, offset = 0, start = WEEK_START) {
  const DOW3 = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const d = weekDates(date, offset, start), a = d[0], b = d[6];
  const m = x => MON[x.getMonth()].slice(0, 3);
  return a.getMonth() === b.getMonth()
    ? `${DOW3[a.getDay()]} ${a.getDate()} – ${DOW3[b.getDay()]} ${b.getDate()} ${m(b)}`
    : `${DOW3[a.getDay()]} ${a.getDate()} ${m(a)} – ${DOW3[b.getDay()]} ${b.getDate()} ${m(b)}`;
}

/** Hizb al-Aʿzam manzil (1..7) for a date: Saturday = 1 … Friday = 7. */
export function manzilFor(date) { return weekIndex(date, HIZB_WEEK_START) + 1; }
