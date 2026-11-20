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
  evening: { name: "Evening adhkar", hint: "After Asr" }, salawat: { name: "Salawat", also: ["Salawāt", "Durūd"] },
};

export function defaultState(now = new Date()) {
  return {
    version: VERSION,
    createdKey: dkey(now),
    profile: { name: "", onboarded: false, consent: null, dataConsent: null, gender: null }, // consent: { version, at } of the terms agreed to at sign-in; dataConsent: { version, at, scope: "cloud-backup-sensitive" }, the explicit consent to back up religious/health data (separate from the terms); gender: "m" | "f" | null (applyGender)
    settings: {
      preQada: true, leadMin: 15, prayerAlerts: false, evening: true,
      method: "Karachi", // new installs; saved states keep their method (the old default was "NorthAmerica")
      madhhab: DEFAULT_MADHHAB, // "hanafi" | "shafii" | "maliki" | "hanbali"
      asr: asrMethod(DEFAULT_MADHHAB), // "hanafi" | "shafi"; follows the madhhab unless the user overrides it
      location: null, // {lat, lng, label, source: "gps" | "city" | "unknown" (older saves)}
      autoLocation: true, // "Update location when I travel" (src/travel.js); only for source "gps"
      carryQuran: true, reflection: true, seerah: false, lock: false,
      jumuah: true, // on Friday, Dhuhr shows the Jumu'ah sunnah list
      sunnahGhayr: true, // show ghayr mu'akkadah chips (outlined)
      sunnahNafl: false, // show nafl chips (hidden by default)
      naflShow: ["ishraq", "duha", "awwabin", "tahajjud"], // the nafl add-on in the Good deeds sheet (madhhab.NAFL_ADDON keys)
      seerahNotify: true, // the Friday sīrah notification (Settings → Reminders)
      excusedDays: true, // offer excused days (hayd / nifas)
      makeupNudge: true, // "Still time to make up Asr today"
      features: defaultFeatures(), // module switches, see features.js
      hiddenTools: [], // tool ids hidden on their own, see features.js
      provisions: defaultProvisions(), // provisions & levels (points.js), off by default
    },
    amalList: DEFAULT_AMAL.map(a => ({ ...a })),
    days: {},
    lastQuran: "",
    excusedMode: null, // { since: "YYYY-MM-DD" } while excused mode is on
    qada: { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0, Witr: 0, fasts: 0, goal: 20, fastGoal: 2, monthLog: {}, dayLog: {}, addedLog: {} },
  };
}

/**
 * Provisions & levels settings (see points.js). on: the Features switch; homeFull: "Prayer at home counts
 * in full" (sisters: on time earns the jamāʿah amount); home / tracker: the Home chip and Tracker chip;
 * best: the highest level ever shown (levels never go down); weights: the WEIGHTS version; offered: the
 * one-time Home offer has been shown. sig (set later, absent by default): the scoring settings the level was
 * last checked with (provisions.scoringSig), so a re-count caused by a settings change isn't a level-up.
 */
export function defaultProvisions() {
  return { on: false, homeFull: false, home: false, tracker: false, best: 1, weights: "v1", offered: false };
}
function normalizeProvisions(p) {
  const d = defaultProvisions();
  if (!p || typeof p !== "object") return d;
  const out = { ...d, ...p };
  for (const k of ["on", "homeFull", "home", "tracker", "offered"]) out[k] = !!out[k];
  out.best = Number.isFinite(out.best) ? Math.max(1, Math.floor(out.best)) : 1;
  if (typeof out.weights !== "string" || !out.weights) out.weights = d.weights;
  return out;
}

