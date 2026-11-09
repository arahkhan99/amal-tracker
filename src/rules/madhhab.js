/*
 * Madhhab rules: Asr method, the sunnah list for each fard (with tiers, rak'ahs and placement),
 * Jumu'ah, Witr, chip labels, one-line summaries and the Progress sunnah measure.
 *
 * Source of truth: docs/madhhab-rules.md (reviewed by the user, 5 Nov 2026). Don't change a rule
 * here without that file changing first. Items marked `review: true` are not spelled out in
 * madhhab-rules.md and need the scholar's confirmation before release.
 *
 * Pure data and pure functions: no DOM, no store. Internal prayer keys stay
 * "Fajr" | "Dhuhr" | "Asr" | "Maghrib" | "Isha" (display names live in strings.js).
 */

import { TIER, WITR_TAG, WITR_UI, SUNNAH_NAME, SUNNAH_UI, MADHHAB_NAME, MADHHAB_SUMMARY, MEASURE } from "../strings.js";

export const MADHHABS =["hanafi", "shafii", "maliki", "hanbali"];
export const DEFAULT_MADHHAB = "hanafi";

/**
 * Sunnah tiers. `display` is how a chip is drawn:
 *   "solid"   filled chip (mu'akkadah, and Maliki's raghibah / nafilah mu'akkadah)
 *   "outline" outlined chip (ghayr mu'akkadah)
 *   "hidden"  not shown unless the user turns nafl on in Settings
 * `measured` = counts toward the Progress sunnah measure for madhhabs that measure rak'ahs.
 */
export const TIERS = {
  muakkadah: { id: "muakkadah", display: "solid", measured: true, glossary: "sunnahMuakkadah" },
  ghayr: { id: "ghayr", display: "outline", measured: false, glossary: "ghayrMuakkadah" },
  nafl: { id: "nafl", display: "hidden", measured: false, glossary: "nafl" },
  // Maliki taxonomy (never call these "sunnah mu'akkadah")
  raghibah: { id: "raghibah", display: "solid", measured: true, glossary: "raghibah" },
  nafilahMuakkadah: { id: "nafilahMuakkadah", display: "solid", measured: false, glossary: "nafilahMuakkadah" },
};

/* ---------- sunnah catalogue ----------
 * Item: { id, prayer, when: "before"|"after", rakahs, tier, jumuah?: true, name?: string, review?: true }
 * `id` is stable and unique across madhhabs (it is the key stored in day.sunnah). Same meaning → same id.
 * `name` is an optional named prayer (e.g. Awwabin) – a key into strings.SUNNAH_NAME.
 */
const it = (id, prayer, when, rakahs, tier, extra = {}) => ({ id, prayer, when, rakahs, tier, ...extra });

const HANAFI = [
  it("fajr-b2", "Fajr", "before", 2, "muakkadah"),
  it("dhuhr-b4", "Dhuhr", "before", 4, "muakkadah"),
  it("dhuhr-a2", "Dhuhr", "after", 2, "muakkadah"),
  it("dhuhr-a2n", "Dhuhr", "after", 2, "nafl"), // "2 more after Dhuhr"
  it("asr-b4", "Asr", "before", 4, "ghayr"),
  it("maghrib-a2", "Maghrib", "after", 2, "muakkadah"),
  it("maghrib-awwabin", "Maghrib", "after", 4, "nafl", { name: "awwabin" }), // 4 more after the 2 (6 in all)
  it("isha-b4", "Isha", "before", 4, "ghayr"),
  it("isha-a2", "Isha", "after", 2, "muakkadah"),
  it("witr-a2n", "Isha", "after", 2, "nafl", { afterWitr: true }), // 2 after Witr
  // Jumu'ah replaces Dhuhr's list on Friday (when the user prays Jumu'ah)
  it("jumuah-b4", "Dhuhr", "before", 4, "muakkadah", { jumuah: true }),
  it("jumuah-a4", "Dhuhr", "after", 4, "muakkadah", { jumuah: true }),
];

