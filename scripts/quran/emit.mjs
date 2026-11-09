// Shared by build.mjs and import-qul.mjs: add marks to parsed pages and write one mushaf's files.
import fs from "node:fs";
import path from "node:path";
import { ayahIndex, startsPage, addMark } from "./layout.mjs";

export const TANZIL_CREDIT = "Tanzil Project (tanzil.net), Quran metadata, CC BY 3.0";
export const pad2 = n => String(n).padStart(2, "0");

export function writeJson(out, rel, data) {
  const f = path.join(out, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(data));
}

/**
 * M: { id, title, lines, nav: "para"|"juz", script, dir, font, fallbackFont?, paraStarts: [[s,a]×30], note, sources: [] }
 * pages: output of buildPages(); rukuEnds: [[pageIdx, lineIdx, s, a]] or null to use Tanzil's ruku list.
 * Returns { entry (for mushafs.json), failures: string[] }.
 */
export function emitMushaf({ M, pages, rukuEnds, meta, out }) {
  const failures = [];
  const ayahCounts = meta.Sura.map(x => x[1]);
  const { first, last } = ayahIndex(pages);
  fs.rmSync(path.join(out, M.id), { recursive: true, force: true });

  // pages 1–2 are the decorated opening pages: centre every line
  for (const p of pages.slice(0, 2)) for (const ln of p.l) ln.c = 1;

  // para / juz starts: for IndoPak (hafizi) each para must begin a page
  const juzStartPage = M.paraStarts.map(([s, a], i) => {
    const [pi, li] = first.get(`${s}:${a}`);
    if (M.nav === "para" && !startsPage(pages, first, s, a)) failures.push(`${M.id}: para ${i + 1} (${s}:${a}) does not start page ${pi + 1}`);
    addMark(pages[pi], { t: "juz", l: li, j: i + 1 });
    return pi + 1;
  });

  // manzil, sajdah, hizb quarters (Arab hizb quarters for the Madani mushaf only)
  meta.Manzil.slice(1, 8).forEach(([s, a], i) => { const [pi, li] = first.get(`${s}:${a}`); addMark(pages[pi], { t: "manzil", l: li, z: i + 1 }); });
  meta.Sajda.slice(1).forEach(([s, a, kind]) => { const [pi, li] = last.get(`${s}:${a}`); addMark(pages[pi], { t: "sajda", l: li, s, a, kind }); });
  if (M.nav === "juz") meta.HizbQaurter.slice(1, 241).forEach(([s, a], i) => { const [pi, li] = first.get(`${s}:${a}`); addMark(pages[pi], { t: "hizb", l: li, q: i + 1 }); });

  // ruku: from the printed ࣖ signs when the text has them, else Tanzil's list (Madani prints don't show rukus)
  let ends = rukuEnds && rukuEnds.length ? rukuEnds : null;
  const rukuSource = ends ? "printed ruku signs in the text" : "Tanzil ruku list";
  if (!ends) {
    const starts = meta.Ruku.slice(1);
    ends = starts.map((st, i) => {
      const nx = starts[i + 1];
      const [s, a] = nx && nx[0] === st[0] ? [st[0], nx[1] - 1] : [st[0], ayahCounts[st[0]]];
      const [pi, li] = last.get(`${s}:${a}`);
      return [pi, li, s, a];
    });
  }
  const juzOfPage = pi => { let j = 0; while (j < 29 && juzStartPage[j + 1] <= pi + 1) j++; return j + 1; };
  let prevS = 0, prevA = 0, sr = 0, pr = 0, prJuz = 0;
  const rukuPerSurah = {};
  for (const [pi, li, s, a] of ends) {
    if (s !== prevS) { sr = 0; prevA = 0; }
    const j = juzOfPage(pi); if (j !== prJuz) { pr = 0; prJuz = j; }
    sr++; pr++;
    addMark(pages[pi], { t: "ruku", l: li, s, a, sr, n: a - prevA, pr });
    rukuPerSurah[s] = sr; prevS = s; prevA = a;
  }
  for (const p of pages) if (p.m) p.m.sort((x, y) => x.l - y.l);

  const surahStartPage = [];
  pages.forEach((p, pi) => p.l.forEach(ln => { if (ln.t === "h") surahStartPage[ln.s - 1] = pi + 1; }));
  if (surahStartPage.filter(Boolean).length !== 114) failures.push(`${M.id}: ${surahStartPage.filter(Boolean).length} surah headers`);
  const pageStart = pages.map(p => p.l.find(ln => ln.k).k[0].slice(0, 2));

  // one file per para/juz
  const chunks = juzStartPage.map((st, i) => [st, (juzStartPage[i + 1] || pages.length + 1) - 1]);
  chunks.forEach(([a, b], i) => writeJson(out, `${M.id}/p/${pad2(i + 1)}.json`, { mushaf: M.id, juz: i + 1, from: a, to: b, pages: pages.slice(a - 1, b) }));

  const lineHistogram = {};
  for (const p of pages) lineHistogram[p.l.length] = (lineHistogram[p.l.length] || 0) + 1;
  writeJson(out, `${M.id}/index.json`, {
    id: M.id, title: M.title, lines: M.lines, pages: pages.length, nav: M.nav, script: M.script, dir: M.dir,
    font: M.font, ...(M.fallbackFont ? { fallbackFont: M.fallbackFont } : {}), note: M.note,
    juzStartPage, surahStartPage, chunks, pageStart,
    rukus: ends.length, rukuSource, rukuPerSurah: Array.from({ length: 114 }, (_, i) => rukuPerSurah[i + 1] || 0),
    lineHistogram,
    sources: [
      ...M.sources,
      { what: "Juz, manzil, sajdah, hizb" + (rukuSource.startsWith("Tanzil") ? " and ruku" : "") + " positions", name: TANZIL_CREDIT, url: "https://tanzil.net" },
      { what: "Font", name: M.font.family, licence: M.font.licence, by: M.font.by },
    ],
  });
  console.log(`${M.id}: ${pages.length} pages, ${ends.length} rukus (${rukuSource}), lines/page ${JSON.stringify(lineHistogram)}`);
  return {
    entry: { id: M.id, title: M.title, lines: M.lines, pages: pages.length, nav: M.nav, script: M.script, default: !!M.default, available: true, font: M.font.family },
    failures,
  };
}

/** Rewrite mushafs.json from the index.json files present (order: indopak15, indopak13, madani15). */
export function writeMushafList(out) {
  const ORDER = ["indopak15", "indopak13", "madani15"];
  const list = ORDER.map(id => {
    const f = path.join(out, id, "index.json");
    if (fs.existsSync(f)) {
      const x = JSON.parse(fs.readFileSync(f, "utf8"));
      return { id, title: x.title, lines: x.lines, pages: x.pages, nav: x.nav, script: x.script, default: id === "indopak15", available: true, font: x.font.family };
    }
    if (id === "indopak13") return {
      id, title: "13-line IndoPak", lines: 13, pages: 847, nav: "para", script: "indopak", default: false, available: false,
      reason: "No openly licensed 13-line line data. The Taj Company 13-line layout (QUL layout 313, 847 pages) needs a free QUL account to download; import it with scripts/quran/import-qul.mjs.",
    };
    return null;
  }).filter(Boolean);
  writeJson(out, "mushafs.json", { mushafs: list });
}
