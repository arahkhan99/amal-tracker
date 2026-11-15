// Home card content (scholar-approved 14 Nov 2026; the weekly āyāt 15 Nov 2026): the generated src/content/*.js against docs/content/*.md,
// what may reach users (no reviewer notes, no pdf pages, no gradings), the Sahabi fact-a-day logic (with the
// recap after a Companion's last fact) and the weekly rotation.
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { HADITH, SEERAH, SUNNAH, DUA, SAHABAH, AYAH } from "../src/content/index.js";
import { thisWeek, pastSahabi, loadContent, contentReady, setSahabiStart, monthIndex, sahabiFactDay, recapPicks } from "../src/content.js";
import { WEEK_UI } from "../src/strings.js";

const ROOT = path.resolve(__dirname, "..");
const md = f => fs.readFileSync(path.join(ROOT, "docs/content", f), "utf8").replace(/\r\n/g, "\n");
const FILES = ["hadith.md", "seerah.md", "sunnah.md", "dua.md", "sahabah-a.md", "sahabah-b.md", "sahabah-c.md", "ayah.md"];
const SETS = { HADITH, SEERAH, SUNNAH, DUA, SAHABAH, AYAH };
/** Every user-facing string in the generated data. */
const strings = v => (typeof v === "string" ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === "object" ? Object.values(v).flatMap(strings) : []);
const ALL = strings(SETS);
/** The reviewer Note fields in the Markdown (they may run over several lines). */
const notes = () => FILES.flatMap(f => [...md(f).matchAll(/^- \*\*Note:\*\*\s*(.*(?:\n(?!- \*\*|###|##|\s*$).*)*)/gm)].map(m => m[1].replace(/\s+/g, " ").trim()));

beforeAll(() => loadContent());
afterEach(() => setSahabiStart(null));

describe("approved content: counts and shape", () => {
  it("has 52 hadith, 52 Sīrah, 12 Sunnah and 52 duʿā, all approved", () => {
    expect([HADITH.length, SEERAH.length, SUNNAH.length, DUA.length]).toEqual([52, 52, 12, 52]);
    for (const list of [HADITH, SEERAH, SUNNAH, DUA, SAHABAH]) {
      expect(list.every(x => x.draft === false && x.status === "approved")).toBe(true);
    }
    expect(HADITH.every(h => h.title && h.en && h.src)).toBe(true);
    expect(SEERAH.every(s => s.title && s.text && s.src)).toBe(true);
    expect(SUNNAH.every(s => s.title && s.text && s.src)).toBe(true);
    expect(DUA.every(d => d.title && d.ar && d.tr && d.en && d.src)).toBe(true);
    expect(DUA.every(d => /[؀-ۿ]/.test(d.ar) && !/[؀-ۿ]/.test(d.tr))).toBe(true);
    expect(new Set(HADITH.map(h => h.id)).size).toBe(52);
  });
  it("has 18 Companions in the month order, from Abū Bakr, each with a title and 26+ facts and a source per fact", () => {
    expect(SAHABAH.length).toBe(18);
    expect(SAHABAH[0].name).toBe("Abū Bakr al-Ṣiddīq");
    expect(SAHABAH[1].name).toBe("ʿUmar ibn al-Khaṭṭāb");
    expect(SAHABAH[17].name).toBe("Abū Dharr al-Ghifārī");
    for (const c of SAHABAH) {
      expect(c.title).toBeTruthy();
      expect(c.facts.length).toBeGreaterThanOrEqual(26);
      expect(c.facts.length).toBeLessThanOrEqual(31);
      expect(c.srcs.length).toBe(c.facts.length);
      expect(c.facts.every(Boolean)).toBe(true);
    }
    expect(SAHABAH.find(c => c.name === "Saʿīd ibn Zayd").facts.length).toBe(26);
  });
  it("matches the Markdown item counts (the generator is up to date)", () => {
    const count = f => (md(f).match(/^### /gm) || []).length;
    expect(count("hadith.md")).toBe(HADITH.length);
    expect(count("dua.md")).toBe(DUA.length);
    expect(count("sahabah-a.md") + count("sahabah-b.md") + count("sahabah-c.md")).toBe(SAHABAH.reduce((a, c) => a + c.facts.length, 0));
  });
});

describe("approved content: what reaches users", () => {
  it("never carries the reviewer notes", () => {
    const ns = notes();
    expect(ns.length).toBeGreaterThan(20);
    const blob = ALL.join("\n");
    for (const n of ns) expect(blob.includes(n)).toBe(false);
    const keys = list => list.flatMap(Object.keys);
    for (const list of Object.values(SETS)) expect(keys(list).some(k => /note/i.test(k))).toBe(false);
  });
  it("gives sources as book + printed page, without pdf pages or hadith numbers", () => {
    const srcs = [...HADITH, ...SEERAH, ...SUNNAH, ...DUA].map(x => x.src).concat(SAHABAH.flatMap(c => c.srcs));
    expect(srcs.length).toBeGreaterThan(700);
    for (const s of srcs) {
      expect(s).not.toMatch(/pdf/i);
      expect(s).not.toMatch(/\bnos?\.\s*\d/);
      expect(s).toMatch(/\bpp?\.\s*\d/);
    }
    expect(ALL.some(s => /pdf\s*pp?\./i.test(s))).toBe(false);
    expect(DUA.find(d => d.id === "D03").src).toBe("Maʿārif al-Hadīth, vol. 3, p. 159");
  });
  it("has no hadith gradings anywhere", () => {
    const GRADE = /\b(sahih|ṣaḥīḥ|saheeh|hasan|ḥasan|da['ʿ’]?if|ḍaʿīf|daeef|authentic|weak (?:hadith|chain|narration|report|isnad))\b/i;
    expect(ALL.filter(s => GRADE.test(s))).toEqual([]);
    expect(strings([HADITH, DUA.map(({ narrator, collection, src }) => ({ narrator, collection, src }))]).filter(s => /\bweak\b/i.test(s))).toEqual([]);
  });
  it("keeps the collection as the book gives it, without the writer's asides", () => {
    expect(HADITH.find(h => h.id === "H01").collection).toBe("Bukhari and Muslim");
    expect(ALL.some(s => /as the (Arabic reference|English text)|not named in the book/i.test(s))).toBe(false);
  });
});

describe("Sahabi of the month: one fact a day", () => {
  it("in a 31-day month with a 26-fact Companion, shows facts 1–26, never repeats one, then a recap on days 27–31", () => {
    const jan = new Date(2027, 0, 1), idx = SAHABAH.findIndex(c => c.facts.length === 26), C = SAHABAH[idx];
    setSahabiStart(monthIndex(jan) - idx); // makes January 2027 that Companion's month
    const sb = d => thisWeek(new Date(2027, 0, d)).sahabi;
    expect(sb(1).name).toBe(C.name);
    for (let d = 1; d <= 26; d++) {
      const s = sb(d);
      expect(s.recap).toBe(null);
      expect(s.fact).toBe(C.facts[d - 1]);
      expect(s.src).toBe(C.srcs[d - 1]);
      expect(s.day).toBe(d);
      expect(s.earlier.map(e => e.day)).toEqual(Array.from({ length: d - 1 }, (_, i) => d - 1 - i));
    }
    const recaps = [27, 28, 29, 30, 31].map(sb);
    for (const s of recaps) {
      expect(s.fact).toBe(null); // no repeated last fact
      expect(s.recap.highlights.length).toBeGreaterThanOrEqual(3);
      expect(s.recap.highlights.length).toBeLessThanOrEqual(4);
      expect(s.recap.highlights[0]).toEqual({ day: 1, text: C.facts[0], src: C.srcs[0] });
      expect(s.recap.highlights.at(-1)).toEqual({ day: 26, text: C.facts[25], src: C.srcs[25] });
      expect(s.recap.highlights.some(h => h.day > 1 && h.day < 26)).toBe(true); // a middle one
      expect(s.recap).toEqual(recaps[0].recap); // the same every recap day (deterministic)
      expect(s.earlier.length).toBe(26); // the whole month, newest first
      expect(s.earlier[0]).toEqual({ day: 26, text: C.facts[25] });
      expect(s.earlier.at(-1)).toEqual({ day: 1, text: C.facts[0] });
    }
    expect(recapPicks(26)).toEqual([0, 8, 17, 25]);
    expect(recapPicks(31)).toEqual([0, 10, 20, 30]);
    expect(sahabiFactDay(28, 31)).toBe(28);
  });
  it("words the recap from strings.js", () => {
    expect(WEEK_UI.recapTitle("Saʿīd ibn Zayd")).toBe("A look back at Saʿīd ibn Zayd");
    expect(WEEK_UI.recapLead("Saʿīd ibn Zayd")).toBe("This month you met Saʿīd ibn Zayd. Here are a few things to remember.");
  });
  it("a 31-fact Companion uses every fact in a 31-day month and stops at day 28 in February", () => {
    setSahabiStart(monthIndex(new Date(2027, 0, 1))); // Abū Bakr in January 2027, ʿUmar in February
    expect(thisWeek(new Date(2027, 0, 31)).sahabi.fact).toBe(SAHABAH[0].facts[30]);
    const feb = thisWeek(new Date(2027, 1, 28)).sahabi;
    expect(feb.name).toBe(SAHABAH[1].name);
    expect(feb.fact).toBe(SAHABAH[1].facts[27]);
    expect(feb.recap).toBe(null);
  });
  it("starts at Abū Bakr in the user's first month and lists past months with all their facts", () => {
    setSahabiStart(monthIndex(new Date(2026, 10, 1)));
    expect(thisWeek(new Date(2026, 10, 14)).sahabi.name).toBe("Abū Bakr al-Ṣiddīq");
    expect(thisWeek(new Date(2026, 11, 1)).sahabi.name).toBe("ʿUmar ibn al-Khaṭṭāb");
    const past = pastSahabi(new Date(2027, 1, 3));
    expect(past.map(m => m.name)).toEqual([SAHABAH[2].name, SAHABAH[1].name, SAHABAH[0].name]);
    expect(past[0].label).toBe("January 2027");
    expect(past[0].facts).toEqual(SAHABAH[2].facts);
    expect(pastSahabi(new Date(2026, 10, 20))).toEqual([]);
    // 18 months later the cycle comes back to Abū Bakr
    expect(thisWeek(new Date(2028, 4, 1)).sahabi.name).toBe("Abū Bakr al-Ṣiddīq");
  });
});

describe("weekly rotation", () => {
  it("is loaded and stable: the same items Sunday to Saturday, the next item the next Sunday", () => {
    expect(contentReady()).toBe(true);
    const ids = d => { const w = thisWeek(d); return [w.hadith.id, w.dua.id, w.seerah.id]; };
    expect(ids(new Date(2026, 0, 4))).toEqual(["H01", "D01", "S01"]); // the epoch Sunday
    expect(ids(new Date(2026, 0, 10))).toEqual(["H01", "D01", "S01"]); // its Saturday
    expect(ids(new Date(2026, 0, 11))).toEqual(["H02", "D02", "S02"]);
    const sun = new Date(2026, 10, 15);
    const week = Array.from({ length: 7 }, (_, i) => ids(new Date(2026, 10, 15 + i)));
    expect(new Set(week.map(String)).size).toBe(1);
    expect(ids(new Date(2026, 10, 22))).not.toEqual(ids(sun));
    // 52 items: the same item again 52 weeks later, every item once in between
    expect(ids(new Date(2027, 10, 14))).toEqual(ids(sun));
    const year = new Set(Array.from({ length: 52 }, (_, w) => thisWeek(new Date(2026, 10, 15 + 7 * w)).hadith.id));
    expect(year.size).toBe(52);
    // the same call twice gives the same thing (no randomness)
    expect(thisWeek(sun).hadith).toBe(thisWeek(sun).hadith);
  });
  it("gives the monthly Sunnah by calendar month: N01 in January … N12 in December", () => {
    expect(thisWeek(new Date(2026, 0, 20)).sunnah.id).toBe("N01");
    expect(thisWeek(new Date(2026, 10, 1)).sunnah.id).toBe(thisWeek(new Date(2026, 10, 30)).sunnah.id);
    expect(thisWeek(new Date(2027, 11, 5)).sunnah.id).toBe("N12");
  });
});

describe("weekly āyāt (scholar-approved 15 Nov 2026)", () => {
  /** The A01–A52 items of docs/content/ayah.md: { id, fields } (each field on one line). */
  const mdItems = () => md("ayah.md").split(/^### /m).slice(1).map(b => {
    const [id, ...rest] = b.split("\n");
    const f = {};
    for (const l of rest) { const m = l.match(/^- \*\*([A-Za-z]+):\*\* (.*)$/); if (m) f[m[1]] = m[2]; }
    return { id: id.trim(), f };
  });
  it("has 52 approved items, A01–A52 in order, each with a title, Arabic, English and source", () => {
    expect(AYAH.length).toBe(52);
    expect(AYAH.map(a => a.id)).toEqual(Array.from({ length: 52 }, (_, i) => "A" + String(i + 1).padStart(2, "0")));
    expect(new Set(AYAH.map(a => a.id)).size).toBe(52);
    for (const a of AYAH) {
      expect(a.draft).toBe(false);
      expect(a.status).toBe("approved");
      expect(a.title && a.ar && a.en && a.src, a.id).toBeTruthy();
      expect(a.ar).toMatch(/[؀-ۿ]/);
      expect(a.ar).toMatch(/۝[٠-٩]+/); // an āyah-end marker with its number
      expect(a.en).not.toMatch(/[؀-ۿ]/);
      expect(a.src).toMatch(/^Qurʾān \d+:\d+(?:–\d+)? \(.+\)$/);
    }
    expect(Object.keys(AYAH[0]).sort()).toEqual(["ar", "draft", "en", "id", "src", "status", "title"]);
  });
  it("is the Markdown exactly: Arabic byte for byte, Text, Title and Source as given; never the Note or Theme", () => {
    const items = mdItems();
    expect(items.length).toBe(52);
    items.forEach(({ id, f }, i) => {
      const a = AYAH[i];
      expect(a.id).toBe(id);
      expect(Buffer.from(a.ar, "utf8").equals(Buffer.from(f.Arabic, "utf8")), id).toBe(true);
      expect(a.en).toBe(f.Text);
      expect(a.title).toBe(f.Title);
      expect(a.src).toBe(f.Source);
    });
    expect(AYAH[0].src).toBe('Qurʾān 2:197 (Al-Baqarah, "The Cow")');
    // A01 in full (the scholar kept it whole, not only from «وَتَزَوَّدُوْا»)
    expect(AYAH[0].ar.split(" ").length).toBe(30); // the whole of 2:197 (Hajj rulings included)
    expect(AYAH[0].ar.endsWith("۝١٩٧")).toBe(true);
    expect(AYAH[0].en.startsWith("The pilgrimage is (in) the well-known months")).toBe(true);
    // the DigitalKhatt encoding survives (no Unicode normalisation)
    expect(AYAH.some(a => a.ar.includes("࢜") || a.ar.includes("͏"))).toBe(true);
    // the Note and Theme never reach the app
    const ns = notes().filter(Boolean), themes = items.map(x => x.f.Theme);
    const blob = strings(AYAH).join("\n");
    expect(ns.length).toBeGreaterThan(20);
    for (const n of ns) expect(blob.includes(n)).toBe(false);
    for (const t of new Set(themes)) expect(strings(AYAH).includes(t)).toBe(false);
    expect(AYAH.some(a => "theme" in a || "note" in a)).toBe(false);
  });
  it("rotates weekly like the hadith and duʿā: A01 in the epoch week, in order, cycling after 52 weeks", () => {
    const id = d => thisWeek(d).ayah.id;
    expect(id(new Date(2026, 0, 4))).toBe("A01"); // the epoch Sunday
    expect(id(new Date(2026, 0, 10))).toBe("A01"); // its Saturday
    expect(id(new Date(2026, 0, 11))).toBe("A02");
    for (let w = 0; w < 60; w++) {
      const d = new Date(2026, 0, 4 + 7 * w), t = thisWeek(d);
      expect(t.ayah.id).toBe(AYAH[w % 52].id);
      expect(t.ayah.id.slice(1)).toBe(t.hadith.id.slice(1)); // same week index as the hadith
    }
    expect(id(new Date(2027, 0, 3))).toBe("A01"); // week 52 wraps to A01
    expect(id(new Date(2025, 11, 28))).toBe("A52"); // the week before the epoch
  });
});
