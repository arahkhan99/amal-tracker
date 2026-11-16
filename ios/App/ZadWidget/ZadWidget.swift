import WidgetKit
import SwiftUI

// Zad widgets (iOS 17+): Small A "Hero card", Medium A "Tiles", Large A "Hero + deeds", and the
// lock-screen inline / rectangular / circular widgets. Designs: design-review/mockups2/widgets.
// Data: the snapshot the app writes to the App Group (WidgetModel.swift). Setup: docs/build/widgets.md.

@main
struct ZadWidgetBundle: WidgetBundle {
    var body: some Widget {
        ZadHomeWidget()
        ZadLockWidget()
    }
}

// MARK: - Timeline

struct ZadEntry: TimelineEntry {
    let date: Date
    let model: WidgetModel?
    let staleLabel: String
}

struct ZadProvider: TimelineProvider {
    func placeholder(in context: Context) -> ZadEntry {
        ZadEntry(date: Date(), model: .placeholder, staleLabel: WidgetModel.label("stale", [:]))
    }

    func getSnapshot(in context: Context, completion: @escaping (ZadEntry) -> Void) {
        let now = Date()
        let model = context.isPreview ? (WidgetModel.build(SnapshotStore.load(), now: now) ?? .placeholder) : WidgetModel.build(SnapshotStore.load(), now: now)
        completion(ZadEntry(date: now, model: model, staleLabel: WidgetModel.label("stale", SnapshotStore.labels())))
    }

