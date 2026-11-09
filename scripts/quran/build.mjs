#!/usr/bin/env node
// Build the offline Qurʾān data in public/quran/ from pinned, licence-checked sources.
//   node scripts/quran/build.mjs [--cache <dir>] [--refetch]
// Sources, licences and the output format: docs/build/quran-data.md
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchAll, cacheDir, SOURCES, fetchWikisourcePickthall, WIKISOURCE_BOOK } from "./sources.mjs";
import { assemblePickthall } from "./pickthall.mjs";
import { parseDkText, parseTanzilMeta, parseTanzilTxt } from "./parse.mjs";
import { buildPages } from "./layout.mjs";
import { emitMushaf, writeMushafList, writeJson as writeJsonTo, pad2, TANZIL_CREDIT } from "./emit.mjs";
import { SURAH_TR, INDOPAK_PARA_STARTS } from "./names.mjs";
import { missingGlyphs } from "./cmap.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "public/quran");
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };

const CACHE = cacheDir(opt("--cache"));
const files = await fetchAll(CACHE, { force: args.includes("--refetch") });
const meta = parseTanzilMeta(files.tanzilMeta);
const ayahCounts = meta.Sura.map(x => x[1]); // index 1..114
const writeJson = (rel, data) => writeJsonTo(OUT, rel, data);
const failures = [];

