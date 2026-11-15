/* Progress: Week / Month / Year in chapters (P-A content, P-B chapters, CH1 stacked bars).
 * Renders into #v-progress. Class names below are written plain and prefixed "pg-" by cls();
 * CSS tokens are --pg-* (src/css/progress.css), so nothing depends on the shell styles. */
import { S, UI, A, $, NOW, todayKey, onRender, render, openSheet, closeSheet, toast } from "../app.js";
import * as store from "../store.js";
import { PRAYERS, MON, MON3, dkey, parseKey, addDays, esc } from "../util.js";
import * as st from "../stats.js";
import { weekDates, weekRangeLabel } from "../times.js";
import { isOn } from "../features.js";
import { madhhabOf } from "../rules/madhhab.js";
import { reflectionFor } from "../reflections.js";
import { gloss } from "../glossary.js";
import {
  APP, COMMON, PROGRESS, EXCUSED, STATUS, MEASURE, MAKEUPS, DEEDS, TIER, WITR_UI, SUNNAH_NAME, SUNNAH_UI,
  WEEK_LETTERS_SUN, prayerName,
} from "../strings.js";
import { PROGRESS_L } from "../strings.js";

/* Progress-only labels (strings.js PROGRESS_L). */
const L = PROGRESS_L;

/* ---------- state ---------- */
const V = { week: 0, month: 0, year: 0, chapter: "salah" };
let lastHTML = "", W = 390;
A.selDay = b => { UI.trkDay = b; A.go("tracker"); };
A.pgRange = r => { UI.range = r; render(); };
A.pgOff = d => { V[UI.range] = Math.max(0, V[UI.range] - d); render(); };
A.pgGo = id => {
  const el = document.getElementById("pg-" + id);
  if (!el) return;
  const scr = $("#screen"), chips = document.querySelector(".pg-jump");
  const top = el.getBoundingClientRect().top - scr.getBoundingClientRect().top + scr.scrollTop - ((chips?.offsetHeight || 44) + (parseFloat(chips && getComputedStyle(chips).top) || 0) + 6);
  scr.scrollTo({ top, behavior: "smooth" });
};
A.pgExplain = id => {
  const g = gloss(id); if (!g) return;
  openSheet(`<h3>${esc(g.term)} ${g.ar ? `<span style="font-family:var(--serif,'Amiri',serif);color:var(--ink2,#56645E);font-size:20px;margin-left:6px">${g.ar}</span>` : ""}</h3><p style="margin-top:8px;line-height:1.5">${esc(g.meaning)}</p>${g.draft ? `<p style="margin-top:10px;font-size:12px;opacity:.7">${esc(APP.draftFlag)}</p>` : ""}<div class="cta"><button class="btn primary" onclick="A.closeSheet()">${COMMON.gotIt}</button></div>`);
};
A.pgDot = (p, key) => A.prayerSheet?.(p, key);
A.pgReminder = () => { A.go("settings"); };
A.pgQada = () => A.go("qada");