    /// One entry now and one just after each boundary (a prayer starts or its window ends, sunrise, the middle
    /// of the night, midnight), up to a day ahead. The countdown is a self-updating timer (Text(timerInterval:)
    /// and ProgressView(timerInterval:)), so no per-minute entries are needed. Each entry recomputes the model
    /// from the same snapshot, so the next prayer changes on its own. The app also reloads the timelines
    /// whenever its data changes.
    func getTimeline(in context: Context, completion: @escaping (Timeline<ZadEntry>) -> Void) {
        let snap = SnapshotStore.load()
        let stale = WidgetModel.label("stale", snap?.labels ?? [:])
        let now = Date()
        let firstModel = WidgetModel.build(snap, now: now)
        var entries: [ZadEntry] = [ZadEntry(date: now, model: firstModel, staleLabel: stale)]
        let horizon = now.addingTimeInterval(24 * 3600)
        var next: Date? = firstModel?.nextChange
        while let at = next, at <= horizon, entries.count < 24 {
            let d = at.addingTimeInterval(1) // just after the boundary, so the new window is in
            guard d > (entries.last?.date ?? now) else { break }
            let model = WidgetModel.build(snap, now: d)
            entries.append(ZadEntry(date: d, model: model, staleLabel: stale))
            next = model?.nextChange
        }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

// MARK: - Palette (src/css/theme.css)

extension Color {
    init(hex: UInt32, alpha: Double = 1) {
        self.init(.sRGB, red: Double((hex >> 16) & 0xFF) / 255, green: Double((hex >> 8) & 0xFF) / 255, blue: Double(hex & 0xFF) / 255, opacity: alpha)
    }
}

enum Z {
    static let forestTop = Color(hex: 0x1B5A43)
    static let forest = Color(hex: 0x0F3D2E)
    static let forestBottom = Color(hex: 0x0B2A20)
    static let gold = Color(hex: 0xE5C55C)
    static let goldText = Color(hex: 0xE8C766)
    static let ivory = Color(hex: 0xF8F4EA)
    static let ontime = Color(hex: 0x5DBB8A)
    static let madeup = Color(hex: 0x4F6D8A)
    static let excused = Color(hex: 0x8E9C94)
    static func missed(_ dark: Bool) -> Color { dark ? Color(hex: 0xD0624B) : Color(hex: 0x9E3F2C) }
    static func card(_ dark: Bool) -> Color { dark ? Color(hex: 0x16231E) : Color(hex: 0xFBF7EE) }
    static func ink(_ dark: Bool) -> Color { dark ? Color(hex: 0xECE5D3) : Color(hex: 0x17231E) }
    static func ink2(_ dark: Bool) -> Color { dark ? Color(hex: 0x9FADA5) : Color(hex: 0x5A6862) }
    static func inset(_ dark: Bool) -> Color { dark ? Color(hex: 0x1F302A) : Color(hex: 0xEFE9DA) }
    static func dash(_ dark: Bool) -> Color { dark ? Color(hex: 0x56665E) : Color(hex: 0xB9B1A0) }
    static func focusBg(_ dark: Bool) -> Color { dark ? Color(hex: 0x3A3218) : Color(hex: 0xF4E9C8) }
    static func focusInk(_ dark: Bool) -> Color { dark ? Color(hex: 0xE8C766) : Color(hex: 0x7A5C05) }
    static func chipBg(_ dark: Bool) -> Color { dark ? Color(hex: 0x24313A) : Color(hex: 0xE3E7EA) }
    static func chipInk(_ dark: Bool) -> Color { dark ? Color(hex: 0x9DB6CE) : Color(hex: 0x4F6D8A) }

    static let heroGradient = LinearGradient(colors: [forestTop, forest, forestBottom], startPoint: .top, endPoint: .bottom)
    static func serif(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font { .system(size: size, weight: weight, design: .serif) }
    static func sans(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font { .system(size: size, weight: weight) }
}

// MARK: - Shared pieces

/// The status mark used in the tiles and the prayer row (same language as the app).
struct StatusMark: View {
    let state: String
    let onForest: Bool
    var size: CGFloat = 26
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        let dark = scheme == .dark
        ZStack {
            switch state {
            case "congregation": filled(Z.gold, "person.2.fill", Z.forest)
            case "ontime": filled(Z.ontime, "checkmark", .white)
            case "madeup": filled(Z.madeup, "arrow.counterclockwise", .white)
            case "missed": filled(Z.missed(dark), "minus", .white)
            case "excused": filled(Z.excused, "moon.fill", .white)
            case "next":
                Circle().stroke(Z.gold, lineWidth: 2.2)
                Circle().fill(Z.gold).frame(width: size * 0.33, height: size * 0.33)
            case "due":
                Circle().stroke(Z.gold, style: StrokeStyle(lineWidth: 2, dash: [3, 2.5]))
                Image(systemName: "plus").font(.system(size: size * 0.42, weight: .bold)).foregroundColor(Z.gold)
            default:
                Circle().stroke(onForest ? Z.ivory.opacity(0.45) : Z.dash(dark), style: StrokeStyle(lineWidth: 2, dash: [3, 2.5]))
            }
        }
        .frame(width: size, height: size)
    }

    private func filled(_ bg: Color, _ symbol: String, _ fg: Color) -> some View {
        ZStack {
            Circle().fill(bg)
            Image(systemName: symbol).font(.system(size: size * 0.45, weight: .bold)).foregroundColor(fg)
        }
    }
}

/// The small honey dot: filled when that prayer's sunnah is logged, hollow otherwise, absent when there is none.
struct SunnahDot: View {
    let sunnah: Bool?
    let hollow: Color
    var body: some View {
        Group {
            if let s = sunnah {
                if s { Circle().fill(Z.gold) } else { Circle().stroke(hollow, lineWidth: 1) }
            } else {
                Color.clear
            }
        }
        .frame(width: 5, height: 5)
    }
}

struct TagPill: View {
    let text: String
    var body: some View {
        Text(text.uppercased())
            .font(Z.sans(10, .bold)).tracking(1.2)
            .foregroundColor(Z.forest)
            .padding(.horizontal, 8).padding(.vertical, 2)
            .background(Capsule().fill(Z.gold))
    }
}

struct PrayedButton: View {
    let m: WidgetModel
    var height: CGFloat = 36
    var body: some View {
        Link(destination: m.logURL) {
            HStack(spacing: 6) {
                Image(systemName: "checkmark").font(Z.sans(13, .bold))
                Text(m.label(m.isNow ? "prayed" : "logToday")).font(Z.sans(15, .bold)).lineLimit(1)
            }
            .foregroundColor(Z.forest)
            .frame(maxWidth: .infinity, minHeight: height, maxHeight: height)
            .background(Capsule().fill(Z.gold))
        }
    }
}

struct StaleView: View {
    let text: String
    var body: some View {
        Text(text).font(Z.serif(16)).foregroundColor(Z.ivory).multilineTextAlignment(.center).padding()
    }
}

// MARK: - Home screen

struct ZadHomeWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "ZadHome", provider: ZadProvider()) { entry in
            ZadHomeView(entry: entry)
        }
        .configurationDisplayName("Zad")
        .description("Next prayer, today's prayers and Good Deeds.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}

struct ZadHomeView: View {
    let entry: ZadEntry
    @Environment(\.widgetFamily) private var family
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        if let m = entry.model {
            switch family {
            case .systemSmall: SmallView(m: m, now: entry.date)
            case .systemMedium: MediumView(m: m, now: entry.date)
            default: LargeView(m: m, now: entry.date)
            }
        } else {
            StaleView(text: entry.staleLabel)
                .widgetURL(WidgetModel.openURL("home"))
                .containerBackground(for: .widget) { Z.heroGradient }
        }
    }
}

/// Small A, "Hero card": always forest, the same in light and dark. The whole widget opens the log sheet.
struct SmallView: View {
    let m: WidgetModel
    let now: Date
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                TagPill(text: m.label(m.isNow ? "now" : "next"))
                Spacer(minLength: 4)
                Text(WidgetModel.fmt12(m.focusTime)).font(Z.sans(12, .medium)).foregroundColor(Z.ivory.opacity(0.72)).lineLimit(1)
            }
            Text(m.focusName).font(Z.serif(30)).foregroundColor(Z.ivory).lineLimit(1).minimumScaleFactor(0.7).padding(.top, 2)
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(timerInterval: m.timerRange(at: now), countsDown: true).font(Z.serif(24, .bold)).foregroundColor(Z.goldText).lineLimit(1).minimumScaleFactor(0.7)
                Text(m.isNow ? m.countdownLabel : m.label("left")).font(Z.sans(11)).foregroundColor(Z.ivory.opacity(0.72)).lineLimit(1)
            }
            Spacer(minLength: 6)
            // Small widgets can't hold separate links: the button is drawn, the whole widget is the tap target
            HStack(spacing: 6) {
                Image(systemName: "checkmark").font(Z.sans(13, .bold))
                Text(m.label(m.isNow ? "prayed" : "logToday")).font(Z.sans(15, .bold)).lineLimit(1)
            }
            .foregroundColor(Z.forest)
            .frame(maxWidth: .infinity, minHeight: 36, maxHeight: 36)
            .background(Capsule().fill(Z.gold))
        }
        .padding(14)
        .widgetURL(m.logURL)
        .containerBackground(for: .widget) { Z.heroGradient }
    }
}

