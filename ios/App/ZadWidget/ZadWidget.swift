import WidgetKit
import SwiftUI
import AppIntents
import UserNotifications

// Zad widgets: home screen small / medium / large with one-tap logging (App Intents, iOS 17+; on iOS 16 a
// tap opens the log sheet), lock-screen inline / circular / rectangular, and the iOS 18 Control.
// Designs: design-review/mockups2/redesign/widgets (colours: final/og, variant A "OG Calm").
// Data: the snapshot the app writes to the App Group, with the pending-log queue laid over it (WidgetModel.swift).
// Setup: docs/build/widgets.md. The code compiles for an iOS 16 deployment target; iOS 17/18 APIs are guarded.

@main
struct ZadWidgetBundle: WidgetBundle {
    var body: some Widget {
        ZadHomeWidget()
        ZadLockWidget()
        if #available(iOS 18.0, *) {
            ZadLogControl()
        }
    }
}

// MARK: - Timeline

struct ZadEntry: TimelineEntry {
    let date: Date
    let model: WidgetModel?
    let staleLabel: String
}

struct ZadProvider: TimelineProvider {
    /// Per-minute entries cover this far ahead; then the timeline ends and WidgetKit asks for a new one.
    static let minuteHorizon: TimeInterval = 3 * 3600
    static let maxEntries = 400

    func placeholder(in context: Context) -> ZadEntry {
        ZadEntry(date: Date(), model: .placeholder, staleLabel: WidgetModel.label("stale", [:]))
    }

    func getSnapshot(in context: Context, completion: @escaping (ZadEntry) -> Void) {
        let now = Date()
        let snap = SnapshotStore.load()
        let model = WidgetModel.build(snap, pending: PendingStore.load(), now: now)
        completion(ZadEntry(date: now, model: context.isPreview ? (model ?? .placeholder) : model,
                            staleLabel: WidgetModel.label("stale", snap?.labels ?? [:])))
    }

    /// One entry now, then one each time the minutes on the countdown change (for the next three hours) and
    /// one just after each boundary (a prayer starts or its window ends, sunrise, the middle of the night,
    /// midnight). Every entry recomputes the model from the same snapshot and queue, so the focus prayer
    /// moves on by itself. The app and the log intents reload the timelines whenever the data changes.
    func getTimeline(in context: Context, completion: @escaping (Timeline<ZadEntry>) -> Void) {
        let snap = SnapshotStore.load()
        let pending = PendingStore.load()
        let stale = WidgetModel.label("stale", snap?.labels ?? [:])
        let now = Date()
        guard var model = WidgetModel.build(snap, pending: pending, now: now) else {
            let entry = ZadEntry(date: now, model: nil, staleLabel: stale)
            completion(Timeline(entries: [entry], policy: .after(now.addingTimeInterval(3600))))
            return
        }
        var entries = [ZadEntry(date: now, model: model, staleLabel: stale)]
        let horizon = now.addingTimeInterval(ZadProvider.minuteHorizon)
        var t = now
        while entries.count < ZadProvider.maxEntries {
            var candidates: [Date] = []
            if let b = model.nextChange { candidates.append(b.addingTimeInterval(1)) } // just after the boundary
            if let tick = model.nextMinuteTick(after: t) { candidates.append(tick) }
            guard let d = candidates.min(), d > t, d <= horizon else { break }
            guard let m = WidgetModel.build(snap, pending: pending, now: d) else {
                entries.append(ZadEntry(date: d, model: nil, staleLabel: stale))
                break
            }
            entries.append(ZadEntry(date: d, model: m, staleLabel: stale))
            t = d
            model = m
        }
        // Ask again at the horizon (not .atEnd: a short timeline would otherwise reload straight away)
        completion(Timeline(entries: entries, policy: .after(horizon)))
    }
}

// MARK: - Palette (OG Calm, variant A: design-review/mockups2/redesign/final/og/NOTES.md)

extension Color {
    init(hex: UInt32, alpha: Double = 1) {
        self.init(.sRGB, red: Double((hex >> 16) & 0xFF) / 255, green: Double((hex >> 8) & 0xFF) / 255, blue: Double(hex & 0xFF) / 255, opacity: alpha)
    }
}

struct Pal {
    let dark: Bool
    init(_ scheme: ColorScheme) { dark = scheme == .dark }

