import { S, UI, A, $, $$, NOW, onRender, render } from "../app.js";
import * as store from "../store.js";
import { PRAYERS, DOW, MON, MON3, dkey, addDays, daysBetween, esc } from "../util.js";
import * as st from "../stats.js";

A.selDay = b => { UI.selDay = b; UI.range = "day"; render(); };
$("#progSeg").onclick = e => { const r = e.target.dataset.r; if (r) { UI.range = r; render(); } };

const dotLegend = (k, label, n) => `<span><span class="dot ${k}" style="display:inline-block;vertical-align:-2px;margin-right:4px"></span>${label} ${n}</span>`;

function insightCards() {
  const { good, warn } = st.insights(S, NOW());
  const card = (list, cls, mark, empty) => list.length
    ? list.map(i => `<div class="insight ${cls}"><div class="mark">${mark}</div><div><b>${esc(i.title)}</b><small>${esc(i.sub)}</small></div></div>`).join("")
    : `<div class="empty">${empty}</div>`;
  return `<div class="sec"><h2>Doing well</h2><div class="card">${card(good, "good", "۩", "Keep logging. Your strengths show up here after a few days.")}</div></div>
  <div class="sec"><h2>Needs more care</h2><div class="card">${card(warn, "warn", "!", "Nothing stands out right now. Alhamdulillah.")}</div></div>`;
}

function dayView() {
  const now = NOW(), b = UI.selDay, d = addDays(now, -b), day = store.getDay(S, dkey(d));
  const pct = st.dayPct(S, d, now);
  const cong = PRAYERS.filter(p => day.prayers[p] === "congregation").length;
  const amalDone = S.amalList.filter(a => day.amal[a.id]?.done).length;
  const c = st.statusCounts(S, 7, now);
  const total = c.congregation + c.ontime + c.missed;
  return `<div class="sec"><h2>${b === 0 ? "Today" : `${DOW[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}`} ${b > 0 ? `<span><button style="color:var(--moss);font-weight:700" onclick="A.selDay(0)">Back to today</button></span>` : ""}</h2>
  <div class="stat"><div class="card"><b>${pct ?? "–"}${pct === null ? "" : "%"}</b><small>${b === 0 ? "so far" : "completion"}</small></div><div class="card"><b>${cong}</b><small>in congregation</small></div><div class="card"><b>${amalDone}/${S.amalList.length}</b><small>amal done</small></div></div></div>
  <div class="sec"><h2>Prayers by status <span>last 7 days</span></h2><div class="card">${total ? `<div style="display:flex;height:14px;border-radius:7px;overflow:hidden;margin:16px 16px 8px"><i style="flex:${c.congregation};background:var(--gold)"></i><i style="flex:${c.ontime};background:var(--leaf)"></i><i style="flex:${c.missed};background:var(--miss)"></i></div>
  <div style="display:flex;gap:14px;padding:0 16px 14px;font-size:12px;color:var(--ink2);flex-wrap:wrap">${dotLegend("congregation", "Congregation", c.congregation)}${dotLegend("ontime", "On time", c.ontime)}${dotLegend("missed", "Missed", c.missed)}</div>` : `<div class="empty">No prayers logged in the last 7 days yet.</div>`}</div></div>${insightCards()}`;
}

function weekView() {
  const now = NOW(), w = st.weekPcts(S, now), lw = st.weekPcts(S, now, -1);
  const labels = ["M", "T", "W", "T", "F", "S", "S"];
  const a = st.avg(w), la = st.avg(lw);
  const delta = a !== null && la !== null ? a - la : null;
  return `<div class="sec"><div class="stat"><div class="card"><b>${a ?? 0}%</b><small>week so far</small></div><div class="card"><b>${st.prayerStreak(S, now)}</b><small>day streak</small></div><div class="card"><b>${delta === null ? "–" : (delta >= 0 ? "+" : "−") + Math.abs(delta)}</b><small>vs last week</small></div></div></div>
  <div class="sec"><h2>This week</h2><div class="card"><div class="bars7">${w.map((v, i) => `<div><i style="height:100%"><b style="height:${v ?? 0}%"></b></i><span>${labels[i]}</span></div>`).join("")}</div></div></div>${insightCards()}`;
}

function monthView() {
  const now = NOW(), days = st.monthDays(S, now);
  const first = (new Date(now.getFullYear(), now.getMonth(), 1).getDay() + 6) % 7;
  let cells = "";
  for (let i = 0; i < first; i++) cells += "<span></span>";
  for (const { date, pct } of days) {
    const back = daysBetween(date, now);
    let cls = "future";
    if (back >= 0) cls = pct === null ? "" : "l" + (pct < 40 ? "1" : pct < 65 ? "2" : pct < 85 ? "3" : "4");
    cells += `<button class="${cls} ${UI.selDay === back && back >= 0 ? "sel" : ""}" ${back < 0 ? "disabled" : `onclick="A.selDay(${back})"`}>${date.getDate()}</button>`;
  }
  const a = st.avg(days.map(x => x.pct));
  const cong = st.congregationCount(S, new Date(now.getFullYear(), now.getMonth(), 1), now, now);
  return `<div class="sec"><div class="stat"><div class="card"><b>${a ?? 0}%</b><small>${MON[now.getMonth()]} so far</small></div><div class="card"><b>${cong}</b><small>congregation prayers</small></div><div class="card"><b>${st.qadaClearedInMonth(S, now)}</b><small>qada made up</small></div></div></div>
  <div class="sec"><h2>${MON[now.getMonth()]} <span>tap a day to inspect it</span></h2><div class="card"><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;padding:14px 16px 0;font-size:11px;color:var(--ink2);text-align:center;font-weight:600">${["M", "T", "W", "T", "F", "S", "S"].map(x => `<span>${x}</span>`).join("")}</div><div class="grid" style="padding-top:8px">${cells}</div></div></div>${insightCards()}`;
}

function yearView() {
  const now = NOW(), y = now.getFullYear(), vals = st.yearMonths(S, y, now);
  const a = st.avg(vals);
  let best = -1;
  vals.forEach((v, i) => { if (v !== null && (best < 0 || v > vals[best])) best = i; });
  return `<div class="sec"><div class="stat"><div class="card"><b>${a ?? 0}%</b><small>${y} average</small></div><div class="card"><b>${best >= 0 ? MON3[best] : "–"}</b><small>best month</small></div><div class="card"><b>${st.qadaClearedInYear(S, y)}</b><small>qada cleared</small></div></div></div>
  <div class="sec"><h2>By month</h2><div class="card"><div class="months">${MON3.map((x, i) => `<div><b>${vals[i] ?? "–"}${vals[i] !== null ? "%" : ""}</b><span>${x}</span></div>`).join("")}</div></div></div>${insightCards()}`;
}

function renderProgress() {
  if (UI.view !== "progress") return; // insights are the heaviest part; only build when visible
  $$("#progSeg button").forEach(x => x.classList.toggle("on", x.dataset.r === UI.range));
  $("#progBody").innerHTML = { day: dayView, week: weekView, month: monthView, year: yearView }[UI.range]();
}

onRender(renderProgress);
