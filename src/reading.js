/*
 * The Read tab's rules, without the DOM (views/read.js draws them; tests import this file).
 *
 * "For today" lists what is due today from the reading the user has switched on (Settings → Features → tools):
 * morning and evening adhkār, today's manzil of the Hizb al-Aʿzam, Qurʾān recitation (on an excused day:
 * listening), the Manzil, Sūrat al-Mulk before sleep, al-Kahf on Jumuʿah, and durūd (daily when Salawāt is on
 * the good-deeds list, otherwise on Jumuʿah). Each has a tick.
 *
 * Ticks and the good-deeds log:
 * - Reading deeds (Qurʾān, adhkār, salawāt) live in Read when Read shows them, and the Good deeds sheet on Today
 *   lists only the rest (deedInRead / sheetDeeds). A deed is in exactly one place, so nothing counts twice.
 * - A tick in Read writes the same day log as the Good deeds sheet (day.amal[id], store.setAmal), so Progress,
 *   the stats and Provisions count it as before. No new deed ids are written to day.amal (the scoring stays the same).
 * - Readings with no good deed (Hizb, Manzil, al-Mulk, al-Kahf, Yā-Sīn morning and evening) are kept with the tool's own progress in S.tools:
 *   the Hizb week (S.tools.hizb), the Manzil day (S.tools.manzil), else S.tools.read[day][id]. They also
 *   mark the day log (day.reads, store.setRead), and each counts as one good deed in Provisions (scholar,
 *   18 Nov 2026; points.readsByDay), never on the editable deeds list.
 * - A reader that finishes (all adhkār counted, the forty durūd, a manzil) also counts as done.
 */
import * as store from "./store.js";
import { dkey, addDays, fmt12 } from "./util.js";
import { timesFor, manzilFor, weekKey, HIZB_WEEK_START } from "./times.js";
import { toolVisible } from "./features.js";
import { READ, PRAYER_NAME } from "./strings.js";

/** Reading deeds and the Read item (and tool) that holds each. */
export const READ_DEEDS = { quran: "quran", listen: "quran", morning: "adhkar", evening: "adhkar", salawat: "durud" };
const DEED_ITEM = { quran: "quran", listen: "listen", morning: "morning", evening: "evening", salawat: "durud" };
/** Item id → its tool (features.TOOLS) and the good deed it ticks, if any. */
const ITEM = {
  morning: { tool: "adhkar", deed: "morning" },
  evening: { tool: "adhkar", deed: "evening" },
  hizb: { tool: "hizb" },
  quran: { tool: "quran", deed: "quran" },
  listen: { tool: "quran", deed: "listen" },
  manzil: { tool: "manzil" },
  mulk: { tool: "quran" },
  kahf: { tool: "quran" },
  yasinAm: { tool: "quran" },
  yasinPm: { tool: "quran" },
  durud: { tool: "durud", deed: "salawat" },
};
/** The order on For today before done items move to the end. */
export const READ_ORDER = ["morning", "evening", "hizb", "quran", "listen", "yasinAm", "yasinPm", "manzil", "mulk", "kahf", "durud"];
/** Sūrah Yā-Sīn, morning and evening (user, 19 Nov 2026): two readings, each its own good deed. */
export const YASIN = ["yasinAm", "yasinPm"];

/** Whether good deed `id` is ticked in Read (true) or in the Good deeds sheet on Today (false). */
export function deedInRead(S, id) {
  const t = READ_DEEDS[id];
  return !!t && toolVisible(S, t);
}

/** The deeds the Good deeds sheet shows for today: the day's list without the ones Read holds. */
export function sheetDeeds(S, key) {
  return store.amalForDay(S, key).filter(a => !deedInRead(S, a.id));
}
/** "Good deeds · n of m" on Today: the sheet's deeds only. inRead: how many of the day's deeds Read holds. */
export function sheetCount(S, key) {
  const list = store.amalForDay(S, key), day = store.getDay(S, key);
  const mine = list.filter(a => !deedInRead(S, a.id));
  return { done: mine.filter(a => day.amal[a.id]?.done).length, of: mine.length, inRead: list.length - mine.length };
}

/* ---------- days and windows ---------- */
/** Jumuʿah, as the app counts it for durūd: Thursday after Maghrib, and all of Friday. */
export function isJumuah(now, settings) {
  return now.getDay() === 5 || (now.getDay() === 4 && now >= timesFor(now, settings).Maghrib);
}
/** The day key Jumuʿah readings are kept under: Friday (Thursday night already belongs to it). */
export function jumuahKey(now, settings) {
  return now.getDay() === 4 && now >= timesFor(now, settings).Maghrib ? dkey(addDays(now, 1)) : dkey(now);
}
/** "morning" from Fajr until ʿAsr, otherwise "evening" (the adhkār and Manzil rule). */
export function slotOf(now, settings) {
  const t = timesFor(now, settings);
  return now >= t.Fajr && now < t.Asr ? "morning" : "evening";
}