/* ---------- helpers ---------- */
/** Prefix class names and CSS variables so the view is isolated from the shell styles. */
const cls = h => h.replace(/class="([^"]*)"/g, (_, c) => `class="${c.split(/\s+/).filter(Boolean).map(x => "pg-" + x).join(" ")}"`).replace(/var\(--(?!pg-)/g, "var(--pg-");
const info = id => `<button class="info" onclick="A.pgExplain('${id}')" aria-label="${esc(L.whatMeans)}">ⓘ</button>`;
const DL = WEEK_LETTERS_SUN; // S M T W T F S
const pc = (n, d) => d ? Math.round(n / d * 100) : 0;
const SHORT = { congregation: "j", ontime: "o", madeup: "r", missed: "m", excused: "x", unlogged: "u", future: "f" };
const nowFor = to => dkey(to) >= todayKey() ? NOW() : addDays(to, 1);
const optsFor = to => dkey(to) >= todayKey() ? { settings: S.settings } : {};
const pName = p => prayerName(p);

function glyph(s, cx, cy, r) {
  const w = Math.max(1.6, r * .2);
  if (s === "j") return `<circle cx="${cx}" cy="${cy}" r="${r}" style="fill:var(--sJ)"/><path d="M${cx - r * .42} ${cy + r * .02} l${r * .3} ${r * .3} l${r * .52} -${r * .58}" style="fill:none;stroke:var(--glyph);stroke-width:${w};stroke-linecap:round;stroke-linejoin:round"/>`;
  if (s === "o") return `<circle cx="${cx}" cy="${cy}" r="${r}" style="fill:var(--sO)"/>`;
  if (s === "m") return `<circle cx="${cx}" cy="${cy}" r="${r}" style="fill:var(--sM)"/><line x1="${cx - r * .45}" y1="${cy}" x2="${cx + r * .45}" y2="${cy}" style="stroke:var(--glyph);stroke-width:${Math.max(1.6, r * .22)};stroke-linecap:round"/>`;
  if (s === "r") { const w2 = Math.max(1.4, r * .17); return `<circle cx="${cx}" cy="${cy}" r="${r - .75}" style="fill:var(--sR);stroke:var(--sRline);stroke-width:1.5"/><path d="M${cx - r * .5} ${cy} A${r * .5} ${r * .5} 0 1 0 ${cx - r * .15} ${cy - r * .48}" style="fill:none;stroke:var(--sRink);stroke-width:${w2};stroke-linecap:round"/><path d="M${cx - r * .42} ${cy - r * .68} L${cx - r * .1} ${cy - r * .48} L${cx - r * .36} ${cy - r * .2}" style="fill:none;stroke:var(--sRink);stroke-width:${w2};stroke-linecap:round;stroke-linejoin:round"/>`; }
  if (s === "x") return `<circle cx="${cx}" cy="${cy}" r="${r}" style="fill:var(--sX)"/><path d="M${cx + r * .12} ${cy - r * .52} A${r * .52} ${r * .52} 0 1 0 ${cx + r * .5} ${cy + r * .28} A${r * .42} ${r * .42} 0 1 1 ${cx + r * .12} ${cy - r * .52}z" style="fill:var(--sXink)"/>`;
  if (s === "u") return `<circle cx="${cx}" cy="${cy}" r="${r - 1.2}" style="fill:none;stroke:var(--hollow);stroke-width:2"/>`;
  if (s === "d") return `<circle cx="${cx}" cy="${cy}" r="${r - 1.2}" style="fill:none;stroke:var(--sO);stroke-width:2;stroke-dasharray:2.4 2.6"/>`;
  return `<circle cx="${cx}" cy="${cy}" r="2" style="fill:var(--hollow)"/>`;
}
const gl = (s, r = 6) => `<svg width="${r * 2 + 2}" height="${r * 2 + 2}" viewBox="0 0 ${r * 2 + 2} ${r * 2 + 2}">${glyph(s, r + 1, r + 1, r)}</svg>`;
const LEG = { j: STATUS.congregation, o: STATUS.ontime, r: STATUS.madeup, m: STATUS.missed, x: STATUS.excused, u: PROGRESS.notLogged, d: L.dueNow };
const legend = ks => `<div class="legend">${ks.map(k => `<span>${gl(k)}${LEG[k]}</span>`).join("")}</div>`;
const ICON = {
  rug: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M6 21V8l6-5 6 5v13zM9 21v-6a3 3 0 0 1 6 0v6"/></svg>`,
  fire: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z"/></svg>`,
  star: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z"/></svg>`,
  mosque: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M5 20v-7a7 5 0 0 1 14 0v7zM12 3v3M3 20h18M10 20v-3a2 2 0 0 1 4 0v3"/></svg>`,
  book: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 6c-2-1.5-5-2-8-1.5v14c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-14c-3-.5-6 0-8 1.5zM12 6v14"/></svg>`,
  hands: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21c4-2 7-6 7-10V5l-7-2-7 2v6c0 4 3 8 7 10z"/><path d="M9 11.5l2 2 4-4"/></svg>`,
  flag: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>`,
  sun: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 18h16M7 18a5 5 0 0 1 10 0M12 6v3M5.5 9.5l2 2M18.5 9.5l-2 2"/></svg>`,
  chevL: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg>`,
  chevR: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 5l7 7-7 7"/></svg>`,
  up: `<svg width="11" height="11" viewBox="0 0 12 12"><path d="M6 2l4.5 6.5h-9z" fill="currentColor"/></svg>`,
  clock: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>`,
  fire14: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z"/></svg>`,
};

/* ---------- period ---------- */
function period() {
  const now = NOW(), r = UI.range;
  if (r === "week") {
    const off = V.week, ds = weekDates(now, -off);
    const from = ds[0], to = ds[6], end = dkey(to) > todayKey() ? now : to;
    return { r, off, from, to, end, now: nowFor(end), title: off === 0 ? L.thisWeek : off === 1 ? L.lastWeek : weekRangeLabel(now, -off), sub: weekRangeLabel(now, -off), prev: weekDates(now, -off - 1)[6] >= parseKey(S.createdKey) };
  }
  if (r === "month") {
    const off = V.month, end = addDays(now, -30 * off), from = addDays(end, -29);
    const f = d => `${d.getDate()} ${MON3[d.getMonth()]}`;
    return { r, off, from, to: end, end, now: nowFor(end), title: off === 0 ? L.last30 : L.prev30(30 * off), sub: `${f(from)} – ${f(end)}`, prev: addDays(from, -1) >= parseKey(S.createdKey) };
  }
  const y = now.getFullYear() - V.year, from = new Date(y, 0, 1), to = new Date(y, 11, 31), end = V.year === 0 ? now : to;
  return { r, off: V.year, from, to, end, now: nowFor(end), title: String(y), sub: parseKey(S.createdKey).getFullYear() === y && dkey(parseKey(S.createdKey)) > dkey(from) ? `since ${parseKey(S.createdKey).getDate()} ${MON3[parseKey(S.createdKey).getMonth()]}` : String(y), year: y, prev: y - 1 >= parseKey(S.createdKey).getFullYear() };
}
const counts = P => st.statusCountsRange(S, P.from, P.end, P.now, optsFor(P.end));

/* ---------- chapters ---------- */
function chapters() {
  return [["salah", true], ["streaks", true], ["sunnah", isOn(S, "sunnah")], ["jamaah", true], ["habits", isOn(S, "deeds")], ["qada", isOn(S, "makeups")], ["reflect", true]]
    .filter(c => c[1]).map(c => c[0]);
}
const CH_ICON = { salah: ICON.rug, streaks: ICON.fire, sunnah: ICON.star, jamaah: ICON.mosque, habits: ICON.book, qada: ICON.hands, reflect: ICON.flag };
const CH_INFO = { sunnah: "sunnah", jamaah: "jamaah", qada: "qada" };
const CH_NAME = id => id === "habits" ? DEEDS.title : id === "qada" ? PROGRESS.chapters.qada : PROGRESS.chapters[id];
const sub = (t, s) => `<div class="sub"><h4>${t}</h4>${s ? `<span>${s}</span>` : ""}</div>`;
const cap = t => `<p class="cap" style="margin:9px 4px 0">${t}</p>`;
function chapter(id, list, h3, body, last) {
  const k = list.indexOf(id);
  return `<section class="ch2 ${last ? "last" : ""}" id="pg-${id}" data-ch="${id}"><div class="chh"><div class="node">${CH_ICON[id]}</div><div><div class="eyebrow">${CH_NAME(id)}${CH_INFO[id] ? info(CH_INFO[id]) : ""}<em>${PROGRESS.chapterOf(k + 1, list.length)}</em></div><h3>${h3}</h3></div></div>${body}</section>`;
}

/* ---------- salah ---------- */
function weekGrid(w, series, P) {
  const lab = 64, tal = 36, cw = (w - lab - tal - 6) / 7, top = 40, rh = 34, h = top + rh * 5 + 6;
  const todayIdx = series.findIndex(d => d.key === todayKey());
  let s = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(PROGRESS.weekSalah)}">`;
  if (todayIdx >= 0) s += `<rect x="${lab + cw * todayIdx + cw / 2 - 15}" y="4" width="30" height="${h - 8}" rx="15" style="fill:var(--today)"/>`;
  series.forEach((d, k) => {
    const x = lab + cw * k + cw / 2, fut = d.future;
    s += `<text x="${x}" y="18" text-anchor="middle" font-size="10.5" font-weight="700" class="${fut ? "t3" : "t2"}">${DL[k]}</text><text x="${x}" y="32" text-anchor="middle" font-size="11" font-weight="${k === todayIdx ? 800 : 600}" class="${fut ? "t3" : k === todayIdx ? "t1" : "t2"}">${d.date.getDate()}</text>`;
  });
  PRAYERS.forEach((p, r) => {
    const y = top + rh * r + rh / 2; let pr = 0, due = 0;
    s += `<text x="2" y="${y + 4.5}" font-size="13" font-weight="600" class="t1">${pName(p)}</text>`;
    series.forEach((d, k) => {
      const v = d.statuses[p], c = v === null ? "d" : v === "unlogged" ? "u" : SHORT[v];
      if (c !== "f" && c !== "x" && d.tracked) { if (c === "j" || c === "o" || c === "r") { pr++; due++; } else if (c === "m" || c === "u" || c === "d") due++; }
      const x = lab + cw * k + cw / 2;
      s += glyph(d.tracked || c === "x" ? c : "f", x, y, 10);
      if (!d.future) s += `<rect x="${x - 15}" y="${y - 15}" width="30" height="30" fill="transparent" style="cursor:pointer" onclick="A.pgDot('${p}','${d.key}')" role="button" aria-label="${esc(pName(p))} ${d.key}"/>`;
    });
    s += `<text x="${w - 2}" y="${y + 4.5}" text-anchor="end" font-size="13" font-weight="700" class="t1" style="font-variant-numeric:tabular-nums">${pr}<tspan class="t2" font-weight="600">/${due}</tspan></text>`;
  });
  return s + "</svg>";
}
function breakdown(w, c) {
  const segs = [["j", c.congregation, "--sJ"], ["o", c.ontime, "--sO"], ["r", c.madeup, "--sR"], ["m", c.missed, "--sM"]];
  const tot = segs.reduce((a, x) => a + x[1], 0) + c.unlogged;
  let bar = "";
  if (tot) {
    bar = `<svg width="${w}" height="14" viewBox="0 0 ${w} 14" style="display:block;margin:2px 0 0"><clipPath id="pgbk"><rect x="0" y="0" width="${w}" height="14" rx="7"/></clipPath><g clip-path="url(#pgbk)">`;
    let x = 0;
    [...segs, ["u", c.unlogged, "--track"]].forEach(([k, n, v]) => { const ww = n / tot * w; if (ww > 0) { bar += `<rect x="${x}" y="0" width="${Math.max(0, ww - (k === "u" ? 0 : 2))}" height="14" style="fill:var(${v})"/>`; x += ww; } });
    bar += `</g></svg>`;
  }
  const row = (k, label, n, sub2) => `<div>${gl(k)}<span>${label}${sub2 ? ` <small>· ${sub2}</small>` : ""}</span><b>${n}</b></div>`;
  return `<div style="padding:16px 16px 6px">${bar || `<p class="cap">${PROGRESS.noneLogged7}</p>`}</div><div class="brk">${row("j", STATUS.congregation, c.congregation)}${row("o", STATUS.ontime, c.ontime)}${row("r", STATUS.madeup, c.madeup, PROGRESS.madeUpSub)}${row("m", STATUS.missed, c.missed, PROGRESS.missedSub)}${c.excused ? row("x", STATUS.excused, c.excused, PROGRESS.excusedSub) : ""}${c.unlogged ? row("u", PROGRESS.notLogged, c.unlogged) : ""}</div>`;
}
/** CH1: 100% stacked bars, one per prayer. */
function eachStack(w, rows) {
  const lab = 72, val = 44, bw = w - lab - val - 8, rh = 40, h = rh * 5 + 4, bh = 12;
  const ok = rows.filter(r => r.counts.due);
  const weakest = ok.length ? ok.reduce((m, r) => (r.prayedPct < m.prayedPct ? r : m)) : null;
  let s = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(PROGRESS.eachPrayer)}">`;
  rows.forEach((r, k) => {
    const c = r.counts, y = k * rh + rh / 2, id = "pgcl" + k, due = c.due + c.unlogged || 1;
    const isW = weakest && r === weakest && ok.length > 1;
    s += `<text x="2" y="${y + (isW ? -1 : 4.5)}" font-size="13" font-weight="600" class="t1">${esc(r.name)}</text>`;
    if (isW) s += `<text x="2" y="${y + 13}" font-size="10.5" font-weight="700" style="fill:var(--goldink)">${L.edge || "growth edge"}</text>`;
    s += `<clipPath id="${id}"><rect x="${lab}" y="${y - bh / 2}" width="${bw}" height="${bh}" rx="4"/></clipPath><g clip-path="url(#${id})">`;
    let x = lab; const rx = [];
    [["congregation", "--sJ"], ["ontime", "--sO"], ["madeup", "--sR"], ["missed", "--sM"], ["unlogged", "--track"]].forEach(([kk, v]) => {
      const ww = c[kk] / due * bw; if (ww <= 0) return;
      if (kk === "madeup") rx.push([x, ww]);
      s += `<rect x="${x}" y="${y - bh / 2}" width="${Math.max(0, ww - 2)}" height="${bh}" style="fill:var(${v})"/>`; x += ww;
    });
    s += `</g>`;
    rx.forEach(([x0, ww]) => s += `<rect x="${x0 + .75}" y="${y - bh / 2 + .75}" width="${Math.max(0, ww - 3.5)}" height="${bh - 1.5}" rx="1.5" style="fill:none;stroke:var(--sRline);stroke-width:1.5"/>`);
    s += `<text x="${w - 2}" y="${y + 4.5}" text-anchor="end" font-size="13" font-weight="700" class="t1">${r.prayedPct == null ? "–" : r.prayedPct + "%"}</text>`;
  });
  return s + "</svg>";
}
function ringsCal(w, P) {
  const start = addDays(weekDates(P.end, 0)[0], -28), cw = w / 7, rh = 56, top = 22, h = top + rh * 5 + 4, r = 16, sw = 4.5;
  const pt = (cx, cy, deg) => { const t = (deg - 90) * Math.PI / 180; return [cx + r * Math.cos(t), cy + r * Math.sin(t)]; };
  const arc = (cx, cy, d0, d1) => { const [x0, y0] = pt(cx, cy, d0), [x1, y1] = pt(cx, cy, d1); return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`; };
  let s = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(PROGRESS.lastFiveWeeks)}">`;
  DL.forEach((l, k) => s += `<text x="${cw * k + cw / 2}" y="12" text-anchor="middle" font-size="10.5" font-weight="700" class="t2">${l}</text>`);
  for (let q = 0; q < 35; q++) {
    const d = addDays(start, q), key = dkey(d), cx = cw * (q % 7) + cw / 2, cy = top + rh * Math.floor(q / 7) + rh / 2;
    const fut = key > todayKey(), isT = key === todayKey(), day = store.getDay(S, key);
    if (fut || key < S.createdKey) { s += `<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="11" font-weight="600" class="t3">${d.getDate()}</text>`; continue; }
    if (isT) s += `<rect x="${cx - 24}" y="${cy - 24}" width="48" height="48" rx="14" style="fill:var(--today)"/>`;
    s += `<rect x="${cx - 24}" y="${cy - 24}" width="48" height="48" fill="transparent" style="cursor:pointer" onclick="A.selDay(${Math.round((parseKey(todayKey()) - d) / 864e5)})" role="button" aria-label="${key}"/>`;
    if (day.excused) { s += `<circle cx="${cx}" cy="${cy}" r="${r + 2}" style="fill:var(--sX)"/>${glyph("x", cx + 12, cy - 12, 5.5).replace(/fill:var\(--sX\)/, "fill:var(--card)")}<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="11" font-weight="600" class="t3">${d.getDate()}</text>`; continue; }
    PRAYERS.forEach((p, k) => {
      const v = store.statusOf(day, p), d0 = k * 72 + 5, d1 = k * 72 + 67;
      if (v === "madeup") { s += `<path d="${arc(cx, cy, d0, d1)}" style="fill:none;stroke:var(--sRline);stroke-width:${sw};stroke-linecap:round"/><path d="${arc(cx, cy, d0, d1)}" style="fill:none;stroke:var(--sR);stroke-width:${sw - 2.4};stroke-linecap:round"/>`; return; }
      const col = { congregation: "--sJ", ontime: "--sO", missed: "--sM", excused: "--sX" }[v] || "--track";
      s += `<path d="${arc(cx, cy, d0, d1)}" style="fill:none;stroke:var(${col});stroke-width:${v === "missed" ? 2 : sw};stroke-linecap:round"/>`;
    });
    s += `<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="11" font-weight="${isT ? 800 : 600}" class="t1">${d.getDate()}</text>`;
  }
  return s + "</svg>";
}
const ringKey = exc => `<div class="legend" style="padding-top:2px">${[["--sJ", STATUS.congregation], ["--sO", STATUS.ontime], ["--sR", STATUS.madeup], ["--sM", STATUS.missed]].map(([v, l]) => `<span><svg width="20" height="12"><path d="M3 9 A8 8 0 0 1 17 9" style="fill:none;stroke:var(${v});stroke-width:4.5;stroke-linecap:round"/></svg>${l}</span>`).join("")}${exc ? `<span>${gl("x")}${STATUS.excused}</span>` : ""}</div>`;

/* ---------- streaks ---------- */
function streakPair(P, note) {
  const s = st.streaks(S, NOW()), a = s.all, o = s.onTime, d = n => n === 1 ? "day" : "days";
  const hasEx = counts(P).excusedDays > 0;
  return `<div class="strk"><div><span class="tt" style="color:var(--accent)">${ICON.fire14}<span style="color:var(--ink)">${PROGRESS.allFive}</span></span><b style="margin-top:6px">${a.cur}<span> ${d(a.cur)}</span></b><small>${PROGRESS.bestKeep(a.best)}</small></div>
  <div><span class="tt" style="color:var(--goldink)">${ICON.clock}<span style="color:var(--ink)">${PROGRESS.allOnTime}</span></span><b style="margin-top:6px">${o.cur}<span> ${d(o.cur)}</span></b><small>${PROGRESS.bestOnTime(o.best)}</small></div></div>${note ? cap(`${hasEx ? PROGRESS.streakExcused : ""}${PROGRESS.streakToday}`) : ""}`;
}

/* ---------- sunnah ---------- */
const itemName = x => x.prayer === "day" || !x.prayer ? esc(SUNNAH_NAME[x.name] || x.name || x.label) : `${esc(x.jumuah ? prayerName("Dhuhr", { date: new Date(2026, 0, 2), jumuah: true }) : pName(x.prayer))} ${esc(x.label)}`;
function tierBlock(sr, kind) {
  const m = madhhabOf(S), items = sr.items;
  const solid = items.filter(x => x.display === "solid"), outline = items.filter(x => x.display === "outline"), other = items.filter(x => x.display === "hidden");
  return { m, solid, outline, other };
}
function sunnahWeek(w, P, sr) {
  const days = weekDates(P.end, 0).map(d => ({ d, key: dkey(d) }));
  const lab = 108, tal = 34, cw = (w - lab - tal) / 7, rh = 28, jum = days.some(x => st.isJumuahDay(S, x.d));
  const { solid, outline, other } = tierBlock(sr);
  let y = 40, s = "", body = "";
  const todayIdx = days.findIndex(x => x.key === todayKey());
  const section = (title, list) => {
    if (!list.length) return;
    body += `<text x="2" y="${y + 6}" font-size="10" font-weight="800" letter-spacing=".06em" class="t2">${title}</text>`; y += 20;
    list.forEach(x => {
      body += `<text x="2" y="${y + 5}" font-size="12.5" font-weight="600" class="t1">${itemName(x)}</text>`;
      let n = 0, dn = 0;
      days.forEach((dd, k) => {
        const cx = lab + cw * k + cw / 2, day = store.getDay(S, dd.key);
        if (dd.key > todayKey() || dd.key < S.createdKey) { body += `<circle cx="${cx}" cy="${y}" r="2" style="fill:var(--hollow)"/>`; return; }
        if (day.excused) { body += `<circle cx="${cx}" cy="${y}" r="2" style="fill:var(--sXink);opacity:.5"/>`; return; }
        const chips = x.prayer ? store.sunnahChips(S, dd.key, x.prayer, { all: true }) : [];
        const chip = chips.find(c => c.id === x.id);
        if (!chip) { body += `<circle cx="${cx}" cy="${y}" r="2" style="fill:var(--hollow)"/>`; return; }
        if (chip.allowed) n++;
        const bx = cx - 9, by = y - 9;
        if (chip.done) { dn++; body += `<rect x="${bx}" y="${by}" width="18" height="18" rx="5" style="fill:var(--sun)"/><path d="M${cx - 4} ${y} l3 3 l5.5 -6" style="fill:none;stroke:var(--card);stroke-width:1.8;stroke-linecap:round"/>`; }
        else if (!chip.allowed) body += `<line x1="${cx - 4}" x2="${cx + 4}" y1="${y}" y2="${y}" style="stroke:var(--hollow);stroke-width:1.6;stroke-linecap:round"/>`;
        else body += `<rect x="${bx + .75}" y="${by + .75}" width="16.5" height="16.5" rx="4.5" style="fill:none;stroke:var(--hollow);stroke-width:1.5${x.display === "outline" ? ";stroke-dasharray:3 2.5" : ""}"/>`;
      });
      body += `<text x="${w - 2}" y="${y + 5}" text-anchor="end" font-size="12.5" font-weight="700" class="t1">${x.done}<tspan class="t2" font-weight="600">/${x.due}</tspan></text>`;
      y += rh;
    });
    y += 4;
  };
  section(`${TIER.muakkadah.name.toUpperCase()} · ${TIER.muakkadah.gloss.toUpperCase()}`, solid);
  section(`${TIER.ghayr.name.toUpperCase()} · ${TIER.ghayr.gloss.toUpperCase()}`, outline);
  section(`NAFL`, other);
  // Witr
  const m = madhhabOf(S);
  if (S.settings.madhhab !== undefined || true) {
    body += `<text x="2" y="${y + 6}" font-size="10" font-weight="800" letter-spacing=".06em" class="t2">${esc(WITR_UI.rowLabel[m].toUpperCase())}</text>`; y += 20;
    body += `<text x="2" y="${y + 5}" font-size="12.5" font-weight="600" class="t1">${esc(WITR_UI.chip(store.witrChip(S, days[0].key).rakahs || 3))}</text>`;
    let wd = 0, wdue = 0;
    days.forEach((dd, k) => {
      const cx = lab + cw * k + cw / 2, day = store.getDay(S, dd.key);
      if (dd.key > todayKey() || dd.key < S.createdKey || day.excused) { body += `<circle cx="${cx}" cy="${y}" r="2" style="fill:var(--hollow)"/>`; return; }
      wdue++;
      const done = day.witr === "done" || day.witr === "madeup";
      const dia = `M${cx} ${y - 9} L${cx + 9} ${y} L${cx} ${y + 9} L${cx - 9} ${y}z`;
      if (done) { wd++; body += `<path d="${dia}" style="fill:var(--goldink);opacity:.9"/><path d="M${cx - 4} ${y} l3 3 l5.5 -6" style="fill:none;stroke:var(--card);stroke-width:1.8;stroke-linecap:round"/>`; }
      else if (day.witr === "missed") body += `<path d="${dia}" style="fill:none;stroke:var(--sM);stroke-width:1.5"/>`;
      else body += `<path d="${dia}" style="fill:none;stroke:var(--hollow);stroke-width:1.5"/>`;
    });
    body += `<text x="${w - 2}" y="${y + 5}" text-anchor="end" font-size="12.5" font-weight="700" class="t1">${wd}<tspan class="t2" font-weight="600">/${wdue}</tspan></text>`;
    y += rh;
  }
  const h = y + 4;
  let head = "";
  if (todayIdx >= 0) head += `<rect x="${lab + cw * todayIdx + cw / 2 - 15}" y="4" width="30" height="${h - 8}" rx="15" style="fill:var(--today)"/>`;
  days.forEach((dd, k) => {
    const x = lab + cw * k + cw / 2, fut = dd.key > todayKey();
    head += `<text x="${x}" y="18" text-anchor="middle" font-size="10.5" font-weight="700" class="${fut ? "t3" : "t2"}">${DL[k]}</text><text x="${x}" y="32" text-anchor="middle" font-size="11" font-weight="${k === todayIdx ? 800 : 600}" class="${fut ? "t3" : k === todayIdx ? "t1" : "t2"}">${dd.d.getDate()}</text>`;
    if (st.isJumuahDay(S, dd.d)) head += `<text x="${x}" y="43" text-anchor="middle" font-size="7.5" font-weight="800" class="t3">${SUNNAH_UI.jumuahTag}</text>`;
  });
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(PROGRESS.sunnahPrayers)}">${head}${body}</svg>`;
}
/** Month/year: one bar per sunnah, grouped by tier. */
function sunnahBars(w, sr) {
  const { solid, outline, other } = tierBlock(sr), m = madhhabOf(S);
  const lab = 108, val = 40, bw = w - lab - val - 6, rh = 26;
  let y = 0, s = "";
  const sec = (title, list) => {
    if (!list.length) return;
    s += `<text x="2" y="${y + 10}" font-size="10" font-weight="800" letter-spacing=".06em" class="t2">${title}</text>`; y += 22;
    list.forEach(x => {
      const p = pc(x.done, x.due);
      s += `<text x="2" y="${y + 4}" font-size="12.5" font-weight="600" class="t1">${itemName(x)}</text><rect x="${lab}" y="${y - 4}" width="${bw}" height="9" rx="4.5" style="fill:var(--track)"/><rect x="${lab}" y="${y - 4}" width="${Math.max(0, bw * p / 100)}" height="9" rx="4.5" style="fill:var(--${x.display === "solid" ? "sun" : "sunLight"})${x.display === "outline" ? ";stroke:var(--sun);stroke-width:1.2" : ""}"/><text x="${w - 2}" y="${y + 4}" text-anchor="end" font-size="12.5" font-weight="700" class="t1">${p}%</text>`;
      y += rh;
    }); y += 2;
  };
  sec(`${TIER.muakkadah.name.toUpperCase()} · ${TIER.muakkadah.gloss.toUpperCase()}`, solid);
  sec(`${TIER.ghayr.name.toUpperCase()} · ${TIER.ghayr.gloss.toUpperCase()}`, outline);
  sec("NAFL", other);
  const wp = sr.witr.pct ?? 0;
  s += `<text x="2" y="${y + 10}" font-size="10" font-weight="800" letter-spacing=".06em" class="t2">${esc(WITR_UI.rowLabel[m].toUpperCase())}</text>`; y += 22;
  s += `<text x="2" y="${y + 4}" font-size="12.5" font-weight="600" class="t1">${esc(WITR_UI.chip(store.witrChip(S, todayKey()).rakahs || 3))}</text><rect x="${lab}" y="${y - 4}" width="${bw}" height="9" rx="4.5" style="fill:var(--track)"/><rect x="${lab}" y="${y - 4}" width="${bw * wp / 100}" height="9" rx="4.5" style="fill:var(--goldink);opacity:.85"/><text x="${w - 2}" y="${y + 4}" text-anchor="end" font-size="12.5" font-weight="700" class="t1">${wp}%</text>`;
  y += rh;
  return `<svg width="${w}" height="${y}" viewBox="0 0 ${w} ${y}" role="img" aria-label="${esc(PROGRESS.sunnahPrayers)}">${s}</svg>`;
}
function tierLegend(sr) {
  const m = madhhabOf(S), rows = [];
  const chipTier = (cl, label) => `<span class="tierchip ${cl}">${esc(label)}</span>`;
  const sh = sr.items.some(x => x.display === "solid"), go = sr.items.some(x => x.display === "outline");
  if (sh) rows.push(`<div>${chipTier("mu", TIER.muakkadah.name)}<span><b>${esc(TIER.muakkadah.gloss)}.</b> ${esc(TIER.muakkadah.line)}</span></div>`);
  if (go) rows.push(`<div>${chipTier("gh", TIER.ghayr.name)}<span><b>${esc(TIER.ghayr.gloss)}.</b> ${esc(TIER.ghayr.line)}</span></div>`);
  rows.push(`<div>${chipTier("wj", WITR_UI.rowLabel[m].split(" · ")[0] + " · " + (m === "hanafi" ? TIER.wajib.name.toLowerCase() : "sunnah"))}<span><b>${esc(m === "hanafi" ? TIER.wajib.gloss : TIER.sunnah.gloss)}.</b> ${esc(WITR_UI.line[m])}</span></div>`);
  if (S.settings.sunnahNafl) rows.push(`<div>${chipTier("nf", TIER.nafl.name)}<span><b>${esc(TIER.nafl.gloss)}.</b> ${esc(TIER.nafl.line)}</span></div>`);
  return `<div class="tiers">${rows.join("")}</div>`;
}
const measureTxt = (sr, k) => sr.kind === "raghibahWitr" ? MEASURE.raghibahWitrValue(sr.got, sr.of) : MEASURE.rakahs(sr.got, sr.of);

