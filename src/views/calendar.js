/* The calendar (#v-calendar), opened from the calendar icon on Today. It does the old Tracker tab's job:
   - a month view: five small bars per day (prayed / missed / not logged), future days faint;
   - tap a day: its sheet, with a picker for each prayer, good deeds, sunnah and Witr, the note, and provisions;
   - the "Excused days" range sheet (A.excusedCal, also opened from Settings).
   Every write uses the same rules as Today (src/today.js logPrayer: no logging before a prayer begins,
   "made up" only after its time has ended, day.first stamped). */
import { S, UI, A, $, NOW, onRender, commit, toast, openSheet, closeSheet, todayKey } from "../app.js";
import * as store from "../store.js";
import { PRAYERS, DOW, MON, fmt12, dkey, parseKey, addDays, daysBetween, esc } from "../util.js";
import { timesFor, weekIndex } from "../times.js";
import { canLog, madeUpAllowed } from "../logging.js";
import { isOn } from "../features.js";
import { COMMON, STATUS, STATUS_SHORT, LOG, EXCUSED, TODAY, CALENDAR, WEEK_LETTERS_SUN, TRACKER } from "../strings.js";
import { trackerChip as pvTrackerChip } from "./provisions.js";
import { zz, ic, X, pName, chipsFor, chipLegend, chipHTML, snapshot, restore, showSheet, marker, deedsCount } from "./home.js";
import { logPrayer, logButtons, sunnahLine, naflShown } from "../today.js";
import { hijriLabel } from "../hijri.js";
import { dayPct } from "../stats.js";

export const MAX_BACK = 365; // how far back the calendar goes
const shortDate = d => `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()].slice(0, 3)}`;
const isPrayed = s => s === "congregation" || s === "ontime" || s === "madeup";

/* ---------- month view ---------- */
let month = null; // the first day of the month shown
const firstOf = d => new Date(d.getFullYear(), d.getMonth(), 1);
const earliest = () => firstOf(addDays(NOW(), -MAX_BACK));
A.calOpen = () => { month = firstOf(NOW()); A.go("calendar"); };
A.calStep = n => {
  const to = new Date(month.getFullYear(), month.getMonth() + n, 1);
  if (to > firstOf(NOW()) || to < earliest()) return;
  month = to; renderCalendar();
};

function monthGrid(now) {
  const y = month.getFullYear(), m = month.getMonth(), tk = todayKey();
  const dim = new Date(y, m + 1, 0).getDate(), lead = weekIndex(new Date(y, m, 1));
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(`<span class="zc-dc empty" aria-hidden="true"></span>`);
  let prayed = 0, due = 0;
  for (let n = 1; n <= dim; n++) {
    const d = new Date(y, m, n), k = dkey(d), day = store.getDay(S, k), fut = k > tk, isT = k === tk;
    const sts = PRAYERS.map(p => store.statusOf(day, p)), got = sts.filter(isPrayed).length;
    if (!fut && !isT && k >= S.createdKey && !day.excused) { prayed += got; due += 5; }
    const old = k < dkey(addDays(now, -MAX_BACK));
    let marks = "", label = CALENDAR.dayLabel(n, MON[m], fut ? null : got);
    if (!fut && day.excused) { marks = `<span class="ex">${ic("moon", "i")}</span>`; label = CALENDAR.excusedDay(n, MON[m]); }
    else if (!fut) marks = `<span class="pp">${sts.map(s => `<i class="${isPrayed(s) ? "on" : s === "missed" ? "ms" : ""}"></i>`).join("")}</span>`;
    const off = fut || old;
    cells.push(`<button type="button" class="zc-dc ${fut ? "fut" : ""} ${isT ? "today" : ""}" ${off ? "disabled" : ""} ${isT ? 'aria-current="date"' : ""} aria-label="${esc(label)}" onclick="A.daySheet('${k}')"><b>${n}</b>${marks}</button>`);
  }
  return { html: cells.join(""), prayed, due };
}

