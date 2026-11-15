# Tools content data

Generated from `docs/adhkar-20.md` and `docs/durud-40.md`. The Arabic matches the md files character for character, and `tests/tools-data.test.js` checks it. If the md changes, update the JS to match. Never "fix" the Arabic in the JS alone. Every item has `status: 'approved'` (scholar review, 13 Nov 2026).

## adhkar.js

```js
import { ADHKAR, ADHKAR_META, VIRTUES_APPROVED, itemCount, partText } from './tools/data/adhkar.js';
```

- `VIRTUES_APPROVED` (false): show the "Virtue" link and pop-up only when this is true.
- `ADHKAR_META`: `{ titleAr, subtitleUr, publisher, publisherUr, publisherPlace, eveningRule, eveningOpensAfter: 'Asr', source, status }`. The morning set runs from Fajr, and the evening set opens after ʿAsr.
- `ADHKAR`: 20 items, in card order:

```js
{
  n: 1..20,
  title: 'Istighfar',            // English heading
  count: 3 | null,               // null only for #15 (its counts are per part)
  parts: [Part, ...],            // 1 part for most items; #11: 2, #12: 3, #15: 2, #17: 2
  labelAr?: '...',               // #12 only: the card's label naming the three surahs
  virtueUr: '...', virtueEn: '...',   // card's Urdu فضائل line + English rendering
  ref: 'ابوداود',                 // reference exactly as printed on the card (Urdu)
  status: 'draft-pending-review'
}

Part = {
  kind: 'dhikr' | 'quran',
  ar: string | null,             // null = reference only (Ayat al-Kursi, the three Quls): use the Quran data
  transliteration: string | null,
  translation: string | null,    // always null for kind 'quran': show Pickthall from the Quran data
  quran?: { surah, from, to } | [{ surah, from, to, partial? }, ...]  // from/to null = whole surah
  name?: 'Ghafir 40:1–3',        // a label for a multi-part item
  labelAr?: 'آيَةُ الْكُرْسِيْ',
  count?: 3,                     // #15 only (ta'awwudh 3, Hashr 1)
  note?: '...',                  // an English editorial note (#8, #18, #20)
  // #10 and #16 only (morning/evening variants):
  arEvening, transliterationEvening, translationEvening,
  variant: { morning: 'أَصْبَحَ', evening: 'أَمْسٰى' }
}
```

Helpers:
- `itemCount(item)` gives the total number of repetitions. For #15 it sums the parts, so the result is 4. Show the counts of the two parts separately: 3 and 1.
- `partText(part, 'morning' | 'evening')` returns `{ ar, transliteration, translation }` with the evening variant swapped in.

#17's Quranic part has Arabic from the card, but its `translation` is null (9:129 partial, then 7:196). #11's Ghafir part and #15's Hashr part keep the card's Arabic, which uses full-alif spellings. The md suggests using the mushaf text in the Quran reader.

## durud.js

```js
import { DURUD, DURUD_META } from './tools/data/durud.js';
```

- `DURUD_META`: `{ title: '40 Salaah and Salaam', titleUr, compiler, compilerNote, recommendation: 'Daily, at least on Friday.', tashahhudNote, tashahhudRange: [26, 39], repeatCounts, source, status }`
- `DURUD`: 40 items:

```js
{ n, ar, transliteration, translation,   // translation and transliteration are drafts, not the PDF's text
  pdfPage: 3,                            // first page, as a number
  pdfPages: '21 (Arabic); 26 (...)',     // the full page note from the md
  isTashahhud: n >= 26 && n <= 39,
  note: string | null,                   // transcription note from the md, if any
  status: 'draft-pending-review' }
```

No repeat counts are given for any durud.
