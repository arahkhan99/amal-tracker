# Zad: progress and handoff

Last updated: 5 November 2026. Read this first in a new session.

## ▶ RESUME HERE: improvement round (state at the end of 5 Nov 2026)

**Where we are:** the mockup stage for the improvement round is done. NOTHING from it is built yet.

**The review page:** https://claude.ai/artifact/RFiJ3vekENuRB6H9pwfwPm. It has 218 screens with options, the recommended ones marked. The user ticks picks there and pastes them back with "Copy my picks". Their picks may come back in a later message; if not, ask for them.
- Local copy: `design-review/zad-review.html`. To republish, run Artifact publish with root = `design-review/mockups2` and the same image paths.
- All mockups, sources, `notes.md` files and agent briefs are in `design-review/` (gitignored, 72 MB):
  - `prompts.txt`: the original five briefs.
  - `addendum.md`: the 5 Nov product decisions.
  - `tools-common.md`: the Tools brief.
  - Each `mockups2/<area>/notes.md` holds that agent's pros, cons and open questions.

**Specs decided today (the source of truth):**
- `docs/madhhab-rules.md`: Hanafi default, the 4 madhhabs, sunnah tiers, the Maliki taxonomy, Witr wajib in Hanafi qada, and the rulings the user confirmed.
- `design-review/addendum.md`:
  - Excused status (hayd/nifas).
  - Choose-your-features modules.
  - Sunnah chips by tier.
  - The "Made up" same-day status: it keeps the all-five streak but not the on-time one, the day runs until Fajr, and the make-up nudge is on by default.
  - The mission statement.
- `docs/tools-content.md`: the 13 adhkar text and the user's decisions on Tools.

**Next steps, in order:**
1. **Get the user's picks** from the review page, then build in parallel with agents, each owning its own files. Never commit, push or deploy without asking.
2. **Forty durud:** transcribe `C:\Users\chito\Downloads\Collection-of-40-Duroods.pdf` into `docs/tools-content.md` §3, with accurate translation and transliteration, for the user's review.
3. **Adhkar:** add accurate translation and transliteration for the 13, for review. Show the user the transcription next to their source pages; they didn't know where to check it.
4. **Hizb al-A'zam:**
   - Find a clear edition; the publisher doesn't matter.
   - The week starts on Saturday (confirmed 7 Nov).
   - Update the mockups from Friday to Saturday.
5. **Unanswered scholar questions** (also on the review page):
   - the Quran translation choice;
   - hadith translations;
   - the references to verify;
   - whether the durud is daily or Friday, from Thursday Maghrib, and the repeat counts;
   - excused days with Tools;
   - the 13-line IndoPak print (Taj or Qudratullah), the default mushaf, Para vs Juz, the khatm du'a;
   - the word "wird".
6. **Still unpushed:** commit 6368e54, the groundwork for the improvement round. Push only when asked.
7. **The older handoff steps below** (secrets, push, screenshots) still apply.

