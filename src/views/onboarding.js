/* Welcome, set-up, log in ("I already use Zad"), welcome back, What's new and the lock screen (LK2).
 * Redesign (docs/plan/redesign-build.md, design-review/mockups2/redesign/final fin-ob-*, colours og-a-*):
 *   Welcome → Name + Brother/Sister → Your prayer times (location or city, today's times, the ʿAsr "Change" sheet
 *   with the four madhhabs) → How you read → Features → Make-ups (only if chosen) → Reminders → Crash reports
 *   (phone app only) → You're all set → Today.
 * One question per screen, a back arrow and a thin progress bar. The screens follow the theme (light or dark).
 * Jobs carried over from the old flow: name, brother/sister defaults (store.applyGender), location (the system
 * prompt straight from the times screen; no pre-ask sheet), madhhab and ʿAsr (store.setMadhhab), how you read
 * (guide.applyReading), features, the make-ups estimate and goal, reminders permission (prayerAlerts), crash
 * reports (native, opt-in), and the Karachi default for new installs. */
import { S, UI, A, $, NOW, todayKey, onRender, commit, go, toast, openSheet, closeSheet } from "../app.js";
import * as store from "../store.js";
import * as feat from "../features.js";
import { PRAYERS, esc, MON, fmt12 } from "../util.js";
import { currentPosition, cityName, notificationsGranted, requestNotifications, isNative } from "../platform.js";
import { FALLBACK_LOCATION, METHOD_SHORT, timesFor, nextPrayer, currentWindow } from "../times.js";
import { cloud, signIn } from "../cloud.js";
import { hijriLabel } from "../hijri.js";
import { madhhabOptions, madhhabOf } from "../rules/madhhab.js";
import { loginBodyHtml, loginButtonsHtml, consentTicked, signInError } from "./consent.js";
import { setCrashReporting } from "../crash.js";
import { SETUP, SETTINGS as T, COMMON, MAKEUPS as M, APP, prayerName, TIMES, CONSENT, MADHHAB_NAME } from "../strings.js";
import { SETUP_X, GUIDE as G, GENDER, WHATS_NEW } from "../strings.js";
import { applyReading, readingOf, READING } from "../guide.js";
import { readPreview } from "./help.js";
import { REFLECTIONS } from "../reflections.js";
import { whatsNewBody, markWhatsNewSeen, whatsNewDue } from "./whatsnew.js";
import { pvOn, turnOn, turnOff } from "../provisions.js";
import "../css/onboarding.css";
import { bandCover } from "../band.js";

/* Set-up labels (strings.js SETUP_X). */
const X = SETUP_X;

/** 2:197 as src/reflections.js has it: standard spelling, so التَّقْوَىٰ ends in alif maqṣūra + dagger alif (no dots). */
export const AYAH_2_197 = REFLECTIONS.find(r => r.src === "Quran 2:197")?.ar || "";

const logo = (w = 72) => `<img class="logo" src="logo/zad-symbol.png" srcset="logo/zad-symbol.png 1x, logo/zad-symbol@2x.png 2x" width="${w}" height="${Math.round(w * 1.26)}" style="width:${w}px;height:${Math.round(w * 1.26)}px" alt="">`;
const ic = {
  back: '<path d="M15 5l-7 7 7 7"/>', pin: '<path d="M12 22s7-6.3 7-12a7 7 0 1 0-14 0c0 5.7 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', chev: '<path d="M9 6l6 6-6 6"/>',
  bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  finger: '<path d="M12 11a2 2 0 0 0-2 2c0 3 .5 5 1.5 7M12 7a6 6 0 0 0-6 6c0 2 .3 3.6.9 5M12 3a10 10 0 0 0-9 6M12 7a6 6 0 0 1 6 6c0 3-.5 5-1.5 7M16 13c0 3-.3 5-1 7M20 13a8 8 0 0 0-1.5-4.7"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
};
const svg = (k, c = "") => `<svg class="${c}" viewBox="0 0 24 24" aria-hidden="true">${ic[k]}</svg>`;

/* ---------- flow state ---------- */
// screen: welcome | login | restored | nobackup | whatsnew | name | times | read | features | owe | reminders | crash | ready
let screen = "welcome";
let owe = { mode: "", span: "", goalPerDay: 2, exact: false };
// askCrash: native builds ask about crash reports once, as the last step (Crashlytics is native only; B1)
let askCrash = false;
// where What's new continues to (the view the app would have opened)
let wnNext = "home";
/** The numbered steps, in order. Make-ups only when chosen; crash reports only on the phone app. */
export const stepList = () => ["name", "times", "read", "features", ...(feat.isOn(S, "makeups") ? ["owe"] : []), "reminders", ...(askCrash ? ["crash"] : [])];
const SPANS = { none: 0, under: 177, oneTwo: 531, threeFive: 1416 }; // days (a lunar year is ~354 days)
const num = n => n.toLocaleString("en");