/* ---------- jamaah ---------- */
function jamTiles(P, c0) {
  const per = st.perPrayerCounts(S, P.from, P.end, P.now, optsFor(P.end));
  const rows = PRAYERS.map(p => ({ p, j: per[p].congregation, due: per[p].due })).filter(r => r.due).sort((a, b) => b.j / b.due - a.j / a.due || b.j - a.j).slice(0, 3);
  return `<div class="mini">${rows.map(r => `<div><b>${r.j}/${r.due}</b><small>${esc(pName(r.p))}</small></div>`).join("")}</div>`;
}
function jamCols(w, weeks = 12) {
  const end = weekDates(NOW(), 0)[6], vals = [];
  for (let k = weeks - 1; k >= 0; k--) {
    const a = addDays(weekDates(NOW(), -k)[0], 0), b = addDays(a, 6), e = dkey(b) > todayKey() ? NOW() : addDays(b, 1);
    const c = st.statusCountsRange(S, a, b, e, optsFor(b));
    vals.push({ a, v: c.prayed ? Math.round(c.congregation / c.prayed * 100) : 0 });
  }
  const mx = Math.max(25, Math.ceil(Math.max(...vals.map(x => x.v)) / 25) * 25);
  const l = 30, top = 22, ph = 96, h = top + ph + 24, bw = (w - l - 4) / weeks;
  let s = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(PROGRESS.prayersInJamaah)}">`;
  [0, mx / 2, mx].forEach(t => { const y = top + ph - t / mx * ph; s += `<line x1="${l}" x2="${w}" y1="${y}" y2="${y}" style="stroke:var(--line)"/><text x="${l - 6}" y="${y + 3.5}" text-anchor="end" font-size="10" class="t3">${Math.round(t)}%</text>`; });
  vals.forEach((o, k) => {
    const x = l + bw * k + (bw - 16) / 2, hh = o.v / mx * ph, y = top + ph - hh, last = k === weeks - 1;
    s += `<path d="M${x} ${top + ph} V${y + 4} q0 -4 4 -4 h8 q4 0 4 4 V${top + ph}z" style="fill:var(--sJ);opacity:${last ? 1 : .42}"/>`;
    if (last) s += `<text x="${x + 8}" y="${y - 6}" text-anchor="middle" font-size="12" font-weight="800" class="t1">${o.v}%</text>`;
  });
  s += `<text x="${l + bw / 2 - 8}" y="${h - 6}" font-size="10.5" font-weight="600" class="t2">${vals[0].a.getDate()} ${MON3[vals[0].a.getMonth()]}</text><text x="${w}" y="${h - 6}" text-anchor="end" font-size="10.5" font-weight="700" class="t1">${L.thisWeek}</text>`;
  return { svg: s + "</svg>", last: vals[weeks - 1].v };
}

