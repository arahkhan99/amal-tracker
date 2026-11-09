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

/* ---------- bottom bar (view ids are unchanged: home, tracker, tools, qada, progress) ---------- */
export const NAV = { home: "Home", tracker: "Tracker", tools: "Tools", qada: "Make-ups", progress: "Progress", settings: "Settings" };

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
export const STATUS = { congregation: "In jamāʿah", ontime: "On time", madeup: "Made up", missed: "Missed", excused: "Excused" };
/** Short forms for segmented controls (catch-up sheet). */
export const STATUS_SHORT = { congregation: "Jamāʿah", ontime: "On time", madeup: "Made up", missed: "Missed", excused: "Excused" };
/** One-line help under each status in the log sheet. */
export const STATUS_HELP = {
  congregation: "With the congregation",
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
  hanafi: "Later ʿAsr · 12 emphasised sunnahs · Witr is wājib",
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
  wajib: { name: "Wājib", gloss: "Necessary (Hanafī)", line: "Witr · tracked on its own" },
  muakkadah: { name: "Sunnah muʾakkadah", short: "Muʾakkadah", gloss: "Emphasised", line: "The daily 12, plus 4 before and 4 after Jumuʿah" },
  ghayr: { name: "Sunnah ghayr muʾakkadah", short: "Ghayr muʾakkadah", gloss: "Non-emphasised", line: "4 before ʿAsr, 4 before ʿIshāʾ" },
  nafl: { name: "Nafl", short: "Nafl", gloss: "Optional extras", line: "Off by default · Duhā, Tahajjud, Awwābīn…" },
  raghibah: { name: "Raghībah", short: "Raghībah", gloss: "Above a voluntary prayer, just below a sunnah", line: "The 2 before Fajr" },
  nafilahMuakkadah: { name: "Nāfilah muʾakkadah", short: "Nāfilah muʾakkadah", gloss: "Emphasised voluntary", line: "Before and after Zuhr, before ʿAsr, after Maghrib and ʿIshāʾ" },
  sunnah: { name: "Sunnah", short: "Sunnah", gloss: "Sunnah", line: "Witr" },
  sunnahMuakkadah: { name: "Sunnah muʾakkadah", short: "Muʾakkadah", gloss: "Emphasised", line: "Witr" },
};
/** The small tag on a Witr chip, by madhhab (Hanafī: wājib; Mālikī: Sunnah; others: sunnah). */
export const WITR_TAG = { hanafi: "wājib", shafii: "sunnah", hanbali: "sunnah", maliki: "Sunnah" };
export const WITR_UI = {
  chip: n => `Witr ${n}`,
  title: n => `Witr · ${plural(n, "rakʿah")}`,
  line: {
    hanafi: "Wājib in the Hanafī school, after ʿIshāʾ",
    shafii: "Sunnah muʾakkadah, after ʿIshāʾ",
    hanbali: "Sunnah muʾakkadah, after ʿIshāʾ",
    maliki: "The one daily prayer counted as Sunnah, after ʿIshāʾ",
  },
  settingsLine: {
    hanafi: "Wājib in the Hanafī madhhab · shown on ʿIshāʾ, counted in make-ups",
    shafii: "Sunnah muʾakkadah · shown on ʿIshāʾ, not owed if missed",
    hanbali: "Sunnah muʾakkadah · shown on ʿIshāʾ, not owed if missed",
    maliki: "Sunnah · shown on ʿIshāʾ, not owed if missed",
  },
  rowLabel: { hanafi: "Witr · wājib (Hanafī)", shafii: "Witr · sunnah", hanbali: "Witr · sunnah", maliki: "Witr · Sunnah" },
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
  greetingName: name => `As-salāmu ʿalaykum, ${name}`,
  salahToday: "Salāh today",
  todaysPrayers: "Today's prayers",
  nOfFivePrayed: n => `${n} of 5 prayed`,
  nOfFiveLogged: n => `${n} of 5 logged`,
  tapToChange: "Tap a prayer to change it. Earlier days are in Tracker.",
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
  wantMoreSub: "Sunnah prayers, Good Deeds, make-ups, Tools and weekly reminders are in Settings → Features.",
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
  sheetLead: "Private to you. Shown only as a small moon in your tracker.",
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
  empty: "No good deeds on your list. Add some from the Tracker tab.",
  emptyTracker: "No good deeds on your list yet.",
  addButton: "+ Add a good deed to your daily list",
  addTitle: "Add a good deed",
  addLead: "It will appear on Home and in Progress from today.",
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
  noTarget: "Salawāt and sadaqah have no daily target; every one is counted.",
};
/** Names of the built-in good deeds (store.DEFAULT_AMAL uses these). */
export const DEED_NAME = {
  quran: "Qurʾān recitation", morning: "Morning adhkār", evening: "Evening adhkār", salawat: "Salawāt", sadaqah: "Sadaqah",
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
  witrRow: "Witr", witrRowSub: "Wājib in the Hanafī school",
  restored: n => `${n} restored`,
  toGo: (fard, witr) => `${fard} fard${witr ? ` + ${witr} Witr` : ""} to go`,
  goalSetting: "Make-up monthly goal",
  goalSettingValue: (p, f) => `${plural(p, "prayer")}, ${plural(f, "fast")}`,
};

