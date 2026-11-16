/*
 * Provisions & levels UI (design-review/mockups2/provisions, scholar-approved). Off by default; when off,
 * every builder here returns "" and nothing of it appears anywhere.
 * P1 Progress card · P2 "How provisions work" sheet · P3 one-time Home offer · P3b history result ·
 * P4/P4b Settings rows · P5 Home "Lv N" chip · P6 calm level-up sheet · P7/P7b Tracker "+N provisions".
 * Pure logic lives in ../provisions.js; the numbers come from ../points.js.
 */
import { S, A, $, NOW, todayKey, commit, onCommit, openSheet, closeSheet, toast, go, revision } from "../app.js";
import * as store from "../store.js";
import { startedPrayers } from "../times.js";
import { DOW, MON, parseKey, esc } from "../util.js";
import { WEIGHTS, CURRENT } from "../points.js";
import { pvOn, homeChipOn, offerDue, pvSummary, turnOn, turnOff, dismissOffer, checkLevelUp, trackerDay } from "../provisions.js";
import { isOn } from "../features.js";
import { PROVISIONS as P, PRAYER_NAME, COMMON } from "../strings.js";

const W = WEIGHTS[CURRENT];
// What ../provisions.js needs from the clock and the app: today's prayers already begun (an excused prayer
// counts once its time has come) and the change counter, so one render's chip, card and rows share one count.
const ctx = () => { const now = NOW(); return { started: startedPrayers(now, now, S.settings), rev: revision() }; };
const fmt = n => Number(n || 0).toLocaleString("en-GB");
const ICON = {
  x: '<path d="M6 6l12 12M18 6L6 18"/>', chev: '<path d="M9 6l6 6-6 6"/>',
  bag: '<path d="M9.5 3.5h5L13 7c3.2 1.4 5.5 4.6 5.5 8.2A5 5 0 0 1 13.5 20h-3a5 5 0 0 1-5-4.8C5.5 11.6 7.8 8.4 11 7z"/><path d="M10.5 7h3"/>',
  up: '<path d="M12 19V6M6.5 11.5L12 6l5.5 5.5"/>',
  scale: '<path d="M12 4v16M5 20h14M6 8h12M6 8l-3 6a3 3 0 0 0 6 0zM18 8l-3 6a3 3 0 0 0 6 0z"/>',
};
export const pvIcon = (k, c = "pv-ic") => `<svg class="${c}" viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`;

/** The level ring: number in the middle, gold arc for progress to the next level. */
function ring(level, frac, size = 76, sw = 6, cls = "") {
  const r = size / 2 - sw / 2 - 1, C = 2 * Math.PI * r, h = size / 2;
  return `<div class="pv-ringw ${cls}" role="img" aria-label="${esc(P.level(level))}"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
  <circle class="trk" cx="${h}" cy="${h}" r="${r}" fill="none" stroke-width="${sw}"/>
  <circle class="arc" cx="${h}" cy="${h}" r="${r}" fill="none" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${(C * (1 - frac)).toFixed(2)}" transform="rotate(-90 ${h} ${h})"${frac <= 0 ? ' style="display:none"' : ""}/></svg>
  <div class="num" aria-hidden="true"><small>${esc(P.ringLabel)}</small><b>${level}</b></div></div>`;
}
const miniRing = (frac, size = 22) => {
  const r = size / 2 - 2.5, C = 2 * Math.PI * r, h = size / 2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${h}" cy="${h}" r="${r}" fill="none" stroke="rgba(244,233,200,.25)" stroke-width="3"/><circle cx="${h}" cy="${h}" r="${r}" fill="none" stroke="#E5C55C" stroke-width="3" stroke-linecap="round" stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${(C * (1 - frac)).toFixed(2)}" transform="rotate(-90 ${h} ${h})"/></svg>`;
};
const dua = () => `<div class="pv-dua"><div class="ar" lang="ar" dir="rtl">${P.duaAr}</div><p class="en">${esc(P.duaEn)}</p><p class="src">${esc(P.duaSrc)}</p></div>`;

