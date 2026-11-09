# Qurʾān data: offline mushafs and translation

Owner: Quran data agent (7–8 Nov 2026). Files: `public/quran/**`, `src/tools/quran-data.js`, `scripts/quran/**`, this doc.
Nothing here is legal advice. The licences below were read on 7–8 Nov 2026.

## What ships

| Mushaf id | Title | Pages | Lines | Navigation | Font | Status |
|---|---|---|---|---|---|---|
| `indopak15` (**default**) | 15-line IndoPak | 610 | 15 | para | DigitalKhatt IndoPak (OFL) | ready |
| `madani15` | 15-line Uthmani | 604 | 15 | juz (+ hizb quarters) | DigitalKhatt New Madina (OFL); Amiri Quran (OFL) as fallback | ready |
| `indopak13` | 13-line IndoPak | 847 | 13 | para | DigitalKhatt IndoPak | **not available** (see below) |

Translation: Pickthall, per ayah: the genuine 1930 wording for 81 surahs; surahs 6–38 still use an edited text and are flagged (see the Pickthall section).

Total size of `public/quran`: about **6.0 MB** (page data 1.8 MB per mushaf, Pickthall 0.87 MB, fonts 1.7 MB).
Each page file holds one para/juz (55–68 KB of JSON, about 12–18 KB gzipped), so the reader loads one small file at a time.

## Sources and licences

| File(s) | Source | Licence | Credit needed |
|---|---|---|---|
| Page/line text of both mushafs (`*/p/*.json`, `x` fields) | DigitalKhatt `digitalkhatt-js`, `apps/site-angular/src/app/services/quran_text_indopak_15.ts` and `quran_text_madina.ts`, commit `78372d7` (6 Aug 2026). https://github.com/DigitalKhatt/digitalkhatt-js | **MIT** (© 2020–present DigitalKhatt contributors; project sponsored by Tarteel). Copy kept in `public/quran/LICENSE-DigitalKhatt-text.txt`. | Yes (MIT notice) |
| `fonts/DigitalKhattIndoPak.ttf` | Same repo, `assets/fonts/coretext/`; font project https://github.com/DigitalKhatt/indopakfont | **SIL OFL 1.1** (© 2024 Amine Anane, Tarteel Inc.). Licence in `fonts/DigitalKhattIndoPak-OFL.txt`. | Keep the OFL file |
| `fonts/DigitalKhattNewMadina.ttf` | Same repo (`DigitalKhattV2.ttf`, renamed); font project https://github.com/DigitalKhatt/madinafont | **SIL OFL 1.1** (© 2020–2024 Amine Anane, Tarteel Inc.). `fonts/DigitalKhattNewMadina-OFL.txt`. | Keep the OFL file |
| `fonts/AmiriQuran-Regular.ttf` | google/fonts `ofl/amiriquran`, commit `fffdadf` | **SIL OFL 1.1** (© The Amiri Project Authors). `fonts/AmiriQuran-OFL.txt`. | Keep the OFL file |
| `surahs.json` (Arabic names, English meanings, ayah counts, Makki/Madani, juz/manzil/hizb/sajdah tables), juz/manzil/sajdah/hizb marks, Madani ruku marks | Tanzil `quran-data.js` v1.0 https://tanzil.net/res/text/metadata/quran-data.js | **CC BY 3.0** | "Tanzil Project, tanzil.net" |
| `surahs.json` `tr` (light transliteration) | Written for Zad | — | Draft, pending scholar review (`draft: true`) |
| `translations/pickthall/*.json` | Pickthall, *The Meaning of the Glorious Koran* (1930): English Wikisource transcription for surahs 1–5 and 39–114; Tanzil `en.pickthall` (an edited text) for 6–38 — see below | 1930 text: public domain (US: published 1930; Pickthall d. 1936). Tanzil asks that its translations be used non-commercially (Zad is free) | Credit Wikisource and Tanzil |
| Checks only (not shipped) | QUL (qul.tarteel.ai) public page previews of layouts 10, 12 and 15 | — | "Tarteel / QUL" in credits |

