# Zad: privacy answers for store forms

Reusable answers for Google Play's Data safety form (and similar forms such as Apple's App Privacy labels). App: Zad for Android and iPhone, app ID `com.zad.app` on both (coming to Google Play and the App Store). The web version of the app is discontinued; GitHub Pages hosts only a landing page and the policy pages. Written from the code as of 3 Nov 2026 (location category updated 5 Nov 2026): `src/store.js`, `src/cloud.js`, `src/platform.js`, `src/travel.js`, `src/util.js`, `src/views/settings.js`, `src/views/onboarding.js`, `src/notify.js`, `firestore.rules`, `android/app/src/main/AndroidManifest.xml`. Re-check this file whenever any of those change.

Public pages: privacy `https://arahkhan99.github.io/amal-tracker/privacy.html`, terms `https://arahkhan99.github.io/amal-tracker/terms.html`, account deletion `https://arahkhan99.github.io/amal-tracker/delete-account.html`.

## Basics

- Everything is stored on the device (localStorage, key `amal-tracker-v1`) by default. Play counts data as **collected** only when it leaves the device, so local-only data isn't declared.
- Data leaves the device in only three cases:
  1. **Cloud backup** (optional, Google sign-in). The whole tracker state goes to Cloud Firestore under `users/{uid}` and `users/{uid}/years/{yyyy}`. Firebase Auth keeps the Google account.
  2. **City name lookup.** The rounded (approximate) coordinates go once to BigDataCloud each time the user sets their location via GPS while online, and when the travel check (`src/travel.js`, Settings "Update location when I travel", on by default, GPS-chosen locations only) finds the phone more than 25 km from the saved point. That check runs only when Zad starts or returns to the foreground (at most every 30 min), only if location permission is already granted (`checkPermissions`, never a prompt), reads a low-accuracy position rounded by `quietPosition()` in `src/platform.js`; no background location. Same data and purpose (approximate location, app functionality), so the declarations below do not change.
  3. **City search.** The search text goes to Open-Meteo.
