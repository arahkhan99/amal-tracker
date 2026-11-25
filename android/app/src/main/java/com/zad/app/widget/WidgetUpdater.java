package com.zad.app.widget;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;
import android.widget.RemoteViews;

/**
 * Redraws everything that shows the current prayer: every placed Zad widget, the optional ongoing "Now"
 * notification and the Quick Settings tile, from the stored snapshot plus the unmerged one-tap queue, and
 * schedules the next redraw.
 * The countdown is a count-down Chronometer that ticks by itself, so the only redraw needed is at the next
 * boundary (a prayer starts or its window ends, sunrise, the middle of the night, the end of Undo, midnight:
 * model.nextChange). That alarm is exact when the app may schedule exact alarms (SCHEDULE_EXACT_ALARM is declared
 * for the reminders; always true before Android 12), otherwise an inexact window that starts at the boundary.
 * The alarm is RTC (not a wake-up alarm): while the phone sleeps it waits, and it fires as soon as the
 * screen comes on, so it costs nothing in the background.
 */
public final class WidgetUpdater {
    static final String ACTION_TICK = "com.zad.app.widget.TICK";
    private static final String TAG = "ZadWidgets";

    private WidgetUpdater() {}

    private static final Class<?>[] PROVIDERS = { ZadSmallWidgetProvider.class, ZadMediumWidgetProvider.class, ZadLargeWidgetProvider.class };
    private static final WidgetRenderer.Size[] SIZES = { WidgetRenderer.Size.SMALL, WidgetRenderer.Size.MEDIUM, WidgetRenderer.Size.LARGE };

    public static void updateAll(Context context) {
        Context c = context.getApplicationContext();
        AppWidgetManager mgr = AppWidgetManager.getInstance(c);
        String json = WidgetStore.read(c);
        long now = System.currentTimeMillis();
        WidgetModel model;
        try {
            model = WidgetModel.build(c, now, false);
        } catch (Exception e) {
            // A snapshot this version can't read (e.g. one written by an older app): "Open Zad to update" until the app writes a new one
            Log.w(TAG, "widget snapshot unreadable", e);
            model = null;
        }
        boolean any = false;
        for (int k = 0; k < PROVIDERS.length; k++) {
            int[] ids = mgr.getAppWidgetIds(new ComponentName(c, PROVIDERS[k]));
            if (ids == null || ids.length == 0) continue;
            any = true;
            // Every placed widget always gets this version's layout: a failure falls back to the message in the same
            // style, never leaving the views an older version (or the picker) drew in place.
            // Each widget follows its own size, whichever kind was placed (WidgetRenderer.sizeFor): Android 12+
            // gets every layout at once and switches by itself while it is resized; before that, the size the
            // launcher reports (onAppWidgetOptionsChanged redraws after a resize) picks one.
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                RemoteViews views;
                try {
                    views = model == null ? WidgetRenderer.message(c, json) : WidgetRenderer.responsive(c, model, json);
                } catch (Exception e) {
                    Log.w(TAG, "widget render failed (" + SIZES[k] + ")", e);
                    views = fixed(c, SIZES[k], model, json);
                }
                push(mgr, ids, views, c, json);
            } else {
                for (int id : ids) push(mgr, new int[] { id }, fixed(c, sizeOf(mgr, id, SIZES[k]), model, json), c, json);
            }
        }
        boolean ongoing = WidgetModel.flag(json, "ongoingNow");
        try { NowNotification.update(c, now); } catch (Exception e) { /* never let the notification break the widgets */ }
        try { ZadTileService.requestUpdate(c); } catch (Exception e) { Log.w(TAG, "tile update failed", e); }
        schedule(c, any || ongoing, model, now);
    }

    /** One layout; a failure falls back to the message, never leaving what an older version drew in place. */
    private static RemoteViews fixed(Context c, WidgetRenderer.Size size, WidgetModel model, String json) {
        try {
            return WidgetRenderer.render(c, size, model, json);
        } catch (Exception e) {
            Log.w(TAG, "widget render failed (" + size + ")", e);
            return WidgetRenderer.message(c, json);
        }
    }

    private static void push(AppWidgetManager mgr, int[] ids, RemoteViews views, Context c, String json) {
        try {
            mgr.updateAppWidget(ids, views);
        } catch (Exception e) {
            Log.w(TAG, "widget update failed", e);
            try { mgr.updateAppWidget(ids, WidgetRenderer.message(c, json)); } catch (Exception ignored) { /* nothing more to try */ }
        }
    }

    /**
     * Before Android 12: the layout for the size the launcher reports. In portrait a widget is its minimum width
     * by its maximum height. No size reported yet: the kind that was placed.
     */
    private static WidgetRenderer.Size sizeOf(AppWidgetManager mgr, int id, WidgetRenderer.Size placed) {
        try {
            android.os.Bundle o = mgr.getAppWidgetOptions(id);
            int w = o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0), h = o.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0);
            if (w > 0 && h > 0) return WidgetRenderer.sizeFor(w, h);
        } catch (Exception ignored) { /* fall back below */ }
        return placed;
    }

    private static PendingIntent tickIntent(Context c) {
        Intent i = new Intent(c, WidgetTickReceiver.class).setAction(ACTION_TICK);
        return PendingIntent.getBroadcast(c, 0, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void schedule(Context c, boolean any, WidgetModel model, long now) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        PendingIntent pi = tickIntent(c);
        if (!any) { am.cancel(pi); return; }
        // Just after the next boundary. Without a model (no snapshot for today) check again in an hour.
        long at = model != null && model.nextChange > now ? model.nextChange + 500 : now + 3_600_000L;
        if (canExact(am)) {
            try { am.setExactAndAllowWhileIdle(AlarmManager.RTC, at, pi); return; }
            catch (SecurityException e) { /* permission revoked meanwhile: fall back below */ }
        }
        // Smallest window the system allows (it stretches shorter ones to its minimum on Android 12+)
        am.setWindow(AlarmManager.RTC, at, 60_000, pi);
    }

    private static boolean canExact(AlarmManager am) {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.S || am.canScheduleExactAlarms();
    }
}
