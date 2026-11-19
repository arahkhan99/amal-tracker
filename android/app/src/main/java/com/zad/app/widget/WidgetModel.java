package com.zad.app.widget;

import android.content.Context;
import android.text.format.DateFormat;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Calendar;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * What the widgets, the Quick Settings tile and the ongoing "Now" notification show at a given moment, worked out
 * from the snapshot (src/widgets.js buildSnapshot) plus the one-tap queue not merged yet, so a tap shows at once and
 * everything stays right while the app is closed.
 *
 * Modes:
 * - "now": a prayer's time is in and it's open (not logged). action "log" (Congregation / On time) or, on an
 *   excused day, "remember" (Remembrance at prayer time) when not ticked yet.
 * - "logged": that prayer was just logged by a tap (UNDO_MS): "ʿAsr logged ✓ · Undo".
 * - "next": nothing open: the next prayer, "Zuhr begins 11:50", no buttons. After a prayer's time ends the widget
 *   moves straight on to the next prayer.
 * Show times only: no status, dots or buttons; the hero is the prayer whose time is in (whatever its status), else
 * the next one, so nothing about what's logged shows.
 */
public final class WidgetModel {
    public static final String[] PRAYERS = { "Fajr", "Dhuhr", "Asr", "Maghrib", "Isha" };
    static final int SNAPSHOT_VERSION = 1;
    /** How long "logged ✓ · Undo" stays after a tap. */
    public static final long UNDO_MS = 10 * 60_000L;

    public static final class Prayer {
        public String p, name, timeLabel;
        /** congregation | ontime | madeup | missed | excused | now (its time is in, open) | due (begun, not logged) | upcoming */
        public String state;
        public long time;
        public boolean focus, begun;
    }

    public static final class Tap {
        public String id, date, p, status;
        public long at;
    }

    public String date, hijri;
    public String mode; // "now" | "logged" | "next"
    public String action; // "log" | "remember" | null (only in mode "now")
    public String focusP, focusName, focusDate, focusTimeLabel;
    public long focusTime;
    /** The end of the focus prayer's time (now / logged), else 0. */
    public long focusEnd;
    public String focusEndLabel;
    public long countdownTo;
    public String countdownLabel; // under the countdown: "left · until 16:05", "Zuhr begins 11:50"
    public String nextP, nextName, nextTimeLabel; // the next prayer to begin (null when unknown)
    public Tap tap; // mode "logged"
    public String gender; // "m" | "f" | null (null: as "m")
    public boolean excusedToday, showTimesOnly, ongoingNow, lockDots;
    public boolean use24;
    public final List<Prayer> prayers = new ArrayList<>();
    public long nextChange; // the next moment the picture changes (a boundary, the end of Undo, midnight)
    public long builtAt;
    public final Map<String, String> labels = new HashMap<>();

    private WidgetModel() {}

    public boolean sister() { return "f".equals(gender); }
    public boolean focusToday() { return date != null && date.equals(focusDate); }

    private static final Map<String, String> DEFAULT_LABELS = new HashMap<>();
    static {
        DEFAULT_LABELS.put("next", "Next");
        DEFAULT_LABELS.put("now", "Now");
        DEFAULT_LABELS.put("left", "left");
        DEFAULT_LABELS.put("until", "until");
        DEFAULT_LABELS.put("toMiddle", "to middle of night");
        DEFAULT_LABELS.put("stale", "Open Zad to update");
        DEFAULT_LABELS.put("onTime", "On time");
        DEFAULT_LABELS.put("congregation", "Congregation");
        DEFAULT_LABELS.put("logged", "{p} logged ✓");
        DEFAULT_LABELS.put("undo", "Undo");
        DEFAULT_LABELS.put("begins", "{p} begins {t}");
        DEFAULT_LABELS.put("beginsShort", "Begins {t}");
        DEFAULT_LABELS.put("remembrance", "Remembrance at prayer time");
        DEFAULT_LABELS.put("remembranceShort", "Remembrance");
        DEFAULT_LABELS.put("remembered", "Remembrance ✓");
        DEFAULT_LABELS.put("notLogged", "Not logged");
        DEFAULT_LABELS.put("madeup", "Made up");
        DEFAULT_LABELS.put("missed", "Missed");
        DEFAULT_LABELS.put("excused", "Excused");
        DEFAULT_LABELS.put("logOnTime", "Log {p} · on time");
        DEFAULT_LABELS.put("logTile", "Log {p}");
        DEFAULT_LABELS.put("nothingOpen", "Nothing to log now");
        DEFAULT_LABELS.put("ends", "{p} · ends {t}");
        DEFAULT_LABELS.put("nextAt", "Next {p} {t}");
    }

