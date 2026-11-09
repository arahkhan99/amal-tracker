import { Capacitor } from "@capacitor/core";
import { isNative } from "./platform.js";
import { PRAYERS, dkey, addDays, fmt12 } from "./util.js";
import { getDay, statusOf, amalForDay } from "./store.js";
import { timesFor, windowEnd, ishaBestBefore, madeUpDeadline } from "./times.js";
import { seerahFor } from "./reflections.js";
import { NOTIFY, prayerName } from "./strings.js";
import { isOn } from "./features.js";

const DAYS_AHEAD = 7;

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
        if (p === "Isha") out.push({ id: 1000 + i * 10 + pi, at: t[p], title: NOTIFY.begunTitle(name), body: NOTIFY.bestBeforeBody(fmt12(ishaBestBefore(date, st))) });
        else out.push({ id: 1000 + i * 10 + pi, at: t[p], title: NOTIFY.prayerTitle(name), body: NOTIFY.prayerBody(name) });
      }
      if (st.preQada && !logged) {
        const end = windowEnd(date, p, st, t);
        const at = new Date(end.getTime() - st.leadMin * 60000);
        if (at > now) out.push({ id: 2000 + i * 10 + pi, at, title: NOTIFY.preTitle(name, st.leadMin), body: NOTIFY.preBody(name) });
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
    if (st.seerah && date.getDay() === 5) {
      const at = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0);
      if (at > now) out.push({ id: 4000 + i, at, title: NOTIFY.seerahTitle, body: seerahFor(date) });
    }
  }
  return out;
}

let timer = null;
/** Reschedule all local notifications (Android). Debounced; no-op on the web. */
export function reschedule(S) {
  if (!isNative() || !S.profile.onboarded) return; // don't ask for notification permission mid-onboarding
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
  if (!list.length) return;
  // Exact alarms are off by default on Android 14+. Asking for them on every schedule would open the
  // "Alarms & reminders" screen each time, so use exact timing only when it's already allowed; otherwise
  // the reminders are scheduled as inexact alarms and can arrive a few minutes late.
  const exact = await exactAlarmsAllowed(LocalNotifications);
  await LocalNotifications.schedule({
    notifications: list.map(n => ({ id: n.id, title: n.title, body: n.body, schedule: { at: n.at, allowWhileIdle: true }, isExactNotification: exact, iconColor: "#0F3D2E" })),
  });
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
