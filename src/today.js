/*
 * The Today tab's rules, without the DOM (views/home.js draws them; tests import this file).
 *
 * Now chapter, one-tap logging:
 * - Brothers: "Prayed in congregation" (primary), then "Prayed on time".
 * - Sisters: "Prayed on time" only. "In congregation" is under Other.
 * - Not set ("prefer not to say"): "Prayed on time" (primary), then "Prayed in congregation".
 * - Other: the remaining statuses. "Made up later" only once the prayer's time has ended (logging.madeUpAllowed),
 *   Excused only when excused days are on.
 * - No buttons before a prayer begins (logging.canLog): the chapter says "Begins at …" instead.
 * Every tap goes through logPrayer(): the same rules as manual logging (logAllowed, day.first stamped by
 * store.setPrayer), and it returns a snapshot so the toast's Undo can put things back exactly (restoreSnapshot).
 */
import * as store from "./store.js";
import { logAllowed, madeUpAllowed } from "./logging.js";
import { navTabs, isOn } from "./features.js";
import { timesFor, currentWindow, nextPrayer } from "./times.js";
import { PRAYERS, dkey, addDays, parseKey } from "./util.js";
import { prayerStreak, sunnahMeasureDay } from "./stats.js";
import { sheetCount } from "./reading.js";
import { NAFL_ADDON, itemById, madhhabOf } from "./rules/madhhab.js";

/** The Now chapter's buttons, in order (statuses; the first is the primary button). */
export function logButtons(S) {
  const g = store.genderOf(S);
  if (g === "m") return ["congregation", "ontime"];
  if (g === "f") return ["ontime"];
  return ["ontime", "congregation"];
}

/**
 * The statuses offered in the Other sheet for prayer `p` of day `key` at `now`.
 * all: true (a Today row's Log button) lists every status, the buttons' ones first.
 */
export function otherOptions(S, key, p, now = new Date(), { all = false } = {}) {
  const shown = all ? [] : logButtons(S);
  const order = all ? [...logButtons(S), "congregation", "ontime", "madeup", "missed", "excused"] : ["congregation", "madeup", "missed", "excused"];
  const out = [];
  for (const k of order) {
    if (shown.includes(k) || out.includes(k)) continue;
    if (k === "madeup" && !madeUpAllowed(S, key, p, now) && store.prayerStatus(S, key, p) !== "madeup") continue;
    if (k === "excused" && S.settings.excusedDays === false) continue;
    out.push(k);
  }
  return out;
}

/* ---------- undo: snapshot the parts of S a log can touch ---------- */
const clone = o => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));

/** Copy the days `keys` (one key or a list), make-ups, the tracked range start and excused mode. */
export function snapshotDays(S, keys) {
  const ks = [].concat(keys);
  return { days: ks.map(k => [k, clone(S.days[k])]), qada: clone(S.qada), created: S.createdKey, excusedMode: clone(S.excusedMode) };
}
/** Put a snapshot back. Days that didn't exist come back empty (with a fresh edit stamp, so sync keeps the undo). */
export function restoreSnapshot(S, snap, now = Date.now()) {
  for (const [k, d] of snap.days) {
    if (d === undefined) S.days[k] = { prayers: {}, amal: {}, note: "", u: now };
    else { S.days[k] = d; d.u = now; }
  }
  S.qada = snap.qada; S.createdKey = snap.created; S.excusedMode = snap.excusedMode;
}

/**
 * Log (or clear, with status null) a prayer as a one-tap button or the Other sheet does.
 * Returns { ok: true, was, snap } or { ok: false, reason: "notStarted" | "madeUpEarly" } (nothing changed).
 * The caller commits, and offers Undo with restoreSnapshot(S, snap).
 */
export function logPrayer(S, key, p, status, now = new Date()) {
  if (!logAllowed(S, key, p, status, now)) return { ok: false, reason: "notStarted" };
  if (status === "madeup" && store.prayerStatus(S, key, p) !== "madeup" && !madeUpAllowed(S, key, p, now)) return { ok: false, reason: "madeUpEarly" };
  const snap = snapshotDays(S, key);
  if (key < S.createdKey) S.createdKey = key; // backfilling an earlier day extends the tracked range
  const was = store.setPrayer(S, key, p, status || null, now);
  return { ok: true, was, snap };
}

/**
 * The rows of the Today chapter, in order: the five prayers with Sunrise between Fajr and Zuhr. Sunrise is only
 * shown (it marks the end of Fajr's time); it is never logged, and nothing counts it (stats and provisions use PRAYERS).
 */
