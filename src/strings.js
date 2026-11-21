/*
 * Every UI label in Zad, in one place.
 *
 * Wording rules (docs/PROGRESS.md "User picks", 7 Nov 2026):
 * - "Amal" is shown as "Good Deeds" and "Qada" as "Make-ups", everywhere (bottom bar too).
 * - Every other Arabic term stays, with a "?" / ⓘ explainer from glossary.js.
 * - Arabic terms in English text use LIGHT academic transliteration: macrons plus ʿ (U+02BF) and ʾ (U+02BE),
 *   no dots under letters: Salāh, Fajr, Zuhr, ʿAsr, Maghrib, ʿIshāʾ, Jamāʿah, Qurʾān, Ākhirah, "As-salāmu ʿalaykum".
 * - Dua and adhkar TEXT transliterations (the content itself) stay simple, as written in docs/.
 *
 * Internal keys never change (prayer keys stay "Fajr" | "Dhuhr" | "Asr" | "Maghrib" | "Isha";
 * view ids stay "qada", amal ids stay "quran" etc.). Only what the user reads lives here.
 *
 * Strings that take values are functions. Strings that contain HTML say so in a comment;
 * everything else is plain text (escape user data yourself with util.esc).
 */

/** "1 prayer", "2 prayers". */
export const plural = (n, one, many = one + "s") => `${typeof n === "number" ? n.toLocaleString("en") : n} ${+n === 1 ? one : many}`;

/* ---------- app ---------- */
export const APP = {
  name: "Zad",
  mission: "Helping Muslims intentionally prepare provisions for the Ākhirah through consistency, accountability, and daily worship.",
  free: "Zad is free, with no ads.",
  madeWithCare: "Zad · made with care",
  version: v => `Version ${v}`,
  draftFlag: "Draft, pending scholar review",
};

/* ---------- bottom bar. View ids stay as they were: "home" is the Today tab, "tools" the Read tab (routes.js maps the public names) ---------- */
export const NAV = { home: "Today", tools: "Read", progress: "Progress", community: "Community", qada: "Make-ups", calendar: "Calendar", settings: "Settings" };

/* ---------- common ---------- */
export const COMMON = {
  cancel: "Cancel", save: "Save", done: "Done", edit: "Edit", clear: "Clear", skip: "Skip", undo: "Undo",
  continue: "Continue", back: "Back", close: "Close", gotIt: "Got it", notNow: "Not now", search: "Search",
  on: "On", off: "Off", optional: "Optional", today: "Today", yesterday: "Yesterday", tomorrow: "tomorrow",
  now: "now", alhamdulillah: "Alhamdulillah.", whatDoesThisMean: "What does this mean?",
  nOfM: (n, m) => `${n} of ${m}`,
  days: n => `${n} ${n === 1 ? "day" : "days"}`,
  prayers: n => `${n} ${n === 1 ? "prayer" : "prayers"}`,
  minutes: n => `${n} min`,
};

/* ---------- prayers ---------- */
/** Display names. Keys are the internal prayer keys. */
export const PRAYER_NAME = {
  Fajr: "Fajr", Sunrise: "Sunrise", Dhuhr: "Zuhr", Asr: "ʿAsr", Maghrib: "Maghrib", Isha: "ʿIshāʾ",
  Jumuah: "Jumuʿah", Witr: "Witr",
};
/** Display name for a prayer key; on a Friday with Jumu'ah on, Dhuhr shows as Jumuʿah. */
export function prayerName(p, { date = null, jumuah = false } = {}) {
  if (p === "Dhuhr" && jumuah && date && date.getDay() === 5) return PRAYER_NAME.Jumuah;
  return PRAYER_NAME[p] || p;
}

/** Prayer statuses (keys are the stored values). */
export const STATUS = { congregation: "In congregation", ontime: "On time", madeup: "Made up", missed: "Missed", excused: "Excused" };
/** Short forms for segmented controls (catch-up sheet). */
export const STATUS_SHORT = { congregation: "Congregation", ontime: "On time", madeup: "Made up", missed: "Missed", excused: "Excused" };
/** One-line help under each status in the log sheet. */
export const STATUS_HELP = {
  congregation: "Prayed with the congregation",
  ontime: "Prayed within its time",
  madeup: "Late, but before the next Fajr · not added to make-ups",
  missed: "Adds 1 to your make-ups",
  excused: "Hayd or nifās · not missed, nothing owed",
};
export const STATUS_EXTRA = { notLogged: "Not logged", tapToLog: "Tap to log", log: "Log", prayed: "Prayed", openNow: "Open now" };

/** Witr states (day.witr). */
export const WITR_STATUS = { done: "Prayed", madeup: "Made up", missed: "Missed" };

/* ---------- madhhab ---------- */
export const MADHHAB_NAME = { hanafi: "Hanafī", shafii: "Shāfiʿī", maliki: "Mālikī", hanbali: "Hanbalī" };
/** One-line summaries for setup and Settings (docs/madhhab-rules.md). */
export const MADHHAB_SUMMARY = {
  hanafi: "Later ʿAsr · 12 emphasised sunnahs · Witr made up if missed",
  shafii: "Earlier ʿAsr · 10 emphasised sunnahs · Witr is sunnah",
  hanbali: "Earlier ʿAsr · 10 emphasised sunnahs · Witr is sunnah",
  maliki: "Earlier ʿAsr · Witr is sunnah · 2 before Fajr are raghībah",
};
export const MADHHAB_UI = {
  title: "Madhhab",
  lead: "Sets ʿAsr time, which sunnah prayers are listed, and how Witr is counted.",
  defaultTag: "DEFAULT",
  fine: "Changing madhhab only changes what's listed from today on. Past logs stay as they are. Sunnah lists for each madhhab are reviewed by scholars.",
  changed: m => `Madhhab set to ${MADHHAB_NAME[m] || m}`,
  // one-time question after the update that made Hanafī the default (settings.madhhabAsk)
  askTitle: "Zad now uses the Hanafī ʿAsr by default",
  askLead: "Your ʿAsr time is now the later, Hanafī time. If you follow another madhhab, choose it here.",
  askKeep: "Keep Hanafī",
  askChoose: "Choose madhhab",
};

/** ʿAsr method labels (settings.asr). */
export const ASR_LABEL = { shafi: "Standard (Shāfiʿī, Mālikī, Hanbalī)", hanafi: "Hanafī" };
export const ASR_UI = {
  title: "ʿAsr time", lead: "Decides when ʿAsr begins.",
  standard: "Standard", standardSub: "Shāfiʿī, Mālikī, Hanbalī · earlier ʿAsr",
  hanafi: "Hanafī", hanafiSub: "Later ʿAsr time",
  fromMadhhab: m => `${m === "hanafi" ? "Hanafī (later)" : "Standard (earlier)"} · from your madhhab`,
  updated: "Prayer times updated",
};

/* ---------- sunnah tiers and chips ---------- */
/** Tier names. Maliki uses its own taxonomy (raghibah / nafilahMuakkadah) — never "sunnah muʾakkadah". */
export const TIER = {
  fard: { name: "Fard", gloss: "Obligatory", line: "The five prayers · your headline measure" },
  // Witr's tier (19 Nov 2026: the word wājib is never shown; Witr is tracked and made up exactly as before)
  wajib: { name: "Witr", gloss: "", line: "Tracked on its own" },
  muakkadah: { name: "Sunnah muʾakkadah", short: "Muʾakkadah", gloss: "Emphasised", line: "The daily 12, plus 4 before and 4 after Jumuʿah" },
  ghayr: { name: "Sunnah ghayr muʾakkadah", short: "Ghayr muʾakkadah", gloss: "Non-emphasised", line: "4 before ʿAsr, 4 before ʿIshāʾ" },
  nafl: { name: "Nafl", short: "Nafl", gloss: "Optional extras", line: "Off by default · Duhā, Tahajjud, Awwābīn…" },
  raghibah: { name: "Raghībah", short: "Raghībah", gloss: "Above a voluntary prayer, just below a sunnah", line: "The 2 before Fajr" },
  nafilahMuakkadah: { name: "Nāfilah muʾakkadah", short: "Nāfilah muʾakkadah", gloss: "Emphasised voluntary", line: "Before and after Zuhr, before ʿAsr, after Maghrib and ʿIshāʾ" },
  sunnah: { name: "Sunnah", short: "Sunnah", gloss: "Sunnah", line: "Witr" },
  sunnahMuakkadah: { name: "Sunnah muʾakkadah", short: "Muʾakkadah", gloss: "Emphasised", line: "Witr" },
};
/** The small tag on a Witr chip, by madhhab (Hanafī: wājib; Mālikī: Sunnah; others: sunnah). */
export const WITR_TAG = { hanafi: "", shafii: "sunnah", hanbali: "sunnah", maliki: "Sunnah" };
export const WITR_UI = {
  name: "Witr",
  chip: n => `Witr ${n}`,
  title: n => `Witr · ${plural(n, "rakʿah")}`,
  line: {
    hanafi: "After ʿIshāʾ, before Fajr",
    shafii: "Sunnah muʾakkadah, after ʿIshāʾ",
    hanbali: "Sunnah muʾakkadah, after ʿIshāʾ",
    maliki: "The one daily prayer counted as Sunnah, after ʿIshāʾ",
  },
  settingsLine: {
    hanafi: "Shown on ʿIshāʾ, counted in make-ups",
    shafii: "Sunnah muʾakkadah · shown on ʿIshāʾ, not owed if missed",
    hanbali: "Sunnah muʾakkadah · shown on ʿIshāʾ, not owed if missed",
    maliki: "Sunnah · shown on ʿIshāʾ, not owed if missed",
  },
  rowLabel: { hanafi: "Witr", shafii: "Witr · sunnah", hanbali: "Witr · sunnah", maliki: "Witr · Sunnah" },
  missedToast: "Witr missed · 1 added to Make-ups",
};
/** Named voluntary prayers (madhhab item.name). */
export const SUNNAH_NAME = { awwabin: "Awwābīn", ishraq: "Ishrāq", duha: "Duhā", tahajjud: "Tahajjud" };
export const SUNNAH_UI = {
  before: n => `${n} before`,
  after: n => `${n} after`,
  afterWitr: n => `${n} after Witr`,
  rakahs: n => `${n} rakʿah${n === 1 ? "" : "s"}`,
  rakahsBefore: n => `${n}, before the fard`,
  rakahsAfter: n => `${n}, after the fard`,
  withPrayer: p => `Sunnah with ${p}`,
  legend: "What the marks mean · long-press any chip",
  countsToward: "Counts toward", countsTowardValue: "Sunnah (separate from fard)",
  shown: "Shown", shownAlways: "Always shown", shownDefault: "On by default · can hide", shownOff: "Off by default",
  markPrayed: "Mark as prayed",
  hideGhayr: "Hide ghayr muʾakkadah chips",
  naflHidden: "Nafl extras are hidden.", turnOnInSettings: "Turn on in Settings",
  notAfterMissed: "A missed prayer's sunnah isn't made up with it.",
  jumuahTag: "JUM",
  pageTitle: "Sunnah prayers",
  pageIntro: m => `${MADHHAB_NAME[m] || m} list · change in Settings → Madhhab. Sunnah is counted apart from fard; fard stays your main measure.`,
  muakkadahSetting: "The 12 emphasised, plus Jumuʿah 4 + 4 · always shown",
  ghayrSetting: "4 before ʿAsr, 4 before ʿIshāʾ",
  naflSetting: "Extra 2 after Zuhr, Awwābīn, 2 after Witr, Duhā, Tahajjud…",
  tiersOn: n => `${n} ${n === 1 ? "tier" : "tiers"} on`,
};
/** The Progress sunnah measure label: "x/12", "x/10", or Raghībah + Witr for Mālikī. */
export const MEASURE = {
  rakahs: (got, of) => `${got}/${of}`,
  rakahsLong: (got, of) => `${got} of ${of} rakʿahs`,
  raghibahWitr: "Raghībah + Witr",
  raghibahWitrValue: (got, of = 2) => `${got}/${of}`,
  emphasised: "Emphasised",
};

/* ---------- Isha / times ---------- */
export const TIMES = {
  bestBefore: t => `Best before ${t}`,
  toMiddle: "to the middle of the night",
  openUntilFajr: "open until Fajr",
  isOpen: (p, t) => `${p} is open · since ${t}`,
  windowEnds: left => `Its window ends in ${left}`,
  next: (p, t, tomorrow) => `Next: ${p} at ${t}${tomorrow ? " tomorrow" : ""}`,
  source: (method, loc, isDefault) => `Calculated on your phone · ${method} · ${loc}${isDefault ? " (default, set your location in Settings)" : ""}`,
  hm: (h, m) => `${h ? h + "h " : ""}${m}m`,
};

/* ---------- Home ---------- */
export const HOME = {
  greeting: "As-salāmu ʿalaykum",
  greetingName: name => `As-salāmu ʿalaykum, ${name}`, // plain-text form (e.g. screen readers)
  greetingLine1: "As-salāmu ʿalaykum,", // Home shows the name on its own second line
  salahToday: "Salāh today",
  todaysPrayers: "Today's prayers",
  nOfFivePrayed: n => `${n} of 5 prayed`,
  nOfFiveLogged: n => `${n} of 5 logged`,
  tapToChange: "Tap a prayer to change it. Earlier days are in the calendar.",
  notLoggedYet: label => `${label} not logged yet.`, // followed by TIMES.windowEnds
  lastNights: p => `Last night's ${p}`,
  reminderSent: "Reminder sent.",
  allLogged: "All five prayers logged. Alhamdulillah.",
  nowSuffix: " · now",
  madeItUp: "I made it up",
  stillTime: "Still time, before Fajr",
  madeUpAt: t => `made up at ${t}`,
  endedAt: t => `ended at ${t}`,
  loggedAt: t => `logged ${t}`,
  thisWeek: "This week",
  prayedOf: (n, m) => `${n}/${m}`,
  prayedWord: "prayed",
  reflectionSrc: src => `${src} · A new āyah or hadīth each morning`,
  chipLegendFoot: (loc, method, asr, chips = true) => `${loc} · ${method} · ${asr} ʿAsr${chips ? " · hold a chip for details" : ""}`,
  wantMoreTitle: "Want more from Zad?",
  wantMoreSub: "Sunnah prayers, Good Deeds, make-ups, reading and weekly reminders are in Settings → Features.",
};

