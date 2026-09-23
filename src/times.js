import { Coordinates, CalculationMethod, PrayerTimes, Madhab } from "adhan";
import { PRAYERS, addDays } from "./util.js";

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
export const ASR = { shafi: "Standard (Shafi'i)", hanafi: "Hanafi" };

/** Used until the user shares a location. */
export const FALLBACK_LOCATION = { lat: 41.8781, lng: -87.6298, label: "Chicago, IL" };

function params(settings) {
  const make = CalculationMethod[settings.method] || CalculationMethod.NorthAmerica;
  const p = make();
  p.madhab = settings.asr === "hanafi" ? Madhab.Hanafi : Madhab.Shafi;
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