/* ---------- frame ---------- */
/**
 * One full screen: optional top row, the body, and the buttons kept at the bottom.
 * Direction B (19 Nov 2026): every screen but Welcome opens in the time-of-day band (css/band.css): the top row
 * (back, the step bar, "2 of 7") and the screen's heading (logo, title, lead) move into it.
 */
function frame(body, { top = "", btns = "", cls = "" } = {}) {
  const m = /^\s*((?:<div class="ob-readyhead">[\s\S]*?<\/div>)?\s*<header class="ob-head">[\s\S]*?<\/header>)/.exec(body);
  const band = m || top ? `${bandCover()}<div class="zb ob-band">${top}${m ? m[1] : ""}</div>` : "";
  if (m) body = body.slice(m[0].length);
  return `<div class="onb ${cls}">${band}<div class="ob-body">${body}</div><div class="ob-btns">${btns}</div></div>`;
}
const backBtn = fn => `<button class="ob-back" onclick="${fn}" aria-label="${esc(X.back)}">${svg("back")}</button>`;
function stepTop(id) {
  const list = stepList(), i = list.indexOf(id) + 1, n = list.length;
  return `<div class="ob-top">${backBtn("A.obBack()")}<div class="ob-bar" role="progressbar" aria-label="${esc(X.stepOf(i, n))}" aria-valuemin="1" aria-valuemax="${n}" aria-valuenow="${i}"><i style="width:${(i / n * 100).toFixed(1)}%"></i></div><span class="ob-count">${esc(X.stepOf(i, n))}</span></div>`;
}
const head = (title, sub = "", kick = "") => `<header class="ob-head">${kick ? `<p class="ob-kick">${esc(kick)}</p>` : ""}<h1>${esc(title)}</h1>${sub ? `<p class="ob-sub">${esc(sub)}</p>` : ""}</header>`;
const btn = (label, fn, cls = "pri", extra = "") => `<button class="ob-btn ${cls}" ${extra} onclick="${fn}">${label}</button>`;
const note = t => `<p class="ob-note">${esc(t)}</p>`;
const radio = (on, t, s, fn, right = "") => `<button class="ob-opt" role="radio" aria-checked="${on}" onclick="${fn}"><span class="ob-rd${on ? " on" : ""}"></span><span class="t"><b>${t}</b>${s ? `<small>${esc(s)}</small>` : ""}</span>${right}</button>`;
const seg = (items, label) => `<div class="ob-seg" role="radiogroup" aria-label="${esc(label)}">${items.map(([on, html, fn]) => `<button class="${on ? "on" : ""}" role="radio" aria-checked="${on}" onclick="${fn}">${html}</button>`).join("")}</div>`;
const checkRow = (t, s = "", icon = "check") => `<div class="ob-row"><span class="ob-mk${icon === "check" ? "" : " soft"}">${svg(icon)}</span><span class="t"><b>${esc(t)}</b>${s ? `<small>${esc(s)}</small>` : ""}</span></div>`;

/* ---------- welcome, log in ---------- */
/*
 * Welcome, variant D (chosen 19 Nov 2026; declutter bx-welcome-d): the slim double-line mihrab arch framing the logo,
 * washed softly inside so the pattern never runs behind it, on the full-screen time-of-day gradient (the band of
 * this moment, css/band.css) with a faint girih. "Zad" in Amiri, 2:197 in Arabic with its full translation.
 * The logo is the vector symbol (scripts/icons/geometry.mjs): the light colourway on light, the app-icon one on dark.
 */
