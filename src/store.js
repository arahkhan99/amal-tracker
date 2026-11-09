import { PRAYERS, dkey, ymKey, roundCoord, parseKey, addDays } from "./util.js";
import { DEED_NAME, DEED_HINT } from "./strings.js";
import { DEFAULT_MADHHAB, MADHHABS, asrMethod, madhhabOf, witrInQada, sunnahFor, sunnahAllowed, itemById, chipLabel, tierLabel, witrLabel, witrRule, DAY_NAFL } from "./rules/madhhab.js";
import { defaultFeatures, normalizeFeatures } from "./features.js";

const KEY = "amal-tracker-v1";
/** Data version. 2 = madhhab, new statuses, sunnah logging, Witr, excused days, feature modules (Nov 2026). */
export const VERSION = 2;

/** Prayer statuses, in display order. Stored as day.prayers[p]. */
export const STATUSES = ["congregation", "ontime", "madeup", "missed", "excused"];
/** Statuses that count as prayed. */
export const PRAYED = ["congregation", "ontime", "madeup"];
export const isPrayed = s => s === "congregation" || s === "ontime" || s === "madeup";
/** Witr states (day.witr). */
export const WITR_STATUSES = ["done", "madeup", "missed"];

export const DEFAULT_AMAL = [
  { id: "quran", name: DEED_NAME.quran, hint: "", detail: "quran", builtin: true },
  { id: "morning", name: DEED_NAME.morning, hint: DEED_HINT.morning, detail: "none", builtin: true },
  { id: "evening", name: DEED_NAME.evening, hint: DEED_HINT.evening, detail: "none", builtin: true },
  { id: "salawat", name: DEED_NAME.salawat, hint: "", detail: "count", builtin: true },
  { id: "sadaqah", name: DEED_NAME.sadaqah, hint: DEED_HINT.sadaqah, detail: "note", builtin: true },
];
// Names and hints the built-ins had before v2; renamed only if the user never changed them
const OLD_AMAL = {
  quran: { name: "Quran recitation" }, morning: { name: "Morning adhkar" },
  evening: { name: "Evening adhkar", hint: "After Asr" }, salawat: { name: "Salawat" },
};

export function defaultState(now = new Date()) {
  return {
    version: VERSION,
    createdKey: dkey(now),
    profile: { name: "", onboarded: false, consent: null }, // consent: { version, at } of the terms agreed to at sign-in
    settings: {
      preQada: true, leadMin: 15, prayerAlerts: false, evening: true,
      method: "Karachi", // new installs; saved states keep their method (the old default was "NorthAmerica")
      madhhab: DEFAULT_MADHHAB, // "hanafi" | "shafii" | "maliki" | "hanbali"
      asr: asrMethod(DEFAULT_MADHHAB), // "hanafi" | "shafi"; follows the madhhab unless the user overrides it
      location: null, // {lat, lng, label}
      carryQuran: true, reflection: true, seerah: false, lock: false,
      jumuah: true, // on Friday, Dhuhr shows the Jumu'ah sunnah list
      sunnahGhayr: true, // show ghayr mu'akkadah chips (outlined)
      sunnahNafl: false, // show nafl chips (hidden by default)
      excusedDays: true, // offer excused days (hayd / nifas)
      makeupNudge: true, // "Still time to make up Asr today"
      features: defaultFeatures(), // module switches, see features.js
      hiddenTools: [], // tool ids hidden on their own, see features.js
    },
    amalList: DEFAULT_AMAL.map(a => ({ ...a })),
    days: {},
    lastQuran: "",
    excusedMode: null, // { since: "YYYY-MM-DD" } while excused mode is on
    qada: { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0, Witr: 0, fasts: 0, goal: 20, fastGoal: 2, monthLog: {}, addedLog: {} },
  };
}

