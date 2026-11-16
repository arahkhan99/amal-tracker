/*
 * Moon-sighting committees: the list, the offline cache and the date maths for "follow a committee".
 * No Firebase here (cloud.js fetches and saves); this file is pure apart from localStorage, so it is easy to test.
 *
 * Firestore:  hijriCommittees/{id}                    { name, editors: [uid, ...] }
 *             hijriCommittees/{id}/months/{YYYY-MM}   { startDate: "YYYY-MM-DD", updatedBy, updatedAt, note }
 * The month id is the Hijri year and a zero-padded month number, e.g. "1448-05".
 */

/** The committees Zad offers. Add one here and create its Firestore document to extend the list. */
export const COMMITTEES = [
  { id: "chc-na", name: "Central Hilal Committee of North America", short: "CHC North America", regions: ["US", "CA"] },
];
export const committeeById = id => COMMITTEES.find(c => c.id === id) || null;

const CACHE_KEY = "zad-hijri-committees";
let cache = null; // { [id]: { months: { "1448-05": { startDate, note, updatedAt } }, offset: n|null, fetchedAt } }

function load() {
  if (cache) return cache;
  try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}") || {}; } catch (e) { cache = {}; }
  return cache;
}
function save() { try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch (e) { /* offline cache is best effort */ } }
/** For tests: forget the in-memory copy so the next read goes back to localStorage. */
export function resetCommitteeCache() { cache = null; }

export const monthId = (y, m) => `${y}-${String(m).padStart(2, "0")}`;
export const parseMonthId = id => { const [y, m] = String(id).split("-").map(Number); return { y, m }; };

/** Day number (days since 1970) for a "YYYY-MM-DD" key, ignoring time zones and DST. */
export const dayNum = key => { const [y, m, d] = key.split("-").map(Number); return Math.round(Date.UTC(y, m - 1, d) / 86400000); };
export const keyOfDayNum = n => new Date(n * 86400000).toISOString().slice(0, 10);
const validKey = k => typeof k === "string" && /^\d{4}-\d{2}-\d{2}$/.test(k) && keyOfDayNum(dayNum(k)) === k;

export function committeeData(id) { return load()[id] || { months: {}, offset: null, fetchedAt: 0 }; }

/**
 * Replace a committee's cached months with what the server returned.
 * `docs` is [{ id: "1448-05", startDate, note?, updatedAt? }]. Bad rows are ignored.
 * `calc(dayNum)` gives the calculated {y, m, d}; it is used to work out the cached offset.
 */
export function storeCommittee(id, docs, calc, now = Date.now()) {
  const months = {};
  for (const d of docs || []) if (/^\d{4}-\d{2}$/.test(d.id) && validKey(d.startDate)) months[d.id] = { startDate: d.startDate, note: d.note || "", updatedAt: d.updatedAt || 0 };
  load()[id] = { months, offset: latestOffset(months, calc), fetchedAt: now };
  save();
  return cache[id];
}
/** Add or replace one month locally (after an editor saves it). */
export function putMonth(id, hy, hm, startDate, calc, note = "") {
  const cur = committeeData(id), months = { ...cur.months, [monthId(hy, hm)]: { startDate, note, updatedAt: Date.now() } };
  load()[id] = { months, offset: latestOffset(months, calc), fetchedAt: cur.fetchedAt };
  save();
}

// The parsed, start-ordered months, cached per months object (storeCommittee and putMonth always build a new
// object, so a cached list never goes stale); committeeParts runs on every Hijri label, this keeps it from re-sorting.
const SORTED = new WeakMap();
const sorted = months => {
  let list = SORTED.get(months);
  if (!list) { list = Object.entries(months).map(([id, v]) => ({ id, ...parseMonthId(id), start: dayNum(v.startDate) })).sort((a, b) => a.start - b.start); SORTED.set(months, list); }
  return list;
};

/**
 * How many days to add to a calculated date so it lines up with a committee start.
 * Finds the nearby delta where the calculated calendar shows day 1 (0, then -1, +1, -2, +2, -3, +3).
 * -1 means the calculation is a day ahead of the committee; +1 means a day behind.
 */
export function startOffset(startNum, calc) {
  for (const delta of [0, -1, 1, -2, 2, -3, 3]) if (calc(startNum + delta)?.d === 1) return delta;
  return 0;
}
function latestOffset(months, calc) {
  const list = sorted(months);
  return list.length && calc ? startOffset(list[list.length - 1].start, calc) : null;
}

/**
 * The committee's Hijri date for a day.
 *  - Between two known month starts: counted from the start (day = days since + 1).
 *  - After the latest known start (the next one isn't decided yet): calculated date plus the cached offset,
 *    so the 29/30 boundary is predicted until the committee's decision arrives.
 * source: "committee" (confirmed by a month start within the last 30 days or between two starts),
 *         "fallback" (calculation + offset, no recent decision), "calc" (the committee has no data at all).
 */
