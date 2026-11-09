// Offline Qurʾān data loader for the mushaf reader (data in public/quran/, built by scripts/quran/build.mjs).
// Format, sources and licences: docs/build/quran-data.md
//
// Everything is fetched lazily: one small index per mushaf, then one file per para/juz of pages,
// and one file per juz of translation. Results are cached in memory.

export const DEFAULT_MUSHAF = "indopak15";

let base = "quran/"; // relative to the app (vite base "./"); override in tests or native builds
let fetchImpl = (...a) => fetch(...a);
const cache = new Map();

/** Point the loader somewhere else (e.g. a file:// or http:// URL in tests) and/or inject fetch. */
export function configureQuranData({ baseUrl, fetch: f } = {}) {
  if (baseUrl) base = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
  if (f) fetchImpl = f;
  cache.clear();
}

function getJson(rel) {
  if (!cache.has(rel)) {
    const p = Promise.resolve(fetchImpl(base + rel)).then(r => {
      if (!r.ok) throw new Error(`quran-data: ${rel} → ${r.status}`);
      return r.json();
    });
    p.catch(() => cache.delete(rel)); // allow a retry after a failed load
    cache.set(rel, p);
  }
  return cache.get(rel);
}

const pad2 = n => String(n).padStart(2, "0");
const DIGITS = /[٠-٩۰-۹]+/;
const digitsToInt = d => Number([...d].map(ch => { const c = ch.codePointAt(0); return c >= 0x6F0 ? c - 0x6F0 : c - 0x660; }).join(""));

// ---------- lists & indexes ----------

/** [{ id, title, lines, pages, nav: "para"|"juz", script, default, available, reason? }] */
export async function listMushafs() {
  return (await getJson("mushafs.json")).mushafs;
}

/** The mushaf's index: pages, juzStartPage[30], surahStartPage[114], pageStart[[s,a]…], chunks, font, sources. */
export function getMushaf(mushafId = DEFAULT_MUSHAF) {
  return getJson(`${mushafId}/index.json`);
}

/** Surah list: [{ n, ar, tr, en, ayahs, type: "makki"|"madani", … }] plus Tanzil juz/manzil/sajda tables. */
export async function getSurahs() {
  return (await getJson("surahs.json")).surahs;
}
export async function getSurah(n) {
  return (await getSurahs())[n - 1];
}

export async function pageCount(mushafId = DEFAULT_MUSHAF) {
  return (await getMushaf(mushafId)).pages;
}

/** First page of juz/para j (1–30). */
export async function pageForJuz(mushafId, j) {
  return (await getMushaf(mushafId)).juzStartPage[j - 1];
}
/** Para for IndoPak, same function. */
export const pageForPara = pageForJuz;

/** Page with surah s's header. */
export async function pageForSurah(mushafId, s) {
  return (await getMushaf(mushafId)).surahStartPage[s - 1];
}

const cmp = (a, b) => a[0] - b[0] || a[1] - b[1];

/** Page where ayah s:a starts (Hafs/Kufi numbering). */
export async function pageForAyah(mushafId, s, a) {
  const { pageStart } = await getMushaf(mushafId);
  let lo = 0, hi = pageStart.length - 1;
  while (lo < hi) { // last page whose first ayah <= s:a
    const mid = (lo + hi + 1) >> 1;
    if (cmp(pageStart[mid], [s, a]) <= 0) lo = mid; else hi = mid - 1;
  }
  return lo + 1;
}

/** Juz/para (1–30) that page n belongs to. */
export async function juzForPage(mushafId, n) {
  const { juzStartPage } = await getMushaf(mushafId);
  let j = 0;
  while (j < 29 && juzStartPage[j + 1] <= n) j++;
  return j + 1;
}
export const paraForPage = juzForPage;

/** Manzil (1–7) at the start of page n. */
export async function manzilForPage(mushafId, n) {
  const [{ pageStart }, meta] = await Promise.all([getMushaf(mushafId), getJson("surahs.json")]);
  const first = pageStart[n - 1];
  let z = 0;
  while (z < 6 && cmp(meta.manzil[z + 1], first) <= 0) z++;
  return z + 1;
}

// ---------- pages ----------

