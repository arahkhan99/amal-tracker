package com.zad.app.widget;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

/**
 * Redraws every placed Zad widget from the stored snapshot and schedules the next redraw.
 * The countdown shows whole minutes, so the next redraw is at the start of the next minute (or the next
 * prayer boundary if that is sooner). The alarm is RTC (not a wake-up alarm): while the phone sleeps it
 * waits, and it fires as soon as the screen comes on, so it costs nothing in the background.
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
        long at = (now / 60000 + 1) * 60000 + 500; // just after the next minute starts
        if (model != null && model.nextChange > now && model.nextChange < at) at = model.nextChange + 500;
        // Inexact window of 10 s: lets the system batch it, still on the right minute. Never needs SCHEDULE_EXACT_ALARM.
        am.setWindow(AlarmManager.RTC, at, 10_000, pi);
    }
}
