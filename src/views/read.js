/*
 * The Read tab's front page (#v-tools while no reader is open): chapters For today · Qurʾān · Adhkār,
 * built with views/chapters.js (the same component as Today: swipe or tap the names, keyboard, reduced motion,
 * each chapter scrolls on its own). The readers themselves are views/tools/*; tools/index.js draws them.
 *
 * - For today: "Today's reading · n of m done", each due reading with Read / Open and a tick (rules: src/reading.js;
 *   a tick writes the same day log as the Good deeds sheet), then "This week" as one row (the weekly readings sheet).
 *   With a Qurʾān goal (views/quran-goal.js) the recitation row shows its progress ("3 of 5 pages today" and a bar),
 *   opens the reader when tapped, and has "I read…" for reading in your own mushaf.
 * - Qurʾān: continue reading, the reading goal's card, al-Kahf, al-Mulk, Manzil, all sūrahs and juzʾ.
 * - Adhkār: morning, evening, after ṣalāh, Hizb al-Aʿzam, durūd, and tips.
 * Each item follows Settings → Features (tools); a chapter with nothing in it is left out.
 */
import { S, A, NOW, todayKey, esc, I, T, open, redraw, openSheet, toast, COMMON } from "./tools/core.js";
import { UI, commit, avatarBtn, render, onRender } from "../app.js";
import * as store from "../store.js";
import { makeChapters, setHTML } from "./chapters.js";
import { readItems, todayGroups, setReadDone, isReadDone, isJumuah, slotOf, jumuahKey } from "../reading.js";
import { toolVisible, isOn, visibleTools } from "../features.js";
import { READ, GUIDE, PRAYER_NAME, NAV, QGOAL, WEEK_UI } from "../strings.js";
import { timesFor } from "../times.js";
import { dkey, DOW, MON3 } from "../util.js";
import { thisWeek, contentReady, whenContent, loadContent, setSahabiStart, monthIndex } from "../content.js";
import { getMushaf, pageForSurah } from "../tools/quran-data.js";
import { ADHKAR } from "../tools/data/adhkar.js";
import { TT } from "./tools/strings-tools.js";
import { loadQuranMeta, surahName, quranMushaf, quranPage, quranHasStarted, mushafName, pagesToday } from "./tools/quran.js";
import { DURUD } from "../tools/data/durud.js";
import { loadHizb, manzilToday } from "./tools/hizb.js";
import { goalLine, goalBar, goalCard } from "./quran-goal.js";
import { goalStatus } from "../quran-goal.js";

const ic = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICON = {
  morning: I.sun, evening: I.moon, hizb: ic('<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/>'), quran: I.book, listen: I.book,
  manzil: ic('<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/>'),
  mulk: ic('<path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>'),
  durud: ic('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'),
  afterSalah: I.beads, info: I.info, leaf: ic('<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14z"/><path d="M5 19l7-7"/>'),
};
ICON.kahf = ICON.yasinAm = ICON.yasinPm = ICON.mulk;
/** Sūrah numbers of the Qurʾān readings that open the mushaf at their first page. */
const SURAH = { mulk: 67, kahf: 18, yasinAm: 36, yasinPm: 36 };
const dot = '<i class="zt-dot" aria-hidden="true"></i>';
const P = p => PRAYER_NAME[p] || p;

/* ---------- the Qurʾān's last page, as a sūrah name (the mushaf index is loaded once, then a redraw) ---------- */
const IX = {};
function mushafIndex(id) {
  if (IX[id] || IX[id + "?"]) return IX[id] || null;
  IX[id + "?"] = true;
  getMushaf(id).then(ix => { IX[id] = ix; if (T.screen === "hub") redraw(); }).catch(() => {});
  return null;
}
/** { surah, para } for the reader's saved page, or null until the data is loaded / before the first read. */
function lastPlace() {
  if (!quranHasStarted()) return null;
  loadQuranMeta();
  const id = quranMushaf(), n = quranPage(id), ix = mushafIndex(id);
  if (!ix) return { page: n };
  const s = ix.pageStart?.[n - 1]?.[0], para = ix.juzStartPage ? ix.juzStartPage.filter(p => p <= n).length : 0;
  return { page: n, surah: s ? surahName(s) : "", para, nav: ix.nav || (id === "madani15" ? "juz" : "para") };
}
/** "Maryam · Juzʾ 16" (For today's "Last read"), or the page until the index is loaded. */
const lastReadText = () => {
  const l = lastPlace(); if (!l) return "";
  if (!l.surah) return TT.pageOf(l.page, IX[quranMushaf()]?.pages || 610).replace(/ of \d+$/, "");
  return l.para ? `${l.surah} · ${TT.juzN(l.para)}` : l.surah;
};

