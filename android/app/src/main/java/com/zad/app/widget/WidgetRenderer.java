package com.zad.app.widget;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;
import com.zad.app.MainActivity;
import com.zad.app.R;

/**
 * Builds the RemoteViews for each widget size from a WidgetModel, in the OG Calm look (light and dark follow the
 * phone through values-night, so no colour is set from code).
 * - Small: the current prayer, its countdown and one On time button.
 * - Medium: the same with the one-tap buttons (brothers: Congregation then On time; sisters: On time) and the
 *   day's five dots; when nothing is open, the day's five times.
 * - Large: the day's five prayers, the open one with its buttons.
 * The buttons send a broadcast to LogActionReceiver (no app launch); everything else opens the app.
 */
final class WidgetRenderer {
    enum Size { SMALL, MEDIUM, LARGE }

    private static final int[] DOT = { R.id.zw_dot0, R.id.zw_dot1, R.id.zw_dot2, R.id.zw_dot3, R.id.zw_dot4 };
    private static final int[] T_DOT = { R.id.zw_t0_dot, R.id.zw_t1_dot, R.id.zw_t2_dot, R.id.zw_t3_dot, R.id.zw_t4_dot };
    private static final int[] T_NAME = { R.id.zw_t0_name, R.id.zw_t1_name, R.id.zw_t2_name, R.id.zw_t3_name, R.id.zw_t4_name };
    private static final int[] T_TIME = { R.id.zw_t0_time, R.id.zw_t1_time, R.id.zw_t2_time, R.id.zw_t3_time, R.id.zw_t4_time };
    private static final int[] R_ROOT = { R.id.zw_r0, R.id.zw_r1, R.id.zw_r2, R.id.zw_r3, R.id.zw_r4 };
    private static final int[] R_ICON = { R.id.zw_r0_icon, R.id.zw_r1_icon, R.id.zw_r2_icon, R.id.zw_r3_icon, R.id.zw_r4_icon };
    private static final int[] R_NAME = { R.id.zw_r0_name, R.id.zw_r1_name, R.id.zw_r2_name, R.id.zw_r3_name, R.id.zw_r4_name };
    private static final int[] R_SUB = { R.id.zw_r0_sub, R.id.zw_r1_sub, R.id.zw_r2_sub, R.id.zw_r3_sub, R.id.zw_r4_sub };
    private static final int[] R_STATUS = { R.id.zw_r0_status, R.id.zw_r1_status, R.id.zw_r2_status, R.id.zw_r3_status, R.id.zw_r4_status };
    private static final int[] R_BTNS = { R.id.zw_r0_btns, R.id.zw_r1_btns, R.id.zw_r2_btns, R.id.zw_r3_btns, R.id.zw_r4_btns };
    private static final int[] R_CONG = { R.id.zw_r0_cong, R.id.zw_r1_cong, R.id.zw_r2_cong, R.id.zw_r3_cong, R.id.zw_r4_cong };
    private static final int[] R_ONTIME = { R.id.zw_r0_ontime, R.id.zw_r1_ontime, R.id.zw_r2_ontime, R.id.zw_r3_ontime, R.id.zw_r4_ontime };
    private static final int[] R_SOLO = { R.id.zw_r0_solo, R.id.zw_r1_solo, R.id.zw_r2_solo, R.id.zw_r3_solo, R.id.zw_r4_solo };
    private static final int[] R_REMEMBER = { R.id.zw_r0_remember, R.id.zw_r1_remember, R.id.zw_r2_remember, R.id.zw_r3_remember, R.id.zw_r4_remember };
    private static final int[] R_LOGGED = { R.id.zw_r0_logged, R.id.zw_r1_logged, R.id.zw_r2_logged, R.id.zw_r3_logged, R.id.zw_r4_logged };
    private static final int[] R_LOGGED_TEXT = { R.id.zw_r0_logged_text, R.id.zw_r1_logged_text, R.id.zw_r2_logged_text, R.id.zw_r3_logged_text, R.id.zw_r4_logged_text };
    private static final int[] R_UNDO = { R.id.zw_r0_undo, R.id.zw_r1_undo, R.id.zw_r2_undo, R.id.zw_r3_undo, R.id.zw_r4_undo };

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

    /** Tapping the widget (not a button): the focus prayer's log sheet, or the Today sheet. */
    private static String heroUrl(WidgetModel m) {
        return !"next".equals(m.mode) ? logUrl(m.focusP, m.focusDate) : "zad://today";
    }

    /** The label of a status, as the widgets write it. */
    static String statusLabel(WidgetModel m, String s) {
        switch (s) {
            case "congregation": return m.label("congregation");
            case "ontime": return m.label("onTime");
            case "madeup": return m.label("madeup");
            case "missed": return m.label("missed");
            case "excused": return m.label("excused");
            default: return "";
        }
    }

