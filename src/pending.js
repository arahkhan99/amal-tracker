/*
 * The pending-log queue: one-tap logs made outside the app (home-screen widgets, notification buttons, the
 * Quick Settings tile, the ongoing "Now" notification, and on iPhone the widgets and the Control button).
 * The native side can't write the app's data (it lives in the WebView), so it appends small entries to a
 * queue in shared native storage, and the app merges them on open and on resume with the same rules as a
 * manual log.
 *
 * Queue entry (shared with iOS, keep exactly):
 *   { id: "<random>", date: "YYYY-MM-DD" (local date of the prayer), prayer: "Fajr|Dhuhr|Asr|Maghrib|Isha",
 *     status: "congregation" | "ontime" | "remember" | "undo", at: <epoch ms>, src: "widget" | "notif" | "tile" | "ongoing" }
 * Android keeps it in WidgetStore's SharedPreferences ("pendingLogs"), iOS in the App Group UserDefaults.
 * Plugin ZadWidgets: getPending() → { logs }, clearPending({ ids }).
 *
 * Rules (the same as logging in the app, home.js applyStatus / A.rememberAt):
 * - Nothing is logged before its prayer began (logging.js logAllowed, checked at the time of the tap).
 * - "remember" ticks remembrance at prayer time (store.setRemember), only on an excused prayer.
 * - "undo" puts back what was there before the latest log of that prayer, unless it was changed in the app since.
 * - A log made in the app after the tap wins over the tap.
 * - day.first is stamped as by a manual log (at the time of the tap). Entries are applied in time order, once each
 *   (ids already merged are remembered for a few days, so a queue that failed to clear can't apply twice).
 * No DOM here (tests import it); mergePendingLogs loads the app and the plugin lazily.
 */
import * as store from "./store.js";
import { logAllowed } from "./logging.js";
import { PRAYERS } from "./util.js";

export const QUEUE_STATUSES = ["congregation", "ontime", "remember", "undo"];
export const QUEUE_SOURCES = ["widget", "notif", "tile", "ongoing"];
/** How long merged ids (and what each log replaced, for Undo) are remembered. */
export const SEEN_MS = 4 * 86400e3;
export const SEEN_MAX = 400;
const SEEN_KEY = "zad-pending-seen";

/** A well-formed queue entry. */
export function validEntry(e) {
  return !!e && typeof e === "object" && typeof e.id === "string" && e.id.length > 0 && e.id.length <= 100
    && /^\d{4}-\d{2}-\d{2}$/.test(e.date || "") && PRAYERS.includes(e.prayer)
    && QUEUE_STATUSES.includes(e.status) && Number.isFinite(e.at) && e.at > 0;
}

