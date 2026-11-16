import Foundation

/// The snapshot the app writes (src/widgets.js buildSnapshot, version 1). Times are epoch milliseconds.
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

/// What a widget shows at a moment. Port of widgetModel() in src/widgets.js (tests/widgets.test.js is
/// the specification), plus windowStart for the lock-screen progress bar.
struct WidgetModel {
    static let prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]

    struct Prayer: Identifiable {
        let p: String
        let name: String
        let time: Date
        let state: String // congregation | ontime | madeup | missed | excused | due | next | upcoming
        let sunnah: Bool?
        let focus: Bool
        var id: String { p }
        var isPrayed: Bool { ["congregation", "ontime", "madeup"].contains(state) }
    }

    let date: String
    let hijri: String
    let isNow: Bool // true: a prayer's time is in and it isn't logged; false: counting down to the next one
    let focusP: String
    let focusName: String
    let focusDate: String
    let focusTime: Date
    let countdownTo: Date
    let countdownLabel: String
    let windowStart: Date // start of the stretch the countdown runs across (for progress bars)
    let logURL: URL // the hero / Prayed button
    let prayers: [Prayer]
    let prayed: Int
    let deeds: Snapshot.Deeds?
    let makeups: Int?
    let nextChange: Date?
    let labels: [String: String]

    static let defaultLabels: [String: String] = [
        "next": "Next", "now": "Now", "left": "left", "until": "until", "toMiddle": "to middle of night",
        "prayed": "Prayed", "logToday": "Log today", "goodDeeds": "Good Deeds", "makeups": "{n} make-ups left",
        "makeupsOne": "{n} make-up left", "addDeed": "+ Add deed", "prayers": "prayers", "nextPrayer": "Next prayer",
        "stale": "Open Zad to update",
    ]

    static func label(_ key: String, _ labels: [String: String]) -> String {
        labels[key] ?? defaultLabels[key] ?? key
    }
    func label(_ key: String) -> String { WidgetModel.label(key, labels) }

    var makeupsLabel: String? {
        guard let n = makeups else { return nil }
        return label(n == 1 ? "makeupsOne" : "makeups").replacingOccurrences(of: "{n}", with: String(n))
    }

    static func dayKey(_ d: Date) -> String {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = .current
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: d)
    }

    /// "5:12 AM"
    static func fmt12(_ d: Date) -> String {
        let c = Calendar.current.dateComponents([.hour, .minute], from: d)
        let h = c.hour ?? 0, m = c.minute ?? 0
        return String(format: "%d:%02d %@", h % 12 == 0 ? 12 : h % 12, m, h < 12 ? "AM" : "PM")
    }

    /// "1h 24m" / "24m", minutes rounded up (fmtCountdown in src/widgets.js).
    static func fmtCountdown(_ seconds: TimeInterval) -> String {
        let m = seconds <= 0 ? 0 : Int((seconds / 60).rounded(.up))
        let h = m / 60
        return (h > 0 ? "\(h)h " : "") + "\(m % 60)m"
    }

    func countdown(at now: Date) -> String { WidgetModel.fmtCountdown(countdownTo.timeIntervalSince(now)) }

    /// now...countdownTo for the self-updating countdown (Text(timerInterval:)); never an inverted range.
    func timerRange(at now: Date) -> ClosedRange<Date> { now...max(now, countdownTo) }

    /// windowStart...countdownTo for the self-updating lock-screen bar (ProgressView(timerInterval:)).
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
    static func build(_ snap: Snapshot?, now: Date) -> WidgetModel? {
        guard let snap = snap, snap.v == 1 else { return nil }
        let todayKey = dayKey(now)
        guard let i = snap.days.firstIndex(where: { $0.date == todayKey }) else { return nil }
        let today = snap.days[i]
        let yesterday = i > 0 ? snap.days[i - 1] : nil
        let tomorrow = i + 1 < snap.days.count ? snap.days[i + 1] : nil
        let labels = defaultLabels.merging(snap.labels ?? [:]) { _, new in new }
        let nowMs = now.timeIntervalSince1970 * 1000
        func t(_ d: Snapshot.Day, _ p: String) -> Double { d.times[p] ?? 0 }
        func status(_ d: Snapshot.Day, _ p: String) -> String? {
            if let s0 = d.status?[p], let s = s0 { return s }
            return d.excused == true ? "excused" : nil
        }
        func date(_ ms: Double) -> Date { Date(timeIntervalSince1970: ms / 1000) }

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
        let curOpen = cur.map { status($0.day, $0.p) == nil } ?? false

        // The next prayer to start
        var next: (day: Snapshot.Day, p: String)?
        if let np = prayers.first(where: { t(today, $0) > nowMs }) { next = (today, np) }
        else if let tm = tomorrow { next = (tm, "Fajr") }

        let isNow: Bool, focusP: String, focusDay: Snapshot.Day, countdownTo: Double, countdownLabel: String, link: URL
        var windowStart: Double
        if curOpen, let c = cur {
            isNow = true
            focusP = c.p; focusDay = c.day
            let best = c.p == "Isha" ? (c.day.ishaBest ?? 0) : 0
            let toBest = best > 0 && nowMs < best
            countdownTo = toBest ? best : c.end
            countdownLabel = label(toBest ? "toMiddle" : "left", labels)
            link = WidgetModel.logLink(c.p, c.day.date)
            windowStart = t(c.day, c.p)
        } else if let n = next {
            isNow = false
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
        for p in prayers {
            let focus = focusToday && p == focusP
            var state: String
            if let s = status(today, p) { state = s }
            else if focus { state = isNow ? "due" : "next" }
            else { state = t(today, p) <= nowMs ? "due" : "upcoming" }
            let sunnah: Bool? = today.sunnah?[p] ?? nil
            list.append(Prayer(p: p, name: today.names[p] ?? p, time: date(t(today, p)), state: state, sunnah: sunnah, focus: focus))
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
            date: todayKey, hijri: today.hijri ?? "", isNow: isNow,
            focusP: focusP, focusName: focusDay.names[focusP] ?? focusP, focusDate: focusDay.date,
            focusTime: date(t(focusDay, focusP)), countdownTo: date(countdownTo), countdownLabel: countdownLabel,
            windowStart: date(windowStart), logURL: link, prayers: list,
            prayed: list.filter { $0.isPrayed }.count, deeds: deeds, makeups: snap.makeups,
            nextChange: nextChange, labels: labels)
    }

    /// Sample day for previews and the widget gallery (Thu 5 Nov, ʿAsr next at 3:42 PM).
    static var placeholder: WidgetModel {
        let now = Date()
        let cal = Calendar.current
        func at(_ h: Int, _ m: Int) -> Date { cal.date(bySettingHour: h, minute: m, second: 0, of: now) ?? now }
        let ps: [Prayer] = [
            Prayer(p: "Fajr", name: "Fajr", time: at(5, 12), state: "ontime", sunnah: true, focus: false),
            Prayer(p: "Dhuhr", name: "Zuhr", time: at(12, 31), state: "congregation", sunnah: true, focus: false),
            Prayer(p: "Asr", name: "ʿAsr", time: at(15, 42), state: "next", sunnah: false, focus: true),
            Prayer(p: "Maghrib", name: "Maghrib", time: at(17, 54), state: "upcoming", sunnah: false, focus: false),
            Prayer(p: "Isha", name: "ʿIshāʾ", time: at(19, 15), state: "upcoming", sunnah: false, focus: false),
        ]
        let deeds = Snapshot.Deeds(date: dayKey(now), done: 2, total: 5, items: [
            .init(name: "Qurʾān · 1 page", done: true), .init(name: "Morning adhkār", done: true),
            .init(name: "Ṣadaqah", done: false), .init(name: "Evening adhkār", done: false), .init(name: "Call family", done: false),
        ])
        return WidgetModel(
            date: dayKey(now), hijri: "25 Jumada al-Ula 1448", isNow: false, focusP: "Asr", focusName: "ʿAsr",
            focusDate: dayKey(now), focusTime: now.addingTimeInterval(84 * 60), countdownTo: now.addingTimeInterval(84 * 60),
            countdownLabel: "until ʿAsr", windowStart: now.addingTimeInterval(-107 * 60), logURL: todayURL, prayers: ps,
            prayed: 2, deeds: deeds, makeups: 3, nextChange: nil, labels: defaultLabels)
    }
}
