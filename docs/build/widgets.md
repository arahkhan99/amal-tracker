# Home-screen widgets

Zad has three home-screen widgets on Android and iPhone, plus three lock-screen widgets on iPhone. They follow the approved designs in `design-review/mockups2/widgets/`:

- **Small (2x2), "Hero card" (Small A).** Forest card with Next/Now, the prayer, its time, the countdown and the Prayed button. It looks the same in light and dark.
- **Medium (4x2), "Tiles" (Medium A).** Forest card with a next-prayer header and five prayer tiles: status mark, name, time and sunnah dot.
- **Large (4x4), "Hero + deeds" (Large A).** Forest hero (Hijri date, countdown and Prayed button) over the five-prayer row, Good Deeds and the make-ups chip. The card follows the light or dark theme.
- **iOS lock screen** (monochrome):
  - inline: "ʿAsr 3:42 PM"
  - rectangular: Next prayer, its time and a progress bar
  - circular: prayers done out of 5, as a five-segment ring

## How it works

```
web app (store change / redraw)
  └─ src/widget-bridge.js ── onRender → buildSnapshot (src/widgets.js) → ZadWidgets.setSnapshot({ json })
        Android: SharedPreferences "zad_widgets"/"snapshot" → WidgetUpdater.updateAll()
        iOS:     UserDefaults(suiteName: "group.com.zad.app")["snapshot"] → WidgetCenter.reloadAllTimelines()
widgets read only the snapshot and work out "now / next" and the countdown themselves
widget tap → zad:// deep link → @capacitor/app appUrlOpen → src/widget-bridge.js opens the sheet
```

### The snapshot (`src/widgets.js`, version 1)

The snapshot covers **yesterday, today and the next two days**. Each day has:

- the prayer times and sunrise, as epoch ms
- `ishaBest`: the middle of the night, used as ʿIshāʾ's "best before"
- the display names, including Jumuʿah on Fridays
- the Hijri label
- each prayer's status and sunnah-logged flag
- the excused flag

The snapshot also has the make-ups owed (`null` when the Make-ups module is off) and today's Good Deeds: done, total and up to 6 names (`null` when the module is off). It carries the English UI labels too, so the native code doesn't hard-code wording.

The app writes the snapshot after every redraw (`app.js` `onRender`). That covers every commit, the cloud merge, the midnight rollover and the app's 20-second tick. Writes are coalesced over 400 ms, and the app skips a write when the content hasn't changed (the signature ignores `generatedAt`). The app writes nothing until onboarding is done. On the web, none of this runs.

### Widget logic

`widgetModel(snapshot, now)` in `src/widgets.js` is the reference. `tests/widgets.test.js` specifies its behaviour. The native code ports it line by line: `android/app/src/main/java/com/zad/app/widget/WidgetModel.java` and `ios/App/ZadWidget/WidgetModel.swift`. It follows the app's own rules (`times.currentWindow` / `nextPrayer`):

- **Now mode.** A prayer's time is in and it isn't logged. The widget counts down to the end of that prayer's time. For ʿIshāʾ, it counts to the middle of the night first. The tap opens that prayer's log sheet.
- **Next mode.** The current prayer is logged, or nothing is due (for example between sunrise and Zuhr). The widget counts down to the next prayer's start. The button reads **Log today** and opens the Today sheet. This is a small change from the mock, which shows "Prayed" next to a prayer that hasn't started: logging a prayer before its time makes no sense.
- **New day.** After midnight the next day's entry takes over, with no statuses and Good Deeds reset to 0.
- **Out of range.** If the snapshot doesn't cover today (the app hasn't been opened for about 3 days), the widget shows "Open Zad to update".

### Deep links

| Link | Opens |
|---|---|
| `zad://log?p=Asr&d=2026-11-05` | Home, then that prayer's log sheet (`A.prayerSheet`). A future date opens Today instead. |
| `zad://today` | Home, then the Today sheet |
| `zad://open?v=qada` | That tab, if it's enabled (otherwise Home) |

`parseDeepLink` only accepts the five prayer keys and a `YYYY-MM-DD` date.

## Android

- Plugin: `android/app/src/main/java/com/zad/app/ZadWidgetsPlugin.java`. It is registered in `MainActivity.java`.
- Widgets: `android/app/src/main/java/com/zad/app/widget/`
  - `ZadSmall`/`ZadMedium`/`ZadLargeWidgetProvider`: classic `AppWidgetProvider`s with RemoteViews, not Glance, so no Kotlin or Compose is needed.
  - `WidgetRenderer` fills the layouts.
  - `WidgetUpdater` redraws all the widgets and arms the next tick.
  - `WidgetTickReceiver` handles the minute tick and clock/time-zone changes.
- Resources, all prefixed `zw_`:
  - `res/layout/zw_widget_*.xml`. The sample text in them doubles as the widget-picker preview (`previewLayout`).
  - `res/xml/zw_widget_*_info.xml`
  - `res/drawable/zw_*.xml`
  - `res/values/zw_colors.xml` and `values-night/zw_colors.xml`, used for the theme-following large card