/* ---------- Today tab: chapters Now · Today (views/home.js), the calendar and day sheet (views/calendar.js) ---------- */
export const TODAY = {
  chapters: { now: "Now", today: "Today" },
  chaptersLabel: "Chapters",
  now: "Now", next: "Next", lastNight: "Last night",
  left: "left", leftUntil: t => `left · until ${t}`, leftLine: (left, t) => `${left} left · until ${t}`,
  // sunrise: Fajr's time ends then (after it, Fajr is a make-up). A row on Today, never logged or counted.
  leftUntilSunrise: t => `left · until sunrise ${t}`, leftLineSunrise: (left, t) => `${left} left · until sunrise ${t}`,
  endsAtSunrise: t => `Ends at sunrise ${t}`, sunrise: "Sunrise", sunriseSub: "Fajr's time ends",
  bestBefore: t => `left · best before ${t}`, untilFajr: t => `left · until Fajr at ${t}`,
  in: left => `in ${left}`,
  hm: (h, m) => (h ? `${h} h ${m} min` : `${m} min`),
  button: { congregation: "Prayed in congregation", ontime: "Prayed on time" },
  other: "Other",
  logged: p => `${p} logged`,
  loggedAt: t => `Logged at ${t}`,
  change: "Change",
  prayedAs: { congregation: "Prayed in congregation", ontime: "Prayed on time", madeup: "Made up later", missed: "Missed", excused: "Excused" },
  guide: "Tap a prayer when you've prayed it",
  sunnahBefore: p => `Sunnah with ${p}`, optional: "optional",
  afterSalah: "Adhkār after ṣalāh", afterSalahSub: "In Read",
  thisWeek: "This week", prayedOfDue: (n, m) => `${n} of ${m}`, prayedWord: "prayed",
  todayTitle: "Today", nOf5: n => `${n} of 5`,
  notLogged: "Not logged", log: "Log", withWitr: "with Witr", nowLeft: left => `Now · ${left} left`,
  sunnahN: n => `${n} sunnah`,
  stillTime: "Missed · still time before Fajr",
  goodDeeds: "Good deeds",
  // "Make-ups · 8 left" on the Today chapter (views/home.js, today.makeupsLine)
  makeups: "Make-ups",
  makeupsLeft: (prayers, fasts) => {
    const n = x => x.toLocaleString("en");
    if (!fasts) return `${n(prayers)} left`;
    const f = `${n(fasts)} ${fasts === 1 ? "fast" : "fasts"}`;
    return prayers ? `${n(prayers)} ${prayers === 1 ? "prayer" : "prayers"} · ${f}` : f;
  },
  makeupsClear: "all caught up",
  // "Make up now" on a missed prayer's row (today.makeUpNowOn)
  mkNowTitle: p => `Make up ${p} now?`,
  mkNowSub: "Its time has passed; you can still pray it",
  yesterday: n => `Yesterday: ${n} not logged`,
  calendar: "Past days", settings: "Settings",
  // a prayer's options sheet (long press or ⋯ on Today)
  otherTitleSub: (day, a, b) => `${day} · ${a} – ${b}`,
  otherLabel: { congregation: "In congregation", ontime: "On time", madeup: "Made up later", missed: "Missed", excused: "Excused" },
  otherSub: { congregation: "Prayed with the congregation", ontime: "Prayed within its time", madeup: "Prayed after its time, before the next Fajr", missed: "Adds one to your make-ups", missedNoMakeups: "Its time passed and it wasn't prayed", excused: "Hayḍ or nifās · nothing is owed" },
  otherNote: "One tap logs it. You can change it later.",
  madeUpEarly: p => `${p} can be marked made up once its time has ended.`,
  // excused days on Today
  excusedDays: "Excused days", excusedToday: "Excused today", dayN: n => `day ${n}`,
  rememberNote: p => `A few minutes of dhikr and duʿāʾ at ${p} time. Nothing is owed.`,
  onlyYou: "Only you can see this.", endExcused: "End excused days", notExcused: "Not excused",
  // nothing open (between sunrise and Zuhr)
  begins: t => `Begins at ${t}`,
  // deeds sheet
  deedsSub: (day, n, m) => `${day} · ${n} of ${m} done`, editList: "Edit list",
  // 19 Nov 2026 round (views/home.js): Now after logging, all five, the Today lines, the greeting, Qibla
  inLeft: left => `in ${left}`, tomorrowWord: "tomorrow",
  deedsAddOwn: "add your own", addDeed: "Add a good deed",
  stillCount: "Dhikr and duʿāʾ still count.",
  sunnahLine: "Sunnah", sunnahRakahs: (got, of) => `${got} of ${of} rakʿahs`,
  witrDone: "Witr ✓", witrMissed: "Witr missed", witrToDo: "Witr to do",
  qibla: deg => (deg == null ? "Qibla" : `Qibla ${deg}°`), qiblaAria: deg => (deg == null ? "Qibla finder" : `Qibla finder, ${deg} degrees from North`),
  welcome: name => (name ? `Welcome, ${name}` : "Welcome"),
  // the merged Today page (views/home.js, today.js rowState): tap a prayer to log it, tap again for congregation
  tapHint: "Tap again for congregation",
  beginsIn: (left, t) => `Begins in ${left} · ${t}`,
  mkNow: "Make up now", mkNowAria: p => `Log ${p} as made up now`,
  mkNowHide: p => `Not now · hide “Make up now” for ${p} today`,
  more: p => `More for ${p}`,
  lastNightRow: "last night",
  // a row is a button: what it is now, and what a tap does
  rowAria: (p, status, next, extra = "") => {
    const now = status ? { congregation: "prayed in congregation", ontime: "prayed on time", madeup: "made up", missed: "missed", excused: "excused" }[status] : "not logged";
    const does = next === "ontime" ? "Tap to log it as prayed on time" : next === "congregation" ? "Tap again for in congregation" : next === null ? "Tap to clear it" : "Tap for options";
    return `${p}, ${now}${extra ? `, ${extra}` : ""}. ${does}.`;
  },
  rowAriaUp: (p, t) => `${p}, begins at ${t}. It can be logged once it begins.`,
  current: "current prayer", nextPrayer: "next prayer",
  optsClear: "Clear", optsNow: "Now",
  // Direction B "Time of day" (19 Nov 2026): the hero in the arch, the thin list and the two pills
  leftShort: left => `${left} left`,
  bestBeforeSub: t => `best before ${t}`,
  leftFajr: left => `${left} left · until Fajr`,
  beginsInShort: left => `Begins in ${left}`,
  beginsTomorrow: (t, left) => `Tomorrow ${t} · begins in ${left}`, // the next Fajr once ʿIshāʾ is logged
  witrRowAria: done => (done ? "Witr prayed: tap to clear" : "Witr: tap when prayed"),
  prayed: "Prayed", prayedAria: p => `Prayed ${p}: log it as prayed on time`,
  heroAs: { congregation: "In congregation", ontime: "On time", madeup: "Made up", missed: "Missed", excused: "Excused" },
  prayedAgainAria: (p, s) => `${p}, ${s}. Tap to change it.`,
  sunnahWord: "Sunnah",
  bandName: { dawn: "Dawn", day: "Day", afternoon: "Afternoon", dusk: "Dusk", night: "Night" },
  tapHintToast: "Tap the tick again for congregation",
  deedsChoose: "choose",
  // the Good deeds sheet (Reading · Deeds · Nafl prayers)
  deedsDaily: (day, n, m) => `${day} · ${n} of ${m} daily goals`,
  deedsNoDaily: day => `${day} · no daily goals chosen yet`,
  groupReading: "Reading", groupDeeds: "Deeds",
  readBtn: "Read", readBtnAria: t => `Read: ${t}`, countBtn: "Count", countAria: t => `Count ${t}`,
  chooseDaily: "Choose daily deeds",
  // the Good deeds sheet on Today shows only the daily deeds; the rest is behind this row (20 Nov 2026)
  dailyEdit: "Add or change daily deeds", addOwn: "Add your own",
  deedsEmpty: "No daily deeds chosen yet. Pick the ones you’d like to keep up each day, and tick them off here.",
  chooseDailyLead: "Your daily goals: “Good deeds · n of m” on Today counts these. Everything else is a welcome extra.",
  dailyOn: t => `${t}: a daily goal`,
  // the community placeholder (Zad Plus only)
  communityLead: "Leaderboards, Circles, Family and mentoring will live here.",
  communitySoon: "Coming with Zad Plus.",
};
/*
 * The nafl add-on in the Good deeds sheet (views/home.js; rules/madhhab.js NAFL_ADDON). Timing lines take today's
 * real times. TODO(scholar): review this wording (Ishrāq / Duhā start and end, Awwābīn rakʿahs, Tahajjud) before
 * release. Kept short and neutral; Awwābīn follows madhhab.js (4 more after the 2 sunnah, 6 in all).
 */
export const NAFL = {
  title: "Nafl prayers", choose: "Choose", optional: "optional, as you can",
  chooseTitle: "Nafl prayers", chooseLead: "Choose which show in Good deeds. Each one you pray counts as a good deed.",
  noneShown: "No nafl prayers shown.",
  when: {
    ishraq: t => `From about 15–20 min after sunrise (≈ ${t})`,
    duha: t => `After Ishrāq until before zawāl (≈ until ${t})`,
    awwabin: t => `After Maghrib (${t}): 4 more after the 2 sunnah, 6 in all`,
    tahajjud: t => `Last part of the night, after sleeping, before Fajr (≈ until ${t})`,
  },
  afterMissed: "Not after a missed Maghrib.",
};
export const CALENDAR = {
  back: "Today",
  prevMonth: "Previous month", nextMonth: "Next month",
  monthSub: (y, n, m) => `${y} · <b>${n} of ${m}</b> prayed`, // HTML
  dayLabel: (d, mon, n) => n == null ? `${d} ${mon}` : `${d} ${mon}, ${n} of 5 prayed`,
  excusedDay: (d, mon) => `${d} ${mon}, excused`,
  legend: { prayed: "Prayed", missed: "Missed", none: "Not logged", excused: "Excused" },
  tapDay: "Tap a day to log or change it.",
  daySub: n => `<b>${n} of 5</b> prayed`, // HTML
  col: { congregation: "Congregation", ontime: "On time", madeup: "Made up", missed: "Missed" },
  sunnah: "Sunnah and Witr", note: "Note", addNote: "Add", editNote: "Edit",
  noteTitle: "Note", noteSave: "Save note", noteSaved: "Note saved",
  provisions: "Provisions",
  excused: "Excused day",
  before: "Before you started tracking",
  // the month view (19 Nov 2026): the Hijri month(s) under the title, the Hijri day under each day, status bars
  monthTitle: (mon, y) => `${mon} ${y}`,
  monthPrayed: (n, m) => `<b>${n} of ${m}</b> prayed this month`, // HTML
  hijriShort: ["Muh", "Saf", "Rab I", "Rab II", "Jum I", "Jum II", "Raj", "Shaʿ", "Ram", "Shaw", "Dhul Q", "Dhul H"],
  hijriFirst: (mon) => `1 ${mon}`,
  legendBars: { congregation: "Congregation", ontime: "On time", madeup: "Made up", missed: "Missed" },
  tapDayAll: "Tap a day to log or change it, or a day ahead for its prayer times.",
  // a future day: its prayer times only
  futureNote: "Prayer times only. You can log this day when it comes.",
  dayAria: (label, hijri) => (hijri ? `${label}, ${hijri}` : label),
};

/* ---------- excused days (hayd / nifas) ---------- */
export const EXCUSED = {
  feature: "Excused days",
  featureSub: "Hayd or nifās · private, never counted as missed",
  featureSubLong: "Hayd or nifās. Private. Not missed, no make-ups, streaks kept",
  markDays: "Mark excused days…",
  markDaysSub: "Choose a day or a date range",
  modeOn: "Excused mode is on",
  modeOnSub: "Only you can see this. Dhikr and duʿāʾ still count.",
  end: "End",
  since: d => `Excused since ${d}`,
  today: "Excused today",
  todayBtn: "Excused today",
  foot: "Excused days are not missed, never go to make-ups, and are left out of your percentages.",
  sheetTitle: "Excused days",
  sheetLead: "Private to you. Shown only as a small moon in your calendar.",
  from: "From", to: "To",
  reassure: ["Not missed, and nothing added to make-ups", "Your streaks carry on", "Left out of your percentages"],
  markN: n => `Mark ${n} ${n === 1 ? "day" : "days"} excused`,
  ringLabel: "excused",
  progressNote: n => `${n} excused ${n === 1 ? "day is" : "days are"} left out of every number here.`,
  weekCap: day => `${day} was an excused day, so it's left out: not missed, not owed.`,
};

