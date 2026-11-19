package com.zad.app.widget;

import android.content.ComponentName;
import android.content.Context;
import android.graphics.drawable.Icon;
import android.os.Build;
import android.service.quicksettings.Tile;
import android.service.quicksettings.TileService;
import com.zad.app.R;

/**
 * Quick Settings tile (Android 7+): "Log ʿAsr · On time" while a prayer is open; one tap logs it On time through the
 * pending-log queue (as the small widget). After a tap it reads "ʿAsr logged ✓ · Undo" for a few minutes, and a
 * second tap undoes it. When nothing is open it is unavailable ("Nothing to log now", "Zuhr begins 11:50").
 * On an excused day it is unavailable too (remembrance is on the widget and the Now notification).
 * With "Show times only" on it never shows what is logged: while a prayer's time is in it reads
 * "Log ʿAsr · On time" (whatever is logged, also after a tap and on an excused day), otherwise unavailable with the
 * next time. A tap then logs On time only if the prayer is really open; otherwise it does nothing (no Undo).
 * It logs straight away, also on a locked phone (it only queues; nothing is shown that the lock screen hides).
 */
public class ZadTileService extends TileService {

    /** Ask the system to redraw the tile (it calls onStartListening when the panel is open). */
    static void requestUpdate(Context c) {
        try { TileService.requestListeningState(c, new ComponentName(c, ZadTileService.class)); }
        catch (Exception ignored) { /* tile not added, or not allowed right now */ }
    }

    @Override
    public void onStartListening() {
        super.onStartListening();
        refresh();
    }

    @Override
    public void onClick() {
        super.onClick();
        WidgetModel m = WidgetModel.build(this, System.currentTimeMillis(), true);
        if (m != null && "now".equals(m.mode) && "log".equals(m.action)) {
            LogActionReceiver.log(this, m.focusDate, m.focusP, "ontime", "tile");
        } else if (m != null && "logged".equals(m.mode) && m.tap != null && !timesOnly()) {
            LogActionReceiver.log(this, m.tap.date, m.tap.p, "undo", "tile");
        }
        refresh();
    }

    private boolean timesOnly() {
        return WidgetModel.flag(WidgetStore.read(this), "showTimesOnly");
    }

    private void refresh() {
        Tile t = getQsTile();
        if (t == null) return;
        boolean timesOnly = timesOnly();
        // Times only: the times-only model (mode "now" whenever a prayer's time is in, whatever is logged)
        WidgetModel m = WidgetModel.build(this, System.currentTimeMillis(), !timesOnly);
        String label, sub;
        int state;
        if (m != null && timesOnly && !"next".equals(m.mode)) {
            label = m.label("logTile", m.focusName, null);
            sub = m.label("onTime");
            state = Tile.STATE_ACTIVE;
        } else if (m != null && "now".equals(m.mode) && "log".equals(m.action)) {
            label = m.label("logTile", m.focusName, null);
            sub = m.label("onTime");
            state = Tile.STATE_ACTIVE;
        } else if (m != null && !timesOnly && "logged".equals(m.mode) && m.tap != null) {
            label = WidgetRenderer.tapLong(m);
            sub = m.label("undo");
            state = Tile.STATE_INACTIVE;
        } else {
            label = m != null ? m.label("nothingOpen") : getString(R.string.zw_tile_label);
            sub = m != null && "next".equals(m.mode) ? m.countdownLabel : null;
            state = Tile.STATE_UNAVAILABLE;
        }
        t.setIcon(Icon.createWithResource(this, R.drawable.ic_stat_zad));
        t.setState(state);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            t.setLabel(label);
            t.setSubtitle(sub);
            t.setContentDescription(sub != null ? label + ", " + sub : label);
        } else {
            t.setLabel(sub != null && state == Tile.STATE_ACTIVE ? label + " · " + sub : label);
        }
        t.updateTile();
    }
}
