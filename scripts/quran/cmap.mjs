// Minimal TrueType/OpenType cmap reader (formats 4 and 12), so the build can check that every codepoint
// in a mushaf's text has a glyph in that mushaf's font. No dependencies; the font is read as data.
import fs from "node:fs";

export function readCmap(file) {
  const b = fs.readFileSync(file);
  const u16 = o => b.readUInt16BE(o), u32 = o => b.readUInt32BE(o), i16 = o => b.readInt16BE(o);
  const numTables = u16(4);
  let cmap = -1;
  for (let i = 0; i < numTables; i++) if (b.toString("latin1", 12 + i * 16, 16 + i * 16) === "cmap") cmap = u32(12 + i * 16 + 8);
  if (cmap < 0) throw new Error(`${file}: no cmap table`);
  const subs = [];
  for (let i = 0; i < u16(cmap + 2); i++) {
    const p = u16(cmap + 4 + i * 8), e = u16(cmap + 6 + i * 8), off = cmap + u32(cmap + 8 + i * 8);
    if ((p === 3 && (e === 1 || e === 10)) || p === 0) subs.push({ fmt: u16(off), off });
  }
  const has = new Set();
  for (const { fmt, off } of subs) {
    if (fmt === 12) {
      for (let g = 0, n = u32(off + 12); g < n; g++) {
        const s = u32(off + 16 + g * 12), e = u32(off + 20 + g * 12), gid = u32(off + 24 + g * 12);
        for (let c = s; c <= e; c++) if (gid + (c - s)) has.add(c);
      }
    } else if (fmt === 4) {
      const seg = u16(off + 6) / 2, ends = off + 14, starts = ends + seg * 2 + 2, deltas = starts + seg * 2, ros = deltas + seg * 2;
      for (let i = 0; i < seg; i++) {
        const end = u16(ends + i * 2), start = u16(starts + i * 2), delta = i16(deltas + i * 2), ro = u16(ros + i * 2);
        for (let c = start; c <= end && c !== 0xffff; c++) {
          let gid;
          if (!ro) gid = (c + delta) & 0xffff;
          else { const g = u16(ros + i * 2 + ro + (c - start) * 2); gid = g ? (g + delta) & 0xffff : 0; }
          if (gid) has.add(c);
        }
      }
    }
  }
  return has;
}

// Bidi format controls are never drawn by a text engine, so a font needs no glyph for them.
// (The DigitalKhatt IndoPak text has one U+202E RLO, before the disputed ayah-end number in 1:7.)
export const NOT_DRAWN = new Set([0x200e, 0x200f, 0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069]);

/** Codepoints in `texts` (strings) with no glyph in `file`, as [{ cp, count, sample }]. */
export function missingGlyphs(file, texts) {
  const has = readCmap(file), miss = new Map();
  for (const t of texts) for (const ch of t) {
    const cp = ch.codePointAt(0);
    if (cp === 0x20 || has.has(cp) || NOT_DRAWN.has(cp)) continue;
    const m = miss.get(cp) || { cp, count: 0, sample: t.slice(0, 40) };
    m.count++; miss.set(cp, m);
  }
  return [...miss.values()];
}