export const TODAY_ROWS = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];

/** The Today tab's chapters. With one tab only (prayers only) there is one chapter and no chapter bar. */
export function todayChapters(S) {
  return navTabs(S).length > 1 ? ["now", "today"] : ["today"];
}

/** The first-run guide line ("Tap when you've prayed") shows until anything is logged for the first time. */
export function guideLineDue(S) {
  if (!S?.profile?.onboarded) return false;
  return !Object.values(S.days || {}).some(d => d && (d.first > 0 || Object.keys(d.prayers || {}).length > 0));
}

/* ---------- "Make up Zuhr now?" (the Now chapter) ----------
 * One quiet card under the main card when a fard prayer of TODAY is missed (logged "missed", or its time ended
 * unlogged) and not yet made up. "I made it up" logs it as made up (logPrayer, the same rules as Other's "Made up
 * later": changing Missed to Made up takes it off the make-ups again, store.setPrayer). "Not now" hides it for
 * that prayer today. It follows the make-up nudge setting (settings.makeupNudge) and the Make-ups feature, and
 * isn't shown on an excused day, before the first log ever, or during the three times no ṣalāh is prayed.
 */

/**
 * The times no ṣalāh is prayed, in minutes. This follows the app's Hanafi default (makrūh taḥrīmī: sunrise,
 * zawāl, sunset); other madhhabs use the same windows to keep it simple. Making up a fard after Fajr and after
 * ʿAsr is allowed (Hanafi), so those periods are not blocked.
 */
export const FORBIDDEN_MIN = { afterSunrise: 15, beforeZuhr: 10, beforeMaghrib: 20 };

/**
 * Which forbidden time `now` is in: "sunrise" (sunrise until 15 min after), "zawal" (10 min before Zuhr until
 * Zuhr begins), "sunset" (from about 20 min before Maghrib, when the sun yellows, until Maghrib), or "".
 */
export function forbiddenTime(now, settings, t = timesFor(now, settings)) {
  const m = 60000, F = FORBIDDEN_MIN, in_ = (a, b) => now >= a && now < b;
  if (in_(t.Sunrise, new Date(+t.Sunrise + F.afterSunrise * m))) return "sunrise";
  if (in_(new Date(+t.Dhuhr - F.beforeZuhr * m), t.Dhuhr)) return "zawal";
  if (in_(new Date(+t.Maghrib - F.beforeMaghrib * m), t.Maghrib)) return "sunset";
  return "";
}

/**
 * The prayer the card offers now, or "": the most recent of today's fard prayers whose time has ended and that is
 * missed or unlogged (ʿIshāʾ's time runs to the next Fajr, so it never is). One card at most: when that prayer was
 * dismissed ("Not now", `dismissed`: today's dismissed prayers), nothing is offered.
 */
export function makeUpNowFor(S, now = new Date(), { dismissed = [] } = {}) {
  if (!isOn(S, "makeups") || S.settings.makeupNudge === false) return "";
  if (guideLineDue(S)) return ""; // nothing logged yet: not on the first day's unlogged prayers
  const key = dkey(now);
  if (store.isExcusedDay(S, key)) return "";
  const p = [...PRAYERS].reverse().find(x => {
    const s = store.prayerStatus(S, key, x);
    return (s === "missed" || !s) && madeUpAllowed(S, key, x, now);
  });
  if (!p || dismissed.includes(p) || forbiddenTime(now, S.settings)) return "";
  return p;
}

/* ---------- "Make-ups · 8 left" on the Today chapter ---------- */
/**
 * What the Make-ups line says, or null to hide it: { prayers, fasts } owed (fasts: qada.fasts, as the Make-ups
 * chapter shows them), or { clear: true } when nothing is owed but make-ups were logged before. Hidden when the
 * Make-ups feature is off, on an excused day (make-up prayers aren't prayed then), and when nothing was ever owed.
 */
export function makeupsLine(S, key) {
  if (!isOn(S, "makeups") || store.isExcusedDay(S, key)) return null;
  const prayers = store.qadaOwed(S), fasts = Math.max(0, S.qada?.fasts || 0);
  if (prayers > 0 || fasts > 0) return { prayers, fasts };
  const logged = Object.values(S.qada?.monthLog || {}).some(m => (m?.prayers || 0) + (m?.fasts || 0) > 0);
  return logged ? { prayers: 0, fasts: 0, clear: true } : null;
}