/* ---------- Progress ---------- */
export const PROGRESS = {
  title: "Progress",
  ranges: { day: "Day", week: "Week", month: "Month", year: "Year" },
  chapters: { salah: "Salāh", streaks: "Streaks", sunnah: "Sunnah", jamaah: "Jamāʿah", habits: "Habits", qada: "Make-ups", reflect: "Reflections" },
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
  bestOnTime: n => `Best ${n} · jamāʿah or on time only`,
  streakExcused: "Excused days are skipped: they never break a streak. ",
  streakToday: "Today counts once ʿIshāʾ is logged.",
  sunnahPrayers: "Sunnah prayers", apartFromFard: "counted apart from fard",
  goingWell: "Going well", oneStep: per => `One step for next ${per}`,
  fardPrayed: "Fard prayed", ofDue: n => `of ${n} due`,
  dailyHabits: "Daily habits",
  jamaahThisWeek: "In jamāʿah this week",
  pctFardPrayed: "of fard prayed", pctOnTime: "on time or in jamāʿah", daysAllFive: "days with all five",
  jamaahCap: "Prayed in jamāʿah, out of those due from the start of the week to today. Praying at home on time still counts fully.",
  prayersInJamaah: "Prayers in jamāʿah", sharePerWeek: "share per week",
  // existing views (day / week / month / year)
  doingWell: "Doing well", needsCare: "Needs more care",
  doingWellEmpty: "Keep logging. Your strengths show up here after a few days.",
  needsCareEmpty: "Nothing stands out right now. Alhamdulillah.",
  backToToday: "Back to today", soFar: "so far", completion: "completion",
  inJamaah: "in jamāʿah", deedsDone: "good deeds done",
  byStatus: "Prayers by status", noneLogged7: "No prayers logged in the last 7 days yet.",
  weekSoFar: "week so far", dayStreak: "day streak", vsLastWeek: "vs last week",
  jamaahPrayers: "jamāʿah prayers", madeUpWord: "made up",
  monthSoFar: m => `${m} so far`, yearAverage: y => `${y} average`, bestMonth: "best month",
  makeupsCleared: "make-ups cleared", byMonth: "By month",
};

/** Plain-language insights (stats.insights). */
export const INSIGHT = {
  congTitle: (p, n, days) => `${p} in jamāʿah ${n} of the last ${plural(days, "day")}`,
  congSub: "Your strongest jamāʿah habit right now.",
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
  unloggedSub: "Fill them in from the Tracker so your progress stays accurate.",
  witrTitle: n => `Witr on ${n} of the last 7 nights`,
  witrSub: "Wājib in the Hanafī school, and you've kept it.",
};

