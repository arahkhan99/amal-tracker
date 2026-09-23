import { S, A, $, NOW, todayKey, onRender, commit, toast, openSheet, closeSheet } from "../app.js";
import * as store from "../store.js";
import { PRAYERS, DOW, MON, fmt12, dkey, parseKey, addDays, esc } from "../util.js";
import { timesFor, currentWindow, nextPrayer, METHOD_SHORT, FALLBACK_LOCATION } from "../times.js";
import { hijriLabel } from "../hijri.js";
import { dayPct, weekPcts, avg } from "../stats.js";
import { reflectionFor, seerahFor } from "../reflections.js";
import { isNative } from "../platform.js";

export const STATUS = { congregation: "In congregation", ontime: "On time", missed: "Missed" };
const STATUS_HELP = { congregation: "Jama'ah at the masjid or at home", ontime: "Prayed within its time", missed: "Not prayed in its time. Adds one to Qada" };
const CHECK = '<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>';

/* ---------- shared: prayers ---------- */
function dayLabel(key) {
  if (key === todayKey()) return "";
  if (key === dkey(addDays(NOW(), -1))) return "Yesterday · ";
  const d = parseKey(key);
  return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()].slice(0, 3)} · `;
}

A.prayerSheet = (p, key = todayKey()) => {
  const cur = store.getDay(S, key).prayers[p];
  const t = timesFor(parseKey(key), S.settings)[p];
  openSheet(`<h3>${p}</h3><p>${dayLabel(key)}${fmt12(t)} · one tap logs it</p><div class="opts">
  ${Object.entries(STATUS).map(([k, v]) => `<button class="opt ${cur === k ? "sel" : ""}" onclick="A.setPrayer('${p}','${k}','${key}')"><span class="dot ${k}"></span><div><b>${v}</b><small>${STATUS_HELP[k]}</small></div></button>`).join("")}
  </div>${cur ? `<div class="cta"><button class="btn ghost" onclick="A.setPrayer('${p}',null,'${key}')">Clear</button></div>` : ""}`);
};

A.setPrayer = (p, k, key = todayKey()) => {
  if (key < S.createdKey) S.createdKey = key; // backfilling an earlier day extends the tracked range
  const was = store.setPrayer(S, key, p, k, NOW());
  closeSheet(); commit();
  if (k === "missed") toast(`${p} missed · 1 added to Qada`);
  else if (was === "missed") toast(`${p}: ${STATUS[k] || "cleared"} · removed from Qada`);
  else if (k) toast(`${p}: ${STATUS[k]}`);
};

/* ---------- shared: amal ---------- */
export const amalById = id => S.amalList.find(a => a.id === id);

export function amalHint(a) {
  if (a.id === "quran" || a.detail === "quran") {
    return S.lastQuran ? `Last stopped: ${S.lastQuran}` : "Log where you stop each day";
  }
  if (a.detail === "count") {
    const y = store.getDay(S, dkey(addDays(NOW(), -1))).amal[a.id];
    return y?.done && y.detail ? `Yesterday: ${parseInt(y.detail) || y.detail}` : "Tap to log a count";
  }
  return a.hint || (a.builtin ? "" : "Added by you");
}

A.tapAmal = (id, key = todayKey()) => {
  const a = amalById(id);
  const st = store.getDay(S, key).amal[id];
  if (key < S.createdKey) S.createdKey = key;
  if (st?.done) {
    store.setAmal(S, key, id, false);
    if (a.detail === "quran") S.lastQuran = store.lastDetail(S, id, null)?.detail.split(" · ")[0] || "";
    commit(); toast("Unchecked"); return;
  }
  store.setAmal(S, key, id, true, "");
  commit();
  if (a.detail === "none") toast(`${a.name} done`);
  else A.detailSheet(id, key);
};

A.detailSheet = (id, key = todayKey()) => {
  const a = amalById(id);
  const d = store.getDay(S, key).amal[id]?.detail || "";
  let body = "";
  if (a.detail === "quran") {
    const [pos, pages] = d.split(" · ");
    const pre = pos || (S.settings.carryQuran ? S.lastQuran : "");
    body = `<div class="field"><label>Where did you stop?</label><input id="dIn" value="${esc(pre)}" placeholder="Surah and ayah, or juz / page"></div><div class="field"><label>Pages or ayat read</label><input id="dIn2" value="${esc(parseInt(pages) || "")}" placeholder="Optional" inputmode="numeric"></div>`;
  } else if (a.detail === "count") {
    const last = store.lastDetail(S, id, key);
    const n = parseInt(d) || parseInt(last?.detail) || 100;
    body = `<div class="field"><label>How many?</label><div class="stepper"><button onclick="A.step(-10)">−</button><b><input id="cnt" type="number" inputmode="numeric" min="0" value="${n}" style="width:110px;border:0;background:none;font:inherit;text-align:center;color:inherit;padding:0"></b><button onclick="A.step(10)">+</button></div></div>`;
  } else {
    body = `<div class="field"><label>Anything to note</label><textarea id="dIn" placeholder="Optional">${esc(d)}</textarea></div>`;
  }
  openSheet(`<h3>${esc(a.name)} <span style="color:var(--leaf);font-size:18px">✓</span></h3><p>Marked done. Add detail if you like, or skip.</p>${body}
  <div class="cta"><button class="btn ghost" onclick="A.closeSheet()">Skip</button><button class="btn primary" onclick="A.saveDetail('${id}','${key}')">Save detail</button></div>`);
};

A.step = n => { const c = $("#cnt"); c.value = Math.max(0, (parseInt(c.value) || 0) + n); };

A.saveDetail = (id, key) => {
  const a = amalById(id);
  let v = "";
  if (a.detail === "count") v = `${Math.max(0, parseInt($("#cnt").value) || 0)} ${a.id === "salawat" ? "salawat" : ""}`.trim();
  else if (a.detail === "quran") {
    const pos = $("#dIn").value.trim(), pages = $("#dIn2").value.trim();
    v = pos + (pages ? ` · ${pages} pages` : "");
  } else v = $("#dIn").value.trim();
  store.setAmal(S, key, id, true, v);
  if (a.detail === "quran") S.lastQuran = store.lastDetail(S, id, null)?.detail.split(" · ")[0] || "";
  closeSheet(); commit(); toast("Saved");
};

A.addAmal = () => openSheet(`<h3>Add an amal</h3><p>It will appear on Home and in Progress from today.</p>
  <div class="field"><label>Name</label><input id="nIn" placeholder="e.g. Tahajjud, Dua for parents"></div>
  <div class="field"><label>When you check it off</label><select id="nType"><option value="none">Just mark it done</option><option value="note">Ask for an optional note</option><option value="count">Ask for a count</option></select></div>
  <div class="cta"><button class="btn ghost" onclick="A.closeSheet()">Cancel</button><button class="btn primary" onclick="A.saveAmal()">Add to my list</button></div>`);

A.saveAmal = () => {
  const n = $("#nIn").value.trim(); if (!n) return;
  S.amalList.push({ id: "c" + Date.now(), name: n, hint: "Added by you", detail: $("#nType").value });
  closeSheet(); commit(); toast("Added to your daily amal");
};

export function amalRow(a, key, { hint } = {}) {
  const st = store.getDay(S, key).amal[a.id] || {};
  const past = key < todayKey();
  const cls = st.done ? "done" : past ? "skipped" : "";
  const sub = st.done ? esc(st.detail || "Done") : hint ?? (past ? "Not done" : "Not yet");
  return `<div class="row ${cls}"><button class="check" aria-label="Mark ${esc(a.name)} done" onclick="A.tapAmal('${a.id}','${key}')">${CHECK}</button><div class="t" onclick="A.tapAmal('${a.id}','${key}')"><b>${esc(a.name)}</b><small>${sub}</small></div>${st.done && a.detail !== "none" ? `<button class="detail-link" onclick="A.detailSheet('${a.id}','${key}')">${st.detail ? "Edit" : "Add detail"}</button>` : ""}</div>`;
}

/* ---------- home ---------- */
function fmtLeft(ms) {
  const left = Math.max(0, Math.round(ms / 60000));
  return `${Math.floor(left / 60) ? Math.floor(left / 60) + "h " : ""}${left % 60}m`;
}

function renderHome() {
  const now = NOW(), key = todayKey(), st = S.settings;
  const day = store.getDay(S, key);
  $("#dateLabel").textContent = `${DOW[now.getDay()]}, ${now.getDate()} ${MON[now.getMonth()]}`;
  $("#hijriLabel").textContent = hijriLabel(now);
  $("#greetName").textContent = S.profile.name ? `Salam, ${S.profile.name}` : "Salam";

  const pct = dayPct(S, now, now) ?? 0;
  $("#dayPct").textContent = pct + "%";
  $("#ringArc").style.strokeDashoffset = 345.6 * (1 - pct / 100);
  const w = weekPcts(S, now);
  $("#weekPct").textContent = (avg(w) ?? pct) + "%";
  const ti = (now.getDay() + 6) % 7;
  $("#weekBars").innerHTML = w.map((v, i) => `<i class="${i === ti ? "today" : ""}">${v === null ? "" : `<b style="height:${v}%"></b>`}</i>`).join("");

  // current window
  const T = timesFor(now, st);
  const cur = currentWindow(now, st);
  const next = nextPrayer(now, st);
  $("#nextUp").innerHTML = `Next: <b>${next.p}</b> at ${fmt12(next.time)}${next.tomorrow ? " tomorrow" : ""}`;
  const wl = $("#windowLine");
  const curKey = cur ? dkey(cur.date) : null;
  const curLogged = cur ? !!store.getDay(S, curKey).prayers[cur.p] : true;
  if (cur && !curLogged) {
    const ms = cur.end - now;
    const label = curKey === key ? cur.p : `Last night's ${cur.p}`;
    wl.style.display = "flex";
    wl.onclick = () => A.prayerSheet(cur.p, curKey);
    wl.innerHTML = `<span>⏱</span><span><b>${label}</b> not logged yet. Its window ends in <b>${fmtLeft(ms)}</b>.${isNative() && st.preQada && ms <= st.leadMin * 60000 ? " Reminder sent." : ""}</span>`;
  } else if (PRAYERS.every(p => day.prayers[p])) {
    wl.style.display = "flex"; wl.onclick = null;
    wl.innerHTML = `<span>۩</span><span>All five prayers logged. Alhamdulillah.</span>`;
  } else { wl.style.display = "none"; wl.onclick = null; }

  const pDone = PRAYERS.filter(p => day.prayers[p]).length;
  $("#prayerCount").textContent = `${pDone} of 5 logged`;
  $("#prayerList").innerHTML = PRAYERS.map(p => {
    const s = day.prayers[p];
    const active = cur && cur.p === p && curKey === key;
    return `<button class="row" onclick="A.prayerSheet('${p}')"><span class="dot ${s || ""}"></span><div class="t"><b>${p}</b><small>${fmt12(T[p])}${active ? " · now" : ""}</small></div>${s ? `<span class="pill ${s}">${STATUS[s]}</span>` : `<span class="pill">Tap to log</span>`}<span class="chev">›</span></button>`;
  }).join("");
  const loc = st.location || FALLBACK_LOCATION;
  $("#timesSource").textContent = `Calculated on your phone · ${METHOD_SHORT[st.method] || st.method} · ${loc.label}${st.location ? "" : " (default, set your location in Settings)"}`;

  const aDone = S.amalList.filter(a => day.amal[a.id]?.done).length;
  $("#amalCount").textContent = `${aDone} of ${S.amalList.length} done`;
  $("#amalList").innerHTML = S.amalList.length
    ? S.amalList.map(a => amalRow(a, key, { hint: esc(amalHint(a)) })).join("")
    : `<div class="empty">No amal on your list. Add some from the Tracker tab.</div>`;

  const r = reflectionFor(now);
  $("#reflectCard").style.display = st.reflection ? "block" : "none";
  $("#reflAr").textContent = r.ar || ""; $("#reflAr").style.display = r.ar ? "block" : "none";
  $("#reflEn").textContent = r.en;
  $("#reflSrc").textContent = `${r.src} · A new ayah or hadith each morning`;
  $("#seerahCard").style.display = st.seerah && now.getDay() === 5 ? "block" : "none";
  $("#seerahText").textContent = seerahFor(now);
}

onRender(renderHome);
