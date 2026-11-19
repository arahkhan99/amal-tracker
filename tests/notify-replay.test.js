// Regression (19 Nov 2026): a prayer logged from a notification button, then cleared in the app, came back as logged.
// Capacitor re-sends the button's action whenever the activity is created again with the same launch intent
// (BridgeActivity.load → onNewIntent(getIntent()) → LocalNotificationsPlugin.handleOnNewIntent, retained until the
// listener is added), e.g. after Android ended the app in the background and it was reopened from Recents. Each
// delivery used to make a NEW random queue id stamped "now", so the replay was applied again over the clear.
// Now the entry id is fixed per notification/day/prayer/button (pending.js remembers merged ids), stale taps are
// ignored, and MainActivity strips the action from a re-delivered launch intent.
import { describe, it, expect } from "vitest";
import * as store from "../src/store.js";
import { timesFor } from "../src/times.js";
import { applyPendingLogs, makeEntry } from "../src/pending.js";
import { actionEntry, ACTION_MAX_DAYS } from "../src/notify.js";
import { logPrayer } from "../src/today.js";

const DAY = new Date(2026, 10, 5);
const KEY = "2026-11-05";
const fresh = () => {
  const S = store.defaultState(DAY);
  S.createdKey = "2026-11-01";
  S.profile.onboarded = true;
  S.settings.location = { lat: 41.88, lng: -87.63, label: "Chicago", source: "city" };
  return S;
};
const asr = S => timesFor(DAY, S.settings).Asr;
const tap = (id = 1022) => ({ actionId: "ontime", notification: { id, extra: { p: "Asr", date: KEY } } });

describe("notification buttons delivered twice", () => {
  it("the same tap gives the same entry id, whenever it is delivered", () => {
    const S = fresh(), t1 = new Date(+asr(S) + 5 * 60000), t2 = new Date(+asr(S) + 50 * 60000);
    const a = actionEntry(tap(), t1), b = actionEntry(tap(), t2);
    expect(a.id).toBe(b.id);
    expect(a).toMatchObject({ date: KEY, prayer: "Asr", status: "ontime", src: "notif", at: +t1 });
    expect(actionEntry({ ...tap(), actionId: "congregation" }, t1).id).not.toBe(a.id);
    expect(actionEntry({ actionId: "tap", notification: tap().notification }, t1)).toBe(null);
  });

  it("logged from the notification, cleared in the app, the action re-delivered → stays cleared", () => {
    const S = fresh(), t1 = new Date(+asr(S) + 5 * 60000);
    let r = applyPendingLogs(S, [actionEntry(tap(), t1)], { now: t1 });
    expect(store.prayerStatus(S, KEY, "Asr")).toBe("ontime");
    // cleared in the app a little later
    const t2 = new Date(+t1 + 60000);
    expect(logPrayer(S, KEY, "Asr", null, t2).ok).toBe(true);
    expect(store.prayerStatus(S, KEY, "Asr")).toBe(null);
    // the app is recreated (process death, reopened from Recents): the launch intent's action arrives again
    const t3 = new Date(+t1 + 20 * 60000);
    r = applyPendingLogs(S, [actionEntry(tap(), t3)], { seen: r.seen, now: t3 });
    expect(r.applied).toEqual([]);
    expect(r.changed).toBe(false);
    expect(store.prayerStatus(S, KEY, "Asr")).toBe(null);
  });

  it("(the old behaviour, for the record) a fresh random id per delivery re-logged the cleared prayer", () => {
    const S = fresh(), t1 = new Date(+asr(S) + 5 * 60000);
    const r = applyPendingLogs(S, [makeEntry(KEY, "Asr", "ontime", "notif", +t1)], { now: t1 });
    logPrayer(S, KEY, "Asr", null, new Date(+t1 + 60000));
    const t3 = new Date(+t1 + 20 * 60000);
    applyPendingLogs(S, [makeEntry(KEY, "Asr", "ontime", "notif", +t3)], { seen: r.seen, now: t3 });
    expect(store.prayerStatus(S, KEY, "Asr")).toBe("ontime");
  });

  it("ignores a tap for a day more than ACTION_MAX_DAYS back (a replay long after the ids were forgotten)", () => {
    const later = new Date(2026, 10, 5 + ACTION_MAX_DAYS + 1, 9, 0);
    expect(actionEntry(tap(), later)).toBe(null);
    expect(actionEntry(tap(), new Date(2026, 10, 6, 7, 0))).not.toBe(null); // yesterday's tap this morning
  });
});
