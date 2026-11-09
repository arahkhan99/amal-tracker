/* Make-ups (Q-A): monthly goal with pace, quick "I prayed one" chips, restored-so-far, monthly chart, projection. */
import "../css/settings.css";
import { S, A, $, NOW, onRender, commit, toast, openSheet, closeSheet, glossBtn } from "../app.js";
import * as store from "../store.js";
import { esc, MON, MON3, addDays } from "../util.js";
import { qadaClearedTotal } from "../stats.js";
import { MAKEUPS as M, COMMON, NAV, PRAYER_NAME, prayerName } from "../strings.js";
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

A.madeUp = p => {
  if (!store.madeUpPrayer(S, p, NOW())) return;
  commit();
  const done = store.monthLog(S, NOW()).prayers, nm = prayerName(p);
  toast(done === S.qada.goal ? M.goalReached : done > S.qada.goal ? M.madeUpGoalPassed(nm) : M.madeUpToGoal(nm, S.qada.goal - done));
};
A.madeUpFast = () => { if (!store.madeUpFast(S, NOW())) return; commit(); toast(M.fastMadeUp); };

const when = d => `${MON3[d.getMonth()]} ${d.getFullYear()}`;
const num = n => n.toLocaleString("en");
const svgInfo = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/></svg>`;

function render() {
  const root = $("#v-qada");
  if (!root) return;
  const q = S.qada, now = NOW(), m = store.monthLog(S, now), keys = store.qadaKeys(S), hasWitr = keys.includes("Witr");
  const fardKeys = keys.filter(k => k !== "Witr"), split = store.qadaSplit(S), owed = store.qadaOwed(S);
  const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(), dom = now.getDate(), daysLeft = dim - dom + 1;
  const goal = Math.max(1, q.goal), pctG = Math.min(100, Math.round(m.prayers / goal * 100));
  const pace = Math.min(100, Math.round(goal * (dom / dim) / goal * 100));
  const ahead = m.prayers - Math.round(goal * dom / dim);
  const paceWord = ahead > 0 ? X.ahead : ahead === 0 ? X.onPace : X.behind;
  const added = store.addedToday(S, now);
  const perDay = keys.length, cleared = qadaClearedTotal(S);
  const miles = [[X.oneDay, perDay], [X.oneWeek, perDay * 7], [X.oneMonth, perDay * 30], [X.threeMonths, perDay * 90], [X.oneYear, perDay * 365]];
  const nextM = miles.find(x => cleared < x[1]);
  const first = Object.keys(q.monthLog).sort()[0];
  const sinceTxt = first ? MON[+first.split("-")[1] - 1] : MON[now.getMonth()];
  const fullDays = Math.floor(cleared / perDay);
  // last four months of "made up vs goal"
  const months = [3, 2, 1, 0].map(i => { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; return { d, v: q.monthLog[k]?.prayers || 0, cur: i === 0 }; });
  const maxV = Math.max(goal, ...months.map(x => x.v), 1);
  const monthsLeft = owed ? Math.ceil(owed / goal) : 0;
  const proj = [
    [X.aMonth(goal), X.yourGoal, addDays(now, Math.ceil(owed / goal) * 30), true],
    [X.oneADay, X.aboutMonth, addDays(now, owed), false],
    [`${X.twoADay}`, "", addDays(now, Math.ceil(owed / 2)), false],
  ];
  const fasts = `<div class="qrow2"><div class="t"><b>${esc(M.fasts)}</b><small>${esc(X.fastsSub(q.fasts, m.fasts, q.fastGoal))}</small></div><button class="go" ${q.fasts === 0 ? "disabled" : ""} onclick="A.madeUpFast()">${esc(M.fastedOne)}</button></div>`;
  const witrRow = hasWitr ? `<div class="qrow2"><div class="t"><b>${esc(PRAYER_NAME.Witr || "Witr")} <span class="tag-w">${esc(X.witrTag)}</span>${glossBtn("witr")}</b><small>${esc(X.witrSub(q.Witr || 0))}</small></div><button class="go" ${!(q.Witr > 0) ? "disabled" : ""} onclick="A.madeUp('Witr')">${esc(M.prayedOne)}</button></div>` : "";
  root.innerHTML = `<div class="qa">
  <div class="pagehead"><h1>${esc(NAV.qada)}</h1><p>${esc(M.sub)}</p></div>
  <div class="card goalcard">
    <div class="top"><b>${esc(X.monthGoal(MON[now.getMonth()]))}</b><span>${m.prayers}<small> / ${goal} ${esc(X.prayersUnit)}</small></span></div>
    <div class="bar"><i style="width:${pctG}%"></i><u style="left:${pace}%" aria-hidden="true"></u></div>
    <div class="bar-cap" style="margin-left:${Math.min(70, Math.max(0, pace - 12))}%">${esc(X.paceFor)}</div>
    <div class="foot"><span><b>${esc(m.prayers >= goal ? M.goalReachedMonth : paceWord)}</b>${m.prayers >= goal ? "" : ` · ${esc(M.moreInDays(goal - m.prayers, daysLeft, Math.ceil((goal - m.prayers) / Math.max(1, daysLeft))).replace(/ · about.*/, ""))}`}</span><button onclick="A.goalSheet()">${esc(X.changeGoal)}</button></div>
  </div>
  <div class="sec" style="padding-top:16px"><div class="card">
    <div class="askrow"><h3>${esc(X.askHead)}</h3><div class="pchips">${fardKeys.map(p => `<button class="pchip" ${!(q[p] > 0) ? "disabled" : ""} onclick="A.madeUp('${p}')" aria-label="${esc(M.prayedOne)}: ${esc(prayerName(p))}"><b>${esc(prayerName(p))}</b><small>${esc(X.left(q[p] || 0))}</small></button>`).join("")}</div></div>
    ${witrRow}${fasts}
  </div></div>
  <div class="totalnote">${svgInfo}<p>${esc(X.sameDay)}${added > 0 ? ` <b>${esc(M.plusToday(added))}</b>` : ""}</p></div>
  <div class="shead2"><h2>${esc(X.restoredHead)}</h2></div>
  <div class="card big"><div class="n">${num(cleared)}<small>${esc(X.madeUpSince(cleared, sinceTxt))}</small></div>
    <p>${esc(X.fullDays(fullDays, 0))} ${nextM ? esc(X.nextIs(nextM[0].toLowerCase(), nextM[1])) : ""}</p>
    <div class="mile">${miles.map(([l, n]) => `<span class="${cleared >= n ? "done" : nextM && nextM[1] === n ? "next" : ""}">${cleared >= n ? "✓ " : ""}${esc(l)} · ${num(n)}</span>`).join("")}</div></div>
  <div class="shead2"><h2>${esc(X.eachMonth)}</h2><span>${esc(X.vsGoal)}</span></div>
  <div class="card big" style="padding:6px 0 14px"><div class="months">${months.map(x => `<div><b>${x.v}</b><i style="height:${Math.max(3, Math.round(x.v / maxV * 78))}px;${x.cur ? "opacity:.55" : ""}"></i><span>${MON3[x.d.getMonth()]}${x.cur ? " " + esc(X.soFar) : ""}</span></div>`).join("")}</div><p style="padding:0 20px;font-size:12.5px;color:var(--ink2)">${esc(X.goalWord(goal))}</p></div>
  ${owed > 0 ? `<div class="shead2"><h2>${esc(X.keepHead)}</h2><span>${esc(X.toGo(split.fard))}${split.witr ? ` + ${num(split.witr)} Witr` : ""}</span></div>
  <div class="card keep">${proj.map(([a, b, d]) => `<div class="r"><div>${esc(a)}${b ? `<small>${esc(b)}</small>` : ""}</div><em>${esc(when(d))}</em></div>`).join("")}</div>
  <p class="sfoot" style="margin:10px 26px 0">${esc(X.guide)}${hasWitr ? esc(X.witrNote(q.Witr || 0)) : ""}</p>` : `<p class="sfoot" style="margin:18px 26px 0">${esc(M.clear)}</p>`}
  <button class="add adjust" onclick="A.balanceSheet()">${esc(M.adjustTitle)}</button>
  <div class="space"></div></div>`;
}
onRender(render);
