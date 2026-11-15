/*
 * Builds the Home card content (src/content/*.js) from the scholar-approved Markdown in docs/content/.
 *     node scripts/build-content.cjs
 * Reads (never writes) docs/content/hadith.md, seerah.md, sunnah.md, dua.md, sahabah-a/b/c.md, ayah.md.
 * The parser is the one in design-review/content-review/build.cjs.
 *
 * What reaches the app:
 *  - never the reviewer's Note field;
 *  - sources as book + printed page only: the "(pdf p. N)" parts and hadith numbers ("no. 1175/132") are dropped;
 *  - hadith collections as the book gives them (no gradings anywhere);
 *  - plain text (no Markdown markup).
 * Everything carries draft:false, status "approved" (approved by the scholar on 14 Nov 2026; the weekly āyāt,
 * ayah.md, on 15 Nov 2026).
 * The āyāt: never the Note or Theme field; the Arabic is kept byte for byte (DigitalKhatt-encoded IndoPak text with
 * «۝n» markers, shown in the DigitalKhatt IndoPak font; no Unicode normalisation); the Source as given.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "src", "content");
const APPROVED = "2026-11-14";
const APPROVED_AYAH = "2026-11-15";
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const problems = [];
const FIELDS = ["Title", "Theme", "Arabic", "Transliteration", "Text", "Narrator", "Collection", "Source", "Note"];

/* ---------- parse one content file (same logic as design-review/content-review/build.cjs) ---------- */
function parse(file) {
  const lines = read(file).split("\n");
  const items = [], companions = [];
  let cur = null, comp = null, field = null, seenFirst = false;
  for (let i = 1; i < lines.length; i++) {
    const l = lines[i];
    if (/^## /.test(l)) {
      seenFirst = true; cur = null; field = null;
      comp = { name: l.replace(/^##\s+/, "").trim(), title: "", items: [] }; companions.push(comp); continue;
    }
    if (/^### /.test(l)) {
      seenFirst = true; field = null;
      cur = { id: l.replace(/^###\s+/, "").trim(), f: {} };
      items.push(cur); if (comp) comp.items.push(cur); continue;
    }
    const m = l.match(/^- \*\*([A-Za-z ]+):\*\*\s*(.*)$/);
    if (m && (cur || comp)) {
      field = m[1];
      if (!FIELDS.includes(field)) problems.push(`${file}: unknown field "${field}" in ${cur ? cur.id : comp.name}`);
      if (cur) cur.f[field] = (cur.f[field] ? cur.f[field] + " " : "") + m[2];
      else if (field === "Title") comp.title = m[2];
      else problems.push(`${file}: field "${field}" under ${comp.name} before any item`);
      continue;
    }
    if (!seenFirst) continue;
    if (l.trim() && cur && field) { cur.f[field] += " " + l.trim(); continue; }
    if (l.trim() && !/^---+$/.test(l.trim())) problems.push(`${file}: stray line ${i + 1}: ${l.slice(0, 80)}`);
  }
  for (const it of items) {
    if (!it.f.Text) problems.push(`${file}: ${it.id} has no Text`);
    if (!it.f.Source) problems.push(`${file}: ${it.id} has no Source`);
  }
  return { items, companions };
}

/* ---------- cleaning for the app ---------- */
const plain = (s) => String(s || "").replace(/\*\*|`|<[^>]+>/g, "").replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,;:]|$)/g, "$1$2").replace(/\s+/g, " ").trim();

/** Book + printed page only: drop the pdf pages and the hadith numbers. */
function userSrc(s) {
  return plain(s)
    .replace(/\s*\(pdf[^)]*\)/gi, "")
    .replace(/,?\s*(?:commentary to |addition to )?nos?\.\s*\d+(?:\/\d+)?(?:\s*[–-]\s*\d+)?(?:\s+and\s+\d+)?/g, "")
    .replace(/\s+and commentary\b/g, "")
    .replace(/\s+,/g, ",").replace(/\s{2,}/g, " ").replace(/[,;\s]+$/, "").trim();
}
/** The collection as the book gives it, without the writer's notes to the reviewer. */
const REVIEWER_ASIDE = /\s*\((?:as the Arabic reference|as the English text)[^)]*\)/g;
const NOT_NAMED = /^\(?(?:the book )?(?:does )?not (?:name|named)/i;
/** The collection as the book gives it, without the writer's notes to the reviewer. */
function userCollection(s) {
  const t = plain(s).replace(REVIEWER_ASIDE, "").trim();
  return !t || NOT_NAMED.test(t) ? undefined : t;
}
/** "Not named in the book" is a note to the reviewer, not a narrator. */
function userNarrator(s) {
  const t = plain(s).replace(REVIEWER_ASIDE, "").trim();
  return !t || NOT_NAMED.test(t) ? undefined : t;
}

const clean = (o) => { for (const k of Object.keys(o)) if (o[k] === undefined || o[k] === "") delete o[k]; return o; };
const meta = { draft: false, status: "approved" };

function simple(file, expected, map) {
  const { items } = parse(file);
  if (items.length !== expected) problems.push(`${file}: ${items.length} items, expected ${expected}`);
  return items.map((it) => clean({ id: it.id, ...map(it.f) }));
}

const hadith = simple("docs/content/hadith.md", 52, (f) => ({
  title: plain(f.Title), en: plain(f.Text), narrator: userNarrator(f.Narrator), collection: userCollection(f.Collection), src: userSrc(f.Source),
}));
const seerah = simple("docs/content/seerah.md", 52, (f) => ({ title: plain(f.Title), text: plain(f.Text), src: userSrc(f.Source) }));
const sunnah = simple("docs/content/sunnah.md", 12, (f) => ({
  title: plain(f.Title), text: plain(f.Text), narrator: userNarrator(f.Narrator), collection: userCollection(f.Collection), src: userSrc(f.Source),
}));
const dua = simple("docs/content/dua.md", 52, (f) => ({
  title: plain(f.Title), ar: plain(f.Arabic), tr: plain(f.Transliteration), en: plain(f.Text),
  narrator: userNarrator(f.Narrator), collection: userCollection(f.Collection), src: userSrc(f.Source),
}));
/* The weekly āyāt: the Arabic verbatim (only trimmed), never the Theme or Note. */
const ayah = simple("docs/content/ayah.md", 52, (f) => ({ title: plain(f.Title), ar: (f.Arabic || "").trim(), en: plain(f.Text), src: plain(f.Source) }));
{
  const raw = read("docs/content/ayah.md");
  ayah.forEach((a, i) => {
    const want = "A" + String(i + 1).padStart(2, "0");
    if (a.id !== want) problems.push(`ayah ${a.id}: out of order (expected ${want})`);
    if (!a.title || !a.ar || !a.en || !a.src) problems.push(`ayah ${a.id}: missing title, Arabic, text or source`);
    if (!raw.includes("- **Arabic:** " + a.ar + "\n")) problems.push(`ayah ${a.id}: Arabic is not verbatim (must be one line in the Markdown)`);
    if (/[*`<>]/.test(a.ar)) problems.push(`ayah ${a.id}: markup in the Arabic`);
    if (!/^Qurʾān \d+:\d+/.test(a.src)) problems.push(`ayah ${a.id}: unexpected source "${a.src}"`);
  });
}
dua.forEach((d) => { if (!d.ar || !d.tr) problems.push(`dua ${d.id}: missing Arabic or transliteration`); });