    var card: Color { dark ? Color(hex: 0x1F2D26) : Color(hex: 0xFFFDF8) }
    var ink: Color { dark ? Color(hex: 0xEEE8D8) : Color(hex: 0x17231E) }
    var ink2: Color { dark ? Color(hex: 0xB3BDB2) : Color(hex: 0x56625B) }
    var line: Color { dark ? Color(hex: 0x2F4036) : Color(hex: 0xEAE1CC) }
    var ring: Color { dark ? Color(hex: 0x56665E) : Color(hex: 0xB9B1A0) }
    /// Primary button: forest with a honey label (light); muted honey with a forest label (dark).
    var primaryBg: Color { dark ? Color(hex: 0xD6B868) : Color(hex: 0x0F3D2E) }
    var primaryInk: Color { dark ? Color(hex: 0x13281F) : Color(hex: 0xE5C55C) }
    /// Secondary button: soft green tint with a forest label (light); deep green with a honey label (dark).
    var secondaryBg: Color { dark ? Color(hex: 0x2B3A2C) : Color(hex: 0xE3EBE0) }
    var secondaryInk: Color { dark ? Color(hex: 0xD6B868) : Color(hex: 0x0F3D2E) }
    /// The gold "now" mark (never text on a light background).
    var nowDot: Color { dark ? Color(hex: 0xE0BE62) : Color(hex: 0xA9821A) }
    var moss: Color { dark ? Color(hex: 0x8FB39C) : Color(hex: 0x1B5A43) }
    var ontime: Color { dark ? Color(hex: 0x8FB39C) : Color(hex: 0x5E9C7C) }
    var madeup: Color { dark ? Color(hex: 0x9DB6CE) : Color(hex: 0x4F6D8A) }
    var missed: Color { dark ? Color(hex: 0xD0624B) : Color(hex: 0x9E3F2C) }
    var excused: Color { Color(hex: 0x8E9C94) }

    func fill(_ state: String) -> Color {
        switch state {
        case "congregation": return primaryBg
        case "ontime": return ontime
        case "madeup": return madeup
        case "missed": return missed
        default: return excused
        }
    }
}

enum Z {
    static func serif(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font { .system(size: size, weight: weight, design: .serif) }
    static func sans(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font { .system(size: size, weight: weight) }
}

// MARK: - iOS 16 / 17 helpers

extension View {
    /// containerBackground on iOS 17+; a plain full-size background before that.
    @ViewBuilder
    func zadWidgetBackground(_ color: Color) -> some View {
        if #available(iOS 17.0, *) {
            self.containerBackground(for: .widget) { color }
        } else {
            self.frame(maxWidth: .infinity, maxHeight: .infinity).background(color)
        }
    }

    /// Lock-screen background: the system's translucent disc for the circular widget only.
    @ViewBuilder
    func zadLockBackground(circular: Bool) -> some View {
        if #available(iOS 17.0, *) {
            self.containerBackground(for: .widget) {
                if circular { AccessoryWidgetBackground() } else { Color.clear }
            }
        } else if circular {
            ZStack {
                AccessoryWidgetBackground()
                self
            }
        } else {
            self
        }
    }
}

extension WidgetConfiguration {
    /// contentMarginsDisabled() on iOS 17+ (iOS 16 has no system margins). The views pad themselves.
    func zadContentMarginsDisabled() -> some WidgetConfiguration {
        if #available(iOS 17.0, *) {
            return self.contentMarginsDisabled()
        } else {
            return self
        }
    }
}

// MARK: - Actions (shared by the widget intents and the Control)

enum ZadActions {
    /// Queue a log for `prayer` on `date` if the widget would offer that action right now (the prayer's time
    /// is in; undo only after a widget log). The widget then redraws from the queue at once.
    @discardableResult
    static func log(date: String, prayer: String, status: String, src: String, now: Date = Date()) -> Bool {
        let snap = SnapshotStore.load()
        let added = PendingStore.append { pending -> PendingLog? in
            guard let m = WidgetModel.build(snap, pending: pending, now: now, respectTimesOnly: false),
                  m.isNow, m.focusP == prayer, m.focusDate == date else { return nil }
            switch (status, m.action) {
            case ("undo", .logged(_)), ("ontime", .buttons), ("congregation", .buttons), ("remember", .remembrance):
                return PendingLog(date: date, prayer: prayer, status: status,
                                  at: (now.timeIntervalSince1970 * 1000).rounded(), src: src)
            default:
                return nil
            }
        }
        if let e = added, e.status != "undo" { cancelReminders(date: date, prayer: prayer) }
        reloadAll()
        return added != nil
    }

