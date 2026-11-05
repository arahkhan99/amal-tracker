# Zad on iPhone: setup for the App Store

The iPhone app is the same Zad app wrapped with Capacitor (like Android). It is built on a Mac that GitHub lends us for each build, so no Mac is needed at home. What's missing is the Apple side: an Apple Developer account and a key that lets the build robot upload to Apple.

## Already done

- **iOS project** in `ios/` (Capacitor 8, Swift Package Manager). Bundle ID `com.zad.app`, name **Zad**, iPhone only, portrait only.
- **Permission texts** shown by iOS:
  - Location: "Your location is used to calculate prayer times on your phone. When online, it is also sent once to look up your city's name."
  - Face ID: "Face ID unlocks Zad when the app lock is on."
  - Notifications need no text; iOS asks the standard question the first time reminders are turned on.
- **Export compliance** answered in the app (`ITSAppUsesNonExemptEncryption` = NO: the app only uses standard HTTPS), so App Store Connect won't ask on every build.
- **Privacy manifest** (`ios/App/App/PrivacyInfo.xcprivacy`): no tracking, no tracking domains. Declares, all for app functionality and linked to the account when cloud backup is on: user ID, email, name, coarse location only (the app rounds coordinates to 2 decimal places, within about 785 m, before saving or sending them, so precise location is not declared), user content (logs, notes), sensitive info (religious practice), other data (settings). Required-reason APIs: UserDefaults (CA92.1) and file timestamps (C617.1). Firebase and Google Sign-In bring their own manifests. Use the same answers in App Store Connect → App Privacy (see `docs/privacy-answers.md`).
- **Google sign-in on iPhone**: Firebase iOS app registered in project `amal-tracker-cfe23` (App ID `1:256536797102:ios:70d165fca3096b0ec5723f`). Its config file, `GoogleService-Info.plist`, is kept out of git like Android's `google-services.json`; the build writes it from a GitHub secret. The Google sign-in return address (reversed client ID) is in `Info.plist`.
- **App icon and launch screen** made by `node scripts/make-icons.mjs ios` (icon has no transparency, as Apple requires).
- **Build robot** `.github/workflows/ios.yml`:
  - `build` job, on every push to `main`: tests, builds the web app, builds the iPhone app without signing to prove it compiles.
  - `testflight` job: archives, signs and uploads to TestFlight. It is **switched off** until the Apple account exists (repo variable `IOS_UPLOAD_ENABLED`).
  - Version numbers are set automatically: version = date (for example `2026.11.3`), build number = minutes since 1 Jan 2026 (same as Android), so every upload is newer than the last.

## Needed now (for the `build` job)

One GitHub secret (repo → Settings → Secrets and variables → Actions → New repository secret):

| Secret | Value |
|---|---|
| `GOOGLE_SERVICE_INFO_PLIST` | The whole text of `ios/App/App/GoogleService-Info.plist`. On a machine with the Firebase CLI: `npx firebase apps:sdkconfig IOS 1:256536797102:ios:70d165fca3096b0ec5723f --project amal-tracker-cfe23 --out GoogleService-Info.plist`, or with gh: `gh secret set GOOGLE_SERVICE_INFO_PLIST < ios/App/App/GoogleService-Info.plist` |

Without it the build job stops with a clear message.

## What you need to do later (for the App Store)

1. **Join the Apple Developer Program** at https://developer.apple.com/programs/ (US$99 a year). Enroll as an individual unless you want a company name shown as the seller (that needs a D-U-N-S number). Approval can take a day or two.
2. **Find your Team ID**: https://developer.apple.com/account → Membership details → Team ID (10 letters/numbers).
3. **Create the app in App Store Connect**: https://appstoreconnect.apple.com → Apps → + → New App. Platform iOS, name **Zad Tracker** (the plain name "Zad" is taken on the App Store; see `docs/store-listing.md`), language English, bundle ID **com.zad.app** (if it isn't in the list, first register it at developer.apple.com → Certificates, Identifiers & Profiles → Identifiers → +, App ID, explicit `com.zad.app`), SKU `zad`.
4. **Create an App Store Connect API key**: App Store Connect → Users and Access → Integrations → App Store Connect API → Team Keys → +. Name it "GitHub builds", access **Admin** (needed so the robot can create the signing certificate and profile itself). Download the `.p8` file (you can only download it once) and note the **Key ID** and the **Issuer ID** shown above the list. Give these three things to Claude, or set them yourself:

| Kind | Name | Value |
|---|---|---|
| Secret | `ASC_KEY_ID` | Key ID of the API key |
| Secret | `ASC_ISSUER_ID` | Issuer ID (same page) |
| Secret | `ASC_KEY_P8` | Whole text of the downloaded `AuthKey_XXXXXXXXXX.p8`, including the BEGIN/END lines |
| Variable | `APPLE_TEAM_ID` | Team ID from step 2 |
| Variable | `IOS_UPLOAD_ENABLED` | `true` (turns the TestFlight job on) |

Variables are under Settings → Secrets and variables → Actions → **Variables** tab.

5. **Push to `main`** (or run the "iPhone app" workflow by hand). After 5–30 minutes the build appears in App Store Connect → TestFlight. Install the **TestFlight** app on your iPhone and add yourself as an internal tester to try it.
6. **Before submitting for review**, fill in App Store Connect: App Privacy (from `docs/privacy-answers.md`), age rating, screenshots (6.9" iPhone), description (`docs/store-listing.md`), privacy policy URL and support URL. Check that deleting the account from inside the app works on iPhone (Apple requires in-app account deletion for apps with sign-in).

## How the upload works

`xcodebuild archive` signs automatically using the API key (`-allowProvisioningUpdates` creates the certificate and provisioning profile on Apple's side if needed). `xcodebuild -exportArchive` with an `ExportOptions.plist` of `method = app-store-connect` and `destination = upload` re-signs for distribution and sends the build straight to App Store Connect. This is Apple's supported route; `xcrun altool --upload-package` would be the fallback if it ever stops working.

## Open points

- **Sign in with Apple.** Apple's rule 4.8 says an app that offers Google sign-in must also offer an equally private option, normally Sign in with Apple. Zad's sign-in is optional (only for cloud backup), but review may still ask for it. Not built yet; plan it before the first App Store submission.
- **Facebook SDK (resolved).** `@capacitor-firebase/authentication` includes the Google and Facebook sign-in SDKs by default, and Zad only uses Google. `capacitor.config.json` now sets `experimental.ios.spm.packageTraits` to `{ "@capacitor-firebase/authentication": ["Google"] }`, and `npx cap sync ios` has written `traits: ["Google"]` into `ios/App/CapApp-SPM/Package.swift`, so only Google sign-in is linked and Facebook's SDK (with its tracking-related privacy manifest) is left out of the app.
- **Signing certificates.** Each CI run is a fresh Mac, so automatic signing may create a new development certificate each time, and Apple limits how many can exist. If uploads start failing with a certificate-limit error, revoke old "Created via API" certificates in the developer portal, or switch to importing one fixed certificate from a secret.
