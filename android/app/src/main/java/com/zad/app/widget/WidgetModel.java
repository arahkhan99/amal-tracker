package com.zad.app.widget;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * What a widget shows at a given moment, worked out from the snapshot alone (so it stays right while the
 * app is closed). Port of widgetModel() in src/widgets.js; tests/widgets.test.js specifies the behaviour.
 */
public final class WidgetModel {
    public static final String[] PRAYERS = { "Fajr", "Dhuhr", "Asr", "Maghrib", "Isha" };
    static final int SNAPSHOT_VERSION = 1;

    public static final class Prayer {
        public String p, name, timeLabel, state;
        public long time;
        public Boolean sunnah; // null: no sunnah for this prayer (or the module is off)
        public boolean focus;
    }

    public static final class Deed {
        public String name;
        public boolean done;
    }

    public String date, hijri;
    public String mode; // "now" | "next"
    public String focusP, focusName, focusDate, focusTimeLabel;
    public long countdownTo;
    public String countdown, countdownLabel;
    public String logP, logDate; // null when the hero should open the Today sheet
    public final List<Prayer> prayers = new ArrayList<>();
    public int prayed;
    public boolean hasDeeds;
    public int deedsDone, deedsTotal;
    public final List<Deed> deeds = new ArrayList<>();
    public Integer makeups; // null when the Make-ups module is off
    public long nextChange; // 0 when unknown
    public long builtAt; // the "now" the model was worked out for (the countdown chronometer counts from it)
    public final Map<String, String> labels = new HashMap<>();

    private WidgetModel() {}

    private static final Map<String, String> DEFAULT_LABELS = new HashMap<>();
    static {
        DEFAULT_LABELS.put("next", "Next");
        DEFAULT_LABELS.put("now", "Now");
        DEFAULT_LABELS.put("left", "left");
        DEFAULT_LABELS.put("until", "until");
        DEFAULT_LABELS.put("toMiddle", "to middle of night");
        DEFAULT_LABELS.put("prayed", "Prayed");
        DEFAULT_LABELS.put("logToday", "Log today");
        DEFAULT_LABELS.put("goodDeeds", "Good Deeds");
        DEFAULT_LABELS.put("makeups", "{n} make-ups left");
        DEFAULT_LABELS.put("makeupsOne", "{n} make-up left");
        DEFAULT_LABELS.put("addDeed", "+ Add deed");
        DEFAULT_LABELS.put("prayers", "prayers");
        DEFAULT_LABELS.put("nextPrayer", "Next prayer");
        DEFAULT_LABELS.put("stale", "Open Zad to update");
    }

    /** A label from the snapshot, else the English default. */
    public static String label(Map<String, String> labels, String key) {
        String v = labels != null ? labels.get(key) : null;
        if (v == null) v = DEFAULT_LABELS.get(key);
        return v != null ? v : key;
    }

    public String label(String key) { return label(labels, key); }

    /** Labels when there is no usable snapshot (only the defaults, or the stale snapshot's). */
    public static Map<String, String> labelsOf(String json) {
        Map<String, String> out = new HashMap<>(DEFAULT_LABELS);
        try {
            JSONObject l = new JSONObject(json).optJSONObject("labels");
            if (l != null) for (java.util.Iterator<String> it = l.keys(); it.hasNext(); ) {
                String k = it.next();
                out.put(k, l.optString(k));
            }
        } catch (Exception ignored) { /* no snapshot */ }
        return out;
    }

    static String dayKey(long ms) {
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        return f.format(new Date(ms));
    }

    /** "5:12 AM" */
    public static String fmt12(long ms) {
        Calendar c = Calendar.getInstance();
        c.setTimeInMillis(ms);
        int h = c.get(Calendar.HOUR_OF_DAY), m = c.get(Calendar.MINUTE);
        return String.format(Locale.US, "%d:%02d %s", (h % 12) == 0 ? 12 : h % 12, m, h < 12 ? "AM" : "PM");
    }

    /** "1h 24m" / "24m", minutes rounded up (same as fmtCountdown in src/widgets.js). */
    public static String fmtCountdown(long ms) {
        long m = Math.max(0, (ms + 59999) / 60000);
        if (ms <= 0) m = 0;
        long h = m / 60;
        return (h > 0 ? h + "h " : "") + (m % 60) + "m";
    }

    private static long nextMidnight(long ms) {
        Calendar c = Calendar.getInstance();
        c.setTimeInMillis(ms);
        c.set(Calendar.HOUR_OF_DAY, 0);
        c.set(Calendar.MINUTE, 0);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        c.add(Calendar.DAY_OF_MONTH, 1);
        return c.getTimeInMillis();
    }

    private static String status(JSONObject day, String p) {
        JSONObject s = day.optJSONObject("status");
        String v = s == null || s.isNull(p) ? null : s.optString(p, null);
        if (v == null && day.optBoolean("excused")) v = "excused";
        return v;
    }

    private static long time(JSONObject day, String p) {
        return day.optJSONObject("times").optLong(p);
    }

