package com.zad.app.widget;

import android.content.Context;
import android.content.SharedPreferences;

/** Where the snapshot lives: SharedPreferences "zad_widgets", key "snapshot" (a JSON string). */
public final class WidgetStore {
    public static final String PREFS = "zad_widgets";
    public static final String KEY = "snapshot";

    private WidgetStore() {}

    private static SharedPreferences prefs(Context c) {
        return c.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public static void write(Context c, String json) {
        prefs(c).edit().putString(KEY, json).apply();
    }

    public static String read(Context c) {
        return prefs(c).getString(KEY, null);
    }
}
