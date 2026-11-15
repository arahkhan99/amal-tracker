/* Qurʾān: mushaf picker (MP2) and the page reader with tap-for-bars (QR-A). Text, fonts and
   pages come from src/tools/quran-data.js (public/quran). Nothing is typed by hand here. */
import { A, S, $, NOW, todayKey, esc, I, T, open, redraw, part, persist, prune, toast, openSheet, closeSheet, head, info, COMMON, APP, arNum } from "./core.js";
import { quranFont } from "./qtext.js";
import { TOOLS_UI } from "../../strings.js";
import { TT } from "./strings-tools.js";
import { listMushafs, getMushaf, getSurahs, getPage, getPageTranslation, getQuranCredits, loadMushafFont, pageForJuz, pageForSurah, juzForPage, manzilForPage, DEFAULT_MUSHAF } from "../../tools/quran-data.js";
import { spreadPages, stepSpread, spreadFirst, TABLET_QUERY, SPREAD_QUERY } from "../../tools/quran-spread.js";

/* ---------- tablets: a bigger page, and two pages side by side in landscape (docs/build/tablet.md) ---------- */
const mq = q => (typeof matchMedia === "function" ? matchMedia(q) : null);
const TABLET = mq(TABLET_QUERY), SPREAD = mq(SPREAD_QUERY);
const isTablet = () => !!TABLET?.matches;
const isSpread = () => !!SPREAD?.matches;
/** The pages on screen for page n: [n] on phones and in portrait, [right, left] in a landscape spread. */
const shown = (id, n) => {
  const ix = C.index[id], total = ix?.pages || 610;
  return isSpread() ? spreadPages(n, total, spreadFirst(id, ix)) : [n];
};

const NAME = { indopak15: TOOLS_UI.mushaf.indopak15, indopak13: TOOLS_UI.mushaf.indopak13, madani15: TOOLS_UI.mushaf.uthmani15 };
const SUB = { indopak15: "South Asian · hafizi 15-line", indopak13: "South Asian · 13-line", madani15: "Madani mushaf" };
export const mushafName = id => NAME[id] || id;

/* ---------- saved state: S.tools.quran = { mushaf, pages:{id:n}, bookmarks:[{m,n}], night, trans, read:{day:[n]} } ---------- */
const q = () => part("quran", { mushaf: DEFAULT_MUSHAF, pages: {}, bookmarks: [], night: false, trans: false, read: {} });
export const quranMushaf = () => S.tools?.quran?.mushaf || DEFAULT_MUSHAF;
export const quranPage = (id = quranMushaf()) => S.tools?.quran?.pages?.[id] || 1;
export const quranHasStarted = () => !!S.tools?.quran?.pages && Object.keys(S.tools.quran.pages).length > 0;
export const pagesToday = () => (S.tools?.quran?.read?.[todayKey()] || []).length;

/* ---------- loaded data (sync caches that trigger a redraw when ready) ---------- */
const C = { mushafs: null, index: {}, surahs: null, pages: new Map(), font: {}, sample: {} };
let loadingMeta = false;
export function loadQuranMeta() {
  if (loadingMeta || (C.mushafs && C.surahs)) return;
  loadingMeta = true;
  Promise.all([listMushafs(), getSurahs()]).then(([m, s]) => { C.mushafs = m; C.surahs = s; }).catch(() => { C.mushafs = C.mushafs || []; })
    .finally(() => { loadingMeta = false; if (T.screen === "picker" || T.screen === "quran" || T.screen === "hub") redraw(); });
}
export const quranMeta = () => ({ surahs: C.surahs });
export const surahName = n => C.surahs?.[n - 1]?.tr || "";

function ensureIndex(id) {
  if (C.index[id] || C.index[id + "?"]) return;
  C.index[id + "?"] = true;
  getMushaf(id).then(ix => { C.index[id] = ix; return loadMushafFont(id).catch(() => null); }).then(() => { C.font[id] = true; })
    .catch(() => { C.index[id] = { failed: true }; }).finally(() => { if (T.screen === "quran") redraw(); });
}
function ensurePage(id, n) {
  const k = `${id}:${n}`;
  if (C.pages.has(k)) return C.pages.get(k);
  if (!C.pages.has(k + "?")) {
    C.pages.set(k + "?", true);
    getPage(id, n).then(p => C.pages.set(k, p)).catch(() => C.pages.set(k, { failed: true })).finally(() => { if (T.screen === "quran" && quranMushaf() === id && shown(id, T.page).includes(n)) redraw(); });
  }
  return null;
}
const fontFamily = id => `'${C.index[id]?.font?.family || "DigitalKhatt IndoPak"}','Amiri Quran',Amiri,serif`;