function renderCalendar() {
  if (UI.view !== "calendar") return;
  const el = $("#v-calendar"); if (!el) return;
  const now = NOW();
  if (!month) month = firstOf(now);
  const g = monthGrid(now), y = month.getFullYear(), m = month.getMonth();
  const canPrev = new Date(y, m - 1, 1) >= earliest(), canNext = new Date(y, m + 1, 1) <= firstOf(now);
  const anyEx = Object.keys(S.days).some(k => k.startsWith(`${y}-${String(m + 1).padStart(2, "0")}`) && S.days[k]?.excused);
  el.innerHTML = `<div class="zc">
    <div class="zc-top"><button type="button" class="zt-link back" onclick="A.go('home')">${ic("chevL", "i")}${esc(CALENDAR.back)}</button></div>
    <div class="zc-mhead"><header class="zt-chh"><h1 class="zt-title">${esc(MON[m])}</h1><p class="zt-sub">${CALENDAR.monthSub(y, g.prayed, g.due)}</p></header>
      <div class="zc-mnav"><button type="button" class="zt-ib" aria-label="${esc(CALENDAR.prevMonth)}" ${canPrev ? "" : "disabled"} onclick="A.calStep(-1)">${ic("chevL", "i")}</button><button type="button" class="zt-ib" aria-label="${esc(CALENDAR.nextMonth)}" ${canNext ? "" : "disabled"} onclick="A.calStep(1)">${ic("chev", "i")}</button></div></div>
    <div class="zt-card zc-cal"><div class="zc-wd" aria-hidden="true">${WEEK_LETTERS_SUN.map(l => `<span>${l}</span>`).join("")}</div><div class="zc-grid">${g.html}</div></div>
    <div class="zc-legend"><span><i class="lp on"></i>${esc(CALENDAR.legend.prayed)}</span><span><i class="lp ms"></i>${esc(CALENDAR.legend.missed)}</span><span><i class="lp"></i>${esc(CALENDAR.legend.none)}</span>${anyEx ? `<span>${ic("moon", "i xs")}${esc(CALENDAR.legend.excused)}</span>` : ""}</div>
    <p class="zc-foot">${esc(CALENDAR.tapDay)}</p></div>`;
}

