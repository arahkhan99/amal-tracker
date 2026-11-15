import Foundation
import Capacitor
import WidgetKit

/// Bridge from the web app to the home-screen and lock-screen widgets (src/widget-bridge.js).
/// setSnapshot({ json }) stores the widget snapshot (src/widgets.js buildSnapshot) in the App Group's
/// UserDefaults and asks WidgetKit to redraw. The widget extension (ios/App/ZadWidget) reads only this.
/// Registered by ZadBridgeViewController (it is a local plugin, not an npm package).
@objc(ZadWidgetsPlugin)
public class ZadWidgetsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ZadWidgetsPlugin"
    public let jsName = "ZadWidgets"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setSnapshot", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "reload", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getSnapshot", returnType: CAPPluginReturnPromise)
    ]

    /// Must match ZadWidget/WidgetModel.swift and the App Group entitlement of both targets.
    static let appGroup = "group.com.zad.app"
    static let key = "snapshot"

    /// The shared store. Without the App Group entitlement (no paid developer account yet) this falls back
    /// to the app's own defaults: writes still succeed, the widget just can't see them.
    private var store: UserDefaults {
        UserDefaults(suiteName: ZadWidgetsPlugin.appGroup) ?? .standard
    }

    @objc func setSnapshot(_ call: CAPPluginCall) {
        guard let json = call.getString("json"), !json.isEmpty else {
            call.reject("json is required")
            return
        }
        store.set(json, forKey: ZadWidgetsPlugin.key)
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    @objc func reload(_ call: CAPPluginCall) {
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    @objc func getSnapshot(_ call: CAPPluginCall) {
        if let json = store.string(forKey: ZadWidgetsPlugin.key) {
            call.resolve(["json": json])
        } else {
            call.resolve([:])
        }
    }
}