`public/quran/credits.json` has the list for **About → Sources & credits**.

### Why these and not others
- **Quran Foundation / quran.com API**: its Developer Terms (2026-10-11) forbid building an offline copy from API responses and distributing "a prepackaged database or build-time bundle of QF Content" without a commercial licence. Not used.
- **QUL downloads** (layouts, word scripts): free, but behind a QUL account, and each layout page says "We don't have copyright information for this resource". Not downloaded; used only to spot-check page breaks via the public page previews.
- **KFGQPC fonts** (Uthmanic Hafs, QPC V1/V2, KFGQPC Nastaleeq): need written approval. Not used.
- **QuranWBW IndoPak Nastaleeq** (the font in the mockups): "Sadaqa-e-Jaria purposes only" licence, and it **cannot render the DigitalKhatt text encoding** (it uses U+089C, U+08D5–U+08DF, U+034F, which the font lacks: missing glyphs and no ayah numbers; see `design-review/quran-work/indopak15-p3-wbw.png`). DigitalKhatt IndoPak is made for this text and is OFL, so the licence question goes away.
- **Tanzil Quran text**: not needed, because the line-by-line text already comes from DigitalKhatt (MIT). Tanzil is used for metadata only, so the "verbatim only" rule is not in play.

## How well the layouts match print
- **15-line IndoPak** = the South Asian 15-line hafizi layout, 610 pages. Page starts match QUL's "Indopak 15 lines – Qudratullah" (layout 12) on all 11 pages checked (50, 100, 122, 150, 200, 250, 262, 350, 400, 450, 550, 600). Every para starts at the top of a page (the build checks all 30). QUL has no **Taj Company 15-line** layout and no other open source has one, so "Taj-style 15-line" here means this standard 610-page hafizi layout; the Taj 15-line print may differ on some pages. Pages 1–2 have 8 lines; page 610 has 10.
- **IndoPak paras** differ from the Arab juz in 7 places, and the data follows the IndoPak print: para 4 = 3:92, 7 = 5:83, 11 = 9:94, 14 = 15:2, 20 = 27:60, 21 = 29:45, 23 = 36:22 (`scripts/quran/names.mjs`).
- **IndoPak Fātihah numbering**: the print leaves the bismillah unnumbered and prints ayah numbers 1–7 from al-ḥamdu (with a disputed-end mark after "anʿamta ʿalayhim" as 6). The data keeps the printed numbers in the text, but the word keys use Hafs/Kufi numbering (bismillah = 1:1 … "ṣirāṭa … ḍāllīn" = 1:7) so translation and tracking line up.
- **Rukus (IndoPak)** come from the 558 printed ruku signs (ࣖ) in the text. Each mark has `sr` (ruku of the surah), `n` (ayahs in it) and `pr` (ruku of the para): the three numbers of the margin ع. Example: 2:7 → ع 1 / 7 / 2.
- **15-line Uthmani** = King Fahd Complex 1421H (V2) print, 604 pages; page starts match QUL layout 10 on all 7 pages checked. Note: Tanzil's page list is the older 1405H (V1) print and differs on 11 pages, so Zad derives Madani pages from the layout, not from Tanzil.
- **Line breaks** are exact (they come from the layout data). **Justification** in a browser is by word spacing only (no kashida), so a few lines with few words show wide gaps (see p.262 line 1). Fonts stretch better in DigitalKhatt's own engine, which needs a custom HarfBuzz build; not worth it now.

