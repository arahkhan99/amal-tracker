// The Manzil: a list of Qurʾān passages recited morning and evening for protection.
// REFERENCES ONLY. The Arabic and the Pickthall translation are read from the Quran data
// (src/tools/quran-data.js) at render time; nothing here is typed by hand.
// Source: the user's Manzil.pdf ("MANZIL – The Thirty Three Verses", 9 pages). See docs/manzil.md.
// Note: the PDF has al-Baqarah 163 only; 164 was added on the user's instruction (13 Nov 2026), as in other printings.

export const MANZIL_META = {
  title: "Manzil",
  titleAr: "مَنْزِل",
  when: "Morning and evening",
  source: "Manzil.pdf (\"MANZIL – The Thirty Three Verses\", 9 pages)",
  doc: "docs/manzil.md",
  status: "approved",
};

/** Passages in the PDF's order. from/to are Hafs (Kufi) ayah numbers, inclusive. */
export const MANZIL = [
  { n: 1, surah: 1, from: 1, to: 7, name: "Al-Fātihah" },
  { n: 2, surah: 2, from: 1, to: 5, name: "Al-Baqarah" },
  { n: 3, surah: 2, from: 163, to: 164, name: "Al-Baqarah" },
  { n: 4, surah: 2, from: 255, to: 257, name: "Al-Baqarah" },
  { n: 5, surah: 2, from: 284, to: 286, name: "Al-Baqarah" },
  { n: 6, surah: 3, from: 18, to: 18, name: "Āl ʿImrān" },
  { n: 7, surah: 3, from: 26, to: 27, name: "Āl ʿImrān" },
  { n: 8, surah: 7, from: 54, to: 56, name: "Al-Aʿrāf" },
  { n: 9, surah: 17, from: 110, to: 111, name: "Al-Isrāʾ" },
  { n: 10, surah: 23, from: 115, to: 118, name: "Al-Muʾminūn" },
  { n: 11, surah: 37, from: 1, to: 11, name: "As-Sāffāt" },
  { n: 12, surah: 55, from: 33, to: 40, name: "Ar-Rahmān" },
  { n: 13, surah: 59, from: 21, to: 24, name: "Al-Hashr" },
  { n: 14, surah: 72, from: 1, to: 4, name: "Al-Jinn" },
  { n: 15, surah: 109, from: 1, to: 6, name: "Al-Kāfirūn" },
  { n: 16, surah: 112, from: 1, to: 4, name: "Al-Ikhlās" },
  { n: 17, surah: 113, from: 1, to: 5, name: "Al-Falaq" },
  { n: 18, surah: 114, from: 1, to: 6, name: "An-Nās" },
].map(p => ({ ...p, status: "approved" }));

/** Number of ayahs in the whole Manzil (80). */
export const manzilAyahCount = () => MANZIL.reduce((a, p) => a + p.to - p.from + 1, 0);

/** "Al-Baqarah 2:1–5" */
export const manzilRef = p => `${p.name} ${p.surah}:${p.from}${p.to !== p.from ? "–" + p.to : ""}`;
