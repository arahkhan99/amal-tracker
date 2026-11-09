// Data-only parsers for the upstream files (nothing downloaded is ever evaluated as code).
import fs from "node:fs";

// Parse one JS array literal starting at s[i] === '['. Supports nested arrays, numbers,
// '…' / "…" strings and // or /* */ comments. Returns [value, nextIndex].
export function parseArrayLiteral(s, i) {
  const skip = () => {
    for (;;) {
      while (i < s.length && /[\s,]/.test(s[i])) i++;
      if (s.startsWith("//", i)) { i = s.indexOf("\n", i); if (i < 0) i = s.length; continue; }
      if (s.startsWith("/*", i)) { i = s.indexOf("*/", i) + 2; continue; }
      return;
    }
  };
  const value = () => {
    skip();
    const c = s[i];
    if (c === "[") {
      i++; const arr = [];
      for (;;) { skip(); if (s[i] === "]") { i++; return arr; } arr.push(value()); }
    }
    if (c === "'" || c === '"') {
      let j = i + 1, out = "";
      while (s[j] !== c) { if (s[j] === "\\") { out += s[j + 1]; j += 2; } else out += s[j++]; }
      i = j + 1; return out;
    }
    const m = /^-?\d+(\.\d+)?/.exec(s.slice(i, i + 32));
    if (m) { i += m[0].length; return Number(m[0]); }
    throw new Error(`Unexpected ${JSON.stringify(s.slice(i, i + 20))} at ${i}`);
  };
  const v = value();
  return [v, i];
}

// DigitalKhatt `let quranText = [[ 'line', … ], …]` → string[][] (pages of lines)
export function parseDkText(file) {
  const s = fs.readFileSync(file, "utf8");
  const [pages] = parseArrayLiteral(s, s.indexOf("["));
  if (!Array.isArray(pages) || !pages.every(p => Array.isArray(p) && p.every(l => typeof l === "string")))
    throw new Error(`${file}: unexpected structure`);
  return pages;
}

// Tanzil quran-data.js → { Sura, Juz, HizbQaurter, Manzil, Ruku, Page, Sajda } (index 0 is the empty [] Tanzil uses)
export function parseTanzilMeta(file) {
  const s = fs.readFileSync(file, "utf8");
  const out = {};
  const re = /QuranData\.(\w+)\s*=\s*\[/g;
  let m;
  while ((m = re.exec(s))) {
    const [v] = parseArrayLiteral(s, m.index + m[0].length - 1);
    out[m[1]] = v;
  }
  out.header = s.split("\n").filter(l => l.startsWith("//")).slice(0, 4).join("\n");
  return out;
}

// Wikisource "The Meaning of the Glorious Koran (1930)/<surah>" page HTML (action=parse output)
// → { surah, verses: { "1": "text", … } }. Footnote references and page-number anchors are dropped.
const ENT = { amp: "&", quot: '"', lt: "<", gt: ">", nbsp: " ", apos: "'" };
const decodeHtml = s => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&(\w+);/g, (m, n) => ENT[n] ?? m);
const roman = s => {
  const v = { I: 1, V: 5, X: 10, L: 50, C: 100 };
  let n = 0;
  for (let i = 0; i < s.length; i++) { const a = v[s[i]], b = v[s[i + 1]] || 0; n += a < b ? -a : a; }
  return n;
};
export function parseWikisourceSurah(html) {
  html = html
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<link[^>]*>/g, "")
    .replace(/<sup[^>]*class="reference[\s\S]*?<\/sup>/g, "")
    .replace(/<span[^>]*class="pagenum[\s\S]*?<\/span><\/span>/g, " ");
  const head = /S[ÛU]RAH\s+([IVXLC]+)/.exec(decodeHtml(html.replace(/<[^>]+>/g, " ")));
  if (!head) return null;
  const parts = html.split(/<span class="wst-verse[^"]*" id="(?:\d+:)?(\d+)"><sup>\d+<\/sup><\/span>/);
  const verses = {};
  for (let i = 1; i < parts.length; i += 2) {
    let t = parts[i + 1].split(/<h\d|<div class="(?:reflist|mw-references|wst-smallrefs)|<ol class="references/)[0];
    t = decodeHtml(t.replace(/<[^>]+>/g, " ")).replace(/[​­]/g, "").replace(/\s+/g, " ").trim().replace(/\s*Footnotes$/, "");
    if (verses[parts[i]]) verses[parts[i]] += " " + t; else verses[parts[i]] = t;
  }
  const pre = decodeHtml(parts[0].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
  const bism = /In the name of Allah, the Beneficent, the Merciful\./.exec(pre);
  return { surah: roman(head[1]), verses, bismillah: bism ? bism[0] : null };
}

// Tanzil "sura|aya|text" translation file → Map("s:a" → text) plus the # header block
export function parseTanzilTxt(file) {
  const map = new Map(); const header = [];
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (line.startsWith("#")) { header.push(line); continue; }
    const m = /^(\d+)\|(\d+)\|(.*)$/.exec(line);
    if (m) map.set(`${m[1]}:${m[2]}`, m[3]);
  }
  return { map, header: header.join("\n") };
}