const AW = 212, AH = 262, AIN = `M16 ${AH}V89C16 51 62 27 ${AW / 2} 14 ${AW - 62} 27 ${AW - 16} 51 ${AW - 16} 89V${AH}`;
const ARCH = `<svg class="ob-arch" viewBox="0 0 ${AW} ${AH}" aria-hidden="true"><defs><linearGradient id="obWash" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="w0"/><stop offset=".72" class="w0"/><stop offset="1" class="w1"/></linearGradient></defs><path d="${AIN}Z" fill="url(#obWash)"/><path class="o" d="M8 ${AH}V86C8 44 58 18 ${AW / 2} 4 ${AW - 58} 18 ${AW - 8} 44 ${AW - 8} 86V${AH}"/><path class="n" d="${AIN}"/></svg>`;
const bigLogo = w => `<img class="logo ob-lg l" src="logo/zad-symbol-light.svg" width="${w}" height="${Math.round(w * 1.303)}" alt=""><img class="logo ob-lg d" src="logo/zad-symbol-dark.svg" width="${w}" height="${Math.round(w * 1.303)}" alt="">`;
function sWelcome() {
  return frame(`<div class="ob-welcome"><div class="ob-stage">${ARCH}<div class="ob-lgw">${bigLogo(104)}</div></div><h1 class="ob-brand">${esc(APP.name)}</h1>
    <div class="ob-ayah"><p class="ar ob-ayah-ar" lang="ar" dir="rtl">${esc(AYAH_2_197)}</p><p class="en">“${esc(X.ayahEn)}”</p><p class="src">${esc(X.quoteSrc)}</p></div></div>`,
    { cls: "welcome zb ob-wd", btns: `${btn(esc(X.getStarted), "A.obStart()")}${cloud.available ? btn(esc(X.alreadyUse), "A.obGo('login')", "txt") : ""}` });
}
/* c2: the consent card, an unticked box, Google (disabled until ticked) and an equal "Not now" (views/consent.js) */
function sLogin() {
  return frame(`<div class="ob-readyhead">${logo(48)}</div>${head(X.welcomeBack, X.loginLead)}${loginBodyHtml()}`,
    { top: `<div class="ob-top">${backBtn("A.obGo('welcome')")}</div>`, btns: loginButtonsHtml(), cls: "login" });
}
function sRestored() {
  const days = Object.keys(S.days).length, m = store.monthLog(S, NOW()), loc = S.settings.location;
  const since = S.createdKey ? new Date(S.createdKey + "T12:00:00") : null;
  const sinceTxt = since ? `${since.getDate()} ${MON[since.getMonth()]} ${since.getFullYear()}` : "";
  const email = cloud.user?.email || "";
  const rows = [
    checkRow(X.daysOf(days), X.since(sinceTxt)),
    ...(feat.isOn(S, "makeups") ? [checkRow(X.makeupsLeft(store.qadaOwed(S)), X.goalLine(S.qada.goal, m.prayers))] : []),
    checkRow(X.settingsLoc, `${loc ? loc.label : FALLBACK_LOCATION.label} · ${METHOD_SHORT[S.settings.method] || S.settings.method}`),
  ];
  const remind = notifOK ? "" : `<div class="ob-row"><span class="ob-mk soft">${svg("bell")}</span><span class="t"><b>${esc(X.remindersOff)}</b><small>${esc(X.remindersOffSub)}</small></span><button class="ob-btn sec sm" onclick="A.obTurnOn()">${esc(X.turnOn)}</button></div>`;
  return frame(`<div class="ob-readyhead">${logo(48)}</div>${head(X.welcomeBackName(S.profile.name), "", X.restoredFrom)}
    <div class="ob-card ob-list">${rows.join("")}${remind}</div>${email ? note(`${email} · ${X.backupOn}`) : ""}`,
    { btns: btn(esc(X.openZad), "A.obOpen()") });
}
function sNoBackup() {
  return frame(`<div class="ob-readyhead">${logo(48)}</div>${head(X.noBackupTitle, X.noBackupLead(cloud.user?.email || ""))}`,
    { btns: `${btn(esc(X.setUp), "A.obStart()")}${btn(esc(X.tryAnother), "A.obGo('login')", "out")}` });
}
function sWhatsNew() {
  return frame(whatsNewBody(logo(48)), { btns: btn(esc(WHATS_NEW.cont), "A.obWhatsNewDone()"), cls: "whatsnew" });
}

/* ---------- 1. name + brother / sister ---------- */
function sName() {
  // Brother / sister sits on the name screen (scholar's choice, Nov 2026); Brother first. Nothing is pre-chosen.
  const g = store.genderOf(S);
  return frame(`${head(SETUP.welcome, X.nameSub)}
    <label class="ob-field"><span>${esc(SETUP.callYou)}</span><input id="obName" value="${esc(S.profile.name)}" placeholder="${esc(X.namePlaceholder)}" autocomplete="given-name" enterkeyhint="next" onkeydown="if(event.key==='Enter')A.obNext()"></label>
    <p class="ob-flab" id="obGenderL">${esc(GENDER.label)}</p>
    ${seg([[g === "m", esc(GENDER.brother), "A.obGender('m')"], [g === "f", esc(GENDER.sister), "A.obGender('f')"]], GENDER.label)}
    ${note(GENDER.why)}<button class="ob-link" onclick="A.obGender(null);A.obNext()">${esc(GENDER.skip)}</button>`,
    { top: stepTop("name"), btns: btn(esc(COMMON.continue), "A.obNext()") });
}

