# Zad: progress and handoff

Last updated: 5 November 2026. Read this first in a new session.

## How to resume in a new Claude Code session

Open Claude Code in `C:\Users\chito\amal-tracker` and paste:

> Read docs/PROGRESS.md and my Zad Launch Checklist doc (https://claude.ai/artifact/DLYKfiDARbX83GJcvh2cNQ), then continue with "Next steps" in order. Use parallel agents for independent work. Don't push, deploy or submit anything without asking me.

Claude's memory also holds a short summary of this project (`zad-app-project`) and the rule to use parallel agents (`parallel-agents`).

## The app in one paragraph

Zad (store name **Zad Tracker**) is a personal prayer, amal and qada tracker built from the user's "Prayer & Amal Tracker" prototype. It's built with Vite and vanilla JS, then wrapped with Capacitor 8 for **Android and iOS**. The **target is Google Play and the App Store**; the web app is being retired. Data lives on the phone (localStorage), with optional Google sign-in for cloud backup and sync through Firebase (Auth + Firestore). Prayer times are calculated offline with `adhan`.

## Key places and IDs

| What | Where / value |
|---|---|
| Code | `C:\Users\chito\amal-tracker`, GitHub `arahkhan99/amal-tracker` (public) |
| Launch checklist (Claude Doc, tick items here) | https://claude.ai/artifact/DLYKfiDARbX83GJcvh2cNQ |
| Source checklist from a peer | `C:\Users\chito\Downloads\App Launch Readiness Checklist.txt` |
| Logo mockup (approved option B1) | https://claude.ai/artifact/58JLXE6cxxRDXeGRgTzTac |
| Colour mockup | https://claude.ai/artifact/N9U1y94VjECBKjdHj8BmZj |
| Logo source files | `C:\Users\chito\Downloads\Zad_Logo_Concept_6_Files.zip`; cleaned copies in `assets/` (`zad-icon-512.png`, `zad-icon-original.png`) and `public/logo/` |
| App ID (both stores, permanent) | `com.zad.app` (was `com.amaltracker.app`) |
| Firebase project | `amal-tracker-cfe23` (shown as "Zad App") |
| Firebase Android app (new) | `1:256536797102:android:572fee9ca637c2ebc5723f` |
| Firebase iOS app | `1:256536797102:ios:70d165fca3096b0ec5723f` |
| Firebase Android app (old, still used by the current GitHub secret) | `1:256536797102:android:3a40c537e3c1ec40c5723f` |
| Signing key (Android) | `C:\Users\chito\amal-tracker-signing` (keystore + `keystore.properties`); also GitHub secrets. Never commit it |
| Policy site | https://arahkhan99.github.io/amal-tracker/ (still shows the old web app until the next push) |
| Developer accounts | None yet. They will use arah.khan99@gmail.com |

## Decisions made

- **Platforms:** Android + iOS store apps. The web app is retired; GitHub Pages keeps only a landing page and the five policy pages (privacy, terms, support, delete-account, release notes).
- **App ID:** `com.zad.app`.
- **Store name:** "Zad Tracker", checked free on both stores on 3 Nov 2026. The home-screen label stays "Zad". App Store subtitle: "Salah, Qada & Prayer Habits".
- **Logo:** option **B1**, the designer's Zay letter as-is, in the app (home header, onboarding, lock screen). Done.
- **Phone icon and splash:** use the designer's dark-green app icon **for now**; the user will revise it before going public.
- **Location:** rounded to 2 decimals (within about 785 m, always under 1 km). Declare **"Precise location" on Google Play** (Play calls anything finer than 3 km² precise) and **Coarse location on Apple**.
- **Colours:**
  - Reflection tag: **option B**, same gold (#C9A227) with dark green text (#0F3D2E).
  - **Deeper red** for Missed: `--miss` from #B8513C to #9E3F2C.
  - Applied 5 Nov 2026.
- **Support email:** decide later; the policy pages use `{{SUPPORT_EMAIL}}` and `{{EFFECTIVE_DATE}}` placeholders.
- **Phone-only:** no tablet or iPad listing (assumed; the user hasn't objected).
- **Accounts:** no store accounts yet. Build everything that doesn't need one.

## Done (committed and live)

- **The app:** home, tracker, qada, progress, settings and onboarding; reminders; offline prayer times; backup and CSV export; app lock.
- **Firebase:** Google sign-in plus Firestore sync, with owner-only rules.
- **Updates:** the GitHub Actions workflow `android.yml` builds a signed APK and sends it through Firebase App Distribution to arah.khan99@gmail.com. `pages.yml` deploys the website.
- **Rename:** the app shows "Zad" (commit 69d8495).

## Done but NOT committed or pushed yet (in the working tree)

All of this passes `npx vitest run` (33 passed, 9 rules tests skipped unless the emulator runs), `npx vite build`, and `node scripts/screenshots.mjs`.

- **App ID** switched to `com.zad.app` on Android (namespace, applicationId, MainActivity moved to `com/zad/app`, strings). `android/app/google-services.json` (gitignored) now contains the new app.
- **App Bundle:** the GitHub build also produces `Zad.aab` for Play, and the outputs are renamed to `Zad.apk` / `Zad.aab`. `scripts/build-apk.mjs` supports `--debug` and `--bundle`.
- **iOS project** in `ios/` (Capacitor SPM):
  - display name Zad, iPhone only, portrait
  - Info.plist permission texts; privacy manifest (`PrivacyInfo.xcprivacy`, coarse location); encryption answer
  - Google sign-in (URL scheme); `GoogleService-Info.plist` is local only and gitignored
  - only Google's SDK is linked, via `packageTraits` in `capacitor.config.json`
  - `.github/workflows/ios.yml`: an unsigned build on every push, plus a TestFlight job that stays off unless the repo variable `IOS_UPLOAD_ENABLED` is `true`
  - setup notes in `docs/ios-setup.md`
- **In-app account deletion** (Settings → Delete my account) and **terms agreement at sign-in** (`TERMS_VERSION` in `src/cloud.js`, saved in `profile.consent`). Tested with fake Firebase only (`tests/account.test.js`).
- **Version and About:** Settings → About shows the version and links to the 5 policy pages.
- **Accessibility:** labels, switches, keyboard support, focus inside sheets, darker grey text.
- **Approximate location:** rounding in `src/util.js` (`roundCoord`), `src/platform.js` and `src/store.js` (normalize).
- **Reminders:**
  - `USE_EXACT_ALARM` and `WAKE_LOCK` removed from the Android manifest.
  - Reminders are scheduled inexact unless exact alarms are allowed; a Settings → "On-time reminders" row asks for them.
  - The iOS limit of 64 notifications is respected (the soonest 60 are kept).
- **Logo B1** in the app (`public/logo/zad-symbol.png` and `@2x`).
- **Policy pages** in `public/*.html` with `legal.css`, rewritten for the store apps. The site build is `site/` (landing page, `404.html`, and a self-removing `sw.js` that cleans up old web-app installs); `pages.yml` deploys only those files.
- **Database rules tests:** `tests/rules.test.js`, run with `npm run test:rules` (needs Java on PATH).
- **Docs:**
  - `docs/privacy-answers.md`: store privacy forms, with Play precise location and Apple coarse location.
  - `docs/store-listing.md`: names, descriptions and keywords for both stores.
- **Store screenshot script:** `scripts/store-screenshots.mjs` writes to `store-shots/` (gitignored). Retaken 5 Nov with the B1 logo and new colours.

## Next steps (in order)

Steps 1–4 from 5 Nov are done and not yet committed:
- **Colours:** tag text is now `#0F3D2E`, and `--miss` is `#9E3F2C`.
- **Play precise location:** recorded in `docs/privacy-answers.md`.
- **Icons:** everything is generated from `assets/zad-icon-512.png` by `node scripts/make-icons.mjs`, including the Android adaptive icon (checked on the emulator) and the iOS 1024 icon.
- **Capacitor:** aligned at 8.6.0.
- **Store screenshots:** retaken with the new logo.

1. **Ask the user before pushing.** Then:
   - update GitHub secrets: `GOOGLE_SERVICES_JSON` (from `android/app/google-services.json`) and `FIREBASE_ANDROID_APP_ID` = `1:256536797102:android:572fee9ca637c2ebc5723f`
   - create `GOOGLE_SERVICE_INFO_PLIST` (from `ios/App/App/GoogleService-Info.plist`)
   - commit and push
   - watch `android.yml`, `ios.yml` (the first real iOS compile) and `pages.yml`
   - the user uninstalls the old app (`com.amaltracker.app`), installs the new one from the App Tester email, and signs in to restore their data
2. **Retake the Settings store screenshot** from the phone build, so it shows the phone wording.
3. **Tick items off** in the Claude Doc checklist.

## Still open after that (from the checklist)

- **Sign in with Apple:** Apple requires it because Google sign-in is offered. It needs the Apple Developer account to switch on; the code can be prepared before then.
- **Real-device tests by the user:**
  - Google sign-in and sync
  - Delete my account
  - the fingerprint or Face ID lock
  - a reminder actually firing
- **User:**
  - pick a support email; then fill `{{SUPPORT_EMAIL}}` and `{{EFFECTIVE_DATE}}` in `public/*.html`
  - back up the signing key twice, off this computer
  - turn on two-step sign-in on Google, GitHub and Apple
  - skim the 60 reflections in `src/reflections.js` for accuracy
- **Store accounts (user):**
  - Google Play: $25; closed test with 12 testers for 14 days; Play App Signing; then add Play's SHA fingerprints to Firebase
  - Apple Developer: $99/year; App Store Connect app; API key secrets `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8`; variables `APPLE_TEAM_ID` and `IOS_UPLOAD_ENABLED=true`
- **Better icon art:** a higher-resolution (1024 px or SVG) logo from the designer, so the store icons are sharp.

## Working rules the user set

- **Parallel agents:** launch several when work can run in parallel, with clear file ownership, and never let agents commit, push or deploy.
- **Mockups first:** show a mockup before implementing any visual change.
- **Ask before pushing:** never push, deploy, publish or submit to a store without asking. Keep signing keys out of git.
- **Do it for them:** the user is often away. Do everything possible; ask only for what needs their identity, money or a decision.