    /** Null when the snapshot is missing, unreadable, or doesn't cover today. */
    public static WidgetModel build(String json, long now) {
        if (json == null) return null;
        try {
            JSONObject snap = new JSONObject(json);
            if (snap.optInt("v") != SNAPSHOT_VERSION) return null;
            JSONArray days = snap.optJSONArray("days");
            if (days == null) return null;
            String todayKey = dayKey(now);
            int i = -1;
            for (int k = 0; k < days.length(); k++) if (todayKey.equals(days.getJSONObject(k).optString("date"))) i = k;
            if (i < 0) return null;
            JSONObject today = days.getJSONObject(i);
            JSONObject yesterday = i > 0 ? days.getJSONObject(i - 1) : null;
            JSONObject tomorrow = i + 1 < days.length() ? days.getJSONObject(i + 1) : null;

            WidgetModel m = new WidgetModel();
            m.labels.putAll(labelsOf(json));
            m.builtAt = now;
            m.date = todayKey;
            m.hijri = today.optString("hijri", "");

            // The prayer whose time is in now (times.currentWindow)
            JSONObject curDay = null;
            String curP = null;
            long curEnd = 0;
            if (now < time(today, "Fajr")) {
                if (yesterday != null) { curDay = yesterday; curP = "Isha"; curEnd = time(today, "Fajr"); }
            } else {
                for (int k = PRAYERS.length - 1; k >= 0; k--) {
                    String p = PRAYERS[k];
                    if (now < time(today, p)) continue;
                    Long end = p.equals("Fajr") ? Long.valueOf(time(today, "Sunrise"))
                        : p.equals("Isha") ? (tomorrow != null ? Long.valueOf(time(tomorrow, "Fajr")) : null)
                        : Long.valueOf(time(today, PRAYERS[k + 1]));
                    if (end != null && now < end) { curDay = today; curP = p; curEnd = end; }
                    break;
                }
            }
            boolean curOpen = curDay != null && status(curDay, curP) == null;

            // The next prayer to start
            JSONObject nextDay = null;
            String nextP = null;
            for (String p : PRAYERS) if (time(today, p) > now) { nextDay = today; nextP = p; break; }
            if (nextP == null && tomorrow != null) { nextDay = tomorrow; nextP = "Fajr"; }

            if (curOpen) {
                m.mode = "now";
                long best = curP.equals("Isha") ? curDay.optLong("ishaBest", 0) : 0;
                boolean toBest = best > 0 && now < best;
                m.focusP = curP;
                m.focusName = curDay.optJSONObject("names").optString(curP, curP);
                m.focusDate = curDay.optString("date");
                m.focusTimeLabel = fmt12(time(curDay, curP));
                m.countdownTo = toBest ? best : curEnd;
                m.countdownLabel = toBest ? m.label("toMiddle") : m.label("left");
                m.logP = curP;
                m.logDate = m.focusDate;
            } else if (nextP != null) {
                m.mode = "next";
                m.focusP = nextP;
                m.focusName = nextDay.optJSONObject("names").optString(nextP, nextP);
                m.focusDate = nextDay.optString("date");
                m.focusTimeLabel = fmt12(time(nextDay, nextP));
                m.countdownTo = time(nextDay, nextP);
                m.countdownLabel = m.label("until") + " " + m.focusName;
            } else {
                return null;
            }
            m.countdown = fmtCountdown(m.countdownTo - now);

            boolean focusToday = todayKey.equals(m.focusDate);
            JSONObject names = today.optJSONObject("names");
            JSONObject sunnah = today.optJSONObject("sunnah");
            for (String p : PRAYERS) {
                Prayer x = new Prayer();
                x.p = p;
                x.name = names != null ? names.optString(p, p) : p;
                x.time = time(today, p);
                x.timeLabel = fmt12(x.time);
                x.focus = focusToday && p.equals(m.focusP);
                String s = status(today, p);
                if (s != null) x.state = s;
                else if (x.focus) x.state = m.mode.equals("now") ? "due" : "next";
                else x.state = x.time <= now ? "due" : "upcoming";
                x.sunnah = sunnah == null || sunnah.isNull(p) ? null : sunnah.optBoolean(p);
                if (Arrays.asList("congregation", "ontime", "madeup").contains(x.state)) m.prayed++;
                m.prayers.add(x);
            }

            JSONObject deeds = snap.optJSONObject("deeds");
            if (deeds != null) {
                boolean sameDay = todayKey.equals(deeds.optString("date"));
                m.hasDeeds = true;
                m.deedsTotal = deeds.optInt("total");
                m.deedsDone = sameDay ? deeds.optInt("done") : 0;
                JSONArray items = deeds.optJSONArray("items");
                if (items != null) for (int k = 0; k < items.length(); k++) {
                    JSONObject it = items.getJSONObject(k);
                    Deed d = new Deed();
                    d.name = it.optString("name");
                    d.done = sameDay && it.optBoolean("done");
                    m.deeds.add(d);
                }
            }
            m.makeups = snap.isNull("makeups") || !snap.has("makeups") ? null : snap.optInt("makeups");

            // Next boundary: any prayer start, sunrise, middle of the night, or midnight
            long nc = nextMidnight(now);
            for (int k = 0; k < days.length(); k++) {
                JSONObject d = days.getJSONObject(k);
                JSONObject t = d.optJSONObject("times");
                if (t != null) for (java.util.Iterator<String> it = t.keys(); it.hasNext(); ) {
                    long b = t.optLong(it.next());
                    if (b > now && b < nc) nc = b;
                }
                long best = d.optLong("ishaBest", 0);
                if (best > now && best < nc) nc = best;
            }
            m.nextChange = nc;
            return m;
        } catch (Exception e) {
            return null;
        }
    }

    public String makeupsLabel() {
        if (makeups == null) return null;
        return label(makeups == 1 ? "makeupsOne" : "makeups").replace("{n}", String.valueOf(makeups));
    }
}
