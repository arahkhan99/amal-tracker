# Crash reporting (Firebase Crashlytics)

Zad sends crash and non-fatal error reports from the Android and iPhone app to Firebase Crashlytics
(project `amal-tracker-cfe23`). The web/PWA build sends nothing. Users can turn it off in
**Settings → Account → Send crash reports** (on by default).

## What is sent

- Crashlytics' own data: device model, OS version, app version, crash stack traces, a random installation ID.
- Non-fatal JS errors from `window` `error` and `unhandledrejection`: a short message (max 200 chars,
  emails and precise numbers scrubbed) and up to 20 stack frames (file base name, function, line).
  Deduplicated, at most 10 per launch.
- Custom keys, and only these (`CRASH_KEYS` in `src/crash.js`): `app_version`, `view`, `platform`, `theme`.

Never add names, emails, user IDs (`setUserId`), locations, madhhab, prayer/amal/qada logs or notes.
`tests/crash.test.js` checks that no other key gets through.

## Code

| File | Role |
| --- | --- |
| `src/crash.js` | `initCrash`, `setCrashReporting`, `recordError`, `crashView`, `crashTheme`; all no-ops on web |
| `src/main.js` | calls `initCrash(...)` at start, updates view/theme keys on render |
| `src/views/settings.js` | `A.crashToggle` and the switch row (native only); setting is `S.settings.crashReports` (`!== false` = on) |
| `src/strings.js` | `SETTINGS.crashReports*` |
| `public/privacy.html` | "Crash reports" section, table row, choices bullet |

Turning the switch off calls `setEnabled({ enabled: false })` and `deleteUnsentReports()`, and JS stops
recording at once. Native crash collection fully stops from the next launch (a Crashlytics limitation).

## Android

- `@capacitor-firebase/crashlytics` 8.x (Capacitor 8). Native SDK `firebase-crashlytics` 20.0.3 by default;
  override with `firebaseCrashlyticsVersion` in `android/variables.gradle` if it ever conflicts.
- `android/build.gradle`: `classpath 'com.google.firebase:firebase-crashlytics-gradle:3.0.8'`.
- `android/app/build.gradle`: `apply plugin: 'com.google.firebase.crashlytics'` inside the existing
  `google-services.json` check (Crashlytics needs its `google_app_id`). Release has
  `mappingFileUploadEnabled = true`; it only uploads when `minifyEnabled` is on (it is currently `false`,
  so there is nothing to upload yet). Debug never uploads.
- CI (`.github/workflows/android.yml`) needs no change: it already writes `google-services.json`.
  With minify off, `uploadCrashlyticsMappingFileRelease` is not part of `assembleRelease`/`bundleRelease`
  (checked with `--dry-run`). If minify is turned on later, the release build uploads the mapping file
  itself (it needs network access on the build machine and the real `google-services.json`).

## iOS (must be done on a Mac)

`ios/App` uses Swift Package Manager (`CapApp-SPM`). `capacitor.config.json` already has the
`packageOptions` → `@capacitor-firebase/crashlytics` → `symlink: true` entry the plugin needs (avoids an
SPM package identity collision; needs Capacitor CLI 8.4+, we have 8.6).

On Windows `npx cap sync ios` does not regenerate `ios/App/CapApp-SPM/Package.swift` (it is also missing
`@capacitor/haptics`), so on the Mac:

1. `npm install` then `npx cap sync ios`. Check `CapApp-SPM/Package.swift` now lists
   `CapacitorFirebaseCrashlytics` (as a package and a product). Do not edit that file by hand.
2. Open `ios/App/App.xcodeproj` in Xcode, let packages resolve (File → Packages → Resolve Package Versions).
3. Target **App** → **Build Settings** → search `debug information format` → set
   **Debug Information Format** to **DWARF with dSYM File** for Debug and Release.
4. Target **App** → **Build Phases** → **+** → **New Run Script Phase**, drag it to be the **last** phase,
   name it "Upload dSYMs to Crashlytics", script:

   ```
   "${BUILD_DIR%/Build/*}/SourcePackages/checkouts/firebase-ios-sdk/Crashlytics/run"
   ```

   Input Files:

   ```
   ${DWARF_DSYM_FOLDER_PATH}/${DWARF_DSYM_FILE_NAME}
   ${DWARF_DSYM_FOLDER_PATH}/${DWARF_DSYM_FILE_NAME}/Contents/Resources/DWARF/${PRODUCT_NAME}
   ${DWARF_DSYM_FOLDER_PATH}/${DWARF_DSYM_FILE_NAME}/Contents/Info.plist
   $(TARGET_BUILD_DIR)/$(UNLOCALIZED_RESOURCES_FOLDER_PATH)/GoogleService-Info.plist
   $(TARGET_BUILD_DIR)/$(EXECUTABLE_PATH)
   ```

   If `ENABLE_USER_SCRIPT_SANDBOXING=YES` and `ENABLE_DEBUG_DYLIB=YES`, also add
   `${DWARF_DSYM_FOLDER_PATH}/${DWARF_DSYM_FILE_NAME}/Contents/Resources/DWARF/${PRODUCT_NAME}.debug.dylib`.
5. `GoogleService-Info.plist` must be in the App target (it already is for sign-in). Leave the widget target alone.

## Firebase console (one time)

1. Firebase console → project `amal-tracker-cfe23` → **Crashlytics** → enable it for the Android app
   (`com.zad.app`) and the iOS app.
2. Install a build, open it, then force a test crash once to finish setup, e.g. from the WebView devtools
   console: `Capacitor.Plugins.FirebaseCrashlytics.crash({ message: "Test" })`, then reopen the app
   (reports are sent on the next launch).
3. Optional: Crashlytics → settings → set data retention to the shortest option; the privacy page says
   "up to 90 days".

## Store privacy forms (must be updated before the next release)

- **Google Play → Data safety**: declare *App info and performance → Crash logs* and *Diagnostics*,
  collected, not shared, purpose *App functionality / Analytics (diagnostics)*, processed ephemerally: no,
  optional for the user: yes (they can turn it off), encrypted in transit: yes. Also *Device or other IDs*
  (Crashlytics installation ID).
- **App Store → App Privacy**: add *Diagnostics → Crash Data* (and *Other Diagnostic Data*), not linked to
  the user's identity, not used for tracking, purpose *App Functionality*.
- Update `docs/privacy-answers.md` to match.
