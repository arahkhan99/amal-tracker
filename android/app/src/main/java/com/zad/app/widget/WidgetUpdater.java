package com.zad.app.widget;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.widget.RemoteViews;

/**
 * Redraws every placed Zad widget from the stored snapshot and schedules the next redraw.
 * The countdown is a count-down Chronometer that ticks by itself, so the only redraw needed is at the next
 * boundary (a prayer starts or its window ends, sunrise, the middle of the night, midnight: model.nextChange).
 * That alarm is exact when the app may schedule exact alarms (SCHEDULE_EXACT_ALARM is declared for the
 * reminders; always true before Android 12), otherwise an inexact window that starts at the boundary.
 * The alarm is RTC (not a wake-up alarm): while the phone sleeps it waits, and it fires as soon as the
 * screen comes on, so it costs nothing in the background.
 */
public final class WidgetUpdater {
    static final String ACTION_TICK = "com.zad.app.widget.TICK";

    private WidgetUpdater() {}

    private static final Class<?>[] PROVIDERS = { ZadSmallWidgetProvider.class, ZadMediumWidgetProvider.class, ZadLargeWidgetProvider.class };
    private static final WidgetRenderer.Size[] SIZES = { WidgetRenderer.Size.SMALL, WidgetRenderer.Size.MEDIUM, WidgetRenderer.Size.LARGE };

    public static void updateAll(Context context) {
        Context c = context.getApplicationContext();
        AppWidgetManager mgr = AppWidgetManager.getInstance(c);
        String json = WidgetStore.read(c);
        long now = System.currentTimeMillis();
        WidgetModel model = WidgetModel.build(json, now);
        boolean any = false;
        for (int k = 0; k < PROVIDERS.length; k++) {
            int[] ids = mgr.getAppWidgetIds(new ComponentName(c, PROVIDERS[k]));
            if (ids == null || ids.length == 0) continue;
            any = true;
            RemoteViews views = WidgetRenderer.render(c, SIZES[k], model, json);
            mgr.updateAppWidget(ids, views);
        }
        schedule(c, any, model, now);
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
