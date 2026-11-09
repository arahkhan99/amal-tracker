// Light version of scripts/quran/check.mjs: the offline Qurʾān data in public/quran, read from disk through
// the app's own loader (src/tools/quran-data.js). The full check (every page of every mushaf) stays in the script.
import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as Q from "../src/tools/quran-data.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "public/quran");

describe.skipIf(!fs.existsSync(path.join(DATA, "mushafs.json")))("Qurʾān data (public/quran)", () => {
  beforeAll(() => {
    Q.configureQuranData({
      baseUrl: "mem:/",
      fetch: async url => {
        const f = path.join(DATA, url.slice("mem:/".length));
        if (!fs.existsSync(f)) return { ok: false, status: 404 };
        return { ok: true, json: async () => JSON.parse(fs.readFileSync(f, "utf8")) };
      },
    });
  });

  it("lists the mushafs, with 15-line IndoPak as the default", async () => {
    const list = await Q.listMushafs();
    const ok = list.filter(m => m.available).map(m => m.id);
    expect(ok).toContain("indopak15");
    expect(ok).toContain("madani15");
    expect(list.find(m => m.default).id).toBe("indopak15");
    expect(Q.DEFAULT_MUSHAF).toBe("indopak15");
  });

  for (const id of ["indopak15", "madani15"]) {
    it(`${id}: first and last pages, line limits and juz lookups`, async () => {
      const idx = await Q.getMushaf(id);
      expect(idx.pages).toBe(id === "indopak15" ? 610 : 604);
      for (const n of [1, 2, 300, idx.pages]) {
        const p = await Q.getPage(id, n);
        expect(p.n).toBe(n);
        expect(p.lines.length).toBeLessThanOrEqual(idx.lines);
        expect(await Q.juzForPage(id, n)).toBe(p.juz);
      }
      for (const j of [1, 15, 30]) expect(await Q.juzForPage(id, await Q.pageForJuz(id, j))).toBe(j);
      for (const s of [1, 18, 36, 114]) {
        const p = await Q.getPage(id, await Q.pageForSurah(id, s));
        expect(p.lines.some(l => l.type === "header" && l.surah === s)).toBe(true);
      }
      const p255 = await Q.getPage(id, await Q.pageForAyah(id, 2, 255));
      expect(p255.ayahs.some(([s, a]) => s === 2 && a === 255)).toBe(true);
    });
  }

  it("knows the IndoPak para and Madani juz starts", async () => {
    expect(await Q.pageForJuz("madani15", 30)).toBe(582);
    expect(await Q.pageForJuz("indopak15", 30)).toBe(586);
    expect(await Q.pageForAyah("indopak15", 15, 2)).toBe(await Q.pageForJuz("indopak15", 14));
    expect(await Q.manzilForPage("indopak15", 1)).toBe(1);
  });

  it("has Pickthall's translation and the surah names", async () => {
    expect(await Q.getTranslation("pickthall", 1, 1)).toBe("In the name of Allah, the Beneficent, the Merciful.");
    expect(await Q.getTranslation("pickthall", 2, 255)).toMatch(/^Allah! There is no God save Him/);
    expect(await Q.getTranslation("pickthall", 114, 6)).toMatch(/^Of the jinn and of mankind\.?$/);
    const tp = await Q.getPageTranslation("pickthall", "indopak15", 3);
    expect([tp[0].s, tp[0].a, tp.at(-1).a]).toEqual([2, 5, 15]);
    expect((await Q.getSurah(36)).tr).toBe("Yā Sīn");
    expect((await Q.getSurahs()).length).toBe(114);
  });
});
