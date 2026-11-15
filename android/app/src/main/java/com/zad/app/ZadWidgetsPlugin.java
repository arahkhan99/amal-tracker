package com.zad.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.zad.app.widget.WidgetStore;
import com.zad.app.widget.WidgetUpdater;

/**
 * Bridge from the web app to the home-screen widgets (src/widget-bridge.js).
 * setSnapshot({ json }) stores the widget snapshot (src/widgets.js buildSnapshot) in SharedPreferences
 * and redraws every placed widget. The widgets read only this snapshot.
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
}
