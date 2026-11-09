// Assemble Pickthall per ayah (Hafs/Kufi numbering) from the 1930 text on Wikisource, filling surahs that
// Wikisource has not transcribed yet from Tanzil's en.pickthall (an edited text: "Allah" for "God",
// "slaves" for "bondmen", "Makka" for "Mecca", 2:106 reworded, …), which are then flagged.
import { parseWikisourceSurah } from "./parse.mjs";

// The 1930 print numbers three places differently from the Kufi count Zad uses.
function toKufi(s, v, bismillah) {
  const out = {};
  if (s === 1) { // bismillah unnumbered; printed 6 + 7 = Kufi 7
    if (!bismillah) throw new Error("Pickthall 1: bismillah not found");
    out[1] = bismillah;
    for (let a = 1; a <= 5; a++) out[a + 1] = v[a];
    out[7] = `${v[6]} ${v[7]}`;
    return out;
  }
  Object.assign(out, v);
  if (s === 4) { // the print runs 173a into 172 and marks 173b inline
    const m = /^(.*?)\s*173a\s+(.*)$/.exec(out[172] || "");
    if (!m) throw new Error("Pickthall 4:172/173a split not found");
    out[172] = m[1];
    out[173] = m[2].replace(/\s*173b\s+/, " ");
  }
  if (s === 106) { // printed 4 + 5 = Kufi 4
    out[4] = `${v[4]} ${v[5]}`;
    delete out[5];
  }
  return out;
}

/** → { map: Map("s:a" → text), from1930: Set(surah), revids: { surah: revid }, problems: [] } */
export function assemblePickthall(wsPages, tanzilMap, ayahCounts) {
  const map = new Map(), from1930 = new Set(), revids = {}, problems = [];
  const ws = {};
  for (const p of wsPages) {
    const r = parseWikisourceSurah(p.html);
    if (!r) { problems.push(`Wikisource page without a surah heading: ${p.title}`); continue; }
    ws[r.surah] = { ...r, revid: p.revid };
  }
  for (let s = 1; s <= 114; s++) {
    let verses = null;
    if (ws[s]) {
      try {
        verses = toKufi(s, ws[s].verses, ws[s].bismillah);
        const keys = Object.keys(verses).map(Number);
        const bad = keys.length !== ayahCounts[s] || keys.some(a => a < 1 || a > ayahCounts[s] || !verses[a]);
        if (bad) { problems.push(`Wikisource surah ${s}: ${keys.length} verses, expected ${ayahCounts[s]}; using Tanzil`); verses = null; }
      } catch (e) { problems.push(`${e.message}; using Tanzil`); verses = null; }
    }
    if (verses) { from1930.add(s); revids[s] = ws[s].revid; }
    for (let a = 1; a <= ayahCounts[s]; a++) map.set(`${s}:${a}`, verses ? verses[a] : tanzilMap.get(`${s}:${a}`));
  }
  return { map, from1930, revids, problems };
}
