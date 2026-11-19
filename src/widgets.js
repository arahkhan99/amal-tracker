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
 *   labels: { ... } English UI words, so the widgets don't hard-code them,
 *   // One-tap logging (all optional, still version 1; older readers ignore them):
 *   gender: "m" | "f" | null (null is treated as "m": Congregation and On time; "f": On time only),
 *   excused: bool (today is an excused day; days[].excused is still honoured per day),
 *   showTimesOnly: bool (no status, dots or buttons anywhere), ongoingNow: bool (Android "Now" notification),
 *   lockDots: bool (iPhone lock-screen rectangular widget shows the five dots; default times only),
 *   days[].remember: { Asr: true, ... } remembrance at prayer time ticked (excused prayers only)
 * }
 */
import { timesFor, ishaBestBefore } from "./times.js";
import * as store from "./store.js";
import { hijriLabel } from "./hijri.js";
import { PRAYERS, dkey, addDays, parseKey } from "./util.js";
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
  // One-tap logging (widgets, tile, notifications). {p} is a prayer name, {t} a time.
  onTime: "On time",
  congregation: "Congregation",
  logged: "{p} logged ✓",
  undo: "Undo",
  begins: "{p} begins {t}",
  beginsShort: "Begins {t}",
  remembrance: "Remembrance at prayer time",
  remembranceShort: "Remembrance",
  remembered: "Remembrance ✓",
  notLogged: "Not logged",
  madeup: "Made up",
  missed: "Missed",
  excused: "Excused",
  logOnTime: "Log {p} · on time",
  logTile: "Log {p}",
  nothingOpen: "Nothing to log now",
  ends: "{p} · ends {t}",
  nextAt: "Next {p} {t}",
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
    const remember = {};
    for (const p of PRAYERS) if (store.remembered(day, p)) remember[p] = true;
    return { date: key, hijri: hijriLabel(d), names, times, ishaBest: +ishaBestBefore(d, settings), status, sunnah, excused: !!day?.excused, remember };
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
    gender: store.genderOf(S),
    excused: !!S.days?.[todayKey]?.excused,
    showTimesOnly: !!settings.showTimesOnly,
    ongoingNow: !!settings.ongoingNow,
    lockDots: !!settings.lockDots,
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
    SNAPSHOT_VERSION, dkey(now), store.genderOf(S), S.settings ?? null, S.amalList ?? null, S.qada ?? null,
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

/** "16:05" or "4:05 PM" (the widgets follow the phone's 12/24-hour setting). */
export function fmtTime(ms, use24 = false) {
  const d = new Date(ms), h = d.getHours(), m = String(d.getMinutes()).padStart(2, "0");
  return use24 ? `${String(h).padStart(2, "0")}:${m}` : `${h % 12 || 12}:${m} ${h < 12 ? "AM" : "PM"}`;
}

/** How long "ʿAsr logged ✓ · Undo" stays after a one-tap log. */
export const UNDO_MS = 10 * 60000;

/** A label with {p} (prayer name) and {t} (a time) filled in. */
const fill = (s, p = "", t = "") => s.replace("{p}", p).replace("{t}", t);

/**
 * One day of the snapshot with the unmerged one-tap queue laid over it (as src/pending.js will apply it).
 * status: what's logged per prayer; remember: remembrance ticked.
 */
function dayView(d) {
  const status = {}, remember = new Set();
  for (const p of PRAYERS) {
    if (d.status?.[p]) status[p] = d.status[p];
    if (d.remember?.[p]) remember.add(p);
  }
  return {
    raw: d, date: d.date, excused: !!d.excused, status, remember,
    time: p => d.times?.[p] || 0,
    name: p => d.names?.[p] || p,
    statusOf(p) { return this.status[p] || (this.excused ? "excused" : null); },
  };
}