/* ---------- the restored sub-lines (parity M11): durūd n of 40 and last read, Qurʾān pages today ---------- */
const shortDay = key => { const [y, m, d] = key.split("-").map(Number), x = new Date(y, m - 1, d); return `${DOW[x.getDay()]} ${d} ${MON3[m - 1]}`; };
/** { n, of, last }: durūd read for this Jumuʿah day (or today), and the last earlier day any were read ("" if none). */
function durudLine(now) {
  const all = S.tools?.durud || {}, key = jumuahKey(now, S.settings);
  const n = all[key]?.read?.length || 0;
  const last = Object.keys(all).filter(k => k < key && /^\d{4}-\d{2}-\d{2}$/.test(k) && (all[k]?.done || all[k]?.read?.length)).sort().pop();
  return { n: Math.min(n, DURUD.length), of: DURUD.length, last: last ? shortDay(last) : "" };
}
/** The second line under a reading's sub: "12 of 40 read · Last read Fri 14 Nov" (durūd), "3 pages today" (Qurʾān). */
function extraLine(id, now, done) {
  if (id === "durud") {
    const d = durudLine(now), parts = [];
    if (d.n && !done) parts.push(READ.durudOf(d.n, d.of));
    if (d.last) parts.push(READ.durudLast(d.last));
    return parts.join(" · ");
  }
  if (id === "quran") { const n = pagesToday(); return n ? TT.pagesToday(n) : ""; }
  return "";
}

/* ---------- rows ---------- */
const tile = id => `<span class="zt-ico">${ICON[id] || ICON.info}</span>`;
const doneTag = () => `<span class="rd-tag">${I.check}${esc(READ.doneTag)}</span>`;
const chev = `<span class="rd-cv">${I.chev}</span>`;
/** A tappable row with an icon, title, sub line and a chevron (or "Done"). */
const linkRow = (id, title, sub, act, { done = false, now = false, sub2 = "" } = {}) => `<button type="button" class="rd-row link" onclick="${act}">${tile(id)}<span class="t"><b>${esc(title)}</b>${sub ? `<small>${now ? dot : ""}${esc(sub)}</small>` : ""}${sub2 ? `<small class="rd-s2">${esc(sub2)}</small>` : ""}</span>${done ? doneTag() : chev}</button>`;

/* ---------- For today (20 Nov 2026, layout C) ---------- */
// Only the readings chosen as daily deeds (settings.dailyDeeds, the Good deeds sheet's choice; reading.todayGroups):
// "Now" in full, then "Later today · n" and "Done · n" as one line each that opens on a tap. Leaving Read closes them.
const grp = { later: false, done: false };
onRender(() => { if (UI.view !== "tools") grp.later = grp.done = false; });
// A tap only flips the line and shows or hides its list (already drawn): no redraw, so it is instant on slow phones
A.readGrp = k => {
  if (!(k in grp)) return;
  grp[k] = !grp[k];
  const b = document.querySelector(`#v-tools [data-f=g-${k}]`), l = document.getElementById(`rd-g-${k}`);
  if (!b || !l) { redraw(); return; }
  b.classList.toggle("open", grp[k]); b.setAttribute("aria-expanded", String(grp[k])); l.hidden = !grp[k];
};
/** For tests: open or close a group without drawing. */
export const _grp = grp;