/* ---------- Good Deeds (amal) ---------- */
export const DEEDS = {
  title: "Good Deeds",
  daily: "Daily good deeds",
  nOfMDone: (n, m) => `${n} of ${m} done`,
  empty: "No good deeds on your list yet. Add one below.",
  emptyTracker: "No good deeds on your list yet.",
  addButton: "+ Add a good deed to your daily list",
  addTitle: "Add a good deed",
  addLead: "It will appear on Today and in Progress from today.",
  name: "Name", namePlaceholder: "e.g. Tahajjud, Duʿāʾ for parents",
  whenCheck: "When you check it off",
  typeNone: "Just mark it done", typeNote: "Ask for an optional note", typeCount: "Ask for a count",
  addToList: "Add to my list", added: "Added to your daily good deeds",
  unchecked: "Unchecked",
  doneToast: name => `${name} done`,
  markAria: (on, name) => `${on ? "Unmark" : "Mark"} ${name} done`,
  doneWord: "Done", notDone: "Not done", notYet: "Not yet", addDetail: "Add detail",
  detailLead: "Marked done. Add detail if you like, or skip.",
  saveDetail: "Save detail", saved: "Saved",
  whereStop: "Where did you stop?", wherePlaceholder: "Sūrah and āyah, or juz / page",
  pagesRead: "Pages or āyāt read",
  howMany: "How many?", tenFewer: "10 fewer", tenMore: "10 more",
  anyNote: "Anything to note",
  lastStopped: pos => `Last stopped: ${pos}`,
  logWhere: "Log where you stop each day",
  yesterdayCount: n => `Yesterday: ${n}`,
  tapCount: "Tap to log a count",
  addedByYou: "Added by you",
  pagesSuffix: n => ` · ${plural(n, "page")}`,
  salawatUnit: "salawāt",
  // Settings → list editor
  listTitle: "Daily good deeds list", listLead: "Rename, reorder or remove. Past logs are kept.",
  listEmpty: "Your list is empty.", addNew: "+ Add new", listSaved: "Good deeds list saved",
  listCount: n => `${plural(n, "item")} · edit or reorder`,
  moveUp: "Move up", moveDown: "Move down", remove: "Remove",
  noTarget: "Durūd / Salawāt and sadaqah have no daily target; every one is counted.",
};
/** Names of the built-in good deeds (store.DEFAULT_AMAL uses these). */
export const DEED_NAME = {
  quran: "Qurʾān recitation", morning: "Morning adhkār", evening: "Evening adhkār", salawat: "Durūd / Salawāt", sadaqah: "Sadaqah",
  // excused days: recitation becomes listening, alongside duʿāʾ and istighfār
  listen: "Listen to Qurʾān", dua: "Duʿāʾ & istighfār",
};
export const DEED_HINT = { morning: "After Fajr", evening: "After ʿAsr", sadaqah: "Any amount, any kind", dua: "Any time", listen: "Any amount" };

/* ---------- Tracker ---------- */
export const TRACKER = {
  title: "Tracker",
  beforeTracking: "Before you started tracking",
  pctSoFar: p => `${p}% so far`,
  addedToMakeups: " · added to Make-ups",
  notLogged: "Not logged",
  edit: "Edit",
  note: "Note", notePlaceholder: "Anything about today",
};

/* ---------- prayer log sheet + toasts ---------- */
export const LOG = {
  sub: (dayLabel, time) => `${dayLabel}${time} · one tap logs it`,
  yesterdayPrefix: "Yesterday · ",
  missedToast: p => `${p} missed · 1 added to Make-ups`,
  removedToast: (p, status) => `${p}: ${status || "cleared"} · removed from Make-ups`,
  setToast: (p, status) => `${p}: ${status}`,
  loggedToast: (p, status) => `${p} logged · ${status}`,
  madeUpToast: p => `${p} made up · taken off your make-ups`,
  excusedToast: p => `${p}: excused · nothing owed`,
  catchUpTitle: "Catch up on yesterday",
  catchUpSub: (date, n) => `${date} · ${n} ${n === 1 ? "prayer" : "prayers"} not logged`,
  catchUpRow: p => `Yesterday's ${p}`,
  notLoggedList: list => `${list} ${list.includes(" and ") ? "aren't" : "isn't"} logged`,
  review: "Review",
  saveNofM: (n, m) => `Save ${n} of ${m}`,
  madeUpExplain: "Made up means you prayed it late, before the next Fajr. Missed adds one to your make-ups.",
};

/* ---------- Make-ups (qada) ---------- */
export const MAKEUPS = {
  title: "Make-ups",
  sub: "One small target at a time.",
  goalTitle: "Monthly make-up goal",
  goalLead: "Pick something you can finish. You can always raise it next month.",
  prayersThisMonth: "Make-up prayers this month",
  fastsThisMonth: "Make-up fasts this month",
  fewerPrayers: n => `${n} fewer make-up prayers`, morePrayers: n => `${n} more make-up prayers`,
  fewerFasts: n => `${n} fewer make-up fast${n === 1 ? "" : "s"}`, moreFasts: n => `${n} more make-up fast${n === 1 ? "" : "s"}`,
  saveGoal: "Save goal", goalUpdated: "Goal updated",
  adjustTitle: "Adjust what you owe",
  adjustLead: "Use this if your estimate changes. Day to day, the balance moves on its own.",
  fasts: "Fasts", fast: "fast",
  oneFewer: x => `One fewer ${x} owed`, oneMore: x => `One more ${x} owed`, owedAria: x => `${x} owed`,
  goalReached: "Monthly goal reached. Alhamdulillah.",
  madeUpGoalPassed: p => `${p} made up · goal passed`,
  madeUpToGoal: (p, n) => `${p} made up · ${n} to goal`,
  fastMadeUp: "One fast made up",
  goalReachedMonth: "Goal reached this month",
  moreInDays: (n, d, per) => `${n} more in ${d} day${d > 1 ? "s" : ""} · about ${per} a day`,
  plusToday: n => `+${n} today`,
  caughtUp: "All caught up",
  owed: n => `${n} owed`,
  prayedOne: "Prayed one", fastedOne: "Fasted one",
  fastsLine: (owed, done, goal) => `${owed} owed · ${done} of ${goal} this month`,
  madeUpThisMonth: n => `${n} made up this month`,
  clear: "Your prayer balance is clear. Alhamdulillah.",
  pace: months => `Keeping this pace, the full balance clears in about ${months} month${months > 1 ? "s" : ""}. The goal is what matters day to day.`,
  prayersOwed: "prayers still owed", fastsOwed: "fasts still owed",
  prayersHead: "Make-up prayers", prayersHeadSub: "logging one counts toward the goal",
  fastsHead: "Make-up fasts",
  witrRow: "Witr", witrRowSub: "Made up if missed",
  restored: n => `${n} restored`,
  toGo: (fard, witr) => `${fard} fard${witr ? ` + ${witr} Witr` : ""} to go`,
  goalSetting: "Make-up monthly goal",
  goalSettingValue: (p, f) => `${plural(p, "prayer")}, ${plural(f, "fast")}`,
};

/* ---------- Progress ---------- */
export const PROGRESS = {
  title: "Progress",
  ranges: { day: "Day", week: "Week", month: "Month", year: "Year" },
  chapters: { salah: "Salāh", streaks: "Streaks", sunnah: "Sunnah", jamaah: "Congregation", habits: "Habits", qada: "Make-ups", reflect: "Reflections" },
  chapterOf: (k, n) => `${k} of ${n}`,
  thisWeek: "This week", lastWeek: "Last week", last30: "Last 30 days", last7: "last 7 days",
  howYouPrayed: "How you prayed",
  thisWeekLower: "this week", last30Lower: "last 30 days",
  madeUpSub: "same day, not added to make-ups",
  missedSub: "added to make-ups",
  excusedSub: "not counted",
  notLogged: "Not logged",
  eachPrayer: "Each prayer",
  weekSalah: "This week's salāh", tapDot: "tap a dot to edit",
  lastFiveWeeks: "Last five weeks", tapDay: "tap a day to open it", tapDayInspect: "tap a day to inspect it",
  ringCap: "Each ring is one day: five arcs for Fajr to ʿIshāʾ, clockwise from the top.",
  madeUpCap: n => `${plural(n, "prayer")} ${n === 1 ? "was" : "were"} made up before the next Fajr. They count toward your days, and never reach your make-ups list.`,
  allFive: "All five prayed", allOnTime: "All on time",
  bestKeep: n => `Best ${n} · made-up prayers keep it going`,
  bestOnTime: n => `Best ${n} · in congregation or on time only`,
  streakExcused: "Excused days are skipped: they never break a streak. ",
  streakToday: "Today counts once ʿIshāʾ is logged.",
  sunnahPrayers: "Sunnah prayers", apartFromFard: "counted apart from fard",
  goingWell: "Going well", oneStep: per => `One step for next ${per}`,
  fardPrayed: "Fard prayed", ofDue: n => `of ${n} due`,
  dailyHabits: "Daily habits",
  jamaahThisWeek: "In congregation this week",
  pctFardPrayed: "of fard prayed", pctOnTime: "on time or in congregation", daysAllFive: "days with all five",
  jamaahCap: "Prayed in congregation, out of those due from the start of the week to today. Praying at home on time still counts fully.",
  prayersInJamaah: "Prayers in congregation", sharePerWeek: "share per week",
  // existing views (day / week / month / year)
  doingWell: "Doing well", needsCare: "Needs more care",
  doingWellEmpty: "Keep logging. Your strengths show up here after a few days.",
  needsCareEmpty: "Nothing stands out right now. Alhamdulillah.",
  backToToday: "Back to today", soFar: "so far", completion: "completion",
  inJamaah: "in congregation", deedsDone: "good deeds done",
  byStatus: "Prayers by status", noneLogged7: "No prayers logged in the last 7 days yet.",
  weekSoFar: "week so far", dayStreak: "day streak", vsLastWeek: "vs last week",
  jamaahPrayers: "congregation prayers", madeUpWord: "made up",
  monthSoFar: m => `${m} so far`, yearAverage: y => `${y} average`, bestMonth: "best month",
  makeupsCleared: "make-ups cleared", byMonth: "By month",
};

/** Plain-language insights (stats.insights). */
export const INSIGHT = {
  congTitle: (p, n, days) => `${p} in congregation ${n} of the last ${plural(days, "day")}`,
  congSub: "Your strongest congregation habit right now.",
  quranTitle: n => `Qurʾān read on ${plural(n, "straight day")}`,
  quranSub: pos => pos ? `${pos} as of your last entry. Keep the thread going.` : "Keep the thread going.",
  allFiveTitle: n => `All five prayers on ${plural(n, "day")} in a row`,
  allFiveSub: "Consistency is the whole game. Keep going.",
  rateTitle: (name, rate) => `${name} at ${rate}%`,
  rateSub: days => `Done on most days over the last ${plural(days, "day")}.`,
  missedTitle: (p, n) => `${p} missed ${n} time${n > 1 ? "s" : ""} this week`,
  tipTurnOn: "Turn on the make-up reminder in Settings.",
  tipLonger: min => `Your make-up reminder is set to ${plural(min, "minute")}; try 30.`,
  tipPrayEarly: "Try praying it as soon as the time comes in.",
  weakSub: (best, bestRate, weak) => `${best} is at ${bestRate}%. Try pairing ${weak} with something you already do daily.`,
  weakSubAlt: "Try pairing it with a prayer you rarely miss.",
  unloggedTitle: n => `${plural(n, "prayer")} left unlogged this week`,
  unloggedSub: "Fill them in from the calendar so your progress stays accurate.",
  witrTitle: n => `Witr on ${n} of the last 7 nights`,
  witrSub: "You've kept it every night.",
};

/* ---------- features ---------- */
export const FEATURE = {
  title: "Features",
  intro: "What would you like Zad to help with? Turn off anything you don't need; it leaves Today and the bottom bar. You can turn it back on anytime and nothing is lost.",
  cap: "What Zad helps you with. Anything off leaves Today and the bottom bar.",
  bottomBar: "Your bottom bar",
  count: (n, m) => `${n} of ${m}`,
  summary: "Prayers, sunnah, good deeds, make-ups, this week, progress, tools",
  justPrayers: "Just prayers",
  justPrayersSub: "Only the five prayers. Add more later.",
  everything: "Everything",
  // names and lines from the redesign (final/fin-features, fin-ob-05); used by set-up and Settings → Features
  names: {
    prayers: "Prayers", sunnah: "Sunnah prayers", deeds: "Good deeds", makeups: "Make-up prayers",
    week: "This week's reading", progress: "Progress & reflections", tools: "Read: Qurʾān & adhkār",
  },
  subs: {
    prayers: "The five daily prayers. Always on.",
    sunnah: "The extra prayers before and after each one",
    deeds: "Charity, fasting and your own list",
    makeups: "Count missed prayers and pray them back",
    week: "A verse, a hadith and a duʿāʾ each week",
    progress: "A gentle look back at your week and month",
    tools: "The Qurʾān, adhkār, Hizb and durūd, ticked as you read",
  },
};
export const TOOL_NAME = { adhkar: "Adhkār", durud: "Durūd", hizb: "Hizb al-Aʿzam", quran: "Qurʾān", manzil: "Manzil", afterSalah: "Adhkār after Salāh" };
export const TOOL_SUB = {
  adhkar: "Morning and evening",
  durud: "Forty durūd · suggested daily, at least on Friday",
  hizb: "One manzil a day · Saturday is manzil 1",
  quran: "Read the mushaf",
  manzil: "Verses for protection · morning and evening",
  afterSalah: "After each fard · tasbīh counter",
};
export const TOOLS_UI = {
  title: "Tools",
  morning: "Morning adhkār", evening: "Evening adhkār", eveningOpens: "Evening set opens after ʿAsr",
  virtue: "Virtue",
  manzilOf: (n, m = 7) => `Manzil ${n} of ${m}`,
  fridayEmphasis: "At least on Friday",
  hideTool: "Hide this tool", showTool: "Show this tool",
  listenExcused: "Listen to Qurʾān",
  mushaf: { indopak15: "15-line IndoPak", indopak13: "13-line IndoPak", uthmani15: "15-line Uthmani" },
  para: n => `Juzʾ\u00a0${n}`, juz: n => `Juzʾ\u00a0${n}`,
  translation: "Translation", pickthall: "Pickthall",
};

