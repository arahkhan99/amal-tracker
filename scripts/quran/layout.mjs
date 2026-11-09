// Turn a line-by-line page text (string[][]) into Zad page objects with ayah keys.
//
// Page object (what public/quran/<mushaf>/p/NN.json holds, one per page):
//   { n, l: [line…], m?: [mark…] }
// Line:
//   { t: "h", s, x }            surah header (x = header text from the source)
//   { t: "b", s, x }            bismillah line before surah s (not an ayah, except 1:1 in Madani)
//   { t: "a", x, k: [[s,a,n]…], c? }
//        x = verbatim line text; k = runs of n space-separated tokens that belong to ayah s:a
//        (Hafs/Kufi numbering, the numbering Tanzil and the translation use); c: 1 = centre the line
// Marks (m), each { t, l, … } where l = line index on the page:
//   { t:"juz", l, j }           juz / para j starts on this line
//   { t:"ruku", l, s, a, sr, n, pr } ruku ends after s:a (ruku sr of the surah, n ayahs, ruku pr of the para)
//   { t:"sajda", l, s, a }      sajdah ayah
//   { t:"hizb", l, q }          hizb quarter q (1–240) starts (Tanzil quarters)
//   { t:"manzil", l, z }        manzil z starts

const DIGITS = /[٠-٩۰-۹]+/;
const AYAH_END = "۝"; // ۝
const RUKU_SIGN = "ࣖ"; // ࣖ small high ʿain, printed by IndoPak mushafs at the end of each ruku
const HEADER = /^سُورَةُ /;

const toInt = d => Number([...d].map(ch => {
  const c = ch.codePointAt(0);
  return c >= 0x6F0 ? c - 0x6F0 : c - 0x660;
}).join(""));

export function buildPages(rawPages, ayahCounts, { name }) {
  const pages = [];
  let s = 0;          // current surah
  let a = 1;          // next ayah number as printed in the source
  let expectBism = false;
  const errors = [];
  const printedFatiha = rawPages[0].find(l => l.startsWith("بِسْمِ"))?.match(DIGITS) ? "kufi" : "indopak";
  // IndoPak prints leave the Fātihah bismillah unnumbered and number "…anʿamta ʿalayhim" as 6.
  const kufi = (sur, printed, bism) => {
    if (sur !== 1 || printedFatiha === "kufi") return printed;
    if (bism) return 1;
    return printed <= 5 ? printed + 1 : 7;
  };
  const rukuEnds = []; // [page, lineIdx, s, kufiAyah]

  rawPages.forEach((lines, pi) => {
    const page = { n: pi + 1, l: [] };
    lines.forEach((text, li) => {
      if (HEADER.test(text)) {
        s++; a = 1; expectBism = s !== 9;
        page.l.push({ t: "h", s, x: text });
        return;
      }
      const toks = text.split(" ").filter(Boolean);
      const isBism = expectBism && text.startsWith("بِسْمِ") && toks.length <= 5;
      if (isBism && !(s === 1 && printedFatiha === "kufi")) {
        expectBism = false;
        const line = { t: "b", s, x: text };
        if (s === 1) line.k = [[1, 1, toks.length]]; // IndoPak: the Fātihah bismillah is still 1:1
        page.l.push(line);
        return;
      }
      expectBism = false;
      const runs = [];
      const push = ka => {
        const last = runs[runs.length - 1];
        if (last && last[0] === s && last[1] === ka) last[2]++;
        else runs.push([s, ka, 1]);
      };
      for (const tok of toks) {
        const d = tok.match(DIGITS);
        const isEnd = tok.startsWith(AYAH_END) || !!d;
        if (isEnd) {
          if (!d) { errors.push(`${name} p${pi + 1} l${li + 1}: ayah end without number "${tok}"`); push(kufi(s, a)); continue; }
          const num = toInt(d[0]);
          if (num !== a) errors.push(`${name} p${pi + 1} l${li + 1}: expected ${s}:${a}, marker says ${num}`);
          push(kufi(s, num));
          if (tok.includes(RUKU_SIGN)) rukuEnds.push([pi, page.l.length, s, kufi(s, num)]);
          a = num + 1;
        } else push(kufi(s, a));
      }
      const line = { t: "a", x: text, k: runs };
      page.l.push(line);
    });
    pages.push(page);
  });

  // Every surah must have exactly the Tanzil (Hafs/Kufi) ayah count.
  if (s !== 114) errors.push(`${name}: found ${s} surah headers`);
  const seen = new Map();
  for (const p of pages) for (const ln of p.l) for (const [ss, aa] of ln.k || []) seen.set(`${ss}:${aa}`, 1);
  for (let ss = 1; ss <= 114; ss++)
    for (let aa = 1; aa <= ayahCounts[ss]; aa++)
      if (!seen.has(`${ss}:${aa}`)) errors.push(`${name}: missing ${ss}:${aa}`);
  if (seen.size !== 6236) errors.push(`${name}: ${seen.size} ayah keys (expected 6236)`);
  return { pages, errors, rukuEnds, printedFatiha };
}

// First line index + page of each ayah key → used for juz/hizb/manzil/sajda marks and page lookups
export function ayahIndex(pages) {
  const first = new Map(), last = new Map();
  pages.forEach((p, pi) => p.l.forEach((ln, li) => {
    for (const [s, a] of ln.k || []) {
      const key = `${s}:${a}`;
      if (!first.has(key)) first.set(key, [pi, li]);
      last.set(key, [pi, li]);
    }
  }));
  return { first, last };
}

// True when ayah s:a is the first ayah text on its page (only headers/bismillah may come before it).
export function startsPage(pages, first, s, a) {
  const [pi, li] = first.get(`${s}:${a}`);
  const p = pages[pi];
  for (let i = 0; i < li; i++) if (p.l[i].t === "a") return false;
  const k = p.l[li].k[0];
  return k[0] === s && k[1] === a;
}

export function addMark(page, mark) { (page.m ||= []).push(mark); }