function readRow(it, now, gs) {
  if (it.id === "quran" && gs) return goalRow(it, gs);
  const btn = it.done || it.id === "listen" ? "" : `<button type="button" class="rd-btn" data-f="o-${it.id}" onclick="A.readOpen('${it.id}')" aria-label="${esc(`${it.id === "quran" ? READ.open : READ.read}: ${it.title}`)}">${I.book}<span>${esc(it.id === "quran" ? READ.open : READ.read)}</span></button>`;
  const s2 = it.id === "listen" && gs ? QGOAL.pausedShort : extraLine(it.id, now, it.done);
  return `<div class="rd-row tk${it.done ? " done" : ""}">${tickBtn(it)}<span class="t"><b>${esc(it.title)}</b><small>${it.now ? dot : ""}${esc(it.sub)}</small>${s2 ? `<small class="rd-s2">${esc(s2)}</small>` : ""}</span>${btn}</div>`;
}
/** One collapsed line ("Later today · 2", "Done · 3 ✓") and, when open, its readings under it. */
function groupLine(k, label, items, now, gs) {
  if (!items.length) return "";
  const open = grp[k], id = `rd-g-${k}`;
  return `<button type="button" class="rd-gh${open ? " open" : ""}" data-f="g-${k}" aria-expanded="${open}" aria-controls="${id}" onclick="A.readGrp('${k}')"><span class="rd-gt">${esc(label)}</span>${k === "done" ? `<span class="rd-gck">${I.check}</span>` : ""}<span class="rd-gcv">${I.chev}</span></button><div class="rd-gl" id="${id}"${open ? "" : " hidden"}>${items.map(it => readRow(it, now, gs)).join("")}</div>`;
}
function forToday(now) {
  const g = todayGroups(S, now, { lastRead: lastReadText() });
  const gs = goalStatus(S, now), n = g.done.length;
  const head = `<header class="zt-chh"><h1 class="zt-title">${esc(READ.todayTitle)}</h1>${g.of ? `<p class="zt-sub"><b>${esc(READ.doneOf(n, g.of))}</b> ${esc(READ.doneWord)}</p>` : ""}</header>`;
  let body = "";
  if (g.of) {
    const nowRows = g.now.length ? `<p class="rd-gn">${esc(READ.nowHead)}</p><div class="zt-card list rd-list rd-now">${g.now.map(it => readRow(it, now, gs)).join("")}</div>`
      : `<p class="zt-note rd-none">${esc(g.later.length ? READ.nothingNow : READ.allDone)}</p>`;
    const rest = g.later.length || g.done.length ? `<div class="zt-card list rd-list rd-more">${groupLine("later", READ.laterHead(g.later.length), g.later, now, gs)}${groupLine("done", READ.doneHead(n), g.done, now, gs)}</div>` : "";
    const excused = S.days[dkey(now)]?.excused ? `<p class="zt-note rd-xn">${esc(READ.excusedNote)}</p>` : "";
    // "Your wird is voluntary…" (parity M11): a quiet note at the end of the list
    body = `${nowRows}${rest}${excused}<p class="zt-note rd-vol">${esc(TT.voluntary)}</p>`;
  } else if (isOn(S, "tools") && visibleTools(S).length) {
    body = `<div class="zt-card pad rd-empty"><p>${esc(READ.dailyEmpty)}</p><button type="button" class="zt-btn pri" data-f="choose-daily" onclick="A.dailyChoose()">${esc(READ.chooseDaily)}</button></div>`;
  }
  return `${weekCard(now)}${head}${body}<div class="zt-fill"></div><div class="rd-choose"><button type="button" class="zt-link" onclick="A.toolsSettings()">${esc(READ.choose)}</button></div>`;
}

/** Qurʾān recitation with a goal: the text opens the reader, "I read…" adds reading done elsewhere, the tick is as before. */
function goalRow(it, gs) {
  const line = goalLine(gs), tick = tickBtn(it);
  return `<div class="rd-row tk qg-row${it.done ? " done" : ""}">${tick}<button type="button" class="t rd-tt" data-f="o-quran" onclick="A.readOpen('quran')" aria-label="${esc(`${it.title}: ${line}. ${READ.open}`)}"><b>${esc(it.title)}</b><small>${it.now ? dot : ""}${esc(it.sub)}</small><small class="rd-s2 qg-l${gs.met ? " met" : ""}">${esc(line)}</small>${goalBar(gs)}</button>
    <button type="button" class="rd-btn qg-ir" data-f="qg-ir" onclick="A.qgRead()">${esc(QGOAL.iRead)}</button></div>`;
}
const tickBtn = it => `<button type="button" class="rd-tick" data-f="t-${it.id}" role="checkbox" aria-checked="${it.done}" aria-label="${esc(READ.markDone(it.title))}" onclick="A.readTick('${it.id}')"><span class="rd-bx${it.done ? " on" : ""}">${it.done ? I.check : ""}</span></button>`;

