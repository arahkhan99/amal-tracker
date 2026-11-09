/* Tools: the hub (TH-A), routing between the tool screens, and the Home cards (SC1 / AH1).
   Registers onRender for #v-tools. Imported once from main.js. */
import "../../css/tools.css";
import { onRender, UI, commit } from "../../app.js";
import { A, S, $, NOW, todayKey, esc, I, T, open, setDraw, redraw, prefs, persist, head, info, openSheet, closeSheet, COMMON, APP, dkey, addDays, store } from "./core.js";
import { toolVisible, visibleTools, isOn } from "../../features.js";
import { TOOLS_UI, TOOL_NAME } from "../../strings.js";
import { hijriLabel } from "../../hijri.js";
import { timesFor, weekDates } from "../../times.js";
import { fmt12, MON3, DOW } from "../../util.js";
import { TT } from "./strings-tools.js";
import { adhkarView, adhkarAfter, autoSet, setState, progress as adhkarProgress, eveningOpen } from "./adhkar.js";
import { durudView, durudReadView, durudKey, readCount, durudDone, isFridayish, minutes as durudMinutes } from "./durud.js";
import { hizbView, hizbReadView, hizbReadAfter, hizbReadLeave, manzilToday, manzilRead, readCountWeek, loadHizb, resumePos, hizbReady } from "./hizb.js";
import { pickerView, quranView, quranAfter, quranLeave, loadQuranMeta, quranPage, quranMushaf, quranHasStarted, pagesToday, surahName, mushafName } from "./quran.js";
import { ADHKAR } from "../../tools/data/adhkar.js";

const TOOLS = ["adhkar", "hizb", "durud", "quran"];
const TOOL_OF = { adhkar: "adhkar", durud: "durud", durudRead: "durud", hizb: "hizb", hizbRead: "hizb", quran: "quran", picker: "quran" };
const PARENT = { adhkar: "hub", durud: "hub", hizb: "hub", quran: "hub", durudRead: "durud", hizbRead: "hizb", picker: "quran", hub: null };

/* ---------- hub ---------- */
const icon = { adhkar: I.sunmoon, hizb: I.shield, durud: I.flower, quran: I.book };
const SOON_ICON = { ramadan: I.lantern, tasbih: I.beads, qibla: I.qibla };

function adhkarTile(now) {
  const t = timesFor(now, S.settings);
  const m = setState("morning"), e = setState("evening");
  const row = (ok, due, label) => `<div class="tl-ss ${ok ? "ok" : due ? "due" : "later"}"><i>${ok ? I.check : ""}</i><span>${label}</span></div>`;
  const mp = adhkarProgress("morning"), ep = adhkarProgress("evening");
  const eveningLabel = ep.complete ? `${TT.evening} · ${fmt12(new Date(e.done))}` : eveningOpen(now) ? `${TT.evening} · ${TT.tag.today.toLowerCase()}` : `${TT.evening} · after ʿAsr`;
  return { tag: ["daily", TT.tag.daily], body: `${row(mp.complete, !mp.complete && autoSet(now) === "morning", mp.complete ? `${TT.morning} · ${fmt12(new Date(m.done))}` : `${TT.morning}${autoSet(now) === "morning" ? " · due" : ""}`)}${row(ep.complete, !ep.complete && eveningOpen(now), eveningLabel)}` };
}
function hizbTile(now) {
  const m = manzilToday(now), n = readCountWeek(now);
  const pips = [1, 2, 3, 4, 5, 6, 7].map(k => `<i class="${manzilRead(k, now) ? "d" : k === m ? "n" : ""}"></i>`).join("");
  const ok = manzilRead(m, now);
  return { tag: ["gold", TT.tag.today], body: `<div class="tl-ss ${ok ? "ok" : "due"}"><i>${ok ? I.check : ""}</i><span>${TOOLS_UI.manzilOf(m)}${ok ? "" : " today"}</span></div><div class="tl-pips7">${pips}</div>` };
}
function durudTile(now) {
  const key = durudKey(now), n = readCount(key), fri = isFridayish(now);
  const t = timesFor(now, S.settings);
  const done = durudDone(key);
  const line = done ? TT.allDoneToday : n ? TT.durudOf(n) : fri ? (now.getDay() === 4 ? `From Maghrib tonight` : TT.tag.today) : TT.fridayLine;
  const dur = S.tools?.durud || {};
  const last = Object.keys(dur).filter(k => dur[k].done).sort().pop();
  let lastL = "";
  if (last) { const d = new Date(+last.slice(0, 4), +last.slice(5, 7) - 1, +last.slice(8, 10)); lastL = `Last read ${DOW[d.getDay()]} ${d.getDate()} ${MON3[d.getMonth()]}`; }
  return { tag: [fri ? "ok" : "daily", fri ? TT.tag.friday : TT.tag.daily], body: `<div class="tl-ss ${done ? "ok" : fri && now >= t.Fajr ? "due" : "later"}"><i>${done ? I.check : ""}</i><span>${esc(line)}</span></div>${lastL ? `<small class="tl-last">${esc(lastL)}</small>` : ""}` };
}
function quranTile() {
  loadQuranMeta();
  const n = pagesToday(), last = quranHasStarted();
  const line = n ? TT.pagesToday(n) : last ? TT.continueReading : TT.openQuran;
  return { tag: ["daily", TT.tag.daily], body: `<div class="tl-ss ${n ? "ok" : "later"}"><i>${n ? I.check : ""}</i><span>${esc(line)}</span></div>${last ? `<small class="tl-last">${esc(mushafName(quranMushaf()))} · page ${quranPage()}</small>` : ""}` };
}