/* ---------- P1: Progress card ---------- */
export function progressCard() {
  if (!pvOn(S)) return "";
  const s = pvSummary(S, todayKey(), ctx()), pct = Math.round(s.frac * 100);
  return `<section class="pv-card" id="pv-card" aria-label="${esc(P.title)}"><button type="button" class="pv-i" aria-label="${esc(P.how)}" onclick="A.pvInfo()">i</button>
  <div class="pv-top">${ring(s.level, s.frac)}<div class="pv-main"><div class="pv-k">${esc(P.title)}</div><b class="pv-big">${fmt(s.total)} <span>${esc(P.gathered)}</span></b>
  <div class="pv-bar" role="progressbar" aria-label="${esc(P.toLevelPlain(fmt(s.toNext), s.next))}" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${(s.frac * 100).toFixed(1)}%"></i></div>
  <div class="pv-to">${P.toLevel(fmt(s.toNext), s.next)}</div></div></div>
  <div class="pv-foot"><span>${esc(P.thisWeek)}</span><span>${P.plusN(fmt(s.week))}</span></div>
  <p class="pv-niy">${esc(P.niyyahLine)}</p></section>`;
}

/* ---------- P2: How provisions work ---------- */
const tr = (l, v, sub = "", z = false) => `<div class="pv-tr"><span class="l">${esc(l)}${sub ? `<small>${esc(sub)}</small>` : ""}</span><span class="v${z ? " z" : ""}">${esc(v)}</span></div>`;
A.pvInfo = () => {
  const exc = S.settings.excusedDays !== false ? `<div class="pv-grp"><h4>${esc(P.excusedHead)}</h4><div class="pv-tbl">
    ${tr(P.eachTime, String(W.excused.base), P.eachTimeSub)}
    ${tr(P.remembrance, String(W.excused.remembrance), P.remembranceSub)}</div></div>` : "";
  openSheet(`<div class="pv-sh"><div class="sheet-head"><h3>${esc(P.title)}</h3><button type="button" class="link-btn" onclick="A.closeSheet()">${esc(COMMON.done)}</button></div>
  <p class="lead">${esc(P.lead)}</p>
  <div class="pv-grp"><h4>${esc(P.fardHead)}</h4><div class="pv-tbl">
    ${tr(P.inJamaah, String(W.fard.congregation))}
    ${tr(P.onTime, String(W.fard.ontime), P.sisters)}
    ${tr(P.madeUpSameDay, String(W.fard.madeup))}
    ${tr(P.missed, String(W.fard.missed), P.neverTaken, true)}</div></div>
  <div class="pv-grp"><h4>${esc(P.moreHead)}</h4><div class="pv-tbl">
    ${tr(P.witr, String(W.witr.done), P.witrMadeUp(W.witr.madeup))}
    ${tr(P.sunnah, P.each(W.sunnah.each), P.upTo(W.sunnah.cap))}
    ${tr(P.deeds, P.each(W.deeds.each), P.upTo(W.deeds.cap))}
    ${tr(P.makeups, P.each(W.makeups.each), P.upTo(W.makeups.cap))}</div></div>
  ${exc}
  <ul class="pv-pts">
    <li>${pvIcon("up")}<span><b>${esc(P.neverDown)}</b> ${esc(P.neverDownSub)}</span></li>
    <li>${pvIcon("scale")}<span><b>${esc(P.limits)}</b> ${esc(P.limitsSub)}</span></li>
    <li>${pvIcon("bag")}<span><b>${esc(P.history)}</b>${esc(P.historySub)}</span></li>
  </ul>
  <div class="pv-niyyah"><div class="ar" lang="ar" dir="rtl">${P.niyyahAr}</div><div class="en">${esc(P.niyyahEn)}</div><div class="src">${esc(P.niyyahSrc)}</div>
  <p>${esc(P.niyyahBody)}</p></div>
  ${pvOn(S) ? `<button type="button" class="pv-off" onclick="A.pvOff()">${esc(P.turnOff)}</button><p class="note">${esc(P.turnOffNote)}</p>` : ""}</div>`);
};
A.pvOff = () => { turnOff(S); closeSheet(); commit(); toast(P.offToast); };

