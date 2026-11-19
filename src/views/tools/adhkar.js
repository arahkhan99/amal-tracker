/* Morning and evening adhkār reader (AR1: list with tap counters). */
import { A, S, $, NOW, todayKey, esc, I, T, open, redraw, part, persist, prune, prefs, tickAmal, untickAmal, amalIs, toast, openSheet, headWords, markSwaps, info, store, COMMON, APP, topIn } from "./core.js";
import { ADHKAR, VIRTUES_APPROVED, partText } from "../../tools/data/adhkar.js";
import { timesFor } from "../../times.js";
import { fmt12 } from "../../util.js";
import { commit } from "../../app.js";
import { TT } from "./strings-tools.js";
import { toolTip } from "./tips.js";
import { quranBlock, quranFont, refLabel } from "./qtext.js";
import { doneBar } from "./donebar.js";

/* ---------- which set is open ---------- */
export function autoSet(now = NOW()) {
  const t = timesFor(now, S.settings);
  return now >= t.Fajr && now < t.Asr ? "morning" : "evening";
}
export const eveningOpen = (now = NOW()) => now >= timesFor(now, S.settings).Asr;

/* ---------- saved counts: S.tools.adhkar[day][set] = { c: { n: [count per unit] }, done: ms } ---------- */
const units = it => (it.count != null ? [it.count] : it.parts.map(p => p.count || 1));
const store_ = (set, key = todayKey()) => { const a = part("adhkar", {}); a[key] ||= {}; return (a[key][set] ||= { c: {} }); };
export function setState(set, key = todayKey()) { const a = S.tools?.adhkar?.[key]?.[set]; return a || { c: {} }; }
const countsOf = (st, it) => { const need = units(it); const c = st.c[it.n] || []; return need.map((_, i) => Math.min(c[i] || 0, need[i])); };
const itemDone = (st, it) => countsOf(st, it).every((c, i) => c >= units(it)[i]);
export function progress(set, key = todayKey()) {
  const st = setState(set, key);
  let said = 0, total = 0, done = 0;
  for (const it of ADHKAR) {
    const need = units(it), c = countsOf(st, it);
    total += need.reduce((a, b) => a + b, 0); said += c.reduce((a, b) => a + b, 0);
    if (itemDone(st, it)) done++;
  }
  return { said, total, done, n: ADHKAR.length, complete: done === ADHKAR.length };
}
export const amalId = set => (set === "morning" ? "morning" : "evening");

/* ---------- Qurʾān parts, filled from the Quran data ---------- */
const qcache = new Map(); // key -> block | "fail"
const qKey = (it, p, i) => `${it.n}.${i}`;
function qSpecs(it, p) {
  const list = Array.isArray(p.quran) ? p.quran : [p.quran];
  return list.map(q => ({ surah: q.surah, from: q.from, to: q.to, partial: !!q.partial, startsWith: null }));
}
async function loadQuran(it, p, i) {
  const k = qKey(it, p, i);
  if (qcache.has(k)) return;
  qcache.set(k, "loading");
  try {
    // For a partial āyah the card's own words tell us where it starts: its first Qurʾānic word
    const specs = qSpecs(it, p);
    const blocks = [];
    for (const sp of specs) {
      if (sp.partial) sp.startsWith = partialStart(it, p, sp);
      const b = await quranBlock(sp);
      if (!b) throw new Error("missing");
      blocks.push({ ...b, partial: sp.partial });
    }
    qcache.set(k, blocks);
  } catch (e) { console.warn("adhkar quran", k, e); qcache.set(k, "fail"); }
}
// #17: the card writes the part of 9:129 it gives; its start is found among the first words of the card's quran part
function partialStart(it, p) { return (p.ar || "").trim().split(/\s+/)[0]; }

function qHtml(it, p, i) {
  const b = qcache.get(qKey(it, p, i));
  if (!b || b === "loading") return `<p class="tl-q-note">${TT.qLoading}</p>`;
  if (b === "fail") return `<p class="tl-q-note err">${TT.qMissing}</p>`;
  const pr = prefs();
  return b.map(x => `<div class="tl-qb"><p class="tl-q" lang="ar" dir="rtl">${esc(x.ar)}</p>
    <p class="tl-ref">${esc(refLabel(x))}${x.partial ? ` · ${TT.qPartial}` : ""}</p>
    ${pr.translation ? `<p class="tl-en">${x.en.map(e => esc(e.text)).join(" ")}<span class="tl-src"> ${TT.pickthallFrom}</span></p>` : ""}</div>`).join("");
}