function expandLine(ln) {
  if (ln.t === "h") return { type: "header", surah: ln.s, text: ln.x, centered: true, words: [] };
  const toks = ln.x.split(" ").filter(Boolean);
  const words = [];
  if (ln.k) {
    let i = 0;
    for (const [s, a, n] of ln.k) for (let j = 0; j < n; j++, i++) {
      const text = toks[i];
      const d = text.match(DIGITS);
      const end = text.startsWith("۝") || !!d;
      const w = end ? { text, s, a, end: true, label: d ? digitsToInt(d[0]) : null } : { text, s, a };
      if (end && !text.startsWith("۝")) w.attached = true; // marker glued to the word (IndoPak 1:6)
      words.push(w);
    }
  } else {
    for (const text of toks) words.push({ text, s: ln.s, a: 0 });
  }
  if (ln.t === "b") return { type: "bismillah", surah: ln.s, text: ln.x, centered: true, words };
  return { type: "ayah", text: ln.x, centered: !!ln.c, words };
}

/**
 * Page n of a mushaf:
 * { mushaf, n, juz, lines: [{ type: "header"|"bismillah"|"ayah", surah?, text, centered, words: [{ text, s, a, end?, label? }] }],
 *   marks: [{ t: "juz"|"ruku"|"sajda"|"hizb"|"manzil", l: lineIndex, … }], surahs: [s…], ayahs: [[s,a]…] }
 * `text` is the verbatim source line; words split it on spaces. An ayah-end marker is its own word
 * (end: true, label = printed number); 1:6 in IndoPak has its marker attached to the last word.
 */
export async function getPage(mushafId, n) {
  const idx = await getMushaf(mushafId);
  if (!(n >= 1 && n <= idx.pages)) throw new RangeError(`page ${n} is outside 1–${idx.pages}`);
  const c = idx.chunks.findIndex(([a, b]) => n >= a && n <= b);
  const chunk = await getJson(`${mushafId}/p/${pad2(c + 1)}.json`);
  const raw = chunk.pages[n - chunk.from];
  const lines = raw.l.map(expandLine);
  const ayahs = [], surahs = [];
  for (const ln of raw.l) {
    if (ln.t === "h" && !surahs.includes(ln.s)) surahs.push(ln.s);
    for (const [s, a] of ln.k || []) {
      const last = ayahs[ayahs.length - 1];
      if (!last || last[0] !== s || last[1] !== a) ayahs.push([s, a]);
      if (!surahs.includes(s)) surahs.push(s);
    }
  }
  return { mushaf: mushafId, n, juz: c + 1, lines, marks: raw.m || [], surahs: surahs.sort((x, y) => x - y), ayahs };
}

// ---------- translation ----------

async function juzOfAyah(s, a) {
  const { juz } = await getJson("surahs.json");
  let j = 0;
  while (j < 29 && cmp(juz[j + 1], [s, a]) <= 0) j++;
  return j + 1;
}

/** Translation metadata (title, author, licence, source). */
export function getTranslationInfo(id = "pickthall") {
  return getJson(`translations/${id}/index.json`);
}

/** One ayah's translation, e.g. getTranslation('pickthall', 2, 255). */
export async function getTranslation(id, s, a) {
  const j = await juzOfAyah(s, a);
  return (await getJson(`translations/${id}/${pad2(j)}.json`))[`${s}:${a}`] ?? null;
}

/** Translations of every ayah on a mushaf page: [{ s, a, text }]. */
export async function getPageTranslation(id, mushafId, n) {
  const page = await getPage(mushafId, n);
  return Promise.all(page.ayahs.map(async ([s, a]) => ({ s, a, text: await getTranslation(id, s, a) })));
}

// ---------- fonts ----------

/** Load the mushaf's font with the FontFace API; resolves to the CSS font-family name. */
export async function loadMushafFont(mushafId = DEFAULT_MUSHAF) {
  const { font } = await getMushaf(mushafId);
  if (typeof document === "undefined" || typeof FontFace === "undefined") return font.family;
  if (![...document.fonts].some(f => f.family.replace(/"/g, "") === font.family)) {
    const ff = new FontFace(font.family, `url(${base}${font.file})`);
    document.fonts.add(await ff.load());
  }
  return font.family;
}

/** Credits for About → Sources & credits. */
export async function getQuranCredits() {
  return (await getJson("credits.json")).credits;
}