/// Medium A, "Tiles": forest card, next-prayer header and five tiles. Each tile opens that prayer's log sheet.
struct MediumView: View {
    let m: WidgetModel
    let now: Date
    var body: some View {
        VStack(spacing: 10) {
            Link(destination: m.logURL) {
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    TagPill(text: m.label(m.isNow ? "now" : "next"))
                    Text(m.focusName).font(Z.serif(21)).foregroundColor(Z.ivory).lineLimit(1)
                    Text(WidgetModel.fmt12(m.focusTime)).font(Z.sans(12, .medium)).foregroundColor(Z.ivory.opacity(0.72)).lineLimit(1)
                    Spacer(minLength: 4)
                    Text(timerInterval: m.timerRange(at: now), countsDown: true).font(Z.serif(21, .bold)).foregroundColor(Z.goldText).lineLimit(1)
                }
            }
            HStack(spacing: 6) {
                ForEach(m.prayers) { x in
                    Link(destination: WidgetModel.logLink(x.p, m.date)) {
                        VStack(spacing: 3) {
                            StatusMark(state: x.state, onForest: true, size: 26)
                            Text(x.name).font(Z.sans(12, .bold)).foregroundColor(x.focus ? Z.goldText : Z.ivory).lineLimit(1).minimumScaleFactor(0.7)
                            Text(WidgetModel.fmt12(x.time)).font(Z.sans(10)).foregroundColor(Z.ivory.opacity(0.72)).lineLimit(1).minimumScaleFactor(0.7)
                            SunnahDot(sunnah: x.sunnah, hollow: Z.ivory.opacity(0.72))
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(
                            RoundedRectangle(cornerRadius: 14).fill(x.focus ? Z.gold.opacity(0.16) : Color.white.opacity(0.09))
                        )
                        .overlay(RoundedRectangle(cornerRadius: 14).stroke(x.focus ? Z.gold : .clear, lineWidth: 2))
                    }
                }
            }
        }
        .padding(12)
        .containerBackground(for: .widget) { Z.heroGradient }
    }
}

