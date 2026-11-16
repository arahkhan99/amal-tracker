/*
 * Home-screen widgets: the snapshot the app hands to the native widgets, and the reference logic the
 * widgets run on it. No DOM here, so tests can import it (the bridge to the native plugin is
 * widget-bridge.js).
 *
 * The widgets (Android: android/app/src/main/java/com/zad/app/widget, iOS: ios/App/ZadWidget) only
 * ever read this snapshot. They work out "now / next prayer" and the countdown themselves from the
 * times in it, so they stay right while the app is closed. widgetModel() below is the specification
 * of that logic; the Java (android/.../widget/WidgetModel.java) and Swift (ios/App/ZadWidget/WidgetModel.swift) ports follow it line by line.
 *
 * Snapshot format (version 1), all times are epoch milliseconds:
 * {
 *   v: 1, generatedAt, date: "YYYY-MM-DD" (today when written),
 *   days: [ // yesterday, today, and the next 2 days
 *     { date, hijri, names: {Fajr..Isha}, times: {Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha}, ishaBest,
 *       status: {Fajr: "congregation"|"ontime"|"madeup"|"missed"|"excused"|null, ...},
 *       sunnah: {Fajr: true|false|null, ...}, excused }
 *   ],
 *   makeups: number | null (null when the Make-ups module is off),
 *   deeds: { date, done, total, items: [{ name, done }] (first 6) } | null (Good Deeds module off),
 *   labels: { ... } English UI words, so the widgets don't hard-code them
 * }
 */
import { timesFor, ishaBestBefore } from "./times.js";
import * as store from "./store.js";
import { hijriLabel } from "./hijri.js";
import { PRAYERS, dkey, addDays, parseKey, fmt12 } from "./util.js";
import { isOn } from "./features.js";
import { prayerName, DEEDS, STATUS_EXTRA, HOME_X } from "./strings.js";

export const SNAPSHOT_VERSION = 1;
/** Days in the snapshot, relative to today. Yesterday is there for last night's ʿIshāʾ (before Fajr). */
export const DAY_OFFSETS = [-1, 0, 1, 2];
export const MAX_DEEDS = 6;

/** English UI words for the widgets (sent in the snapshot so the native code doesn't hard-code them). {n} is a number. */
export const WIDGET_LABELS = {
  next: HOME_X.next,
  now: "Now",
  left: "left",
  until: "until",
  toMiddle: "to middle of night",
  prayed: STATUS_EXTRA.prayed,
  logToday: "Log today",
  goodDeeds: DEEDS.title,
  makeups: "{n} make-ups left",
  makeupsOne: "{n} make-up left",
  addDeed: "+ Add deed",
  prayers: "prayers",
  nextPrayer: "Next prayer",
  stale: "Open Zad to update",
};

/** Build the snapshot from the app state. Pure: pass `now` (a Date). */
export function buildSnapshot(S, now = new Date()) {
  const settings = S.settings || {};
  const jumuah = settings.jumuah !== false;
  const sunnahOn = isOn(S, "sunnah");
  const todayKey = dkey(now);
  const days = DAY_OFFSETS.map(off => {
    const d = addDays(now, off), key = dkey(d);
    const t = timesFor(d, settings);
    const day = S.days?.[key];
    const status = {}, sunnah = {}, names = {}, times = { Sunrise: +t.Sunrise };
    for (const p of PRAYERS) {
      times[p] = +t[p];
      names[p] = prayerName(p, { date: d, jumuah });
      status[p] = store.statusOf(day, p) || null;
      const chips = sunnahOn ? store.sunnahChips(S, key, p) : [];
      sunnah[p] = chips.length ? chips.some(c => c.done) : null;
    }
    return { date: key, hijri: hijriLabel(d), names, times, ishaBest: +ishaBestBefore(d, settings), status, sunnah, excused: !!day?.excused };
  });
  let deeds = null;
  if (isOn(S, "deeds")) {
    const list = store.amalForDay(S, todayKey), dayAmal = store.getDay(S, todayKey).amal || {};
    const items = list.map(a => ({ name: a.name, done: !!dayAmal[a.id]?.done }));
    deeds = { date: todayKey, done: items.filter(x => x.done).length, total: items.length, items: items.slice(0, MAX_DEEDS) };
  }
  return {
    v: SNAPSHOT_VERSION,
    generatedAt: +now,
    date: todayKey,
    days,
    makeups: isOn(S, "makeups") ? store.qadaOwed(S) : null,
    deeds,
    labels: { ...WIDGET_LABELS },
  };
}

