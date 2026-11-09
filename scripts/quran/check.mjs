#!/usr/bin/env node
// Self-check of public/quran through the app's loader (src/tools/quran-data.js), reading files from disk.
//   node scripts/quran/check.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const Q = await import(pathToFileURL(path.join(ROOT, "src/tools/quran-data.js")).href);
Q.configureQuranData({
  baseUrl: "mem:/",
  fetch: async url => {
    const f = path.join(ROOT, "public/quran", url.slice("mem:/".length));
    if (!fs.existsSync(f)) return { ok: false, status: 404 };
    return { ok: true, json: async () => JSON.parse(fs.readFileSync(f, "utf8")) };
  },
});

const list = await Q.listMushafs();
assert.deepEqual(list.filter(m => m.available).map(m => m.id).sort(), ["indopak15", "madani15"].concat(list.some(m => m.id === "indopak13" && m.available) ? ["indopak13"] : []).sort());
assert.equal(list.find(m => m.default).id, "indopak15");

for (const m of list.filter(x => x.available)) {
  const idx = await Q.getMushaf(m.id);
  const seen = new Set();
  let words = 0;
  for (let n = 1; n <= idx.pages; n++) {
    const p = await Q.getPage(m.id, n);
    assert.equal(p.n, n);
    assert.ok(p.lines.length <= idx.lines, `${m.id} p${n} has ${p.lines.length} lines`);
    for (const ln of p.lines) for (const w of ln.words) { words++; if (w.a) seen.add(`${w.s}:${w.a}`); }
    assert.equal(await Q.juzForPage(m.id, n), p.juz);
  }
  assert.equal(seen.size, 6236, `${m.id}: ${seen.size} ayahs`);
  for (let j = 1; j <= 30; j++) assert.equal(await Q.juzForPage(m.id, await Q.pageForJuz(m.id, j)), j);
  for (const s of [1, 2, 18, 36, 67, 114]) {
    const p = await Q.getPage(m.id, await Q.pageForSurah(m.id, s));
    assert.ok(p.lines.some(l => l.type === "header" && l.surah === s), `${m.id}: surah ${s} header`);
    assert.equal(await Q.pageForAyah(m.id, s, 1), (await Q.pageForSurah(m.id, s)) + (p.lines.at(-1).type === "header" || (p.lines.at(-1).type === "bismillah" && s !== 1) ? 1 : 0));
  }
  const p255 = await Q.getPage(m.id, await Q.pageForAyah(m.id, 2, 255));
  assert.ok(p255.ayahs.some(([s, a]) => s === 2 && a === 255));
  console.log(`${m.id}: ${idx.pages} pages, ${words} words, 6236 ayahs, juz/surah/ayah lookups OK`);
}

// IndoPak para differences and Madani juz
assert.equal(await Q.pageForAyah("indopak15", 15, 2), await Q.pageForJuz("indopak15", 14));
assert.equal(await Q.pageForJuz("madani15", 30), 582);
assert.equal(await Q.pageForJuz("indopak15", 30), 586);
assert.equal(await Q.manzilForPage("indopak15", 1), 1);

assert.equal(await Q.getTranslation("pickthall", 1, 1), "In the name of Allah, the Beneficent, the Merciful.");
assert.match(await Q.getTranslation("pickthall", 2, 255), /^Allah! There is no God save Him/); // 1930 wording
assert.match(await Q.getTranslation("pickthall", 1, 7), /^The path of those whom Thou hast favoured;.*go astray\.$/);
assert.match(await Q.getTranslation("pickthall", 4, 173), /^Then, as for those who believed.*helper\.$/);
assert.match(await Q.getTranslation("pickthall", 106, 4), /hunger.*fear/);
assert.match(await Q.getTranslation("pickthall", 114, 6), /^Of the jinn and of mankind\.?$/);
const info = await Q.getTranslationInfo("pickthall");
console.log(`pickthall: edited (Tanzil) surahs = ${info.editedSurahs.length ? info.editedSurahs[0] + "–" + info.editedSurahs.at(-1) + " (" + info.editedSurahs.length + ")" : "none"}`);
for (let s = 1; s <= 114; s++) for (let a = 1; a <= (await Q.getSurah(s)).ayahs; a++) {
  const t = await Q.getTranslation("pickthall", s, a);
  assert.ok(t && t.length > 1 && !/mw-parser|Footnotes|\{|\}/.test(t), `pickthall ${s}:${a}: ${t}`);
}
const tp = await Q.getPageTranslation("pickthall", "indopak15", 3);
assert.deepEqual([tp[0].s, tp[0].a, tp.at(-1).a], [2, 5, 15]);
assert.equal((await Q.getSurah(36)).tr, "Yā Sīn");
console.log("translation + surah lookups OK");
console.log("check OK");