    /// A one-tap log cancels that prayer's reminders ("has begun", "ends soon") at once, scheduled or showing,
    /// instead of leaving them until the app next opens and reschedules. The app writes which ids belong to which
    /// prayer after every reschedule (src/notify.js reminderMap → ZadWidgetsPlugin.setReminders): App Group
    /// UserDefaults "reminders", a JSON string { "YYYY-MM-DD|Fajr": [1004, 2004] }. @capacitor/local-notifications
    /// names each request by its id ("1004"). An app extension shares its app's notification centre.
    static func cancelReminders(date: String, prayer: String) {
        guard let s = UserDefaults(suiteName: SnapshotStore.appGroup)?.string(forKey: "reminders"),
              let data = s.data(using: .utf8),
              let map = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
              let ids = map["\(date)|\(prayer)"] as? [Any] else { return }
        let names = ids.compactMap { ($0 as? NSNumber).map { "\($0.intValue)" } }
        guard !names.isEmpty else { return }
        let centre = UNUserNotificationCenter.current()
        centre.removePendingNotificationRequests(withIdentifiers: names)
        centre.removeDeliveredNotifications(withIdentifiers: names)
    }

    /// The single-action surfaces (the Control): log the open prayer On time.
    @discardableResult
    static func logCurrentOnTime(src: String, now: Date = Date()) -> Bool {
        guard let m = WidgetModel.build(SnapshotStore.load(), pending: PendingStore.load(), now: now, respectTimesOnly: false),
              m.isNow, m.action == .buttons else {
            reloadAll()
            return false
        }
        return log(date: m.focusDate, prayer: m.focusP, status: "ontime", src: src, now: now)
    }

    static func reloadAll() {
        WidgetCenter.shared.reloadAllTimelines()
        if #available(iOS 18.0, *) {
            ControlCenter.shared.reloadAllControls()
        }
    }
}

/// A button in a home-screen widget: logs `status` for the focus prayer.
@available(iOS 17.0, *)
struct LogPrayerIntent: AppIntent {
    static let title: LocalizedStringResource = "Log prayer"
    static let isDiscoverable: Bool = false
    static let openAppWhenRun: Bool = false
    static let authenticationPolicy: IntentAuthenticationPolicy = .alwaysAllowed

    @Parameter(title: "Date") var date: String
    @Parameter(title: "Prayer") var prayer: String
    @Parameter(title: "Status") var status: String
    @Parameter(title: "Source") var source: String

    init() {}

    init(date: String, prayer: String, status: String, source: String) {
        self.date = date
        self.prayer = prayer
        self.status = status
        self.source = source
    }

    func perform() async throws -> some IntentResult {
        ZadActions.log(date: date, prayer: prayer, status: status, src: source)
        return .result()
    }
}

/// The Control's action: log the prayer whose time is in now as On time (nothing when none is open).
@available(iOS 17.0, *)
struct LogNowIntent: AppIntent {
    static let title: LocalizedStringResource = "Log the current prayer on time"
    static let isDiscoverable: Bool = false
    static let openAppWhenRun: Bool = false
    static let authenticationPolicy: IntentAuthenticationPolicy = .alwaysAllowed

    init() {}

    func perform() async throws -> some IntentResult {
        ZadActions.logCurrentOnTime(src: "control")
        return .result()
    }
}

// MARK: - Shared pieces

/// A one-tap log button for the focus prayer: an App Intent on iOS 17+, a link to its log sheet before that.
struct LogButton<Content: View>: View {
    let m: WidgetModel
    let status: String // congregation | ontime | remember | undo
    let content: Content

    init(m: WidgetModel, status: String, @ViewBuilder content: () -> Content) {
        self.m = m
        self.status = status
        self.content = content()
    }

    var body: some View {
        if #available(iOS 17.0, *) {
            Button(intent: LogPrayerIntent(date: m.focusDate, prayer: m.focusP, status: status, source: "widget")) {
                content
            }
            .buttonStyle(.plain)
        } else {
            Link(destination: WidgetModel.logLink(m.focusP, m.focusDate)) { content }
        }
    }
}

struct Pill: View {
    let text: String
    var icon: String? = nil
    let bg: Color
    let fg: Color
    var height: CGFloat = 40
    var size: CGFloat = 15
    var expand: Bool = true

