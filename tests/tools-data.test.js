import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { ADHKAR, ADHKAR_META, VIRTUES_APPROVED, itemCount, partText } from "../src/tools/data/adhkar.js";
import { DURUD, DURUD_META } from "../src/tools/data/durud.js";

const norm = (s) => s.replace(/\s+/g, " ").trim();
const read = (p) => norm(readFileSync(new URL(p, import.meta.url), "utf8"));
const ADHKAR_MD = read("../docs/adhkar-20.md");
const DURUD_MD = read("../docs/durud-40.md");
const ARABIC = /[؀-ۿ]/;

// Collect every string containing Arabic script, with its path.
function arabicStrings(obj, path = "", out = []) {
  if (typeof obj === "string") { if (ARABIC.test(obj)) out.push([path, obj]); }
  else if (obj && typeof obj === "object") for (const [k, v] of Object.entries(obj)) arabicStrings(v, `${path}.${k}`, out);
  return out;
}

describe("adhkar data", () => {
  it("has 20 items numbered 1..20, all draft", () => {
    expect(ADHKAR.map((i) => i.n)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    for (const i of ADHKAR) expect(i.status).toBe("draft-pending-review");
  });
  it("counts match the card", () => {
    expect(ADHKAR.map(itemCount)).toEqual([3, 3, 7, 10, 3, 3, 3, 7, 1, 1, 1, 3, 1, 1, 4, 4, 1, 1, 1, 10]);
    expect(ADHKAR[14].parts.map((p) => p.count)).toEqual([3, 1]);
  });
  it("Quranic parts carry refs and null translation", () => {
    for (const i of ADHKAR) for (const p of i.parts) if (p.kind === "quran") { expect(p.translation).toBeNull(); expect(p.quran).toBeTruthy(); }
    expect(ADHKAR[10].parts[0].quran).toEqual({ surah: 2, from: 255, to: 255 });
    expect(ADHKAR[10].parts[0].ar).toBeNull();
    expect(ADHKAR[11].parts.map((p) => p.quran.surah)).toEqual([112, 113, 114]);
  });
  it("every Arabic string appears verbatim in the md (whitespace normalised)", () => {
    const strs = arabicStrings({ ADHKAR, ADHKAR_META });
    expect(strs.length).toBeGreaterThan(40);
    for (const [path, s] of strs) {
      if (path.endsWith(".note")) continue; // English editorial notes
      if (/ADHKAR.(9|15).parts.0.ar(Evening)?$/.test(path)) continue; // variants: checked below
      expect(ADHKAR_MD.includes(norm(s)), path).toBe(true);
    }
  });
  it("morning/evening variants rebuild the md's bracket form", () => {
    for (const n of [10, 16]) {
      const p = ADHKAR[n - 1].parts[0];
      const { morning, evening } = p.variant;
      expect(ADHKAR_MD.includes(norm(p.ar.replace(morning, `${morning} [${evening}]`)))).toBe(true);
      expect(p.arEvening).toBe(p.ar.replace(morning, evening));
      expect(partText(p, "evening").ar).toBe(p.arEvening);
      expect(p.ar).not.toMatch(/\[/);
    }
  });
  it("metadata", () => {
    expect(VIRTUES_APPROVED).toBe(false);
    expect(ADHKAR_META.titleAr).toBe("النور والضياء لأذكار الصبح والمساء");
    expect(ADHKAR_META.publisher).toBe("Ilmi Kitab Ghar");
    expect(ADHKAR_META.eveningOpensAfter).toBe("Asr");
  });
});

describe("durud data", () => {
  it("has 40 items numbered 1..40, all draft, with page", () => {
    expect(DURUD.map((d) => d.n)).toEqual(Array.from({ length: 40 }, (_, i) => i + 1));
    for (const d of DURUD) {
      expect(d.status).toBe("draft-pending-review");
      expect(d.pdfPage).toBeGreaterThan(0);
      expect(d.transliteration && d.translation).toBeTruthy();
      expect(d.isTashahhud).toBe(d.n >= 26 && d.n <= 39);
    }
  });
  it("every Arabic string appears verbatim in the md", () => {
    for (const d of DURUD) expect(DURUD_MD.includes(`<p dir="rtl" lang="ar">${norm(d.ar)}</p>`), `durud ${d.n}`).toBe(true);
    for (const [path, s] of arabicStrings({ DURUD, DURUD_META })) expect(DURUD_MD.includes(norm(s)), path).toBe(true);
  });
  it("metadata", () => {
    expect(DURUD_META.title).toBe("40 Salaah and Salaam");
    expect(DURUD_META.tashahhudRange).toEqual([26, 39]);
  });
});
