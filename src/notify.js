import { Capacitor } from "@capacitor/core";
import { isNative } from "./platform.js";
import { PRAYERS, dkey, addDays } from "./util.js";
import { getDay } from "./store.js";
import { timesFor, windowEnd } from "./times.js";
import { seerahFor } from "./reflections.js";

const DAYS_AHEAD = 7;

/** Every notification the settings ask for over the next week, given what's already logged. */
export function planNotifications(S, now = new Date()) {
  const st = S.settings, out = [];
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const date = addDays(now, i);
    const t = timesFor(date, st);
    const day = getDay(S, dkey(date));
    PRAYERS.forEach((p, pi) => {
      const logged = !!day.prayers[p];
      if (st.prayerAlerts && t[p] > now && !logged)
        out.push({ id: 1000 + i * 10 + pi, at: t[p], title: `${p} time`, body: `It's time for ${p}. Tap to log it once you've prayed.` });
      if (st.preQada && !logged) {
        const end = windowEnd(date, p, st, t);
        const at = new Date(end.getTime() - st.leadMin * 60000);
        if (at > now) out.push({ id: 2000 + i * 10 + pi, at, title: `${p} window ends in ${st.leadMin} min`, body: `${p} isn't logged yet. Pray before it becomes qada.` });
      }
    });
    if (st.evening) {
      const at = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 21, 30);
      const unlogged = PRAYERS.filter(p => !day.prayers[p]).length + S.amalList.filter(a => !day.amal[a.id]?.done).length;
      if (at > now && unlogged) out.push({ id: 3000 + i, at, title: "Evening check-in", body: "A few things are still unlogged today. Take a minute to fill them in." });
    }
    if (st.seerah && date.getDay() === 5) {
      const at = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0);
      if (at > now) out.push({ id: 4000 + i, at, title: "Weekly seerah moment", body: seerahFor(date) });
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
