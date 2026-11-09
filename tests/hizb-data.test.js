import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { HIZB, manzilDuas } from "../src/tools/data/hizb.js";

const md = n => readFileSync(new URL(`../docs/hizb/manzil-${n}.md`, import.meta.url), "utf8");
const COUNTS = [109, 50, 52, 58, 49, 54, 71];

describe("hizb data", () => {
  it("has seven manzils, Saturday first, Friday last", () => {
    expect(HIZB.map(m => m.manzil)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(HIZB[0].day).toBe("Saturday");
    expect(HIZB[6].day).toBe("Friday");
  });
  it("has the entry count the md files state, numbered in order", () => {
    HIZB.forEach((m, i) => {
      expect(m.duas.length, `manzil ${m.manzil}`).toBe(COUNTS[i]);
      m.duas.forEach((d, k) => expect(d.n).toBe(k + 1));
    });
  });
  it("every dua has Arabic, transliteration, English and a draft status", () => {
    for (const m of HIZB) for (const d of m.duas) {
      expect(d.ar, `${m.manzil}.${d.n} ar`).toMatch(/[؀-ۿ]/);
      expect(d.tr.length, `${m.manzil}.${d.n} tr`).toBeGreaterThan(3);
      expect(d.en.length, `${m.manzil}.${d.n} en`).toBeGreaterThan(3);
      expect(d.status).toBe("draft");
    }
  });
  it("every Arabic string appears verbatim in its md file", () => {
    for (const m of HIZB) {
      const text = md(m.manzil);
      for (const d of m.duas) for (const para of d.ar.split("\n")) {
        expect(text.includes(para), `manzil ${m.manzil} dua ${d.n}`).toBe(true);
      }
    }
  });
  it("manzilDuas returns the list for a manzil", () => {
    expect(manzilDuas(3)).toBe(HIZB[2].duas);
    expect(manzilDuas(9)).toEqual([]);
  });
});
