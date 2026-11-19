package com.zad.app;

import android.app.StatusBarManager;
import android.content.ComponentName;
import android.graphics.drawable.Icon;
import android.os.Build;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.zad.app.widget.WidgetStore;
import com.zad.app.widget.WidgetUpdater;
import com.zad.app.widget.ZadTileService;
import java.util.HashSet;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Bridge from the web app to the home-screen widgets, the Quick Settings tile and the ongoing "Now" notification
 * (src/widget-bridge.js, src/pending.js).
 * - setSnapshot({ json }) stores the snapshot (src/widgets.js buildSnapshot) and redraws everything.
 * - getPending() → { logs: [...] }: the one-tap queue the widgets, tile and notification wrote.
 * - clearPending({ ids: [...] }): remove the entries the app has handled (and anything malformed), then redraw.
 * - requestAddTile() → { result, added } on Android 13+ (the system's "Add tile" prompt; result is the
 *   StatusBarManager code: 2 added, 1 already added, 0 not added, 1000+ an error), { unsupported: true } before.
 */
@CapacitorPlugin(name = "ZadWidgets")
public class ZadWidgetsPlugin extends Plugin {

    @PluginMethod
    public void setSnapshot(PluginCall call) {
        String json = call.getString("json");
        if (json == null || json.isEmpty()) {
            call.reject("json is required");
            return;
        }
        WidgetStore.write(getContext(), json);
        WidgetUpdater.updateAll(getContext());
        call.resolve();
    }

    @PluginMethod
    public void reload(PluginCall call) {
        WidgetUpdater.updateAll(getContext());
        call.resolve();
    }

    @PluginMethod
    public void getSnapshot(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("json", WidgetStore.read(getContext()));
        call.resolve(ret);
    }

    @PluginMethod
    public void getPending(PluginCall call) {
        JSONArray all = WidgetStore.pending(getContext());
        JSArray logs = new JSArray();
        for (int i = 0; i < all.length(); i++) {
            JSONObject e = all.optJSONObject(i);
            if (e != null) logs.put(e);
        }
        JSObject ret = new JSObject();
        ret.put("logs", logs);
        call.resolve(ret);
    }

    @PluginMethod
    public void clearPending(PluginCall call) {
        JSArray ids = call.getArray("ids");
        Set<String> set = new HashSet<>();
        if (ids != null) for (int i = 0; i < ids.length(); i++) {
            String id = ids.optString(i, null);
            if (id != null) set.add(id);
        }
        WidgetStore.clearPending(getContext(), set);
        WidgetUpdater.updateAll(getContext());
        call.resolve();
    }

    @PluginMethod
    public void requestAddTile(PluginCall call) {
        if (Build.VERSION.SDK_INT < 33) {
            JSObject ret = new JSObject();
            ret.put("unsupported", true);
            call.resolve(ret);
            return;
        }
        StatusBarManager sbm = getContext().getSystemService(StatusBarManager.class);
        if (sbm == null) {
            JSObject ret = new JSObject();
            ret.put("unsupported", true);
            call.resolve(ret);
            return;
        }
        try {
            sbm.requestAddTileService(
                new ComponentName(getContext(), ZadTileService.class),
                getContext().getString(R.string.zw_tile_label),
                Icon.createWithResource(getContext(), R.drawable.ic_stat_zad),
                getContext().getMainExecutor(),
                result -> {
                    JSObject ret = new JSObject();
                    ret.put("result", result);
                    ret.put("added", result == StatusBarManager.TILE_ADD_REQUEST_RESULT_TILE_ADDED
                        || result == StatusBarManager.TILE_ADD_REQUEST_RESULT_TILE_ALREADY_ADDED);
                    call.resolve(ret);
                });
        } catch (Exception e) {
            call.reject("Could not ask to add the tile", e);
        }
    }
}
