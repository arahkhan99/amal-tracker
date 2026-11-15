# Tablet and iPad support

Built 14 Nov 2026 from the approved design in `design-review/mockups2/tablet/` (notes.md, tablet-review.html).
The user chose **Option A** (a centred column, ~15% larger, with the forest Home hero and the bottom bar edge to edge) plus two parts of **Option B**: sheets become centred dialogs, and the Qurʾān shows a **two-page spread in landscape**.

## When it applies
- Tablet layout: **768+ CSS px wide and 540+ tall** (`src/css/tablet.css`; the same query is `TABLET_QUERY` in `src/tools/quran-spread.js`).
- Below that (phones in either orientation, 7" Android tablets at ~600px, iPad mini portrait at 744px, narrow Split View / Stage Manager windows) the phone layout is unchanged.
- The min-height keeps an Android phone turned sideways (e.g. 844x390) on the phone layout.
- The old desktop-web "phone frame" (390x844 with a fake bezel over 820px) is **gone**. The shell is always full screen; wide browser windows get the tablet layout.

## What changed
| File | Change |
|---|---|
| `src/css/tablet.css` (new, imported last in `src/main.js`) | 115% zoom on each `.view` (not on `#screen`, so scroll maths stays in one unit), a 560px column, Home hero edge to edge with a rounded bottom, bottom bar zoomed 112% with the tabs centred, onboarding in a 600px column, sheets as centred 540px dialogs (no grab handle, pop-in, reduced-motion respected), Qurʾān reader full width with safe-area-aware padding. |
| `src/styles.css`, `src/css/theme.css`, `src/css/onboarding.css`, `src/css/settings.css` | Removed the `min-width:821px` phone-frame rules (frame, bezel shadows, 56px top paddings). |
| `src/css/progress.css` | Fix: `.pg-top` now has the top safe-area inset + 30px like Tracker, Make-ups and Settings (it sat under the status bar on notched phones). This moves the Progress title down 20px on phones too. |
| `src/tools/quran-spread.js` (new) | Pure spread pairing: `spreadPages`, `stepSpread`, `spreadFirst`, `inSpread`, plus the media queries. |
| `src/views/tools/quran.js` | Spread rendering, tablet page fitting, paging/slider/bookmarks/read-today by spread, re-fit on resize/rotation and when fonts load. |
| `src/views/tools/strings-tools.js` | `TT.pagesOf(a, b, m)` → "Pages 3–4 of 610". |
| `tests/quran-spread.test.js` (new) | Pairing, ends, odd counts, clamping, stepping, full coverage, and a check against the real indopak15/madani15 data. |
| `ios/App/App.xcodeproj/project.pbxproj` | `TARGETED_DEVICE_FAMILY = "1,2"` (Debug and Release). |
| `ios/App/App/Info.plist` | iPhone stays portrait only; `UISupportedInterfaceOrientations~ipad` lists all four orientations (needed for iPad multitasking). |
| Android | No change. The manifest has no orientation lock (only `configChanges`, so rotation keeps state), so phones already rotate today; Android 16 ignores locks on large screens anyway. |

## Qurʾān on tablets
- **Portrait:** one page, fitted to both width and screen height (font up to 64px instead of 34px; the 420px page cap is lifted to 760px). The frame hugs the widest line.
- **Landscape:** a two-page spread, automatic, no setting. Right-to-left like a printed muṣḥaf: the **right page is the earlier one**.
- **Pairing:** in every shipped layout pages 1 and 2 are the two ornamented opening pages (al-Fātiḥah | start of al-Baqarah, 8 lines each) and face each other, so spreads are 1|2, 3|4 … (odd page on the right). This was checked against the data: indopak15 (610 pages) ends 609|610 and madani15 (604) ends 603|604. Juz/para starts fall on even (left) pages in both, as in print.
  - **13-line IndoPak (847 pages, not shipped yet):** the default is the same, and the last page (847) shows alone. If the imported QUL layout turns out to start differently, add `"spreadFirst": 2` (for example) to its `index.json`. Pages before it then show alone. Check this when it is imported.
- **Paging and swipe** move one spread. The **slider** snaps to the spread holding the chosen page, and the label reads "Pages 99–100 of 610".
- **Bookmarks:** the icon is on when either page is bookmarked. Tapping it clears both, or else bookmarks the right-hand page. Jumping to a bookmark opens its spread.
- **Read today:** after the 9s dwell, both pages are counted.
- **Saved page:** the saved page is the spread's first page. Turning to portrait shows that page.
- **Translation:** the translation panel lists both pages' ayahs.
- Rotating switches page ⇄ spread live (matchMedia change → redraw), and a resize re-fits.

## Checked
- `npx vitest run`: all pass. `npm run build`: OK. `npx cap sync android` and `./gradlew assembleDebug`: OK.
- Playwright (Chromium) on iPad 11" 834x1194 / 1194x834, Android 10" 800x1280 and phone 390x844, in light and dark: Home, Tracker, Progress, Qurʾān and the ʿAsr sheet. These match the A mockups. The phone screens are unchanged apart from the Progress header fix.
- Progress chapter chips land correctly on tablets. Zoom sits on the views rather than the scroller for this reason: with zoom on `#screen` they overshot by ~300px.
- **Still needs a real device:** iPad simulator or device (WebKit `zoom`, safe areas, launch screen and icons on iPad, Split View and Stage Manager), and an Android tablet with a camera cutout in landscape. Also check the tour's coach marks and the Qurʾān tip on a tablet.

## Store screenshots
- **App Store (now required):** once the app supports iPad, an **iPad 13" set is mandatory**.
  - Size: **2064x2752** portrait (or 2048x2732), or the landscape equivalents.
  - 1–10 images. Smaller iPads are scaled from this set.
  - Samples are in `design-review/mockups2/tablet/store/`. Capture at a 1032x1376 viewport with deviceScaleFactor 2.
- **Google Play (optional, recommended):**
  - **7-inch tablet**, e.g. 1200x1920, and **10-inch tablet**, e.g. 1600x2560.
  - JPEG or 24-bit PNG, each side 320–3840px, the long side at most 2× the short side. 4 or more per form factor.
  - Without these the app is not shown as tablet-ready or featured on large screens.
- **Suggested set:** Home, Tracker, Progress, and the Qurʾān (the landscape spread sells the tablet version).

## Not done / follow-ups
- The PWA manifest (`vite.config.js`) still says `orientation: "portrait"`, so an installed web app on a tablet stays portrait. Change it to `"any"` if tablet web installs matter.
- iPad mini portrait (744px) gets the phone layout by decision (768 breakpoint).
