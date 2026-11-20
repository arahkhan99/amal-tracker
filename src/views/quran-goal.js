/*
 * The Qurʾān reading goal on screen (rules: src/quran-goal.js; approved 19 Nov 2026):
 * - goalLine / goalBar: the progress on Read → For today's recitation row ("3 of 5 pages today").
 * - goalCard: the card in Read → Qurʾān (set or edit the goal, today's or this week's bar, the plan's finish date,
 *   "I read…").
 * - Sheets: A.qgSet (daily or weekly: pages, juzʾ or minutes), A.qgPlan ("Finish the Qurʾān" in N days or by a date,
 *   from where you are or the beginning), A.qgRead ("I read…": add, edit or remove reading done outside the reader,
 *   today or, from the calendar's day sheet, an earlier day).
 * Settings → Features → Read opens A.qgSet too. Nothing here runs on a timer or during a swipe: plain HTML only.
 * Styles: css/tools.css (.qg-*).
 */
import { S, A, NOW, todayKey, commit, openSheet, closeSheet, toast } from "../app.js";
import * as store from "../store.js";
import { esc, dkey, parseKey, addDays, DOW, MON3, fmt12 } from "../util.js";
import { QGOAL as Q, COMMON } from "../strings.js";
import { goalOf, goalStatus, setGoal, khatmGoal, planStatus, pagesIn, mushafOf, manualEntries, dayReading, addManual, editManual, removeManual, eidEve, ramadanRange, ramadanGoal, UNITS } from "../quran-goal.js";
import { setReadDone, isReadDone } from "../reading.js";
import { hijriParts } from "../hijri.js";
import { mushafName, quranPage, quranHasStarted } from "./tools/quran.js";

const shortDay = key => { const d = parseKey(key); return `${DOW[d.getDay()]} ${d.getDate()} ${MON3[d.getMonth()]}`; };
/** "9 Mar" (Settings). */
const dayMon = key => { const d = parseKey(key); return `${d.getDate()} ${MON3[d.getMonth()]}`; };
const X = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const close = `<button class="z-cls" onclick="A.closeSheet()" aria-label="${esc(COMMON.close)}">${X}</button>`;
const fmtN = n => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/* ---------- progress text ---------- */
/** The line under Qurʾān recitation on For today, or "" without a goal. */
export function goalLine(st = goalStatus(S, NOW())) {
  if (!st) return "";
  if (st.scheduled) return Q.starts(!!st.goal.ramadan, shortDay(st.plan.startKey));
  if (st.per === "plan" && st.plan.complete) return Q.planDone;
  if (st.paused && !(st.per === "week" && !st.weekPaused)) return Q.pausedShort;
  return Q.of(st.done, st.target, st.unit, st.per === "week" ? "week" : "day");
}
/** A flat progress bar; the numbers are in the text next to it, so it is hidden from screen readers. */
export const goalBar = (st, cls = "") => (st && !st.paused && !st.scheduled ? `<span class="qg-bar${cls ? " " + cls : ""}${st.met ? " met" : ""}" aria-hidden="true"><i style="width:${st.pct}%"></i></span>` : "");

