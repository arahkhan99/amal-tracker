/* Settings (SE-B; redesign final/fin-settings-*): a full page with "Done" (no tab bar), a list of icon rows, sub-pages
 * (Features, Sunnah prayers, Appearance, Zad Plus, Help & tour) with a "‹ Settings" link, and sheets for the rest. */
import { S, UI, A, $, $$, NOW, onRender, commit, toast, openSheet, closeSheet, replaceState, glossBtn, systemIsDark } from "../app.js";
import * as store from "../store.js";
import { PRAYERS, esc, dkey, addDays, fmt12 } from "../util.js";
import { METHODS, METHOD_SHORT, FALLBACK_LOCATION, timesFor } from "../times.js";
import { isNative, pageUrl, currentPosition, cityName, searchCity, saveFile, pickFile, biometryAvailable, authenticate, requestNotifications } from "../platform.js";
import { refreshWidgets, addTile } from "../widget-bridge.js";
import { cloud, signIn, signOut, sync, deleteAccount, keepAccount } from "../cloud.js";
import { signInSheetHtml, consentTicked, signInError } from "./consent.js"; // also registers A.consentSheet (c3)
import { CONSENT } from "../strings.js";
import { Capacitor } from "@capacitor/core";
import { reschedule, askForExactAlarms, exactAlarmStatus } from "../notify.js";
import * as feat from "../features.js";
import { madhhabOptions, madhhabInfo, catalogue, DAY_NAFL, tierLabel, chipLabel, witrLabel, madhhabOf } from "../rules/madhhab.js";
import {
  SETTINGS as T, APP, COMMON, MADHHAB_UI, ASR_UI, SUNNAH_UI, EXCUSED, MAKEUPS, FEATURE,
  STATUS, prayerName, WITR_STATUS, DEED_NAME, NAV,
} from "../strings.js";
import { SETTINGS_X, GUIDE, GENDER, TRAVEL, FEEDBACK, DEEDS, NAFL, SUNNAH_NAME } from "../strings.js";
import { locationSummary } from "../travel.js";
import { NAFL_ADDON } from "../rules/madhhab.js";
import { qiblaDegrees } from "./qibla-page.js";
import { excusedSoFar } from "../times.js";
import { helpPage } from "./help.js";
import { featureRow as pvFeatureRow, settingsGroup as pvGroup, pvIcon } from "./provisions.js";
import { helpIsNew } from "../guide.js";
import { setHijriSource, currentHijri, normalizeHijri, hijriLabel, hijriParts, calendarAvailable, calcParts, CALENDARS, HIJRI_MONTHS } from "../hijri.js";
import { COMMITTEES, committeeById, committeeData, regionCache, editorMonths, plausibleStart, monthId } from "../hijri-committees.js";
import { hijriEditors, refreshHijriCommittee, saveCommitteeMonth } from "../cloud.js";
import { setCrashReporting } from "../crash.js";
import { TEXT_SIZES, AR_SIZES, textSizeIndex, arSizeIndex, setSize, applyScales } from "../appearance.js";
import { plusPage } from "./plus.js";
import { goalOf } from "../quran-goal.js";
import { goalSummary } from "./quran-goal.js";
import { QGOAL } from "../strings.js";
import { bandHead, bandCover } from "../band.js";

/* Settings-only labels (strings.js SETTINGS_X). */
const X = SETTINGS_X;

