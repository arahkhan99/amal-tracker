/* Settings → Help & tour: the page, "How statuses work" and "How make-ups work" (short in-app pages),
   and the "How you read" sheet. The reading preview and choices are shared with the setup step. */
import { S, A, commit, toast, openSheet, go } from "../app.js";
import * as store from "../store.js";
import { esc } from "../util.js";
import { isOn } from "../features.js";
import { GUIDE as G, STATUS, COMMON } from "../strings.js";
import { READING, applyReading, readingOf, replayTour, markHelpOpened } from "../guide.js";

const infoSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.01"/></svg>';

/** The preview card's content for an answer. "Not yet" looks like "A little" (same switches). */
export function readPreview(k) {
  const ar = `<p class="rp-ar" lang="ar" dir="rtl">${esc(G.previewAr)}</p>`;
  return k === "yes" ? `${ar}<div class="rp-more">${infoSvg}<span>${esc(G.meaningTap)}</span></div>`
    : `${ar}<p class="rp-tr">${esc(G.previewTr)}</p><p class="rp-mn">${esc(G.previewMn)}</p>`;
}
/** The three answers as setup cards (forest screen). */
export function readCards(cur, fn) {
  return READING.map(k => `<button class="mcard ${cur === k ? "sel" : ""}" role="radio" aria-checked="${cur === k}" onclick="${fn}('${k}')"><span class="radio"></span><span class="mt"><b>${esc(G.readOpts[k][0])}</b><small>${esc(G.readOpts[k][1])}</small></span></button>`).join("");
}

/* ---------- How you read (sheet) ---------- */
A.readSheet = () => {
  const cur = readingOf(S);
  const opts = READING.map(k => `<button class="opt mopt ${cur === k ? "sel" : ""}" role="radio" aria-checked="${cur === k}" onclick="A.pickRead('${k}')"><div><b>${esc(G.readOpts[k][0])}</b><small>${esc(G.readOpts[k][1])}</small></div><span class="radio${cur === k ? " on" : ""}"></span></button>`).join("");
  openSheet(`<div class="sheet-head"><h3>${esc(G.readTitle)}</h3><button class="link-btn" onclick="A.closeSheet()">${esc(COMMON.done)}</button></div>
    <p>${esc(G.readLead)}</p><div class="opts" role="radiogroup" aria-label="${esc(G.readTitle)}">${opts}</div>
    <div class="rdprev" aria-hidden="true"><div class="rp-lab">${esc(G.preview)}</div>${readPreview(cur)}</div>`);
};
A.pickRead = k => { applyReading(S, k); commit(); toast(G.readSaved(G.readShort[k])); A.readSheet(); };

/* ---------- actions ---------- */
A.helpOpen = () => { markHelpOpened(S); commit(); A.settingsPage("help"); };
/** Replay: queue the tour, bring the tool tips back, and go to Home where it starts. */
A.helpReplay = () => { replayTour(S); commit(); go("home"); };

/* ---------- pages ---------- */
const MK = {
  congregation: ["c", '<path d="M2.5 12.8l4.2 4.2L15 8.5"/><path d="M11.2 16.4l.6.6L20 8.5"/>'],
  ontime: ["o", '<path d="M5 12.5l4.5 4.5L19 7.5"/>'],
  madeup: ["r", '<path d="M4.5 12a7.5 7.5 0 1 0 2.3-5.4"/><path d="M4.2 4.2v4.6h4.6"/>'],
  missed: ["m", '<path d="M7 12h10"/>'],
  excused: ["x", '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>'],
};
const marker = k => k ? `<span class="z-mk z-${MK[k][0]}"><svg viewBox="0 0 24 24" aria-hidden="true">${MK[k][1]}</svg></span>` : `<span class="z-mk z-u"></span>`;
const item = (k, title, text) => `<div class="hp-item">${marker(k)}<div class="t"><b>${esc(title)}</b><p>${esc(text)}</p></div></div>`;
const textCard = (title, paras) => `<section class="sgroup">${title ? `<h2>${esc(title)}</h2>` : ""}<div class="card scard hp-text">${paras.filter(Boolean).map(p => `<p>${esc(p)}</p>`).join("")}</div></section>`;

/** The Help & tour pages. `h` = Settings' row helpers { head, group, navRow }. */
export function helpPage(page, h) {
  if (page === "hStatus") return statusPage(h);
  if (page === "hMakeups") return makeupsPage(h);
  const r = readingOf(S);
  const short = !isOn(S, "tools") || !isOn(S, "progress");
  const contact = `<section class="sgroup"><h2>${esc(G.touch)}</h2><div class="card scard"><div class="srow"><a class="srow-main arow" href="mailto:${G.email}"><span class="ic grey"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3.5 7.5l8.5 6 8.5-6"/></svg></span><span class="t"><b>${esc(G.contact)}</b><small>${esc(G.email)}</small></span><span class="chev" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></span></a></div></div><p class="sfoot">${esc(G.contactFoot)}</p></section>`;
  return `${h.head(G.helpTitle)}<p class="spage-lead">${esc(G.helpLead)}</p>
  ${h.group(G.learn, [
    h.navRow({ icon: "play", title: G.replay, sub: short ? G.replaySubShort : G.replaySub, onclick: "A.helpReplay()" }),
    h.navRow({ icon: "book", title: G.howRead, sub: G.howReadSub, value: G.readShort[r], onclick: "A.readSheet()" }),
    h.navRow({ icon: "checkc", tone: "green", title: G.howStatus, sub: G.howStatusSub, onclick: "A.settingsPage('hStatus')" }),
    ...(isOn(S, "makeups") ? [h.navRow({ icon: "refresh", tone: "green", title: G.howMakeups, sub: G.howMakeupsSub, onclick: "A.settingsPage('hMakeups')" })] : []),
  ])}${contact}<div class="space"></div>`;
}

function statusPage(h) {
  const mk = isOn(S, "makeups"), ex = S.settings.excusedDays !== false;
  const items = [
    item("congregation", STATUS.congregation, G.stItems.congregation),
    item("ontime", STATUS.ontime, G.stItems.ontime),
    item("madeup", STATUS.madeup, G.stItems.madeup),
    item("missed", STATUS.missed, mk ? G.stItems.missed : G.stItems.missedNoTab),
    ...(ex ? [item("excused", STATUS.excused, G.stItems.excused)] : []),
    item("", G.stNotLogged, G.stNotLoggedP),
  ].join("");
  return `${h.head(G.howStatus, "A.settingsBack()")}<p class="spage-lead">${esc(G.stLead)}</p>
  <section class="sgroup"><div class="card scard hp-list">${items}</div></section>
  ${textCard(G.stStreaks, [G.stStreakAll, G.stStreakOnTime, G.stStreakSame, ex ? G.stStreakExcused : "", G.stStreakToday])}
  ${textCard("", [isOn(S, "sunnah") ? G.stSunnah : "", G.stChange])}<div class="space"></div>`;
}

function makeupsPage(h) {
  const witr = store.qadaKeys(S).includes("Witr"), ex = S.settings.excusedDays !== false;
  return `${h.head(G.howMakeups, "A.settingsBack()")}<p class="spage-lead">${esc(G.mkLead)}</p>
  ${textCard(G.mkAddsH, [G.mkAdds, witr ? G.mkWitr : "", ex ? G.mkExcused : ""])}
  ${textCard(G.mkSameH, [G.mkSame, G.mkSameUntil, G.mkSameStreak])}
  ${textCard(G.mkOffH, [G.mkOff, G.mkUndo, G.mkAdjust, G.mkGoal, G.mkFasts])}<div class="space"></div>`;
}