/* ---------- the card in Read → Qurʾān ---------- */
export function goalCard(now = NOW()) {
  const st = goalStatus(S, now), key = dkey(now), ex = store.isExcusedDay(S, key);
  if (!st) {
    return `<div class="zt-card pad qg-card"><p class="rd-kick">${esc(Q.cardKick)}</p><p class="qg-none">${esc(Q.cardNone)}</p>
      <div class="qg-acts"><button type="button" class="zt-btn sec" data-f="qg-set" onclick="A.qgSet()">${esc(Q.setGoal)}</button>${ex ? "" : `<button type="button" class="zt-btn soft" data-f="qg-read" onclick="A.qgRead()">${esc(Q.iRead)}</button>`}</div></div>`;
  }
  const g = st.goal, r = dayReading(S, key, g.total || pagesIn(mushafOf(S)));
  let big, sub = [];
  if (st.scheduled) {
    const p = st.plan;
    big = Q.starts(!!g.ramadan, shortDay(p.startKey));
    sub.push(Q.planSum(p.base, shortDay(p.finishKey)));
  } else if (st.per === "plan") {
    const p = st.plan;
    big = p.complete ? Q.planDone : st.paused ? Q.paused : Q.of(st.done, st.target, "pages", "day");
    if (!p.complete) {
      sub.push(Q.pagesLeft(p.left));
      sub.push(p.late ? Q.newPace(shortDay(p.finishKey)) : g.endKey ? Q.finishBy(shortDay(p.endKey)) : Q.expected(shortDay(p.finishKey)));
    }
  } else if (st.per === "week") {
    big = st.weekPaused ? Q.paused : Q.of(st.done, st.target, st.unit, "week");
    if (!st.weekPaused && st.activeDays < 7) sub.push(Q.weekPausedNote(7 - st.activeDays));
    if (st.met) sub.push(Q.metWeek);
  } else {
    big = st.paused ? Q.paused : Q.of(st.done, st.target, st.unit, "day");
    if (st.met) sub.push(Q.metToday);
  }
  if (ex) sub.push(Q.listenCounts);
  const man = manualEntries(S, key);
  const today = ex ? "" : `<p class="qg-src">${esc(Q.inApp(r.autoPages, r.autoMin))}${man.length ? ` · ${esc(Q.added(man.map(m => Q.unitN(m.unit, m.n)).join(", ")))}` : ""}</p>`;
  return `<div class="zt-card pad qg-card"><div class="qg-hd"><p class="rd-kick">${esc(Q.cardKick)} · ${esc(Q.goalName(g))}</p><button type="button" class="zt-link qg-edit" data-f="qg-edit" onclick="A.qgSet()">${esc(COMMON.edit)}</button></div>
    <p class="qg-big${st.paused && !(st.per === "week" && !st.weekPaused) ? " pz" : ""}">${esc(big)}</p>${st.paused && st.per !== "week" ? "" : goalBar(st, "lg")}
    ${sub.length ? `<p class="qg-sub">${sub.map(esc).join(" · ")}</p>` : ""}${today}
    ${ex ? "" : `<div class="qg-acts"><button type="button" class="zt-btn sec" data-f="qg-read" onclick="A.qgRead()">${esc(Q.iRead)}</button></div>`}</div>`;
}

/** Settings → Qurʾān goal: "5 pages a day", or a plan's finish date ("Finish by 9 Mar"; before it starts "Starts 17 Feb · finish by 18 Mar"). */
export function goalSummary(g = goalOf(S), now = NOW()) {
  if (!g) return Q.notSet;
  if (g.type !== "khatm") return Q.goalName(g);
  const p = planStatus(S, g, now);
  if (p.complete) return Q.planDone;
  return p.scheduled ? Q.startsFinish(dayMon(p.startKey), dayMon(p.finishKey)) : Q.finishShort(dayMon(p.finishKey));
}

/* ---------- the set-goal sheet ---------- */
const PRESET = { day: { pages: [2, 5, 10, 20], juz: [0.5, 1, 2, 3], min: [10, 15, 20, 30] }, week: { pages: [14, 35, 70, 140], juz: [1, 2, 4, 7], min: [60, 90, 120, 210] } };
const STEP = { pages: 1, juz: 0.5, min: 5 };
let D = { per: "day", unit: "pages", n: 5 };
const radio = (on, label, act, f) => `<button type="button" role="radio" aria-checked="${on}" class="${on ? "on" : ""}" data-f="${f}" onclick="${act}">${esc(label)}</button>`;