/* ---------- icons (24px outline, IC-O) ---------- */
const P = {
  palette: '<circle cx="13.5" cy="6.5" r="1" /><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 22a10 10 0 1 1 10-10c0 3-2 4-4 4h-2a2 2 0 0 0-1.5 3.3c.6.8.3 2.7-2.5 2.7z"/>',
  toggles: '<rect x="2" y="6" width="20" height="5" rx="2.5"/><rect x="2" y="13" width="20" height="5" rx="2.5"/><circle cx="7" cy="8.5" r=".8"/>',
  book: '<path d="M3 5.5C3 4.7 3.7 4 4.5 4H11v16H4.5A1.5 1.5 0 0 1 3 18.5zM21 5.5c0-.8-.7-1.5-1.5-1.5H13v16h6.5a1.5 1.5 0 0 0 1.5-1.5z"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5"/>',
  pin: '<path d="M12 22s7-6.3 7-12a7 7 0 1 0-14 0c0 5.7 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  refresh: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M9 12l2 2 4-4"/>',
  sunrise: '<path d="M12 3v3M4.2 8.2l2 2M19.8 8.2l-2 2M2 18h3M19 18h3M7 18a5 5 0 0 1 10 0M3 22h18"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  quote: '<path d="M4 17c0-5 1-8 5-10M13 17c0-5 1-8 5-10"/><path d="M4 17h5v-5H4zM13 17h5v-5h-5z"/>',
  chart: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M8 16v-4M12 16V9M16 16v-6"/>',
  cloud: '<path d="M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 9.5 4 4 0 0 1 17.5 18z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  download: '<path d="M12 4v11M7 11l5 5 5-5M4 20h16"/>',
  upload: '<path d="M12 16V5M7 9l5-5 5 5M4 20h16"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  userx: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M17 8l5 5M22 8l-5 5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.01"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17v.01"/>',
  file: '<path d="M6 3h8l5 5v13H6zM14 3v5h5"/>',
  mosque: '<path d="M4 21V11l3-3 3 3v10M14 21V9a3 3 0 0 1 6 0v12M2 21h20M7 8V5"/>',
  user: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  heart: '<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/>',
  bars: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
  grid: '<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><path d="M17.25 13.5v7.5M13.5 17.25H21"/>',
  half: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
  chev: '<path d="M9 6l6 6-6 6"/>',
  leaf: '<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19c3-4 6-7 10-9"/>',
  play: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5l5 3.5-5 3.5z"/>',
  checkc: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M13.5 13.2a3 3 0 1 0 0 5.4 3.6 3.6 0 0 1 0-5.4z"/>',
};
const svg = (k, cls = "") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[k]}</svg>`;
const FEATURE_ICON = { prayers: "mosque", sunnah: "layers", deeds: "heart", makeups: "refresh", week: "chart", progress: "bars", tools: "grid" };
const TOOL_ICON = { adhkar: "sun", durud: "heart", hizb: "book", quran: "book", manzil: "shield", afterSalah: "sun" };

/* ---------- row building blocks ---------- */
const tile = (icon, tone = "gold") => `<span class="ic ${tone}">${svg(icon)}</span>`;
const sw = (key, on, label, fn = `A.toggle('${key}')`) => `<button class="switch${on ? " on" : ""}" role="switch" aria-checked="${on}" aria-label="${esc(label)}" onclick="${fn}"></button>`;
/** A navigation row: icon tile, title (+ optional ⓘ), subtitle, trailing value and chevron. */
function navRow({ icon, title, sub = "", value = "", onclick, tone = "gold", id = "", gl = "", danger = false, tag = "" }) {
  return `<div class="srow${danger ? " danger" : ""}" ${id ? `id="${id}"` : ""}><button class="srow-main" onclick="${onclick}">${tile(icon, danger ? "red" : tone)}<span class="t"><b>${esc(title)}${tag ? `<em class="newtag">${esc(tag)}</em>` : ""}</b>${sub ? `<small>${esc(sub)}</small>` : ""}</span>${value ? `<span class="val">${esc(value)}</span>` : ""}<span class="chev" aria-hidden="true">${svg("chev")}</span></button>${gl}</div>`;
}
function switchRow({ icon, title, sub = "", key, on, tone = "gold", tag = "", gl = "", extra = "", fn }) {
  return `<div class="srow"><div class="srow-main static">${tile(icon, tone)}<span class="t"><b>${esc(title)}${tag ? `<em class="newtag">${esc(tag)}</em>` : ""}${gl}</b>${sub ? `<small>${esc(sub)}</small>` : ""}</span>${sw(key, on, title, fn)}</div>${extra}</div>`;
}
const group = (title, rows, foot = "") => `<section class="sgroup"><h2>${esc(title)}</h2><div class="card scard">${rows.join("")}</div>${foot ? `<p class="sfoot">${esc(foot)}</p>` : ""}</section>`;
/** A sub-page header: "‹ Settings" (or "‹ Help & tour" inside Help), then the page title. */
// Both sit in the time-of-day band (band.js, css/band.css), with a cover behind the status bar once the page scrolls.
const head = (title, back = "A.settingsBack()") => bandCover() + bandHead({ title, back, backLabel: HELP_SUBS.includes(page) ? GUIDE.helpTitle : T.title, cls: "shead" });
/** The main page's header: "Done" at the top right (back to where Settings was opened), then "Settings". */
const mainHead = () => bandCover() + bandHead({ title: T.title, cls: "shead main", right: `<button type="button" class="zb-done sdone" onclick="A.settingsDone()">${esc(COMMON.done)}</button>` });
const HELP_SUBS = ["hStatus", "hMakeups"];

/* ---------- page state ---------- */
let page = "main"; // "main" | "features" | "sunnah" | "appearance" | "plus" | "help" | "hStatus" | "hMakeups" (Help & tour, views/help.js)
let backTo = ""; // "tools" when the Features page was opened from the Tools hub
A.settingsPage = p => { page = p; backTo = ""; $("#screen").scrollTop = 0; UI.settingsPage = p; renderSettings(); };
A.settingsBack = () => { if (backTo) { const v = backTo; backTo = ""; page = "main"; A.go(v); } else if (page === "hStatus" || page === "hMakeups") A.settingsPage("help"); else if (page !== "main") A.settingsPage("main"); else A.settingsDone(); };
/** From the Tools hub: open Settings → Features, scrolled to the Tools section. Back returns to Tools. */
A.settingsTools = () => {
  A.go("settings"); A.settingsPage("features"); backTo = "tools";
  const el = document.getElementById("set-tools"), scr = $("#screen");
  if (el && scr) scr.scrollTop = Math.max(0, el.getBoundingClientRect().top - scr.getBoundingClientRect().top + scr.scrollTop - 12);
};

/* ---------- switches ---------- */
A.toggle = async k => {
  const on = !S.settings[k];
  if (k === "lock" && on) {
    if (!(await biometryAvailable())) { toast(T.noBiometry); return; }
    try { await authenticate(); } catch (e) { toast(T.notTurnedOn); return; }
  }
  S.settings[k] = on;
  commit();
};
/* Crash reports are opt-in: only S.settings.crashReports === true is on (undefined = not asked = off); see src/crash.js */
A.crashToggle = () => {
  const on = S.settings.crashReports !== true;
  S.settings.crashReports = on;
  setCrashReporting(on);
  commit();
  toast(on ? T.crashReportsOnToast : T.crashReportsOffToast);
};
/* Settings → Widgets: plain booleans (off by default). The Now notification needs notification permission first. */
A.widgetToggle = async k => {
  if (!["showTimesOnly", "ongoingNow", "lockDots"].includes(k)) return;
  const on = S.settings[k] !== true;
  if (k === "ongoingNow" && on && !(await requestNotifications())) { toast(X.notifDenied); return; }
  S.settings[k] = on;
  commit();
  refreshWidgets().catch(e => console.warn("widgets", e));
};
/** Android: ask the system to add the Quick Settings tile (13+), or show the manual steps on older Android. */
A.addTile = async () => {
  const r = await addTile();
  if (!r) return;
  if (r.unsupported) openSheet(`<h3>${esc(X.tileStepsTitle)}</h3><p>${esc(X.tileSteps)}</p><div class="cta"><button class="btn primary" onclick="A.closeSheet()">${esc(COMMON.gotIt)}</button></div>`);
  else if (r.added) toast(X.tileAdded);
};
A.setLead = m => { S.settings.leadMin = +m; commit(); toast(T.leadToast(m)); };
A.featToggle = f => { feat.setFeature(S, f, !feat.isOn(S, f)); commit(); };
A.toolToggle = t => { feat.setToolHidden(S, t, feat.toolRows(S).find(r => r.id === t).visible); commit(); };

/* ---------- appearance: Mode, Text size, Arabic text size (a page; mockup final/og/og-appearance-*) ---------- */
// No theme picker: one theme (OG Calm), light and dark. Sizes live in src/appearance.js (CSS variables on <html>).
A.appearanceSheet = () => A.settingsPage("appearance"); // older callers
A.setAppearance = k => { if (!["system", "light", "dark"].includes(k)) return; S.settings.appearance = k; commit(); };
/** A size slider moved: apply it live (no redraw, so the drag isn't interrupted); save = true on release. */
A.setSize = (kind, v, save = false) => {
  const i = setSize(S, kind, v), n = (kind === "ar" ? AR_SIZES : TEXT_SIZES).length;
  applyScales(S);
  const el = document.getElementById(kind === "ar" ? "apAr" : "apText");
  if (el) { el.style.setProperty("--p", `${(i / (n - 1)) * 100}%`); el.setAttribute("aria-valuetext", X.sizeOf(i + 1, n)); }
  if (save) commit();
};
function sizeSlider(kind, i, n, label, lo, hi, cls = "") {
  return `<div class="ap-row"><span class="ap-a s ${cls}" aria-hidden="true">${lo}</span><input type="range" class="ap-range" id="${kind === "ar" ? "apAr" : "apText"}" min="0" max="${n - 1}" step="1" value="${i}" style="--p:${(i / (n - 1)) * 100}%" aria-label="${esc(label)}" aria-valuetext="${esc(X.sizeOf(i + 1, n))}" oninput="A.setSize('${kind}',this.value)" onchange="A.setSize('${kind}',this.value,true)"><span class="ap-a l ${cls}" aria-hidden="true">${hi}</span></div>`;
}
function appearancePage() {
  const cur = S.settings.appearance || "system";
  const opt = k => `<button class="${cur === k ? "on" : ""}" role="radio" aria-checked="${cur === k}" onclick="A.setAppearance('${k}')">${esc(T.appearanceOpts[k])}</button>`;
  const asr = fmt12(timesFor(NOW(), S.settings).Asr);
  return `${head(T.appearance)}<div class="ap">
    <p class="ap-lab" id="apModeL">${esc(T.mode)}</p><div class="ap-seg" role="radiogroup" aria-labelledby="apModeL">${opt("system")}${opt("light")}${opt("dark")}</div>
    ${cur === "system" ? `<p class="sfoot">${esc(X.appearanceFollow(systemIsDark()))}</p>` : ""}
    <p class="ap-lab">${esc(X.textSize)}</p><div class="card ap-card">${sizeSlider("text", textSizeIndex(S), TEXT_SIZES.length, X.textSize, "A", "A")}
      <p class="ap-smp">${esc(prayerName("Asr"))} · ${esc(asr)}<small>${esc(X.textSizeNote)}</small></p></div>
    <p class="ap-lab">${esc(X.arSize)}</p><div class="card ap-card">${sizeSlider("ar", arSizeIndex(S), AR_SIZES.length, X.arSize, "ع", "ع", "ar-a")}
      <p class="ar ap-arsample" lang="ar" dir="rtl">${esc(GUIDE.previewAr)}</p><p class="ap-smp"><small>${esc(X.arSizeNote)}</small></p></div>
  </div><div class="space"></div>`;
}

/* ---------- set up for (brother / sister, store.applyGender) ---------- */
const genderVal = g => (g === "f" ? GENDER.sister : g === "m" ? GENDER.brother : GENDER.notSet);
A.genderSheet = () => {
  const g = store.genderOf(S), cur = g || "n";
  const opt = (k, t) => `<button class="gopt${k === cur ? " on" : ""}" role="radio" aria-checked="${k === cur}" onclick="A.setGender('${k}')"><span class="rd"></span><span><b>${esc(t)}</b><small>${esc(GENDER.optSub[k])}</small></span></button>`;
  openSheet(`<div class="gs"><div class="sheet-head"><h3>${esc(GENDER.sheetTitle)}</h3><button class="link-btn" onclick="A.closeSheet()">${esc(COMMON.done)}</button></div>
    <p>${esc(GENDER.sheetLead)}</p>
    <div role="radiogroup" aria-label="${esc(GENDER.sheetTitle)}">${opt("f", GENDER.sister)}${opt("m", GENDER.brother)}${opt("n", GENDER.skip)}</div>
    <div class="gbox"><h4>${esc(GENDER.boxTitle[cur])}</h4>${GENDER.box[cur].map(([a, b]) => `<div><span>${esc(a)}</span><span>${esc(b)}</span></div>`).join("")}</div>
    <p class="note">${esc(GENDER.note)}</p></div>`);
};
A.setGender = k => {
  const g = k === "f" || k === "m" ? k : null;
  if (g === store.genderOf(S)) return; // same choice: leave the switches as the user set them
  // A brother in excused mode: end it like Home's "End" button (prayers already started today stay excused)
  const now = NOW();
  store.applyGender(S, g, { todayKey: dkey(now), excusedPrayers: excusedSoFar(now, S.settings) }, now);
  commit(); A.genderSheet(); toast(GENDER.setToast[g || "n"]);
};
// The Jumuʿah and travel switches use A.toggle: both settings are always stored as true/false (defaultState
// and normalize), so flipping !S.settings[k] is the same as their old "=== false" toggles.

/* ---------- location ---------- */
/* Current location is the default way (19 Nov 2026): what Zad uses now, "Use my location" as the main action and
   "Update location when I travel" with it; choosing a city is the fallback, a small link underneath that opens
   the search. Also opened by the Qibla page's "Change" (A.openLocation). */
let cityOpen = false;
/** The words for what the location is now (travel.locationSummary). */
function locStatus(s) {
  return s.kind === "gps" ? T.locGps(s.label) : s.kind === "city" ? T.locCity(s.label) : s.kind === "unknown" ? T.locOld(s.label) : T.locNone(FALLBACK_LOCATION.label);
}
A.locationSheet = (city = false) => {
  cityOpen = !!city;
  const s = locationSummary(S.settings), st = S.settings;
  const travel = s.kind === "gps" ? `<div class="locsw"><span class="t"><b>${esc(TRAVEL.row)}</b><small>${esc(TRAVEL.rowSub)}</small></span>${sw("autoLocation", st.autoLocation !== false, TRAVEL.row, "A.locTravel()")}</div>` : "";
  const cityPart = cityOpen
    ? `<div class="field"><label for="cityIn">${esc(T.orSearch)}</label><div style="display:flex;gap:8px"><input id="cityIn" placeholder="${esc(T.cityPlaceholder)}" onkeydown="if(event.key==='Enter')A.findCity()"><button class="btn ghost" style="flex:none;padding:12px 16px" onclick="A.findCity()">${esc(COMMON.search)}</button></div></div>
  <div class="results" id="cityResults"></div>`
    : `<p class="loccity"><button type="button" class="link" id="locCityLink" onclick="A.locationSheet(true)">${esc(T.chooseCity)}</button></p>`;
  openSheet(`<h3>${esc(T.location)}</h3><div class="locnow ${s.kind}">${svg("pin")}<span>${esc(locStatus(s))}</span></div>
  <div class="cta"><button class="btn primary" id="locGps" onclick="A.useGps()">${esc(s.kind === "gps" ? T.updateMyLocation : T.useMyLocationShort)}</button></div>
  ${travel}${cityPart}
  <p class="note">${esc(T.locNote)}</p>`);
  if (cityOpen) $("#cityIn")?.focus();
};
A.locTravel = () => { S.settings.autoLocation = S.settings.autoLocation === false; commit(); A.locationSheet(cityOpen); };
A.useGps = async () => {
  toast(T.finding);
  try {
    const { lat, lng } = await currentPosition();
    const label = await cityName(lat, lng);
    S.settings.location = { lat, lng, label, source: "gps" };
    S.settings.autoLocation = true; // current location: prayer times follow you (switch it off in the sheet)
    closeSheet(); commit(); toast(T.locSetToast(label));
  } catch (e) { toast(T.locFailed); }
};
let found = [];
A.findCity = async () => {
  const q = $("#cityIn").value.trim(); if (!q) return;
  const box = $("#cityResults");
  box.innerHTML = `<div class="note">${esc(T.searching)}</div>`;
  try { found = await searchCity(q); } catch (e) { found = []; box.innerHTML = `<div class="note">${esc(T.searchFailed)}</div>`; return; }
  box.innerHTML = found.length ? found.map((r, i) => `<button class="opt" onclick="A.pickCity(${i})"><div><b>${esc(r.label)}</b><small>${r.lat.toFixed(3)}, ${r.lng.toFixed(3)}</small></div></button>`).join("") : `<div class="note">${esc(T.noMatches)}</div>`;
};
// A searched city is a fixed choice: source "city" turns off the travel check (src/travel.js)
A.pickCity = i => { S.settings.location = { ...found[i], source: "city" }; closeSheet(); commit(); toast(T.locSetToast(found[i].label)); };

/* ---------- calculation method, ʿAsr ---------- */
A.methodSheet = () => openSheet(`<h3>${esc(T.method)}</h3><p>${esc(T.methodLead)}</p><div class="opts">
  ${Object.entries(METHODS).map(([k, v]) => `<button class="opt ${S.settings.method === k ? "sel" : ""}" onclick="A.setMethod('${k}')"><div><b>${esc(v)}</b></div></button>`).join("")}</div>`);
A.setMethod = k => { S.settings.method = k; S.settings.methodChosen = true; closeSheet(); commit(); toast(ASR_UI.updated); };
A.asrSheet = () => openSheet(`<h3>${esc(ASR_UI.title)}</h3><p>${esc(ASR_UI.lead)}</p><div class="opts">
  <button class="opt ${S.settings.asr === "shafi" ? "sel" : ""}" onclick="A.setAsrOpt('shafi')"><div><b>${esc(ASR_UI.standard)}</b><small>${esc(ASR_UI.standardSub)}</small></div></button>
  <button class="opt ${S.settings.asr === "hanafi" ? "sel" : ""}" onclick="A.setAsrOpt('hanafi')"><div><b>${esc(ASR_UI.hanafi)}</b><small>${esc(ASR_UI.hanafiSub)}</small></div></button></div>
  <p class="note">${esc(X.asrFollows)}</p>`);
A.setAsrOpt = v => { store.setAsr(S, v); closeSheet(); commit(); toast(ASR_UI.updated); };


/* ---------- Hijri date (S.settings.hijri = { method, committee, adjust }) ---------- */
// No saved choice yet: the region default (CHC in the US and Canada, Umm al-Qura elsewhere).
setHijriSource(() => S.settings.hijri || { ...hijriRegion(), adjust: 0 });
const H = {
  title: "Hijri date",
  lead: "How Zad works out today's Hijri date. Moon sighting can differ from the calendar by a day.",
  today: "Today",
  calcGroup: "Calculated", committeeGroup: "Follow a moon-sighting committee",
  methods: { umalqura: ["Umm al-Qura", "The Saudi calendar. Works offline."], civil: ["Civil (tabular)", "A fixed 30/29-day pattern. Works offline."], tbla: ["Astronomical tabular", "Fixed pattern with the astronomical epoch. Works offline."] },
  committeeSub: "One decision per month, shared with everyone who follows it.",
  suggested: "Suggested", defaultTag: "Default",
  adjustTitle: "Adjust by days", adjustNote: "Applies on top of the method above. Use it if your community started the month a day earlier or later.",
  srcCommittee: n => "From " + n, srcFallback: n => n + " has no decision for this month yet. Using the calculated date plus its last difference.", srcNone: n => "No data from " + n + " yet. Using the calculated date.",
  needSignIn: "Sign in (Settings → Cloud backup) to fetch the latest decisions. Saved decisions work offline.",
  editorRow: "Update this month's start",
  edTitle: "Update this month's start", edLead: "Pick the Gregorian date of the 1st of the month, as decided by the committee.",
  edMonth: "Month", edDate: "Date of the 1st", edNote: "Note (optional)", edSaved: "Month start saved", edFailed: "Couldn't save. Check your connection.", edBad: "That date is more than 3 days from the calculated start. Check it.", edNeedDate: "Pick a date.",
  edUnavailable: "This device can't work out today's Hijri date, so the month to update can't be chosen here.",
};
const hijriSummary = () => {
  const h = currentHijri();
  const base = h.method === "committee" ? (committeeById(h.committee)?.short || "Committee") : H.methods[h.method][0];
  return h.adjust ? `${base}, ${h.adjust > 0 ? "+" : "−"}${Math.abs(h.adjust)}` : base;
};
// worked out once per session (it backs every Hijri label until a method is picked); re-read on return to the app
const REGION = regionCache(() => ({ lang: navigator.language || "", tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "" }));
const hijriRegion = () => REGION.get();
if (typeof document !== "undefined") document.addEventListener("visibilitychange", () => { if (!document.hidden) REGION.reset(); });
function hijriSourceNote() {
  const h = currentHijri();
  if (h.method !== "committee") return "";
  const c = committeeById(h.committee), name = c?.short || "the committee", p = hijriParts(new Date());
  if (!Object.keys(committeeData(h.committee).months).length) return H.srcNone(name);
  return p?.source === "committee" ? H.srcCommittee(name) : H.srcFallback(name);
}
A.hijriSheet = (fetch = true) => {
  const h = currentHijri(), sug = hijriRegion();
  const opt = (title, sub, sel, onclick, tag = "") => `<button class="opt mopt ${sel ? "sel" : ""}" role="radio" aria-checked="${sel}" onclick="${onclick}"><div><b>${esc(title)}${tag ? `<em class="deftag">${esc(tag)}</em>` : ""}</b><small>${esc(sub)}</small></div><span class="radio${sel ? " on" : ""}"></span></button>`;
  const calcs = Object.keys(CALENDARS).filter(m => m === "umalqura" || calendarAvailable(m)).map(m => opt(H.methods[m][0], H.methods[m][1], h.method === m, `A.setHijri('${m}')`, m === "umalqura" && sug.method !== "committee" ? H.defaultTag : ""));
  const coms = COMMITTEES.map(c => { const on = h.method === "committee" && h.committee === c.id; return opt(c.name, on ? hijriSourceNote() || H.committeeSub : H.committeeSub, on, `A.setHijriCommittee('${c.id}')`, sug.committee === c.id ? H.defaultTag : ""); });
  const adj = [-2, -1, 0, 1, 2].map(n => `<button class="${h.adjust === n ? "on" : ""}" aria-pressed="${h.adjust === n}" onclick="A.setHijriAdjust(${n})">${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n)}</button>`).join("");
  const editor = h.method === "committee" && cloud.user && hijriEditors[h.committee];
  openSheet(`<div id="hijriSheetMark"></div><div class="sheet-head"><h3>${esc(H.title)}</h3><button class="link-btn" onclick="A.closeSheet()">${esc(COMMON.done)}</button></div>
    <p>${esc(H.lead)}</p>
    <p class="follow"><i></i>${esc(H.today)} · <b>${esc(hijriLabel(new Date()))}</b></p>
    <h4 class="hj-h">${esc(H.calcGroup)}</h4><div class="opts" role="radiogroup" aria-label="${esc(H.calcGroup)}" style="margin-top:8px">${calcs.join("")}</div>
    <h4 class="hj-h">${esc(H.committeeGroup)}</h4><div class="opts" role="radiogroup" aria-label="${esc(H.committeeGroup)}" style="margin-top:8px">${coms.join("")}</div>
    ${h.method === "committee" && !cloud.user ? `<p class="note">${esc(H.needSignIn)}</p>` : ""}
    ${editor ? `<div class="cta"><button class="btn ghost" onclick="A.hijriEditorSheet()">${esc(H.editorRow)}</button></div>` : ""}
    <h4 class="hj-h">${esc(H.adjustTitle)}</h4><div class="seg" role="group" aria-label="${esc(H.adjustTitle)}" style="margin:8px 0 0">${adj}</div>
    <p class="note">${esc(H.adjustNote)}</p>`);
  $("#sheet").querySelectorAll(".hj-h").forEach(e => { e.style.cssText = "margin:18px 0 0;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink2)"; });
  if (fetch && h.method === "committee" && cloud.user) refreshHijriCommittee(h.committee).then(ok => { if (ok && $("#hijriSheetMark")) A.hijriSheet(false); });
};
function saveHijri(patch) { S.settings.hijri = normalizeHijri({ ...currentHijri(), ...patch }); commit(); A.hijriSheet(false); }
A.setHijri = m => saveHijri({ method: m });
A.setHijriCommittee = id => { saveHijri({ method: "committee", committee: id }); if (cloud.user) refreshHijriCommittee(id).then(ok => { if (ok && $("#hijriSheetMark")) A.hijriSheet(false); }); };
A.setHijriAdjust = n => saveHijri({ adjust: n });

/* Editors only: "Update this month's start" */
A.hijriEditorSheet = () => {
  const h = currentHijri(), c = committeeById(h.committee);
  if (h.method !== "committee" || !cloud.user || !hijriEditors[h.committee]) return;
  // the committee's own date for today, without this editor's personal ± adjustment
  const em = editorMonths(hijriParts(new Date(), { ...h, adjust: 0 }));
  if (!em) { openSheet(`<h3>${esc(H.edTitle)}</h3><p>${esc(H.edUnavailable)}</p><div class="cta"><button class="btn primary" onclick="A.hijriSheet(false)">${esc(COMMON.done)}</button></div>`); return; }
  const { t, months } = em, known = committeeData(h.committee).months, cur = known[monthId(t.y, t.m)];
  openSheet(`<h3>${esc(H.edTitle)}</h3><p>${esc(c.name)}. ${esc(H.edLead)}</p>
    <div class="field"><label for="hjMonth">${esc(H.edMonth)}</label><select id="hjMonth" onchange="A.hijriEdMonth()">${months.map(x => `<option value="${x.y}-${x.m}" ${x === t ? "selected" : ""}>${esc(HIJRI_MONTHS[x.m - 1])} ${x.y}</option>`).join("")}</select></div>
    <div class="field"><label for="hjDate">${esc(H.edDate)}</label><input id="hjDate" type="date" value="${esc(cur?.startDate || "")}"></div>
    <div class="field"><label for="hjNote">${esc(H.edNote)}</label><input id="hjNote" maxlength="200" value="${esc(cur?.note || "")}"></div>
    <div class="cta"><button class="btn ghost" onclick="A.hijriSheet(false)">${esc(COMMON.cancel)}</button><button class="btn primary" onclick="A.hijriEdSave()">${esc(COMMON.save)}</button></div>`);
};
A.hijriEdMonth = () => {
  const [y, m] = $("#hjMonth").value.split("-").map(Number), v = committeeData(currentHijri().committee).months[monthId(y, m)];
  $("#hjDate").value = v?.startDate || ""; $("#hjNote").value = v?.note || "";
};
A.hijriEdSave = async () => {
  const h = currentHijri(), [y, m] = $("#hjMonth").value.split("-").map(Number), date = $("#hjDate").value;
  if (!date) { toast(H.edNeedDate); return; }
  if (!plausibleStart(date, y, m, n => calcParts(n, CALENDARS.umalqura))) { toast(H.edBad); return; }
  try { await saveCommitteeMonth(h.committee, y, m, date, $("#hjNote").value.trim()); closeSheet(); commit(); toast(H.edSaved); }
  catch (e) { console.warn("hijri save", e); toast(H.edFailed); }
};

/* ---------- madhhab (sheet) ---------- */
function madhhabList(onpick, cur) {
  return `<div class="opts">${madhhabOptions().map(o => `<button class="opt mopt ${cur === o.id ? "sel" : ""}" role="radio" aria-checked="${cur === o.id}" onclick="${onpick}('${o.id}')"><div><b>${esc(o.name)}${o.isDefault ? `<em class="deftag">${esc(MADHHAB_UI.defaultTag)}</em>` : ""}</b><small>${esc(o.summary)}</small></div><span class="radio${cur === o.id ? " on" : ""}"></span></button>`).join("")}</div>`;
}
A.madhhabSheet = () => {
  openSheet(`<div class="sheet-head"><h3>${esc(MADHHAB_UI.title)} ${glossBtn("madhhab")}</h3><button class="link-btn" onclick="A.closeSheet()">${esc(COMMON.done)}</button></div>
    <p>${esc(MADHHAB_UI.lead)}</p>${madhhabList("A.pickMadhhab", madhhabOf(S))}<p class="note">${esc(MADHHAB_UI.fine)}</p>`);
};
A.pickMadhhab = m => { store.setMadhhab(S, m); commit(); toast(MADHHAB_UI.changed(m)); A.madhhabSheet(); };

/* one-time question for users migrated from the old ʿAsr default (settings.madhhabAsk) */
A.madhhabAskSheet = () => {
  openSheet(`<h3>${esc(MADHHAB_UI.askTitle)}</h3><p>${esc(MADHHAB_UI.askLead)}</p>
    <div class="cta"><button class="btn ghost" onclick="A.madhhabAskChoose()">${esc(MADHHAB_UI.askChoose)}</button><button class="btn primary" onclick="A.madhhabAskKeep()">${esc(MADHHAB_UI.askKeep)}</button></div>`);
};
A.madhhabAskKeep = () => { store.answerMadhhabAsk(S, "hanafi"); closeSheet(); commit(); };
A.madhhabAskChoose = () => {
  openSheet(`<h3>${esc(MADHHAB_UI.title)}</h3><p>${esc(MADHHAB_UI.lead)}</p>${madhhabList("A.madhhabAskPick", "hanafi")}`);
};
A.madhhabAskPick = m => { store.answerMadhhabAsk(S, m); closeSheet(); commit(); toast(MADHHAB_UI.changed(m)); };
let askShown = false;
function maybeAsk() {
  if (askShown || !S.settings.madhhabAsk || !S.profile.onboarded || UI.view === "onboard") return;
  if ($("#scrim").classList.contains("on") || !$("#lock").hidden) return;
  askShown = true;
  setTimeout(() => { if (S.settings.madhhabAsk && !$("#scrim").classList.contains("on")) A.madhhabAskSheet(); else askShown = false; }, 400);
}

/* Excused days: the calendar sheet (A.excusedCal) is defined by views/home.js (T-A). The row below opens it. */

/* ---------- Good Deeds list editor ---------- */
let draft = [];
A.amalListSheet = () => { draft = S.amalList.map(a => ({ ...a })); drawDeedsEditor(); };
function drawDeedsEditor() {
  openSheet(`<h3>${esc(X.deeds)}</h3><p>${esc(X.deedsLead)}</p><div style="margin-top:12px">
  ${draft.map((a, i) => `<div class="edrow"><input value="${esc(a.name)}" oninput="A.edName(${i},this.value)" aria-label="${esc(X.profileTitle)}"><button onclick="A.edMove(${i},-1)" ${i === 0 ? "disabled" : ""} aria-label="${esc(X.move)} ↑">↑</button><button onclick="A.edMove(${i},1)" ${i === draft.length - 1 ? "disabled" : ""} aria-label="${esc(X.move)} ↓">↓</button><button class="del" onclick="A.edDel(${i})" aria-label="${esc(X.remove)}">✕</button></div>`).join("") || `<div class="note">${esc(X.deedsEmpty)}</div>`}
  </div><div class="edadd"><input id="edNew" placeholder="${esc(X.deedPlaceholder)}" onkeydown="if(event.key==='Enter')A.edAdd()" aria-label="${esc(X.deedPlaceholder)}"><button class="btn ghost" onclick="A.edAdd()">${esc(X.deedAdd)}</button></div>
  <div class="edtype"><label for="edType">${esc(DEEDS.whenCheck)}</label><select id="edType"><option value="none">${esc(DEEDS.typeNone)}</option><option value="note">${esc(DEEDS.typeNote)}</option><option value="count">${esc(DEEDS.typeCount)}</option></select></div>
  <div class="cta"><button class="btn ghost" onclick="A.closeSheet()">${esc(COMMON.cancel)}</button><button class="btn primary" onclick="A.edSave()">${esc(COMMON.save)}</button></div>`);
}
A.edName = (i, v) => { draft[i].name = v; };
A.edMove = (i, d) => { const [x] = draft.splice(i, 1); draft.splice(i + d, 0, x); drawDeedsEditor(); };
A.edDel = i => { draft.splice(i, 1); drawDeedsEditor(); };
A.edAdd = () => {
  const v = $("#edNew").value.trim(); if (!v) return;
  const type = $("#edType")?.value;
  draft.push({ id: "c" + Date.now().toString(36), name: v, hint: "", detail: ["note", "count"].includes(type) ? type : "none" });
  drawDeedsEditor();
};
A.edSave = () => { S.amalList = draft.filter(a => a.name.trim()).map(a => ({ ...a, name: a.name.trim() })); closeSheet(); commit(); toast(X.deedsSaved); };

/* ---------- account ---------- */
A.nameSheet = () => openSheet(`<h3>${esc(T.yourName)}</h3><p>${esc(T.nameLead)}</p>
  <div class="field"><input id="nameIn" value="${esc(S.profile.name)}" placeholder="${esc(T.namePlaceholder)}" aria-label="${esc(T.yourName)}"></div>
  <div class="cta"><button class="btn ghost" onclick="A.closeSheet()">${esc(COMMON.cancel)}</button><button class="btn primary" onclick="A.saveName()">${esc(COMMON.save)}</button></div>`);
A.saveName = () => { S.profile.name = $("#nameIn").value.trim(); closeSheet(); commit(); };

const csvCell = v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
A.exportCsv = async () => {
  const rows = [X.csvHead];
  const deedName = id => S.amalList.find(a => a.id === id)?.name || DEED_NAME[id] || id;
  for (const key of Object.keys(S.days).sort()) {
    const d = S.days[key];
    for (const p of PRAYERS) { const s = store.prayerStatus(S, key, p); rows.push([key, X.csvPrayer, prayerName(p), s ? STATUS[s] : T.csvNotLogged, ""]); }
    if (d.witr) rows.push([key, X.csvWitr, "Witr", WITR_STATUS[d.witr] || d.witr, ""]);
    if (d.excused) rows.push([key, X.csvExcused, "", "", ""]);
    for (const [id, v] of Object.entries(d.amal || {})) rows.push([key, X.csvDeed, deedName(id), v.done ? T.csvDone : "", v.detail || ""]);
    if (d.note) rows.push([key, X.csvNote, "", "", d.note]);
  }
  for (const [ym, v] of Object.entries(S.qada.monthLog)) rows.push([ym, T.csvMadeUp, X.csvPrayers, v.prayers, ""], [ym, T.csvMadeUp, X.csvFasts, v.fasts, ""]);
  try { await saveFile(`${X.csvFile}-${new Date().toISOString().slice(0, 10)}.csv`, rows.map(r => r.map(csvCell).join(",")).join("\n"), "text/csv"); }
  catch (e) { toast(T.exportCancelled); }
};
A.backup = async () => {
  try { await saveFile(`${X.csvFile}-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(S, null, 1), "application/json"); }
  catch (e) { toast(T.backupCancelled); }
};
A.restore = async () => {
  const text = await pickFile("application/json,.json");
  if (!text) return;
  try {
    const data = JSON.parse(text);
    if (!data.days || !data.qada) throw new Error("not a backup");
    replaceState(store.normalize(data));
    toast(T.restored);
  } catch (e) { toast(T.badBackup); }
};
A.resetSheet = () => openSheet(`<h3>${esc(T.resetTitle)}</h3><p>${esc(T.resetBody(!!cloud.user))}</p>
  <div class="cta"><button class="btn ghost" onclick="A.closeSheet()">${esc(COMMON.cancel)}</button><button class="btn danger" onclick="A.reset()">${esc(T.resetGo)}</button></div>`);
