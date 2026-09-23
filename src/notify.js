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
  const list = planNotifications(S);
  if (!list.length) return;
  await LocalNotifications.schedule({
    notifications: list.map(n => ({ id: n.id, title: n.title, body: n.body, schedule: { at: n.at, allowWhileIdle: true }, iconColor: "#0F3D2E" })),
  });
}