/** Lay the queue over the days: a log sets the status (or ticks remembrance); an undo reverts the latest log. */
function overlay(byDate, pending) {
  const list = (Array.isArray(pending) ? pending : []).filter(e => e && typeof e === "object").slice().sort((a, b) => (a.at || 0) - (b.at || 0));
  const stacks = {};
  for (const e of list) {
    const d = byDate[e.date], p = e.prayer;
    if (!d || !PRAYERS.includes(p)) continue;
    const stack = (stacks[d.date + "|" + p] ||= []);
    if (e.status === "congregation" || e.status === "ontime") {
      stack.push(["status", d.status[p] || null]);
      d.status[p] = e.status;
    } else if (e.status === "remember") {
      if (d.statusOf(p) !== "excused") continue;
      stack.push(["remember", d.remember.has(p)]);
      d.remember.add(p);
    } else if (e.status === "undo") {
      if (stack.length) {
        const [kind, prev] = stack.pop();
        if (kind === "status") { if (prev) d.status[p] = prev; else delete d.status[p]; }
        else if (!prev) d.remember.delete(p);
      } else if (d.remember.has(p) && d.statusOf(p) === "excused") d.remember.delete(p); // merged earlier
      else delete d.status[p];
    }
  }
}

/**
 * What the widgets, the Quick Settings tile and the ongoing "Now" notification show at `nowMs`: the reference for
 * the native ports (android/.../widget/WidgetModel.java, ios/App/ZadWidget/WidgetModel.swift). Null when the
 * snapshot doesn't cover today (the widget then says "Open Zad to update").
 * opts: { pending: the unmerged one-tap queue, tap: the last one-tap log { id, date, prayer, status, at },
 *         use24: the phone's 24-hour setting, ignoreTimesOnly: the full picture even with "Show times only" on }.
 *
 * mode:
 * - "now": a prayer's time is in and it's open. action "log" (Congregation / On time; sisters On time) or, on an
 *   excused day, "remember" (Remembrance at prayer time) until ticked.
 * - "logged": that prayer was just logged by a tap (UNDO_MS): "ʿAsr logged ✓ · Undo".
 * - "next": nothing open; the next prayer, "Zuhr begins 11:50", no buttons. After a prayer's time ends the
 *   widget moves straight on to the next prayer.
 * Show times only: no status, dots or buttons; the hero is the prayer whose time is in (whatever its status), else
 * the next, so nothing about what's logged shows (action null).
 *
 * { date, hijri, mode, action, tap,
 *   focus: { p, name, date, time, end }, focusTimeLabel, focusEndLabel,
 *   countdownTo, countdown: "1h 24m", countdownLabel: "left · until 16:05" | "to middle of night · 23:10" | "Zuhr begins 11:50",
 *   next: { p, name, time, timeLabel } | null,   // the next prayer to begin (the Now notification's "Next Maghrib 16:05")
 *   logTarget: { p, date } | null,               // what a tap on the widget opens (null: the Today sheet)
 *   gender, sister, excusedToday, showTimesOnly, ongoingNow, lockDots,
 *   prayers: [{ p, name, time, timeLabel, state, sunnah, focus, begun }],
 *   prayed, deeds, makeups, nextChange }         // nextChange: the next time the widget must redraw anyway
 * state: congregation | ontime | madeup | missed | excused | now (its time is in, open) | due (begun, not logged) | upcoming
 */