/* ---------- cards ---------- */
function partHtml(it, p, i, set) {
  const pr = prefs();
  const label = p.labelAr ? `<div class="tl-plab" lang="ar" dir="rtl">${esc(p.labelAr)}</div>` : "";
  const cnt = it.count == null && p.count ? `<span class="tl-pc">${TT.partCount(p.count)}</span>` : "";
  const nm = it.parts.length > 1 && p.name ? `<div class="tl-pn">${esc(p.name)} ${cnt}</div>` : "";
  if (p.kind === "quran") return `${label}${nm}${qHtml(it, p, i)}`;
  const t = partText(p, set);
  const ar = set === "evening" && p.arEvening && pr.evWords ? markSwaps(t.ar, p.ar) : esc(t.ar);
  return `${label}${nm}<p class="tl-ar" lang="ar" dir="rtl">${ar}</p>
    ${pr.translit && t.transliteration ? `<p class="tl-tr">${esc(t.transliteration)}</p>` : ""}
    ${pr.translation && t.translation ? `<p class="tl-en">${esc(t.translation)}</p>` : ""}
    ${p.note && (pr.translit || pr.translation) ? `<p class="tl-note">${esc(p.note)}</p>` : ""}`;
}
function foldLabel(it, set) {
  const p = it.parts[0];
  if (p.kind === "quran" || !p.ar) return it.labelAr || it.parts.find(x => x.labelAr)?.labelAr || it.title;
  return headWords(partText(p, set).ar, 4);
}
function counterHtml(it, st) {
  const need = units(it), c = countsOf(st, it), done = itemDone(st, it);
  const multi = need.length > 1;
  const ring = `<i class="tl-ring" style="--p:${Math.round(100 * c.reduce((a, b) => a + b, 0) / need.reduce((a, b) => a + b, 0))}"></i>`;
  const txt = multi ? c.map((x, i) => `${x}/${need[i]}`).join(" · ") : `${c[0]} / ${need[0]}`;
  const pips = !multi && need[0] > 1 && need[0] <= 10 ? `<span class="tl-pips">${Array.from({ length: need[0] }, (_, i) => `<i class="${i < c[0] ? "on" : ""}"></i>`).join("")}</span>` : multi ? "" : "<span></span>";
  return `<div class="tl-adf">${pips}<span class="tl-cnt ${done ? "ok" : ""}">${ring}<b>${txt}</b></span></div>`;
}

function cardHtml(it, st, set, isNow, expanded) {
  const done = itemDone(st, it);
  const virtue = VIRTUES_APPROVED ? `<button type="button" class="tl-virtue" onclick="event.stopPropagation();A.tlVirtue(${it.n})">${TT.virtue}</button>` : "";
  const pr = prefs();
  const need = units(it).reduce((a, b) => a + b, 0);
  const head = `<div class="tl-adh"><span class="tl-no">${it.n}</span><span class="tl-tm">${it.count != null ? TT.times(it.count) : ""}</span>${isNow ? `<span class="tl-hint">${I.hand} ${TT.tapCard}</span>` : ""}${virtue}</div>`;
  const title = (pr.translit || pr.translation) ? `<div class="tl-ttl">${esc(it.title)}</div>` : "";
  return `<div class="tl-ad${isNow ? " now" : ""}${done ? " done" : ""}" role="button" tabindex="0" data-n="${it.n}" aria-label="${esc(it.title)}, ${need} ${need === 1 ? "time" : "times"}" onclick="A.tlTap(${it.n})">
    ${head}${title}${it.parts.map((p, i) => partHtml(it, p, i, set)).join("")}${counterHtml(it, st)}</div>`;
}
const foldHtml = (it, st, set) => `<button type="button" class="tl-fold" onclick="A.tlOpenCard(${it.n})" aria-label="${esc(it.title)} done, tap to open"><span class="tl-fc">${I.check}</span><span class="tl-ft" lang="ar" dir="rtl">${esc(foldLabel(it, set))}</span><span class="tl-fn">${countsOf(st, it).reduce((a, b) => a + b, 0)}/${units(it).reduce((a, b) => a + b, 0)}</span></button>`;

/* ---------- screen ---------- */
const expanded = new Set();
let pending = [];

