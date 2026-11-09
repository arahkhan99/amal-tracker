/* Qurʾān text by surah:ayah for the adhkar and the Hizb, taken from the Quran data loader
   (IndoPak text, Pickthall translation). Nothing here is typed by hand. */
import { getPage, pageForAyah, getTranslation, getSurah, loadMushafFont, DEFAULT_MUSHAF } from "../../tools/quran-data.js";
import { bare } from "./core.js";

const cache = new Map();

/** Words of one ayah (end marker included as the last word), or null if it can't be loaded. */
export async function ayahWords(s, a, mushaf = DEFAULT_MUSHAF) {
  const k = `${mushaf}:${s}:${a}`;
  if (cache.has(k)) return cache.get(k);
  const p = (async () => {
    let n = await pageForAyah(mushaf, s, a);
    const out = [];
    for (let guard = 0; guard < 3; guard++, n++) {
      const page = await getPage(mushaf, n);
      const here = page.lines.flatMap(l => l.words || []).filter(w => w.s === s && w.a === a);
      if (!here.length) break;
      out.push(...here.map(w => w.text));
      if (here[here.length - 1].end) break;
    }
    return out.length ? out : null;
  })();
  p.catch(() => cache.delete(k));
  cache.set(k, p);
  return p;
}

/**
 * One Qurʾān block: { ar, en: [{a, text}], partial } for surah s, ayahs from..to (null = whole surah).
 * `startsWith` (the card's own first words) trims the first ayah when the card gives only part of it.
 */
export async function quranBlock({ surah, from, to, partial, startsWith }) {
  const info = await getSurah(surah);
  const f = from ?? 1, t = to ?? info.ayahs;
  const ar = [], en = [];
  for (let a = f; a <= t; a++) {
    let w = await ayahWords(surah, a);
    if (!w) return null;
    if (partial && a === f && startsWith) {
      const key = bare(startsWith.split(" ")[0]);
      const i = w.findIndex(x => bare(x) === key);
      if (i > 0) w = w.slice(i);
    }
    ar.push(w.join(" "));
    en.push({ a, text: await getTranslation("pickthall", surah, a) });
  }
  return { ar: ar.join(" "), en, surah, from: f, to: t, name: info.tr };
}

// The @font-face in tools.css only starts loading when text uses it, so wait for the real load before callers measure.
export const quranFont = async (id = DEFAULT_MUSHAF) => {
  try {
    const family = await loadMushafFont(id);
    if (typeof document !== "undefined" && document.fonts?.load) await document.fonts.load(`16px "${family}"`, "بسم");
    return family;
  } catch { return null; }
};
export const refLabel = b => `${b.name} ${b.surah}:${b.from}${b.to !== b.from ? "–" + b.to : ""}`;