/* ---------- 2. your prayer times (+ the ʿAsr / madhhab sheet) ---------- */
function sTimes() {
  const loc = S.settings.location, now = NOW(), t = timesFor(now, S.settings);
  const cw = currentWindow(now, S.settings), cur = cw && cw.date.toDateString() === now.toDateString() ? cw.p : null;
  const src = loc?.source;
  const locLine = loc ? `<b>${esc(loc.label)}</b> · ${esc(src === "gps" ? X.foundGps : X.chosenByYou)}` : esc(X.locNotSet(FALLBACK_LOCATION.label));
  const m = madhhabOf(S), later = S.settings.asr === "hanafi";
  // Sunrise (muted, between Fajr and Zuhr): when Fajr's time ends
  const rows = PRAYERS.map(p => `<div class="${p === cur ? "cur" : ""}"><span>${esc(prayerName(p))}${p === cur ? ' <i class="ob-dot" aria-hidden="true"></i>' : ""}</span><b>${fmt12(t[p])}</b></div>${p === "Fajr" ? `<div class="sun"><span>${esc(prayerName("Sunrise"))}</span><b>${fmt12(t.Sunrise)}</b></div>` : ""}`).join("");
  // Current location is the one way in (user, 19 Nov 2026): one big button, no "Choose a city" beside it. The city
  // search shows only as a small link once location was refused, isn't available or timed out (locFail).
  const cityLink = locFail ? `<button class="ob-link ob-cityl" data-f="ob-city" onclick="A.obCity()">${esc(X.cantLocate)}</button>` : "";
  const body = `${head(X.timesTitle, X.whereLead)}
    <p class="ob-locline">${locLine}</p>${cityLink}
    <div class="ob-card ob-times">${rows}
      <button class="ob-asrline" onclick="A.obAsrSheet()"><span class="t"><b>${esc(X.asrRow)}</b><small>${esc(MADHHAB_NAME[m] || m)} · ${esc((later ? X.laterAsr : X.earlierAsr).replace(/^./, c => c.toLowerCase()))}</small></span><span class="ob-linkt">${esc(X.change)}</span></button></div>
    ${note(`${X.calcNote} ${X.methodLine(METHOD_SHORT[S.settings.method] || S.settings.method)}`)}`;
  // M3: the full privacy note (who receives the location) sits above the button that asks for it.
  // Before the location is known: one big "Use my location", and "Skip for now". Once found: "Looks right".
  const btns = loc ? btn(esc(X.looksRight), "A.obNext()") : `${btn(`${svg("pin", "xs")}${esc(locating ? X.locating : SETUP.useLocation)}`, "A.obLocate()", "pri", locating ? 'aria-busy="true"' : "")}${btn(esc(SETUP.skipForNow), "A.obNext()", "txt")}`;
  return frame(body, { top: stepTop("times"), btns });
}
/** ʿAsr for madhhab m today, so each option shows what the choice changes. */
export function asrFor(m) {
  return fmt12(timesFor(NOW(), { ...S.settings, asr: m === "hanafi" ? "hanafi" : "shafi" }).Asr);
}
/** The "Change" sheet: the four madhhabs with today's ʿAsr for each. Hanafī is the default. */
A.obAsrSheet = () => {
  const cur = madhhabOf(S);
  const rows = madhhabOptions().map(o => radio(cur === o.id, `${esc(o.name)}${o.isDefault ? ` <em class="ob-tag">${esc(X.defaultTag)}</em>` : ""}`, o.id === "hanafi" ? X.laterAsr : X.earlierAsr, `A.obMadhhab('${o.id}')`, `<span class="ob-asrt">${asrFor(o.id)}</span>`)).join("");
  openSheet(`<div class="ob-sheet"><div class="ob-sh-head"><h3>${esc(X.asrSheetTitle)}</h3><button class="ob-x" onclick="A.closeSheet()" aria-label="${esc(COMMON.close)}">${svg("x")}</button></div>
    <p class="ob-sh-lead">${esc(X.asrSheetLead)}</p><div class="ob-opts" role="radiogroup" aria-label="${esc(X.asrSheetTitle)}">${rows}</div>
    <button class="ob-btn pri" onclick="A.closeSheet()">${esc(COMMON.done)}</button></div>`);
};
A.obMadhhab = m => { if (store.setMadhhab(S, m)) { commit(); A.obAsrSheet(); } };
/** Choose a city: the search from Settings (A.findCity / A.pickCity in views/settings.js; source "city"). */
A.obCity = () => {
  openSheet(`<div class="ob-sheet"><div class="ob-sh-head"><h3>${esc(X.chooseCity)}</h3><button class="ob-x" onclick="A.closeSheet()" aria-label="${esc(COMMON.close)}">${svg("x")}</button></div>
    <p class="ob-sh-lead">${esc(X.cityLead)}</p>
    <div class="ob-search"><input id="cityIn" placeholder="${esc(T.cityPlaceholder)}" aria-label="${esc(X.chooseCity)}" enterkeyhint="search" onkeydown="if(event.key==='Enter')A.findCity()"><button class="ob-btn sec sm" onclick="A.findCity()">${esc(COMMON.search)}</button></div>
    <div class="results" id="cityResults"></div></div>`);
  setTimeout(() => $("#cityIn")?.focus(), 50);
};
/**
 * Use my location: the screen has explained why (the full privacy note under the times), so this goes straight to
 * the system prompt. Refused, unavailable, or no answer within LOCATE_MS: the "Choose a city" link appears.
 */
