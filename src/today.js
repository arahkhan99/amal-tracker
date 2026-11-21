/*
 * The Today tab's rules, without the DOM (views/home.js draws them; tests import this file).
 *
 * Today is one page (19 Nov 2026, the merged Today; Direction B "Time of day" the same night): a header tinted by
 * the time of day (bandAt) with the current prayer (or the next one) in a mihrab arch (heroOf), the five prayers as
 * one thin list (Sunrise between Fajr and Zuhr), then two pills (Good deeds · Make-ups). Logging:
 * - Tap a prayer: not logged → on time → in congregation → cleared, for everyone (tapNext). It is a "tap again"
 *   cycle on what is stored, not a timed double tap. A tap on a prayer stored as Made up, Missed or Excused opens
 *   the options sheet instead (so a tap never overwrites one of those).
 * - The options sheet (long press, or ⋯) lists every status. "Made up later" only once the prayer's time has
 *   ended (logging.madeUpAllowed), Excused only when excused days are on.
 * - A prayer that hasn't begun can't be tapped (logging.canLog): its row only shows its time.
 * - The big Prayed button on the current prayer is the same as one tap on its row.
 * Every tap goes through logPrayer(): the same rules as manual logging (logAllowed, day.first stamped by
 * store.setPrayer), and it returns a snapshot so the toast's Undo can put things back exactly (restoreSnapshot).
 */
import * as store from "./store.js";
import { canLog, logAllowed, madeUpAllowed } from "./logging.js";
import { isOn, toolVisible } from "./features.js";
import { helpState } from "./guide.js";
import { timesFor, currentWindow, nextPrayer } from "./times.js";
import { PRAYERS, dkey, addDays, parseKey } from "./util.js";
import { sunnahMeasureDay } from "./stats.js";
import { readItems, READ_DEEDS } from "./reading.js";
import { NAFL_ADDON, itemById, madhhabOf } from "./rules/madhhab.js";

/** The one-tap statuses, in order (the first is the primary one): widgets, notifications and the options sheet's order. */
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
 * The rows of the Today page, in order: the five prayers with Sunrise between Fajr and Zuhr. Sunrise is only
 * shown (it marks the end of Fajr's time); it is never logged, and nothing counts it (stats and provisions use PRAYERS).
 */
export const TODAY_ROWS = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];

/** The first-run guide line ("Tap a prayer when you've prayed it") shows until anything is logged for the first time. */
export function guideLineDue(S) {
  if (!S?.profile?.onboarded) return false;
  return !Object.values(S.days || {}).some(d => d && (d.first > 0 || Object.keys(d.prayers || {}).length > 0));
}

/* ---------- "Make up now" on a missed prayer's row ----------
 * A fard prayer of TODAY that is missed (logged "missed", or its time ended unlogged) and not yet made up gets a
 * small "Make up now" on its own row (makeUpNowOn). It logs it as made up (logPrayer, the same rules as the
 * sheet's "Made up later": changing Missed to Made up takes it off the make-ups again, store.setPrayer). "Not
 * now" (in the row's options sheet) hides it for that prayer today. It follows the make-up nudge setting
 * (settings.makeupNudge) and the Make-ups feature, and isn't shown on an excused day, before the first log ever,
 * or during the three times no ṣalāh is prayed.
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

/** Whether prayer `p` of day `key` shows "Make up now" on its row at `now` (the rules above; today's prayers only). */
export function makeUpNowOn(S, key, p, now = new Date(), { dismissed = [] } = {}) {
  if (!PRAYERS.includes(p) || key !== dkey(now)) return false;
  if (!isOn(S, "makeups") || S.settings.makeupNudge === false || guideLineDue(S)) return false;
  if (store.isExcusedDay(S, key) || dismissed.includes(p)) return false;
  const s = store.prayerStatus(S, key, p);
  if (s && s !== "missed") return false;
  return madeUpAllowed(S, key, p, now) && !forbiddenTime(now, S.settings);
}

/* ---------- "Make-ups · 8 left" on the Today page ---------- */
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

/* ---------- what is current (19 Nov 2026: "after logging, move on to the next prayer"; todayFocus builds on it) ---------- */
/**
 * What is current at `now`:
 * - { kind: "open", p, key, cur }: a prayer's time is open and it is not logged yet (the one-tap buttons);
 * - { kind: "next", p, key, time, tomorrow, after }: otherwise, the next prayer, with no buttons until it begins.
 *   `after` is the prayer just logged (its window is still open), or null (between sunrise and Zuhr).
 * A logged prayer is never the focus here (todayFocus keeps a logged ʿIshāʾ highlighted, since tomorrow is not on the page).
 */
