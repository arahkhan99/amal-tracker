package com.zad.app.widget;

import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * A prayer logged by one tap (a widget, the Quick Settings tile or the ongoing "Now" notification) cancels its
 * reminders straight away: the "ʿAsr has begun" and "ʿAsr ends in 20 minutes" ones, whether still scheduled or
 * already showing. Without this they would still arrive until the app next opened and rescheduled.
 *
 * The app writes which reminder ids belong to which prayer after every reschedule (src/notify.js reminderMap,
 * ZadWidgets.setReminders): SharedPreferences "zad_widgets" key "reminders",
 * { "YYYY-MM-DD|Fajr": [1004, 2004], ... }.
 *
 * The reminders are @capacitor/local-notifications alarms. Cancelling one here does what that plugin's cancel()
 * does: the same PendingIntent (TimedNotificationPublisher, request code = the id; an Intent matches by its
 * component, not its extras), and the plugin's stored copy (SharedPreferences "NOTIFICATION_STORE"), so a restart
 * of the phone doesn't bring it back. Checked against @capacitor/local-notifications 8.3.1
 * (LocalNotificationManager.cancelTimerForNotification, NotificationStorage); recheck after upgrading it.
 * Undo doesn't restore them: the app's next reschedule does.
 */
public final class ReminderCanceller {
    static final String KEY = "reminders";
    private static final String PUBLISHER = "com.capacitorjs.plugins.localnotifications.TimedNotificationPublisher";
    private static final String PLUGIN_STORE = "NOTIFICATION_STORE";

    private ReminderCanceller() {}

    static void cancel(Context c, String date, String prayer) {
        try {
            String raw = c.getSharedPreferences(WidgetStore.PREFS, Context.MODE_PRIVATE).getString(KEY, null);
            if (raw == null) return;
            JSONArray ids = new JSONObject(raw).optJSONArray(date + "|" + prayer);
            if (ids == null) return;
            AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
            NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
            int flags = PendingIntent.FLAG_NO_CREATE;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) flags |= PendingIntent.FLAG_MUTABLE;
            android.content.SharedPreferences.Editor store = c.getSharedPreferences(PLUGIN_STORE, Context.MODE_PRIVATE).edit();
            for (int i = 0; i < ids.length(); i++) {
                int id = ids.optInt(i, Integer.MIN_VALUE);
                if (id == Integer.MIN_VALUE) continue;
                Intent intent = new Intent().setClassName(c, PUBLISHER);
                PendingIntent pi = PendingIntent.getBroadcast(c, id, intent, flags);
                if (pi != null) {
                    if (am != null) am.cancel(pi);
                    pi.cancel();
                }
                if (nm != null) nm.cancel(id); // already showing: take it away
                store.remove(Integer.toString(id));
            }
            store.apply();
        } catch (Exception e) {
            // Never let a reminder problem stop the log itself; the app's reschedule catches up on open
        }
    }

    public static void write(Context c, String json) {
        c.getSharedPreferences(WidgetStore.PREFS, Context.MODE_PRIVATE).edit().putString(KEY, json).apply();
    }
}