    var body: some View {
        HStack(spacing: 6) {
            if let icon = icon {
                Image(systemName: icon).font(Z.sans(size - 1, .semibold))
            }
            Text(text).font(Z.sans(size, .semibold)).lineLimit(1).minimumScaleFactor(0.7)
        }
        .foregroundColor(fg)
        .padding(.horizontal, expand ? 10 : 12)
        .frame(maxWidth: expand ? .infinity : nil, minHeight: height, maxHeight: height)
        .background(RoundedRectangle(cornerRadius: height * 0.36, style: .continuous).fill(bg))
    }
}

struct NowTag: View {
    let m: WidgetModel
    let pal: Pal
    var body: some View {
        HStack(spacing: 6) {
            Circle().fill(m.isNow ? pal.nowDot : pal.ring).frame(width: 8, height: 8)
            Text(m.label(m.isNow ? "now" : "next")).font(Z.sans(13, .semibold)).foregroundColor(pal.ink2).lineLimit(1)
        }
    }
}

/// The day's five dots (status colours; gold ring = the prayer whose time is in).
struct DayDots: View {
    let m: WidgetModel
    let pal: Pal
    var size: CGFloat = 10

    var body: some View {
        HStack(spacing: 5) {
            ForEach(m.prayers) { x in
                Group {
                    switch x.state {
                    case "now":
                        Circle().strokeBorder(pal.nowDot, lineWidth: 2)
                    case "late":
                        Circle().strokeBorder(pal.ink2, style: StrokeStyle(lineWidth: 1.5, dash: [2, 1.5]))
                    case "upcoming":
                        Circle().strokeBorder(pal.ring, lineWidth: 1.5)
                    default:
                        Circle().fill(pal.fill(x.state))
                    }
                }
                .frame(width: size, height: size)
            }
        }
    }
}

/// The status mark at the start of a large-widget row.
struct RowMark: View {
    let state: String
    let pal: Pal
    var size: CGFloat = 26

    var body: some View {
        ZStack {
            switch state {
            case "congregation": filled(pal.primaryBg, "person.2.fill", pal.primaryInk)
            case "ontime": filled(pal.secondaryBg, "checkmark", pal.moss)
            case "madeup": filled(pal.madeup, "arrow.counterclockwise", .white)
            case "missed": filled(pal.missed, "minus", .white)
            case "excused": filled(pal.excused, "moon.fill", .white)
            case "now": Circle().strokeBorder(pal.nowDot, lineWidth: 2)
            case "late": Circle().strokeBorder(pal.ink2, style: StrokeStyle(lineWidth: 1.5, dash: [3, 2.5]))
            default: Circle().strokeBorder(pal.ring, lineWidth: 1.5)
            }
        }
        .frame(width: size, height: size)
    }

    private func filled(_ bg: Color, _ symbol: String, _ fg: Color) -> some View {
        ZStack {
            Circle().fill(bg)
            Image(systemName: symbol).font(.system(size: size * 0.42, weight: .bold)).foregroundColor(fg)
        }
    }
}

/// "ʿAsr logged ✓ · Undo" (compact: "Logged ✓  Undo"). Only Undo is tappable.
struct LoggedBar: View {
    let m: WidgetModel
    let pal: Pal
    let compact: Bool

    var body: some View {
        HStack(spacing: 6) {
            Text(compact ? m.label("loggedShort") : m.fill("logged", p: m.focusName))
                .font(Z.sans(compact ? 14 : 15, .semibold)).foregroundColor(pal.secondaryInk)
                .lineLimit(1).minimumScaleFactor(0.7)
            if !compact {
                Text("·").font(Z.sans(15)).foregroundColor(pal.ink2)
            }
            if compact { Spacer(minLength: 2) }
            LogButton(m: m, status: "undo") {
                HStack(spacing: 4) {
                    Image(systemName: "arrow.uturn.backward").font(Z.sans(compact ? 12 : 13, .semibold))
                    Text(m.label("undo")).font(Z.sans(compact ? 14 : 15, .semibold)).lineLimit(1)
                }
                .foregroundColor(pal.secondaryInk)
                .padding(.horizontal, compact ? 8 : 6)
                .frame(minHeight: compact ? 28 : 32)
                .background(Capsule().fill(compact ? pal.card.opacity(0.6) : Color.clear))
            }
            if !compact { Spacer(minLength: 0) }
        }
        .padding(.horizontal, compact ? 10 : 16)
        .frame(maxWidth: .infinity, minHeight: compact ? 38 : 44, maxHeight: compact ? 38 : 44)
        .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(pal.secondaryBg))
    }
}