/* ---------- the tools' own done states (S.tools) ---------- */
const tools = S => S.tools || {};
const readDay = (S, key) => tools(S).read?.[key] || {};
const hizbWeek = (S, now) => tools(S).hizb?.weeks?.[weekKey(now, HIZB_WEEK_START)] || { read: {} };

/** When the tool itself says item `id` is done today (ms), or 0. */
function nativeDone(S, id, now) {
  const key = dkey(now), set = S.settings;
  switch (id) {
    case "morning": case "evening": return tools(S).adhkar?.[key]?.[id]?.done || 0;
    case "hizb": return hizbWeek(S, now).read?.[manzilFor(now)] || 0;
    case "manzil": return tools(S).manzil?.[key]?.[slotOf(now, set)] || 0;
    case "durud": return tools(S).durud?.[jumuahKey(now, set)]?.done || readDay(S, key).durud || 0;
    case "kahf": return readDay(S, jumuahKey(now, set)).kahf || 0;
    default: return readDay(S, key)[id] || 0;
  }
}
const ensure = (o, k, init = {}) => (o[k] ||= init);
const prune = (obj, n) => { const ks = Object.keys(obj).sort(); while (ks.length > n) delete obj[ks.shift()]; };

function setNative(S, id, on, now) {
  const key = dkey(now), set = S.settings, t = (S.tools ||= {});
  const stamp = on ? now.getTime() : 0;
  // Unticking removes the stamp with a note (store.clearToolStamp), so the cloud copy's stamp can't bring it back
  const put = (obj, k, path) => { if (on) { obj[k] = stamp; store.noteToolSet(S, path); } else store.clearToolStamp(S, path); };
  switch (id) {
    case "morning": case "evening": {
      const a = ensure(t, "adhkar"), d = ensure(a, key), s = ensure(d, id, { c: {} });
      put(s, "done", `adhkar/${key}/${id}/done`); return;
    }
    case "hizb": {
      const h = ensure(t, "hizb", { weeks: {}, khatms: 0 }), wk = weekKey(now, HIZB_WEEK_START), ws = ensure(ensure(h, "weeks"), wk, { read: {} });
      ws.read ||= {};
      put(ws.read, manzilFor(now), `hizb/weeks/${wk}/read/${manzilFor(now)}`);
      if (on) {
        delete ws.pos;
        // all seven manzils this week: a khatm (as the reader counts it, once a week)
        if (Object.keys(ws.read).length >= 7 && !ws.khatm) { ws.khatm = stamp; h.khatms = (h.khatms || 0) + 1; }
      }
      prune(h.weeks, 30);
      return;
    }
    case "manzil": { const m = ensure(t, "manzil"), slot = slotOf(now, set); put(ensure(m, key), slot, `manzil/${key}/${slot}`); prune(m, 40); return; }
    case "durud": {
      if (!on) store.clearToolStamp(S, `durud/${jumuahKey(now, set)}/done`);
      put(ensure(ensure(t, "read"), key), "durud", `read/${key}/durud`); prune(t.read, 40); return;
    }
    case "kahf": { const jk = jumuahKey(now, set); put(ensure(ensure(t, "read"), jk), "kahf", `read/${jk}/kahf`); prune(t.read, 40); return; }
    default: put(ensure(ensure(t, "read"), key), id, `read/${key}/${id}`); prune(t.read, 40);
  }
}

/** The good deed item `id` ticks today, when it is on the day's list ("" otherwise). */
function deedOf(S, id, key) {
  const d = ITEM[id]?.deed;
  return d && store.amalForDay(S, key).some(a => a.id === d) ? d : "";
}

/** Whether item `id` is done today: its good deed is ticked, or the tool says so. */
export function isReadDone(S, id, now = new Date()) {
  const key = dkey(now), deed = deedOf(S, id, key);
  return !!(deed && store.getDay(S, key).amal[deed]?.done) || nativeDone(S, id, now) > 0;
}

/**
 * Tick (on) or untick item `id` for today. Writes the good deed (store.setAmal: the same day log the Good deeds
 * sheet writes) and the tool's own state. Unticking clears both. Returns false for an unknown item. Caller commits.
 */
export function setReadDone(S, id, on, now = new Date()) {
  if (!ITEM[id]) return false;
  const key = dkey(now), deed = deedOf(S, id, key);
  if (deed) {
    const cur = store.getDay(S, key).amal[deed];
    if (on && !cur?.done) store.setAmal(S, key, deed, true, "", now);
    if (!on && cur) store.setAmal(S, key, deed, false, "", now);
  }
  setNative(S, id, on, now);
  markRead(S, id, now);
  return true;
}

