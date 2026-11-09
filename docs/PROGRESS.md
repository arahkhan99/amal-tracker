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