/* ---------- good deeds ---------- */
function deedIds(P) {
  const ids = new Map();
  for (let d = P.from; dkey(d) <= dkey(P.end); d = addDays(d, 1)) {
    if (dkey(d) < S.createdKey) continue;
    for (const a of store.amalForDay(S, dkey(d))) if (!ids.has(a.id)) ids.set(a.id, a);
  }
  const order = [...S.amalList.map(a => a.id), "listen", "dua"];
  return [...ids.values()].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
}
function amalStrips(w, P, letters) {
  const list = deedIds(P), n = Math.round((P.end - P.from) / 864e5) + 1, nm = 112;
  const cellsW = w - 32 - nm - 10 - 46, pitch = cellsW / n, cwid = Math.max(4, pitch - (n > 10 ? 1.6 : 4));
  let out = "";
  const days = Array.from({ length: n }, (_, k) => { const d = addDays(P.from, k); return { d, key: dkey(d) }; });
  if (letters) out += `<div class="arow" style="padding-bottom:0;padding-top:12px"><div class="nm" style="width:${nm}px"></div><svg width="${cellsW}" height="12">${days.map((x, k) => `<text x="${k * pitch + cwid / 2}" y="10" text-anchor="middle" font-size="10" font-weight="700" class="${x.key > todayKey() ? "t3" : "t2"}">${DL[k % 7]}</text>`).join("")}</svg><div class="v"></div></div>`;
  for (const a of list) {
    let dn = 0, cnt = 0, cells = "";
    days.forEach((x, k) => {
      const state = st.amalDayState(S, x.key, a.id, NOW()), X = k * pitch;
      if (state === "future") { cells += `<rect x="${X}" y="${letters ? 6 : 3}" width="${cwid}" height="${letters ? 6 : 12}" rx="${letters ? 3 : 1.5}" style="fill:none;stroke:var(--line)"/>`; return; }
      if (state === "untracked") { cells += `<rect x="${X}" y="${letters ? 6 : 3}" width="${cwid}" height="${letters ? 6 : 12}" rx="1.5" style="fill:var(--track);opacity:.5"/>`; return; }
      if (state === "excused") { cells += glyph("x", X + cwid / 2, 9, Math.min(8, cwid / 2)); return; }
      const ok = state === "done"; if (state !== "pending") cnt++; if (ok) { dn++; }
      cells += `<rect x="${X}" y="${letters ? 0 : 2}" width="${cwid}" height="${letters ? 18 : 14}" rx="${letters ? 5 : 1.8}" style="fill:var(${ok ? "--sO" : "--track"})"/>${letters && ok ? `<path d="M${X + cwid / 2 - 4} 9.5 l3 3 l5.5 -6" style="fill:none;stroke:var(--glyph);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round"/>` : ""}`;
    });
    const noTarget = a.id === "salawat" || a.id === "sadaqah";
    out += `<div class="arow"><div class="nm" style="width:${nm}px">${esc(a.name)}${noTarget ? `<small>${L.noTarget}</small>` : ""}</div><svg width="${cellsW}" height="18" aria-hidden="true">${cells}</svg><div class="v">${dn}<span>/${cnt}</span></div></div>`;
  }
  return { html: out, list };
}

