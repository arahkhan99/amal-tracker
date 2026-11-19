import Foundation

/// The snapshot the app writes (src/widgets.js buildSnapshot, version 1). Times are epoch milliseconds.
/// Fields added for the one-tap widgets (all optional, so an older snapshot still decodes):
/// gender ("m" | "f" | null, null counts as "m"), excused (today), showTimesOnly, lockDots (default false),
/// and per day `remember` (remembrance at prayer time already logged in the app). ongoingNow is Android only.
struct Snapshot: Decodable {
    struct Day: Decodable {
        let date: String
        let hijri: String?
        let names: [String: String]
        let times: [String: Double]
        let ishaBest: Double?
        let status: [String: String?]?
        let sunnah: [String: Bool?]?
        let excused: Bool?
        let remember: [String: Bool?]?
    }
    struct DeedItem: Decodable {
        let name: String
        let done: Bool
    }
    struct Deeds: Decodable {
        let date: String
        let done: Int
        let total: Int
        let items: [DeedItem]
    }
    let v: Int
    let generatedAt: Double?
    let date: String
    let days: [Day]
    let makeups: Int?
    let deeds: Deeds?
    let labels: [String: String]?
    let gender: String?
    let excused: Bool?
    let showTimesOnly: Bool?
    let lockDots: Bool?
}

enum SnapshotStore {
    /// Must match ZadWidgetsPlugin.swift (app target) and the App Group entitlement of both targets.
    static let appGroup = "group.com.zad.app"
    static let key = "snapshot"

    static func load() -> Snapshot? {
        guard let json = UserDefaults(suiteName: appGroup)?.string(forKey: key),
              let data = json.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(Snapshot.self, from: data)
    }

    static func labels() -> [String: String] { load()?.labels ?? [:] }
}

// MARK: - Pending-log queue

/// One tap on a widget, the Control or a notification action, waiting for the app to merge it.
/// Shared protocol with Android and src/pending.js:
/// {"id","date":"YYYY-MM-DD","prayer":"Fajr|Dhuhr|Asr|Maghrib|Isha",
///  "status":"congregation"|"ontime"|"remember"|"undo","at":<epoch ms>,"src":"widget"|"notif"|"control"|"lock"}
struct PendingLog {
    let id: String
    let date: String
    let prayer: String
    let status: String
    let at: Double
    let src: String

    init(id: String = UUID().uuidString, date: String, prayer: String, status: String, at: Double, src: String) {
        self.id = id; self.date = date; self.prayer = prayer; self.status = status; self.at = at; self.src = src
    }

    init?(_ o: [String: Any]) {
        guard let id = o["id"] as? String, let date = o["date"] as? String,
              let prayer = o["prayer"] as? String, let status = o["status"] as? String else { return nil }
        self.id = id; self.date = date; self.prayer = prayer; self.status = status
        self.at = (o["at"] as? NSNumber)?.doubleValue ?? 0
        self.src = o["src"] as? String ?? "widget"
    }

    var json: [String: Any] {
        ["id": id, "date": date, "prayer": prayer, "status": status, "at": Int64(at), "src": src]
    }
}

/// The queue lives in the App Group's UserDefaults under "pendingLogs" as a UTF-8 **JSON array string**
/// (the same way the snapshot is stored). The app reads it with ZadWidgets.getPending() and removes merged
/// entries with clearPending({ ids }) (ZadWidgetsPlugin.swift keeps its own copy of this code, in the app target).
/// Read-modify-write is serialised across the app and the extension with flock() on a file in the group container.
enum PendingStore {
    static let key = "pendingLogs"
    static let lockName = "pendingLogs.lock"
    /// Oldest entries are dropped beyond this (the app hasn't been opened for a very long time).
    static let maxEntries = 300

    private static var defaults: UserDefaults? { UserDefaults(suiteName: SnapshotStore.appGroup) }

