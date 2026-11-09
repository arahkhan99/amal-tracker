// Pinned upstream sources for the offline Qurʾān data (see docs/build/quran-data.md).
// Every file is downloaded as DATA and parsed without eval.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const DK_SHA = "78372d7a1e211bbab677cc0304384f278f508657"; // DigitalKhatt/digitalkhatt-js, 2026-08-06
const DK = `https://raw.githubusercontent.com/DigitalKhatt/digitalkhatt-js/${DK_SHA}/apps/site-angular`;
const DK_FONT_SHA = "23a0f34ed24e85fcf45e070616433d005ffca962"; // DigitalKhatt/indopakfont (OFL licence file)
const DK_MADINA_SHA = "9aeb02c26d8dae4c032820733466c1ee9137e6d6"; // DigitalKhatt/madinafont (OFL licence file)
const GF = "https://raw.githubusercontent.com/google/fonts/fffdadf0f0c9cc1ec8b407063424a8bfbee05611/ofl/amiriquran";

export const SOURCES = {
  // Line-by-line page text, MIT (DigitalKhatt contributors, sponsored by Tarteel)
  dkIndopak15: { url: `${DK}/src/app/services/quran_text_indopak_15.ts`, file: "quran_text_indopak_15.ts" },
  dkMadina: { url: `${DK}/src/app/services/quran_text_madina.ts`, file: "quran_text_madina.ts" },
  // Fonts, SIL OFL 1.1 (Amine Anane / Tarteel Inc.)
  dkIndopakFont: { url: `${DK}/src/assets/fonts/coretext/DigitalKhattIndoPak.ttf`, file: "DigitalKhattIndoPak.ttf" },
  dkIndopakOfl: { url: `https://raw.githubusercontent.com/DigitalKhatt/indopakfont/${DK_FONT_SHA}/LICENSE`, file: "DigitalKhattIndoPak-OFL.txt" },
  dkMadinaFont: { url: `${DK}/src/assets/fonts/coretext/DigitalKhattV2.ttf`, file: "DigitalKhattNewMadina.ttf" },
  dkMadinaOfl: { url: `https://raw.githubusercontent.com/DigitalKhatt/madinafont/${DK_MADINA_SHA}/LICENSE`, file: "DigitalKhattNewMadina-OFL.txt" },
  // Amiri Quran, SIL OFL 1.1 (The Amiri Project Authors), via google/fonts
  amiriQuran: { url: `${GF}/AmiriQuran-Regular.ttf`, file: "AmiriQuran-Regular.ttf" },
  amiriOfl: { url: `${GF}/OFL.txt`, file: "AmiriQuran-OFL.txt" },
  // Tanzil metadata, CC BY 3.0
  tanzilMeta: { url: "https://tanzil.net/res/text/metadata/quran-data.js", file: "quran-data.js" },
  // Pickthall (1930, public domain) as typed by Tanzil.net
  pickthall: { url: "https://tanzil.net/trans/?transID=en.pickthall&type=txt-2", file: "en.pickthall.txt" },
};

// Pickthall 1930 (public domain) as transcribed on English Wikisource. Not every surah is transcribed
// yet (in Nov 2026: 1–5 and 39–114); build.mjs fills the rest from Tanzil and flags those ayahs.
export const WIKISOURCE_BOOK = "The Meaning of the Glorious Koran (1930)";
const WS_API = "https://en.wikisource.org/w/api.php";
const UA = { "user-agent": "ZadQuranBuild/1.0 (offline Quran data for a free app; contact zadapp.team@gmail.com)" };
const wait = ms => new Promise(r => setTimeout(r, ms));
async function wsGet(params) {
  for (let tryNo = 0; tryNo < 6; tryNo++) {
    const res = await fetch(`${WS_API}?${new URLSearchParams({ format: "json", formatversion: "2", ...params })}`, { headers: UA });
    const body = await res.text();
    if (res.ok && body.startsWith("{")) return JSON.parse(body);
    await wait(15000 * (tryNo + 1)); // rate limited: back off
  }
  throw new Error(`Wikisource API kept refusing: ${JSON.stringify(params)}`);
}
export async function fetchWikisourcePickthall(dir, { force = false } = {}) {
  const wsDir = path.join(dir, "wikisource-pickthall");
  fs.mkdirSync(wsDir, { recursive: true });
  const listFile = path.join(wsDir, "_pages.json");
  let titles;
  if (!force && fs.existsSync(listFile)) titles = JSON.parse(fs.readFileSync(listFile, "utf8"));
  else {
    const r = await wsGet({ action: "query", list: "prefixsearch", pssearch: WIKISOURCE_BOOK + "/", pslimit: "500" });
    titles = r.query.prefixsearch.map(x => x.title).filter(t => t.includes("/") && !/Introduction|Foreword/.test(t));
    fs.writeFileSync(listFile, JSON.stringify(titles));
  }
  const out = [];
  for (const title of titles) {
    const f = path.join(wsDir, title.split("/")[1].replace(/[^\w]+/g, "_") + ".json");
    if (force || !fs.existsSync(f)) {
      process.stdout.write(`fetch wikisource ${title.split("/")[1]} … `);
      const j = await wsGet({ action: "parse", page: title, prop: "text|revid" });
      fs.writeFileSync(f, JSON.stringify({ title, revid: j.parse.revid, html: j.parse.text }));
      console.log("rev", j.parse.revid);
      await wait(2500);
    }
    out.push(JSON.parse(fs.readFileSync(f, "utf8")));
  }
  return out;
}

export function cacheDir(arg) {
  const dir = arg || process.env.ZAD_QURAN_CACHE || path.join(os.tmpdir(), "zad-quran-sources");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export async function fetchAll(dir, { force = false } = {}) {
  for (const [key, s] of Object.entries(SOURCES)) {
    const out = path.join(dir, s.file);
    if (!force && fs.existsSync(out) && fs.statSync(out).size > 0) continue;
    process.stdout.write(`fetch ${key} … `);
    const res = await fetch(s.url, { redirect: "follow" });
    if (!res.ok) throw new Error(`${s.url} → HTTP ${res.status}`);
    fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
    console.log(fs.statSync(out).size, "bytes");
  }
  return Object.fromEntries(Object.entries(SOURCES).map(([k, s]) => [k, path.join(dir, s.file)]));
}
