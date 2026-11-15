/*
 * Hijri dates. Three ways to get one, plus a manual adjustment that applies on top of any of them:
 *   umalqura   Umm al-Qura (the default, same as before this feature)
 *   civil      tabular civil calendar (Intl "islamic-civil")
 *   tbla       tabular astronomical epoch (Intl "islamic-tbla")
 *   committee  follow a moon-sighting committee (see hijri-committees.js)
 * Settings live in S.settings.hijri = { method, committee, adjust }. hijriLabel(date) reads them through the
 * source registered by views/settings.js, so callers (Home, lock screen, Tracker) don't pass anything.
 */
import { committeeData, committeeParts, dayNum, keyOfDayNum } from "./hijri-committees.js";

export const HIJRI_MONTHS = ["Muharram", "Safar", "Rabi' al-Awwal", "Rabi' al-Thani", "Jumada al-Ula", "Jumada al-Akhirah", "Rajab", "Sha'ban", "Ramadan", "Shawwal", "Dhu al-Qa'dah", "Dhu al-Hijjah"];

export const CALENDARS = { umalqura: "islamic-umalqura", civil: "islamic-civil", tbla: "islamic-tbla" };
export const DEFAULT_HIJRI = { method: "umalqura", committee: "", adjust: 0 };

export function normalizeHijri(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const method = r.method === "committee" || CALENDARS[r.method] ? r.method : "umalqura";
  const adjust = Math.max(-2, Math.min(2, Math.round(+r.adjust || 0)));
  return { method, committee: typeof r.committee === "string" ? r.committee : "", adjust };
}

let source = () => null;
/** views/settings.js registers a getter for S.settings.hijri. */
export function setHijriSource(fn) { source = fn; }
export const currentHijri = () => normalizeHijri(source());

const fmts = {};
/** The calculated {y, m, d} for a day number, in the given Intl calendar. Null when the calendar isn't available. */
export function calcParts(n, cal = "islamic-umalqura") {
  try {
    const f = fmts[cal] ||= new Intl.DateTimeFormat(`en-u-ca-${cal}-nu-latn`, { day: "numeric", month: "numeric", year: "numeric", timeZone: "UTC" });
    const parts = f.formatToParts(new Date(n * 86400000 + 43200000));
    const get = t => parseInt(parts.find(x => x.type === t)?.value, 10);
    const d = get("day"), m = get("month"), y = get("year") || get("relatedYear");
    return d && m && y ? { y, m, d } : null;
  } catch (e) { return null; }
}
/** Is this Intl calendar really supported here (some engines silently fall back to Gregorian)? */
export function calendarAvailable(method) {
  const cal = CALENDARS[method];
  try { return !!cal && new Intl.DateTimeFormat(`en-u-ca-${cal}`).resolvedOptions().calendar === cal && !!calcParts(0, cal); } catch (e) { return false; }
}

const localKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/**
 * {y, m, d, source} for a local Date (or "YYYY-MM-DD"), using the user's settings or `st` if given.
 * source is "calc", "committee" or "fallback" (a committee with no recent decision: calculation + cached offset).
 */
export function hijriParts(date, st = currentHijri()) {
  const s = normalizeHijri(st);
  // Manual adjustment: ask for the day that many days later or earlier, so month ends line up
  const g = dayNum(typeof date === "string" ? date : localKey(date)) + s.adjust;
  const cal = CALENDARS[s.method] || CALENDARS.umalqura;
  const calc = n => calcParts(n, cal) || calcParts(n, CALENDARS.umalqura);
  const p = s.method === "committee" ? committeeParts(committeeData(s.committee), g, calc) : { ...calc(g), source: "calc" };
  return p.d ? p : null;
}

/** "25 Rabi' al-Awwal 1448" */
export function hijriLabel(date, st) {
  try {
    const p = hijriParts(date, st);
    return p ? `${p.d} ${HIJRI_MONTHS[p.m - 1]} ${p.y}` : "";
  } catch (e) { return ""; }
}

/** Hijri month number (1 = Muharram, 9 = Ramadan), or 0 if unknown. */
export function hijriMonth(date, st) {
  try { return hijriParts(date, st)?.m || 0; } catch (e) { return 0; }
}

/** The Gregorian day key ("YYYY-MM-DD") that offsets by n days from another key, used by tests and the editor sheet. */
export const shiftKey = (key, n) => keyOfDayNum(dayNum(key) + n);