/* ---------- This week content (content.js) ---------- */
export const WEEK_UI = {
  ayah: "Āyah of the week", hadith: "Hadīth of the week", dua: "Duʿāʾ of the week", seerah: "Sīrah moment",
  tabs: { ayah: "Āyah", hadith: "Hadīth", dua: "Duʿāʾ", seerah: "Sīrah" },
  sahabi: m => `Sahābī · ${m}`, sunnah: m => `Sunnah · ${m}`,
  afterSalah: "Adhkar after Salah",
  todaysFact: "Today's fact", earlierThisMonth: "Earlier this month", pastMonths: "Past months", pastMonthsSub: "Earlier Sahābī of the month",
  factDay: (d, mon) => `${d} ${mon}`, factsCount: n => `${n} ${n === 1 ? "fact" : "facts"}`, pastNone: "No earlier months yet.",
  thisMonth: "This month", readMore: "Read more", new: "New",
  narrator: "Narrator", collection: "Collection", source: "Source",
  recapTitle: name => `A look back at ${name}`,
  recapLead: name => `This month you met ${name}. Here are a few things to remember.`,
  recapTile: "Month recap", recapAll: "All of this month's facts",
  weekOf: d => `Week of ${d}`,
  weekRange: (a, b) => `${a} – ${b}`,
};
/** Day letters for a Sunday-first week (This week on Home, Progress). */
export const WEEK_LETTERS_SUN = ["S", "M", "T", "W", "T", "F", "S"];
/** Day letters for a Saturday-first week (Hizb al-Aʿzam). */
export const WEEK_LETTERS_SAT = ["S", "S", "M", "T", "W", "T", "F"];
/** Day letters for a Monday-first week (legacy views). */
export const WEEK_LETTERS_MON = ["M", "T", "W", "T", "F", "S", "S"];

/* ---------- reminders / notifications (notify.js) ---------- */
export const NOTIFY = {
  prayerTitle: p => `${p} time`,
  prayerBody: p => `It's time for ${p}. Tap to log it once you've prayed.`,
  begunTitle: p => `${p} has begun`,
  bestBeforeBody: t => `Best before ${t}.`,
  preTitle: (p, min) => `${p} window ends in ${min} min`,
  preBody: p => `${p} isn't logged yet. Pray before it becomes a make-up.`,
  nudgeTitle: p => `Still time to make up ${p} today`,
  nudgeBody: (p, fajr) => `Pray it before Fajr (${fajr}) and it won't be added to your make-ups.`,
  nudgeAction: "I made it up", nudgeLater: "Remind me at 9 PM",
  eveningTitle: "Evening check-in",
  eveningBody: "A few things are still unlogged today. Take a minute to fill them in.",
  seerahTitle: "Weekly sīrah moment",
  durudTitle: "Friday durūd",
};

/* ---------- Settings ---------- */
export const SETTINGS = {
  title: "Settings",
  groups: { general: "General", prayer: "Prayer", reminders: "Reminders", tracking: "Tracking", content: "Content", account: "Account & data", about: "About" },
  appearance: "Appearance", mode: "Mode",
  appearanceOpts: { system: "System", light: "Light", dark: "Dark" },
  // switches
  preQada: "Before a prayer becomes a make-up",
  preQadaSub: "Nudge when the window is nearly over and nothing is logged",
  preQadaMin: n => `${n} min before the window ends`,
  leadToast: m => `Reminder ${plural(m, "minute")} before a make-up`,
  makeupNudge: "Make-up nudge", makeupNudgeSub: "“Still time to make up ʿAsr today” · before ʿIshāʾ ends",
  prayerAlerts: "Prayer time alerts", prayerAlertsSub: "At the start of each prayer",
  evening: "Evening check-in", eveningSub: "9:30 PM, only if something is unlogged",
  carryQuran: "Carry Qurʾān position forward", carryQuranSub: "Pre-fill where you stopped last time",
  weekCard: "“This week” readings", weekCardSub: "One short reading for the week",
  reflection: "Daily reflection", reflectionSub: "An āyah or hadīth each morning",
  seerah: "Friday sīrah moment", seerahSub: "A short sīrah reading, Friday 9 AM",
  feedbackRow: "Send feedback / Report a mistake",
  qiblaRow: "Qibla finder", qiblaRowSub: "The direction of the Kaʿbah from where you are",
  // the location sheet: current location first, a city as the fallback
  locGps: label => `Using your current location · ${label}`,
  locCity: label => `Using a chosen city · ${label}`,
  locOld: label => `Using ${label}`,
  locNone: fallback => `No location yet · using ${fallback}`,
  locRowGps: "Current location", locRowCity: "Chosen city",
  useMyLocationShort: "Use my location", updateMyLocation: "Update my location",
  chooseCity: "Choose a city instead",
  remindNote: "shown in the app on this device",
  lock: "App lock", lockSub: "Fingerprint or face each time Zad opens",
  noBiometry: "No fingerprint or screen lock set up on this phone", notTurnedOn: "Not turned on",
  crashReports: "Send crash reports", crashReportsSub: "Error details only, never your logs or name",
  crashReportsOffToast: "Crash reports off", crashReportsOnToast: "Crash reports on",
  // location
  location: "Location",
  locSet: (label, lat, lng) => `${label} · ${lat}, ${lng}`,
  locNotSet: fallback => `Not set · using ${fallback}`,
  locUses: label => `${label} · uses your location`,
  useMyLocation: "Use my current location",
  orSearch: "Or search for a city", cityPlaceholder: "e.g. London, Karachi, Toronto",
  locNote: "Prayer times are calculated on your phone from these coordinates, so they work offline. Looking up a city name needs internet once.",
  finding: "Finding your location…",
  locSetToast: label => `Location set: ${label}`,
  locFailed: "Couldn't get your location. Try searching instead.",
  searching: "Searching…", searchFailed: "Couldn't search. Check your internet connection.", noMatches: "No matches.",
  // method
  method: "Calculation method", methodLead: "Use the one your local masjid follows.",
  // name
  yourName: "Your name", nameLead: "Its first letter opens Settings, at the top right.", namePlaceholder: "Your name", notSet: "Not set",
  // data
  exportCsv: "Export my data", exportCsvSub: "CSV of every log", exportCancelled: "Export cancelled",
  backup: "Back up to a file", backupSub: "Everything, restorable later", backupCancelled: "Backup cancelled",
  restore: "Restore from a file", restoreSub: "Replace this phone's data",
  restored: "Backup restored", badBackup: "That file isn't a valid backup",
  csvNotLogged: "Not logged", csvDone: "Done", csvMadeUp: "make-ups made up",
  resetTitle: "Reset all data?",
  resetBody: signedIn => `This deletes every log, your make-ups balance and settings from this phone. It can't be undone. Consider backing up first.${signedIn ? " You'll also be signed out of cloud backup; your cloud copy is kept and comes back if you sign in again." : ""}`,
  resetGo: "Delete everything", reset: "Reset all data", resetSub: "Delete everything from this phone",
  // cloud
  cloud: "Cloud backup",
  cloudOff: "Off · sign in with Google to back up and sync",
  cloudPaused: email => `Paused · ${email} · account deletion didn't finish`,
  cloudSyncing: email => `On · ${email} · syncing…`,
  cloudOn: (email, status) => `On · ${email} · ${status}`,
  synced: ago => `synced ${ago}`,
  ago: { notYet: "not yet", justNow: "just now", min: m => `${m} min ago`, h: h => `${h} h ago`, days: d => `${plural(d, "day")} ago` },
  cloudLead: "Sign in with Google and your prayers, good deeds, make-ups and settings are saved to your own private space in the cloud. They sync automatically, and signing in on a new phone brings everything back.",
  signInGoogle: "Sign in with Google",
  cloudPrivate: "Only your account can open it in the app. It is stored on Google Firebase in the US.",
  signedInAs: email => `Signed in as ${email}.`,
  lastSynced: ago => `Last synced ${ago}.`,
  deletePausedBody: email => `Signed in as ${email}. Deleting your account didn't finish, so sync is paused and nothing is uploaded.`,
  keepAccount: "Keep my account", keepAccountNote: "Keep my account turns sync back on and uploads this phone's data again.",
  signOut: "Sign out", syncNow: "Sync now",
  signOutNote: "Signing out keeps everything on this phone. Changes stop syncing until you sign in again.",
  signedInToast: "Signed in · backup is on", signInFailed: "Sign-in didn't finish. Try again.",
  syncedToast: "Synced", signedOutToast: "Signed out · data kept on this phone", syncBackOn: "Sync is back on",
  // consent
  terms: "Terms of use", privacy: "Privacy policy", support: "Support",
  termsChanged: "The Terms of use and Privacy policy have changed.",
  termsNew: "Cloud backup now asks you to agree to the Terms of use and Privacy policy.",
  termsAsk: "Please read them and agree to keep cloud backup on.",
  agree: "Agree", notNowSignsOut: "Not now signs you out of cloud backup. Everything stays on this phone.",
  thanks: "Thanks · cloud backup stays on",
  // delete account
  deleteTitle: "Delete your account?",
  deleteBody1: "This permanently deletes your Zad cloud backup (everything stored under your account) and your Zad sign-in. It can't be undone.",
  deleteBody2: "The data on this phone is kept unless you also choose to clear it below.",
  backupFirst: "Back up first",
  alsoClear: "Also clear Zad on this phone", alsoClearSub: "Every log, your make-ups balance and settings",
  deleteGo: "Delete my account", deleteSub: "Remove your cloud backup and Zad sign-in",
  deleteFoot: "Deleting your account removes your cloud backup and Zad sign-in. Data on this phone stays until you reset it.",
  offline: "You're offline. Connect to the internet and try again.",
  deleting: "Deleting…", tryAgain: "Try again",
  delAuthCancelled: "Your cloud backup was deleted. To delete your sign-in too, confirm with Google. Tap Try again.",
  delAuthFailed: "Your cloud backup was deleted, but your sign-in wasn't. Sync is paused. Tap Try again.",
  delDataFailed: "Couldn't delete your cloud backup. Sync is paused. Check your connection and tap Try again.",
  delAuthToast: "Sign-in not deleted yet", delToast: "Account not deleted",
  deletedToast: "Your account and cloud backup were deleted",
  // exact alarms
  exactOff: "Off · reminders can be a few minutes late. Tap to allow",
  exactOn: "Reminders will arrive on time",
  exactStillOff: "Still off · you can allow it under Alarms & reminders",
  whyZad: "Why Zad",
};

/* ---------- setup (onboarding) ---------- */
export const SETUP = {
  welcome: "As-salāmu ʿalaykum",
  welcomeLead: "Track your five prayers, your daily good deeds and the make-ups you're praying back, all on this phone. Nothing leaves it unless you turn on cloud backup.",
  callYou: "What should we call you?",
  restore: "Restore my backup (sign in with Google)",
  timesTitle: "Prayer times",
  timesLead: method => `Times are calculated on your phone from your location, so they work without internet. The default method is ${method}; you can change it in Settings.`,
  notSetYet: "Not set yet",
  untilSet: fallback => `Until you set it, times use ${fallback}.`,
  useLocation: "Use my location", updateLocation: "Update location", skipForNow: "Skip for now",
  locFailed: "Couldn't get your location. You can set it later in Settings.",
  madhhabTitle: "Your madhhab",
  madhhabLead: "Sets ʿAsr time, which sunnah prayers are listed, and how Witr is counted. You can change it later.",
  featuresTitle: "What should Zad help with?",
  oweTitle: "What you owe",
  oweLead: "An honest estimate is enough. After today the balance moves on its own: missed prayers add, made-up ones subtract.",
  quickFill: "Quick fill: years of prayers and fasts missed", fill: "Fill", yearsPlaceholder: "e.g. 2",
  oweNone: "I don't owe any", notSure: "Not sure",
  goalTitle: "A monthly goal",
  goalLead: "Pick something you can finish. Small and steady beats big and abandoned. You can change it any time.",
  start: "Start tracking",
  welcomeBack: "Welcome back · your data is restored",
  noBackup: "Signed in. No backup yet, so let's set things up.",
  welcomeName: name => name ? `Welcome, ${name}` : "Welcome",
};

/* ---------- screen labels moved here from the views (integration pass, 8 Nov). Keys unchanged. ---------- */

/** views/home.js */
export const HOME_X = {
  next: "Next", lastNight: "Last night", withP: p => `With ${p}`,
  endsAt: t => `Ends at <b>${t}</b>`, openUntilFajr: TIMES.openUntilFajr,
  leftInTime: "left in its time", toFajr: "until Fajr", untilStarts: "until it starts", pastMiddle: "Past the middle of the night",
  celebTitle: "All five prayers, Alhamdulillah", celebSub: n => `${n} ${n === 1 ? "day" : "days"} in a row`,
  wasMissed: p => `${p} was missed`, comesOff: () => "Pray it before Fajr and it comes off your make-ups", plusOne: "+1 make-up",
  prayedLbl: STATUS_EXTRA.prayed, later: "Later",
  notOpened: "Not opened yet", goldChange: "Gold tiles change each month", newEachSunday: "new set each Sunday",
  arLabel: { ayah: "آية", hadith: "حديث", dua: "دعاء", seerah: "سيرة", sahabi: "صحابي", sunnah: "سنة" },
  mkNotNow: COMMON.notNow, undone: "Undone",
  loggedN: n => `${n} ${n === 1 ? "prayer" : "prayers"} logged`,
  fard: "Fard", witrToDo: "Witr to do", witrDone: "Witr done", witrMissed: "Witr missed",
  longPress: "Long-press a chip for its tier", notExcused: "Not excused", editDates: "Edit dates",
  dayNOfM: (n, m) => `day ${n} of ${m}`, excusedLine: "Not missed, nothing added to make-ups, streaks kept. Not counted in your percentages.",
  pickDay: "Go to a day", moreSunnah: "More sunnah",
};

