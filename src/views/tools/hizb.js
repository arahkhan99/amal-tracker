/* Al-Hizb al-Aʿzam: weekly overview (HZ1) and the continuous reader (HR1). Saturday = manzil 1. */
import { A, S, $, NOW, esc, I, T, open, redraw, part, persist, prune, prefs, toast, openSheet, head, info, COMMON, APP, arNum, dayName, minutesFor, wordCount, weekKey, dkey } from "./core.js";
import { manzilFor, weekDates, weekRangeLabel, HIZB_WEEK_START } from "../../times.js";
import { commit } from "../../app.js";
import { TT } from "./strings-tools.js";
import { toolTip } from "./tips.js";
import { getTranslation } from "../../tools/quran-data.js";

/* ---------- data (loaded on demand: it is large) ---------- */
let DATA = null, loading = null;
export function loadHizb() {
  loading ||= import("../../tools/data/hizb.js").then(m => { DATA = m.HIZB; if (T.screen === "hizb" || T.screen === "hizbRead") redraw(); return DATA; });
  return loading;
}
export const hizbReady = () => !!DATA;
const duas = m => DATA?.[m - 1]?.duas || [];
const words = m => duas(m).reduce((a, d) => a + wordCount(d.ar), 0);
const mins = m => (DATA ? minutesFor(words(m), 85) : 0);

/* ---------- saved progress: S.tools.hizb = { weeks: { weekKey: { read: {m: ms}, pos: {m, i} , khatm } }, khatms } ---------- */
const root = () => part("hizb", { weeks: {}, khatms: 0 });
const weekState = (date = NOW(), make = false) => {
  const h = make ? root() : (S.tools?.hizb || { weeks: {} });
  const wk = weekKey(date, HIZB_WEEK_START);
  if (make) return (h.weeks[wk] ||= { read: {} });
  return h.weeks[wk] || { read: {} };
};
export const manzilToday = (now = NOW()) => manzilFor(now);
export const manzilRead = (m, now = NOW()) => !!weekState(now).read[m];
export const readCountWeek = (now = NOW()) => Object.keys(weekState(now).read).length;
export const khatms = () => S.tools?.hizb?.khatms || 0;
export const resumePos = (m, now = NOW()) => { const p = weekState(now).pos; return p && p.m === m && p.i > 0 ? p : null; };
const DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DAY3 = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

/* ---------- overview ---------- */
export function hizbView() {
  if (!DATA) { loadHizb(); return `${head({ title: "Hizb al-Aʿzam", ar: TT.arName.hizb, sub: TT.hizbSub })}<p class="tl-note pad">…</p>`; }
  const now = NOW(), m = manzilToday(now), dates = weekDates(now, 0, HIZB_WEEK_START), ws = weekState(now);
  const nRead = readCountWeek(now);
  const tmw = m < 7 ? TT.tomorrowLine(DAYS[m - 1], m + 1, mins(m + 1)) : TT.lastLine(DAYS[m - 1], mins(m));
  const days = dates.map((d, i) => {
    const k = i + 1, read = !!ws.read[k], today = k === m, past = k < m;
    const cls = read ? "d" : today ? "t" : past ? "x" : "f";
    return `<button type="button" class="tl-wd ${today ? "today" : ""}" onclick="A.tlHizbOpen(${k})" aria-label="${DAYS[i]}, ${TT.manzil(k)}${read ? ", read" : today ? ", today" : ""}">
      <small>${DAY3[i]}</small><i class="${cls}">${read ? I.check : k}</i><small>${today ? COMMON.today : d.getDate()}</small></button>`;
  }).join("");
  const pos = resumePos(m, now);
  const resume = pos && !ws.read[m] ? `<div class="tl-card tl-resume"><span class="tl-rb">${I.bookmark}</span><div class="tl-rt"><b>${TT.resume(m)}</b><span>${TT.resumeDua(pos.i + 1, duas(m).length)}</span>
      <div class="tl-bar g"><i style="width:${Math.round(100 * pos.i / Math.max(1, duas(m).length))}%"></i></div></div><button class="tl-cta sm" onclick="A.tlHizbOpen(${m})">${I.play} ${TT.resumeBtn}</button></div>` : "";
  const missed = [...Array(m - 1).keys()].map(i => i + 1).find(k => !ws.read[k]);
  const missCard = missed && !ws.read[m] ? `<div class="tl-card tl-miss"><b>${TT.missedTitle(DAYS[missed - 1])}</b><p>${TT.missedBody}</p>
      <div class="tl-two"><button class="tl-cta ghost" onclick="A.tlHizbOpen(${missed})">${TT.readMissed(missed)}</button><button class="tl-cta" onclick="A.tlHizbOpen(${m})">${TT.readToday(m)}</button></div></div>` : "";
  const rows = [1, 2, 3, 4, 5, 6, 7].map(k => {
    const read = !!ws.read[k], today = k === m, past = k < m;
    const sub = read ? TT.rowDone(DAYS[k - 1]) : today ? TT.rowToday(DAYS[k - 1]) : past ? TT.rowOpen(DAYS[k - 1]) : TT.rowUpcoming(DAYS[k - 1]);
    return `<button type="button" class="tl-mrow${today ? " now" : ""}${read ? " done" : ""}" onclick="A.tlHizbOpen(${k})"><span class="tl-star lg">${read ? I.check : arNum(k)}</span>
      <span class="tl-mt"><b>${TT.manzil(k)}</b><small>${esc(sub)}</small></span><span class="tl-mm">${TT.mins(mins(k))}</span></button>`;
  }).join("");
  return `${head({ title: "Hizb al-Aʿzam", ar: TT.arName.hizb, sub: TT.hizbSub })}
    <div class="tl-hero tl-week"><svg class="pattern" viewBox="0 0 390 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="100%" height="100%" fill="url(#st)"/></svg>
      <div class="tl-wk1"><span>${esc(TT.weekHd(weekRangeLabel(now, 0, HIZB_WEEK_START)))}</span><em>${TT.satStart}</em></div>
      <h2>${TT.todayManzil(m)}</h2><p>${esc(tmw)}</p>
      <div class="tl-wdays">${days}</div>
      <div class="tl-wfoot"><span><b>${nRead} of 7</b> manzils read this week</span><span>${TT.khatmOnDone}</span></div></div>
    ${resume}${missCard}
    <div class="tl-sech"><h2>${TT.thisWeek} ${info("manzil")}</h2><span>${TT.tapToRead}</span></div>
    <div class="tl-card tl-mlist">${rows}</div>
    <p class="tl-cap">${TT.manzilNote}</p>
    <div class="tl-card tl-khatm"><span class="tl-ktick">${I.check}</span><div><b>${TT.khatms}</b><small>${TT.khatmsSub}</small></div><span class="tl-kn">${khatms()}</span></div>
    <div class="space"></div>`;
}