    /** What the tap logged, short: "✓ On time" / "Remembrance ✓". */
    static String tapShort(WidgetModel m) {
        if (m.tap == null) return "✓";
        return "remember".equals(m.tap.status) ? m.label("remembered") : "✓ " + statusLabel(m, m.tap.status);
    }

    /** What the tap logged, long: "ʿAsr logged ✓" / "Remembrance ✓". */
    static String tapLong(WidgetModel m) {
        if (m.tap != null && "remember".equals(m.tap.status)) return m.label("remembered");
        return m.label("logged", m.focusName, null);
    }

    /* ---------- shared pieces ---------- */

    private static void hero(RemoteViews v, Context c, WidgetModel m) {
        boolean next = "next".equals(m.mode);
        v.setTextViewText(R.id.zw_tag, m.label(next ? "next" : "now"));
        v.setViewVisibility(R.id.zw_tag_dot, next ? View.GONE : View.VISIBLE);
        v.setTextViewText(R.id.zw_name, m.focusName);
        // A count-down Chronometer ticks by itself (API 24+), so the widget only needs a redraw at boundaries
        // (WidgetUpdater). Its base is on the elapsed-realtime clock.
        v.setChronometer(R.id.zw_countdown, SystemClock.elapsedRealtime() + Math.max(0, m.countdownTo - m.builtAt), null, true);
        v.setChronometerCountDown(R.id.zw_countdown, true);
        v.setTextViewText(R.id.zw_countdown_label, m.countdownLabel);
        // The countdown ticks on its own, so a number here would go stale
        v.setContentDescription(R.id.zw_root, m.label(next ? "next" : "now") + " " + m.focusName + ", " + m.countdownLabel);
    }

    /** The bottom bar (zw_part_actions). Returns whether it shows anything. */
    private static boolean bottom(RemoteViews v, Context c, WidgetModel m, Size size) {
        v.setViewVisibility(R.id.zw_actions, View.GONE);
        v.setViewVisibility(R.id.zw_logged, View.GONE);
        v.setViewVisibility(R.id.zw_remember, View.GONE);
        if (m.showTimesOnly) return false;
        if ("now".equals(m.mode) && "log".equals(m.action)) {
            boolean solo = size == Size.SMALL || m.sister();
            v.setViewVisibility(R.id.zw_actions, View.VISIBLE);
            v.setViewVisibility(R.id.zw_btn_cong, solo ? View.GONE : View.VISIBLE);
            v.setViewVisibility(R.id.zw_btn_ontime, solo ? View.GONE : View.VISIBLE);
            v.setViewVisibility(R.id.zw_btn_solo, solo ? View.VISIBLE : View.GONE);
            String onTime = m.label("onTime"), cong = m.label("congregation");
            if (solo) {
                v.setTextViewText(R.id.zw_btn_solo_text, onTime);
                v.setOnClickPendingIntent(R.id.zw_btn_solo, LogActionReceiver.pending(c, m.focusDate, m.focusP, "ontime", "widget"));
                v.setContentDescription(R.id.zw_btn_solo, m.focusName + ": " + onTime);
            } else {
                v.setTextViewText(R.id.zw_btn_cong_text, cong);
                v.setTextViewText(R.id.zw_btn_ontime_text, onTime);
                v.setOnClickPendingIntent(R.id.zw_btn_cong, LogActionReceiver.pending(c, m.focusDate, m.focusP, "congregation", "widget"));
                v.setOnClickPendingIntent(R.id.zw_btn_ontime, LogActionReceiver.pending(c, m.focusDate, m.focusP, "ontime", "widget"));
                v.setContentDescription(R.id.zw_btn_cong, m.focusName + ": " + cong);
                v.setContentDescription(R.id.zw_btn_ontime, m.focusName + ": " + onTime);
            }
            return true;
        }
        if ("now".equals(m.mode) && "remember".equals(m.action)) {
            v.setViewVisibility(R.id.zw_remember, View.VISIBLE);
            v.setTextViewText(R.id.zw_remember_text, m.label(size == Size.SMALL ? "remembranceShort" : "remembrance"));
            v.setOnClickPendingIntent(R.id.zw_remember, LogActionReceiver.pending(c, m.focusDate, m.focusP, "remember", "widget"));
            v.setContentDescription(R.id.zw_remember, m.focusName + ": " + m.label("remembrance"));
            return true;
        }
        if ("logged".equals(m.mode) && m.tap != null) {
            v.setViewVisibility(R.id.zw_logged, View.VISIBLE);
            v.setTextViewText(R.id.zw_logged_text, size == Size.SMALL ? tapShort(m) : tapLong(m));
            v.setTextViewText(R.id.zw_undo_text, m.label("undo"));
            v.setOnClickPendingIntent(R.id.zw_undo, LogActionReceiver.pending(c, m.tap.date, m.tap.p, "undo", "widget"));
            v.setContentDescription(R.id.zw_undo, m.label("undo") + " " + m.focusName);
            return true;
        }
        return false;
    }

