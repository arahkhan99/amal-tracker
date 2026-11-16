package com.zad.app.widget;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Boundary tick (from WidgetUpdater's alarm), clock / time-zone changes and the exact-alarm permission changing: redraw the widgets (and re-arm the alarm). */
public class WidgetTickReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        WidgetUpdater.updateAll(context);
    }
}
