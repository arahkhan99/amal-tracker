package com.zad.app.widget;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Paint;
import android.net.Uri;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;
import com.zad.app.MainActivity;
import com.zad.app.R;

/** Builds the RemoteViews for each widget size from a WidgetModel (designs: Small A, Medium A, Large A). */
final class WidgetRenderer {
    enum Size { SMALL, MEDIUM, LARGE }

    private static final int[] P_ROOT = { R.id.zw_p0, R.id.zw_p1, R.id.zw_p2, R.id.zw_p3, R.id.zw_p4 };
    private static final int[] P_ICON = { R.id.zw_p0_icon, R.id.zw_p1_icon, R.id.zw_p2_icon, R.id.zw_p3_icon, R.id.zw_p4_icon };
    private static final int[] P_NAME = { R.id.zw_p0_name, R.id.zw_p1_name, R.id.zw_p2_name, R.id.zw_p3_name, R.id.zw_p4_name };
    private static final int[] P_TIME = { R.id.zw_p0_time, R.id.zw_p1_time, R.id.zw_p2_time, R.id.zw_p3_time, R.id.zw_p4_time };
    private static final int[] P_DOT = { R.id.zw_p0_dot, R.id.zw_p1_dot, R.id.zw_p2_dot, R.id.zw_p3_dot, R.id.zw_p4_dot };
    private static final int[] D_ROOT = { R.id.zw_d0, R.id.zw_d1, R.id.zw_d2, R.id.zw_d3, R.id.zw_d4, R.id.zw_d5 };
    private static final int[] D_ICON = { R.id.zw_d0_icon, R.id.zw_d1_icon, R.id.zw_d2_icon, R.id.zw_d3_icon, R.id.zw_d4_icon, R.id.zw_d5_icon };
    private static final int[] D_NAME = { R.id.zw_d0_name, R.id.zw_d1_name, R.id.zw_d2_name, R.id.zw_d3_name, R.id.zw_d4_name, R.id.zw_d5_name };
    private static final int[] D_ROW = { R.id.zw_drow0, R.id.zw_drow1, R.id.zw_drow2 };

    private WidgetRenderer() {}

    static RemoteViews render(Context c, Size size, WidgetModel m, String staleJson) {
        if (m == null) return message(c, staleJson);
        switch (size) {
            case SMALL: return small(c, m);
            case MEDIUM: return medium(c, m);
            default: return large(c, m);
        }
    }

    /* ---------- deep links (handled by src/widget-bridge.js through @capacitor/app appUrlOpen) ---------- */

