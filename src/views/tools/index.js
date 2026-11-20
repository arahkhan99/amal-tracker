/* Read (#v-tools): the front page (views/read.js: chapters For today · Qurʾān · Adhkār) and the readers
   (adhkār, durūd, Hizb al-Aʿzam, the mushaf, Manzil, after ṣalāh), with routing between them.
   Registers onRender for #v-tools. Imported once from main.js. */
import "../../css/tools.css";
import { onRender, UI } from "../../app.js";
import { A, S, $, open, setDraw, redraw, prefs, persist, openSheet, closeSheet, COMMON, T, I } from "./core.js";
import { toolVisible, visibleTools, isOn } from "../../features.js";
import { TOOL_NAME, TOOL_SUB } from "../../strings.js";
import { TT } from "./strings-tools.js";
import { syncFloatTip } from "./tips.js";
import { adhkarView, adhkarAfter } from "./adhkar.js";
import { durudView, durudReadView } from "./durud.js";
import { hizbView, hizbReadView, hizbReadAfter, hizbReadLeave, loadHizb } from "./hizb.js";
import { pickerView, quranView, quranAfter, quranLeave, quranPage } from "./quran.js";
import { manzilView, manzilAfter } from "./manzil.js";
import { afterSalahView, afterSalahAfter } from "./after-salah.js";
import { renderRead, leaveRead } from "../read.js";

// Names of the Round 2 tools for the Settings rows (features.toolRows) until strings.js carries them; never overrides.
for (const [k, v] of Object.entries(TT.toolName)) if (!TOOL_NAME[k]) TOOL_NAME[k] = v;
for (const [k, v] of Object.entries(TT.toolSub)) if (!TOOL_SUB[k]) TOOL_SUB[k] = v;

const TOOLS = ["adhkar", "afterSalah", "hizb", "durud", "manzil", "quran"];
const TOOL_OF = { adhkar: "adhkar", durud: "durud", durudRead: "durud", hizb: "hizb", hizbRead: "hizb", quran: "quran", picker: "quran", manzil: "manzil", afterSalah: "afterSalah" };
const PARENT = { adhkar: "hub", durud: "hub", hizb: "hub", quran: "hub", durudRead: "durud", hizbRead: "hizb", picker: "quran", manzil: "hub", afterSalah: "hub", hub: null };

/* ---------- drawing ---------- */
let last = { screen: null, n: null, m: null };

function screenHtml(screen) {
  switch (screen) {
    case "adhkar": return adhkarView();
    case "durud": return durudView();
    case "durudRead": return durudReadView();
    case "hizb": return hizbView();
    case "hizbRead": return hizbReadView();
    case "picker": return pickerView();
    case "quran": return quranView();
    case "manzil": return manzilView();
    case "afterSalah": return afterSalahView();
    default: return "";
  }
}

function draw() {
  const root = $("#v-tools"); if (!root) return;
  const onTools = root.classList.contains("on");
  if (!onTools) { leave(); return; }
  if (!isOn(S, "tools") || !visibleTools(S).length) { T.screen = "hub"; }
  const want = TOOL_OF[T.screen];
  if (want && !toolVisible(S, want)) T.screen = "hub";
  const screen = T.screen;
  const hide = screen !== "hub";
  if (hide !== !!UI.navHidden) { UI.navHidden = hide; A.syncNav?.(); } // the bar comes back on the front page
  if (last.screen === "hizbRead") hizbReadLeave();
  if (last.screen === "quran" && screen !== "quran") quranLeave();
  root.dataset.screen = screen;
  root.dataset.sz = String(prefs().size);
  if (screen === "hub") {
    // the chapters page: built once, then only the chapters that changed are redrawn
    T.readItem = null; T.entry = null;
    if (last.screen !== "hub") { root.innerHTML = ""; delete root.dataset.sig; $("#screen").scrollTop = 0; }
    renderRead(root);
    syncFloatTip(false);
    last = { screen };
    return;
  }
  if (last.screen === "hub") leaveRead(root);
  const same = last.screen === screen && last.n === T.durudN && last.m === T.manzil && last.pg === T.page;
  const scroller = $("#screen");
  const y = same ? scroller.scrollTop : 0;
  delete root.dataset.sig;
  root.innerHTML = `<div class="tl-root">${screenHtml(screen)}</div>`;
  last = { screen, n: T.durudN, m: T.manzil, pg: T.page };
  scroller.scrollTop = y;
  if (screen === "adhkar") adhkarAfter();
  if (screen === "hizbRead") hizbReadAfter();
  if (screen === "quran") quranAfter();
  syncFloatTip(screen === "quran");
  if (screen === "manzil") manzilAfter();
  if (screen === "afterSalah") afterSalahAfter();
}
function leave() {
  hizbReadLeave(); quranLeave(); syncFloatTip(false);
  const root = $("#v-tools");
  if (root && last.screen === "hub") leaveRead(root);
  last = { screen: null };
}
setDraw(draw);
onRender(draw);

