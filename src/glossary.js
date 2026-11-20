/*
 * Plain-English meanings for every Arabic term the app shows, opened from a small "?" / ⓘ next to the term.
 * Each entry: { term (light transliteration, as shown in the UI), ar (Arabic script), meaning (1–2 lines),
 * draft: true }. Approved by the scholar review, 13 Nov 2026: show APP.draftFlag in the pop-up while
 * `draft` is true. No gradings.
 */
export const GLOSSARY = {
  salah: { term: "Salāh", ar: "صلاة", meaning: "The ritual prayer. Five are obligatory each day: Fajr, Zuhr, ʿAsr, Maghrib and ʿIshāʾ.", draft: false },
  fard: { term: "Fard", ar: "فرض", meaning: "Obligatory. The five daily prayers are fard; leaving one without excuse is a sin, and a missed one is owed.", draft: false },
  wajib: { term: "Wājib", ar: "واجب", meaning: "Necessary. In the Hanafī school it is just below fard: binding in practice, and owed if missed. Witr is wājib for Hanafīs.", draft: false },
  sunnah: { term: "Sunnah", ar: "سنة", meaning: "The way of the Prophet ﷺ. Sunnah prayers are extra prayers he offered around the fard; they bring reward and are counted apart from the fard.", draft: false },
  sunnahMuakkadah: { term: "Sunnah muʾakkadah", ar: "سنة مؤكدة", meaning: "An emphasised sunnah: one the Prophet ﷺ kept to regularly, such as the 2 before Fajr. Leaving it habitually is blameworthy.", draft: false },
  ghayrMuakkadah: { term: "Ghayr muʾakkadah", ar: "سنة غير مؤكدة", meaning: "A non-emphasised sunnah: the Prophet ﷺ prayed it at times and left it at times. Praying it is rewarded; leaving it carries no blame.", draft: false },
  nafl: { term: "Nafl", ar: "نفل", meaning: "A voluntary prayer beyond the fard prayers, Witr and the sunnah. Purely extra reward, such as Duhā or Tahajjud.", draft: false },
  witr: { term: "Witr", ar: "وتر", meaning: "The odd-numbered prayer (usually 3 rakʿahs) prayed after ʿIshāʾ and before Fajr. In the Hanafī school a missed Witr is made up; for the other schools it is a sunnah.", draft: false },
  jamaah: { term: "Jamāʿah", ar: "جماعة", meaning: "Praying in congregation behind an imam, at the masjid or at home. It brings many times the reward of praying alone.", draft: false },
  jumuah: { term: "Jumuʿah", ar: "جمعة", meaning: "The Friday congregational prayer with a sermon, which takes the place of Zuhr on Friday.", draft: false },
  awwabin: { term: "Awwābīn", ar: "أوابين", meaning: "\"The prayer of those who often turn back to Allah\": voluntary rakʿahs after Maghrib (6 in all with its sunnah, in the Hanafī practice).", draft: false },
  ishraq: { term: "Ishrāq", ar: "إشراق", meaning: "A voluntary prayer of 2 or more rakʿahs shortly after sunrise, once the sun has fully risen.", draft: false },
  duha: { term: "Duhā", ar: "ضحى", meaning: "The forenoon prayer: voluntary rakʿahs between the sun rising well up and just before midday.", draft: false },
  tahajjud: { term: "Tahajjud", ar: "تهجد", meaning: "The night prayer: voluntary rakʿahs after waking from sleep, before Fajr. Among the most loved voluntary prayers.", draft: false },
  qada: { term: "Qadāʾ", ar: "قضاء", meaning: "Praying back a prayer after its time has passed. Zad calls these \"Make-ups\": each missed fard (and, for Hanafīs, Witr) is owed until it is prayed.", draft: false },
  madhhab: { term: "Madhhab", ar: "مذهب", meaning: "A school of Islamic law (Hanafī, Shāfiʿī, Mālikī, Hanbalī). It decides details such as ʿAsr time, which sunnahs are emphasised, and how Witr is counted.", draft: false },
  hayd: { term: "Hayd / nifās", ar: "حيض / نفاس", meaning: "Menstruation (hayd) and bleeding after childbirth (nifās). Prayer is lifted during them and is not made up, so these days are excused, not missed.", draft: false },
  adhkar: { term: "Adhkār", ar: "أذكار", meaning: "Words of remembrance of Allah from the Qurʾān and Sunnah, such as the set read each morning and evening.", draft: false },
  durud: { term: "Durūd", ar: "درود", meaning: "Sending blessings and peace on the Prophet ﷺ (salawāt). Encouraged daily, and especially on Friday.", draft: false },
  salawat: { term: "Salawāt", ar: "صلوات", meaning: "Blessings on the Prophet ﷺ, the same act as durūd. Count as many as you like.", draft: false },
  hizb: { term: "Hizb al-Aʿzam", ar: "الحزب الأعظم", meaning: "A collection of duʿāʾs from the Qurʾān and hadith by Mulla ʿAli al-Qari, divided into 7 daily portions (manzils), starting on Saturday.", draft: false },
  manzil: { term: "Manzil", ar: "منزل", meaning: "A daily portion of a longer reading. The Hizb al-Aʿzam has 7, one for each day of the week.", draft: false },
  para: { term: "Juzʾ / para", ar: "جزء / پاره", meaning: "One of the 30 equal parts of the Qurʾān. Zad calls it a juzʾ; with IndoPak mushafs it is often called a para.", draft: false },
  mushaf: { term: "Mushaf", ar: "مصحف", meaning: "A printed copy of the Qurʾān. Its script and page layout differ by style, such as 15-line IndoPak or Uthmani.", draft: false },
  raghibah: { term: "Raghībah", ar: "رغيبة", meaning: "In the Mālikī school, the 2 rakʿahs before Fajr: a rank above an ordinary voluntary prayer and just below a formal sunnah.", draft: false },
  nafilahMuakkadah: { term: "Nāfilah muʾakkadah", ar: "نافلة مؤكدة", meaning: "In the Mālikī school, an emphasised voluntary prayer, such as the rakʿahs before and after Zuhr.", draft: false },
  akhirah: { term: "Ākhirah", ar: "آخرة", meaning: "The Hereafter: the life after death, for which Zad (\"provision\") helps you prepare.", draft: false },
  rakah: { term: "Rakʿah", ar: "ركعة", meaning: "One unit of prayer: standing, bowing and two prostrations. A prayer is counted in rakʿahs, such as 2 before Fajr.", draft: false },
  zad: { term: "Zād", ar: "زاد", meaning: "Provision for a journey. The Qurʾān says the best provision is taqwā (2:197).", draft: false },
  dua: { term: "Duʿāʾ", ar: "دعاء", meaning: "Calling on Allah: asking Him for anything, in any language, at any time.", draft: false },
  istighfar: { term: "Istighfār", ar: "استغفار", meaning: "Seeking Allah's forgiveness, for example by saying \"Astaghfirullah\".", draft: false },
  sadaqah: { term: "Sadaqah", ar: "صدقة", meaning: "Voluntary charity of any kind or amount, even a smile or a kind word.", draft: false },
};

/** All glossary ids. */
export const GLOSSARY_IDS = Object.keys(GLOSSARY);

/** Entry by id, or null. */
export function gloss(id) { return GLOSSARY[id] || null; }

/** Find an entry by the term as shown (case-insensitive, ignores ʿ ʾ and macrons), e.g. "Witr", "Jamāʿah", "qada". */
export function glossaryFor(term) {
  if (!term) return null;
  if (GLOSSARY[term]) return GLOSSARY[term];
  const k = plain(term);
  for (const [id, g] of Object.entries(GLOSSARY)) {
    if (plain(g.term) === k || plain(id) === k || g.term.split(" / ").some(t => plain(t) === k)) return g;
  }
  return null;
}

function plain(s) {
  return String(s).normalize("NFD").replace(/[̀-ͯʾʿ'’]/g, "").toLowerCase().trim();
}