/**
 * Madhhab migration (v1 → v2). Keyed on the fields, not the version number, so it is safe to run
 * on any copy (including one an older app re-saved as version 1).
 * - Already has a madhhab: nothing to do.
 * - asr "hanafi": that was an explicit choice (the old default was "shafi") → Hanafi, kept as chosen.
 * - asr "shafi": the old default, so we can't tell if it was chosen. Hanafi is now the default (and the
 *   later ʿAsr is the safe side), so switch to Hanafi, remember the old value, and for a set-up user raise
 *   settings.madhhabAsk so the UI asks once (keep Hanafi, or pick another madhhab).
 * - Nothing saved: the defaults (Hanafi).
 */
function migrateMadhhab(raw, out) {
  const rs = raw.settings || {};
  if (MADHHABS.includes(rs.madhhab)) return;
  out.settings.madhhab = DEFAULT_MADHHAB;
  if (rs.asr === "hanafi") { out.settings.asr = "hanafi"; out.settings.asrChosen = true; return; }
  out.settings.asr = asrMethod(DEFAULT_MADHHAB);
  if (rs.asr === "shafi") {
    out.settings.asrBefore = "shafi";
    if (raw.profile?.onboarded) out.settings.madhhabAsk = true;
  }
}

/** Fill in anything missing from older or partial saves, and migrate older versions. Never drops fields. */
export function normalize(s, now = new Date()) {
  const d = defaultState(now);
  const out = { ...d, ...s };
  out.profile = { ...d.profile, ...(s.profile || {}) };
  out.settings = { ...d.settings, ...(s.settings || {}) };
  // A set-up user whose save has no method was on the old default: keep it (only new installs get Karachi)
  if (s.settings && !s.settings.method && s.profile?.onboarded) out.settings.method = "NorthAmerica";
  migrateMadhhab(s, out);
  out.settings.features = normalizeFeatures(out.settings.features);
  out.settings.hiddenTools = Array.isArray(out.settings.hiddenTools) ? out.settings.hiddenTools : [];
  // Only approximate location is kept (about 1 km); round anything saved before that rule
  const loc = out.settings.location;
  if (loc && typeof loc.lat === "number") out.settings.location = { ...loc, lat: roundCoord(loc.lat), lng: roundCoord(loc.lng) };
  out.qada = { ...d.qada, ...(s.qada || {}) };
  out.amalList = Array.isArray(s.amalList) ? s.amalList.map(migrateAmal) : d.amalList;
  out.days = s.days || {};
  out.excusedMode = s.excusedMode?.since ? s.excusedMode : null;
  out.version = VERSION;
  return out;
}

/** Built-in good deeds get the new names (light transliteration) unless the user renamed them. */
function migrateAmal(a) {
  const old = a && a.builtin && OLD_AMAL[a.id];
  if (!old) return a;
  const x = { ...a };
  if (x.name === old.name) x.name = DEED_NAME[a.id];
  if (old.hint && x.hint === old.hint) x.hint = DEED_HINT[a.id];
  return x;
}

/** True unless the profile records agreement to terms of `version` or later (versions are dates, compared as strings). */
export function needsConsent(profile, version) {
  const v = profile?.consent?.version;
  return typeof v !== "string" || v < version;
}

export function load(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch (e) { /* fall through to a fresh state */ }
  return defaultState();
}

export function save(S, storage = globalThis.localStorage) {
  try { storage?.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage full or blocked */ }
}

/* ---------- madhhab ---------- */

/** Switch madhhab. ʿAsr follows it (the user can still override with setAsr). Past logs are untouched. */
export function setMadhhab(S, madhhab) {
  if (!MADHHABS.includes(madhhab)) return false;
  S.settings.madhhab = madhhab;
  S.settings.asr = asrMethod(madhhab);
  S.settings.madhhabChosen = true;
  delete S.settings.asrChosen;
  delete S.settings.madhhabAsk;
  return true;
}

/** Override the ʿAsr method alone ("hanafi" | "shafi"). */
export function setAsr(S, asr) {
  if (asr !== "hanafi" && asr !== "shafi") return false;
  S.settings.asr = asr;
  S.settings.asrChosen = true;
  return true;
}