/* ---------- This week (layout A): one slim card at the top of For today; its sheet has This week and This month ---------- */
// What has been opened is kept on this device under the same keys as Home's weekly tiles (views/home.js weekTiles):
// weekly items under the week ("2026-11-15ayah"), the month's sunnah under the month, the Sahābī's fact under the day.
// The card's "New" dot: from Sunday (a new week key) until its sheet is opened that week ("2026-11-15wk").
const OPENED = "zad-wk-opened";
const readOpened = () => { try { return JSON.parse(localStorage.getItem(OPENED) || "{}"); } catch (e) { return {}; } };
function markOpened(k) { try { const o = readOpened(); o[k] = 1; localStorage.setItem(OPENED, JSON.stringify(o)); } catch (e) { /* private mode */ } }
/** The sheet's two sections: the week's readings and the month's (the Sahābī of the month, the sunnah of the month). */
export const WEEK_ITEMS = { week: ["ayah", "hadith", "dua", "seerah"], month: ["sahabi", "sunnah"] };
/** The opened-key of a This week item (the same keys as Home's tiles). */
export function weekItemKey(id, now, wk) {
  const mk = `${now.getFullYear()}-${now.getMonth()}`;
  return id === "sahabi" ? `${mk}-${now.getDate()}sahabi` : id === "sunnah" ? `${mk}sunnah` : `${wk}${id}`;
}
/** Whether the This week card shows its "New" dot: its sheet hasn't been opened since this week began (Sunday). */
export const weekIsNew = (wk, opened = readOpened()) => !opened[`${wk}wk`];
/** This week's content, with the Sahābī rotation started at the user's first month (as Home's tiles do). */
function weekContent(now) {
  if (!Number.isInteger(S.settings.sahabiStart)) { S.settings.sahabiStart = monthIndex(now); commit(); }
  setSahabiStart(S.settings.sahabiStart);
  if (!contentReady()) whenContent(render);
  try { return thisWeek(now); } catch (e) { return null; } // content not loaded yet
}
function weekCard(now) {
  if (!isOn(S, "week")) return "";
  const c = weekContent(now), title = c?.ayah?.title || c?.ayah?.en || READ.verseOfWeek;
  const isNew = !!c && weekIsNew(c.weekKey);
  return `<button type="button" class="zt-card rd-wk" data-f="week" onclick="A.readWeek()" aria-label="${esc(READ.weekCardLabel(title, isNew))}">${tile("leaf")}<span class="t"><span class="rd-wk1">${esc(READ.thisWeek)}${isNew ? `<i class="rd-new">${esc(READ.weekNew)}</i>` : ""}</span><b>${esc(title)}</b></span>${chev}</button>`;
}
/** The This week sheet's HTML for `now` (marks it opened first). */
export function weekSheet(now) {
  const c = weekContent(now); if (!c) return "";
  markOpened(`${c.weekKey}wk`);
  const opened = readOpened(), mon = MONTHS[now.getMonth()];
  const kick = { ayah: WEEK_UI.ayah, hadith: WEEK_UI.hadith, dua: WEEK_UI.dua, seerah: WEEK_UI.seerah, sahabi: WEEK_UI.sahabi(mon), sunnah: WEEK_UI.sunnah(mon) };
  const name = id => { const it = c[id] || {}; return (id === "sahabi" ? it.name : it.title || it.en) || ""; };
  const row = id => { const seen = !!opened[weekItemKey(id, now, c.weekKey)]; return `<button type="button" class="rd-wi" data-f="wi-${id}" onclick="A.weekItem('${id}')"><span class="t"><small>${esc(kick[id])}</small><b>${esc(name(id))}</b></span>${seen ? "" : `<i class="rd-ndot" role="img" aria-label="${esc(READ.weekNew)}"></i>`}${chev}</button>`; };
  const sec = (h, ids) => `<h4 class="rd-wsh">${esc(h)}</h4><div class="rd-wl">${ids.map(row).join("")}</div>`;
  return `<div class="z-sh rd-wsheet"><div class="z-lhd"><div><h3>${esc(READ.thisWeek)}</h3><p class="z-sub">${esc(READ.weekSheetLead(c.rangeLabel))}</p></div><button class="z-cls" onclick="A.closeSheet()" aria-label="${esc(COMMON.close)}"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
    ${sec(READ.thisWeek, WEEK_ITEMS.week)}${sec(READ.thisMonth, WEEK_ITEMS.month)}</div>`; // closed with ✕, a tap outside or a drag down (no Done)
}
A.readWeek = () => {
  if (!contentReady()) { loadContent().then(() => A.readWeek()).catch(() => {}); return; }
  const h = weekSheet(NOW()); if (!h) return;
  openSheet(h);
  render(); // the card's "New" dot goes
};
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/* ---------- Qurʾān ---------- */
function quranCh(now) {
  const q = toolVisible(S, "quran"), parts = [];
  const sub = q ? mushafName(quranMushaf()) : "";
  // no chapter head (its name is in the band); the mushaf goes on the Continue tile's first line
  if (q) {
    const l = lastPlace();
    const name = l?.surah ? READ.surah(l.surah) : l ? TT.pageOf(l.page, IX[quranMushaf()]?.pages || 610) : READ.firstPage;
    const para = l?.para ? TT.juzN(l.para) : "";
    parts.push(`<div class="zt-card pad rd-cont"><p class="rd-kick">${esc(l ? READ.continueReading : READ.startReading)}${sub ? ` · ${esc(sub)}` : ""}</p><p class="rd-big"><b>${esc(name)}</b>${para ? `<span>${esc(para)}</span>` : ""}</p>
      <button type="button" class="zt-btn pri" data-f="q-cont" onclick="A.readOpen('quranCont')">${I.book}${esc(l ? READ.continue : READ.openBtn)}</button></div>`);
    parts.push(goalCard(now));
  }
  const rows = [];
  const excused = !!S.days[dkey(now)]?.excused;
  if (q) {
    rows.push(linkRow("kahf", READ.kahfRow, READ.kahfRowSub, "A.readOpen('kahf')", { done: !excused && isJumuah(now, S.settings) && isReadDone(S, "kahf", now) }));
    rows.push(linkRow("mulk", READ.mulkRow, READ.mulkRowSub, "A.readOpen('mulk')", { done: !excused && isReadDone(S, "mulk", now) }));
    const ya = !excused && isReadDone(S, "yasinAm", now), yp = !excused && isReadDone(S, "yasinPm", now);
    rows.push(linkRow("yasinAm", READ.yasinRow, ya || yp ? READ.yasinDone(ya, yp) : READ.yasinRowSub, "A.readOpen('yasin')", { done: ya && yp }));
  }
  if (toolVisible(S, "manzil")) rows.push(linkRow("manzil", READ.manzilRow, READ.manzilRowSub, "A.readOpen('manzil')", { done: isReadDone(S, "manzil", now) }));
  if (q) rows.push(linkRow("quran", READ.allSurahs, "", "A.readAll()"));
  if (rows.length) parts.push(`<div class="zt-card list rd-list">${rows.join("")}</div>`);
  return parts.join("");
}

