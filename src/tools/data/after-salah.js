// Adhkār after the fard salah, from the user's poster "اذکار بعد الصلاة / Supplications after Prayers"
// (screenshot of 10 Nov 2026), plus the full Āyat al-Kursī (approved by the user).
// The Arabic must stay character-for-character identical to docs/after-salah.md (tests/new-tools.test.js).
// Transliteration and translation are our own drafts (the poster's English is not copied).
// Qurʾānic items carry a reference only: the text and Pickthall come from src/tools/quran-data.js.

const TAHLIL = "لَآ إِلٰهَ إِلَّا اللّٰهُ وَحْدَهٗ لَا شَرِيْكَ لَهٗ لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلٰى كُلِّ شَيْءٍ قَدِيْرٌ";
const TAHLIL_TR = "La ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamd, wa huwa ʿala kulli shayʾin qadir.";
const TAHLIL_EN = "There is no god but Allah, alone, with no partner. His is the dominion and His is the praise, and He has power over all things.";

export const AFTER_SALAH_META = {
  title: "Adhkār after Salāh",
  titleAr: "أذكار بعد الصلاة",
  source: "The user's poster \"Supplications after Prayers\" (screenshot, 10 Nov 2026), plus Āyat al-Kursī",
  doc: "docs/after-salah.md",
  qulsRule: "The three Quls: 3 times after Fajr and Maghrib, once after Zuhr, ʿAsr and ʿIshāʾ.",
  status: "approved",
};

/**
 * Items in reading order. `count` is the repetitions of a one-part item; multi-part items give a count per part.
 * `poster` is the item's number on the poster (null = not on the poster).
 * `ref` is what the app shows: the collection, and the number only where the poster's print is legible.
 * `refPoster` is our best reading of the poster's (Urdu) reference, with "?" where it is hard to read.
 */