- Manifest:
  - three widget receivers and the tick receiver
  - a `zad` scheme intent-filter on `MainActivity` (`launchMode="singleTask"`, so a tap while the app is open arrives as `appUrlOpen`)
- **Countdown refresh.** `WidgetUpdater` sets an inexact **RTC (non-wakeup) alarm** for the start of the next minute, or the next prayer boundary if sooner. While the phone sleeps, the alarm waits and fires when the screen comes on, so it costs no background wake-ups. `updatePeriodMillis` (30 min) re-arms it after a reboot. The app doesn't need `SCHEDULE_EXACT_ALARM` for this.
- **Fonts.** The prayer names use the system `serif` and the rest the system sans. RemoteViews can't load Amiri or Manrope from the `.woff2` files the web app bundles. To get Amiri, add a TTF under `res/font/` and set `android:fontFamily="@font/amiri"` (Android 8+).

### Build

```
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

## iOS

The app-side files are in the Xcode project already:

- `ios/App/App/ZadWidgetsPlugin.swift`: the plugin. It writes to the App Group and reloads the timelines.
- `ios/App/App/ZadBridgeViewController.swift`: registers the plugin. `SceneDelegate.swift` and `Main.storyboard` now use it.
- the `zad` URL scheme in `ios/App/App/Info.plist`

Until the App Group is set up, the plugin falls back to the app's own defaults: the write succeeds, but the widget can't see it.

The widget extension's sources are in `ios/App/ZadWidget/`:

- `ZadWidget.swift`: the bundle, the timeline, and all the home and lock-screen views
- `WidgetModel.swift`: the snapshot decoder and the logic port
- `Info.plist` and `ZadWidget.entitlements`

**The extension target is not in `project.pbxproj` yet.** Adding a target by hand-editing the project file is error-prone, and so is signing an App Group without a team. To add it in Xcode on a Mac:

1. **Apple Developer account (paid).** App Groups need it, and personal (free) teams can't use them. In the developer portal, create the App Group `group.com.zad.app`.
2. `npm run build:ios`, then open `ios/App/App.xcodeproj`.
3. **File ▸ New ▸ Target ▸ Widget Extension.** Name it `ZadWidget`. Bundle id: `com.zad.app.ZadWidget`. Untick "Include Live Activity" and "Include Configuration App Intent". When asked, activate the scheme.
4. Xcode creates a `ZadWidget` folder with template files. Delete the template Swift files and their asset catalog if unused. Then add the files that are already on disk in `ios/App/ZadWidget/` to the **ZadWidget** target only: `ZadWidget.swift`, `WidgetModel.swift` and `Info.plist`. If Xcode created its own `Info.plist`, keep ours: in the target's build settings, set **Info.plist File** to `ZadWidget/Info.plist`.
5. ZadWidget target ▸ General:
   - **Minimum Deployments: iOS 17.0.** The views use `containerBackground` and `contentMarginsDisabled`. The app itself stays on iOS 15; the widget simply isn't offered on older iOS.
   - Swift Language Version: 5.
6. **Signing & Capabilities.** On both the **App** and **ZadWidget** targets, pick your team. Then use **+ Capability ▸ App Groups** and tick `group.com.zad.app`. If Xcode asks for an entitlements file, point it at `App/App.entitlements` and `ZadWidget/ZadWidget.entitlements`, which are already written with that group.
7. Check that the App target's **Build Phases ▸ Embed Foundation Extensions** contains `ZadWidget.appex`. Xcode adds it when it creates the target.
8. Build and run the App scheme on a device. Open Zad once so it writes the snapshot, then add the widgets: long-press the Home Screen ▸ + ▸ Zad. For the lock-screen widgets: long-press the Lock Screen ▸ Customise.

### iOS notes

- **Countdown.** Each timeline holds one entry per minute for 3 hours (policy `.atEnd`). Every entry recomputes the model from the snapshot, so it stays right without the app. The app also calls `reloadAllTimelines()` on every change.
- **Taps.**
  - Small: the whole widget is one `widgetURL`. iOS doesn't allow separate links on small widgets.
  - Medium and Large: each tile, the hero, the make-ups chip and the deeds use `Link`s.
  - Lock screen: the widget opens the current log target.
- **One-tap logging inside the widget** (App Intents, iOS 17) is not built. Every tap opens the app's log sheet, as agreed.
- **Fonts.** The views use the system serif (New York) and sans. To use Amiri or Manrope, add the TTFs to the extension target and list them under `UIAppFonts` in `ZadWidget/Info.plist`.

## Tests

`tests/widgets.test.js` covers:

- the snapshot builder: days, times, Jumuʿah, statuses, sunnah, Good Deeds, modules off, the signature and the size
- the widget logic: next mode vs now mode, later moments from one snapshot, the ʿIshāʾ middle of the night, the midnight rollover with last night's ʿIshāʾ, excused days, a stale snapshot, and the next redraw time
- countdown formatting and deep-link parsing

The Java and Swift ports have no unit tests of their own. They follow the JS reference.
