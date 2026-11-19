package com.zad.app.widget;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Boundary tick (from WidgetUpdater's alarm), clock / time-zone changes, the exact-alarm permission changing, a restart or an app update: redraw the widgets, the tile and the Now notification (and re-arm the alarm). */
public class WidgetTickReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        WidgetUpdater.updateAll(context);
    }
}
