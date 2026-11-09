// Parses docs/hizb/manzil-1..7.md into src/tools/data/hizb.js.
// The seven files were transcribed in slightly different layouts, so the parser is tolerant:
// entries start at "### N" (or "## N" in manzil 7) and run to the next heading; fields are found by
// label, or by position when the file leaves the label out. Arabic is copied verbatim (no clean-up).
// Run: node scripts/hizb-to-js.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const AR = /[؀-ۿݐ-ݿ]/;
const arShare = s => { const l = [...s].filter(c => /\S/.test(c)); return l.length ? l.filter(c => AR.test(c)).length / l.length : 0; };

export const DAYS = [
  { n: 1, day: "Saturday", ar: "يوم السبت" }, { n: 2, day: "Sunday", ar: "يوم الأحد" },
  { n: 3, day: "Monday", ar: "يوم الاثنين" }, { n: 4, day: "Tuesday", ar: "يوم الثلاثاء" },
  { n: 5, day: "Wednesday", ar: "يوم الأربعاء" }, { n: 6, day: "Thursday", ar: "يوم الخميس" },
  { n: 7, day: "Friday", ar: "يوم الجمعة" },
];

const LABEL = /^\s*(?:-\s*)?(?:\*\*|\*|_)?\s*(Arabic|Transliteration|Translit\.|Translation|English|Ref|Source(?:\s*\(Nomani\))?|Nomani(?:\s+pages?)?|Extent|Note|Qur[ʾ']ānic wording|Qur[ʾ']ān|Number|status)\s*(?:\*\*|\*|_)?\s*[:.]?\s*(?:\*\*|\*|_)?\s*:?\s*(.*)$/i;
const FIELD = {
  arabic: "ar", transliteration: "tr", "translit.": "tr", translation: "en", english: "en", ref: "ref",
  source: "source", "source (nomani)": "source", extent: "extent", note: "note", "qurʾānic wording": "qw", "qur'ānic wording": "qw", "qurʾān": "qw", "qur'ān": "qw",
  nomani: "page", "nomani page": "page", "nomani pages": "page", number: "skip", status: "skip",
};

function clean(s) { return s.replace(/^\*+|\*+$/g, "").replace(/^`|`$/g, "").trim(); }

/** { s, from, to } when the ref is a plain whole-āyah reference like "al-Baqara 2:201" or "Ṭā Hā 20:25–26". */
function quranRef(r) {
  const m = (r || "").match(/^[^\d:]+?\s(\d{1,3}):(\d{1,3})(?:[–-](\d{1,3}))?\s*$/);
  return m ? { s: +m[1], from: +m[2], to: +(m[3] || m[2]) } : null;
}

export function parseManzil(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  let cur = null;
  for (const raw of lines) {
    if (/^##\s+(Differences|Uncertain)/i.test(raw)) break;
    const h = raw.match(/^#{2,3}\s+(\d+)\b\s*(.*)$/);
    if (h) { cur = { n: +h[1], head: (h[2].match(/^[—–-]\s*(.*)/) || [])[1] || "", f: {}, cur: null, labeled: false }; out.push(cur); continue; }
    if (!cur) continue;
    if (/^#{1,3}\s/.test(raw)) { cur = null; continue; }
    const line = raw.trimEnd();
    if (!line.trim() || /^---+$/.test(line.trim())) { if (cur.cur && !cur.labeled) cur.cur = cur.cur; continue; }
    if (/^\s*[-*]?\s*(\*\*)?`?status:?/i.test(line) && /draft/.test(line) && !AR.test(line)) continue; // `status: draft` lines
    const pg = line.match(/^\s*(?:-\s*)?Nomani pp?\.\s*([\d–-]+)/);
    if (pg) { cur.f.page = pg[1]; cur.cur = null; continue; }
    const m = line.match(LABEL);
    if (m) {
      const key = FIELD[m[1].toLowerCase().replace(/\s+/g, " ")];
      cur.cur = key === "skip" ? null : key; cur.labeled = true;
      const rest = clean(m[2]);
      if (key && key !== "skip" && rest) (cur.f[key] ||= []).push(rest);
      continue;
    }
    // unlabeled line
    const t = line.trim();
    if (/^[*(\s]*Rubric/i.test(t)) continue; // editorial rubric, not part of the dua
    const qm = t.match(/^Qur[ʾ']ān:\**\s*(.*)$/); if (qm) { (cur.f.qw ||= []).push(clean(qm[1])); cur.cur = "qw"; continue; }
    if (cur.labeled && cur.cur) { (cur.f[cur.cur] ||= []).push(clean(t)); continue; } // continuation of a labeled field
    let key;
    if (/^\s*-\s/.test(line)) continue; // stray bullet
    if (arShare(t) > 0.6 && (!cur.cur || cur.cur === "ar")) key = "ar";
    else if (/^\*[^*].*\*$/.test(t)) key = "tr";
    else if (cur.cur === "ar" || cur.cur === "tr" || cur.cur === "en") key = cur.cur === "ar" ? "en" : (cur.cur === "tr" ? "en" : "en");
    else key = "en";
    cur.cur = key;
    (cur.f[key] ||= []).push(clean(t));
  }
  return out.map(e => {
    const f = e.f, j = (k, sep = " ") => (f[k] || []).join(sep).trim();
    let ref = j("ref") || null;
    if (ref && /^none\.?$/i.test(ref)) ref = null;
    const headRef = e.head.replace(/^Qur[ʾ']ān,?\s*/i, "").trim();
    if (!ref && headRef) ref = headRef;
    let source = j("source");
    if (/^(—|-|none.*)$/i.test(source)) source = "";
    return {
      n: e.n,
      ar: (f.ar || []).join("\n"),
      tr: j("tr", "\n"),
      en: j("en", "\n"),
      ref: ref || (f.qw ? j("qw") : null),
      q: quranRef(ref || j("qw")),
      source: source || null,
      page: (Array.isArray(f.page) ? f.page[0] : f.page) || null,
      status: "draft",
    };
  });
}

const MANZIL = [];
for (const d of DAYS) {
  const md = readFileSync(join(root, "docs/hizb", `manzil-${d.n}.md`), "utf8");
  const duas = parseManzil(md);
  MANZIL.push({ manzil: d.n, day: d.day, dayAr: d.ar, duas });
}

const header = `// GENERATED by scripts/hizb-to-js.mjs from docs/hizb/manzil-1..7.md. Do not edit by hand:
// fix the md and run \`node scripts/hizb-to-js.mjs\`. tests/hizb-data.test.js checks every Arabic string against the md.
// Al-Hizb al-Aʿzam (Mulla ʿAli al-Qari), Nomani edition. Saturday = manzil 1 ... Friday = manzil 7.
// Every dua is a draft, pending scholar review. Where en says "Qurʾān translation from Pickthall",
// the reader shows Pickthall from the Quran data (using ref).
`;
const body = `export const HIZB_META = ${JSON.stringify({ title: "Al-Hizb al-Aʿzam", titleAr: "الحزب الأعظم", edition: "Nomani edition (takhrij by ʿAbd al-Rashid al-Nuʿmani; Banuri Town)", status: "draft", pickthallPlaceholder: "Qurʾān translation from Pickthall" })};
export const HIZB = ${JSON.stringify(MANZIL, null, 0).replace(/\},\{"n":/g, "},\n{\"n\":")};
export const manzilDuas = n => HIZB[n - 1]?.duas || [];
`;
writeFileSync(join(root, "src/tools/data/hizb.js"), header + body);
console.log(MANZIL.map(m => `manzil ${m.manzil}: ${m.duas.length} duas`).join("\n"));