let locFail = false, locating = false;
const LOCATE_MS = 20000;
A.obLocate = async () => {
  if (locating) return;
  locating = true; drawn = ""; commit();
  let timer;
  try {
    const { lat, lng } = await Promise.race([currentPosition(), new Promise((_, rej) => { timer = setTimeout(() => rej(new Error("timeout")), LOCATE_MS); })]);
    S.settings.location = { lat, lng, label: await cityName(lat, lng), source: "gps" };
    locFail = false;
  } catch (e) { locFail = true; toast(X.locNoGo); }
  clearTimeout(timer);
  locating = false; drawn = ""; commit();
};
/** For tests: one set-up screen's HTML, and the location state. */
export const _screen = id => SCREENS[id]();
export const _loc = { reset() { locFail = false; locating = false; }, get fail() { return locFail; } };

/* ---------- 3. how you read ---------- */
function sRead() {
  const cur = readingOf(S);
  const opts = READING.map(k => radio(cur === k, esc(G.readOpts[k][0]), G.readOpts[k][1], `A.obRead('${k}')`)).join("");
  return frame(`${head(G.readTitle, X.readLead)}<div class="ob-card ob-opts" role="radiogroup" aria-label="${esc(G.readTitle)}">${opts}</div>
    <div class="ob-card ob-prev" aria-hidden="true"><p class="lab">${esc(G.preview)}</p>${readPreview(cur)}</div>${note(G.readNote)}`,
    { top: stepTop("read"), btns: btn(esc(COMMON.continue), "A.obNext()") });
}

/* ---------- 4. features ---------- */
/** Features plus "Provisions & levels" (settings.provisions.on, off by default), after Progress. */
export function setupRows() {
  const rows = feat.featureRows(S), i = rows.findIndex(r => r.id === "progress");
  rows.splice(i + 1, 0, { id: "provisions", name: X.featProvisions, sub: X.featProvisionsSub, on: pvOn(S), locked: false });
  return rows;
}
function sFeatures() {
  const rows = setupRows(), on = rows.filter(r => r.on).length;
  const list = rows.map(r => `<button class="ob-feat" role="checkbox" aria-checked="${r.on}" ${r.locked ? 'aria-disabled="true"' : `onclick="A.obFeat('${r.id}')"`}><span class="t"><b>${esc(r.name)}</b><small>${esc(r.sub)}</small></span><span class="ob-bx${r.on ? " on" : ""}${r.locked ? " lockd" : ""}">${r.on ? svg("check") : ""}</span></button>`).join("");
  // M4: the two presets above the list. "Everything" includes Provisions & levels; "Just prayers" leaves it off.
  const pr = presetOf(), chip = (id, label) => `<button type="button" class="${pr === id ? "on" : ""}" aria-pressed="${pr === id}" onclick="A.obPreset('${id}')">${esc(label)}</button>`;
  const chips = `<div class="ob-chips ob-presets" role="group" aria-label="${esc(X.presets)}">${chip("prayers", X.justPrayers)}${chip("all", X.everything)}</div>`;
  return frame(`${head(X.featTitleNew, X.featLead)}${chips}<div class="ob-card ob-feats">${list}</div>${note(X.featNote)}`,
    { top: stepTop("features"), btns: btn(esc(X.continueN(on)), "A.obNext()") });
}
/** Which preset the Features step matches now: "prayers" (only the five), "all" (every row on, Provisions too), or "". */
export function presetOf() {
  const rows = setupRows().filter(r => !r.locked);
  return rows.every(r => !r.on) ? "prayers" : rows.every(r => r.on) ? "all" : "";
}