// Shafi'i and Hanbali: the 10 (Ibn Umar). 4 before Asr as ghayr mu'akkadah is not in madhhab-rules.md → review.
const TEN = [
  it("fajr-b2", "Fajr", "before", 2, "muakkadah"),
  it("dhuhr-b2", "Dhuhr", "before", 2, "muakkadah"),
  it("dhuhr-a2", "Dhuhr", "after", 2, "muakkadah"),
  it("asr-b4", "Asr", "before", 4, "ghayr", { review: true }),
  it("maghrib-a2", "Maghrib", "after", 2, "muakkadah"),
  it("isha-a2", "Isha", "after", 2, "muakkadah"),
  // Jumu'ah list is not in madhhab-rules.md for these schools → review
  it("jumuah-b2", "Dhuhr", "before", 2, "muakkadah", { jumuah: true, review: true }),
  it("jumuah-a2", "Dhuhr", "after", 2, "muakkadah", { jumuah: true, review: true }),
];

// Maliki: raghibah for the 2 before Subh; the rest are nafilah mu'akkadah. Exact list → review.
const MALIKI = [
  it("fajr-b2", "Fajr", "before", 2, "raghibah"),
  it("dhuhr-b4", "Dhuhr", "before", 4, "nafilahMuakkadah", { review: true }),
  it("dhuhr-a4", "Dhuhr", "after", 4, "nafilahMuakkadah", { review: true }),
  it("asr-b4", "Asr", "before", 4, "nafilahMuakkadah", { review: true }),
  it("maghrib-a2", "Maghrib", "after", 2, "nafilahMuakkadah", { review: true }),
  it("isha-a2", "Isha", "after", 2, "nafilahMuakkadah", { review: true }),
];

/** Voluntary prayers not tied to a fard (nafl tier, shown only with nafl on). `prayer: null`. */
export const DAY_NAFL = [
  it("ishraq", null, "after", 2, "nafl", { name: "ishraq", anchor: "Sunrise" }),
  it("duha", null, "after", 2, "nafl", { name: "duha", anchor: "Sunrise" }),
  it("tahajjud", null, "before", 2, "nafl", { name: "tahajjud", anchor: "Fajr" }),
];

const RULES = {
  hanafi: {
    id: "hanafi", asr: "hanafi", sunnah: HANAFI,
    witr: { status: "wajib", inQada: true, rakahs: 3, tier: "wajib" },
    measure: { kind: "rakahs", of: 12, tiers: ["muakkadah"] },
  },
  shafii: {
    id: "shafii", asr: "shafi", sunnah: TEN,
    witr: { status: "sunnahMuakkadah", inQada: false, rakahs: 3, tier: "sunnahMuakkadah" },
    measure: { kind: "rakahs", of: 10, tiers: ["muakkadah"] },
  },
  hanbali: {
    id: "hanbali", asr: "shafi", sunnah: TEN,
    witr: { status: "sunnahMuakkadah", inQada: false, rakahs: 3, tier: "sunnahMuakkadah" },
    measure: { kind: "rakahs", of: 10, tiers: ["muakkadah"] },
  },
  maliki: {
    id: "maliki", asr: "shafi", sunnah: MALIKI,
    // Witr is the only daily prayer formally categorised as Sunnah for Malikis
    witr: { status: "sunnah", inQada: false, rakahs: 3, tier: "sunnah" },
    measure: { kind: "raghibahWitr", of: 2, tiers: ["raghibah"] },
  },
};

/** The rule object for a madhhab id (falls back to Hanafi). */
export function getMadhhab(id) { return RULES[id] || RULES[DEFAULT_MADHHAB]; }

/** Madhhab id from a settings object or a whole state (S). */
export function madhhabOf(x) {
  const id = x?.settings ? x.settings.madhhab : x?.madhhab;
  return RULES[id] ? id : DEFAULT_MADHHAB;
}

/** "hanafi" (later, shadow twice the length) or "shafi" (earlier) — the value times.js reads as settings.asr. */
export function asrMethod(madhhab) { return getMadhhab(madhhab).asr; }