## Glyph coverage and "boxes" (tofu)
Checked 8 Nov 2026 against each font's cmap (`scripts/quran/cmap.mjs`; `build.mjs` now fails if any codepoint of a mushaf's text has no glyph in its font).
- **DigitalKhatt IndoPak covers every codepoint of the indopak15 text** (84 distinct, incl. U+034F CGJ, U+0614–0617, U+0653–0657, U+0670, U+06D6–U+06ED, **U+089C madda waajib**, U+08D5–U+08DF, U+08E2). It is the exact build the text is made for (`assets/fonts/coretext/DigitalKhattIndoPak.ttf` at the pinned commit; the repo's `hb/indopak.otf` is for DigitalKhatt's custom HarfBuzz/justification engine and is not needed). DigitalKhatt New Madina likewise covers all of madani15. No codepoint is normalised or dropped.
- The only codepoint without a glyph is one **U+202E (RLO)** in the source, before the disputed ayah-end number in 1:7 (`عَلَيْهِمْ‮٦࣢ۙ`). It is a bidi control that browsers never draw, so it is exempt; it is kept verbatim.
- **Root cause of the boxes in «الٓمّٓ» (2:1)**: they appear whenever the text is painted in the *fallback* font, not in DigitalKhatt. The reader added the font with `new FontFace(…).load()` and only registered it after loading, so until the 650 KB font had loaded (or forever, if it failed) the page used `'Amiri Quran', Amiri, serif`. Amiri and Amiri Quran lack U+089C, U+08D5–U+08DF, U+08E2 (and U+0614), so «الٓمّٓ» showed two boxes and other marks were misplaced. See `design-review/quran-work/before/app-indopak15-p2-font-loading.png`.
- **Fix**: `src/css/tools.css` declares both mushaf fonts with `@font-face … font-display: block` (url `/quran/fonts/…`, which Vite rewrites to `../quran/fonts/…` in the build), so the browser knows the family from the first paint and hides the text while the font loads instead of drawing it in Amiri. `quranFont()` in `src/views/tools/qtext.js` now awaits `document.fonts.load()` so the reader re-measures after the real font arrives. A browser's block period is about 3 s; if the font has not loaded by then (or fails to load, e.g. an uncached offline PWA), the fallback, and its boxes, can still show. No OFL fallback font has these IndoPak marks, so the reader should show a "loading" state rather than the text until `quranFont()` resolves (request to the reader owner).
- Do not judge rendering with Playwright **WebKit on Windows**: it does not apply this font's mark positioning at all (dots and ḥarakāt vanish). Use Chromium, or a real iPhone/Mac Safari.

## 13-line IndoPak: not available
There is no openly licensed 13-line line data. The only source is QUL: "Indopak 13 lines layout (Taj company)", layout **313**, 847 pages (and Qudratullah, layout 236, 849 pages). Downloading needs a (free) QUL account, and QUL lists no copyright information for it, though its FAQ says QUL data may be used in projects with credit. I did not sign up or scrape the previews.

To add it later (about 10 minutes, by a person with a QUL account):
1. On qul.tarteel.ai, sign in, open Resources → Mushaf layouts → "Indopak 13 lines layout (Taj company)" → Download sqlite.
2. Download the matching IndoPak word-by-word script (Resources → Quran script; the layout page names the script it uses) as sqlite.
3. Run `node scripts/quran/build.mjs`, then `node scripts/quran/import-qul.mjs --layout <layout.sqlite> --words <words.sqlite>`. It writes `public/quran/indopak13/` and flips `available` to true in `mushafs.json`. It fails loudly (writes nothing) if any ayah is missing or out of order, a page has more than 13 lines, or a para doesn't start a page.
4. Check 3 pages with `design-review/quran-work/shoot.mjs indopak13:1 indopak13:3 indopak13:400`.

The importer was tested by round-tripping the 15-line data through QUL's documented schema (identical pages, marks and para starts). A real QUL file may still differ in details (column names, how ayah numbers are stored); bare ayah numbers are turned into "۝n" so the font draws the ring.

## Pickthall
6,236 ayahs, Hafs/Kufi numbering, split by juz into `translations/pickthall/01–30.json` (keys `"s:a"`). `index.json` records the sources, the Wikisource revision of each surah page, and `editedSurahs`.