/** views/progress.js */
export const PROGRESS_L = {
  sub: "Where you're steady, and where to give more care.",
  thisWeek: "This week", lastWeek: "Last week", last30: "Last 30 days", prev30: n => `${plural(n, "day")} earlier`,
  chips: "Chapters", dueNow: "Due now", later: "Later",
  upFrom: p => `up from ${p}% last week`, steady: "as steady as last week", lastWas: p => `last week ${p}% at this point`,
  nPrayers: n => `${n} ${n === 1 ? "prayer" : "prayers"}`, bestYet: "your best yet",
  habitsOf: (a, b) => `of ${b}`, plusDeeds: (a, b) => `+ ${a} ${DEEDS.salawatUnit} · ${b} sadaqah`,
  allPrayed: (ot, r) => `Every prayer due so far was prayed: <b>${ot}</b> on time or in congregation, <b>${r}</b> made up.`,
  mostPrayed: (pr, due) => `<b>${pr} of ${due}</b> prayers prayed so far. Every one you log keeps the picture honest.`,
  noData: "Nothing logged in this period yet.",
  streakHead: (a, o) => `<b>${a} ${a === 1 ? "day" : "days"}</b> with all five prayed. <b>${o}</b> all on time.`,
  streakMonth: (a, b) => `Now <b>${a} ${a === 1 ? "day" : "days"}</b> with all five; your best is <b>${b}</b>.`,
  sunnahYest: (g, o, tg, to) => `Emphasised: <b>${g} of ${o}</b> rakʿahs yesterday, ${tg} of ${to} so far today.`,
  sunnahPeriod: (pct, w) => `Emphasised sunnahs on <b>${pct}%</b> of their rakʿahs${w == null ? "" : `; Witr on <b>${w}%</b> of nights`}.`,
  jamHead: n => `<b>${n} ${n === 1 ? "prayer" : "prayers"}</b> in congregation.`,
  jamMonth: n => `About <b>1 in ${n}</b> prayers in congregation over this period.`,
  habitsHead: (best, weak) => weak ? `${best} is steady; ${weak} is the one to nurture.` : `${best} is steady.`,
  habitsNone: "Good deeds you log show up here.",
  makeupHead: n => `<b>${n} restored</b> ${n === 1 ? "this month" : "this month"}, one small step at a time.`,
  makeupYear: n => `<b>${n} restored</b> this year.`,
  makeupAll: "restored so far",
  reflectHead: "What's taking hold, and one step for next time.",
  goingWell: PROGRESS.goingWell, setReminder: "Set a reminder", nothingYet: "Keep logging. Your strengths show up here after a few days.",
  eachSub: "of prayers due",
  prayedDays: "days with all five", ofFard: "of fard prayed", onTime: "on time or in congregation",
  upFromPct: p => `up from ${p}%`, fardPrayedN: "fard prayed", madeUpSame: "made up the same day",
  yearDays: "Your year in days", fardByMonth: "Fard by month", pctDue: "% of prayers due", eachByMonth: "Each prayer by month",
  yearBest: "best run", markLegend: "What the marks mean · long-press any chip",
  rows: "rows", inJamaah: "In congregation", noRings: "Excused days are shown quietly, without rings.",
  noTarget: "no daily target", edge: "growth edge", fewer: "less", more: "more",
  whatMeans: COMMON.whatDoesThisMean,
};

/** views/progress.js (redesign): the Progress tab's chapters, and the Make-ups chapter (views/qada.js). */
export const PROG = {
  chapters: { reflect: "Reflections", week: "Week", charts: "Charts", provisions: "Provisions", makeups: "Make-ups" },
  chaptersLabel: "Progress chapters",
  // Reflections
  reflectSub: "The last 7 days",
  workOn: "One thing to work on",
  openCalendar: "Open the calendar",
  // Week
  weekTitle: off => (off === 0 ? "This week" : off === 1 ? "Last week" : "Earlier week"),
  prevWeek: "Previous week", nextWeek: "Next week",
  prayed: "prayed", inCongregation: "in congregation", allFiveRun: "days all five, in a row",
  last4: "last 4 weeks", four: "4 weeks to then",
  dayAria: (day, marks, n, due) => `${day}: ${marks}. ${n} of ${due} prayed. Opens the day.`,
  dueNow: "due now", notYet: "not yet",
  streaks: "Streaks",
  congWeek: "In congregation", congWeekSub: "out of those due",
  sunnahWeek: "Sunnah prayers", deedsWeek: "Good deeds",
  // Charts
  chartsTitle: "Charts", period: "Period", ranges: { month: "30 days", year: "Year" },
  earlier: "Earlier", later: "Later",
  perDay: "Prayers each day", perDaySub: "Out of five, one bar a day",
  perDayAria: (from, to, avg, full) => `Prayers each day, ${from} to ${to}: ${avg} of 5 on average, all five on ${full} ${full === 1 ? "day" : "days"}.`,
  barTitle: (date, n) => `${date}: ${n} of 5`, barExcused: date => `${date}: excused`,
  eachSub: "% prayed",
  eachAria: (name, pct, parts) => `${name}: ${pct} prayed. ${parts}.`,
  congCols: "Congregation by week", congColsSub: "share of prayers prayed in congregation",
  colTitle: (date, pct) => `Week of ${date}: ${pct}%`,
  sunnahSub: "% of their rakʿahs", deedsSub: "% of days done",
  yearDeedsNote: "Shown for the current year only.",
  // Make-ups chapter
  mkSub: "Prayers still to make up",
  leftToMakeUp: "left to make up",
  madeThisMonth: (n, g) => `${n} of ${g} made up this month`,
  madeOneUp: "I made one up",
  pickTitle: "Which one did you make up?",
  pickSub: "One tap counts it toward this month's goal.",
  more: "More",
  // sub-tabs inside Week, Charts and Make-ups (views/subtabs.js)
  sub: {
    days: "Days", streaks: "Streaks", cong: "Congregation", sunnah: "Sunnah", deeds: "Good deeds",
    prayers: "Prayers", each: "Each prayer", left: "Left", goal: "Goal", history: "History",
  },
  subLabel: { week: "Week sections", charts: "Charts sections", makeups: "Make-ups sections", mkpage: "Make-ups sections" },
  bestWeek: "Your best week yet.",
  salawatDays: "days with salawāt", sadaqahDays: "days with sadaqah", salawatAll: n => `${n.toLocaleString("en")} salawāt in all`,
  deedsNow: "Good deeds are shown for the current period. Go back to the latest to see them.",
};

/** views/qada.js */
export const MAKEUPS_X = {
  monthGoal: m => `${m}’s goal`, prayersUnit: "prayers", paceFor: "pace for today",
  ahead: "Ahead of pace", onPace: "On pace", behind: "Behind pace", changeGoal: "Change goal",
  seeAll: "See all make-ups", aFast: "A fast",
  askHead: "Prayed a make-up prayer?", witrTag: "", left: n => `${n.toLocaleString("en")} left`,
  witrSub: n => `${n.toLocaleString("en")} left · made up with ʿIshāʾ's make-ups`,
  fastsSub: (n, done, goal) => `${n} left · ${done} of ${goal} this month`,
  sameDay: "Prayers made up the same day never land here. Mark a missed prayer “I made it up” before the next Fajr and its +1 is removed.",
  restoredHead: "Restored so far", madeUpSince: (n, since) => `prayers made up since ${since}`,
  fullDays: (days, witr) => `That’s ${days} full ${days === 1 ? "day" : "days"} of Salāh returned${witr ? `, plus ${witr} Witr` : ""}.`,
  nextIs: (label, at) => `Next: ${label} at ${at.toLocaleString("en")}.`,
  oneDay: "One day", oneWeek: "One week", oneMonth: "One month", threeMonths: "Three months", oneYear: "One year",
  eachMonth: "Each month", vsGoal: "made up vs goal", soFar: "so far", goalWord: n => `goal ${n}`,
  keepHead: "If you keep this up", toGo: n => `${n.toLocaleString("en")} to go`,
  aMonth: n => `${n} a month`, yourGoal: "your goal now", oneADay: "1 a day", aboutMonth: "about 30 a month", twoADay: "2 a day",
  guide: "A guide, not a deadline. Small deeds done steadily are the most beloved.", witrNote: n => ` Witr (${n.toLocaleString("en")} left) is made up alongside ʿIshāʾ's make-ups.`,
  yourPath: "Your path", allClear: "Nothing owed. Alhamdulillah.", emptyHint: "Add what you owe to see your path.",
  fastPlural: "fasts",
};

/** views/onboarding.js */
export const SETUP_X = {
  getStarted: "Get started", logIn: "Log in", quote: "“The best provision is taqwā.”", quoteSrc: "Al-Baqarah 2:197",
  loginLead: "Log in with the account you used before. Your prayers, make-ups and settings come back to this phone.",
  welcomeBack: "Welcome back", continueGoogle: "Continue with Google", continueApple: "Continue with Apple",
  privateNote: "Only your account can open it in the app. It is stored on Google Firebase in the US.",
  restoredFrom: "Restored from your backup", welcomeBackName: n => n ? `Welcome back, ${n}` : "Welcome back",
  daysOf: n => `${n} ${n === 1 ? "day" : "days"} of prayers and good deeds`, since: d => `Since ${d}`,
  makeupsLeft: n => `Make-ups: ${n.toLocaleString("en")} left`, goalLine: (g, d) => `Goal ${g} a month · ${d} done this month`,
  settingsLoc: "Settings and location", remindersOff: "Reminders are off on this phone", remindersOffSub: "Allow notifications to bring them back",
  remindersOn: "Reminders are on", turnOn: "Turn on", openZad: "Open Zad", backupOn: "Google · backup on",
  noBackupTitle: "You’re signed in", noBackupLead: email => `We didn’t find a backup for ${email}. If you used a different account before, try that one.`,
  setUp: "Set up Zad", tryAnother: "Try another account", back: "Back", stepOf: (i, n) => `${i} of ${n}`,
  nameEyebrow: "Welcome", nameTitle: "What should we call you?", nameSub: "Only used for your greeting.", namePlaceholder: "Your name",
  whereEyebrow: "Prayer times", whereTitle: "Where do you pray?", whereLead: "We use this to work out today’s times. You can change it later.",
  change: "Change", looksRight: "Looks right", searchCity: "Search for a city", foundFrom: "Found from your location", setManually: "Set by you",
  calcNote: "Prayer times are calculated on your phone. Your location is rounded to about 1 km, and is only sent to look up your city’s name, or to your backup if you turn it on.", notSet: "Not set yet",
  madhhabEyebrow: "How you pray", madhhabTitle: "Which madhhab do you follow?", asr: "Asr", continueWith: n => `Continue with ${n}`,
  madhhabNote: "Sets your ʿAsr time, the sunnah prayers we list and Witr in make-ups. Not sure? Keep Hanafī.",
  featEyebrow: "Make it yours", featTitle: "What would you like Zad to help with?", justPrayers: "Just prayers", everything: "Everything",
  alwaysOn: "Always on · the five fard", featNote: "Turned off things disappear from Today. Switch them on any time in Settings → Features.",
  continueN: n => `Continue · ${n} chosen`,
  oweEyebrow: "Last one · optional", oweTitle: "Do you have missed prayers to make up?", yes: "Yes", no: "No", notSure: "Not sure",
  howLong: "Roughly how long?", none: "None", underYear: "Under a year", oneTwo: "1–2 years", threeFive: "3–5 years", exact: "Enter exact numbers",
  about: "about", prayersWord: "prayers", fastsWord: "fasts", includesWitr: "Includes Witr", witrWajib: "",
  perDay: "How many a day?", yourGoal: "your goal", aMonth: n => `${n} a month`,
  fine: "That’s completely fine", fineBody: "You can add an estimate any time from Make-ups. Zad will start counting from today: missed prayers add, made-up ones subtract.",
  start: "Start tracking",
  permLocTitle: "Find your prayer times?", permLocBody: "Zad uses your location to work out today’s prayer times on your phone. It is rounded to about 1 km, and is only sent to look up your city’s name, or to your backup if you turn it on.", permLocYes: "Allow location", permLocNo: "Enter a city instead", permLocFoot: "Your phone will ask next. Change any time in Settings.",
  permNotTitle: "A gentle nudge at each prayer?", permNotBody: "Zad can remind you when each prayer starts, so you can log it on time. One quiet note, no spam.", permNotYes: "Turn on reminders", permNotNo: "Not now", permNotFoot: "Your phone will ask next. Change any time in Settings.",
  notifTitle: "Zad", notifBody: p => `It’s time for ${p}. Tap to mark it prayed.`, now: "now",
  nextIs: p => `next is ${p} at`, lockTouch: "Touch the sensor to unlock", lockPin: "use your PIN", lockOr: "or", unlock: "Unlock",
  greet: n => n ? `${SETUP.welcome}, ${n}` : SETUP.welcome, nextAt: (p, t, left) => `${p} at ${t} · in ${left}`,
  yearsLabel: "Quick fill: years of prayers and fasts missed",
  // redesign set-up (Nov 2026): Welcome → 7 steps → You're all set (views/onboarding.js)
  alreadyUse: "I already use Zad",
  ayahEn: "And take provisions, but indeed the best provision is taqwā.",
  timesTitle: "Your prayer times", chooseCity: "Choose a city", foundGps: "found from your location", chosenByYou: "chosen by you",
  locNotSet: f => `Not set yet · the times below are for ${f}`,
  asrRow: "ʿAsr time", laterAsr: "Later ʿAsr", earlierAsr: "Earlier ʿAsr",
  calcNoteShort: m => `Worked out on your phone (${m} method), so they work offline. Your location is rounded to about 1 km.`,
  methodLine: m => `${m} method; they work offline.`,
  cantLocate: "Can’t get your location? Choose a city",
  locNoGo: "Couldn’t get your location",
  locating: "Finding your location…",
  presets: "Quick choices",
  asrSheetTitle: "ʿAsr time and madhhab", asrSheetLead: "Sets ʿAsr time, which sunnah prayers are listed, and how Witr is counted. Not sure? Keep Hanafī.",
  defaultTag: "Default", cityLead: "Search for your town or city. Times are worked out on your phone.",
  readLead: "This sets what the adhkār and other readers show.",
  featProvisions: "Provisions & levels", featProvisionsSub: "Provisions for what you log, to keep you going",
  featTitleNew: "What should Zad help you with?", featLead: "Choose what you need. You can change this any time.",
  oweKick: "Optional", oweLead: "An honest estimate is enough.",
  remTitle: "Remind me at prayer times?", remLead: "One quiet note when each prayer begins. You can log it straight from the reminder.",
  remYes: "Remind me at prayer times", remFoot: "Your phone will ask next. Change it any time in Settings.",
  remExample: "An example. Sisters see Prayed on time.", remExampleShort: "An example.", remCong: "In congregation", remOnTime: "Prayed on time",
  remDenied: "Notifications are off for Zad. You can turn them on later in Settings.",
  readyTitle: n => n ? `You're all set, ${n}` : "You're all set",
  readyLead: "Here's what you chose. You can change any of it in Settings.",
  readyTimes: l => `Prayer times for ${l}`, readyAsr: m => `${m} ʿAsr`,
  readyChosen: n => `${n} ${n === 1 ? "thing" : "things"} chosen`,
  readyRem: "Reminders at each prayer", readyRemOff: "Reminders are off", readyRemOffSub: "Turn them on any time in Settings",
  readyMakeups: n => `Make-ups: about ${n.toLocaleString("en")}`, readyPerDay: n => `${n} a day`,
  readyNote: "Everything stays on this phone. If you'd like a backup, you can sign in later from Settings.",
};