A.reset = async () => {
  closeSheet();
  if (cloud.user) await signOut().catch(() => {});
  replaceState(store.defaultState());
  A.startOnboarding();
};

/* ---------- cloud backup ---------- */
function ago(t) {
  if (!t) return T.ago.notYet;
  const m = Math.round((Date.now() - t) / 60000);
  return m < 1 ? T.ago.justNow : m < 60 ? T.ago.min(m) : m < 1440 ? T.ago.h(Math.round(m / 60)) : T.ago.days(Math.round(m / 1440));
}
function cloudStatus() {
  if (!cloud.user) return T.cloudOff;
  if (cloud.deletePending === cloud.user.uid) return T.cloudPaused(cloud.user.email);
  if (cloud.consentNeeded) return CONSENT.pausedStatus(cloud.user.email);
  if (cloud.syncing) return T.cloudSyncing(cloud.user.email);
  return T.cloudOn(cloud.user.email, cloud.error || T.synced(ago(cloud.lastSync)));
}
A.cloudSheet = () => {
  if (!cloud.user) { openSheet(signInSheetHtml()); return; } // c1: consent block, unticked box, Google + Apple
  if (cloud.consentNeeded) { A.consentSheet(); return; } // c3: signed in, sync paused until Continue
  if (cloud.deletePending === cloud.user.uid) {
    openSheet(`<h3>${esc(T.cloud)}</h3><p>${esc(T.deletePausedBody(cloud.user.email))}</p>
    <div class="cta"><button class="btn danger" onclick="A.deleteSheet()">${esc(T.deleteGo)}</button></div>
    <div class="cta"><button class="btn ghost" onclick="A.cloudSignOut()">${esc(T.signOut)}</button><button class="btn ghost" onclick="A.keepAccount()">${esc(T.keepAccount)}</button></div>
    <p class="note">${esc(T.keepAccountNote)}</p>`);
    return;
  }
  openSheet(`<h3>${esc(T.cloud)}</h3><p>${esc(T.signedInAs(cloud.user.email))} ${cloud.error ? esc(cloud.error) : esc(T.lastSynced(ago(cloud.lastSync)))}</p>
  <div class="cta"><button class="btn ghost" onclick="A.cloudSignOut()">${esc(T.signOut)}</button><button class="btn primary" onclick="A.cloudSync()">${esc(T.syncNow)}</button></div>
  <p class="note">${esc(T.signOutNote)}</p>`);
};
A.cloudSignIn = async (provider = "google") => {
  if (!consentTicked()) { toast(CONSENT.tickFirst); return; } // the box must be ticked: consent before any upload
  try { await signIn({ provider, consent: true }); closeSheet(); toast(cloud.error || T.signedInToast); }
  catch (e) { console.warn("sign-in", e); toast(signInError(e)); }
};
A.cloudSync = async () => { await sync(); closeSheet(); toast(cloud.error || T.syncedToast); };
A.cloudSignOut = async () => { await signOut(); closeSheet(); toast(T.signedOutToast); };
// Without a current consent keepAccount opens the re-consent sheet instead, and sync isn't back on yet
A.keepAccount = async () => { closeSheet(); if (await keepAccount()) toast(cloud.error || T.syncBackOn); };

