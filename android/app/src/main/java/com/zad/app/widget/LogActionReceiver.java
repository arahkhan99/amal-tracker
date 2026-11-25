package com.zad.app.widget;

import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import java.util.Arrays;
import java.util.List;
import org.json.JSONObject;

/**
 * One-tap logging from the home-screen widgets and the ongoing "Now" notification (the Quick Settings tile calls
 * log() directly). It appends to the pending-log queue (WidgetStore), remembers the tap for Undo, and redraws every
 * surface at once; the app merges the queue on its next open or resume (src/pending.js) with the same rules.
 * Nothing is logged before its prayer has begun (the same rule as the app); a stale button just redraws.
 */
public class LogActionReceiver extends BroadcastReceiver {
    static final String ACTION_LOG = "com.zad.app.widget.LOG";
    static final String EXTRA_DATE = "date", EXTRA_PRAYER = "prayer", EXTRA_STATUS = "status", EXTRA_SRC = "src";
    static final List<String> STATUSES = Arrays.asList("congregation", "ontime", "remember", "undo");
    static final List<String> SOURCES = Arrays.asList("widget", "notif", "tile", "ongoing");

    /** A broadcast for one button. The data URI keeps each (source, day, prayer, status) its own PendingIntent. */
    static PendingIntent pending(Context c, String date, String prayer, String status, String src) {
        Intent i = new Intent(c, LogActionReceiver.class)
            .setAction(ACTION_LOG)
            .setData(Uri.parse("zadlog://" + src + "/" + date + "/" + prayer + "/" + status))
            .putExtra(EXTRA_DATE, date)
            .putExtra(EXTRA_PRAYER, prayer)
            .putExtra(EXTRA_STATUS, status)
            .putExtra(EXTRA_SRC, src);
        return PendingIntent.getBroadcast(c, 0, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !ACTION_LOG.equals(intent.getAction())) return;
        log(context, intent.getStringExtra(EXTRA_DATE), intent.getStringExtra(EXTRA_PRAYER), intent.getStringExtra(EXTRA_STATUS), intent.getStringExtra(EXTRA_SRC));
    }

    /** Queue a log (or an undo) and redraw. Returns whether it was queued. */
    static boolean log(Context context, String date, String prayer, String status, String src) {
        Context c = context.getApplicationContext();
        boolean ok = queue(c, date, prayer, status, src);
        WidgetUpdater.updateAll(c);
        return ok;
    }

    private static boolean queue(Context c, String date, String prayer, String status, String src) {
        if (date == null || !date.matches("\\d{4}-\\d{2}-\\d{2}")) return false;
        if (prayer == null || !Arrays.asList(WidgetModel.PRAYERS).contains(prayer)) return false;
        if (!STATUSES.contains(status)) return false;
        if (!SOURCES.contains(src)) src = "widget";
        long now = System.currentTimeMillis();
        if ("undo".equals(status)) {
            WidgetStore.append(c, date, prayer, "undo", src, now);
            WidgetModel.Tap tap = WidgetModel.parseTap(WidgetStore.readTap(c));
            if (tap != null && date.equals(tap.date) && prayer.equals(tap.p)) WidgetStore.writeTap(c, null);
            return true;
        }
        // Buttons only show once a prayer has begun, but a widget can be stale: check again
        if (!WidgetModel.begun(WidgetStore.read(c), date, prayer, now)) return false;
        JSONObject e = WidgetStore.append(c, date, prayer, status, src, now);
        WidgetStore.writeTap(c, e);
        // Logged (or remembrance ticked on an excused day): its "has begun" / "ends soon" reminders are no longer wanted
        ReminderCanceller.cancel(c, date, prayer);
        return true;
    }
}