/// Large A, "Hero + deeds": forest hero over the five-prayer row and the Good Deeds grid. The card follows the theme.
struct LargeView: View {
    let m: WidgetModel
    let now: Date
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        let dark = scheme == .dark
        VStack(spacing: 8) {
            // Hero
            Link(destination: m.logURL) {
                VStack(alignment: .leading, spacing: 2) {
                    HStack {
                        TagPill(text: m.label(m.isNow ? "now" : "next"))
                        Spacer()
                        Text(m.hijri).font(Z.serif(13)).foregroundColor(Z.ivory.opacity(0.72)).lineLimit(1)
                    }
                    HStack(alignment: .firstTextBaseline) {
                        Text(m.focusName).font(Z.serif(30)).foregroundColor(Z.ivory).lineLimit(1)
                        Spacer()
                        Text(timerInterval: m.timerRange(at: now), countsDown: true).font(Z.serif(28, .bold)).foregroundColor(Z.goldText).lineLimit(1)
                    }
                    HStack {
                        Text(WidgetModel.fmt12(m.focusTime)).font(Z.sans(12, .medium)).foregroundColor(Z.ivory.opacity(0.72))
                        Spacer()
                        Text(m.countdownLabel).font(Z.sans(11)).foregroundColor(Z.ivory.opacity(0.72)).lineLimit(1)
                    }
                    PrayedButton(m: m, height: 32).padding(.top, 6)
                }
                .padding(.horizontal, 14).padding(.vertical, 10)
                .background(RoundedRectangle(cornerRadius: 20).fill(Z.heroGradient))
            }

            // Prayer row (no times)
            HStack(spacing: 4) {
                ForEach(m.prayers) { x in
                    Link(destination: WidgetModel.logLink(x.p, m.date)) {
                        VStack(spacing: 2) {
                            StatusMark(state: x.state, onForest: false, size: 24)
                            Text(x.name).font(Z.sans(11, .bold)).foregroundColor(x.focus ? Z.focusInk(dark) : Z.ink(dark)).lineLimit(1).minimumScaleFactor(0.7)
                            SunnahDot(sunnah: x.sunnah, hollow: Z.ink2(dark))
                        }
                        .padding(.vertical, 5)
                        .frame(maxWidth: .infinity)
                        .background(RoundedRectangle(cornerRadius: 14).fill(x.focus ? Z.focusBg(dark) : .clear))
                        .overlay(RoundedRectangle(cornerRadius: 14).stroke(x.focus ? Z.gold : .clear, lineWidth: 2))
                    }
                }
            }

            // Good Deeds and make-ups
            if m.deeds != nil || m.makeups != nil {
                HStack(spacing: 6) {
                    if let d = m.deeds {
                        Text(m.label("goodDeeds")).font(Z.serif(15, .bold)).foregroundColor(Z.ink(dark))
                        Text("\(d.done)/\(d.total)").font(Z.sans(12, .bold)).foregroundColor(Z.ink2(dark))
                    }
                    Spacer()
                    if let mk = m.makeupsLabel {
                        Link(destination: WidgetModel.openURL("qada")) {
                            HStack(spacing: 4) {
                                Image(systemName: "arrow.counterclockwise").font(Z.sans(10, .bold))
                                Text(mk).font(Z.sans(11, .bold)).lineLimit(1)
                            }
                            .foregroundColor(Z.chipInk(dark))
                            .padding(.horizontal, 9).padding(.vertical, 3)
                            .background(Capsule().fill(Z.chipBg(dark)))
                        }
                    }
                }
            }
            if let d = m.deeds {
                Link(destination: WidgetModel.openURL("home")) {
                    LazyVGrid(columns: [GridItem(.flexible(), spacing: 6), GridItem(.flexible(), spacing: 6)], spacing: 5) {
                        ForEach(Array(d.items.prefix(6).enumerated()), id: \.offset) { _, item in
                            HStack(spacing: 6) {
                                Image(systemName: item.done ? "checkmark.circle.fill" : "circle")
                                    .font(Z.sans(15)).foregroundColor(item.done ? Z.ontime : Z.ink2(dark))
                                Text(item.name).font(Z.sans(12, .medium)).strikethrough(item.done)
                                    .foregroundColor(item.done ? Z.ink2(dark) : Z.ink(dark)).lineLimit(1)
                                Spacer(minLength: 0)
                            }
                            .padding(.horizontal, 8).frame(height: 26)
                            .background(RoundedRectangle(cornerRadius: 12).fill(Z.inset(dark)))
                        }
                        if d.items.count == 5 {
                            Text(m.label("addDeed")).font(Z.sans(12)).foregroundColor(Z.ink2(dark))
                                .frame(maxWidth: .infinity, minHeight: 26)
                                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Z.dash(dark), style: StrokeStyle(lineWidth: 1, dash: [4, 3])))
                        }
                    }
                }
            }
            Spacer(minLength: 0)
        }
        .padding(10)
        .containerBackground(for: .widget) { Z.card(dark) }
    }
}

