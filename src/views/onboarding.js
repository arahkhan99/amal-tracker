/* Welcome, log in (L2), welcome back (R2), setup (S2: one question per screen), permission asks (PM1) and the lock screen (LK2). */
import { S, UI, A, $, NOW, todayKey, onRender, commit, go, toast, openSheet, closeSheet, glossBtn } from "../app.js";
import * as store from "../store.js";
import * as feat from "../features.js";
import { PRAYERS, esc, dkey, DOW, MON } from "../util.js";
import { currentPosition, cityName, notificationsGranted, requestNotifications, authenticate } from "../platform.js";
import { FALLBACK_LOCATION, METHODS, METHOD_SHORT, timesFor, nextPrayer } from "../times.js";
import { cloud, signIn } from "../cloud.js";
import { hijriLabel } from "../hijri.js";
import { madhhabOptions, madhhabOf } from "../rules/madhhab.js";
import { loginBottomHtml, consentTicked, signInError } from "./consent.js";
import { CONSENT } from "../strings.js";
import { isNative } from "../platform.js";
import { setCrashReporting } from "../crash.js";
import { SETUP, SETTINGS as T, COMMON, MADHHAB_UI, ASR_UI, FEATURE, TIMES, EXCUSED, MAKEUPS as M, APP, prayerName, STATUS } from "../strings.js";
import { SETUP_X, GUIDE as G, GENDER } from "../strings.js";
import { applyReading, readingOf, queueTour } from "../guide.js";
import { readPreview, readCards } from "./help.js";
import "../css/onboarding.css";

/* Setup-only labels (strings.js SETUP_X). */
const X = SETUP_X;

const pattern = `<svg class="pattern" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice"><rect width="100%" height="100%" fill="url(#st)"/></svg>`;
const logo = (w = 72) => `<img class="logo" src="logo/zad-symbol.png" srcset="logo/zad-symbol.png 1x, logo/zad-symbol@2x.png 2x" width="${w}" height="${Math.round(w * 1.26)}" style="width:${w}px;height:${Math.round(w * 1.26)}px" alt="">`;
const ic = {
  back: '<path d="M15 5l-7 7 7 7"/>', pin: '<path d="M12 22s7-6.3 7-12a7 7 0 1 0-14 0c0 5.7 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.01"/>', lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  mosque: '<path d="M4 21V11l3-3 3 3v10M14 21V9a3 3 0 0 1 6 0v12M2 21h20M7 8V5"/>', layers: '<path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5"/>',
  heart: '<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/>', refresh: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
  chart: '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h8"/>', bars: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>', grid: '<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><path d="M17.25 13.5v7.5M13.5 17.25H21"/>',
  finger: '<path d="M12 11a2 2 0 0 0-2 2c0 3 .5 5 1.5 7M12 7a6 6 0 0 0-6 6c0 2 .3 3.6.9 5M12 3a10 10 0 0 0-9 6M12 7a6 6 0 0 1 6 6c0 3-.5 5-1.5 7M16 13c0 3-.3 5-1 7M20 13a8 8 0 0 0-1.5-4.7"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
};
const svg = (k, c = "") => `<svg class="${c}" viewBox="0 0 24 24" aria-hidden="true">${ic[k]}</svg>`;
const FEAT_ICON = { prayers: "mosque", sunnah: "layers", deeds: "heart", makeups: "refresh", week: "chart", progress: "bars", tools: "grid" };

/* ---------- flow state ---------- */
// screen: welcome | login | restored | nobackup | name | where | madhhab | read | features | owe
let screen = "welcome";
let owe = { mode: "", span: "", goalPerDay: 2, exact: false };
// askCrash: native builds ask about crash reports once, as the last step (Crashlytics is native only; B1)
let askCrash = false;
const stepList = () => ["name", "where", "madhhab", "read", "features", ...(feat.isOn(S, "makeups") ? ["owe"] : []), ...(askCrash ? ["crash"] : [])];
const SPANS = { none: 0, under: 177, oneTwo: 531, threeFive: 1416 }; // days (a lunar year is ~354 days)