function hubView() {
  const now = NOW();
  const vis = visibleTools(S);
  const tiles = TOOLS.filter(t => vis.includes(t)).map(t => ({ t, ...({ adhkar: adhkarTile, hizb: hizbTile, durud: durudTile, quran: quranTile })[t](now) }));
  const grid = tiles.map((x, i) => `<button type="button" class="tl-tile${tiles.length % 2 && i === tiles.length - 1 ? " wide" : ""}" onclick="A.toolsOpen('${x.t}')" aria-label="${esc(TOOL_NAME[x.t])}">
      <div class="tl-top"><span class="tl-tic${x.t === "hizb" ? " g" : ""}">${icon[x.t]}</span><span class="tl-tag ${x.tag[0]}">${esc(x.tag[1])}</span></div>
      <span class="tl-arn" lang="ar" dir="rtl">${esc(TT.arName[x.t])}</span><b class="tl-ten">${esc(x.t === "adhkar" ? TT.adhkarTitle : x.t === "hizb" ? "Al-Hizb al-Aʿzam" : x.t === "durud" ? TT.durudTitle : TT.quranTitle)}</b>
      <div class="tl-tst">${x.body}</div></button>`).join("");
  const excused = store.isExcusedDay?.(S, todayKey());
  return `<div class="tl-ph hub"><div class="tl-pt"><h1>${TT.title}</h1><p>${DOW_LONG[now.getDay()]} ${now.getDate()} ${MON_LONG[now.getMonth()]} · <span class="tl-hij">${esc(hijriLabel(now))}</span></p></div>
      <button type="button" class="tl-ibtn" aria-label="${TT.settings}" onclick="A.toolsSettings()">${I.sliders}</button></div>
    ${tiles.length ? `<div class="tl-sech"><h2>${TT.yourTools}</h2><span>${DOW_LONG[now.getDay()]}</span></div><div class="tl-tgrid">${grid}</div>
      <p class="tl-cap">${excused ? TT.excusedNote + " " : ""}${TT.voluntary}</p>` : `<div class="tl-empty"><b>${TT.noTools}</b><p>${TT.noToolsHint}</p><button class="tl-cta sm" onclick="A.toolsSettings()">${TT.settings}</button></div>`}
    <div class="tl-sech"><h2>${TT.comingLater}</h2></div>
    <div class="tl-soon">${TT.soon.map(s => `<div class="tl-tile soon"><span class="tl-tic">${SOON_ICON[s.id]}</span><b>${esc(s.name)}</b><small>${TT.later.toUpperCase()}</small></div>`).join("")}</div><div class="space"></div>`;
}
const DOW_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MON_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/* ---------- drawing ---------- */
let last = { screen: null, n: null, m: null }, navHidden = false;

function screenHtml(screen) {
  switch (screen) {
    case "adhkar": return adhkarView();
    case "durud": return durudView();
    case "durudRead": return durudReadView();
    case "hizb": return hizbView();
    case "hizbRead": return hizbReadView();
    case "picker": return pickerView();
    case "quran": return quranView();
    default: return hubView();
  }
}

