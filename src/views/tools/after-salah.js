/* Adhkār after Salāh: the poster's list with tap counters, a 33·33·33·1 tasbīh counter, Āyat al-Kursī and the Quls
   (3× after Fajr and Maghrib, 1× otherwise). Qurʾānic parts come from the Quran data (IndoPak + Pickthall). */
import { A, S, $, NOW, esc, I, T, open, redraw, part, persist, prune, prefs, toast, headWords, COMMON, APP, dkey, addDays, topIn, store } from "./core.js";
import { AFTER_SALAH, AFTER_SALAH_META, PRAYERS5, unitsFor, qulsCount } from "../../tools/data/after-salah.js";
import { timesFor } from "../../times.js";
import { fmt12 } from "../../util.js";
import { PRAYER_NAME } from "../../strings.js";
import { TT } from "./strings-tools.js";
import { quranBlock, quranFont, refLabel } from "./qtext.js";

/* ---------- which prayer just passed ---------- */
/** { prayer, key, at }: the latest fard whose time has begun. Before Fajr it is last night's ʿIshāʾ (dated yesterday). */
export function lastPrayer(now = NOW()) {
  const t = timesFor(now, S.settings);
  if (now < t.Fajr) { const y = addDays(now, -1); return { prayer: "Isha", key: dkey(y), at: timesFor(y, S.settings).Isha }; }
  for (let i = PRAYERS5.length - 1; i >= 0; i--) if (now >= t[PRAYERS5[i]]) return { prayer: PRAYERS5[i], key: dkey(now), at: t[PRAYERS5[i]] };
  return { prayer: "Fajr", key: dkey(now), at: t.Fajr };
}
const pname = p => PRAYER_NAME[p] || p;
/** The slot the reader shows: the one picked (T.asPrayer/T.asKey) or the one that just passed. */
export function slot(now = NOW()) {
  const auto = lastPrayer(now);
  if (T.asPrayer && PRAYERS5.includes(T.asPrayer)) return { prayer: T.asPrayer, key: T.asKey || auto.key, auto: T.asPrayer === auto.prayer && (T.asKey || auto.key) === auto.key };
  return { ...auto, auto: true };
}

/* ---------- saved counts: S.tools.afterSalah[day][prayer] = { c: { n: [count per part] }, done: ms } ---------- */
export function asState(prayer, key) { return S.tools?.afterSalah?.[key]?.[prayer] || { c: {} }; }
const store_ = (prayer, key) => { const a = part("afterSalah", {}); a[key] ||= {}; return (a[key][prayer] ||= { c: {} }); };
const countsOf = (st, it, p) => { const need = unitsFor(it, p); const c = st.c[it.n] || []; return need.map((_, i) => Math.min(c[i] || 0, need[i])); };
const itemDone = (st, it, p) => countsOf(st, it, p).every((c, i) => c >= unitsFor(it, p)[i]);
export function asProgress(prayer, key) {
  const st = asState(prayer, key);
  let said = 0, total = 0, done = 0;
  for (const it of AFTER_SALAH) {
    const need = unitsFor(it, prayer), c = countsOf(st, it, prayer);
    total += need.reduce((a, b) => a + b, 0); said += c.reduce((a, b) => a + b, 0);
    if (itemDone(st, it, prayer)) done++;
  }
  return { said, total, done, n: AFTER_SALAH.length, complete: done === AFTER_SALAH.length };
}

/* ---------- Qurʾān parts ---------- */
const qcache = new Map();
async function loadQuran(it, p, i) {
  const k = `${it.n}.${i}`;
  if (qcache.has(k)) return;
  qcache.set(k, "loading");
  try { const b = await quranBlock(p.quran); if (!b) throw new Error("missing"); qcache.set(k, b); }
  catch (e) { console.warn("after-salah quran", k, e); qcache.set(k, "fail"); }
}
function qHtml(it, i) {
  const b = qcache.get(`${it.n}.${i}`);
  if (!b || b === "loading") return `<p class="tl-q-note">${TT.qLoading}</p>`;
  if (b === "fail") return `<p class="tl-q-note err">${TT.qMissing}</p>`;
  return `<div class="tl-qb"><p class="tl-q" lang="ar" dir="rtl">${esc(b.ar)}</p><p class="tl-ref">${esc(refLabel(b))}</p>
    ${prefs().translation ? `<p class="tl-en">${b.en.map(e => esc(e.text)).join(" ")}<span class="tl-src"> ${TT.pickthallFrom}</span></p>` : ""}</div>`;
}