/* ---------- features ---------- */
export const FEATURE = {
  title: "Features",
  intro: "What would you like Zad to help with? Turn off anything you don't need; it leaves Home and the bottom bar. You can turn it back on anytime and nothing is lost.",
  cap: "What Zad helps you with. Anything off leaves Home and the bottom bar.",
  bottomBar: "Your bottom bar",
  count: (n, m) => `${n} of ${m}`,
  summary: "Prayers, sunnah, good deeds, make-ups, this week, progress, tools",
  justPrayers: "Just prayers",
  justPrayersSub: "Only the five prayers. Add more later.",
  everything: "Everything",
  names: {
    prayers: "Prayers", sunnah: "Sunnah prayers", deeds: "Good Deeds", makeups: "Make-ups",
    week: "This week", progress: "Progress", tools: "Tools",
  },
  subs: {
    prayers: "The five daily prayers. Always on.",
    sunnah: "Chips on each fard row, by tier",
    deeds: "Qurʾān, adhkār, salawāt, sadaqah",
    makeups: "Count and pray back missed prayers",
    week: "One short reading for the week",
    progress: "Weekly and monthly view",
    tools: "Adhkār, durūd, Hizb al-Aʿzam and Qurʾān",
  },
};
export const TOOL_NAME = { adhkar: "Adhkār", durud: "Durūd", hizb: "Hizb al-Aʿzam", quran: "Qurʾān" };
export const TOOL_SUB = {
  adhkar: "Morning and evening",
  durud: "Forty durūd · suggested daily, at least on Friday",
  hizb: "One manzil a day · Saturday is manzil 1",
  quran: "Read the mushaf",
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
  para: n => `Para ${n}`, juz: n => `Juz ${n}`,
  translation: "Translation", pickthall: "Pickthall",
};