function draw() {
  const root = $("#v-tools"); if (!root) return;
  const onTools = root.classList.contains("on");
  const nav = $("#nav");
  if (!onTools) {
    leave();
    if (navHidden) { navHidden = false; if (nav && UI.view !== "onboard") nav.hidden = false; }
    return;
  }
  if (!isOn(S, "tools") || !visibleTools(S).length) { T.screen = "hub"; }
  const want = TOOL_OF[T.screen];
  if (want && !toolVisible(S, want)) T.screen = "hub";
  const screen = T.screen;
  const hide = screen !== "hub";
  if (nav) { nav.hidden = hide; navHidden = hide; }
  const same = last.screen === screen && last.n === T.durudN && last.m === T.manzil && last.pg === T.page;
  const scroller = $("#screen");
  const y = same ? scroller.scrollTop : 0;
  if (last.screen === "hizbRead" && (screen !== "hizbRead")) hizbReadLeave();
  if (last.screen === "quran" && screen !== "quran") quranLeave();
  if (last.screen === "hizbRead" && screen === "hizbRead") hizbReadLeave();
  root.dataset.screen = screen;
  root.dataset.sz = String(prefs().size);
  root.innerHTML = `<div class="tl-root">${screenHtml(screen)}</div>`;
  last = { screen, n: T.durudN, m: T.manzil, pg: T.page };
  scroller.scrollTop = y;
  if (screen === "adhkar") adhkarAfter();
  if (screen === "hizbRead") hizbReadAfter();
  if (screen === "quran") quranAfter();
}
function leave() { hizbReadLeave(); quranLeave(); last = { screen: null }; }
setDraw(draw);
onRender(draw);

/* ---------- navigation ---------- */
A.toolsOpen = tool => {
  if (!toolVisible(S, tool)) return;
  T.set = null; T.resumed = false;
  if (tool === "quran") open("quran", { page: quranPage(), bars: false });
  else if (tool === "hizb") { loadHizb(); open("hizb", { manzil: null }); }
  else open(tool);
};
A.toolsRead = A.toolsOpen;
A.tlBack = () => {
  const up = PARENT[T.screen];
  if (!up) { A.go("home"); return; }
  T.set = null;
  open(up);
};
/** For the Android back button (main.js): true when it handled the press inside Tools. */
A.toolsBack = () => {
  if ($("#scrim").classList.contains("on")) { closeSheet(); return true; }
  if (UI.view !== "tools" || T.screen === "hub") return false;
  A.tlBack(); return true;
};
A.toolsSettings = () => { if (A.settingsTools) A.settingsTools(); else A.go("settings"); };

/* ---------- Aa (reading settings) ---------- */
A.tlAa = tool => {
  const p = prefs();
  const sw = (key, label, sub) => `<div class="tl-aarow"><div class="t"><b>${label}</b>${sub ? `<small>${sub}</small>` : ""}</div><button type="button" class="switch${p[key] ? " on" : ""}" role="switch" aria-checked="${!!p[key]}" aria-label="${label}" onclick="A.tlPref('${key}','${tool}')"></button></div>`;
  openSheet(`<h3>${TT.aa}</h3>
    <div class="tl-aarow col"><div class="t"><b>${TT.size}</b></div><div class="tl-sizes" role="radiogroup">${TT.sizes.map((l, i) => `<button type="button" role="radio" aria-checked="${p.size === i}" class="${p.size === i ? "on" : ""}" style="font-size:${13 + i * 2}px" onclick="A.tlSize(${i},'${tool}')">${l}</button>`).join("")}</div></div>
    ${sw("translit", TT.showTranslit, TT.draftSub)}${sw("translation", TT.showTranslation, TT.draftSub)}
    ${tool === "adhkar" ? sw("evWords", TT.eveningWords, TT.eveningWordsSub) : ""}
    <div class="cta"><button class="btn primary" onclick="A.closeSheet()">${COMMON.done}</button></div>`);
};
A.tlPref = (k, tool) => { const p = prefs(); p[k] = !p[k]; persist(); A.tlAa(tool); redraw(); };
A.tlSize = (i, tool) => { prefs().size = i; persist(); A.tlAa(tool); redraw(); };