/**
 * A cheap signature of everything buildSnapshot reads, so the bridge can skip rebuilding it on redraws that
 * change nothing (the 20 s tick, view switches). Same signature means the same snapshot, generatedAt aside.
 * Covers: today's date (day change), the settings (location, method, ʿAsr, madhhab, Jumuʿah, excused days,
 * Hijri, features, sunnah options), the four days' records, the deeds list, make-ups, and the Hijri labels
 * (a moon-sighting committee's months can arrive without S changing). The snapshot has no time-of-day
 * content (the widgets work out now / next from its times), so nothing else changes at a prayer boundary.
 * Keep this in step with buildSnapshot when it starts reading something new.
 */
export function snapshotInputSig(S, now = new Date()) {
  const dates = DAY_OFFSETS.map(off => addDays(now, off));
  return JSON.stringify([
    SNAPSHOT_VERSION, dkey(now), S.settings ?? null, S.amalList ?? null, S.qada ?? null,
    dates.map(d => S.days?.[dkey(d)] ?? null), dates.map(d => hijriLabel(d)),
  ]);
}

/**
 * Remembers the last deep link handled, so the same URL arriving twice within `windowMs` (a cold start
 * delivers it through appUrlOpen and App.getLaunchUrl) is handled once. Returns (url, nowMs) => true to handle.
 */
export function linkDeduper(windowMs = 2000) {
  let last = "", at = -Infinity;
  return (url, now = Date.now()) => {
    if (!url) return false;
    if (url === last && now - at < windowMs) return false;
    last = url; at = now;
    return true;
  };
}

/** The snapshot as the JSON string stored natively, and a signature that ignores generatedAt (to skip no-op writes). */
export function serializeSnapshot(snap) {
  const json = JSON.stringify(snap);
  const sig = JSON.stringify({ ...snap, generatedAt: 0 });
  return { json, sig };
}

/* ---------------- widget logic (reference for the native ports) ---------------- */

const PRAYED_STATUSES = ["congregation", "ontime", "madeup"];

/** "1h 24m" / "24m": minutes rounded up so it never shows 0m before the time. */
export function fmtCountdown(ms) {
  const m = Math.max(0, Math.ceil(ms / 60000));
  const h = Math.floor(m / 60);
  return `${h ? h + "h " : ""}${m % 60}m`;
}

/** Local "YYYY-MM-DD" of an epoch-ms time. */
const keyOf = ms => dkey(new Date(ms));

/**
 * What the widgets show at `nowMs`. Returns null when the snapshot doesn't cover today (the widget then
 * says "Open Zad to update").
 *
 * { date, hijri,
 *   mode: "now" (a prayer's time is in and it isn't logged) | "next",
 *   focus: { p, name, date, time },            // the prayer the hero shows
 *   countdownTo, countdown: "1h 24m", countdownLabel: "left" | "until ʿAsr" | "to mid-night",
 *   logTarget: { p, date } | null,             // what the hero / Prayed button opens (null: open Today)
 *   prayers: [{ p, name, time, timeLabel, state, sunnah, focus }],
 *   prayed, deeds, makeups, nextChange }       // nextChange: the next time the widget must redraw anyway
 * state: congregation | ontime | madeup | missed | excused | due (time in, not logged) | next | upcoming
 */