/* ---------- 5. make-ups (only if chosen) ---------- */
function estimate() {
  const days = SPANS[owe.span] ?? 0, per = store.qadaKeys(S).length;
  return { prayers: days * per, fasts: Math.round(days / 354 * 30), days, per };
}
function sOwe() {
  const q = S.qada, hasWitr = store.qadaKeys(S).includes("Witr");
  const segs = ["yes", "no", "notsure"].map(k => [owe.mode === k, esc(X[k === "notsure" ? "notSure" : k]), `A.obOwe('${k}')`]);
  let body = "";
  if (owe.mode === "yes") {
    const e = estimate();
    const spans = [["none", X.none], ["under", X.underYear], ["oneTwo", X.oneTwo], ["threeFive", X.threeFive]];
    body = `<div class="ob-card pad ob-owe"><p class="ob-flab first">${esc(X.howLong)}</p><div class="ob-chips">${spans.map(([k, l]) => `<button class="${owe.span === k ? "on" : ""}" aria-pressed="${owe.span === k}" onclick="A.obSpan('${k}')">${esc(l)}</button>`).join("")}</div>
      ${owe.exact ? `<div class="ob-qgrid">${[...store.qadaKeys(S), "fasts"].map(p => `<label class="ob-field sm"><span>${esc(p === "fasts" ? M.fasts : prayerName(p))}</span><input type="number" inputmode="numeric" min="0" id="ob_${p}" value="${q[p] || 0}"></label>`).join("")}</div>`
      : owe.span ? `<p class="ob-est">${esc(X.about.replace(/^./, c => c.toUpperCase()))} <b>${num(e.prayers)}</b> ${esc(X.prayersWord)} · ${num(e.fasts)} ${esc(X.fastsWord)}</p>${hasWitr ? `<p class="ob-note tight">${esc(X.includesWitr)}.</p>` : ""}` : ""}
      <button class="ob-link" onclick="A.obExact()" aria-pressed="${owe.exact}">${esc(X.exact)}${svg("chev", "xs")}</button>
      <hr class="ob-hr"><p class="ob-flab first">${esc(X.perDay)} <span>· ${esc(X.yourGoal)}</span></p>
      <div class="ob-goals">${[1, 2, 6].map(n => `<button class="${owe.goalPerDay === n ? "on" : ""}" aria-pressed="${owe.goalPerDay === n}" onclick="A.obGoal(${n})"><b>${n}</b><small>${esc(X.aMonth(n * 30))}</small></button>`).join("")}</div></div>`;
  } else if (owe.mode === "notsure") {
    body = `<div class="ob-card pad"><b class="ob-fine">${esc(X.fine)}</b><p class="ob-note tight">${esc(X.fineBody)}</p></div>`;
  }
  return frame(`${head(X.oweTitle, X.oweLead, X.oweKick)}${seg(segs, X.oweTitle)}${body}`,
    { top: stepTop("owe"), btns: btn(esc(COMMON.continue), "A.obNext()") });
}
/** Save the make-ups answer (only "Yes" changes anything). Safe to run again after going back and forth. */
function applyOwe() {
  if (owe.mode !== "yes") return;
  if (owe.exact) { for (const p of [...store.qadaKeys(S), "fasts"]) { const el = $(`#ob_${p}`); if (el) S.qada[p] = Math.max(0, parseInt(el.value) || 0); } }
  else { const e = estimate(); for (const p of store.qadaKeys(S)) S.qada[p] = Math.round(e.days); S.qada.fasts = e.fasts; }
  S.qada.goal = owe.goalPerDay * 30;
}

/* ---------- 6. reminders ---------- */
function sReminders() {
  const now = NOW(), t = timesFor(now, S.settings), cw = currentWindow(now, S.settings), nx = nextPrayer(now, S.settings);
  const p = cw?.p || nx.p, at = cw ? t[cw.p] : nx.time, nm = prayerName(p), sister = store.genderOf(S) === "f";
  const acts = sister ? [X.remOnTime] : [X.remCong, X.remOnTime];
  return frame(`${head(X.remTitle, X.remLead)}
    <div class="ob-card ob-notif" aria-hidden="true"><div class="h">${logo(16)}<b>${esc(APP.name)}</b><span>${esc(X.now)}</span></div><b class="ti">${esc(nm)} · ${fmt12(at)}</b><p>${esc(X.notifBody(nm))}</p>
      <div class="acts">${acts.map(a => `<span>${esc(a)}</span>`).join("")}</div></div>
    <p class="ob-note c">${esc(store.genderOf(S) ? X.remExampleShort : X.remExample)}</p>`,
    { top: stepTop("reminders"), btns: `${btn(`${svg("bell", "xs")}${esc(X.remYes)}`, "A.obRemind(true)")}${btn(esc(COMMON.notNow), "A.obRemind(false)", "txt")}<p class="ob-foot">${esc(X.remFoot)}</p>` });
}
A.obRemind = async yes => {
  if (yes) {
    const ok = await requestNotifications();
    S.settings.prayerAlerts = ok;
    if (!ok) toast(X.remDenied);
    commit();
  }
  A.obNext();
};

/* ---------- 7. crash reports (phone app only): two equal buttons, no default (opt-in, B1) ---------- */
function sCrash() {
  const C = CONSENT, row = (k, t, s) => `<div class="ob-row top"><span class="ob-ico">${svg(k)}</span><span class="t"><b>${esc(t)}</b><small>${esc(s)}</small></span></div>`;
  return frame(`${head(C.crashTitle, C.crashLead, C.crashEyebrow)}<div class="ob-card ob-list">${row("check", C.crashSent, C.crashSentSub)}${row("x", C.crashNever, C.crashNeverSub)}</div>${note(C.crashLater)}`,
    { top: stepTop("crash"), btns: `<div class="ob-eq">${btn(esc(C.crashYes), "A.obCrash(true)", "sec")}${btn(esc(C.crashNo), "A.obCrash(false)", "sec")}</div>` });
}
/** Crash-report step: true is the only "on"; native collection starts right away (crash.js). */
A.obCrash = yes => {
  S.settings.crashReports = !!yes;
  setCrashReporting(!!yes);
  commit();
  A.obNext();
};