/* ---------- cards ---------- */
function partHtml(it, p, i, prayer, st) {
  const pr = prefs();
  const label = p.labelAr ? `<div class="tl-plab" lang="ar" dir="rtl">${esc(p.labelAr)}</div>` : "";
  if (it.quls) {
    const need = unitsFor(it, prayer)[i], c = countsOf(st, it, prayer)[i];
    return `<div class="tl-pn">${esc(p.name)} <span class="tl-pc">${TT.partCount(need)}</span>${c >= need ? ` <span class="tl-pok">${I.check}</span>` : ""}</div>${qHtml(it, i)}`;
  }
  if (p.kind === "quran") return `${label}${qHtml(it, i)}`;
  return `${label}<p class="tl-ar" lang="ar" dir="rtl">${esc(p.ar)}</p>
    ${pr.translit && p.transliteration ? `<p class="tl-tr">${esc(p.transliteration)}</p>` : ""}
    ${pr.translation && p.translation ? `<p class="tl-en">${esc(p.translation)}</p>` : ""}`;
}

function counterHtml(it, st, prayer) {
  const need = unitsFor(it, prayer), c = countsOf(st, it, prayer), done = itemDone(st, it, prayer);
  const sum = a => a.reduce((x, y) => x + y, 0);
  const ring = `<i class="tl-ring" style="--p:${Math.round(100 * sum(c) / sum(need))}"></i>`;
  const multi = need.length > 1;
  const txt = multi ? c.map((x, i) => `${x}/${need[i]}`).join(" · ") : `${c[0]} / ${need[0]}`;
  const pips = !multi && need[0] > 1 && need[0] <= 10 ? `<span class="tl-pips">${Array.from({ length: need[0] }, (_, i) => `<i class="${i < c[0] ? "on" : ""}"></i>`).join("")}</span>` : "<span></span>";
  return `<div class="tl-adf">${pips}<span class="tl-cnt ${done ? "ok" : ""}">${ring}<b>${txt}</b></span></div>`;
}

/* The tasbīh card: one big counter for the current stage, four stage chips (33 · 33 · 33 · 1). */
function tasbihHtml(it, st, prayer, isNow) {
  const pr = prefs();
  const need = unitsFor(it, prayer), c = countsOf(st, it, prayer), done = itemDone(st, it, prayer);
  const k = done ? need.length - 1 : c.findIndex((x, i) => x < need[i]);
  const p = it.parts[k];
  const total = need.reduce((a, b) => a + b, 0), said = c.reduce((a, b) => a + b, 0);
  const chips = it.parts.map((q, i) => `<span class="tl-tsc${c[i] >= need[i] ? " ok" : i === k && !done ? " on" : ""}"><b>${c[i]}</b>/${need[i]}<small>${esc(q.name)}</small></span>`).join("");
  return `<div class="tl-ad tl-ts${isNow ? " now" : ""}${done ? " done" : ""}" role="button" tabindex="0" data-n="${it.n}" aria-label="${esc(p.name)}, ${c[k]} of ${need[k]}" onclick="A.asTap(${it.n})">
    <div class="tl-adh"><span class="tl-no">${it.n}</span><span class="tl-tm">${TT.asTasbihHead}</span>${isNow ? `<span class="tl-hint">${I.hand} ${TT.tapCard}</span>` : ""}</div>
    ${pr.translit || pr.translation ? `<div class="tl-ttl">${esc(k === 3 ? TT.asTo100 : it.title)}</div>` : ""}
    <p class="tl-ar ${k < 3 ? "big" : ""}" lang="ar" dir="rtl">${esc(p.ar)}</p>
    ${pr.translit ? `<p class="tl-tr">${esc(p.transliteration)}</p>` : ""}${pr.translation ? `<p class="tl-en">${esc(p.translation)}</p>` : ""}
    <div class="tl-tsbig"><b>${c[k]}</b><span>/ ${need[k]}</span></div>
    <div class="tl-tsrow">${chips}</div>
    <div class="tl-adf"><span class="tl-tsall">${said} / ${total}</span><button type="button" class="tl-tsundo" onclick="event.stopPropagation();A.asUndo(${it.n})" ${said ? "" : "disabled"}>${TT.asUndo}</button></div></div>`;
}