/** Answer the one-time "Zad now uses Hanafī ʿAsr" question: pass the madhhab picked (or "hanafi" to keep it). */
export function answerMadhhabAsk(S, madhhab = DEFAULT_MADHHAB) {
  setMadhhab(S, madhhab);
  delete S.settings.asrBefore;
}

/* ---------- day records ----------
 * day = {
 *   prayers: { Fajr: "ontime", ... }   // STATUSES; missing = not logged
 *   amal: { quran: { done, detail } }, note: "",
 *   at?: { Fajr: ms }                  // when each status was logged ("made up at 7:40 AM")
 *   sunnah?: { "fajr-b2": true, ... }  // sunnah chips logged, keyed by madhhab item id
 *   witr?: "done"|"madeup"|"missed"    // Witr, tracked for every madhhab
 *   witrQ?: true                       // the missed Witr was added to make-ups (Hanafi at the time)
 *   witrAuto?: true                    // Witr was marked missed automatically because ʿIshāʾ was missed
 *   excused?: true                     // excused day (hayd / nifas): unlogged prayers count as excused
 *   u: ms                              // last edit, for cloud merges
 * }
 */
export function getDay(S, key) { return S.days[key] || { prayers: {}, amal: {}, note: "" }; }
export function ensureDay(S, key) {
  if (!S.days[key]) S.days[key] = { prayers: {}, amal: {}, note: "" };
  return S.days[key];
}

/** The status of a prayer on a day: what's logged, else "excused" on an excused day, else null. */
export function statusOf(day, p) { return day?.prayers?.[p] || (day?.excused ? "excused" : null); }
export function prayerStatus(S, key, p) { return statusOf(S.days[key], p); }

/** Add n to a make-up balance (prayer key or "Witr") and to today's "+n today" log. */
function qadaAdd(S, k, n, now) {
  const today = dkey(now);
  S.qada[k] = Math.max(0, (S.qada[k] || 0) + n);
  S.qada.addedLog[today] = (S.qada.addedLog[today] || 0) + n;
}

/**
 * Log a prayer status for a day (one of STATUSES, or null to clear).
 * - Missed adds one to make-ups; changing away from Missed (to anything, or clearing) removes it again.
 * - Made up / On time / In jamāʿah / Excused never touch make-ups.
 * - Hanafi: marking ʿIshāʾ missed also marks an unlogged Witr missed (owed); undone if ʿIshāʾ changes back.
 * Sunnah logs are kept as they are; reads filter them by status (a missed fard's chips don't count).
 * Returns the previous stored status.
 */
export function setPrayer(S, key, p, status, now = new Date()) {
  const day = ensureDay(S, key);
  const was = day.prayers[p] || null;
  if (was === "missed" && status !== "missed") qadaAdd(S, p, -1, now);
  if (status === "missed" && was !== "missed") qadaAdd(S, p, 1, now);
  if (status) {
    day.prayers[p] = status;
    (day.at ||= {})[p] = now.getTime();
  } else {
    delete day.prayers[p];
    if (day.at) delete day.at[p];
  }
  if (p === "Isha") linkWitr(S, key, day, was, status, now);
  day.u = Date.now();
  return was;
}

function linkWitr(S, key, day, was, status, now) {
  if (status === "missed" && was !== "missed" && !day.witr && witrInQada(madhhabOf(S))) {
    setWitr(S, key, "missed", now);
    day.witrAuto = true;
  } else if (was === "missed" && status !== "missed" && day.witrAuto) {
    setWitr(S, key, null, now);
  } else if (status === "excused" && day.witr === "missed") {
    setWitr(S, key, null, now);
  }
}

/**
 * Log Witr for a day: "done" | "madeup" | "missed" | null.
 * Missed adds one to make-ups (qada.Witr) only where Witr is owed (Hanafi: wājib); changing away removes it.
 */
export function setWitr(S, key, status, now = new Date()) {
  const day = ensureDay(S, key);
  const was = day.witr || null;
  if (was === "missed" && status !== "missed" && day.witrQ) { qadaAdd(S, "Witr", -1, now); delete day.witrQ; }
  if (status === "missed" && was !== "missed" && witrInQada(madhhabOf(S))) { qadaAdd(S, "Witr", 1, now); day.witrQ = true; }
  if (status) day.witr = status; else delete day.witr;
  delete day.witrAuto;
  day.u = Date.now();
  return was;
}