/* ---------- P3: one-time offer on Home, P3b history result ---------- */
export function homeOffer() {
  if (!offerDue(S, todayKey())) return "";
  return `<div class="pv-ask" role="region" aria-label="${esc(P.title)}"><button type="button" class="x" aria-label="${esc(COMMON.close)}" onclick="A.pvNotNow()">${pvIcon("x", "")}</button>
  <h3>${esc(P.askTitle)}</h3><p>${esc(P.askBody)}</p><p class="sm">${esc(P.askSmall)}</p>
  <div class="row2"><button type="button" class="go" onclick="A.pvTurnOn()">${esc(P.turnOn)}</button><button type="button" class="later" onclick="A.pvNotNow()">${esc(COMMON.notNow)}</button><button type="button" class="how" onclick="A.pvInfo()">${esc(P.howItWorks)}</button></div></div>`;
}
A.pvNotNow = () => { dismissOffer(S); commit(); };
A.pvTurnOn = () => {
  const s = turnOn(S, todayKey(), ctx());
  commit();
  historySheet(s);
};
function historySheet(s) {
  const since = s.since ? (d => `${d.getDate()} ${MON[d.getMonth()]}`)(parseKey(s.since)) : "";
  const lead = s.total > 0 && since ? P.historyLead(s.level, fmt(s.total), since) : P.freshLead(s.level);
  openSheet(`<div class="pv-calm">${ring(s.level, s.frac, 112, 8, "lg")}<h3>${esc(P.level(s.level))}</h3>
  <p class="lead">${lead}</p>
  <div class="pv-stats"><div><b>${fmt(s.toNext)}</b><small>${esc(P.toLevelTile(s.next))}</small></div><div><b>${fmt(s.daysLogged)}</b><small>${esc(P.daysLogged(s.daysLogged))}</small></div></div>
  ${dua()}<p class="note">${esc(P.niyyahLine)}</p></div><div class="cta"><button type="button" class="btn primary" onclick="A.closeSheet()">${esc(COMMON.done)}</button></div>`);
}

/* ---------- P5: Home header chip ---------- */
export function homeChip() {
  if (!homeChipOn(S)) return "";
  const s = pvSummary(S, todayKey(), ctx());
  return `<button type="button" class="pv-chip" aria-label="${esc(P.chipLabel(s.level, fmt(s.toNext), s.next))}" onclick="A.pvOpen()">${miniRing(s.frac)}${esc(P.lv(s.level))}</button>`;
}
A.pvOpen = () => {
  if (!isOn(S, "progress")) { A.pvInfo(); return; }
  go("progress");
  $("#pv-card")?.scrollIntoView?.({ block: "start" });
};

/* ---------- P4 / P4b: Settings ---------- */
const sw = (on, label, fn) => `<button type="button" class="switch${on ? " on" : ""}" role="switch" aria-checked="${on}" aria-label="${esc(label)}" onclick="${fn}"></button>`;
/** The Features row (after Progress). tile(icon, tone) comes from settings.js so it matches its neighbours. */
export function featureRow(tile) {
  const on = pvOn(S);
  return `<div class="srow ${on ? "" : "off"}" id="pv-feat"><div class="srow-main static">${tile(on ? "green" : "grey")}<span class="t"><b>${esc(P.feature)}<em class="pv-new">${esc(P.newTag)}</em></b><small>${esc(P.featureSub)}</small></span>${sw(on, P.feature, "A.pvFeature()")}</div></div>`;
}
/** The small Provisions group, only when on. */
export function settingsGroup(chev) {
  if (!pvOn(S)) return "";
  const p = S.settings.provisions, lv = pvSummary(S, todayKey(), ctx()).level;
  const row = (k, title, sub) => `<div class="srow"><div class="srow-main static"><span class="t"><b>${esc(title)}</b><small>${esc(sub)}</small></span>${sw(!!p[k], title, `A.pvOpt('${k}')`)}</div></div>`;
  return `<section class="sgroup" id="pv-sub"><h2>${esc(P.group)}</h2><div class="card scard">
  ${row("home", P.homeOpt, P.homeOptSub(lv))}${row("tracker", P.trackerOpt, P.trackerOptSub)}${row("homeFull", P.homeFullOpt, P.homeFullOptSub)}
  <div class="srow"><button type="button" class="srow-main" onclick="A.pvInfo()"><span class="t"><b>${esc(P.how)}</b></span><span class="chev" aria-hidden="true">${chev}</span></button></div></div></section>`;
}
A.pvFeature = () => {
  if (pvOn(S)) { turnOff(S); commit(); return; }
  A.pvTurnOn();
};
A.pvOpt = k => {
  if (!["home", "tracker", "homeFull"].includes(k)) return;
  const p = S.settings.provisions;
  p[k] = !p[k];
  commit();
};

