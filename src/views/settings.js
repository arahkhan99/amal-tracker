import { S, A, $, $$, onRender, commit, toast, openSheet, closeSheet, replaceState } from "../app.js";
import * as store from "../store.js";
import { PRAYERS, esc } from "../util.js";
import { METHODS, ASR, FALLBACK_LOCATION } from "../times.js";
import { isNative, currentPosition, cityName, searchCity, saveFile, pickFile, biometryAvailable, authenticate } from "../platform.js";
import { STATUS } from "./home.js";
import { cloud, signIn, signOut, sync } from "../cloud.js";

/* ---------- switches ---------- */
$$("#v-settings .switch[data-set]").forEach(sw => {
  sw.onclick = async () => {
    const k = sw.dataset.set, on = !S.settings[k];
    if (k === "lock" && on) {
      if (!(await biometryAvailable())) { toast("No fingerprint or screen lock set up on this phone"); return; }
      try { await authenticate(); } catch (e) { toast("Not turned on"); return; }
    }
    S.settings[k] = on;
    commit();
  };
});

$("#leadSeg").onclick = e => {
  const m = e.target.dataset.m;
  if (m) { S.settings.leadMin = +m; commit(); toast(`Reminder ${m} minutes before qada`); }
};

/* ---------- location ---------- */
A.locationSheet = () => {
  const loc = S.settings.location;
  openSheet(`<h3>Location</h3><p>${loc ? `${esc(loc.label)} · ${loc.lat.toFixed(3)}, ${loc.lng.toFixed(3)}` : `Not set · using ${FALLBACK_LOCATION.label}`}</p>
  <div class="cta"><button class="btn primary" onclick="A.useGps()">Use my current location</button></div>
  <div class="field"><label>Or search for a city</label><div style="display:flex;gap:8px"><input id="cityIn" placeholder="e.g. London, Karachi, Toronto" onkeydown="if(event.key==='Enter')A.findCity()"><button class="btn ghost" style="flex:none;padding:12px 16px" onclick="A.findCity()">Search</button></div></div>
  <div class="results" id="cityResults"></div>
  <p class="note">Prayer times are calculated on your phone from these coordinates, so they work offline. Looking up a city name needs internet once.</p>`);
};

A.useGps = async () => {
  toast("Finding your location…");
  try {
    const { lat, lng } = await currentPosition();
    const label = await cityName(lat, lng);
    S.settings.location = { lat, lng, label };
    closeSheet(); commit(); toast(`Location set: ${label}`);
  } catch (e) {
    toast("Couldn't get your location. Try searching instead.");
  }
};

let found = [];
A.findCity = async () => {
  const q = $("#cityIn").value.trim(); if (!q) return;
  const box = $("#cityResults");
  box.innerHTML = `<div class="note">Searching…</div>`;
  try { found = await searchCity(q); } catch (e) { found = []; box.innerHTML = `<div class="note">Couldn't search. Check your internet connection.</div>`; return; }
  box.innerHTML = found.length ? found.map((r, i) => `<button class="opt" onclick="A.pickCity(${i})"><div><b>${esc(r.label)}</b><small>${r.lat.toFixed(3)}, ${r.lng.toFixed(3)}</small></div></button>`).join("") : `<div class="note">No matches.</div>`;
};
A.pickCity = i => { S.settings.location = found[i]; closeSheet(); commit(); toast(`Location set: ${found[i].label}`); };

/* ---------- methods ---------- */
A.methodSheet = () => openSheet(`<h3>Calculation method</h3><p>Use the one your local masjid follows.</p><div class="opts">
  ${Object.entries(METHODS).map(([k, v]) => `<button class="opt ${S.settings.method === k ? "sel" : ""}" onclick="A.setOpt('method','${k}')"><div><b>${v}</b></div></button>`).join("")}</div>`);
