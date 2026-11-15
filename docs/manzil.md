# Manzil

**Source:** the user's `Manzil.pdf` (Downloads, 9 pages), titled "MANZIL – The Thirty Three Verses · To be recited in the Morning and Evening · Recommended by Prophet Muhammed (pbuh) for protection against calamities". Its Arabic and English are credited to "QURAN IN WORD ver 1.3" and its transliteration to transliteration.org. Page renders: `design-review/manzil-work/img/p01–p09.png` (pdf.js in Chromium via Playwright; nothing from the download was executed).

**Status:** draft, pending scholar review. Data: `src/tools/data/manzil.js` holds **references only**. The app renders the verses from `src/tools/quran-data.js` (15-line IndoPak text by default; Pickthall as an optional translation). None of the PDF's Arabic, transliteration or English is used.

## The passages, in the PDF's order

| # | Surah | Āyāt | PDF page | Count |
|---|---|---|---|---|
| 1 | 1 Al-Fātihah | 1–7 | 1 | 7 |
| 2 | 2 Al-Baqarah | 1–5 | 1 | 5 |
| 3 | 2 Al-Baqarah | **163** | 2 | 1 |
| 4 | 2 Al-Baqarah | 255–257 | 2–3 | 3 |
| 5 | 2 Al-Baqarah | 284–286 | 3 | 3 |
| 6 | 3 Āl ʿImrān | 18 | 4 | 1 |
| 7 | 3 Āl ʿImrān | 26–27 | 4 | 2 |
| 8 | 7 Al-Aʿrāf | 54–56 | 4–5 | 3 |
| 9 | 17 Al-Isrāʾ | 110–111 | 5 | 2 |
| 10 | 23 Al-Muʾminūn | 115–118 | 5–6 | 4 |
| 11 | 37 As-Sāffāt | 1–11 | 6 | 11 |
| 12 | 55 Ar-Rahmān | 33–40 | 6–7 | 8 |
| 13 | 59 Al-Hashr | 21–24 | 7–8 | 4 |
| 14 | 72 Al-Jinn | 1–4 | 8 | 4 |
| 15 | 109 Al-Kāfirūn | 1–6 | 8 | 6 |
| 16 | 112 Al-Ikhlās | 1–4 | 8–9 | 4 |
| 17 | 113 Al-Falaq | 1–5 | 9 | 5 |
| 18 | 114 An-Nās | 1–6 | 9 | 6 |

18 passages, 79 āyāt.

## Notes

- **Al-Baqarah 163 only.** The commonly printed Manzil has 2:163–164. This PDF's heading reads "verses 163", and the Arabic, transliteration and English (numbered "163.") stop at the end of 163 («… الرَّحْمٰنُ الرَّحِيْمُ»). Following the PDF, Zad shows 163 alone. Ask the scholar whether 164 should be added.
- Every other passage matches the usual list exactly.
- The PDF's title says "Thirty Three Verses", but it holds 79 āyāt. The "33 āyāt" is a different, related collection; the title seems to be a mislabel. Zad calls the tool "Manzil".
- Fātihah: the PDF prints the basmalah as āyah 1 (Hafs numbering), as the Quran data does (1:1–7).
- The PDF does not print a basmalah before the whole surahs (al-Kāfirūn, the Quls), so the app doesn't either.
- Reading is ticked once in the morning (Fajr to ʿAsr) and once in the evening (from ʿAsr), stored in `S.tools.manzil[day]`. It does not tick a Good Deed.