/** Witr rule: { status: "wajib"|"sunnahMuakkadah"|"sunnah", inQada, rakahs, tier }. Witr is tracked for every madhhab. */
export function witrRule(madhhab) { return getMadhhab(madhhab).witr; }

/** Whether a missed Witr is owed (counted in Make-ups). Only Hanafi. */
export function witrInQada(madhhab) { return getMadhhab(madhhab).witr.inQada; }

/** Every sunnah item that exists for a madhhab (including Jumu'ah and nafl), in display order. */
export function catalogue(madhhab) { return getMadhhab(madhhab).sunnah; }

const ALL_ITEMS = new Map();
for (const m of MADHHABS) for (const x of RULES[m].sunnah) if (!ALL_ITEMS.has(x.id)) ALL_ITEMS.set(x.id, x);
for (const x of DAY_NAFL) ALL_ITEMS.set(x.id, x);
/** Find an item by id in any madhhab's list (for reading old logs after a madhhab change). */
export function itemById(id, madhhab) {
  return getMadhhab(madhhab).sunnah.find(x => x.id === id) || DAY_NAFL.find(x => x.id === id) || ALL_ITEMS.get(id) || null;
}

/** True when the date is a Friday. */
export const isFriday = date => !!date && date.getDay() === 5;

/**
 * The sunnah chips for one fard, in order (before → after).
 * opts: { date?: Date, jumuah?: boolean (default true: on Friday Dhuhr uses the Jumu'ah list),
 *         ghayr?: boolean (default true), nafl?: boolean (default false) }
 * Hidden tiers are filtered out. Witr is NOT in this list (see witrRule).
 */
export function sunnahFor(madhhab, prayer, opts = {}) {
  const { date = null, jumuah = true, ghayr = true, nafl = false } = opts;
  const all = getMadhhab(madhhab).sunnah.filter(x => x.prayer === prayer);
  // On Friday (when the user prays Jumu'ah) Dhuhr's list is replaced by the Jumu'ah list, if the madhhab has one
  const jum = jumuah && isFriday(date) && all.some(x => x.jumuah);
  return all.filter(x => {
    if (!!x.jumuah !== jum) return false;
    if (x.tier === "ghayr" && !ghayr) return false;
    if (x.tier === "nafl" && !nafl) return false;
    return true;
  });
}

/** All visible chips for a day, keyed by prayer: { Fajr: [...], Dhuhr: [...], ..., day: [...DAY_NAFL if nafl] }. */
export function sunnahForDay(madhhab, opts = {}) {
  const out = {};
  for (const p of ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]) out[p] = sunnahFor(madhhab, p, opts);
  out.day = opts.nafl ? DAY_NAFL.slice() : [];
  return out;
}

/**
 * Whether a sunnah chip may be logged given its fard's status.
 * - Missed (or excused): no chips — its sunnah isn't made up with it.
 * - Made up: only Fajr's "2 before" (the Hanafi view that it's made up with the fard before zawal; optional).
 * - Prayed (congregation / on time) or not logged yet: allowed.
 * Items with no fard (DAY_NAFL) are always allowed unless the whole day is excused.
 */
export function sunnahAllowed(item, status, { excusedDay = false } = {}) {
  if (!item) return false;
  if (excusedDay || status === "excused") return false;
  if (!item.prayer) return true;
  if (status === "missed") return false;
  if (status === "madeup") return item.prayer === "Fajr" && item.when === "before";
  return true;
}

/**
 * The daily target of the Progress sunnah measure.
 * Returns { kind: "rakahs", of } (Hanafi 12; Shafi'i/Hanbali 10; Friday uses the Jumu'ah list when jumuah is on)
 * or { kind: "raghibahWitr", of: 2 } for Maliki (Raghibah done + Witr done).
 */
export function measureTarget(madhhab, { date = null, jumuah = true } = {}) {
  const r = getMadhhab(madhhab);
  if (r.measure.kind === "raghibahWitr") return { kind: "raghibahWitr", of: 2 };
  let of = 0;
  for (const p of ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]) {
    for (const x of sunnahFor(madhhab, p, { date, jumuah, ghayr: false, nafl: false })) if (r.measure.tiers.includes(x.tier)) of += x.rakahs;
  }
  return { kind: "rakahs", of };
}