export function widgetModel(snap, nowMs, { pending = [], tap = null, use24 = false, ignoreTimesOnly = false } = {}) {
  if (!snap || snap.v !== SNAPSHOT_VERSION || !Array.isArray(snap.days)) return null;
  const todayKey = keyOf(nowMs);
  const all = snap.days.map(dayView), byDate = Object.fromEntries(all.map(d => [d.date, d]));
  const i = all.findIndex(d => d.date === todayKey);
  if (i < 0) return null;
  const today = all[i], yesterday = all[i - 1] || null, tomorrow = all[i + 1] || null;
  overlay(byDate, pending);
  const L = { ...WIDGET_LABELS, ...(snap.labels || {}) };
  const t = p => today.time(p), fmt = ms => fmtTime(ms, use24);
  const showTimesOnly = !!snap.showTimesOnly && !ignoreTimesOnly;

  // The prayer whose time is in now (same rules as times.currentWindow)
  let cur = null;
  if (nowMs < t("Fajr")) {
    if (yesterday) cur = { day: yesterday, p: "Isha", end: t("Fajr") };
  } else {
    for (let k = PRAYERS.length - 1; k >= 0; k--) {
      const p = PRAYERS[k];
      if (nowMs < t(p)) continue;
      const end = p === "Fajr" ? t("Sunrise") : p === "Isha" ? (tomorrow ? tomorrow.time("Fajr") : 0) : t(PRAYERS[k + 1]);
      if (end > 0 && nowMs < end) cur = { day: today, p, end };
      break;
    }
  }

  // The next prayer to begin
  let next = null;
  const np = PRAYERS.find(p => t(p) > nowMs);
  if (np) next = { day: today, p: np };
  else if (tomorrow) next = { day: tomorrow, p: "Fajr" };

  // The last tap, while Undo is offered and the log still stands
  let lastTap = null;
  if (tap && cur && tap.date === cur.day.date && tap.prayer === cur.p && nowMs - tap.at < UNDO_MS && tap.at <= nowMs + 60000) {
    const stands = tap.status === "remember" ? cur.day.remember.has(cur.p) : cur.day.status[cur.p] === tap.status;
    if (stands) lastTap = tap;
  }

  let mode, action = null;
  if (cur && showTimesOnly) mode = "now";
  else if (cur && lastTap) mode = "logged";
  else if (cur && cur.day.statusOf(cur.p) == null) { mode = "now"; action = "log"; }
  else if (cur && cur.day.statusOf(cur.p) === "excused" && !cur.day.remember.has(cur.p)) { mode = "now"; action = "remember"; }
  else if (next) mode = "next";
  else return null;

  let focus, countdownTo, countdownLabel;
  if (mode !== "next") {
    const best = cur.p === "Isha" && cur.day.raw.ishaBest && nowMs < cur.day.raw.ishaBest ? cur.day.raw.ishaBest : null;
    focus = { p: cur.p, name: cur.day.name(cur.p), date: cur.day.date, time: cur.day.time(cur.p), end: cur.end };
    countdownTo = best || cur.end;
    countdownLabel = best ? `${L.toMiddle} · ${fmt(best)}` : `${L.left} · ${L.until} ${fmt(cur.end)}`;
  } else {
    focus = { p: next.p, name: next.day.name(next.p), date: next.day.date, time: next.day.time(next.p), end: 0 };
    countdownTo = focus.time;
    countdownLabel = fill(L.begins, focus.name, fmt(focus.time));
  }

  const prayers = PRAYERS.map(p => {
    const s = today.statusOf(p), begun = t(p) <= nowMs;
    const inWindow = cur?.day === today && cur.p === p;
    const state = s || (inWindow ? "now" : begun ? "due" : "upcoming");
    return { p, name: today.name(p), time: t(p), timeLabel: fmt(t(p)), state, sunnah: today.raw.sunnah?.[p] ?? null, focus: focus.date === today.date && focus.p === p, begun };
  });

  // Redraw at the next boundary (any prayer start, sunrise, mid-night, the end of Undo, midnight)
  const bounds = [];
  for (const d of snap.days) bounds.push(...Object.values(d.times || {}), d.ishaBest || 0);
  bounds.push(+addDays(parseKey(todayKey), 1));
  if (lastTap && mode === "logged") bounds.push(lastTap.at + UNDO_MS);
  const nextChange = Math.min(...bounds.filter(b => b > nowMs), Infinity);

  const deeds = snap.deeds ? (snap.deeds.date === today.date ? snap.deeds : { ...snap.deeds, done: 0, items: snap.deeds.items.map(x => ({ ...x, done: false })) }) : null;
  const gender = snap.gender === "m" || snap.gender === "f" ? snap.gender : null;
  return {
    date: today.date, hijri: today.raw.hijri, mode, action, tap: mode === "logged" ? lastTap : null, focus,
    focusTimeLabel: fmt(focus.time), focusEndLabel: focus.end ? fmt(focus.end) : null,
    countdownTo, countdown: fmtCountdown(countdownTo - nowMs), countdownLabel,
    next: next ? { p: next.p, name: next.day.name(next.p), time: next.day.time(next.p), timeLabel: fmt(next.day.time(next.p)) } : null,
    logTarget: mode !== "next" ? { p: focus.p, date: focus.date } : null,
    gender, sister: gender === "f", excusedToday: "excused" in snap ? !!snap.excused : today.excused,
    showTimesOnly, ongoingNow: !!snap.ongoingNow, lockDots: !!snap.lockDots,
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