/* ---------- reflections ---------- */
function reflections(per) {
  const { good, warn } = st.insights(S, NOW());
  const item = (i, ic, cl) => `<div class="ins ${cl || ""}"><div class="mk">${ic}</div><div><b>${esc(i.title)}</b><small>${esc(i.sub)}</small>${cl === "step" ? `<button class="act" onclick="A.pgReminder()">${L.setReminder}</button>` : ""}</div></div>`;
  let h = `<div class="card" style="margin-top:16px"><div class="kicker">${PROGRESS.goingWell}</div>${good.length ? good.slice(0, 2).map(i => item(i, ICON.star)).join("") : `<div class="ins"><div><small>${esc(PROGRESS.doingWellEmpty)}</small></div></div>`}`;
  if (warn.length) h += `<div class="kicker" style="border-top:1px solid var(--line);padding-top:14px">${PROGRESS.oneStep(per)}</div>${item(warn[0], ICON.sun, "step")}`;
  h += `</div>`;
  if (S.settings.reflection !== false) { const r = reflectionFor(NOW()); h += `<div class="hadith">“${esc(r.en)}”<small>${esc(r.src)}</small></div>`; }
  return h;
}

/* ---------- screens ---------- */
function head(P, list) {
  const seg = ["week", "month", "year"].map(r => `<button class="${r === P.r ? "on" : ""}" aria-pressed="${r === P.r}" onclick="A.pgRange('${r}')">${PROGRESS.ranges[r]}</button>`).join("");
  const nav = `<div class="pnav"><button class="arr ${P.prev ? "" : "off"}" ${P.prev ? "" : "disabled"} aria-label="${esc(COMMON.back)}" onclick="A.pgOff(-1)">${ICON.chevL}</button><div style="text-align:center">${P.title}<small>${P.sub}</small></div><button class="arr ${P.off ? "" : "off"}" ${P.off ? "" : "disabled"} aria-label="${esc(COMMON.continue)}" onclick="A.pgOff(1)">${ICON.chevR}</button></div>`;
  const jump = `<nav class="jump2 jump" aria-label="${L.chips}"><div class="jt">${list.map(id => `<a class="${id === V.chapter ? "on" : ""}" data-ch="${id}" role="button" tabindex="0" onclick="A.pgGo('${id}')">${CH_NAME(id)}</a>`).join("")}</div></nav>`;
  return { top: `<div class="top"><h1>${PROGRESS.title}</h1><p>${L.sub}</p></div><div class="seg">${seg}</div>${nav}`, jump };
}
function heroWeek(P, c) {
  const prev = weekDates(NOW(), -P.off - 1), c2 = st.statusCountsRange(S, prev[0], prev[6], addDays(prev[6], 1));
  const pct = pc(c.prayed, c.due), lp = pc(c2.prayed, c2.due);
  const cmp = !c2.due ? "" : pct > lp ? L.upFrom(lp) : pct === lp ? L.steady : L.lastWas(lp);
  // daily habits (salawat and sadaqah have no target, counted apart)
  let done = 0, due = 0, sal = 0, sad = 0;
  if (isOn(S, "deeds")) for (const d of weekDates(P.end, 0)) {
    const key = dkey(d);
    for (const a of store.amalForDay(S, key)) {
      const s = st.amalDayState(S, key, a.id, NOW());
      if (a.id === "salawat") { if (s === "done") sal++; continue; }
      if (a.id === "sadaqah") { if (s === "done") sad++; continue; }
      if (s === "done") { done++; due++; } else if (s === "missed") due++;
    }
  }
  const best = bestJam(P, c);
  return `<div class="sum"><div class="row2"><div class="k"><small>${PROGRESS.fardPrayed}</small><b>${c.prayed}<span> ${PROGRESS.ofDue(c.due)}</span></b><div class="meter"><i style="width:${pct}%;background:var(--heroJ)"></i></div><div class="delta" style="color:var(--heroJ)">${cmp ? (pct > lp ? ICON.up + " " : "") + cmp : "&nbsp;"}</div></div>
  ${isOn(S, "deeds") ? `<div class="k"><small>${PROGRESS.dailyHabits}</small><b>${done}<span> ${L.habitsOf(done, due)}</span></b><div class="meter"><i style="width:${pc(done, due)}%;background:var(--heroO)"></i></div><div class="delta" style="color:var(--heroO);font-weight:600">${L.plusDeeds(sal, sad)}</div></div>` : ""}</div>
  <div class="foot"><span>${PROGRESS.jamaahThisWeek}</span><span><b>${L.nPrayers(c.congregation)}</b>${best ? " · " + L.bestYet : ""}</span></div></div>`;
}
function bestJam(P, c) {
  if (!c.congregation) return false;
  for (let k = 1; k <= 12; k++) { const d = weekDates(P.end, -k); const x = st.statusCountsRange(S, d[0], d[6], addDays(d[6], 1)); if (x.congregation >= c.congregation) return false; }
  return true;
}
function statRow(cards) { return `<div class="statrow">${cards.map(c => `<div class="card"><b>${c[0]}</b><small>${c[1]}</small></div>`).join("")}</div>`; }
const excNote = n => n ? `<p class="excnote">${gl("x", 7)}<span>${EXCUSED.progressNote(n)}</span></p>` : "";