export const AFTER_SALAH = [
  {
    n: 1, poster: 1, id: "takbir", title: "Takbīr", count: 1,
    parts: [{ kind: "dhikr", ar: "اَللّٰهُ أَكْبَرُ", transliteration: "Allahu akbar.", translation: "Allah is the Greatest." }],
    note: "Said once, aloud, straight after the salām.",
    ref: "Bukhari", refPoster: "صحیح بخاری 842?", status: "approved",
  },
  {
    n: 2, poster: 2, id: "istighfar", title: "Istighfār", count: 3,
    parts: [{ kind: "dhikr", ar: "أَسْتَغْفِرُ اللّٰهَ", transliteration: "Astaghfirullah.", translation: "I ask Allah for forgiveness." }],
    ref: "Muslim", refPoster: "صحیح مسلم 591?", status: "approved",
  },
  {
    n: 3, poster: 3, id: "salam", title: "Antas-salām", count: 1,
    parts: [{
      kind: "dhikr",
      ar: "اَللّٰهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ",
      transliteration: "Allahumma antas-salamu wa minkas-salam, tabarakta ya dhal-jalali wal-ikram.",
      translation: "O Allah, You are Peace, and from You comes peace. Blessed are You, Owner of majesty and honour.",
    }],
    ref: "Muslim", refPoster: "صحیح مسلم (number not legible)", status: "approved",
  },
  {
    n: 4, poster: 4, id: "ainni", title: "Help me to remember You", count: 1,
    parts: [{
      kind: "dhikr",
      ar: "اَللّٰهُمَّ أَعِنِّيْ عَلٰى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ",
      transliteration: "Allahumma aʿinni ʿala dhikrika wa shukrika wa husni ʿibadatik.",
      translation: "O Allah, help me to remember You, to thank You, and to worship You well.",
    }],
    ref: "Abu Dawud 1522; Nasaʾi 1304", refPoster: "سنن ابی داؤد 1522، سنن نسائی 1304", status: "approved",
  },
  {
    n: 5, poster: 5, id: "mani", title: "None can withhold what You give", count: 1,
    parts: [{
      kind: "dhikr",
      ar: TAHLIL + " " + "اَللّٰهُمَّ لَا مَانِعَ لِمَا أَعْطَيْتَ وَلَا مُعْطِيَ لِمَا مَنَعْتَ وَلَا يَنْفَعُ ذَا الْجَدِّ مِنْكَ الْجَدُّ",
      transliteration: TAHLIL_TR + " Allahumma la maniʿa lima aʿtayta wa la muʿtiya lima manaʿta wa la yanfaʿu dhal-jaddi minkal-jadd.",
      translation: TAHLIL_EN + " O Allah, no one can hold back what You give, and no one can give what You hold back, and a man's wealth and standing are of no use to him against You.",
    }],
    ref: "Bukhari", refPoster: "صحیح بخاری 6330? (or 844)", status: "approved",
  },
  {
    n: 6, poster: 6, id: "tahlil", title: "The long tahlīl", count: 1,
    parts: [{
      kind: "dhikr",
      ar: TAHLIL + " " + "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللّٰهِ لَآ إِلٰهَ إِلَّا اللّٰهُ وَلَا نَعْبُدُ إِلَّآ إِيَّاهُ لَهُ النِّعْمَةُ وَلَهُ الْفَضْلُ وَلَهُ الثَّنَآءُ الْحَسَنُ لَآ إِلٰهَ إِلَّا اللّٰهُ مُخْلِصِيْنَ لَهُ الدِّيْنَ وَلَوْ كَرِهَ الْكَافِرُوْنَ",
      transliteration: TAHLIL_TR + " La hawla wa la quwwata illa billah. La ilaha illallahu wa la naʿbudu illa iyyah, lahun-niʿmatu wa lahul-fadlu wa lahuth-thanaʾul-hasan. La ilaha illallahu mukhlisina lahud-dina wa law karihal-kafirun.",
      translation: TAHLIL_EN + " There is no might and no power except through Allah. There is no god but Allah, and we worship none but Him. All blessings are His, all bounty is His, and the finest praise is His. There is no god but Allah; we keep our religion for Him alone, even if the disbelievers hate it.",
    }],
    ref: "Muslim 594", refPoster: "صحیح مسلم 594", status: "approved",
  },
  {
    n: 7, poster: 7, id: "tasbih", title: "Tasbīh: 33 · 33 · 33 · 1", count: null, tasbih: true,
    parts: [
      { kind: "dhikr", ar: "سُبْحَانَ اللّٰهِ", transliteration: "Subhanallah.", translation: "Glory be to Allah.", count: 33, name: "Subhānallāh" },
      { kind: "dhikr", ar: "اَلْحَمْدُ لِلّٰهِ", transliteration: "Alhamdulillah.", translation: "All praise is for Allah.", count: 33, name: "Alhamdulillāh" },
      { kind: "dhikr", ar: "اَللّٰهُ أَكْبَرُ", transliteration: "Allahu akbar.", translation: "Allah is the Greatest.", count: 33, name: "Allāhu akbar" },
      { kind: "dhikr", ar: TAHLIL, transliteration: TAHLIL_TR, translation: TAHLIL_EN, count: 1, name: "To make 100" },
    ],
    ref: "Muslim", refPoster: "صحیح مسلم 597?", status: "approved",
  },
  {
    n: 8, poster: null, id: "kursi", title: "Āyat al-Kursī", count: 1,
    parts: [{ kind: "quran", ar: null, transliteration: null, translation: null, quran: { surah: 2, from: 255, to: 255 }, labelAr: "آيَةُ الْكُرْسِيِّ" }],
    note: "Added at the user's request; it is not on the poster.",
    ref: null, refPoster: null, status: "approved",
  },
  {
    n: 9, poster: 8, id: "quls", title: "The three Quls", count: null, quls: true,
    parts: [
      { kind: "quran", ar: null, transliteration: null, translation: null, quran: { surah: 112, from: null, to: null }, name: "Al-Ikhlās" },
      { kind: "quran", ar: null, transliteration: null, translation: null, quran: { surah: 113, from: null, to: null }, name: "Al-Falaq" },
      { kind: "quran", ar: null, transliteration: null, translation: null, quran: { surah: 114, from: null, to: null }, name: "An-Nās" },
    ],
    ref: "Abu Dawud", refPoster: "سنن ابی داؤد 1523?", status: "approved",
  },
];

export const PRAYERS5 = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

/** The Quls: 3 times after Fajr and Maghrib, once after the other prayers. */
export const qulsCount = prayer => (prayer === "Fajr" || prayer === "Maghrib" ? 3 : 1);

/** Repetitions per part of an item, for the prayer just prayed. */
export function unitsFor(item, prayer) {
  if (item.quls) return item.parts.map(() => qulsCount(prayer));
  if (item.count != null) return [item.count];
  return item.parts.map(p => p.count || 1);
}

/** Total repetitions of the whole set after a prayer. */
export const totalCount = prayer => AFTER_SALAH.reduce((a, it) => a + unitsFor(it, prayer).reduce((x, y) => x + y, 0), 0);