A.qgSet = (draft = null) => {
  const g = goalOf(S);
  if (draft) D = { ...D, ...draft };
  else if (g && g.type !== "khatm") D = { per: g.per, unit: g.type, n: g.n };
  else if (g?.type === "khatm") { A.qgPlan(); return; }
  else D = { per: "day", unit: "pages", n: 5 };
  const kinds = [["day", Q.per.day], ["week", Q.per.week], ["plan", Q.per.plan]];
  const presets = PRESET[D.per][D.unit];
  openSheet(`<div class="z-sh qg-sh"><div class="z-lhd"><div><h3>${esc(Q.setTitle)}</h3><p class="z-sub">${esc(Q.setSub)}</p></div>${close}</div>
    <p class="qg-lab" id="qgK">${esc(Q.kind)}</p><div class="qg-seg three" role="radiogroup" aria-labelledby="qgK">${kinds.map(([k, l]) => radio(k === D.per, l, k === "plan" ? "A.qgPlan()" : `A.qgSet({per:'${k}',n:${PRESET[k][D.unit][1]}})`, `qg-k-${k}`)).join("")}</div>
    <p class="qg-lab" id="qgU">${esc(Q.unitLabel)}</p><div class="qg-seg" role="radiogroup" aria-labelledby="qgU">${UNITS.map(u => radio(u === D.unit, Q.unit[u], `A.qgSet({unit:'${u}',n:${PRESET[D.per][u][1]}})`, `qg-u-${u}`)).join("")}</div>
    <p class="qg-lab"><label for="qgN">${esc(Q.howMuch)}</label></p>${stepper(D.n, D.unit, D.per)}
    <div class="qg-chips">${presets.map(v => `<button type="button" class="${v === D.n ? "on" : ""}" aria-pressed="${v === D.n}" onclick="A.qgSet({n:${v}})">${esc(Q.unitN(D.unit, v))}</button>`).join("")}</div>
    <p class="z-fine">${esc(Q.voluntary)}</p>
    <div class="z-shfoot">${g ? `<button class="z-gbtn" onclick="A.qgClear()">${esc(Q.clearGoal)}</button>` : `<button class="z-gbtn" onclick="A.closeSheet()">${esc(COMMON.cancel)}</button>`}<button class="z-pbtn" data-f="qg-save" onclick="A.qgSave()">${esc(COMMON.save)}</button></div></div>`);
};
/** − [n] + with the unit after it. */
function stepper(n, unit, per = "day") {
  const step = STEP[unit];
  return `<div class="z-stp qg-stp"><button type="button" aria-label="−${step}" onclick="A.qgStep(-${step})">−</button><input id="qgN" type="number" inputmode="decimal" min="${step}" step="${step}" value="${fmtN(n)}" aria-describedby="qgUw"><button type="button" aria-label="+${step}" onclick="A.qgStep(${step})">+</button><span id="qgUw" class="qg-uw">${esc(Q.unitWord[unit])}${per === "week" ? " a week" : per === "day" ? " a day" : ""}</span></div>`;
}
A.qgStep = d => {
  const el = document.getElementById("qgN"); if (!el) return;
  const step = Math.abs(d), v = Math.max(step, Math.round(((parseFloat(el.value) || 0) + d) / step) * step);
  el.value = fmtN(Math.round(v * 10) / 10);
};
const readN = () => { const v = parseFloat(document.getElementById("qgN")?.value); return Number.isFinite(v) && v > 0 ? Math.round(v * 10) / 10 : 0; };
A.qgSave = () => {
  const n = readN() || D.n;
  setGoal(S, { type: D.unit, n, per: D.per });
  closeSheet(); commit(); toast(Q.saved);
};
A.qgClear = () => {
  const was = S.settings.quranGoal;
  setGoal(S, null); closeSheet(); commit();
  toast(Q.cleared, { undo: () => { S.settings.quranGoal = was; commit(); } });
};

