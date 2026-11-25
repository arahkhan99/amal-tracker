import { Capacitor } from "@capacitor/core";
import { isNative } from "./platform.js";
import { PRAYERS, dkey, addDays, fmt12 } from "./util.js";
import { getDay, statusOf, amalForDay, genderOf } from "./store.js";
import { timesFor, windowEnd, ishaBestBefore, madeUpDeadline } from "./times.js";
import { seerahFor } from "./reflections.js";
import { NOTIFY, prayerName } from "./strings.js";
import { isOn } from "./features.js";

const DAYS_AHEAD = 7;

/*
 * One-tap buttons on the prayer-time notification ("It's ʿAsr"): brothers (and "prefer not to say") get
 * In congregation and On time, sisters On time. A button logs through the pending-log rules (pending.js:
 * not before the prayer began, day.first stamped, the same id never twice). Android's notification plugin
 * opens the app for a button; the log is applied straight away and nothing else is shown.
 */
export const NOTIFY_ACTION = { congregation: "In congregation", ontime: "On time" };
export const ACTION_TYPES = {
  m: "zad-prayer-m", // In congregation, On time
  f: "zad-prayer-f", // On time
};
export function actionTypes() {
  // foreground: iOS must run the app to apply the log (the WebView holds the data)
  return [
    { id: ACTION_TYPES.m, actions: [{ id: "congregation", title: NOTIFY_ACTION.congregation, foreground: true }, { id: "ontime", title: NOTIFY_ACTION.ontime, foreground: true }] },
    { id: ACTION_TYPES.f, actions: [{ id: "ontime", title: NOTIFY_ACTION.ontime, foreground: true }] },
  ];
}
/** The action type for a prayer-time notification: sisters get On time only. */
export const actionTypeFor = S => (genderOf(S) === "f" ? ACTION_TYPES.f : ACTION_TYPES.m);

/**
 * Every notification the settings ask for over the next week, given what's already logged.
 * A prayer that already has a status (including "excused", which an excused day gives every prayer) gets no reminder.
 * Ids: 1000+ prayer time, 2000+ before-window-ends, 3000+ evening check-in, 4000+ Friday seerah, 5000+ make-up nudge.
 */
export function planNotifications(S, now = new Date()) {
  const st = S.settings, out = [], jumuah = st.jumuah !== false;
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const date = addDays(now, i);
    const t = timesFor(date, st);
    const day = getDay(S, dkey(date));
    PRAYERS.forEach((p, pi) => {
      const status = statusOf(day, p);
      const logged = !!status;
      const name = prayerName(p, { date, jumuah });
      if (st.prayerAlerts && t[p] > now && !logged) {
        // p / date: what the notification's buttons log (actionTypeFor)
        const log = { p, date: dkey(date) };
        if (p === "Isha") out.push({ id: 1000 + i * 10 + pi, at: t[p], title: NOTIFY.begunTitle(name), body: NOTIFY.bestBeforeBody(fmt12(ishaBestBefore(date, st))), log });
        else out.push({ id: 1000 + i * 10 + pi, at: t[p], title: NOTIFY.prayerTitle(name), body: NOTIFY.prayerBody(name), log });
      }
      if (st.preQada && !logged) {
        const end = windowEnd(date, p, st, t);
        const at = new Date(end.getTime() - st.leadMin * 60000);
        // prayer: which prayer it is about (reminderMap), without the log buttons
        if (at > now) out.push({ id: 2000 + i * 10 + pi, at, title: NOTIFY.preTitle(name, st.leadMin), body: NOTIFY.preBody(name), prayer: { p, date: dkey(date) } });
      }
      // Make-up nudge: a prayer logged as Missed can still be marked Made up until the next Fajr
      if (st.makeupNudge !== false && isOn(S, "makeups") && status === "missed" && p !== "Isha") {
        const deadline = madeUpDeadline(date, st), end = windowEnd(date, p, st, t);
        const nine = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 21, 0);
        const at = new Date(Math.max(nine.getTime(), end.getTime() + 15 * 60000));
        if (at > now && at < new Date(deadline.getTime() - 30 * 60000))
          out.push({ id: 5000 + i * 10 + pi, at, title: NOTIFY.nudgeTitle(name), body: NOTIFY.nudgeBody(name, fmt12(deadline)) });
      }
    });
    if (st.evening) {
      const at = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 21, 30);
      const key = dkey(date);
      const unlogged = PRAYERS.filter(p => !statusOf(day, p)).length + amalForDay(S, key).filter(a => !day.amal[a.id]?.done).length;
      if (at > now && unlogged) out.push({ id: 3000 + i, at, title: NOTIFY.eveningTitle, body: NOTIFY.eveningBody });
    }
    // Friday sīrah moment: Settings → Reminders → "Friday sīrah moment" (settings.seerahNotify, on unless switched off)
    if (st.seerahNotify !== false && date.getDay() === 5) {
      const at = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0);
      if (at > now) out.push({ id: 4000 + i, at, title: NOTIFY.seerahTitle, body: seerahFor(date) });
    }
  }
  return out;
}

/**
 * The reminders about each prayer, { "YYYY-MM-DD|Fajr": [ids] }: the prayer-time and before-it-ends ones.
 * The phone keeps it (ZadWidgets.setReminders) so a one-tap log from a widget, the tile or the "Now" notification
 * cancels that prayer's reminders straight away, without waiting for the app to open and reschedule.
 */
export function reminderMap(list) {
  const out = {};
  for (const n of list) {
    const k = n.log || n.prayer;
    if (k) (out[`${k.date}|${k.p}`] ||= []).push(n.id);
  }
  return out;
}