/* ---------- terms + data consent: A.consentSheet / A.consentAgree / A.consentLater live in views/consent.js ---------- */

/* ---------- delete account ---------- */
A.deleteSheet = () => {
  if (!cloud.user) return;
  openSheet(`<h3>${esc(T.deleteTitle)}</h3>
  <p>${esc(T.deleteBody1)}</p>
  <p>${esc(T.deleteBody2)}</p>
  <div class="cta"><button class="btn ghost" onclick="A.backup()">${esc(T.backupFirst)}</button></div>
  <label class="chk"><input type="checkbox" id="delLocal"><span><b>${esc(T.alsoClear)}</b><small>${esc(T.alsoClearSub)}</small></span></label>
  <p class="note err" id="delErr" role="alert"></p>
  <div class="cta"><button class="btn ghost" onclick="A.closeSheet()">${esc(COMMON.cancel)}</button><button class="btn danger" id="delGo" onclick="A.deleteAccount()">${esc(T.deleteGo)}</button></div>`);
};
A.deleteAccount = async () => {
  const go = $("#delGo"), err = $("#delErr"), clearLocal = !!$("#delLocal")?.checked;
  if (navigator.onLine === false) { err.textContent = T.offline; return; }
  go.disabled = true; go.textContent = T.deleting; err.textContent = "";
  try { await deleteAccount(); }
  catch (e) {
    console.warn("delete account", e);
    go.disabled = false; go.textContent = T.tryAgain;
    err.textContent = e.step === "auth"
      ? (e.code === "auth/popup-closed-by-user" || e.code === "auth/cancelled-popup-request" || /cancel/i.test(e.message) ? T.delAuthCancelled : T.delAuthFailed)
      : T.delDataFailed;
    toast(e.step === "auth" ? T.delAuthToast : T.delToast);
    return;
  }
  closeSheet();
  if (clearLocal) { replaceState(store.defaultState()); A.startOnboarding(); }
  toast(T.deletedToast);
};

