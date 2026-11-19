package com.zad.app.widget;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import com.zad.app.R;

/**
 * The optional ongoing "Now" notification (Android; off by default, snapshot.ongoingNow from More → Widgets):
 * "ʿAsr · ends 16:05" with a live countdown and the one-tap buttons (brothers: Congregation and On time; sisters:
 * On time; excused days: Remembrance at prayer time), "ʿAsr logged ✓" with Undo after a tap, or "Zuhr begins 11:50"
 * when nothing is open. Low importance and silent; redrawn with the widgets at every boundary (WidgetUpdater).
 * With "Show times only" on, it is private: the lock screen shows a public version with the times only.
 * Needs the notification permission (Android 13+); without it nothing is posted.
 * Android 14+ lets people swipe away ongoing notifications; it comes back at the next boundary or app open.
 */
final class NowNotification {
    static final String CHANNEL = "zad_now";
    static final int ID = 73010;
    private static final int COLOR = 0xFF0F3D2E;

    private NowNotification() {}

    static boolean allowed(Context c) {
        if (Build.VERSION.SDK_INT >= 33
            && ContextCompat.checkSelfPermission(c, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return false;
        return NotificationManagerCompat.from(c).areNotificationsEnabled();
    }

    static void update(Context c, long now) {
        NotificationManagerCompat nm = NotificationManagerCompat.from(c);
        String json = WidgetStore.read(c);
        if (!WidgetModel.flag(json, "ongoingNow") || !allowed(c)) { nm.cancel(ID); return; }
        WidgetModel full = WidgetModel.build(c, now, true);
        if (full == null) { nm.cancel(ID); return; }
        ensureChannel(c);
        boolean timesOnly = WidgetModel.flag(json, "showTimesOnly");

        NotificationCompat.Builder b = base(c, full);
        addActions(c, b, full);
        if (timesOnly) {
            WidgetModel pub = WidgetModel.build(c, now, false);
            b.setVisibility(NotificationCompat.VISIBILITY_PRIVATE);
            if (pub != null) b.setPublicVersion(base(c, pub).build());
        } else {
            b.setVisibility(NotificationCompat.VISIBILITY_PUBLIC);
        }
        try { nm.notify(ID, b.build()); } catch (SecurityException e) { /* permission withdrawn meanwhile */ }
    }

    /** Title, text and countdown. With Show times only (m.showTimesOnly) nothing about what's logged. */
    private static NotificationCompat.Builder base(Context c, WidgetModel m) {
        String title, text;
        if ("next".equals(m.mode)) {
            title = m.countdownLabel; // "Zuhr begins 11:50"
            text = null;
        } else if ("logged".equals(m.mode) && !m.showTimesOnly) {
            title = WidgetRenderer.tapLong(m);
            text = m.label("ends", m.focusName, m.focusEndLabel);
        } else {
            title = m.label("ends", m.focusName, m.focusEndLabel); // "ʿAsr · ends 16:05"
            text = m.nextName != null ? m.label("nextAt", m.nextName, m.nextTimeLabel) : null;
        }
        NotificationCompat.Builder b = new NotificationCompat.Builder(c, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_zad)
            .setColor(COLOR)
            .setContentTitle(title)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setLocalOnly(true)
            .setShowWhen(true)
            .setWhen(m.countdownTo)
            .setUsesChronometer(true)
            .setChronometerCountDown(true)
            .setCategory(NotificationCompat.CATEGORY_STATUS)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(WidgetRenderer.link(c, "zad://open?v=home"));
        if (text != null) b.setContentText(text);
        return b;
    }

    private static void addActions(Context c, NotificationCompat.Builder b, WidgetModel m) {
        if ("now".equals(m.mode) && "log".equals(m.action)) {
            if (!m.sister()) b.addAction(action(c, m.label("congregation"), m.focusDate, m.focusP, "congregation"));
            b.addAction(action(c, m.label("onTime"), m.focusDate, m.focusP, "ontime"));
        } else if ("now".equals(m.mode) && "remember".equals(m.action)) {
            b.addAction(action(c, m.label("remembrance"), m.focusDate, m.focusP, "remember"));
        } else if ("logged".equals(m.mode) && m.tap != null) {
            b.addAction(action(c, m.label("undo"), m.tap.date, m.tap.p, "undo"));
        }
    }

    private static NotificationCompat.Action action(Context c, String title, String date, String p, String status) {
        PendingIntent pi = LogActionReceiver.pending(c, date, p, status, "ongoing");
        // A log needs no unlock (it only queues; the app applies its rules on the next open)
        return new NotificationCompat.Action.Builder(0, title, pi).setAuthenticationRequired(false).build();
    }

    private static void ensureChannel(Context c) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null || nm.getNotificationChannel(CHANNEL) != null) return;
        NotificationChannel ch = new NotificationChannel(CHANNEL, c.getString(R.string.zw_now_channel), NotificationManager.IMPORTANCE_LOW);
        ch.setDescription(c.getString(R.string.zw_now_channel_desc));
        ch.setSound(null, null);
        ch.enableVibration(false);
        ch.setShowBadge(false);
        nm.createNotificationChannel(ch);
    }
}