/** views/settings.js */
export const SETTINGS_X = {
  profileTitle: "Your name", general: "General",
  appearanceFollow: dark => `Following your phone · ${dark ? "Dark" : "Light"} right now`,
  appearanceLead: "Zad can follow your phone, or stay light or dark.",
  deeds: "Good Deeds list", deedsSub: n => `${n} ${n === 1 ? "item" : "items"} · edit or reorder`,
  deedsLead: "Rename, reorder or remove. Past logs are kept.", deedAdd: "Add", deedPlaceholder: "A new good deed", deedsEmpty: "Your list is empty.",
  deedsSaved: "Good Deeds list saved", move: "Move", remove: "Remove",
  asrFollows: "Follows your madhhab. Change it only if you need a different ʿAsr time.",
  releaseNotes: "Release notes", deleteAcct: "Delete account and data", privacySub: "What is stored and where", supportSub: "Help, questions and feedback",
  excusedStart: "Start excused mode from today", excusedEnd: "End excused mode", excusedNone: "No days chosen",
  featuresPrayersOnly: "Just prayers", toolsHead: "Tools", toolsLead: "Hide a tool you don't use. It leaves the Read tab.",
  yourBar: "Your bottom bar", newTag: "NEW", sunnahOn: "On", sunnahOff: "Off",
  csvHead: ["date", "type", "item", "status", "detail"], csvPrayer: "prayer", csvWitr: "witr", csvDeed: "good deed", csvNote: "note", csvExcused: "Excused day",
  csvPrayers: "prayers", csvFasts: "fasts", csvFile: "zad",
  jumuahLabel: "Jumuʿah", fri: "Fri", dayLabel: "Day", extra2: "extra 2 after",
  sunnahMuakkadahLine: "Emphasised. The Prophet ﷺ kept to these regularly. Always shown.",
  ghayrLine: "Non-emphasised. Rewarded, not kept to every time. Lighter, outlined chips.",
  naflLine: "Optional extras. Hidden until you turn them on.",
  witrHead: "Witr", witrLine: "Shown on ʿIshāʾ.", afterIsha: "After ʿIshāʾ",
  sunnahDay: "Day", sunnahDayNames: "Ishrāq · Duhā · Tahajjud · Tarāwīh (Ramadān)",
  perMonth: "/ month", fastsLabel: "Fasts", note: "Note",
  // Settings → Widgets (home-screen widgets, lock screen, the Android "Now" notification)
  widgetsHead: "Widgets",
  showTimesOnly: "Show times only", showTimesOnlySub: "Hides what you've logged on widgets, the lock screen and the Now notification",
  ongoingNow: "Now notification", ongoingNowSub: "A quiet notification with the current prayer and one-tap logging",
  lockDots: "Show logged dots on the lock screen", lockDotsSub: "Off: the lock screen shows prayer times only",
  tile: "Quick Settings button", tileSub: "Log the current prayer from the pull-down panel", tileAdd: "Add", tileAdded: "Added",
  tileSteps: "Swipe down twice, tap ✎ and drag in Log prayer.", tileStepsTitle: "Add the Quick Settings button",
  notifDenied: "Notifications are off for Zad. Turn them on in your phone's settings.",
  // Settings → Appearance (Mode, Text size, Arabic text size; src/appearance.js) and the Zad Plus row
  textSize: "Text size", textSizeNote: "Follows your phone's text size, and can go larger here.",
  arSize: "Arabic text size", arSizeNote: "For the Qurʾān, adhkār and duʿās. Each reader can still change it with Aa.",
  sizeSmaller: "Smaller", sizeLarger: "Larger", sizeOf: (n, m) => `Size ${n} of ${m}`,
  plusRow: "Zad Plus", plusRowSub: "Leaderboards, Circles, Family plan, mentoring",
  // Settings, consolidated (20 Nov 2026): about ten rows on one screen, each opening a page with "‹ Settings"
  pages: {
    you: "You", times: "Prayer times", tracking: "Prayers & tracking", reminders: "Reminders & widgets",
    shows: "What Zad shows", help: "Help & feedback", data: "Privacy & data", about: "About",
  },
  youSub: "Your name, who Zad is set up for, and cloud backup",
  signIn: "Sign in", signInSub: "Back up and sync with Google or Apple",
  madhhabAsr: "Madhhab & ʿAsr", asrHead: "ʿAsr time",
  dailyDeeds: "Daily good deeds", dailyDeedsSub: "What “Good deeds · n of m” on Today counts",
  nOn: n => `${n} on`, onPhone: "On this phone", backedUp: ago => `Backed up ${ago}`,
  feedbackSub: "Help, questions, ideas, or a mistake in the content",
  widgetsLead: "Widgets, the lock screen and the Now notification",
};

/* ---------- Zad Plus (Settings → Zad Plus; views/plus.js). Nothing is sold yet: no payments exist. ---------- */
export const PLUS = {
  title: "Zad Plus", lead: "Ways to keep going, together.",
  items: [
    ["bars", "Leaderboards", "Anonymous, local and worldwide. Weekly totals only, never which deeds."],
    ["people", "Circles", "A private leaderboard for friends or a class. Every member needs their own Zad Plus."],
    ["family", "Family plan", "Child profiles you manage. One payment covers all your children."],
    ["mentor", "Mentoring", "A teacher sees the weekly summaries members choose to share. Members need Zad Plus; the mentor is free."],
  ],
  price: "Price", priceTbd: "To be set",
  choose: "Choose a plan", soon: "Coming soon",
  free: "Everything you use today stays free.",
};

/* ---------- What's new: shown once to people who used Zad before the redesign (views/whatsnew.js) ---------- */
export const WHATS_NEW = {
  title: "Zad has a new look", lead: "Everything is still here.",
  lines: [
    "Today has two parts: Now and Today.",
    "The Tracker is now the calendar on Today.",
    "Tools is now Read.",
    "Log a prayer with one tap, and from widgets and notifications.",
  ],
  cont: "Continue",
};

/**
 * Setup "Can you read Arabic?", the Home tour, one-time tool tips and Settings → Help & tour
 * (views/onboarding.js, views/tour.js, views/help.js; logic in guide.js).
 * Strings marked HTML contain markup; everything else is plain text.
 */
export const GUIDE = {
  // setup step
  readEyebrow: "How you read", readTitle: "Can you read Arabic?",
  readOpts: {
    yes: ["Yes, I read Arabic", "Arabic only. Meanings are there when you want them."],
    little: ["A little", "Arabic with transliteration and meaning."],
    notyet: ["Not yet", "Arabic with transliteration and meaning under every line."],
  },
  readShort: { yes: "Yes", little: "A little", notyet: "Not yet" },
  readNote: "You can change this any time in Settings.",
  preview: "Preview",
  previewAr: "سُبْحَانَ اللّٰهِ وَبِحَمْدِهِ", previewTr: "Subhanallahi wa bihamdihi", previewMn: "Glory be to Allah, and praise be to Him.",
  meaningTap: "Meaning is one tap away",
  readLead: "This sets what the adhkār, durūd, Hizb and after-salah readers show. The Qurʾān reader never shows transliteration. You can still change each one with Aa.",
  readSaved: a => `How you read: ${a}`,

  // tour
  tourLabel: (n, of) => `Tour, step ${n} of ${of}`, stepOf: (n, of) => `Step ${n} of ${of}`,
  skip: "Skip tour", next: "Next", start: "Start",
  prayerT: "Log a prayer",
  prayerP: "Tap a prayer once you have prayed it: once for <b>on time</b>, again for <b>congregation</b>. Undo is right there.", // HTML
  prayerAltP: "Tap a prayer once you have prayed it: once for <b>on time</b>, again for <b>congregation</b>. Prayers that haven't begun show when they begin.", // HTML
  statusT: "Every choice",
  statusP: ({ excused, sunnah }) => `<b>⋯</b> on the current prayer (or a long press on any prayer) has the rest: missed${excused ? ", excused" : ""}, and made up once its time has ended.${sunnah ? " The current prayer shows its sunnah prayers." : ""}`, // HTML
  deedsT: "Your good deeds", deedsP: "Tick off the good deeds you choose each day, under Good deeds in Today.",
  progressT: "Progress", progressP: "See where you're steady and where to grow.",
  calendarT: "Every day", calendarP: "The <b>calendar</b> shows every day, so you can fill in or fix a past prayer.", // HTML
  makeupsT: "Make-ups", makeupsP: "<b>Make-ups</b> is in Progress. It counts what you owe and helps you pray it back.", // HTML
  readT: "Read", readP: "Adhkār, Qurʾān, Hizb, durūd and more.",
  finishT: "You're all set", finishP: "Small, consistent deeds are most beloved to Allah.",

  // one-time tool tips (HTML)
  gotIt: "Got it",
  tipAdhkar: `Tap the card each time you say it. The counter keeps your place, even if you leave. Tap <b class="tl-aa-chip">Aa</b> to show transliteration and meaning.`,
  tipQuran: "Swipe to turn the page. Tap the page for the menu: go to a sūrah or juzʾ, bookmarks, and <b>Translation</b> for the meaning. Your page is saved.",
  tipHizb: `Read at your own pace. Your place is saved as you scroll, and today's manzil is ticked when you finish. Tap <b class="tl-aa-chip">Aa</b> for transliteration and meaning.`,

  // Settings row + Help & tour page
  helpRow: "Help & tour", helpRowSub: "Replay the tour, how statuses and make-ups work", newTag: "New",
  helpTitle: "Help & feedback", helpLead: "A quick walk through Zad, and answers to the questions people ask most.",
  learn: "Learn Zad", touch: "Get in touch",
  replay: "Replay the tour", replaySub: "A short walk through Today, Read and Progress", replaySubShort: "A short walk through Today and the calendar",
  howRead: "How you read", howReadSub: "Arabic, transliteration and meaning in the tools",
  howStatus: "How statuses work", howStatusSub: "In congregation, on time, made up, missed, excused",
  howMakeups: "How make-ups work", howMakeupsSub: "What is added, and what comes off",
  contact: "Contact us", email: "zadapp.team@gmail.com", contactFoot: "We read every message and reply as soon as we can.",

  // How statuses work
  stLead: "Each prayer gets one status. On Today, tap a prayer once for on time and again for congregation (a third tap clears it). Press and hold it, or tap ⋯, for every choice.",
  stItems: {
    congregation: "You prayed it with the congregation. It also counts as on time.",
    ontime: "You prayed it within its time.",
    madeup: "You prayed it late, before the next Fajr. It counts as prayed and is never added to your make-ups.",
    missed: "Its time passed and it wasn't prayed. One is added to your make-ups.",
    missedNoTab: "Its time passed and it wasn't prayed. It is counted as owed.",
    excused: "Hayd or nifās. Not missed, nothing is owed, and it is left out of your percentages.",
  },
  stNotLogged: "Not logged",
  stNotLoggedP: "No status yet. Log it any time from Today, or from the calendar for an earlier day.",
  stStreaks: "Streaks",
  stStreakAll: "All five: days with every prayer prayed. Made up counts.",
  stStreakOnTime: "All on time: days with every prayer on time or in congregation.",
  stStreakSame: "So a prayer made up the same day keeps your all-five streak, but not your on-time streak.",
  stStreakExcused: "Excused days are skipped. They never break a streak.",
  stStreakToday: "Today counts once ʿIshāʾ is logged.",
  stSunnah: "Sunnah prayers are logged in the same sheet, and counted apart from the fard.",
  stChange: "Changed your mind? Open the prayer again and pick another status.",

  // How make-ups work
  mkLead: "Make-ups are the fard prayers you owe and are praying back.",
  mkAddsH: "What is added",
  mkAdds: "Marking a prayer Missed adds one to its make-ups.",
  mkWitr: "A missed Witr is added too.",
  mkExcused: "Excused days (hayd or nifās) are never added.",
  mkSameH: "Made up the same day",
  mkSame: "Prayed it late? Once its time has ended, mark it Made up later, or tap “I made it up” on Today. Its +1 comes off, so it never reaches your make-ups list.",
  mkSameUntil: "The same day lasts until the next Fajr.",
  mkSameStreak: "It keeps your all-five streak, but not your on-time streak.",
  mkOffH: "What comes off",
  mkOff: "When you pray an older make-up, log it in Progress → Make-ups. It comes off what you owe and counts toward your monthly goal.",
  mkUndo: "Change a Missed prayer to any other status and its +1 is removed.",
  mkAdjust: "Your estimate changed? Use Adjust what you owe in Progress → Make-ups.",
  mkGoal: "Your monthly goal is a guide, not a deadline. Pick something you can finish.",
  mkFasts: "Owed fasts are counted the same way, in Progress → Make-ups.",
};