/* ---------- Adhkār ---------- */
function adhkarCh(now) {
  const t = timesFor(now, S.settings), rows = [];
  if (toolVisible(S, "adhkar")) {
    const evNow = now >= t.Asr && now < t.Maghrib;
    rows.push(linkRow("morning", READ.item.morning, READ.morningSub(ADHKAR.length), "A.readOpen('morning')", { done: isReadDone(S, "morning", now) }));
    const evDone = isReadDone(S, "evening", now);
    rows.push(linkRow("evening", READ.item.evening, evNow && !evDone ? READ.nowUntil(P("Maghrib")) : READ.eveningSub(ADHKAR.length, P("Asr")), "A.readOpen('evening')", { done: evDone, now: evNow && !evDone }));
  }
  if (toolVisible(S, "afterSalah")) rows.push(linkRow("afterSalah", READ.afterSalah, READ.afterSalahSub, "A.toolsOpen('afterSalah')"));
  if (toolVisible(S, "hizb")) rows.push(linkRow("hizb", READ.item.hizb, READ.hizbRowSub(manzilToday(now)), "A.toolsOpen('hizb')", { done: isReadDone(S, "hizb", now) }));
  if (toolVisible(S, "durud")) { const dd = isReadDone(S, "durud", now); rows.push(linkRow("durud", READ.durudRow, READ.durudRowSub, "A.toolsOpen('durud')", { done: dd, sub2: extraLine("durud", now, dd) })); }
  return `${rows.length ? `<div class="zt-card list rd-list">${rows.join("")}</div>` : ""}
    <div class="zt-card list rd-list"><button type="button" class="rd-row link" onclick="A.readTips()">${tile("info")}<span class="t"><b>${esc(READ.tips)}</b><small>${esc(READ.tipsSub)}</small></span>${chev}</button></div>`;
}
A.readTips = () => openSheet(`<h3>${esc(READ.tips)}</h3><div class="rd-tips">${[GUIDE.tipAdhkar, GUIDE.tipQuran, GUIDE.tipHizb].map(h => `<p>${h}</p>`).join("")}<p>${esc(READ.tipTicks)}</p></div><div class="cta"><button class="btn primary" onclick="A.closeSheet()">${esc(COMMON.gotIt)}</button></div>`);