A.asrSheet = () => openSheet(`<h3>Asr method</h3><p>Decides when Asr begins.</p><div class="opts">
  <button class="opt ${S.settings.asr === "shafi" ? "sel" : ""}" onclick="A.setOpt('asr','shafi')"><div><b>Standard</b><small>Shafi'i, Maliki, Hanbali</small></div></button>
  <button class="opt ${S.settings.asr === "hanafi" ? "sel" : ""}" onclick="A.setOpt('asr','hanafi')"><div><b>Hanafi</b><small>Later Asr time</small></div></button></div>`);
A.setOpt = (k, v) => { S.settings[k] = v; closeSheet(); commit(); toast("Prayer times updated"); };

/* ---------- amal list editor ---------- */
let draft = [];
A.amalListSheet = () => { draft = S.amalList.map(a => ({ ...a })); drawAmalEditor(); };
function drawAmalEditor() {
  openSheet(`<h3>Daily amal list</h3><p>Rename, reorder or remove. Past logs are kept.</p><div style="margin-top:12px">
  ${draft.map((a, i) => `<div class="edrow"><input value="${esc(a.name)}" oninput="A.edName(${i},this.value)" aria-label="Name"><button onclick="A.edMove(${i},-1)" ${i === 0 ? "disabled" : ""} aria-label="Move up">↑</button><button onclick="A.edMove(${i},1)" ${i === draft.length - 1 ? "disabled" : ""} aria-label="Move down">↓</button><button class="del" onclick="A.edDel(${i})" aria-label="Remove">✕</button></div>`).join("") || `<div class="note">Your list is empty.</div>`}
  </div><div class="cta"><button class="btn ghost" onclick="A.closeSheet();A.addAmal()">+ Add new</button><button class="btn primary" onclick="A.edSave()">Save</button></div>`);
}
A.edName = (i, v) => { draft[i].name = v; };
A.edMove = (i, d) => { const [x] = draft.splice(i, 1); draft.splice(i + d, 0, x); drawAmalEditor(); };
A.edDel = i => { draft.splice(i, 1); drawAmalEditor(); };
A.edSave = () => { S.amalList = draft.filter(a => a.name.trim()).map(a => ({ ...a, name: a.name.trim() })); closeSheet(); commit(); toast("Amal list saved"); };

/* ---------- account ---------- */
A.nameSheet = () => openSheet(`<h3>Your name</h3><p>Used for the greeting on Home.</p>
  <div class="field"><input id="nameIn" value="${esc(S.profile.name)}" placeholder="Your name"></div>
  <div class="cta"><button class="btn ghost" onclick="A.closeSheet()">Cancel</button><button class="btn primary" onclick="A.saveName()">Save</button></div>`);
A.saveName = () => { S.profile.name = $("#nameIn").value.trim(); closeSheet(); commit(); };

const csvCell = v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
A.exportCsv = async () => {
  const rows = [["date", "type", "item", "status", "detail"]];
  for (const key of Object.keys(S.days).sort()) {
    const d = S.days[key];
    for (const p of PRAYERS) rows.push([key, "prayer", p, d.prayers[p] ? STATUS[d.prayers[p]] : "Not logged", ""]);
    for (const [id, v] of Object.entries(d.amal)) rows.push([key, "amal", S.amalList.find(a => a.id === id)?.name || id, v.done ? "Done" : "", v.detail || ""]);
    if (d.note) rows.push([key, "note", "", "", d.note]);
  }
  for (const [ym, v] of Object.entries(S.qada.monthLog)) rows.push([ym, "qada made up", "prayers", v.prayers, ""], [ym, "qada made up", "fasts", v.fasts, ""]);
  try { await saveFile(`amal-tracker-${new Date().toISOString().slice(0, 10)}.csv`, rows.map(r => r.map(csvCell).join(",")).join("\n"), "text/csv"); }
  catch (e) { toast("Export cancelled"); }
};