/// The bottom of the small and medium widgets: the buttons, the logged bar, Remembrance, or (nothing to tap)
/// when the next prayer begins / the day's times.
struct ActionArea: View {
    let m: WidgetModel
    let pal: Pal
    let compact: Bool // small widget: one button

    var body: some View {
        switch m.action {
        case .buttons:
            if compact || m.sister {
                LogButton(m: m, status: "ontime") {
                    Pill(text: m.label("onTime"), icon: "checkmark", bg: pal.primaryBg, fg: pal.primaryInk, height: compact ? 38 : 44)
                }
            } else {
                HStack(spacing: 8) {
                    LogButton(m: m, status: "congregation") {
                        Pill(text: m.label("congregation"), icon: "person.2", bg: pal.primaryBg, fg: pal.primaryInk, height: 44)
                    }
                    LogButton(m: m, status: "ontime") {
                        Pill(text: m.label("onTime"), icon: "checkmark", bg: pal.secondaryBg, fg: pal.secondaryInk, height: 44)
                    }
                }
            }
        case .remembrance:
            LogButton(m: m, status: "remember") {
                Pill(text: m.label(compact ? "remembranceShort" : "remembrance"), icon: "moon", bg: pal.secondaryBg,
                     fg: pal.secondaryInk, height: compact ? 38 : 44, size: compact ? 14 : 15)
            }
        case .logged:
            LoggedBar(m: m, pal: pal, compact: compact)
        case .idle:
            if m.showTimesOnly {
                if !compact { TimesRow(m: m, pal: pal) }
            } else if !m.isNow && !compact {
                HStack(spacing: 6) {
                    Image(systemName: "clock").font(Z.sans(13, .medium))
                    Text(m.fill("begins", p: m.focusName, t: m.focusTime)).font(Z.sans(14, .medium)).lineLimit(1).minimumScaleFactor(0.7)
                }
                .foregroundColor(pal.ink2)
                .frame(maxWidth: .infinity, minHeight: 44, maxHeight: 44)
                .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).stroke(pal.line, lineWidth: 1))
            }
        }
    }
}

/// Show times only: the day's five times (no statuses).
struct TimesRow: View {
    let m: WidgetModel
    let pal: Pal

    var body: some View {
        VStack(spacing: 8) {
            Rectangle().fill(pal.line).frame(height: 1)
            HStack(alignment: .top, spacing: 4) {
                ForEach(m.prayers) { x in
                    VStack(alignment: .leading, spacing: 2) {
                        HStack(spacing: 3) {
                            if x.focus && m.isNow {
                                Circle().fill(pal.nowDot).frame(width: 6, height: 6)
                            }
                            Text(x.name).font(Z.sans(12)).foregroundColor(pal.ink2).lineLimit(1).minimumScaleFactor(0.7)
                        }
                        Text(WidgetModel.fmtTime(x.time)).font(Z.sans(15, .semibold)).foregroundColor(pal.ink)
                            .lineLimit(1).minimumScaleFactor(0.6)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
        }
    }
}

struct StaleView: View {
    let text: String
    let pal: Pal
    var body: some View {
        Text(text).font(Z.serif(16)).foregroundColor(pal.ink).multilineTextAlignment(.center).padding()
    }
}

// MARK: - Home screen

struct ZadHomeWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "ZadHome", provider: ZadProvider()) { entry in
            ZadHomeView(entry: entry)
        }
        .configurationDisplayName("Zad")
        .description("The prayer whose time is in, with one-tap logging.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        .zadContentMarginsDisabled()
    }
}

struct ZadHomeView: View {
    let entry: ZadEntry
    @Environment(\.widgetFamily) private var family
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        let pal = Pal(scheme)
        if let m = entry.model {
            switch family {
            case .systemSmall: SmallView(m: m, now: entry.date, pal: pal)
            case .systemMedium: MediumView(m: m, now: entry.date, pal: pal)
            default: LargeView(m: m, now: entry.date, pal: pal)
            }
        } else {
            StaleView(text: entry.staleLabel, pal: pal)
                .widgetURL(WidgetModel.openURL("home"))
                .zadWidgetBackground(pal.card)
        }
    }
}

