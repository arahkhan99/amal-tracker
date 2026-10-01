# Prayer & Amal Tracker

Offline tracker for the five daily prayers, daily amal and qada (makeup prayers and fasts), built from the "Prayer & Amal Tracker" prototype. Everything is stored on your phone. There are no accounts and no server.

- **Android:** a real app (`PrayerTracker.apk`) with reminders, GPS prayer times and a fingerprint lock.
- **iPhone:** the same app as a Home Screen web app (PWA). It works offline, but reminders only show inside the app because iOS doesn't let web apps schedule notifications.

## Install

**Android (updates arrive automatically)**
1. Every push to `main` runs `.github/workflows/android.yml`, which tests and builds the app, signs it with the permanent key, and sends it through **Firebase App Distribution**. A copy is also attached to https://github.com/arahkhan99/amal-tracker/releases/latest.
2. The first time, open the Firebase invite email on the phone and follow it to install **App Tester**. Install Amal Tracker from there. Later updates show up in App Tester (and by email) for a one-tap install, and your data is kept.
3. Open **Amal Tracker**, allow location and notifications, and turn on **Settings → Cloud backup** (sign in with Google) so your logs are backed up and sync.

The signing key is in `C:/Users/chito/amal-tracker-signing` and in the repo's GitHub secrets. Keep that folder safe: without the key, updates can't install over the app. Firebase project: `amal-tracker-cfe23`.

**iPhone (web version, reminders only inside the app)**
1. Open https://arahkhan99.github.io/amal-tracker/ in **Safari** (it must be Safari).
2. Tap Share, then **Add to Home Screen**.
3. Open it from the Home Screen icon. After the first load it works offline.

## Develop

```
npm install
npm run dev            # live preview at http://localhost:5173
npm test               # unit tests (store, prayer times, stats, reminders)
npm run build          # production web build in dist/
npm run shots          # Playwright walk-through of every screen -> shots/ (BROWSER=webkit for Safari engine)
npm run check:emulator # drive the installed APK on a running Android emulator
npm run build:android  # build, sync to Android, produce PrayerTracker.apk
```

For a fresh machine, the Android toolchain is set up once with:
```
winget install EclipseAdoptium.Temurin.21.JDK
powershell -ExecutionPolicy Bypass -File scripts/setup-android-sdk.ps1
```

The iPhone version publishes automatically: every push to `main` runs `.github/workflows/pages.yml`, which tests, builds and deploys to GitHub Pages.

## How it works

| File | Purpose |
|---|---|
| `index.html`, `src/styles.css` | Markup and styles carried over from the prototype |
| `src/store.js` | All data, in one JSON document in local storage. Also the qada rules: Missed adds one, changing it removes it, made-up prayers count toward the month's goal. |
| `src/times.js` | Prayer times calculated offline with the `adhan` library (ISNA by default, Hanafi or standard Asr) |
| `src/hijri.js` | Hijri date (Umm al-Qura), offline |
| `src/stats.js` | Day, week, month and year percentages, streaks, and the "Doing well" and "Needs more care" insights |
| `src/notify.js` | Android reminders: before a prayer becomes qada, prayer start, 9:30 PM check-in, Friday seerah. Rescheduled for the next 7 days every time the app opens or something is logged. |
| `src/views/*` | One file per screen |
| `src/platform.js` | GPS, city lookup, file export and share, app lock |

Back up regularly from **Settings → Back up**. The backup file restores everything on a new phone.