let widgetsPlugin = null;
async function shareReminders(list) {
  try {
    if (!widgetsPlugin) { const { registerPlugin } = await import("@capacitor/core"); widgetsPlugin = registerPlugin("ZadWidgets"); }
    await widgetsPlugin.setReminders({ json: JSON.stringify(reminderMap(list)) });
  } catch (e) { console.warn("notify", e); } // an older native build without setReminders: the app's reschedule still catches up
}

let timer = null, lastS = null, actionsReady = null;
/** Reschedule all local notifications (Android). Debounced; no-op on the web. */
export function reschedule(S) {
  if (!isNative() || !S.profile.onboarded) return; // don't ask for notification permission mid-onboarding
  lastS = S;
  listenForActions();
  clearTimeout(timer);
  timer = setTimeout(() => doSchedule(S).catch(e => console.warn("notify", e)), 800);
}

async function doSchedule(S) {
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  let perm = await LocalNotifications.checkPermissions();
  if (perm.display !== "granted") perm = await LocalNotifications.requestPermissions();
  if (perm.display !== "granted") return;
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) });
  let list = planNotifications(S);
  // iOS keeps at most 64 pending notifications; keep the soonest (the rest are scheduled on a later open)
  if (Capacitor.getPlatform() === "ios") list = list.sort((a, b) => a.at - b.at).slice(0, 60);
  await shareReminders(list);
  if (!list.length) return;
  const typeId = actionTypeFor(S);
  try { await registerActions(LocalNotifications); } catch (e) { console.warn("notify", e); }
  // Exact alarms are off by default on Android 14+. Asking for them on every schedule would open the
  // "Alarms & reminders" screen each time, so use exact timing only when it's already allowed; otherwise
  // the reminders are scheduled as inexact alarms and can arrive a few minutes late.
  const exact = await exactAlarmsAllowed(LocalNotifications);
  await LocalNotifications.schedule({
    notifications: list.map(n => ({
      id: n.id, title: n.title, body: n.body, schedule: { at: n.at, allowWhileIdle: true }, isExactNotification: exact, iconColor: "#0F3D2E",
      ...(n.log ? { actionTypeId: typeId, extra: { p: n.log.p, date: n.log.date } } : {}),
    })),
  });
}

let registered = false;
async function registerActions(LocalNotifications) {
  if (registered) return;
  await LocalNotifications.registerActionTypes({ types: actionTypes() });
  registered = true;
}

/**
 * Listen for the notification buttons once (on start: the plugin keeps an action that launched the app until a
 * listener is added). A plain tap ("tap") just opens the app as before.
 */
function listenForActions() {
  if (actionsReady) return;
  actionsReady = (async () => {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await registerActions(LocalNotifications).catch(e => console.warn("notify", e));
    await LocalNotifications.addListener("localNotificationActionPerformed", a => {
      onAction(a).catch(e => console.warn("notify", e));
    });
  })().catch(e => { actionsReady = null; console.warn("notify", e); });
}

/** The log a button asks for: { date, p, status } or null (a plain tap, or not one of ours). */
export function actionLog(a) {
  const status = a?.actionId, x = a?.notification?.extra;
  if (status !== "congregation" && status !== "ontime") return null;
  if (!x || !PRAYERS.includes(x.p) || !/^\d{4}-\d{2}-\d{2}$/.test(x.date || "")) return null;
  return { date: x.date, p: x.p, status };
}

/** How many days back a notification button may still log (yesterday's ʿIshāʾ tapped this morning is fine). */
export const ACTION_MAX_DAYS = 2;
/**
 * The pending-log entry for a button tap, or null (not a log, or a stale one). Its id is fixed for that notification,
 * day, prayer and button, so the same tap delivered again can never log twice: Capacitor re-sends the action of the
 * intent that launched the app every time the activity is created again (BridgeActivity.load → onNewIntent(getIntent()),
 * e.g. after Android ended the app in the background), and pending.js remembers the ids it merged. Without this, a
 * prayer cleared in the app after a notification tap came back as logged.
 */
export function actionEntry(a, now = new Date()) {
  const log = actionLog(a);
  if (!log) return null;
  if (log.date < dkey(addDays(now, -ACTION_MAX_DAYS))) return null;
  const nid = Number.isInteger(a?.notification?.id) ? a.notification.id : 0;
  return { id: `notif:${nid}:${log.date}:${log.p}:${log.status}`, date: log.date, prayer: log.p, status: log.status, at: now.getTime(), src: "notif" };
}

async function onAction(a) {
  if (!lastS?.profile?.onboarded) return;
  const entry = actionEntry(a);
  if (!entry) return;
  const { applyEntriesNow } = await import("./pending.js");
  await applyEntriesNow(lastS, [entry]); // the plugin has already dismissed the notification
}

async function exactAlarmsAllowed(LocalNotifications) {
  try { return (await LocalNotifications.checkExactNotificationSetting()).exact_alarm === "granted"; }
  catch (e) { return false; }
}

/** true/false on Android (whether exact alarms are allowed), null elsewhere. */
export async function exactAlarmStatus() {
  if (!isNative()) return null;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  return exactAlarmsAllowed(LocalNotifications);
}

/** Opens Android's "Alarms & reminders" screen so reminders can be on the minute. Returns whether it's now allowed. */
export async function askForExactAlarms() {
  if (!isNative()) return false;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  try { return (await LocalNotifications.changeExactNotificationSetting()).exact_alarm === "granted"; }
  catch (e) { return false; }
}