/* ---------- This week content (content.js) ---------- */
export const WEEK_UI = {
  ayah: "Āyah of the week", hadith: "Hadīth of the week", dua: "Duʿāʾ of the week", seerah: "Sīrah moment",
  tabs: { ayah: "Āyah", hadith: "Hadīth", dua: "Duʿāʾ", seerah: "Sīrah" },
  sahabi: m => `Sahābī · ${m}`, sunnah: m => `Sunnah · ${m}`,
  thisMonth: "This month", readMore: "Read more", new: "New",
  weekOf: d => `Week of ${d}`,
  weekRange: (a, b) => `${a} – ${b}`,
};
/** Day letters for a Saturday-first week (This week, Hizb). */
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
  appearance: "Appearance",
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
  weekCard: "“This week” card on Home", weekCardSub: "One short reading for the week",
  reflection: "Daily reflection", reflectionSub: "An āyah or hadīth each morning",
  seerah: "Friday sīrah moment",
  remindNote: "shown in the app on this device",
  lock: "App lock", lockSub: "Fingerprint or face each time Zad opens",
  noBiometry: "No fingerprint or screen lock set up on this phone", notTurnedOn: "Not turned on",
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
  yourName: "Your name", nameLead: "Used for the greeting on Home.", namePlaceholder: "Your name", notSet: "Not set",
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
  cloudPrivate: "Only you can read your data. It is stored in Firebase, Google's app database.",
  signedInAs: email => `Signed in as ${email}.`,
  lastSynced: ago => `Last synced ${ago}.`,
  deletePausedBody: email => `Signed in as ${email}. Deleting your account didn't finish, so sync is paused and nothing is uploaded.`,
  keepAccount: "Keep my account", keepAccountNote: "Keep my account turns sync back on and uploads this phone's data again.",
  signOut: "Sign out", syncNow: "Sync now",
  signOutNote: "Signing out keeps everything on this phone. Changes stop syncing until you sign in again.",
  signedInToast: "Signed in · backup is on", signInFailed: "Sign-in didn't finish. Try again.",
  syncedToast: "Synced", signedOutToast: "Signed out · data kept on this phone", syncBackOn: "Sync is back on",
  // consent
  updatedTerms: "Updated terms", terms: "Terms of use", privacy: "Privacy policy", support: "Support",
  termsChanged: "The Terms of use and Privacy policy have changed.",
  termsNew: "Cloud backup now asks you to agree to the Terms of use and Privacy policy.",
  termsAsk: "Please read them and agree to keep cloud backup on.",
  agree: "Agree", notNowSignsOut: "Not now signs you out of cloud backup. Everything stays on this phone.",
  thanks: "Thanks · cloud backup stays on",
  consentLine: "By signing in you agree to the {terms} and {privacy}.", // {terms}/{privacy} are replaced with links
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
  notOpened: "Not opened yet", goldChange: "Gold tiles change each Hijri month", afterJumuah: "new set after Jumuʿah",
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
  allPrayed: (ot, r) => `Every prayer due so far was prayed: <b>${ot}</b> on time or in jamāʿah, <b>${r}</b> made up.`,
  mostPrayed: (pr, due) => `<b>${pr} of ${due}</b> prayers prayed so far. Every one you log keeps the picture honest.`,
  noData: "Nothing logged in this period yet.",
  streakHead: (a, o) => `<b>${a} ${a === 1 ? "day" : "days"}</b> with all five prayed. <b>${o}</b> all on time.`,
  streakMonth: (a, b) => `Now <b>${a} ${a === 1 ? "day" : "days"}</b> with all five; your best is <b>${b}</b>.`,
  sunnahYest: (g, o, tg, to) => `Emphasised: <b>${g} of ${o}</b> rakʿahs yesterday, ${tg} of ${to} so far today.`,
  sunnahPeriod: (pct, w) => `Emphasised sunnahs on <b>${pct}%</b> of their rakʿahs${w == null ? "" : `; Witr on <b>${w}%</b> of nights`}.`,
  jamHead: n => `<b>${n} ${n === 1 ? "prayer" : "prayers"}</b> in congregation.`,
  jamMonth: n => `About <b>1 in ${n}</b> prayers in jamāʿah over this period.`,
  habitsHead: (best, weak) => weak ? `${best} is steady; ${weak} is the one to nurture.` : `${best} is steady.`,
  habitsNone: "Good deeds you log show up here.",
  makeupHead: n => `<b>${n} restored</b> ${n === 1 ? "this month" : "this month"}, one small step at a time.`,
  makeupYear: n => `<b>${n} restored</b> this year.`,
  makeupAll: "restored so far",
  reflectHead: "What's taking hold, and one step for next time.",
  goingWell: PROGRESS.goingWell, setReminder: "Set a reminder", nothingYet: "Keep logging. Your strengths show up here after a few days.",
  eachSub: "of prayers due",
  prayedDays: "days with all five", ofFard: "of fard prayed", onTime: "on time or in jamāʿah",
  upFromPct: p => `up from ${p}%`, fardPrayedN: "fard prayed", madeUpSame: "made up the same day",
  yearDays: "Your year in days", fardByMonth: "Fard by month", pctDue: "% of prayers due", eachByMonth: "Each prayer by month",
  yearBest: "best run", markLegend: "What the marks mean · long-press any chip",
  rows: "rows", inJamaah: "In jamāʿah", noRings: "Excused days are shown quietly, without rings.",
  noTarget: "no daily target", edge: "growth edge", fewer: "less", more: "more",
  whatMeans: COMMON.whatDoesThisMean,
};

