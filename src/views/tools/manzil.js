/* Manzil reader: the protective passages, rendered from the Quran data (IndoPak text, optional Pickthall).
   The data file holds references only. Reading is ticked per day, morning and evening. */
import { A, S, NOW, todayKey, esc, I, T, redraw, part, persist, prune, prefs, toast, COMMON, store } from "./core.js";
import { MANZIL, MANZIL_META, manzilAyahCount, manzilRef } from "../../tools/data/manzil.js";
import { timesFor } from "../../times.js";
import { fmt12 } from "../../util.js";
import { TT } from "./strings-tools.js";
import { quranBlock, quranFont } from "./qtext.js";
import { doneBar } from "./donebar.js";
import { markRead } from "../../reading.js";
import { commit } from "../../app.js";

/** "morning" from Fajr until ʿAsr, otherwise "evening" (the same rule as the adhkār). */
export function manzilSlot(now = NOW()) {
  const t = timesFor(now, S.settings);
  return now >= t.Fajr && now < t.Asr ? "morning" : "evening";
}
/** S.tools.manzil[day] = { morning?: ms, evening?: ms } */
export const manzilDone = (slot, key = todayKey()) => S.tools?.manzil?.[key]?.[slot] || 0;

const cache = new Map(); // n -> block | "loading" | "fail"
let pending = false;
async function loadAll() {
  for (const p of MANZIL) {
    if (cache.has(p.n)) continue;
    cache.set(p.n, "loading");
    try { const b = await quranBlock({ surah: p.surah, from: p.from, to: p.to }); cache.set(p.n, b || "fail"); }
    catch (e) { console.warn("manzil", p.n, e); cache.set(p.n, "fail"); }
  }
}

function blockHtml(p, tr) {
  const b = cache.get(p.n);
  const body = !b || b === "loading" ? `<p class="tl-q-note">${TT.qLoading}</p>`
    : b === "fail" ? `<p class="tl-q-note err">${TT.qMissing}</p>`
    : `<p class="tl-q" lang="ar" dir="rtl">${esc(b.ar)}</p>${tr ? `<p class="tl-en">${b.en.map(e => `<sup>${e.a}</sup> ${esc(e.text)}`).join(" ")}<span class="tl-src"> ${TT.pickthallFrom}</span></p>` : ""}`;
  const n = p.to - p.from + 1;
  return `<section class="tl-ad tl-mz" aria-label="${esc(manzilRef(p))}"><div class="tl-adh"><span class="tl-no">${p.n}</span><span class="tl-mzn">${esc(manzilRef(p))}</span><span class="tl-tm tl-mzc">${TT.ayahs(n)}</span></div>${body}</section>`;
}

export function manzilView() {
  const now = NOW();
  const slot = manzilSlot(now);
  const tr = !!prefs().manzilTr;
  const done = manzilDone(slot);
  const t = timesFor(now, S.settings);
  pending = MANZIL.some(p => !cache.has(p.n));
  const bar = doneBar("manzil", { next: "A.readNextCard('.tl-mz')" });
  const doneOther = manzilDone(slot === "morning" ? "evening" : "morning");
  const status = done ? TT.mzReadAt(slot === "morning" ? TT.morning : TT.evening, fmt12(new Date(done)))
    : slot === "morning" ? TT.autoMorning(fmt12(t.Fajr), fmt12(t.Asr)) : TT.autoEvening(fmt12(t.Asr));
  return `<div class="tl-hero tl-rd">
      
      <div class="tl-hrow"><button type="button" class="tl-hbtn" aria-label="${COMMON.back}" onclick="A.tlBack()">${I.back}</button>
        <div class="tl-ht"><h1>${esc(MANZIL_META.title)}</h1></div>
        <button type="button" class="tl-hbtn aa" aria-label="${TT.aa}" onclick="A.tlAa('manzil')">Aa</button></div>
      <div class="tl-segw" role="tablist" aria-label="${TT.translationBtn}"><button role="tab" aria-selected="${!tr}" class="${tr ? "" : "on"}" onclick="A.mzTr(false)">${TT.mzArabic}</button><button role="tab" aria-selected="${tr}" class="${tr ? "on" : ""}" onclick="A.mzTr(true)">${I.translate} ${TT.mzWithPickthall}</button></div>
      <div class="tl-auto"><span class="tl-autob">${done ? "✓" : TT.auto}</span> ${esc(status)}</div>
      <div class="tl-auto tl-mzsub">${esc(TT.mzSub(MANZIL.length, manzilAyahCount()))}${doneOther ? ` · ${esc(TT.mzOtherDone(slot === "morning" ? TT.evening : TT.morning))}` : ""}</div>
    </div>
    <div class="tl-list">${MANZIL.map(p => blockHtml(p, tr)).join("")}
      ${bar ? "" : `<button type="button" class="tl-cta${done ? " ghost" : ""}" onclick="A.mzDone()">${done ? `${I.check} ${esc(TT.mzMarkUnread)}` : `${I.check} ${esc(TT.mzMarkRead(slot === "morning" ? TT.morning : TT.evening))}`}</button>`}</div>
    <p class="tl-draftline">${esc(TT.mzCredit)}</p>${bar ? `<div class="rd-gap"></div>${bar}` : `<div class="space"></div>`}`;
}

export function manzilAfter() {
  if (!pending) return;
  pending = false;
  quranFont().then(() => { if (T.screen === "manzil") document.querySelector("#v-tools")?.classList.add("tl-fontok"); });
  loadAll().then(() => { if (T.screen === "manzil") redraw(); });
}

A.mzTr = on => { prefs().manzilTr = !!on; persist(); redraw(); };
A.mzDone = () => {
  const slot = manzilSlot(NOW());
  const m = part("manzil", {});
  const k = todayKey();
  m[k] ||= {};
  if (m[k][slot]) { store.clearToolStamp(S, `manzil/${k}/${slot}`); toast(TT.undone); } // with a note, so a sync can't bring it back
  else { m[k][slot] = Date.now(); store.noteToolSet(S, `manzil/${k}/${slot}`); toast(TT.mzReadToast(slot === "morning" ? TT.morning : TT.evening)); }
  prune(m, 40);
  markRead(S, "manzil", NOW()); // the day log too: the Manzil counts as a good deed in Provisions
  commit(); redraw();
};