// MARK: - Lock screen (monochrome; iOS tints these)

struct ZadLockWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "ZadLock", provider: ZadProvider()) { entry in
            ZadLockView(entry: entry)
        }
        .configurationDisplayName("Zad")
        .description("Next prayer and today's prayers.")
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
                    // "ʿAsr 3:42 PM"
                    Label("\(m.focusName) \(WidgetModel.fmt12(m.focusTime))", systemImage: "moon.fill")
                case .accessoryRectangular:
                    VStack(alignment: .leading, spacing: 1) {
                        Text(m.label(m.isNow ? "now" : "nextPrayer").uppercased()).font(Z.sans(11, .bold)).tracking(1).opacity(0.8)
                        HStack(alignment: .firstTextBaseline) {
                            Text(m.focusName).font(Z.serif(20, .semibold)).lineLimit(1)
                            Spacer(minLength: 4)
                            Text(WidgetModel.fmt12(m.focusTime)).font(Z.sans(16, .bold)).lineLimit(1)
                        }
                        ProgressView(timerInterval: m.progressRange, countsDown: false, label: { EmptyView() }, currentValueLabel: { EmptyView() }).tint(.primary).widgetAccentable()
                    }
                default:
                    PrayersRing(prayed: m.prayed, label: m.label("prayers"))
                }
            } else {
                switch family {
                case .accessoryInline: Text(entry.staleLabel)
                default: Image(systemName: "moon.fill")
                }
            }
        }
        .widgetURL(entry.model?.logURL ?? WidgetModel.openURL("home"))
        .containerBackground(for: .widget) { AccessoryWidgetBackground() }
    }
}

/// Circular: "3/5" inside a five-segment ring.
struct PrayersRing: View {
    let prayed: Int
    let label: String
    var body: some View {
        ZStack {
            ForEach(0..<5, id: \.self) { i in
                let gap = 0.025
                Circle()
                    .trim(from: Double(i) / 5 + gap, to: Double(i + 1) / 5 - gap)
                    .stroke(style: StrokeStyle(lineWidth: 4, lineCap: .round))
                    .opacity(i < prayed ? 1 : 0.3)
                    .rotationEffect(.degrees(-90))
            }
            .padding(3)
            VStack(spacing: -2) {
                HStack(alignment: .firstTextBaseline, spacing: 0) {
                    Text("\(prayed)").font(Z.sans(18, .bold))
                    Text("/5").font(Z.sans(10, .bold)).opacity(0.7)
                }
                Text(label.uppercased()).font(Z.sans(6, .bold)).opacity(0.8)
            }
        }
        .widgetAccentable()
    }
}