/* ---------- the Now chapter after logging (19 Nov 2026: "Now moves on to the next prayer") ---------- */
/**
 * What the Now chapter is about at `now`:
 * - { kind: "open", p, key, cur }: a prayer's time is open and it is not logged yet (the one-tap buttons);
 * - { kind: "next", p, key, time, tomorrow, after }: otherwise, the next prayer, with no buttons until it begins.
 *   `after` is the prayer just logged (its window is still open), or null (between sunrise and Zuhr).
 * Edits to a logged prayer are made on the Today chapter, so a logged prayer is never shown here again.
 */
export function nowFocus(S, now = new Date()) {
  const cur = currentWindow(now, S.settings);
  if (cur && !store.prayerStatus(S, dkey(cur.date), cur.p)) return { kind: "open", p: cur.p, key: dkey(cur.date), cur };
  const nx = nextPrayer(now, S.settings);
  return { kind: "next", p: nx.p, key: nx.tomorrow ? dkey(addDays(now, 1)) : dkey(now), time: nx.time, tomorrow: !!nx.tomorrow, after: cur ? cur.p : null };
}

/**
 * The "all five prayed" moment on Now (M6): { key, streak } once every fard of the day whose prayers are current
 * (last night's ʿIshāʾ window belongs to yesterday) is prayed, else null. Not on an excused day.
 */
export function allFiveMoment(S, now = new Date()) {
  const cur = currentWindow(now, S.settings);
  const key = cur ? dkey(cur.date) : dkey(now);
  if (store.isExcusedDay(S, key)) return null;
  if (!PRAYERS.every(p => store.isPrayed(store.prayerStatus(S, key, p)))) return null;
  return { key, streak: prayerStreak(S, now) };
}

/* ---------- the nafl add-on in the Good deeds sheet ---------- */
/**
 * The nafl add-on items the user chose to show (settings.naflShow), in order: [{ key, id, item }]. With a day
 * `key`: none on an excused day (no ṣalāh is prayed then; store.setSunnah refuses them too).
 */
export function naflShown(S, key = "") {
  if (key && store.isExcusedDay(S, key)) return [];
  const want = Array.isArray(S.settings.naflShow) ? S.settings.naflShow : [];
  const m = madhhabOf(S);
  return NAFL_ADDON.filter(x => want.includes(x.key)).map(x => ({ ...x, item: itemById(x.id, m) })).filter(x => x.item);
}

/**
 * Today's actual times for the nafl guidance (all Dates): Ishrāq from 15 min after sunrise (FORBIDDEN_MIN),
 * Duhā until 10 min before Zuhr (zawāl), Awwābīn after Maghrib, Tahajjud until the next Fajr.
 */
export function naflTimes(key, settings, now = new Date()) {
  const d = parseKey(key), t = timesFor(d, settings), m = 60000;
  const fajr = now < t.Fajr || key !== dkey(now) ? t.Fajr : timesFor(addDays(d, 1), settings).Fajr;
  return {
    ishraq: new Date(+t.Sunrise + FORBIDDEN_MIN.afterSunrise * m),
    duha: new Date(+t.Dhuhr - FORBIDDEN_MIN.beforeZuhr * m),
    awwabin: t.Maghrib,
    tahajjud: fajr,
  };
}

/* ---------- the quiet lines on the Today chapter ---------- */
/**
 * "Good deeds · n of m" (always shown while the Good deeds feature is on): the deeds that are not read in Read,
 * plus the nafl prayers shown in the sheet. empty: nothing to tick (the line says "add your own"). Null when off.
 */
export function deedsLine(S, key) {
  if (!isOn(S, "deeds")) return null;
  const c = sheetCount(S, key), nf = naflShown(S, key);
  const naflDone = nf.filter(x => store.sunnahDone(S, key, x.id)).length;
  const done = c.done + naflDone, of = c.of + nf.length;
  return { done, of, empty: of === 0, inRead: c.inRead };
}

/**
 * "Sunnah · 6 of 12 rakʿahs · Witr ✓" (M7), only with the Sunnah feature on and not on an excused day:
 * { got, of, kind, witr: "done" | "missed" | "todo" | "" } ("todo" only once ʿIshāʾ has begun at `now`).
 */
export function sunnahLine(S, key, now = new Date()) {
  if (!isOn(S, "sunnah") || store.isExcusedDay(S, key)) return null;
  const m = sunnahMeasureDay(S, key);
  if (m.excused) return null;
  const w = store.witrChip(S, key);
  const witr = !w.allowed ? "" : w.done ? "done" : w.status === "missed" ? "missed" : logAllowed(S, key, "Isha", true, now) ? "todo" : "";
  return { got: m.got, of: m.of, kind: m.kind, witr };
}