A.backup = async () => {
  try { await saveFile(`amal-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(S, null, 1), "application/json"); }
  catch (e) { toast("Backup cancelled"); }
};

A.restore = async () => {
  const text = await pickFile("application/json,.json");
  if (!text) return;
  try {
    const data = JSON.parse(text);
    if (!data.days || !data.qada) throw new Error("not a backup");
    replaceState(store.normalize(data));
    toast("Backup restored");
  } catch (e) { toast("That file isn't a valid backup"); }
};

A.resetSheet = () => openSheet(`<h3>Reset all data?</h3><p>This deletes every log, your qada balance and settings from this phone. It can't be undone. Consider backing up first.${cloud.user ? " You'll also be signed out of cloud backup; your cloud copy is kept and comes back if you sign in again." : ""}</p>
  <div class="cta"><button class="btn ghost" onclick="A.closeSheet()">Cancel</button><button class="btn danger" onclick="A.reset()">Delete everything</button></div>`);
A.reset = async () => {
  closeSheet();
  if (cloud.user) await signOut().catch(() => {}); // otherwise the next sync would merge the cloud copy straight back
  replaceState(store.defaultState());
  A.startOnboarding();
};

/* ---------- cloud backup ---------- */
function ago(t) {
  if (!t) return "not yet";
  const m = Math.round((Date.now() - t) / 60000);
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`;
}
function cloudStatus() {
  if (!cloud.user) return "Off · sign in with Google to back up and sync";
  if (cloud.syncing) return `On · ${cloud.user.email} · syncing…`;
  return `On · ${cloud.user.email} · ${cloud.error || "synced " + ago(cloud.lastSync)}`;
}

A.cloudSheet = () => {
  if (!cloud.user) {
    openSheet(`<h3>Cloud backup</h3><p>Sign in with Google and your prayers, amal, qada and settings are saved to your own private space in the cloud. They sync automatically, and signing in on a new phone brings everything back.</p>
    <div class="cta"><button class="btn primary" onclick="A.cloudSignIn()">Sign in with Google</button></div>
    <p class="note">Only you can read your data. It is stored in Firebase, Google's app database.</p>`);
    return;
  }
  openSheet(`<h3>Cloud backup</h3><p>Signed in as ${esc(cloud.user.email)}. ${cloud.error ? esc(cloud.error) : "Last synced " + ago(cloud.lastSync) + "."}</p>
  <div class="cta"><button class="btn ghost" onclick="A.cloudSignOut()">Sign out</button><button class="btn primary" onclick="A.cloudSync()">Sync now</button></div>
  <p class="note">Signing out keeps everything on this phone. Changes stop syncing until you sign in again.</p>`);
};
A.cloudSignIn = async () => {
  try { await signIn(); closeSheet(); toast(cloud.error || "Signed in · backup is on"); }
  catch (e) { console.warn("sign-in", e); toast("Sign-in didn't finish. Try again."); }
};
A.cloudSync = async () => { await sync(); closeSheet(); toast(cloud.error || "Synced"); };
A.cloudSignOut = async () => { await signOut(); closeSheet(); toast("Signed out · data kept on this phone"); };

/* ---------- render ---------- */
function renderSettings() {
  const st = S.settings;
  $$("#v-settings .switch[data-set]").forEach(sw => sw.classList.toggle("on", !!st[sw.dataset.set]));
  $$("#leadSeg button").forEach(x => x.classList.toggle("on", +x.dataset.m === st.leadMin));
  const loc = st.location;
  $("#locLabel").textContent = loc ? `${loc.label} · uses your location` : `Not set · using ${FALLBACK_LOCATION.label}`;
  $("#methodLabel").textContent = METHODS[st.method] || st.method;
  $("#asrLabel").textContent = ASR[st.asr];
  $("#amalSettingCount").textContent = `${S.amalList.length} items · edit or reorder`;
  $("#goalSettingLabel").textContent = `${S.qada.goal} prayers, ${S.qada.fastGoal} fasts`;
  $("#nameLabel").textContent = S.profile.name || "Not set";
  $("#lockRow").style.display = isNative() ? "flex" : "none";
  $("#cloudRow").style.display = cloud.available ? "flex" : "none";
  $("#cloudLabel").textContent = cloudStatus();
  $("#remindNote").textContent = isNative() ? "" : "shown in the app on this device";
}

onRender(renderSettings);