**Problem found: the common digital Pickthall is not the 1930 text.** Tanzil's `en.pickthall` (also what most apps and GitHub repos copy) is an edited version. Compared with the 1930 print on 2,959 ayahs, about 150 differ beyond spelling: "God" → "Allah"/"deity" (2:255 "There is no God save Him" → "no deity"; 2:66 "God-fearing" → "Allah-fearing"), "bondmen" → "slaves", "Mecca" → "Makka", "owners of the Fire" → "Peoples of the Fire", and 2:106 reworded ("Such of Our revelations as We abrogate…" → "Nothing of our revelation (even a single verse) do we abrogate…"). Who edited it, and whether the edits carry their own copyright, is unknown, and it is not the public-domain text the user picked.

So the build now uses:
- **Surahs 1–5 and 39–114: the 1930 text** from English Wikisource's transcription of the Knopf 1930 print ("public domain in the United States because it was published before January 1, 1931"; Pickthall died 1936). Footnote markers are dropped. The 1930 numbering differs from Kufi in three places and is mapped: Fātihah (bismillah unnumbered; printed 6 + 7 = 1:7), 4:172–173 (printed "173a/173b"), Quraysh (printed 4 + 5 = 106:4).
- **Surahs 6–38: Tanzil's edited text, flagged** (`editedSurahs` in `index.json`), because Wikisource has not transcribed those pages yet (scan pages 163–490 of the PDF are missing). The build picks up new Wikisource transcriptions automatically on `--refetch`.

To finish the job: transcribe surahs 6–38 from the 1930 scan (archive.org / Wikimedia Commons "The Meaning of the Glorious Koran (1930).pdf"), ideally on Wikisource itself so everyone benefits, or ask the scholar whether the edited wording is acceptable for those surahs in the meantime. The UI should treat the translation as draft (`draft: true`).

## Build
```
node scripts/quran/build.mjs [--cache <dir>] [--refetch]   # downloads pinned sources, writes public/quran, runs checks
node scripts/quran/check.mjs                               # reads every page through src/tools/quran-data.js
node design-review/quran-work/fontcheck/cmap.mjs <font> public/quran/<mushaf> [all]  # codepoints the font lacks (needs fontkit there)
node design-review/quran-work/shoot.mjs [mushaf:page[:tr|amiri|wbw] …]   # PNGs into design-review/quran-work/
```
Sources are cached in `%TEMP%/zad-quran-sources` (or `ZAD_QURAN_CACHE`). Every download is parsed as data (no `eval`). `build.mjs` keeps an imported `indopak13/`.
The Wikisource pages are fetched slowly (2.5 s apart, with back-off) because the API rate-limits; a cold build takes about 5 minutes, a cached one a few seconds.
Build checks: every text codepoint has a glyph in the mushaf's font; 114 surah headers; every ayah 1…n of every surah present (6,236) with printed ayah numbers in sequence; IndoPak paras at page tops; Pickthall has 6,236 ayahs and each Wikisource surah has exactly the Kufi verse count after mapping (else that surah falls back to Tanzil and is listed in `editedSurahs`).

