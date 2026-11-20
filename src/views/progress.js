/*
 * The Progress tab (#v-progress): chapters Reflections · Week · Charts · Provisions · Make-ups, each only when its
 * feature is on (features.progressChapters). The same chapter component as Today (views/chapters.js).
 * - Reflections: what's going well, one thing to work on, and the day's reflection (src/reflections.js).
 * - Week: sub-tabs Days · Streaks · Congregation · Sunnah · Good deeds (views/subtabs.js). Days: three numbers and a
 *   row per day (tap → the calendar's day sheet). Earlier weeks with the arrows.
 * - Charts: sub-tabs Prayers · Each prayer · Congregation · Sunnah · Good deeds · Qurʾān (pages or minutes read each
 *   day, in the reader and with "I read…"), over 30 days (earlier periods with the arrows) or a year.
 * - Provisions: views/provisions.js provisionsChapter(). Make-ups: views/qada.js makeupsChapter() (sub-tabs too).
 * Only the chosen sub-tab is built. A chapter goes back to its first sub-tab when you leave it (once the swipe has
 * settled and the page is idle) and every chapter does when you leave the tab.
 * Status is never shown by colour alone: every mark carries its icon, and every chart has a text label.
 * Layout from design-review/mockups2/redesign/final (fin-prog-*), colours from css/theme.css (OG Calm A).
 */
import { S, UI, A, $, NOW, todayKey, onRender, go, avatarBtn, revision, glossBtn } from "../app.js";
import * as store from "../store.js";
import { PRAYERS, DOW, MON, MON3, dkey, parseKey, addDays, esc } from "../util.js";
import * as st from "../stats.js";
import { weekDates, weekRangeLabel, startedPrayers, currentWindow } from "../times.js";
import { isOn, progressChapters, toolVisible } from "../features.js";
import { READ_IDS, readsByDay } from "../points.js";
import { madhhabOf } from "../rules/madhhab.js";
import { reflectionFor } from "../reflections.js";
import { COMMON, PROGRESS, PROGRESS_L as L, PROG, STATUS, STATUS_SHORT, EXCUSED, DEEDS, TIER, WITR_UI, SUNNAH_NAME, READ, prayerName } from "../strings.js";
import { statusMark } from "./home.js";
import { provisionsChapter } from "./provisions.js";
import { makeupsChapter } from "./qada.js";
import { makeChapters, setHTML } from "./chapters.js";
import { subOf, subIsFirst, resetSubs, onSubTab, subTabsHTML, subPanel } from "./subtabs.js";
import { readingSeries, goalOf } from "../quran-goal.js";
import { QGOAL } from "../strings.js";

/* ---------- state: the week shown, and the Charts period ---------- */
const V = { week: 0, month: 0, year: 0, r: "month", qu: "pages" };
// only the Charts chapter is redrawn (the Qurʾān sub-tab's Pages / Minutes)
A.prQUnit = u => {
  if ((u !== "pages" && u !== "min") || u === V.qu) return;
  V.qu = u;
  if (UI.view !== "progress") return;
  drawOne("charts");
  // keep the Qurʾān sub-tab in view in its (scrolling) bar, as a tap on it does
  const t = document.getElementById("st-charts-quran"), w = t?.closest(".st-wrap");
  if (w && w.scrollWidth > w.clientWidth) w.scrollLeft = w.scrollWidth;
};
A.prWeek = d => { V.week = Math.max(0, V.week + d); renderProgress(); };
A.prRange = r => { if (r === "month" || r === "year") { V.r = r; renderProgress(); } };
A.prOff = d => { V[V.r] = Math.max(0, V[V.r] + d); renderProgress(); };
A.prReminder = () => go("settings");
/** Open Progress on a chapter (reflect, week, charts, provisions, makeups). */
A.progressChapter = id => { if (UI.view !== "progress") { UI.progressCh = id; go("progress"); } else CH.show(id); };