/* ---------- sunnah ---------- */

/** Visibility options from settings, for madhhab.sunnahFor. */
export function sunnahOpts(S, key) {
  const st = S.settings;
  return { date: key ? parseKey(key) : null, jumuah: st.jumuah !== false, ghayr: st.sunnahGhayr !== false, nafl: !!st.sunnahNafl };
}

/**
 * Log (done=true) or unlog a sunnah chip. Refused (returns false) when the fard's status doesn't allow
 * chips: Missed / Excused, or Made up for anything but Fajr's "2 before". Unlogging is always allowed.
 */
export function setSunnah(S, key, id, done) {
  const item = itemById(id, madhhabOf(S));
  if (!item) return false;
  const day = ensureDay(S, key);
  if (done) {
    if (!sunnahAllowed(item, item.prayer ? statusOf(day, item.prayer) : null, { excusedDay: !!day.excused })) return false;
    (day.sunnah ||= {})[id] = true;
  } else if (day.sunnah) delete day.sunnah[id];
  day.u = Date.now();
  return true;
}

/** Whether a sunnah counts as done on a day (logged AND still allowed by its fard's status). */
export function sunnahDone(S, key, id) {
  const day = S.days[key];
  if (!day?.sunnah?.[id]) return false;
  const item = itemById(id, madhhabOf(S));
  return !!item && sunnahAllowed(item, item.prayer ? statusOf(day, item.prayer) : null, { excusedDay: !!day.excused });
}

/**
 * The chips to draw for one fard on a day (empty when its status allows none, e.g. Missed):
 * [{ id, prayer, when, rakahs, tier, label: "2 before", display: "solid"|"outline"|"hidden", tierName, done }]
 * Pass { all: true } to get the chips even when disallowed (each then has allowed: false).
 */
export function sunnahChips(S, key, prayer, { all = false } = {}) {
  const day = getDay(S, key), status = statusOf(day, prayer);
  const items = prayer === "day" ? (S.settings.sunnahNafl ? DAY_NAFL : []) : sunnahFor(madhhabOf(S), prayer, sunnahOpts(S, key));
  return items
    .map(x => {
      const allowed = sunnahAllowed(x, x.prayer ? status : null, { excusedDay: !!day.excused });
      const t = tierLabel(x.tier);
      return { ...x, label: chipLabel(x), display: t.display, tierName: t.name, allowed, done: allowed && !!day.sunnah?.[x.id] };
    })
    .filter(x => all || x.allowed);
}

/**
 * The Witr chip for a day (shown on ʿIshāʾ):
 * { status: "done"|"madeup"|"missed"|null, done, inQada, rakahs, chip, tag, line, row, tier, allowed }
 * Not allowed on an excused day.
 */
export function witrChip(S, key) {
  const day = getDay(S, key), m = madhhabOf(S), w = witrRule(m);
  const allowed = !day.excused && statusOf(day, "Isha") !== "excused";
  return { ...witrLabel(m), status: day.witr || null, done: day.witr === "done" || day.witr === "madeup", inQada: w.inQada, rakahs: w.rakahs, allowed };
}

/* ---------- excused days (hayd / nifas) ---------- */

/**
 * Flag one day as excused (or not). Turning it on clears Missed prayers and a missed Witr on that day
 * (their make-ups come off) so they read as excused; prayers already prayed stay as logged.
 * Turning it off only removes the flag: prayers explicitly marked "excused" stay excused.
 */
export function setExcusedDay(S, key, on, now = new Date()) {
  const day = ensureDay(S, key);
  if (on) {
    day.excused = true;
    for (const p of PRAYERS) if (day.prayers[p] === "missed") setPrayer(S, key, p, null, now);
    if (day.witr === "missed") setWitr(S, key, null, now);
  } else delete day.excused;
  day.u = Date.now();
}