/* ---------- you're all set ---------- */
function sReady() {
  const loc = S.settings.location, m = madhhabOf(S);
  const chosen = setupRows().filter(r => r.on);
  const owed = store.qadaKeys(S).reduce((a, p) => a + (S.qada[p] || 0), 0);
  const rows = [
    checkRow(X.readyTimes(loc ? loc.label : FALLBACK_LOCATION.label), X.readyAsr(MADHHAB_NAME[m] || m)),
    checkRow(X.readyChosen(chosen.length), chosen.map(r => r.name).join(", ")),
    S.settings.prayerAlerts ? checkRow(X.readyRem) : checkRow(X.readyRemOff, X.readyRemOffSub, "bell"),
    ...(feat.isOn(S, "makeups") && owe.mode === "yes" && owed > 0 ? [checkRow(X.readyMakeups(owed), X.readyPerDay(owe.goalPerDay))] : []),
  ];
  return frame(`<div class="ob-readyhead">${logo(48)}</div>${head(X.readyTitle(S.profile.name), X.readyLead)}<div class="ob-card ob-list">${rows.join("")}</div>${note(X.readyNote)}`,
    { btns: btn(esc(X.openZad), "A.obReadyOpen()"), cls: "ready" });
}

/* ---------- drawing ---------- */
let notifOK = false;
let drawn = "";
const SCREENS = { welcome: sWelcome, login: sLogin, restored: sRestored, nobackup: sNoBackup, whatsnew: sWhatsNew, name: sName, times: sTimes, read: sRead, features: sFeatures, owe: sOwe, reminders: sReminders, crash: sCrash, ready: sReady };
function draw() {
  const root = $("#v-onboard");
  if (!root) return;
  const st = S.settings;
  const sig = `${screen}|${JSON.stringify(st.location)}|${st.asr}|${st.madhhab}|${st.method}|${JSON.stringify(st.features)}|${pvOn(S)}|${st.prayerAlerts}|${S.profile.gender}|${cloud.available}|${cloud.user?.email || ""}|${notifOK}|${JSON.stringify(owe)}|${readingOf(S)}|${NOW().getHours()}:${Math.floor(NOW().getMinutes() / 10)}`;
  if (sig === drawn && root.firstChild) return;
  const same = drawn.split("|")[0] === screen;
  drawn = sig;
  root.innerHTML = (SCREENS[screen] || sWelcome)();
  if (!same) $("#screen")?.scrollTo?.(0, 0);
}

/* ---------- actions ---------- */
A.obGo = s => { screen = s; drawn = ""; commit(); };
A.obStart = () => A.obGo("name");
const keepName = () => { const el = $("#obName"); if (el) S.profile.name = el.value.trim(); };
A.obBack = () => {
  const list = stepList(), i = list.indexOf(screen);
  keepName();
  if (screen === "owe") applyOwe();
  A.obGo(i > 0 ? list[i - 1] : "welcome");
};
/** The phone's back button (main.js): one step back on set-up screens. False when there is nowhere to go. */
A.obHardwareBack = () => {
  if (screen === "login" || screen === "nobackup") { A.obGo("welcome"); return true; }
  if (stepList().includes(screen)) { A.obBack(); return true; }
  return false;
};
A.obNext = () => {
  const list = stepList(), i = list.indexOf(screen);
  keepName();
  if (screen === "read") applyReading(S, readingOf(S)); // keep the answer shown, even if untouched
  if (screen === "owe") applyOwe();
  if (i >= 0 && i < list.length - 1) A.obGo(list[i + 1]);
  else if (i === list.length - 1) A.obGo("ready");
};
/** Brother / sister on the name screen: sets the defaults (store.applyGender); keeps the name typed so far. */
// true while "prayer at home counts in full" is on only because Sister was tapped on this screen
let obHomeFull = false;
A.obGender = g => {
  keepName();
  const was = !!S.settings.provisions?.homeFull;
  // Prefer not to say after tapping Sister: take back the sister default this screen switched on
  store.applyGender(S, g, { todayKey: todayKey(), undoHomeFull: g == null && obHomeFull }, NOW());
  obHomeFull = g === "f" ? obHomeFull || !was : false;
  drawn = ""; commit();
};
A.obRead = k => { applyReading(S, k); commit(); };
A.obFeat = f => {
  if (f === "provisions") { obProvisions(); return; }
  feat.setFeature(S, f, !feat.isOn(S, f)); commit();
};
/**
 * Provisions & levels chosen in set-up: on, and the one-time offer on Today never shows (turnOn marks it
 * offered). Unticked again here: off, and the offer is back as it was, for people who didn't choose it.
 */