/* ---------- helpers ---------- */
const I = {
  chevL: '<path d="M15 6l-6 6 6 6"/>', chevR: '<path d="M9 6l6 6-6 6"/>',
  leaf: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14z"/><path d="M5 19l8-8"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', dcheck: '<path d="M2.5 12.5l4 4L15 8"/><path d="M10.5 16.5L19 8"/>',
  dash: '<path d="M7 12h10"/>', clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
};
const icon = (k, cls = "i") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${I[k]}</svg>`;
const MINI = { congregation: "dcheck", ontime: "check", madeup: "clock", missed: "dash", excused: "moon" };
const pc = (n, d) => (d ? Math.round(n / d * 100) : 0);
const pName = p => prayerName(p);
const nowFor = to => (dkey(to) >= todayKey() ? NOW() : addDays(to, 1));
const optsFor = to => (dkey(to) >= todayKey() ? { settings: S.settings } : {});
const sister = () => store.genderOf(S) === "f";
const short = d => `${d.getDate()} ${MON3[d.getMonth()]}`;
const longDay = d => `${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;

/** A chapter head: big serif title, a line under it, and optional controls on the right. */
const head = (title, sub = "", right = "") => `<header class="zt-chh pr-chh"><div class="pr-hl"><h1 class="zt-title">${title}</h1>${sub ? `<p class="zt-sub">${sub}</p>` : ""}</div>${right}</header>`;
/** ‹ › for an earlier or later period. */
const arrows = (prev, next, onPrev, onNext, lp, ln, f) => `<div class="pr-nav"><button type="button" class="zt-ib" data-f="${f}p" aria-label="${esc(lp)}" ${prev ? "" : "disabled"} onclick="${onPrev}">${icon("chevL")}</button><button type="button" class="zt-ib" data-f="${f}n" aria-label="${esc(ln)}" ${next ? "" : "disabled"} onclick="${onNext}">${icon("chevR")}</button></div>`;
/** A section title; info: a glossary id for the ⓘ explainer beside it. */
const sec = (title, sub = "", info = "") => `<div class="pr-sec"><h2${info ? ' class="pr-hi"' : ""}>${title}${info ? glossBtn(info) : ""}</h2>${sub ? `<span>${sub}</span>` : ""}</div>`;
const cap = t => `<p class="pr-cap">${t}</p>`;
const word = v => (v === "future" ? PROG.notYet : v === null ? PROG.dueNow : v === "unlogged" ? PROGRESS.notLogged.toLowerCase() : (STATUS[v] || "").toLowerCase());
/** A small status mark for a grid (Week rows): the icon is always there, so status never rests on colour. */
const smark = v => (v === "future" ? `<span class="z-mk pr-fut"></span>` : v === null ? `<span class="z-mk z-now"></span>` : v === "unlogged" ? `<span class="z-mk pr-un"></span>` : statusMark(v));
const LEG = { congregation: STATUS_SHORT.congregation, ontime: STATUS_SHORT.ontime, madeup: STATUS_SHORT.madeup, missed: STATUS_SHORT.missed, excused: STATUS_SHORT.excused, unlogged: PROGRESS.notLogged };
const legend = ks => `<div class="pr-leg">${ks.map(k => `<span class="pr-li">${smark(k === "unlogged" ? "unlogged" : k)}${esc(LEG[k])}</span>`).join("")}</div>`;
const stats = list => `<div class="pr-stats">${list.map(([b, s]) => `<div><b>${b}</b><small>${s}</small></div>`).join("")}</div>`;
/** The chapter's sub-tab bar and its one section: [[id, label, build], ...]. */
function withSubs(g, items) {
  const ids = items.map(x => x[0]), cur = subOf(g, ids), it = items.find(x => x[0] === cur);
  return subTabsHTML(g, items, cur, PROG.subLabel[g]) + subPanel(g, cur, it[2](), items.length > 1);
}

/* =================================================================================================
   Reflections
   ================================================================================================= */
function reflectChapter() {
  const { good, warn } = st.insights(S, NOW());
  const item = (it, mk) => `<div class="pr-ins">${mk}<div class="t"><b>${esc(it.title)}</b>${it.sub ? `<small>${esc(it.sub)}</small>` : ""}</div></div>`;
  const okMark = `<span class="z-mk z-o pr-imk">${icon("check", "")}</span>`;
  const leaf = `<span class="pr-imk pr-leaf">${icon("leaf", "")}</span>`;
  let h = `<div class="zt-card pad pr-ref"><h2 class="pr-k">${esc(PROGRESS.goingWell)}</h2>`;
  h += good.length ? good.slice(0, 3).map(i => item(i, okMark)).join("") : `<p class="pr-empty">${esc(PROGRESS.doingWellEmpty)}</p>`;
  h += `<hr class="pr-hr"><h2 class="pr-k">${esc(PROG.workOn)}</h2>`;
  if (warn.length) {
    const w = warn[0];
    const act = /reminder/i.test(w.sub || "") ? `<button type="button" class="zt-link pr-act" onclick="A.prReminder()">${icon("bell")}${esc(L.setReminder)}</button>`
      : /calendar/i.test(w.sub || "") ? `<button type="button" class="zt-link pr-act" onclick="A.calOpen()">${icon("cal")}${esc(PROG.openCalendar)}</button>` : "";
    h += item(w, leaf) + (act ? `<div class="pr-actw">${act}</div>` : "");
  } else h += `<p class="pr-empty">${esc(PROGRESS.needsCareEmpty)}</p>`;
  if (S.settings.reflection !== false) {
    const r = reflectionFor(NOW());
    h += `<figure class="pr-dua">${r.ar ? `<div class="ar" lang="ar" dir="rtl">${r.ar}</div>` : ""}<blockquote class="en">“${esc(r.en)}”</blockquote><figcaption>${esc(r.src)}</figcaption></figure>`;
  }
  return head(esc(PROG.chapters.reflect), esc(PROG.reflectSub)) + h + `</div><div class="zt-fill"></div>`;
}

/* =================================================================================================
   Week: Days · Streaks · Congregation · Sunnah · Good deeds
   ================================================================================================= */
function weekChapter() {
  const now = NOW(), off = V.week, ser = st.weekSeries(S, now, -off, { settings: S.settings });
  const from = ser[0].date, to = ser[6].date, end = dkey(to) > todayKey() ? now : to, pnow = nowFor(end), o = optsFor(end);
  const c = st.statusCountsRange(S, from, end, pnow, o);
  const prev = weekDates(now, -off - 1)[6] >= parseKey(S.createdKey);
  const sub = off === 0 ? `${from.getDate()} – ${to.getDate()} ${MON[to.getMonth()]}` : weekRangeLabel(now, -off);
  const nav = arrows(prev, off > 0, "A.prWeek(1)", "A.prWeek(-1)", PROG.prevWeek, PROG.nextWeek, "w");
  const W = { now, off, ser, from, end, pnow, o, c };
  // Congregation: always for brothers; for sisters only in a week with some (as before)
  const items = [["days", PROG.sub.days, () => weekDays(W)], ["streaks", PROG.sub.streaks, streaksCard]];
  if (!sister() || c.congregation) items.push(["cong", PROG.sub.cong, () => congWeek(W)]);
  if (isOn(S, "sunnah")) items.push(["sunnah", PROG.sub.sunnah, () => sunnahWeek(ser)]);
  if (isOn(S, "deeds")) items.push(["deeds", PROG.sub.deeds, () => deedsWeek(ser, from, end)]);
  return head(esc(PROG.weekTitle(off)), esc(sub), nav) + withSubs("week", items) + `<div class="zt-fill"></div>`;
}

/** Days: three numbers, compared with the week before, and a row per day with its five marks. */
function weekDays({ now, off, ser, end, pnow, o, c }) {
  const f4 = st.statusCountsRange(S, addDays(end, -27), end, pnow, o);
  const streak = st.streaks(S, now);
  const third = sister() ? [String(streak.all.cur), PROG.allFiveRun] : [String(c.congregation), PROG.inCongregation];
  const nums = stats([[`${c.prayed}<span>/${c.due}</span>`, PROG.prayed], third, [`${pc(f4.prayed, f4.due)}%`, off === 0 ? PROG.last4 : PROG.four]]);
  const pw = weekDates(now, -off - 1), c2 = st.statusCountsRange(S, pw[0], pw[6], addDays(pw[6], 1));
  const p1 = pc(c.prayed, c.due), p0 = pc(c2.prayed, c2.due);
  const delta = c2.due && c.due ? (p1 > p0 ? L.upFrom(p0) : p1 === p0 ? L.steady : L.lastWas(p0)) : "";
  const used = new Set();
  const rows = ser.map(d => {
    const isT = d.key === todayKey(), lbl = isT ? COMMON.today : `${DOW[d.date.getDay()]} ${d.date.getDate()}`;
    const off2 = d.future || (!d.tracked && d.key < S.createdKey);
    const sts = PRAYERS.map(p => (off2 ? "future" : d.statuses[p]));
    sts.forEach(v => { if (v && v !== "future") used.add(v); });
    const marks = sts.map(smark).join("");
    const n = off2 ? "" : d.excused && !d.due ? `<span class="pr-x">${esc(STATUS_SHORT.excused)}</span>` : `${d.prayed}/${d.due}`;
    if (off2) return `<div class="pr-day fut"><span class="dl">${esc(lbl)}</span><span class="ms" aria-hidden="true">${marks}</span><span class="n"></span></div>`;
    const aria = PROG.dayAria(isT ? COMMON.today : longDay(d.date), PRAYERS.map((p, k) => `${pName(p)} ${word(sts[k])}`).join(", "), d.prayed, d.due);
    return `<button type="button" class="pr-day ${isT ? "t" : ""}" data-f="d${d.key}" aria-label="${esc(aria)}" onclick="A.daySheet('${d.key}')"><span class="dl">${esc(lbl)}</span><span class="ms" aria-hidden="true">${marks}</span><span class="n">${n}</span></button>`;
  }).join("");
  const keys = ["congregation", "ontime", "madeup", "missed", "excused", "unlogged"].filter(k => k === "ontime" || k === "missed" || (k === "congregation" && !sister()) || used.has(k));
  const exDay = ser.find(x => x.excused && !x.future);
  const note = exDay ? EXCUSED.weekCap(longDay(exDay.date).split(" ")[0]) : c.madeup ? PROGRESS.madeUpCap(c.madeup) : "";
  return `<div class="zt-card pr-wk">${nums}${delta ? `<p class="pr-delta">${esc(delta)}</p>` : ""}<div class="pr-days">${rows}</div>${legend(keys)}</div>${note ? cap(esc(note)) : ""}`;
}

function streaksCard() {
  const s = st.streaks(S, NOW()), hasEx = st.statusCountsRange(S, addDays(NOW(), -30), NOW(), NOW()).excusedDays > 0;
  return `<div class="zt-card pad">${stats([[esc(COMMON.days(s.all.cur)), `${esc(PROGRESS.allFive)}<em>${esc(PROGRESS.bestKeep(s.all.best))}</em>`], [esc(COMMON.days(s.onTime.cur)), `${esc(PROGRESS.allOnTime)}<em>${esc(PROGRESS.bestOnTime(s.onTime.best))}</em>`]])}</div>`
    + cap(esc((hasEx ? PROGRESS.streakExcused : "") + PROGRESS.streakToday));
}

/** This week's congregation beats each of the 12 weeks before it. */
function bestCongWeek(now, off, n) {
  if (!n) return false;
  for (let k = 1; k <= 12; k++) {
    const d = weekDates(now, -off - k);
    if (d[6] < parseKey(S.createdKey)) break;
    if (st.statusCountsRange(S, d[0], d[6], addDays(d[6], 1)).congregation >= n) return false;
  }
  return true;
}
function congWeek({ now, off, from, end, pnow, o, c }) {
  const per = st.perPrayerCounts(S, from, end, pnow, o);
  const cells = PRAYERS.map(p => `<div><b>${per[p].congregation}<span>/${per[p].due}</span></b><small>${esc(pName(p))}</small></div>`).join("");
  // "N prayers in congregation. Your best week yet." (parity M9)
  const line = `${L.jamHead(c.congregation)}${bestCongWeek(now, off, c.congregation) ? ` ${esc(PROG.bestWeek)}` : ""}`;
  return sec(esc(PROG.congWeek), esc(PROG.congWeekSub), "jamaah") + `<div class="zt-card pad"><p class="pr-cs">${line}</p><div class="pr-five">${cells}</div></div>` + cap(esc(PROGRESS.jamaahCap));
}

/** The week's grid head: S M T W T F S, today marked. */
function gridHead(ser) {
  return `<div class="pr-gr hd" aria-hidden="true">${ser.map(d => `<span class="${d.key === todayKey() ? "t" : ""}">${"SMTWTFS"[d.date.getDay()]}</span>`).join("")}<span></span></div>`;
}
/** One cell: done (a tick), not done, not counted (dash), or nothing that day. */
const cell = (state, dashed) => state === "done" ? `<i class="pr-c on">${icon("check", "")}</i>`
  : state === "open" ? `<i class="pr-c${dashed ? " ds" : ""}"></i>` : state === "no" ? `<i class="pr-c no">${icon("dash", "")}</i>`
    : state === "ex" ? `<i class="pr-c ex">${icon("moon", "")}</i>` : `<i class="pr-c na"></i>`;
const gridRow = (name, states, n, of, dashed, sub = "") => `<div class="pr-gr" role="img" aria-label="${esc(`${name}: ${n} of ${of}`)}"><span class="nm" aria-hidden="true">${esc(name)}${sub ? `<small>${esc(sub)}</small>` : ""}</span>${states.map(s => cell(s, dashed)).join("")}<span class="v" aria-hidden="true">${n}<small>/${of}</small></span></div>`;

const itemName = x => (x.prayer === "day" || !x.prayer ? SUNNAH_NAME[x.name] || x.name || x.label : `${x.jumuah ? prayerName("Dhuhr", { date: new Date(2026, 0, 2), jumuah: true }) : pName(x.prayer)} ${x.label}`);
function sunnahWeek(ser) {
  const from = ser[0].date, last = ser[6].date, now = NOW();
  const sr = st.sunnahRange(S, from, dkey(last) > todayKey() ? now : last, now);
  const m = madhhabOf(S);
  const groups = [["solid", TIER.muakkadah], ["outline", TIER.ghayr], ["hidden", TIER.nafl]];
  let body = "";
  for (const [disp, t] of groups) {
    const list = sr.items.filter(x => x.display === disp);
    if (!list.length) continue;
    body += `<p class="pr-gh">${esc(t.name)} · ${esc(t.gloss)}</p>`;
    for (const x of list) {
      const states = ser.map(d => {
        const day = store.getDay(S, d.key);
        if (d.key > todayKey() || d.key < S.createdKey) return "na";
        if (day.excused) return "ex";
        const chip = x.prayer ? store.sunnahChips(S, d.key, x.prayer, { all: true }).find(c => c.id === x.id) : null;
        if (!chip) return "na";
        return chip.done ? "done" : chip.allowed ? "open" : "no";
      });
      body += gridRow(itemName(x), states, x.done, x.due, disp === "outline");
    }
  }
  // Witr
  let wd = 0, wdue = 0;
  const ws = ser.map(d => {
    const day = store.getDay(S, d.key);
    if (d.key > todayKey() || d.key < S.createdKey) return "na";
    if (day.excused) return "ex";
    wdue++;
    if (day.witr === "done" || day.witr === "madeup") { wd++; return "done"; }
    return day.witr === "missed" ? "no" : "open";
  });
  body += `<p class="pr-gh">${esc(WITR_UI.rowLabel[m])}</p>` + gridRow(WITR_UI.chip(store.witrChip(S, ser[0].key).rakahs || 3), ws, wd, wdue, false);
  return sec(esc(PROG.sunnahWeek), esc(PROGRESS.apartFromFard), "sunnah") + `<div class="zt-card pad pr-grid">${gridHead(ser)}${body}</div>${tierKey(sr)}`;
}
function tierKey(sr) {
  const m = madhhabOf(S), rows = [];
  if (sr.items.some(x => x.display === "solid")) rows.push(`<b>${esc(TIER.muakkadah.gloss)}.</b> ${esc(TIER.muakkadah.line)}`);
  if (sr.items.some(x => x.display === "outline")) rows.push(`<b>${esc(TIER.ghayr.gloss)}.</b> ${esc(TIER.ghayr.line)}`);
  rows.push(`<b>${esc(m === "hanafi" ? WITR_UI.name : TIER.sunnah.gloss)}.</b> ${esc(WITR_UI.line[m])}`); // Hanafī: just "Witr" (no tier word)
  if (S.settings.sunnahNafl) rows.push(`<b>${esc(TIER.nafl.gloss)}.</b> ${esc(TIER.nafl.line)}`);
  return `<ul class="pr-tiers">${rows.map(r => `<li>${r}</li>`).join("")}</ul>`;
}

function deedList(from, end) {
  const ids = new Map();
  for (let d = from; dkey(d) <= dkey(end); d = addDays(d, 1)) {
    if (dkey(d) < S.createdKey) continue;
    for (const a of store.amalForDay(S, dkey(d))) if (!ids.has(a.id)) ids.set(a.id, a);
  }
  const order = [...S.amalList.map(a => a.id), "listen", "dua"];
  return [...ids.values()].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
}
const READ_TOOL = { hizb: "hizb", mulk: "quran", kahf: "quran", manzil: "manzil", yasinAm: "quran", yasinPm: "quran" };
/** The week's salawāt and sadaqah (no daily target, counted apart): days with each, and salawāt counted in all. */
function noTargetTally(ser) {
  let sal = 0, sad = 0, salN = 0;
  for (const d of ser) {
    if (d.key > todayKey() || d.key < S.createdKey) continue;
    const a = store.getDay(S, d.key).amal || {};
    if (a.salawat?.done) { sal++; salN += parseInt(a.salawat.detail, 10) || 0; }
    if (a.sadaqah?.done) sad++;
  }
  return { sal, sad, salN };
}
function deedsWeek(ser, from, end) {
  const list = deedList(from, dkey(ser[6].date) > todayKey() ? NOW() : ser[6].date);
  // the readings that count as good deeds (Hizb, al-Mulk, al-Kahf, the Manzil, Yā-Sīn), while Read shows them
  const reads = READ_IDS.filter(id => toolVisible(S, READ_TOOL[id])).map(id => ({ id, name: READ.item[id], read: true }));
  if (!list.length && !reads.length) return `<div class="zt-card pad"><p class="pr-empty">${esc(L.habitsNone)}</p></div>`;
  const rd = reads.length ? readsByDay(S) : null;
  const rows = [...list, ...reads].map(a => {
    let dn = 0, cnt = 0;
    const states = ser.map(d => {
      const s = a.read ? st.readDayState(S, d.key, a.id, NOW(), rd) : st.amalDayState(S, d.key, a.id, NOW());
      if (s === "done") { dn++; cnt++; return "done"; }
      if (s === "missed") { cnt++; return "open"; }
      if (s === "pending") return "open";
      return s === "excused" ? "ex" : "na";
    });
    const noTarget = a.id === "salawat" || a.id === "sadaqah";
    return gridRow(a.name, states, dn, cnt, false, noTarget ? L.noTarget : "");
  }).join("");
  // Salawāt and sadaqah this week (parity M9: the old "Daily habits" tallies)
  const ids = new Set(list.map(a => a.id)), t = noTargetTally(ser), tally = [];
  if (ids.has("salawat")) tally.push([String(t.sal), `${esc(PROG.salawatDays)}${t.salN ? `<em>${esc(PROG.salawatAll(t.salN))}</em>` : ""}`]);
  if (ids.has("sadaqah")) tally.push([String(t.sad), esc(PROG.sadaqahDays)]);
  return sec(esc(PROG.deedsWeek), esc(PROGRESS.thisWeekLower)) + (tally.length ? `<div class="zt-card pad pr-tally">${stats(tally)}</div>` : "")
    + `<div class="zt-card pad pr-grid">${gridHead(ser)}${rows}</div>` + cap(esc(DEEDS.noTarget));
}

/* =================================================================================================
   Charts: Prayers · Each prayer · Congregation · Sunnah · Good deeds, over 30 days or a year
   ================================================================================================= */
function period() {
  const now = NOW();
  if (V.r === "month") {
    const end = addDays(now, -30 * V.month), from = addDays(end, -29);
    return { r: "month", from, end, now: nowFor(end), title: V.month === 0 ? L.last30 : L.prev30(30 * V.month), sub: `${short(from)} – ${short(end)}`, prev: addDays(from, -1) >= parseKey(S.createdKey), next: V.month > 0 };
  }
  const y = now.getFullYear() - V.year, from = new Date(y, 0, 1), end = V.year === 0 ? now : new Date(y, 11, 31);
  return { r: "year", year: y, from, end, now: nowFor(end), title: String(y), sub: String(y), prev: y - 1 >= parseKey(S.createdKey).getFullYear(), next: V.year > 0 };
}
function chartsChapter() {
  const P = period(), o = optsFor(P.end), c = st.statusCountsRange(S, P.from, P.end, P.now, o);
  const seg = `<div class="pr-seg" role="group" aria-label="${esc(PROG.period)}">${["month", "year"].map(r => `<button type="button" data-f="r${r}" class="${r === P.r ? "on" : ""}" aria-pressed="${r === P.r}" onclick="A.prRange('${r}')">${esc(PROG.ranges[r])}</button>`).join("")}</div>`;
  const nav = `<div class="pr-pnav">${seg}<div class="pr-pl"><b>${esc(P.title)}</b>${P.r === "month" ? `<small>${esc(P.sub)}</small>` : ""}</div></div>`;
  const h = head(esc(PROG.chartsTitle), "", arrows(P.prev, P.next, "A.prOff(1)", "A.prOff(-1)", PROG.earlier, PROG.later, "c"));
  const empty = !c.due && !c.excusedDays;
  const guard = fn => () => nav + (empty ? `<div class="zt-card pad"><p class="pr-empty">${esc(L.noData)}</p></div>` : fn());
  const items = [["prayers", PROG.sub.prayers, guard(() => chartPrayers(P, c, o))], ["each", PROG.sub.each, guard(() => chartEach(P, c, o))]];
  if (!sister() || c.congregation) items.push(["cong", PROG.sub.cong, guard(() => congCols(c))]);
  if (isOn(S, "sunnah")) items.push(["sunnah", PROG.sub.sunnah, guard(() => sunnahBars(P))]);
  if (isOn(S, "deeds")) items.push(["deeds", PROG.sub.deeds, guard(() => deedRates(P))]);
  if (toolVisible(S, "quran")) items.push(["quran", QGOAL.chartTab, () => nav + quranChart(P)]);
  return h + withSubs("charts", items) + `<div class="zt-fill"></div>`;
}

/** Prayers: the period's numbers, prayers each day (or each month) and how you prayed. */
function chartPrayers(P, c) {
  let h = "";
  if (P.r === "month") {
    const pd = perDay(P);
    // on time %, days with all five (parity M9)
    const pp = st.statusCountsRange(S, addDays(P.from, -30), addDays(P.from, -1), P.from);
    const p1 = pc(c.prayed, c.due), p0 = pc(pp.prayed, pp.due);
    h += `<div class="zt-card pad pr-st3">${stats([[`${p1}%`, `${esc(L.ofFard)}${pp.due && p1 > p0 ? `<em>${esc(L.upFromPct(p0))}</em>` : ""}`], [`${pc(c.congregation + c.ontime, c.due)}%`, esc(L.onTime)], [`${pd.full}<span>/${pd.cnt}</span>`, esc(L.prayedDays)]])}</div>`;
    if (c.excusedDays) h += cap(esc(EXCUSED.progressNote(c.excusedDays)));
    h += pd.html;
  } else {
    h += `<div class="zt-card pad">${stats([[c.prayed.toLocaleString("en"), L.fardPrayedN], [`${pc(c.congregation + c.ontime, c.due)}%`, esc(L.onTime)], [String(c.madeup), L.madeUpSame]])}</div>`;
    if (c.excusedDays) h += cap(esc(EXCUSED.progressNote(c.excusedDays)));
    h += byMonth(P);
  }
  return h + sec(esc(PROGRESS.howYouPrayed), esc(P.r === "month" ? PROGRESS.last30Lower : String(P.year))) + `<div class="zt-card pr-brk">${breakdown(c)}</div>`;
}
function chartEach(P, c, o) {
  const rows = st.eachPrayerSeries(S, P.now, { from: P.from, to: P.end, settings: o.settings || null });
  return sec(esc(PROGRESS.eachPrayer), esc(PROG.eachSub)) + `<div class="zt-card pad">${eachPrayer(rows)}</div>` + (c.madeup ? cap(esc(PROGRESS.madeUpCap(c.madeup))) : "");
}

/** One bar a day: how many of the five were prayed. Excused days show a moon; days before you started, nothing.
 *  Also counts the days with all five ({ full, cnt }: today and excused days left out). */
function perDay(P) {
  const days = [];
  for (let d = P.from; dkey(d) <= dkey(P.end); d = addDays(d, 1)) days.push(d);
  let sum = 0, cnt = 0, full = 0;
  const bars = days.map(d => {
    const key = dkey(d), day = store.getDay(S, key);
    if (key < S.createdKey || key > todayKey()) return `<span class="b"></span>`;
    if (day.excused) return `<span class="b ex" title="${esc(PROG.barExcused(short(d)))}">${icon("moon", "")}</span>`;
    const n = PRAYERS.filter(p => store.isPrayed(store.statusOf(day, p))).length, isT = key === todayKey();
    if (!isT) { sum += n; cnt++; if (n === 5) full++; }
    return `<span class="b${isT ? " t" : ""}" title="${esc(PROG.barTitle(short(d), n))}"><i style="height:${Math.max(n ? 6 : 2, n / 5 * 100)}%"></i></span>`;
  }).join("");
  const ticks = days.map((d, i) => (d.getDay() === 0 && i < days.length - 2 ? `<span style="grid-column:${i + 1} / span 4">${short(d)}</span>` : "")).join("");
  const avg = cnt ? (Math.round(sum / cnt * 10) / 10).toString() : "0";
  const html = sec(esc(PROG.perDay), esc(PROG.perDaySub)) + `<div class="zt-card pad"><div class="pr-pd" role="img" aria-label="${esc(PROG.perDayAria(short(P.from), short(P.end), avg, full))}"><div class="bars" style="grid-template-columns:repeat(${days.length},1fr)" aria-hidden="true">${bars}</div><div class="ax" aria-hidden="true"><span>5</span><span>0</span></div><div class="tk" style="grid-template-columns:repeat(${days.length},1fr)" aria-hidden="true">${ticks}</div></div></div>`;
  return { html, full, cnt };
}

/** Fard by month (a year): one column a month with its number on top. */
function byMonth(P) {
  const ym = st.yearMonths(S, P.year, P.now), curM = P.year === NOW().getFullYear() ? NOW().getMonth() : -1;
  const cols = ym.map((v, k) => `<div class="col${k === curM ? " cur" : ""}" style="--h:${v == null ? 0 : Math.max(2, v)}%" title="${MON[k]}: ${v == null ? "–" : v + "%"}"><b>${v == null ? "" : v}</b><i></i><span>${MON3[k][0]}</span></div>`).join("");
  const label = ym.map((v, k) => `${MON3[k]} ${v == null ? "–" : v + "%"}`).join(", ");
  return sec(esc(L.fardByMonth), esc(L.pctDue)) + `<div class="zt-card pad"><div class="pr-cols m12" role="img" aria-label="${esc(`${L.fardByMonth}: ${label}`)}">${cols}</div></div>`;
}

/** Each prayer: one stacked bar per prayer. Segments carry their status icon when there is room. */
function eachPrayer(rows) {
  const SEG = [["congregation", "c1"], ["ontime", "c2"], ["madeup", "c3"], ["missed", "c4"], ["unlogged", "c5"]];
  const any = k => rows.some(r => r.counts[k] > 0);
  const used = SEG.filter(([k]) => any(k) || k === "ontime" || k === "missed" || (k === "congregation" && !sister()));
  const lines = rows.map(r => {
    const cn = r.counts, tot = used.reduce((a, [k]) => a + (cn[k] || 0), 0);
    const segs = tot ? used.filter(([k]) => cn[k]).map(([k, cl]) => `<i class="pr-${cl}" style="flex:${cn[k]} 1 0">${MINI[k] && cn[k] / tot >= 0.12 ? icon(MINI[k], "") : ""}</i>`).join("") : "";
    const parts = used.filter(([k]) => cn[k]).map(([k]) => `${cn[k]} ${LEG[k].toLowerCase()}`).join(", ") || L.noData;
    const v = r.prayedPct == null ? "–" : `${r.prayedPct}%`;
    return `<div class="pr-hb" role="img" aria-label="${esc(PROG.eachAria(r.name, v, parts))}"><span class="nm" aria-hidden="true">${esc(r.name)}</span><span class="bar" aria-hidden="true">${segs}</span><span class="v" aria-hidden="true">${v}</span></div>`;
  }).join("");
  const leg = `<div class="pr-leg sq" aria-hidden="true">${used.map(([k, cl]) => `<span class="pr-li"><i class="pr-${cl}">${MINI[k] ? icon(MINI[k], "") : ""}</i>${esc(LEG[k])}</span>`).join("")}</div>`;
  return leg + lines;
}

function breakdown(c) {
  const row = (k, label, n, sub) => `<div class="r">${smark(k)}<span class="t">${esc(label)}${sub ? `<small>${esc(sub)}</small>` : ""}</span><b>${n}</b></div>`;
  return row("congregation", STATUS.congregation, c.congregation) + row("ontime", STATUS.ontime, c.ontime) + row("madeup", STATUS.madeup, c.madeup, PROGRESS.madeUpSub)
    + row("missed", STATUS.missed, c.missed, isOn(S, "makeups") ? PROGRESS.missedSub : "") + (c.excused ? row("excused", STATUS.excused, c.excused, PROGRESS.excusedSub) : "") + (c.unlogged ? row("unlogged", PROGRESS.notLogged, c.unlogged) : "");
}

/** Congregation: "about 1 in N" over the period, and the share a week for the last 12 weeks; this week labelled. */
function congCols(c, weeks = 12) {
  const vals = [];
  for (let k = weeks - 1; k >= 0; k--) {
    const a = weekDates(NOW(), -k)[0], b = addDays(a, 6), e = dkey(b) > todayKey() ? NOW() : addDays(b, 1);
    const x = st.statusCountsRange(S, a, b, e, optsFor(b));
    vals.push({ a, v: x.prayed ? Math.round(x.congregation / x.prayed * 100) : 0, none: !x.due });
  }
  const mx = Math.max(25, Math.ceil(Math.max(...vals.map(x => x.v)) / 25) * 25);
  const cols = vals.map((o, k) => `<div class="col${k === weeks - 1 ? " cur" : ""}" style="--h:${o.none ? 0 : Math.max(2, o.v / mx * 100)}%" title="${esc(PROG.colTitle(short(o.a), o.v))}"><b>${k === weeks - 1 ? o.v + "%" : ""}</b><i></i></div>`).join("");
  const label = `${PROG.congCols}: ${vals.map(o => `${short(o.a)} ${o.v}%`).join(", ")}`;
  // "About 1 in N prayers in congregation over this period." (parity M9)
  const line = c.congregation ? L.jamMonth(Math.max(1, Math.round(c.prayed / c.congregation))) : L.jamHead(0);
  return `<div class="zt-card pad pr-st1"><p class="pr-cs pr-big1">${line}</p></div>`
    + sec(esc(PROG.congCols), "", "jamaah") + `<div class="zt-card pad"><p class="pr-cs">${esc(PROG.congColsSub)}</p><div class="pr-cols" role="img" aria-label="${esc(label)}">${cols}</div><div class="pr-cax" aria-hidden="true"><span>${short(vals[0].a)}</span><span>${esc(L.thisWeek)}</span></div></div>`;
}

const pbar = (name, pct, cls = "", sub = "") => `<div class="pr-pb ${cls}" role="img" aria-label="${esc(`${name}: ${pct}%`)}"><span class="nm" aria-hidden="true">${esc(name)}${sub ? `<small>${esc(sub)}</small>` : ""}</span><span class="tr" aria-hidden="true"><i style="width:${pct}%"></i></span><span class="v" aria-hidden="true">${pct}%</span></div>`;
function sunnahBars(P) {
  const sr = st.sunnahRange(S, P.from, P.end, P.now), m = madhhabOf(S);
  let body = "";
  for (const [disp, t] of [["solid", TIER.muakkadah], ["outline", TIER.ghayr], ["hidden", TIER.nafl]]) {
    const list = sr.items.filter(x => x.display === disp);
    if (!list.length) continue;
    body += `<p class="pr-gh">${esc(t.name)} · ${esc(t.gloss)}</p>` + list.map(x => pbar(itemName(x), pc(x.done, x.due), disp === "outline" ? "ol" : "")).join("");
  }
  body += `<p class="pr-gh">${esc(WITR_UI.rowLabel[m])}</p>` + pbar(WITR_UI.chip(store.witrChip(S, todayKey()).rakahs || 3), sr.witr.pct ?? 0);
  const headline = L.sunnahPeriod(sr.pct ?? 0, sr.witr.due ? sr.witr.pct : null);
  return sec(esc(PROGRESS.sunnahPrayers), esc(PROG.sunnahSub), "sunnah") + `<div class="zt-card pad"><p class="pr-cs">${headline}</p>${body}</div>${sr.excusedDays ? cap(esc(EXCUSED.progressNote(sr.excusedDays))) : ""}${tierKey(sr)}`;
}
/** Qurʾān: pages (or minutes) read each day over the 30 days, or each month of a year. Flat bars; excused days a moon. */
function quranChart(P) {
  const u = V.qu, today = todayKey();
  const seg = `<div class="pr-seg qg-cseg" role="group" aria-label="${esc(QGOAL.segLabel)}">${["pages", "min"].map(k => `<button type="button" data-f="qu-${k}" class="${k === u ? "on" : ""}" aria-pressed="${k === u}" onclick="A.prQUnit('${k}')">${esc(QGOAL.seg[k])}</button>`).join("")}</div>`;
  const ser = readingSeries(S, P.from, P.end).filter(x => x.key >= S.createdKey && x.key <= today);
  const val = x => (u === "min" ? x.min : x.pages);
  const tp = ser.reduce((a, x) => a + x.pages, 0), tm = ser.reduce((a, x) => a + x.min, 0), dr = ser.filter(x => x.pages || x.min).length;
  const g = goalOf(S);
  let h = `<div class="zt-card pad pr-st3">${stats(QGOAL.totals(tp, tm, dr).map(([b, l]) => [b, esc(l)]))}</div>`;
  if (!dr) return h + `<div class="zt-card pad"><p class="pr-empty">${esc(QGOAL.none)}</p></div>`;
  if (P.r === "month") {
    const days = [];
    for (let d = P.from; dkey(d) <= dkey(P.end); d = addDays(d, 1)) days.push(d);
    const by = new Map(ser.map(x => [x.key, x]));
    const mx = Math.max(1, ...ser.map(val)), top = mx <= 5 ? 5 : Math.ceil(mx / 5) * 5;
    const bars = days.map(d => {
      const k = dkey(d), x = by.get(k);
      if (!x) return `<span class="b"></span>`;
      const v = val(x);
      if (x.excused && !v) return `<span class="b ex" title="${esc(QGOAL.barExcused(short(d)))}">${icon("moon", "")}</span>`;
      return `<span class="b${k === today ? " t" : ""}" title="${esc(QGOAL.barTitle(short(d), v, u))}">${v ? `<i style="height:${Math.max(4, v / top * 100)}%"></i>` : ""}</span>`;
    }).join("");
    const ticks = days.map((d, i) => (d.getDay() === 0 && i < days.length - 2 ? `<span style="grid-column:${i + 1} / span 4">${short(d)}</span>` : "")).join("");
    const tot = u === "min" ? tm : tp;
    h += sec(esc(QGOAL.perDay), esc(u === "min" ? QGOAL.perDaySubM : QGOAL.perDaySubP)) + `<div class="zt-card pad"><div class="pr-qseg">${seg}</div><div class="pr-pd qg-pd" role="img" aria-label="${esc(QGOAL.chartAria(u, short(P.from), short(P.end), tot, dr))}"><div class="bars" style="grid-template-columns:repeat(${days.length},1fr)" aria-hidden="true">${bars}</div><div class="ax" aria-hidden="true"><span>${top}</span><span>0</span></div><div class="tk" style="grid-template-columns:repeat(${days.length},1fr)" aria-hidden="true">${ticks}</div></div></div>`;
  } else {
    const m = Array(12).fill(0);
    for (const x of ser) m[+x.key.slice(5, 7) - 1] += val(x);
    const mx = Math.max(1, ...m), curM = P.year === NOW().getFullYear() ? NOW().getMonth() : -1;
    const cols = m.map((v, k) => `<div class="col${k === curM ? " cur" : ""}" style="--h:${v ? Math.max(2, v / mx * 100) : 0}%"><b>${v || ""}</b><i></i><span>${MON3[k][0]}</span></div>`).join("");
    const label = m.map((v, k) => `${MON3[k]} ${v}`).join(", ");
    h += sec(esc(QGOAL.perMonth), esc(QGOAL.seg[u])) + `<div class="zt-card pad"><div class="pr-qseg">${seg}</div><div class="pr-cols m12" role="img" aria-label="${esc(`${QGOAL.perMonth} (${QGOAL.seg[u]}): ${label}`)}">${cols}</div></div>`;
  }
  return h + cap(esc(g ? `${QGOAL.goalLine(QGOAL.goalName(g))}. ${QGOAL.chartCap}` : QGOAL.chartCap));
}
function deedRates(P) {
  // amalRates counts back from today only: an earlier period has no good-deed rates
  const none = `<div class="zt-card pad"><p class="pr-empty">${esc(PROG.deedsNow)}</p></div>`;
  if ((P.r === "year" && V.year > 0) || (P.r === "month" && V.month > 0)) return none;
  const n = P.r === "month" ? 30 : Math.max(1, Math.round((NOW() - new Date(NOW().getFullYear(), 0, 1)) / 864e5));
  const rates = st.amalRates(S, n, NOW());
  if (!rates.length) return `<div class="zt-card pad"><p class="pr-empty">${esc(L.habitsNone)}</p></div>`;
  const hl = rates.filter(r => r.a.id !== "salawat" && r.a.id !== "sadaqah");
  const hi = hl.length ? hl.reduce((a, b) => (b.rate > a.rate ? b : a)) : null, lo = hl.length > 1 ? hl.reduce((a, b) => (b.rate < a.rate ? b : a)) : null;
  const line = hi ? L.habitsHead(esc(hi.a.name), lo && lo !== hi ? esc(lo.a.name) : "") : "";
  return sec(esc(PROG.deedsWeek), esc(PROG.deedsSub)) + `<div class="zt-card pad">${line ? `<p class="pr-cs">${line}</p>` : ""}${rates.map(r => pbar(r.a.name, r.rate, "", r.a.id === "salawat" || r.a.id === "sadaqah" ? L.noTarget : "")).join("")}</div>`;
}

/* =================================================================================================
   The view
   ================================================================================================= */
const BUILD = { reflect: reflectChapter, week: weekChapter, charts: chartsChapter, provisions: provisionsChapter, makeups: makeupsChapter };
/** The chapters with sub-tabs (views/subtabs.js groups of the same name). */
const SUBS = ["week", "charts", "makeups"];
const CH = makeChapters({ prefix: "pr", label: PROG.chaptersLabel, get: () => UI.progressCh, set: id => { const was = UI.progressCh; UI.progressCh = id; if (was && was !== id) left(was); } });
const drawOne = c => { const p = CH.panel(c); if (p && BUILD[c]) setHTML(p, BUILD[c]()); };
for (const g of SUBS) onSubTab(g, () => { if (UI.view === "progress") drawOne(g); });

/*
 * Leaving a chapter puts it back on its first sub-tab. Never during the swipe: the chapter is redrawn once the track
 * has settled and the page is idle, and only if it is still not the one shown (a swipe that came back keeps it).
 */
const pending = new Set();
let resetJob = 0;
const idle = fn => (typeof requestIdleCallback === "function" ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 200));
function left(c) {
  if (!SUBS.includes(c) || subIsFirst(c)) return;
  pending.add(c);
  if (!resetJob) resetJob = idle(runReset);
}
function runReset() {
  resetJob = 0;
  if (!pending.size) return;
  if (UI.view !== "progress") { resetSubs(...pending); pending.clear(); return; } // the tab redraws when shown
  const tr = $("#v-progress .zt-track");
  if (tr && tr.clientWidth && Math.abs(tr.scrollLeft - CH.index() * tr.clientWidth) > 1) { resetJob = setTimeout(() => { resetJob = idle(runReset); }, 300); return; }
  for (const c of pending) if (c !== UI.progressCh) { resetSubs(c); drawOne(c); }
  pending.clear();
}

