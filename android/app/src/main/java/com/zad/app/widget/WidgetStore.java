package com.zad.app.widget;

import android.content.Context;
import android.content.SharedPreferences;
import java.util.Set;
import java.util.UUID;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Shared storage for the widgets, the Quick Settings tile and the ongoing "Now" notification
 * (SharedPreferences "zad_widgets"):
 * - "snapshot": the JSON the app writes (src/widgets.js buildSnapshot).
 * - "pendingLogs": the one-tap queue, a JSON array of
 *   { id, date: "YYYY-MM-DD", prayer: "Fajr|Dhuhr|Asr|Maghrib|Isha", status: "congregation"|"ontime"|"remember"|"undo",
 *     at: epoch ms, src: "widget"|"notif"|"tile"|"ongoing" }.
 *   The app merges it on open and resume (src/pending.js) and clears what it handled (ZadWidgets.clearPending).
 *   The same format is used on iPhone.
 * - "lastTap": the last one-tap log ({ id, date, prayer, status, at }), for "ʿAsr logged ✓ · Undo".
 */
public final class WidgetStore {
    public static final String PREFS = "zad_widgets";
    public static final String KEY = "snapshot";
    public static final String KEY_PENDING = "pendingLogs";
    public static final String KEY_TAP = "lastTap";
    /** A runaway queue (the app never opened for months) keeps its newest entries. */
    static final int MAX_PENDING = 500;
    private static final Object LOCK = new Object();

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

    /* ---------- the one-tap queue ---------- */

    public static JSONArray pending(Context c) {
        try {
            return new JSONArray(prefs(c).getString(KEY_PENDING, "[]"));
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    /** Append an entry; returns it. */
    public static JSONObject append(Context c, String date, String prayer, String status, String src, long at) {
        JSONObject e = new JSONObject();
        try {
            e.put("id", UUID.randomUUID().toString());
            e.put("date", date);
            e.put("prayer", prayer);
            e.put("status", status);
            e.put("at", at);
            e.put("src", src);
        } catch (Exception ignored) { /* put on a fresh object can't fail */ }
        synchronized (LOCK) {
            JSONArray all = pending(c);
            all.put(e);
            JSONArray keep = all;
            if (all.length() > MAX_PENDING) {
                keep = new JSONArray();
                for (int i = all.length() - MAX_PENDING; i < all.length(); i++) keep.put(all.opt(i));
            }
            prefs(c).edit().putString(KEY_PENDING, keep.toString()).commit();
        }
        return e;
    }

    /** Remove the entries with these ids, and anything malformed (no id). */
    public static void clearPending(Context c, Set<String> ids) {
        synchronized (LOCK) {
            JSONArray all = pending(c), keep = new JSONArray();
            for (int i = 0; i < all.length(); i++) {
                JSONObject e = all.optJSONObject(i);
                if (e == null) continue;
                String id = e.optString("id", "");
                if (id.isEmpty() || ids.contains(id)) continue;
                keep.put(e);
            }
            prefs(c).edit().putString(KEY_PENDING, keep.toString()).commit();
        }
    }

    /* ---------- the last tap (for Undo) ---------- */

    public static String readTap(Context c) {
        return prefs(c).getString(KEY_TAP, null);
    }

    public static void writeTap(Context c, JSONObject tap) {
        prefs(c).edit().putString(KEY_TAP, tap == null ? null : tap.toString()).commit();
    }
}