    static func withLock<T>(_ body: () -> T) -> T {
        guard let dir = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: SnapshotStore.appGroup) else {
            return body()
        }
        let fd = open(dir.appendingPathComponent(lockName).path, O_CREAT | O_RDWR, 0o644)
        guard fd >= 0 else { return body() }
        defer { close(fd) }
        flock(fd, LOCK_EX)
        defer { flock(fd, LOCK_UN) }
        return body()
    }

    /// The raw entries (an unlocked read; writes go through append, under the lock).
    static func raw() -> [[String: Any]] {
        guard let d = defaults else { return [] }
        var data: Data?
        if let s = d.string(forKey: key) { data = s.data(using: .utf8) } else { data = d.data(forKey: key) }
        guard let bytes = data,
              let arr = (try? JSONSerialization.jsonObject(with: bytes)) as? [Any] else { return [] }
        return arr.compactMap { $0 as? [String: Any] }
    }

    static func load() -> [PendingLog] { raw().compactMap { PendingLog($0) } }

    private static func write(_ entries: [[String: Any]]) {
        guard let d = defaults else { return }
        let kept = Array(entries.suffix(maxEntries))
        guard let data = try? JSONSerialization.data(withJSONObject: kept),
              let s = String(data: data, encoding: .utf8) else { return }
        d.set(s, forKey: key)
    }

    /// Locked read-modify-write: `decide` gets the parsed queue and returns the entry to append (or nil for none).
    @discardableResult
    static func append(_ decide: ([PendingLog]) -> PendingLog?) -> PendingLog? {
        withLock { () -> PendingLog? in
            var entries = raw()
            guard let e = decide(entries.compactMap { PendingLog($0) }) else { return nil }
            entries.append(e.json)
            write(entries)
            return e
        }
    }
}

// MARK: - Model