/* ---------- Send feedback / Report a mistake (views/feedback.js, feedback.js) ---------- */
export const FEEDBACK = {
  row: "Send feedback", rowSub: "Ideas, problems, or a mistake in the content",
  title: "Send feedback", reportTitle: "Report a mistake", report: "Report", reportMistake: "Report a mistake",
  lead: "Ideas, problems, or something that isn’t right. We read every message.",
  reportLead: "Thank you for helping keep Zad accurate.",
  about: "What is it about?",
  types: { idea: "Suggestion", bug: "Something’s not working", content: "Mistake in content", other: "Other" },
  placeholder: {
    idea: "What would make Zad better for you?",
    bug: "What happened, and what did you expect to happen?",
    content: "What looks wrong, and what should it say? A reference helps if you have one.",
    other: "Write your message",
  },
  reporting: "Reporting", removeItem: "Remove the item from this report",
  whichFact: "Which fact?", whichPage: "Which page?", today: "Today",
  whatWrong: "What looks wrong?", optional: "(optional)",
  parts: { arabic: "Arabic", qtext: "Arabic text", translit: "Transliteration", translation: "Translation", source: "Narrator or source", text: "Wording", layout: "Page layout", other: "Something else" },
  message: "Your message", messageReport: "What’s wrong?", count: (n, max) => `${n} / ${max}`,
  email: "Email for a reply", emailHint: "So we can reply. Clear it to send without one.", emailBad: "Check the email address, or clear it.",
  device: "Include app version and device", deviceSub: d => `${d}. It helps us find the problem.`,
  signedOut: "You’re not signed in, so this opens your <b>email app</b> with the message ready to send to",
  send: "Send", sending: "Sending…", openMail: "Open email app",
  never: "Your prayer log and notes are never sent.",
  preferEmail: "Prefer email?",
  failed: "Couldn’t send. Check your connection and try again.",
  thanksTitle: "Thank you",
  thanks: "Jazāk Allāhu khayran. We’ll look into it carefully.",
  thanksItem: "Jazāk Allāhu khayran for reporting", thanksItemEnd: "We’ll look into it carefully.",
  thanksReply: "We’ll reply to the email you left.",
  sent: "Sent to the Zad team.", queued: "You’re offline. It will send when you’re back online.", mailNext: "Press Send in your email app to finish.",
  // item labels (shown to the user and stored as itemTitle)
  kind: { ayah: "Āyah", hadith: "Hadith", dua: "Duʿā", seerah: "Sīrah", sunnah: "Sunnah", sahabi: "Companion", adhkar: "Adhkār", aftersalah: "After ṣalāh", durud: "Durūd", hizb: "Hizb", manzil: "Manzil", quran: "Qurʾān" },
  fact: n => `fact ${n}`, page: n => `Page ${n}`,
  inDhikr: (n, total, t) => `In this dhikr: ${n} of ${total}${t ? `, ${t}` : ""}`,
  inItem: t => `In ${t}`,
  // mailto
  mailType: "Type", mailItem: "Item", mailParts: "What looks wrong", mailApp: "App", mailDevice: "Device",
};

/* ---------- Brother / sister (onboarding name screen, Settings "Set up for", remembrance tick) ---------- */
export const GENDER = {
  // name screen
  label: "Set Zad up for a",
  sister: "Sister", brother: "Brother", skip: "Prefer not to say",
  why: "Changes Jumuʿah and excused days. You can change it in Settings.",
  // Settings
  row: "Set up for", notSet: "Not set",
  sheetTitle: "Set Zad up for",
  sheetLead: "Choose who Zad is set up for. It only changes what Zad shows. No logs are changed or deleted.",
  optSub: { f: "Excused days on · Friday shows Zuhr", m: "Jumuʿah on Fridays · In congregation first", n: "Shows everything, as Zad does now" },
  boxTitle: { f: "For a sister, Zad", m: "For a brother, Zad", n: "If you prefer not to say, Zad" },
  box: {
    f: [["Excused days (hayd, nifās)", "On"], ["On Friday", "Zuhr, 4 before · 2 after"], ["Now card", "On time only"], ["Remembrance at prayer time", "On excused days"]],
    m: [["Excused days", "Off"], ["On Friday", "Jumuʿah, 4 before · 4 after"], ["Now card", "In congregation first"]],
    n: [["Excused days", "On"], ["On Friday", "Jumuʿah"], ["Now card", "Prayed first"]],
  },
  note: "Each of these still has its own switch. Your choice stays on this phone and in your own backup, and is never shown to anyone.",
  setToast: { f: "Set up for a sister", m: "Set up for a brother", n: "Showing everything" },
  // Settings: the Jumuʿah switch (none existed before)
  jumuah: "Jumuʿah on Fridays", jumuahSub: "Friday Zuhr shows as Jumuʿah, with its sunnah",
  // status sheet on excused prayers
  rememberAt: p => `At ${p} time`,
  remember: "Remembrance at prayer time",
  rememberSub: "Make wuḍūʾ and sit in your prayer place for dhikr, for about the length of the prayer.",
  rememberNote: "Not a prayer and never counted as one. Only you see it.",
  // tour: brothers (the same tap cycle as everyone: once on time, again congregation)
  prayerPBrother: "Tap a prayer once you have prayed it: once for <b>on time</b> if you prayed alone, again for <b>congregation</b>. Undo is right there.", // HTML
};

/* ---------- PROVISIONS: provisions & levels (views/provisions.js, points.js) ----------
   Wording rules: always "provisions" and "gathered" (never points / earned / won); "Level 4", never a title;
   never "reward" or "accepted" about the number; the reminder line goes on the card and every sheet. */
export const PROVISIONS = {
  title: "Provisions",
  gathered: "gathered",
  toLevel: (n, lv) => `<b>${n}</b> provisions to Level ${lv}`,
  toLevelPlain: (n, lv) => `${n} provisions to Level ${lv}`,
  thisWeek: "This week so far",
  plusN: n => `<b>+${n}</b> provisions`,
  plusNPlain: n => `+${n} provisions`,
  level: n => `Level ${n}`,
  lv: n => `Lv ${n}`, lvShort: "Lv",
  ringLabel: "Level",
  how: "How provisions work",
  niyyahLine: "A personal tracker for your consistency, not a measure of reward with Allah.",
  // P2 info sheet
  lead: "Zād means provision for the journey. As you log your prayers and good deeds, Zad counts provisions to help you see your consistency and keep going.",
  fardHead: "Fard prayers",
  inJamaah: "In congregation", onTime: "On time", sisters: "Sisters: 5. Praying at home on time is best for you, so it counts in full.",
  madeUpSameDay: "Made up the same day", missed: "Missed", neverTaken: "Never taken away.",
  moreHead: "More worship",
  witr: "Witr", witrMadeUp: n => `Made up: ${n}`,
  sunnah: "Sunnah and nafl prayers", deeds: "Good Deeds", makeups: "Make-ups completed",
  each: n => `${n} each`, upTo: n => `Up to ${n} a day`,
  deedsSub: n => `Hizb, al-Mulk, al-Kahf and the Manzil count too. Up to ${n} a day`,
  excusedHead: "Excused days (hayḍ, nifās)",
  eachTime: "Each prayer time", eachTimeSub: "Not praying is obedience to Allah on these days.",
  remembrance: "Remembrance at prayer time",
  remembranceSub: "Wuḍūʾ, then sitting in your prayer place for dhikr for about the length of the prayer. It keeps the habit of salah.",
  neverDown: "Levels never go down.", neverDownSub: "A missed day takes nothing away.",
  limits: "Daily limits", limitsSub: "keep the focus on steady practice, not on piling up extras.",
  history: "Your whole history counts", historySub: ", from the day you started.",
  niyyahAr: "إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ",
  niyyahEn: "“Actions are by intentions.”",
  niyyahSrc: "al-Bukhārī 1",
  niyyahBody: "Provisions are a personal tracker to help you stay consistent. They are not a measure of reward with Allah; only He knows what He accepts.",
  turnOff: "Turn off provisions",
  turnOffNote: "Turning them off hides them. Your prayer log stays as it is.",
  offToast: "Provisions turned off",
  // P3 offer
  askTitle: "Track your provisions?",
  askBody: "Zād means provision for the journey. Zad can count what you log as provisions and show your level, to help you stay consistent.",
  askSmall: "Off unless you turn it on. Your past days count too. You can turn it off any time in Settings.",
  turnOn: "Turn on", howItWorks: "How it works",
  // P3b history result / P6 level-up
  historyLead: (lv, n, since) => `Based on your history, you're at <b>Level ${lv}</b>, with <b>${n}</b> provisions from your logs since ${since}.`,
  freshLead: lv => `You're at <b>Level ${lv}</b>. Provisions are gathered from what you log, starting today.`,
  toLevelTile: lv => `to Level ${lv}`,
  daysLogged: n => (n === 1 ? "day logged" : "days logged"),
  levelUpLead: n => `You've gathered <b>${n}</b> provisions. May Allah accept them from you and keep you steady.`,
  duaAr: "رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنتَ السَّمِيعُ الْعَلِيمُ",
  duaEn: "“Our Lord, accept this from us. You are the All-Hearing, the All-Knowing.”",
  duaSrc: "al-Baqarah 2:127",
  // P4 Settings
  feature: "Provisions & levels", featureSub: "Count what you log as provisions and see your level. Off by default.",
  newTag: "New",
  group: "Provisions",
  homeOpt: "Level on Today", homeOptSub: lv => `A small “Lv ${lv}” next to your initial`,
  trackerOpt: "Provisions in the calendar", trackerOptSub: "“+N provisions” on each day you open",
  homeFullOpt: "Prayer at home counts in full", homeFullOptSub: "For sisters: on time counts 5, like congregation",
  // P5 chip
  chipLabel: (lv, n, next) => `Level ${lv}, ${n} provisions to Level ${next}`,
  // P7 / P7b Tracker
  dayTitle: dow => `${dow}'s provisions`,
  todayTitle: "Today's provisions",
  dayLead: date => `${date} · from what you logged`,
  total: "Total",
  none: "Nothing logged on this day yet.",
  st: { congregation: "in congregation", ontime: "on time", madeup: "made up", missed: "missed", excused: "excused", excusedRem: "remembrance" },
  witrSt: { done: "prayed", madeup: "made up", missed: "missed" },
  nDone: n => `${n} done`,
};

/** Everything, for lookups by group name. */
/* ---------- CONSENT: cloud-backup consent (A1), re-consent (A2), crash-report step (B1), Sign in with Apple ----------
   Used by views/settings.js (A.cloudSheet, A.consentSheet), views/onboarding.js (sLogin, sCrash) and cloud.js.
   Wording rules: never "only you", "nobody else" or "anonymous" (privacy audit A4). */
export const CONSENT = {
  // the block shown before every sign-in (HTML: <b> only, no user text). apple: Sign in with Apple is offered
  // (consent.js APPLE_READY); while it is hidden the text names Google only.
  what: apple => `To back up and sync, Zad stores your <b>prayer log, good deeds and notes, make-ups, settings</b> (including whether Zad is set up for a brother or sister) and (if you use them) <b>excused days</b> on Google Firebase in the US, linked to your ${apple ? "Google or Apple" : "Google"} account. Only your account can open them in the app. You can export or delete everything at any time.`,
  policy: "Privacy policy",
  agree: "I agree that Zad may store this, including religious and health information",
  terms: "Signing in also means you accept the {terms}.", // {terms} becomes a link
  termsLink: "Terms of use",
  settingsLead: "Back up your Zad and keep it in sync between your phones. Signing in on a new phone brings everything back.",
  notNow: "Not now, keep everything on this phone",
  tickFirst: "Tick the box first to back up",
  // Sign in with Apple (Apple's approved titles: "Sign in with Apple" / "Continue with Apple")
  signInApple: "Sign in with Apple", continueApple: "Continue with Apple",
  appleHidden: "your Apple ID (email hidden)",
  otherProvider: "This email already uses a different sign-in. Use the button you signed in with before.",
  // re-consent for signed-in users, shown when cloud.TERMS_VERSION changes. Bullets are for the 2026-11-15 change
  // only: replace them (and the version) next time.
  reVersion: "2026-11-15",
  reTitle: "We've updated our privacy policy",
  reLead: "Please have a look before your backup carries on. What's changed:",
  reBullets: [
    "We now ask clearly before backing up your prayer records and excused days, because they are religious and health information.",
    "It says where your backup is kept (Google Firebase, US), that we as the developer could technically open it but don't look unless you ask, and how long copies last after you delete it.",
    "It explains crash reports, and what your phone's own backups may hold.",
  ],
  reWhat: acct => `Your backup holds your <b>prayer log, good deeds and notes, make-ups, settings</b> (including whether Zad is set up for a brother or sister) and (if you use them) <b>excused days</b>, linked to ${acct}. Only your account can open it in the app. You can export or delete everything at any time.`, // acct is escaped by the caller
  reContinue: "Continue",
  reSignOut: "Sign out, keep data on this phone",
  reNote: "Signing out stops syncing. Your cloud copy stays until you delete it.",
  reDelete: "Delete my cloud backup instead",
  reThanks: "Thanks · cloud backup is on",
  pausedStatus: email => `Paused · ${email} · waiting for your OK`,
  // crash reports: native-only onboarding step (option A)
  crashEyebrow: "One last thing",
  crashTitle: "Help us fix bugs?",
  crashLead: "If Zad crashes or hits an error, it can send us a short technical report so we can fix it. It's up to you.",
  crashSent: "What's sent", crashSentSub: "Phone model, app version and which part of the app went wrong",
  crashNever: "Never sent", crashNeverSub: "Your name, account, location, prayers, deeds, notes or excused days",
  crashLater: "You can change this any time in Settings → Send crash reports.",
  crashYes: "Yes, send crash reports", crashNo: "No thanks",
};