/* ---------- navigation ---------- */
A.toolsOpen = (tool, opts = {}) => {
  if (!toolVisible(S, tool)) return;
  T.set = null; T.resumed = false; T.readItem = null; T.entry = null;
  if (!opts.keepPrayer) { T.asPrayer = null; T.asKey = null; }
  if (tool === "quran") open("quran", { page: quranPage(), bars: false });
  else if (tool === "hizb") { loadHizb(); open("hizb", { manzil: null }); }
  else open(tool);
};
A.toolsRead = A.toolsOpen;
A.tlBack = () => {
  // a reader opened straight from Read (For today, the Qurʾān chapter) goes back to Read
  const up = T.entry === T.screen ? "hub" : PARENT[T.screen];
  if (!up) { A.go("home"); return; }
  T.set = null; T.asPrayer = null; T.asKey = null; T.entry = null;
  if (up === "hub" || T.screen !== "picker") T.readItem = null;
  open(up);
};
/** For the Android back button (main.js): true when it handled the press inside Read. */
A.toolsBack = () => {
  if ($("#scrim").classList.contains("on")) { closeSheet(); return true; }
  if (UI.view !== "tools" || T.screen === "hub") return false;
  A.tlBack(); return true;
};
A.toolsSettings = () => { if (A.settingsTools) A.settingsTools(); else A.go("settings"); };

/** Next in a reader's done bar: scroll to the next card / duʿāʾ / passage below the top of the screen. */
A.readNextCard = sel => {
  const sc = $("#screen"), top = sc.getBoundingClientRect().top;
  const head = document.querySelector("#v-tools .tl-rhead, #v-tools .tl-rdhead");
  const off = (head ? Math.max(0, head.getBoundingClientRect().bottom - top) : 0) + 12; // the band scrolls away
  const els = [...document.querySelectorAll(`#v-tools ${sel}`)];
  const next = els.find(e => e.getBoundingClientRect().top - top > off + 8);
  if (next) sc.scrollTo({ top: sc.scrollTop + next.getBoundingClientRect().top - top - off, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
};

/* ---------- Aa (reading settings) ---------- */
A.tlAa = tool => {
  const p = prefs();
  const sw = (key, label, sub) => `<div class="tl-aarow"><div class="t"><b>${label}</b>${sub ? `<small>${sub}</small>` : ""}</div><button type="button" class="switch${p[key] ? " on" : ""}" role="switch" aria-checked="${!!p[key]}" aria-label="${label}" onclick="A.tlPref('${key}','${tool}')"></button></div>`;
  openSheet(`<h3>${TT.aa}</h3>
    <div class="tl-aarow col"><div class="t"><b>${TT.size}</b></div><div class="tl-sizes" role="radiogroup">${TT.sizes.map((l, i) => `<button type="button" role="radio" aria-checked="${p.size === i}" class="${p.size === i ? "on" : ""}" style="font-size:${13 + i * 2}px" onclick="A.tlSize(${i},'${tool}')">${l}</button>`).join("")}</div></div>
    ${tool === "manzil" ? sw("manzilTr", TT.showTranslation, TT.pickthallFrom) : sw("translit", TT.showTranslit, TT.draftSub) + sw("translation", TT.showTranslation, TT.draftSub)}
    ${tool === "adhkar" ? sw("evWords", TT.eveningWords, TT.eveningWordsSub) : ""}
    ${A.fbAaRow?.(tool) || ""}
    <div class="cta"><button class="btn primary" onclick="A.closeSheet()">${COMMON.done}</button></div>`);
};
A.tlPref = (k, tool) => { const p = prefs(); p[k] = !p[k]; persist(); A.tlAa(tool); redraw(); };
A.tlSize = (i, tool) => { prefs().size = i; persist(); A.tlAa(tool); redraw(); };

/* ---------- the Read button on a reading deed still in the Good deeds sheet (its tool hidden: then "") ---------- */
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
