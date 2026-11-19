/*
 * Make-ups (qaḍāʾ): what is left to make up, this month's goal and pace, logging a make-up prayer or fast,
 * restored so far, each month, and the projection. One builder, makeupsChapter(), draws it as the Progress tab's
 * Make-ups chapter (views/progress.js) and, when Progress is off, as its own page (#v-qada, the tab opens it).
 * Layout: design-review/mockups2/redesign/final/fin-prog-makeups-*. Styles: css/progress.css (mk-).
 */
import "../css/settings.css"; // the goal and balance sheets (.field, .stepper, .qrow)
import { S, A, $, NOW, UI, onRender, commit, toast, openSheet, closeSheet, glossBtn, avatarBtn, go } from "../app.js";
import { progressChapters } from "../features.js";
import * as store from "../store.js";
import { esc, MON, MON3, addDays } from "../util.js";
import { qadaClearedTotal } from "../stats.js";
import { MAKEUPS as M, COMMON, NAV, PRAYER_NAME, PROG, prayerName } from "../strings.js";
import { MAKEUPS_X } from "../strings.js";

/* Make-ups-only labels (strings.js MAKEUPS_X). */
const X = MAKEUPS_X;

A.goalSheet = () => openSheet(`<h3>${esc(M.goalTitle)}</h3><p>${esc(M.goalLead)}</p>
  <div class="field"><label>${esc(M.prayersThisMonth)}</label><div class="stepper"><button onclick="A.stepG('g',-5)" aria-label="${esc(M.fewerPrayers(5))}">−</button><b id="gP">${S.qada.goal}</b><button onclick="A.stepG('g',5)" aria-label="${esc(M.morePrayers(5))}">+</button></div></div>
  <div class="field"><label>${esc(M.fastsThisMonth)}</label><div class="stepper"><button onclick="A.stepG('f',-1)" aria-label="${esc(M.fewerFasts(1))}">−</button><b id="gF">${S.qada.fastGoal}</b><button onclick="A.stepG('f',1)" aria-label="${esc(M.moreFasts(1))}">+</button></div></div>
  <div class="cta"><button class="btn ghost" onclick="A.closeSheet()">${esc(COMMON.cancel)}</button><button class="btn primary" onclick="A.saveGoal()">${esc(M.saveGoal)}</button></div>`);
A.stepG = (k, n) => { const e = $(k === "g" ? "#gP" : "#gF"); e.textContent = Math.max(k === "g" ? 5 : 0, +e.textContent + n); };
A.saveGoal = () => { S.qada.goal = +$("#gP").textContent; S.qada.fastGoal = +$("#gF").textContent; closeSheet(); commit(); toast(M.goalUpdated); };

A.balanceSheet = () => {
  const keys = [...store.qadaKeys(S), "fasts"];
  openSheet(`<h3>${esc(M.adjustTitle)}</h3><p>${esc(M.adjustLead)}</p>
  ${keys.map(p => { const nm = p === "fasts" ? M.fasts : prayerName(p); return `<div class="qrow" style="padding:10px 0"><div class="t"><b>${esc(nm)}</b></div><button class="act" style="background:var(--inset);color:var(--ink)" onclick="A.adj('${p}',-1)" aria-label="${esc(M.oneFewer(nm))}">−</button><input class="n" type="number" aria-label="${esc(M.owedAria(nm))}" inputmode="numeric" min="0" value="${S.qada[p]}" onchange="A.adjSet('${p}',this.value)" style="width:76px;text-align:center;border:0;background:none;font-family:var(--serif);font-size:26px;color:var(--ink)"><button class="act" style="background:var(--inset);color:var(--ink)" onclick="A.adj('${p}',1)" aria-label="${esc(M.oneMore(nm))}">+</button></div>`; }).join("")}
  <div class="cta"><button class="btn primary" onclick="A.closeSheet()">${esc(COMMON.done)}</button></div>`);
};
A.adj = (p, n) => { S.qada[p] = Math.max(0, (S.qada[p] || 0) + n); commit(); A.balanceSheet(); };
A.adjSet = (p, v) => { S.qada[p] = Math.max(0, parseInt(v) || 0); commit(); };

/** Undo for a make-up just logged: puts the balances and the month and day logs back exactly. */
const undoQada = () => { const snap = JSON.parse(JSON.stringify(S.qada)); return { undo: () => { S.qada = snap; commit(); } }; };
A.madeUp = p => {
  const u = undoQada();
  if (!store.madeUpPrayer(S, p, NOW())) return;
  commit();
  const done = store.monthLog(S, NOW()).prayers, nm = prayerName(p);
  toast(done === S.qada.goal ? M.goalReached : done > S.qada.goal ? M.madeUpGoalPassed(nm) : M.madeUpToGoal(nm, S.qada.goal - done), u);
};
A.madeUpFast = () => { const u = undoQada(); if (!store.madeUpFast(S, NOW())) return; commit(); toast(M.fastMadeUp, u); };