/* ---------- a day's sheet ---------- */
const COLS = () => logButtons(S)[0] === "congregation" ? ["congregation", "ontime", "madeup", "missed"] : ["ontime", "congregation", "madeup", "missed"];
function pick(p, c, key, cur, now) {
  const sel = cur === c;
  const off = !sel && c === "madeup" && !madeUpAllowed(S, key, p, now);
  const MK = { congregation: "dcheck", ontime: "check", madeup: "clock", missed: "dash" };
  return `<button type="button" class="pick ${sel ? "sel" : ""}" role="radio" aria-checked="${sel}" aria-label="${esc(STATUS[c])}" ${off ? "disabled" : ""} onclick="A.dayPick('${p}','${c}','${key}')">${sel ? marker(c) : `<span class="mk ghost">${ic(MK[c], "")}</span>`}</button>`;
}
/** The run of excused days holding `key`: { n, m } (day n of m). */
export function excusedRun(S0, key) {
  const ex = k => !!S0.days[k]?.excused;
  let a = parseKey(key), b = parseKey(key);
  while (ex(dkey(addDays(a, -1)))) a = addDays(a, -1);
  while (ex(dkey(addDays(b, 1)))) b = addDays(b, 1);
  return { n: daysBetween(a, parseKey(key)) + 1, m: daysBetween(a, b) + 1 };
}
/** A column head: the word, allowed to wrap onto two lines (Congre-gation hyphenates only when it must). */
const colHead = c => esc(CALENDAR.col[c]).replace("Congregation", "Congre&shy;gation");
function dayHTML(key) {
  const d = parseKey(key), day = store.getDay(S, key), now = NOW();
  const n = PRAYERS.filter(p => isPrayed(store.prayerStatus(S, key, p))).length;
  // The day's summary (M8): prayed, the day's %, the Hijri date; excused days say which day of the run
  const hj = hijriLabel(d), pct = dayPct(S, d, now);
  const bits = [];
  if (day.excused) { const r = excusedRun(S, key); bits.push(esc(CALENDAR.excused), esc(X.dayNOfM(r.n, r.m))); }
  else { bits.push(CALENDAR.daySub(n)); if (pct != null) bits.push(`${pct}%`); }
  if (key < S.createdKey && !day.excused) bits.push(esc(CALENDAR.before));
  const head = `<div class="lhd"><div><h3>${esc(`${DOW[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}`)}</h3><p class="sub">${bits.join(" · ")}${hj ? `<br><span class="hj">${esc(hj)}</span>` : ""}</p></div><button class="cls" onclick="A.closeSheet()" aria-label="${COMMON.close}">${ic("close")}</button></div>`;
  let body;
  if (day.excused) {
    body = `<div class="pdex">${ic("moon")}<p>${esc(X.excusedLine)}</p><div class="acts"><button class="gbtn" onclick="A.excusedCal('${key}')">${esc(X.editDates)}</button><button class="gbtn" onclick="A.notExcused('${key}')">${esc(X.notExcused)}</button></div></div>`;
  } else {
    const cols = COLS();
    const hdr = `<div class="pd hd" aria-hidden="true"><span class="nm"></span>${cols.map(c => `<span class="ch">${colHead(c)}</span>`).join("")}</div>`;
    const rows = PRAYERS.map(p => {
      const t = timesFor(d, S.settings)[p], cur = store.prayerStatus(S, key, p);
      const nm = `<button type="button" class="nm" onclick="A.prayerSheet('${p}','${key}')"><b>${esc(pName(p, key))}</b><small>${fmt12(t)}</small></button>`;
      if (!canLog(S, key, p, now)) return `<div class="pd">${nm}<span class="pdn">${esc(TODAY.begins(fmt12(t)))}</span></div>`;
      return `<div class="pd" role="radiogroup" aria-label="${esc(pName(p, key))}">${nm}${cols.map(c => pick(p, c, key, cur, now)).join("")}</div>`;
    }).join("");
    // Very narrow (large text on a small phone): the heads give way to a legend of the marks the cells show
    const MKI = { congregation: "dcheck", ontime: "check", madeup: "clock", missed: "dash" };
    const legend = `<div class="pdl">${cols.map(c => `<span><span class="mk ghost">${ic(MKI[c], "")}</span>${esc(STATUS_SHORT[c])}</span>`).join("")}</div>`;
    body = `<div class="pdg">${legend}${hdr}${rows}</div>`;
  }
  const lines = [];
  const sunnah = !day.excused && (isOn(S, "sunnah") || store.witrChip(S, key).inQada);
  if (sunnah) {
    // its value: the sunnah measure and Witr ("6 of 12 rakʿahs · Witr ✓"), or Witr alone with Sunnah off
    const sl = sunnahLine(S, key, now), w = store.witrChip(S, key);
    const ws = !w.allowed ? "" : w.done ? TODAY.witrDone : w.status === "missed" ? TODAY.witrMissed : key === todayKey() && canLog(S, key, "Isha", now) ? TODAY.witrToDo : "";
    const v = [sl && sl.kind === "rakahs" ? TODAY.sunnahRakahs(sl.got, sl.of) : sl ? `${sl.got}/${sl.of}` : "", ws].filter(Boolean).join(" · ");
    lines.push(`<button type="button" class="dline" onclick="A.daySunnah('${key}')">${ic("check", "i lc")}<span class="l">${esc(CALENDAR.sunnah)}</span>${v ? `<span class="v">${esc(v)}</span>` : ""}${ic("chev", "i cv")}</button>`);
  }
  if (isOn(S, "deeds")) { const c0 = deedsCount(key), nf = naflShown(S, key), c = { done: c0.done + nf.filter(x => store.sunnahDone(S, key, x.id)).length, of: c0.of + nf.length }; lines.push(`<button type="button" class="dline" onclick="A.deedsSheet('${key}','day')">${ic("hand", "i lc")}<span class="l">${esc(TODAY.goodDeeds)}</span><span class="v"><b>${esc(COMMON.nOfM(c.done, c.of))}</b></span>${ic("chev", "i cv")}</button>`); }
  lines.push(`<button type="button" class="dline" onclick="A.noteSheet('${key}')">${ic("note", "i lc")}<span class="l">${esc(CALENDAR.note)}</span><span class="v">${esc(day.note ? CALENDAR.editNote : CALENDAR.addNote)}</span>${ic("chev", "i cv")}</button>`);
  const pv = pvTrackerChip(key); // "+N provisions", only with Settings → Provisions → Provisions in the calendar
  return `<div class="sh">${head}${body}<div class="dlines">${lines.join("")}</div>${pv ? `<div class="dpv">${pv}</div>` : ""}
    <div class="shfoot"><button class="pbtn" onclick="A.closeSheet()">${COMMON.done}</button></div></div>`;
}
A.daySheet = key => { if (!key || key > todayKey()) return; showSheet(() => dayHTML(key)); };

/** A picker tap: set that status, or clear it when it was already set. Same rules as Today. */
A.dayPick = (p, c, key) => {
  const cur = store.prayerStatus(S, key, p), next = cur === c ? null : c;
  const r = logPrayer(S, key, p, next, NOW());
  if (!r.ok) { toast(r.reason === "notStarted" ? TODAY.begins(fmt12(timesFor(parseKey(key), S.settings)[p])) : TODAY.madeUpEarly(pName(p, key))); return; }
  commit();
  const n = pName(p, key);
  toast(next === "missed" && isOn(S, "makeups") ? LOG.missedToast(n) : LOG.setToast(n, next ? STATUS[next] : COMMON.clear.toLowerCase()), { undo: () => restore(r.snap) });
};

/** A day's sunnah chips and Witr (long-press a chip for its tier). from "today": the Sunnah line on Today (Done). */
A.daySunnah = (key, from = "") => showSheet(() => {
  const rows = PRAYERS.map(p => { const ch = chipsFor(p, key); return ch.length ? `<div class="lsec">${esc(pName(p, key))}</div><div class="scs">${ch.join("")}</div>` : ""; }).join("");
  const nafl = isOn(S, "sunnah") && S.settings.sunnahNafl ? store.sunnahChips(S, key, "day") : [];
  const day = nafl.length ? `<div class="lsec">${esc(X.moreSunnah)}</div><div class="scs">${nafl.map(c => chipHTML(c, key)).join("")}</div>` : "";
  return `<div class="sh"><div class="lhd"><div><h3>${esc(CALENDAR.sunnah)}</h3><p class="sub">${esc(shortDate(parseKey(key)))}</p></div><button class="cls" onclick="A.closeSheet()" aria-label="${COMMON.close}">${ic("close")}</button></div>
    ${rows}${day}${isOn(S, "sunnah") ? chipLegend() : ""}<div class="shfoot">${from === "today" ? `<button class="pbtn" onclick="A.closeSheet()">${COMMON.done}</button>` : `<button class="pbtn" onclick="A.daySheet('${key}')">${COMMON.back}</button>`}</div></div>`;
});

/** The day's note. */
A.noteSheet = key => {
  const day = store.getDay(S, key);
  openSheet(zz(`<div class="sh"><h3>${esc(CALENDAR.noteTitle)}</h3><p class="sub">${esc(shortDate(parseKey(key)))}</p>
    <div class="field"><label for="dayNote">${esc(CALENDAR.note)}</label><textarea id="dayNote" placeholder="${esc(TRACKER.notePlaceholder)}">${esc(day.note || "")}</textarea></div>
    <div class="shfoot"><button class="gbtn" onclick="A.daySheet('${key}')">${COMMON.cancel}</button><button class="pbtn" onclick="A.saveNote('${key}')">${esc(CALENDAR.noteSave)}</button></div></div>`));
};
A.saveNote = key => {
  const v = $("#dayNote")?.value ?? "";
  const day = store.ensureDay(S, key);
  day.note = v; day.u = Date.now();
  commit(); toast(CALENDAR.noteSaved);
  A.daySheet(key);
};

/* ---------- the "Excused days" range sheet (Settings → Mark excused days, and a day's sheet) ---------- */
let cal = { month: new Date(), from: "", to: "", field: "from" };
function rangeHTML() {
  const tk = todayKey(), y = cal.month.getFullYear(), m = cal.month.getMonth();
  const first = weekIndex(new Date(y, m, 1)), dim = new Date(y, m + 1, 0).getDate();
  const total = Math.ceil((first + dim) / 7) * 7;
  const cells = [];
  for (let i = 0; i < total; i++) {
    const d = new Date(y, m, 1 - first + i), k = dkey(d), inMonth = d.getMonth() === m;
    let c = inMonth ? "" : "mute";
    if (k === cal.from) c += " s"; if (k === cal.to) c += " e";
    if (cal.from && cal.to && k > cal.from && k < cal.to) c += " in";
    if (k === tk) c += " td";
    cells.push(`<button class="${c}" onclick="A.calDay('${k}')">${d.getDate()}</button>`);
  }
  return `<div class="mhead"><button aria-label="${esc(CALENDAR.prevMonth)}" onclick="A.calMonth(-1)">${ic("chevL")}</button><b>${MON[m]} ${y}</b><button aria-label="${esc(CALENDAR.nextMonth)}" onclick="A.calMonth(1)">${ic("chev")}</button></div>
    <div class="minical">${WEEK_LETTERS_SUN.map(l => `<div class="dh">${l}</div>`).join("")}${cells.join("")}</div>`;
}
let reopen = () => {};
A.calMonth = n => { cal.month = new Date(cal.month.getFullYear(), cal.month.getMonth() + n, 1); reopen(); };
A.calDay = k => {
  if (cal.field === "from") { cal.from = k; if (cal.to < k) cal.to = k; cal.field = "to"; }
  else { if (k < cal.from) { cal.to = cal.from; cal.from = k; } else cal.to = k; cal.field = "from"; }
  reopen();
};
A.calField = f => { cal.field = f; reopen(); };
/** "Excused days" range sheet. Settings calls A.excusedCal() (a day's sheet passes its day to start from). */
A.excusedCal = (fromKey = todayKey()) => {
  cal = { month: parseKey(fromKey), from: fromKey, to: fromKey, field: "to" };
  reopen = () => openSheet(zz((() => {
    const a = parseKey(cal.from), b = parseKey(cal.to), n = daysBetween(a, b) + 1;
    return `<div class="sh"><div class="lhd"><h3>${EXCUSED.sheetTitle}</h3><button class="cls" onclick="A.closeSheet()" aria-label="${COMMON.close}">${ic("close")}</button></div>
      <p class="sub">${EXCUSED.sheetLead}</p>
      <div class="range"><button class="${cal.field === "from" ? "on" : ""}" onclick="A.calField('from')"><small>${EXCUSED.from}</small><b>${shortDate(a)}</b></button><button class="${cal.field === "to" ? "on" : ""}" onclick="A.calField('to')"><small>${EXCUSED.to}</small><b>${shortDate(b)}</b></button></div>
      ${rangeHTML()}
      <div class="reassure">${EXCUSED.reassure.map(t => `<div>${ic("check")}${t}</div>`).join("")}</div>
      <div class="shfoot"><button class="pbtn full" onclick="A.excusedSave()">${EXCUSED.markN(n)}</button></div></div>`;
  })()));
  reopen();
};
A.excusedSave = () => {
  const now = NOW(), a = parseKey(cal.from), n = daysBetween(a, parseKey(cal.to)) + 1;
  const keys = Array.from({ length: n }, (_, i) => dkey(addDays(a, i)));
  const snap = snapshot(keys);
  for (const k of keys) if (k < S.createdKey) S.createdKey = k;
  store.setExcusedRange(S, cal.from, cal.to, true, now);
  closeSheet(); commit();
  toast(EXCUSED.markN(n), { undo: () => restore(snap) });
};
A.notExcused = key => {
  const snap = snapshot(key);
  store.setExcusedDay(S, key, false, NOW());
  commit(); toast(X.notExcused, { undo: () => restore(snap) });
};

onRender(renderCalendar);