    private static int dotFor(String state) {
        switch (state) {
            case "congregation": return R.drawable.zw_dot_congregation;
            case "ontime": return R.drawable.zw_dot_ontime;
            case "madeup": return R.drawable.zw_dot_madeup;
            case "missed": return R.drawable.zw_dot_missed;
            case "excused": return R.drawable.zw_dot_excused;
            case "now": return R.drawable.zw_dot_open;
            default: return R.drawable.zw_dot_empty;
        }
    }

    private static int iconFor(String state) {
        switch (state) {
            case "congregation": return R.drawable.zw_st_congregation;
            case "ontime": return R.drawable.zw_st_ontime;
            case "madeup": return R.drawable.zw_st_madeup;
            case "missed": return R.drawable.zw_st_missed;
            case "excused": return R.drawable.zw_st_excused;
            case "now": return R.drawable.zw_st_now;
            case "due": return R.drawable.zw_st_due;
            default: return R.drawable.zw_st_upcoming;
        }
    }

    /** The five dots: hidden with Show times only and on an excused day. */
    private static void dots(RemoteViews v, WidgetModel m) {
        boolean show = !m.showTimesOnly && !m.excusedToday;
        v.setViewVisibility(R.id.zw_dots, show ? View.VISIBLE : View.GONE);
        if (!show) return;
        StringBuilder desc = new StringBuilder();
        for (int i = 0; i < 5 && i < m.prayers.size(); i++) {
            WidgetModel.Prayer x = m.prayers.get(i);
            v.setImageViewResource(DOT[i], dotFor(x.state));
            String s = statusLabel(m, x.state);
            if (!s.isEmpty()) desc.append(desc.length() > 0 ? ", " : "").append(x.name).append(" ").append(s);
        }
        v.setContentDescription(R.id.zw_dots, desc.toString());
    }

    /** The day's five times; the gold dot marks the prayer whose time is in. */
    private static void times(RemoteViews v, WidgetModel m) {
        for (int i = 0; i < 5 && i < m.prayers.size(); i++) {
            WidgetModel.Prayer x = m.prayers.get(i);
            v.setTextViewText(T_NAME[i], x.name);
            v.setTextViewText(T_TIME[i], x.timeLabel);
            boolean cur = x.focus && !"next".equals(m.mode);
            v.setViewVisibility(T_DOT[i], cur ? View.VISIBLE : View.GONE);
        }
    }

    /* ---------- sizes ---------- */

