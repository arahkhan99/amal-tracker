/**
 * Weekly and monthly content for the "This week" card on Home.
 * Placeholder API — the content agent fills in the data. Items rotate by ISO week / month.
 *
 * thisWeek(date) → {
 *   ayah:   { ar, en, src },          // weekly
 *   hadith: { ar?, en, src },         // weekly
 *   dua:    { ar, translit?, en, src },// weekly
 *   seerah: { title, text, src? },    // weekly
 *   sahabi: { name, title, text, src? }, // monthly
 *   sunnah: { title, text, src },     // monthly
 *   weekLabel, monthLabel            // e.g. "Week of 2 Nov", "November"
 * }
 */
export function thisWeek(date = new Date()) {
  return {
    ayah: { ar: "فَاذْكُرُونِي أَذْكُرْكُمْ", en: "So remember Me, and I will remember you.", src: "Quran 2:152" },
    hadith: { en: "The most beloved deeds to Allah are those done consistently, even if small.", src: "Sahih al-Bukhari 6464" },
    dua: { ar: "رَبِّ زِدْنِي عِلْمًا", en: "My Lord, increase me in knowledge.", src: "Quran 20:114" },
    seerah: { title: "The Cave of Hira", text: "The first revelation came in the Cave of Hira: \"Read in the name of your Lord who created.\" (96:1)" },
    sahabi: { name: "Abu Bakr as-Siddiq", title: "The first caliph", text: "He accepted Islam without hesitation and spent his wealth freeing the oppressed." },
    sunnah: { title: "Smiling", text: "Smiling at your brother is charity.", src: "Sunan al-Tirmidhi 1956" },
    weekLabel: "This week", monthLabel: "This month",
  };
}