const fmtT = d => `${(d.getHours() % 12) || 12}:${String(d.getMinutes()).padStart(2, "0")}`;
const num = n => n.toLocaleString("en");

function frame(body, { back = false, top = "", cls = "", btn = "" } = {}) {
  return `<div class="onb ${cls}">${pattern}<div class="onb-inner">${top}${body}<div class="grow"></div>${btn}</div></div>`;
}
const primary = (label, fn, extra = "") => `<button class="btn primary ob-primary" ${extra} onclick="${fn}">${esc(label)}</button>`;
function stepFrame(id, body, btn, eyebrow, title, sub = "") {
  const list = stepList(), i = list.indexOf(id) + 1, n = list.length;
  const top = `<div class="ob-top"><button class="ob-back" onclick="A.obBack()" aria-label="${esc(X.back)}">${svg("back")}</button><div class="ob-bar" role="progressbar" aria-valuemin="1" aria-valuemax="${n}" aria-valuenow="${i}"><i style="width:${Math.round(i / n * 100)}%"></i></div><span class="ob-count">${esc(X.stepOf(i, n))}</span></div>`;
  return frame(`<p class="eyebrow">${esc(eyebrow)}</p><h1>${esc(title)}</h1>${sub ? `<p class="lead">${esc(sub)}</p>` : ""}${body}`, { top, btn });
}