export function committeeParts(data, g, calc) {
  const list = sorted(data?.months || {});
  if (!list.length) return { ...calc(g), source: "calc" };
  const next = list.findIndex(r => r.start > g);
  const prev = next === -1 ? list[list.length - 1] : next > 0 ? list[next - 1] : null;
  if (prev && next !== -1) {
    const diff = g - prev.start;
    if (diff <= 29) return { y: prev.y, m: prev.m, d: diff + 1, source: "committee" };
    // A missing month in between: fall through to the calculated fallback
  }
  const offset = Number.isInteger(data.offset) ? data.offset : startOffset((prev || list[0]).start, calc);
  const near = prev && g - prev.start >= 0 && g - prev.start <= 29;
  return { ...calc(g + offset), source: near ? "committee" : "fallback" };
}

/** Which Hijri month an editor should set next, given today's committee date (late in a month means the next one). */
export function monthToSet(parts) {
  const { y, m, d } = parts;
  if (d >= 25) return m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 };
  return { y, m };
}

/**
 * The editor sheet's month choices around today's committee date: { t (preselected), months: [prev, t, next] }.
 * Pass the committee's date without the editor's own ± adjustment. Null when there is no date (no Intl calendar).
 */
export function editorMonths(today) {
  if (!today || !today.y || !today.m || !today.d) return null;
  const t = monthToSet(today);
  const prev = t.m === 1 ? { y: t.y - 1, m: 12 } : { y: t.y, m: t.m - 1 }, next = t.m === 12 ? { y: t.y + 1, m: 1 } : { y: t.y, m: t.m + 1 };
  return { t, months: [prev, t, next] };
}

/** Does `key` (the 1st) lie within 3 days of the calculated 1st of that month? A typo guard for the editor sheet. */
export function plausibleStart(key, hy, hm, calc) {
  if (!validKey(key)) return false;
  const n = dayNum(key);
  for (let delta = -3; delta <= 3; delta++) { const p = calc(n + delta); if (p && p.d === 1 && p.y === hy && p.m === hm) return true; }
  return false;
}

/** IANA zones of the US and Canada (America/* zones of other countries, e.g. America/Mexico_City or America/Sao_Paulo, are not). */
const US_CA_TZ = /^(America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Detroit|Boise|Indiana\/.+|Indianapolis|Fort_Wayne|Knox_IN|Kentucky\/.+|Louisville|North_Dakota\/.+|Menominee|Juneau|Sitka|Metlakatla|Yakutat|Nome|Adak|Atka|Shiprock|Toronto|Montreal|Vancouver|Edmonton|Winnipeg|Halifax|St_Johns|Regina|Swift_Current|Moncton|Glace_Bay|Goose_Bay|Nipigon|Thunder_Bay|Rainy_River|Atikokan|Coral_Harbour|Creston|Dawson|Dawson_Creek|Fort_Nelson|Yellowknife|Inuvik|Cambridge_Bay|Rankin_Inlet|Resolute|Iqaluit|Pangnirtung|Whitehorse)|Pacific\/Honolulu|US\/.+|Canada\/.+|EST5EDT|CST6CDT|MST7MDT|PST8PDT)$/;
/** A zone that says nothing about where the device is (unset, UTC, Etc/*): the language region decides instead. */
const VAGUE_TZ = /^(|UTC|GMT|UCT|Universal|Zulu|Etc\/.*)$/;

/**
 * Suggested method: the US and Canada get the CHC; everyone else gets calculated + manual adjustment.
 * The time zone decides (an en-US phone set to Europe/London is in the UK); the language region
 * (en-US, fr-CA) is used only when the time zone is missing or vague.
 */
export function suggestedHijri({ lang = "", tz = "" } = {}) {
  const region = (lang.split(/[-_]/)[1] || "").toUpperCase();
  const northAm = VAGUE_TZ.test(tz || "") ? region === "US" || region === "CA" : US_CA_TZ.test(tz);
  if (northAm) return { method: "committee", committee: "chc-na" };
  return { method: "umalqura", committee: "" };
}

/**
 * suggestedHijri for this device, worked out once and then reused (it backs every Hijri label until the user
 * picks a method, so reading the time zone each time is wasted work). `env()` returns { lang, tz }.
 * reset() forgets it, e.g. when the app comes back to the foreground after a trip across time zones.
 */
export function regionCache(env) {
  let memo = null;
  return {
    get() {
      if (!memo) { let e = {}; try { e = env() || {}; } catch (err) { /* no Intl / navigator: language-free default */ } memo = suggestedHijri(e); }
      return memo;
    },
    reset() { memo = null; },
  };
}
