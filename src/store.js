import { PRAYERS, dkey, ymKey } from "./util.js";

const KEY = "amal-tracker-v1";
export const VERSION = 1;

export const DEFAULT_AMAL = [
  { id: "quran", name: "Quran recitation", hint: "", detail: "quran", builtin: true },
  { id: "morning", name: "Morning adhkar", hint: "After Fajr", detail: "none", builtin: true },
  { id: "evening", name: "Evening adhkar", hint: "After Asr", detail: "none", builtin: true },
  { id: "salawat", name: "Salawat", hint: "", detail: "count", builtin: true },
  { id: "sadaqah", name: "Sadaqah", hint: "Any amount, any kind", detail: "note", builtin: true },
];

export function defaultState(now = new Date()) {
  return {
    version: VERSION,
    createdKey: dkey(now),
    profile: { name: "", onboarded: false },
    settings: {
      preQada: true, leadMin: 15, prayerAlerts: false, evening: true,
      method: "NorthAmerica", asr: "shafi",
      location: null, // {lat, lng, label}
      carryQuran: true, reflection: true, seerah: false, lock: false,
    },
    amalList: DEFAULT_AMAL.map(a => ({ ...a })),
    days: {},
    lastQuran: "",
    qada: { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0, fasts: 0, goal: 20, fastGoal: 2, monthLog: {}, addedLog: {} },
  };
}

/** Fill in anything missing from older or partial saves. */
export function normalize(s, now = new Date()) {
  const d = defaultState(now);
  const out = { ...d, ...s };
  out.profile = { ...d.profile, ...(s.profile || {}) };
  out.settings = { ...d.settings, ...(s.settings || {}) };
  out.qada = { ...d.qada, ...(s.qada || {}) };
  out.amalList = Array.isArray(s.amalList) ? s.amalList : d.amalList;
  out.days = s.days || {};
  out.version = VERSION;
  return out;
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

/* ---------- day records ---------- */
export function getDay(S, key) { return S.days[key] || { prayers: {}, amal: {}, note: "" }; }
export function ensureDay(S, key) {
  if (!S.days[key]) S.days[key] = { prayers: {}, amal: {}, note: "" };
  return S.days[key];
}

/**
 * Log a prayer status for a day. Marking Missed adds one to qada; changing
 * away from Missed removes it again. Returns the previous status.
 */
export function setPrayer(S, key, p, status, now = new Date()) {
  const day = ensureDay(S, key);
  const was = day.prayers[p] || null;
  const today = dkey(now);
  if (was === "missed" && status !== "missed") {
    S.qada[p] = Math.max(0, S.qada[p] - 1);
    S.qada.addedLog[today] = (S.qada.addedLog[today] || 0) - 1;
  }
  if (status === "missed" && was !== "missed") {
    S.qada[p]++;
    S.qada.addedLog[today] = (S.qada.addedLog[today] || 0) + 1;
  }
  if (status) day.prayers[p] = status; else delete day.prayers[p];
  return was;
}

export function setAmal(S, key, id, done, detail = "") {
  const day = ensureDay(S, key);
  if (done) day.amal[id] = { done: true, detail };
  else delete day.amal[id];
}

export function monthLog(S, now = new Date()) {
  const k = ymKey(now);
  return S.qada.monthLog[k] || { prayers: 0, fasts: 0 };
}

export function madeUpPrayer(S, p, now = new Date()) {
  if (S.qada[p] <= 0) return false;
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

export function qadaOwed(S) { return PRAYERS.reduce((s, p) => s + S.qada[p], 0); }
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