export function nowFocus(S, now = new Date()) {
  const cur = currentWindow(now, S.settings);
  if (cur && !store.prayerStatus(S, dkey(cur.date), cur.p)) return { kind: "open", p: cur.p, key: dkey(cur.date), cur };
  const nx = nextPrayer(now, S.settings);
  return { kind: "next", p: nx.p, key: nx.tomorrow ? dkey(addDays(now, 1)) : dkey(now), time: nx.time, tomorrow: !!nx.tomorrow, after: cur ? cur.p : null };
}

/* ---------- the merged Today page: rows, the highlighted row, the tap cycle ---------- */
/** One tap on a prayer row: what it stores next (null clears), or "sheet" (Made up, Missed, Excused: open the options). */
const CYCLE = { "": "ontime", ontime: "congregation", congregation: null };
export function tapNext(status) {
  const k = status || "";
  return k in CYCLE ? CYCLE[k] : "sheet";
}

/** The one-time hint after the first tap ever ("Tap again for congregation"), kept with the other seen flags. */
export const tapHintDue = S => !S?.settings?.help?.tips?.tapAgain;
export function markTapHint(S) { helpState(S).tips.tapAgain = true; }

/**
 * The page's rows, in order: { p, key } for TODAY_ROWS of today; after midnight, while last night's ʿIshāʾ is
 * still open (until Fajr), that ʿIshāʾ comes first ({ lastNight: true }), so it can still be logged here.
 */
export function todayRows(S, now = new Date()) {
  const key = dkey(now), cur = currentWindow(now, S.settings);
  const rows = TODAY_ROWS.map(p => ({ p, key }));
  if (cur && dkey(cur.date) !== key) rows.unshift({ p: cur.p, key: dkey(cur.date), lastNight: true });
  return rows;
}

/**
 * The highlighted row: { kind: "now", p, key, cur } while a prayer's time is open and it isn't logged (on an
 * excused day: while it is open), else { kind: "next", p, key, time, tomorrow } (the next prayer; not tappable
 * until it begins). Once ʿIshāʾ is logged that is the next Fajr (20 Nov 2026): before midnight tomorrow's
 * (tomorrow: true; not on the page, so no row is highlighted), after midnight this morning's. Its Witr moves to
 * ʿIshāʾ's row (views/home.js rowHTML). Unlogged, ʿIshāʾ stays current until its time ends.
 */
export function todayFocus(S, now = new Date()) {
  const cur = currentWindow(now, S.settings);
  const ck = cur ? dkey(cur.date) : null;
  if (cur && (store.isExcusedDay(S, ck) || !store.prayerStatus(S, ck, cur.p))) return { kind: "now", p: cur.p, key: ck, cur };
  const nx = nextPrayer(now, S.settings);
  return { kind: "next", p: nx.p, key: nx.tomorrow ? dkey(addDays(now, 1)) : dkey(now), time: nx.time, tomorrow: !!nx.tomorrow };
}

/**
 * What one prayer row shows (no wording; views/home.js draws it):
 * { p, key, status, begun, tap: "ontime" | "congregation" | null | "sheet" | "none", hl: "now" | "next" | "",
 *   mkNow, lastNight }. tap "none": not begun, not tappable (a stored status is still cleared from ⋯).
 */
