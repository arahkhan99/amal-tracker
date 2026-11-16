/* Tracker (T-A): a day strip, the day summary, the prayers with their sunnah chips, good deeds and a note.
   Also the "Excused days" range sheet (A.excusedSheet, used by Settings too) and the day picker. */
import { S, UI, A, $, NOW, onRender, render, commit, toast, openSheet, closeSheet, todayKey } from "../app.js";
import * as store from "../store.js";
import * as st from "../stats.js";
import { PRAYERS, DOW, MON, fmt12, dkey, parseKey, addDays, daysBetween, esc } from "../util.js";
import { timesFor, currentWindow, canStillMakeUp, windowEnd } from "../times.js";
import { hijriLabel } from "../hijri.js";
import { isOn } from "../features.js";
import { COMMON, STATUS, STATUS_EXTRA, HOME, TRACKER, DEEDS, EXCUSED, FEATURE, WEEK_LETTERS_MON, LOG } from "../strings.js";
import { trackerChip as pvTrackerChip } from "./provisions.js";
import { zz, ic, X, pName, chipsFor, chipLegend, deedsCard, snapshot, restore } from "./home.js";

export { STATUS };
export const MAX_BACK = 365; // how far back the tracker pages
const SK = { congregation: "c", ontime: "o", madeup: "r", missed: "m", excused: "x" };
const SICON = { c: "dcheck", o: "check", r: "madeup", m: "dash", x: "moon" };
const TXT = { stillYours: "still yours to log", mark: "Mark", pickTitle: "Go to a day" };
const longDate = d => new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(d);
const shortDate = d => `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()].slice(0, 3)}`;

A.trkStep = n => { UI.trkDay = Math.min(MAX_BACK, Math.max(0, UI.trkDay + n)); render(); };
A.trkPick = b => { UI.trkDay = b; render(); };

/* ---------- the day note (saved a moment after typing) ---------- */
let noteTimer = null;
document.addEventListener("input", e => {
  const ta = e.target;
  if (ta.id !== "dayNote") return;
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => {
    const day = store.ensureDay(S, ta.dataset.key);
    day.note = ta.value; day.u = Date.now();
    commit();
  }, 400);
});

/* ---------- calendar (day picker and excused range) ---------- */
let cal = { mode: "pick", month: new Date(), from: "", to: "", field: "from" };
function calHTML() {
  const now = NOW(), tk = todayKey(), y = cal.month.getFullYear(), m = cal.month.getMonth();
  const first = (new Date(y, m, 1).getDay() + 6) % 7, dim = new Date(y, m + 1, 0).getDate();
  const total = Math.ceil((first + dim) / 7) * 7;
  const cells = [];
  for (let i = 0; i < total; i++) {
    const d = new Date(y, m, 1 - first + i), k = dkey(d), inMonth = d.getMonth() === m;
    let c = inMonth ? "" : "mute";
    if (cal.mode === "range") {
      if (k === cal.from) c += " s"; if (k === cal.to) c += " e";
      if (cal.from && cal.to && k > cal.from && k < cal.to) c += " in";
    } else if (k === tk) c += " td";
    if (cal.mode === "range" && k === tk) c += " td";
    const off = cal.mode === "pick" && k > tk; if (off) c += " dis";
    cells.push(`<button class="${c}" ${off ? "disabled" : ""} onclick="A.calDay('${k}')">${d.getDate()}</button>`);
  }
  void now;
  return `<div class="mhead"><button aria-label="${COMMON.back}" onclick="A.calMonth(-1)">${ic("chevL")}</button><b>${MON[m]} ${y}</b><button aria-label="${COMMON.continue}" onclick="A.calMonth(1)">${ic("chev")}</button></div>
    <div class="minical">${WEEK_LETTERS_MON.map(l => `<div class="dh">${l}</div>`).join("")}${cells.join("")}</div>`;
}
A.calMonth = n => { cal.month = new Date(cal.month.getFullYear(), cal.month.getMonth() + n, 1); reopen(); };
A.calDay = k => {
  if (cal.mode === "pick") { UI.trkDay = Math.max(0, daysBetween(parseKey(k), NOW())); closeSheet(); render(); return; }
  if (cal.field === "from") { cal.from = k; if (cal.to < k) cal.to = k; cal.field = "to"; }
  else { if (k < cal.from) { cal.to = cal.from; cal.from = k; } else cal.to = k; cal.field = "from"; }
  reopen();
};
A.calField = f => { cal.field = f; reopen(); };
let reopen = () => {};
function sheet(builder) {
  reopen = () => openSheet(zz(builder()));
  reopen();
}