function body(P, list) {
  const W2 = W - 40, CW = W2 - 2, c = counts(P), m = P.r;
  const isW = m === "week", isM = m === "month", isY = m === "year";
  const sr = isOn(S, "sunnah") ? st.sunnahRange(S, P.from, P.end, P.now) : null;
  const out = [];
  let intro = "";
  const per = isW ? "week" : isM ? "month" : "year";
  if (isW) intro = heroWeek(P, c);
  else if (isM) {
    const pp = st.statusCountsRange(S, addDays(P.from, -30), addDays(P.from, -1), addDays(P.from, 0));
    const days = Math.max(0, c.days - c.excusedDays);
    let full = 0; for (let d = P.from; dkey(d) <= dkey(P.end); d = addDays(d, 1)) { const k = dkey(d); if (k >= todayKey() || k < S.createdKey) continue; const dy = store.getDay(S, k); if (dy.excused) continue; if (PRAYERS.every(p => st.prayerStreak && ["congregation", "ontime", "madeup"].includes(store.statusOf(dy, p)))) full++; }
    intro = statRow([[`${pc(c.prayed, c.due)}%`, `${L.ofFard}${pp.due ? ", " + L.upFromPct(pc(pp.prayed, pp.due)) : ""}`], [`${pc(c.congregation + c.ontime, c.due)}%`, L.onTime], [`${full}<span>/${Math.max(0, c.days - c.excusedDays - (dkey(P.end) >= todayKey() ? 1 : 0))}</span>`, L.prayedDays]]) + excNote(c.excusedDays);
  } else {
    const rk = c.madeup;
    intro = statRow([[c.prayed.toLocaleString(), L.fardPrayedN], [c.congregation.toLocaleString(), STATUS.congregation.toLowerCase()], [rk, L.madeUpSame]]) + excNote(c.excusedDays);
  }

  /* salah */
  let salahH, salahB = "";
  if (!c.due && !c.excusedDays) salahH = L.noData;
  else if (isW) salahH = c.missed || c.unlogged ? L.mostPrayed(c.prayed, c.due) : L.allPrayed(c.congregation + c.ontime, c.madeup);
  else if (isM || isY) salahH = `<b>${pc(c.prayed, c.due)}%</b> ${L.ofFard}; <b>${pc(c.congregation + c.ontime, c.due)}%</b> ${L.onTime}.`;
  if (isW) {
    const series = st.weekSeries(S, P.now, 0, { settings: S.settings }).map(x => x);
    const ser = weekDates(P.end, 0).length ? st.weekSeries(S, NOW(), -P.off, { settings: S.settings }) : series;
    const ks = ["j", "o", "r", "m", ...(c.excusedDays ? ["x"] : []), "u", "d"];
    const exDay = ser.find(x => x.excused);
    salahB = `${sub(PROGRESS.weekSalah, PROGRESS.tapDot)}<div class="card"><div style="padding:10px 14px 2px">${weekGrid(CW - 28, ser, P)}</div>${legend(ks)}</div>${exDay ? cap(EXCUSED.weekCap(["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"][ser.indexOf(exDay)])) : c.madeup ? cap(PROGRESS.madeUpCap(c.madeup)) : ""}
    ${sub(PROGRESS.howYouPrayed, PROGRESS.thisWeekLower)}<div class="card">${breakdown(CW - 32, c)}</div>`;
  } else if (isM) {
    const ser = st.eachPrayerSeries(S, P.now, { from: P.from, to: P.end, settings: optsFor(P.end).settings });
    const ok = ser.filter(r => r.counts.due), weak = ok.length ? ok.reduce((a, b) => (b.prayedPct < a.prayedPct ? b : a)) : null;
    let capt = "";
    if (weak) {
      const mA = new Date(P.end.getFullYear(), P.end.getMonth(), 1), mB = new Date(mA.getFullYear(), mA.getMonth() - 1, 1);
      const one = d => st.eachPrayerSeries(S, P.now, { from: d, to: new Date(d.getFullYear(), d.getMonth() + 1, 0) > P.end ? P.end : new Date(d.getFullYear(), d.getMonth() + 1, 0), settings: optsFor(P.end).settings }).find(r => r.p === weak.p);
      const a = one(mA), b = one(mB);
      capt = a?.prayedPct != null && b?.prayedPct != null ? `${esc(weak.name)}: <b>${b.prayedPct}% in ${MON3[mB.getMonth()]}, ${a.prayedPct}% in ${MON3[mA.getMonth()]}</b>.` : `${esc(weak.name)}: <b>${weak.prayedPct}%</b>.`;
    }
    const best = ok.length ? ok.reduce((a, b) => (b.prayedPct > a.prayedPct ? b : a)) : null;
    if (best && weak && best !== weak) salahH = `${esc(best.name)} is your strongest. ${esc(weak.name)} has the most room to grow.`;
    salahB = `${sub(PROGRESS.lastFiveWeeks, PROGRESS.tapDay)}<div class="card"><div style="padding:12px 10px 0">${ringsCal(CW - 20, P)}</div>${ringKey(c.excusedDays)}</div>${cap(PROGRESS.ringCap + (c.excusedDays ? " " + L.noRings : ""))}
    ${sub(PROGRESS.howYouPrayed, PROGRESS.last30Lower)}<div class="card">${breakdown(CW - 32, c)}</div>${c.madeup ? cap(PROGRESS.madeUpCap(c.madeup)) : ""}
    ${sub(PROGRESS.eachPrayer, PROGRESS.last30Lower)}<div class="card"><div style="padding:10px 16px 0">${eachStack(CW - 32, ser)}</div>${capt ? `<p class="cap" style="padding:2px 16px 8px">${capt}</p>` : ""}${legend(["j", "o", "r", "m", "u"])}</div>`;
  } else {
    const ym = st.yearMonths(S, P.year, P.now);
    const l = 34, top = 24, ph = 110, h = top + ph + 26, bw = (CW - 32 - l) / 12, w = CW - 32;
    let s = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(L.fardByMonth)}">`;
    [0, 50, 100].forEach(t => { const y = top + ph - t / 100 * ph; s += `<line x1="${l}" x2="${w}" y1="${y}" y2="${y}" style="stroke:var(--line)"/><text x="${l - 6}" y="${y + 3.5}" text-anchor="end" font-size="10" class="t3">${t}%</text>`; });
    ym.forEach((v, k) => {
      const cx = l + bw * k + bw / 2, cur = P.year === NOW().getFullYear() && k === NOW().getMonth();
      if (v === null) s += `<line x1="${cx - 6}" x2="${cx + 6}" y1="${top + ph}" y2="${top + ph}" style="stroke:var(--hollow);stroke-width:2;stroke-linecap:round"/>`;
      else { const hh = v / 100 * ph, y = top + ph - hh; s += `<path d="M${cx - 8} ${top + ph} V${y + 4} q0 -4 4 -4 h8 q4 0 4 4 V${top + ph}z" style="fill:var(--sO);opacity:${cur ? .55 : 1}"/><text x="${cx}" y="${y - 6}" text-anchor="middle" font-size="11" font-weight="700" class="t1">${v}</text>`; }
      s += `<text x="${cx}" y="${h - 8}" text-anchor="middle" font-size="10" font-weight="${cur ? 800 : 600}" class="t2">${MON3[k][0]}</text>`;
    });
    s += "</svg>";
    // each prayer by month: heat table
    const lw = 64, cw2 = (w - lw) / 12, rh = 24;
    let t = `<svg width="${w}" height="${rh * 5 + 22}" viewBox="0 0 ${w} ${rh * 5 + 22}" role="img" aria-label="${esc(L.eachByMonth)}">`;
    MON3.forEach((mm, k) => t += `<text x="${lw + cw2 * k + cw2 / 2}" y="11" text-anchor="middle" font-size="9.5" font-weight="700" class="t2">${mm[0]}</text>`);
    const byM = MON3.map((_, k) => { const a = new Date(P.year, k, 1), b = new Date(P.year, k + 1, 0); return dkey(a) > todayKey() || dkey(b) < S.createdKey ? null : st.eachPrayerSeries(S, P.now, { from: a, to: dkey(b) > dkey(P.end) ? P.end : b }); });
    PRAYERS.forEach((p, r) => {
      const y = 22 + rh * r; t += `<text x="2" y="${y + 15}" font-size="12.5" font-weight="600" class="t1">${esc(pName(p))}</text>`;
      byM.forEach((row, k) => {
        const v = row?.[r]?.prayedPct; const x = lw + cw2 * k;
        if (v == null) { t += `<rect x="${x + 1}" y="${y + 2}" width="${cw2 - 2}" height="${rh - 4}" rx="4" style="fill:var(--track);opacity:.5"/>`; return; }
        const lv = v >= 98 ? 5 : v >= 90 ? 4 : v >= 75 ? 3 : v >= 50 ? 2 : 1;
        t += `<rect x="${x + 1}" y="${y + 2}" width="${cw2 - 2}" height="${rh - 4}" rx="4" style="fill:var(--seq${lv})"/>`;
      });
    });
    t += "</svg>";
    salahB = `${sub(L.fardByMonth, L.pctDue)}<div class="card"><div style="padding:14px 16px 4px">${s}</div></div>${sub(L.eachByMonth)}<div class="card"><div style="padding:14px 16px 12px">${t}</div></div>${cap(`${L.fewer} → ${L.more}`)}`;
  }
  out.push(chapter("salah", list, salahH, salahB));

  /* streaks */
  const sk = st.streaks(S, NOW());
  out.push(chapter("streaks", list, isW ? L.streakHead(sk.all.cur, sk.onTime.cur) : L.streakMonth(sk.all.cur, sk.all.best), streakPair(P, isW)));

  /* sunnah */
  if (sr) {
    let h, b;
    const showWitr = true;
    if (isW) {
      const y0 = addDays(NOW(), -1), ym = st.sunnahMeasureDay(S, dkey(y0)), tm = st.sunnahMeasureDay(S, todayKey());
      h = P.off === 0 ? L.sunnahYest(ym.got, ym.of, tm.got, tm.of) : `${PROGRESS.sunnahPrayers}: <b>${measureTxt(sr)}</b>`;
      b = `${sub(PROGRESS.sunnahPrayers, PROGRESS.apartFromFard)}<div class="card"><div style="padding:12px 14px 6px">${sunnahWeek(CW - 28, P, sr)}</div><div class="kicker" style="border-top:1px solid var(--line);padding-top:12px;padding-bottom:8px">${SUNNAH_UI.legend}</div>${tierLegend(sr)}</div>`;
    } else {
      h = L.sunnahPeriod(sr.pct ?? 0, sr.witr.due ? sr.witr.pct : null);
      b = `${sub(PROGRESS.sunnahPrayers, isM ? PROGRESS.last30Lower : String(P.year))}<div class="card"><div style="padding:14px 16px 6px">${sunnahBars(CW - 32, sr)}</div><p class="cap" style="padding:2px 16px 10px">${sr.excusedDays ? EXCUSED.progressNote(sr.excusedDays) : ""}</p>${tierLegend(sr)}</div>`;
    }
    out.push(chapter("sunnah", list, h, b));
  }

  /* jamaah */
  {
    let b, h;
    if (isW) { h = L.jamHead(c.congregation); b = jamTiles(P, c) + cap(PROGRESS.jamaahCap); }
    else {
      const jc = jamCols(CW - 32), share = c.prayed ? Math.round(c.prayed / Math.max(1, c.congregation)) : 0;
      h = c.congregation ? L.jamMonth(share) : L.jamHead(0);
      b = `${sub(PROGRESS.prayersInJamaah, PROGRESS.sharePerWeek)}<div class="card"><div style="padding:14px 16px 12px">${jc.svg}</div></div>${jamTiles(P, c)}`;
    }
    out.push(chapter("jamaah", list, h, b));
  }

  /* habits */
  if (isOn(S, "deeds")) {
    const strips = amalStrips(CW, P, isW);
    const rates = st.amalRates(S, isW ? 7 : isM ? 30 : 90, P.now).filter(r => r.a.id !== "salawat" && r.a.id !== "sadaqah");
    const hi = rates.length ? rates.reduce((a, b) => (b.rate > a.rate ? b : a)) : null, lo = rates.length > 1 ? rates.reduce((a, b) => (b.rate < a.rate ? b : a)) : null;
    const h = hi ? L.habitsHead(esc(hi.a.name), lo && lo !== hi ? esc(lo.a.name) : "") : L.habitsNone;
    out.push(chapter("habits", list, h, `${sub(DEEDS.daily, isW ? PROGRESS.thisWeekLower : isM ? PROGRESS.last30Lower : String(P.year))}<div class="card">${isY ? yearHabits(rates) : `<div style="height:${isW ? 0 : 6}px"></div>${strips.html}`}</div>${cap(DEEDS.noTarget)}`));
  }

  /* make-ups */
  if (isOn(S, "makeups")) {
    const total = st.qadaClearedTotal(S), n = isY ? st.qadaClearedInYear(S, P.year) : st.qadaClearedInMonth(S, P.end), sp = store.qadaSplit(S);
    const h = isY ? L.makeupYear(n) : L.makeupHead(n);
    out.push(chapter("qada", list, h, `<div style="height:6px"></div><button class="card pad" style="display:flex;align-items:center;gap:12px;width:100%;text-align:left" onclick="A.pgQada()"><div style="flex:1"><b style="font-size:22px;color:var(--head)">${total}</b><small style="display:block;font-size:12px;color:var(--ink2);font-weight:600;margin-top:2px">${esc(MAKEUPS.restored(total).replace(/^\d+ /, ""))} · ${esc(MAKEUPS.toGo(sp.fard, sp.witr))}</small></div><span style="color:var(--accent)">${ICON.chevR}</span></button>`));
  }

  /* reflections */
  out.push(chapter("reflect", list, L.reflectHead, reflections(per), true));
  return `<div class="intro">${intro}</div>${out.join("")}`;
}
function yearHabits(rates) {
  return rates.map(r => `<div class="arow"><div class="nm">${esc(r.a.name)}</div><svg width="${W - 40 - 32 - 112 - 56}" height="10"><rect x="0" y="1" width="100%" height="8" rx="4" style="fill:var(--track)"/><rect x="0" y="1" width="${r.rate}%" height="8" rx="4" style="fill:var(--sO)"/></svg><div class="v">${r.rate}<span>%</span></div></div>`).join("");
}

