/* The Today tab (#v-home): one page since 19 Nov 2026 (the merged Today, then Direction B "Time of day"): a header
   tinted by the time of day with the current or next prayer in an arch (Prayed, Qibla, ⋯, its sunnah), the five
   prayers as a thin list, tap to log (rules in src/today.js), then two pills (Good deeds, Make-ups).
   With one tab only (prayers only) it is the same page without a tab bar.
   The calendar (past days) is views/calendar.js. Also the shared pieces other views use: the prayer log sheet,
   sunnah chips, explainers, good-deed rows and sheets, and the "This week" readings (shown in Read).
   All visible text comes from strings.js / glossary.js. */
import { S, UI, A, $, NOW, todayKey, onRender, commit, render, toast, openSheet, closeSheet, go, avatarBtn } from "../app.js";
import * as store from "../store.js";
import { PRAYERS, DOW, MON, fmt12, dkey, parseKey, addDays, daysBetween, esc } from "../util.js";
import { timesFor, currentWindow, windowEnd, ishaBestBefore, madeUpDeadline, canStillMakeUp, excusedSoFar, METHOD_SHORT, FALLBACK_LOCATION } from "../times.js";
import { canLog, logAllowed, madeUpAllowed } from "../logging.js";
import { hijriLabel, currentHijri } from "../hijri.js";
import * as st from "../stats.js";
import { isOn, navTabs } from "../features.js";
import { madhhabOf, tierLabel, TIERS, itemById } from "../rules/madhhab.js";
import { thisWeek, pastSahabi, setSahabiStart, monthIndex, contentReady, loadContent, whenContent } from "../content.js";
import { gloss } from "../glossary.js";
import * as T from "../strings.js";
import { HOME_X, NOT_YET, TODAY } from "../strings.js";
import { reportLink } from "../feedback.js";
import { homeChip as pvChip, homeOffer as pvOffer } from "./provisions.js";
import { otherOptions, logPrayer, snapshotDays, restoreSnapshot, guideLineDue, makeUpNowOn, makeupsLine, todayRows, todayFocus, rowState, tapHintDue, markTapHint, naflTimes, deedsLine, deedGroups, dailyChoices, setDaily, bandAt, heroOf, tapNext } from "../today.js";
import { goalStatus } from "../quran-goal.js";
import { goalLine } from "./quran-goal.js";
import { NAFL_ADDON } from "../rules/madhhab.js";
import { qiblaDegrees } from "./qibla-page.js";
import { registerReset, setHTML } from "./chapters.js";
import { READ, NAFL, SUNNAH_NAME, MEASURE } from "../strings.js";

const { APP, COMMON, STATUS, HOME, TIMES, LOG, DEEDS, EXCUSED, SUNNAH_UI, TIER, WEEK_UI } = T;
export { STATUS };

/* Home-only labels (strings.js HOME_X). */
export const X = HOME_X;

/* ---------- tiny helpers ---------- */
/** Prefix every class in a fragment so nothing collides with the shared stylesheet. */
export const zz = html => html.replace(/class="([^"]*)"/g, (_, c) => `class="${c.split(/\s+/).filter(Boolean).map(x => "z-" + x).join(" ")}"`);
const I = {
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', dcheck: '<path d="M2.5 12.5l4 4L15 8"/><path d="M10.5 16.5L19 8"/>',
  dash: '<path d="M7 12h10"/>', clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  madeup: '<path d="M4.5 12a7.5 7.5 0 1 0 2.3-5.4"/><path d="M4.2 4.2v4.6h4.6"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
  chev: '<path d="M9 6l6 6-6 6"/>', chevL: '<path d="M15 6l-6 6 6 6"/>',
  people: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2a5 5 0 0 1 5.5 5.8"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>', history: '<path d="M3.5 12a8.5 8.5 0 1 0 2.5-6"/><path d="M3 4v4.5h4.5"/><path d="M12 8v4.5l3 1.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.2"/>', plus: '<path d="M12 5v14M5 12h14"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  bars: '<path d="M5 20V11M12 20V5M19 20v-6"/>',
  hand: '<path d="M7 11V6.5a1.5 1.5 0 0 1 3 0V11M10 10V5a1.5 1.5 0 0 1 3 0v5M13 10V6a1.5 1.5 0 0 1 3 0v6M16 10.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-.5A6.5 6.5 0 0 1 6 17.5L4 13.5a1.5 1.5 0 0 1 2.6-1.5L7 13"/>',
  beads: '<circle cx="12" cy="5" r="2"/><circle cx="6" cy="9" r="2"/><circle cx="18" cy="9" r="2"/><circle cx="7.5" cy="16" r="2"/><circle cx="16.5" cy="16" r="2"/>',
  sun: '<path d="M12 4v2M5.6 9.6l1.4 1.4M18.4 9.6L17 11M3 17h2M19 17h2M8 17a4 4 0 0 1 8 0M3 20h18"/>',
  note: '<path d="M5 4h10l4 4v12H5z"/><path d="M15 4v4h4M8.5 12.5h7M8.5 16h5"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5"/>',
  dots: '<path d="M5.5 12h.01M12 12h.01M18.5 12h.01"/>',
  // Direction B (19 Nov 2026): the Today header, list and pills
  qibla: '<circle cx="12" cy="12" r="8.6"/><path d="M14.9 9.1l-1.7 4.1-4.1 1.7 1.7-4.1z" fill="currentColor" stroke-width="1.2"/>',
  sunrise: '<path d="M3.5 18.5h17M7 15.5a5 5 0 0 1 10 0M12 5.5v3M5.4 9l1.5 1.4M18.6 9l-1.5 1.4"/>',
  heart: '<path d="M12 19.5s-7-4.3-7-9.6A3.9 3.9 0 0 1 12 7.6a3.9 3.9 0 0 1 7 2.3c0 5.3-7 9.6-7 9.6z"/>',
  book: '<path d="M12 6.5C10.3 5.2 7.6 4.8 4 5v13c3.6-.2 6.3.2 8 1.5 1.7-1.3 4.4-1.7 8-1.5V5c-3.6-.2-6.3.2-8 1.5zM12 6.5v13"/>',
};
export const ic = (n, cls = "i", extra = "") => `<svg class="${cls}" viewBox="0 0 24 24" ${extra} aria-hidden="true">${I[n]}</svg>`;

const SK = { congregation: "c", ontime: "o", madeup: "r", missed: "m", excused: "x" };
const SICON = { c: "dcheck", o: "check", r: "madeup", m: "dash", x: "moon" };
const sk = s => SK[s] || "";
const settings = () => S.settings;
const jumuahOn = () => S.settings.jumuah !== false;
export const pName = (p, key = todayKey()) => T.prayerName(p, { date: parseKey(key), jumuah: jumuahOn() });
const longDate = d => new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(d);
const weekday = d => new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(d);
/** "1 h 34 min" (the Now chapter and rows). */
const hm = ms => { const m = Math.max(0, Math.round(ms / 60000)); return TODAY.hm(Math.floor(m / 60), m % 60); };
/** A status mark: icon + fill, never colour alone. `cls` adds classes (unprefixed: they go through zz or zt-). */
export const statusMark = (s, cls = "") => SICON[sk(s)] ? `<span class="z-mk z-${sk(s)} ${cls}">${ic(SICON[sk(s)], "")}</span>` : `<span class="z-mk ${cls}"></span>`;
export const marker = s => SICON[sk(s)] ? `<span class="mk ${sk(s)}">${ic(SICON[sk(s)], "")}</span>` : `<span class="mk"></span>`;
const tierCls = t => (t === "ghayr" ? "gm" : t === "nafl" ? "nf" : "mu");