/// Small: the current prayer, its countdown and one On time button (or, before it begins, when it begins).
struct SmallView: View {
    let m: WidgetModel
    let now: Date
    let pal: Pal

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            NowTag(m: m, pal: pal)
            Text(m.focusName).font(Z.serif(30)).foregroundColor(pal.ink).lineLimit(1).minimumScaleFactor(0.6)
            if m.isNow {
                Text(m.countdownLong(at: now)).font(Z.sans(20, .semibold)).foregroundColor(pal.ink)
                    .lineLimit(1).minimumScaleFactor(0.7)
                Text(m.countdownSub).font(Z.sans(12)).foregroundColor(pal.ink2).lineLimit(1).minimumScaleFactor(0.7)
            } else {
                Text(m.fill("beginsShort", t: m.focusTime)).font(Z.sans(18, .semibold)).foregroundColor(pal.ink)
                    .lineLimit(1).minimumScaleFactor(0.7)
                Text("\(m.label("in")) \(m.countdownLong(at: now))").font(Z.sans(12)).foregroundColor(pal.ink2)
                    .lineLimit(1).minimumScaleFactor(0.7)
            }
            Spacer(minLength: 4)
            if m.action != .idle {
                ActionArea(m: m, pal: pal, compact: true)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .padding(16)
        .widgetURL(m.logURL)
        .zadWidgetBackground(pal.card)
    }
}

/// Medium: the current prayer and countdown, the buttons (brothers: Congregation, On time; sisters: On time)
/// and the day's five dots.
struct MediumView: View {
    let m: WidgetModel
    let now: Date
    let pal: Pal

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                NowTag(m: m, pal: pal)
                Spacer(minLength: 4)
                if !m.showTimesOnly && !m.excusedToday {
                    DayDots(m: m, pal: pal)
                }
            }
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text(m.focusName).font(Z.serif(34)).foregroundColor(pal.ink).lineLimit(1).minimumScaleFactor(0.6)
                Spacer(minLength: 4)
                VStack(alignment: .trailing, spacing: 1) {
                    Text(m.countdownLong(at: now)).font(Z.sans(22, .semibold)).foregroundColor(pal.ink)
                        .lineLimit(1).minimumScaleFactor(0.7)
                    Text(m.countdownSub).font(Z.sans(12)).foregroundColor(pal.ink2).lineLimit(1).minimumScaleFactor(0.7)
                }
            }
            Spacer(minLength: 6)
            ActionArea(m: m, pal: pal, compact: false)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .padding(16)
        .widgetURL(m.logURL)
        .zadWidgetBackground(pal.card)
    }
}

/// Large: the header, then the day's five prayers. The open one has its buttons; logged ones say how.
struct LargeView: View {
    let m: WidgetModel
    let now: Date
    let pal: Pal

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    NowTag(m: m, pal: pal)
                    Text(m.focusName).font(Z.serif(30)).foregroundColor(pal.ink).lineLimit(1).minimumScaleFactor(0.6)
                }
                Spacer(minLength: 4)
                VStack(alignment: .trailing, spacing: 1) {
                    Text(m.countdownLong(at: now)).font(Z.sans(22, .semibold)).foregroundColor(pal.ink)
                        .lineLimit(1).minimumScaleFactor(0.7)
                    Text(m.countdownSub).font(Z.sans(12)).foregroundColor(pal.ink2).lineLimit(1).minimumScaleFactor(0.7)
                }
            }
            .padding(.bottom, 8)
            // Last night's ʿIshāʾ (before Fajr) isn't one of today's rows: its buttons go under the header
            if m.isNow && m.focusDate != m.date && m.action != .idle {
                ActionArea(m: m, pal: pal, compact: false)
                    .padding(.bottom, 8)
            }
            ForEach(m.prayers) { x in
                Rectangle().fill(pal.line).frame(height: 1)
                PrayerRow(m: m, x: x, pal: pal)
                    .frame(maxHeight: .infinity)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .padding(16)
        .widgetURL(m.logURL)
        .zadWidgetBackground(pal.card)
    }
}

struct PrayerRow: View {
    let m: WidgetModel
    let x: WidgetModel.Prayer
    let pal: Pal

    /// This row is the prayer whose time is in now (it carries the actions).
    private var open: Bool { x.focus && m.isNow }

    private var subtitle: String {
        if m.showTimesOnly { return WidgetModel.fmtTime(x.time) }
        if open { return "\(m.label("until")) \(WidgetModel.fmtTime(x.end ?? m.countdownTo))" }
        if x.state == "upcoming" { return m.fill("beginsShort", t: x.time) }
        return WidgetModel.fmtTime(x.time)
    }