    static PendingIntent link(Context c, String url) {
        Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url), c, MainActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(c, url.hashCode(), i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static String logUrl(String p, String date) {
        return "zad://log?p=" + Uri.encode(p) + "&d=" + Uri.encode(date);
    }

    /** The hero / Prayed button: the open prayer's log sheet, or the Today sheet when nothing is open. */
    private static String heroUrl(WidgetModel m) {
        return m.logP != null ? logUrl(m.logP, m.logDate) : "zad://today";
    }

    /* ---------- shared pieces ---------- */

    private static void hero(RemoteViews v, Context c, WidgetModel m, boolean hasButton) {
        boolean now = "now".equals(m.mode);
        v.setTextViewText(R.id.zw_tag, m.label(now ? "now" : "next"));
        v.setTextViewText(R.id.zw_name, m.focusName);
        v.setTextViewText(R.id.zw_time, m.focusTimeLabel);
        // A count-down Chronometer ticks by itself (API 24+, minSdk 24), so the widget only needs a redraw at
        // prayer boundaries (WidgetUpdater). Its base is on the elapsed-realtime clock.
        v.setChronometer(R.id.zw_countdown, SystemClock.elapsedRealtime() + Math.max(0, m.countdownTo - m.builtAt), null, true);
        v.setChronometerCountDown(R.id.zw_countdown, true);
        if (hasButton) {
            v.setTextViewText(R.id.zw_button, "✓  " + m.label(now ? "prayed" : "logToday"));
            v.setOnClickPendingIntent(R.id.zw_button, link(c, heroUrl(m)));
        }
        v.setContentDescription(R.id.zw_root, m.label(now ? "now" : "next") + " " + m.focusName + ", " + m.focusTimeLabel); // the countdown ticks on its own, so a number here would go stale
    }

    private static int statusIcon(String state, boolean onForest) {
        switch (state) {
            case "congregation": return R.drawable.zw_st_congregation;
            case "ontime": return R.drawable.zw_st_ontime;
            case "madeup": return R.drawable.zw_st_madeup;
            case "missed": return R.drawable.zw_st_missed;
            case "excused": return R.drawable.zw_st_excused;
            case "next": return R.drawable.zw_st_next;
            case "due": return R.drawable.zw_st_due;
            default: return onForest ? R.drawable.zw_ring_upcoming_forest : R.drawable.zw_ring_upcoming_card;
        }
    }

    private static int dot(Boolean sunnah, boolean onForest) {
        return Boolean.TRUE.equals(sunnah) ? R.drawable.zw_dot_on : onForest ? R.drawable.zw_dot_off_forest : R.drawable.zw_dot_off_card;
    }

    private static void prayers(RemoteViews v, Context c, WidgetModel m, boolean onForest, boolean withTimes) {
        for (int i = 0; i < 5 && i < m.prayers.size(); i++) {
            WidgetModel.Prayer x = m.prayers.get(i);
            v.setImageViewResource(P_ICON[i], statusIcon(x.state, onForest));
            v.setTextViewText(P_NAME[i], x.name);
            if (withTimes) v.setTextViewText(P_TIME[i], x.timeLabel);
            v.setViewVisibility(P_DOT[i], x.sunnah == null ? View.INVISIBLE : View.VISIBLE);
            if (x.sunnah != null) v.setImageViewResource(P_DOT[i], dot(x.sunnah, onForest));
            int bg = x.focus ? (onForest ? R.drawable.zw_bg_tile_focus : R.drawable.zw_bg_focus_card) : (onForest ? R.drawable.zw_bg_tile : R.drawable.zw_bg_clear);
            v.setInt(P_ROOT[i], "setBackgroundResource", bg);
            int ink = x.focus ? (onForest ? R.color.zw_gold_text : R.color.zw_card_focus_ink) : (onForest ? R.color.zw_on_forest : R.color.zw_card_ink);
            v.setTextColor(P_NAME[i], c.getResources().getColor(ink, c.getTheme()));
            v.setOnClickPendingIntent(P_ROOT[i], link(c, logUrl(x.p, m.date)));
            v.setContentDescription(P_ROOT[i], x.name + ", " + x.timeLabel + ", " + x.state);
        }
    }

    /* ---------- sizes ---------- */

    private static RemoteViews small(Context c, WidgetModel m) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.zw_widget_small);
        hero(v, c, m, true);
        v.setTextViewText(R.id.zw_countdown_label, "now".equals(m.mode) ? m.countdownLabel : m.label("left"));
        v.setOnClickPendingIntent(R.id.zw_root, link(c, heroUrl(m)));
        return v;
    }

    private static RemoteViews medium(Context c, WidgetModel m) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.zw_widget_medium);
        hero(v, c, m, false);
        prayers(v, c, m, true, true);
        v.setOnClickPendingIntent(R.id.zw_header, link(c, heroUrl(m)));
        v.setOnClickPendingIntent(R.id.zw_root, link(c, "zad://open?v=home"));
        return v;
    }

    private static RemoteViews large(Context c, WidgetModel m) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.zw_widget_large);
        hero(v, c, m, true);
        v.setTextViewText(R.id.zw_hijri, m.hijri);
        v.setTextViewText(R.id.zw_countdown_label, m.countdownLabel);
        v.setOnClickPendingIntent(R.id.zw_hero, link(c, heroUrl(m)));
        prayers(v, c, m, false, false);
        v.setOnClickPendingIntent(R.id.zw_root, link(c, "zad://open?v=home"));

        String mk = m.makeupsLabel();
        v.setViewVisibility(R.id.zw_makeups, mk == null ? View.GONE : View.VISIBLE);
        if (mk != null) {
            v.setTextViewText(R.id.zw_makeups_text, mk);
            v.setOnClickPendingIntent(R.id.zw_makeups, link(c, "zad://open?v=qada"));
        }

        if (!m.hasDeeds) {
            v.setViewVisibility(R.id.zw_deeds_title, View.GONE);
            v.setViewVisibility(R.id.zw_deeds_count, View.GONE);
            for (int r : D_ROW) v.setViewVisibility(r, View.GONE);
            return v;
        }
        v.setViewVisibility(R.id.zw_deeds_title, View.VISIBLE);
        v.setViewVisibility(R.id.zw_deeds_count, View.VISIBLE);
        v.setTextViewText(R.id.zw_deeds_title, m.label("goodDeeds"));
        v.setTextViewText(R.id.zw_deeds_count, m.deedsDone + "/" + m.deedsTotal);
        PendingIntent home = link(c, "zad://open?v=home");
        int n = Math.min(m.deeds.size(), D_ROOT.length);
        for (int i = 0; i < D_ROOT.length; i++) {
            boolean show = i < n;
            // Empty slots keep the grid's shape; with exactly 5 deeds the 6th slot becomes "+ Add deed" (as in the design)
            v.setViewVisibility(D_ROOT[i], show ? View.VISIBLE : (i == 5 && n == 5) ? View.GONE : View.INVISIBLE);
            if (!show) continue;
            WidgetModel.Deed d = m.deeds.get(i);
            v.setTextViewText(D_NAME[i], d.name);
            v.setImageViewResource(D_ICON[i], d.done ? R.drawable.zw_deed_done : R.drawable.zw_deed_todo);
            v.setInt(D_NAME[i], "setPaintFlags", d.done ? (Paint.STRIKE_THRU_TEXT_FLAG | Paint.ANTI_ALIAS_FLAG) : Paint.ANTI_ALIAS_FLAG);
            v.setTextColor(D_NAME[i], c.getResources().getColor(d.done ? R.color.zw_card_ink2 : R.color.zw_card_ink, c.getTheme()));
            v.setOnClickPendingIntent(D_ROOT[i], home);
        }
        v.setViewVisibility(R.id.zw_add_deed, n == 5 ? View.VISIBLE : View.GONE);
        if (n == 5) v.setOnClickPendingIntent(R.id.zw_add_deed, home);
        // Hide rows that have no deeds at all
        for (int r = 0; r < D_ROW.length; r++) v.setViewVisibility(D_ROW[r], r * 2 < Math.max(n, 1) ? View.VISIBLE : View.GONE);
        return v;
    }

    private static RemoteViews message(Context c, String staleJson) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.zw_widget_message);
        v.setTextViewText(R.id.zw_message, WidgetModel.label(WidgetModel.labelsOf(staleJson), "stale"));
        v.setOnClickPendingIntent(R.id.zw_root, link(c, "zad://open?v=home"));
        return v;
    }
}
