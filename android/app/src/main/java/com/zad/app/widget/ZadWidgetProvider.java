package com.zad.app.widget;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;

/** Base for the three home-screen widgets. Any update redraws all of them (WidgetUpdater picks the layout per size). */
public abstract class ZadWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        // Redraws every Zad widget (all sizes) and re-arms the boundary tick
        WidgetUpdater.updateAll(context);
    }

    @Override
    public void onEnabled(Context context) {
        WidgetUpdater.updateAll(context);
    }

    @Override
    public void onDisabled(Context context) {
        // The last widget of this size was removed; stop ticking if no Zad widget is left
        WidgetUpdater.updateAll(context);
    }
}