export const STR = {
  APP, NAV, COMMON, PRAYER_NAME, STATUS, STATUS_SHORT, STATUS_HELP, STATUS_EXTRA, WITR_STATUS,
  MADHHAB_NAME, MADHHAB_SUMMARY, MADHHAB_UI, ASR_LABEL, ASR_UI, TIER, WITR_TAG, WITR_UI, SUNNAH_NAME, SUNNAH_UI, MEASURE,
  TIMES, HOME, EXCUSED, DEEDS, DEED_NAME, DEED_HINT, TRACKER, LOG, MAKEUPS, PROGRESS, INSIGHT,
  FEATURE, TOOL_NAME, TOOL_SUB, TOOLS_UI, WEEK_UI, WEEK_LETTERS_SUN, WEEK_LETTERS_SAT, WEEK_LETTERS_MON, NOTIFY, SETTINGS, SETUP,
  HOME_X, PROGRESS_L, MAKEUPS_X, SETUP_X, SETTINGS_X, GUIDE, FEEDBACK, CONSENT,
};
export default STR;

/* ---------- prayers that haven't started yet (can't be logged ahead of time) ---------- */
export const NOT_YET = {
  begins: t => `Begins at ${t}`,
  body: p => `You can log ${p} once its time begins.`,
};

/* ---------- travel: prayer times follow where you are (src/travel.js, Settings → Prayer) ---------- */
export const TRAVEL = {
  row: "Update location when I travel",
  rowSub: "When Zad opens, it checks where you are and updates prayer times if you've moved more than 25 km.",
  updated: city => `Prayer times updated for ${city}`,
  fallbackLabel: "Current location",
  // An older saved location (source "unknown") shows this instead of the switch
  unknownHint: "Tap “Use my current location” to let prayer times follow you when you travel.",
};

/* ---------- Read tab: chapters For today · Qurʾān · Adhkār (views/read.js, src/reading.js) ---------- */
export const READ = {
  chapters: { today: "For today", quran: "Qurʾān", adhkar: "Adhkār" },
  chaptersLabel: "Read chapters",
  // For today
  todayTitle: "Today's reading",
  doneWord: "done", doneOf: (n, m) => `${n} of ${m}`,
  item: {
    morning: "Morning adhkār", evening: "Evening adhkār", hizb: "Hizb al-Aʿzam", quran: "Qurʾān recitation",
    listen: "Listen to Qurʾān", manzil: "Manzil", mulk: "Sūrat al-Mulk", kahf: "Sūrat al-Kahf", durud: "Durūd / Salawāt",
    yasinAm: "Yā-Sīn · morning", yasinPm: "Yā-Sīn · evening",
  },
  nowUntil: p => `Now · until ${p}`,
  fromP: p => `From ${p}`,
  fromAt: (p, t) => `From ${p} · ${t}`,
  earlierToday: "Earlier today",
  tonight: "Now · tonight",
  hizbSub: (m, day) => `Manzil ${m} of 7 · ${day}`,
  day3: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  lastRead: s => `Last read: ${s}`,
  openMushaf: "Open the mushaf",
  listenSub: "Any amount",
  manzilMorning: "Protection · this morning", manzilEvening: "Protection · this evening",
  beforeSleep: "Before sleep",
  kahfSub: p => `Jumuʿah · before ${p}`, jumuahNight: "Jumuʿah night",
  durudFriday: "Jumuʿah · send abundant durūd", durudDaily: "Any number counts",
  doneAt: t => `Done at ${t}`,
  read: "Read", open: "Open", next: "Next", previous: "Previous",
  nothingDue: "Nothing to read today. Choose what Read shows below.",
  excusedNote: "On excused days, dhikr and duʿāʾ still count.",
  ticked: name => `${name} ticked off`,
  unticked: "Unticked",
  markDone: name => `${name} done`,
  // This week (the weekly readings, one row)
  thisWeek: "This week", newOnSunday: "New on Sunday",
  weekSub: (kind, n) => `${kind} · and ${n} more`,
  verseOfWeek: "Verse of the week",
  weekTitle: "This week",
  // For today, layout C (20 Nov 2026): only the daily readings, grouped Now · Later today · Done
  nowHead: "Now",
  laterHead: n => `Later today · ${n}`,
  doneHead: n => `Done · ${n}`,
  nothingNow: "Nothing due right now.",
  allDone: "All of today's readings are done. Alhamdulillah.",
  dailyEmpty: "Choose the readings you keep each day and they gather here, in the order they're due. Everything else stays in the Qurʾān and Adhkār chapters.",
  chooseDaily: "Choose your daily readings",
  // the This week card at the top of For today and its sheet (This week · This month)
  weekNew: "New",
  weekCardLabel: (title, isNew) => `This week: ${title}${isNew ? ". New" : ""}`,
  weekSheetLead: range => `${range} · new each Sunday`,
  thisMonth: "This month",
  choose: "Choose what Read shows",
  // Qurʾān
  quranTitle: "Qurʾān",
  continueReading: "Continue reading", startReading: "Start reading",
  continue: "Continue", openBtn: "Open",
  surah: name => `Sūrah ${name}`, firstPage: "From the first page",
  kahfRow: "Sūrat al-Kahf", kahfRowSub: "Fridays",
  mulkRow: "Sūrat al-Mulk", mulkRowSub: "Each night",
  yasinRow: "Sūrah Yā-Sīn", yasinRowSub: "Morning and evening",
  yasinDone: (a, b) => (a && b ? "Morning and evening done" : a ? "Morning done · evening from ʿAsr" : "Evening done"),
  manzilRow: "Manzil", manzilRowSub: "Protection · morning and evening",
  allSurahs: "All sūrahs and juzʾ",
  // Adhkār
  adhkarTitle: "Adhkār",
  morningSub: n => `${n} adhkār · from Fajr`,
  eveningSub: (n, p) => `${n} adhkār · from ${p}`,
  afterSalah: "After ṣalāh", afterSalahSub: "After each fard · tasbīh counter",
  hizbRowSub: m => `One manzil a day · today manzil ${m}`,
  durudRow: "Durūd", durudRowSub: "Forty durūd · at least on Friday",
  durudOf: (n, m) => `${n} of ${m} read`,
  durudLast: d => `Last read ${d}`,
  doneTag: "Done",
  tips: "Tips for reading", tipsSub: "How the counters and ticks work",
  tipTicks: "Tick a reading off in For today, or with the bar at the bottom of the reader. It counts in your good deeds and in Progress, and you can untick it the same way.",
  // the bar at the bottom of a reader
  barTitle: name => `${name} done`,
  barSub: "Ticks it off for today",
  barDone: "Ticked off for today · tap to undo",
  // the Good deeds sheet on Today
  deedsInRead: "Qurʾān and adhkār are ticked in Read, next to their text.",
};

/* ---------- the Qurʾān reading goal (src/quran-goal.js, views/quran-goal.js; approved 19 Nov 2026) ----------
   Gentle words only: no "behind", no "missed", no streaks. */
const unitN = (unit, n) => {
  const v = Number.isInteger(n) ? String(n) : n.toFixed(1);
  return unit === "min" ? `${v} min` : unit === "juz" ? `${v} juzʾ` : `${v} ${n === 1 ? "page" : "pages"}`;
};
export const QGOAL = {
  unitN,
  unit: { pages: "Pages", juz: "Juzʾ", min: "Minutes" },
  unitWord: { pages: "pages", juz: "juzʾ", min: "min" },
  per: { day: "Daily", week: "Weekly", plan: "Finish the Qurʾān" },
  // the line on For today and the card: "3 of 5 pages today", "18 of 35 pages this week"
  of: (done, target, unit, per) => {
    const d = Number.isInteger(done) ? String(done) : done.toFixed(1);
    return `${d} of ${unitN(unit, target)} ${per === "week" ? "this week" : "today"}`;
  },
  metToday: "Today's goal is met",
  metWeek: "This week's goal is met",
  planDone: "Khatm complete · Alhamdulillah",
  paused: "Your goal is paused on excused days",
  pausedShort: "Goal paused today",
  listenCounts: "Listening to the Qurʾān still counts for the day.",
  weekPausedNote: n => `${n} excused ${n === 1 ? "day" : "days"} this week: the goal is lower to match.`,
  // the goal itself: "5 pages a day", "2 juzʾ a week", "Finish by Tue 9 Mar"
  goalName: g => (g.type === "khatm" ? "Finish the Qurʾān" : `${unitN(g.type, g.n)} a ${g.per === "week" ? "week" : "day"}`),
  finishBy: d => `Finish by ${d}`,
  expected: d => `Expected finish ${d}`,
  newPace: d => `At a gentle pace you'll finish ${d}`,
  pagesLeft: n => `${n} ${n === 1 ? "page" : "pages"} to go`,
  planToday: n => `${n} ${n === 1 ? "page" : "pages"} today`,
  // the card in the Qurʾān chapter
  cardKick: "Reading goal",
  cardNone: "Set a daily or weekly goal in pages, juzʾ or minutes, or plan to finish the Qurʾān.",
  setGoal: "Set a goal",
  edit: "Edit goal",
  iRead: "I read…",
  inApp: (p, m) => `In the app: ${[p ? unitN("pages", p) : "", m ? unitN("min", m) : ""].filter(Boolean).join(" · ") || "nothing yet"}`,
  added: list => `Added: ${list}`,
  weekSoFar: "This week",
  // the set-goal sheet
  setTitle: "Qurʾān goal",
  setSub: "Read in the app or in your own mushaf: both count.",
  kind: "Kind of goal",
  howMuch: "How much",
  unitLabel: "Count in",
  clearGoal: "Clear goal",
  saved: "Goal saved",
  cleared: "Goal cleared",
  voluntary: "A goal is only a help. Missing a day changes nothing, and a weekly goal can be caught up any day.",
  // the planner
  planTitle: "Finish the Qurʾān",
  planSub: m => `Pages of your mushaf: ${m}`,
  inDays: "In a number of days",
  byDate: "By a date",
  daysN: n => `${n} days`,
  custom: "Custom",
  customDays: "Days",
  date: "Last day",
  eid: d => `Before Eid al-Fiṭr · ${d}`,
  from: "Start from",
  fromHere: p => `Where I am · page ${p}`,
  fromStart: "The beginning",
  planSum: (p, d) => `About ${p} ${p === 1 ? "page" : "pages"} a day · finish ${d}`,
  planNote: "Excused days pause the plan. If a day is light, the pages are spread gently over the days left.",
  // "Start on 1 Ramaḍān, finish by Eid" (the planner's third choice; a scheduled plan until 1 Ramaḍān)
  ramadan: "Ramaḍān",
  ramadanTitle: "Start on 1 Ramaḍān, finish by Eid",
  ramadanStart: d => `Starts 1 Ramaḍān · ${d}`,
  ramadanEnd: d => `Finish by Eid · ${d}`,
  ramadanNone: "The Hijri calendar isn't available on this phone, so Ramaḍān can't be worked out. Choose a date instead.",
  // a plan that hasn't started yet (Read → For today, the goal card)
  starts: (ramadan, d) => (ramadan ? `Starts on 1 Ramaḍān · ${d}` : `Starts ${d}`),
  // Settings → Qurʾān goal: a plan's finish date ("Finish by 9 Mar"; before it starts, "Starts 17 Feb · finish by 18 Mar")
  finishShort: d => `Finish by ${d}`,
  startsFinish: (a, b) => `Starts ${a} · finish by ${b}`,
  savePlan: "Save plan",
  // "I read…"
  readTitle: "I read…",
  readSub: d => `In your own mushaf or anywhere else · ${d}`,
  amount: "Amount",
  alsoTick: "Mark Qurʾān recitation done for today",
  addBtn: "Add",
  saveEdit: "Save",
  added1: a => `Added ${a}`,
  removed: "Removed",
  entries: "Added today",
  entriesDay: "Added that day",
  remove: a => `Remove ${a}`,
  editEntry: a => `Edit ${a}`,
  minNote: "Minutes count towards a minutes goal; pages and juzʾ count towards a pages, juzʾ or finish goal.",
  excusedRead: "On an excused day the goal is paused, so there is nothing to add. Listening to the Qurʾān counts for the day.",
  // Settings → Read
  settingsRow: "Qurʾān goal",
  notSet: "Not set",
  // Progress → Charts → Qurʾān
  chartTab: "Qurʾān",
  perDay: "Reading each day",
  perDaySubP: "Pages · last 30 days",
  perDaySubM: "Minutes · last 30 days",
  perMonth: "Reading each month",
  seg: { pages: "Pages", min: "Minutes" },
  segLabel: "Show",
  totals: (p, m, d) => [[String(p), "pages"], [String(m), "minutes"], [String(d), d === 1 ? "day with reading" : "days with reading"]],
  chartAria: (unit, a, b, total, days) => `${unit === "min" ? "Minutes" : "Pages"} of Qurʾān read each day, ${a} to ${b}: ${total} in all, on ${days} ${days === 1 ? "day" : "days"}.`,
  barTitle: (d, v, unit) => `${d}: ${unitN(unit, v)}`,
  barExcused: d => `${d}: excused`,
  none: "No reading counted yet. Pages turned in the reader and anything you add with “I read…” show here.",
  chartCap: "Reading in the app and in your own mushaf, together. There is no target line: every page is good.",
  goalLine: g => `Goal: ${g}`,
};