export function rowState(S, row, now = new Date(), focus = todayFocus(S, now), { dismissed = [] } = {}) {
  const { p, key } = row;
  const status = store.prayerStatus(S, key, p);
  const begun = canLog(S, key, p, now);
  const excusedDay = store.isExcusedDay(S, key);
  const tap = !begun ? "none" : excusedDay ? "sheet" : tapNext(status);
  const hl = focus && focus.p === p && focus.key === key ? focus.kind : "";
  return { p, key, status, begun, tap, hl, mkNow: makeUpNowOn(S, key, p, now, { dismissed }), lastNight: !!row.lastNight };
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

/* ---------- the Good deeds sheet (19 Nov 2026: Reading · Deeds · Nafl prayers) ---------- */
/**
 * The sheet's items for day `key`, in three groups, and the daily count:
 * - reading: today, Read's For today items (readItems, every one the user reads, Durūd / Salawāt every day), each
 *   ticked with Read's own tick (reading.setReadDone: the same day log and tool stamps). Reading deeds whose
 *   reader is hidden, and on an earlier day the reading deeds of the list, are plain deed ticks (store.setAmal).
 * - deeds: the rest of the deeds list (sadaqah, the user's own; Duʿāʾ & istighfār on an excused day).
 * - nafl: the nafl add-on shown (naflShown), ticked as their sunnah items.
 * Each item: { id (the sheet id: Read item, deed id or nafl key), kind: "read" | "amal" | "nafl", done, daily, … }.
 * done / of: the items chosen as daily deeds (store.dailyIds) that are on the sheet that day. On an excused day
 * Listen to Qurʾān stands in for recitation, and Duʿāʾ & istighfār counts.
 */
export function deedGroups(S, key, now = new Date(), extra = {}) {
  const isToday = key === dkey(now), day = store.getDay(S, key), ex = store.isExcusedDay(S, key);
  const daily = new Set(store.dailyIds(S));
  const isDaily = id => daily.has(id) || (id === "listen" && daily.has("quran")) || (id === "dua" && ex);
  const reading = [], deeds = [], nafl = [], covered = new Set();
  if (isToday) for (const it of readItems(S, now, { ...extra, all: true })) {
    covered.add(it.id); if (it.deed) covered.add(it.deed);
    reading.push({ id: it.id, kind: "read", name: it.title, sub: it.sub, done: it.done, at: it.at, deed: it.deed, daily: isDaily(it.id) });
  }
  for (const a of store.amalForDay(S, key)) {
    if (covered.has(a.id)) continue;
    const id = store.DEED_ITEM_ID[a.id] || a.id;
    (READ_DEEDS[a.id] ? reading : deeds).push({ id, amal: a.id, kind: "amal", name: a.name, a, done: !!day.amal[a.id]?.done, daily: isDaily(id) });
  }
  for (const x of naflShown(S, key)) nafl.push({ id: x.key, sid: x.id, kind: "nafl", x, done: store.sunnahDone(S, key, x.id), daily: daily.has(x.key) });
  const counted = [...reading, ...deeds, ...nafl].filter(i => i.daily);
  return { reading, deeds, nafl, done: counted.filter(i => i.done).length, of: counted.length };
}

/** Everything "Choose daily deeds" offers: { reading: [ids], deeds: [amal], nafl: [keys] } (whatever the day shows). */
export function dailyChoices(S) {
  const reading = ["morning", "evening", "hizb", "quran", "yasinAm", "yasinPm", "manzil", "mulk", "kahf", "durud"].filter(id => {
    const tool = { morning: "adhkar", evening: "adhkar", hizb: "hizb", manzil: "manzil", durud: "durud" }[id] || "quran";
    return toolVisible(S, tool) || (id === "durud" && S.amalList.some(a => a.id === "salawat")) || (READ_DEEDS[id] && S.amalList.some(a => a.id === id));
  });
  // every nafl prayer of the madhhab (not only the ones shown): the Good deeds sheet now lists only daily deeds,
  // so this is where any of them is picked
  const m = madhhabOf(S);
  return { reading, deeds: S.amalList.filter(a => !READ_DEEDS[a.id]), nafl: NAFL_ADDON.filter(x => itemById(x.id, m)).map(x => x.key) };
}

/** Turn one item on or off as a daily deed (the first change keeps the default list as the starting point).
 *  A nafl prayer chosen as daily is also shown (settings.naflShow), so the sheet lists it and the pill counts it. */
export function setDaily(S, id, on) {
  const cur = store.dailyIds(S).filter(x => x !== id);
  S.settings.dailyDeeds = on ? [...cur, id] : cur;
  const nk = NAFL_ADDON.map(n => n.key);
  if (on && nk.includes(id)) {
    const show = Array.isArray(S.settings.naflShow) ? S.settings.naflShow : [];
    if (!show.includes(id)) S.settings.naflShow = nk.filter(k => k === id || show.includes(k));
  }
}

/* ---------- the quiet lines on the Today page ---------- */
/**
 * "Good deeds · n of m" (while the Good deeds feature is on): the daily deeds done today (deedGroups).
 * empty: none chosen (the pill offers to choose). Null when the feature is off.
 */
export function deedsLine(S, key, now = new Date()) {
  if (!isOn(S, "deeds")) return null;
  const g = deedGroups(S, key, now);
  return { done: g.done, of: g.of, empty: g.of === 0 };
}

/* ---------- the time of day (the Today header's band, 19 Nov 2026 Direction B) ---------- */
// the band itself lives in src/band.js (every page uses it); re-exported here for Today and its tests
export { BANDS, bandAt } from "./band.js";

/**
 * The header's hero (the arch): { mode: "now" | "next", p, key, status, act } from todayFocus.
 * act: "pray" (the Prayed button: one tap on the prayer, as its row), "remember" (an excused day's open prayer:
 * remembrance at prayer time), or "" (the next prayer hasn't begun: no button, only Qibla).
 * After the current prayer is logged the hero shows the next one; after ʿIshāʾ, the next Fajr ("Tomorrow 5:48 AM ·
 * begins in 7 h 12 min" before midnight), with no Prayed button until it begins (20 Nov 2026).
 */
export function heroOf(S, now = new Date(), focus = todayFocus(S, now)) {
  const { p, key } = focus, status = store.prayerStatus(S, key, p);
  if (focus.kind === "next") return { mode: "next", p, key, status, act: "" };
  if (store.isExcusedDay(S, key)) return { mode: "now", p, key, status, act: "remember" };
  return { mode: "now", p, key, status, act: "pray" };
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