/// What a widget shows at a moment. Port of widgetModel() in src/widgets.js (tests/widgets.test.js is
/// the specification), plus windowStart for the lock-screen progress, the pending-log overlay and the
/// one-tap actions.
struct WidgetModel {
    static let prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]

    /// What the focused (current) prayer offers.
    enum Action: Equatable {
        case idle            // next mode, or Show times only: nothing to tap
        case buttons         // the prayer's time is in and it isn't logged: Congregation / On time
        case remembrance     // excused day, the prayer's time is in: "Remembrance at prayer time"
        case logged(String)  // logged from a widget (still in the queue): "ʿAsr logged ✓ · Undo"
    }

    struct Prayer: Identifiable {
        let p: String
        let name: String
        let time: Date
        let end: Date?
        /// congregation | ontime | madeup | missed | excused | now (time in, not logged) |
        /// late (time ended, not logged) | upcoming
        let state: String
        let sunnah: Bool?
        let focus: Bool
        let queued: Bool // the state comes from a widget tap the app hasn't merged yet
        var id: String { p }
        var isPrayed: Bool { ["congregation", "ontime", "madeup"].contains(state) }
        var begun: Bool { state != "upcoming" }
    }

    let date: String
    let hijri: String
    let isNow: Bool // true: focus is the prayer whose time is in now; false: counting down to the next one
    let action: Action
    let focusP: String
    let focusName: String
    let focusDate: String
    let focusTime: Date
    let countdownTo: Date
    let countdownLabel: String
    let windowStart: Date // start of the stretch the countdown runs across (for progress rings)
    let logURL: URL // the whole-widget tap
    let prayers: [Prayer]
    let prayed: Int
    let deeds: Snapshot.Deeds?
    let makeups: Int?
    let nextChange: Date?
    let labels: [String: String]
    let sister: Bool
    let showTimesOnly: Bool
    let lockDots: Bool
    let excusedToday: Bool
    /// The next prayer to start after now (in next mode, the focus itself).
    let upNextName: String?
    let upNextTime: Date?

    static let defaultLabels: [String: String] = [
        "next": "Next", "now": "Now", "left": "left", "until": "until", "toMiddle": "to middle of night",
        "prayed": "Prayed", "logToday": "Log today", "goodDeeds": "Good Deeds", "makeups": "{n} make-ups left",
        "makeupsOne": "{n} make-up left", "addDeed": "+ Add deed", "prayers": "prayers", "nextPrayer": "Next prayer",
        "stale": "Open Zad to update",
        "onTime": "On time", "congregation": "Congregation", "logged": "{p} logged ✓", "undo": "Undo",
        "begins": "{p} begins {t}", "beginsShort": "Begins {t}", "remembrance": "Remembrance at prayer time",
        "remembranceShort": "Remembrance", "notLogged": "Not logged", "madeup": "Made up", "missed": "Missed",
        "excused": "Excused", "logOnTime": "Log {p} · on time", "nothingOpen": "No prayer to log",
        "loggedShort": "Logged ✓", "in": "in",
    ]

    static func label(_ key: String, _ labels: [String: String]) -> String {
        labels[key] ?? defaultLabels[key] ?? key
    }
    func label(_ key: String) -> String { WidgetModel.label(key, labels) }
    /// A label with {p} (a prayer name) and {t} (a time) filled in.
    func fill(_ key: String, p: String? = nil, t: Date? = nil) -> String {
        var s = label(key)
        if let p = p { s = s.replacingOccurrences(of: "{p}", with: p) }
        if let t = t { s = s.replacingOccurrences(of: "{t}", with: WidgetModel.fmtTime(t)) }
        return s
    }

    var makeupsLabel: String? {
        guard let n = makeups else { return nil }
        return label(n == 1 ? "makeupsOne" : "makeups").replacingOccurrences(of: "{n}", with: String(n))
    }

    /// The label for a logged state ("On time", "Congregation", ...).
    func statusLabel(_ state: String) -> String {
        switch state {
        case "congregation": return label("congregation")
        case "ontime": return label("onTime")
        case "madeup": return label("madeup")
        case "missed": return label("missed")
        case "excused", "remember": return label("excused")
        case "late": return label("notLogged")
        default: return ""
        }
    }

    static func dayKey(_ d: Date) -> String {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = .current
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: d)
    }

    /// True when the phone shows 24-hour times (its region, or the 24-Hour Time switch).
    static let uses24h: Bool = {
        let fmt = DateFormatter.dateFormat(fromTemplate: "j", options: 0, locale: Locale.current) ?? ""
        return !fmt.contains("a")
    }()

    /// "16:05" or "4:05 PM", following the phone's 12/24-hour setting.
    static func fmtTime(_ d: Date) -> String {
        let c = Calendar.current.dateComponents([.hour, .minute], from: d)
        let h = c.hour ?? 0, m = c.minute ?? 0
        if uses24h { return String(format: "%02d:%02d", h, m) }
        return String(format: "%d:%02d %@", h % 12 == 0 ? 12 : h % 12, m, h < 12 ? "AM" : "PM")
    }

    /// "5:12 AM" (kept for callers that want 12-hour regardless).
    static func fmt12(_ d: Date) -> String {
        let c = Calendar.current.dateComponents([.hour, .minute], from: d)
        let h = c.hour ?? 0, m = c.minute ?? 0
        return String(format: "%d:%02d %@", h % 12 == 0 ? 12 : h % 12, m, h < 12 ? "AM" : "PM")
    }

    /// Whole minutes left, rounded up so it never shows 0 before the time (fmtCountdown in src/widgets.js).
    static func minutesLeft(_ seconds: TimeInterval) -> Int { seconds <= 0 ? 0 : Int((seconds / 60).rounded(.up)) }

    /// "1h 24m" / "24m"
    static func fmtCountdown(_ seconds: TimeInterval) -> String {
        let m = minutesLeft(seconds), h = m / 60
        return (h > 0 ? "\(h)h " : "") + "\(m % 60)m"
    }

    /// "1 h 24 min" / "24 min"
    static func fmtCountdownLong(_ seconds: TimeInterval) -> String {
        let m = minutesLeft(seconds), h = m / 60
        return (h > 0 ? "\(h) h " : "") + "\(m % 60) min"
    }

    /// "1:24" / "0:24"
    static func fmtCountdownClock(_ seconds: TimeInterval) -> String {
        let m = minutesLeft(seconds)
        return String(format: "%d:%02d", m / 60, m % 60)
    }

    func countdown(at now: Date) -> String { WidgetModel.fmtCountdown(countdownTo.timeIntervalSince(now)) }
    func countdownLong(at now: Date) -> String { WidgetModel.fmtCountdownLong(countdownTo.timeIntervalSince(now)) }
    func countdownClock(at now: Date) -> String { WidgetModel.fmtCountdownClock(countdownTo.timeIntervalSince(now)) }

    /// The focus prayer was logged from a widget and can be undone.
    var isLoggedAction: Bool {
        if case .logged = action { return true }
        return false
    }

    /// "left · until 16:05" (now) or "until Zuhr" (next).
    var countdownSub: String {
        isNow ? "\(countdownLabel) · \(label("until")) \(WidgetModel.fmtTime(countdownTo))" : countdownLabel
    }

    /// The moment the minutes shown by the countdown next change (for per-minute timeline entries).
    func nextMinuteTick(after t: Date) -> Date? {
        let remaining = countdownTo.timeIntervalSince(t)
        guard remaining > 0 else { return nil }
        let k = WidgetModel.minutesLeft(remaining)
        return countdownTo.addingTimeInterval(-Double((k - 1) * 60) + 0.5)
    }

    /// now...countdownTo for a self-updating countdown (Text(timerInterval:)); never an inverted range.
    func timerRange(at now: Date) -> ClosedRange<Date> { now...max(now, countdownTo) }

    /// windowStart...countdownTo for a self-updating bar (ProgressView(timerInterval:)).
    var progressRange: ClosedRange<Date> { windowStart...max(windowStart, countdownTo) }

    /// 0...1 of the way from windowStart to countdownTo.
    func progress(at now: Date) -> Double {
        let total = countdownTo.timeIntervalSince(windowStart)
        guard total > 0 else { return 0 }
        return min(1, max(0, now.timeIntervalSince(windowStart) / total))
    }

    static func logLink(_ p: String, _ date: String) -> URL {
        URL(string: "zad://log?p=\(p)&d=\(date)")!
    }
    static let todayURL = URL(string: "zad://today")!
    static func openURL(_ view: String) -> URL { URL(string: "zad://open?v=\(view)")! }

    /// Nil when there is no snapshot or it doesn't cover today.
    /// `pending` is the queue of widget taps the app hasn't merged yet; it is laid over the snapshot.
    /// `respectTimesOnly: false` works out the actions even when Show times only is on (the Control and the
    /// intents' own checks use it).
    static func build(_ snap: Snapshot?, pending: [PendingLog] = [], now: Date, respectTimesOnly: Bool = true) -> WidgetModel? {
        guard let snap = snap, snap.v >= 1 else { return nil }
        let todayKey = dayKey(now)
        guard let i = snap.days.firstIndex(where: { $0.date == todayKey }) else { return nil }
        let today = snap.days[i]
        let yesterday = i > 0 ? snap.days[i - 1] : nil
        let tomorrow = i + 1 < snap.days.count ? snap.days[i + 1] : nil
        let labels = defaultLabels.merging(snap.labels ?? [:]) { _, new in new }
        let timesOnly = respectTimesOnly && snap.showTimesOnly == true
        let nowMs = now.timeIntervalSince1970 * 1000
        func t(_ d: Snapshot.Day, _ p: String) -> Double { d.times[p] ?? 0 }
        func date(_ ms: Double) -> Date { Date(timeIntervalSince1970: ms / 1000) }
        func isExcused(_ d: Snapshot.Day) -> Bool { d.excused == true || (snap.excused == true && d.date == todayKey) }
        /// What the app has recorded (nil: nothing). On an excused day the app reports "excused" for every prayer.
        func recorded(_ d: Snapshot.Day, _ p: String) -> String? {
            if let s0 = d.status?[p], let s = s0 { return s }
            return isExcused(d) ? "excused" : nil
        }
        func remembered(_ d: Snapshot.Day, _ p: String) -> Bool {
            if let r0 = d.remember?[p], let r = r0 { return r }
            return false
        }
        // The latest queued entry per day and prayer; an "undo" cancels the widget's log
        var latest: [String: PendingLog] = [:]
        for e in pending.sorted(by: { $0.at < $1.at }) { latest[e.date + "|" + e.prayer] = e }
        func queued(_ d: Snapshot.Day, _ p: String) -> String? {
            guard let e = latest[d.date + "|" + p], e.status != "undo" else { return nil }
            return e.status
        }

        // The prayer whose time is in now (times.currentWindow)
        var cur: (day: Snapshot.Day, p: String, end: Double)?
        if nowMs < t(today, "Fajr") {
            if let y = yesterday { cur = (y, "Isha", t(today, "Fajr")) }
        } else {
            for k in stride(from: prayers.count - 1, through: 0, by: -1) {
                let p = prayers[k]
                if nowMs < t(today, p) { continue }
                let end: Double?
                switch p {
                case "Fajr": end = t(today, "Sunrise")
                case "Isha": end = tomorrow.map { t($0, "Fajr") }
                default: end = t(today, prayers[k + 1])
                }
                if let end = end, nowMs < end { cur = (today, p, end) }
                break
            }
        }

        // What the current prayer offers
        var curAction: Action?
        if let c = cur {
            let rec = recorded(c.day, c.p), q = queued(c.day, c.p)
            if timesOnly {
                curAction = .idle
            } else if isExcused(c.day) && (rec == nil || rec == "excused") {
                if let q = q { curAction = .logged(q) } else if !remembered(c.day, c.p) { curAction = .remembrance }
            } else if rec == nil {
                curAction = q.map { Action.logged($0) } ?? .buttons
            }
        }

        // The next prayer to start
        var next: (day: Snapshot.Day, p: String)?
        if let np = prayers.first(where: { t(today, $0) > nowMs }) { next = (today, np) }
        else if let tm = tomorrow { next = (tm, "Fajr") }

        let isNow: Bool, action: Action, focusP: String, focusDay: Snapshot.Day, countdownTo: Double
        let countdownLabel: String, link: URL
        var windowStart: Double
        if let c = cur, let a = curAction {
            isNow = true
            action = a
            focusP = c.p; focusDay = c.day
            let best = c.p == "Isha" ? (c.day.ishaBest ?? 0) : 0
            let toBest = best > 0 && nowMs < best
            countdownTo = toBest ? best : c.end
            countdownLabel = label(toBest ? "toMiddle" : "left", labels)
            link = WidgetModel.logLink(c.p, c.day.date)
            windowStart = t(c.day, c.p)
        } else if let n = next {
            isNow = false
            action = .idle
            focusP = n.p; focusDay = n.day
            countdownTo = t(n.day, n.p)
            countdownLabel = label("until", labels) + " " + (n.day.names[n.p] ?? n.p)
            link = WidgetModel.todayURL
            // From the last prayer start (or sunrise) before now
            let starts = (yesterday.map { [t($0, "Isha")] } ?? []) + (prayers + ["Sunrise"]).map { t(today, $0) }
            windowStart = starts.filter { $0 <= nowMs }.max() ?? (nowMs - 3_600_000)
        } else {
            return nil
        }
        if windowStart <= 0 { windowStart = nowMs - 3_600_000 }

        let focusToday = focusDay.date == todayKey
        var list: [Prayer] = []
        for (k, p) in prayers.enumerated() {
            let focus = focusToday && p == focusP
            let start = t(today, p)
            var endMs: Double?
            switch p {
            case "Fajr": endMs = today.times["Sunrise"]
            case "Isha": endMs = tomorrow.map { t($0, "Fajr") }
            default: endMs = t(today, prayers[k + 1])
            }
            var state: String
            var fromQueue = false
            let rec = recorded(today, p)
            if let rec = rec, !(rec == "excused" && queued(today, p) != nil) {
                state = rec
            } else if let q = queued(today, p) {
                state = q == "remember" ? "excused" : q
                fromQueue = true
            } else if start > nowMs {
                state = "upcoming"
            } else if let e = endMs, nowMs < e {
                state = "now"
            } else {
                state = "late"
            }
            let sunnah: Bool? = today.sunnah?[p] ?? nil
            list.append(Prayer(p: p, name: today.names[p] ?? p, time: date(start), end: endMs.map(date), state: state,
                               sunnah: sunnah, focus: focus, queued: fromQueue))
        }

        var deeds = snap.deeds
        if let d = deeds, d.date != todayKey {
            deeds = Snapshot.Deeds(date: d.date, done: 0, total: d.total, items: d.items.map { Snapshot.DeedItem(name: $0.name, done: false) })
        }

        // Next boundary: any prayer start, sunrise, middle of the night, or midnight
        var bounds: [Double] = []
        for d in snap.days { bounds += Array(d.times.values); bounds.append(d.ishaBest ?? 0) }
        if let midnight = Calendar.current.date(byAdding: .day, value: 1, to: Calendar.current.startOfDay(for: now)) {
            bounds.append(midnight.timeIntervalSince1970 * 1000)
        }
        let nextChange = bounds.filter { $0 > nowMs }.min().map(date)

        return WidgetModel(
            date: todayKey, hijri: today.hijri ?? "", isNow: isNow, action: action,
            focusP: focusP, focusName: focusDay.names[focusP] ?? focusP, focusDate: focusDay.date,
            focusTime: date(t(focusDay, focusP)), countdownTo: date(countdownTo), countdownLabel: countdownLabel,
            windowStart: date(windowStart), logURL: link, prayers: list,
            prayed: list.filter { $0.isPrayed }.count, deeds: deeds, makeups: snap.makeups,
            nextChange: nextChange, labels: labels, sister: snap.gender == "f", showTimesOnly: timesOnly,
            lockDots: snap.lockDots == true, excusedToday: isExcused(today),
            upNextName: next.map { $0.day.names[$0.p] ?? $0.p }, upNextTime: next.map { date(t($0.day, $0.p)) })
    }

    /// Sample day for previews and the widget gallery (ʿAsr open, 1 h 27 min left).
    static var placeholder: WidgetModel {
        let now = Date()
        let cal = Calendar.current
        func at(_ h: Int, _ m: Int) -> Date { cal.date(bySettingHour: h, minute: m, second: 0, of: now) ?? now }
        let asrStart = now.addingTimeInterval(-17 * 60), asrEnd = now.addingTimeInterval(87 * 60)
        let ps: [Prayer] = [
            Prayer(p: "Fajr", name: "Fajr", time: at(5, 52), end: at(7, 20), state: "ontime", sunnah: true, focus: false, queued: false),
            Prayer(p: "Dhuhr", name: "Zuhr", time: at(11, 56), end: asrStart, state: "congregation", sunnah: true, focus: false, queued: false),
            Prayer(p: "Asr", name: "ʿAsr", time: asrStart, end: asrEnd, state: "now", sunnah: false, focus: true, queued: false),
            Prayer(p: "Maghrib", name: "Maghrib", time: asrEnd, end: asrEnd.addingTimeInterval(95 * 60), state: "upcoming", sunnah: false, focus: false, queued: false),
            Prayer(p: "Isha", name: "ʿIshāʾ", time: asrEnd.addingTimeInterval(95 * 60), end: nil, state: "upcoming", sunnah: false, focus: false, queued: false),
        ]
        return WidgetModel(
            date: dayKey(now), hijri: "", isNow: true, action: .buttons, focusP: "Asr", focusName: "ʿAsr",
            focusDate: dayKey(now), focusTime: asrStart, countdownTo: asrEnd, countdownLabel: "left",
            windowStart: asrStart, logURL: todayURL, prayers: ps, prayed: 2, deeds: nil, makeups: nil, nextChange: nil,
            labels: defaultLabels, sister: false, showTimesOnly: false, lockDots: true, excusedToday: false,
            upNextName: "Maghrib", upNextTime: asrEnd)
    }
}