/** Flag (or unflag) every day from fromKey to toKey inclusive. Returns the number of days. */
export function setExcusedRange(S, fromKey, toKey, on, now = new Date()) {
  let n = 0;
  if (fromKey > toKey) [fromKey, toKey] = [toKey, fromKey];
  for (let d = parseKey(fromKey); dkey(d) <= toKey; d = addDays(d, 1)) { setExcusedDay(S, dkey(d), on, now); n++; }
  return n;
}

/** Start excused mode from a day (usually today). The flag then carries forward day by day (syncExcusedMode). */
export function startExcused(S, key, now = new Date()) {
  S.excusedMode = { since: key };
  setExcusedDay(S, key, true, now);
}

/**
 * Keep excused mode's days flagged up to today. Call on start-up and at midnight rollover.
 * Returns how many days were newly flagged.
 */
export function syncExcusedMode(S, todayKey) {
  if (!S.excusedMode?.since) return 0;
  let n = 0;
  for (let d = parseKey(S.excusedMode.since); dkey(d) <= todayKey; d = addDays(d, 1)) {
    const k = dkey(d);
    if (!S.days[k]?.excused) { setExcusedDay(S, k, true); n++; }
  }
  return n;
}

/**
 * End excused mode on `key` (usually today). That day is unflagged so the rest of its prayers are due again;
 * pass the prayers that had already started while excused (times.startedPrayers, minus any still open
 * you want her to pray) as `excusedPrayers`, and those unlogged ones are stored as "excused" explicitly.
 */
export function endExcused(S, key, { excusedPrayers = [] } = {}, now = new Date()) {
  S.excusedMode = null;
  const day = ensureDay(S, key);
  for (const p of excusedPrayers) if (!day.prayers[p]) setPrayer(S, key, p, "excused", now);
  setExcusedDay(S, key, false, now);
}

export const isExcusedDay = (S, key) => !!S.days[key]?.excused;

/**
 * The good deeds list for a day. On an excused day "Qurʾān recitation" becomes "Listen to Qurʾān"
 * (its own id "listen"), and "Duʿāʾ & istighfār" (id "dua") is added. Other days: S.amalList as is.
 * Items carry `swappedFrom: "quran"` / `excusedOnly: true` so Progress can show recitation as excused.
 */
export function amalForDay(S, key) {
  if (!S.days[key]?.excused) return S.amalList;
  const list = S.amalList.map(a => a.id === "quran"
    ? { ...a, id: "listen", name: DEED_NAME.listen, hint: DEED_HINT.listen, detail: "note", builtin: true, swappedFrom: "quran" }
    : a);
  if (!list.some(a => a.id === "dua")) list.push({ id: "dua", name: DEED_NAME.dua, hint: DEED_HINT.dua, detail: "none", builtin: true, excusedOnly: true });
  return list;
}

export function setAmal(S, key, id, done, detail = "") {
  const day = ensureDay(S, key);
  if (done) day.amal[id] = { done: true, detail };
  else delete day.amal[id];
  day.u = Date.now();
}

/* ---------- make-ups (qada) ---------- */

export function monthLog(S, now = new Date()) {
  const k = ymKey(now);
  return S.qada.monthLog[k] || { prayers: 0, fasts: 0 };
}

/** Pray back one owed prayer (a prayer key, or "Witr"). Counts toward this month's goal. */
export function madeUpPrayer(S, p, now = new Date()) {
  if (!(S.qada[p] > 0)) return false;
  S.qada[p]--;
  const k = ymKey(now);
  const m = S.qada.monthLog[k] || (S.qada.monthLog[k] = { prayers: 0, fasts: 0 });
  m.prayers++;
  return true;
}

export function madeUpFast(S, now = new Date()) {
  if (S.qada.fasts <= 0) return false;
  S.qada.fasts--;
  const k = ymKey(now);
  const m = S.qada.monthLog[k] || (S.qada.monthLog[k] = { prayers: 0, fasts: 0 });
  m.fasts++;
  return true;
}