    private static RemoteViews small(Context c, WidgetModel m) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.zw_widget_small);
        hero(v, c, m);
        v.setViewVisibility(R.id.zw_bottom, bottom(v, c, m, Size.SMALL) ? View.VISIBLE : View.GONE);
        v.setOnClickPendingIntent(R.id.zw_root, link(c, heroUrl(m)));
        return v;
    }

    private static RemoteViews medium(Context c, WidgetModel m) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.zw_widget_medium);
        hero(v, c, m);
        dots(v, m);
        boolean any = bottom(v, c, m, Size.MEDIUM);
        v.setViewVisibility(R.id.zw_bottom, any ? View.VISIBLE : View.GONE);
        v.setViewVisibility(R.id.zw_times_box, any ? View.GONE : View.VISIBLE);
        if (!any) times(v, m);
        v.setOnClickPendingIntent(R.id.zw_root, link(c, heroUrl(m)));
        return v;
    }

    private static RemoteViews large(Context c, WidgetModel m) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.zw_widget_large);
        hero(v, c, m);
        v.setOnClickPendingIntent(R.id.zw_header, link(c, heroUrl(m)));
        v.setOnClickPendingIntent(R.id.zw_root, link(c, "zad://open?v=home"));
        // The open prayer isn't one of today's rows (last night's ʿIshāʾ after midnight): its buttons go under the header
        boolean offList = !"next".equals(m.mode) && !m.focusToday() && !m.showTimesOnly;
        v.setViewVisibility(R.id.zw_bottom_box, offList && bottom(v, c, m, Size.LARGE) ? View.VISIBLE : View.GONE);
        for (int i = 0; i < 5 && i < m.prayers.size(); i++) row(v, c, m, i, m.prayers.get(i));
        return v;
    }

    private static void row(RemoteViews v, Context c, WidgetModel m, int i, WidgetModel.Prayer x) {
        v.setViewVisibility(R_STATUS[i], View.GONE);
        v.setViewVisibility(R_BTNS[i], View.GONE);
        v.setViewVisibility(R_REMEMBER[i], View.GONE);
        v.setViewVisibility(R_LOGGED[i], View.GONE);
        v.setTextViewText(R_NAME[i], x.name);
        v.setOnClickPendingIntent(R_ROOT[i], link(c, logUrl(x.p, m.date)));
        boolean inWindow = x.focus && !"next".equals(m.mode);
        String sub = inWindow ? m.label("until") + " " + m.focusEndLabel : x.begun ? x.timeLabel : m.label("beginsShort", x.name, x.timeLabel);
        v.setTextViewText(R_SUB[i], sub);
        String desc = x.name + ", " + sub;

        // Show times only (and an excused day's unlogged prayers): no status
        boolean hideStatus = m.showTimesOnly || "excused".equals(x.state);
        String state = hideStatus ? (inWindow ? "now" : "upcoming") : x.state;
        v.setImageViewResource(R_ICON[i], iconFor(state));
        if (m.showTimesOnly) { v.setContentDescription(R_ROOT[i], desc); return; }

        if (inWindow && "now".equals(m.mode) && "log".equals(m.action)) {
            boolean solo = m.sister();
            v.setViewVisibility(R_BTNS[i], View.VISIBLE);
            v.setViewVisibility(R_CONG[i], solo ? View.GONE : View.VISIBLE);
            v.setViewVisibility(R_ONTIME[i], solo ? View.GONE : View.VISIBLE);
            v.setViewVisibility(R_SOLO[i], solo ? View.VISIBLE : View.GONE);
            String onTime = m.label("onTime"), cong = m.label("congregation");
            if (solo) {
                v.setTextViewText(R_SOLO[i], onTime);
                v.setOnClickPendingIntent(R_SOLO[i], LogActionReceiver.pending(c, m.date, x.p, "ontime", "widget"));
                v.setContentDescription(R_SOLO[i], x.name + ": " + onTime);
            } else {
                v.setTextViewText(R_CONG[i], cong);
                v.setTextViewText(R_ONTIME[i], onTime);
                v.setOnClickPendingIntent(R_CONG[i], LogActionReceiver.pending(c, m.date, x.p, "congregation", "widget"));
                v.setOnClickPendingIntent(R_ONTIME[i], LogActionReceiver.pending(c, m.date, x.p, "ontime", "widget"));
                v.setContentDescription(R_CONG[i], x.name + ": " + cong);
                v.setContentDescription(R_ONTIME[i], x.name + ": " + onTime);
            }
        } else if (inWindow && "now".equals(m.mode) && "remember".equals(m.action)) {
            v.setViewVisibility(R_REMEMBER[i], View.VISIBLE);
            v.setTextViewText(R_REMEMBER[i], m.label("remembranceShort"));
            v.setOnClickPendingIntent(R_REMEMBER[i], LogActionReceiver.pending(c, m.date, x.p, "remember", "widget"));
            v.setContentDescription(R_REMEMBER[i], x.name + ": " + m.label("remembrance"));
        } else if (inWindow && "logged".equals(m.mode) && m.tap != null) {
            v.setViewVisibility(R_LOGGED[i], View.VISIBLE);
            v.setTextViewText(R_LOGGED_TEXT[i], tapShort(m));
            v.setTextViewText(R_UNDO[i], m.label("undo"));
            v.setOnClickPendingIntent(R_UNDO[i], LogActionReceiver.pending(c, m.tap.date, m.tap.p, "undo", "widget"));
            v.setContentDescription(R_UNDO[i], m.label("undo") + " " + x.name);
            desc += ", " + tapShort(m);
        } else if (!hideStatus) {
            String s = "due".equals(x.state) ? m.label("notLogged") : statusLabel(m, x.state);
            if (!s.isEmpty()) {
                v.setViewVisibility(R_STATUS[i], View.VISIBLE);
                v.setTextViewText(R_STATUS[i], s);
                desc += ", " + s;
            }
        }
        v.setContentDescription(R_ROOT[i], desc);
    }

    static RemoteViews message(Context c, String staleJson) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.zw_widget_message);
        v.setTextViewText(R.id.zw_message, WidgetModel.label(WidgetModel.labelsOf(staleJson), "stale"));
        v.setOnClickPendingIntent(R.id.zw_root, link(c, "zad://open?v=home"));
        return v;
    }
}