/**
 * Copy a reading's done state (Hizb, al-Mulk, al-Kahf, the Manzil) from the reader's own state into the day
 * log (store.setRead), under the day it belongs to: al-Kahf under its Friday, the Manzil done if either half
 * is. Call after any change to that state (Read's ticks, the Hizb and Manzil readers).
 */
export function markRead(S, id, now = new Date()) {
  const set = S.settings;
  if (id === "kahf") return store.setRead(S, jumuahKey(now, set), "kahf", !!readDay(S, jumuahKey(now, set)).kahf);
  if (id === "manzil") { const m = tools(S).manzil?.[dkey(now)]; return store.setRead(S, dkey(now), "manzil", !!(m?.morning || m?.evening)); }
  if (id === "hizb" || id === "mulk" || YASIN.includes(id)) return store.setRead(S, dkey(now), id, nativeDone(S, id, now) > 0);
  return false;
}

/* ---------- For today ---------- */
const P = p => PRAYER_NAME[p] || p;
/** The morning readings' window (adhkār, Yā-Sīn): from Fajr until ʿAsr. The evening's: from ʿAsr until Fajr. */
const isMorning = (now, t) => now >= t.Fajr && now < t.Asr;
const isEvening = (now, t) => now >= t.Asr || now < t.Fajr;
const morningSub = (now, t) => (now < t.Fajr ? READ.fromP(P("Fajr")) : isMorning(now, t) ? READ.nowUntil(P("Asr")) : READ.earlierToday);
const eveningSub = (now, t) => (now >= t.Asr && now < t.Maghrib ? READ.nowUntil(P("Maghrib")) : isEvening(now, t) ? READ.tonight : READ.fromAt(P("Asr"), fmt12(t.Asr)));

/**
 * The For today list for `now`: [{ id, tool, title, sub, now, done, at }], undone first (the one due now on top),
 * done after. `now` (boolean) marks the one item due right now (the gold dot); `at` is when it was ticked (ms) or 0.
 * extra: { lastRead } (the Qurʾān's "Last read: …" text, from the view, which knows the sūrah names).
 */
export function readItems(S, now = new Date(), extra = {}) {
  const key = dkey(now), set = S.settings, t = timesFor(now, set), excused = store.isExcusedDay(S, key);
  const list = store.amalForDay(S, key), has = id => list.some(a => a.id === id);
  const vis = tool => toolVisible(S, tool);
  const out = [];
  const add = (id, sub, due = false) => {
    const deed = deedOf(S, id, key);
    const done = isReadDone(S, id, now), at = nativeDone(S, id, now);
    out.push({ id, tool: ITEM[id].tool, deed, title: READ.item[id], sub: done ? (at ? READ.doneAt(fmt12(new Date(at))) : READ.doneWord) : sub, due: due && !done, done, at });
  };
  if (vis("adhkar")) {
    add("morning", morningSub(now, t), isMorning(now, t));
    add("evening", eveningSub(now, t), isEvening(now, t));
  }
  if (vis("hizb")) add("hizb", READ.hizbSub(manzilFor(now), READ.day3[now.getDay()]));
  if (vis("quran")) {
    if (!excused) add("quran", extra.lastRead ? READ.lastRead(extra.lastRead) : S.lastQuran ? READ.lastRead(S.lastQuran) : READ.openMushaf);
    else if (has("listen")) add("listen", READ.listenSub);
  }
  // The Qurʾān's own passages are left off an excused day's list (still open in the Qurʾān chapter).
  // Yā-Sīn keeps the adhkār's windows: morning from Fajr until ʿAsr, evening from ʿAsr through the night.
  if (vis("quran") && !excused) { add("yasinAm", morningSub(now, t), isMorning(now, t)); add("yasinPm", eveningSub(now, t), isEvening(now, t)); }
  if (vis("manzil") && !excused) add("manzil", slotOf(now, set) === "morning" ? READ.manzilMorning : READ.manzilEvening);
  if (vis("quran") && !excused) add("mulk", READ.beforeSleep);
  if (vis("quran") && !excused && isJumuah(now, set)) add("kahf", now.getDay() === 4 ? READ.jumuahNight : READ.kahfSub(P("Maghrib")));
  if (vis("durud") && (has("salawat") || isJumuah(now, set))) add("durud", isJumuah(now, set) ? READ.durudFriday : READ.durudDaily);
  // one gold "now" dot per screen: only the first item due now keeps it
  let dot = false;
  for (const it of out) { it.now = it.due && !dot; if (it.now) dot = true; delete it.due; }
  const rank = it => (it.done ? 2 : it.now ? 0 : 1);
  return out.map((it, i) => [it, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map(x => x[0]);
}

/** "Today's reading · n of m done". */
export function readCount(S, now = new Date()) {
  const items = readItems(S, now);
  return { done: items.filter(i => i.done).length, of: items.length };
}

/** The Read item a good deed belongs to (for the Read button on a deed that is still in the sheet). */
export const itemForDeed = id => DEED_ITEM[id] || "";