/* ---------- picker ---------- */
export function pickerView() {
  loadQuranMeta();
  const cur = quranMushaf();
  const list = C.mushafs || [];
  list.forEach(m => { if (m.available && !C.sample[m.id]) { C.sample[m.id] = "…"; getMushaf(m.id).then(ix => { C.index[m.id] = ix; return Promise.all([loadMushafFont(m.id).catch(() => 0), getPage(m.id, 1)]); }).then(([, p]) => { C.sample[m.id] = (p.lines.find(l => l.type === "bismillah") || p.lines[1] || p.lines[0]).text.replace(/\s*۝.*$/, ""); C.font[m.id] = true; if (T.screen === "picker") redraw(); }).catch(() => { C.sample[m.id] = ""; }); } });
  const order = ["indopak15", "indopak13", "madani15"];
  const rows = order.map(id => list.find(m => m.id === id)).filter(Boolean).map(m => {
    const ok = m.available, on = m.id === cur;
    return `<button type="button" class="tl-mu${on ? " on" : ""}${ok ? "" : " off"}" ${ok ? `onclick="A.tlPickMushaf('${m.id}')"` : "disabled"} role="radio" aria-checked="${on}">
      <span class="tl-radio"></span>
      <span class="tl-mt"><b>${esc(NAME[m.id] || m.title)}</b><small>${esc(SUB[m.id] || "")} · ${TT.pagesN(m.pages)}</small>
        ${ok && C.sample[m.id] ? `<span class="tl-bis" lang="ar" dir="rtl" style="font-family:${fontFamily(m.id)}">${esc(C.sample[m.id])}</span>` : ""}</span>
      <span class="tl-mbadge ${ok ? "ok" : "no"}">${ok ? (m.default ? TT.defaultTag : TT.offline) : TT.notYet}</span></button>`;
  }).join("");
  return `${head({ title: TT.mushafTitle, sub: `${TT.quranTitle} · ${TT.mushafSub.toLowerCase()}`, back: "A.tlBack()" })}
    <div class="tl-sech"><h2 class="cap">${TT.scriptLines} ${info("mushaf")}</h2></div>
    <div class="tl-card tl-mlist2" role="radiogroup">${rows || `<p class="tl-note pad">…</p>`}</div>
    <p class="tl-cap">${TT.notYetSub}</p>
    <div class="tl-card"><button type="button" class="tl-mu" onclick="A.tlCredits()"><span class="tl-mt"><b>Sources &amp; credits</b><small>${TT.dataCredits}</small></span></button></div><div class="space"></div>`;
}
A.tlPickMushaf = id => { const s = q(); s.mushaf = id; persist(); open("quran", { page: quranPage(id), bars: false }); };

/* ---------- reader ---------- */
let touchX = null, dwell = 0;