export function adhkarView() {
  const now = NOW();
  const set = T.set || autoSet(now);
  const pr = prefs();
  const st = setState(set);
  const pg = progress(set);
  const t = timesFor(now, S.settings);
  const isAuto = !T.set || T.set === autoSet(now);
  const auto = set === "morning" ? TT.autoMorning(fmt12(t.Fajr), fmt12(t.Asr)) : TT.autoEvening(fmt12(t.Asr));
  const nowItem = ADHKAR.find(it => !itemDone(st, it));
  const first = ADHKAR.findIndex(it => it === nowItem);
  const title = set === "morning" ? TT.morningTitle : TT.eveningTitle;
  const needQ = [];
  const cards = ADHKAR.map(it => {
    if (it.parts.some(p => p.kind === "quran")) it.parts.forEach((p, i) => { if (p.kind === "quran" && !qcache.has(qKey(it, p, i))) needQ.push([it, p, i]); });
    if (itemDone(st, it) && !expanded.has(it.n)) return foldHtml(it, st, set);
    return cardHtml(it, st, set, it === nowItem, itemDone(st, it));
  }).join("");
  pending = needQ;
  const bar = doneBar(set, { next: pg.complete ? "" : "A.readNextCard('.tl-ad,.tl-fold')" });
  const doneCard = pg.complete ? `<div class="tl-donec"><div class="tl-dtick">${I.check}</div><div><b>${TT.doneCard(title)}</b><span>${TT.doneMeta(pg.n, pg.total)}</span></div></div>
    ${bar ? "" : `<div class="tl-dnote">${amalIs(amalId(set)) ? `<span>${TT.ticked(title)}</span><button type="button" onclick="A.tlUntick('${set}')">${COMMON.undo}</button>` : `<span>${TT.eveningOpensAt(fmt12(t.Asr))}</span>`}</div>`}` : "";
  const evHint = set === "morning" && !pg.complete ? "" : "";
  return `<div class="tl-hero tl-rd">
      
      <div class="tl-hrow"><button type="button" class="tl-hbtn" aria-label="${COMMON.back}" onclick="A.tlBack()">${I.back}</button>
        <div class="tl-ht"><h1>${esc(title)}</h1></div>
        <button type="button" class="tl-hbtn aa" aria-label="${TT.aa}" onclick="A.tlAa('adhkar')">Aa</button></div>
      <div class="tl-segw" role="tablist"><button role="tab" aria-selected="${set === "morning"}" class="${set === "morning" ? "on" : ""}" onclick="A.tlSet('morning')">${I.sun} ${TT.morning}</button><button role="tab" aria-selected="${set === "evening"}" class="${set === "evening" ? "on" : ""}" onclick="A.tlSet('evening')">${I.moon} ${TT.evening}</button></div>
      <div class="tl-auto"><span class="tl-autob">${isAuto ? TT.auto : "•"}</span> ${isAuto ? esc(auto) : esc(auto)}</div>
      <div class="tl-prog"><div class="tl-bar"><i style="width:${Math.round(100 * pg.said / pg.total)}%"></i></div><span><b>${pg.complete ? pg.n : first + 1} of ${pg.n}</b> · ${pg.said}/${pg.total} said</span></div>
    </div>
    <div class="tl-list">${toolTip("adhkar")}${doneCard}${cards}</div>${bar ? `<div class="rd-gap"></div>${bar}` : `<div class="space"></div>`}`;
}

export function adhkarAfter() {
  const need = pending; pending = [];
  if (!need.length) return;
  quranFont().then(() => { if (T.screen === "adhkar") document.querySelector("#v-tools")?.classList.add("tl-fontok"); });
  Promise.all(need.map(([it, p, i]) => loadQuran(it, p, i))).then(() => { if (T.screen === "adhkar") redraw(); });
}

/* ---------- actions ---------- */
function vibrate(ms) { try { navigator.vibrate?.(ms); } catch { /* not available */ } }

A.tlSet = set => { T.set = set; redraw(); };
A.tlOpenCard = n => { expanded.add(n); redraw(); };
A.tlTap = n => {
  const it = ADHKAR.find(x => x.n === n); if (!it) return;
  const set = T.set || autoSet(NOW());
  const st = store_(set);
  const need = units(it);
  const c = (st.c[n] ||= need.map(() => 0));
  const i = c.findIndex((x, k) => x < need[k]);
  if (i < 0) return; // already complete
  c[i]++;
  const doneNow = c.every((x, k) => x >= need[k]);
  const wasComplete = !!st.done;
  vibrate(doneNow ? 25 : 10);
  const pg = progress(set);
  if (pg.complete && !wasComplete) {
    st.done = Date.now();
    store.noteToolSet(S, `adhkar/${todayKey()}/${set}/done`);
    tickAmal(amalId(set));
    prune(S.tools.adhkar);
    commit(); // ticks the good deed and redraws
    toast(TT.ticked(set === "morning" ? TT.morningTitle : TT.eveningTitle), { undo: () => A.tlUntick(set) });
    return;
  }
  persist();
  const y = $("#screen").scrollTop;
  redraw();
  if (doneNow) {
    const next = document.querySelector("#v-tools .tl-ad.now");
    if (next) $("#screen").scrollTop = Math.max(0, topIn(next, $("#screen")) - 70); else $("#screen").scrollTop = y;
  }
};
A.tlUntick = set => {
  untickAmal(amalId(set));
  store.clearToolStamp(S, `adhkar/${todayKey()}/${set}/done`); // with a note, so a sync can't tick it again
  commit(); // keeps the counts, only the tick is removed
  toast(TT.undone);
};

A.tlVirtue = n => {
  if (!VIRTUES_APPROVED) return;
  const it = ADHKAR.find(x => x.n === n);
  openSheet(`<h3>${TT.virtueHead}</h3><p class="tl-vu" lang="ur" dir="rtl">${esc(it.virtueUr)}</p><p>${esc(it.virtueEn)}</p><div class="cta"><button class="btn primary" onclick="A.closeSheet()">${COMMON.done}</button></div>`);
};

export { info };