/* ---------- about ---------- */
const link = (page, label) => `<a href="${pageUrl(page)}" target="_blank" rel="noopener">${esc(label)}</a>`;
const links = () => `${link("terms.html", T.terms)} · ${link("privacy.html", T.privacy)}`;
export const APP_VERSION = typeof __APP_VERSION__ === "undefined" ? "dev" : __APP_VERSION__;

/* ---------- on-time reminders (Android 12+) ---------- */
let exactAllowed = null;
async function refreshExact() {
  if (Capacitor.getPlatform() !== "android") return;
  const v = await exactAlarmStatus();
  if (v !== exactAllowed) { exactAllowed = v; renderSettings(); }
}
A.exactAlarms = async () => {
  exactAllowed = await askForExactAlarms();
  renderSettings(); reschedule(S);
  toast(exactAllowed ? T.exactOn : T.exactStillOff);
};
document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshExact(); });

/* ---------- sunnah page ---------- */
const TIER_ORDER = ["muakkadah", "raghibah", "nafilahMuakkadah", "ghayr", "nafl"];
const TIER_GLOSS = { muakkadah: "sunnahMuakkadah", ghayr: "ghayrMuakkadah", nafl: "nafl", raghibah: "raghibah", nafilahMuakkadah: "nafilahMuakkadah" };
function tierBlock(tier, m, on, key) {
  const items = [...catalogue(m).filter(x => x.tier === tier), ...(tier === "nafl" ? DAY_NAFL : [])];
  if (!items.length) return "";
  const tl = tierLabel(tier), rows = [], byP = new Map();
  for (const it of items) { const k = it.jumuah ? "jumuah" : it.prayer || "day"; if (!byP.has(k)) byP.set(k, []); byP.get(k).push(it); }
  for (const [k, its] of byP) {
    const name = k === "jumuah" ? X.jumuahLabel : k === "day" ? X.dayLabel : prayerName(k);
    const chips = its.map(it => `<span class="chip ${tl.display}">${esc(chipLabel(it))}</span>`).join("");
    rows.push(`<div class="trow"><span>${esc(name)}</span><span class="chips">${k === "jumuah" ? `<small>${esc(X.fri)}</small>` : ""}${chips}</span></div>`);
  }
  const sub = tier === "muakkadah" ? X.sunnahMuakkadahLine : tier === "ghayr" ? X.ghayrLine : tier === "nafl" ? X.naflLine : tl.line;
  const locked = !key;
  return `<section class="tier"><div class="tier-h"><div><h2>${esc(tl.name)} ${glossBtn(TIER_GLOSS[tier] || "sunnah")}</h2><p>${esc(sub)}</p></div>${locked ? `<span class="lockic">${svg("lock")}</span>` : sw(key, on, tl.name)}</div>
    <div class="card scard${key && !on ? " dim" : ""}">${rows.join("")}</div></section>`;
}
function sunnahPage() {
  const m = madhhabOf(S), st = S.settings, w = witrLabel(m);
  const tiers = TIER_ORDER.filter(t => [...catalogue(m), ...DAY_NAFL].some(x => x.tier === t));
  return `${head(SUNNAH_UI.pageTitle)}<p class="spage-lead">${esc(SUNNAH_UI.pageIntro(m))}</p>
  ${tiers.map(t => tierBlock(t, m, t === "ghayr" ? st.sunnahGhayr !== false : !!st.sunnahNafl, t === "ghayr" ? "sunnahGhayr" : t === "nafl" ? "sunnahNafl" : "")).join("")}
  <section class="tier"><div class="tier-h"><div><h2>${esc(X.witrHead)} ${glossBtn("witr")}${w.tag ? ` <span class="wtag">${esc(w.tag)}</span>` : ""}</h2><p>${esc(w.settingsLine)}</p></div><span class="lockic">${svg("lock")}</span></div>
  <div class="card scard"><div class="trow"><span>${esc(X.afterIsha)}</span><span class="chips"><span class="chip witr">${esc(w.chip)}${w.tag ? ` · ${esc(w.tag)}` : ""}</span></span></div></div></section><div class="space"></div>`;
}