/* ---------- reader ---------- */
const clean = s => s.replace(/\*/g, "");
const refShort = r => (r || "").split(/\s*[(;]/)[0].replace(/\.$/, "").trim();
const PLACEHOLDER = "Qurʾān translation from Pickthall";
function lenientQ(d) {
  if (d.q) return d.q;
  const m = (d.ref || "").match(/(\d{1,3}):(\d{1,3})(?:[–-](\d{1,3}))?/);
  return m ? { s: +m[1], from: +m[2], to: +(m[3] || m[2]), whole: true } : null;
}
let readerListener = null;

export function hizbReadView() {
  const m = T.manzil || manzilToday();
  if (!DATA) { loadHizb(); return `${head({ title: TT.manzil(m), sub: "…" })}<p class="tl-note pad">…</p>`; }
  const list = duas(m), pr = prefs(), ws = weekState();
  const pos = resumePos(m);
  const startI = T.resumed ? 0 : pos ? pos.i : 0;
  const body = list.map((d, i) => {
    const ar = clean(d.ar).split("\n").map(p => `<p class="tl-ar hz" lang="ar" dir="rtl">${esc(p)}</p>`).join("");
    const ref = d.ref ? refShort(d.ref) : "";
    const en = d.en.replace(PLACEHOLDER, "").replace(/^[\s.:]+|\s*[—-]\s*$/g, "").replace(/\s*For the verses, use the\s*\.?\s*$/i, "").trim();
    const needsQ = d.en.includes(PLACEHOLDER) && lenientQ(d);
    return `<section class="tl-hz" data-i="${i}" id="hz${i}"><div class="tl-hzn"><span class="tl-star">${arNum(d.n)}</span>${ref ? `<span class="tl-hzref">${esc(ref)}</span>` : ""}</div>${ar}
      ${pr.translit ? `<p class="tl-tr">${esc(clean(d.tr))}</p>` : ""}
      ${pr.translation ? `<p class="tl-en">${esc(clean(en))}</p>${needsQ ? `<p class="tl-en tl-pick" data-q="${lenientQ(d).s}:${lenientQ(d).from}:${lenientQ(d).to}"></p>` : ""}` : ""}
      ${(pr.translit || pr.translation) && d.source ? `<p class="tl-src">${esc(clean(d.source))}</p>` : ""}</section>`;
  }).join("");
  const done = !!ws.read[m];
  const total = list.length, left = Math.max(1, Math.round(mins(m) * (1 - startI / total)));
  const day = DAYS[m - 1];
  const showPick = !T.resumed && pos && pos.i > 0;
  return `<div class="tl-rhead"><div class="tl-ph tight"><button type="button" class="tl-back" aria-label="${COMMON.back}" onclick="A.tlBack()">${I.back}</button>
      <div class="tl-pt"><h1>${TT.manzil(m)}</h1><p id="hzSub">${esc(TT.readerSub(day, startI + 1, total, left))}</p></div>
      <button type="button" class="tl-hbtn lite aa" aria-label="${TT.aa}" onclick="A.tlAa('hizb')">Aa</button></div>
      <div class="tl-bar g tl-thin"><i id="hzBar" style="width:${Math.round(100 * (startI + 1) / total)}%"></i></div></div>
    ${showPick ? `<div class="tl-pick-b" id="hzPicked"><span>${I.bookmark}<b>${TT.pickedUp}</b></span><button type="button" onclick="A.tlHizbStart()">${TT.startOfManzil}</button></div>` : ""}
    <div class="tl-hzwrap">${toolTip("hizb", "hz")}${body}</div>
    <div class="tl-dock hz"><div><b id="hzCount">${TT.duaOf(startI + 1, total)}</b><span>${TT.savedScroll}</span></div>
      <button class="tl-cta" onclick="A.tlHizbFinish(${m})">${I.check} ${done ? TT.manzilDone(m) : m === manzilToday() ? TT.finishManzil : TT.finishOther(m)}</button></div>`;
}

export function hizbReadAfter() {
  const m = T.manzil || manzilToday();
  if (!DATA) return;
  const scroller = $("#screen"), list = duas(m), total = list.length;
  const pos = resumePos(m);
  if (!T.resumed && pos && pos.i > 0) {
    const el = $("#hz" + pos.i);
    if (el) scroller.scrollTop = el.offsetTop - 120;
  }
  // Pickthall for duas that are Qurʾān passages (only when the translation is on)
  document.querySelectorAll("#v-tools .tl-pick").forEach(async el => {
    const [s, f, t] = el.dataset.q.split(":").map(Number);
    try {
      const out = [];
      for (let a = f; a <= t; a++) out.push(await getTranslation("pickthall", s, a));
      el.textContent = out.filter(Boolean).join(" ");
      el.insertAdjacentHTML("beforeend", ` <span class="tl-src">${TT.pickthallHere}${(el.closest(".tl-hz") && lenientQ(list[+el.closest(".tl-hz").dataset.i]).whole) ? " · " + TT.wholeAyah : ""}</span>`);
    } catch { el.remove(); }
  });
  let raf = 0;
  readerListener = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const top = scroller.scrollTop + 150;
      const secs = [...document.querySelectorAll("#v-tools .tl-hz")];
      let i = 0;
      for (let k = 0; k < secs.length; k++) { if (secs[k].offsetTop <= top) i = k; else break; }
      const ws = weekState(NOW(), true);
      if (!ws.read[m]) ws.pos = { m, i };
      persist();
      const c = $("#hzCount"); if (c) c.textContent = TT.duaOf(i + 1, total);
      const b = $("#hzBar"); if (b) b.style.width = Math.round(100 * (i + 1) / total) + "%";
      const sub = $("#hzSub"); if (sub) sub.textContent = TT.readerSub(DAYS[m - 1], i + 1, total, Math.max(1, Math.round(mins(m) * (1 - i / total))));
    });
  };
  scroller.addEventListener("scroll", readerListener, { passive: true });
}
export function hizbReadLeave() {
  if (readerListener) { $("#screen")?.removeEventListener("scroll", readerListener); readerListener = null; }
}

/* ---------- actions ---------- */
A.tlHizbOpen = m => { T.resumed = false; open("hizbRead", { manzil: m }); };
A.tlHizbStart = () => {
  const ws = weekState(NOW(), true); delete ws.pos; persist();
  T.resumed = true;
  $("#hzPicked")?.remove();
  $("#screen").scrollTop = 0;
};
A.tlHizbFinish = m => {
  const ws = weekState(NOW(), true);
  const was = !!ws.read[m];
  if (!was) ws.read[m] = Date.now();
  delete ws.pos;
  let khatm = false;
  if (Object.keys(ws.read).length >= 7 && !ws.khatm) { ws.khatm = Date.now(); root().khatms = (root().khatms || 0) + 1; khatm = true; }
  prune(root().weeks, 30);
  commit();
  T.resumed = false;
  open("hizb");
  if (khatm) {
    openSheet(`<h3>${TT.khatmTitle}</h3><p>${TT.khatmBody(root().khatms)}</p><p class="note">${TT.khatmDua}</p><div class="cta"><button class="btn primary" onclick="A.closeSheet()">${COMMON.done}</button></div>`);
  } else if (!was) toast(TT.manzilDone(m));
};