const I = {
  plus: '<path d="M12 5v14M5 12h14"/>', close: '<path d="M6 6l12 12M18 6L6 18"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  chev: '<path d="M9 6l6 6-6 6"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.2"/>',
};
const icon = (k, cls = "i") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${I[k]}</svg>`;
const nameOf = p => PRAYER_NAME[p] ? prayerName(p) : p;

/**
 * "I made one up": which prayer. One tap counts it (A.madeUp, with Undo) and closes the sheet.
 * from "today" (the "Make-ups · 8 left" line on Today): a fast too, when fasts are owed, and "See all make-ups".
 */
A.mkPick = (from = "") => {
  const q = S.qada, keys = store.qadaKeys(S), today = from === "today";
  const fast = today && q.fasts > 0 ? `<div class="z-opt"><button type="button" class="z-optb" data-f="mk-fast" onclick="A.mkTap('fast')"><span class="z-t"><b>${esc(X.aFast)}</b><small>${esc(X.left(q.fasts))}</small></span>${icon("chev", "z-cv")}</button></div>` : "";
  const all = today ? `<button type="button" class="z-tbtn mk-all" data-f="mk-all" onclick="A.mkSeeAll()">${esc(X.seeAll)}</button>` : "";
  openSheet(`<div class="z-sh"><div class="z-lhd"><div><h3>${esc(PROG.pickTitle)}</h3><p class="z-sub">${esc(PROG.pickSub)}</p></div><button class="z-cls" onclick="A.closeSheet()" aria-label="${esc(COMMON.close)}">${icon("close", "z-i")}</button></div>
  <div class="z-opts">${keys.map(p => `<div class="z-opt"><button type="button" class="z-optb" ${q[p] > 0 ? "" : "disabled"} onclick="A.mkTap('${p}')"><span class="z-t"><b>${esc(nameOf(p))}${p === "Witr" ? ` <span class="z-art">· ${esc(X.witrTag)}</span>` : ""}</b><small>${esc(X.left(q[p] || 0))}</small></span>${icon("chev", "z-cv")}</button></div>`).join("")}${fast}</div>
  <div class="z-shfoot">${all}<button class="z-tbtn" onclick="A.closeSheet()">${esc(COMMON.cancel)}</button></div></div>`);
};
A.mkTap = p => { closeSheet(); if (p === "fast") A.madeUpFast(); else A.madeUp(p); };
/** "See all make-ups": Progress → Make-ups (or the Make-ups page while Progress is off). */
A.mkSeeAll = () => {
  closeSheet();
  if (progressChapters(S).includes("makeups")) { UI.progressCh = "makeups"; go("progress"); } else go("qada");
};

const when = d => `${MON3[d.getMonth()]} ${d.getFullYear()}`;
const num = n => n.toLocaleString("en");

/** The Make-ups chapter (and page). */
export function makeupsChapter() {
  const q = S.qada, now = NOW(), m = store.monthLog(S, now), keys = store.qadaKeys(S), hasWitr = keys.includes("Witr");
  const split = store.qadaSplit(S), owed = store.qadaOwed(S);
  const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(), dom = now.getDate(), daysLeft = dim - dom + 1;
  const goal = Math.max(1, q.goal), pctG = Math.min(100, Math.round(m.prayers / goal * 100));
  const pace = Math.min(100, Math.round(dom / dim * 100));
  const ahead = m.prayers - Math.round(goal * dom / dim);
  const paceWord = m.prayers >= goal ? M.goalReachedMonth : ahead > 0 ? X.ahead : ahead === 0 ? X.onPace : X.behind;
  const added = store.addedToday(S, now);
  const perDay = keys.length, cleared = qadaClearedTotal(S);
  const miles = [[X.oneDay, perDay], [X.oneWeek, perDay * 7], [X.oneMonth, perDay * 30], [X.threeMonths, perDay * 90], [X.oneYear, perDay * 365]];
  const nextM = miles.find(x => cleared < x[1]);
  const first = Object.keys(q.monthLog).sort()[0];
  const sinceTxt = first ? MON[+first.split("-")[1] - 1] : MON[now.getMonth()];
  const fullDays = Math.floor(cleared / perDay);
  const months = [3, 2, 1, 0].map(i => { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; return { d, v: q.monthLog[k]?.prayers || 0, cur: i === 0 }; });
  const maxV = Math.max(goal, ...months.map(x => x.v), 1);
  const proj = [[X.aMonth(goal), X.yourGoal, addDays(now, Math.ceil(owed / goal) * 30)], [X.oneADay, X.aboutMonth, addDays(now, owed)], [X.twoADay, "", addDays(now, Math.ceil(owed / 2))]];

  const head = `<header class="zt-chh"><h1 class="zt-title">${esc(NAV.qada)}</h1><p class="zt-sub pr-subi">${esc(PROG.mkSub)} <span class="pr-ar">(qaḍāʾ)</span>${glossBtn("qada")}</p></header>`;
  const rows = keys.map(p => `<div class="mk-row"><span class="t">${esc(nameOf(p))}${p === "Witr" ? ` <small>${esc(X.witrTag)}</small>${glossBtn("witr")}` : ""}</span><b class="${q[p] ? "" : "z"}">${num(q[p] || 0)}</b></div>`).join("");
  const main = `<div class="zt-card pad mk-main">
    ${owed > 0 ? `<div class="pr-big"><b>${num(owed)}</b><span>${esc(PROG.leftToMakeUp)}</span></div>` : `<p class="mk-clear">${esc(M.clear)}</p>`}
    <div class="mk-bar" role="progressbar" aria-label="${esc(PROG.madeThisMonth(m.prayers, goal))}" aria-valuenow="${m.prayers}" aria-valuemin="0" aria-valuemax="${goal}"><i style="width:${pctG}%"></i><u style="left:${pace}%" title="${esc(X.paceFor)}"></u></div>
    <div class="mk-line"><span>${esc(PROG.madeThisMonth(m.prayers, goal))} · <b>${esc(paceWord)}</b>${m.prayers < goal ? `<small>${esc(M.moreInDays(goal - m.prayers, daysLeft, Math.ceil((goal - m.prayers) / Math.max(1, daysLeft))))}</small>` : ""}</span><button type="button" class="zt-link" data-f="mkgoal" onclick="A.goalSheet()">${esc(X.changeGoal)}</button></div>
    <div class="mk-rows">${rows}</div>
    <button type="button" class="zt-btn pri" data-f="mkone" ${owed > 0 ? "" : "disabled"} onclick="A.mkPick()">${icon("plus")}${esc(PROG.madeOneUp)}</button>
    ${added > 0 ? `<p class="mk-today">${esc(M.plusToday(added))}</p>` : ""}
  </div>`;
  const fasts = `<div class="zt-card mk-fast"><span class="t"><b>${esc(M.fasts)}</b><small>${esc(X.fastsSub(q.fasts, m.fasts, q.fastGoal))}</small></span><button type="button" class="zt-btn sm sec" data-f="mkfast" ${q.fasts > 0 ? "" : "disabled"} onclick="A.madeUpFast()">${esc(M.fastedOne)}</button></div>`;
  const sameDay = `<p class="pr-cap mk-note">${icon("info")}<span>${esc(X.sameDay)}</span></p>`;
  const restored = `<div class="pr-sec"><h2>${esc(X.restoredHead)}</h2></div><div class="zt-card pad mk-rest"><div class="pr-big sm"><b>${num(cleared)}</b><span>${esc(X.madeUpSince(cleared, sinceTxt))}</span></div>
    <p class="mk-p">${esc(X.fullDays(fullDays, 0))} ${nextM ? esc(X.nextIs(nextM[0].toLowerCase(), nextM[1])) : ""}</p>
    <ul class="mk-mile">${miles.map(([l, n]) => `<li class="${cleared >= n ? "done" : nextM && nextM[1] === n ? "next" : ""}">${cleared >= n ? icon("check") : ""}${esc(l)} · ${num(n)}</li>`).join("")}</ul></div>`;
  const label = months.map(x => `${MON3[x.d.getMonth()]} ${x.v}`).join(", ");
  const each = `<div class="pr-sec"><h2>${esc(X.eachMonth)}</h2><span>${esc(X.vsGoal)}</span></div><div class="zt-card pad"><div class="pr-cols m4" role="img" aria-label="${esc(`${X.eachMonth}: ${label}. ${X.goalWord(goal)}`)}">${months.map(x => `<div class="col${x.cur ? " cur" : ""}" style="--h:${Math.max(2, Math.round(x.v / maxV * 100))}%"><b>${x.v}</b><i></i><span>${MON3[x.d.getMonth()]}${x.cur ? " " + esc(X.soFar) : ""}</span></div>`).join("")}</div><p class="pr-cs" style="margin:8px 0 0">${esc(X.goalWord(goal))}</p></div>`;
  const keep = owed > 0 ? `<div class="pr-sec"><h2>${esc(X.keepHead)}</h2><span>${esc(X.toGo(split.fard))}${split.witr ? ` + ${num(split.witr)} Witr` : ""}</span></div>
    <div class="zt-card mk-keep">${proj.map(([a, b, d]) => `<div class="r"><span>${esc(a)}${b ? `<small>${esc(b)}</small>` : ""}</span><em>${esc(when(d))}</em></div>`).join("")}</div>
    <p class="pr-cap">${esc(X.guide)}${hasWitr ? esc(X.witrNote(q.Witr || 0)) : ""}</p>` : "";
  const adjust = `<button type="button" class="zt-btn soft mk-adj" data-f="mkadj" onclick="A.balanceSheet()">${esc(M.adjustTitle)}</button>`;
  return head + main + fasts + sameDay + restored + each + keep + adjust + `<div class="zt-fill"></div>`;
}

/** Make-ups as its own page: only while Progress is off (otherwise #makeups lands on the Progress chapter). */
function render() {
  const root = $("#v-qada");
  if (!root || UI.view !== "qada") return;
  const html = `<div class="zt-top"><span></span>${avatarBtn()}</div><div class="zt-ch mk-page">${makeupsChapter()}</div>`;
  if (root._h === html) return;
  root._h = html; root.innerHTML = html;
}
onRender(render);
