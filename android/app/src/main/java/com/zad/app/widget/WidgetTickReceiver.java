package com.zad.app.widget;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Minute tick (from WidgetUpdater's alarm) and clock / time-zone changes: redraw the widgets. */
public class WidgetTickReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        WidgetUpdater.updateAll(context);
    }
}
