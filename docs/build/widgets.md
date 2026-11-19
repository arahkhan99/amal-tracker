# Home-screen widgets

Zad has three home-screen widgets on Android and iPhone, plus three lock-screen widgets on iPhone. They follow the approved designs in `design-review/mockups2/widgets/`:

- **Small (2x2), "Hero card" (Small A).** Forest card with Next/Now, the prayer, its time, the countdown and the Prayed button. It looks the same in light and dark.
- **Medium (4x2), "Tiles" (Medium A).** Forest card with a next-prayer header and five prayer tiles: status mark, name, time and sunnah dot.
- **Large (4x4), "Hero + deeds" (Large A).** Forest hero (Hijri date, countdown and Prayed button) over the five-prayer row, Good Deeds and the make-ups chip. The card follows the light or dark theme.
- **iOS lock screen** (monochrome):
  - inline: "ʿAsr 3:42 PM"
  - rectangular: Next prayer, its time and a progress bar
  - circular: prayers done out of 5, as a five-segment ring
- **iOS 18 Control** ("Log prayer"): a button for Control Centre, the Lock Screen controls or the Action button. It logs the prayer whose time is in as on time.

## How it works

```
web app (store change / redraw)
  └─ src/widget-bridge.js ── onRender → buildSnapshot (src/widgets.js) → ZadWidgets.setSnapshot({ json })
        Android: SharedPreferences "zad_widgets"/"snapshot" → WidgetUpdater.updateAll()
        iOS:     UserDefaults(suiteName: "group.com.zad.app")["snapshot"] → WidgetCenter.reloadAllTimelines()
widgets read only the snapshot and work out "now / next" and the countdown themselves
widget tap → zad:// deep link → @capacitor/app appUrlOpen → src/widget-bridge.js opens the sheet
one-tap button (iOS 17+ App Intent, iOS 18 Control) → appends to the "pendingLogs" queue in the App Group
  → the app merges it on open / resume (src/pending.js, ZadWidgets.getPending / clearPending)
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
  - `WidgetTickReceiver` handles the boundary tick, clock/time-zone changes and the exact-alarm permission changing.
- Resources, all prefixed `zw_`:
  - `res/layout/zw_widget_*.xml`. The sample text in them doubles as the widget-picker preview (`previewLayout`).
  - `res/xml/zw_widget_*_info.xml`
  - `res/drawable/zw_*.xml`
  - `res/values/zw_colors.xml` and `values-night/zw_colors.xml`, used for the theme-following large card
- Manifest:
  - three widget receivers and the tick receiver
  - a `zad` scheme intent-filter on `MainActivity` (`launchMode="singleTask"`, so a tap while the app is open arrives as `appUrlOpen`)
- **Countdown refresh.** The countdown is a count-down `Chronometer` (`setChronometer` + `setChronometerCountDown`), so it ticks by itself. `WidgetUpdater` only redraws at the next boundary (a prayer starts or its window ends, sunrise, middle of the night, midnight) with an **RTC (non-wakeup) alarm**: exact (`setExactAndAllowWhileIdle`) when `canScheduleExactAlarms()` is true (the app already declares `SCHEDULE_EXACT_ALARM` for the reminders; `USE_EXACT_ALARM` is not used), otherwise `setWindow` from the boundary (Android 12+ stretches it to its minimum). While the phone sleeps, the alarm waits and fires when the screen comes on, so it costs no background wake-ups. `updatePeriodMillis` (30 min) re-arms it after a reboot.
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

- `ZadWidget.swift`: the bundle, the timeline, all the home and lock-screen views, the App Intents and the iOS 18 Control
- `WidgetModel.swift`: the snapshot decoder, the pending-log queue and the logic port
- `Info.plist` (`NSExtensionPointIdentifier` = `com.apple.widgetkit-extension`) and `ZadWidget.entitlements` (App Group `group.com.zad.app`)

### The extension target is added by CI (no Mac needed)

`project.pbxproj` in git has no `ZadWidget` target. On every run, `.github/workflows/ios.yml` (both the `build` and the `testflight` job) runs `scripts/ios/add-widget-target.rb` after `npx cap sync ios`. The script uses the `xcodeproj` Ruby gem (the one CocoaPods uses) and:

- adds the app-extension target `ZadWidget`: the two Swift files in its Sources, `WidgetKit`, `SwiftUI` and `AppIntents` linked, bundle id `<app id>.ZadWidget` (`com.zad.app.ZadWidget`), `INFOPLIST_FILE` = `ZadWidget/Info.plist`, `CODE_SIGN_ENTITLEMENTS` = `ZadWidget/ZadWidget.entitlements`, minimum **iOS 16.0**, Swift 5, `SKIP_INSTALL` = YES, automatic signing, the same version numbers as the app
- embeds `ZadWidget.appex` in `App.app/PlugIns` (an "Embed Foundation Extensions" phase on the App target) and makes App depend on ZadWidget, so building the `App` scheme builds the widget too
- sets the App target's `CODE_SIGN_ENTITLEMENTS` to `App/App.entitlements` (App Group `group.com.zad.app` and Sign in with Apple), which the project didn't use before
- checks the result and stops the build if anything is missing

It is idempotent: if the target already exists, its settings are left alone and only the embed phase, the dependency and the App entitlements are checked. The edited project is used for that run only and never committed. The unsigned build then checks that `App.app/PlugIns/ZadWidget.appex` exists and prints its bundle id, extension point and minimum iOS; the TestFlight job checks the appex is in the archive.

To build on a Mac anyway: `npm run build:ios`, `gem install xcodeproj`, `ruby scripts/ios/add-widget-target.rb`, then open `ios/App/App.xcodeproj` (do not commit the changed `project.pbxproj` unless you mean to; the script would then just skip).

Signing needs the Apple Developer account (paid; free teams can't use App Groups): the widget needs its **own App ID** `com.zad.app.ZadWidget` with the **App Groups** capability set to `group.com.zad.app`, and `com.zad.app` needs the same group. See "Widget extension" in `docs/ios-setup.md`.

After installing: open Zad once so it writes the snapshot, then add the widgets: long-press the Home Screen ▸ + ▸ Zad. Lock-screen widgets: long-press the Lock Screen ▸ Customise. The Control (iOS 18): Control Centre ▸ + ▸ Add a Control ▸ Zad, or Settings ▸ Action Button.

### iOS notes

- **Minimum iOS 16.** The app itself supports iOS 15; on iOS 15 the widgets just aren't offered. iOS 17 and 18 APIs are behind `#available`: `containerBackground` and `contentMarginsDisabled` (iOS 17), interactive buttons (iOS 17), the Control (iOS 18).
- **Countdown.** The countdown is `Text(timerInterval:countsDown:)` and the lock-screen bar `ProgressView(timerInterval:)`, which update themselves. Every timeline entry recomputes the model from the snapshot (with the pending queue laid over it), so it stays right without the app. The app also calls `reloadAllTimelines()` (and on iOS 18 `ControlCenter.reloadAllControls()`) on every change.
- **One-tap logging is built.**
  - Home-screen widgets, iOS 17+: the Prayed / Congregation / Remembered / Undo buttons are `Button(intent: LogPrayerIntent)`. The intent runs in the extension without opening the app, appends an entry to the `pendingLogs` queue in the App Group and redraws the widgets. The app merges the queue on open and on resume (`src/pending.js`), with the same rules as a manual log (nothing before the prayer's time, a later in-app log wins).
  - iOS 18 Control: `LogNowIntent` logs the prayer whose time is in as on time (nothing when none is open).
  - iOS 16: the same buttons are `Link`s that open the prayer's log sheet.
  - Other taps open the app: Medium and Large tiles, the make-ups chip and the deeds use `Link`s; the rest of the widget uses `widgetURL`.
  - Lock-screen widgets (inline, rectangular, circular) can't hold buttons here: a tap opens the current prayer's log sheet.
- **Fonts.** The views use the system serif (New York) and sans. To use Amiri or Manrope, add the TTFs to the extension target and list them under `UIAppFonts` in `ZadWidget/Info.plist`.

## Tests

`tests/widgets.test.js` covers:

- the snapshot builder: days, times, Jumuʿah, statuses, sunnah, Good Deeds, modules off, the signature and the size
- the widget logic: next mode vs now mode, later moments from one snapshot, the ʿIshāʾ middle of the night, the midnight rollover with last night's ʿIshāʾ, excused days, a stale snapshot, and the next redraw time
- countdown formatting and deep-link parsing

The Java and Swift ports have no unit tests of their own. They follow the JS reference.