function cardHtml(it, st, prayer, isNow) {
  if (it.tasbih) return tasbihHtml(it, st, prayer, isNow);
  const pr = prefs();
  const done = itemDone(st, it, prayer);
  const tm = it.count != null ? TT.times(it.count) : it.quls ? TT.times(qulsCount(prayer)) + TT.asEach : "";
  const head = `<div class="tl-adh"><span class="tl-no">${it.n}</span><span class="tl-tm">${tm}</span>${isNow ? `<span class="tl-hint">${I.hand} ${TT.tapCard}</span>` : ""}</div>`;
  const title = (pr.translit || pr.translation) ? `<div class="tl-ttl">${esc(it.title)}</div>` : "";
  const quls = it.quls ? `<p class="tl-note">${esc(TT.asQulsRule(pname(prayer), qulsCount(prayer)))}</p>` : "";
  const foot = (pr.translit || pr.translation) && (it.ref || it.note) ? `<p class="tl-note">${it.note ? esc(it.note) + " " : ""}${it.ref ? `${TT.ref}: ${esc(it.ref)}` : ""}</p>` : "";
  return `<div class="tl-ad${isNow ? " now" : ""}${done ? " done" : ""}" role="button" tabindex="0" data-n="${it.n}" aria-label="${esc(it.title)}" onclick="A.asTap(${it.n})">
    ${head}${title}${quls}${it.parts.map((p, i) => partHtml(it, p, i, prayer, st)).join("")}${foot}${counterHtml(it, st, prayer)}</div>`;
}
const foldLabel = it => it.parts[0].kind === "quran" ? (it.parts[0].labelAr || it.title) : headWords(it.parts[0].ar, 4);
const foldHtml = (it, st, prayer) => `<button type="button" class="tl-fold" onclick="A.asOpenCard(${it.n})" aria-label="${esc(it.title)} done, tap to open"><span class="tl-fc">${I.check}</span><span class="tl-ft" lang="ar" dir="rtl">${esc(foldLabel(it))}</span><span class="tl-fn">${countsOf(st, it, prayer).reduce((a, b) => a + b, 0)}/${unitsFor(it, prayer).reduce((a, b) => a + b, 0)}</span></button>`;

/* ---------- screen ---------- */
const expanded = new Set();
let pending = [];

export function afterSalahView() {
  const now = NOW();
  const { prayer, key, auto } = slot(now);
  const pr = prefs();
  const st = asState(prayer, key);
  const pg = asProgress(prayer, key);
  const nowItem = AFTER_SALAH.find(it => !itemDone(st, it, prayer));
  const need = [];
  const cards = AFTER_SALAH.map(it => {
    it.parts.forEach((p, i) => { if (p.kind === "quran" && !qcache.has(`${it.n}.${i}`)) need.push([it, p, i]); });
    if (itemDone(st, it, prayer) && !expanded.has(it.n)) return foldHtml(it, st, prayer);
    return cardHtml(it, st, prayer, it === nowItem);
  }).join("");
  pending = need;
  const lp = lastPrayer(now);
  const autoLine = auto ? TT.asAuto(pname(prayer), fmt12(lp.at)) : TT.asChosen(pname(prayer));
  const doneCard = pg.complete ? `<div class="tl-donec"><div class="tl-dtick">${I.check}</div><div><b>${esc(TT.asDone(pname(prayer)))}</b><span>${TT.doneMeta(pg.n, pg.total)}</span></div></div>` : "";
  const chips = PRAYERS5.map(p => `<button role="tab" aria-selected="${p === prayer}" class="${p === prayer ? "on" : ""}" onclick="A.asPick('${p}')">${esc(TT.asShort[p])}</button>`).join("");
  const first = AFTER_SALAH.indexOf(nowItem);
  return `<div class="tl-hero tl-rd">
      
      <div class="tl-hrow"><button type="button" class="tl-hbtn" aria-label="${COMMON.back}" onclick="A.tlBack()">${I.back}</button>
        <div class="tl-ht"><h1>${esc(TT.asTitle)}</h1></div>
        <button type="button" class="tl-hbtn aa" aria-label="${TT.aa}" onclick="A.tlAa('afterSalah')">Aa</button></div>
      <div class="tl-segw five" role="tablist" aria-label="${TT.asWhich}">${chips}</div>
      <div class="tl-auto"><span class="tl-autob">${auto ? TT.auto : "•"}</span> ${esc(autoLine)}</div>
      <div class="tl-prog"><div class="tl-bar"><i style="width:${Math.round(100 * pg.said / pg.total)}%"></i></div><span><b>${pg.complete ? pg.n : first + 1} of ${pg.n}</b> · ${pg.said}/${pg.total} said</span></div>
    </div>
    <div class="tl-list">${doneCard}${cards}</div>
    <p class="tl-draftline">${esc(TT.asSource)}</p><div class="space"></div>`;
}