export function quranView() {
  loadQuranMeta();
  const id = quranMushaf();
  ensureIndex(id);
  const ix = C.index[id];
  const st = q();
  const ps = shown(id, T.page || quranPage(id)); // one page, or a [right, left] spread on a tablet in landscape
  const n = ps[0];
  T.page = n;
  const total = ix?.pages || 610;
  const pages = ix && !ix.failed ? ps.map(p => ensurePage(id, p)) : [null];
  const page = pages.find(p => p?.failed) || (pages.every(Boolean) ? pages[0] : null);
  const pageLbl = ps.length > 1 ? TT.pagesOf(ps[0], ps[1], total) : TT.pageOf(n, total);
  const para = ix?.juzStartPage ? ix.juzStartPage.filter(p => p <= n).length : 1;
  const nav = ix?.nav || (id === "madani15" ? "juz" : "para");
  const sName = page?.surahs?.length ? surahName(page.surahs[0]) : "";
  const marked = st.bookmarks.some(b => b.m === id && ps.includes(b.n));
  let man = "";
  const manz = page?.marks?.find(m => m.t === "manzil");
  if (manz) man = ` · ${TT.manzilShort(manz.z)}`;
  const sub = `${nav === "juz" ? TT.juzN(para) : TT.paraN(para)}${man} · ${pageLbl}`;
  let body;
  if (ix?.failed || page?.failed) body = `<div class="tl-qmsg"><p>${TT.pageFail}</p><button class="tl-cta sm" onclick="A.tlQRetry()">${TT.retry}</button></div>`;
  else if (!page || !fontOk(id)) body = `<div class="tl-qmsg"><p>${TT.loadingPage}</p></div>`; // never paint the fallback font (it shows boxes)
  else body = ps.length > 1 ? `<div class="tl-qspread">${ps.map((p, i) => pageHtml(pages[i], id, p)).join("")}</div>` : pageHtml(page, id, n);
  const bars = T.bars ? " bars" : "";
  return `<div class="tl-qr${st.night ? " night" : ""}${bars}">
    <div class="tl-qtop"><button type="button" class="tl-back" aria-label="${COMMON.back}" onclick="A.tlBack()">${I.back}</button>
      <div class="tl-qt"><b>${esc(sName || TT.quranTitle)}</b><span>${esc(sub)}</span></div>
      <button type="button" class="tl-qib${marked ? " on" : ""}" aria-label="${marked ? TT.unbookmarked : TT.bookmarked}" onclick="A.tlBookmark()">${marked ? I.bookmarkOn : I.bookmark}</button></div>
    <div class="tl-qpagewrap" onclick="A.tlQBars(event)" ontouchstart="A.tlQTouch(event)" ontouchend="A.tlQTouch(event)">${body}</div>
    ${st.trans && page && !page.failed ? `<div class="tl-qtrans" id="qtrans"><h3>${TT.pageTrans}</h3><div id="qtransBody">…</div></div>` : ""}
    ${!T.bars && !sessionStorage.getItem("tlQHint") ? `<div class="tl-qhint" id="qhint">${TT.tapHint}</div>` : ""}
    <div class="tl-qbot"><div class="tl-qslide"><input type="range" min="1" max="${total}" value="${n}" aria-label="${pageLbl}" dir="rtl" oninput="A.tlQSlide(this.value,true)" onchange="A.tlQSlide(this.value)"></div>
      <div class="tl-qmeta"><span><button type="button" class="tl-qpn" aria-label="Next page" onclick="A.tlQPage(1)">‹</button><b>${pageLbl}</b><button type="button" class="tl-qpn" aria-label="Previous page" onclick="A.tlQPage(-1)">›</button></span>
        <button type="button" class="tl-qmu" onclick="A.tlQMushaf()">${esc(NAME[id] || id)} ▾</button></div>
      <div class="tl-qact"><button type="button" onclick="A.tlGoTo()"><i>${I.list}</i>${TT.goTo}</button>
        <button type="button" onclick="A.tlBookmarks()"><i>${I.bookmark}</i>${TT.bookmarks}</button>
        <button type="button" class="${st.trans ? "on" : ""}" aria-pressed="${st.trans}" onclick="A.tlQTrans()"><i>${I.translate}</i>${TT.translationBtn}</button>
        <button type="button" class="${st.night ? "on" : ""}" aria-pressed="${st.night}" onclick="A.tlQNight()"><i>${I.moon}</i>${TT.night}</button></div></div>
  </div>`;
}

function pageHtml(page, id, n) {
  const lines = page.lines.map(l => {
    if (l.type === "header") return `<div class="ql qh"><span>${esc(l.text)}</span></div>`;
    if (l.type === "bismillah") return `<div class="ql qb c"><span>${esc(l.text.replace(/\s*۝\s*$/, ""))}</span></div>`;
    return `<div class="ql${l.centered ? " c" : ""}"><span>${esc(l.text)}</span></div>`;
  }).join("");
  return `<div class="tl-qpage ${id === "madani15" ? "uth" : "ind"}" lang="ar" dir="rtl" style="font-family:${fontFamily(id)}" data-n="${n}">${lines}</div>`;
}