/** What Progress depends on besides the user's own taps: the log (revision), the day, and which prayers have begun or ended. */
function timeSig(list) {
  const now = NOW();
  return [revision(), todayKey(), startedPrayers(now, now, S.settings).join(), currentWindow(now, S.settings)?.p || "", list.join()].join("|");
}
let builtSig = "", away = true;
function renderProgress(why) {
  if (UI.view !== "progress") { away = true; return; }
  const el = $("#v-progress"); if (!el) return;
  if (UI.range === "week") { UI.progressCh = "week"; UI.range = ""; } // Today's "This week" line (A.openWeek)
  const list = progressChapters(S);
  if (!list.length) { go(isOn(S, "makeups") ? "qada" : "home"); return; } // Progress was switched off
  // Back on the tab: every chapter starts on its first sub-tab (the redraw below is a full one)
  if (away) { away = false; resetSubs(...SUBS); pending.clear(); why = null; }
  const built = CH.ensure(el, list, PROG.chapters);
  setHTML(CH.top(), `<h1 class="zb-t">${esc(PROGRESS.title)}</h1>${avatarBtn()}`);
  // The 20 s clock tick: every chapter's charts cost a few hundred ms on a slow phone (and could land mid-swipe),
  // and nothing here changes until the log does or a prayer begins or ends
  const sig = timeSig(list);
  if (why?.tick && !built && sig === builtSig) { CH.land(); return; }
  for (const c of list) setHTML(CH.panel(c), BUILD[c]());
  builtSig = sig;
  CH.land();
}
onRender(renderProgress);

/** For tests: the chapters as HTML. */
export const _chapters = { week: weekChapter, charts: chartsChapter, makeups: makeupsChapter, V };