/** views/qada.js */
export const MAKEUPS_X = {
  monthGoal: m => `${m}’s goal`, prayersUnit: "prayers", paceFor: "pace for today",
  ahead: "Ahead of pace", onPace: "On pace", behind: "Behind pace", changeGoal: "Change goal",
  askHead: "Prayed a make-up prayer?", witrTag: "wājib · Hanafī", left: n => `${n.toLocaleString("en")} left`,
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
  privateNote: "Only you can read your backup. Zad never sees your password and never posts anything.",
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
  calcNote: "Calculated on your phone. Your location never leaves it.", notSet: "Not set yet",
  madhhabEyebrow: "How you pray", madhhabTitle: "Which madhhab do you follow?", asr: "Asr", continueWith: n => `Continue with ${n}`,
  madhhabNote: "Sets your ʿAsr time, the sunnah prayers we list and Witr in make-ups. Not sure? Keep Hanafī.",
  featEyebrow: "Make it yours", featTitle: "What would you like Zad to help with?", justPrayers: "Just prayers", everything: "Everything",
  alwaysOn: "Always on · the five fard", featNote: "Turned off things disappear from Home. Switch them on any time in Settings → Features.",
  continueN: n => `Continue · ${n} chosen`,
  oweEyebrow: "Last one · optional", oweTitle: "Do you have missed prayers to make up?", yes: "Yes", no: "No", notSure: "Not sure",
  howLong: "Roughly how long?", none: "None", underYear: "Under a year", oneTwo: "1–2 years", threeFive: "3–5 years", exact: "Enter exact numbers",
  about: "about", prayersWord: "prayers", fastsWord: "fasts", includesWitr: "Includes Witr", witrWajib: "wājib in the Hanafī madhhab",
  perDay: "How many a day?", yourGoal: "your goal", aMonth: n => `${n} a month`,
  fine: "That’s completely fine", fineBody: "You can add an estimate any time from Make-ups. Zad will start counting from today: missed prayers add, made-up ones subtract.",
  start: "Start tracking",
  permLocTitle: "Find your prayer times?", permLocBody: "Zad uses your location to work out today’s prayer times on your phone. It never leaves your phone.", permLocYes: "Allow location", permLocNo: "Enter a city instead", permLocFoot: "Your phone will ask next. Change any time in Settings.",
  permNotTitle: "A gentle nudge at each prayer?", permNotBody: "Zad can remind you when each prayer starts, so you can log it on time. One quiet note, no spam.", permNotYes: "Turn on reminders", permNotNo: "Not now", permNotFoot: "Your phone will ask next. Change any time in Settings.",
  notifTitle: "Zad", notifBody: p => `It’s time for ${p}. Tap to mark it prayed.`, now: "now",
  nextIs: p => `next is ${p} at`, lockTouch: "Touch the sensor to unlock", lockPin: "use your PIN", lockOr: "or", unlock: "Unlock",
  greet: n => n ? `${SETUP.welcome}, ${n}` : SETUP.welcome, nextAt: (p, t, left) => `${p} at ${t} · in ${left}`,
  yearsLabel: "Quick fill: years of prayers and fasts missed",
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
  featuresPrayersOnly: "Just prayers", toolsHead: "Tools", toolsLead: "Hide a tool you don't use. It leaves the Tools tab.",
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
};

/** Everything, for lookups by group name. */
export const STR = {
  APP, NAV, COMMON, PRAYER_NAME, STATUS, STATUS_SHORT, STATUS_HELP, STATUS_EXTRA, WITR_STATUS,
  MADHHAB_NAME, MADHHAB_SUMMARY, MADHHAB_UI, ASR_LABEL, ASR_UI, TIER, WITR_TAG, WITR_UI, SUNNAH_NAME, SUNNAH_UI, MEASURE,
  TIMES, HOME, EXCUSED, DEEDS, DEED_NAME, DEED_HINT, TRACKER, LOG, MAKEUPS, PROGRESS, INSIGHT,
  FEATURE, TOOL_NAME, TOOL_SUB, TOOLS_UI, WEEK_UI, WEEK_LETTERS_SAT, WEEK_LETTERS_MON, NOTIFY, SETTINGS, SETUP,
  HOME_X, PROGRESS_L, MAKEUPS_X, SETUP_X, SETTINGS_X,
};
export default STR;