export function quranAfter() {
  const id = quranMushaf(), n = T.page;
  const els = [...document.querySelectorAll("#v-tools .tl-qpage")], el = els[0];
  const ns = els.map(e => +e.dataset.n); // the page, or both pages of a spread
  if (el) { fitAll(els); quranFontReady(id).then(() => { if (el.isConnected) fitAll(els); }); }
  const st = q();
  if (el) {
    st.pages[id] = n;
    clearTimeout(dwell);
    // "read today": a spread counts both of its pages
    dwell = setTimeout(() => { const r = (st.read[todayKey()] ||= []); let add = false; for (const p of ns) { const k = id + ":" + p; if (!r.includes(k)) { r.push(k); add = true; } } if (add) { prune(st.read, 14); persist(); } }, 9000);
    persist();
  }
  if (!sessionStorage.getItem("tlQHint")) setTimeout(() => { try { sessionStorage.setItem("tlQHint", "1"); } catch { /* ignore */ } $("#qhint")?.classList.add("gone"); }, 3500);
  if (st.trans && el) Promise.all(ns.map(p => getPageTranslation("pickthall", id, p))).then(lists => {
    const box = $("#qtransBody"); if (!box || T.page !== n) return;
    box.innerHTML = lists.flat().map(x => `<p><b>${x.s}:${x.a}</b> ${esc(x.text || "")}</p>`).join("");
  }).catch(() => { const box = $("#qtransBody"); if (box) box.textContent = TT.pageFail; });
}
export function quranLeave() { clearTimeout(dwell); }

/** Phones: fit the page to the width, as before. Tablets: one size for all pages on screen, up to a larger cap,
 *  fitted to both the width and the screen height, then each page box hugs its widest line (text stays justified). */
function fitAll(els) {
  if (!isTablet()) return els.forEach(fit);
  els.forEach(p => { p.style.width = ""; p.style.flex = ""; });
  const set = fs => els.forEach(p => { p.style.fontSize = fs.toFixed(2) + "px"; });
  // ratios only (rect / rect), so the result holds under any CSS zoom
  const scale = p => (p.getBoundingClientRect().width / p.offsetWidth) || 1;
  const box = p => { const cs = getComputedStyle(p); return p.getBoundingClientRect().width - (parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth)) * scale(p); };
  if (els.some(p => box(p) <= 0)) return;
  let fs = 30; set(fs);
  for (let i = 0; i < 4; i++) {
    const r = Math.min(...els.map(p => (box(p) - 3 * scale(p)) / widestLine(p, scale(p))));
    if (r >= 1 && r < 1.01 && i > 0) break;
    fs = Math.max(13, Math.min(64, fs * r)); set(fs);
  }
  // fit the height: the page should not need scrolling (the bars are hidden while reading)
  const wrap = els[0].closest(".tl-qpagewrap");
  const top = els[0].getBoundingClientRect().top - ($("#screen")?.getBoundingClientRect().top || 0) + ($("#screen")?.scrollTop || 0);
  const pad = wrap ? parseFloat(getComputedStyle(wrap).paddingBottom) * scale(els[0]) : 24;
  const avail = innerHeight - Math.max(0, top) - pad;
  for (let i = 0; i < 4; i++) {
    const h = Math.max(...els.map(p => p.getBoundingClientRect().height));
    if (h <= avail || avail < 200) break;
    fs = Math.max(13, fs * avail / h); set(fs);
  }
  // shrink the page boxes to the widest line at this size, so the frame hugs the text like a printed page
  const s = scale(els[0]), cs = getComputedStyle(els[0]);
  const wmax = Math.max(...els.map(p => widestLine(p, s))) / s;
  const pw = Math.ceil(wmax + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth) + 6);
  els.forEach(p => { p.style.flex = "none"; p.style.width = `min(${pw}px, ${els.length > 1 ? "50%" : "100%"})`; });
}
/** Widest line of a page in screen px (ink included), at its current font size. */
function widestLine(page, s = 1) {
  const spans = [...page.querySelectorAll(".ql:not(.qh) > span")];
  spans.forEach(x => { x.style.display = "inline-block"; x.style.width = "max-content"; });
  let m = 1;
  for (const x of spans) { const r = document.createRange(); r.selectNodeContents(x); m = Math.max(m, x.offsetWidth * s, r.getBoundingClientRect().width); }
  spans.forEach(x => { x.style.display = ""; x.style.width = ""; });
  return m;
}
// re-fit on rotation / resize; turning a tablet between portrait and landscape switches page ⇄ spread
let refitT = 0;
const refit = () => { clearTimeout(refitT); refitT = setTimeout(() => { if (T.screen !== "quran") return; const els = [...document.querySelectorAll("#v-tools .tl-qpage")]; if (els.length) fitAll(els); }, 120); };
if (typeof window !== "undefined") { window.addEventListener("resize", refit); document.fonts?.addEventListener?.("loadingdone", refit); }
const onMode = () => { if (T.screen === "quran") redraw(); };
[TABLET, SPREAD].forEach(m => m && (m.addEventListener ? m.addEventListener("change", onMode) : m.addListener?.(onMode)));

