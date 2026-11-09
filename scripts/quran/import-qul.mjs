#!/usr/bin/env node
// Import a QUL (qul.tarteel.ai) mushaf layout into Zad's format — meant for the 13-line IndoPak
// (Taj Company, QUL layout 313), which has no openly published line data. QUL downloads need a
// free QUL account, so a person downloads the two SQLite files and runs:
//
//   node scripts/quran/import-qul.mjs --layout <layout.sqlite> --words <indopak-words.sqlite>
//        [--id indopak13] [--title "13-line IndoPak"] [--lines 13] [--out public/quran] [--cache <dir>]
//
// layout.sqlite: QUL "Mushaf layout" export, table `pages`
//   (page_number, line_number, line_type 'ayah'|'surah_name'|'basmallah', is_centered, first_word_id, last_word_id, surah_number)
// words.sqlite: QUL "Quran script" word-by-word export, table `words` (word_index, word_key, surah, ayah, text)
// Both formats are documented at https://qul.tarteel.ai/docs/mushaf-layout.
// Run build.mjs first (it writes surahs.json and the fonts); it keeps public/quran/indopak13 on rebuilds.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { fetchAll, cacheDir } from "./sources.mjs";
import { parseTanzilMeta } from "./parse.mjs";
import { emitMushaf, writeMushafList } from "./emit.mjs";
import { INDOPAK_PARA_STARTS } from "./names.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const layoutFile = opt("--layout"), wordsFile = opt("--words");
if (!layoutFile || !wordsFile) { console.error("usage: import-qul.mjs --layout <layout.sqlite> --words <words.sqlite> [--id indopak13]"); process.exit(2); }
const OUT = path.resolve(ROOT, opt("--out", "public/quran"));
const id = opt("--id", "indopak13");
const lines = Number(opt("--lines", 13));

const files = await fetchAll(cacheDir(opt("--cache")));
const meta = parseTanzilMeta(files.tanzilMeta);
const ayahCounts = meta.Sura.map(x => x[1]);

const AYAH_END = "۝", RUKU_SIGN = "ࣖ";
const DIGITS_ONLY = /^[٠-٩۰-۹]+$/;
const BISMILLAH = "بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ";

const words = new Map();
for (const w of new DatabaseSync(wordsFile, { readOnly: true }).prepare("SELECT word_index, surah, ayah, text FROM words").all())
  words.set(Number(w.word_index), { s: Number(w.surah), a: Number(w.ayah), text: String(w.text).trim() });
const rows = new DatabaseSync(layoutFile, { readOnly: true })
  .prepare("SELECT page_number, line_number, line_type, is_centered, first_word_id, last_word_id, surah_number FROM pages ORDER BY page_number, line_number").all();

const failures = [];
const pages = [];
const rukuEnds = [];
let lastHeader = 0;
for (const r of rows) {
  const pn = Number(r.page_number);
  while (pages.length < pn) pages.push({ n: pages.length + 1, l: [] });
  const page = pages[pn - 1];
  const type = String(r.line_type);
  if (type === "surah_name") {
    lastHeader = Number(r.surah_number);
    page.l.push({ t: "h", s: lastHeader, x: "سُورَةُ " + meta.Sura[lastHeader][4] });
  } else if (type === "basmallah") {
    page.l.push({ t: "b", s: Number(r.surah_number) || lastHeader, x: BISMILLAH + " " + AYAH_END });
  } else {
    const toks = [], runs = [];
    for (let wi = Number(r.first_word_id); wi <= Number(r.last_word_id); wi++) {
      const w = words.get(wi);
      if (!w) { failures.push(`p${pn} l${r.line_number}: word ${wi} missing`); continue; }
      // a bare ayah number becomes "۝n" so the font draws the ayah ring (the loader treats both as an ayah end)
      const text = DIGITS_ONLY.test(w.text) ? AYAH_END + w.text : w.text;
      toks.push(text);
      const last = runs[runs.length - 1];
      if (last && last[0] === w.s && last[1] === w.a) last[2]++; else runs.push([w.s, w.a, 1]);
      if (text.includes(RUKU_SIGN)) rukuEnds.push([pn - 1, page.l.length, w.s, w.a]);
    }
    const ln = { t: "a", x: toks.join(" "), k: runs };
    if (Number(r.is_centered)) ln.c = 1;
    page.l.push(ln);
  }
}

// checks: every ayah exactly once in order, no page over the line count
const seen = new Set();
let prev = [0, 0];
for (const p of pages) {
  if (p.l.length > lines) failures.push(`page ${p.n}: ${p.l.length} lines (max ${lines})`);
  for (const ln of p.l) for (const [s, a] of ln.k || []) {
    const key = `${s}:${a}`;
    if (!seen.has(key)) {
      if (s < prev[0] || (s === prev[0] && a < prev[1])) failures.push(`out of order at ${key}`);
      seen.add(key); prev = [s, a];
    }
  }
}
for (let s = 1; s <= 114; s++) for (let a = 1; a <= ayahCounts[s]; a++) if (!seen.has(`${s}:${a}`)) failures.push(`missing ${s}:${a}`);

const M = {
  id, title: opt("--title", `${lines}-line IndoPak`), lines, nav: "para", script: "indopak", dir: "rtl",
  font: { family: "DigitalKhatt IndoPak", file: "fonts/DigitalKhattIndoPak.ttf", licence: "SIL OFL 1.1", by: "Amine Anane, Tarteel Inc. (DigitalKhatt)" },
  paraStarts: INDOPAK_PARA_STARTS,
  note: `Imported from QUL exports (${path.basename(layoutFile)}, ${path.basename(wordsFile)}).`,
  sources: [{ what: "Page layout and word text", name: "Quranic Universal Library (QUL), Tarteel", url: "https://qul.tarteel.ai/resources/mushaf-layout", licence: "QUL: no copyright information listed for the resource; QUL FAQ allows use in projects with credit", files: [path.basename(layoutFile), path.basename(wordsFile)] }],
};
if (failures.length) { console.error(failures.slice(0, 40).join("\n")); console.error(`${failures.length} problems; nothing written`); process.exit(1); }
const r = emitMushaf({ M, pages, rukuEnds, meta, out: OUT });
writeMushafList(OUT);
if (r.failures.length) { console.error(r.failures.join("\n")); process.exit(1); }
console.log(`OK: ${id} written to ${OUT}`);