export function afterSalahAfter() {
  const need = pending; pending = [];
  if (!need.length) return;
  quranFont().then(() => { if (T.screen === "afterSalah") document.querySelector("#v-tools")?.classList.add("tl-fontok"); });
  Promise.all(need.map(([it, p, i]) => loadQuran(it, p, i))).then(() => { if (T.screen === "afterSalah") redraw(); });
}

/* ---------- actions ---------- */
function vibrate(ms) { try { navigator.vibrate?.(ms); } catch { /* not available */ } }

A.asPick = p => {
  const lp = lastPrayer(NOW());
  // the same prayer as the one that just passed keeps its date (e.g. ʿIshāʾ after midnight); others are today's
  T.asPrayer = p; T.asKey = p === lp.prayer ? lp.key : dkey(NOW());
  redraw();
};
A.asOpenCard = n => { expanded.add(n); redraw(); };
A.asTap = n => {
  const it = AFTER_SALAH.find(x => x.n === n); if (!it) return;
  const { prayer, key } = slot(NOW());
  const st = store_(prayer, key);
  const need = unitsFor(it, prayer);
  const c = (st.c[n] ||= need.map(() => 0));
  const i = c.findIndex((x, k) => x < need[k]);
  if (i < 0) return;
  c[i]++;
  const doneNow = c.every((x, k) => x >= need[k]);
  vibrate(doneNow ? 25 : c[i] >= need[i] ? 18 : 8);
  const pg = asProgress(prayer, key);
  if (pg.complete && !st.done) { st.done = Date.now(); store.noteToolSet(S, `afterSalah/${key}/${prayer}/done`); toast(TT.asDone(pname(prayer))); }
  prune(S.tools.afterSalah, 14);
  persist();
  const y = $("#screen").scrollTop;
  redraw();
  if (doneNow) {
    const next = document.querySelector("#v-tools .tl-ad.now");
    $("#screen").scrollTop = next ? Math.max(0, topIn(next, $("#screen")) - 70) : y;
  }
};
A.asUndo = n => {
  const it = AFTER_SALAH.find(x => x.n === n); if (!it) return;
  const { prayer, key } = slot(NOW());
  const st = store_(prayer, key);
  const c = st.c[n]; if (!c) return;
  for (let i = c.length - 1; i >= 0; i--) if (c[i] > 0) { c[i]--; break; }
  if (st.done) store.clearToolStamp(S, `afterSalah/${key}/${prayer}/done`);
  persist(); redraw();
};

/**
 * Open the reader for a prayer (for Home's link after a prayer is marked prayed).
 * prayerKey: "Fajr" | "Dhuhr" | "Asr" | "Maghrib" | "Isha" (any case; "Zuhr", "Jumuah" → Dhuhr). Optional dateKey (YYYY-MM-DD).
 * The Quls are 3× after Fajr and Maghrib and 1× after the others.
 */
A.openAfterSalah = (prayerKey, dateKey) => {
  const k = String(prayerKey || "").toLowerCase();
  const p = { zuhr: "Dhuhr", jumuah: "Dhuhr", jumua: "Dhuhr" }[k] || PRAYERS5.find(x => x.toLowerCase() === k) || null;
  if (!p) { T.asPrayer = null; T.asKey = null; }
  else { const lp = lastPrayer(NOW()); T.asPrayer = p; T.asKey = dateKey || (p === lp.prayer ? lp.key : dkey(NOW())); }
  A.toolsOpen("afterSalah", { keepPrayer: true });
};