/** The items that count toward the measure on a date (Maliki: the raghibah; Witr is added separately). */
export function measuredItems(madhhab, { date = null, jumuah = true } = {}) {
  const r = getMadhhab(madhhab), out = [];
  for (const p of ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]) {
    for (const x of sunnahFor(madhhab, p, { date, jumuah, ghayr: false, nafl: false })) if (r.measure.tiers.includes(x.tier)) out.push(x);
  }
  return out;
}

/* ---------- labels (wording comes from strings.js) ---------- */

/** Chip text for an item: "2 before", "4 after", "2 after Witr", or a named prayer ("Awwābīn 4"). */
export function chipLabel(item) {
  if (item.name && SUNNAH_NAME[item.name]) return `${SUNNAH_NAME[item.name]} ${item.rakahs}`;
  if (item.afterWitr) return SUNNAH_UI.afterWitr(item.rakahs);
  return item.when === "before" ? SUNNAH_UI.before(item.rakahs) : SUNNAH_UI.after(item.rakahs);
}

/**
 * Tier wording for a tier id: { name, short, gloss, line, display }.
 * Maliki chip labels follow its own taxonomy: Raghībah (Fajr), Nāfilah muʾakkadah (the others), Sunnah (Witr).
 */
export function tierLabel(tier) {
  return { ...(TIER[tier] || TIER.nafl), display: TIERS[tier]?.display || "solid" };
}

/** Witr chip: { chip: "Witr 3", tag: "wājib"|"sunnah"|"Sunnah", line, settingsLine, row, tier }. */
export function witrLabel(madhhab) {
  const m = getMadhhab(madhhab).id, w = witrRule(m);
  return { chip: WITR_UI.chip(w.rakahs), tag: WITR_TAG[m], line: WITR_UI.line[m], settingsLine: WITR_UI.settingsLine[m], row: WITR_UI.rowLabel[m], tier: w.tier };
}

/** Display name and one-line summary (setup + Settings): { id, name, summary, isDefault }. */
export function madhhabInfo(madhhab) {
  const m = getMadhhab(madhhab).id;
  return { id: m, name: MADHHAB_NAME[m], summary: MADHHAB_SUMMARY[m], isDefault: m === DEFAULT_MADHHAB };
}

/** All four madhhabs for a picker, default first. */
export function madhhabOptions() { return MADHHABS.map(madhhabInfo); }

/** One-line summary for a madhhab. */
export const summary = madhhab => madhhabInfo(madhhab).summary;

/** Measure text: "8/12" (rak'ah measure) or "Raghībah + Witr" heading with "1/2" value for Maliki. */
export function measureLabel(madhhab, got, of) {
  const k = getMadhhab(madhhab).measure.kind;
  return k === "raghibahWitr"
    ? { title: MEASURE.raghibahWitr, value: MEASURE.raghibahWitrValue(got, of) }
    : { title: MEASURE.emphasised, value: MEASURE.rakahs(got, of) };
}

/** The tier key shown under chips for a madhhab (in order): e.g. ["muakkadah","ghayr","wajib"] for Hanafi. */
export function tierKey(madhhab, { ghayr = true, nafl = false } = {}) {
  const m = getMadhhab(madhhab);
  const tiers = [...new Set(m.sunnah.map(x => x.tier))].filter(t => (t !== "ghayr" || ghayr) && (t !== "nafl" || nafl));
  return [...tiers, m.witr.tier];
}

/**
 * Isha "best before": the middle of the night, counted from Maghrib to the next Fajr.
 * Pure: pass the two Dates. (times.js ishaBestBefore() wraps it with real prayer times.)
 */
export function middleOfNight(maghrib, nextFajr) {
  return new Date(maghrib.getTime() + (nextFajr.getTime() - maghrib.getTime()) / 2);
}