// Rebuild everything this script owns; keep an imported 13-line mushaf (import-qul.mjs) if present.
for (const name of fs.existsSync(OUT) ? fs.readdirSync(OUT) : []) if (name !== "indopak13") fs.rmSync(path.join(OUT, name), { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

// ---------- shared: surahs + Tanzil (Hafs/Kufi) divisions ----------
const surahs = [];
for (let s = 1; s <= 114; s++) {
  const [, ayahs, order, rukus, ar, tname, en, type] = meta.Sura[s];
  surahs.push({ n: s, ar, tr: SURAH_TR[s - 1], tanzil: tname, en, ayahs, type: type === "Meccan" ? "makki" : "madani", order, rukus });
}
writeJson("surahs.json", {
  source: TANZIL_CREDIT + "; light transliteration (tr) by Zad, draft pending scholar review",
  draft: true,
  surahs,
  juz: meta.Juz.slice(1, 31),            // [s, a] Arab/Kufi juz starts (Tanzil)
  manzil: meta.Manzil.slice(1, 8),
  hizbQuarter: meta.HizbQaurter.slice(1, 241),
  sajda: meta.Sajda.slice(1).map(([s, a, kind]) => [s, a, kind]),
});

// ---------- mushafs ----------
const MUSHAFS = [
  {
    id: "indopak15", file: files.dkIndopak15, title: "15-line IndoPak", lines: 15, nav: "para", default: true,
    script: "indopak", dir: "rtl",
    font: { family: "DigitalKhatt IndoPak", file: "fonts/DigitalKhattIndoPak.ttf", licence: "SIL OFL 1.1", by: "Amine Anane, Tarteel Inc. (DigitalKhatt)" },
    paraStarts: INDOPAK_PARA_STARTS, rukuFromText: true,
    note: "South Asian 15-line hafizi layout (610 pages; same page breaks as the Qudratullah 15-line print on QUL). Each para starts on a new page.",
  },
  {
    id: "madani15", file: files.dkMadina, title: "15-line Uthmani", lines: 15, nav: "juz", default: false,
    script: "uthmani", dir: "rtl",
    font: { family: "DigitalKhatt New Madina", file: "fonts/DigitalKhattNewMadina.ttf", licence: "SIL OFL 1.1", by: "Amine Anane, Tarteel Inc. (DigitalKhatt)" },
    fallbackFont: { family: "Amiri Quran", file: "fonts/AmiriQuran-Regular.ttf", licence: "SIL OFL 1.1", by: "The Amiri Project Authors (Khaled Hosny)" },
    paraStarts: meta.Juz.slice(1, 31), rukuFromText: false,
    note: "Madani 15-line layout of the King Fahd Complex 1421H print (604 pages).",
  },
];
const TEXT_SOURCE = {
  name: "DigitalKhatt (digitalkhatt-js, apps/site-angular/src/app/services)",
  url: "https://github.com/DigitalKhatt/digitalkhatt-js",
  licence: "MIT, Copyright (c) 2020–present DigitalKhatt contributors",
  commit: SOURCES.dkIndopak15.url.split("/")[5],
};

for (const M of MUSHAFS) {
  const { pages, errors, rukuEnds } = buildPages(parseDkText(M.file), ayahCounts, { name: M.id });
  failures.push(...errors);
  M.sources = [{ what: "Page and line text", ...TEXT_SOURCE, file: path.basename(M.file) }];
  const r = emitMushaf({ M, pages, rukuEnds: M.rukuFromText ? rukuEnds : null, meta, out: OUT });
  failures.push(...r.failures);
}
writeMushafList(OUT);

// ---------- Pickthall, split by Tanzil juz ----------
const tanzilPk = parseTanzilTxt(files.pickthall);
if (tanzilPk.map.size !== 6236) failures.push(`tanzil pickthall: ${tanzilPk.map.size} ayahs`);
const pk = assemblePickthall(await fetchWikisourcePickthall(CACHE, { force: args.includes("--refetch") }), tanzilPk.map, ayahCounts);
if (pk.problems.length) console.warn("pickthall:", pk.problems.join("; "));
if ([...pk.map.values()].filter(Boolean).length !== 6236) failures.push("pickthall: not 6236 ayahs");
const J = meta.Juz.slice(1, 31);
const juzOf = (s, a) => { let j = 0; while (j < 29 && (J[j + 1][0] < s || (J[j + 1][0] === s && J[j + 1][1] <= a))) j++; return j + 1; };
const tchunks = Array.from({ length: 30 }, () => ({}));
for (const [key, text] of pk.map) { const [s, a] = key.split(":").map(Number); tchunks[juzOf(s, a) - 1][key] = text; }
tchunks.forEach((c, i) => writeJson(`translations/pickthall/${pad2(i + 1)}.json`, c));
const tanzilSurahs = Array.from({ length: 114 }, (_, i) => i + 1).filter(s => !pk.from1930.has(s));
writeJson("translations/pickthall/index.json", {
  id: "pickthall", lang: "en", title: "Pickthall", author: "Mohammed Marmaduke William Pickthall",
  work: "The Meaning of the Glorious Koran (Knopf, 1930)", licence: "Public domain (published 1930; translator died 1936)",
  source: `English Wikisource, "${WIKISOURCE_BOOK}" (transcription of the 1930 print), https://en.wikisource.org/wiki/The_Meaning_of_the_Glorious_Koran_(1930)`,
  wikisourceRevisions: pk.revids,
  // Surahs Wikisource has not transcribed yet come from Tanzil's en.pickthall, which is an EDITED text
  // (e.g. "Allah"/"deity" for "God", "slaves" for "bondmen", "Makka" for "Mecca", 2:106 reworded).
  editedSurahs: tanzilSurahs,
  editedSource: "Tanzil.net en.pickthall (Last Update: September 4, 2010), https://tanzil.net/trans/ — edited, not the 1930 wording; replace when the 1930 text is available",
  numbering: "Hafs/Kufi (1930 print differs at 1:1–7, 4:172–173 and 106:4–5; mapped)",
  draft: true,
  chunks: "by juz, Tanzil juz boundaries (surahs.json juz)", ayahs: pk.map.size,
});
console.log(`pickthall: ${pk.from1930.size} surahs from the 1930 text, ${tanzilSurahs.length} from Tanzil (${tanzilSurahs[0]}–${tanzilSurahs.at(-1)})`);

// ---------- fonts + licences ----------
fs.mkdirSync(path.join(OUT, "fonts"), { recursive: true });
fs.copyFileSync(files.dkIndopakFont, path.join(OUT, "fonts/DigitalKhattIndoPak.ttf"));
fs.copyFileSync(files.dkIndopakOfl, path.join(OUT, "fonts/DigitalKhattIndoPak-OFL.txt"));
fs.copyFileSync(files.dkMadinaFont, path.join(OUT, "fonts/DigitalKhattNewMadina.ttf"));
fs.copyFileSync(files.dkMadinaOfl, path.join(OUT, "fonts/DigitalKhattNewMadina-OFL.txt"));
fs.copyFileSync(files.amiriQuran, path.join(OUT, "fonts/AmiriQuran-Regular.ttf"));
fs.copyFileSync(files.amiriOfl, path.join(OUT, "fonts/AmiriQuran-OFL.txt"));

// Every codepoint of a mushaf's text must have a glyph in its own font, or the reader shows boxes (tofu).
for (const M of MUSHAFS) {
  const dir = path.join(OUT, M.id, "p"), texts = [];
  for (const f of fs.readdirSync(dir)) for (const pg of JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")).pages) for (const l of pg.l) texts.push(l.x);
  const miss = missingGlyphs(path.join(OUT, M.font.file), texts);
  for (const m of miss) failures.push(`${M.id}: U+${m.cp.toString(16).toUpperCase().padStart(4, "0")} (${m.count}×) has no glyph in ${M.font.file}, e.g. "${m.sample}"`);
  console.log(`${M.id}: glyph coverage ${miss.length ? miss.length + " codepoints MISSING" : "complete"} (${M.font.family})`);
}

// ---------- credits (shown in About → Sources & credits) ----------
const dkLicence = "MIT License\n\nCopyright (c) 2020–present DigitalKhatt contributors\n\n" +
  "Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the \"Software\"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\n" +
  "The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\n" +
  "THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.\n";
fs.writeFileSync(path.join(OUT, "LICENSE-DigitalKhatt-text.txt"), dkLicence);
writeJson("credits.json", {
  credits: [
    { name: "DigitalKhatt", what: "IndoPak 15-line and Madani 15-line page text (line by line)", licence: "MIT", url: "https://github.com/DigitalKhatt/digitalkhatt-js" },
    { name: "DigitalKhatt IndoPak font", what: "IndoPak script font", licence: "SIL OFL 1.1", by: "Amine Anane, Tarteel Inc.", url: "https://github.com/DigitalKhatt/indopakfont" },
    { name: "DigitalKhatt New Madina font", what: "Uthmani (Madani) script font", licence: "SIL OFL 1.1", by: "Amine Anane, Tarteel Inc.", url: "https://github.com/DigitalKhatt/madinafont" },
    { name: "Amiri Quran", what: "Uthmani fallback font and Bismillah samples", licence: "SIL OFL 1.1", by: "The Amiri Project Authors", url: "https://github.com/aliftype/amiri" },
    { name: "Tanzil Project", what: "Surah names, juz, manzil, hizb, ruku and sajdah positions", licence: "CC BY 3.0", url: "https://tanzil.net" },
    { name: "Pickthall, The Meaning of the Glorious Koran (1930)", what: "English translation, via English Wikisource", licence: "Public domain", url: "https://en.wikisource.org/wiki/The_Meaning_of_the_Glorious_Koran_(1930)" },
    { name: "Tanzil.net en.pickthall", what: "Pickthall text for the surahs not yet on Wikisource (edited text)", url: "https://tanzil.net/trans/" },
    { name: "Tarteel / QUL", what: "Reference layouts used to check page breaks", url: "https://qul.tarteel.ai" },
  ],
});

// ---------- size report ----------
const sizeOf = d => fs.readdirSync(d, { withFileTypes: true }).reduce((t, e) => t + (e.isDirectory() ? sizeOf(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).size), 0);
for (const d of fs.readdirSync(OUT, { withFileTypes: true })) {
  const p = path.join(OUT, d.name);
  console.log(`  ${d.name.padEnd(28)} ${(((d.isDirectory() ? sizeOf(p) : fs.statSync(p).size)) / 1024).toFixed(0)} KB`);
}
console.log(`total ${(sizeOf(OUT) / 1048576).toFixed(2)} MB`);
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log("OK: all checks passed");
