/* Forty durūd: list (DL1, numbered rows) and a one-at-a-time reader. */
import { A, S, NOW, todayKey, esc, I, T, open, redraw, part, persist, prune, prefs, tickAmal, untickAmal, amalIs, toast, openSheet, headWords, head, info, COMMON, APP, dkey, addDays, store } from "./core.js";
import { DURUD, DURUD_META } from "../../tools/data/durud.js";
import { timesFor } from "../../times.js";
import { commit } from "../../app.js";
import { TT } from "./strings-tools.js";
import { doneBar } from "./donebar.js";

/** The day a reading counts for: Thursday after Maghrib already belongs to Friday. */
export function durudKey(now = NOW()) {
  if (now.getDay() === 4 && now >= timesFor(now, S.settings).Maghrib) return dkey(addDays(now, 1));
  return dkey(now);
}
export const isFridayish = (now = NOW()) => now.getDay() === 5 || (now.getDay() === 4 && now >= timesFor(now, S.settings).Maghrib);
const dayState = (key = durudKey(), make = false) => {
  const d = make ? part("durud", {}) : (S.tools?.durud || {});
  if (make) return (d[key] ||= { read: [] });
  return d[key] || { read: [] };
};
export const readCount = key => dayState(key).read.length;
export const durudDone = key => readCount(key) >= DURUD.length;
const nextUnread = key => { const r = new Set(dayState(key).read); return DURUD.find(d => !r.has(d.n))?.n || null; };
export const minutes = () => Math.max(1, Math.round(DURUD.reduce((a, d) => a + d.ar.split(/\s+/).length, 0) / 80));

/* ---------- list ---------- */
export function durudView() {
  const key = durudKey(), st = dayState(key), read = new Set(st.read), n = read.size;
  const next = nextUnread(key);
  const fri = isFridayish();
  const cta = n >= DURUD.length ? `<button class="tl-cta ghost" onclick="A.tlDurudRestart()">${TT.restart}</button>`
    : `<button class="tl-cta" onclick="A.tlDurudOpen(${next || 1})">${I.play} ${n ? TT.continueFrom(next) : TT.startAll}</button>`;
  const rows = DURUD.map(d => `<button type="button" class="tl-drow${read.has(d.n) ? " done" : ""}" onclick="A.tlDurudOpen(${d.n})" aria-label="${TT.durudNo(d.n)}${read.has(d.n) ? ", " + TT.durudReadToday : ""}">
      <span class="tl-dn">${d.n}</span><span class="tl-dt"><span class="tl-dar" lang="ar" dir="rtl">${esc(headWords(d.ar, 5))}</span>${d.isTashahhud ? `<small>${TT.tashahhud}</small>` : ""}</span>
      <span class="tl-dk">${read.has(d.n) ? I.check : ""}</span></button>`).join("");
  return `${head({ title: TT.durudTitle, ar: TT.durudAr, sub: DURUD_META.compiler.replace(" Kandhlawi", "") })}
    <div class="tl-card tl-dtop"><div class="tl-kick"><span>${TT.durudToday}</span><b>${TT.durudOf(n)}</b></div><div class="tl-bar g"><i style="width:${Math.round(100 * n / DURUD.length)}%"></i></div>${cta}</div>
    <div class="tl-fri${fri ? " on" : ""}"><span class="tl-frib">${I.flower}</span><div><b>${esc(DURUD_META.recommendation.replace(/\.$/, ""))}</b><small>${fri ? "Jumuʿah: send abundant durūd" : TT.durudSub}</small></div>${info("durud")}</div>
    <div class="tl-card tl-dlist">${rows}</div>${doneBar("durud") ? `<div class="rd-gap"></div>${doneBar("durud")}` : `<div class="space"></div>`}`;
}

/* ---------- reader ---------- */
export function durudReadView() {
  const d = DURUD[T.durudN - 1] || DURUD[0];
  const key = durudKey(), read = new Set(dayState(key).read), pr = prefs();
  const last = d.n === DURUD.length;
  return `${head({ title: TT.durudNo(d.n), sub: read.has(d.n) ? TT.durudReadToday : "", back: "A.tlBack()", right: `<button type="button" class="tl-hbtn lite aa" aria-label="${TT.aa}" onclick="A.tlAa('durud')">Aa</button>` })}
    <div class="tl-bar g tl-thin"><i style="width:${Math.round(100 * read.size / DURUD.length)}%"></i></div>
    <div class="tl-card tl-dread">
      <p class="tl-ar big" lang="ar" dir="rtl">${esc(d.ar)}</p>
      ${pr.translit ? `<p class="tl-tr">${esc(d.transliteration)}</p>` : ""}
      ${pr.translation ? `<p class="tl-en">${esc(d.translation)}</p>` : ""}
      ${d.isTashahhud ? `<p class="tl-note">${TT.tashahhud}</p>` : ""}
      ${d.note ? `<p class="tl-note">${esc(d.note)}</p>` : ""}
    </div>
    ${doneBar("durud", { prev: d.n === 1 ? "" : `A.tlDurudOpen(${d.n - 1})`, next: `A.tlDurudRead(${d.n})` }) || `<div class="tl-dock"><button class="tl-cta ghost small" ${d.n === 1 ? "disabled" : ""} onclick="A.tlDurudOpen(${d.n - 1})">${TT.prev}</button>
      <button class="tl-cta" onclick="A.tlDurudRead(${d.n})">${I.check} ${last ? TT.readLast : TT.readNext}</button></div>
    <div class="space"></div>`}`;
}

A.tlDurudOpen = n => open("durudRead", { durudN: n });
A.tlDurudRead = n => {
  const key = durudKey(), st = dayState(key, true);
  if (!st.read.includes(n)) st.read.push(n);
  prune(S.tools.durud, 14);
  if (st.read.length >= DURUD.length && !st.done) {
    st.done = Date.now();
    store.noteToolSet(S, `durud/${key}/done`);
    tickAmal("salawat", key === todayKey() ? key : todayKey(), String(DURUD.length));
    commit();
    open("durud");
    openSheet(`<h3>${TT.durudCompleteTitle}</h3><p>${TT.durudCompleteBody}</p><p class="note">${TT.durudTicked}</p><div class="cta"><button class="btn ghost" onclick="A.tlDurudUndo()">${COMMON.undo}</button><button class="btn primary" onclick="A.closeSheet()">${COMMON.done}</button></div>`);
    return;
  }
  persist();
  const nx = nextUnread(key);
  if (n < DURUD.length) open("durudRead", { durudN: n + 1 }); else open("durud");
  void nx;
};
A.tlDurudUndo = () => {
  const key = durudKey();
  store.clearToolStamp(S, `durud/${key}/done`); untickAmal("salawat", todayKey());
  commit(); A.closeSheet(); toast(TT.undone);
};
A.tlDurudRestart = () => { const key = durudKey(), st = dayState(key, true); st.read = []; store.clearToolStamp(S, `durud/${key}/done`); persist(); redraw(); };