/* ---------- screens ---------- */
function sWelcome() {
  return frame(`<div class="center-col">${logo(86)}<h1 class="brand-name">${esc(APP.name)}</h1><div class="orn"><i></i><b></b><i></i></div><p class="quote">${esc(X.quote)}</p><p class="quote-src">${esc(X.quoteSrc)}</p></div>`,
    { cls: "welcome", btn: `${primary(X.getStarted, "A.obStart()")}${cloud.available ? `<button class="btn ghost ob-ghost" onclick="A.obGo('login')">${esc(X.logIn)}</button>` : ""}` });
}
/* c2: consent block, unticked box, Google + Apple (disabled until ticked) and an equal "Not now" (views/consent.js) */
function sLogin() {
  return frame(`<div class="center-col top cmp">${logo(52)}<h1 class="login-h">${esc(X.welcomeBack)}</h1><p class="lead c">${esc(X.loginLead)}</p></div>`,
    { cls: "login", top: `<div class="ob-top"><button class="ob-back" onclick="A.obGo('welcome')" aria-label="${esc(X.back)}">${svg("back")}</button></div>`,
      btn: loginBottomHtml() });
}
/* c4: crash reports, a last set-up step on native builds. Two equal buttons, no default (opt-in, B1). */
const cIcon = { y: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', n: '<path d="M6 6l12 12M18 6L6 18"/>' };
function sCrash() {
  const C = CONSENT, row = (k, t, sub) => `<div><i class="${k}"><svg viewBox="0 0 24 24" aria-hidden="true">${cIcon[k]}</svg></i><span><b>${esc(t)}</b><small>${esc(sub)}</small></span></div>`;
  return stepFrame("crash", `<div class="clist">${row("y", C.crashSent, C.crashSentSub)}${row("n", C.crashNever, C.crashNeverSub)}</div><p class="note-i cl"><span>${esc(C.crashLater)}</span></p>`,
    `<button class="btn ghost eq2" onclick="A.obCrash(true)">${esc(C.crashYes)}</button><button class="btn ghost eq2" onclick="A.obCrash(false)">${esc(C.crashNo)}</button>`,
    C.crashEyebrow, C.crashTitle, C.crashLead);
}
function sRestored() {
  const days = Object.keys(S.days).length, m = store.monthLog(S, NOW()), loc = S.settings.location;
  const since = S.createdKey ? new Date(S.createdKey + "T12:00:00") : null;
  const sinceTxt = since ? `${since.getDate()} ${MON[since.getMonth()]} ${since.getFullYear()}` : "";
  const email = cloud.user?.email || "";
  const rows = [
    [X.daysOf(days), X.since(sinceTxt)],
    ...(feat.isOn(S, "makeups") ? [[X.makeupsLeft(store.qadaOwed(S)), X.goalLine(S.qada.goal, m.prayers)]] : []),
    [X.settingsLoc, `${loc ? loc.label : FALLBACK_LOCATION.label} · ${METHOD_SHORT[S.settings.method] || S.settings.method}`],
  ];
  const remind = notifOK ? "" : `<div class="rrow remind"><span class="rcheck bell">${svg("bell")}</span><div><b>${esc(X.remindersOff)}</b><small>${esc(X.remindersOffSub)}</small></div><button class="turnon" onclick="A.obTurnOn()">${esc(X.turnOn)}</button></div>`;
  return frame(`<div class="center-col top short">${logo(64)}<p class="eyebrow c">${esc(X.restoredFrom)}</p><h1 class="login-h">${esc(X.welcomeBackName(S.profile.name))}</h1></div>
    <div class="rcard">${rows.map(([a, b]) => `<div class="rrow"><span class="rcheck">${svg("check")}</span><div><b>${esc(a)}</b><small>${esc(b)}</small></div></div>`).join("")}${remind}</div>
    ${email ? `<p class="acct"><span class="av">${esc(email[0].toUpperCase())}</span>${esc(email)} · ${esc(X.backupOn)}</p>` : ""}`,
    { btn: primary(X.openZad, "A.obOpen()") });
}
function sNoBackup() {
  const email = cloud.user?.email || "";
  return frame(`<div class="center-col top">${logo(64)}<h1 class="login-h">${esc(X.noBackupTitle)}</h1><p class="lead c">${esc(X.noBackupLead(email))}</p></div>`,
    { btn: `${primary(X.setUp, "A.obStart()")}<button class="btn ghost ob-ghost" onclick="A.obGo('login')">${esc(X.tryAnother)}</button>` });
}
function sName() {
  // Brother / sister sits on the name screen (scholar's choice, Nov 2026), not a step of its own
  const g = store.genderOf(S);
  const gb = (k, t) => `<button class="${g === k ? "on" : ""}" role="radio" aria-checked="${g === k}" onclick="A.obGender('${k}')">${esc(t)}</button>`;
  const gender = `<div class="gseg-l" id="obGenderL">${esc(GENDER.label)}</div><div class="gseg" role="radiogroup" aria-labelledby="obGenderL">${gb("f", GENDER.sister)}${gb("m", GENDER.brother)}</div>
    <div class="gseg-f"><span>${esc(GENDER.why)}</span><button onclick="A.obGender(null);A.obNext()">${esc(GENDER.skip)}</button></div>`;
  return stepFrame("name", `<div class="panel"><div class="field"><label for="obName">${esc(SETUP.callYou)}</label><input id="obName" value="${esc(S.profile.name)}" placeholder="${esc(X.namePlaceholder)}" autocomplete="given-name" onkeydown="if(event.key==='Enter')A.obNext()"></div><p class="hint">${esc(X.nameSub)}</p>${gender}</div>`,
    primary(COMMON.continue, "A.obNext()"), X.nameEyebrow, SETUP.welcome);
}
function sWhere() {
  const loc = S.settings.location, now = NOW(), t = timesFor(now, S.settings), nx = nextPrayer(now, S.settings);
  const asr = S.settings.asr === "hanafi" ? ASR_UI.hanafi : ASR_UI.standard;
  const card = loc ? `<div class="loccard"><div class="lochead"><span class="pinbox">${svg("pin")}</span><div><b>${esc(loc.label)}</b><small>${esc(X.foundFrom)} · ${esc(METHOD_SHORT[S.settings.method] || S.settings.method)} · ${esc(asr)} ${esc(ASR_UI.title.replace("ʿAsr time", ""))}</small></div><button class="chg" onclick="A.locationSheet()">${esc(X.change)}</button></div>
      <div class="dash"></div><div class="times">${PRAYERS.map(p => `<div class="${nx.p === p ? "nx" : ""}"><span>${esc(prayerName(p))}</span><b>${fmtT(t[p])}</b></div>`).join("")}</div>
      <p class="nextline">${esc(DOW[now.getDay()])} ${now.getDate()} ${esc(MON[now.getMonth()])} · ${esc(X.nextIs(prayerName(nx.p)))} <b>${fmtT(nx.time)}</b>${nx.tomorrow ? ` ${esc(COMMON.tomorrow)}` : ""}</p></div>`
    : `<div class="loccard"><div class="lochead"><span class="pinbox">${svg("pin")}</span><div><b>${esc(X.notSet)}</b><small>${esc(SETUP.untilSet(FALLBACK_LOCATION.label))}</small></div></div></div>`;
  const btn = loc ? `${primary(X.looksRight, "A.obNext()")}` : `${primary(SETUP.useLocation, "A.obLocate()")}<button class="btn ghost ob-ghost" onclick="A.locationSheet()">${esc(X.searchCity)}</button><button class="skip" onclick="A.obNext()">${esc(SETUP.skipForNow)}</button>`;
  return stepFrame("where", `${card}<p class="note-i">${svg("info")}<span>${esc(X.calcNote)}</span></p>`, btn, X.whereEyebrow, X.whereTitle, X.whereLead);
}
/* Asr time on this step is today's, so each option shows the consequence of the choice. */
function asrFor(m) {
  const probe = { ...S.settings, asr: m === "hanafi" ? "hanafi" : "shafi" };
  return fmtT(timesFor(NOW(), probe).Asr);
}
function sMadhhab() {
  const cur = madhhabOf(S);
  const opts = madhhabOptions().map(o => `<button class="mcard ${cur === o.id ? "sel" : ""}" role="radio" aria-checked="${cur === o.id}" onclick="A.obMadhhab('${o.id}')"><span class="radio"></span><span class="mt"><b>${esc(o.name)}${o.isDefault ? `<em>${esc(MADHHAB_UI.defaultTag)}</em>` : ""}</b><small>${esc(o.summary)}</small></span><span class="masr"><small>${esc(X.asr)}</small><b>${asrFor(o.id)}</b></span></button>`).join("");
  return stepFrame("madhhab", `<div class="mlist" role="radiogroup">${opts}</div><p class="note-i">${svg("info")}<span>${esc(X.madhhabNote)}</span></p>`,
    primary(X.continueWith(madhhabOptions().find(o => o.id === cur).name), "A.obNext()"), X.madhhabEyebrow, X.madhhabTitle);
}
/* "Can you read Arabic?": sets transliteration and meaning in the tools (guide.applyReading). */
function sRead() {
  const cur = readingOf(S);
  return stepFrame("read", `<div class="mlist rd" role="radiogroup" aria-label="${esc(G.readTitle)}">${readCards(cur, "A.obRead")}</div>
    <div class="rdprev" aria-hidden="true"><div class="rp-lab">${esc(G.preview)}</div>${readPreview(cur)}</div><p class="note-i">${svg("info")}<span>${esc(G.readNote)}</span></p>`,
    primary(COMMON.continue, "A.obNext()"), G.readEyebrow, G.readTitle);
}
function sFeatures() {
  const rows = feat.featureRows(S), { on } = feat.featureCount(S);
  const tiles = rows.map(r => `<button class="ftile ${r.locked ? "locked" : r.on ? "on" : ""}" ${r.locked ? 'aria-disabled="true"' : `role="switch" aria-checked="${r.on}" onclick="A.obFeat('${r.id}')"`}><span class="fi">${svg(FEAT_ICON[r.id])}</span><span class="fk">${r.locked ? svg("lock") : r.on ? svg("check") : ""}</span><b>${esc(r.name)}</b><small>${esc(r.locked ? X.alwaysOn : r.sub)}</small></button>`).join("");
  const justOn = !feat.SWITCHABLE.some(f => feat.isOn(S, f));
  return stepFrame("features", `<div class="presets"><button class="${justOn ? "on" : ""}" onclick="A.obPreset('prayers')">${esc(X.justPrayers)}</button><button class="${feat.SWITCHABLE.every(f => feat.isOn(S, f)) ? "on" : ""}" onclick="A.obPreset('all')">${esc(X.everything)}</button></div><div class="ftiles">${tiles}</div><p class="note-i">${svg("info")}<span>${esc(X.featNote)}</span></p>`,
    primary(stepList().includes("owe") ? X.continueN(on) : X.continueN(on), "A.obNext()"), X.featEyebrow, X.featTitle);
}
function estimate() {
  const days = SPANS[owe.span] ?? 0, per = store.qadaKeys(S).length;
  return { prayers: days * per, fasts: Math.round(days / 354 * 30), days, per };
}
function sOwe() {
  const q = S.qada, hasWitr = store.qadaKeys(S).includes("Witr");
  const seg = ["yes", "no", "notsure"].map(k => `<button class="${owe.mode === k ? "on" : ""}" onclick="A.obOwe('${k}')">${esc(X[k === "notsure" ? "notSure" : k])}</button>`).join("");
  let body = "";
  if (owe.mode === "yes") {
    const e = estimate();
    const spans = [["none", X.none], ["under", X.underYear], ["oneTwo", X.oneTwo], ["threeFive", X.threeFive]];
    body = `<div class="panel owep"><h4>${esc(X.howLong)}</h4><div class="spans">${spans.map(([k, l]) => `<button class="${owe.span === k ? "sel" : ""}" onclick="A.obSpan('${k}')">${esc(l)}</button>`).join("")}</div>
      <button class="exact ${owe.exact ? "sel" : ""}" onclick="A.obExact()">${esc(X.exact)}<span>›</span></button>
      ${owe.exact ? `<div class="qgrid" style="margin-top:12px">${[...store.qadaKeys(S), "fasts"].map(p => `<div class="field"><label for="ob_${p}">${esc(p === "fasts" ? M.fasts : prayerName(p))}</label><input type="number" inputmode="numeric" min="0" id="ob_${p}" value="${q[p] || 0}"></div>`).join("")}</div>`
      : owe.span ? `<p class="est">${esc(X.about)} <b>${num(e.prayers)}</b> ${esc(X.prayersWord)} · ${num(e.fasts)} ${esc(X.fastsWord)}</p>${hasWitr ? `<p class="witrnote">${svg("check")}<span><b>${esc(X.includesWitr)}</b> · ${esc(X.witrWajib)}</span></p>` : ""}` : ""}
      <div class="hr"></div><h4>${esc(X.perDay)} <span>· ${esc(X.yourGoal)}</span></h4>
      <div class="goals">${[1, 2, 6].map(n => `<button class="${owe.goalPerDay === n ? "sel" : ""}" onclick="A.obGoal(${n})"><b>${n}</b><small>${esc(X.aMonth(n * 30))}</small></button>`).join("")}</div></div>`;
  } else if (owe.mode === "notsure") {
    body = `<div class="panel fine"><b>${esc(X.fine)}</b><p>${esc(X.fineBody)}</p></div>`;
  }
  return stepFrame("owe", `<div class="oseg">${seg}</div>${body}`, primary(X.start, "A.obFinish()"), X.oweEyebrow, X.oweTitle);
}

let notifOK = false;
function draw() {
  const root = $("#v-onboard");
  const sig = `${screen}|${JSON.stringify(S.settings.location)}|${S.settings.asr}|${S.settings.method}|${JSON.stringify(S.settings.features)}|${cloud.available}|${cloud.user?.email || ""}|${notifOK}|${JSON.stringify(owe)}|${readingOf(S)}`;
  if (sig === drawn && root.firstChild) return;
  drawn = sig;
  const f = { welcome: sWelcome, login: sLogin, restored: sRestored, nobackup: sNoBackup, name: sName, where: sWhere, madhhab: sMadhhab, read: sRead, features: sFeatures, owe: sOwe, crash: sCrash }[screen];
  const keep = root.querySelector("input")?.value;
  root.innerHTML = f();
  void keep;
  root.firstChild?.scrollTo?.(0, 0);
}
let drawn = "";

/* ---------- actions ---------- */
A.obGo = s => { screen = s; drawn = ""; commit(); };
A.obStart = () => A.obGo("name");
A.obBack = () => {
  const list = stepList(), i = list.indexOf(screen);
  if (screen === "name") return A.obGo("welcome");
  if (i > 0) { if (screen === "name") S.profile.name = ($("#obName")?.value || "").trim(); A.obGo(list[i - 1]); }
};
A.obNext = () => {
  const list = stepList(), i = list.indexOf(screen);
  if (screen === "name") S.profile.name = ($("#obName")?.value || "").trim();
  if (screen === "read") applyReading(S, readingOf(S)); // keep the answer shown, even if untouched
  if (screen === "features" && !list.includes("owe")) return A.obFinish();
  if (i < list.length - 1) A.obGo(list[i + 1]);
};
/** Brother / sister on the name screen: sets the defaults (store.applyGender); keeps the name typed so far. */
A.obGender = g => {
  S.profile.name = ($("#obName")?.value ?? S.profile.name ?? "").trim();
  store.applyGender(S, g, { todayKey: todayKey() }, NOW());
  drawn = ""; commit();
};
A.obMadhhab = m => { store.setMadhhab(S, m); commit(); };
A.obRead = k => { applyReading(S, k); commit(); };
A.obFeat = f => { feat.setFeature(S, f, !feat.isOn(S, f)); commit(); };
A.obPreset = p => { feat.applyPreset(S, p); commit(); };
A.obOwe = k => { owe.mode = k; if (k === "yes" && !owe.span) owe.span = "oneTwo"; drawn = ""; commit(); };
A.obSpan = k => { owe.span = k; owe.exact = false; drawn = ""; commit(); };
A.obExact = () => { owe.exact = !owe.exact; drawn = ""; commit(); };
A.obGoal = n => { owe.goalPerDay = n; drawn = ""; commit(); };

/* PM1: location ask (our own sheet first, then the system prompt) */
A.obLocate = () => {
  openSheet(`<div class="perm"><span class="permic">${svg("pin")}</span><h3>${esc(X.permLocTitle)}</h3><p>${esc(X.permLocBody)}</p>
    <div class="cta col">${primary(X.permLocYes, "A.obLocateGo()")}<button class="btn ghost" onclick="A.closeSheet();A.locationSheet()">${esc(X.permLocNo)}</button></div><p class="note c">${esc(X.permLocFoot)}</p></div>`);
};
A.obLocateGo = async () => {
  closeSheet(); toast(T.finding);
  try {
    const { lat, lng } = await currentPosition();
    S.settings.location = { lat, lng, label: await cityName(lat, lng), source: "gps" };
    commit();
  } catch (e) { toast(SETUP.locFailed); }
};

/* PM1: reminders ask */
function notifSheet() {
  const t = timesFor(NOW(), S.settings), nx = nextPrayer(NOW(), S.settings), nm = prayerName(nx.p);
  openSheet(`<div class="perm"><span class="permic">${svg("bell")}</span><h3>${esc(X.permNotTitle)}</h3><p>${esc(X.permNotBody)}</p>
    <div class="fakenote"><span class="appic">${logo(22)}</span><div><b>${esc(X.notifTitle)}</b><span class="now">${esc(X.now)}</span><i>${esc(nm)} · ${fmtT(nx.time)}</i><small>${esc(X.notifBody(nm))}</small></div></div>
    <div class="ptimes">${PRAYERS.map(p => `<div><span>${esc(prayerName(p))}</span><b>${fmtT(t[p])}</b></div>`).join("")}</div>
    <div class="cta col">${primary(X.permNotYes, "A.obNotifyYes()")}<button class="btn text" onclick="A.obNotifyNo()">${esc(X.permNotNo)}</button></div><p class="note c">${esc(X.permNotFoot)}</p></div>`);
}
A.obNotifyYes = async () => { const ok = await requestNotifications(); if (ok) S.settings.prayerAlerts = true; closeSheet(); completeSetup(); };
A.obNotifyNo = () => { closeSheet(); completeSetup(); };
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
A.obOpen = () => { screen = "welcome"; drawn = ""; go("home"); toast(SETUP.welcomeBack); };

A.obFinish = () => {
  // Apply the make-ups answer, then (native) ask about crash reports, then about reminders (PM1) before opening Home
  if (screen !== "crash" && (screen === "owe" || owe.mode)) {
    if (owe.mode === "yes") {
      if (owe.exact) { for (const p of [...store.qadaKeys(S), "fasts"]) S.qada[p] = Math.max(0, parseInt($(`#ob_${p}`)?.value) || 0); }
      else { const e = estimate(); for (const p of store.qadaKeys(S)) S.qada[p] = Math.round(e.days); S.qada.fasts = e.fasts; }
      S.qada.goal = owe.goalPerDay * 30;
    }
  }
  if (askCrash && screen !== "crash") { A.obGo("crash"); return; }
  if (isNativeAsk()) { notifSheet(); return; }
  completeSetup();
};
/** Crash-report step: true is the only "on"; native collection starts right away (crash.js). */
A.obCrash = yes => {
  S.settings.crashReports = !!yes;
  setCrashReporting(!!yes);
  commit();
  A.obFinish();
};
const isNativeAsk = () => true; // always show our pre-ask; the system prompt follows only on "Turn on reminders"
function completeSetup() {
  S.profile.onboarded = true;
  S.createdKey = todayKey();
  queueTour(S); // the Home tour shows once, now
  screen = "welcome"; drawn = "";
  commit();
  go("home");
  toast(SETUP.welcomeName(S.profile.name));
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
onRender(() => { if (UI.view === "onboard") draw(); });

/* ---------- lock screen (LK2) ---------- */
function renderLock() {
  const el = $("#lock");
  if (!el) return;
  const now = NOW(), nx = nextPrayer(now, S.settings);
  const mins = Math.max(0, Math.round((nx.time - now) / 60000));
  const date = `${DOW[now.getDay()]} ${now.getDate()} ${MON[now.getMonth()]}`;
  const longDay = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][now.getDay()];
  const hj = hijriLabel(now).replace(/ \d{4}$/, "");
  el.innerHTML = `<svg class="pattern" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice"><rect width="100%" height="100%" fill="url(#st)"/></svg>
    <div class="lock-in">${logo(64)}<p class="lock-date">${esc(longDay)} ${now.getDate()} ${esc(MON[now.getMonth()])}${hj ? ` · ${esc(hj)}` : ""}</p>
    <h1>${esc(X.greet(S.profile.name))}</h1>
    <div class="nextpill">${svg("clock")}<span>${esc(prayerName(nx.p))} at <b>${fmtT(nx.time)}</b> · in ${esc(TIMES.hm(Math.floor(mins / 60), mins % 60))}</span></div>
    <div class="grow"></div>
    <button class="fp" onclick="A.unlock()" aria-label="${esc(X.unlock)}"><span>${svg("finger")}</span></button>
    <p class="touch">${esc(X.lockTouch)}</p><p class="pin">${esc(X.lockOr)} <button onclick="A.unlock()">${esc(X.lockPin)}</button></p></div>`;
}
onRender(renderLock);