/* ---------- features page ---------- */
/** Settings → Read: the Qurʾān goal (views/quran-goal.js A.qgSet sets, edits or clears it). */
function qGoalRow() {
  if (!feat.toolVisible(S, "quran")) return "";
  const g = goalOf(S);
  // a plan shows its finish date ("Finish by 9 Mar"); a daily or weekly goal its amount (views/quran-goal.js goalSummary)
  return navRow({ icon: "book", title: QGOAL.settingsRow, sub: goalSummary(g), onclick: "A.qgSet()", tone: g ? "green" : "grey", id: "set-qgoal" });
}
/** Which nafl prayers the Good deeds sheet shows (settings.naflShow; the same switch as the sheet's "Choose"). */
function naflGroupS() {
  if (!feat.isOn(S, "deeds")) return "";
  const cur = S.settings.naflShow || [];
  return `<section class="sgroup" id="set-nafl"><h2>${esc(NAFL.title)}</h2><div class="card scard">${NAFL_ADDON.map(n => { const on = cur.includes(n.key); return `<div class="srow ${on ? "" : "off"}"><div class="srow-main static">${tile("layers", on ? "green" : "grey")}<span class="t"><b>${esc(SUNNAH_NAME[n.key])}</b></span>${sw("nafl-" + n.key, on, SUNNAH_NAME[n.key], `A.naflShowToggle('${n.key}')`)}</div></div>`; }).join("")}</div><p class="sfoot">${esc(NAFL.chooseLead)}</p></section>`;
}
function featuresPage() {
  const rows = feat.featureRows(S).map(r => `<div class="srow ${r.on ? "" : "off"}"><div class="srow-main static">${tile(FEATURE_ICON[r.id], r.on ? "green" : "grey")}<span class="t"><b>${esc(r.name)}</b><small>${esc(r.sub)}</small></span>${r.locked ? `<span class="lockic">${svg("lock")}</span>` : `<button class="switch${r.on ? " on" : ""}" role="switch" aria-checked="${r.on}" aria-label="${esc(r.name)}" onclick="A.featToggle('${r.id}')"></button>`}</div></div>${r.id === "progress" ? pvFeatureRow(tone => `<span class="ic ${tone}">${pvIcon("bag", "")}</span>`) : ""}`).join("");
  const toolsOn = feat.isOn(S, "tools");
  const tools = toolsOn ? `<section class="sgroup" id="set-tools"><h2>${esc(X.toolsHead)}</h2><div class="card scard">${feat.toolRows(S).map(r => `<div class="srow ${r.visible ? "" : "off"}"><div class="srow-main static">${tile(TOOL_ICON[r.id], r.visible ? "green" : "grey")}<span class="t"><b>${esc(r.name)}</b><small>${esc(r.sub)}</small></span><button class="switch${r.visible ? " on" : ""}" role="switch" aria-checked="${r.visible}" aria-label="${esc(r.name)}" onclick="A.toolToggle('${r.id}')"></button></div></div>`).join("")}${qGoalRow()}</div><p class="sfoot">${esc(X.toolsLead)}</p></section>` : "";
  const tabs = feat.navTabs(S);
  // Today · Read · Progress (Community only with Zad Plus). With one tab only there is no bar at all.
  const barIds = ["home", "tools", "progress", ...(feat.plusOn(S) ? ["community"] : [])];
  const bar = `<div class="barprev"><h3>${esc(FEATURE.bottomBar)}</h3><div class="bar-in">${barIds.map(id => `<span class="${tabs.length > 1 && tabs.some(t => t.id === id) ? (id === "home" ? "on" : "") : "gone"}">${svg(id === "home" ? "sun" : id === "tools" ? "book" : id === "community" ? "user" : "bars")}<i>${esc(NAV[id])}</i></span>`).join("")}</div></div>`;
  const { on, of } = feat.featureCount(S);
  return `${head(FEATURE.title)}<p class="spage-lead">${esc(FEATURE.intro)}</p>
  <div class="sec" style="padding-top:0"><div class="card scard">${rows}</div></div>${pvGroup(svg("chev"))}${naflGroupS()}${tools}${bar}<p class="sfoot center">${esc(FEATURE.count(on, of))}</p><div class="space"></div>`;
}