/** Pick one font size for the page so the widest line (ink included) fits the text box; lines are then justified. */
function fit(page) {
  const cs = getComputedStyle(page);
  const w = page.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); if (w <= 0) return;
  const spans = [...page.querySelectorAll(".ql:not(.qh) > span")];
  // natural width of each line, counting marks that overhang the glyph advances (getBoundingClientRect of a Range)
  const widest = () => {
    spans.forEach(s => { s.style.display = "inline-block"; s.style.width = "max-content"; });
    let m = 1;
    for (const s of spans) {
      const r = document.createRange(); r.selectNodeContents(s);
      m = Math.max(m, s.offsetWidth, r.getBoundingClientRect().width);
    }
    spans.forEach(s => { s.style.display = ""; s.style.width = ""; });
    return m;
  };
  let fs = 30;
  page.style.fontSize = fs + "px";
  for (let i = 0; i < 4; i++) {
    const max = widest();
    if (max <= w - 1 && i > 0) break;
    fs = Math.max(13, Math.min(34, fs * (w - 3) / max));
    page.style.fontSize = fs.toFixed(2) + "px";
  }
}
const FONT_OK = {};
const fontOk = id => {
  if (FONT_OK[id]) return true;
  if (!FONT_OK[id + "?"]) { FONT_OK[id + "?"] = true; quranFontReady(id).then(() => { FONT_OK[id] = true; }, () => { FONT_OK[id] = true; }).finally(() => { if (T.screen === "quran" && quranMushaf() === id) redraw(); }); }
  return false;
};

/* ---------- actions ---------- */
A.tlQRetry = () => { Object.keys(C.index).forEach(k => delete C.index[k]); C.pages.clear(); redraw(); };
A.tlQBars = e => {
  if (e.target.closest("button,input")) return;
  T.bars = !T.bars; document.querySelector("#v-tools .tl-qr")?.classList.toggle("bars", T.bars); $("#qhint")?.classList.add("gone");
  try { sessionStorage.setItem("tlQHint", "1"); } catch { /* ignore */ }
};
A.tlQTouch = e => {
  const t = e.changedTouches?.[0]; if (!t) return;
  if (e.type === "touchstart") { touchX = t.clientX; return; }
  if (touchX == null) return;
  const dx = t.clientX - touchX; touchX = null;
  if (Math.abs(dx) > 70) { e.preventDefault?.(); A.tlQPage(dx > 0 ? 1 : -1); }
};
A.tlQPage = d => {
  const id = quranMushaf(), ix = C.index[id], total = ix?.pages || 610;
  // in a spread, move a whole spread (two pages) at a time
  const n = isSpread() ? stepSpread(T.page || 1, d, total, spreadFirst(id, ix)) : Math.min(total, Math.max(1, (T.page || 1) + d));
  if (n !== T.page) { T.page = n; redraw(); $("#screen").scrollTop = 0; }
};
A.tlQSlide = (v, live) => {
  const id = quranMushaf(), total = C.index[id]?.pages || 610, ps = shown(id, +v);
  if (live) { const b = document.querySelector("#v-tools .tl-qmeta b"); if (b) b.textContent = ps.length > 1 ? TT.pagesOf(ps[0], ps[1], total) : TT.pageOf(ps[0], total); return; }
  T.page = ps[0]; redraw();
};
A.tlQMushaf = () => open("picker");
A.tlQNight = () => { const s = q(); s.night = !s.night; persist(); redraw(); };
A.tlQTrans = () => { const s = q(); s.trans = !s.trans; persist(); redraw(); };
A.tlBookmark = () => {
  const s = q(), id = quranMushaf(), n = T.page, ps = shown(id, n);
  // a spread is bookmarked when either of its pages is; the icon then clears both, else it marks the right-hand page
  if (s.bookmarks.some(b => b.m === id && ps.includes(b.n))) { s.bookmarks = s.bookmarks.filter(b => !(b.m === id && ps.includes(b.n))); toast(TT.unbookmarked); } else { s.bookmarks.push({ m: id, n: ps[0], at: Date.now() }); toast(TT.bookmarked); }
  persist(); redraw();
};
A.tlBookmarks = () => {
  const s = q(), list = s.bookmarks.filter(b => b.m === quranMushaf());
  openSheet(`<h3>${TT.bookmarks}</h3>${list.length ? `<div class="tl-bms">${list.map((b, i) => `<div class="tl-bm"><button type="button" onclick="A.tlJump(${b.n})"><b>${TT.pageOf(b.n, C.index[b.m]?.pages || 610)}</b></button><button type="button" class="x" aria-label="${COMMON.clear}" onclick="A.tlBmDel(${i})">✕</button></div>`).join("")}</div>` : `<p>${TT.noBookmarks}</p>`}<div class="cta"><button class="btn primary" onclick="A.closeSheet()">${COMMON.done}</button></div>`);
};
A.tlBmDel = i => { const s = q(); const own = s.bookmarks.filter(b => b.m === quranMushaf()); const b = own[i]; s.bookmarks = s.bookmarks.filter(x => x !== b); persist(); A.tlBookmarks(); redraw(); };
A.tlJump = n => { closeSheet(); T.page = n; redraw(); $("#screen").scrollTop = 0; };