/* ---------- chapters ---------- */
/** The chapters Read shows: For today always; Qurʾān and Adhkār when one of their readings is on. */
export function readChapters(s = S) {
  const v = t => toolVisible(s, t);
  return ["today", ...(v("quran") || v("manzil") ? ["quran"] : []), ...(["adhkar", "afterSalah", "hizb", "durud"].some(v) ? ["adhkar"] : [])];
}
const ch = makeChapters({ prefix: "rd", label: READ.chaptersLabel, get: () => UI.readCh || "today", set: id => { UI.readCh = id; } });
const scrolls = {};

/** Draw the chapters into #v-tools (the front page). Called by tools/index.js draw() while no reader is open. */
export function renderRead(root) {
  const now = NOW(), ids = readChapters();
  const built = ch.ensure(root, ids, READ.chapters);
  setHTML(ch.top(), `<h1 class="zb-t">${esc(NAV.tools)}</h1>${avatarBtn()}`);
  for (const id of ids) setHTML(ch.panel(id), id === "today" ? forToday(now) : id === "quran" ? quranCh(now) : adhkarCh(now));
  if (built) for (const id of ids) { const p = ch.panel(id); if (p && scrolls[id]) p.scrollTop = scrolls[id]; }
  ch.land();
}
/** Before a reader replaces the page: remember where each chapter was scrolled. */
export function leaveRead(root) {
  for (const id of ch.ids()) { const p = root.querySelector(`#rd-ch-${id}`); if (p) scrolls[id] = p.scrollTop; }
}
/** For tests: the chapters as HTML. */
export const _chapters = { today: forToday, quran: quranCh, adhkar: adhkarCh };
/** Show a chapter of Read by id (zad://read links, the Now chapter's "In Read"). */
A.readChapter = id => { UI.readCh = id; if (UI.view !== "tools") A.go("tools"); else ch.show(id); };

/* ---------- actions ---------- */
/** Open the reader for a For today item (or the Qurʾān chapter's rows). Back returns to Read. */
A.readOpen = id => {
  T.set = null; T.resumed = false; T.asPrayer = null; T.asKey = null; T.readItem = null; T.entry = null;
  // "yasin" (the Qurʾān chapter's row): the reading of this half of the day
  if (id === "yasin") id = slotOf(NOW(), S.settings) === "morning" ? "yasinAm" : "yasinPm";
  const tool = { morning: "adhkar", evening: "adhkar", hizb: "hizb", quran: "quran", quranCont: "quran", mulk: "quran", kahf: "quran", yasinAm: "quran", yasinPm: "quran", durud: "durud", manzil: "manzil" }[id];
  if (!tool || !toolVisible(S, tool)) return;
  if (id === "morning" || id === "evening") { T.set = id; open("adhkar"); return; }
  if (id === "hizb") { loadHizb(); T.entry = "hizbRead"; open("hizbRead", { manzil: manzilToday() }); return; }
  if (id === "quran" || id === "quranCont") { T.readItem = "quran"; open("quran", { page: quranPage(), bars: false }); return; }
  if (SURAH[id]) {
    pageForSurah(quranMushaf(), SURAH[id]).then(p => { T.readItem = id; open("quran", { page: p, bars: false }); }).catch(() => toast(TT.pageFail));
    return;
  }
  open(id);
};
/** All sūrahs and juzʾ: the reader with its Go to sheet open. */
A.readAll = () => { A.readOpen("quranCont"); setTimeout(() => A.tlGoTo?.("surah"), 0); };

/** Tick or untick a reading for today (For today, and the bar in a reader). Undo puts back exactly what was there. */
A.readTick = id => {
  const now = NOW(), key = todayKey();
  const it = readItems(S, now, { all: true }).find(x => x.id === id); if (!it) return; // all: also from the Good deeds sheet
  const snap = JSON.stringify({ tools: S.tools || {}, day: S.days[key] ?? null });
  setReadDone(S, id, !it.done, now);
  commit();
  toast(it.done ? READ.unticked : READ.ticked(it.title), { undo: () => {
    const s = JSON.parse(snap);
    store.restoreTools(S, s.tools); // notes what the Undo removes, so the next sync can't bring it back
    if (s.day) { S.days[key] = s.day; s.day.u = Date.now(); } else S.days[key] = { prayers: {}, amal: {}, note: "", u: Date.now() };
    commit();
  } });
};