let obPvOffered = null;
function obProvisions() {
  if (!pvOn(S)) { obPvOffered = !!S.settings.provisions?.offered; turnOn(S, todayKey()); }
  else { turnOff(S); if (obPvOffered != null) S.settings.provisions.offered = obPvOffered; }
  commit();
}
/** M4: "Just prayers" / "Everything" (features.applyPreset), with Provisions & levels off / on to match. */
A.obPreset = p => {
  if (p !== "prayers" && p !== "all") return;
  feat.applyPreset(S, p);
  if ((p === "all") !== pvOn(S)) { obProvisions(); return; } // it commits
  commit();
};
A.obOwe = k => { owe.mode = k; if (k === "yes" && !owe.span) owe.span = "oneTwo"; drawn = ""; commit(); };
A.obSpan = k => { owe.span = k; owe.exact = false; drawn = ""; commit(); };
A.obExact = () => { owe.exact = !owe.exact; drawn = ""; commit(); };
A.obGoal = n => { owe.goalPerDay = n; drawn = ""; commit(); };
A.obTurnOn = async () => { notifOK = await requestNotifications(); if (notifOK) { S.settings.prayerAlerts = true; toast(X.remindersOn); } drawn = ""; commit(); };

A.obRestore = async (provider = "google") => {
  if (!consentTicked()) { toast(CONSENT.tickFirst); return; } // consent before any upload
  try {
    await signIn({ provider, consent: true });
    notifOK = await notificationsGranted();
    screen = S.profile.onboarded ? "restored" : "nobackup";
    drawn = ""; commit();
  } catch (e) { console.warn("restore", e); toast(signInError(e)); }
};
/** After "Welcome back": a backup from before the redesign shows What's new once (views/whatsnew.js). */
A.obOpen = () => {
  if (whatsNewDue(S)) { showWhatsNew("home"); return; }
  screen = "welcome"; drawn = ""; go("home"); toast(SETUP.welcomeBack);
};
A.obReadyOpen = () => completeSetup();
A.obWhatsNewDone = () => {
  markWhatsNewSeen(S);
  screen = "welcome"; drawn = "";
  commit();
  go(wnNext || "home");
};

function completeSetup() {
  S.profile.onboarded = true;
  S.createdKey = todayKey();
  markWhatsNewSeen(S); // a new user never sees What's new
  // No tour now: the first Today shows one guide line until the first log; the full tour is in Settings → Help.
  screen = "welcome"; drawn = "";
  commit();
  go("home");
}

/* ---------- start ---------- */
/** New installs get Karachi (University of Islamic Sciences) from store.defaultState. A copy saved before set-up
 *  finished, still on the old ISNA default, moves to Karachi here too. Set-up users keep their method. */
export function startOnboarding() {
  if (!S.profile.onboarded && !S.settings.methodChosen && S.settings.method === "NorthAmerica") S.settings.method = "Karachi";
  screen = "welcome"; owe = { mode: "", span: "", goalPerDay: 2, exact: false }; drawn = "";
  // Ask about crash reports once, on native builds, if never answered (dev-only flag lets the screenshot script show it on the web)
  askCrash = S.settings.crashReports === undefined && (isNative() || !!(import.meta.env?.DEV && globalThis.__zadAskCrash));
  go("onboard");
}
A.startOnboarding = startOnboarding;
/** What's new, for someone who used Zad before the redesign (main.js decides; views/whatsnew.js has the rule). */
export function showWhatsNew(next = "home") {
  wnNext = next; screen = "whatsnew"; drawn = "";
  go("onboard");
}
onRender(() => { if (UI.view === "onboard") draw(); });

/* ---------- lock screen (LK2) ----------
   Drawn only while it shows (main.js lockIfNeeded draws it as it appears): every redraw used to rebuild it, hidden,
   which cost each tap on Today about 3 ms (4x CPU: 11 ms). */
function renderLock(force = false) {
  const el = $("#lock");
  if (!el || (el.hidden && !force)) return;
  const now = NOW(), nx = nextPrayer(now, S.settings);
  const mins = Math.max(0, Math.round((nx.time - now) / 60000));
  const longDay = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][now.getDay()];
  const hj = hijriLabel(now).replace(/ \d{4}$/, "");
  el.innerHTML = `<svg class="pattern" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice"><rect width="100%" height="100%" fill="url(#st)"/></svg>
    <div class="lock-in">${logo(64)}<p class="lock-date">${esc(longDay)} ${now.getDate()} ${esc(MON[now.getMonth()])}${hj ? ` · ${esc(hj)}` : ""}</p>
    <h1>${esc(X.greet(S.profile.name))}</h1>
    <div class="nextpill">${svg("clock")}<span>${esc(prayerName(nx.p))} at <b>${fmt12(nx.time).replace(/ [AP]M$/, "")}</b> · in ${esc(TIMES.hm(Math.floor(mins / 60), mins % 60))}</span></div>
    <div class="grow"></div>
    <button class="fp" onclick="A.unlock()" aria-label="${esc(X.unlock)}"><span>${svg("finger")}</span></button>
    <p class="touch">${esc(X.lockTouch)}</p><p class="pin">${esc(X.lockOr)} <button onclick="A.unlock()">${esc(X.lockPin)}</button></p></div>`;
}
onRender(() => renderLock());
A.drawLock = () => renderLock(true);