**MVP recommendation (agents' view, not yet confirmed by the user):**
- **Ship before Ramadan (target mid-January 2027):** adhkar, the Tools tab and hub, and Hizb plus durud if their text is ready by early December.
- **Ramadan:** Quran page tracking only.
- **After Ramadan:** the full mushaf reader.
- **Licences:** the IndoPak font is for free/sadaqah use only, and the KFGQPC fonts need written approval (see `design-review/mockups2/tools-quran/notes.md`).

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

## User picks (log, newest last)
- **7 Nov, Home:** H-B (next prayer first), but replace the five-prayer strip in the hero with H-A's "This week" bars block. Tapping "Salah today" opens a sheet of today's five prayers (proposed by Claude; the user hasn't objected yet). Combined mockup: `design-review/mockups2/home-final/`.
- **7 Nov, texts:**
  - `docs/adhkar-translation.md`: translation and transliteration of the 13 adhkar, done and awaiting the user's review. Open point: #8 "al-Karim" vs the narrations' "al-'Azim".
  - `docs/durud-40.md`: the forty durud transcribed from the user's PDF, awaiting review.
  - The PDF names no compiler (title "40 Salaah and Salaam"); nos. 26–39 are tashahhud variants.
  - The PDF's translation is not copied (copyright); our own drafts are used.
  - 4 uncertain readings are listed in the file.
  - The working files are in `design-review/durud-work/`.
- **7 Nov, all picks (from the review page):**
  - **Picked:** CE1, CU2, W3 (This week on Home), CH1, Q-A, D1, AP1, SE-B, N2, T-A, IC-O, L2, R2, S2, PM1, LK2, TN1, TH-A, SC1, AR1, AH1, HZ1, HR1, DL1, MP2, QR-A.
  - **Home:** see the entry above (`home-final`).
  - **Progress:** P-A, plus P-B's "chapters" concept for easier navigation. This needs a combined mockup.
- **7 Nov, scholar notes:**
  - **Confirmed:** the Witr-in-qada wording; the tier key wording; the translation and transliteration approach.
  - **Quran translation:** Mufti Taqi Usmani first; M.A.S. Abdul Haleem second. Both are under copyright, so we need permission or a licence.
  - **Hadith translations:** we write our own wording.
  - **Daily adhkar:** the user will send FOUR screenshots that hold the full list. They replace the 2-page list, including the evening wording. Ask for them in chat. The evening set opens after Asr.
  - **Hizb al-A'zam:** manzil 1 is Saturday; the order is otherwise flexible.
  - **Forty durud:** use the PDF the user shared. The user confirms it is Shaykh Zakariya's.
  - **Excused days:** Tools stay fully available, because these are duas.
  - **Mushaf:**
    - the Taj Company edition;
    - no 13-line Uthmani;
    - para for IndoPak, juz for Uthmani;
    - the Quran amal goal is whatever the user sets.
  - **Wording:** English is the main term everywhere, e.g. Amal becomes "Actions" or "Regimen", and Qada becomes "Make-ups" (in the nav bar too). Claude must list every word change and get approval BEFORE making it.
  - **Sources:** no gradings. For each content type (verse, hadith, seerah, sahabi, etc.), Claude must propose the sources and the method. The user will name the sources they trust, and only those are used.
  - **Wording and sources:** the proposals are in `docs/wording-and-sources.md`, awaiting approval. In progress: agents are building the Progress combined mockup (`design-review/mockups2/progress-final/`) and updating the Hizb mockups to start on Saturday.
- **7 Nov, durud answers:**
  - The PDF is Shaykh Zakariya's compilation (confirmed).
  - The contents are as expected, including nos. 26–39 as tashahhud variants.
  - When to read: ideally daily, at least on Fridays. The app should suggest daily and add a Friday reminder.
  - Still open: the 4 uncertain readings in `docs/durud-40.md`.
  - Done: the Hizb mockups now start on Saturday.
  - **Progress combined mockup:** done in `design-review/mockups2/progress-final/`. It is on review page v4, awaiting the user OK.
- **7 Nov, more answers:**
  - **Adhkar:** the NEW source is a 20-item card, "النور والضياء" (Ilmi Kitab Ghar), 4 photos in `C:\Users\chito\Downloads\WhatsApp Image 2026-11-07 at 5.28.5*.jpeg`. It replaces the 13-item list. An agent is transcribing it into `docs/adhkar-20.md`.
  - **Mushaf:** the default is the 15-line IndoPak. Lay out the free IndoPak text to match the Taj pages.
  - **Wording:** ONLY Amal and Qada change: Qada becomes "Make-ups"; the word for Amal is still to pick (Actions, Regimen or Good deeds). Every other Arabic term stays, with a small "?" that explains it.
  - **Hadith sources:** ONLY Riyad as-Salihin, Ma'arif al-Hadith (Manzoor Nomani) and Zad at-Talibin (Ashiq Ilahi Bulandshahri).
  - **Seerah:** Seerat al-Mustafa (Idris Kandhlawi) only. **Sahabah:** al-Isabah, Siyar, Hayat as-Sahabah.
  - **Prayer times:** the Karachi method.
  - **Hizb:** use the best accurate edition. An agent is researching it into `docs/hizb-edition.md`.
  - **Open:** which Quran translation can be used right away; whether we need fiqh sources (the user asked why); what "skip the repetition" means.
- **7 Nov, durud:** all 4 uncertain readings resolved by the user and fixed in `docs/durud-40.md`.
- **7 Nov, adhkar:** the 20-item card is transcribed in `docs/adhkar-20.md`, which supersedes `docs/adhkar-translation.md` (the 13-item list). It has 8 uncertain readings and some scholar notes at the end, awaiting the user. Crops are in `design-review/adhkar-work/`.
- **7 Nov, Hizb edition:** the recommendation is in `docs/hizb-edition.md`: transcribe from the Nomani edition (Banuri Town) and cross-check against the Hazim Dawud Cairo 2011 edition. All editions checked start on Saturday. PDFs are in `design-review/hizb-work/`. Awaiting the user OK before transcribing (a large job).
- **7 Nov, decisions:**
  - **Amal** becomes **"Good Deeds"**, and **Qada** becomes **"Make-ups"**. Every other Arabic term stays, with an "?" explainer.
  - **Hadith:** never show the same hadith twice in the app.
  - **Quran translation:** Pickthall (public domain) for now. A permission email to Maktaba Ma'ariful Quran for Mufti Taqi's translation is drafted at `docs/permission-email-taqi-usmani.md`; the user sends it.
  - **Fiqh sources:** Nur al-Idah with Maraqi al-Falah, Radd al-Muhtar, and Ascent to Felicity (Shurunbulali, trans. Faraz Rabbani). Cite them in `madhhab-rules.md` for the Hanafi rules.
  - **Still open:** the user OK on the Progress mockup; the 3 adhkar card checks; the #20 durud form; whether to show the virtue lines; the go-ahead to transcribe the Hizb.
- **7 Nov:** Zad is FREE with NO ads (confirmed by the user). This satisfies the IndoPak font licence and is stated in the email.
- **7 Nov:** the Progress final mockup is APPROVED. The adhkar-20 fixes are applied (#16 إِنَّكَ, #17 ثَنَآؤُكَ, #20 short durood; virtue lines go in a pop-up). Open: whether a future premium subscription conflicts with the IndoPak font licence and the email wording.

### ▶ NEXT SESSION START HERE (written 7 Nov, the user is at 81% of the limit; resume after 8:50pm)
The user still has to say "go" for items 1 and 2, but they intend to. Launch them in parallel:
1. **BUILD:** implement all picks in the app, using parallel agents with clear file ownership.
   - **What to build:**
     - Home final; Progress final;
     - the chosen codes in the "7 Nov, all picks" entry;
     - the Hanafi default (store.js asr "shafi" becomes hanafi);
     - the statuses: In jama'ah, On time, Made up (until Fajr), Missed, Excused;
     - the sunnah tiers per `madhhab-rules.md`;
     - Good Deeds and Make-ups, with ALL strings in one file and "?" explainers on Arabic terms;
     - the Tools module (adhkar-20, durud-40, Hizb, mushaf with 15-line IndoPak as default, Pickthall).
   - **Rules:** never commit, push or deploy; show the result to the user first.
2. **HIZB:** transcribe the 7 manzils (one agent each, Saturday = manzil 1) from `design-review/hizb-work/nomani.pdf`, cross-checked against `alexandrina-297077.pdf`. Flag every difference. Our own typing; no copying of the editors' notes.
3. **Optional:** a text review page (adhkar-20 + durud-40, the Arabic side by side with the transliteration, translation and virtue lines, plus a corrections box), and the "?" explainer texts for approval.
4. **User to do:** send `docs/permission-email-taqi-usmani.md` (from arah.khan99, or a new Zad Gmail). Decide later between premium and donations (the IndoPak font licence is non-commercial).
- **7 Nov:** the user is creating a dedicated Zad Gmail (suggested: thezadapp / zadapp.team / zadforakhirah). Use it as the support email (fills {{SUPPORT_EMAIL}}) and for publisher contact.
- **7 Nov:** the Zad email is **zadapp.team@gmail.com**. It is filled into the `public/*.html` support placeholders and the permission email. `{{EFFECTIVE_DATE}}` is still open.
- **7 Nov:** no public email was found for Maktaba Ma'ariful Quran. Options: the copyright page of the book; the contact form on muftitaqiusmani.com; Darul Uloom Karachi; Turath Publishing (UK edition). The user to decide which.
- **7 Nov:** the user SENT the permission email for the Mufti Taqi Usmani translation from zadapp.team@gmail.com. Awaiting a reply; Pickthall is used until then.
- **7 Nov idea:** Arabic terms in the English UI (Welcome, Home, etc.) use academic transliteration (e.g. Ṣalāh, ʿAṣr, Ākhirah). Dua transliterations stay simple. Awaiting the user to confirm full vs light style.
- **7 Nov:** academic style = **LIGHT** (macrons + ʿayn/hamza only, no dots under letters): Salāh, Fajr, Zuhr, ʿAsr, Maghrib, ʿIshāʾ, Jamāʿah, Ākhirah, Qurʾān, Zād. Use it everywhere Arabic terms appear in the English UI. Check that Manrope renders ā ī ū ʿ ʾ.
- **7 Nov idea (future, premium area alongside admin accounts and anonymous community leaderboards):** parents can sign up and manage one or more children. Claude proposed child profiles under the parent account first, with no qada before puberty and children excluded from leaderboards; COPPA/Families-policy care. Open: own device/login for children? Age range? Free or premium?
- **7 Nov family answers:** older children eventually get their OWN independent account on their own phone (not linked to the parent); child profiles start from age 7; family profiles are PREMIUM. Note: under 13 (16 in parts of the EU), an own account needs one-time verifiable parent consent at sign-up (COPPA/GDPR).
- **7 Nov:** apply the light academic style to the Salām greeting too: "As-salāmu ʿalaykum" (Welcome, Home greeting, etc.).
- **7 Nov idea:** in-app feedback. Proposed: Settings → "Send feedback" (Idea / Problem / Content correction, an optional reply email, auto app version) saved to a Firestore `feedback` collection (users write only, never read), plus a "Report a correction" link on each dhikr/durud/hadith/verse. Claude recommended including it in this build; awaiting the user OK.
- **7 Nov:** feedback should be EMAILED to zadapp.team@gmail.com. Options: (A) Firestore + the Firebase "Trigger Email" extension via a Gmail app password, which needs the Blaze plan (card on file; ~free at this volume); (B) a third-party form service (EmailJS/Formspree free tier); (C) a mailto link. Recommended: A. Awaiting the user choice.
- **7 Nov:** in-app feedback (and emailing it) is deferred: NOT part of this build; revisit later.

### BUILD STARTED (7 Nov, evening) — Phase 1 running
- **Shared brief:** `design-review/build-brief.md`. No agent commits; each owns its own files.
- **Phase 1 (parallel):**
  - **Foundation:** store, rules, statuses, features, strings, glossary, stats, tests. API in `docs/build/foundation-api.md`.
  - **Tools data:** `src/tools/data/adhkar.js` and `durud.js`.
  - **Quran data:** `public/quran/**` and `src/tools/quran-data.js`.
  - **Hizb:** 7 agents, one per manzil, writing `docs/hizb/manzil-N.md`.
- **Phase 2 (after Foundation), UI agents with file ownership:**
  1. Home + Tracker
  2. Progress
  3. Make-ups + Settings + modules
  4. Onboarding/login/lock/permissions
  5. Theme/nav/icons
  6. Tools UI (hub, adhkar, durud, hizb, mushaf)
- **Then:** an integration pass, tests, screenshots, and a review with the user. Commit ONLY when the user asks.

### ▶ RESUME HERE (saved 7 Nov late, the user hit the usage limit mid-build)
**State of Phase 1:**
- **DONE:**
  - Tools data: `src/tools/data/adhkar.js`, `durud.js`, README, `tests/tools-data.test.js`. npm test and vite build pass.
- **WERE RUNNING when the limit hit** (they may have finished, or stopped partway; CHECK each):
  - **Foundation:** look for `docs/build/foundation-api.md`, `src/strings.js`, `src/glossary.js`, `src/rules/madhhab.js`, `src/features.js`, and the store.js changes. If it's missing or incomplete, relaunch it with the same brief (`design-review/build-brief.md`, Foundation section in the transcript). Run `npm test` and `npx vite build`.
  - **Quran data:** look for `public/quran/`, `src/tools/quran-data.js`, `docs/build/quran-data.md`.
  - **Hizb:** look for `docs/hizb/manzil-1.md` … `manzil-7.md`. Relaunch only the missing or incomplete ones (same prompt pattern: Nomani main, Dawud check, `docs/hizb-edition.md`).
- **How to check:** `git status`; `git diff --stat 6368e54`; `ls docs/hizb docs/build public/quran src/tools`.

**Next:**
1. Finish Phase 1.
2. Phase 2: the 6 UI agents (see "BUILD STARTED" above), each following `design-review/build-brief.md` and `docs/build/foundation-api.md`.
3. Integration, tests and screenshots, then show the user. Never commit or push without asking.

**Open question for the user:** show the Qurʾānic parts of adhkar #11/#15/#17 in standard mushaf spelling (Claude suggests yes) rather than the card's full-alif spelling?
- **8 Nov:** the user AGREED that the Qurʾānic parts of adhkar #11/#15/#17 (and any Qurʾānic part) show STANDARD MUSHAF text: the Tools UI renders them from the Quran data by surah:ayah (IndoPak text), not from the card spelling in adhkar.js.
- **8 Nov:** the usage plan is agreed. Let the running agents finish. Phase 2 = 3 UI agents on Sonnet (model "sonnet"), but they must CHECK ALL SCREENS (user insists on accuracy). Hizb manzils 1, 2, 3 and 6 are done; 4, 5 and 7, Foundation (only its API doc left) and Quran data were resumed after the limit.
- **8 Nov, PHASE 1 done** (except the Quran data agent, still running):
  - Foundation done (74 tests pass). API: `docs/build/foundation-api.md`.
  - All 7 Hizb manzils transcribed in `docs/hizb/manzil-1..7.md` (109/50/52/58/49/54/71 duas), with edition differences and uncertain readings at the end of each file, for the user.
  - Foundation review items for the user:
    - the Shafi'i/Hanbali 4-before-ʿAsr and Jumuʿah lists;
    - the Maliki nāfilah list;
    - spellings (Duʿāʾ, istighfār, adhkār, durūd, salawāt...);
    - the glossary drafts.
- **8 Nov, PHASE 2 launched:** 3 Sonnet UI agents (A Home/Tracker/Progress/main/notify, B shell/look/settings/make-ups/onboarding + the Karachi default for new users, C Tools + hizb.js). Contracts are in `design-review/build-brief.md` "Phase 2". Shots go to `design-review/build-shots/A|B|C/`.
- **8 Nov, Quran data DONE** (`docs/build/quran-data.md`):
  - indopak15 (610 pages, the default) and madani15 (604 pages) are ready, about 6 MB offline, with OFL fonts (DigitalKhatt) and MIT text.
  - **13-line IndoPak is NOT available:** the only source is QUL layout 313 (account needed, no licence stated). `scripts/quran/import-qul.mjs` is ready if the data is ever obtained legitimately.
  - **Pickthall:** the genuine 1930 text for surahs 1–5 and 39–114; surahs 6–38 are Tanzil's edited version (flagged).
  - **Requests:** a vite PWA runtime cache for /quran/; tests/quran-data.test.js.
  - **Decisions for the user:** (a) the 13-line plan; (b) accept edited Pickthall for 6–38 or transcribe them.
- **8 Nov, Agent A done:** Home, Tracker, Progress, main and notify. Tests and build pass. Shots in `design-review/build-shots/A/`.
  - **Gaps:**
    - the daily reflection and Friday sīrah cards were removed from Home;
    - no lock-screen action buttons on the make-up nudge;
    - no Month/Year pickers;
    - Progress has no khatm bar or Year milestones;
    - the "not opened" ticks live in localStorage only;
    - leftover strings are local in home.js (`X`) and progress.js (`L`), to fold into strings.js;
    - a plural bug in `PROGRESS.madeUpCap`.
  - A did NOT side-by-side compare every shot, so the final QA pass must compare ALL screens with the mockups.
- **8 Nov, Agent B done:** shell, D1/AP1 look, N2 nav (Tools 3rd), Settings SE-B with subpages, Make-ups Q-A (Witr for Hanafi), onboarding L2/R2/S2/PM1, lock LK2, and the Karachi default for new users. Tests and build pass.
  - **For the integration pass:**
    - drop the old static nav-button binding in main.js;
    - render index.html's static "Daily amal"/Tracker headings from strings;
    - fold the local X/L string constants (home, progress, qada, onboarding, settings) into strings.js;
    - set the store default method to Karachi;
    - fix the madeUpCap plural.
  - **Gaps:**
    - Apple sign-in is not built (needs the Apple dev account);
    - the Make-ups "Your path" collapsible and the per-Witr cleared counter;
    - the nafl label wording;
    - B did not re-check all 2nd-pass fixes.
- **8 Nov, Agent C done:**
  - **Built:** the Tools area (TH-A, AR1, DL1, HZ1, HR1, MP2, QR-A), hizb.js generated from the md files, and the Quranic parts of the adhkar taken from the Quran data. Tests and build pass.
  - **Gaps:**
    - some IndoPak marks (e.g. الٓمّٓ in 2:1) show as boxes in the DigitalKhatt IndoPak font;
    - Quran reading doesn't auto-tick the good deed;
    - tool progress `S.tools` doesn't sync to the cloud;
    - there is no Quran search.
  - **Requests:**
    - Home calls `toolsAmalRead(id)` on its rows;
    - main.js `onBackButton` calls `A.toolsBack`;
    - Settings provides `A.settingsTools`.
- **8 Nov, PHASE 3:** an integration + full QA pass, plus a separate Quran glyph-fix agent.
- **8 Nov, BUILD COMPLETE (uncommitted):**
  - Integration and QA done: 89 tests pass, the vite build passes, 90 screens × light/dark compared with the mockups. Results in `design-review/build-shots/final/QA.md`.
  - Quran glyph boxes fixed (font loading) and line overflow fixed.
  - Review page: https://claude.ai/artifact/TzV8bkdWiAY6MhhCNhZ1FQ
  - **Known gaps:**
    - Home: weekly-item share/save; reflection and sīrah cards removed;
    - Progress: khatm bar, Year milestones, pickers;
    - Make-ups: "Your path" and the per-Witr counter;
    - Settings: the dedicated Tools settings page;
    - Apple sign-in;
    - Tools: full-screen done/khatm moments, durud counter, Quran search, Quran reading auto-ticking the good deed, 13-line IndoPak;
    - Lock screen: the Hijri date wraps.
  - **NEXT:** the user reviews the screens. Commit only when the user asks (diff vs 6368e54). Then the Hizb/adhkar scholar review page.
- **8 Nov, user answers:**
  - Launch without 13-line IndoPak, and ask QUL/Tarteel for permission (Claude to draft that email).
  - Edited Pickthall for surahs 6–38 is OK for now.
  - **The user resumes on TUESDAY (weekly limit reached).**
  - **No email was sent:** this session has no email tool. Next session: write a "what's new" summary the user can email themselves, or connect Gmail.

### ▶ RESUME HERE (Tuesday)
1. The user reviews the 90 screens at https://claude.ai/artifact/TzV8bkdWiAY6MhhCNhZ1FQ and sends changes.
2. Draft the QUL/Tarteel permission email for the 13-line Taj layout.
3. Build the scholar review page:
   - the Hizb differences and uncertain readings (end of each `docs/hizb/manzil-N.md`);
   - the adhkar-20 and durud-40 translations;
   - the glossary drafts;
   - the spellings;
   - the Shafi'i/Hanbali/Maliki sunnah lists marked review:true.
4. Decide which "known gaps" (see BUILD COMPLETE above) to build before launch.
5. Commit ONLY when the user says. All work is uncommitted on top of 6368e54.
6. Launch checklist (user): Play Console ($25) + 12 testers × 14 days; Apple Developer ($99) for iOS + Apple sign-in; back up the signing key; 2-step sign-in on the accounts; the policy effective date.
- **8 Nov:** a working test build (dist) was published for phone testing: https://claude.ai/artifact/QLnoY2yL9WkoZZFKNZyTtJ. It is untested on claude.ai hosting; Google sign-in won't work there (domain not authorised), so use the no-backup path. For a real install, next session: build the Android APK.
- **8 Nov:** the user said "yes, push". Commit c897721 (plus 6368e54) pushed to main; the GitHub Actions android.yml builds the APK and sends it via Firebase App Distribution to arah.khan99. Check the run status next session if no email arrived (`gh run list`).

## 10 Nov feedback (session resumed)
All 3 GitHub runs (Android, iPhone, Pages) for c897721 succeeded.
1. **Hijri:** currently the Umm al-Qura calculation. Wanted: follow the Central Hilal Committee (US) or the local committee, plus a manual ±1 day.
2. **Add Manzil** to Tools. Source: `C:\Users\chito\Downloads\Manzil.pdf`.
3. **Add adhkar after salah** as a tool, from the user's poster screenshot (`OneDrive\Pictures\Screenshots\Screenshot 2026-11-10 155825.png`).
4. **Disable long-press text selection** and copy.
5. **Progress:**
   - remove or fix the stray glyph above "Where you're steady…";
   - the chapter chips bar should float (sticky) at all times.
6. **Content cadence:**
   - ayah, hadith, etc. weekly (already);
   - Sahabi of the month gets a fact per day, earlier facts stay visible, with an archive of past months.
7. **Colours:** the jamāʿah (gold) and made-up (pale amber) colours are too similar. Propose ideas BEFORE changing.
8. **Widgets:** plan the tiers, from a simple log-a-prayer widget to a full one (prayers, good deeds…).
- **10 Nov, decisions:**
  - Hijri: calculated options + manual ±2 + follow-a-committee (one update applies to all followers). OPEN: who may update — Claude proposed approved editors, not anyone.
  - Manzil OK.
  - Adhkar after salah: add the full Āyat al-Kursī; Quls 3× after Fajr and Maghrib.
  - Sahabi daily fact OK.
  - Colour option A: made up = slate blue.
  - Widgets OK.
- **10 Nov, ROUND 2 launched (4 agents):**
  - Tools: Manzil + after-salah (Opus);
  - UI polish: colour A, no text selection, Progress glyph + sticky chips, Sahabi daily facts (Sonnet);
  - Hijri options + committees in Firestore with editors-only writes (Sonnet);
  - widget mockups at `design-review/mockups2/widgets` (Sonnet).
- **10 Nov:**
  - The APK arrived on the user's phone (App Distribution works).
  - Scholar review page being built at `design-review/scholar-review/`.
  - QUL request drafted at `docs/permission-request-qul.md`: no email; use the QUL site "Send Access Request" or a GitHub issue; send from zadapp.team.
  - Accounts deferred to launch.
  - Explained the signing-key backup and the policy effective date.
- **10 Nov:** Hijri approved-editors model APPROVED. Home 'Adhkar after Salah' link APPROVED (polish + tools agents told). The user will share the source-book PDFs; they are to go in C:\Users\chito\zad-sources\ (outside the repo, never committed).
- **10 Nov:**
  - **Widget mockups done** (34 PNGs in `design-review/mockups2/widgets`). Review page: https://claude.ai/artifact (widgets-review.html, published). Recommended: Small A, Medium B, Large B, tap opens a log sheet; lock-screen circular and inline first. Awaiting the user's pick.
  - **Polish agent done:**
    - made up is now slate blue;
    - text selection is off;
    - the sticky strip is safe-area aware;
    - the Sahabi has daily facts, the earlier list and past months;
    - Home has the after-salah chip, which calls `A.openAfterSalah`.
  - **The Progress glyph was NOT reproduced on desktop.** Ask the user for a phone screenshot; it may be a status-bar overlap.
  - **Leftover:** delete `scripts/_r2shoot.mjs`.
- **10 Nov, Hijri agent done** (`docs/build/hijri.md`):
  - Methods: Umm al-Qura default, civil, tbla, committee; adjust ±2.
  - Committee data lives in Firestore `hijriCommittees/{id}/months/{1448-05}`. Editors are listed by uid on the committee doc and managed in the Firebase console. Rules tests pass.
  - **OPEN for the user:**
    - US/Canada: CHC is "Suggested" only. Should it default instead?
    - Approve the placeholder committees (moonsighting-ww, uk-moon).
    - Who the CHC editors are (the user's uid first).
  - Test fix delegated to the tools agent.
- **10 Nov:** the user is previewing the app in a phone-size Chrome window (vite on :5173, background).
- **10 Nov:** scholar review page published at https://claude.ai/artifact/4H6ocTqYen2cH8NqB9gucM (built by `node design-review/scholar-review/build.cjs`). It holds 224 Hizb items, 21 adhkar, 40 durud, 32 glossary terms, 19 spellings and 8 sunnah items. Rebuild and republish once docs/after-salah.md and docs/manzil.md exist. The user pastes 'Copy my review' into chat.
- **10 Nov, ROUND 2 COMPLETE (uncommitted):**
  - Manzil and Adhkār after Salāh built. The Manzil PDF has al-Baqarah 163 ONLY (not 164); the scholar decides.
  - After-salah poster references are mostly illegible (best guesses in the md).
  - Tool names, subtitles and icons added.
  - 126 tests pass and the build passes.
  - The scholar review page was republished with 14 new-tool items.
  - **NEXT:**
    - the user's picks on widgets;
    - the Hijri questions (CHC default? committees? editors);
    - the Progress glyph screenshot;
    - the scholar review paste;
    - the source-book PDFs;
    - push for a new phone build when the user says.

### 13 Nov decision
- al-Hizb al-Aʿzam: the Nomani edition is the only text, with our own English translation (Pickthall for Qurʾān passages). Mangera's translation is not being pursued, so no permission request.
- Scholar review (13 Nov): the user approved everything on the review page. Hizb, adhkar, durud, after-salah, manzil and glossary are now status approved, VIRTUES_APPROVED = true, and the draft banners are gone from those tools. The Sahabi and Home placeholder cards keep their draft flag because they were not reviewed. Hizb edition differences: the Nomani readings stand.
- Widget picks (13 Nov): Small A (forest ring card, countdown, Prayed button), Medium A (forest card, five tiles, next prayer outlined), Large A (hero with Prayed button, prayers, Good Deeds, make-ups). Tap opens the log sheet. Lock screen: inline + rectangular + circular set (iPhone). Not built yet.

## 13 Nov: RESUME HERE (session ended on usage limit)
All work is UNCOMMITTED, on top of Round 2. Tests: 126 passed, 18 skipped. The build passes.

### Done today
- Scholar review approved in full. The reviewed data is now status approved, VIRTUES_APPROVED=true, and the draft banners are gone. The Sahabi and Home placeholders keep their draft flag.
- Hizb: Nomani only, with our own English. Mangera is dropped. Attribute wording follows Taqi Usmani: "in Your Hand", and "You rose over Your Throne in the way that befits Your majesty" (m6). hizb.js was regenerated and the approved status reapplied.
- Hanafi Deobandi approach (internal only): the rules are in docs/content/BRIEF.md "Approach", and in memory as zad-hanafi-deobandi.
- Tools: Arabic tool names removed from the hub tiles and the tool headers (English only), as the user asked.
- Widgets: picks are Small A, Medium A, Large A; tap opens the log sheet; lock screen uses the first set. The user said BUILD THEM NOW (not started).
- Source books are in C:\Users\chito\zad-sources (see its README). Riyāḍ and al-Iṣābah are scans; render pages with design-review/hizb-work/m1/render.cjs.

### User answers (13 Nov), still to IMPLEMENT
1. Sahabi order: the four caliphs, then the rest of the Ten (Ṭalḥah, Zubayr, ʿAbd al-Raḥmān, Saʿd, Saʿīd, Abū ʿUbaydah), then Khadījah, Fāṭimah, ʿĀʾishah, Bilāl, Muṣʿab, Muʿādh, Salmān, Abū Dharr. That's 18, cycling. Start at Abū Bakr in the month the user starts, or from a fixed epoch month. In content.js, change the rotation from calendar month to sequential.
2. CHC = DEFAULT Hijri method for US/Canada. Still unanswered: keep or remove the placeholder committees moonsighting-ww and uk-moon, and making the user the first CHC editor.
3. Manzil: ADD al-Baqarah 164 (src/tools/data/manzil.js plus its test).
4. Widgets: build now (Android AppWidget plus iOS WidgetKit; Apple lock-screen widgets need the Apple Developer account).
5. Progress "stray mark" diagnosed from the user's phone screenshot (dark mode). Two bugs:
   a) The mark is the descender of the big "Progress" heading scrolled up just under the status-bar cover (`.phone::before` in src/styles.css:257, height = safe-area inset). Fix: make the cover a bit taller with a fade at its bottom edge (e.g. inset + 12px, gradient to transparent), using the view's own background (Progress uses --pg-bg).
   b) In DARK mode the status-bar icons are dark on a dark background. src/platform.js setStatusBar() picks Style.Light (dark icons) for every view except home/onboard. Fix: use light icons whenever resolvedTheme()==="dark" (src/app.js), and call it again on theme change.
6. Onboarding/tutorial: the user chose SIMPLE transliteration for everything recited, NO Qurʾān transliteration, and tips on the real screens. Plan:
   - a setup step "Can you read Arabic?" (Yes / A little / Not yet), which sets the tools' translit/translation prefs (src/views/tools/core.js prefs(), default off);
   - a 6-step coach-mark tour on Home;
   - one-time tool tips;
   - Settings "Help & tour".
   The mockup is being made by an agent into design-review/mockups2/tour/ (tour-review.html plus PNGs). SHOW THE MOCKUP TO THE USER BEFORE BUILDING.

### Content agents (output in docs/content/; check what exists)
- hadith.md: DONE, 52 cards, no Arabic (garbled in the PDFs). H05 needs a decision on the review page (Tirmidhi or drop).
- seerah.md: DONE, 52 cards (17 Makkah, 28 Madinah, 7 final).
- sunnah.md: DONE, 12 cards (Hanafi-checked).
- dua.md: an agent was transcribing Arabic from Maʿārif vol 3 page images (printed pp. 107–298), with simple transliteration, skipping anything in the adhkar or Hizb. CHECK whether it is filled; if empty, re-run.
- sahabah-a.md (Abū Bakr, ʿUmar, ʿUthmān, ʿAlī, Khadījah, Bilāl), sahabah-b.md (ʿĀʾishah, Muṣʿab, Muʿādh, Salmān, Abū Dharr, Fāṭimah/Umm Salamah), sahabah-c.md (the other six of the Ten): agents were running, 31 facts each. CHECK completeness; re-run any that are missing.
- Weekly āyah set: not started (Qurʾān plus Pickthall, no books needed).
- NEXT: build a content review page (like design-review/scholar-review/build.cjs). Review is light: check the summary is faithful, with book and page shown. After approval, load the content into src/content.js (keep draft:true until approved).

### Still open with the user
- QUL request (send it from the QUL site), the Taqi Usmani reply, and "push" for a phone build (commit first, never push without asking).
- At launch: Play $25 and 12 testers for 14 days, Apple $99, backing up the signing key, 2-step verification, and the policies' effective date.

## 14 Nov: RESUME HERE (keep this section current; read it first)
Everything is still UNCOMMITTED. Never commit or push without asking. Tests: 126 passed after my edits; the build passed.

### Done 14 Nov (by me)
- Sahabi: the 18 names in the user's order (src/content.js). Each user starts at Abū Bakr in their own first month (S.settings.sahabiStart, set once in home.js weekTiles). The facts are still placeholders: load them from docs/content/sahabah-*.md after review.
- CHC is the DEFAULT Hijri method in US/Canada (settings.js setHijriSource falls back to hijriRegion()). The committees moonsighting-ww and uk-moon are REMOVED (user, 14 Nov).
- Manzil: 2:164 added (80 āyāt), with its test.
- Progress status bar: the cover is 12px taller with a fade (styles.css .phone::before), and the icons are light in dark mode (app.js syncStatusBar).

### User answers (14 Nov)
- Duʿās: option (c) CONFIRMED, read the Arabic from the scans; the user checks every line.
- Hijri: remove the extra committees (done). The USER is the first CHC editor: add their uid to Firestore hijriCommittees/chc-na.editors (console; ask first, they need to sign in once to get the uid).
- Tablets and iPads ARE needed (no longer phone only). Mockup first, then the layout, TARGETED_DEVICE_FAMILY=1,2, orientations, and tablet store screenshots.
- No reply from Taqi Usmani yet; the user still has to send the other permission emails (QUL etc.).
- The user said "the previous message was a mistake" right after "We can get started with the other things in the meantime". It's unclear which message they meant; I asked and am WAITING. If they meant "get started", they may want the agents below stopped.
- H05: cite Tirmidhi (done in hadith.md).
- CONFIRMED 14 Nov: duʿās option (c); CHC editor set-up in the Firebase console together with the user later; tablet/iPad work goes ahead (mockup first).

### Agents started 14 Nov (all write to files progressively; on resume, check the files and re-run only what's incomplete)
| Job | Output | Target |
|---|---|---|
| Sahabah A (Abū Bakr, ʿUmar, ʿUthmān, ʿAlī, Khadījah, Bilāl) | docs/content/sahabah-a.md | 6×31 = 186 |
| Sahabah C (Ṭalḥah, Zubayr, ʿAbd al-Raḥmān, Saʿd, Saʿīd, Abū ʿUbaydah) | docs/content/sahabah-c.md | 186 (Saʿīd may be short) |
| Sahabah B: DONE 14 Nov, 186/186. Doubts for review: B-ABUDHARR-03/-13 and B-SALMAN-12 (hard-to-read Iṣābah lines), B-ABUDHARR-19 close to B-FATIMAH-25, B-MUSAB-21 and B-SALMAN-08 tone | docs/content/sahabah-b.md | done |
| Duʿās D01–D52, Arabic read from the Maʿārif vol 3 scans, simple translit | docs/content/dua.md | 52 |
| Tablet/iPad mockup, 2 options + work estimate | design-review/mockups2/tablet/ (tablet-review.html, notes.md) | show the user |
| Widgets BUILD (Android RemoteViews + iOS WidgetKit + bridge plugin) | android/…/widget/, ZadWidgetsPlugin.java, ios/, docs/build/widgets.md, tests | must compile, tests pass |
| Tour mockup: DONE | design-review/mockups2/tour/tour-review.html + notes.md (14 screens × light/dark) | 6 questions below |

Count check: `for f in docs/content/*.md; do echo "$f $(grep -c '^### ' $f)"; done`

### Tour mockup: 6 questions for the user (my recommendation in brackets)
1. "Not yet" = a new translit-first layout, or the same as "A little"? (the same, for v1)
2. The Arabic step after Madhhab for everyone, or only when Tools is on? (everyone)
3. Tour step 2: open the log sheet, or only point at ···? (point)
4. A 7th step for Tracker/Make-ups? (no, Help & tour covers them)
5. Help & tour at the end of General, or its own group? (General)
6. Status/make-up explainers in the app, or a link to the support page? (in the app)
PUBLISHED 14 Nov (private review page): https://claude.ai/artifact/NJWydnLXMpogjsfsWp7JPx (source copy: the session scratchpad tour-pub/; the originals stay in design-review/mockups2/tour/). WAITING for the user to answer the 6 questions.

### Next after the agents
1. Content review page (like design-review/scholar-review/build.cjs) for hadith, seerah, sunnah, sahabah, duʿās, then load into src/content.js (draft until approved).
2. Weekly āyah set (not started).
3. Build the tour once the user answers.
4. Tablet layout once the user picks an option.

### ▶ SAVED AT THE USAGE LIMIT (14 Nov, end of session). Resume from here.
User answers saved: duʿās option (c) confirmed; H05 = Tirmidhi (done); CHC editor set up later with the user in the Firebase console; tablets and iPads go ahead (mockup first). Tour review page published: https://claude.ai/artifact/NJWydnLXMpogjsfsWp7JPx (waiting for answers to its 6 questions).

Background agents were STILL RUNNING when the session ended. They will be cut off, but they saved as they went. Counts at save time:
- sahabah-a.md: 124/186 items (about 4 of 6 Companions). Check which Companions are complete; re-run ONLY the missing ones with the same brief (BRIEF.md + model sahabah-b.md, IDs A-<NAME>-01..31, append).
- sahabah-c.md: 150/186. Same: finish only the missing Companions (IDs C-<NAME>-01..31). Saʿīd ibn Zayd may legitimately be short.
- sahabah-b.md: DONE 186/186.
- dua.md: 13/52. Continue from D14 (Arabic read from the Maʿārif vol 3 scans, simple translit, unsure words flagged in Note, skip anything already in adhkar.js/hizb.js/after-salah.js). Re-check D01–D13 for completeness first.
- Tablet mockup: 116 PNGs in design-review/mockups2/tablet/, but NO tablet-review.html or notes.md yet. Re-run only to write the review page + notes (2 options, pros/cons, work estimate); don't re-shoot existing PNGs.
- Widgets build: native files exist (android/…/ZadWidgetsPlugin.java, android/…/widget/, res/drawable/zw_*, manifest/MainActivity/gradle changes) but NO docs/build/widgets.md yet, and its tests and builds are unverified. On resume: check git status, run `npx vitest run` and `npm run build`, try the Android build, then finish (iOS WidgetKit, bridge, tests, docs). Small A = the hero card per notes.md (the PNG names say "ring": a mismatch to report).
First step on resume: run the count check above and `npx vitest run`, and only then re-launch agents (in parallel).

### 14 Nov, 6:50pm: resumed after the limit
Tests 143 passed (the widget agent added tests). The 5 agents were resumed with SendMessage (their context is kept). Counts at resume: sahabah-a 155 (Bilāl left), sahabah-c 150 (Abū ʿUbaydah left), dua 31/52, tablet: the review page and notes still to write, widgets: iOS, docs and the build check still to do.

### Tablet mockup: DONE (14 Nov, evening)
design-review/mockups2/tablet/tablet-review.html + notes.md + 116 PNGs + store/ samples. Not published yet (offered to the user).
- Option A: a centred 560pt column, everything ~15% larger. About 3–5 days. Option B: a side rail with two panes, dialog sheets, and a Qurʾān two-page spread in landscape. About 2.5–3.5 weeks.
- Agent's recommendation: A now, plus B's dialog sheets and Qurʾān spread; full B later.
- Store: the App Store needs iPad 13" screenshots (2064x2752); Play tablet shots are optional but needed to count as tablet-ready.
- Found: the .pg-top Progress header has no top safe-area padding (it may sit under the iPhone notch). Check this.
- Questions for the user: A/B/hybrid; iPhone portrait-only?; keep the desktop phone frame?; Qurʾān spread default or toggle (and the IndoPak page pairing); the "Today" list in B; store image style/orientation/languages; 7" Android = tablet or phone layout.

### Sahabah C: DONE (14 Nov, evening). 181 items (Saʿīd ibn Zayd 26: only 26 are sourced, by design; the rest have 31)
For the review page, flag: C-ZUBAYR-30 (the debt advice, whose setting is Jamal), C-SAEED-13 (its setting involves al-Mughīrah), C-TALHAH-16 ("awjaba" wording), C-ABDURRAHMAN-23 (30 slaves vs 30 families), C-ABDURRAHMAN-12, C-ABUUBAYDAH-05/06, the dates/ages chosen per al-Wāqidī; overlap with set B: C-ABUUBAYDAH-23 ~ B-MUADH-16, C-ABUUBAYDAH-28 ~ B-MUADH-27. Ṭalḥah's death says "passed away" (al-Iṣābah doesn't say martyr); al-Zubayr "was martyred" (Ḥayāt 2:257).
Ḥayāt page rule corrected in BRIEF.md: vol. 2 up to about pdf p. 134 is PDF + 1.

### Sahabah A: DONE (14 Nov, evening). 186/186 (6 × 31). All 18 Sahabah are now written (A 186, B 186, C 181)
For the review page, flag: ABUBAKR-11 vs BILAL-09/10 (Bilāl freed, a possible overlap); ALI-31 "died a martyr" (al-Iṣābah says qutila); UTHMAN-31; UMAR-31 (burial, no date); the disputed dates UMAR-02, KHADIJAH-27, BILAL-31; UMAR-05, ALI-26 (our own Qurʾān rendering), ALI-04 ("before me" is ʿAlī's own claim); UMAR-31 is in the vol. 2 +1 page range.
Dropped on purpose: ʿUthmān's Qurʾān in one rakʿah (Witr version, siege setting), "Allah laughed" (an attribute), the Ghadīr material, the siege/Jamal/Ṣiffīn/Khawārij, Khadījah's father drunk, weak-chain and poison stories, repeats of set B.
NEXT for the content: build the content review page (hadith, seerah, sunnah, sahabah A/B/C, then the duʿās when done) like design-review/scholar-review/build.cjs, showing each item with its book and page and the agents' flags.

### Widgets: BUILT (14 Nov, evening). Uncommitted
- JS: src/widgets.js (buildSnapshot, widgetModel, parseDeepLink), src/widget-bridge.js (hooked into main.js; deep links zad://log?p=&d=, zad://today, zad://open?v=). tests/widgets.test.js (17 tests). docs/build/widgets.md.
- Android: ZadWidgetsPlugin.java + widget/ (small Hero, medium Tiles, large Hero + deeds), zw_* resources, manifest. `./gradlew assembleDebug` PASSES; widgets render in the emulator's picker. NOT yet tested on a placed widget: minute ticks, taps, dark large, tap → log sheet.
- iOS: plugin + ZadBridgeViewController + ZadWidget/ extension sources (home 3 sizes + lock inline/rect/circular). NOT compiled (Windows). The extension target is NOT added to Xcode: manual steps in docs/build/widgets.md; needs the Apple Developer account + App Group group.com.zad.app.
- Design notes: the PNG names "small-A-ring" really show the Hero card (built). The button reads "Log today" when nothing is due. System fonts (not Amiri/Manrope).
- To test on the user's phone: needs a commit + push (android.yml → App Distribution). ASK FIRST.

### Tour: USER ANSWERS (14 Nov): 1B 2A 3B 4A 5A 6A
1. "Not yet" = the same as "A little" (translit on + meaning on; no new layout). 2. The Arabic step for everyone, after Madhhab. 3. Tour step 2 only POINTS at ··· (doesn't open the sheet). 4. ADD a 7th step for Tracker + Make-ups. 5. Help & tour at the end of General. 6. "How statuses work" / "How make-ups work" as short IN-APP pages.
→ Tour BUILD agent started (src/), mockup: design-review/mockups2/tour/. Content review page agent started (design-review/content-review/).

### Duʿās: DONE (14 Nov, evening). 52/52, all from Maʿārif vol 3 (printed pp. 150–263; printed = pdf + 11)
The Arabic was read from the scans at 3.5×, in Indo-Pak spelling. NEEDS A DECISION: D03 (فَكَمْ مَنْ or مِمَّنْ?), D26 (the print حَيَاهَا vs the meaning جَنَاهَا; the translit currently says "janaha", so they disagree). Small vowel/shadda doubts are listed in each Note (D02–D52). Partial overlaps with the Hizb were kept but flagged: D12, D33, D45, D49, D52. ~45 Hizb/adhkar duplicates were skipped.

### Tablet: USER ANSWERS (14 Nov): the mix; the user left the rest to me
- Layout: Option A (a centred column) + B's centred dialog sheets + a Qurʾān two-page spread in landscape.
- My picks: iPhone stays portrait-only; iPad allows all 4 orientations. The Qurʾān spread is AUTOMATIC on tablets in landscape (single page in portrait), with no extra setting; the page pairing follows the muṣḥaf's own page order (right page = the earlier page, as in the printed muṣḥaf), checked per muṣḥaf from its data. 7" Android tablets keep the PHONE layout (the tablet layout starts at ≥768 CSS px wide). Desktop web: drop the phone frame (the web app is coming down anyway).
- Also fix .pg-top (Progress) missing the top safe-area padding.
→ Tablet BUILD agent started 14 Nov.

### Content review page: BUILT (14 Nov, evening). Not published yet
design-review/content-review/build.cjs → content-review.html (~950 KB, self-contained). 721 items + 18 Companion title cards = 739 decision cards; 164 flagged (D03 and D26 first, as "Decision needed"). Approve/Change/Drop + a comment, saved in the browser (localStorage zad-content-review-v1); "Copy my review" exports text to paste into the chat. Rebuild: `node design-review/content-review/build.cjs` (keeps decisions; marks edited items).
After the review: apply the decisions to docs/content/*.md, then load into src/content.js (draft:false only for approved items).
- PUBLISHED 14 Nov (private): https://claude.ai/artifact/8MJ2kPdqqZCqtYDVdApjbB. To republish after a rebuild: run build.cjs, then the transform in scratchpad mk2.cjs (it strips the doctype, adds the dark-theme guards and the safe-area gutters), then publish the same path (scratchpad content-pub/content-review.html). If the scratchpad is gone, redo those 3 edits by hand.
- Commit/push: the user said WAIT until the tour + tablet builds finish, then commit and push once for one phone test build (ask before pushing).

### Tour: BUILT (14 Nov, night). Uncommitted
New: src/guide.js, src/views/tour.js, src/views/help.js, src/views/tools/tips.js, src/css/tour.css, tests/guide.test.js. Changed: strings.js (GUIDE group), main.js, onboarding.js, settings.js, home.js, tools/adhkar.js, hizb.js, tools/index.js.
- Flags in S.settings.help {tour, tips, opened}; the reading answer in S.settings.reading → S.tools.prefs. Existing users don't get the tour automatically (Replay in Help & tour).
- Differences from the mockup: the "Not yet" subtitle is reworded; the steps adapt to the features (step 2 is dropped if no ··· is shown; step 6 is "Tracker" only when Make-ups is off); How make-ups work is hidden when Make-ups is off.
- Tests 171 passed when the tour agent finished; the build passes. The tablet agent was still running.

### 14 Nov, night: tablet BUILT + content decisions
- Tablet: src/css/tablet.css (≥768 wide AND ≥540 tall), src/tools/quran-spread.js + tests, quran.js spread, the phone frame removed, the .pg-top safe area fixed, iOS family 1,2 + iPad orientations. docs/build/tablet.md. Not yet tried on a real iPad/tablet. Left alone: the vite.config.js web manifest still says portrait.
- User content decisions: D03 = فَكَمْ مِمَّنْ with no لَهٗ at the end (done); D26 = جَنَاهَا (done).
- User said: "since majority of it we can just drop, lets do that for now" about the flagged review items. MEANING UNCLEAR (drop the flagged ITEMS, or drop the flags and accept the items as written?). Asked; nothing removed yet.

### 14 Nov, late night
- CONTENT: the user meant (a): every flagged item is KEPT AS IS and APPROVED (the D03/D26 fixes are applied). So ALL Home content (hadith 52, seerah 52, sunnah 12, sahabah 553, duʿā 52) is approved. NEXT: load it into src/content.js with draft:false (Sahabi facts per Companion; the hadith cite collection; the duʿās with Arabic + simple translit).
- WEEK START → SUNDAY (done): times.js WEEK_START=0; HIZB_WEEK_START=6 keeps Saturday = manzil 1 and the Hizb's saved weeks; WEEK_LETTERS_SUN on Home/Progress; content EPOCH Sun 4 Jan 2026. Tests updated, 171 pass.
- GREETING (done): the name on its own second line under "As-salāmu ʿalaykum," (home.js greetingLine1 + .z-greetName 28px). Checked in a screenshot.
- Still waiting: the user's OK to commit + push (one push → Android build + Pages).
- Content-loading agent started (scripts/build-content.cjs → src/content/*.js; content.js wired; Sahabi day > facts shows the last fact; tests/content.test.js).

### 14 Nov, late night: user answers
- Push: WAIT for the approved content to load, then commit + push (the user agreed to the push after the content; still confirm in one line before pushing).
- Sahabi days past the last fact → a short RECAP card (sent to the content agent).
- Weekly āyāt: 52 of ENCOURAGEMENT (hope, husn al-ẓann, consistency, tawbah, patience, gratitude, dhikr, tawakkul, provision for the Ākhirah). Agent writing docs/content/ayah.md (Arabic + Pickthall from the app's own data, no translit) → the user reviews → load.
- Crashlytics: BUILD (agent started; privacy toggle + privacy.html; then the Data safety/App Privacy labels must declare crash data).
- Arabic UI: LATER. Apple: the user will likely get a Mac (option 1).
- MVP: the user wants to be sure nothing else belongs in v1 before the market → I sent an MVP gap list (incl. Sign in with Apple, REQUIRED by App Store 4.8 because Google sign-in is offered; not built).
- CHC editor: gave the user console steps (sign in once → Firebase Auth uid → Firestore hijriCommittees/chc-na {name, editors:[uid]}).

### Approved content LOADED (14 Nov, late night)
scripts/build-content.cjs → src/content/{hadith,seerah,sunnah,dua,sahabah,index}.js (draft:false, approved; no Notes; sources = book + printed page only). content.js loads it as a separate lazy chunk (~200 kB, 61 kB gzip; the main chunk is unchanged; precached). Sahabi recap on days past the last fact (facts 1, middle ×2, last). AYAH is still a placeholder (the ayah.md agent is running). tests/content.test.js (14). Tests 184 pass.
- QUESTION for the user: the Home legend says "Gold tiles change each Hijri month", but Sahabi/Sunnah change by CALENDAR month. Change the wording, or switch the rotation to Hijri months?
- Push: waiting for the Crashlytics agent too (it's editing gradle/settings), so as not to commit half-done files.

## ▶ RESUME HERE (saved 14 Nov, end of session at the usage limit)
FIRST, on resume: TELL THE USER these open items (they asked to hear them again):
1. Hijri or calendar month for the gold monthly tiles (Sahabi of the Month + monthly Sunnah)? (a) switch the rotation to Hijri months, or (b) keep calendar months and fix the legend wording "Gold tiles change each Hijri month".
2. Build Sign in with Apple now? (REQUIRED by App Store rule 4.8, since Google sign-in is offered; switched on once the Apple account exists.)
3. Which MVP extras for v1: a feedback form (small), a Ramadan mode (fasting log, Tarawih, Laylat al-Qadr reminders; medium), a rate-the-app prompt (small), store screenshots + listing text (medium)?
4. Push: commit + push once Crashlytics is finished and the tests pass → one Android test build (App Distribution) + Pages. Confirm with the user right before pushing.
5. The 52 weekly āyāt for the user to review (docs/content/ayah.md) → publish to the review page or a new page → then load into src/content (AYAH is still a placeholder).
6. CHC editor: the user follows the console steps (sign in → copy the UID → Firestore hijriCommittees/chc-na {name, editors:[uid]}).

Agents RUNNING at save time (they may be cut off; check their output, then resume with SendMessage or re-run only what's missing):
- Weekly āyāt → docs/content/ayah.md (target 52; count with `grep -c '^### A' docs/content/ayah.md`).
- Crashlytics → @capacitor-firebase/crashlytics, gradle, src/crash.js, Settings toggle, public/privacy.html, docs/build/crashlytics.md, tests. Check `git status`, `npx vitest run`, `npm run build`, `./gradlew assembleDebug`.

State: everything since c897721 is UNCOMMITTED (widgets, tour, tablet, Sunday weeks, greeting, Sahabi order, CHC default, Manzil 2:164, the approved content loaded, the content .md files). Tests were 184 passing before Crashlytics.
Review pages: tour https://claude.ai/artifact/NJWydnLXMpogjsfsWp7JPx · content https://claude.ai/artifact/8MJ2kPdqqZCqtYDVdApjbB · āyāt https://claude.ai/artifact/2Z3FhPR5cxzfrah9Ekfm4J

### 14 Nov, 11:50pm: resumed after the limit
ayah.md had 52 items (the agent was resuming its final re-check). Crashlytics: the package + src/crash.js + tests/crash.test.js exist; the agent resumed for the tests, docs and builds. The 6 open items above were re-shown to the user.
- Weekly āyāt DONE: docs/content/ayah.md, 52 items (71 āyāt), verified by script against public/quran data; IndoPak DigitalKhatt text (must render in the DigitalKhatt IndoPak font), Pickthall. Flags: 24 use the edited Tanzil Pickthall (surahs 6–38); A01 starts with Hajj rulings (could start from وَتَزَوَّدُوْا); A07/A43/A18 mention punishment; several start or end mid-sentence; A29 "Spirit of Allah"; ﷺ-addressed items.
- Āyāt review page PUBLISHED (private): https://claude.ai/artifact/2Z3FhPR5cxzfrah9Ekfm4J (design-review/ayah-review/build.cjs → ayah-review.html; the font is published as fonts/DigitalKhattIndoPak.ttf; decisions in localStorage zad-ayah-review-v1; "Copy my review"). After the review → load into src/content (AYAH) via scripts/build-content.cjs.

### Crashlytics DONE (15 Nov, ~12:30am)
@capacitor-firebase/crashlytics 8.6.0; gradle plugin 3.0.8 (inside the google-services check); src/crash.js (native only; allowed keys app_version/view/platform/theme; scrubbed messages; ≤10 per launch); Settings → Account "Send crash reports" (S.settings.crashReports, default on); privacy.html updated (the "no crash reporting" line replaced); docs/build/crashlytics.md; tests/crash.test.js. docs/privacy-answers.md updated (Play: Crash logs, Diagnostics, Device IDs; Apple: Crash Data + Other Diagnostic Data, not linked).
USER TO DO: enable Crashlytics in the Firebase console (Android + iOS); a test crash. ON THE MAC: npm install + npx cap sync ios (Package.swift also lacks @capacitor/haptics), dSYM setting + run script, PrivacyInfo.xcprivacy crash types.
Checks: 194 tests pass, the build passes, assembleDebug passes (agent). Secrets are gitignored (google-services.json, GoogleService-Info.plist). READY TO PUSH; asked the user.

## ▶ RESUME HERE (15 Nov 2026) — CURRENT
User's big message (soft launch Dec, public launch end Jan before Ramadan; premium: mentor/admin, family profiles, anonymous leaderboard + private circles with totals only; free opt-in levels, retroactive; strong privacy policy; feedback form; āyāt approved; gold tiles "do what's best"; CHC how-to). **Everything is organised in `docs/plan/launch-and-premium.md`** (decisions, timeline, Ramadan list, premium design, points proposal, levels, nav, changes-to-make-now, questions, CHC steps). Read it first.
- Done: gold-tile legend → "Gold tiles change each month" (calendar month kept; src/strings.js).
- Agents launched 15 Nov: (1) load approved āyāt → src/content/ayah.js via scripts/build-content.cjs; (2) privacy/legal audit → public/privacy.html, terms.html, docs/privacy-answers.md, docs/legal/privacy-audit.md; (3) feedback form mockups → design-review/mockups2/feedback/ (review page feedback-review.html, to publish). Check outputs; re-run any incomplete.
- Still NOT pushed (needs user OK). Firestore rules with hijriCommittees are NOT deployed yet (needs user firebase login + OK).
- 15 Nov: ✅ āyāt loaded (agent 1 done): src/content/ayah.js (52, generated by scripts/build-content.cjs), weekly card uses pickD("AYAH"), DigitalKhatt IndoPak font in the sheet, tests 197 passed / 18 skipped, build OK. Screenshots design-review/mockups2/ayah-live/. Web PWA doesn't precache the font (moot once web app comes down).
- 15 Nov: ✅ feedback mockups (agent 3): design-review/mockups2/feedback/, published https://claude.ai/artifact/FBDqQsCLuN3wRNMUXLFy1e. Recommend A+B, Firestore create-only for signed-in + mailto signed-out. 10 open questions on the page.
- 15 Nov: ✅ privacy audit (agent 2): docs/legal/privacy-audit.md; public/privacy.html, terms.html, delete-account.html rewritten; docs/privacy-answers.md updated. KEY: hayd/nifās = health data (GDPR Art.9, Washington MHMDA). Must-fix before Dec (A1–A8): explicit unticked consent before first sync (settings.js A.cloudSheet, onboarding A.obRestore, A.consentSheet; cloud.js signIn must recordConsent before sync; profile.dataConsent), bump TERMS_VERSION, declare health data in store forms/xcprivacy, fix false strings (calcNote, permLocBody, cloudPrivate, privateNote), fill {{DEVELOPER_NAME}}/{{DEVELOPER_COUNTRY}}/{{GOVERNING_LAW}}, accept Firebase data processing terms, deploy pages. Before Jan: crash reports off by default (ask in onboarding), Sign in with Apple, WA health policy, self-host fonts on policy pages, etc. Needs user answers: legal name, country, governing law; OK to build A1 consent (mockup first).
- 15 Nov late: helpers launched for provisions mockups, gender mockups, Ramadan spec+duas. Consent mockups published https://claude.ai/artifact/X6ChmGvQ6Htr4gUGeiiVuu. See plan doc §13.
- 15 Nov evening: ✅ PUSHED commit 5414edf (everything except public/privacy.html, terms.html, delete-account.html — held back until consent ships; docs/plan + docs/legal kept local via .git/info/exclude because the repo is public). CI: Android App Distribution, iPhone (unsigned) build, Pages.
- User answers: individual dev accounts in own name OK; legal name Abdul Khan, United States (filled in policy drafts; {{GOVERNING_LAW}} still needs the US state); iPhone builds via GitHub (ios.yml already exists; TestFlight upload job turns on with IOS_UPLOAD_ENABLED once Apple account + API key exist, docs/ios-setup.md) — user needs step-by-step help; feedback A+B with easiest defaults (BUILDING); Sign in with Apple YES (build together with consent step once approved — both touch sign-in); leaderboard = PREMIUM; provisions + engine approved (engine + day.first BUILDING; UI awaits mockup approval); Ramadan all + duʿās (agent running); CHC rules later.
- Review pages: provisions https://claude.ai/artifact/NkEkUHzmtzyNBR99u62egD · brother/sister https://claude.ai/artifact/7JpfbCDP16gCVb4ptpayyH · consent https://claude.ai/artifact/X6ChmGvQ6Htr4gUGeiiVuu · feedback https://claude.ai/artifact/FBDqQsCLuN3wRNMUXLFy1e
- 15 Nov: ✅ Ramadan spec docs/plan/ramadan.md + content docs/content/ramadan.md (6 duʿās: 3 found, 2 ifṭār duʿās NOT in approved books (Maʿārif vol 4 missing), 1 intention note; 30 daily cards; 2 Eid). 11 scholar decisions listed there. Review page being built: design-review/ramadan-review/.
- 15 Nov: ✅ provisions engine (no UI): src/points.js, store.js day.first/markLogged, setRemember/remembered, qada.dayLog, settings.provisions + recordLevel; tests/points.test.js; 217 passed. Uncommitted. Excused weights still DRAFT.
- Ramadan review page: https://claude.ai/artifact/NFmfUG4J767t6fXZgWX4Mw (design-review/ramadan-review/build.cjs). User reviews with Approve/Change/Drop and pastes 'Copy my review'.
- 15 Nov: user approved consent (c1-c3 + crash option A), provisions (as recommended), brother/sister ON THE NAME SCREEN (g1d). Governing law Illinois (filled). Building: consent+Sign in with Apple, gender, provisions UI (parallel agents).

## ▶ RESUME HERE (saved 15 Nov 2026, evening, at the usage limit) — LATEST
Read this first. All plans and decisions are in `docs/plan/launch-and-premium.md` (sections 1–14). The Ramadan spec is in `docs/plan/ramadan.md`. Both `docs/plan/` and `docs/legal/` stay LOCAL: they're excluded via `.git/info/exclude` because the repo is public.

**Pushed to main:** 5414edf (all earlier work, minus the policy pages) and 6cae25a (CI time-zone fix). All 3 CI runs are green, and the Android test build went to the user through App Distribution.

**Uncommitted, not pushed:**
- `src/points.js`, plus store.js changes: day.first, setRemember, qada.dayLog, settings.provisions
- `tests/points.test.js`
- `public/privacy.html`, `terms.html`, `delete-account.html`: rewritten, with Abdul Khan / United States / Illinois filled in. Hold them until consent ships.
- `docs/privacy-answers.md`

**4 build agents were RUNNING when the session ended. Check their output and re-run any that are incomplete, using the same brief.**
1. **Feedback form A+B:** Firestore `feedback` collection for signed-in users, mailto for signed-out users; Report a mistake on content sheets, the Aa sheet and the Qurʾān menu; feedback deleted with the account; rules in firestore.rules; tests/feedback.test.js; screenshots in design-review/mockups2/feedback/live/.
2. **Consent + Sign in with Apple:**
   - Consent: c1–c3 + crash option A per design-review/mockups2/consent/NOTES.md; TERMS_VERSION 2026-11-15; recordConsent before sync; crashReports === true is the only "on"; Crashlytics auto-collection off in the manifest and Info.plist.
   - A4 string fixes, and the privacy.html comments removed.
   - Apple provider, entitlement, and docs/build/apple-sign-in.md.
   - Screenshots in design-review/mockups2/consent/live/.
3. **Brother/Sister ON THE NAME SCREEN (g1d):** profile.gender, applyGender, Jumuʿah switch, In jamāʿah first for brothers, remembrance tick in the status sheet, Settings "Set up for" row, tests/gender.test.js, screenshots in design-review/mockups2/gender/live/.
4. **Provisions UI** (P1–P7 per design-review/mockups2/provisions/): src/css/provisions.css, tests/provisions-ui.test.js, screenshots in design-review/mockups2/provisions/live/. Excused amounts approved (3 base, 5 with remembrance). Cite "al-Bukhārī 1" with no "Ṣaḥīḥ".

To check them: `git status`; look for the files and screenshots named above; run `npx vitest run` (it was 217 passed / 18 skipped before these four agents) and `npm run build`. Compare the live screenshots with the mockups. Then show the user, ask to push, and push. The test time zone is pinned to America/Chicago in vite.config.js.

**After the next push:**
- Deploy the Firestore rules (hijriCommittees + feedback). The user runs `! npx firebase-tools login` first, then we run `npx firebase-tools deploy --only firestore:rules`.
- Then walk the user through the CHC editor setup (plan doc §11).

**User decisions on 15 Nov (all in the plan doc):**
- Soft launch in December (the Play closed test with 12 testers for 14 days, plus TestFlight). Public launch around 20–25 Jan 2027, before Ramadan (about 8 Feb).
- Individual developer accounts in the user's own name; the user will create them and needs step-by-step help.
- iPhone builds go through GitHub Actions: `ios.yml` exists, and the TestFlight upload job turns on with the repo variable IOS_UPLOAD_ENABLED once the Apple account and API key exist (docs/ios-setup.md). No Mac needed.
- Premium (later): Mentor, Family, Circles and the Leaderboard (the leaderboard is PREMIUM; totals only; anonymous; weekly or monthly).
- Provisions and levels are free and opt-in.
- Weekly āyāt approved and loaded. Gold tiles change with the calendar month.
- Legal name Abdul Khan, US, Illinois law.

**Waiting on the user:**
- Ramadan content review: https://claude.ai/artifact/NFmfUG4J767t6fXZgWX4Mw (13 decisions; the user pastes "Copy my review").
- Developer accounts; Crashlytics Enable in the Firebase console; Firebase data processing terms (audit A6); Firebase login for the rules deploy.
- Testing the new build on the phone.

**Next to build after the 4 agents:**
- Ramadan features per docs/plan/ramadan.md (mockups first, in design-review/mockups2/ramadan/), once the content review is back.
- Store listings and screenshots.
- Then the remaining privacy-audit items for January: B2–B14 in docs/legal/privacy-audit.md.

**Review pages:**

| Page | Link |
|---|---|
| Feedback | https://claude.ai/artifact/FBDqQsCLuN3wRNMUXLFy1e |
| Consent | https://claude.ai/artifact/X6ChmGvQ6Htr4gUGeiiVuu |
| Provisions | https://claude.ai/artifact/NkEkUHzmtzyNBR99u62egD |
| Brother/Sister | https://claude.ai/artifact/7JpfbCDP16gCVb4ptpayyH |
| Ramadan | https://claude.ai/artifact/NFmfUG4J767t6fXZgWX4Mw |
| Āyāt | https://claude.ai/artifact/2Z3FhPR5cxzfrah9Ekfm4J |
- 15 Nov late: the 4 build agents hit the usage limit mid-task and were RESUMED with SendMessage (not restarted). If they die again, resume them the same way, or re-run from the briefs in the resume section above.
- 15 Nov: ✅ Brother/Sister built (name screen g1d; store applyGender/genderOf; Jumuʿah switch; remembrance tick in status sheet; src/css/gender.css; tests/gender.test.js 13). Screens: design-review/mockups2/gender/live/. Consent agent asked to add gender to consent text + privacy.html and fix crash/account tests.
- 15 Nov: ✅ Provisions UI built (src/provisions.js, src/views/provisions.js, src/css/provisions.css, tests/provisions-ui.test.js 9). Screens design-review/mockups2/provisions/live/. Level-up 'shown' flag is device-local (localStorage).
- 15 Nov: ✅ USER REQUEST: no logging of prayers before their time begins. times.js notStarted(); home.js A.prayerSheet shows 'Begins at …, you can log it then' (no status tiles) for unlogged not-started prayers; applyStatus refuses; sunnah/Witr chips refuse with a toast. Covers Home, Tracker and Progress (they all go through A.prayerSheet/applyStatus/toggleChip). Strings NOT_YET at end of strings.js. tests/not-started.test.js.
- 15 Nov: ✅ Feedback form built (src/feedback.js, src/views/feedback.js, src/css/feedback.css, tests/feedback.test.js 18; firestore.rules feedback block; rules tests pass on emulator). Screens design-review/mockups2/feedback/live/. NEEDS firestore rules deploy before signed-in sends work. Consent agent asked to fix feedback privacy text + privacy-answers row.
- 15 Nov: ✅ Consent + Sign in with Apple built (src/views/consent.js, src/css/consent.css, tests/apple.test.js; TERMS_VERSION 2026-11-15; crash opt-in). Apple button HIDDEN via APPLE_READY=false in src/views/consent.js until console setup (docs/build/apple-sign-in.md). privacy.html now mentions Apple. ALL 4 FEATURES DONE: 279 passed/23 skipped, build OK, assembleDebug OK. Built-screens page https://claude.ai/artifact/L691B8FFFU4La7YVF8Uh5R. NEXT: ask user to push (incl. the policy pages now that consent ships), then rules deploy.
- 15 Nov: user asked prayer times to follow location when traveling — NOT done before (location fixed). Agent building auto-update (settings.location.source gps|city, settings.autoLocation, check on open/resume, >25 km, tests/travel.test.js, privacy line). Push still awaiting explicit yes. User tried firebase login without '!' prefix.
- 15 Nov: ✅ Firebase CLI logged in (arah.khan99). ✅ Firestore rules DEPLOYED (hijriCommittees + feedback). User approved push AFTER the travel fix finishes (push everything incl. policy pages; keep docs/plan, docs/legal excluded).
- 15 Nov: ✅ PUSHED aa9d0a5 (feedback, consent, Apple hidden, provisions, gender, not-started block, travel auto-location, policy pages live). Watching CI. Known caveat: two devices in different cities with cloud sync could flip the shared location.
- 15 Nov: ✅ CI green for aa9d0a5 (Android sent via App Distribution, iPhone compile, Pages). Open question to user: crash reports default — A ask everyone (recommended, current) / B on by default except EU+UK / C on for all.
- 15 Nov: ✅ DECIDED crash reports stay opt-in (ask everyone, option A). No change.
- 15 Nov: ✅ Created Firestore hijriCommittees/chc-na {name, editors:[HfNqGoSpjNUW0uzm5JhLScTj5f42 = user's UID]} via REST with the user's OK. To add editors later: edit the editors array in the console.
- 15 Nov: ✅ User confirmed the CHC editor button shows in the app. CHC editor setup DONE.
- 15 Nov: ✅ Crashlytics live (console shows 'App detected'). Firebase has ONE project, display name 'Amal Tracker' (id amal-tracker-cfe23). It contains 2 Android apps named Zad (old com.amaltracker.app + new com.zad.app; the detected one is in use), iOS Zad, 'Amal Tracker web'. TODO before launch: remove the old Android app + web app after checking which is which; optionally rename the project display to Zad.
- 15 Nov: correction: the ONE project amal-tracker-cfe23 is named 'Zad App' on the projects list; some pages and the CLI still show the old name 'Amal Tracker'. No rename needed.
- 15 Nov: user approved a HIGH-EFFORT CODE REVIEW in parts (sync/consent/account first; then reminders+travel, provisions, gender+excused, feedback, not-started), scope since c897721. Scheduled to start 8:22pm after the usage reset. If the session was lost, start it on resume.
- 15 Nov 8:22pm: code review PART 1 started (/code-review high c897721..HEAD, focus cloud.js/store.js/consent/account deletion), running in the background.
- 15 Nov: ✅ Code review PART 1 done (sync/consent/account), 10 findings, NOT yet fixed, waiting for the user's OK:
  1. store.js normalize: old saved locations get source "gps", so a hand-picked city is overwritten by the travel check → fix: missing source = "unknown", no auto updates until the user taps Use my current location.
  2. Apple delete needs a re-sign-in; if it fails, deletion is impossible → fix: delete without the revoke.
  3. Feedback deletion failure is ignored, so documents can be left behind → fix: retry, and fail the "data" step.
  4. Consent only enforced in the client; old builds can still upload → low risk (testers only), skip for now.
  5. recordAllConsent can downgrade a newer consent version; scope ignored → fix.
  6. keepAccount says sync is on while consent is missing → open the consent sheet.
  7. Double sync on consent → fix.
  8. Serial deletes → parallel/batch.
  9. Duplicated SITE/pageUrl, Apple check → cleanup.
  10. Stale comments/alias → cleanup.
- Code review PART 2 started (reminders/travel, not-started, widgets).
- 15 Nov: user approved fixing part-1 findings 1–8; a fix agent is running (finding 4, server-side consent enforcement, is deferred until before public launch).
- 15 Nov: ✅ Code review PART 2 done (reminders/travel/not-started/widgets), 10 findings, NOT fixed yet, awaiting the user's OK:
  1. A logged prayer whose time is now in the future opens the full sheet, and taps silently do nothing.
  2. Android widget minute tick uses setWindow (stretched to ≥10 min on API 31+), so the countdown and Now/Next switch can be up to 10 min late → use a Chronometer countdown and boundary alarms.
  3. Travel location syncs across devices, so two devices in different cities flip back and forth → keep GPS location per device, not synced.
  4. The startup timeout's setStatusBar breaks dark-mode status bar icons.
  5. The not-started guard blocks UNticking chips too.
  6. The remembrance tick isn't guarded.
  7. The not-started rule is only in UI handlers → move it into one shared canLog helper used by the store paths.
  8. The widget cold-start URL is handled twice.
  9. The travel toast can show over the app lock (reveals the city).
  10. The widget snapshot is rebuilt every 20 s → use a cheap signature.
- Code review PART 3 started (provisions, gender/excused, feedback).
- 15 Nov: user approved fixing ALL part-2 findings; a second fix agent is running (shared tree with the part-1 fixer).
- 15 Nov: ✅ Part-1 fixes DONE (306 passed/23 skipped, build OK). Open: web home-screen app can't re-confirm a sign-in for deletion (popup); the web app is coming down, so low priority.
- 15 Nov: ✅ Code review PART 3 done (provisions/gender/feedback), 10 findings, awaiting the user's OK:
  1. A late feedback send can replace a newly opened form with the thank-you → use a per-send token.
  2. Excused days credit future prayer times → only count started ones (pass `now`).
  3. setRemember works for unstarted prayers (part-2 fix guards the UI).
  4. Changing scoring settings (homeFull/Sister) shows an unearned level-up → record silently.
  5. Full history re-scored on every commit and tap → cache by updatedAt+today.
  6. The monthLog make-up spread shifts as today moves → spread over the whole month (or up to month end).
  7. Tablet two-page Qurʾān report always sends the left page → let the user pick.
  8. day.first is stamped by automatic writes (endExcused) → KEEP the field (it's for the leaderboard) but stop automatic stamping.
  9. Duplicated end-excused logic + jumuah/autoLocation toggles → reuse.
  10. pvSummary duplicates displayLevel; stats reads gender directly → reuse helpers.
- 15 Nov: user approved fixing ALL part-3 findings; a fix agent is running (parallel with the part-2 fixer). After both: full tests + build + assembleDebug, then ask to push. Remaining review areas not yet covered: onboarding/tour/help, tablet, content loading, Hijri, Qurʾān reader — consider a part 4.
- 15 Nov: ✅ Part-2 fixes DONE (331 passed/23 skipped; build + assembleDebug OK; iOS widget not compiled). New src/logging.js canLog/logAllowed. Widget countdown = Chronometer (can briefly show negative up to ~10 min if exact-alarm permission off on Android 12+). A city picked on phone B no longer overrides phone A's GPS location.
- 15 Nov: code review PART 4 started (thorough): onboarding, tour/tips/help, tablet + Qurʾān reader/spread, content loading, Hijri + committee editor, Sunday weeks/Hizb.
- 15 Nov: notification icon: Android shows the default 'i' because there is no small icon. Made white silhouettes from Zad_Logo_6_Symbol_Only (scratchpad staticon/var/{A,B,C}/drawable-*/ic_stat_zad.png; script staticon/variants.mjs). Options page https://claude.ai/artifact/HaUBpjK7kQqqiC5XbQwaW1 (A solid, recommended; B outline; C in a circle). On choice: copy into android/app/src/main/res/drawable-*/ and set capacitor.config.json plugins.LocalNotifications.smallIcon='ic_stat_zad', then cap sync. User also asked for 'different ideas for the logo' — asked whether they mean the main app logo.
- 15 Nov: ✅ Part-3 fixes DONE (351 passed/23 skipped, build OK). All review fixes for parts 1–3 in, uncommitted. Waiting: part 4 review, the user's notification icon choice, then the push (needs the user's OK).
- 15 Nov: ✅ Code review PART 4 done, 10 findings, awaiting the user's OK:
  1. Landscape Qurʾān spread overwrites the saved page with the right-hand page.
  2. Tablet zoom 1.15 breaks Hizb/adhkār/after-salah resume and counters (offsetTop vs scrollTop).
  3. The CHC default is chosen by language en-US even outside North America → time zone first.
  4. "new set after Jumuʿah" is stale (weeks now start Sunday), plus the unused nextWeek string.
  5. The Hijri editor sheet crashes on null hijriParts and uses the editor's personal ±adjust.
  6. Home render stacks loadContent().then(render) and retries forever offline.
  7. The Hijri source rebuilds the region and re-sorts committee months on every call → memoise.
  8. Progress chapter jumps are off on tablet zoom.
  9. Skip on the name screen leaves homeFull on.
  10. guide.js copies the tools prefs defaults by hand → share one module.
- 15 Nov: user chose notification icon C (in a circle) → INSTALLED: android/app/src/main/res/drawable-*/ic_stat_zad.png + capacitor.config.json LocalNotifications.smallIcon. User approved fixing all 10 part-4 findings (fix agent running). User wants NEW MAIN LOGO concepts → mockup agent running (design-review/mockups2/logo/logo-review.html, to publish).
- 15 Nov: ✅ Part-4 fixes DONE (367 passed/23 skipped, build + cap sync + assembleDebug OK; the notification icon is synced). ALL REVIEW PARTS 1–4 FIXED, uncommitted. Also fixed: progress excused-day caption used Saturday-first names. NEXT: ask the user to push; logo concepts agent still running.
- 15 Nov: ✅ PUSHED fc8ce24 (all review fixes + notification icon C). Watching CI.
- 15 Nov: ✅ Logo concepts page https://claude.ai/artifact/REfu4iXURR1vxT38xea7Ws (design-review/mockups2/logo/, 7 SVG concepts + Current; recommended 1 Zāy redrawn, 2 Kufic زاد, 5 five-prayer ring). Awaiting the user's choice; then export Android adaptive + iOS icons and regenerate notification icon C from the chosen mono SVG.
- 15 Nov: ✅ CI green for fc8ce24 (Android sent to the user; iPhone compile incl. the new widget Swift OK; Pages).
- 15 Nov: ✅ LOGO DECIDED: keep the CURRENT logo (Concept 6). No icon changes. The notification icon stays option C, made from the current symbol.
- 15 Nov: user asked to REFINE the current logo now (vector trace, same look, sharper; fix the Android safe zone). Agent running → design-review/mockups2/logo-refine/refine-review.html (to publish for approval before replacing icons).

## ▶ RESUME HERE (saved 15 Nov 2026, late night, at the usage limit) — LATEST
**State:** everything is pushed up to fc8ce24 and CI is green; the test build was sent to the user. Firestore rules are deployed. The CHC editor works (user UID HfNqGoSpjNUW0uzm5JhLScTj5f42 in hijriCommittees/chc-na). Crashlytics is live. Code review parts 1–4 are all done and fixed (367 tests pass). The notification icon (option C) has shipped.

**Running when the session ended:** the logo REFINE agent (vector trace of the CURRENT Concept 6 logo, same look, sharper, Android safe-zone fix) → `design-review/mockups2/logo-refine/` (refine-review.html, NOTES.md, export.mjs). On resume:
1. Check that folder. If it's incomplete, re-run the agent with the same brief: trace the current symbol into SVG, write refine-review.html, write the export plan, and test export.mjs only into a temp folder.
2. Publish refine-review.html as an artifact (copy the page and PNGs to the scratchpad and apply the usual safe-area/viewport transform).
3. Get the user's approval.
4. Then run the export into android/ios/public icons, regenerate ic_stat_zad from the refined mono, run `cap sync`, tests and builds, and ask to push.

**User decisions on 15 Nov (night):**
- Keep the current logo, but refine it.
- Crash reports stay opt-in.
- Push builds as soon as they're ready; don't hold them back for the logo.

**Waiting on the user (most urgent first):**
1. Google Play developer account ($25, "Yourself"). This is the most urgent: the 12-testers-for-14-days rule means the account must exist by early December.
2. Recruit 12–20 Android testers; we'll need their Gmail addresses.
3. Apple developer account ($99).
4. Accept Firebase's Data Processing and Security Terms (Project settings → Privacy).
5. Test the new build on the phone.
6. Ramadan content review: https://claude.ai/artifact/NFmfUG4J767t6fXZgWX4Mw
7. A lawyer's look at the policy before January.
8. Follow up the permission emails (Taqi Usmani, QUL).

**Next to build:**
- The refined logo (after approval).
- Ramadan features per docs/plan/ramadan.md (mockups first) once the content review is back.
- Store listings and screenshots.
- Before launch: remove the old Android app and the web app from the Firebase project.
- Privacy-audit B items for January.
- Optional: server-side consent enforcement (review part 1, finding 4) before the public launch.

**Review/decision pages:**

| Page | Link |
|---|---|
| Built screens | https://claude.ai/artifact/L691B8FFFU4La7YVF8Uh5R |
| Logo concepts (not chosen; kept the current logo) | https://claude.ai/artifact/REfu4iXURR1vxT38xea7Ws |
| Notification icons | https://claude.ai/artifact/HaUBpjK7kQqqiC5XbQwaW1 |
| Ramadan | https://claude.ai/artifact/NFmfUG4J767t6fXZgWX4Mw |
- 17 Nov: session resumed; the logo refine agent was resumed via SendMessage.
- 17 Nov: ✅ Logo refine done; review page https://claude.ai/artifact/LZYL5Pt5GhRjWWtH2LHEyZ. Awaiting: approval + 3 choices (bg #1A3126 current vs #0F3D2E; notif disc vs plain letter; colourways). Export: node design-review/mockups2/logo-refine/export.mjs --write-repo [--bg forest] [--splash] (see NOTES.md); retire scripts/make-icons.mjs (builds from the old raster).
- 17 Nov: ✅ User approved the refine, KEEPING EVERYTHING CURRENT (bg #1A3126, notification disc, colourways, splash untouched). Exported into android mipmaps + adaptive fg, ic_stat_zad, iOS AppIcon, public/icons. Export script now tracked at scripts/icons/export.mjs + geometry.mjs (output identical); make-icons.mjs carries a warning; docs/ios-setup.md updated. Tests 367/23, build + cap sync OK. Uncommitted; awaiting push OK.
- 17 Nov: ✅ PUSHED 6f6c5e7 (sharper logo). User approved UI redesign mockups A/B/C (+ optional 4-tab nav); agent running → design-review/mockups2/ui-directions/.
- 17 Nov: CI for 6f6c5e7 (sharper logo) finished; see gh run list.
- 17 Nov: iPhone CI for 6f6c5e7 failed due to GitHub macOS runner capacity (not code); re-run started. Android + Pages green; the build was sent to the user.
- 17 Nov: ✅ iPhone CI re-run passed for 6f6c5e7. All green.
- 17 Nov: ✅ UI directions page https://claude.ai/artifact/L6aGPCRxFgJDGcDefmo5rh (design-review/mockups2/ui-directions/; A calm refinement, B today list + 4-tab nav, C one focus; recommendation: build A + calm base before December, B rows in Today's prayers sheet, test B later, hold the 4-tab nav). 10 open questions on the page. Awaiting the user's choice.
- 17 Nov: USER FEEDBACK (via an experienced app maker): it looks AI-made and there's too much going on. They want it clean, easy for newcomers, calm, "actually coded" (hand-crafted); modular (unchosen features invisible); premium features planned in (anonymous local/worldwide leaderboards, private group leaderboards, family accounts, admin/mentor); Progress reflections FIRST, then numbers/charts; chapter-like swipes instead of scrolling; reliability under traffic. Supersedes A/B/C (ui-directions). Shared brief: design-review/mockups2/redesign/BRIEF.md. 3 agents running: d1-native (port 5191), d2-chapters (5190), d3-guided (5189). Next: combine the three into one comparison page and publish it. Also write a reliability/scaling plan (docs/plan/reliability.md).
- 17 Nov: user decision: KEEP the salah names (Fajr, Zuhr, ʿAsr, Maghrib, ʿIshāʾ), no English translations; plain language only for other concepts. Sent to all 3 redesign agents + BRIEF.md.
- 17 Nov: ✅ d2-chapters done (24 images, d2-review.html, effort L). Waiting for d1 and d3, then a combined page.
- 17 Nov: ✅ d3-guided done (19 images, d3-review.html). Waiting for d1.
- 17 Nov: ✅ Redesign comparison page https://claude.ai/artifact/Jc7XPNtBLoRDEi5ppxMLU8 (d1 native, d2 chapters, d3 guided; folders design-review/mockups2/redesign/d*). My recommendation: d1 look + d3 'Did you pray?' card on Home + d2 swipe chapters in Progress; tabs Today · Qurʾān · Progress · Community (only if chosen); soft launch on the current design, redesign for January. Awaiting the user's choice.
- 17 Nov: User chose **Calm Chapters (d2)** as the base. Home = Now · Today only. The old "Provision" chapter (good deeds, adhkār, Hizb, verse of the week) moves into the Qurʾān tab, renamed **Read**. Community tab shows only for subscribers. My proposals (awaiting OK): reading deeds checked off inside Read, non-reading deeds as one line on Today; points/levels stay in Progress; invited Circle/Family members get the tab free; one quiet "Zad Plus" row in Settings for discovery. Next: revised d2 mockups.
- 17 Nov: User answers: every member pays; one-tap logging "Prayed on time" / "Prayed in congregation" (the word congregation everywhere); wait for the redesign before the public launch; interactive widgets that log without opening the app. Saved in launch-and-premium §15 and docs/plan/widgets.md. Asked: Tracker vs Progress; no features removed (confirmed).
- 17 Nov: More answers saved (launch-and-premium §15): sisters get one button with congregation under Other; mentees pay, mentor probably free; Family plan; calendar replaces Tracker; build the redesign by early Dec; lock-screen options on both phones (widgets.md). Launched mockup agents: redesign/final (app) and redesign/widgets.
- 17 Nov: ✅ Revised Calm Chapters app mockups (36 shots, design-review/mockups2/redesign/final) published at https://claude.ai/artifact/SJyRUwJNShTpkgsXXBFmuL. Widget mockups still being made (redesign/widgets).
- 17 Nov: ✅ Widget/lock-screen/notification mockups (44 shots, design-review/mockups2/redesign/widgets) published at https://claude.ai/artifact/1JjxnA7F2tEvsjGtY14JaP. Awaiting the user's answers on both pages, then build.
- 17 Nov: Both review pages now have light AND dark for every screen (app 32×2, widgets 23×2); build scripts default to both themes.
- 18 Nov: ✅ Welcome & set-up mockups (12 screens, light+dark, fin-ob-*) added to top of https://claude.ai/artifact/SJyRUwJNShTpkgsXXBFmuL. Open: Arabic/English pairing of 2:197 on Welcome, ʿAsr sheet lists four madhhabs, Brother listed first, home tour replaced by one guide line, login consent still says 'Google or Apple'.
- 18 Nov: User answers on set-up (full 2:197 translation, drop tagline, no dots on ى). Requested colour-theme options (softer dark mode). Agent making themes in redesign/final/themes.
- 18 Nov: ✅ Welcome fixed (full 2:197 translation, tagline removed, ى without dots; cause was the IndoPak copy using U+064A rendered in Amiri — the real app shows IndoPak text in DigitalKhatt IndoPak). Login says Google only. ✅ Colour themes page (Forest/Olive/Sand & Gold/Stone, light + softened dark, all pass WCAG AA) published; agent recommends Forest default. Awaiting the user's pick.
- 18 Nov: User: one theme only (Forest); show green accent options through the whole flow starting at Welcome. Agent rendering redesign/final/accents.
- 18 Nov: ✅ Forest accent options page (Forest/Emerald/Pine/Moss/Sage, full flow from Welcome, light+dark) https://claude.ai/artifact/J5HAbzogLDGPa2o5mXm3i2. Recommend Forest (best contrast), Pine as alternative. Awaiting pick.
- 18 Nov: User: back to the OG forest + gold, calm. Agent rendering redesign/final/og (variants A and B).
- 18 Nov: ✅ OG Calm page (A plain, B green Now card, vs current app; full flow from Welcome, light+dark) https://claude.ai/artifact/ERdoTpRa6mYGnP2QwSVWUf. Recommend B. Awaiting pick + the open questions list, then start building.
- 18 Nov: All design questions answered → build spec docs/plan/redesign-build.md, branch 'redesign' created. Phase 1 build started (UI core, Android native, iOS native).

## ▶ RESUME HERE (saved 18 Nov 2026)
**Where we are:** all redesign design decisions are made and the build has started on local branch `redesign` (nothing committed or pushed).
- **Build spec:** docs/plan/redesign-build.md. Decisions are also in docs/plan/launch-and-premium.md §15.
- **Approved looks:**
  - Layout: Calm Chapters (design-review/mockups2/redesign/final). Review page: https://claude.ai/artifact/SJyRUwJNShTpkgsXXBFmuL
  - **Colours: OG Calm, variant A** (final/og/, https://claude.ai/artifact/ERdoTpRa6mYGnP2QwSVWUf). One theme only, no theme picker.
  - Widgets: https://claude.ai/artifact/1JjxnA7F2tEvsjGtY14JaP
  - Superseded pages: themes (https://claude.ai/artifact/DocPknrzCGukBeYU373ofJ) and accents (https://claude.ai/artifact/J5HAbzogLDGPa2o5mXm3i2).

**Phase 1, started 18 Nov with three parallel agents.** They may have stopped mid-way because of the usage limit. Check the working tree with `git status` / `git diff --stat` to see what landed.
1. **UI core:**
   - OG Calm tokens
   - tabs Today · Read · Progress (+ Community behind `settings.plus`)
   - the Now and Today chapters
   - one-tap logging (brothers: congregation first; sisters: on time first)
   - the Other sheet ("Made up later" only after the prayer ends)
   - undo toast
   - the calendar replacing the Tracker tab
   - the good-deeds line and sheet
   - the first-run guide line
   - Owns src/views/**, src/css/**, src/app.js, src/strings.js, src/features.js. Screenshots go to design-review/mockups2/redesign/build1/.
2. **Android native:**
   - src/pending.js (`mergePendingLogs(S)`) plus tests
   - src/widget-bridge.js and src/widgets.js (snapshot fields)
   - src/notify.js (notification actions)
   - the android/** widgets: one-tap buttons, queue, Undo, next-prayer rule, excused remembrance, showTimesOnly
   - the ongoing "Now" notification (off by default) and the Quick Settings tile
3. **iOS native (ios/** only):**
   - iOS 17 interactive widgets, lock-screen accessory widgets (times only unless lockDots), and the iOS 18 Control
   - The queue lives in App Group UserDefaults "pendingLogs" as a UTF-8 JSON array string.
   - getPending() returns {logs}; clearPending({ids}) removes entries.
   - It can't be compiled on Windows, so CI on a push (after asking the user) confirms the build.

**Shared queue entry:** {id, date "YYYY-MM-DD", prayer Fajr|Dhuhr|Asr|Maghrib|Isha, status congregation|ontime|remember|undo, at ms, src}.

**Snapshot additions** (top-level, v stays 1): gender, excused, showTimesOnly, lockDots, ongoingNow. Optional `labels` keys: onTime, congregation, logged, undo, begins, beginsShort, remembrance, notLogged, madeup, missed, excused, logOnTime, nothingOpen.

**To finish phase 1:**
- Wire `mergePendingLogs(S)` on app start and resume in app.js.
- Add the Settings toggles: Show times only, Ongoing Now notification (Android), Lock-screen dots (iOS).
- Run `npx vitest run` and `npx vite build`, then `npx cap sync android` and `gradlew assembleDebug`.
- Review the build1 screenshots.

**Phase 2 (next):**
- Read tab chapters (For today · Qurʾān · Adhkār) with reading deeds ticked inside them
- Progress chapters (Reflections · Week · Charts · Provisions · Make-ups) with a scrolling chapter bar
- The new set-up flow (Welcome with the 2:197 Arabic from reflections.js plus the full translation, no tagline; screens per the spec)
- Appearance: Mode, Text size, Arabic size
- The Zad Plus page ("stays free"; price to be set)
- Login says Google only
- A "What's new" screen for testers

**Then:**
- a full review
- builds sent to the user's phone, after asking
- a push, after asking

**Still waiting on the user:**
- Google Play developer account (urgent, for the 14-day test)
- testers
- Apple developer account
- accepting the Firebase DPA
- Ramadan content review (https://claude.ai/artifact/NFmfUG4J767t6fXZgWX4Mw)
- a lawyer's review
- 18 Nov (afternoon): all 3 phase-1 agents stopped at the usage limit mid-task (UI: writing calendar.js; Android: plugin + manifest; iOS: plugin) and were resumed after the reset.
- 18 Nov: ✅ **iOS phase 1 done but not compiled.** Files changed: ZadWidgetsPlugin.swift, ZadWidget/WidgetModel.swift, ZadWidget.swift.
  - Built: home widgets S/M/L, lock-screen inline/circular/rectangular (times only unless lockDots), and the iOS 18 Control.
  - Queue: App Group `group.com.zad.app`, key `pendingLogs`, a JSON string with a lock file and a 300-entry cap.
  - **Blocker:** the widget extension target is NOT in project.pbxproj, so CI only builds the app. It must be added either on a Mac (docs/build/widgets.md steps 3–7) or by a CI script (the Ruby `xcodeproj` gem or XcodeGen in ios.yml). Plan: add it through a CI script so no Mac is needed.
  - To do: update docs/build/widgets.md (one-tap is built; minimum iOS 16 is OK); the widget shows "logged ✓" after a Remembrance tap (consider a "remembered" label).
- 18 Nov: ✅ **Android phase 1 done.**
  - Added: pending.js plus 30 tests, the snapshot fields, the widgets rebuilt in OG Calm, notification buttons, the Now notification (off by default) and the QS tile.
  - Builds: `vite build`, `cap sync android` and `assembleDebug` all succeed.
  - `lintDebug` fails on 2 errors that were already there: `windowLightNavigationBar` in styles.xml, and the local.properties path escaping.
  - Follow-ups sent to the Android agent: the tile must respect showTimesOnly, add `requestAddTile`, and tidy the JS `widgetModel` copy.
  - Sent to the UI agent: the main.js wiring and the Settings → Widgets toggles (showTimesOnly, ongoingNow for Android, lockDots for iOS).
- 18 Nov: ✅ Android follow-ups done: the tile respects showTimesOnly, `requestAddTile`/`addTile()` added, and `widgetModel()` now matches the Java (new signature). Tests: 426 passed, 23 skipped, 0 failed. Builds succeed. The UI agent was told to add the tile 'Add' row. Note for the iOS port: check it against the new `widgetModel()`.
- 18 Nov: ✅ **Phase 1 UI done.**
  - New files: today.js, routes.js, views/calendar.js, views/community.js, css/today.css, tests/today.test.js. tracker.js was deleted.
  - Widget settings and main.js wiring added. I fixed widget-bridge deep links so they go through routes.js redirects.
  - **Tests:** 426 passed, 23 skipped. The build succeeds.
  - **Real-app screenshots:** https://claude.ai/artifact/WZb6ypfzyJiCYEUuQQrfDz (build1/).
  - Notes from the agent:
    - App font switched to the system font (one line in theme.css).
    - Set-up no longer auto-starts the tour.
    - Settings inside is unchanged.
    - Make-ups is still the old page.
    - The Good deeds sheet still lists the reading deeds until Read can tick them.
  - **NEXT:** phase 2, plus the iOS widget target in pbxproj through a CI script.
- 18 Nov: Phase 2 started with 4 agents: Read tab (build2/read, port 5191), Progress chapters (build2/progress, 5192), set-up + settings + Appearance + Zad Plus + What's new (build2/setup, 5193), and the iOS widget target through a CI script (scripts/ios/add-widget-target.rb + ios.yml). Asked the user: test build to the phone now, or after phase 2 (recommended after).

## ▶ RESUME HERE (saved 18 Nov 2026, evening)
**Phase 1 is DONE** in the working tree on branch `redesign`; nothing is committed or pushed.
- Tests: 426 passed. The vite build and Android assembleDebug both succeed.
- Real-app screenshots: https://claude.ai/artifact/WZb6ypfzyJiCYEUuQQrfDz
- iOS widget Swift is written but not compiled.

**Phase 2: 4 agents were running at save time** and may have stopped at the usage limit. Check `git status`, the build2/* folders and each part's files. If an agent's id is still live in this session, resume it with SendMessage; otherwise relaunch it with the same brief.
1. **Read tab:**
   - Chapters: For today · Qurʾān · Adhkār.
   - Reading deeds are ticked off inside Read. The Good deeds sheet on Today shows non-reading deeds only.
   - Owns src/views/tools/**, css/tools.css and the deeds sheet in views/home.js.
   - Screenshots: build2/read/ (vite port 5191).
2. **Progress:**
   - Chapters: Reflections · Week · Charts · Provisions · Make-ups, with a scrolling chapter bar. #makeups opens the Make-ups chapter.
   - Owns views/progress.js, qada.js, provisions.js, css/progress.css, css/provisions.css.
   - Screenshots: build2/progress/ (port 5192).
3. **Set-up and settings:**
   - Welcome: the 2:197 Arabic from reflections.js plus the full translation, no tagline, no dotted yāʾ.
   - Set-up steps: Name+gender → Times (with the ʿAsr sheet listing four madhhabs) → Read style → Features → Make-ups → Reminders → Crash → Ready.
   - Log in: Google-only text.
   - Settings: full-screen with Done, plus Appearance (mode, text size, Arabic size).
   - Zad Plus page: Coming soon, "stays free".
   - "What's new": shown once, to existing users only.
   - Owns views/onboarding.js, consent.js, settings.js, css/onboarding.css, css/consent.css, plus new plus.js/whatsnew.js.
   - Screenshots: build2/setup/ (port 5193).
4. **iOS widget target through CI:**
   - scripts/ios/add-widget-target.rb (Ruby `xcodeproj`, idempotent) run by .github/workflows/ios.yml.
   - Also updates docs/build/widgets.md and docs/ios-setup.md.

**After phase 2:**
- Run all tests and the build, then gradlew.
- Run a code review of the whole redesign.
- Publish one review page of real-app screenshots.
- **Ask the user** before pushing or sending a test build to the phone. They were asked "test build now or after phase 2?" (I recommended after) and haven't answered yet.
- The first CI iOS run confirms the widget target and the Swift.
- 18 Nov (night): all 4 phase-2 agents stopped at the usage limit mid-task and were resumed after the 9:10pm reset.
- 18 Nov: ✅ **iOS widget target via CI done, untested** (there's no Ruby or Xcode here).
  - Files: scripts/ios/add-widget-target.rb (xcodeproj ~>1.27, idempotent), ios.yml (both jobs run it and check that ZadWidget.appex is embedded), docs/build/widgets.md, docs/ios-setup.md (new portal steps: App Group group.com.zad.app, App ID com.zad.app.ZadWidget).
  - **Bug fixed:** the App target never had CODE_SIGN_ENTITLEMENTS, so App Groups and Sign in with Apple were never applied. The script now sets it.
  - To test: push the branch, then run `gh workflow run ios.yml --ref redesign`. This needs the user's OK.
- 18 Nov: ✅ **Read tab done.**
  - New files: reading.js, views/read.js, views/tools/donebar.js, tests/read.test.js (20 tests). Shared chapters.js is used.
  - Tests: 470 passed. Screenshots in build2/read/.
  - Fixed: an invisible undo toast was blocking taps.
  - **Questions for the user:**
    1. Excused days: For today shows "Listen to Qurʾān" and hides Mulk, Kahf and Manzil. Is that rule right?
    2. Hizb, Mulk, Kahf and Manzil earn no provisions. Keep it that way?
    3. "Para" vs "Juzʾ" label for IndoPak.
    4. The "Coming later" tiles were removed.
- 18 Nov: ✅ **Progress chapters done.** New: views/chapters.js, tests/progress-chapters.test.js. Screenshots in build2/progress/. I fixed stats.insights so salawāt and sadaqah (no daily target) are never the 'thing to work on'. Open points to raise with the user: the ring calendar and heat table were dropped; the Reflections duʿāʾ box shows the daily reflection.
- 18 Nov (night): ✅ **PHASE 2 DONE.**
  - Set-up/settings agent added: appearance.js, views/whatsnew.js, views/plus.js, tests/setup-redesign.test.js. Onboarding was rewritten.
  - Tests: 470 passed, 23 skipped. vite build passes; cap sync and assembleDebug succeed.
  - Combined real-app page (both rounds): https://claude.ai/artifact/Cgk87Tff4yVqZD8xNP2FWi
  - **Open questions for the user:**
    - Read: the excused-day reading rule; Hizb/Mulk/Kahf/Manzil earning provisions; Para vs Juzʾ; "Coming later" tiles hidden.
    - Progress: bring back the ring calendar or heat table?; Reflections box: duʿāʾ or reflection?
    - Set-up: should Features include the Provisions row?
  - **NEXT:**
    - a thorough code review of the redesign diff
    - fixes
    - ask the user about pushing the branch and sending a test build (Android through App Distribution; iOS CI run to test the widget target)
- 18 Nov (night): Follow-up agent running: provisions for Hizb/Mulk/Kahf/Manzil, Juzʾ label, Provisions in set-up Features, Make-ups line on Today, dead CSS removed. Screenshots go to build3/. Then a code review.
- 18 Nov: The follow-up agent's scope was extended with the 'Make up now' card and fasts in the make-ups line.
- 18 Nov: Appearance mode label changed from 'Follow phone' to 'System' (strings.js:575).
- 18 Nov: Asked the follow-up agent to add Sunrise: a row between Fajr and Zuhr on Today, 'Ends at sunrise' on the Fajr sub-line, 'until sunrise' on Now, and in the set-up and settings time lists.
- 18 Nov (late): ✅ **Follow-ups done.**
  - Provisions for Hizb, Mulk, Kahf and Manzil (new `day.reads`), the Juzʾ label, the Provisions choice in set-up, the Make-ups line on Today (with fasts), the "Make up now" card (forbidden times blocked), Sunrise rows, the System label, and dead CSS removed.
  - Tests: 505 passed. Build passes.
  - Screenshots: https://claude.ai/artifact/7oiNZBfwRTh9jjwUkApyz4 (build3/).
  - **NEXT:** the code review, after the user's OK.
- 18 Nov (late): The user agreed to push first and review after the usage reset.
  - Committed cf1aa18 on branch `redesign` and pushed the branch (main is untouched).
  - android.yml: the public GitHub-release attach now runs only on main.
  - Started CI runs on `redesign`: Android 44461281890 (App Distribution to the user's phone) and iPhone 44461285888 (the first test of the widget target script).
  - **NEXT:** check both runs, then the thorough code review after the reset, then fixes, then merge to main only with the user's OK.
- 18 Nov (late): ✅ Android CI run 44461281890 on redesign succeeded. The test build was sent to the user's phone through App Distribution. iOS run 44461285888 still running.
- 18 Nov (late): ✅ **iOS CI run 44461285888 on redesign SUCCEEDED.** The script added the ZadWidget target (com.zad.app.ZadWidget, iOS 16) and the widget Swift compiled with Xcode 26.3. ZadWidget.appex is embedded and validated, BUILD SUCCEEDED. iPhone widgets are now really part of the app; TestFlight still needs the Apple account plus the portal steps in docs/ios-setup.md. NEXT: the code review after the usage reset.
- 19 Nov: The user reported on the test build: (1) widgets not updated; (2) lag swiping chapters; (3) an unlogged prayer comes back as logged. A debug agent is investigating (suspects: notification action re-delivery with random ids, the queue, undo snapshots, sync, widget update on package replace, chapters doing scroll work).
- 19 Nov: User details: the bug is unticking **Evening adhkār** (it comes back as done), and a re-added widget still shows the OLD design. Both forwarded to the debug agent.
- 19 Nov: The debug agent stopped at the usage limit while hardening WidgetUpdater; resumed after the reset.
- 19 Nov: User sent 10 feedback items (launch-and-premium.md). Started a parity audit agent (writes docs/plan/parity-audit.md) and a Qibla module agent (new files only). The rest waits until the debug agent finishes (file overlap).
- 19 Nov: ✅ **Qibla module built** (src/qibla.js, views/qibla.js, css/qibla.css, tests/qibla.test.js; 23 tests; shots in design-review/mockups2/redesign/qibla/). Not wired yet: needs the css import in main.js, a route/entry, and unmountQibla on leave. Limitations: no magnetic-declination correction (consider the npm 'geomagnetism' WMM package; matters in the US west and NZ); iOS has no haptics (use @capacitor/haptics).
- 19 Nov: Clarifications saved (launch-and-premium.md). Waiting on the debug and parity agents before step 1 (fixes) starts.
- 19 Nov: ✅ **Parity audit done** (docs/plan/parity-audit.md). Feedback still exists, but it's buried under Help → Get in touch; add a Settings row. MISSING items M1–M13; my proposal: restore M1, M3, M4, M6, M7, M8, M10, the Feedback row and a Friday sīrah toggle (pre-existing gap). Ask the user about M2, M5, M9, M11, M12, M13 (dropped on purpose or not).
- 19 Nov: ✅ **Debug fixes done.** (1) Untick root cause: mergeTools resurrected cleared reader stamps from the cloud; fixed with S.tools.cleared tombstones. (2) Notification replay: fixed ids, and MainActivity forgets the handled launch. (3) Lag: :has() CSS removed, chapters.js rewritten, home uses the shared chapters. (4) Widgets: hardened, root cause unproven (maybe the dark gold looks like the old design). Tests: 558 passed. The user answered the parity a–f questions. Nafl list (2 or 4) still open.
- 19 Nov: The commit and push of the debug fixes was DENIED by the permission classifier (needs the user's explicit OK); nothing was committed. Started the next round: agent A (Now→next prayer, all-five, good deeds line bug, add deed, nafl add-on, sunnah line, day sheet + alignment, excused line, greeting, feedback row, sīrah toggle, tab reset, Qibla wiring; screenshots in build4/a) and agent B (Progress sub-tabs + restored numbers, legend alignment, Yā-Sīn morning/evening, Read sub-lines, set-up privacy note + presets; screenshots in build4/b).
- 19 Nov: **The user gave explicit OK** to push everything to the `redesign` test branch and send a new Android test build once this round (agents A + B) is finished and tested. Main stays untouched.
- 19 Nov: The location decision was sent to both agents (B: set-up screen, A: Settings page).

## ▶ RESUME HERE (saved 19 Nov 2026, midday; the user is away until about 4:30pm)
**State:** branch `redesign`. cf1aa18 is pushed. The working tree has UNCOMMITTED debug fixes (untick tombstones, notification replay, chapter lag, widget hardening, Qibla module); tests were 558 passed.

**Running when saved:**
- **Agent A** (Today/Now/calendar/Settings/navigation/Qibla wiring, plus Settings location with GPS primary). Screenshots go to build4/a/ (port 5197).
- **Agent B** (Progress sub-tabs plus restored numbers, legend alignment, Yā-Sīn morning/evening, Read sub-lines, set-up privacy note, presets, set-up location with GPS primary and the city link only as a fallback). Screenshots go to build4/b/ (port 5198).

If they stopped at the usage limit, resume them with SendMessage if their ids are live; otherwise relaunch from these notes plus launch-and-premium.md (the 19 Nov entries).

**When both finish:**
1. Run `npx vitest run`, `npx vite build`, `npx cap sync android` and `gradlew.bat assembleDebug`.
2. Look at the build4 screenshots and publish one review page (light/dark).
3. **The user gave explicit OK (19 Nov)** to commit, push to `redesign` and run `gh workflow run android.yml --ref redesign` (and ios.yml) for a new test build. Main stays untouched.
4. Ask the user for a screenshot of the widget (the root cause of the "old widget" isn't proven; maybe the dark-mode gold looks like the old design).

**Later:**
- the thorough code review
- magnetic declination for Qibla (US West)
- the nafl wording review by the scholar (TODO in the code)
- merging to main only with the user's OK
- 19 Nov (4:30pm): agents A and B stopped at the usage limit and were resumed after the reset.
- 19 Nov: Home merge requested (see launch-and-premium). Agent A told to skip Now-specific work. Mockup of the merged Today is next.
- 19 Nov: The merged Today design is approved (see launch-and-premium). It will be built after agent A finishes (home.js overlap), shown as real-app screenshots before any push.
- 19 Nov: Qurʾān goal requested; proposal sent, awaiting answers. Queued after the merged Today.
- 19 Nov: Qurʾān goal spec approved (launch-and-premium); queued after the merged Today.
- 19 Nov (evening): ✅ **Agent A done.** Tests: 621 passed.
  - Good deeds line bug fixed: it was hidden when all deeds were reading deeds.
  - Also built: add a deed with a type, the nafl group (naflShow, all 4 on by default, counted as good deeds now), the Sunnah line, the day sheet (Hijri, %, excused N of M, alignment fix), the excused line, the greeting and welcome toast, Settings rows (feedback, Qibla, seerahNotify), the location sheet with GPS primary, the central tab reset, and the #qibla route (views/qibla-page.js).
  - Now-only markup (nowHead, nextCard, allFiveCard, qiblaBtn) can be deleted at the merge; the logic stays in today.js (nowFocus, allFiveMoment, makeUpNowFor).
  - Screenshots: build4/a.
  - Open questions: nafl defaults (all 4 or 2?); is moving nafl from sunnah to good deeds in provisions a weights change for the scholar to sign off?; 'Duhā' spelling; review of the nafl timing wording.
  - **PLAN:** wait for B, then verify, commit, push and build (approved), then launch the merged Today and then the Qurʾān goal.
- 19 Nov (evening): ✅ **Round committed as 3236aac and pushed to `redesign`** (user approved). Tests: 621 passed; vite build, cap sync and assembleDebug all OK. Android CI run 44636403568 → App Distribution to the user's phone.
  - Agent B is done: Progress sub-tabs, restored numbers, legend fix, Yā-Sīn morning/evening (morning window Fajr–ʿAsr), Read sub-lines, set-up privacy note, GPS-only button, presets. Screenshots in build4/b.
  - **Launched:** the merged-Today agent (screenshots to build5/, port 5199). Next is the Qurʾān goal.
  - **Open questions for the user:**
    - nafl defaults (all 4?)
    - nafl as good deeds in provisions (weights sign-off)
    - Duhā spelling
    - nafl wording review
    - Yā-Sīn morning window and name ('Sūrat Yā-Sīn'?)
    - congregation chart period mix
- 19 Nov: ✅ Android CI run 44636403568 (3236aac) succeeded; the test build was sent to the user's phone.
- 19 Nov: Invited GitHub user **heemai** as a collaborator with **write** access (user's request); the invitation is pending acceptance.
- 19 Nov (night): ✅ **Merged Today page built**, uncommitted. Tests: 649 passed. Screenshots in build5/: https://claude.ai/artifact/7q2rmtTPyBwgDKdw6HorFr
  - Open questions for the user:
    1. A tap on a Missed/Made up/Excused prayer opens the sheet.
    2. "Not now" sits inside ⋯.
    3. "Make up now" logs straight away, with Undo.
    4. The "This week" line was dropped from Today.
    5. "Make up now" shows on every eligible row.
  - Awaiting the user's OK on the look before pushing.
  - Launched the Qurʾān goal agent (screenshots to build6/, port 5200).
- 19 Nov (9:30pm): the Qurʾān goal agent stopped at the usage limit and was resumed after the reset. Merged Today still awaits the user's review (https://claude.ai/artifact/7q2rmtTPyBwgDKdw6HorFr).
- 19 Nov: User found the merged Today crowded; declutter mockup agent launched (design-review/mockups2/redesign/declutter/). The Qurʾān goal agent is still running. Calendar future times + Hijri, and the reading items in the Good deeds sheet, are queued.
- 19 Nov: User's answers 1–5 saved; the Sunnah line comes off Today (mockup agent told).
- 19 Nov (night): ✅ **Qurʾān goal built**, uncommitted.
  - New files: quran-goal.js, quran-track.js, views/quran-goal.js. Tests: 692 passed.
  - Screenshots in build6/: https://claude.ai/artifact/8W9t1zuwG3w1zQrjghvjGH
  - Open questions for the user:
    1. Should "I read…" tick recitation by default?
    2. Minutes don't convert to pages.
    3. The 1.25× catch-up cap.
    4. Add a 'start on 1 Ramaḍān' option to the planner?
    5. Should Settings show the finish date?
  - The declutter mockup agent is still running.
- 19 Nov: Qurʾān goal answers saved (add the 1 Ramaḍān start; show the finish date in Settings). ✅ Declutter mockups published: https://claude.ai/artifact/3eiSi3Y5JyEis5RE8NpvHG (A recommended). Content questions: durūd vs salawāt overlap; what the Good deeds 'n of m' counts. Awaiting the user's pick.
- 19 Nov: B chosen (with A's pills); durūd and salawāt merged; count only chosen daily deeds. Build agent launched (screenshots to build7/, port 5201): Today B, calendar future times + Hijri, deeds sheet with reading, merged durūd, Ramadan planner, Settings finish date. After it: verify, commit, push and build (the user approved test-branch pushes).
- 19 Nov: The no-'wājib'-label request was sent to the build agent.
- 19 Nov: The user asked to see ALL other screens in theme B. The declutter mockup agent was resumed to mock Read, Progress, Settings, set-up, Qibla and sheets (page: declutter/b-everything.html).
- 19 Nov: ✅ Everything-in-B mockups (25 screens, light+dark) published: https://claude.ai/artifact/B5hjfj8aUKrka41C3ZVUG4. Extras: Appearance has a 'Follow the time of day' switch; set-up times has before/after states. The Today B build agent is still running. Next: after the user's OK on this page, restyle Read, Progress, Settings and set-up to B.
- 19 Nov: Welcome variants (logo), gender on the name screen, and Appearance without the switch were sent to the mockup agent.
- 19 Nov: ✅ Welcome variants A (night horizon, recommended), B (dawn arch) and C (full-bleed girih), plus the name screen with Brother/Sister and Appearance without the switch, republished at https://claude.ai/artifact/B5hjfj8aUKrka41C3ZVUG4 (v2). Awaiting the Welcome pick and the OK to restyle all screens to B.
- 19 Nov: Welcome D (B's arch on C's background) was requested from the mockup agent.
- 19 Nov: ✅ Welcome D published (v3, https://claude.ai/artifact/B5hjfj8aUKrka41C3ZVUG4). Next, after the user's OK: restyle Read, Progress, Settings, set-up and Welcome D to B in the real app (after the Today B build agent finishes), then push the test build.
- 19 Nov: **The user approved the whole B look and Welcome D.** Plan: when the Today B build agent finishes, launch a restyle agent for Read, Progress, Settings, set-up, Welcome D, Qibla and sheets, reusing the Today agent's band/arch CSS. Then verify, commit, push and build (approved).
- 19 Nov (late): ✅ **Today B built.**
  - Also built: calendar Hijri + future-day times, the deeds sheet with reading and merged Durūd/Salawāt (settings.dailyDeeds), the Ramaḍān planner, the Settings finish date, and 'wājib' removed.
  - Tests: 733 passed. Screenshots in build7/.
  - Open questions: the ʿIshāʾ 'best before' line; Sunday week start; no mark on later rows; old durūd days gain +1 provision.
  - **Launched the restyle agent** for all other screens in B, including Welcome D (screenshots to build8/, port 5202). Then verify, commit, push and build.
- 19 Nov: User confirmed the Today B open points (no changes). The restyle agent is running.
- 20 Nov: The restyle agent stalled (watchdog) while building screenshots; resumed it.
- 20 Nov: ✅ **Restyle done and committed as 5377505**, pushed to redesign. Tests: 733 passed; vite build and assembleDebug OK. Android CI run 44742247630 started. Screenshots: https://claude.ai/artifact/Q6N9pGXajhF9CCRoRWeFnt (build8/). New files: band.js, css/band.css, css/sheets.css, logo SVGs. Not restyled: the full mushaf reader bars, and Community (out of scope).
- 20 Nov: ✅ Android CI 44742247630 (5377505) succeeded; the build was sent to the user's phone.

## ▶ RESUME HERE (saved 20 Nov 2026)
**State:** branch `redesign` at 5377505 is pushed, and the test build is on the user's phone. `main` is still the old design (website, public release).
**Agreed plan:**
1. The user tests the build for a day or two and reports bugs; also ask for a widget screenshot (the root cause of the "old widget" is unproven).
2. Run the thorough code review of `main..redesign`, ideally right after a usage reset, then fix the findings.
3. Merge `redesign` into `main` ONLY with the user's OK. That updates the website and the public APK and runs iOS CI.

**Open items:**
- Qibla magnetic declination (US West Coast); haptics on iOS.
- The scholar to review the nafl timing wording (TODO in strings.js NAFL).
- Not yet restyled: the mushaf reader bars, Community.
- GitHub collaborator `heemai` invited with write access. Branch protection on main was suggested and is not set.
- Still waiting on the user: Play account, testers, Apple account, Firebase DPA, Ramadan content review, lawyer.
- 20 Nov: User feedback on the build (launch-and-premium). Agent started on items 1–3 (screenshots to build9/, port 5203). Proposals for 4–6 sent to the user.
- 20 Nov: Second agent started on the Read For today C, the weekly card and the Settings consolidation (screenshots to build9b/, port 5204).
- 20 Nov: Remove the 'All five prayers, Alhamdulillah' line from Today. **BUG:** after ʿIshāʾ is logged, the hero must show the next day's Fajr (Witr moves to ʿIshāʾ's row). Both sent to agent a2f18 (Today).
- 20 Nov: ✅ Agent a2f18 done: greeting on 2 lines (lock screen too), the calendar's gold today number (#82610F / #E0BE62), the deeds sheet showing chosen items only plus 'Add or change daily deeds', the all-five line removed, and the hero showing tomorrow's Fajr after ʿIshāʾ is logged (Witr ring on ʿIshāʾ's row). Tests: 745 passed. Screenshots in build9/. Waiting on the Read/Settings agent (build9b) before commit, push and build.
- 20 Nov: ✅ **Committed ed70911 and pushed to redesign.** Tests: 765 passed; builds OK. Android CI 44865085876 running. Screenshots: https://claude.ai/artifact/6HSDJUjB9YYkYA3SBofqdF (build9 + build9b). Note: stale vite processes from earlier sessions are still on ports 5199/5204 (harmless).
- 20 Nov: ✅ Android CI 44865085876 (ed70911) succeeded; the build was sent to the user's phone.
- 20 Nov: ✅ cf9d5a4: Today header aligned (grid layout: greeting and name left, icons centred on them, date full width), the provisions chip as a 40px ring with 'Lv' and the number inside, calendar swipe between months (passive touch). Tests: 768 passed. Android CI 44866328708.
- 20 Nov: ✅ Android CI 44866328708 (cf9d5a4) succeeded; the build was sent to the user's phone.
- 20 Nov: ✅ 24349d1: the provisions ring shows 'Lv 3' on one line inside a 44px ring (arc clear of the text). Android CI 44866930375.
- 20 Nov: ✅ Splash fix committed and pushed (@capacitor/splash-screen 8, launchAutoHide false, hide after first paint in main.js, 4 s safety hide in index.html, inline dark/light background, values-night appBackground). Android and iOS CI started on redesign. iOS Package.swift isn't updated locally (Windows symlink EPERM); CI's cap sync regenerates it.
- 20 Nov: ✅ 66567b4: date line moved above Fajr (heading of the list). Android CI 44867391787 (supersedes the splash run); iOS CI 44867216453 checks the splash plugin builds.
- 20 Nov: ✅ Android CI 44867391787 (66567b4) succeeded and was sent to the phone. ✅ iOS CI 44867216453 succeeded with the splash-screen plugin and the widget target.

### 25 Nov 2026: user feedback round (widget reminder, widget sizes, location)
- Widget log now cancels that prayer's reminders at once (scheduled and showing): src/notify.js reminderMap → ZadWidgets.setReminders; Android widget/ReminderCanceller (mirrors @capacitor/local-notifications 8.3.1 cancel: TimedNotificationPublisher PendingIntent by id + NOTIFICATION_STORE); iOS ZadActions.cancelReminders (UNUserNotificationCenter, ids "1004"). Undo doesn't restore them (the app's next reschedule does).
- Widgets follow their own size whichever kind was placed: WidgetRenderer.sizeFor / responsive (Android 12+ RemoteViews size map; older: options + onAppWidgetOptionsChanged). Kinds SMALL_SHORT/SMALL/SMALL_TALL (five times list)/MEDIUM_SHORT/MEDIUM/MEDIUM_TALL (times above buttons)/LARGE; medium under 300dp drops button icons. Times row: even gaps, centred, no AM/PM. Debug-only preview screen: android/app/src/debug WidgetPreviewActivity (adb am start … --es sizes 110x110,250x160).
- Location: older saves (source "unknown", before 15 Nov) now follow the phone when location access is allowed (first read marks them "gps"); update threshold 25 km → 3 km, check every 10 min, toast only when the place name changes. Cause of "always Glendale Heights": the user's location was an "unknown" save, which the travel check skipped.
- 25 Nov: location updates quietly; the toast only after a trip over 25 km (TRAVEL_TOAST_KM). User's choice.
- 25 Nov: polish proposal mockups (design-review/mockups2/redesign/polish: polish.css + polish.js applied to the real app; shoot.mjs; vite :5210). Review page https://claude.ai/artifact/1LpUu2vGcmAmptNudGrD4g. Awaiting the user's choices (icons in Settings optional; sunnah chip under the name in the build).
- 25 Nov: user approved the polish proposal, Settings WITHOUT the small icons (plainer). Building: polish styles, iOS sheet (page shrinks, drag to dismiss, no Done on the prayer sheet), haptics, press feedback, large titles, type scale 8 / radii 3.
- 25 Nov: polish pass BUILT. src/css/polish.css (imported after sheets.css; :root:root selectors), type tokens --t-* and radii --r-* in theme.css; sweep mapped 715 px font sizes and 133 card radii to tokens (circles/pills kept; display sizes >34px and <10px untouched). iOS sheets: app.js openSheet/closeSheet toggle #phone.sheet-open + .scrim.out slide-down; src/sheet-drag.js (touch drag down to close, 110px or flick); no Done on the prayer, Good deeds and This week sheets. src/haptics.js (@capacitor/haptics: light / medium for congregation / success for the fifth; counters + Qibla). src/large-title.js (slim frosted title bar on .zb-pg pages). Section labels sentence case; Provisions/opts/This week/Good deeds lists grouped. Settings plain (no icons, user's choice). Verified: 33-screen before/after sweep (design-review/mockups2/redesign/polish/sweep.mjs, diff.mjs), touch drag test, 4x CPU frame times similar to before.
- 26 Nov: greeting option A (user's pick): salām 13 grey, name 17/600, header buttons 36 (provisions ring fitted to 36).
