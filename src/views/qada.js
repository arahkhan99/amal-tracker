import { S, A, $, NOW, onRender, commit, toast, openSheet, closeSheet } from "../app.js";
import * as store from "../store.js";
import { PRAYERS } from "../util.js";

A.goalSheet = () => openSheet(`<h3>Monthly qada goal</h3><p>Pick something you can finish. You can always raise it next month.</p>
  <div class="field"><label>Makeup prayers this month</label><div class="stepper"><button onclick="A.stepG('g',-5)">−</button><b id="gP">${S.qada.goal}</b><button onclick="A.stepG('g',5)">+</button></div></div>
  <div class="field"><label>Makeup fasts this month</label><div class="stepper"><button onclick="A.stepG('f',-1)">−</button><b id="gF">${S.qada.fastGoal}</b><button onclick="A.stepG('f',1)">+</button></div></div>
  <div class="cta"><button class="btn ghost" onclick="A.closeSheet()">Cancel</button><button class="btn primary" onclick="A.saveGoal()">Save goal</button></div>`);

A.stepG = (k, n) => { const e = $(k === "g" ? "#gP" : "#gF"); e.textContent = Math.max(k === "g" ? 5 : 0, +e.textContent + n); };
A.saveGoal = () => { S.qada.goal = +$("#gP").textContent; S.qada.fastGoal = +$("#gF").textContent; closeSheet(); commit(); toast("Goal updated"); };

const adjBtn = 'class="act" style="background:var(--ivory);color:var(--ink)"';
A.balanceSheet = () => openSheet(`<h3>Adjust what you owe</h3><p>Use this if your estimate changes. Day to day, the balance moves on its own.</p>
  ${[...PRAYERS, "fasts"].map(p => `<div class="qrow" style="padding:10px 0"><div class="t"><b>${p === "fasts" ? "Fasts" : p}</b></div><button ${adjBtn} onclick="A.adj('${p}',-1)">−</button><input class="n" type="number" inputmode="numeric" min="0" value="${S.qada[p]}" onchange="A.adjSet('${p}',this.value)" style="width:76px;text-align:center;border:0;background:none;font-family:var(--serif);font-size:26px;color:var(--forest)"><button ${adjBtn} onclick="A.adj('${p}',1)">+</button></div>`).join("")}
  <div class="cta"><button class="btn primary" onclick="A.closeSheet()">Done</button></div>`);

A.adj = (p, n) => { S.qada[p] = Math.max(0, S.qada[p] + n); commit(); A.balanceSheet(); };
A.adjSet = (p, v) => { S.qada[p] = Math.max(0, parseInt(v) || 0); commit(); };

A.madeUp = p => {
  if (!store.madeUpPrayer(S, p, NOW())) return;
  commit();
  const done = store.monthLog(S, NOW()).prayers;
  toast(done === S.qada.goal ? "Monthly goal reached. Alhamdulillah." : done > S.qada.goal ? `${p} made up · goal passed` : `${p} made up · ${S.qada.goal - done} to goal`);
};
A.madeUpFast = () => { if (!store.madeUpFast(S, NOW())) return; commit(); toast("One fast made up"); };

function renderQada() {
  const q = S.qada, now = NOW(), m = store.monthLog(S, now);
  const left = store.qadaOwed(S);
  const pctG = Math.min(100, Math.round(m.prayers / Math.max(1, q.goal) * 100));
  $("#goalDone").textContent = m.prayers; $("#goalTarget").textContent = q.goal; $("#goalBar").style.width = pctG + "%";
  const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() + 1;
  $("#goalNote").textContent = m.prayers >= q.goal ? "Goal reached this month" : `${q.goal - m.prayers} more in ${daysLeft} day${daysLeft > 1 ? "s" : ""} · about ${Math.ceil((q.goal - m.prayers) / Math.max(1, daysLeft))} a day`;
  $("#qadaPrayersLeft").textContent = left; $("#qadaFastsLeft").textContent = q.fasts;
  const added = store.addedToday(S, now);
  $("#qadaDelta").textContent = added > 0 ? `+${added} today` : "";
  $("#qadaList").innerHTML = PRAYERS.map(p => `<div class="qrow"><div class="t"><b>${p}</b><small>${q[p] === 0 ? "All caught up" : q[p] + " owed"}</small></div><button class="act" ${q[p] === 0 ? "disabled" : ""} onclick="A.madeUp('${p}')">Prayed one</button></div>`).join("");
  $("#qadaFasts").innerHTML = `<div class="qrow"><div class="t"><b>Fasts</b><small>${q.fasts} owed · ${m.fasts} of ${q.fastGoal} this month</small></div><button class="act" ${q.fasts === 0 ? "disabled" : ""} onclick="A.madeUpFast()">Fasted one</button></div>`;
  $("#qadaEncourage").textContent = `${m.prayers} made up this month`;
  $("#qadaEncourageSub").textContent = left === 0
    ? "Your prayer balance is clear. Alhamdulillah."
    : `Keeping this pace, the full balance clears in about ${Math.ceil(left / Math.max(1, q.goal))} month${Math.ceil(left / Math.max(1, q.goal)) > 1 ? "s" : ""}. The goal is what matters day to day.`;
}

onRender(renderQada);