/* Sahabah: the app's month order (the user's, 13 Nov 2026) */
const ORDER = ["ABUBAKR", "UMAR", "UTHMAN", "ALI", "TALHAH", "ZUBAYR", "ABDURRAHMAN", "SAAD", "SAEED", "ABUUBAYDAH",
  "KHADIJAH", "FATIMAH", "AISHAH", "BILAL", "MUSAB", "MUADH", "SALMAN", "ABUDHARR"];
const comps = [];
for (const k of ["a", "b", "c"]) {
  for (const c of parse(`docs/content/sahabah-${k}.md`).companions) {
    c.key = ((c.items[0] && c.items[0].id) || "").replace(/^[A-Z]-/, "").replace(/-\d+$/, "");
    comps.push(c);
  }
}
const sahabah = ORDER.map((key) => {
  const c = comps.find((x) => x.key === key);
  if (!c) { problems.push(`Sahabah missing: ${key}`); return null; }
  if (!c.title) problems.push(`Sahabah ${c.name}: no Title`);
  return { key, name: plain(c.name), title: plain(c.title), facts: c.items.map((it) => plain(it.f.Text)), srcs: c.items.map((it) => userSrc(it.f.Source)) };
}).filter(Boolean);
if (comps.length !== ORDER.length) problems.push(`Sahabah: ${comps.length} Companions in the files, expected ${ORDER.length}`);

/* ---------- write ---------- */
const all = { hadith, seerah, sunnah, dua, sahabah, ayah };
for (const [k, list] of Object.entries(all)) {
  for (const x of list) for (const v of Object.values(x).flat()) {
    if (typeof v === "string" && /pdf\s*pp?\./i.test(v)) problems.push(`${k} ${x.id || x.key}: pdf page left in "${v.slice(0, 60)}"`);
  }
}
fs.mkdirSync(OUT, { recursive: true });
const HEAD = (file, date = APPROVED) => `/* GENERATED by scripts/build-content.cjs from docs/content/${file}. Do not edit: edit the Markdown and re-run.\n * Approved by the scholar on ${date}. */\n`;
const write = (name, file, exp, date) => {
  const body = `${HEAD(file, date)}${exp}\n`;
  fs.writeFileSync(path.join(OUT, name), body);
  console.log(`src/content/${name}: ${(body.length / 1024).toFixed(1)} KB`);
};
const json = (v) => JSON.stringify(v);
const listOut = (list) => "[\n" + list.map((x) => "  " + json({ ...x, ...meta })).join(",\n") + ",\n]";
write("hadith.js", "hadith.md", `export const HADITH = ${listOut(hadith)};`);
write("seerah.js", "seerah.md", `export const SEERAH = ${listOut(seerah)};`);
write("sunnah.js", "sunnah.md", `export const SUNNAH = ${listOut(sunnah)};`);
write("dua.js", "dua.md", `export const DUA = ${listOut(dua)};`);
write("sahabah.js", "sahabah-a.md, sahabah-b.md, sahabah-c.md", `export const SAHABAH = [\n${sahabah.map((c) => "  " + json({ ...c, ...meta })).join(",\n")},\n];`);
write("ayah.js", "ayah.md", `export const AYAH = ${listOut(ayah)};`, APPROVED_AYAH);
write("index.js", "*.md (index)", [
  'export { HADITH } from "./hadith.js";', 'export { SEERAH } from "./seerah.js";', 'export { SUNNAH } from "./sunnah.js";',
  'export { DUA } from "./dua.js";', 'export { SAHABAH } from "./sahabah.js";', 'export { AYAH } from "./ayah.js";'].join("\n"));

console.log(`ayah ${ayah.length}, hadith ${hadith.length}, seerah ${seerah.length}, sunnah ${sunnah.length}, dua ${dua.length}, sahabah ${sahabah.length} (${sahabah.map((c) => c.facts.length).join("/")})`);
if (problems.length) { console.log("PROBLEMS:"); problems.forEach((p) => console.log(" -", p)); process.exitCode = 1; }