/** Remember a level as shown; levels never go down. Returns true when it is a new best (show the level-up). */
export function recordLevel(S, level) {
  const p = S.settings.provisions || (S.settings.provisions = defaultProvisions());
  if (!(level > (p.best || 1))) return false;
  p.best = Math.floor(level);
  return true;
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

const LOC_SOURCES = ["gps", "city", "unknown"];

/** Fill in anything missing from older or partial saves, and migrate older versions. Never drops fields. */
export function normalize(s, now = new Date()) {
  const d = defaultState(now);
  const out = { ...d, ...s };
  out.profile = { ...d.profile, ...(s.profile || {}) };
  if (!GENDERS.includes(out.profile.gender)) out.profile.gender = null; // older saves: not set (no prompt)
  out.settings = { ...d.settings, ...(s.settings || {}) };
  // A set-up user whose save has no method was on the old default: keep it (only new installs get Karachi)
  if (s.settings && !s.settings.method && s.profile?.onboarded) out.settings.method = "NorthAmerica";
  migrateMadhhab(s, out);
  out.settings.features = normalizeFeatures(out.settings.features);
  out.settings.hiddenTools = Array.isArray(out.settings.hiddenTools) ? out.settings.hiddenTools : [];
  if (!Array.isArray(out.settings.naflShow)) out.settings.naflShow = d.settings.naflShow.slice();
  out.settings.provisions = normalizeProvisions(out.settings.provisions);
  // Only approximate location is kept (about 1 km); round anything saved before that rule
  const loc = out.settings.location;
  // source: older saves didn't record how the location was chosen and it can't be told apart afterwards, so a
  // missing source is "unknown": the travel check (src/travel.js) leaves it alone, since it may be a hand-picked
  // city. "Use my current location" sets "gps" (travel updates on), searching a city sets "city".
  if (loc && typeof loc.lat === "number") out.settings.location = { ...loc, lat: roundCoord(loc.lat), lng: roundCoord(loc.lng), source: LOC_SOURCES.includes(loc.source) ? loc.source : "unknown" };
  out.settings.autoLocation = out.settings.autoLocation !== false;
  out.qada = { ...d.qada, ...(s.qada || {}) };
  if (!out.qada.dayLog || typeof out.qada.dayLog !== "object") out.qada.dayLog = {};
  out.amalList = Array.isArray(s.amalList) ? s.amalList.map(migrateAmal) : d.amalList;
  out.days = s.days || {};
  out.excusedMode = s.excusedMode?.since ? s.excusedMode : null;
  out.version = VERSION;
  return out;
}

/**
 * The daily good deeds (19 Nov 2026: "Good deeds · n of m" counts only these), as Good deeds sheet item ids:
 * Read items (morning, evening, quran, durud, hizb, mulk, …), the user's own deeds (sadaqah, custom ids) and nafl
 * keys (ishraq, duha, awwabin, tahajjud). Chosen in the sheet ("Choose daily deeds", settings.dailyDeeds); until
 * then the deeds list itself (S.amalList; the merged salawāt deed is the Read item "durud"). Nafl only if chosen.
 */
export const DEED_ITEM_ID = { salawat: "durud" };
export function dailyIds(S) {
  const d = S.settings?.dailyDeeds;
  if (Array.isArray(d)) return d;
  return (S.amalList || []).map(a => DEED_ITEM_ID[a.id] || a.id);
}

/** Built-in good deeds get the new names (light transliteration) unless the user renamed them. */
function migrateAmal(a) {
  const old = a && a.builtin && OLD_AMAL[a.id];
  if (!old) return a;
  const x = { ...a };
  // Salawāt: since 19 Nov 2026 the one merged item "Durūd / Salawāt" (the deed and the forty durūd reading)
  if (x.name === old.name || old.also?.includes(x.name)) x.name = DEED_NAME[a.id];
  if (old.hint && x.hint === old.hint) x.hint = DEED_HINT[a.id];
  return x;
}

/** True unless the profile records agreement to terms of `version` or later (versions are dates, compared as strings). */
export function needsConsent(profile, version) {
  const v = profile?.consent?.version;
  return typeof v !== "string" || v < version;
}

/** Scope of the explicit consent to back up religious and health data (privacy audit A1). */
export const DATA_CONSENT_SCOPE = "cloud-backup-sensitive";
/** True unless the profile records the explicit cloud-backup consent of `version` or later. Nothing may be
 *  uploaded while this is true (cloud.js). */
export function needsDataConsent(profile, version) {
  const c = profile?.dataConsent;
  return !c || c.scope !== DATA_CONSENT_SCOPE || typeof c.version !== "string" || c.version < version;
}
/** The better of two consent records ({ version, at, scope? }): one with a version and (when `scope` is given) that
 *  scope first, then the newer version, then the later time. Ties keep `a`. */
function newerConsent(a, b, scope = "") {
  if (!a || !b) return a || b || null;
  const rank = c => {
    const v = typeof c.version === "string";
    return [v && (!scope || c.scope === scope) ? 1 : 0, v ? 1 : 0, v ? c.version : "", String(c.at || "")];
  };
  const ra = rank(a), rb = rank(b);
  for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return rb[i] > ra[i] ? b : a;
  return a;
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

/* ---------- brother / sister ---------- */

/** profile.gender values; null = not set / prefer not to say. */
export const GENDERS = ["m", "f"];
export const genderOf = S => (GENDERS.includes(S?.profile?.gender) ? S.profile.gender : null);

/**
 * Set who Zad is set up for ("m" | "f" | null) and the defaults that follow. Each stays its own switch after.
 * - "f" (sister): excused days on, Jumuʿah off, "prayer at home counts in full" (provisions) on.
 * - "m" (brother): excused days off, Jumuʿah on, home-in-full off. Excused mode is ended (today is unflagged);
 *   past excused days are never unflagged (they stay out of the stats as before).
 * - null (prefer not to say): today's behaviour, excused days and Jumuʿah on; home-in-full is left as it is,
 *   because by then it is the user's own switch (Settings → "Prefer not to say" must not quietly undo it).
 *   undoHomeFull: true turns it off as well: onboarding passes it when its own Sister tap had switched it on
 *   and the user then pressed Skip, so a skipped question leaves no sister default behind.
 * Logs are never changed except ending excused mode. Returns the value stored.
 */
export function applyGender(S, g, { todayKey: key, excusedPrayers = [], undoHomeFull = false } = {}, now = new Date()) {
  const v = GENDERS.includes(g) ? g : null;
  S.profile.gender = v;
  const st = S.settings;
  const prov = st.provisions || (st.provisions = defaultProvisions());
  if (v === "f") { st.excusedDays = true; st.jumuah = false; prov.homeFull = true; }
  else if (v === "m") {
    st.excusedDays = false; st.jumuah = true; prov.homeFull = false;
    if (S.excusedMode?.since) endExcused(S, key || dkey(now), { excusedPrayers }, now);
  } else { st.excusedDays = true; st.jumuah = true; if (undoHomeFull) prov.homeFull = false; }
  return v;
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
 *   remember?: { Fajr: true, ... }     // remembrance at prayer time, only on excused prayers (setRemember)
 *   reads?: { hizb: true, mulk: true, kahf: true, manzil: true, yasinAm: true, yasinPm: true } // readings done in Read (setRead; points.readsByDay)
 *   quran?: { pages: ["indopak15:12"], sec: { [phone]: s }, manual: [{ id, unit, n, at, e } | { id, del }] } // Qurʾān goal reading (src/quran-goal.js, mergeQuranDay)
 *   first?: ms                        // when the user first logged anything for this day; set once (markLogged)
 *   u: ms                              // last edit, for cloud merges
 * }
 */

/**
 * Stamp day.first the first time the user logs anything for the day (a prayer status, Witr, a sunnah chip,
 * a good deed, remembrance). Never overwritten; only viewing a day never sets it. The cloud merge keeps
 * the earlier of two copies' stamps.
 * Kept for the planned leaderboard's rule that a day counts only if it was logged within 2 days, so only an
 * explicit user log stamps it: writes the app makes on its own (endExcused storing "excused", a reader ticking
 * its good deed, Witr marked missed with ʿIshāʾ) pass { auto: true } to the setters and leave it alone.
 */
export function markLogged(day, now = new Date()) {
  if (day && !(day.first > 0)) day.first = now.getTime();
}
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
 * opts.auto: the app writes it on its own (not the user), so day.first isn't stamped (markLogged).
 * Returns the previous stored status.
 */
export function setPrayer(S, key, p, status, now = new Date(), { auto = false } = {}) {
  const day = ensureDay(S, key);
  const was = day.prayers[p] || null;
  if (was === "missed" && status !== "missed") qadaAdd(S, p, -1, now);
  if (status === "missed" && was !== "missed") qadaAdd(S, p, 1, now);
  if (status) {
    day.prayers[p] = status;
    (day.at ||= {})[p] = now.getTime();
    if (!auto) markLogged(day, now);
  } else {
    delete day.prayers[p];
    if (day.at) delete day.at[p];
  }
  if (p === "Isha") linkWitr(S, key, day, was, status, now);
  day.u = Date.now();
  return was;
}

// Witr follows ʿIshāʾ on its own (auto): only ʿIshāʾ's own setPrayer stamps day.first, if the user made it.
function linkWitr(S, key, day, was, status, now) {
  if (status === "missed" && was !== "missed" && !day.witr && witrInQada(madhhabOf(S))) {
    setWitr(S, key, "missed", now, { auto: true });
    day.witrAuto = true;
  } else if (was === "missed" && status !== "missed" && day.witrAuto) {
    setWitr(S, key, null, now, { auto: true });
  } else if (status === "excused" && day.witr === "missed") {
    setWitr(S, key, null, now, { auto: true });
  }
}

/**
 * Log Witr for a day: "done" | "madeup" | "missed" | null.
 * Missed adds one to make-ups (qada.Witr) only where Witr is owed (Hanafi: wājib); changing away removes it.
 * opts.auto: as setPrayer (day.first isn't stamped).
 */
export function setWitr(S, key, status, now = new Date(), { auto = false } = {}) {
  const day = ensureDay(S, key);
  const was = day.witr || null;
  if (was === "missed" && status !== "missed" && day.witrQ) { qadaAdd(S, "Witr", -1, now); delete day.witrQ; }
  if (status === "missed" && was !== "missed" && witrInQada(madhhabOf(S))) { qadaAdd(S, "Witr", 1, now); day.witrQ = true; }
  if (status) { day.witr = status; if (!auto) markLogged(day, now); } else delete day.witr;
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
export function setSunnah(S, key, id, done, now = new Date()) {
  const item = itemById(id, madhhabOf(S));
  if (!item) return false;
  const day = ensureDay(S, key);
  if (done) {
    if (!sunnahAllowed(item, item.prayer ? statusOf(day, item.prayer) : null, { excusedDay: !!day.excused })) return false;
    (day.sunnah ||= {})[id] = true;
    markLogged(day, now);
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
  for (const p of excusedPrayers) if (!day.prayers[p]) setPrayer(S, key, p, "excused", now, { auto: true }); // not the user's log: no day.first
  setExcusedDay(S, key, false, now);
}

export const isExcusedDay = (S, key) => !!S.days[key]?.excused;

/**
 * Tick (or untick) "Remembrance at prayer time" for one prayer: wuḍūʾ and dhikr in the prayer place,
 * about the length of the prayer. Only allowed while that prayer's status is excused (statusOf) and, since
 * the store can't work out prayer times, while the caller's opts.allowed says its time has begun: a boolean,
 * or a function (key, p) => boolean (logging.canLog bound to S and now); left out, nothing extra is checked.
 * Unticking is always allowed. Returns false when refused.
 */
export function setRemember(S, key, p, on, now = new Date(), { allowed } = {}) {
  if (!PRAYERS.includes(p)) return false;
  if (on) {
    if (statusOf(S.days[key], p) !== "excused") return false;
    if (allowed === false || (typeof allowed === "function" && !allowed(key, p))) return false; // not begun yet
    const day = ensureDay(S, key);
    (day.remember ||= {})[p] = true;
    markLogged(day, now);
    day.u = Date.now();
    return true;
  }
  const day = S.days[key];
  if (day?.remember?.[p]) {
    delete day.remember[p];
    if (!Object.keys(day.remember).length) delete day.remember;
    day.u = Date.now();
  }
  return true;
}
/**
 * Mark (or unmark) a reading with no good deed of its own (Hizb, al-Mulk, al-Kahf, the Manzil) as done on day
 * `key`. Read's ticks and the readers call it next to their own state, so Provisions keep counting it after
 * the readers prune their history (points.readsByDay). Not a user log of the day: day.first isn't stamped.
 */
export function setRead(S, key, id, on) {
  if (!["hizb", "mulk", "kahf", "manzil", "yasinAm", "yasinPm"].includes(id)) return false;
  if (on) {
    const day = ensureDay(S, key);
    if (day.reads?.[id]) return true;
    (day.reads ||= {})[id] = true;
    day.u = Date.now();
    return true;
  }
  const day = S.days[key];
  if (day?.reads?.[id]) {
    delete day.reads[id];
    if (!Object.keys(day.reads).length) delete day.reads;
    day.u = Date.now();
  }
  return true;
}

/** Whether remembrance at prayer time counts for a prayer (ticked and the prayer is still excused). */
export const remembered = (day, p) => !!day?.remember?.[p] && statusOf(day, p) === "excused";

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

export function setAmal(S, key, id, done, detail = "", now = new Date()) {
  const day = ensureDay(S, key);
  if (done) { day.amal[id] = { done: true, detail }; markLogged(day, now); }
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
  logMadeUp(S, "prayers", now);
  return true;
}

export function madeUpFast(S, now = new Date()) {
  if (S.qada.fasts <= 0) return false;
  S.qada.fasts--;
  logMadeUp(S, "fasts", now);
  return true;
}

/** Count one completed make-up in qada.monthLog (per month, unchanged) and qada.dayLog (per day, for provisions). */
function logMadeUp(S, field, now) {
  const k = ymKey(now);
  const m = S.qada.monthLog[k] || (S.qada.monthLog[k] = { prayers: 0, fasts: 0 });
  m[field]++;
  const dl = S.qada.dayLog || (S.qada.dayLog = {});
  const d = dl[dkey(now)] || (dl[dkey(now)] = { prayers: 0, fasts: 0 });
  d[field] = (d[field] || 0) + 1;
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
 * (day.u), except that day.first keeps the earlier stamp of the two and settings.provisions.best the higher; tool progress (S.tools) is combined by mergeTools; everything else (profile, settings incl.
 * features, amal list, qada, excusedMode) comes from the side saved last. A side that hasn't finished
 * onboarding never overrides one that has.
 */
export function mergeStates(local, remote) {
  if (!remote) return local;
  return keepDeviceLocation(keepNewestConsent(mergeCore(local, remote), local, remote), local);
}
/**
 * A location from "Use my current location" (source "gps") belongs to the phone that read it: two signed-in
 * phones in different places must not keep flipping each other's prayer times (travel.js updates it per
 * phone). So this phone keeps its own GPS location whatever the cloud copy says, and never takes another
 * phone's GPS fix over the location it already has. A searched city (source "city") still syncs as before,
 * and a phone with no location yet takes the cloud copy's (travel updates correct it later).
 */
function keepDeviceLocation(out, local) {
  if (out === local || !local.profile?.onboarded) return out;
  const mine = local.settings?.location, theirs = out.settings?.location;
  const hasMine = !!mine && typeof mine.lat === "number";
  const keep = hasMine && (mine.source === "gps" || theirs?.source === "gps");
  if (!keep || JSON.stringify(mine) === JSON.stringify(theirs)) return out;
  return { ...out, settings: { ...out.settings, location: { ...mine } } };
}
/** Consent records never go backwards: an older phone or an older cloud copy can't remove or downgrade them. */
function keepNewestConsent(out, local, remote) {
  for (const k of ["consent", "dataConsent"]) {
    const scope = k === "dataConsent" ? DATA_CONSENT_SCOPE : "";
    const best = newerConsent(newerConsent(local.profile?.[k], remote.profile?.[k], scope), out.profile?.[k], scope);
    if (!best || JSON.stringify(best) === JSON.stringify(out.profile?.[k])) continue;
    if (out === local) out = { ...local, profile: { ...local.profile } };
    out.profile = { ...out.profile, [k]: JSON.parse(JSON.stringify(best)) };
  }
  return out;
}
function mergeCore(local, remote) {
  if (!local.profile.onboarded && remote.profile?.onboarded) return normalize(remote);
  if (local.profile.onboarded && !remote.profile?.onboarded) return local;
  const newer = (remote.updatedAt || 0) > (local.updatedAt || 0) ? normalize(remote) : local;
  const out = JSON.parse(JSON.stringify(newer));
  out.days = {};
  for (const k of new Set([...Object.keys(local.days), ...Object.keys(remote.days || {})])) {
    const a = local.days[k], b = remote.days?.[k];
    let d = !a ? b : !b ? a : (b.u || 0) > (a.u || 0) ? b : (a.u || 0) > (b.u || 0) ? a : newer === local ? a : b;
    // day.first: the earliest stamp from either copy wins, whichever side's edit is kept
    const first = [a?.first, b?.first].filter(x => x > 0).sort((x, y) => x - y)[0];
    if (first && d.first !== first) d = { ...d, first };
    // day.quran (the Qurʾān goal's reading): both copies' pages, each phone's minutes and the "I read…" entries stay
    if (a?.quran && b?.quran && a !== b) d = { ...d, quran: mergeQuranDay(a.quran, b.quran) };
    out.days[k] = d;
  }
  // Levels never go down: keep the higher best level shown on either phone
  const bestOf = x => x?.settings?.provisions?.best || 1;
  if (out.settings?.provisions) out.settings.provisions.best = Math.max(bestOf(local), bestOf(remote), out.settings.provisions.best || 1);
  out.createdKey = [local.createdKey, remote.createdKey].filter(Boolean).sort()[0];
  out.updatedAt = Math.max(local.updatedAt || 0, remote.updatedAt || 0);
  const tools = mergeTools(newer === local ? local.tools : remote.tools, newer === local ? remote.tools : local.tools);
  if (tools) out.tools = tools;
  return out;
}

const isObj = v => v && typeof v === "object" && !Array.isArray(v);

/**
 * Two copies of a day's Qurʾān reading (day.quran, src/quran-goal.js), joined: the pages read in the reader (both
 * lists), each phone's active seconds (the higher count per phone: a phone only ever adds to its own), and the
 * "I read…" entries by id (the later edit wins; a removed entry, { id, del }, stays removed).
 */
export function mergeQuranDay(a, b) {
  if (!isObj(a)) return isObj(b) ? JSON.parse(JSON.stringify(b)) : b;
  if (!isObj(b)) return JSON.parse(JSON.stringify(a));
  const out = {};
  const pages = [...new Set([...(a.pages || []), ...(b.pages || [])])];
  if (pages.length) out.pages = pages;
  const sec = {};
  for (const src of [a.sec, b.sec]) if (isObj(src)) for (const [dev, v] of Object.entries(src)) if (Number.isFinite(v)) sec[dev] = Math.max(sec[dev] || 0, v);
  if (Object.keys(sec).length) out.sec = sec;
  const byId = new Map();
  for (const m of [...(a.manual || []), ...(b.manual || [])]) {
    if (!m?.id) continue;
    const cur = byId.get(m.id);
    if (cur?.del) continue;
    if (!cur || m.del || (m.e || 0) > (cur.e || 0)) byId.set(m.id, { ...m });
  }
  if (byId.size) out.manual = [...byId.values()].sort((x, y) => (x.at || x.del || 0) - (y.at || y.del || 0));
  return out;
}

/* ---------- cleared tool stamps (sync tombstones) ----------
 * The readers keep "done" as a time stamp in S.tools: adhkar[day][set].done, manzil[day][slot], read[day][id],
 * hizb.weeks[week].read[m], durud[day].done, afterSalah[day][prayer].done. mergeTools joins both copies' maps, so a
 * stamp that was simply deleted on this phone came straight back from the cloud copy on the next sync (an untick, or
 * the Undo of a tick, that "comes back as done" a few seconds later).
 * So removing a stamp leaves a note: S.tools.cleared["adhkar/2026-11-18/evening/done"] = when it was cleared (ms).
 * The merge drops a stamp that is not newer than its note; ticking again later writes a newer stamp, which stays.
 * A negative note (-ms) says the clear was undone at ms (Undo right after an untick): of two notes for the same
 * stamp, the later one wins. Notes are kept for CLEARED_MS.
 */
export const CLEARED_MS = 60 * 86400e3;
const atPath = (obj, keys) => keys.reduce((o, k) => (isObj(o) ? o[k] : undefined), obj);

/** Both copies' notes, the later one per stamp, without the expired ones. */
function joinNotes(a, b, now = Date.now()) {
  const out = {};
  for (const src of [a, b]) {
    if (!isObj(src)) continue;
    for (const [p, v] of Object.entries(src)) {
      if (!Number.isFinite(v) || v === 0 || now - Math.abs(v) > CLEARED_MS) continue;
      if (!(p in out) || Math.abs(v) > Math.abs(out[p])) out[p] = v;
    }
  }
  return out;
}

/** Drop every stamp in tools `t` that a (positive) note says was cleared after it was set. */
function applyNotes(t, notes) {
  for (const [p, at] of Object.entries(notes)) {
    if (!(at > 0)) continue;
    const keys = p.split("/"), last = keys.pop(), parent = atPath(t, keys);
    if (isObj(parent) && typeof parent[last] === "number" && parent[last] <= at) delete parent[last];
  }
}

/**
 * Remove a reader's done stamp (path into S.tools, "/"-separated, e.g. "manzil/2026-11-18/evening") and note when,
 * so the cloud copy can't bring it back. Returns the stamp that was there (or undefined). Caller saves.
 */
export function clearToolStamp(S, path, now = Date.now()) {
  const t = (S.tools ||= {}), keys = path.split("/"), last = keys.pop(), parent = atPath(t, keys);
  const had = isObj(parent) ? parent[last] : undefined;
  if (isObj(parent)) delete parent[last];
  const notes = joinNotes(t.cleared, null, now);
  notes[path] = Math.max(now, typeof had === "number" ? had : 0, notes[path] > 0 ? notes[path] : 0);
  t.cleared = notes;
  return had;
}

/**
 * A done stamp at `path` was just set again (a tick after an untick): turn its note into "set again" (negative,
 * later than the clear), so the merge keeps the new stamp whichever clock wrote it. Caller saves.
 */
export function noteToolSet(S, path, now = Date.now()) {
  const n = S.tools?.cleared?.[path];
  if (n > 0) S.tools.cleared[path] = -Math.max(now, n + 1);
}

/** The numeric leaves of a tools tree (the done stamps among them), by path. Arrays and the notes are left out. */
function stampLeaves(t, prefix = "", out = new Map()) {
  if (!isObj(t)) return out;
  for (const [k, v] of Object.entries(t)) {
    if (!prefix && (k === "cleared" || k === "prefs")) continue;
    const p = prefix ? `${prefix}/${k}` : k;
    if (typeof v === "number") out.set(p, v);
    else if (isObj(v)) stampLeaves(v, p, out);
  }
  return out;
}

/**
 * Put S.tools back to an earlier copy (an Undo), noting what that removes (cleared now) and what it puts back over
 * a clear (the clear undone), so the next sync keeps exactly the restored state. Caller saves.
 */
export function restoreTools(S, snap, now = Date.now()) {
  const cur = isObj(S.tools) ? S.tools : {}, next = isObj(snap) ? JSON.parse(JSON.stringify(snap)) : {};
  const notes = joinNotes(cur.cleared, next.cleared, now);
  const before = stampLeaves(cur), after = stampLeaves(next);
  for (const [p, v] of before) if (!after.has(p)) notes[p] = Math.max(now, v);
  for (const [p] of after) if (!before.has(p) && notes[p] > 0) notes[p] = -Math.max(now, notes[p] + 1);
  if (Object.keys(notes).length) next.cleared = notes; else delete next.cleared;
  S.tools = next;
}

/**
 * Tool progress (S.tools: adhkar counts, durūd read, Hizb weeks, Qurʾān position and pages read) from both
 * phones. Maps keyed by day or week are combined, so reading on one phone never erases reading on the other;
 * for the same field the side saved last wins, except "read" lists (pages, durūd) which are joined and the
 * Hizb khatm count, which keeps the higher number. A done stamp cleared on either phone stays cleared unless it was
 * set again after the clear (S.tools.cleared, clearToolStamp).
 */
export function mergeTools(newer, older) {
  if (!isObj(older)) return isObj(newer) ? JSON.parse(JSON.stringify(newer)) : newer;
  if (!isObj(newer)) return JSON.parse(JSON.stringify(older));
  const out = deepTools(newer, older);
  const notes = joinNotes(newer.cleared, older.cleared);
  if (Object.keys(notes).length) { out.cleared = notes; applyNotes(out, notes); } else delete out.cleared;
  return out;
}
function deepTools(newer, older) {
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
