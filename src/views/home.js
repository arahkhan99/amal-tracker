/* The Today tab (#v-home): two chapters, Now · Today, side by side (swipe, or tap their names).
   - Now: the current prayer, time left, one-tap logging (rules in src/today.js), Other, sunnah, next prayer, this week.
   - Today: the five prayers with their status marks, catch-up, one "Good deeds" line, the provisions offer.
   With one tab only (prayers only) there is one chapter, "Today", with the Now card on top, and no chapter bar.
   The calendar (past days) is views/calendar.js. Also the shared pieces other views use: the prayer log sheet,
   sunnah chips, explainers, good-deed rows and sheets, and the "This week" readings (shown in Read).
   All visible text comes from strings.js / glossary.js. */
import { S, UI, A, $, NOW, todayKey, onRender, commit, render, toast, openSheet, closeSheet, go, avatarBtn } from "../app.js";
import * as store from "../store.js";
import { PRAYERS, DOW, MON, fmt12, dkey, parseKey, addDays, daysBetween, esc } from "../util.js";
import { timesFor, currentWindow, nextPrayer, windowEnd, ishaBestBefore, madeUpDeadline, canStillMakeUp, excusedSoFar, METHOD_SHORT, FALLBACK_LOCATION } from "../times.js";
import { canLog, logAllowed, madeUpAllowed } from "../logging.js";
import { hijriLabel } from "../hijri.js";
import * as st from "../stats.js";
import { isOn } from "../features.js";
import { madhhabOf, tierLabel, TIERS, itemById } from "../rules/madhhab.js";
import { thisWeek, pastSahabi, setSahabiStart, monthIndex, contentReady, loadContent, whenContent } from "../content.js";
import { gloss } from "../glossary.js";
import * as T from "../strings.js";
import { HOME_X, NOT_YET, TODAY } from "../strings.js";
import { reportLink } from "../feedback.js";
import { homeChip as pvChip, homeOffer as pvOffer } from "./provisions.js";
import { logButtons, otherOptions, logPrayer, snapshotDays, restoreSnapshot, todayChapters, guideLineDue, makeUpNowFor, makeupsLine, TODAY_ROWS, nowFocus, allFiveMoment, naflShown, naflTimes, deedsLine, sunnahLine } from "../today.js";
import { NAFL_ADDON } from "../rules/madhhab.js";
import { qiblaDegrees } from "./qibla-page.js";
import { sheetDeeds, sheetCount } from "../reading.js";
import { makeChapters, setHTML } from "./chapters.js";
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
};
export const ic = (n, cls = "i", extra = "") => `<svg class="${cls}" viewBox="0 0 24 24" ${extra} aria-hidden="true">${I[n]}</svg>`;

const SK = { congregation: "c", ontime: "o", madeup: "r", missed: "m", excused: "x" };
const SICON = { c: "dcheck", o: "check", r: "clock", m: "dash", x: "moon" };
const sk = s => SK[s] || "";
const settings = () => S.settings;
const jumuahOn = () => S.settings.jumuah !== false;
export const pName = (p, key = todayKey()) => T.prayerName(p, { date: parseKey(key), jumuah: jumuahOn() });
const longDate = d => new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(d);
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
  return `<button type="button" class="sc wj ${w.done ? "d" : ""}" data-witr="1" data-key="${key}" aria-pressed="${w.done}">${w.done ? ic("check", "") : '<i class="o"></i>'}${esc(w.chip)}<em>${esc(w.tag)}</em></button>`;
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
  const rows = [["fd", TIER.fard], ["wj", TIER.wajib], ["mu", TIER.muakkadah], ["gm", TIER.ghayr], ["nf", TIER.nafl]];
  const here = witr ? "wj" : tierCls(tier);
  showSheet(() => `<div class="sh"><span class="kick">${esc(tl.name)} · ${esc(tl.gloss || "")}</span>
    <div class="lhd"><h3 style="margin-top:6px">${esc(title)}</h3><button class="cls" onclick="A.closeSheet()" aria-label="${COMMON.close}">${ic("close")}</button></div>
    <p class="ip">${esc(text)}</p>
    <div class="tiers">${rows.map(([k, t]) => `<div class="tier ${k === here ? "on" : ""}"><i class="${k}"></i><div><b>${esc(t.name)} <span>· ${esc(t.gloss)}</span></b><small>${esc(t.line)}</small></div></div>`).join("")}</div>
    ${gl?.draft ? `<p class="fine">${APP.draftFlag}</p>` : ""}
    <div class="shfoot">${tier === "ghayr" ? `<button class="gbtn" onclick="A.hideGhayr()">${SUNNAH_UI.hideGhayr}</button>` : ""}<button class="pbtn" onclick="A.closeSheet()">${COMMON.gotIt}</button></div></div>`);
};
const allChips = key => PRAYERS.flatMap(p => store.sunnahChips(S, key, p, { all: true })).concat(store.sunnahChips(S, key, "day", { all: true }));
A.hideGhayr = () => { S.settings.sunnahGhayr = false; closeSheet(); commit(); };