/* ---------- main page ---------- */
function mainPage() {
  const st = S.settings, m = madhhabOf(S), info = madhhabInfo(m);
  const { on, of } = feat.featureCount(S), loc = st.location, name = S.profile.name || "";
  const isOnF = f => feat.isOn(S, f);
  const sunnahTiers = [1, st.sunnahGhayr !== false, st.sunnahNafl].filter(Boolean).length + 0;
  const profile = `<button class="profile card" onclick="A.${cloud.available ? "cloudSheet" : "nameSheet"}()"><span class="avatar">${esc((name[0] || APP.name[0]).toUpperCase())}</span><span class="t"><b>${esc(name || X.profileTitle)}</b>${cloud.available ? `<small><i class="dotg ${cloud.user ? "on" : ""}"></i>${esc(cloud.user ? (cloud.syncing ? T.cloudSyncing(cloud.user.email).replace(/^On · /, "") : T.cloudOn(cloud.user.email, cloud.error || T.synced(ago(cloud.lastSync))).replace(/^On · /, "")) : `${T.cloud} · ${COMMON.off}`)}</small>` : ""}</span><span class="chev">${svg("chev")}</span></button>`;
  const appearanceVal = T.appearanceOpts[st.appearance || "system"];
  const g = [];
  // Zad Plus: one quiet row (its only place besides its own page; no badges, no prompts)
  g.push(`<section class="sgroup plusrow"><div class="card scard">${navRow({ icon: "leaf", title: X.plusRow, sub: X.plusRowSub, onclick: "A.settingsPage('plus')" })}</div></section>`);
  g.push(group(X.general, [
    navRow({ icon: "toggles", title: FEATURE.title, value: FEATURE.count(on, of), onclick: "A.settingsPage('features')" }),
    navRow({ icon: "palette", title: T.appearance, value: appearanceVal, onclick: "A.settingsPage('appearance')" }),
    navRow({ icon: "calendar", title: H.title, value: hijriSummary(), onclick: "A.hijriSheet()" }),
    navRow({ icon: "info", title: GUIDE.helpRow, sub: GUIDE.helpRowSub, tag: helpIsNew(S) ? GUIDE.newTag : "", onclick: "A.helpOpen()" }),
  ]));
  g.push(group(T.groups.prayer, [
    navRow({ icon: "user", tone: "green", title: GENDER.row, value: genderVal(store.genderOf(S)), onclick: "A.genderSheet()" }),
    navRow({ icon: "book", tone: "green", title: MADHHAB_UI.title, sub: info.summary, value: info.name, onclick: "A.madhhabSheet()", gl: "" }),
    switchRow({ icon: "mosque", tone: "green", title: GENDER.jumuah, sub: GENDER.jumuahSub, key: "jumuah", on: st.jumuah !== false }),
    ...(isOnF("sunnah") ? [navRow({ icon: "layers", tone: "green", title: SUNNAH_UI.pageTitle, value: SUNNAH_UI.tiersOn(sunnahTiers), onclick: "A.settingsPage('sunnah')" })] : []),
    navRow({ icon: "pin", tone: "green", title: T.location, value: loc ? loc.label : "", sub: loc ? (loc.source === "gps" ? T.locRowGps : loc.source === "city" ? T.locRowCity : "") : T.locNotSet(FALLBACK_LOCATION.label), onclick: "A.locationSheet()", id: "locRow" }),
    // Only for a location from "Use my current location"; a searched city never changes on its own. An older save
    // that didn't record its source gets a hint (opening the location sheet) instead of the switch.
    ...(loc?.source === "gps" ? [switchRow({ icon: "refresh", tone: "green", title: TRAVEL.row, sub: TRAVEL.rowSub, key: "autoLocation", on: st.autoLocation !== false })]
      : loc?.source === "unknown" ? [navRow({ icon: "refresh", tone: "green", title: TRAVEL.row, sub: TRAVEL.unknownHint, onclick: "A.locationSheet()" })] : []),
    navRow({ icon: "compass", tone: "green", title: T.method, value: METHOD_SHORT[st.method] || st.method, onclick: "A.methodSheet()" }),
    navRow({ icon: "sun", tone: "green", title: ASR_UI.title, value: st.asr === "hanafi" ? ASR_UI.hanafi : ASR_UI.standard, onclick: "A.asrSheet()" }),
    navRow({ icon: "compass", tone: "green", title: T.qiblaRow, sub: T.qiblaRowSub, value: qiblaDegrees(loc) == null ? "" : `${qiblaDegrees(loc)}°`, onclick: "A.openQibla()", id: "qiblaRow" }),
  ]));
  const lead = [5, 10, 15, 30].map(x => `<button class="${+st.leadMin === x ? "on" : ""}" aria-pressed="${+st.leadMin === x}" onclick="A.setLead(${x})">${esc(COMMON.minutes(x))}</button>`).join("");
  // Widgets (phone app only): plain switches, off by default; the widgets pick them up from the snapshot
  const plat = Capacitor.getPlatform();
  if (plat === "android" || plat === "ios") g.push(group(X.widgetsHead, [
    switchRow({ icon: "lock", title: X.showTimesOnly, sub: X.showTimesOnlySub, key: "showTimesOnly", on: st.showTimesOnly === true, fn: "A.widgetToggle('showTimesOnly')" }),
    ...(plat === "android" ? [`<div class="srow"><div class="srow-main static">${tile("toggles")}<span class="t"><b>${esc(X.tile)}</b><small>${esc(X.tileSub)}</small></span><button type="button" class="tileadd" onclick="A.addTile()">${esc(X.tileAdd)}</button></div></div>`] : []),
    ...(plat === "android" ? [switchRow({ icon: "bell", title: X.ongoingNow, sub: X.ongoingNowSub, key: "ongoingNow", on: st.ongoingNow === true, fn: "A.widgetToggle('ongoingNow')" })] : []),
    ...(plat === "ios" ? [switchRow({ icon: "checkc", title: X.lockDots, sub: X.lockDotsSub, key: "lockDots", on: st.lockDots === true, fn: "A.widgetToggle('lockDots')" })] : []),
  ]));
  g.push(group(T.groups.reminders, [
    switchRow({ icon: "bell", title: T.preQada, sub: st.preQada ? T.preQadaMin(st.leadMin) : T.preQadaSub, key: "preQada", on: !!st.preQada, extra: st.preQada ? `<div class="leadseg"><div class="seg" role="group">${lead}</div></div>` : "" }),
    ...(isOnF("makeups") ? [switchRow({ icon: "refresh", title: T.makeupNudge, sub: T.makeupNudgeSub, key: "makeupNudge", on: st.makeupNudge !== false, tag: X.newTag })] : []),
    switchRow({ icon: "sunrise", title: T.prayerAlerts, key: "prayerAlerts", on: !!st.prayerAlerts }),
    switchRow({ icon: "moon", title: T.evening, sub: T.eveningSub, key: "evening", on: !!st.evening }),
    // the Friday sīrah moment (notify.js, settings.seerahNotify, on unless switched off)
    switchRow({ icon: "book", title: T.seerah, sub: T.seerahSub, key: "seerahNotify", on: st.seerahNotify !== false }),
    ...(exactAllowed === false ? [navRow({ icon: "bell", title: T.exactOff.split(" · ")[0], sub: T.exactOff, onclick: "A.exactAlarms()" })] : []),
  ]));
  g.push(group(T.groups.tracking, [
    switchRow({ icon: "moon", tone: "grey", title: EXCUSED.feature, sub: EXCUSED.featureSub, key: "excusedDays", on: st.excusedDays !== false, gl: glossBtn("hayd") }),
    ...(st.excusedDays !== false ? [navRow({ icon: "history", tone: "grey", title: EXCUSED.markDays, sub: S.excusedMode ? EXCUSED.since(S.excusedMode.since) : EXCUSED.markDaysSub, onclick: "A.excusedCal()" })] : []),
    ...(isOnF("deeds") ? [navRow({ icon: "list", tone: "grey", title: X.deeds, value: String(S.amalList.length), onclick: "A.amalListSheet()" })] : []),
    ...(isOnF("makeups") ? [navRow({ icon: "target", tone: "grey", title: MAKEUPS.goalSetting, value: `${S.qada.goal} ${X.perMonth}`, onclick: "A.goalSheet()" })] : []),
    ...(isOnF("deeds") ? [switchRow({ icon: "book", tone: "grey", title: T.carryQuran, sub: T.carryQuranSub, key: "carryQuran", on: !!st.carryQuran })] : []),
  ]));
  g.push(group(T.groups.content, [
    switchRow({ icon: "chart", title: T.weekCard, sub: T.weekCardSub, key: "week", on: isOnF("week"), fn: "A.featToggle('week')" }),
  ]));
  g.push(group(T.groups.account, [
    ...(cloud.available ? [navRow({ icon: "cloud", tone: "green", title: T.cloud, value: cloud.user ? COMMON.on : COMMON.off, sub: cloud.user ? "" : "", onclick: "A.cloudSheet()", id: "cloudRow" })] : []),
    ...(isNative() ? [switchRow({ icon: "lock", tone: "green", title: T.lock, sub: T.lockSub, key: "lock", on: !!st.lock })] : []),
    ...(isNative() ? [switchRow({ icon: "shield", tone: "green", title: T.crashReports, sub: T.crashReportsSub, key: "crashReports", on: st.crashReports === true, fn: "A.crashToggle()" })] : []),
    navRow({ icon: "download", tone: "green", title: T.exportCsv, value: "CSV", onclick: "A.exportCsv()" }),
    navRow({ icon: "upload", tone: "green", title: T.backup, onclick: "A.backup()" }),
    navRow({ icon: "history", tone: "green", title: T.restore, onclick: "A.restore()" }),
  ]));
  g.push(group("", [
    navRow({ icon: "trash", title: T.reset, danger: true, onclick: "A.resetSheet()" }),
    ...(cloud.available && cloud.user ? [navRow({ icon: "userx", title: T.deleteGo, danger: true, onclick: "A.deleteSheet()" })] : []),
  ], cloud.available && cloud.user ? T.deleteFoot : ""));
  g.push(`<section class="sgroup"><h2>${esc(T.groups.about)}</h2><div class="card scard"><div class="why"><small>${esc(T.whyZad.toUpperCase())}</small><p>${esc(APP.mission)}</p></div>
    ${navRow({ icon: "help", title: T.feedbackRow, sub: FEEDBACK.rowSub, onclick: "A.feedback()", id: "feedbackRow" })}
    <div class="srow"><div class="srow-main static">${tile("info", "grey")}<span class="t"><b>${esc(APP_NAME())}</b></span><span class="val">${esc(APP.version(APP_VERSION))}</span></div></div>
    ${[["privacy.html", T.privacy, "shield", X.privacySub], ["terms.html", T.terms, "file", ""], ["support.html", T.support, "help", X.supportSub], ["delete-account.html", X.deleteAcct, "userx", ""], ["release-notes.html", X.releaseNotes, "history", ""]].map(([p, l, ic, sub]) => `<a class="srow-main arow" href="${pageUrl(p)}" target="_blank" rel="noopener">${tile(ic, "grey")}<span class="t"><b>${esc(l)}</b>${sub ? `<small>${esc(sub)}</small>` : ""}</span><span class="chev">${svg("chev")}</span></a>`).join("")}</div>
    <p class="sfoot center">${esc(APP.madeWithCare)}</p></section><div class="space"></div>`);
  return `${mainHead()}${profile}${g.join("")}`;
}
const APP_NAME = () => APP.name;
const HELP_PAGES = ["help", "hStatus", "hMakeups"];

/* ---------- render ---------- */
function renderSettings() {
  const root = $("#v-settings");
  if (!root) return;
  // Redrawing while typing or scrolling is unnecessary: only redraw when this view is showing
  if (UI.view !== "settings") return;
  const y = $("#screen").scrollTop;
  root.innerHTML = `<div class="settings">${page === "features" ? featuresPage() : page === "sunnah" ? sunnahPage() : page === "appearance" ? appearancePage() : page === "plus" ? plusPage({ head }) : HELP_PAGES.includes(page) ? helpPage(page, { head, group, navRow }) : mainPage()}</div>`;
  $("#screen").scrollTop = y;
  if (exactAllowed === null) refreshExact();
}
onRender(() => { if (UI.view !== "settings") { page = "main"; backTo = ""; } renderSettings(); maybeAsk(); });
