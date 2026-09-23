import { S, UI, A, $, NOW, onRender, render } from "../app.js";
import * as store from "../store.js";
import { PRAYERS, DOW, MON, dkey, addDays } from "../util.js";
import { dayPct } from "../stats.js";
import { STATUS, amalRow } from "./home.js";

export const MAX_BACK = 89; // how far back the tracker pages

A.trkStep = n => { UI.trkDay = Math.min(MAX_BACK, Math.max(0, UI.trkDay + n)); render(); };
A.trkPick = b => { UI.trkDay = b; render(); };

let noteTimer = null;
function wireNote() {
  const ta = $("#dayNote");
  ta.oninput = () => {
    const key = ta.dataset.key;
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => {
      const day = store.ensureDay(S, key);
      day.note = ta.value;
      store.save(S);
    }, 400);
  };
}

function renderTracker() {
  const now = NOW();
  // strip shows 7 days ending at today, unless paged further back (as in the prototype)
  const base = Math.max(0, UI.trkDay - 6 > 0 ? UI.trkDay - 6 : 0);
  const strip = [];
  for (let b = Math.min(MAX_BACK, base + 6); b >= base; b--) strip.push(b);
  $("#dayStrip").innerHTML = strip.map(b => { const d = addDays(now, -b); return `<button class="${UI.trkDay === b ? "on" : ""}" onclick="A.trkPick(${b})">${b === 0 ? "Today" : DOW[d.getDay()]}<b>${d.getDate()}</b></button>`; }).join("");
  $("#nextDay").disabled = UI.trkDay === 0;
  $("#prevDay").disabled = UI.trkDay >= MAX_BACK;

  const d = addDays(now, -UI.trkDay), key = dkey(d), day = store.getDay(S, key);
  $("#trkTitle").textContent = UI.trkDay === 0 ? "Today" : UI.trkDay === 1 ? "Yesterday" : `${DOW[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}`;
  $("#addAmalBtn").style.display = UI.trkDay === 0 ? "block" : "none";
  const pct = dayPct(S, d, now);
  $("#trkPct").textContent = pct === null ? "Before you started tracking" : UI.trkDay === 0 ? pct + "% so far" : pct + "%";

  $("#trkPrayers").innerHTML = PRAYERS.map(p => {
    const s = day.prayers[p];
    return `<button class="row" onclick="A.prayerSheet('${p}','${key}')"><span class="dot ${s || ""}"></span><div class="t"><b>${p}</b><small>${s ? STATUS[s] + (s === "missed" ? " · added to Qada" : "") : "Not logged"}</small></div><span class="chev">Edit</span></button>`;
  }).join("");

  $("#trkAmal").innerHTML = S.amalList.length
    ? S.amalList.map(a => amalRow(a, key)).join("")
    : `<div class="empty">No amal on your list yet.</div>`;

  const ta = $("#dayNote");
  if (ta.dataset.key !== key || document.activeElement !== ta) { ta.value = day.note || ""; ta.dataset.key = key; }
}

wireNote();
onRender(renderTracker);