/* one delegated handler for chips (tap) and explainers; long-press on a chip opens its tier sheet */
let pressTimer = null, pressed = false;
document.addEventListener("pointerdown", e => {
  const el = e.target.closest?.("[data-chip],[data-witr]"); if (!el) return;
  pressed = false; clearTimeout(pressTimer);
  pressTimer = setTimeout(() => { pressed = true; A.chipInfo(el.dataset.chip, el.dataset.key, !!el.dataset.witr); }, 480);
});
for (const ev of ["pointerup", "pointercancel", "pointerleave", "scroll"]) document.addEventListener(ev, () => clearTimeout(pressTimer), true);
document.addEventListener("contextmenu", e => { if (e.target.closest?.("[data-chip],[data-witr]")) e.preventDefault(); });
document.addEventListener("click", e => {
  const x = e.target.closest?.("[data-gl]");
  if (x) { e.stopPropagation(); e.preventDefault(); A.explain(x.dataset.gl); return; }
  const el = e.target.closest?.("[data-chip],[data-witr]"); if (!el) return;
  e.stopPropagation(); e.preventDefault();
  if (pressed) { pressed = false; return; }
  toggleChip(el);
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

/** One tap on the Now chapter or in the Other sheet: log it, then "ʿAsr logged · Undo". */
A.logTap = (p, status, key = todayKey()) => {
  const r = logPrayer(S, key, p, status, NOW());
  if (!r.ok) { refused(r, p, key); return; }
  closeSheet();
  commit();
  const n = pName(p, key);
  toast(status === "missed" && isOn(S, "makeups") ? LOG.missedToast(n) : TODAY.logged(n), undoable(r.snap));
};

/** Other: the statuses that aren't one of the Now buttons (all: true lists every status, for a Today row's Log). */
A.logSheet = (p, key = todayKey(), all = false) => showSheet(() => {
  const now = NOW(), d = parseKey(key), t = timesFor(d, settings())[p], end = windowEnd(d, p, settings());
  const head = `<div class="lhd"><div><h3>${esc(pName(p, key))}</h3><p class="sub">${esc(TODAY.otherTitleSub(key === todayKey() ? COMMON.today : longDate(d), fmt12(t), fmt12(end)))}</p></div><button class="cls" onclick="A.closeSheet()" aria-label="${COMMON.close}">${ic("close")}</button></div>`;
  if (!canLog(S, key, p, now)) return `<div class="sh">${head}<p class="note">${esc(NOT_YET.body(pName(p, key)))}</p><div class="shfoot"><button class="gbtn" onclick="A.closeSheet()">${COMMON.cancel}</button></div></div>`;
  const opts = otherOptions(S, key, p, now, { all: !!all });
  const label = k => k === "congregation" && !all && store.genderOf(S) === "f"
    ? `${esc(TODAY.otherLabel.congregation)} <span class="art">(${esc(gloss("jamaah")?.term.toLowerCase() || "jamāʿah")})</span>` : esc(all ? TODAY.prayedAs[k] : TODAY.otherLabel[k]);
  const sub = k => k === "missed" ? (isOn(S, "makeups") ? `${esc(TODAY.otherSub.missed)} <span class="art">(qaḍāʾ)</span>` : esc(TODAY.otherSub.missedNoMakeups)) : esc(TODAY.otherSub[k]);
  const info = k => k === "congregation" && !all && store.genderOf(S) === "f" ? xi("jamaah") : k === "missed" && isOn(S, "makeups") ? xi("qada") : "";
  return `<div class="sh">${head}<div class="opts">${opts.map(k => `<div class="opt"><button class="optb" onclick="A.logTap('${p}','${k}','${key}')">${marker(k)}<span class="t"><b>${label(k)}</b><small>${sub(k)}</small></span></button>${info(k)}${ic("chev", "i cv")}</div>`).join("")}</div>
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
    if (w) body += `<div class="lsec">${esc(w.tag.charAt(0).toUpperCase() + w.tag.slice(1))}${xi("witr")}</div><div class="srow" role="button" tabindex="0" data-witr="1" data-key="${key}"><span class="sc wj ${w.done ? "d" : ""}">${w.done ? ic("check", "") : '<i class="o"></i>'}${esc(w.chip)}<em>${esc(w.tag)}</em></span><div class="t"><b>${T.WITR_UI.title(w.rakahs)}</b><small>${esc(w.line)}</small></div><span class="tg ${w.done ? "on" : ""}"></span></div>`;
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
/** "+ Add a good deed" (M1): a name and a type (tick / note / count). From the Good deeds sheet, Add returns there. */
let addFrom = null;
A.addAmal = (key = "", back = "") => { addFrom = key ? () => A.deedsSheet(key, back) : null; addSheet(); };
const addSheet = () => openSheet(zz(`<div class="sh"><h3>${DEEDS.addTitle}</h3><p class="sub">${DEEDS.addLead}</p>
  <div class="field"><label for="nIn">${DEEDS.name}</label><input id="nIn" placeholder="${esc(DEEDS.namePlaceholder)}"></div>
  <div class="field"><label for="nType">${DEEDS.whenCheck}</label><select id="nType"><option value="none">${DEEDS.typeNone}</option><option value="note">${DEEDS.typeNote}</option><option value="count">${DEEDS.typeCount}</option></select></div>
  <div class="shfoot"><button class="gbtn" onclick="A.addCancel()">${COMMON.cancel}</button><button class="pbtn" onclick="A.saveAmal()">${DEEDS.addToList}</button></div></div>`));
A.addCancel = () => { const back = addFrom; addFrom = null; if (back) back(); else closeSheet(); };
A.saveAmal = () => {
  const n = $("#nIn").value.trim(); if (!n) { $("#nIn").focus(); return; }
  const type = $("#nType").value;
  S.amalList.push({ id: "c" + Date.now(), name: n, hint: DEEDS.addedByYou, detail: ["none", "note", "count"].includes(type) ? type : "none" });
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
function naflGroup(key, back) {
  if (store.isExcusedDay(S, key)) return "";
  const shown = naflShown(S);
  const head = `<div class="lsec nfh"><span>${esc(NAFL.title)}</span>${xi("nafl")}<button class="link chs" data-f="nafl-choose" onclick="A.naflChoose('${key}','${back}')">${esc(NAFL.choose)}</button></div>`;
  if (!shown.length) return head + `<p class="note2">${esc(NAFL.noneShown)}</p>`;
  const tm = naflTimes(key, S.settings, NOW());
  return head + `<div class="drows">${shown.map(x => {
    const done = store.sunnahDone(S, key, x.id), name = SUNNAH_NAME[x.key];
    const sub = NAFL.when[x.key](fmt12(tm[x.key]));
    return `<div class="drow"><button class="t" onclick="A.naflTick('${x.id}','${key}')"><b>${esc(name)}</b><small>${esc(sub)}</small></button><button class="tick" role="checkbox" aria-checked="${done}" aria-label="${esc(name)}" data-f="nafl-${x.key}" onclick="A.naflTick('${x.id}','${key}')"><span class="bx ${done ? "on" : ""}">${done ? ic("check", "") : ""}</span></button></div>`;
  }).join("")}</div>`;
}

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

/**
 * The Good deeds sheet: tick each one off. From "Good deeds · 2 of 5" on Today it lists only the deeds that are not
 * reading (reading deeds are ticked in Read: src/reading.js deedInRead), so each deed is in one place. From a day in
 * the calendar (back "day") it lists the whole day, since Read only ticks today.
 */
A.deedsSheet = (key = todayKey(), back = "") => showSheet(() => {
  const from = back === "day" ? "day" : "deeds";
  const whole = back === "day";
  const list = whole ? store.amalForDay(S, key) : sheetDeeds(S, key), day = store.getDay(S, key);
  const sc = sheetCount(S, key), base = whole ? deedsCount(key) : sc;
  const nf = naflShown(S, key), c = { done: base.done + nf.filter(x => store.sunnahDone(S, key, x.id)).length, of: base.of + nf.length };
  const rows = list.map(a => {
    const s0 = day.amal[a.id] || {};
    const sub = s0.done ? (s0.detail || DEEDS.doneWord) : amalHint(a, key);
    const edit = s0.done && a.detail !== "none" ? `<button class="link" onclick="A.detailSheet('${a.id}','${key}','${from}')">${s0.detail ? COMMON.edit : DEEDS.addDetail}</button>` : "";
    return `<div class="drow"><button class="t" onclick="A.tapAmal('${a.id}','${key}','${from}')"><b>${esc(a.name)}</b>${sub ? `<small>${esc(sub)}</small>` : ""}</button>${edit}${!s0.done && key === todayKey() ? `<!--zread:${a.id}-->` : ""}<button class="tick" role="checkbox" aria-checked="${!!s0.done}" aria-label="${esc(a.name)}" onclick="A.tapAmal('${a.id}','${key}','${from}')"><span class="bx ${s0.done ? "on" : ""}">${s0.done ? ic("check", "") : ""}</span></button></div>`;
  }).join("");
  const label = key === todayKey() ? COMMON.today : longDate(parseKey(key));
  return `<div class="sh"><div class="lhd"><div><h3>${esc(TODAY.goodDeeds)}</h3><p class="sub">${esc(TODAY.deedsSub(label, c.done, c.of))}</p></div><button class="cls" onclick="A.closeSheet()" aria-label="${COMMON.close}">${ic("close")}</button></div>
    <div class="drows">${rows || `<div class="empty">${DEEDS.empty}</div>`}</div>
    <button type="button" class="addd" data-f="add-deed" onclick="A.addAmal('${key}','${back}')">${ic("plus", "")}<span>${esc(TODAY.addDeed)}</span></button>
    ${!whole && sc.inRead ? `<p class="note2">${esc(READ.deedsInRead)}</p>` : ""}
    ${naflGroup(key, back)}
    <div class="shfoot"><button class="gbtn" onclick="A.amalListSheet?.()">${esc(TODAY.editList)}</button><button class="pbtn" onclick="${back === "day" ? `A.daySheet('${key}')` : "A.closeSheet()"}">${back === "day" ? COMMON.back : COMMON.done}</button></div></div>`;
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
   The Today tab
   ================================================================================================= */
A.openWeek = () => { UI.range = "week"; go("progress"); };
A.endExcusedMode = () => {
  const now = NOW(), key = todayKey();
  const snap = snapshot(key);
  store.endExcused(S, key, { excusedPrayers: excusedSoFar(now, S.settings) }, now);
  commit(); toast(EXCUSED.end, undoable(snap));
};
/** zad://today (widgets) and the old "Today's prayers" sheet: show the Today chapter. */
A.todaySheet = () => { if (UI.view !== "home") go("home"); A.todayChapter(todayChapters(S).indexOf("today")); };

const dot = '<i class="zt-dot" aria-hidden="true"></i>';
const head = (title, sub = "", kick = "", cls = "") => `<header class="zt-chh">${kick ? `<p class="zt-kick">${kick}</p>` : ""}<h1 class="zt-title ${cls}">${title}</h1>${sub ? `<p class="zt-sub">${sub}</p>` : ""}</header>`;
/** A quiet one-line row ("This week · 12 of 13 prayed", "Good deeds · 2 of 5"). */
const line = (icon, label, value, onclick, f) => onclick
  ? `<button type="button" class="zt-line" data-f="${f}" onclick="${onclick}">${ic(icon, "i zt-lc")}<span class="l">${label}</span><span class="v">${value}</span>${ic("chev", "i zt-cv")}</button>`
  : `<div class="zt-line">${ic(icon, "i zt-lc")}<span class="l">${label}</span><span class="v">${value}</span></div>`;

/** Time left in an open prayer: [big, small]. ʿIshāʾ counts to the middle of the night first. */
function leftParts(cur, now) {
  if (cur.p === "Isha") {
    const best = ishaBestBefore(cur.date, S.settings);
    if (now < best) return [hm(best - now), TODAY.bestBefore(fmt12(best))];
    return [hm(cur.end - now), TODAY.untilFajr(fmt12(cur.end))];
  }
  if (cur.p === "Fajr") return [hm(cur.end - now), TODAY.leftUntilSunrise(fmt12(cur.end))];
  return [hm(cur.end - now), TODAY.leftUntil(fmt12(cur.end))];
}
/** "40 min left · until 7:20 AM" (Fajr: "until sunrise 7:20 AM"). */
const leftLineOf = (cur, big) => (cur.p === "Fajr" ? TODAY.leftLineSunrise : TODAY.leftLine)(big, fmt12(cur.end));
function nextRow(now, begins = false) {
  const nx = nextPrayer(now, S.settings), k = nx.tomorrow ? dkey(addDays(now, 1)) : todayKey();
  const t = `${begins ? TODAY.begins(fmt12(nx.time)) : fmt12(nx.time)}${nx.tomorrow ? " " + COMMON.tomorrow : ""}`;
  return `<div class="zt-next"><span>${TODAY.next}</span><b>${esc(pName(nx.p, k))}</b><em>${esc(t)}</em></div>`;
}
function weekLine(now) {
  const series = st.weekSeries(S, now, 0, { settings: S.settings });
  let prayed = 0, due = 0;
  for (const d of series) { prayed += d.prayed; due += d.due; }
  const v = `<b>${TODAY.prayedOfDue(prayed, due)}</b> ${TODAY.prayedWord}`;
  return line("bars", TODAY.thisWeek, v, isOn(S, "progress") ? "A.openWeek()" : "", "week");
}
/** The one-tap buttons (src/today.js logButtons): brothers congregation then on time; sisters on time only. */
function logBtns(p, key) {
  return logButtons(S).map((k, i) => `<button type="button" class="zt-btn ${i ? "sec" : "pri"}" data-f="log-${k}" onclick="A.logTap('${p}','${k}','${key}')">${ic(k === "congregation" ? "people" : "check")}${esc(TODAY.button[k])}</button>`).join("");
}
function sunnahRow(p, key) {
  const chips = chipsFor(p, key);
  if (!chips.length) return "";
  return `<div class="zt-sun"><span class="l">${esc(TODAY.sunnahBefore(pName(p, key)))}<small>${esc(TODAY.optional)}</small></span><div class="z-scs">${zz(chips.join(""))}</div></div>`;
}

/** The Now chapter's card while a prayer is open and not logged yet. */
function openCard(cur, now, { compact = false } = {}) {
  const p = cur.p, key = dkey(cur.date), [big, small] = leftParts(cur, now);
  const guide = guideLineDue(S) ? `<p class="zt-guide">${ic("hand", "i")}${esc(TODAY.guide)}</p>` : "";
  const leftLine = compact
    ? `<div class="zt-left cmp"><b class="nm">${esc(pName(p, key))}</b><span>${esc(leftLineOf(cur, big))}</span></div>`
    : `<div class="zt-left"><b>${esc(big)}</b><span>${esc(small)}</span></div>`;
  return `<div class="zt-card pad">${leftLine}<div class="zt-btns">${logBtns(p, key)}</div>
    <div class="zt-other"><button type="button" class="zt-link" data-f="other" onclick="A.logSheet('${p}','${key}')">${esc(TODAY.other)}</button></div>${guide}
    ${compact ? "" : sunnahRow(p, key) + nextRow(now)}</div>`;
}
/** Excused days (hayḍ, nifās): remembrance at prayer time instead of the log buttons. */
function excusedCard(cur, now, key) {
  const mode = S.excusedMode?.since;
  const n = mode ? daysBetween(parseKey(mode), parseKey(key)) + 1 : 0;
  const band = `<div class="zt-band">${ic("moon", "i")}<span>${mode ? `<b>${esc(TODAY.excusedDays)}</b> · ${esc(TODAY.dayN(n))}` : `<b>${esc(TODAY.excusedToday)}</b>`}</span></div>`;
  let body = "";
  if (cur) {
    const ck = dkey(cur.date), status = store.prayerStatus(S, ck, cur.p);
    if (status === "excused") {
      const on = store.remembered(store.getDay(S, ck), cur.p);
      body = `<button type="button" class="zt-btn ${on ? "sec" : "pri"}" role="checkbox" aria-checked="${on}" data-f="remember" onclick="A.rememberAt('${cur.p}','${ck}')">${on ? ic("check") : ""}${esc(T.GENDER.remember)}</button>
        <p class="zt-note c">${esc(TODAY.rememberNote(pName(cur.p, ck)))}</p>`;
    } else if (status) body = `<div class="zt-done">${statusMark(status)}<div class="t"><b>${esc(TODAY.prayedAs[status] || STATUS[status])}</b></div><button type="button" class="zt-link" onclick="A.prayerSheet('${cur.p}','${ck}')">${esc(TODAY.change)}</button></div>`;
  }
  return `<div class="zt-card pad">${band}${body}${nextRow(now)}</div>`;
}
function excusedFoot(key) {
  return `<p class="zt-foot">${esc(TODAY.onlyYou)} ${S.excusedMode ? `<button type="button" class="zt-link in" data-f="endex" onclick="A.endExcusedMode()">${esc(TODAY.endExcused)}</button>` : `<button type="button" class="zt-link in" data-f="notex" onclick="A.excusedToday('${key}')">${esc(TODAY.notExcused)}</button>`}</p>`;
}

/* ---------- "Make up Zuhr now?" (src/today.js makeUpNowFor): one quiet card under the Now card ----------
   "I made it up" logs it as made up (the same path as Other's "Made up later", with Undo); "Not now" hides it for
   that prayer today, kept on this phone only. */
const MKNOW = "zad-mknow";
function mkNowDismissed(key) {
  try { const o = JSON.parse(localStorage.getItem(MKNOW) || "{}"); return Array.isArray(o[key]) ? o[key] : []; } catch (e) { return []; }
}
A.mkNow = p => applyStatus(p, todayKey(), "madeup", { close: false });
A.mkNowLater = p => {
  const k = todayKey();
  try { localStorage.setItem(MKNOW, JSON.stringify({ [k]: [...new Set([...mkNowDismissed(k), p])] })); } catch (e) { /* private mode */ }
  render();
};
function makeUpNowCard(now, key) {
  const p = makeUpNowFor(S, now, { dismissed: mkNowDismissed(key) });
  if (!p) return "";
  return `<div class="zt-card zt-mknow" role="region" aria-label="${esc(TODAY.mkNowTitle(pName(p, key)))}"><span class="zt-ico">${ic("madeup", "i")}</span><div class="t"><b>${esc(TODAY.mkNowTitle(pName(p, key)))}</b><small>${esc(TODAY.mkNowSub)}</small></div>
    <div class="zt-mkb"><button type="button" class="zt-btn soft sm" data-f="mknow" onclick="A.mkNow('${p}')">${ic("check")}${esc(HOME.madeItUp)}</button><button type="button" class="zt-link" data-f="mknow-later" onclick="A.mkNowLater('${p}')">${esc(COMMON.notNow)}</button></div></div>`;
}

/** "Qibla 119°": a small secondary button beside the prayer's name; opens the Qibla page (views/qibla-page.js). */
function qiblaBtn() {
  const deg = qiblaDegrees(S.settings.location);
  return `<button type="button" class="zt-qb" data-f="qibla" aria-label="${esc(TODAY.qiblaAria(deg))}" onclick="A.openQibla()">${ic("compass", "i")}<span>${esc(TODAY.qibla(deg))}</span></button>`;
}
/** The Now chapter's head: the kicker with the Qibla button on its right, then the prayer's name. */
const nowHead = (title, kick, sub = "") => `<header class="zt-chh"><div class="zt-khr"><p class="zt-kick">${kick}</p>${qiblaBtn()}</div><h1 class="zt-title xl">${title}</h1>${sub ? `<p class="zt-sub">${sub}</p>` : ""}</header>`;
/** The next prayer, once the current one is logged (or none is open): when it begins, no buttons until then. */
function nextCard(f, now) {
  const t = fmt12(f.time) + (f.tomorrow ? ` ${COMMON.tomorrow}` : "");
  const notes = [TODAY.inLeft(hm(f.time - now))];
  if (f.p === "Fajr") notes.push(TODAY.endsAtSunrise(fmt12(timesFor(parseKey(f.key), S.settings).Sunrise)));
  return `<div class="zt-card pad zt-nextc"><div class="zt-left"><b>${esc(TODAY.begins(t))}</b></div><p class="zt-note">${notes.map(esc).join(" · ")}</p></div>`;
}
/** All five prayed (M6): one calm line for that day, with the run of days when it is more than one. */
function allFiveCard(now) {
  const m = allFiveMoment(S, now);
  if (!m) return "";
  return `<div class="zt-card zt-five" role="status"><span class="zt-ico">${ic("check", "i")}</span><p><b>${esc(TODAY.allFive)}</b>${m.streak >= 2 ? ` · ${esc(TODAY.allFiveStreak(m.streak))}` : ""}</p></div>`;
}

function nowChapter(now, key) {
  const cur = currentWindow(now, S.settings);
  const ck = cur ? dkey(cur.date) : null;
  if (store.isExcusedDay(S, ck || key)) {
    const kick = cur ? `${dot}${esc(ck === key ? TODAY.now : TODAY.lastNight)}` : esc(TODAY.next);
    const title = cur ? pName(cur.p, ck) : pName(nextPrayer(now, S.settings).p, key);
    const sub = cur ? esc(leftLineOf(cur, leftParts(cur, now)[0])) : "";
    return nowHead(esc(title), kick, sub) + excusedCard(cur, now, ck || key) + `<div class="zt-fill"></div>` + excusedFoot(ck || key);
  }
  // Once the current prayer is logged, Now moves on to the next one (edits are made on the Today chapter)
  const f = nowFocus(S, now);
  const rest = allFiveCard(now) + makeUpNowCard(now, key) + `<div class="zt-fill"></div>` + weekLine(now);
  if (f.kind === "open") return nowHead(esc(pName(f.p, f.key)), `${dot}${esc(f.key === key ? TODAY.now : TODAY.lastNight)}`) + openCard(f.cur, now) + rest;
  return nowHead(esc(pName(f.p, f.key)), esc(TODAY.next)) + nextCard(f, now) + rest;
}

/** One prayer on the Today chapter: status mark, name, what it is now, and its time or a Log button. */
function prayerRow(p, key, now, cur) {
  const d = parseKey(key), s0 = store.prayerStatus(S, key, p), day = store.getDay(S, key);
  const t = timesFor(d, S.settings)[p];
  const open = cur && cur.p === p && dkey(cur.date) === key;
  const name = esc(pName(p, key));
  const tap = `A.prayerSheet('${p}','${key}')`;
  const rowBtn = (mark, sub, cls = "") => `${mark}<button type="button" class="t ${cls}" data-f="row-${p}" onclick="${tap}"><b>${name}</b><small>${sub}</small></button>`;
  if (!canLog(S, key, p, now)) {
    const witr = p === "Isha" && witrShown(key) ? ` · ${esc(TODAY.withWitr)}` : "";
    return `<div class="zt-row up">${rowBtn(statusMark(null), esc(NOT_YET.begins(fmt12(t))) + witr)}</div>`;
  }
  if (s0) {
    const sunN = s0 === "missed" || s0 === "excused" ? 0 : store.sunnahChips(S, key, p).filter(c => store.sunnahDone(S, key, c.id)).length;
    let sub = esc(STATUS[s0]) + (sunN ? ` · ${esc(TODAY.sunnahN(sunN))}` : "") + (s0 === "excused" && store.remembered(day, p) ? ` · ${esc(T.PROVISIONS.st.excusedRem)}` : "");
    let right = `<span class="tm">${fmt12(t)}</span>`;
    if (s0 === "missed" && isOn(S, "makeups") && canStillMakeUp(d, p, now, S.settings)) {
      sub = esc(TODAY.stillTime);
      right = `<button type="button" class="zt-btn soft sm" data-f="mk-${p}" onclick="A.madeItUp('${p}','${key}')">${ic("clock")}${esc(HOME.madeItUp)}</button>`;
    }
    return `<div class="zt-row">${rowBtn(statusMark(s0), sub)}${right}</div>`;
  }
  if (open) {
    const sub = p === "Fajr" ? TODAY.endsAtSunrise(fmt12(cur.end)) : TODAY.nowLeft(hm(cur.end - now));
    return `<div class="zt-row cur">${rowBtn(statusMark(null, "z-now"), `${dot}${esc(sub)}`)}<button type="button" class="zt-btn pri sm" data-f="log-${p}" onclick="A.logSheet('${p}','${key}',true)">${esc(TODAY.log)}</button></div>`;
  }
  return `<div class="zt-row">${rowBtn(statusMark(null), esc(TODAY.notLogged))}<button type="button" class="zt-btn sec sm" data-f="log-${p}" onclick="A.logSheet('${p}','${key}',true)">${esc(TODAY.log)}</button></div>`;
}
/** Sunrise between Fajr and Zuhr: when Fajr's time ends. Muted, never logged or counted (today.TODAY_ROWS). */
function sunriseRow(key) {
  const t = timesFor(parseKey(key), S.settings).Sunrise;
  return `<div class="zt-row sun"><span class="zt-sunic">${ic("sun", "i")}</span><span class="t"><b>${esc(TODAY.sunrise)}</b><small>${esc(TODAY.sunriseSub)}</small></span><span class="tm">${fmt12(t)}</span></div>`;
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

function todayChapter(now, key, { lean = false } = {}) {
  const day = store.getDay(S, key), cur = currentWindow(now, S.settings);
  const prayed = PRAYERS.filter(p => store.isPrayed(store.prayerStatus(S, key, p))).length;
  const sub = day.excused && !prayed ? esc(TODAY.excusedToday) : `<b>${esc(TODAY.nOf5(prayed))}</b> ${esc(TODAY.prayedWord)}${prayed === 5 ? ` · ${esc(COMMON.alhamdulillah.replace(/\.$/, ""))}` : ""}`;
  const parts = [head(esc(TODAY.todayTitle), sub)];
  // Excused day (M10): remembrance still counts
  if (store.isExcusedDay(S, key)) parts.push(`<p class="zt-exnote">${ic("moon", "i")}<span>${esc(TODAY.stillCount)}</span></p>`);
  // prayers only: the Now card sits on top of the list (no Now chapter)
  if (lean && cur) {
    const ck = dkey(cur.date);
    if (store.isExcusedDay(S, ck)) parts.push(excusedCard(cur, now, ck));
    else if (!store.prayerStatus(S, ck, cur.p)) parts.push(openCard(cur, now, { compact: true }));
  }
  parts.push(yesterdayMakeups(now));
  parts.push(`<div class="zt-card list">${TODAY_ROWS.map(p => (p === "Sunrise" ? sunriseRow(key) : prayerRow(p, key, now, cur))).join("")}</div>`);
  if (!isOn(S, "deeds")) parts.push(naflRow(key)); // with Good deeds on, the nafl are in its sheet
  const yu = yesterdayUnlogged(now);
  if (yu.length) parts.push(line("history", esc(TODAY.yesterday(yu.length)), esc(LOG.review), "A.catchSheet()", "catch"));
  // "Sunnah · 6 of 12 rakʿahs · Witr ✓" (M7): opens the day's sunnah chips and Witr
  const sl = sunnahLine(S, key, now);
  if (sl) {
    const w = sl.witr ? ` · ${esc(sl.witr === "done" ? TODAY.witrDone : sl.witr === "missed" ? TODAY.witrMissed : TODAY.witrToDo)}` : "";
    const v = sl.kind === "rakahs" ? TODAY.sunnahRakahs(sl.got, sl.of) : MEASURE.raghibahWitrValue(sl.got, sl.of);
    parts.push(line("layers", esc(sl.kind === "rakahs" ? TODAY.sunnahLine : MEASURE.raghibahWitr), `<b>${esc(v)}</b>${sl.kind === "rakahs" ? w : ""}`, `A.daySunnah('${key}','today')`, "sunnah"));
  }
  // Good deeds (always, while the feature is on): the deeds not read in Read, and the nafl add-on. Above Make-ups.
  const dl = deedsLine(S, key);
  if (dl) parts.push(line("hand", esc(TODAY.goodDeeds), dl.empty ? esc(TODAY.deedsAddOwn) : `<b>${esc(COMMON.nOfM(dl.done, dl.of))}</b>`, `A.deedsSheet('${key}')`, "deeds"));
  // "Make-ups · 8 left" (today.makeupsLine): opens the "I made one up" sheet; "all caught up" opens the chapter
  const mk = makeupsLine(S, key);
  if (mk) parts.push(mk.clear
    ? line("madeup", esc(TODAY.makeups), esc(TODAY.makeupsClear), "A.mkSeeAll()", "mkline")
    : line("madeup", esc(TODAY.makeups), `<b>${esc(TODAY.makeupsLeft(mk.prayers, mk.fasts))}</b>`, "A.mkPick('today')", "mkline"));
  const pvo = pvOffer(); // the one-time provisions offer
  if (pvo) parts.push(`<div class="zt-pv">${pvo}</div>`);
  if (lean) parts.push(wantMore());
  const loc = S.settings.location || FALLBACK_LOCATION;
  parts.push(`<div class="zt-fill"></div><p class="zt-foot sm">${esc(HOME.chipLegendFoot(loc.label, METHOD_SHORT[S.settings.method] || S.settings.method, S.settings.asr === "hanafi" ? T.ASR_UI.hanafi : T.ASR_UI.standard, false))}</p>`);
  return parts.join("");
}

function topBar(now) {
  const cal = `<button type="button" class="zt-ib" aria-label="${esc(TODAY.calendar)}" onclick="A.calOpen()">${ic("cal", "i")}</button>`;
  const name = (S.profile?.name || "").trim();
  const hi = `<span class="zt-hi">${esc(name ? HOME.greetingName(name) : HOME.greeting)}</span>`;
  return `<div class="zt-dt">${hi}<b>${DOW[now.getDay()]}, ${now.getDate()} ${MON[now.getMonth()]}</b><small>${esc(hijriLabel(now))}</small></div>${avatarBtn(cal + pvChip())}`;
}

/* ---------- chapters: swipe (scroll-snap) or tap their names; keyboard: arrows, Home, End (views/chapters.js) ---------- */
let homeChs = [];
const CH = makeChapters({
  prefix: "zt", label: TODAY.chaptersLabel, scrollBar: false,
  get: () => homeChs[UI.todayCh] || homeChs[0],
  set: id => { UI.todayCh = Math.max(0, homeChs.indexOf(id)); },
});
/** Show chapter i (0 = Now). focus: move focus to its tab (keyboard). */
A.todayChapter = (i, { focus = false, instant = false } = {}) => CH.show(i, { focus, instant });

/* "Welcome, {name}" once set-up is finished (set-up ends by going to Today). */
let setupSeen = !!S.profile?.onboarded;
function welcomeOnce() {
  if (setupSeen || !S.profile?.onboarded) return;
  setupSeen = true;
  toast(TODAY.welcome((S.profile.name || "").trim()));
}

function renderHome() {
  if (UI.view !== "home") { refreshLive(); return; }
  welcomeOnce();
  const el = $("#v-home"); if (!el) return;
  const now = NOW(), key = todayKey(), chs = todayChapters(S);
  if (UI.todayCh >= chs.length) UI.todayCh = 0;
  homeChs = chs;
  CH.ensure(el, chs, TODAY.chapters);
  setHTML(CH.top(), topBar(now));
  for (const c of chs) {
    const html = c === "now" ? nowChapter(now, key) : todayChapter(now, key, { lean: chs.length === 1 });
    setHTML(CH.panel(c), withRead(html, now));
  }
  CH.land(); // the remembered chapter, without animating (on open, after a rotation); never while a swipe is moving
  refreshLive();
}

onRender(renderHome);
A.weekTiles = weekTiles;