/** A new queue entry (used by the notification buttons, which run in the app). */
export function makeEntry(date, prayer, status, src, at = Date.now()) {
  const rnd = globalThis.crypto?.randomUUID?.() || `${at.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return { id: rnd, date, prayer, status, at, src };
}

const rank = e => [e.at, e.id];
const byTime = (a, b) => { const x = rank(a), y = rank(b); return x[0] - y[0] || (x[1] < y[1] ? -1 : x[1] > y[1] ? 1 : 0); };

/** Put day.first back when this log was the one that stamped it (as the app's own Undo does). */
function restoreFirst(day, rec) {
  if (!day || rec.prevFirst > 0 || day.first !== rec.at) return;
  delete day.first;
}

/**
 * Apply queue entries to S. Pure apart from S: pass `seen` (the records kept from earlier merges) and get the
 * updated list back to keep.
 * Returns { processed: ids to clear from the queue (applied, refused, duplicates), applied: ids that were applied
 *   (including no-ops: already logged the same), refused: [{ id, reason }], changed: whether S changed, seen }.
 * Refusal reasons: "invalid", "notStarted", "notExcused", "newer" (the app has a later log), "nothing" (an undo
 * with nothing to undo).
 */
export function applyPendingLogs(S, logs, { seen = [], now = new Date() } = {}) {
  const keep = (Array.isArray(seen) ? seen : []).filter(r => r && typeof r.id === "string" && now - (r.seenAt || r.at || 0) < SEEN_MS);
  const known = new Set(keep.map(r => r.id));
  const processed = [], applied = [], refused = [];
  let changed = false;
  const list = (Array.isArray(logs) ? logs : []).filter(e => e && typeof e === "object");
  const valid = [];
  for (const e of list) {
    if (!validEntry(e)) { if (typeof e.id === "string") { processed.push(e.id); refused.push({ id: e.id, reason: "invalid" }); } continue; }
    valid.push(e);
  }
  valid.sort(byTime);
  const stamp = +now;
  const record = r => { keep.push({ ...r, seenAt: stamp }); known.add(r.id); };
  const refuse = (e, reason) => { processed.push(e.id); refused.push({ id: e.id, reason }); record({ id: e.id, date: e.date, prayer: e.prayer, kind: "refused", at: e.at }); };

  for (const e of valid) {
    if (known.has(e.id)) { if (!processed.includes(e.id)) processed.push(e.id); continue; } // duplicate
    const { date: key, prayer: p } = e, at = new Date(e.at);

    if (e.status === "undo") {
      // The latest log of this prayer (from this queue) that isn't undone yet
      let target = null;
      for (const r of keep) {
        if ((r.kind === "status" || r.kind === "remember") && !r.undone && r.date === key && r.prayer === p && r.at <= e.at && (!target || r.at >= target.at)) target = r;
      }
      if (!target) { refuse(e, "nothing"); continue; }
      target.undone = true;
      const day = S.days[key];
      if (!target.noop) {
        if (target.kind === "status") {
          // Only if it still holds what the tap logged (an in-app change since wins)
          if ((day?.prayers?.[p] || null) === target.value) {
            store.setPrayer(S, key, p, target.prev || null, at, { auto: true });
            const d = S.days[key];
            if (target.prev && target.prevAt > 0) (d.at ||= {})[p] = target.prevAt;
            restoreFirst(d, target);
            changed = true;
          }
        } else if (store.remembered(day, p)) {
          store.setRemember(S, key, p, false, at);
          restoreFirst(S.days[key], target);
          changed = true;
        }
      }
      processed.push(e.id); applied.push(e.id);
      record({ id: e.id, date: key, prayer: p, kind: "undo", at: e.at });
      continue;
    }

    if (e.status === "remember") {
      if (!logAllowed(S, key, p, true, at)) { refuse(e, "notStarted"); continue; }
      const day = S.days[key];
      if (store.statusOf(day, p) !== "excused") { refuse(e, "notExcused"); continue; }
      const rec = { id: e.id, date: key, prayer: p, kind: "remember", at: e.at, prevFirst: day?.first };
      if (store.remembered(day, p)) rec.noop = true;
      else if (store.setRemember(S, key, p, true, at)) changed = true;
      else { refuse(e, "notExcused"); continue; }
      processed.push(e.id); applied.push(e.id); record(rec);
      continue;
    }

    // congregation / on time
    if (!logAllowed(S, key, p, e.status, at)) { refuse(e, "notStarted"); continue; }
    const day = S.days[key];
    const cur = day?.prayers?.[p] || null, curAt = day?.at?.[p] || 0;
    const rec = { id: e.id, date: key, prayer: p, kind: "status", at: e.at, value: e.status, prev: cur, prevAt: curAt || undefined, prevFirst: day?.first };
    if (cur === e.status) rec.noop = true; // already logged the same: nothing to change, nothing to undo
    else if (cur && curAt > e.at) { refuse(e, "newer"); continue; } // changed in the app after the tap
    else {
      if (key < S.createdKey) S.createdKey = key; // as applyStatus: backfilling an earlier day extends the range
      store.setPrayer(S, key, p, e.status, at);
      changed = true;
    }
    processed.push(e.id); applied.push(e.id); record(rec);
  }

  // Newest last; cap the list
  const nextSeen = keep.sort((a, b) => (a.seenAt || 0) - (b.seenAt || 0) || a.at - b.at).slice(-SEEN_MAX);
  return { processed, applied, refused, changed, seen: nextSeen };
}

export function loadSeen(storage = globalThis.localStorage) {
  try { const v = JSON.parse(storage?.getItem(SEEN_KEY) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; }
}
export function saveSeen(seen, storage = globalThis.localStorage) {
  try { storage?.setItem(SEEN_KEY, JSON.stringify(seen)); } catch (e) { /* storage full or blocked */ }
}

/**
 * Apply entries made in the app itself (notification buttons) right away, with the same rules, and save.
 * Returns the applyPendingLogs result.
 */
export async function applyEntriesNow(S, entries, deps = {}) {
  const { storage = globalThis.localStorage, now = new Date() } = deps;
  const res = applyPendingLogs(S, entries, { seen: loadSeen(storage), now });
  saveSeen(res.seen, storage);
  if (res.changed) (deps.commit || (await import("./app.js")).commit)();
  await refreshAfter(deps);
  return res;
}

async function refreshAfter(deps) {
  try { await (deps.refresh || (await import("./widget-bridge.js")).refreshWidgets)(); } catch (e) { console.warn("pending", e); }
}

let running = null;
/**
 * Merge the native queue into S (call on app start and on resume). No-op on the web or before set-up.
 * Reads the queue, applies it (applyPendingLogs), saves through commit(), pushes the new widget snapshot, then
 * clears what was handled. deps (tests): { plugin, commit, refresh, storage, now }.
 */
export function mergePendingLogs(S, deps = {}) {
  if (running) return running;
  running = doMerge(S, deps).catch(e => { console.warn("pending", e); return null; }).finally(() => { running = null; });
  return running;
}

async function doMerge(S, deps) {
  if (!S?.profile?.onboarded) return null; // kept until set-up is done
  let plugin = deps.plugin;
  if (!plugin) {
    const { Capacitor, registerPlugin } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return null;
    plugin = registerPlugin("ZadWidgets");
  }
  const { logs = [] } = (await plugin.getPending()) || {};
  if (!logs.length) return { processed: [], applied: [], refused: [], changed: false };
  const storage = deps.storage ?? globalThis.localStorage;
  const res = applyPendingLogs(S, logs, { seen: loadSeen(storage), now: deps.now || new Date() });
  saveSeen(res.seen, storage);
  if (res.changed) (deps.commit || (await import("./app.js")).commit)();
  // The new snapshot first, so the widgets never briefly lose a log between the queue clearing and the redraw
  await refreshAfter(deps);
  // (entries without an id are dropped by the native side on any clear)
  await plugin.clearPending({ ids: res.processed });
  return res;
}