/* ---------- P7 / P7b: Tracker ---------- */
/** "+N provisions" for the day summary (put through home.js zz, so classes become z-pvday). */
export function trackerChip(key) {
  const d = trackerDay(S, key, todayKey(), ctx());
  if (!d) return "";
  return `<button type="button" class="pvday" onclick="A.pvDay('${key}')">${esc(P.plusNPlain(fmt(d.total)))}</button>`;
}
const LONG_DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
A.pvDay = key => {
  const d = trackerDay(S, key, todayKey(), ctx()); if (!d) return;
  const dt = parseKey(key), title = key === todayKey() ? P.todayTitle : P.dayTitle(LONG_DOW[dt.getDay()]);
  const line = x => {
    if (x.kind === "fard") return tr2(PRAYER_NAME[x.id] || x.id, x.remember ? P.st.excusedRem : P.st[x.status] || "", x.n);
    if (x.kind === "witr") return tr2(P.witr, P.witrSt[x.status] || "", x.n);
    const name = x.kind === "deeds" ? P.deeds : x.kind === "sunnah" ? P.sunnah : P.makeups;
    return tr2(name, P.nDone(x.count), x.n);
  };
  const rows = d.parts.length ? d.parts.map(line).join("") : `<div class="pv-tr"><span class="l">${esc(P.none)}</span></div>`;
  openSheet(`<div class="pv-sh pv-brk"><div class="sheet-head"><h3>${esc(title)}</h3><button type="button" class="link-btn" onclick="A.closeSheet()">${esc(COMMON.done)}</button></div>
  <p class="lead">${esc(P.dayLead(`${DOW[dt.getDay()]} ${dt.getDate()} ${MON[dt.getMonth()]}`))}</p>
  <div class="pv-grp"><div class="pv-tbl">${rows}<div class="pv-tr tot"><span>${esc(P.total)}</span><span>+${fmt(d.total)}</span></div></div></div>
  <p class="note pv-center">${esc(P.niyyahLine)}</p></div>`);
};
const tr2 = (l, sub, n) => `<div class="pv-tr"><span class="l">${esc(l)}${sub ? `<small>${esc(sub)}</small>` : ""}</span><span class="v">+${n}</span></div>`;

/* ---------- P6: calm level-up, the next time the app opens ---------- */
const PENDING = "zad-pv-levelup";
const getPending = () => { try { return Number(localStorage.getItem(PENDING)) || 0; } catch (e) { return 0; } };
const setPending = n => { try { if (n) localStorage.setItem(PENDING, String(n)); else localStorage.removeItem(PENDING); } catch (e) { /* private mode */ } };

// After each change: a new best level is stored at once (levels never go down) and shown at the next open,
// never mid-logging and never as a toast. A change of scoring settings (home in full, sister, weights) is
// recorded without a level-up (checkLevelUp). touched() (tool counters) doesn't bump the revision, so the
// count is reused and nothing is re-scored.
const pvStored = () => { const p = S.settings?.provisions; return p ? `${p.best}|${p.sig}` : ""; };
onCommit(() => {
  const was = pvStored();
  const lv = checkLevelUp(S, todayKey(), ctx());
  if (lv) setPending(Math.max(lv, getPending()));
  if (lv || pvStored() !== was) store.save(S);
});

function levelUpSheet(level) {
  const s = pvSummary(S, todayKey(), ctx());
  openSheet(`<div class="pv-calm">${ring(level, level === s.level ? s.frac : 0, 112, 8, "lg")}<h3>${esc(P.level(level))}</h3>
  <p class="lead">${P.levelUpLead(fmt(s.total))}</p>
  ${dua()}<p class="note">${esc(P.niyyahLine)}</p></div><div class="cta"><button type="button" class="btn primary" onclick="A.closeSheet()">${esc(COMMON.done)}</button></div>`);
}
/** Call when the app opens (start-up, or back from the background). Shows P6 once if a level was reached. */
export function pvOnOpen() {
  if (!S.profile?.onboarded || !pvOn(S)) { setPending(0); return; }
  if ($("#scrim")?.classList.contains("on")) return; // another sheet first; try at the next open
  const was = pvStored(), now = checkLevelUp(S, todayKey(), ctx());
  if (now || pvStored() !== was) store.save(S);
  const lv = Math.max(now, getPending());
  if (!lv) return;
  setPending(0);
  levelUpSheet(lv);
}
A.pvLevelUp = levelUpSheet; // for the screenshots / QA