let goTab = "surah";
A.tlGoTo = (tab = goTab) => {
  goTab = tab;
  const id = quranMushaf(), ix = C.index[id], nav = ix?.nav || "para", para = nav === "juz" ? TT.tabJuz : TT.tabPara;
  const tabs = [["surah", TT.tabSurah], ["para", para], ["page", TT.tabPage]];
  let body = "";
  if (tab === "surah") {
    body = `<div class="field"><input type="search" id="goQ" placeholder="${TT.searchSurah}" aria-label="${TT.searchSurah}" oninput="A.tlGoFilter(this.value)"></div><div class="tl-golist" id="goList">${(C.surahs || []).map(s => `<button type="button" data-k="${esc((s.tr + " " + s.en + " " + s.n).toLowerCase())}" onclick="A.tlGoSurah(${s.n})"><span class="n">${s.n}</span><span class="t"><b>${esc(s.tr)}</b><small>${esc(s.en)} · ${s.type === "makki" ? TT.makki : TT.madani} · ${TT.ayahs(s.ayahs)}</small></span><span class="a" lang="ar" dir="rtl">${esc(s.ar)}</span></button>`).join("")}</div>`;
  } else if (tab === "para") {
    body = `<div class="tl-gogrid">${Array.from({ length: 30 }, (_, i) => `<button type="button" onclick="A.tlGoPara(${i + 1})">${i + 1}</button>`).join("")}</div>`;
  } else {
    body = `<div class="field"><label for="goP">${TT.goPage}</label><input id="goP" type="number" inputmode="numeric" min="1" max="${ix?.pages || 610}" value="${T.page || 1}" onkeydown="if(event.key==='Enter')A.tlGoPage()"></div><div class="cta"><button class="btn primary" onclick="A.tlGoPage()">${TT.goTo}</button></div>`;
  }
  openSheet(`<h3>${TT.goTo}</h3><div class="tl-gotabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" aria-selected="${k === tab}" class="${k === tab ? "on" : ""}" onclick="A.tlGoTo('${k}')">${l}</button>`).join("")}</div>${body}`);
};
A.tlGoFilter = v => { const f = v.trim().toLowerCase(); document.querySelectorAll("#goList button").forEach(b => { b.hidden = !!f && !b.dataset.k.includes(f); }); };
A.tlGoSurah = async n => { const p = await pageForSurah(quranMushaf(), n); A.tlJump(p); };
A.tlGoPara = async n => { const p = await pageForJuz(quranMushaf(), n); A.tlJump(p); };
A.tlGoPage = () => { const ix = C.index[quranMushaf()]; const v = Math.min(ix?.pages || 610, Math.max(1, parseInt($("#goP").value) || 1)); A.tlJump(v); };

export function openQuran() { open(quranHasStarted() ? "quran" : "quran", { page: quranPage(), bars: false }); }

A.tlCredits = async () => {
  let list = [];
  try { list = await getQuranCredits(); } catch { /* shown empty */ }
  openSheet(`<h3>Sources &amp; credits</h3><div class="tl-bms">${list.map(c => `<div class="tl-bm" style="display:block;padding:10px 0"><b>${esc(c.name)}</b><div class="tl-note">${esc(c.what || "")} · ${esc(c.licence || "")}${c.by ? " · " + esc(c.by) : ""}</div></div>`).join("")}</div><div class="cta"><button class="btn primary" onclick="A.closeSheet()">${COMMON.done}</button></div>`);
};

const quranFontReady = id => quranFont(id).then(() => document.fonts?.ready);