    var body: some View {
        let mark = m.showTimesOnly ? (open ? "now" : "upcoming") : x.state
        HStack(spacing: 10) {
            RowMark(state: mark, pal: pal)
            VStack(alignment: .leading, spacing: 1) {
                Text(x.name).font(Z.sans(16, .semibold))
                    .foregroundColor(x.state == "upcoming" && !m.showTimesOnly ? pal.ink2 : pal.ink)
                    .lineLimit(1).minimumScaleFactor(0.7)
                Text(subtitle).font(Z.sans(12)).foregroundColor(pal.ink2).lineLimit(1).minimumScaleFactor(0.7)
            }
            .layoutPriority(1)
            Spacer(minLength: 4)
            if !m.showTimesOnly {
                trailing
            }
        }
    }

    @ViewBuilder
    private var trailing: some View {
        if open && m.action == .buttons {
            HStack(spacing: 6) {
                if !m.sister {
                    LogButton(m: m, status: "congregation") {
                        Pill(text: m.label("congregation"), bg: pal.primaryBg, fg: pal.primaryInk, height: 32, size: 14, expand: false)
                    }
                }
                LogButton(m: m, status: "ontime") {
                    Pill(text: m.label("onTime"), bg: m.sister ? pal.primaryBg : pal.secondaryBg,
                         fg: m.sister ? pal.primaryInk : pal.secondaryInk, height: 32, size: 14, expand: false)
                }
            }
        } else if open && m.action == .remembrance {
            LogButton(m: m, status: "remember") {
                Pill(text: m.label("remembranceShort"), icon: "moon", bg: pal.secondaryBg, fg: pal.secondaryInk,
                     height: 32, size: 14, expand: false)
            }
        } else if open && m.isLoggedAction {
            HStack(spacing: 6) {
                Text(m.label("loggedShort")).font(Z.sans(14, .semibold)).foregroundColor(pal.ink2).lineLimit(1)
                LogButton(m: m, status: "undo") {
                    Pill(text: m.label("undo"), icon: "arrow.uturn.backward", bg: pal.secondaryBg, fg: pal.secondaryInk,
                         height: 30, size: 13, expand: false)
                }
            }
        } else if x.state == "late" {
            Link(destination: WidgetModel.logLink(x.p, m.date)) {
                Text(m.statusLabel(x.state)).font(Z.sans(14)).foregroundColor(pal.ink2).lineLimit(1)
            }
        } else if x.state != "upcoming" && x.state != "now" {
            Text(m.statusLabel(x.state)).font(Z.sans(14)).foregroundColor(pal.ink2).lineLimit(1).minimumScaleFactor(0.7)
        }
    }
}

// MARK: - Lock screen (monochrome; iOS tints these)

struct ZadLockWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "ZadLock", provider: ZadProvider()) { entry in
            ZadLockView(entry: entry)
        }
        .configurationDisplayName("Zad")
        .description("The prayer whose time is in and the time left.")
        .supportedFamilies([.accessoryInline, .accessoryRectangular, .accessoryCircular])
    }
}

struct ZadLockView: View {
    let entry: ZadEntry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        Group {
            if let m = entry.model {
                switch family {
                case .accessoryInline:
                    Label {
                        Text(inline(m))
                    } icon: {
                        Image(systemName: "clock")
                    }
                case .accessoryCircular:
                    Gauge(value: 1 - m.progress(at: entry.date)) {
                        EmptyView()
                    } currentValueLabel: {
                        VStack(spacing: -1) {
                            Text(m.focusName).font(Z.sans(10, .medium)).lineLimit(1).minimumScaleFactor(0.6)
                            Text(m.countdownClock(at: entry.date)).font(Z.sans(16, .bold)).lineLimit(1).minimumScaleFactor(0.6)
                        }
                    }
                    .gaugeStyle(.accessoryCircularCapacity)
                    .widgetAccentable()
                default:
                    LockRect(m: m, now: entry.date)
                }
            } else {
                switch family {
                case .accessoryInline: Text(entry.staleLabel)
                case .accessoryRectangular: Text(entry.staleLabel).font(Z.sans(13, .semibold))
                default: Image(systemName: "moon.fill")
                }
            }
        }
        .widgetURL(entry.model?.logURL ?? WidgetModel.openURL("home"))
        .zadLockBackground(circular: family == .accessoryCircular)
    }

    /// "ʿAsr · 1h 27m left" (now) or "Zuhr · 11:50" (next).
    private func inline(_ m: WidgetModel) -> String {
        m.isNow ? "\(m.focusName) · \(m.countdown(at: entry.date)) \(m.countdownLabel)"
                : "\(m.focusName) · \(WidgetModel.fmtTime(m.focusTime))"
    }
}