    /** A label from the snapshot, else the English default. */
    public static String label(Map<String, String> labels, String key) {
        String v = labels != null ? labels.get(key) : null;
        if (v == null || v.isEmpty()) v = DEFAULT_LABELS.get(key);
        return v != null ? v : key;
    }

    public String label(String key) { return label(labels, key); }

    /** A label with {p} (prayer name) and {t} (a time) filled in. */
    public String label(String key, String p, String t) {
        return label(key).replace("{p}", p == null ? "" : p).replace("{t}", t == null ? "" : t);
    }

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

    /** A top-level boolean of the snapshot (false when missing). */
    public static boolean flag(String json, String key) {
        try { return json != null && new JSONObject(json).optBoolean(key, false); } catch (Exception e) { return false; }
    }

    static String dayKey(long ms) {
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        return f.format(new Date(ms));
    }

    /** "16:05" or "4:05 PM", as the phone is set. */
    public static String fmtTime(long ms, boolean use24) {
        Calendar c = Calendar.getInstance();
        c.setTimeInMillis(ms);
        int h = c.get(Calendar.HOUR_OF_DAY), m = c.get(Calendar.MINUTE);
        if (use24) return String.format(Locale.US, "%02d:%02d", h, m);
        return String.format(Locale.US, "%d:%02d %s", (h % 12) == 0 ? 12 : h % 12, m, h < 12 ? "AM" : "PM");
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

    /** One day of the snapshot with the unmerged one-tap logs laid over it. */
    private static final class Day {
        final JSONObject raw;
        final String date;
        final boolean excused;
        final Map<String, String> status = new HashMap<>();
        final Set<String> remember = new HashSet<>();

        Day(JSONObject raw) {
            this.raw = raw;
            date = raw.optString("date");
            excused = raw.optBoolean("excused");
            JSONObject s = raw.optJSONObject("status");
            JSONObject r = raw.optJSONObject("remember");
            for (String p : PRAYERS) {
                if (s != null && !s.isNull(p)) {
                    String v = s.optString(p, "");
                    if (!v.isEmpty()) status.put(p, v);
                }
                if (r != null && r.optBoolean(p)) remember.add(p);
            }
        }

        long time(String p) { JSONObject t = raw.optJSONObject("times"); return t == null ? 0 : t.optLong(p); }
        String name(String p) { JSONObject n = raw.optJSONObject("names"); return n == null ? p : n.optString(p, p); }
        /** What's logged, else "excused" on an excused day, else null (store.statusOf). */
        String statusOf(String p) {
            String v = status.get(p);
            return v == null && excused ? "excused" : v;
        }
    }

    /** Build from the stored snapshot, queue and last tap. Null when there's no snapshot for today. */
    public static WidgetModel build(Context c, long now, boolean ignoreTimesOnly) {
        return build(WidgetStore.read(c), now, DateFormat.is24HourFormat(c), WidgetStore.pending(c), WidgetStore.readTap(c), ignoreTimesOnly);
    }

    /**
     * ignoreTimesOnly: work out the full picture even when "Show times only" is on (the unlocked form of the
     * ongoing notification and the tile).
     */
    public static WidgetModel build(String json, long now, boolean use24, JSONArray pending, String tapJson, boolean ignoreTimesOnly) {
        if (json == null) return null;
        try {
            JSONObject snap = new JSONObject(json);
            if (snap.optInt("v") != SNAPSHOT_VERSION) return null;
            JSONArray days = snap.optJSONArray("days");
            if (days == null) return null;
            List<Day> all = new ArrayList<>();
            Map<String, Day> byDate = new HashMap<>();
            for (int k = 0; k < days.length(); k++) {
                Day d = new Day(days.getJSONObject(k));
                all.add(d);
                byDate.put(d.date, d);
            }
            String todayKey = dayKey(now);
            int i = -1;
            for (int k = 0; k < all.size(); k++) if (todayKey.equals(all.get(k).date)) i = k;
            if (i < 0) return null;
            Day today = all.get(i);
            Day yesterday = i > 0 ? all.get(i - 1) : null;
            Day tomorrow = i + 1 < all.size() ? all.get(i + 1) : null;

            overlay(byDate, pending);

            WidgetModel m = new WidgetModel();
            m.labels.putAll(labelsOf(json));
            m.builtAt = now;
            m.use24 = use24;
            m.date = todayKey;
            m.hijri = today.raw.optString("hijri", "");
            String g = snap.optString("gender", "");
            m.gender = snap.isNull("gender") || g.isEmpty() ? null : g;
            m.excusedToday = snap.has("excused") ? snap.optBoolean("excused") : today.excused;
            m.showTimesOnly = snap.optBoolean("showTimesOnly", false) && !ignoreTimesOnly;
            m.ongoingNow = snap.optBoolean("ongoingNow", false);
            m.lockDots = snap.optBoolean("lockDots", false);

            // The prayer whose time is in now (times.currentWindow)
            Day curDay = null;
            String curP = null;
            long curEnd = 0;
            if (now < today.time("Fajr")) {
                if (yesterday != null) { curDay = yesterday; curP = "Isha"; curEnd = today.time("Fajr"); }
            } else {
                for (int k = PRAYERS.length - 1; k >= 0; k--) {
                    String p = PRAYERS[k];
                    if (now < today.time(p)) continue;
                    long end = p.equals("Fajr") ? today.time("Sunrise")
                        : p.equals("Isha") ? (tomorrow != null ? tomorrow.time("Fajr") : 0)
                        : today.time(PRAYERS[k + 1]);
                    if (end > 0 && now < end) { curDay = today; curP = p; curEnd = end; }
                    break;
                }
            }

            // The next prayer to begin
            Day nextDay = null;
            String nextP = null;
            for (String p : PRAYERS) if (today.time(p) > now) { nextDay = today; nextP = p; break; }
            if (nextP == null && tomorrow != null) { nextDay = tomorrow; nextP = "Fajr"; }
            if (nextP != null) {
                m.nextP = nextP;
                m.nextName = nextDay.name(nextP);
                m.nextTimeLabel = fmtTime(nextDay.time(nextP), use24);
            }

            // The last tap, while Undo is offered and the log still stands
            Tap tap = parseTap(tapJson);
            if (tap != null && curDay != null && tap.date.equals(curDay.date) && tap.p.equals(curP) && now - tap.at < UNDO_MS && tap.at <= now + 60_000L) {
                boolean stands = "remember".equals(tap.status) ? curDay.remember.contains(curP) : tap.status.equals(curDay.status.get(curP));
                if (!stands) tap = null;
            } else tap = null;

            if (curDay != null && m.showTimesOnly) {
                m.mode = "now";
            } else if (curDay != null && tap != null) {
                m.mode = "logged";
                m.tap = tap;
            } else if (curDay != null && curDay.statusOf(curP) == null) {
                m.mode = "now";
                m.action = "log";
            } else if (curDay != null && "excused".equals(curDay.statusOf(curP)) && !curDay.remember.contains(curP)) {
                m.mode = "now";
                m.action = "remember";
            } else if (nextP != null) {
                m.mode = "next";
            } else {
                return null;
            }

            if (!"next".equals(m.mode)) {
                long best = curP.equals("Isha") ? curDay.raw.optLong("ishaBest", 0) : 0;
                boolean toBest = best > 0 && now < best;
                m.focusP = curP;
                m.focusName = curDay.name(curP);
                m.focusDate = curDay.date;
                m.focusTime = curDay.time(curP);
                m.focusEnd = curEnd;
                m.focusEndLabel = fmtTime(curEnd, use24);
                m.countdownTo = toBest ? best : curEnd;
                m.countdownLabel = toBest ? m.label("toMiddle") + " · " + fmtTime(best, use24)
                    : m.label("left") + " · " + m.label("until") + " " + m.focusEndLabel;
            } else {
                m.focusP = nextP;
                m.focusName = nextDay.name(nextP);
                m.focusDate = nextDay.date;
                m.focusTime = nextDay.time(nextP);
                m.countdownTo = m.focusTime;
                m.countdownLabel = m.label("begins", m.focusName, fmtTime(m.focusTime, use24));
            }
            m.focusTimeLabel = fmtTime(m.focusTime, use24);

            boolean focusToday = todayKey.equals(m.focusDate);
            for (String p : PRAYERS) {
                Prayer x = new Prayer();
                x.p = p;
                x.name = today.name(p);
                x.time = today.time(p);
                x.timeLabel = fmtTime(x.time, use24);
                x.focus = focusToday && p.equals(m.focusP);
                x.begun = x.time <= now;
                String s = today.statusOf(p);
                boolean inWindow = curDay == today && p.equals(curP);
                if (s != null) x.state = s;
                else if (inWindow) x.state = "now";
                else x.state = x.begun ? "due" : "upcoming";
                m.prayers.add(x);
            }

            // Next change: any prayer start, sunrise, middle of the night, the end of Undo, or midnight
            long nc = nextMidnight(now);
            for (Day d : all) {
                JSONObject t = d.raw.optJSONObject("times");
                if (t != null) for (java.util.Iterator<String> it = t.keys(); it.hasNext(); ) {
                    long b = t.optLong(it.next());
                    if (b > now && b < nc) nc = b;
                }
                long best = d.raw.optLong("ishaBest", 0);
                if (best > now && best < nc) nc = best;
            }
            if (m.tap != null && m.tap.at + UNDO_MS > now && m.tap.at + UNDO_MS < nc) nc = m.tap.at + UNDO_MS;
            m.nextChange = nc;
            return m;
        } catch (Exception e) {
            return null;
        }
    }

    static Tap parseTap(String json) {
        if (json == null) return null;
        try {
            JSONObject o = new JSONObject(json);
            Tap t = new Tap();
            t.id = o.optString("id");
            t.date = o.optString("date");
            t.p = o.optString("prayer");
            t.status = o.optString("status");
            t.at = o.optLong("at");
            if (t.date.isEmpty() || t.p.isEmpty() || t.status.isEmpty() || t.at <= 0) return null;
            return t;
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Lay the unmerged queue over the snapshot, in time order, the way src/pending.js will apply it: a log sets the
     * status (or ticks remembrance), an undo puts back what the latest log of that prayer replaced (nothing, when
     * that log was already merged: buttons only show for open prayers).
     */
    private static void overlay(Map<String, Day> byDate, JSONArray pending) {
        if (pending == null || pending.length() == 0) return;
        List<JSONObject> list = new ArrayList<>();
        for (int k = 0; k < pending.length(); k++) {
            JSONObject e = pending.optJSONObject(k);
            if (e != null) list.add(e);
        }
        Collections.sort(list, (a, b) -> Long.compare(a.optLong("at"), b.optLong("at")));
        Map<String, List<String[]>> undoStack = new HashMap<>(); // date|p → [kind, previous value]
        for (JSONObject e : list) {
            Day d = byDate.get(e.optString("date"));
            String p = e.optString("prayer"), st = e.optString("status");
            if (d == null || !Arrays.asList(PRAYERS).contains(p)) continue;
            String key = d.date + "|" + p;
            List<String[]> stack = undoStack.get(key);
            if (stack == null) { stack = new ArrayList<>(); undoStack.put(key, stack); }
            switch (st) {
                case "congregation":
                case "ontime":
                    stack.add(new String[] { "status", d.status.get(p) });
                    d.status.put(p, st);
                    break;
                case "remember":
                    if (!"excused".equals(d.statusOf(p))) break;
                    stack.add(new String[] { "remember", d.remember.contains(p) ? "1" : null });
                    d.remember.add(p);
                    break;
                case "undo":
                    if (!stack.isEmpty()) {
                        String[] last = stack.remove(stack.size() - 1);
                        if ("status".equals(last[0])) { if (last[1] == null) d.status.remove(p); else d.status.put(p, last[1]); }
                        else if (last[1] == null) d.remember.remove(p);
                    } else if (d.remember.contains(p) && "excused".equals(d.statusOf(p))) {
                        d.remember.remove(p); // merged earlier: the tap was on an open prayer
                    } else {
                        d.status.remove(p);
                    }
                    break;
                default:
                    break;
            }
        }
    }

    /** Whether the snapshot's day `date` has prayer `p` begun at `now` (the one-tap rule). */
    public static boolean begun(String json, String date, String p, long now) {
        try {
            JSONArray days = new JSONObject(json).optJSONArray("days");
            for (int k = 0; days != null && k < days.length(); k++) {
                JSONObject d = days.getJSONObject(k);
                if (!date.equals(d.optString("date"))) continue;
                long t = d.optJSONObject("times").optLong(p);
                return t > 0 && t <= now;
            }
        } catch (Exception ignored) { /* no snapshot */ }
        return false;
    }
}