/* ---------- render ---------- */
function renderProgress() {
  if (UI.view !== "progress") return;
  const sec = $("#v-progress"); if (!sec) return;
  if (!["week", "month", "year"].includes(UI.range)) UI.range = "week";
  W = Math.max(320, Math.min(520, $("#screen")?.clientWidth || 390));
  const P = period(), list = chapters();
  if (!list.includes(V.chapter)) V.chapter = "salah";
  const h = head(P, list);
  const key = ""; const html = cls(`${h.top}${h.jump}<div class="pgbody">${body(P, list)}</div>`) + `<!--${todayKey()}-->`;
  const norm = html.replace(/class="pg-on" data-ch/g, 'class="" data-ch');
  if (norm === lastHTML && sec.childElementCount) return;
  lastHTML = norm;
  const jt = sec.querySelector(".pg-jt"), sl = jt ? jt.scrollLeft : 0;
  sec.innerHTML = html;
  const jt2 = sec.querySelector(".pg-jt"); if (jt2) jt2.scrollLeft = sl;
  markChapter();
}
function markChapter() {
  const scr = $("#screen"), sec = $("#v-progress"); if (!scr || !sec || UI.view !== "progress") return;
  const chs = [...sec.querySelectorAll("section[data-ch]")], jump = sec.querySelector(".pg-jump");
  if (!chs.length) return;
  const line = scr.getBoundingClientRect().top + (jump?.offsetHeight || 44) + (parseFloat(jump && getComputedStyle(jump).top) || 0) + 40;
  let cur = chs[0].dataset.ch;
  for (const c of chs) if (c.getBoundingClientRect().top <= line) cur = c.dataset.ch;
  if (scr.scrollTop + scr.clientHeight >= scr.scrollHeight - 4) cur = chs[chs.length - 1].dataset.ch;
  if (cur === V.chapter && sec.querySelector(".pg-jump a.pg-on")?.dataset.ch === cur) return;
  V.chapter = cur;
  sec.querySelectorAll(".pg-jump a").forEach(a => { const on = a.dataset.ch === cur; a.classList.toggle("pg-on", on); if (on) { const jt = a.parentElement; if (jt) jt.scrollTo?.({ left: a.offsetLeft - 20, behavior: "smooth" }); } });
}
$("#screen")?.addEventListener("scroll", () => { if (UI.view === "progress") markChapter(); }, { passive: true });
onRender(renderProgress);