export function widgetModel(snap, nowMs) {
  if (!snap || snap.v !== SNAPSHOT_VERSION || !Array.isArray(snap.days)) return null;
  const todayKey = keyOf(nowMs);
  const i = snap.days.findIndex(d => d.date === todayKey);
  if (i < 0) return null;
  const today = snap.days[i], yesterday = snap.days[i - 1] || null, tomorrow = snap.days[i + 1] || null;
  const L = { ...WIDGET_LABELS, ...(snap.labels || {}) };
  const t = today.times;

  // The prayer whose time is in now (same rules as times.currentWindow)
  let cur = null;
  if (nowMs < t.Fajr) {
    if (yesterday) cur = { day: yesterday, p: "Isha", end: t.Fajr };
  } else {
    for (let k = PRAYERS.length - 1; k >= 0; k--) {
      const p = PRAYERS[k];
      if (nowMs < t[p]) continue;
      const end = p === "Fajr" ? t.Sunrise : p === "Isha" ? (tomorrow ? tomorrow.times.Fajr : null) : t[PRAYERS[k + 1]];
      if (end != null && nowMs < end) cur = { day: today, p, end };
      break;
    }
  }
  const curStatus = cur ? cur.day.status?.[cur.p] || null : null;
  const curOpen = cur && !curStatus && !cur.day.excused;

  // The next prayer to start
  let next = null;
  const np = PRAYERS.find(p => t[p] > nowMs);
  if (np) next = { day: today, p: np, time: t[np] };
  else if (tomorrow) next = { day: tomorrow, p: "Fajr", time: tomorrow.times.Fajr };

  let mode, focus, countdownTo, countdownLabel, logTarget;
  if (curOpen) {
    mode = "now";
    const best = cur.p === "Isha" && cur.day.ishaBest && nowMs < cur.day.ishaBest ? cur.day.ishaBest : null;
    focus = { p: cur.p, name: cur.day.names[cur.p], date: cur.day.date, time: cur.day.times[cur.p] };
    countdownTo = best || cur.end;
    countdownLabel = best ? L.toMiddle : L.left;
    logTarget = { p: cur.p, date: cur.day.date };
  } else if (next) {
    mode = "next";
    focus = { p: next.p, name: next.day.names[next.p], date: next.day.date, time: next.time };
    countdownTo = next.time;
    countdownLabel = `${L.until} ${focus.name}`;
    logTarget = null;
  } else return null;

  const focusToday = focus.date === today.date;
  const prayers = PRAYERS.map(p => {
    const s = today.status?.[p] || (today.excused ? "excused" : null);
    let state = s;
    if (!s) state = focusToday && focus.p === p ? (mode === "now" ? "due" : "next") : t[p] <= nowMs ? "due" : "upcoming";
    return { p, name: today.names[p], time: t[p], timeLabel: fmt12(new Date(t[p])), state, sunnah: today.sunnah?.[p] ?? null, focus: focusToday && focus.p === p };
  });

  // Redraw at the next boundary (any prayer start, sunrise, mid-night, midnight) even without minute ticks
  const bounds = [];
  for (const d of snap.days) bounds.push(...Object.values(d.times), d.ishaBest || 0);
  bounds.push(+addDays(parseKey(todayKey), 1));
  const nextChange = Math.min(...bounds.filter(b => b > nowMs), Infinity);

  const deeds = snap.deeds ? (snap.deeds.date === today.date ? snap.deeds : { ...snap.deeds, done: 0, items: snap.deeds.items.map(x => ({ ...x, done: false })) }) : null;
  return {
    date: today.date, hijri: today.hijri, mode, focus,
    focusTimeLabel: fmt12(new Date(focus.time)),
    countdownTo, countdown: fmtCountdown(countdownTo - nowMs), countdownLabel, logTarget,
    prayers,
    prayed: prayers.filter(x => PRAYED_STATUSES.includes(x.state)).length,
    deeds, makeups: snap.makeups,
    nextChange: Number.isFinite(nextChange) ? nextChange : null,
  };
}

/** Deep links the widgets open (handled in widget-bridge.js). */
export const deepLink = {
  log: (p, date) => `zad://log?p=${encodeURIComponent(p)}&d=${encodeURIComponent(date)}`,
  today: () => "zad://today",
  open: view => `zad://open?v=${encodeURIComponent(view)}`,
};

/**
 * Parse a zad:// URL. Returns { kind: "log", p, date } | { kind: "today" } | { kind: "open", view } | null.
 * Only well-formed values pass (the prayer must be one of the five, the date YYYY-MM-DD).
 */
export function parseDeepLink(url) {
  let u;
  try { u = new URL(url); } catch (e) { return null; }
  if (u.protocol !== "zad:") return null;
  // zad://log?... parses with host "log" (path empty); be lenient about zad:log or zad:///log too
  const what = (u.host || u.pathname.replace(/^\/+/, "")).toLowerCase();
  if (what === "log") {
    const p = u.searchParams.get("p"), date = u.searchParams.get("d");
    if (!PRAYERS.includes(p) || !/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return null;
    return { kind: "log", p, date };
  }
  if (what === "today") return { kind: "today" };
  if (what === "open") {
    const view = u.searchParams.get("v") || "home";
    return /^[a-z]+$/.test(view) ? { kind: "open", view } : null;
  }
  return null;
}