/* ---------- the planner ---------- */
let P = { mode: "days", days: 30, custom: false, endKey: "", from: "here" };
A.qgPlan = (draft = null) => {
  const now = NOW(), g = goalOf(S);
  if (draft) P = { ...P, ...draft };
  else if (g?.type === "khatm") P = { mode: g.ramadan ? "ramadan" : g.endKey ? "date" : "days", days: g.days || 30, custom: !!g.days && ![30, 60, 90].includes(g.days), endKey: g.ramadan ? "" : g.endKey || "", from: g.start > 1 ? "here" : "start" };
  else P = { mode: "days", days: 30, custom: false, endKey: "", from: "here" };
  const id = mushafOf(S), total = pagesIn(id), here = quranHasStarted() ? quranPage(id) : 1;
  const eid = eidEve(now, hijriParts);
  if (P.mode === "date" && !P.endKey) P.endKey = eid || dkey(addDays(now, 29));
  const ram = P.mode === "ramadan" ? ramadanRange(now, hijriParts) : null;
  const plan = draftPlan(now, id, total, here, ram);
  const ps = plan ? planStatus(S, plan, now) : null;
  const daysBody = `<div class="qg-chips">${[30, 60, 90].map(n => `<button type="button" class="${!P.custom && P.days === n ? "on" : ""}" aria-pressed="${!P.custom && P.days === n}" data-f="qg-d${n}" onclick="A.qgPlan({days:${n},custom:false})">${esc(Q.daysN(n))}</button>`).join("")}<button type="button" class="${P.custom ? "on" : ""}" aria-pressed="${P.custom}" onclick="A.qgPlan({custom:true})">${esc(Q.custom)}</button></div>
    ${P.custom ? `<div class="z-field"><label for="qgDays">${esc(Q.customDays)}</label><input id="qgDays" type="number" inputmode="numeric" min="1" max="1000" value="${P.days}" onchange="A.qgPlan({days:Math.max(1,Math.min(1000,parseInt(this.value)||30))})"></div>` : ""}`;
  const dateBody = `${eid ? `<div class="qg-chips"><button type="button" class="${P.endKey === eid ? "on" : ""}" aria-pressed="${P.endKey === eid}" onclick="A.qgPlan({endKey:'${eid}'})">${esc(Q.eid(shortDay(eid)))}</button></div>` : ""}
    <div class="z-field"><label for="qgDate">${esc(Q.date)}</label><input id="qgDate" type="date" min="${dkey(now)}" value="${P.endKey}" onchange="A.qgPlan({endKey:this.value||'${dkey(addDays(now, 29))}'})"></div>`;
  const ramBody = ram
    ? `<div class="qg-ram" data-f="qg-ram"><b>${esc(Q.ramadanTitle)}</b><span>${esc(Q.ramadanStart(shortDay(ram.startKey)))}</span><span>${esc(Q.ramadanEnd(shortDay(ram.endKey)))}</span></div>`
    : `<p class="z-note">${esc(Q.ramadanNone)}</p>`;
  const fromRows = [...(here > 1 ? [["here", Q.fromHere(here)]] : []), ["start", Q.fromStart]];
  if (here <= 1) P.from = "start";
  openSheet(`<div class="z-sh qg-sh"><div class="z-lhd"><div><h3>${esc(Q.planTitle)}</h3><p class="z-sub">${esc(Q.planSub(`${mushafName(id)} · ${total} pages`))}</p></div>${close}</div>
    <div class="qg-seg" role="radiogroup" aria-label="${esc(Q.planTitle)}">${radio(P.mode === "days", Q.inDays, "A.qgPlan({mode:'days'})", "qg-m-days")}${radio(P.mode === "date", Q.byDate, "A.qgPlan({mode:'date'})", "qg-m-date")}${radio(P.mode === "ramadan", Q.ramadan, "A.qgPlan({mode:'ramadan',from:'start'})", "qg-m-ram")}</div>
    ${P.mode === "days" ? daysBody : P.mode === "date" ? dateBody : ramBody}
    <p class="qg-lab" id="qgF">${esc(Q.from)}</p><div class="qg-opts" role="radiogroup" aria-labelledby="qgF">${fromRows.map(([k, l]) => `<button type="button" role="radio" aria-checked="${P.from === k}" class="qg-opt${P.from === k ? " on" : ""}" onclick="A.qgPlan({from:'${k}'})"><span class="qg-rd" aria-hidden="true"></span>${esc(l)}</button>`).join("")}</div>
    ${ps ? `<div class="qg-sum" role="status"><b>${esc(Q.planSum(ps.daily || ps.base, shortDay(ps.finishKey)))}</b><small>${esc(Q.pagesLeft(ps.toRead))}</small></div>` : ""}
    <p class="z-fine">${esc(Q.planNote)}</p>
    <div class="z-shfoot"><button class="z-gbtn" onclick="A.qgSet({per:'day'})">${esc(COMMON.back)}</button><button class="z-pbtn" data-f="qg-psave" ${plan ? "" : "disabled"} onclick="A.qgPlanSave()">${esc(Q.savePlan)}</button></div></div>`);
};
/** The plan the sheet shows: in N days, by a date, or over Ramaḍān (null when Ramaḍān can't be worked out). */
function draftPlan(now, id, total, here, ram = P.mode === "ramadan" ? ramadanRange(now, hijriParts) : null) {
  const start = P.from === "here" ? here : 1;
  if (P.mode === "ramadan") return ramadanGoal({ mushaf: id, total, start, range: ram });
  return khatmGoal({ mushaf: id, total, start, days: P.days, endKey: P.mode === "date" ? P.endKey : "" }, now);
}
A.qgPlanSave = () => {
  const now = NOW(), id = mushafOf(S), total = pagesIn(id), here = quranHasStarted() ? quranPage(id) : 1;
  const old = goalOf(S);
  const g = draftPlan(now, id, total, here);
  if (!g) return;
  // editing a plan keeps its start, so what was read since then still counts (a Ramaḍān plan starts on 1 Ramaḍān)
  if (!g.ramadan && !old?.ramadan && old?.type === "khatm" && old.mushaf === id && (old.start > 1) === (P.from === "here")) { g.startKey = old.startKey; g.start = old.start; }
  setGoal(S, g); closeSheet(); commit(); toast(Q.saved);
};