export function dayLabel(key) {
  if (key === todayKey()) return "";
  if (key === dkey(addDays(NOW(), -1))) return LOG.yesterdayPrefix;
  const d = parseKey(key);
  return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()].slice(0, 3)} · `;
}

/* ---------- undo: snapshot the parts of S a change can touch (src/today.js) ---------- */
export const snapshot = keys => snapshotDays(S, keys);
export function restore(snap) { restoreSnapshot(S, snap); commit(); }
const undoable = snap => ({ undo: () => restore(snap) });

/* ---------- explainer (the small ⓘ next to an Arabic term) ---------- */
export const xi = id => `<button type="button" class="xi" data-gl="${id}" aria-label="${esc(COMMON.whatDoesThisMean)}">${ic("info", "i")}</button>`;
A.explain = id => {
  const g = gloss(id); if (!g) return;
  openSheet(zz(`<div class="sh xs"><div class="lhd"><div><h3>${esc(g.term)}</h3>${g.ar ? `<div class="ar">${g.ar}</div>` : ""}</div><button class="cls" onclick="A.closeSheet()" aria-label="${COMMON.close}">${ic("close")}</button></div>
    <p class="m">${esc(g.meaning)}</p>${g.draft ? `<div class="dr">${APP.draftFlag}</div>` : ""}
    <div class="shfoot"><button class="pbtn" onclick="A.closeSheet()">${COMMON.gotIt}</button></div></div>`));
};

/* ---------- live sheets: a sheet that redraws itself after a change ---------- */
let live = null, liveId = 0;
export function showSheet(builder) {
  live = { id: ++liveId, builder };
  openSheet(`<div data-live="${live.id}">${withRead(zz(builder()))}</div>`);
}
export function refreshLive() {
  if (!live) return;
  const el = $("#sheet [data-live]");
  if (!$("#scrim").classList.contains("on") || !el || +el.dataset.live !== live.id) { live = null; return; }
  openSheet(`<div data-live="${live.id}">${withRead(zz(live.builder()))}</div>`);
}

/* ---------- sunnah chips ---------- */
const sunnahOn = () => isOn(S, "sunnah");
function witrShown(key) {
  const w = store.witrChip(S, key);
  return w.allowed && (w.inQada || sunnahOn()) ? w : null;
}
export function chipHTML(c, key) {
  const done = store.sunnahDone(S, key, c.id);
  return `<button type="button" class="sc ${tierCls(c.tier)} ${done ? "d" : ""}" data-chip="${c.id}" data-key="${key}" aria-pressed="${done}">${done ? ic("check", "") : '<i class="o"></i>'}${esc(c.label)}</button>`;
}
export function witrChipHTML(w, key) {
  return `<button type="button" class="sc wj ${w.done ? "d" : ""}" data-witr="1" data-key="${key}" aria-pressed="${w.done}">${w.done ? ic("check", "") : '<i class="o"></i>'}${esc(w.chip)}${w.tag ? `<em>${esc(w.tag)}</em>` : ""}</button>`;
}
/** All chips of one fard on one day (sunnah by tier, plus Witr on ʿIshāʾ). */
export function chipsFor(p, key) {
  const out = [];
  if (sunnahOn()) for (const c of store.sunnahChips(S, key, p)) out.push(chipHTML(c, key));
  if (p === "Isha") { const w = witrShown(key); if (w) out.push(witrChipHTML(w, key)); }
  return out;
}
export const chipLegend = () => `<div class="slg"><span><i class="lmu"></i>${TIER.muakkadah.name}${xi("sunnahMuakkadah")}</span><span><i class="lgm"></i>${TIER.ghayr.short}${xi("ghayrMuakkadah")}</span><span><i class="lwj"></i>${T.WITR_UI.rowLabel[madhhabOf(S)] || "Witr"}${xi("witr")}</span></div>`;

/** Toast for a log refused because its prayer hasn't begun (logging.js). */
const notYetToast = (p, key) => toast(NOT_YET.body(pName(p, key)));

function toggleChip(el) {
  const key = el.dataset.key, now = NOW();
  const owner = el.dataset.witr ? "Isha" : itemById(el.dataset.chip, madhhabOf(S))?.prayer;
  if (el.dataset.witr) {
    const w = store.witrChip(S, key);
    const next = w.status === "done" ? null : "done";
    if (!logAllowed(S, key, "Isha", next, now)) { notYetToast("Isha", key); return; } // unticking is always allowed
    store.setWitr(S, key, next, now);
    commit(); return;
  }
  if (tickSunnah(el.dataset.chip, key, owner, now)) commit();
}
/** Tick or untick sunnah item `id` on day `key` (same rules everywhere). Returns true when it changed; caller commits. */
function tickSunnah(id, key, owner = itemById(id, madhhabOf(S))?.prayer, now = NOW()) {
  const was = store.sunnahDone(S, key, id);
  if (!logAllowed(S, key, owner, !was, now)) { notYetToast(owner, key); return false; } // unticking is always allowed
  if (!store.setSunnah(S, key, id, !was, now)) { toast(id === "maghrib-awwabin" ? NAFL.afterMissed : SUNNAH_UI.notAfterMissed); return false; }
  return true;
}

A.chipInfo = (id, key, witr) => {
  let tier, title, text, gl;
  if (witr) {
    const w = store.witrChip(S, key); tier = w.tier || "wajib";
    title = T.WITR_UI.title(w.rakahs); text = w.line; gl = gloss("witr");
  } else {
    const c = allChips(key).find(x => x.id === id);
    if (!c) return;
    tier = c.tier;
    title = `${SUNNAH_UI.rakahs(c.rakahs)} ${c.when === "before" ? "before" : "after"}`;
    gl = gloss(TIERS[tier]?.glossary);
    text = gl?.meaning || "";
    title = c.prayer === "day" ? c.label : `${title} ${pName(c.prayer, key)}`;
  }
  const tl = tierLabel(tier);
  // no wājib row (19 Nov 2026: the word isn't shown); Witr's sheet is just "Witr" with its rakʿahs and line
  const rows = [["fd", TIER.fard], ["mu", TIER.muakkadah], ["gm", TIER.ghayr], ["nf", TIER.nafl]];
  const here = witr ? "wj" : tierCls(tier);
  showSheet(() => `<div class="sh">${witr ? "" : `<span class="kick">${esc(tl.name)} · ${esc(tl.gloss || "")}</span>`}
    <div class="lhd"><h3 style="margin-top:6px">${esc(title)}</h3><button class="cls" onclick="A.closeSheet()" aria-label="${COMMON.close}">${ic("close")}</button></div>
    <p class="ip">${esc(text)}</p>
    ${witr ? "" : `<div class="tiers">${rows.map(([k, t]) => `<div class="tier ${k === here ? "on" : ""}"><i class="${k}"></i><div><b>${esc(t.name)} <span>· ${esc(t.gloss)}</span></b><small>${esc(t.line)}</small></div></div>`).join("")}</div>`}
    ${gl?.draft ? `<p class="fine">${APP.draftFlag}</p>` : ""}
    <div class="shfoot">${tier === "ghayr" ? `<button class="gbtn" onclick="A.hideGhayr()">${SUNNAH_UI.hideGhayr}</button>` : ""}<button class="pbtn" onclick="A.closeSheet()">${COMMON.gotIt}</button></div></div>`);
};
const allChips = key => PRAYERS.flatMap(p => store.sunnahChips(S, key, p, { all: true })).concat(store.sunnahChips(S, key, "day", { all: true }));
A.hideGhayr = () => { S.settings.sunnahGhayr = false; closeSheet(); commit(); };

/*
 * One delegated handler for chips and prayer rows (tap) and explainers. A long press on a chip opens its tier sheet
 * (480 ms); on a prayer row (data-tap, the Today page) its options sheet (450 ms, A.rowMore). The click that ends a
 * long press is swallowed. A press is cancelled when the finger lifts, moves more than a few pixels or the page
 * scrolls (pointercancel). Taps act at once: no double-tap wait (touch-action: manipulation in css/today.css).
 */
export const LONG_MS = { chip: 480, row: 450 };
const PRESS_SEL = "[data-chip],[data-witr],[data-tap]";
let pressTimer = null, pressed = false, pressAt = null;
/** Start a press on `el` at (x, y); after the delay its long-press action runs. Exported for tests. */
export function pressStart(el, x = 0, y = 0) {
  pressed = false; clearTimeout(pressTimer); pressAt = { x, y };
  const row = el.dataset.tap;
  pressTimer = setTimeout(() => {
    pressed = true; pressAt = null;
    if (row) A.rowMore(row, el.dataset.key); else A.chipInfo(el.dataset.chip, el.dataset.key, !!el.dataset.witr);
  }, row ? LONG_MS.row : LONG_MS.chip);
}
export function pressEnd() { clearTimeout(pressTimer); pressAt = null; }
/** The click after a press: false when the press was long (its sheet is open; swallow the click). */
export function pressClick() { if (!pressed) return true; pressed = false; return false; }
document.addEventListener("pointerdown", e => { const el = e.target.closest?.(PRESS_SEL); if (el) pressStart(el, e.clientX, e.clientY); });
for (const ev of ["pointerup", "pointercancel", "scroll"]) document.addEventListener(ev, pressEnd, true);
document.addEventListener("pointermove", e => {
  if (pressAt && Math.abs(e.clientX - pressAt.x) + Math.abs(e.clientY - pressAt.y) > 12) pressEnd();
}, { passive: true });
document.addEventListener("contextmenu", e => { if (e.target.closest?.(PRESS_SEL)) e.preventDefault(); });
document.addEventListener("click", e => {
  const x = e.target.closest?.("[data-gl]");
  if (x) { e.stopPropagation(); e.preventDefault(); A.explain(x.dataset.gl); return; }
  const el = e.target.closest?.(PRESS_SEL); if (!el) return;
  e.stopPropagation(); e.preventDefault();
  if (!pressClick()) return;
  if (el.dataset.tap) A.rowTap(el.dataset.tap, el.dataset.key);
  else toggleChip(el);
}, true);

/* ---------- logging a prayer ---------- */
/** Why a log was refused (src/today.js logPrayer). */
function refused(r, p, key) {
  if (r.reason === "notStarted") notYetToast(p, key);
  else toast(TODAY.madeUpEarly(pName(p, key)));
  refreshLive();
}
/** The full log sheet's tiles and Clear (and A.setPrayer). Same rules as the one-tap buttons. */
export function applyStatus(p, key, status, { close = true } = {}) {
  const r = logPrayer(S, key, p, status, NOW());
  if (!r.ok) { refused(r, p, key); return; }
  const was = r.was;
  if (close) closeSheet();
  commit();
  const n = pName(p, key);
  let msg;
  if (status === "missed") msg = isOn(S, "makeups") ? LOG.missedToast(n) : TODAY.logged(n);
  else if (was === "missed" && status === "madeup") msg = LOG.madeUpToast(n);
  else if (was === "missed") msg = LOG.removedToast(n, status ? STATUS[status] : null);
  else if (status === "excused") msg = LOG.excusedToast(n);
  else if (!status) msg = LOG.setToast(n, COMMON.clear.toLowerCase());
  else msg = LOG.setToast(n, STATUS[status]);
  toast(msg, undoable(r.snap));
}
A.setPrayer = (p, k, key = todayKey()) => applyStatus(p, key, k || null);
A.madeItUp = (p, key = todayKey()) => applyStatus(p, key, "madeup", { close: false });

/** One choice in the options sheet: log it, then "ʿAsr logged · Undo". */
A.logTap = (p, status, key = todayKey()) => {
  const r = logPrayer(S, key, p, status, NOW());
  if (!r.ok) { refused(r, p, key); return; }
  closeSheet();
  commit();
  const n = pName(p, key);
  toast(status === "missed" && isOn(S, "makeups") ? LOG.missedToast(n) : TODAY.logged(n), undoable(r.snap));
};

/**
 * A prayer's options sheet (a Today row's long press or ⋯; all: true): every status, the current one marked, Clear
 * when one is stored, and "Not now" for the row's "Make up now". Without all: only the statuses that aren't one-tap
 * buttons (logButtons), as the old Other sheet did.
 */
A.logSheet = (p, key = todayKey(), all = false) => showSheet(() => {
  const now = NOW(), d = parseKey(key), t = timesFor(d, settings())[p], end = windowEnd(d, p, settings());
  const head = `<div class="lhd"><div><h3>${esc(pName(p, key))}</h3><p class="sub">${esc(TODAY.otherTitleSub(key === todayKey() ? COMMON.today : longDate(d), fmt12(t), fmt12(end)))}</p></div><button class="cls" onclick="A.closeSheet()" aria-label="${COMMON.close}">${ic("close")}</button></div>`;
  const stored = all ? store.getDay(S, key).prayers?.[p] || null : null;
  const clear = stored ? `<p class="fine"><button class="link" data-f="opt-clear" onclick="A.setPrayer('${p}',null,'${key}')" style="font-weight:700;color:var(--z-ink2)">${COMMON.clear}</button></p>` : "";
  if (!canLog(S, key, p, now)) return `<div class="sh">${head}<p class="note">${esc(NOT_YET.body(pName(p, key)))}</p>${clear}<div class="shfoot"><button class="gbtn" onclick="A.closeSheet()">${COMMON.cancel}</button></div></div>`;
  const opts = otherOptions(S, key, p, now, { all: !!all });
  const label = k => k === "congregation" && !all && store.genderOf(S) === "f"
    ? `${esc(TODAY.otherLabel.congregation)} <span class="art">(${esc(gloss("jamaah")?.term.toLowerCase() || "jamāʿah")})</span>` : esc(all ? TODAY.prayedAs[k] : TODAY.otherLabel[k]);
  const sub = k => k === "missed" ? (isOn(S, "makeups") ? `${esc(TODAY.otherSub.missed)} <span class="art">(qaḍāʾ)</span>` : esc(TODAY.otherSub.missedNoMakeups)) : esc(TODAY.otherSub[k]);
  const info = k => k === "congregation" && !all && store.genderOf(S) === "f" ? xi("jamaah") : k === "missed" && isOn(S, "makeups") ? xi("qada") : "";
  const opt = k => {
    const on = stored === k;
    return `<div class="opt${on ? " sel" : ""}"><button class="optb" data-f="opt-${k}" aria-pressed="${on}" onclick="A.logTap('${p}','${k}','${key}')">${marker(k)}<span class="t"><b>${label(k)}</b><small>${sub(k)}</small></span></button>${info(k)}${on ? ic("check", "i cv on") : ic("chev", "i cv")}</div>`;
  };
  const later = all && makeUpNowOn(S, key, p, now, { dismissed: mkNowDismissed(key) })
    ? `<p class="fine"><button class="link" data-f="mknow-later" onclick="A.mkNowLater('${p}')">${esc(TODAY.mkNowHide(pName(p, key)))}</button></p>` : "";
  return `<div class="sh">${head}<div class="opts">${opts.map(opt).join("")}</div>${clear}${later}
    <p class="note2">${esc(TODAY.otherNote)}</p>
    <div class="shfoot"><button class="tbtn" onclick="A.closeSheet()">${COMMON.cancel}</button></div></div>`;
});

A.excusedToday = (key = todayKey()) => {
  const snap = snapshot(key);
  const on = !store.isExcusedDay(S, key);
  store.setExcusedDay(S, key, on, NOW());
  closeSheet(); commit();
  toast(on ? EXCUSED.today : X.notExcused, undoable(snap));
};

/** "Remembrance at prayer time" on an excused prayer (store.setRemember). Not a prayer and never counted as one. */
function rememberTick(p, key, day) {
  const on = store.remembered(day, p);
  return `<div class="gdh-l">${esc(T.GENDER.rememberAt(pName(p, key)))}</div><button class="gdh ${on ? "on" : ""}" role="checkbox" aria-checked="${on}" onclick="A.rememberAt('${p}','${key}')"><span class="bx">${on ? ic("check", "") : ""}</span><span><b>${T.GENDER.remember}</b><small>${T.GENDER.rememberSub}</small></span></button>
    <p class="gdh-n">${T.GENDER.rememberNote}</p>`;
}
A.rememberAt = (p, key = todayKey()) => {
  const on = !store.remembered(store.getDay(S, key), p), now = NOW();
  if (!logAllowed(S, key, p, on, now)) { notYetToast(p, key); return; } // unticking is always allowed
  if (!store.setRemember(S, key, p, on, now)) return;
  commit();
};

/** The full log sheet for one prayer: every status, Clear, its sunnah chips and Witr, Excused today. */
A.prayerSheet = (p, key = todayKey()) => showSheet(() => {
  const d = parseKey(key), day = store.getDay(S, key), cur = store.prayerStatus(S, key, p);
  const t = timesFor(d, settings())[p], end = windowEnd(d, p, settings());
  // Not begun yet (also when it already has a status: an excused day, or a travel / method change moved its
  // start later): only "Begins at …", plus Clear when a status is stored, since removing a log is always allowed.
  if (!canLog(S, key, p, NOW())) {
    const stored = !!day.prayers?.[p];
    return `<div class="sh"><div class="lhd"><div><h3>${esc(pName(p, key))}</h3><p class="sub">${esc(longDate(d))} · ${esc(NOT_YET.begins(fmt12(t)))}</p></div><button class="cls" onclick="A.closeSheet()" aria-label="${COMMON.close}">${ic("close")}</button></div><p class="note">${esc(NOT_YET.body(pName(p, key)))}</p>
    ${stored ? `<p class="fine"><button class="link" onclick="A.setPrayer('${p}',null,'${key}')" style="font-weight:700;color:var(--z-ink2)">${COMMON.clear}</button></p>` : ""}
    <div class="shfoot"><button class="pbtn" onclick="A.closeSheet()">${esc(COMMON.done)}</button></div></div>`;
  }
  let sub = `${dayLabel(key)}${fmt12(t)}`;
  if (cur === "madeup" && day.at?.[p]) sub += ` · ${HOME.madeUpAt(fmt12(new Date(day.at[p])))}`;
  else if (cur === "missed" || NOW() >= end) sub += ` · ${HOME.endedAt(fmt12(end))}`;
  const best = p === "Isha" ? TIMES.bestBefore(fmt12(ishaBestBefore(d, settings()))) : "";
  const opts = store.genderOf(S) === "m" ? ["congregation", "ontime", "madeup", "missed"] : ["ontime", "congregation", "madeup", "missed"];
  const excOn = S.settings.excusedDays !== false;
  const tile = k => {
    // "Made up later" only once the prayer's time has ended (logging.madeUpAllowed); a stored one keeps it
    const off = k === "madeup" && cur !== "madeup" && !madeUpAllowed(S, key, p, NOW());
    return `<button class="st ${cur === k ? "sel" : ""} ${k === "excused" ? "wide" : ""}" ${off ? "disabled" : ""} aria-pressed="${cur === k}" onclick="A.setPrayer('${p}','${k}','${key}')"><span class="mk ${sk(k)}">${ic(SICON[sk(k)], "")}</span><span><b>${STATUS[k]}</b><small>${T.STATUS_HELP[k]}</small></span></button>`;
  };
  const chips = sunnahOn() ? store.sunnahChips(S, key, p) : [];
  const w = p === "Isha" ? witrShown(key) : null;
  let body = "";
  if (sunnahOn() && (cur === "missed")) body += `<div class="note">${SUNNAH_UI.notAfterMissed}</div>`;
  else {
    if (chips.length) body += `<div class="lsec">${SUNNAH_UI.withPrayer(pName(p, key))}${xi("sunnah")}</div>` + chips.map(c => {
      const done = store.sunnahDone(S, key, c.id);
      const tl = tierLabel(c.tier);
      return `<div class="srow" role="button" tabindex="0" data-chip="${c.id}" data-key="${key}"><span class="sc ${tierCls(c.tier)} ${done ? "d" : ""}">${done ? ic("check", "") : '<i class="o"></i>'}${esc(c.label)}</span><div class="t"><b>${esc(tl.name)}</b><small>${esc(tl.gloss || "")}</small></div><span class="tg ${done ? "on" : ""}"></span></div>`;
    }).join("");
    if (w) body += `<div class="lsec">${esc(w.tag ? w.tag.charAt(0).toUpperCase() + w.tag.slice(1) : T.WITR_UI.name)}${xi("witr")}</div><div class="srow" role="button" tabindex="0" data-witr="1" data-key="${key}"><span class="sc wj ${w.done ? "d" : ""}">${w.done ? ic("check", "") : '<i class="o"></i>'}${esc(w.chip)}${w.tag ? `<em>${esc(w.tag)}</em>` : ""}</span><div class="t"><b>${T.WITR_UI.title(w.rakahs)}</b><small>${esc(w.line)}</small></div><span class="tg ${w.done ? "on" : ""}"></span></div>`;
    if (sunnahOn() && p === "Isha" && !S.settings.sunnahNafl) body += `<div class="nfl">${ic("plus")}<span>${SUNNAH_UI.naflHidden} <b role="button" tabindex="0" onclick="A.closeSheet();A.go('settings')">${SUNNAH_UI.turnOnInSettings}</b></span></div>`;
  }
  const dayEx = store.isExcusedDay(S, key);
  return `<div class="sh"><div class="lhd"><div><h3>${esc(pName(p, key))}</h3><p class="sub">${esc(longDate(d))} · ${esc(sub)}${best ? `<br>${esc(best)}` : ""}</p></div><button class="cls" onclick="A.closeSheet()" aria-label="${COMMON.close}">${ic("close")}</button></div>
    <div class="sgrid">${opts.map(tile).join("")}${excOn ? tile("excused") : ""}</div>
    ${cur ? `<p class="fine"><button class="link" onclick="A.setPrayer('${p}',null,'${key}')" style="font-weight:700;color:var(--z-ink2)">${COMMON.clear}</button></p>` : ""}
    ${body}${cur === "excused" ? rememberTick(p, key, day) : ""}
    <div class="shfoot">${excOn ? `<button class="exbtn" onclick="A.excusedToday('${key}')">${ic("moon")}${dayEx ? X.notExcused : EXCUSED.todayBtn}</button>` : ""}<button class="pbtn" onclick="A.closeSheet()">${COMMON.done}</button></div></div>`;
});

/* ---------- good deeds ---------- */
export const amalById = (id, key = todayKey()) => store.amalForDay(S, key).find(a => a.id === id) || S.amalList.find(a => a.id === id);

export function amalHint(a, key = todayKey()) {
  if (a.id === "quran" || a.detail === "quran") return S.lastQuran ? DEEDS.lastStopped(S.lastQuran) : DEEDS.logWhere;
  if (a.detail === "count") {
    const y = store.getDay(S, dkey(addDays(parseKey(key), -1))).amal[a.id];
    return y?.done && y.detail ? DEEDS.yesterdayCount(parseInt(y.detail) || y.detail) : DEEDS.tapCount;
  }
  return a.hint || (a.builtin ? "" : DEEDS.addedByYou);
}

/** Where a detail sheet returns after Save or Skip (the Good deeds sheet it was opened from, or nowhere). */
let afterDetail = null;
A.tapAmal = (id, key = todayKey(), from = "") => {
  const a = amalById(id, key);
  const st0 = store.getDay(S, key).amal[id];
  const snap = snapshot(key);
  if (key < S.createdKey) S.createdKey = key;
  if (st0?.done) {
    store.setAmal(S, key, id, false);
    if (a.detail === "quran") S.lastQuran = store.lastDetail(S, id, null)?.detail.split(" · ")[0] || "";
    commit(); toast(DEEDS.unchecked, undoable(snap)); return;
  }
  store.setAmal(S, key, id, true, "");
  commit();
  if (a.detail === "none") toast(DEEDS.doneToast(a.name), undoable(snap));
  else A.detailSheet(id, key, from);
};

A.detailSheet = (id, key = todayKey(), from = "") => {
  afterDetail = from ? () => A.deedsSheet(key, from === "day" ? "day" : "") : null;
  const a = amalById(id, key);
  const d = store.getDay(S, key).amal[id]?.detail || "";
  let body = "";
  if (a.detail === "quran") {
    const [pos, pages] = d.split(" · ");
    const pre = pos || (S.settings.carryQuran ? S.lastQuran : "");
    body = `<div class="field"><label for="dIn">${DEEDS.whereStop}</label><input id="dIn" value="${esc(pre)}" placeholder="${esc(DEEDS.wherePlaceholder)}"></div><div class="field"><label for="dIn2">${DEEDS.pagesRead}</label><input id="dIn2" value="${esc(parseInt(pages) || "")}" placeholder="${COMMON.optional}" inputmode="numeric"></div>`;
  } else if (a.detail === "count") {
    const last = store.lastDetail(S, id, key);
    const n = parseInt(d) || parseInt(last?.detail) || 100;
    body = `<div class="field"><label for="cnt">${DEEDS.howMany}</label><div class="stp"><button onclick="A.step(-10)" aria-label="${DEEDS.tenFewer}">−</button><input id="cnt" type="number" inputmode="numeric" min="0" value="${n}"><button onclick="A.step(10)" aria-label="${DEEDS.tenMore}">+</button></div></div>`;
  } else {
    body = `<div class="field"><label for="dIn">${DEEDS.anyNote}</label><textarea id="dIn" placeholder="${COMMON.optional}">${esc(d)}</textarea></div>`;
  }
  openSheet(zz(`<div class="sh"><h3>${esc(a.name)}</h3><p class="sub">${DEEDS.detailLead}</p>${body}
  <div class="shfoot"><button class="gbtn" onclick="A.skipDetail()">${COMMON.skip}</button><button class="pbtn" onclick="A.saveDetail('${id}','${key}')">${DEEDS.saveDetail}</button></div></div>`));
};
A.skipDetail = () => { const back = afterDetail; afterDetail = null; if (back) back(); else closeSheet(); };
A.step = n => { const c = $("#cnt"); c.value = Math.max(0, (parseInt(c.value) || 0) + n); };
A.saveDetail = (id, key) => {
  const a = amalById(id, key);
  let v = "";
  if (a.detail === "count") v = `${Math.max(0, parseInt($("#cnt").value) || 0)} ${a.id === "salawat" ? DEEDS.salawatUnit : ""}`.trim();
  else if (a.detail === "quran") {
    const pos = $("#dIn").value.trim(), pages = $("#dIn2").value.trim();
    v = pos + (pages ? DEEDS.pagesSuffix(pages) : "");
  } else v = $("#dIn").value.trim();
  store.setAmal(S, key, id, true, v);
  if (a.detail === "quran") S.lastQuran = store.lastDetail(S, id, null)?.detail.split(" · ")[0] || "";
  const back = afterDetail; afterDetail = null;
  if (back) { commit(); back(); } else { closeSheet(); commit(); }
  toast(DEEDS.saved);
};
/** "+ Add a good deed" (M1): a name and a type (tick / note / count). From the Good deeds sheet (or, to "choose",
 *  from Choose daily deeds' "+ Add your own"), Add and Cancel return there. */
let addFrom = null;
A.addAmal = (key = "", back = "", to = "") => { addFrom = key ? () => (to === "choose" ? A.dailyChoose(key, back) : A.deedsSheet(key, back)) : null; addSheet(); };
const addSheet = () => openSheet(zz(`<div class="sh"><h3>${DEEDS.addTitle}</h3><p class="sub">${DEEDS.addLead}</p>
  <div class="field"><label for="nIn">${DEEDS.name}</label><input id="nIn" placeholder="${esc(DEEDS.namePlaceholder)}"></div>
  <div class="field"><label for="nType">${DEEDS.whenCheck}</label><select id="nType"><option value="none">${DEEDS.typeNone}</option><option value="note">${DEEDS.typeNote}</option><option value="count">${DEEDS.typeCount}</option></select></div>
  <div class="shfoot"><button class="gbtn" onclick="A.addCancel()">${COMMON.cancel}</button><button class="pbtn" onclick="A.saveAmal()">${DEEDS.addToList}</button></div></div>`));
A.addCancel = () => { const back = addFrom; addFrom = null; if (back) back(); else closeSheet(); };
A.saveAmal = () => {
  const n = $("#nIn").value.trim(); if (!n) { $("#nIn").focus(); return; }
  const type = $("#nType").value;
  const id = "c" + Date.now();
  S.amalList.push({ id, name: n, hint: DEEDS.addedByYou, detail: ["none", "note", "count"].includes(type) ? type : "none" });
  if (Array.isArray(S.settings.dailyDeeds)) setDaily(S, id, true); // a new deed is a daily goal, like the list's
  const back = addFrom; addFrom = null;
  if (back) { commit(); back(); } else { closeSheet(); commit(); }
  toast(DEEDS.added);
};

/* ---------- the nafl add-on in the Good deeds sheet (Ishrāq, Duhā, Awwābīn, Tahajjud) ----------
   The ticks write the same day.sunnah[id] as the sunnah chips (store.setSunnah, same rules), so nothing is
   tracked twice; points.js counts each as one good deed. Which ones show: settings.naflShow ("Choose"). */
A.naflTick = (id, key = todayKey()) => {
  const snap = snapshot(key), was = store.sunnahDone(S, key, id);
  if (!tickSunnah(id, key)) { refreshLive(); return; }
  commit();
  const x = NAFL_ADDON.find(n => n.id === id);
  toast(was ? DEEDS.unchecked : DEEDS.doneToast(SUNNAH_NAME[x?.key] || id), undoable(snap));
};
A.naflShowToggle = k => {
  const cur = Array.isArray(S.settings.naflShow) ? S.settings.naflShow : [];
  const on = !cur.includes(k);
  S.settings.naflShow = NAFL_ADDON.map(n => n.key).filter(x => (x === k ? on : cur.includes(x)));
  commit();
};
A.naflChoose = (key = todayKey(), back = "") => showSheet(() => {
  const cur = S.settings.naflShow || [];
  const rows = NAFL_ADDON.map(n => { const on = cur.includes(n.key); return `<div class="drow"><span class="t"><b>${esc(SUNNAH_NAME[n.key])}</b></span><button class="nsw ${on ? "on" : ""}" role="switch" aria-checked="${on}" aria-label="${esc(SUNNAH_NAME[n.key])}" onclick="A.naflShowToggle('${n.key}')"></button></div>`; }).join("");
  return `<div class="sh"><div class="lhd"><div><h3>${esc(NAFL.chooseTitle)}</h3><p class="sub">${esc(NAFL.chooseLead)}</p></div><button class="cls" onclick="A.closeSheet()" aria-label="${COMMON.close}">${ic("close")}</button></div>
    <div class="drows">${rows}</div><div class="shfoot"><button class="pbtn" onclick="A.deedsSheet('${key}','${back}')">${COMMON.done}</button></div></div>`;
});
/** The nafl group's head: the title, its explainer and "Choose" (which nafl prayers the sheet shows). */
const naflHead = (key, back) => `<div class="lsec nfh"><span>${esc(NAFL.title)}</span>${xi("nafl")}<button class="link chs" data-f="nafl-choose" onclick="A.naflChoose('${key}','${back}')">${esc(NAFL.choose)}</button></div>`;

/** Good deeds done / on the list for a day. */
export function deedsCount(key) {
  const list = store.amalForDay(S, key), day = store.getDay(S, key);
  return { done: list.filter(a => day.amal[a.id]?.done).length, of: list.length };
}

/* The Tools "Read" button on a reading deed (views/tools/index.js toolsAmalRead), placed after zz so its tl- classes stay. */
const toolMods = import.meta.glob("./tools/index.js", { eager: true });
const toolsAmalRead = () => Object.values(toolMods)[0]?.toolsAmalRead;
export function withRead(html, now = NOW()) {
  const f = isOn(S, "tools") ? toolsAmalRead() : null;
  const asr = timesFor(now, S.settings).Asr;
  return html.replace(/<!--zread:([A-Za-z0-9_-]+)-->/g, (_, id) => {
    if (!f || (id === "evening" && now < asr)) return "";
    try { return f(id) || ""; } catch (e) { return ""; }
  });
}

/* ---------- the Good deeds sheet (19 Nov 2026): Reading · Deeds · Nafl prayers (rules: today.deedGroups) ----------
   Reading items use Read's own tick (A.readTick: the same day log and tool stamps as For today) and have a Read
   button that opens the reader. Durūd / Salawāt is one item (the forty durūd and the salawāt count). The head counts
   only the daily deeds ("Choose daily deeds"). From a day in the calendar (back "day") it lists that day's deeds. */
const tickBox = (on, part = false) => `<span class="bx${on ? " on" : part ? " part" : ""}">${on ? ic("check", "") : ""}</span>`;
function deedRow(it, key, from) {
  let tick, sub = "", right = "", extra = "";
  const name = esc(it.name);
  if (it.kind === "read") {
    const gs = it.id === "quran" ? goalStatus(S, NOW()) : null;
    sub = gs && !it.done ? goalLine(gs) : it.sub;
    if (it.id === "durud") {
      const sal = store.getDay(S, key).amal.salawat;
      if (sal?.detail) sub = sal.detail;
      if (S.amalList.find(a => a.id === "salawat")?.detail === "count") extra = `<button type="button" class="cnt" data-f="deed-count" aria-label="${esc(TODAY.countAria(it.name))}" onclick="A.detailSheet('salawat','${key}','${from}')">${ic("plus", "")}${esc(TODAY.countBtn)}</button>`;
    }
    tick = `<button class="tick" role="checkbox" aria-checked="${it.done}" aria-label="${name}" data-f="deed-${it.id}" onclick="A.readTick('${it.id}')">${tickBox(it.done, !!gs && !it.done && gs.done > 0)}</button>`;
    if (it.id !== "listen") right = `<button type="button" class="rdb" data-f="deed-read-${it.id}" aria-label="${esc(TODAY.readBtnAria(it.name))}" onclick="A.deedRead('${it.id}')">${ic("book", "")}${esc(TODAY.readBtn)}</button>`;
  } else if (it.kind === "amal") {
    const s0 = store.getDay(S, key).amal[it.amal] || {};
    sub = s0.done ? (s0.detail || DEEDS.doneWord) : amalHint(it.a, key);
    if (s0.done && it.a.detail !== "none") right = `<button class="link" onclick="A.detailSheet('${it.amal}','${key}','${from}')">${s0.detail ? COMMON.edit : DEEDS.addDetail}</button>`;
    tick = `<button class="tick" role="checkbox" aria-checked="${!!s0.done}" aria-label="${name}" data-f="deed-${it.amal}" onclick="A.tapAmal('${it.amal}','${key}','${from}')">${tickBox(!!s0.done)}</button>`;
  } else {
    const nm = SUNNAH_NAME[it.x.key], tm = naflTimes(key, S.settings, NOW());
    sub = NAFL.when[it.x.key](fmt12(tm[it.x.key]));
    tick = `<button class="tick" role="checkbox" aria-checked="${it.done}" aria-label="${esc(nm)}" data-f="nafl-${it.x.key}" onclick="A.naflTick('${it.sid}','${key}')">${tickBox(it.done)}</button>`;
    return `<div class="drow${it.done ? " dn" : ""}">${tick}<span class="t"><b>${esc(nm)}</b><small>${esc(sub)}</small></span></div>`;
  }
  return `<div class="drow${it.done ? " dn" : ""}">${tick}<span class="t"><b>${name}</b>${sub || extra ? `<small>${esc(sub || "")}${extra}</small>` : ""}</span>${right}</div>`;
}
A.deedRead = id => { closeSheet(); A.readOpen?.(id); };
A.deedsSheet = (key = todayKey(), back = "") => showSheet(() => {
  const from = back === "day" ? "day" : "deeds", now = NOW();
  const g = deedGroups(S, key, now, { lastRead: S.lastQuran || "" });
  const label = key === todayKey() ? weekday(parseKey(key)) : longDate(parseKey(key));
  const pct = g.of ? Math.round(g.done / g.of * 100) : 0;
  const group = (title, items, after = "") => items.length || after ? `<div class="lsec">${esc(title)}</div><div class="drows">${items.map(it => deedRow(it, key, from)).join("")}</div>${after}` : "";
  if (back !== "day") return chosenSheet(g, key, label, pct, group);
  const add = `<button type="button" class="addd" data-f="add-deed" onclick="A.addAmal('${key}','${back}')">${ic("plus", "")}<span>${esc(TODAY.addDeed)}</span></button>`;
  const nf = store.isExcusedDay(S, key) ? "" : naflHead(key, back) + (g.nafl.length ? `<div class="drows">${g.nafl.map(it => deedRow(it, key, from)).join("")}</div>` : `<p class="note2">${esc(NAFL.noneShown)}</p>`);
  return `<div class="sh gd"><div class="lhd"><div><h3>${esc(TODAY.goodDeeds)}</h3><p class="sub">${esc(g.of ? TODAY.deedsDaily(label, g.done, g.of) : TODAY.deedsNoDaily(label))}</p></div><button class="cls" onclick="A.closeSheet()" aria-label="${COMMON.close}">${ic("close")}</button></div>
    ${g.of ? `<span class="gbar" aria-hidden="true"><i style="width:${pct}%"></i></span>` : ""}
    ${group(TODAY.groupReading, g.reading)}${group(TODAY.groupDeeds, g.deeds, add)}${nf}
    <div class="shfoot"><button class="gbtn" data-f="choose-daily" onclick="A.dailyChoose('${key}','${back}')">${esc(TODAY.chooseDaily)}</button><button class="pbtn" onclick="${back === "day" ? `A.daySheet('${key}')` : "A.closeSheet()"}">${back === "day" ? COMMON.back : COMMON.done}</button></div></div>`;
});

/**
 * The sheet from Today (20 Nov 2026): ONLY the daily deeds (settings.dailyDeeds: chosen readings, deeds and nafl),
 * ticked exactly as before (Read's tick, the deed, the nafl's sunnah item), so nothing is counted twice. Everything
 * else is behind one quiet row, "Add or change daily deeds" (Choose daily deeds, with "+ Add your own"). Nothing
 * chosen: a short note and that row. (From a day in the calendar the sheet still lists all that day's deeds.)
 */
function chosenSheet(g, key, label, pct, group) {
  const pick = items => items.filter(i => i.daily), from = "deeds";
  const reading = pick(g.reading), deeds = pick(g.deeds), nafl = pick(g.nafl);
  const nf = nafl.length ? `<div class="lsec nfh"><span>${esc(NAFL.title)}</span>${xi("nafl")}</div><div class="drows">${nafl.map(it => deedRow(it, key, from)).join("")}</div>` : "";
  const edit = `<button type="button" class="addd${g.of ? "" : " first"}" data-f="choose-daily" onclick="A.dailyChoose('${key}','')">${ic("plus", "")}<span>${esc(TODAY.dailyEdit)}</span></button>`;
  const body = g.of ? `${group(TODAY.groupReading, reading)}${group(TODAY.groupDeeds, deeds)}${nf}${edit}` : `<p class="note2 gde" data-f="deeds-empty">${esc(TODAY.deedsEmpty)}</p>${edit}`;
  return `<div class="sh gd"><div class="lhd"><div><h3>${esc(TODAY.goodDeeds)}</h3><p class="sub">${esc(g.of ? TODAY.deedsDaily(label, g.done, g.of) : label)}</p></div><button class="cls" onclick="A.closeSheet()" aria-label="${COMMON.close}">${ic("close")}</button></div>
    ${g.of ? `<span class="gbar" aria-hidden="true"><i style="width:${pct}%"></i></span>` : ""}
    ${body}
    <div class="shfoot"><button class="pbtn" onclick="A.closeSheet()">${COMMON.done}</button></div></div>`;
}

/** "Choose daily deeds": a switch per item; "Good deeds · n of m" counts the ones on (today.dailyIds). */
A.dailyToggle = id => { setDaily(S, id, !store.dailyIds(S).includes(id)); commit(); };
A.dailyChoose = (key = todayKey(), back = "") => showSheet(() => {
  const c = dailyChoices(S), on = new Set(store.dailyIds(S));
  const sw = (id, name) => `<div class="drow"><span class="t"><b>${esc(name)}</b></span><button class="nsw ${on.has(id) ? "on" : ""}" role="switch" aria-checked="${on.has(id)}" aria-label="${esc(name)}" data-f="daily-${id}" onclick="A.dailyToggle('${id}')"></button></div>`;
  const grp = (title, rows) => rows.length ? `<div class="lsec">${esc(title)}</div><div class="drows">${rows.join("")}</div>` : "";
  return `<div class="sh"><div class="lhd"><div><h3>${esc(TODAY.chooseDaily)}</h3><p class="sub">${esc(TODAY.chooseDailyLead)}</p></div><button class="cls" onclick="A.closeSheet()" aria-label="${COMMON.close}">${ic("close")}</button></div>
    ${grp(TODAY.groupReading, c.reading.map(id => sw(id, READ.item[id] || id)))}${grp(TODAY.groupDeeds, c.deeds.map(a => sw(a.id, a.name)))}${grp(NAFL.title, c.nafl.map(k => sw(k, SUNNAH_NAME[k])))}
    <button type="button" class="addd own" data-f="add-own" onclick="A.addAmal('${key}','${back}','choose')">${ic("plus", "")}<span>${esc(TODAY.addOwn)}</span></button>
    <div class="shfoot"><button class="pbtn" onclick="A.deedsSheet('${key}','${back}')">${COMMON.done}</button></div></div>`;
});

/* ---------- catch up on yesterday (CU2) ---------- */
let cu = { sel: {} };
function yesterdayUnlogged(now) {
  const yk = dkey(addDays(now, -1)), y = parseKey(yk);
  if (!st.tracked(S, y, now)) return [];
  const cur = currentWindow(now, S.settings);
  return PRAYERS.filter(p => !store.prayerStatus(S, yk, p) && !(cur && cur.p === p && dkey(cur.date) === yk));
}
A.catchSheet = () => { cu = { sel: {} }; showSheet(catchHTML); };
function catchHTML() {
  const now = NOW(), yk = dkey(addDays(now, -1)), y = parseKey(yk), list = yesterdayUnlogged(now);
  const segs = [["congregation", "dcheck", "kc"], ["ontime", "check", ""], ["madeup", "clock", "kr"], ["missed", "dash", "km"]];
  const canMake = now < madeUpDeadline(y, S.settings);
  const n = Object.keys(cu.sel).length;
  return `<div class="sh"><h3>${LOG.catchUpTitle}</h3><p class="sub">${esc(LOG.catchUpSub(longDate(y), list.length))}</p>
    ${list.map(p => `<div class="cu"><div class="cuh"><b>${esc(pName(p, yk))}</b><small>${fmt12(timesFor(y, S.settings)[p])}</small></div><div class="segc">${segs.map(([k, i, c]) => `<button class="${cu.sel[p] === k ? "sel " + c : ""} ${c}" ${k === "madeup" && !canMake ? "disabled" : ""} aria-pressed="${cu.sel[p] === k}" onclick="A.cuPick('${p}','${k}')">${ic(i, "")}${T.STATUS_SHORT[k]}</button>`).join("")}</div></div>`).join("")}
    <p class="fine">${LOG.madeUpExplain}</p>
    <div class="shfoot"><button class="gbtn" onclick="A.closeSheet()">${COMMON.notNow}</button><button class="pbtn" ${n ? "" : "disabled"} onclick="A.cuSave()">${LOG.saveNofM(n, list.length)}</button></div></div>`;
}
A.cuPick = (p, k) => { if (cu.sel[p] === k) delete cu.sel[p]; else cu.sel[p] = k; refreshLive(); };
A.cuSave = () => {
  const now = NOW(), yk = dkey(addDays(now, -1)), snap = snapshot(yk);
  // Yesterday's prayers have all begun; the shared rule (logging.js) still guards every write that adds a log
  const entries = Object.entries(cu.sel).filter(([p, k]) => logAllowed(S, yk, p, k, now)); if (!entries.length) return;
  if (yk < S.createdKey) S.createdKey = yk;
  for (const [p, k] of entries) store.setPrayer(S, yk, p, k, now);
  closeSheet(); commit(); toast(X.loggedN(entries.length), undoable(snap));
};

/* ---------- This week readings (W3): shown in Read (views/tools/index.js) ---------- */
const OPENED = "zad-wk-opened";
const readOpened = () => { try { return JSON.parse(localStorage.getItem(OPENED) || "{}"); } catch (e) { return {}; } };
function markOpened(k) { try { const o = readOpened(); o[k] = 1; localStorage.setItem(OPENED, JSON.stringify(o)); } catch (e) { /* private mode */ } }
/** The six "This week" tiles (āyah, hadīth, duʿāʾ, sīrah, Sahābī, sunnah of the month), already prefixed (zz). */
export function weekTiles(now = NOW()) {
  // The first month a user sees is Abū Bakr: remember that month once.
  if (!Number.isInteger(S.settings.sahabiStart)) { S.settings.sahabiStart = monthIndex(now); commit(); }
  setSahabiStart(S.settings.sahabiStart);
  // The approved sets are a separate chunk (content.js starts loading it at once); draw again when it lands.
  if (!contentReady()) whenContent(render); // one pending load and one redraw, however often this renders meanwhile
  const c = thisWeek(now), opened = readOpened(), mk = `${now.getFullYear()}-${now.getMonth()}`;
  const tiles = [
    ["ayah", c.ayah.title || c.ayah.en, 0], ["hadith", c.hadith.title || c.hadith.en, 0], ["dua", c.dua.title || c.dua.en, 0],
    ["seerah", c.seerah.title, 0], ["sahabi", c.sahabi.name, 2], ["sunnah", c.sunnah.title, 1],
  ];
  const names = { ...WEEK_UI.tabs, sahabi: WEEK_UI.sahabi("").replace(/ · $/, ""), sunnah: WEEK_UI.sunnah("").replace(/ · $/, "") };
  const html = tiles.map(([id, title, monthly]) => {
    const ok = !!opened[(monthly === 2 ? mk + "-" + now.getDate() : monthly ? mk : c.weekKey) + id];
    const fact = id === "sahabi" ? `<div class="fx">${esc(c.sahabi.recap ? WEEK_UI.recapTile : c.sahabi.fact)}</div>` : "";
    return `<button class="wt ${monthly ? "mo" : ""} ${fact ? "hasfx" : ""}" onclick="A.weekItem('${id}')"><div class="k"><b>${names[id]}</b><span>${X.arLabel[id]}</span></div><div class="ti">${esc(title)}</div>${fact}<span class="dt ${ok ? "" : "new"}">${ok ? ic("check", "") : ""}</span></button>`;
  }).join("");
  return zz(`<section class="sec"><h2>${HOME.thisWeek}</h2><p class="wsub">${esc(c.rangeLabel)} · ${X.newEachSunday}</p><div class="wgrid">${html}</div><div class="wleg"><span><i></i>${X.notOpened}</span><span>${X.goldChange}</span></div></section>`);
}
const sahabiKick = () => WEEK_UI.sahabi("").replace(/ · $/, "");
/** Sahabi of the month: today's fact, then the earlier facts of this month (newest first), then Past months. */
function sahabiSheet(now) {
  const sb = thisWeek(now).sahabi, mon = MON[now.getMonth()].slice(0, 3);
  markOpened(`${now.getFullYear()}-${now.getMonth()}-${now.getDate()}sahabi`);
  const earlier = sb.earlier.length ? `<h4 class="fh">${esc(sb.recap ? WEEK_UI.recapAll : WEEK_UI.earlierThisMonth)}</h4><ul class="fl">${sb.earlier.map(e => `<li><b>${esc(WEEK_UI.factDay(e.day, mon))}</b><span>${esc(e.text)}</span></li>`).join("")}</ul>` : "";
  openSheet(zz(`<div class="sh wd"><div class="lhd"><span class="kick">${esc(sahabiKick())}</span><button class="cls" onclick="A.closeSheet()" aria-label="${COMMON.close}">${ic("close")}</button></div>
    <h3 style="margin-top:8px">${esc(sb.name)}</h3><div class="src">${esc(sb.title)}</div>
    ${sb.recap ? `<div class="rc"><h4>${esc(WEEK_UI.recapTitle(sb.name))}</h4><p>${esc(WEEK_UI.recapLead(sb.name))}</p>
      <ul>${sb.recap.highlights.map(h => `<li><span>${esc(h.text)}</span><small>${esc(WEEK_UI.factDay(h.day, mon))} · ${esc(h.src)}</small></li>`).join("")}</ul></div>`
    : `<h4 class="fh">${esc(WEEK_UI.todaysFact)} <small>${esc(WEEK_UI.factDay(sb.day, mon))}</small></h4><div class="en">${esc(sb.fact)}</div>${sb.src ? `<div class="src">${esc(sb.src)}</div>` : ""}`}
    ${earlier}
    <button class="pastbtn" onclick="A.pastMonths()"><span><b>${esc(WEEK_UI.pastMonths)}</b><small>${esc(WEEK_UI.pastMonthsSub)}</small></span>${ic("chev")}</button>
    <div class="shfoot"><button class="pbtn" onclick="A.closeSheet()">${COMMON.done}</button></div>${reportLink("A.fbReport('sahabi')")}</div>`));
}
A.pastMonths = () => {
  const list = pastSahabi(NOW());
  openSheet(zz(`<div class="sh wd"><div class="lhd"><span class="kick">${esc(WEEK_UI.pastMonths)}</span><button class="cls" onclick="A.closeSheet()" aria-label="${COMMON.close}">${ic("close")}</button></div>
    ${list.length ? `<div class="pml">${list.map((m, i) => `<button class="pm" onclick="A.pastMonth(${i})"><span><b>${esc(m.name)}</b><small>${esc(m.label)} · ${esc(WEEK_UI.factsCount(m.facts.length))}</small></span>${ic("chev")}</button>`).join("")}</div>` : `<div class="en">${esc(WEEK_UI.pastNone)}</div>`}
    <div class="shfoot"><button class="pbtn" onclick="A.sahabiBack()">${COMMON.back || "Back"}</button></div></div>`));
};
A.sahabiBack = () => sahabiSheet(NOW());
A.pastMonth = i => {
  const m = pastSahabi(NOW())[i]; if (!m) return;
  openSheet(zz(`<div class="sh wd"><div class="lhd"><span class="kick">${esc(m.label)}</span><button class="cls" onclick="A.closeSheet()" aria-label="${COMMON.close}">${ic("close")}</button></div>
    <h3 style="margin-top:8px">${esc(m.name)}</h3><div class="src">${esc(m.title)}</div>
    <ul class="fl">${m.facts.map((t, d) => `<li><b>${d + 1}</b><span>${esc(t)}</span></li>`).reverse().join("")}</ul>
    <div class="shfoot"><button class="pbtn" onclick="A.pastMonths()">${COMMON.back || "Back"}</button></div></div>`));
};
/** Narrator, collection (as the book gives it) and source (book + printed page) under a card. */
const weekMeta = it => {
  const rows = [[WEEK_UI.narrator, it.narrator], [WEEK_UI.collection, it.collection], [WEEK_UI.source, it.src]].filter(r => r[1]);
  return rows.length ? `<dl class="wm">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>` : "";
};
A.weekItem = id => {
  if (!contentReady()) { loadContent().then(() => A.weekItem(id)).catch(() => {}); return; }
  const now = NOW(), c = thisWeek(now), it = c[id];
  if (id === "sahabi") { sahabiSheet(now); render(); return; }
  const monthly = id === "sunnah";
  markOpened((monthly ? `${now.getFullYear()}-${now.getMonth()}` : c.weekKey) + id);
  const kicker = { ayah: WEEK_UI.ayah, hadith: WEEK_UI.hadith, dua: WEEK_UI.dua, seerah: WEEK_UI.seerah, sahabi: WEEK_UI.sahabi("").replace(/ · $/, ""), sunnah: WEEK_UI.sunnah("").replace(/ · $/, "") }[id];
  const en = it.en || it.text, title = it.title || it.name;
  openSheet(zz(`<div class="sh wd"><div class="lhd"><span class="kick">${esc(kicker)}</span><button class="cls" onclick="A.closeSheet()" aria-label="${COMMON.close}">${ic("close")}</button></div>
    ${title ? `<h3 style="margin-top:8px">${esc(title)}</h3>` : ""}${it.ar ? `<div class="ar${id === "ayah" ? " q" : ""}${it.ar.length > 160 ? " long" : ""}" lang="ar" dir="rtl">${esc(it.ar)}</div>` : ""}${it.tr ? `<div class="tr">${esc(it.tr)}</div>` : ""}<div class="en${it.ar ? " mn" : ""}">${esc(en)}</div>${weekMeta(it)}
    <div class="shfoot"><button class="pbtn" onclick="A.closeSheet()">${COMMON.done}</button></div>${it.id ? reportLink(`A.fbReport('${id}')`) : ""}</div>`));
  render();
};

/* =================================================================================================
   The Today tab: ONE page (19 Nov 2026; Direction B "Time of day" of design-review/mockups2/redesign/declutter;
   rules in src/today.js)
   - the header, softly tinted by the time of day (today.bandAt: dawn, day, afternoon, dusk, night): the greeting,
     the date and the Hijri date, then a slim mihrab arch framing the current prayer ("Now", its name, the time left)
     with Qibla, the big Prayed button, ⋯ and its sunnah ("Sunnah · 4 before"). Once it is logged the arch shows
     the next prayer ("Next · Maghrib · Begins in 1 h 28 min") with only a Qibla chip (today.heroOf);
   - above the list: the first-run guide line, the excused-day band, yesterday's make-ups;
   - the thin list: name, time (small AM/PM) and the mark, with a quiet Sunrise row; the current (or next) row has
     the gold dot; "Make up now" only on a missed row. Tap a row to log it (on time → congregation → clear,
     today.tapNext), long press for every status (a ⋯ for keyboards and screen readers appears on focus);
   - two pills below: Good deeds · n of m (the daily deeds) and Make-ups · n left.
   Speed ("smoothness is a top priority"): the page is built once; the header, the hero, each row and the rest are
   separate nodes and only the ones whose HTML changed are written (setHTML). The band and the arch are static CSS
   (no animation). The 20 s tick only rewrites the time left, unless a prayer's time began or ended (then the band,
   the hero and the rows are redrawn the same way). Nothing runs on scroll.
   ================================================================================================= */
A.openWeek = () => { UI.range = "week"; go("progress"); };
A.endExcusedMode = () => {
  const now = NOW(), key = todayKey();
  const snap = snapshot(key);
  store.endExcused(S, key, { excusedPrayers: excusedSoFar(now, S.settings) }, now);
  commit(); toast(EXCUSED.end, undoable(snap));
};
/** zad://today (widgets) and the old "Today's prayers" sheet: show Today, at its top. */
A.todaySheet = () => { if (UI.view !== "home") go("home"); else scrollTop(true); };

/** "5:47<small>AM</small>": tabular figures with a small AM/PM. */
const tmHTML = d => { const [t, ap] = fmt12(d).split(" "); return `${t}<small>${ap}</small>`; };

/** ʿIshāʾ before the middle of the night: its best-before time (a second, smaller line under the time left), or "". */
function bestBefore(f, now) {
  if (f.kind !== "now" || f.cur.p !== "Isha") return "";
  const best = ishaBestBefore(f.cur.date, S.settings);
  return now < best ? TODAY.bestBeforeSub(fmt12(best)) : "";
}
/** The time line under the prayer's name: "1 h 31 min left" (ʿIshāʾ: to the middle of the night, then "… · until Fajr"), or "Begins in 1 h 28 min" (tomorrow's Fajr: "Tomorrow 5:48 AM · begins in …"). */
function countdown(f, now) {
  if (f.kind === "now") {
    const cur = f.cur;
    if (cur.p === "Isha") {
      const best = ishaBestBefore(cur.date, S.settings);
      return now < best ? TODAY.leftShort(hm(best - now)) : TODAY.leftFajr(hm(cur.end - now));
    }
    return TODAY.leftShort(hm(cur.end - now));
  }
  // after ʿIshāʾ is logged, before midnight: "Tomorrow 5:48 AM · begins in 7 h 12 min"
  if (f.key !== todayKey()) return TODAY.beginsTomorrow(fmt12(f.time), hm(f.time - now));
  return TODAY.beginsInShort(hm(f.time - now));
}

/* ---------- "Make up now" on a missed row (today.makeUpNowOn); "Not now" hides it for that prayer today ---------- */
const MKNOW = "zad-mknow";
function mkNowDismissed(key) {
  try { const o = JSON.parse(localStorage.getItem(MKNOW) || "{}"); return Array.isArray(o[key]) ? o[key] : []; } catch (e) { return []; }
}
A.mkNow = (p, key = todayKey()) => applyStatus(p, key, "madeup", { close: false });
A.mkNowLater = p => {
  const k = todayKey();
  try { localStorage.setItem(MKNOW, JSON.stringify({ [k]: [...new Set([...mkNowDismissed(k), p])] })); } catch (e) { /* private mode */ }
  closeSheet(); render();
};

/* ---------- logging: a row tap or the Prayed button (the cycle), long press or ⋯ (every status) ---------- */
const rowId = (p, key) => `${key}:${p}`;
/**
 * One tap on a prayer (its row, or Prayed on the current one): not logged → on time → in congregation → cleared
 * (today.tapNext), with Undo. The first on-time tap ever adds "Tap the tick again for congregation" to the toast (once).
 */
A.rowTap = (p, key = todayKey()) => {
  const now = NOW(), st = rowState(S, { p, key }, now, null);
  if (st.tap === "none") { notYetToast(p, key); return; }
  if (st.tap === "sheet") { A.rowMore(p, key); return; }
  const r = logPrayer(S, key, p, st.tap, now);
  if (!r.ok) { refused(r, p, key); return; }
  const hint = st.tap === "ontime" && tapHintDue(S);
  if (hint) markTapHint(S); // saved with the commit below: shown once, ever (Settings → Help → Replay shows it again)
  commit();
  toast(LOG.setToast(pName(p, key), st.tap ? STATUS[st.tap] : COMMON.clear.toLowerCase()), { ...undoable(r.snap), ...(hint ? { sub: TODAY.tapHintToast } : {}) });
};
/** The big Prayed button: the same as one tap on the current prayer's row. */
A.heroPray = (p, key = todayKey()) => A.rowTap(p, key);
/** Long press or ⋯: every status (A.logSheet with all), or on an excused day the prayer's sheet (remembrance). */
A.rowMore = (p, key = todayKey()) => (store.isExcusedDay(S, key) ? A.prayerSheet(p, key) : A.logSheet(p, key, true));

/* ---------- the header: greeting, date, the hero in the arch ---------- */
/** The slim double-line mihrab arch, open at its foot (static: no animation). */
const ARCH = `<svg class="zt-arch" viewBox="0 0 232 152" preserveAspectRatio="none" aria-hidden="true"><path class="o" d="M8 152V86C8 44 58 18 116 4 174 18 224 44 224 86V152"/><path class="n" d="M16 152V89C16 51 62 27 116 14 170 27 216 51 216 89V152"/></svg>`;
const qiblaRound = () => { const deg = qiblaDegrees(S.settings.location); return `<button type="button" class="zt-rb" data-f="qibla" aria-label="${esc(TODAY.qiblaAria(deg))}" onclick="A.openQibla()">${ic("qibla", "i")}</button>`; };
/** "Qibla 119°": the chip under the arch when the next prayer is shown; opens the Qibla page (views/qibla-page.js). */
function qiblaBtn() {
  const deg = qiblaDegrees(S.settings.location);
  return `<button type="button" class="zt-qb" data-f="qibla" aria-label="${esc(TODAY.qiblaAria(deg))}" onclick="A.openQibla()">${ic("qibla", "i")}<span>${esc(TODAY.qibla(deg))}</span></button>`;
}
/** The current prayer's sunnah (and Witr on ʿIshāʾ) as small ring toggles: "Sunnah · 4 before", or "4 before · 2 after · Witr". */
function heroChips(h) {
  if (h.status === "missed") return "";
  const items = (sunnahOn() ? store.sunnahChips(S, h.key, h.p) : []).map(c => ({ attr: `data-chip="${c.id}"`, done: store.sunnahDone(S, h.key, c.id), label: esc(c.label).replace(/^(\d+)/, "<b>$1</b>") }));
  const w = h.p === "Isha" ? witrShown(h.key) : null;
  if (w) items.push({ attr: 'data-witr="1"', done: w.done, label: `<b>${esc(T.WITR_UI.name)}</b>`, witr: true });
  if (!items.length) return "";
  const one = items.length === 1 && !items[0].witr;
  return `<div class="zt-chips">${items.map(it => `<button type="button" class="zt-chip${it.done ? " d" : ""}" ${it.attr} data-key="${h.key}" aria-pressed="${it.done}"><span class="rg">${it.done ? ic("check", "") : ""}</span><span>${one ? `${esc(TODAY.sunnahWord)} · ` : ""}${it.label}</span></button>`).join("")}</div>`;
}
/** The Prayed button: one tap on the prayer; once logged it shows how, and a tap moves it on. */
function prayBtn(h) {
  const nm = pName(h.p, h.key), s = h.status;
  if (!s) return `<button type="button" class="zt-pray" data-f="pray" aria-label="${esc(TODAY.prayedAria(nm))}" onclick="A.heroPray('${h.p}','${h.key}')">${ic("check", "i")}<span>${esc(TODAY.prayed)}</span></button>`;
  const next = tapNext(s);
  return `<button type="button" class="zt-pray done" data-f="pray" aria-label="${esc(TODAY.rowAria(nm, s, next))}" onclick="A.heroPray('${h.p}','${h.key}')">${ic(s === "congregation" ? "dcheck" : s === "ontime" ? "check" : SICON[sk(s)] || "check", "i")}<span>${esc(TODAY.heroAs[s] || STATUS[s])}</span></button>`;
}
function heroHTML(h, focus, now) {
  const nm = pName(h.p, h.key);
  const lbl = `<span class="zt-lbl${h.mode === "next" ? " next" : ""}"><i></i>${esc(h.mode === "now" ? TODAY.now : TODAY.next)}</span>`;
  const stage = `<div class="zt-stage">${ARCH}<div class="zt-in">${lbl}<h2 class="zt-pn">${esc(nm)}</h2><p class="zt-cd">${esc(countdown(focus, now))}</p>${bestBefore(focus, now) ? `<p class="zt-cd2">${esc(bestBefore(focus, now))}</p>` : ""}</div></div>`;
  const more = `<button type="button" class="zt-rb ghost" data-f="hmore" aria-label="${esc(TODAY.more(nm))}" onclick="A.rowMore('${h.p}','${h.key}')">${ic("dots", "i")}</button>`;
  if (h.act === "pray") return `${stage}<div class="zt-acts">${qiblaRound()}${prayBtn(h)}${more}</div>${heroChips(h)}`;
  if (h.act === "remember") {
    const on = store.remembered(store.getDay(S, h.key), h.p), ex = h.status === "excused";
    const btn = ex ? `<button type="button" class="zt-pray rem${on ? " done" : ""}" role="checkbox" aria-checked="${on}" data-f="remember" onclick="A.rememberAt('${h.p}','${h.key}')">${on ? ic("check", "i") : ""}<span>${esc(T.GENDER.remember)}</span></button>` : "";
    return `${stage}<div class="zt-acts">${qiblaRound()}${btn}${more}</div>${ex ? `<p class="zt-hnote">${esc(TODAY.rememberNote(nm))}</p>` : ""}`;
  }
  return `${stage}<div class="zt-qc">${qiblaBtn()}</div>`;
}

/** The Hijri date, worked out once a day (it is the slowest part of the top row). */
let hijri = { k: "", v: "" };
const hijriToday = now => { const k = dkey(now) + "|" + JSON.stringify(currentHijri()); if (hijri.k !== k) hijri = { k, v: hijriLabel(now) }; return hijri.v; };
function topBar(now) {
  const cal = `<button type="button" class="zt-ib" aria-label="${esc(TODAY.calendar)}" onclick="A.calOpen()">${ic("cal", "i")}</button>`;
  const name = (S.profile?.name || "").trim(), hj = hijriToday(now);
  // with a name: "As-salāmu ʿalaykum," then the name on its own line, a little larger and heavier (css/today.css)
  const hi = name ? `<span class="zt-hi1">${esc(HOME.greetingLine1)}</span> <span class="zt-hin">${esc(name)}</span>` : esc(HOME.greeting);
  // one left column (greeting, name, date) so the three lines sit tight together; the icons centre on that block
  return `<div class="zt-hd-l"><b class="zt-hi${name ? " two" : ""}">${hi}</b><small class="zt-date">${DOW[now.getDay()]} ${now.getDate()} ${MON[now.getMonth()]}${hj ? ` · ${esc(hj)}` : ""}</small></div>${avatarBtn(cal + pvChip())}`;
}

/* ---------- the list ---------- */
/** Witr on ʿIshāʾ's row once ʿIshāʾ is logged (the hero has moved on to Fajr): a small ring toggle, as in the hero. */
function witrRow(st) {
  if (st.p !== "Isha" || !store.isPrayed(st.status) || store.isExcusedDay(S, st.key)) return "";
  const w = witrShown(st.key);
  if (!w) return "";
  return `<button type="button" class="zt-chip zt-wr${w.done ? " d" : ""}" data-witr="1" data-key="${st.key}" data-f="witr-${st.key}" aria-pressed="${w.done}" aria-label="${esc(TODAY.witrRowAria(w.done))}"><span class="rg">${w.done ? ic("check", "") : ""}</span><span>${esc(T.WITR_UI.name)}</span></button>`;
}
/** One prayer row (today.rowState): name, time and mark; the whole row is the tap target once its prayer has begun. */
function rowHTML(st, now) {
  const { p, key, status: s0, hl } = st;
  const t = timesFor(parseKey(key), S.settings)[p];
  const nm = pName(p, key), exDay = store.isExcusedDay(S, key);
  const name = `<span class="zt-nm">${esc(nm)}${st.lastNight ? ` <small>· ${esc(TODAY.lastNightRow)}</small>` : ""}</span>`;
  // marks: the status; an empty ring for the current prayer not logged yet (and a quieter one for an earlier one); later today: a faint ring
  const mark = !st.begun ? statusMark(exDay ? null : s0, "z-later") : s0 ? statusMark(s0) : statusMark(null, hl === "now" ? "z-now" : "z-open");
  const extra = hl ? (hl === "now" ? TODAY.current : TODAY.nextPrayer) : "";
  const tap = st.tap === "none" ? ""
    : `<button type="button" class="zt-tap" data-tap="${p}" data-key="${key}" data-f="row-${rowId(p, key)}" aria-label="${esc(TODAY.rowAria(nm, s0, st.tap, extra))}"></button>`;
  const wr = witrRow(st);
  const mk = st.mkNow ? `<button type="button" class="zt-mkn" data-f="mk-${rowId(p, key)}" aria-label="${esc(TODAY.mkNowAria(nm))}" onclick="A.mkNow('${p}','${key}')">${ic("madeup", "i")}${esc(TODAY.mkNow)}</button>` : "";
  const more = st.begun || !!store.getDay(S, key).prayers?.[p]
    ? `<button type="button" class="zt-srm" data-f="more-${rowId(p, key)}" aria-label="${esc(TODAY.more(nm))}" onclick="A.rowMore('${p}','${key}')">${ic("dots", "i")}</button>` : "";
  return `<div class="zt-row${hl ? " cur" : ""}${st.begun ? "" : " up"}">${tap}${hl ? '<i class="zt-cdot" aria-hidden="true"></i>' : ""}${name}${wr}${mk}<span class="zt-tm">${tmHTML(t)}</span><span class="zt-mkw">${mark}</span>${more}</div>`;
}
/** Sunrise between Fajr and Zuhr: when Fajr's time ends. Quiet, never logged or counted (today.TODAY_ROWS). */
function sunriseRow(key) {
  const t = timesFor(parseKey(key), S.settings).Sunrise;
  return `<div class="zt-row sun"><span class="zt-nm">${ic("sunrise", "i")}${esc(TODAY.sunrise)}</span><span class="zt-tm">${tmHTML(t)}</span><span class="zt-mkw"></span></div>`;
}
/** Yesterday's missed prayers that can still be made up (before this morning's Fajr). */
function yesterdayMakeups(now) {
  if (!isOn(S, "makeups")) return "";
  const yk = dkey(addDays(now, -1)), y = parseKey(yk);
  return PRAYERS.filter(p => store.prayerStatus(S, yk, p) === "missed" && canStillMakeUp(y, p, now, S.settings)).map(p =>
    `<div class="zt-card zt-attn">${statusMark("missed")}<div class="t"><b>${esc(X.wasMissed(pName(p, yk)))}</b><small>${esc(X.comesOff())}</small></div><button type="button" class="zt-btn soft sm" onclick="A.madeItUp('${p}','${yk}')">${ic("clock")}${esc(HOME.madeItUp)}</button></div>`).join("");
}
function naflRow(key) {
  if (!sunnahOn() || !S.settings.sunnahNafl) return "";
  const nafl = store.sunnahChips(S, key, "day");
  if (!nafl.length) return "";
  return `<div class="zt-card zt-nafl"><b>${esc(X.moreSunnah)}</b><div class="z-scs">${zz(nafl.map(c => chipHTML(c, key)).join(""))}</div></div>`;
}
/** "Want more from Zad?" (only when every optional module is off). */
function wantMore() {
  if (["sunnah", "deeds", "makeups", "week", "progress", "tools"].some(f => isOn(S, f))) return "";
  return `<button type="button" class="zt-more" onclick="A.go('settings');A.settingsPage('features')"><span class="pl">${ic("plus")}</span><span><b>${HOME.wantMoreTitle}</b><small>${HOME.wantMoreSub}</small></span></button>`;
}
function excusedFoot(key) {
  return `<p class="zt-foot">${esc(TODAY.onlyYou)} ${S.excusedMode ? `<button type="button" class="zt-link in" data-f="endex" onclick="A.endExcusedMode()">${esc(TODAY.endExcused)}</button>` : `<button type="button" class="zt-link in" data-f="notex" onclick="A.excusedToday('${key}')">${esc(TODAY.notExcused)}</button>`}</p>`;
}

/** Between the header and the list (the all-five line is gone: it lives in Progress, 20 Nov 2026): the first-run guide line, the excused-day band, yesterday's catch-up and make-ups. */
function leadHTML(now, key) {
  const parts = [];
  if (guideLineDue(S)) parts.push(`<p class="zt-guide">${ic("hand", "i")}${esc(TODAY.guide)}</p>`);
  if (store.isExcusedDay(S, key)) {
    const mode = S.excusedMode?.since, n = mode ? daysBetween(parseKey(mode), parseKey(key)) + 1 : 0;
    parts.push(`<div class="zt-band">${ic("moon", "i")}<span>${mode ? `<b>${esc(TODAY.excusedDays)}</b> · ${esc(TODAY.dayN(n))}` : `<b>${esc(TODAY.excusedToday)}</b>`} · ${esc(TODAY.stillCount)}</span></div>`);
  }
  const yu = yesterdayUnlogged(now);
  if (yu.length) parts.push(`<button type="button" class="zt-guide zt-yu" data-f="catch" onclick="A.catchSheet()">${ic("history", "i")}<span>${esc(TODAY.yesterday(yu.length))} · <b>${esc(LOG.review)}</b></span></button>`);
  parts.push(yesterdayMakeups(now));
  return parts.join("");
}
/** A pill below the list ("Good deeds · 2 of 7", "Make-ups · 8 left"). */
const pill = (icon, label, value, onclick, f) => `<button type="button" class="zt-pill" data-f="${f}" onclick="${onclick}">${ic(icon, "i zt-pi")}<span class="l">${label}<em>${value}</em></span>${ic("chev", "i zt-cv")}</button>`;
/** Below the list: the two pills (Good deeds, then Make-ups), the provisions offer, the excused-day line, the footer. */
function restHTML(now, key, lean) {
  const parts = [], pills = [];
  // Good deeds (while the feature is on): the daily deeds done today (today.deedsLine)
  const dl = deedsLine(S, key, now);
  if (dl) pills.push(pill("heart", esc(TODAY.goodDeeds), esc(dl.empty ? TODAY.deedsChoose : COMMON.nOfM(dl.done, dl.of)), `A.deedsSheet('${key}')`, "deeds"));
  // "Make-ups · 8 left" (today.makeupsLine): opens the "I made one up" sheet; "all caught up" opens the chapter
  const mk = makeupsLine(S, key);
  if (mk) pills.push(mk.clear
    ? pill("madeup", esc(TODAY.makeups), esc(TODAY.makeupsClear), "A.mkSeeAll()", "mkline")
    : pill("madeup", esc(TODAY.makeups), esc(TODAY.makeupsLeft(mk.prayers, mk.fasts)), "A.mkPick('today')", "mkline"));
  if (pills.length) parts.push(`<div class="zt-pills${pills.length === 1 ? " one" : ""}">${pills.join("")}</div>`);
  if (!isOn(S, "deeds")) parts.push(naflRow(key)); // with Good deeds on, the nafl are in its sheet
  const pvo = pvOffer(); // the one-time provisions offer
  if (pvo) parts.push(`<div class="zt-pv">${pvo}</div>`);
  if (store.isExcusedDay(S, key)) parts.push(excusedFoot(key));
  if (lean) parts.push(wantMore());
  const loc = S.settings.location || FALLBACK_LOCATION;
  parts.push(`<div class="zt-fill"></div><p class="zt-foot sm">${esc(HOME.chipLegendFoot(loc.label, METHOD_SHORT[S.settings.method] || S.settings.method, S.settings.asr === "hanafi" ? T.ASR_UI.hanafi : T.ASR_UI.standard, false))}</p>`);
  return parts.join("");
}

/* "Welcome, {name}" once set-up is finished (set-up ends by going to Today). */
let setupSeen = !!S.profile?.onboarded;
function welcomeOnce() {
  if (setupSeen || !S.profile?.onboarded) return;
  setupSeen = true;
  toast(TODAY.welcome((S.profile.name || "").trim()));
}

/* ---------- the page: built once, then only what changed is written ---------- */
const page = () => $("#zt-page");
/** Leaving Today, or tapping its icon, brings it back to its top (app.js resetTab; views/chapters.js). */
let toTop = false;
function scrollTop(now) {
  const pg = page();
  if (!now || !pg || UI.view !== "home") { toTop = true; return; }
  toTop = false;
  if (!pg.scrollTop) return;
  const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) pg.scrollTop = 0; else pg.scrollTo({ top: 0, behavior: "smooth" });
}
registerReset(root => root === $("#v-home"), now => scrollTop(now));

/** The frame: one scrolling page with the tinted header (top row, hero), the lead, the list (one slot per row) and the rest. */
function frame(el, ids) {
  if (!el.querySelector("#zt-page")) {
    el.innerHTML = `<section class="zt-page" id="zt-page" aria-label="${esc(TODAY.todayTitle)}"><i class="zt-sb" aria-hidden="true"></i><header class="zt-head zb"><div class="zt-top"></div><div class="zt-hero"></div></header><div class="zt-lead"></div><div class="zt-list"></div><div class="zt-rest"></div></section>`;
  }
  const list = el.querySelector(".zt-list"), sig = ids.join();
  if (list.dataset.sig !== sig) { list.innerHTML = ids.map(() => `<div class="zt-slot"></div>`).join(""); list.dataset.sig = sig; }
  return { head: el.querySelector(".zt-head"), top: el.querySelector(".zt-top"), hero: el.querySelector(".zt-hero"), lead: el.querySelector(".zt-lead"), slots: list.children, rest: el.querySelector(".zt-rest") };
}

/** Everything the page depends on except the time left: when it is unchanged, a tick only rewrites the time left. */
function model(now) {
  const key = todayKey(), focus = todayFocus(S, now), dismissed = mkNowDismissed(key);
  const rows = todayRows(S, now), band = bandAt(now, S.settings), hero = heroOf(S, now, focus);
  const states = rows.map(r => (r.p === "Sunrise" ? null : rowState(S, r, now, focus, { dismissed })));
  const sig = key + "|" + band + "|" + bestBefore(focus, now) + "|" + focus.kind + focus.p + focus.key + "|" + hero.act + hero.status + "|" + states.map(s => (s ? `${s.p}${s.status}${s.begun ? 1 : 0}${s.tap}${s.hl}${s.mkNow ? 1 : 0}` : "-")).join(",");
  return { key, focus, rows, states, band, hero, sig };
}
let lastSig = "", lastDraw = null;
/** The 20 s tick when nothing but the time left changed: one text node. */
function tickOnly(m, now) {
  const el = lastDraw?.cd;
  if (!el || !el.isConnected) return false;
  const txt = countdown(m.focus, now);
  if (el.textContent !== txt) { el.textContent = txt; if (lastDraw.hero) lastDraw.hero._h = null; } // drawn fresh next time
  return true;
}

function renderHome(why) {
  if (UI.view !== "home") { refreshLive(); return; }
  const el = $("#v-home"); if (!el) return;
  const now = NOW(), m = model(now);
  if (why?.tick && m.sig === lastSig && tickOnly(m, now)) return;
  welcomeOnce();
  const f = frame(el, m.rows.map(r => rowId(r.p, r.key)));
  const hc = `zt-head zb b-${m.band}`; // tokens: css/band.css (<html data-band>); b-<band> names it for tests and tools
  if (f.head.className !== hc) f.head.className = hc;
  setHTML(f.top, topBar(now));
  setHTML(f.hero, heroHTML(m.hero, m.focus, now));
  setHTML(f.lead, leadHTML(now, m.key));
  m.rows.forEach((r, i) => setHTML(f.slots[i], m.states[i] ? rowHTML(m.states[i], now) : sunriseRow(r.key)));
  setHTML(f.rest, restHTML(now, m.key, navTabs(S).length < 2));
  lastSig = m.sig;
  lastDraw = { hero: f.hero, cd: f.hero.querySelector(".zt-cd") };
  if (toTop) { toTop = false; const pg = page(); if (pg && pg.scrollTop) pg.scrollTop = 0; }
  refreshLive();
}

onRender(renderHome);
A.weekTiles = weekTiles;
/* for tests: the page's pieces without the DOM */
export const _today = { rowHTML, heroHTML, model, countdown, leadHTML, restHTML, topBar };