/** The make-up rows to show: the five prayers, plus Witr where it is owed (Hanafi). */
export function qadaKeys(S) { return witrInQada(madhhabOf(S)) ? [...PRAYERS, "Witr"] : PRAYERS.slice(); }
/** Total prayers owed (Witr included only where it is owed). */
export function qadaOwed(S) { return qadaKeys(S).reduce((s, p) => s + (S.qada[p] || 0), 0); }
/** Fard owed and Witr owed separately: { fard, witr }. */
export function qadaSplit(S) { return { fard: PRAYERS.reduce((s, p) => s + (S.qada[p] || 0), 0), witr: witrInQada(madhhabOf(S)) ? S.qada.Witr || 0 : 0 }; }
export function addedToday(S, now = new Date()) { return Math.max(0, S.qada.addedLog[dkey(now)] || 0); }

/** Most recent detail recorded for an amal, searching back from `beforeKey` (exclusive when strict). */
export function lastDetail(S, id, beforeKey, strict = true) {
  const keys = Object.keys(S.days).sort().reverse();
  for (const k of keys) {
    if (beforeKey && (strict ? k >= beforeKey : k > beforeKey)) continue;
    const a = S.days[k].amal?.[id];
    if (a?.done && a.detail) return { key: k, detail: a.detail };
  }
  return null;
}

/* ---------- cloud merge ---------- */
/**
 * Combine this phone's state with the cloud copy. Each day keeps whichever side edited it last
 * (day.u); tool progress (S.tools) is combined by mergeTools; everything else (profile, settings incl.
 * features, amal list, qada, excusedMode) comes from the side saved last. A side that hasn't finished
 * onboarding never overrides one that has.
 */
export function mergeStates(local, remote) {
  if (!remote) return local;
  if (!local.profile.onboarded && remote.profile?.onboarded) return normalize(remote);
  if (local.profile.onboarded && !remote.profile?.onboarded) return local;
  const newer = (remote.updatedAt || 0) > (local.updatedAt || 0) ? normalize(remote) : local;
  const out = JSON.parse(JSON.stringify(newer));
  out.days = {};
  for (const k of new Set([...Object.keys(local.days), ...Object.keys(remote.days || {})])) {
    const a = local.days[k], b = remote.days?.[k];
    out.days[k] = !a ? b : !b ? a : (b.u || 0) > (a.u || 0) ? b : (a.u || 0) > (b.u || 0) ? a : newer === local ? a : b;
  }
  out.createdKey = [local.createdKey, remote.createdKey].filter(Boolean).sort()[0];
  out.updatedAt = Math.max(local.updatedAt || 0, remote.updatedAt || 0);
  const tools = mergeTools(newer === local ? local.tools : remote.tools, newer === local ? remote.tools : local.tools);
  if (tools) out.tools = tools;
  return out;
}

const isObj = v => v && typeof v === "object" && !Array.isArray(v);
/**
 * Tool progress (S.tools: adhkar counts, durūd read, Hizb weeks, Qurʾān position and pages read) from both
 * phones. Maps keyed by day or week are combined, so reading on one phone never erases reading on the other;
 * for the same field the side saved last wins, except "read" lists (pages, durūd) which are joined and the
 * Hizb khatm count, which keeps the higher number.
 */
export function mergeTools(newer, older) {
  if (!isObj(older)) return isObj(newer) ? JSON.parse(JSON.stringify(newer)) : newer;
  if (!isObj(newer)) return JSON.parse(JSON.stringify(older));
  const deep = (a, b, key, parent) => {
    if (a === undefined) return JSON.parse(JSON.stringify(b));
    if (b === undefined) return JSON.parse(JSON.stringify(a));
    if ((key === "read" || parent === "read") && Array.isArray(a) && Array.isArray(b)) return [...new Set([...a, ...b])];
    if (key === "khatms" && typeof a === "number" && typeof b === "number") return Math.max(a, b);
    if (isObj(a) && isObj(b)) {
      const o = {};
      for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) o[k] = deep(a[k], b[k], k, key);
      return o;
    }
    return JSON.parse(JSON.stringify(a));
  };
  return deep(newer, older, "", "");
}