/* ---------- "I read…" ---------- */
let R = { key: "", unit: "pages", n: 2, edit: "", tick: true, fromDay: false };
/** "I read…" for today, or for day `key` from the calendar's day sheet (its buttons then go back to that sheet). */
A.qgRead = (key = "", draft = null) => {
  const now = NOW(), today = todayKey();
  const fromDay = !draft && !!key;
  key = key || (draft ? R.key : "") || today;
  if (!draft) {
    const g = goalOf(S);
    R = { key, unit: g && g.type !== "khatm" ? g.type : "pages", n: 0, edit: "", tick: true, fromDay };
    R.n = R.unit === "min" ? 15 : R.unit === "juz" ? 1 : 2;
  } else R = { ...R, ...draft, key };
  const isToday = key === today, ex = store.isExcusedDay(S, key);
  const head = `<div class="z-lhd"><div><h3>${esc(Q.readTitle)}</h3><p class="z-sub">${esc(Q.readSub(isToday ? COMMON.today : shortDay(key)))}</p></div>${close}</div>`;
  if (ex) { openSheet(`<div class="z-sh qg-sh">${head}<p class="z-note">${esc(Q.excusedRead)}</p><div class="z-shfoot"><button class="z-pbtn" onclick="A.closeSheet()">${esc(COMMON.done)}</button></div></div>`); return; }
  const g = goalOf(S), gu = g ? (g.type === "khatm" ? "pages" : g.type) : "";
  const apart = gu && (gu === "min") !== (R.unit === "min");
  const ticked = isToday && isReadDone(S, "quran", now);
  const list = manualEntries(S, key);
  const rows = list.map(m => {
    const a = Q.unitN(m.unit, m.n);
    return `<div class="qg-ent${m.id === R.edit ? " on" : ""}"><span class="t"><b>${esc(a)}</b><small>${esc(fmt12(new Date(m.at)))}</small></span><button type="button" class="zt-link" aria-label="${esc(Q.editEntry(a))}" onclick="A.qgRead('${key}',{edit:'${m.id}',unit:'${m.unit}',n:${m.n}})">${esc(COMMON.edit)}</button><button type="button" class="qg-x" aria-label="${esc(Q.remove(a))}" onclick="A.qgRemove('${key}','${m.id}')">${X}</button></div>`;
  }).join("");
  const r = dayReading(S, key);
  openSheet(`<div class="z-sh qg-sh">${head}
    <p class="qg-lab" id="qgRU">${esc(Q.amount)}</p><div class="qg-seg" role="radiogroup" aria-labelledby="qgRU">${UNITS.map(u => radio(u === R.unit, Q.unit[u], `A.qgRead('${key}',{unit:'${u}',n:${u === "min" ? 15 : u === "juz" ? 1 : 2}})`, `qg-ru-${u}`)).join("")}</div>
    ${stepper(R.n, R.unit, "")}
    ${apart ? `<p class="z-fine">${esc(Q.minNote)}</p>` : ""}
    ${isToday && !ticked && !R.edit ? `<label class="qg-chk"><input type="checkbox" id="qgTick" ${R.tick ? "checked" : ""} onchange="A.qgTickPref(this.checked)"><span>${esc(Q.alsoTick)}</span></label>` : ""}
    <div class="z-shfoot"><button class="z-gbtn" onclick="${R.edit ? `A.qgRead('${key}',{edit:''})` : R.fromDay ? `A.daySheet('${key}')` : "A.closeSheet()"}">${esc(COMMON.cancel)}</button><button class="z-pbtn" data-f="qg-add" onclick="A.qgAdd('${key}')">${esc(R.edit ? Q.saveEdit : Q.addBtn)}</button></div>
    ${rows ? `<p class="qg-lab">${esc(isToday ? Q.entries : Q.entriesDay)}</p><div class="qg-ents">${rows}</div>` : ""}
    <p class="z-fine">${esc(Q.inApp(r.autoPages, r.autoMin))}</p></div>`);
};
A.qgTickPref = on => { R.tick = !!on; };
A.qgAdd = key => {
  const n = readN(); if (!n) return;
  const now = NOW(), isToday = key === todayKey();
  if (R.edit) { editManual(S, key, R.edit, { unit: R.unit, n }, now); R.edit = ""; commit(); toast(Q.added1(Q.unitN(R.unit, n))); A.qgRead(key, {}); return; }
  const e = addManual(S, key, { unit: R.unit, n }, now); if (!e) return;
  const tick = isToday && R.tick && document.getElementById("qgTick")?.checked && !isReadDone(S, "quran", now);
  if (tick) setReadDone(S, "quran", true, now); // the same recitation tick as For today (1 provision, nothing more)
  if (R.fromDay && A.daySheet) A.daySheet(key); else closeSheet();
  commit();
  toast(Q.added1(Q.unitN(e.unit, e.n)), { undo: () => {
    removeManual(S, key, e.id);
    if (tick) setReadDone(S, "quran", false, NOW());
    commit();
  } });
};
A.qgRemove = (key, id) => {
  const m = manualEntries(S, key).find(x => x.id === id); if (!m) return;
  removeManual(S, key, id); if (R.edit === id) R.edit = "";
  commit(); A.qgRead(key, {});
  toast(Q.removed, { undo: () => { addManual(S, key, { unit: m.unit, n: m.n }, new Date(m.at)); commit(); } });
};
