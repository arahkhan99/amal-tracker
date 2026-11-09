/**
 * Weekly and monthly content for the "This week" card on Home.
 * Weeks start on SATURDAY (the same week as the Hizb al-Aʿzam, Saturday = manzil 1); items rotate by
 * Saturday-week and by calendar month. The data lists are placeholders until the content agent fills
 * them (each item should carry `draft: true` until a scholar approves it; no gradings).
 *
 * thisWeek(date) → {
 *   ayah:   { ar, en, src },               // weekly
 *   hadith: { ar?, en, src },              // weekly
 *   dua:    { ar, translit?, en, src },    // weekly
 *   seerah: { title, text, src? },         // weekly
 *   sahabi: { name, title, text, src? },   // monthly
 *   sunnah: { title, text, src },          // monthly
 *   weekKey,                               // "2026-11-07" (the Saturday)
 *   weekStart, weekEnd,                    // Date (Saturday), Date (Friday)
 *   weekIndex,                             // 0..6 position of `date` in its week (Sat 0 … Fri 6)
 *   weekLabel, monthLabel, rangeLabel      // "This week", "This month", "Sat 7 – Fri 13 Nov"
 * }
 */
import { weekStartDate, weekKey, weekIndex, weeksBetween, weekRangeLabel } from "./times.js";
import { addDays } from "./util.js";
import { WEEK_UI, HOME } from "./strings.js";

// Rotation is counted from this Saturday, so every phone shows the same item in the same week.
const EPOCH = new Date(2026, 0, 3); // Sat 3 Jan 2026

const AYAH = [{ ar: "فَاذْكُرُونِي أَذْكُرْكُمْ", en: "So remember Me, and I will remember you.", src: "Qurʾān 2:152", draft: true }];
const HADITH = [{ en: "The most beloved deeds to Allah are those done consistently, even if small.", src: "Sahih al-Bukhari 6464", draft: true }];
const DUA = [{ ar: "رَبِّ زِدْنِي عِلْمًا", en: "My Lord, increase me in knowledge.", src: "Qurʾān 20:114", draft: true }];
const SEERAH = [{ title: "The Cave of Hira", text: "The first revelation came in the Cave of Hira: \"Read in the name of your Lord who created.\" (96:1)", draft: true }];
const SAHABI = [{ name: "Abu Bakr as-Siddiq", title: "The first caliph", text: "He accepted Islam without hesitation and spent his wealth freeing the oppressed.", draft: true }];
const SUNNAH = [{ title: "Smiling", text: "Smiling at your brother is charity.", src: "Sunan al-Tirmidhi 1956", draft: true }];

const pick = (list, n) => list[((n % list.length) + list.length) % list.length];

/** Number of Saturday-weeks since the rotation epoch (can be negative before it). */
export function weekNumber(date = new Date()) { return weeksBetween(EPOCH, date); }

export function thisWeek(date = new Date()) {
  const w = weekNumber(date), m = date.getFullYear() * 12 + date.getMonth();
  const start = weekStartDate(date);
  return {
    ayah: pick(AYAH, w), hadith: pick(HADITH, w), dua: pick(DUA, w), seerah: pick(SEERAH, w),
    sahabi: pick(SAHABI, m), sunnah: pick(SUNNAH, m),
    weekKey: weekKey(date), weekStart: start, weekEnd: addDays(start, 6), weekIndex: weekIndex(date),
    weekLabel: HOME.thisWeek, monthLabel: WEEK_UI.thisMonth, rangeLabel: weekRangeLabel(date),
  };
}