/// Rectangular: the current prayer and when it ends, the next prayer, and (only when the lock-screen dots
/// setting is on, and Show times only is off) the day's five dots and "logged ✓". Times only by default.
struct LockRect: View {
    let m: WidgetModel
    let now: Date

    private var dots: Bool { m.lockDots && !m.showTimesOnly }

    private var line1: String {
        if !m.isNow { return m.fill("begins", p: m.focusName, t: m.focusTime) }
        if dots && m.isLoggedAction { return m.fill("logged", p: m.focusName) }
        return "\(m.focusName) · \(m.label("until")) \(WidgetModel.fmtTime(m.countdownTo))"
    }

    private var line2: String {
        if !m.isNow { return "\(m.label("in")) \(m.countdown(at: now))" }
        guard let n = m.upNextName, let t = m.upNextTime else { return "\(m.countdown(at: now)) \(m.countdownLabel)" }
        return "\(m.label("next")) \(n) \(WidgetModel.fmtTime(t))"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(line1).font(Z.sans(15, .bold)).lineLimit(1).minimumScaleFactor(0.7).widgetAccentable()
            Text(line2).font(Z.sans(13)).lineLimit(1).minimumScaleFactor(0.7).opacity(0.8)
            if dots {
                HStack(spacing: 5) {
                    ForEach(m.prayers) { x in
                        Group {
                            if x.isPrayed || x.state == "excused" {
                                Circle().fill(Color.primary)
                            } else if x.state == "now" {
                                Circle().strokeBorder(Color.primary, lineWidth: 2.5)
                            } else {
                                Circle().strokeBorder(Color.primary.opacity(0.7), lineWidth: 1.2)
                            }
                        }
                        .frame(width: 9, height: 9)
                    }
                }
                .padding(.top, 2)
                .widgetAccentable()
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - iOS 18 Control ("Log ʿAsr · on time")

struct ZadControlValue {
    let title: String
    let symbol: String

    /// What the Control shows now: "Log ʿAsr · on time" when a prayer is open; otherwise when the next one
    /// begins (pressing it then does nothing). Excused days show nothing to log. With Show times only on,
    /// the logged state isn't shown.
    static func current(now: Date = Date()) -> ZadControlValue {
        let snap = SnapshotStore.load()
        guard let m = WidgetModel.build(snap, pending: PendingStore.load(), now: now, respectTimesOnly: false) else {
            return ZadControlValue(title: WidgetModel.label("stale", snap?.labels ?? [:]), symbol: "checkmark")
        }
        let timesOnly = snap?.showTimesOnly == true
        switch m.action {
        case .buttons:
            return ZadControlValue(title: m.fill("logOnTime", p: m.focusName), symbol: "checkmark")
        case .logged:
            return timesOnly ? ZadControlValue(title: m.fill("logOnTime", p: m.focusName), symbol: "checkmark")
                             : ZadControlValue(title: m.fill("logged", p: m.focusName), symbol: "checkmark.circle.fill")
        case .remembrance:
            return ZadControlValue(title: m.label("nothingOpen"), symbol: "clock")
        case .idle:
            if !m.isNow { return ZadControlValue(title: m.fill("begins", p: m.focusName, t: m.focusTime), symbol: "clock") }
            return ZadControlValue(title: m.label("nothingOpen"), symbol: "clock")
        }
    }
}

@available(iOS 18.0, *)
struct ZadControlProvider: ControlValueProvider {
    var previewValue: ZadControlValue { ZadControlValue(title: "Log ʿAsr · on time", symbol: "checkmark") }

    func currentValue() async throws -> ZadControlValue { ZadControlValue.current() }
}

@available(iOS 18.0, *)
struct ZadLogControl: ControlWidget {
    static let kind = "com.zad.app.ZadWidget.LogPrayer"

    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: ZadLogControl.kind, provider: ZadControlProvider()) { value in
            ControlWidgetButton(action: LogNowIntent()) {
                Label(value.title, systemImage: value.symbol)
            }
        }
        .displayName("Log prayer")
        .description("Logs the prayer whose time is in as on time.")
    }
}
