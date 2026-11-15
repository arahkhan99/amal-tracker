// Round 2 tools: Manzil (references only) and Adhkār after Salāh (poster + Āyat al-Kursī).
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { MANZIL, MANZIL_META, manzilAyahCount, manzilRef } from "../src/tools/data/manzil.js";
import { AFTER_SALAH, AFTER_SALAH_META, PRAYERS5, qulsCount, unitsFor, totalCount } from "../src/tools/data/after-salah.js";
import { TOOLS } from "../src/features.js";

const norm = s => s.replace(/\s+/g, " ").trim();
const read = p => norm(fs.readFileSync(new URL(p, import.meta.url), "utf8"));
const SURAHS = JSON.parse(fs.readFileSync(new URL("../public/quran/surahs.json", import.meta.url), "utf8")).surahs;
const ayahs = s => SURAHS.find(x => x.n === s).ayahs;
const ARABIC = /[؀-ۿ]/;
function arabicStrings(obj, path = "", out = []) {
  if (typeof obj === "string") { if (ARABIC.test(obj)) out.push([path, obj]); }
  else if (obj && typeof obj === "object") for (const [k, v] of Object.entries(obj)) arabicStrings(v, `${path}.${k}`, out);
  return out;
}

describe("Manzil data", () => {
  it("follows the PDF: 18 passages, 80 āyāt, 2:163–164", () => {
    expect(MANZIL.map(p => `${p.surah}:${p.from}-${p.to}`)).toEqual([
      "1:1-7", "2:1-5", "2:163-164", "2:255-257", "2:284-286", "3:18-18", "3:26-27", "7:54-56", "17:110-111",
      "23:115-118", "37:1-11", "55:33-40", "59:21-24", "72:1-4", "109:1-6", "112:1-4", "113:1-5", "114:1-6",
    ]);
    expect(manzilAyahCount()).toBe(80);
    expect(manzilRef(MANZIL[1])).toBe("Al-Baqarah 2:1–5");
  });
  it("every reference is a valid ayah range, numbered in order, draft", () => {
    MANZIL.forEach((p, i) => {
      expect(p.n).toBe(i + 1);
      expect(p.from).toBeGreaterThanOrEqual(1);
      expect(p.to).toBeGreaterThanOrEqual(p.from);
      expect(p.to, `${p.surah}`).toBeLessThanOrEqual(ayahs(p.surah));
      expect(p.status).toBe("approved");
    });
    // whole surahs end on their last ayah
    for (const s of [1, 109, 112, 113, 114]) expect(MANZIL.find(p => p.surah === s).to).toBe(ayahs(s));
  });
  it("stores no Arabic except the title, and the md lists every passage", () => {
    expect(arabicStrings(MANZIL)).toEqual([]);
    const md = read("../docs/manzil.md");
    for (const p of MANZIL) expect(md.includes(`| ${p.surah} `), `surah ${p.surah}`).toBe(true);
  });
});

describe("Adhkār after Salāh data", () => {
  const MD = read("../docs/after-salah.md");
  it("has the poster's 8 items plus Āyat al-Kursī before the Quls", () => {
    expect(AFTER_SALAH.map(i => i.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(AFTER_SALAH.map(i => i.poster)).toEqual([1, 2, 3, 4, 5, 6, 7, null, 8]);
    expect(AFTER_SALAH[7].parts[0].quran).toEqual({ surah: 2, from: 255, to: 255 });
    expect(AFTER_SALAH[8].parts.map(p => p.quran.surah)).toEqual([112, 113, 114]);
    for (const i of AFTER_SALAH) expect(i.status).toBe("approved");
  });
  it("counts: 1, 3, 1, 1, 1, 1, 33/33/33/1, 1, Quls 3× after Fajr and Maghrib", () => {
    expect(AFTER_SALAH.slice(0, 7).map(i => unitsFor(i, "Dhuhr"))).toEqual([[1], [3], [1], [1], [1], [1], [33, 33, 33, 1]]);
    expect(PRAYERS5.map(qulsCount)).toEqual([3, 1, 1, 3, 1]);
    expect(unitsFor(AFTER_SALAH[8], "Fajr")).toEqual([3, 3, 3]);
    expect(unitsFor(AFTER_SALAH[8], "Isha")).toEqual([1, 1, 1]);
    expect(totalCount("Maghrib") - totalCount("Asr")).toBe(6);
  });
  it("Qurʾānic items are references only, with valid ranges", () => {
    for (const it of AFTER_SALAH) for (const p of it.parts) if (p.kind === "quran") {
      expect(p.ar).toBeNull(); expect(p.translation).toBeNull();
      const n = ayahs(p.quran.surah);
      if (p.quran.from != null) { expect(p.quran.from).toBeGreaterThanOrEqual(1); expect(p.quran.to).toBeLessThanOrEqual(n); }
    }
  });
  it("every non-Qurʾānic part has Arabic with harakat, transliteration, our translation", () => {
    for (const it of AFTER_SALAH) for (const p of it.parts) if (p.kind === "dhikr") {
      expect(p.ar).toMatch(/[ًٌٍَُِّْ]/);
      expect(p.transliteration.length).toBeGreaterThan(5);
      expect(p.translation.length).toBeGreaterThan(5);
      expect(p.ar).not.toMatch(/[یک]/); // Arabic yaa/kaf, not the Persian forms
    }
  });
  it("every Arabic string appears verbatim in docs/after-salah.md", () => {
    const strs = arabicStrings({ AFTER_SALAH, AFTER_SALAH_META }).filter(([p]) => !p.endsWith(".refPoster"));
    expect(strs.length).toBeGreaterThan(10);
    for (const [path, s] of strs) expect(MD.includes(norm(s)), path).toBe(true);
    for (const it of AFTER_SALAH) for (const p of it.parts) if (p.ar) expect(MD.includes(`<p dir="rtl" lang="ar">${norm(p.ar)}</p>`), `#${it.n}`).toBe(true);
  });
  it("both tools can be hidden one by one", () => {
    expect(TOOLS).toContain("manzil");
    expect(TOOLS).toContain("afterSalah");
  });
});