/* ---------- Home cards ---------- */
/** SC1 "wird now" card. `key` is the day Home shows; returns "" when nothing is due. */
export function toolsHomeCards(key = todayKey()) {
  if (!isOn(S, "tools")) return "";
  const now = NOW();
  if (key !== dkey(now)) return "";
  const t = timesFor(now, S.settings);
  const rows = [];
  const later = [];
  const btn = (cls, label, tool, icn) => `<button type="button" class="tl-sbtn ${cls}" onclick="A.toolsOpen('${tool}')">${icn || ""}${label}</button>`;
  const mins = n => `about ${n} min`;
  const afterFajr = now >= t.Fajr && now < t.Asr, afterAsr = now >= t.Asr || now < t.Fajr;
  if (toolVisible(S, "adhkar")) {
    const set = afterFajr ? "morning" : "evening";
    const pg = adhkarProgress(set);
    if (!pg.complete && (afterFajr || afterAsr)) rows.push({ tool: "adhkar", icon: afterFajr ? I.sun : I.moon, title: set === "morning" ? TOOLS_UI.morning : TOOLS_UI.evening, sub: `${ADHKAR.length} adhkār · ${mins(Math.max(4, Math.round(pg.total * 0.24)))}`, started: pg.said > 0 });
    if (afterFajr && !adhkarProgress("evening").complete) later.push(`evening adhkār after ʿAsr`);
  }
  if (toolVisible(S, "hizb") && now >= t.Fajr) {
    const m = manzilToday(now);
    if (!manzilRead(m, now)) rows.push({ tool: "hizb", icon: I.shield, title: `Hizb al-Aʿzam · manzil ${m}`, sub: `${["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"][m - 1]}’s manzil${m === 7 ? " · ends the week" : ""}`, started: !!resumePos(m, now) });
  }
  if (toolVisible(S, "durud") && isFridayish(now)) {
    const k = durudKey(now);
    if (!durudDone(k)) rows.push({ tool: "durud", icon: I.flower, title: `${TT.durudTitle} · ${readCount(k)}/40`, sub: `Jumuʿah: send abundant durūd · about ${durudMinutes()} min`, started: readCount(k) > 0 });
  }
  if (toolVisible(S, "quran")) { const n = pagesToday(); later.push(n ? TT.pagesToday(n) : "Qurʾān"); }
  if (!rows.length) return "";
  const kick = isFridayish(now) && rows.some(r => r.tool === "durud") ? (now.getDay() === 4 ? "JUMUʿAH NIGHT" : TT.tag.friday.toUpperCase()) : afterFajr ? "AFTER FAJR" : "AFTER ʿASR";
  const right = afterFajr ? `Sunrise ${fmt12(t.Sunrise)}` : `Maghrib ${fmt12(t.Maghrib)}`;
  const ls = later.filter(Boolean);
  return `<div class="tl-sm${isFridayish(now) && rows.some(r => r.tool === "durud") ? " fri" : ""}"><div class="tl-smh"><span class="tl-smk">${afterFajr ? I.sun : I.moon}${esc(kick)}</span><span>${esc(right)}</span></div>
    ${rows.map((r, i) => `<div class="tl-wr${i === 0 ? " now" : ""}"><span class="tl-tic sm${r.tool === "hizb" ? "" : ""}">${r.icon}</span><div class="t"><b>${esc(r.title)}</b><small>${esc(r.sub)}</small></div>${btn(i === 0 ? "" : "ghost", r.started ? "Resume" : i === 0 ? "Start" : "Read", r.tool, i === 0 ? I.play : "")}</div>`).join("")}
    <div class="tl-smf"><span>${ls.length ? "Later: " + esc(ls.join(" · ")) : ""}</span><button type="button" onclick="A.go('tools')">All ›</button></div></div>`;
}

/** AH1: the small "Read" button on a Good Deeds row (morning, evening, quran, salawat). "" when it does not apply. */
export function toolsAmalRead(id) {
  const map = { morning: "adhkar", evening: "adhkar", quran: "quran", salawat: "durud" };
  const tool = map[id];
  if (!tool || !toolVisible(S, tool)) return "";
  const set = id === "morning" ? "morning" : id === "evening" ? "evening" : null;
  const act = set ? `A.tlReadSet('${set}')` : `A.toolsOpen('${tool}')`;
  const label = id === "quran" ? "Open" : "Read";
  return `<button type="button" class="tl-amal-read" onclick="event.stopPropagation();${act}">${I.play}<span>${label}</span></button>`;
}
A.tlReadSet = set => { T.set = set; open("adhkar"); };

export { TOOLS };