- **Location is rounded to about 1 km.** In plain language it is approximate, but the store categories differ: Google Play counts it as **Precise location** (Play's "approximate" means an area of at least 3 km²), and Apple counts it as **Coarse Location** (fewer than 3 decimal places). See open question 3. `roundCoord()` in `src/util.js` rounds latitude and longitude to 2 decimal places (0.01°). The rounded point is at most about 785 m from the real one (half of 0.01° is about 556 m on each axis, so about 785 m on the diagonal at the equator, less elsewhere), so always under 1 km. GPS readings are rounded inside `currentPosition()` and city-search results inside `searchCity()` (`src/platform.js`), before anything is saved or sent; `cityName()` is called with those rounded values (`A.useGps` in `src/views/settings.js`, `A.obGps` in `src/views/onboarding.js`). Coordinates saved by older versions are rounded on load by `normalize()` in `src/store.js`. The precise reading from the phone is never stored, synced or sent.
- No ads, no analytics, no advertising ID. Nothing is sold. Nothing is used for tracking. No Firebase Analytics.
- **Crash reports (added 14 Nov 2026): Firebase Crashlytics** in the native apps (`src/crash.js`). It sends device model, OS, app version, the error and stack trace, a random installation ID, and the screen/theme/platform. Never names, emails, locations or logs; no `setUserId`. On by default, with an off switch in Settings → Account ("Send crash reports"). See `docs/build/crashlytics.md`.
- All network traffic is HTTPS (Firebase, BigDataCloud, Open-Meteo, GitHub Pages).
- Firestore security rules: only the signed-in owner (`request.auth.uid == uid`) can read or write `users/{uid}/**`. Everything else is denied. Tests: `npm run test:rules`.
- Firestore location: `nam5` (United States multi-region).

## Data types

"Collected" = leaves the device. "Linked" = tied to the person's identity (the Firebase uid / Google account).

| Data | Where it comes from | Collected? | Linked to the person? | Used for tracking? | Shared with third parties? | Encrypted in transit? | Deletable on request? | Optional? | Purpose |
|---|---|---|---|---|---|---|---|---|---|
| **Name** (typed for the Home greeting) | User types it in onboarding or Settings → Your name | Only with cloud backup (inside the Firestore `state` document) | Yes (stored under the uid) | No | No | Yes | Yes (in-app Delete my account or email request; locally with Reset all data) | Yes (name is optional; backup is optional) | App functionality (greeting); backup and sync |
| **Name** (Google profile display name) | Google sign-in, kept by Firebase Auth | Only with cloud backup | Yes | No | No | Yes | Yes (Auth account deleted in the app or on request) | Yes | Account management (sign-in) |
| **Email address** | Google account, Firebase Auth | Only with cloud backup | Yes | No | No | Yes | Yes | Yes | Account management; shown in Settings → Cloud backup |
| **User ID** (Firebase uid, Google provider ID) | Firebase Auth | Only with cloud backup | Yes | No | No | Yes | Yes | Yes | Account management; keys the user's Firestore documents |
| **Location**: rounded coordinates (lat/lng rounded to 2 decimals, within about 785 m, always < 1 km; declared as Precise location on Play, Coarse Location on Apple) and city label | Device GPS/network location (fine and coarse permission; the reading is rounded straight away and the precise value is discarded), or a city the user picks (also rounded) | Yes: (a) rounded coordinates sent to BigDataCloud for the city name when online, not stored by us; (b) stored in Firestore settings with cloud backup | (a) No, sent without any account info. (b) Yes | No | BigDataCloud processes it as a service, see note 1 | Yes | (b) Yes. (a) Nothing stored by us | Yes. Onboarding offers "Skip for now" (prayer times then use the default Chicago, IL location until one is set); Settings → Location offers a city search instead of GPS. Backup is optional | App functionality (prayer-time calculation on the device, city label) |
| **City search text** | Typed in Settings → Location | Yes, sent to Open-Meteo, not stored by us (the chosen result is saved as location above) | No | No | Open-Meteo processes it as a service | Yes | Nothing stored by us | Yes | App functionality (find a city) |
| **User content**: prayer logs, amal logs with counts and notes (Quran position, sadaqah notes, day notes), custom amal list, qada balances, goals and history | User | Only with cloud backup (Firestore `state` plus `years/{yyyy}.days`) | Yes | No | No | Yes | Yes | Yes | App functionality; backup and sync |
| **Excused days** (hayd / nifas): `day.excused`, `excusedMode.since`, prayers logged `"excused"` | User marks them (Settings → Excused days, or the log sheet) | Only with cloud backup | Yes | No | No | Yes | Yes | Yes (feature can be switched off) | App functionality. Treated as **health data** (GDPR Art. 9; WA/NV consumer health data). See audit A3 |
| **Terms agreement and backup consent**: terms version (`TERMS_VERSION`) and time in `profile.consent`; the explicit consent to back up religious and health data in `profile.dataConsent` `{ version, at, scope: "cloud-backup-sensitive" }` | Recorded when the user ticks "I agree that Zad may store this, including religious and health information" and signs in with Google or Apple (written before the first upload), or taps Continue on the updated-policy sheet | Only with cloud backup (inside `state.profile`) | Yes | No | No | Yes | Yes (in-app Delete my account, or email) | Yes (only exists if the user signs in) | Account management (record of consent to terms) |
| **App settings**: reminder toggles and lead time, calculation and Asr method, reflection/seerah toggles, app-lock on/off | User | Only with cloud backup (inside `state`) | Yes | No | No | Yes | Yes | Yes | App functionality; backup and sync |
| Biometrics | Android BiometricPrompt / iOS Face ID or Touch ID | **No.** The app only receives success or failure | n/a | n/a | n/a | n/a | n/a | n/a | App lock |
| Notifications | Scheduled locally on the phone (AlarmManager on Android, local notifications on iOS) | No | n/a | n/a | n/a | n/a | n/a | n/a | Reminders |
| Backup/CSV files | Settings → Back up / Export my data | No. Written to the device and handed to the system share sheet; the user picks the destination | n/a | n/a | n/a | n/a | n/a | n/a | User export |
| **Feedback** (Help & tour → Send feedback, Report a mistake): message, type, item/parts reported, optional reply email; app version, platform and device model only while the device box is ticked | User | Signed in: yes, Firestore `feedback/{id}` with the account's **uid always attached** and a server timestamp. Signed out: no, the user's own email app sends it (we then have their email address in our mailbox) | Yes (uid) | No | No | Yes | Yes (deleted with the account by Delete my account; or on request; kept up to 12 months otherwise) | Yes | Developer communications / customer support; fixing content mistakes |

Note 1. Play's definition of "sharing" excludes transfers to service providers that process data on your behalf, and transfers the user starts to get a specific result. The BigDataCloud and Open-Meteo calls fit both, so the answer is **not shared**. They are still **collected** (the data leaves the device), with **ephemeral processing**, because we store nothing from those calls ourselves.

## Third-party services

| Service | Used by | Receives | When |
|---|---|---|---|
| Firebase Authentication (Google) | Android and iPhone app (native Google sign-in via `@capacitor-firebase/authentication`) | Google ID token, then keeps email, uid, display name, photo URL, created and last-sign-in times. Also sees the IP address. | Only when the user turns on cloud backup |
| Cloud Firestore (Google Cloud, `nam5`) | Android and iPhone app | Full tracker state (name, terms agreement, settings including the rounded coordinates and city label, amal list, qada) and daily logs per year, plus `updatedAt`/`savedAt` timestamps | While signed in; sync about 3 s after each change, on app focus and when coming back online |
| Firebase App Distribution / App Tester (Google) | Distribution of test builds only, not part of the app | Tester email and device information that Google collects in App Tester | Testers installing the Android app. Not a Play Data safety item |
| BigDataCloud (`api.bigdatacloud.net/data/reverse-geocode-client`) | `src/platform.js` `cityName()` | Latitude and longitude rounded to 2 decimals (approximate, < 1 km; plus IP and user agent, as with any request) | When the user sets their location via GPS while online (onboarding or Settings → Location), or the travel check moves it (more than 25 km, `src/travel.js`) |
| Open-Meteo geocoding (`geocoding-api.open-meteo.com/v1/search`) | `src/platform.js` `searchCity()` | The search text (plus IP) | When the user searches for a city |
| GitHub Pages | Hosting of the landing page and policy pages only (the app does not load from it) | Standard request data (IP, user agent) | Only when someone opens the landing or policy pages |
| Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`) | **Only the static policy pages** (`public/*.html`) | Standard request data (IP, user agent, referrer) | Opening a policy page. The app itself bundles Amiri and Manrope locally through `@fontsource`, so it makes no font requests |

## Google Play Data safety form

**Data collection and security**
- Does your app collect or share any of the required user data types? **Yes** (only with optional cloud backup and location lookup).
- Is all of the user data collected by your app encrypted in transit? **Yes.**
- Do you provide a way for users to request that their data is deleted? **Yes.** Deletion URL: `https://arahkhan99.github.io/amal-tracker/delete-account.html` (leads with the in-app path; email request for people who no longer have the app). In-app: Settings → Delete my account, shown while signed in, deletes `users/{uid}/years/*`, `users/{uid}` and the Firebase Auth user (may re-authenticate with Google first).

**Data types to declare**

| Play category → type | Collected | Shared | Processed ephemerally | Required or optional | Purposes |
|---|---|---|---|---|---|
| Personal info → **Name** | Yes | No | No | Optional | App functionality, Account management |
| Personal info → **Email address** | Yes | No | No | Optional | Account management |
| Personal info → **User IDs** | Yes | No | No | Optional | Account management, App functionality |
| Personal info → **Religious or political beliefs** (prayer, amal and qada logs reveal religious practice) | Yes | No | No | Optional | App functionality |
| Health and fitness → **Health info** (excused days for hayd/nifas: `day.excused`, `excusedMode`, prayers logged "excused"; reveals menstruation / post-natal bleeding). Added 15 Nov 2026, conservative reading, see `docs/legal/privacy-audit.md` A3 | Yes (only with cloud backup) | No | No | Optional (feature can be turned off; backup optional) | App functionality |
| Location → **Precise location** (coordinates rounded to 2 decimals, within about 785 m, plus the city label; a 0.01° cell is under 3 km², so Play counts it as precise) | Yes (linked to the user when cloud backup is on; the BigDataCloud lookup carries no account info) | No | No (it is stored in the backup) | Optional (location can be skipped in onboarding, or a city searched instead of using GPS) | App functionality |
| App activity → **Other user-generated content** (amal notes, day notes, custom amal names) | Yes | No | No | Optional | App functionality |
| App activity → **Other actions** (prayer/amal check-ins, qada changes, settings, terms agreement record) | Yes | No | No | Optional | App functionality |
| App info and performance → **Crash logs** (Crashlytics) | Yes | No | No | Optional (Settings → Send crash reports) | Analytics (Play counts app-stability monitoring here) |
| App info and performance → **Diagnostics** (stack traces, app version, screen name) | Yes | No | No | Optional | Analytics |
| Device or other IDs → **Device or other IDs** (the Crashlytics installation ID, random, not tied to the account) | Yes | No | No | Optional | Analytics |
| App activity → **Other user-generated content** and Personal info → **Email address** (purpose added: **Developer communications**) and App info and performance → **Other app performance data** (app version, platform, device model, only while the box is ticked): **Feedback** form | Yes (signed in; linked to the account by uid) | No | No | Optional | Developer communications |

Do not declare: **Approximate location** (Play lets you tick both location types, but one piece of data can only be one of them. The app has a single rounded location, and its area is under Play's 3 km² threshold, so it is Precise only. Ticking Approximate as well would suggest a second, coarser location that does not exist), Financial info, Health and fitness → Fitness info, Messages, Photos and videos, Audio, Files and docs (exports never reach us), Calendar, Contacts, Web browsing, Approximate location aside, nothing else.

For every declared type: **not** used for Advertising or marketing, Fraud prevention, or Personalization; **not** sold; **not** used for tracking. Only the three crash/diagnostics rows use the Analytics purpose (stability monitoring); no other type does.

## Apple App Privacy (App Store Connect)

Same answers as `ios/App/App/PrivacyInfo.xcprivacy`. Data used to track you: **none**. Data linked to you, all for **App Functionality** only: Contact info → Name, Email address; Identifiers → User ID; Location → **Coarse Location** (not Precise Location); User content → Other user content; **Feedback** (linked, uid always attached when signed in): User content → **Customer Support** and **Other User Content**, Contact info → Email address (optional reply email), purpose **App Functionality** and **Customer Support**; Sensitive info (religious practice); Health & Fitness → **Health** (excused days, added 15 Nov 2026, see audit A3); Other data (settings, terms agreement). Do not tick Precise Location.

**Data NOT linked to you (added 14 Nov 2026, Crashlytics):** Diagnostics → **Crash Data** and **Other Diagnostic Data**, purpose **App Functionality** (not Analytics for third parties), not used for tracking. Update `PrivacyInfo.xcprivacy` to match (NSPrivacyCollectedDataTypeCrashData and OtherDiagnosticData, not linked, not tracking) on the Mac before submitting.

## Open questions before submitting

1. **Firebase SDK disclosures.** Google publishes what each Firebase SDK collects on its own (https://firebase.google.com/docs/android/play-data-disclosure). The Android build includes `firebase-auth` and its `recaptcha` dependency (permissions `READ_GSERVICES`, `ACCESS_NETWORK_STATE`). Check that page for Firebase Authentication. If it lists **Device or other IDs** or **App info and performance**, add them with purpose "Account management / Fraud prevention, security and compliance".
2. **In-app account deletion (done).** Play requires deletion inside the app as well as through a web link. Both now exist: Settings → Delete my account (`deleteAccount()` in `src/cloud.js`) and the web page. The Data safety deletion answer is Yes.
3. **Precise vs approximate (resolved 5 Nov 2026).** Decision: keep rounding to 2 decimals (within about 785 m, < 1 km) before saving, syncing and calling BigDataCloud; declare **Precise location** on Google Play and **Coarse Location** on Apple. Keep `roundCoord()` on every path that saves or sends coordinates.
   - **Google Play: Precise location.** Play's definition (Data safety help, checked 3 Nov 2026): Approximate location = "an area greater than or equal to 3 square kilometers"; Precise location = "within an area less than 3 square kilometers". A 0.01° grid cell is about 1.11 km × 1.11 km ≈ 1.23 km² at the equator and smaller further north or south, so 2-decimal rounding counts as precise under Play's rule. Declare Precise only, not Approximate as well (see "Do not declare" above). Rounding to 1 decimal so it would count as approximate was considered and not chosen.
   - **Apple: Coarse Location.** Apple's Coarse Location is location "with lower resolution than a latitude and longitude with three or more decimal places". Two decimals qualifies, so do not tick Precise Location on Apple.
   - The Android manifest still requests `ACCESS_FINE_LOCATION` as a GPS fallback when no network location is available. That is a permission, not collected data: the reading is rounded before use and the precise value is never stored or sent.
4. **Support email and effective date (updated 15 Nov 2026).** Email is zadapp.team@gmail.com everywhere; effective date is 15 Nov 2026 on privacy, terms and delete-account. Still to fill: `{{DEVELOPER_NAME}}`, `{{DEVELOPER_COUNTRY}}` (privacy, terms) and `{{GOVERNING_LAW}}` (terms).
5. **Policy pages inside the APK.** `public/*.html` is also copied into the Android app's assets. If the app ever shows them in its own WebView instead of the browser, those pages would contact Google Fonts from inside the app. Either open them in the browser (the hosted URL) or self-host the fonts for those pages.

## Changes from the 15 Nov 2026 privacy review (`docs/legal/privacy-audit.md`)

Do these in the store consoles and on the Mac before the next submission:

1. **Health data.** Excused days reveal menstruation / post-natal bleeding. Declare **Health and fitness → Health info** on Play and **Health & Fitness → Health** on Apple (linked, App Functionality, not tracking). Add `NSPrivacyCollectedDataTypeHealth` (linked, not tracking, AppFunctionality) to `ios/App/App/PrivacyInfo.xcprivacy`. If a lawyer advises the flag is not health data, these can be removed again, but over-declaring is the safer side.
2. **Crashlytics in the iOS manifest.** `PrivacyInfo.xcprivacy` still lacks `NSPrivacyCollectedDataTypeCrashData` and `NSPrivacyCollectedDataTypeOtherDiagnosticData` (not linked, not tracking, AppFunctionality). Add before the first TestFlight build that includes Crashlytics.
3. **Play Console → App content → Health apps declaration.** Answer it. Zad is not a health app, but has a period-related "excused days" feature; describe it accurately if the form asks about menstrual / reproductive health features.
4. **Play Console → Target audience and content.** Choose 13+ (not under 13) so the Families policy does not apply. Store listing must not target children.
5. **Apple age rating / Play content rating questionnaires.** Answer from the current app (no user-generated content shared with others, no chat, no location sharing).
6. **Sign in with Apple (Guideline 4.8).** Not built. See audit A6. If added: Apple App Privacy gains nothing new (name/email already declared), but deletion must also revoke the Apple token.
7. **Feedback form (when it ships).** Add on Play: App activity → *Other user-generated content* (already declared, add purpose "Developer communications"), Personal info → *Email address* (already declared; add purpose "Developer communications"), App info and performance → *Other app performance data* only if device details are sent. Apple: Contact info → Email (purpose App Functionality / Developer's Customer Support), User content → **Customer Support**. Not shared, optional, deletable.
8. **Wording in the app.** "Your location never leaves it" and "It never leaves your phone" (`X.calcNote`, `X.permLocBody` in `src/strings.js`) are not accurate (rounded coordinates go to BigDataCloud and, with backup, to Firestore). Fix before store review (audit A4).
