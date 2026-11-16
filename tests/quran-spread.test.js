// Two-page spreads (tablet landscape): pairing follows the printed muṣḥaf, right to left, earlier page on the right.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spreadPages, stepSpread, spreadFirst, inSpread, readerPages } from "../src/tools/quran-spread.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "public/quran");
const json = f => JSON.parse(fs.readFileSync(path.join(DATA, f), "utf8"));

describe("spreadPages", () => {
  it("pairs odd|even with the odd (earlier) page first, i.e. on the right", () => {
    expect(spreadPages(1, 610)).toEqual([1, 2]);
    expect(spreadPages(2, 610)).toEqual([1, 2]);
    expect(spreadPages(3, 610)).toEqual([3, 4]);
    expect(spreadPages(4, 610)).toEqual([3, 4]);
    expect(spreadPages(301, 610)).toEqual([301, 302]);
  });
  it("ends on a full spread for even page counts and on a single page for odd ones", () => {
    expect(spreadPages(610, 610)).toEqual([609, 610]);
    expect(spreadPages(604, 604)).toEqual([603, 604]);
    expect(spreadPages(847, 847)).toEqual([847]);
    expect(spreadPages(846, 847)).toEqual([845, 846]);
  });
  it("clamps out-of-range and junk pages", () => {
    expect(spreadPages(0, 610)).toEqual([1, 2]);
    expect(spreadPages(999, 610)).toEqual([609, 610]);
    expect(spreadPages("7", 610)).toEqual([7, 8]);
    expect(spreadPages(NaN, 610)).toEqual([1, 2]);
  });
  it("honours a later first spread (pages before it stand alone)", () => {
    expect(spreadPages(1, 849, 2)).toEqual([1]);
    expect(spreadPages(2, 849, 2)).toEqual([2, 3]);
    expect(spreadPages(3, 849, 2)).toEqual([2, 3]);
    expect(spreadPages(849, 849, 2)).toEqual([848, 849]);
  });
  it("inSpread", () => {
    expect(inSpread(4, 3, 610)).toBe(true);
    expect(inSpread(5, 3, 610)).toBe(false);
  });
});

describe("stepSpread", () => {
  it("moves a whole spread at a time and stops at either end", () => {
    expect(stepSpread(1, 1, 610)).toBe(3);
    expect(stepSpread(2, 1, 610)).toBe(3);
    expect(stepSpread(4, -1, 610)).toBe(1);
    expect(stepSpread(1, -1, 610)).toBe(1);
    expect(stepSpread(609, 1, 610)).toBe(609);
    expect(stepSpread(845, 1, 847)).toBe(847);
    expect(stepSpread(847, -1, 847)).toBe(845);
    expect(stepSpread(1, 3, 604)).toBe(7);
  });
  it("covers every page exactly once going forward", () => {
    for (const [total, first] of [[610, 1], [604, 1], [847, 1], [849, 2]]) {
      const seen = [];
      let n = 1;
      for (;;) { seen.push(...spreadPages(n, total, first)); const nx = stepSpread(n, 1, total, first); if (nx === spreadPages(n, total, first)[0]) break; n = nx; }
      expect(seen).toEqual(Array.from({ length: total }, (_, i) => i + 1));
    }
  });
});

describe("spreadFirst per mushaf", () => {
  it("is 1 for every layout, and an index can override it", () => {
    for (const id of ["indopak15", "indopak13", "madani15", "unknown"]) expect(spreadFirst(id)).toBe(1);
    expect(spreadFirst("indopak13", { spreadFirst: 2 })).toBe(2);
    expect(spreadFirst("indopak13", { spreadFirst: "x" })).toBe(1);
  });

  for (const id of ["indopak15", "madani15"]) {
    it.skipIf(!fs.existsSync(path.join(DATA, id, "index.json")))(`${id}: pages 1|2 are the ornamented opening pair, and the page count gives a full last spread`, () => {
      const ix = json(`${id}/index.json`);
      const first = spreadFirst(id, ix);
      expect(first).toBe(1);
      // pages 1 and 2 are the two short ornamented pages (8 lines), every other page is full
      const list = json(`${id}/p/01.json`).pages; // juz/para 1
      const lines = n => list.find(p => p.n === n).l.length;
      expect(lines(1)).toBeLessThan(ix.lines);
      expect(lines(2)).toBeLessThan(ix.lines);
      expect(lines(3)).toBe(ix.lines);
      expect(spreadPages(1, ix.pages, first)).toEqual([1, 2]);
      expect(ix.pages % 2).toBe(0);
      expect(spreadPages(ix.pages, ix.pages, first)).toEqual([ix.pages - 1, ix.pages]);
      // Fātiḥah alone on the right page, al-Baqarah begins on the facing (left) page
      expect(ix.surahStartPage[0]).toBe(1);
      expect(ix.surahStartPage[1]).toBe(2);
    });
  }
});

describe("readerPages: the chosen page is kept, the spread is only drawn", () => {
  it("an even (left-hand) page stays the chosen page in a spread", () => {
    expect(readerPages(4, 610, 1, true)).toEqual({ page: 4, shown: [3, 4] });
    expect(readerPages(3, 610, 1, true)).toEqual({ page: 3, shown: [3, 4] });
    expect(readerPages(610, 610, 1, true)).toEqual({ page: 610, shown: [609, 610] });
  });
  it("one page outside a spread; junk is clamped", () => {
    expect(readerPages(4, 610)).toEqual({ page: 4, shown: [4] });
    expect(readerPages(0, 610, 1, true)).toEqual({ page: 1, shown: [1, 2] });
  });
});
