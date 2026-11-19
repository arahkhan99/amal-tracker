import Foundation
import Capacitor
import WidgetKit

/// Bridge from the web app to the home-screen and lock-screen widgets and the Control (src/widget-bridge.js,
/// src/pending.js).
/// - setSnapshot({ json }) stores the widget snapshot (src/widgets.js buildSnapshot) in the App Group's
///   UserDefaults and asks WidgetKit to redraw. The widget extension (ios/App/ZadWidget) reads only this.
/// - getPending() → { logs: [...] } returns the one-tap logs the widgets / Control queued, and
///   clearPending({ ids: [...] }) removes the ones the app has merged.
/// Registered by ZadBridgeViewController (it is a local plugin, not an npm package).
@objc(ZadWidgetsPlugin)
public class ZadWidgetsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ZadWidgetsPlugin"
    public let jsName = "ZadWidgets"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setSnapshot", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "reload", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getSnapshot", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPending", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearPending", returnType: CAPPluginReturnPromise)
    ]

    /// Must match ZadWidget/WidgetModel.swift and the App Group entitlement of both targets.
    static let appGroup = "group.com.zad.app"
    static let key = "snapshot"

    /// The shared store. Without the App Group entitlement (no paid developer account yet) this falls back
    /// to the app's own defaults: writes still succeed, the widget just can't see them.
    private var store: UserDefaults {
        UserDefaults(suiteName: ZadWidgetsPlugin.appGroup) ?? .standard
    }

    private static func reloadWidgets() {
        WidgetCenter.shared.reloadAllTimelines()
        if #available(iOS 18.0, *) {
            ControlCenter.shared.reloadAllControls()
        }
    }

    @objc func setSnapshot(_ call: CAPPluginCall) {
        guard let json = call.getString("json"), !json.isEmpty else {
            call.reject("json is required")
            return
        }
        store.set(json, forKey: ZadWidgetsPlugin.key)
        ZadWidgetsPlugin.reloadWidgets()
        call.resolve()
    }

    @objc func reload(_ call: CAPPluginCall) {
        ZadWidgetsPlugin.reloadWidgets()
        call.resolve()
    }

    @objc func getSnapshot(_ call: CAPPluginCall) {
        if let json = store.string(forKey: ZadWidgetsPlugin.key) {
            call.resolve(["json": json])
        } else {
            call.resolve([:])
        }
    }

    /// { logs: [{ id, date, prayer, status, at, src }] }, oldest first. Entries that aren't well formed are left out.
    @objc func getPending(_ call: CAPPluginCall) {
        let entries = PendingQueue.withLock { PendingQueue.raw(store) }
        let logs: [JSObject] = entries.compactMap { o -> JSObject? in
            guard let id = o["id"] as? String, let date = o["date"] as? String,
                  let prayer = o["prayer"] as? String, let status = o["status"] as? String else { return nil }
            var out = JSObject()
            out["id"] = id
            out["date"] = date
            out["prayer"] = prayer
            out["status"] = status
            out["at"] = (o["at"] as? NSNumber)?.doubleValue ?? 0
            out["src"] = (o["src"] as? String) ?? "widget"
            return out
        }
        call.resolve(["logs": logs])
    }

    /// Removes the queued logs with these ids (the ones the app has merged), then redraws the widgets.
    @objc func clearPending(_ call: CAPPluginCall) {
        let ids = Set(call.getArray("ids", String.self) ?? [])
        if !ids.isEmpty {
            let store = self.store
            PendingQueue.withLock { () -> Void in
                let kept = PendingQueue.raw(store).filter { o in
                    guard let id = o["id"] as? String else { return false } // drop malformed entries too
                    return !ids.contains(id)
                }
                PendingQueue.write(kept, store)
            }
        }
        ZadWidgetsPlugin.reloadWidgets()
        call.resolve()
    }
}

/// The pending-log queue, app side. The widget extension has the same code (PendingStore in
/// ZadWidget/WidgetModel.swift); keep the key, the format and the lock file in step.
/// Format: App Group UserDefaults, key "pendingLogs", a UTF-8 JSON array string of
/// {"id","date","prayer","status","at","src"}.
enum PendingQueue {
    static let key = "pendingLogs"
    static let lockName = "pendingLogs.lock"

    /// flock() on a file in the App Group container, shared with the widget extension, so a widget tap and
    /// a clear can't overwrite each other. Without the App Group there is nothing to share, so no lock.
    static func withLock<T>(_ body: () -> T) -> T {
        guard let dir = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: ZadWidgetsPlugin.appGroup) else {
            return body()
        }
        let fd = open(dir.appendingPathComponent(lockName).path, O_CREAT | O_RDWR, 0o644)
        guard fd >= 0 else { return body() }
        defer { close(fd) }
        flock(fd, LOCK_EX)
        defer { flock(fd, LOCK_UN) }
        return body()
    }

    static func raw(_ store: UserDefaults) -> [[String: Any]] {
        var data: Data?
        if let s = store.string(forKey: key) { data = s.data(using: .utf8) } else { data = store.data(forKey: key) }
        guard let bytes = data,
              let arr = (try? JSONSerialization.jsonObject(with: bytes)) as? [Any] else { return [] }
        return arr.compactMap { $0 as? [String: Any] }
    }

    static func write(_ entries: [[String: Any]], _ store: UserDefaults) {
        if entries.isEmpty {
            store.removeObject(forKey: key)
            return
        }
        guard let data = try? JSONSerialization.data(withJSONObject: entries),
              let s = String(data: data, encoding: .utf8) else { return }
        store.set(s, forKey: key)
    }
}