A.trkMonthSheet = () => {
  cal = { mode: "pick", month: addDays(NOW(), -UI.trkDay), from: "", to: "", field: "from" };
  sheet(() => `<div class="sh"><div class="lhd"><h3>${X.pickDay}</h3><button class="cls" onclick="A.closeSheet()" aria-label="${COMMON.close}">${ic("close")}</button></div>${calHTML()}</div>`);
};

/** "Excused days" range sheet. Settings can call A.excusedCal() (optionally with a day key to start from). */
A.excusedCal = (fromKey = dkey(addDays(NOW(), -UI.trkDay))) => {
  cal = { mode: "range", month: parseKey(fromKey), from: fromKey, to: fromKey, field: "to" };
  sheet(() => {
    const a = parseKey(cal.from), b = parseKey(cal.to), n = daysBetween(a, b) + 1;
    return `<div class="sh"><div class="lhd"><h3>${EXCUSED.sheetTitle}</h3><button class="cls" onclick="A.closeSheet()" aria-label="${COMMON.close}">${ic("close")}</button></div>
      <p class="sub">${EXCUSED.sheetLead}</p>
      <div class="range"><button class="${cal.field === "from" ? "on" : ""}" onclick="A.calField('from')"><small>${EXCUSED.from}</small><b>${shortDate(a)}</b></button><button class="${cal.field === "to" ? "on" : ""}" onclick="A.calField('to')"><small>${EXCUSED.to}</small><b>${shortDate(b)}</b></button></div>
      ${calHTML()}
      <div class="reassure">${EXCUSED.reassure.map(t => `<div>${ic("check")}${t}</div>`).join("")}</div>
      <div class="shfoot"><button class="pbtn full" onclick="A.excusedSave()">${EXCUSED.markN(n)}</button></div></div>`;
  });
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

/* ---------- render ---------- */
function runOf(key) {
  let a = 0, b = 0;
  while (store.isExcusedDay(S, dkey(addDays(parseKey(key), -a - 1)))) a++;
  while (store.isExcusedDay(S, dkey(addDays(parseKey(key), b + 1)))) b++;
  return { n: a + 1, of: a + b + 1 };
}
function stripHTML(now) {
  const base = Math.max(0, UI.trkDay - 6), cells = [];
  for (let b = Math.min(MAX_BACK, base + 6); b >= base; b--) {
    const d = addDays(now, -b), key = dkey(d), day = store.getDay(S, key), ex = !!day.excused;
    const dots = PRAYERS.map(p => `<i class="${SK[store.statusOf(day, p)] || ""}"></i>`).join("");
    cells.push(`<button class="${UI.trkDay === b ? "on" : ""} ${ex ? "ex" : ""}" aria-label="${esc(longDate(d))}" aria-pressed="${UI.trkDay === b}" onclick="A.trkPick(${b})">${b === 0 ? COMMON.today : DOW[d.getDay()]}<b>${d.getDate()}</b>${ex ? `<span class="exm">${ic("moon")}</span>` : `<span class="pr">${dots}</span>`}</button>`);
  }
  return `<div class="strip"><button style="flex:0 0 18px;padding:8px 0" aria-label="${LOG.yesterdayPrefix}" ${UI.trkDay >= MAX_BACK ? "disabled" : ""} onclick="A.trkStep(1)">${ic("chevL", "i", 'style="width:16px;height:16px"')}</button>${cells.join("")}<button style="flex:0 0 18px;padding:8px 0" aria-label="${COMMON.tomorrow}" ${UI.trkDay === 0 ? "disabled" : ""} onclick="A.trkStep(-1)">${ic("chev", "i", 'style="width:16px;height:16px"')}</button></div>`;
}

function summaryHTML(d, key, now) {
  const pct = st.dayPct(S, d, now);
  const sts = PRAYERS.map(p => store.prayerStatus(S, key, p));
  const chips = [`<span>${X.fard} ${sts.filter(store.isPrayed).length}/5</span>`];
  if (isOn(S, "sunnah")) {
    const m = st.sunnahMeasureDay(S, key);
    if (!m.excused) chips.push(`<span>${m.kind === "rakahs" ? "Sunnah" : "Raghībah + Witr"} ${m.got}/${m.of}</span>`);
  }
  const w = store.witrChip(S, key), day = store.getDay(S, key);
  if (w.allowed && (w.inQada || isOn(S, "sunnah"))) chips.push(`<span>${day.witr === "done" || day.witr === "madeup" ? X.witrDone : day.witr === "missed" ? X.witrMissed : X.witrToDo}</span>`);
  const pv = pvTrackerChip(key); // P7: "+N provisions", only with Settings → Provisions → Provisions in Tracker
  if (pv) chips.push(pv);
  const C = 144.5, v = pct == null ? 0 : pct / 100;
  const title = UI.trkDay === 0 ? `${COMMON.today}, ${d.getDate()} ${MON[d.getMonth()]}` : longDate(d);
  return `<div class="daysum"><div class="tx"><b>${esc(title)}</b><small>${esc(hijriLabel(d))}${pct == null ? ` · ${TRACKER.beforeTracking}` : ""}</small><div class="chips">${chips.join("")}</div></div>
    <div class="minir" role="img" aria-label="${pct ?? 0}%"><svg width="54" height="54" viewBox="0 0 54 54"><circle cx="27" cy="27" r="23" stroke="var(--z-empty)" stroke-opacity=".5" stroke-width="5" fill="none"/><circle cx="27" cy="27" r="23" stroke="var(--z-gold)" stroke-width="5" fill="none" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - v)}"/></svg><b>${pct == null ? "–" : pct + "%"}</b></div></div>`;
}

function prayerRow(p, key, now, cur) {
  const d = parseKey(key), s0 = store.prayerStatus(S, key, p), day = store.getDay(S, key);
  const t = timesFor(d, S.settings)[p], end = windowEnd(d, p, S.settings);
  const open = cur && cur.p === p && dkey(cur.date) === key;
  const k = SK[s0] || "";
  const mk = s0 ? `<span class="mk ${k}">${ic(SICON[k], "")}</span>` : open ? `<span class="mk now"></span>` : `<span class="mk"></span>`;
  let sub;
  if (s0 === "madeup") sub = `<em class="r">${STATUS.madeup}</em> · ${day.at?.[p] ? HOME.madeUpAt(fmt12(new Date(day.at[p]))) : fmt12(t)}`;
  else if (s0 === "missed") sub = `<em class="m">${STATUS.missed}</em> · ${X.plusOne}`;
  else if (s0) sub = `<em class="${k}">${STATUS[s0]}</em> · ${fmt12(t)}`;
  else sub = `${fmt12(t)}${open ? ` · ${STATUS_EXTRA.openNow.toLowerCase()}` : now >= end ? ` · ${TRACKER.notLogged}` : ""}`;
  const chips = s0 === "missed" || s0 === "excused" ? [] : chipsFor(p, key);
  let right = "";
  if (s0 === "missed" && isOn(S, "makeups") && canStillMakeUp(d, p, now, S.settings)) right = `<button class="ubtn" onclick="event.stopPropagation();A.madeItUp('${p}','${key}')">${ic("madeup", "")}${HOME.madeItUp}</button>`;
  else if (!s0 && open) right = `<button class="pbtn" onclick="event.stopPropagation();A.prayerSheet('${p}','${key}')">${STATUS_EXTRA.log}</button>`;
  return `<div class="trow ${open && !s0 ? "now" : ""}" role="button" tabindex="0" onclick="A.prayerSheet('${p}','${key}')">${mk}<div><div class="l1"><b>${esc(pName(p, key))}</b>${chips.join("")}</div><small class="sb">${sub}</small></div><div class="rt">${right}</div></div>`;
}

function renderTracker() {
  if (UI.view !== "tracker") return;
  const el = $("#v-tracker"); if (!el) return;
  if (document.activeElement?.id === "dayNote") return; // don't steal focus while typing
  const now = NOW(), d = addDays(now, -UI.trkDay), key = dkey(d), day = store.getDay(S, key);
  const cur = currentWindow(now, S.settings);
  let h = `<div class="trh"><h1>${TRACKER.title}</h1><button class="mbtn" onclick="A.trkMonthSheet()">${ic("cal")}${MON[d.getMonth()]}</button></div>${stripHTML(now)}`;
  if (day.excused) {
    const r = runOf(key);
    h += `<div class="exday"><div class="moon">${ic("moon")}</div><b>${EXCUSED.today.replace(" today", "")}</b><p>${esc(longDate(d))} · ${X.dayNOfM(r.n, r.of)}<br>${X.excusedLine}</p>
      <div class="acts"><button onclick="A.excusedCal('${key}')">${X.editDates}</button><button onclick="A.notExcused('${key}')">${X.notExcused}</button></div></div>`;
  } else {
    h += summaryHTML(d, key, now);
    let rows = PRAYERS.map(p => prayerRow(p, key, now, cur)).join("");
    if (isOn(S, "sunnah") && S.settings.sunnahNafl) {
      const nafl = store.sunnahChips(S, key, "day");
      if (nafl.length) rows += `<div class="trow" style="cursor:default"><span class="mk"></span><div><div class="l1"><b>${X.moreSunnah}</b>${chipsDay(nafl, key)}</div></div><div></div></div>`;
    }
    h += `<section class="sec" style="padding-top:20px"><h2>${PRAYER_HEAD} ${isOn(S, "sunnah") ? `<span>${X.longPress}</span>` : ""}</h2><div class="card">${rows}</div>${isOn(S, "sunnah") ? chipLegendHTML() : ""}</section>`;
  }
  if (isOn(S, "deeds")) {
    const list = store.amalForDay(S, key), done = list.filter(a => day.amal[a.id]?.done).length;
    h += `<section class="sec"><h2>${DEEDS.title} <span>${day.excused ? TXT.stillYours : DEEDS.nOfMDone(done, list.length)}</span></h2><div class="card">${deedsCard(key, {})}</div></section>`;
    if (UI.trkDay === 0) h += `<button class="addrow" onclick="A.addAmal()">${DEEDS.addButton}</button>`;
  }
  h += `<section class="sec"><h2>${TRACKER.note}</h2><div class="card notebox"><textarea id="dayNote" data-key="${key}" placeholder="${esc(TRACKER.notePlaceholder)}" aria-label="${esc(TRACKER.note)}">${esc(day.note || "")}</textarea></div></section><div class="spacer"></div>`;
  el.innerHTML = zz(h);
}
const PRAYER_HEAD = FEATURE.names.prayers;
const chipsDay = (list, key) => list.map(c => {
  const done = store.sunnahDone(S, key, c.id);
  return `<button type="button" class="sc nf ${done ? "d" : ""}" data-chip="${c.id}" data-key="${key}" aria-pressed="${done}">${done ? ic("check", "") : '<i class="o"></i>'}${esc(c.label)}</button>`;
}).join("");
const chipLegendHTML = () => chipLegend();

onRender(renderTracker);