## Data format
`public/quran/`
- `mushafs.json` — `{ mushafs: [{ id, title, lines, pages, nav, script, default, available, reason? }] }`
- `surahs.json` — `{ surahs: [{ n, ar, tr, en, tanzil, ayahs, type: "makki"|"madani", order, rukus }], juz: [[s,a]×30] (Arab/Tanzil), manzil, hizbQuarter, sajda: [[s,a,kind]] }`
- `<mushaf>/index.json` — `{ pages, lines, nav, font, fallbackFont?, juzStartPage[30], surahStartPage[114], pageStart: [[s,a]] (first ayah per page), chunks: [[from,to]×30], rukus, rukuPerSurah[114], sources }`
- `<mushaf>/p/NN.json` — `{ juz, from, to, pages: [page…] }`; page = `{ n, l: [line…], m?: [mark…] }`
  - line `{ t: "h", s, x }` surah header · `{ t: "b", s, x, k? }` bismillah · `{ t: "a", x, k: [[s, a, wordCount]…], c? }` ayah line. `x` is the verbatim source line; split on spaces it gives the words, and `k` says which ayah each run of words belongs to. Ayah-end markers ("۝٥ۙ") are their own word. `c: 1` = centre (pages 1–2).
  - mark `{ t: "juz", l, j }`, `{ t: "ruku", l, s, a, sr, n, pr }`, `{ t: "sajda", l, s, a, kind }`, `{ t: "hizb", l, q }` (Madani), `{ t: "manzil", l, z }`; `l` = line index on the page.
- `translations/pickthall/index.json` + `01–30.json` — `{ "s:a": "text" }` per Tanzil juz.
- `fonts/` — the three fonts and their OFL files.

## Loader API (`src/tools/quran-data.js`)
All async except `configureQuranData`. Files are fetched from `quran/` relative to the app and cached in memory.

| Function | Returns |
|---|---|
| `DEFAULT_MUSHAF` | `"indopak15"` |
| `configureQuranData({ baseUrl, fetch })` | override base URL / fetch (tests, native) |
| `listMushafs()` | the `mushafs.json` list (includes unavailable `indopak13` with `reason`) |
| `getMushaf(id)` | the mushaf index |
| `getSurahs()`, `getSurah(n)` | surah list / one surah |
| `pageCount(id)` | number of pages |
| `getPage(id, n)` | `{ mushaf, n, juz, lines: [{ type: "header"\|"bismillah"\|"ayah", surah?, text, centered, words: [{ text, s, a, end?, label?, attached? }] }], marks, surahs, ayahs: [[s,a]] }` |
| `pageForJuz(id, j)` / `pageForPara` | first page of juz/para j |
| `pageForSurah(id, s)` | page with the surah header |
| `pageForAyah(id, s, a)` | page where s:a starts |
| `juzForPage(id, n)` / `paraForPage` | juz/para of a page |
| `manzilForPage(id, n)` | manzil 1–7 |
| `getTranslation('pickthall', s, a)` | one ayah's text |
| `getPageTranslation('pickthall', id, n)` | `[{ s, a, text }]` for the ayahs on a page |
| `getTranslationInfo('pickthall')` | title, author, licence, source |
| `loadMushafFont(id)` | loads the font via FontFace; resolves to the CSS family |
| `getQuranCredits()` | credits list |

Rendering tips (as in `design-review/quran-work/render.html`): one `div` per line with `white-space: nowrap`; size the font so the page's widest line fills the measure; then `text-align: justify; text-align-last: justify` for ayah lines, centre headers, bismillah lines and `centered` lines. In IndoPak, draw the ruku ع with `sr / n / pr` in the margin at the mark's line.

## Requests for other owners
- **vite.config.js**: the PWA precache does not include `quran/**` (`.json`, `.ttf`), which is right for size, but the web PWA then can't read offline. Add a Workbox `runtimeCaching` rule (CacheFirst for `/quran/`), or a "Download for offline" step that warms that cache. The Android/iOS apps bundle `public/` so they are offline already.
- **tests/**: a `tests/quran-data.test.js` could run the same checks as `scripts/quran/check.mjs` (that script uses only the loader and the files).
- **About → Sources & credits**: show `credits.json` (DigitalKhatt MIT, the OFL fonts, Tanzil CC BY 3.0, Pickthall source, Tarteel/QUL).
- **Mushaf picker (MP2)**: sizes are now small (about 1.8 MB data per mushaf + 0.65–0.9 MB font), so the "≈120 MB / Wi-Fi" copy in the mockup no longer applies; the 13-line row should show "Not available yet".
