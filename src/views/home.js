/* Home: next-prayer hero, This-week bars, Today's prayers sheet, catch-up, good deeds, tools cards and the
   "This week" tiles. Also the shared pieces Tracker uses: prayer log sheet, sunnah chips, explainers, deeds rows.
   All visible text comes from strings.js / glossary.js; Home-only labels are strings.HOME_X (exported as X). */
import { S, UI, A, $, NOW, todayKey, onRender, commit, render, toast, openSheet, closeSheet, go } from "../app.js";
import * as store from "../store.js";
import { PRAYERS, DOW, MON, fmt12, dkey, parseKey, addDays, esc } from "../util.js";
import { timesFor, currentWindow, nextPrayer, windowEnd, ishaBestBefore, madeUpDeadline, canStillMakeUp, startedPrayers, weekIndex, METHOD_SHORT, FALLBACK_LOCATION } from "../times.js";
import { hijriLabel } from "../hijri.js";
import * as st from "../stats.js";
import { isOn, toolVisible } from "../features.js";
import { madhhabOf, tierLabel, TIERS } from "../rules/madhhab.js";
import { thisWeek, pastSahabi, setSahabiStart, monthIndex, contentReady, loadContent } from "../content.js";
import { gloss } from "../glossary.js";
import * as T from "../strings.js";
import { HOME_X } from "../strings.js";

const { APP, COMMON, STATUS, STATUS_EXTRA, HOME, TIMES, LOG, DEEDS, DEED_NAME, EXCUSED, SUNNAH_UI, TIER, MEASURE, NOTIFY, WEEK_UI, WEEK_LETTERS_SUN, prayerName } = T;
export { STATUS };

/* Home-only labels (strings.js HOME_X). */
export const X = HOME_X;

/* ---------- tiny helpers ---------- */
/** Prefix every class in a fragment so nothing collides with the shared stylesheet. */
export const zz = html => html.replace(/class="([^"]*)"/g, (_, c) => `class="${c.split(/\s+/).filter(Boolean).map(x => "z-" + x).join(" ")}"`);
const I = {
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', dcheck: '<path d="M2.5 12.8l4.2 4.2L15 8.5"/><path d="M11.2 16.4l.6.6L20 8.5"/>',
  dash: '<path d="M7 12h10"/>', madeup: '<path d="M4.5 12a7.5 7.5 0 1 0 2.3-5.4"/><path d="M4.2 4.2v4.6h4.6"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  chev: '<path d="M9 6l6 6-6 6"/>', chevL: '<path d="M15 6l-6 6 6 6"/>', dots: '<circle cx="5.5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18.5" cy="12" r="1.2"/>',
  people: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2a5 5 0 0 1 5.5 5.8"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>', history: '<path d="M3.5 12a8.5 8.5 0 1 0 2.5-6"/><path d="M3 4v4.5h4.5"/><path d="M12 8v4.5l3 1.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.2"/>', plus: '<path d="M12 5v14M5 12h14"/>',
  cal: '<rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
};
export const ic = (n, cls = "i", extra = "") => `<svg class="${cls}" viewBox="0 0 24 24" ${extra} aria-hidden="true">${I[n]}</svg>`;
const star8 = (cx, cy, R, r) => { const p = []; for (let k = 0; k < 16; k++) { const a = (-90 + k * 22.5) * Math.PI / 180, rad = k % 2 ? r : R; p.push((cx + rad * Math.cos(a)).toFixed(2) + "," + (cy + rad * Math.sin(a)).toFixed(2)); } return p.join(" "); };
const starSvg = size => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><polygon points="${star8(12, 12, 11.5, 6.6)}" fill="#0F3D2E"/></svg>`;

const SK = { congregation: "c", ontime: "o", madeup: "r", missed: "m", excused: "x" };
const SICON = { c: "dcheck", o: "check", r: "madeup", m: "dash", x: "moon" };
const sk = s => SK[s] || "";
const settings = () => S.settings;
const jumuahOn = () => S.settings.jumuah !== false;
export const pName = (p, key = todayKey()) => prayerName(p, { date: parseKey(key), jumuah: jumuahOn() });
const longDate = d => new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(d);
const fmtHM = ms => { const m = Math.max(0, Math.round(ms / 60000)); return TIMES.hm(Math.floor(m / 60), m % 60); };
const clone = o => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));
const marker = s => SICON[sk(s)] ? `<span class="mk ${sk(s)}">${ic(SICON[sk(s)], "")}</span>` : `<span class="mk"></span>`;
const pill = s => `<span class="pill ${sk(s)}">${STATUS[s]}</span>`;
const tierCls = t => (t === "ghayr" ? "gm" : t === "nafl" ? "nf" : "mu");

export function dayLabel(key) {
  if (key === todayKey()) return "";
  if (key === dkey(addDays(NOW(), -1))) return LOG.yesterdayPrefix;
  const d = parseKey(key);
  return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()].slice(0, 3)} · `;
}

/* ---------- undo: snapshot the parts of S a change can touch ---------- */
export function snapshot(keys) {
  const ks = [].concat(keys);
  return { days: ks.map(k => [k, clone(S.days[k])]), qada: clone(S.qada), created: S.createdKey, excusedMode: clone(S.excusedMode) };
}
export function restore(snap) {
  for (const [k, d] of snap.days) {
    if (d === undefined) S.days[k] = { prayers: {}, amal: {}, note: "", u: Date.now() };
    else { S.days[k] = d; d.u = Date.now(); }
  }
  S.qada = snap.qada; S.createdKey = snap.created; S.excusedMode = snap.excusedMode;
  commit();
}
const undoable = snap => ({ undo: () => restore(snap) });

/* ---------- explainer (the small "?" / ⓘ next to an Arabic term) ---------- */
export const xi = id => `<button type="button" class="xi" data-gl="${id}" aria-label="${esc(COMMON.whatDoesThisMean)}">${ic("info", "i")}</button>`;
A.explain = id => {
  const g = gloss(id); if (!g) return;
  openSheet(zz(`<div class="sh xs"><div class="lhd"><div><h3>${esc(g.term)}</h3>${g.ar ? `<div class="ar">${g.ar}</div>` : ""}</div><button class="cls" onclick="A.closeSheet()" aria-label="${COMMON.close}">${ic("close")}</button></div>
    <p class="m">${esc(g.meaning)}</p>${g.draft ? `<div class="dr">${APP.draftFlag}</div>` : ""}
    <div class="shfoot"><button class="pbtn" onclick="A.closeSheet()">${COMMON.gotIt}</button></div></div>`));
};

/* ---------- live sheets: a sheet that redraws itself after a change ---------- */
let live = null, liveId = 0;
export function showSheet(builder) {
  live = { id: ++liveId, builder };
  openSheet(`<div data-live="${live.id}">${zz(builder())}</div>`);
}
function refreshLive() {
  if (!live) return;
  const el = $("#sheet [data-live]");
  if (!$("#scrim").classList.contains("on") || !el || +el.dataset.live !== live.id) { live = null; return; }
  openSheet(`<div data-live="${live.id}">${zz(live.builder())}</div>`);
}

/* ---------- sunnah chips ---------- */
const sunnahOn = () => isOn(S, "sunnah");
function witrShown(key) {
  const w = store.witrChip(S, key);
  return w.allowed && (w.inQada || sunnahOn()) ? w : null;
}
export function chipHTML(c, key, { hero = false } = {}) {
  const done = store.sunnahDone(S, key, c.id);
  return `<button type="button" class="sc ${tierCls(c.tier)} ${done ? "d" : ""} ${hero ? "h" : ""}" data-chip="${c.id}" data-key="${key}" aria-pressed="${done}">${done ? ic("check", "") : '<i class="o"></i>'}${esc(c.label)}</button>`;
}
export function witrChipHTML(w, key, { hero = false } = {}) {
  return `<button type="button" class="sc wj ${w.done ? "d" : ""} ${hero ? "h" : ""}" data-witr="1" data-key="${key}" aria-pressed="${w.done}">${w.done ? ic("check", "") : '<i class="o"></i>'}${esc(w.chip)}<em>${esc(w.tag)}</em></button>`;
}
/** All chips of one fard on one day (sunnah by tier, plus Witr on ʿIshāʾ). */
export function chipsFor(p, key, opts = {}) {
  const out = [];
  if (sunnahOn()) for (const c of store.sunnahChips(S, key, p)) out.push(chipHTML(c, key, opts));
  if (p === "Isha") { const w = witrShown(key); if (w) out.push(witrChipHTML(w, key, opts)); }
  return out;
}
export const chipLegend = () => `<div class="slg"><span><i class="lmu"></i>${TIER.muakkadah.name}${xi("sunnahMuakkadah")}</span><span><i class="lgm"></i>${TIER.ghayr.short}${xi("ghayrMuakkadah")}</span><span><i class="lwj"></i>${T.WITR_UI.rowLabel[madhhabOf(S)] || "Witr"}${xi("witr")}</span></div>`;

function toggleChip(el) {
  const key = el.dataset.key;
  if (el.dataset.witr) {
    const w = store.witrChip(S, key);
    store.setWitr(S, key, w.status === "done" ? null : "done", NOW());
    commit(); return;
  }
  const id = el.dataset.chip;
  const was = store.sunnahDone(S, key, id);
  if (!store.setSunnah(S, key, id, !was)) { toast(SUNNAH_UI.notAfterMissed); return; }
  commit();
}

A.chipInfo = (id, key, witr) => {
  let tier, title, text, gl;
  if (witr) {
    const w = store.witrChip(S, key); tier = w.tier || "wajib";
    title = T.WITR_UI.title(w.rakahs); text = w.line; gl = gloss("witr");
  } else {
    const c = allChips(key).find(x => x.id === id);
    if (!c) return;
    tier = c.tier;
    title = `${SUNNAH_UI.rakahs(c.rakahs)} ${c.when === "before" ? "before" : "after"}`;
    gl = gloss(TIERS[tier]?.glossary);
    text = gl?.meaning || "";
    title = c.prayer === "day" ? c.label : `${title} ${pName(c.prayer, key)}`;
  }
  const tl = tierLabel(tier);
  const rows = [["fd", TIER.fard], ["wj", TIER.wajib], ["mu", TIER.muakkadah], ["gm", TIER.ghayr], ["nf", TIER.nafl]];
  const here = witr ? "wj" : tierCls(tier);
  showSheet(() => `<div class="sh"><span class="kick">${esc(tl.name)} · ${esc(tl.gloss || "")}</span>
    <div class="lhd"><h3 style="margin-top:6px">${esc(title)}</h3><button class="cls" onclick="A.closeSheet()" aria-label="${COMMON.close}">${ic("close")}</button></div>
    <p class="ip">${esc(text)}</p>
    <div class="tiers">${rows.map(([k, t]) => `<div class="tier ${k === here ? "on" : ""}"><i class="${k}"></i><div><b>${esc(t.name)} <span>· ${esc(t.gloss)}</span></b><small>${esc(t.line)}</small></div></div>`).join("")}</div>
    ${gl?.draft ? `<p class="fine">${APP.draftFlag}</p>` : ""}
    <div class="shfoot">${tier === "ghayr" ? `<button class="gbtn" onclick="A.hideGhayr()">${SUNNAH_UI.hideGhayr}</button>` : ""}<button class="pbtn" onclick="A.closeSheet()">${COMMON.gotIt}</button></div></div>`);
};
const allChips = key => PRAYERS.flatMap(p => store.sunnahChips(S, key, p, { all: true })).concat(store.sunnahChips(S, key, "day", { all: true }));
A.hideGhayr = () => { S.settings.sunnahGhayr = false; closeSheet(); commit(); };

/* one delegated handler for chips (tap) and explainers; long-press on a chip opens its tier sheet */
let pressTimer = null, pressed = false;
document.addEventListener("pointerdown", e => {
  const el = e.target.closest?.("[data-chip],[data-witr]"); if (!el) return;
  pressed = false; clearTimeout(pressTimer);
  pressTimer = setTimeout(() => { pressed = true; A.chipInfo(el.dataset.chip, el.dataset.key, !!el.dataset.witr); }, 480);
});
for (const ev of ["pointerup", "pointercancel", "pointerleave", "scroll"]) document.addEventListener(ev, () => clearTimeout(pressTimer), true);
document.addEventListener("contextmenu", e => { if (e.target.closest?.("[data-chip],[data-witr]")) e.preventDefault(); });
document.addEventListener("click", e => {
  const x = e.target.closest?.("[data-gl]");
  if (x) { e.stopPropagation(); e.preventDefault(); A.explain(x.dataset.gl); return; }
  const el = e.target.closest?.("[data-chip],[data-witr]"); if (!el) return;
  e.stopPropagation(); e.preventDefault();
  if (pressed) { pressed = false; return; }
  toggleChip(el);
}, true);

/* ---------- logging a prayer ---------- */
export function applyStatus(p, key, status, { close = true } = {}) {
  const snap = snapshot(key);
  if (key < S.createdKey) S.createdKey = key; // backfilling an earlier day extends the tracked range
  const was = store.setPrayer(S, key, p, status, NOW());
  if (close) closeSheet();
  commit();
  const n = pName(p, key);
  let msg;
  if (status === "missed") msg = LOG.missedToast(n);
  else if (was === "missed" && status === "madeup") msg = LOG.madeUpToast(n);
  else if (was === "missed") msg = LOG.removedToast(n, status ? STATUS[status] : null);
  else if (status === "excused") msg = LOG.excusedToast(n);
  else if (!status) msg = LOG.setToast(n, COMMON.clear.toLowerCase());
  else msg = LOG.setToast(n, STATUS[status]);
  toast(msg, undoable(snap));
}
A.setPrayer = (p, k, key = todayKey()) => applyStatus(p, key, k || null);
A.madeItUp = (p, key = todayKey()) => applyStatus(p, key, "madeup", { close: false });

A.excusedToday = (key = todayKey()) => {
  const snap = snapshot(key);
  const on = !store.isExcusedDay(S, key);
  store.setExcusedDay(S, key, on, NOW());
  closeSheet(); commit();
  toast(on ? EXCUSED.today : X.notExcused, undoable(snap));
};

const madeUpOffered = (p, key, cur) => cur === "madeup" || NOW() < madeUpDeadline(parseKey(key), settings());

A.prayerSheet = (p, key = todayKey()) => showSheet(() => {
  const d = parseKey(key), day = store.getDay(S, key), cur = store.prayerStatus(S, key, p);
  const t = timesFor(d, settings())[p], end = windowEnd(d, p, settings());
  let sub = `${dayLabel(key)}${fmt12(t)}`;
  if (cur === "madeup" && day.at?.[p]) sub += ` · ${HOME.madeUpAt(fmt12(new Date(day.at[p])))}`;
  else if (cur === "missed" || NOW() >= end) sub += ` · ${HOME.endedAt(fmt12(end))}`;
  const best = p === "Isha" ? TIMES.bestBefore(fmt12(ishaBestBefore(d, settings()))) : "";
  const opts = ["congregation", "ontime", "madeup", "missed"];
  const excOn = S.settings.excusedDays !== false;
  const tile = k => {
    const off = k === "madeup" && !madeUpOffered(p, key, cur);
    return `<button class="st ${cur === k ? "sel" : ""} ${k === "excused" ? "wide" : ""}" ${off ? "disabled" : ""} aria-pressed="${cur === k}" onclick="A.setPrayer('${p}','${k}','${key}')"><span class="mk ${sk(k)}">${ic(SICON[sk(k)], "")}</span><span><b>${STATUS[k]}</b><small>${T.STATUS_HELP[k]}</small></span></button>`;
  };
  const chips = sunnahOn() ? store.sunnahChips(S, key, p) : [];
  const w = p === "Isha" ? witrShown(key) : null;
  let body = "";
  if (sunnahOn() && (cur === "missed")) body += `<div class="note">${SUNNAH_UI.notAfterMissed}</div>`;
  else {
    if (chips.length) body += `<div class="lsec">${SUNNAH_UI.withPrayer(pName(p, key))}${xi("sunnah")}</div>` + chips.map(c => {
      const done = store.sunnahDone(S, key, c.id);
      const tl = tierLabel(c.tier);
      return `<div class="srow" role="button" tabindex="0" data-chip="${c.id}" data-key="${key}"><span class="sc ${tierCls(c.tier)} ${done ? "d" : ""}">${done ? ic("check", "") : '<i class="o"></i>'}${esc(c.label)}</span><div class="t"><b>${esc(tl.name)}</b><small>${esc(tl.gloss || "")}</small></div><span class="tg ${done ? "on" : ""}"></span></div>`;
    }).join("");
    if (w) body += `<div class="lsec">${esc(w.tag.charAt(0).toUpperCase() + w.tag.slice(1))}${xi("witr")}</div><div class="srow" role="button" tabindex="0" data-witr="1" data-key="${key}"><span class="sc wj ${w.done ? "d" : ""}">${w.done ? ic("check", "") : '<i class="o"></i>'}${esc(w.chip)}<em>${esc(w.tag)}</em></span><div class="t"><b>${T.WITR_UI.title(w.rakahs)}</b><small>${esc(w.line)}</small></div><span class="tg ${w.done ? "on" : ""}"></span></div>`;
    if (sunnahOn() && p === "Isha" && !S.settings.sunnahNafl) body += `<div class="nfl">${ic("plus")}<span>${SUNNAH_UI.naflHidden} <b role="button" tabindex="0" onclick="A.closeSheet();A.go('settings')">${SUNNAH_UI.turnOnInSettings}</b></span></div>`;
  }
  const dayEx = store.isExcusedDay(S, key);
  return `<div class="sh"><div class="lhd"><div><h3>${esc(pName(p, key))}</h3><p class="sub">${esc(longDate(d))} · ${esc(sub)}${best ? `<br>${esc(best)}` : ""}</p></div><button class="cls" onclick="A.closeSheet()" aria-label="${COMMON.close}">${ic("close")}</button></div>
    <div class="sgrid">${opts.map(tile).join("")}${excOn ? tile("excused") : ""}</div>
    ${cur ? `<p class="fine"><button class="link" onclick="A.setPrayer('${p}',null,'${key}')" style="font-weight:700;color:var(--z-ink2)">${COMMON.clear}</button></p>` : ""}
    ${body}
    <div class="shfoot">${excOn ? `<button class="exbtn" onclick="A.excusedToday('${key}')">${ic("moon")}${dayEx ? X.notExcused : EXCUSED.todayBtn}</button>` : ""}<button class="pbtn" onclick="A.closeSheet()">${COMMON.done}</button></div></div>`;
});

/* ---------- good deeds ---------- */
export const amalById = (id, key = todayKey()) => store.amalForDay(S, key).find(a => a.id === id) || S.amalList.find(a => a.id === id);

export function amalHint(a, key = todayKey()) {
  if (a.id === "quran" || a.detail === "quran") return S.lastQuran ? DEEDS.lastStopped(S.lastQuran) : DEEDS.logWhere;
  if (a.detail === "count") {
    const y = store.getDay(S, dkey(addDays(parseKey(key), -1))).amal[a.id];
    return y?.done && y.detail ? DEEDS.yesterdayCount(parseInt(y.detail) || y.detail) : DEEDS.tapCount;
  }
  return a.hint || (a.builtin ? "" : DEEDS.addedByYou);
}

A.tapAmal = (id, key = todayKey()) => {
  const a = amalById(id, key);
  const st0 = store.getDay(S, key).amal[id];
  const snap = snapshot(key);
  if (key < S.createdKey) S.createdKey = key;
  if (st0?.done) {
    store.setAmal(S, key, id, false);
    if (a.detail === "quran") S.lastQuran = store.lastDetail(S, id, null)?.detail.split(" · ")[0] || "";
    commit(); toast(DEEDS.unchecked, undoable(snap)); return;
  }
  store.setAmal(S, key, id, true, "");
  commit();
  if (a.detail === "none") toast(DEEDS.doneToast(a.name), undoable(snap));
  else A.detailSheet(id, key);
};

A.detailSheet = (id, key = todayKey()) => {
  const a = amalById(id, key);
  const d = store.getDay(S, key).amal[id]?.detail || "";
  let body = "";
  if (a.detail === "quran") {
    const [pos, pages] = d.split(" · ");
    const pre = pos || (S.settings.carryQuran ? S.lastQuran : "");
    body = `<div class="field"><label>${DEEDS.whereStop}</label><input id="dIn" value="${esc(pre)}" placeholder="${esc(DEEDS.wherePlaceholder)}"></div><div class="field"><label>${DEEDS.pagesRead}</label><input id="dIn2" value="${esc(parseInt(pages) || "")}" placeholder="${COMMON.optional}" inputmode="numeric"></div>`;
  } else if (a.detail === "count") {
    const last = store.lastDetail(S, id, key);
    const n = parseInt(d) || parseInt(last?.detail) || 100;
    body = `<div class="field"><label>${DEEDS.howMany}</label><div class="stp"><button onclick="A.step(-10)" aria-label="${DEEDS.tenFewer}">−</button><input id="cnt" type="number" inputmode="numeric" min="0" value="${n}"><button onclick="A.step(10)" aria-label="${DEEDS.tenMore}">+</button></div></div>`;
  } else {
    body = `<div class="field"><label>${DEEDS.anyNote}</label><textarea id="dIn" placeholder="${COMMON.optional}">${esc(d)}</textarea></div>`;
  }
  openSheet(zz(`<div class="sh"><h3>${esc(a.name)} <span style="color:var(--z-leaf);font-size:18px">✓</span></h3><p class="sub">${DEEDS.detailLead}</p>${body}
  <div class="shfoot"><button class="gbtn" onclick="A.closeSheet()">${COMMON.skip}</button><button class="pbtn" onclick="A.saveDetail('${id}','${key}')">${DEEDS.saveDetail}</button></div></div>`));
};
A.step = n => { const c = $("#cnt"); c.value = Math.max(0, (parseInt(c.value) || 0) + n); };
A.saveDetail = (id, key) => {
  const a = amalById(id, key);
  let v = "";
  if (a.detail === "count") v = `${Math.max(0, parseInt($("#cnt").value) || 0)} ${a.id === "salawat" ? DEEDS.salawatUnit : ""}`.trim();
  else if (a.detail === "quran") {
    const pos = $("#dIn").value.trim(), pages = $("#dIn2").value.trim();
    v = pos + (pages ? DEEDS.pagesSuffix(pages) : "");
  } else v = $("#dIn").value.trim();
  store.setAmal(S, key, id, true, v);
  if (a.detail === "quran") S.lastQuran = store.lastDetail(S, id, null)?.detail.split(" · ")[0] || "";
  closeSheet(); commit(); toast(DEEDS.saved);
};
A.addAmal = () => openSheet(zz(`<div class="sh"><h3>${DEEDS.addTitle}</h3><p class="sub">${DEEDS.addLead}</p>
  <div class="field"><label>${DEEDS.name}</label><input id="nIn" placeholder="${esc(DEEDS.namePlaceholder)}"></div>
  <div class="field"><label>${DEEDS.whenCheck}</label><select id="nType"><option value="none">${DEEDS.typeNone}</option><option value="note">${DEEDS.typeNote}</option><option value="count">${DEEDS.typeCount}</option></select></div>
  <div class="shfoot"><button class="gbtn" onclick="A.closeSheet()">${COMMON.cancel}</button><button class="pbtn" onclick="A.saveAmal()">${DEEDS.addToList}</button></div></div>`));
A.saveAmal = () => {
  const n = $("#nIn").value.trim(); if (!n) return;
  S.amalList.push({ id: "c" + Date.now(), name: n, hint: DEEDS.addedByYou, detail: $("#nType").value });
  closeSheet(); commit(); toast(DEEDS.added);
};

export function amalRow(a, key, { hint, read = false } = {}) {
  const s0 = store.getDay(S, key).amal[a.id] || {};
  const past = key < todayKey();
  const cls = s0.done ? "done" : "";
  const sub = s0.done ? esc(s0.detail || DEEDS.doneWord) : hint ?? (past ? DEEDS.notDone : DEEDS.notYet);
  return `<div class="row ${cls}"><button class="mk a ${s0.done ? "done" : ""}" aria-label="${esc(DEEDS.markAria(!!s0.done, a.name))}" aria-pressed="${!!s0.done}" onclick="A.tapAmal('${a.id}','${key}')">${ic("check", "")}</button><div class="t" role="button" tabindex="0" onclick="A.tapAmal('${a.id}','${key}')"><b>${esc(a.name)}</b><small>${sub}</small></div>${s0.done && a.detail !== "none" ? `<button class="link" onclick="A.detailSheet('${a.id}','${key}')">${s0.detail ? COMMON.edit : DEEDS.addDetail}</button>` : read && !s0.done ? `<!--zread:${a.id}-->` : "<span></span>"}</div>`;
}
export function deedsCard(key, { hintFor = true, read = false } = {}) {
  const list = store.amalForDay(S, key);
  return list.length ? list.map(a => amalRow(a, key, { ...(hintFor ? { hint: esc(amalHint(a, key)) } : {}), read })).join("") : `<div class="empty">${DEEDS.empty}</div>`;
}

/* ---------- Home ---------- */
const toolMods = import.meta.glob("./tools/index.js", { eager: true });
const toolsHomeCards = () => Object.values(toolMods)[0]?.toolsHomeCards;
const toolsAmalRead = () => Object.values(toolMods)[0]?.toolsAmalRead;
/** AH1: swap the row placeholders for the Tools "Read" buttons (after zz, so the tl- classes stay unprefixed). */
function withRead(html, now) {
  const f = isOn(S, "tools") ? toolsAmalRead() : null;
  const asr = timesFor(now, S.settings).Asr;
  return html.replace(/<!--zread:([A-Za-z0-9_-]+)-->/g, (_, id) => {
    if (!f || (id === "evening" && now < asr)) return "<span></span>";
    try { return f(id) || "<span></span>"; } catch (e) { return "<span></span>"; }
  });
}

const PATTERN = `<svg class="pattern" aria-hidden="true"><defs><pattern id="zst" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M30 2 L36 24 L58 30 L36 36 L30 58 L24 36 L2 30 L24 24 Z" fill="none" stroke="#E5C55C" stroke-width="1"/><path d="M13 13 L47 13 L47 47 L13 47 Z" fill="none" stroke="#E5C55C" stroke-width=".6" transform="rotate(45 30 30)"/></pattern></defs><rect width="100%" height="100%" fill="url(#zst)"/></svg>`;
const WSK = { congregation: "c", ontime: "o", madeup: "r", missed: "m", excused: "x", unlogged: "u", future: "f" };

function weekBlock(now) {
  const series = st.weekSeries(S, now, 0, { settings: S.settings });
  const ti = weekIndex(now);
  let prayed = 0, due = 0;
  const cols = series.map((d, i) => {
    prayed += d.prayed; due += d.due;
    return `<div class="d ${i === ti ? "t" : ""}"><div class="bars">${PRAYERS.map(p => `<i class="${d.statuses[p] === null ? "n" : WSK[d.statuses[p]] || "f"}"></i>`).join("")}</div><span>${WEEK_LETTERS_SUN[i]}</span></div>`;
  }).join("");
  const inner = `<div class="week"><span class="lbl">${HOME.thisWeek}</span><div class="stk">${cols}</div><strong>${HOME.prayedOf(prayed, due)}<small>${HOME.prayedWord}</small></strong></div>`;
  const label = `${HOME.thisWeek}: ${prayed} of ${due} ${HOME.prayedWord}`;
  return isOn(S, "progress")
    ? `<button class="weekLink" aria-label="${esc(label)}" onclick="A.openWeek()">${inner}<span class="wchev">${ic("chev")}</span></button>`
    : `<div class="weekLink" role="img" aria-label="${esc(label)}">${inner}</div>`;
}
A.openWeek = () => { UI.range = "week"; go("progress"); };

/** "Adhkar after Salah" link, shown once the current prayer is logged as prayed (needs the Adhkar tool visible). */
function afterSalahLink(p, k, status) {
  if (!p || !status || !["congregation", "ontime", "madeup"].includes(status) || !toolVisible(S, "afterSalah")) return "";
  return `<button class="asl" onclick="A.openAfterSalah?.('${p}')">${esc(WEEK_UI.afterSalah)}${ic("chev", "")}</button>`;
}
function heroBlock(now, key, day) {
  const st0 = S.settings, T0 = timesFor(now, st0);
  const cur = currentWindow(now, st0);
  const curKey = cur ? dkey(cur.date) : null;
  const curStatus = cur ? store.prayerStatus(S, curKey, cur.p) : null;
  const allFive = PRAYERS.every(p => store.isPrayed(store.prayerStatus(S, key, p)));
  // The name goes on its own second line under the salām (user, 14 Nov 2026)
  const greet = S.profile.name ? `${HOME.greetingLine1}<span class="greetName">${esc(S.profile.name)}</span>` : HOME.greeting;
  let card = "";
  if (day.excused) {
    const mode = S.excusedMode;
    card = `<div class="exchip"><span class="mo">${ic("moon")}</span><div class="tx">${mode ? EXCUSED.modeOn : EXCUSED.today}<small>${mode ? EXCUSED.modeOnSub : EXCUSED.foot}</small></div>${mode ? `<button class="obtn sm" onclick="A.endExcusedMode()">${EXCUSED.end}</button>` : ""}</div>`;
  } else if (allFive) {
    const n = st.streaks(S, now).all.cur;
    card = `<div class="celebA"><span class="st">${starSvg(30)}</span><div><b>${X.celebTitle}</b><small>${n > 1 ? X.celebSub(n) : COMMON.alhamdulillah}</small></div></div>${afterSalahLink(cur?.p, curKey, curStatus)}`;
  } else if (cur && !curStatus) {
    const p = cur.p, name = pName(p, curKey);
    const start = timesFor(cur.date, st0)[p];
    const best = p === "Isha" ? ishaBestBefore(cur.date, st0) : null;
    const target = best && now < best ? best : cur.end;
    const total = target - start, elapsed = now - start;
    const chips = chipsFor(p, curKey, { hero: true });
    const sub = best ? (now < best ? TIMES.bestBefore(`<b>${fmt12(best)}</b>`) : X.pastMiddle) : X.endsAt(fmt12(cur.end));
    const cdSmall = best ? (now < best ? TIMES.toMiddle : X.toFajr) : X.leftInTime;
    card = `<div class="nowB"><div class="nbTop"><span class="tag">${curKey === key ? COMMON.now : X.lastNight}</span><span class="ends">${fmt12(start)} – ${fmt12(cur.end)}</span></div>
      <div class="nbMain"><div><div class="pn">${esc(name)}</div><div class="pt">${sub}</div></div><div class="cd"><b>${fmtHM(target - now)}</b><small>${cdSmall}</small></div></div>
      <div class="bar" aria-hidden="true"><i style="width:${Math.max(3, Math.min(100, Math.round(elapsed / total * 100)))}%"></i></div>
      ${chips.length ? `<div class="nbsn"><span class="lb">${X.withP(esc(name))}</span><div class="scs">${chips.join("")}</div></div>` : ""}
      <div class="nbBtns"><button class="hbtn big" onclick="A.setPrayer('${p}','ontime','${curKey}')">${ic("check", "")}${STATUS_EXTRA.prayed}</button><button class="obtn big" onclick="A.setPrayer('${p}','congregation','${curKey}')">${ic("people", "")}${STATUS.congregation}</button><button class="obtn sq" aria-label="${COMMON.edit}" onclick="A.prayerSheet('${p}','${curKey}')">${ic("dots", "")}</button></div></div>`;
  } else {
    const nx = nextPrayer(now, st0), name = pName(nx.p, nx.tomorrow ? dkey(addDays(now, 1)) : key);
    const chips = cur && curStatus ? chipsFor(cur.p, curKey, { hero: true }) : [];
    card = `<div class="nowB"><div class="nbTop"><span class="tag ok">${X.next}</span><span></span></div>
      <div class="nbMain"><div><div class="pn">${esc(name)}</div><div class="pt"><b>${fmt12(nx.time)}</b>${nx.tomorrow ? " " + COMMON.tomorrow : ""}</div></div><div class="cd"><b>${fmtHM(nx.time - now)}</b><small>${X.untilStarts}</small></div></div>
      ${chips.length ? `<div class="nbsn"><span class="lb">${X.withP(esc(pName(cur.p, curKey)))}</span><div class="scs">${chips.join("")}</div></div>` : ""}${afterSalahLink(cur?.p, curKey, curStatus)}</div>`;
  }
  return `<div class="hero">${PATTERN}<div class="topbar"><div class="brand"><img class="logo" src="logo/zad-symbol.png" srcset="logo/zad-symbol.png 1x, logo/zad-symbol@2x.png 2x" width="37" height="46" alt="${APP.name}"><div><div class="date">${DOW[now.getDay()]}, ${now.getDate()} ${MON[now.getMonth()]}</div><div class="hijri">${hijriLabel(now)}</div></div></div>
    <button class="ibtn" aria-label="${T.NAV.settings}" onclick="A.go('settings')">${ic("gear")}</button></div>
    <div class="greetB">${greet}</div>${card}${weekBlock(now)}</div>`;
}
A.endExcusedMode = () => {
  const now = NOW(), key = todayKey();
  const snap = snapshot(key);
  const cur = currentWindow(now, S.settings);
  const prayers = startedPrayers(now, now, S.settings).filter(p => !(cur && dkey(cur.date) === key && cur.p === p));
  store.endExcused(S, key, { excusedPrayers: prayers }, now);
  commit(); toast(EXCUSED.end, undoable(snap));
};

function attnCards(now, key) {
  if (!isOn(S, "makeups")) return "";
  const out = [];
  for (const k of [dkey(addDays(now, -1)), key]) {
    const d = parseKey(k);
    for (const p of PRAYERS) {
      if (store.prayerStatus(S, k, p) !== "missed" || !canStillMakeUp(d, p, now, S.settings)) continue;
      out.push(`<div class="attn"><span class="mk m">${ic("dash", "")}</span><div><b>${esc(X.wasMissed(pName(p, k)))}</b><small>${esc(X.comesOff())}</small></div><button class="ubtn" onclick="A.madeItUp('${p}','${k}')">${ic("madeup", "")}${HOME.madeItUp}</button></div>`);
    }
  }
  return out.slice(0, 2).join("");
}

function metersBlock(key, day) {
  const sts = PRAYERS.map(p => store.prayerStatus(S, key, p));
  const prayed = sts.filter(store.isPrayed).length;
  const excusedAll = day.excused && !sts.some(store.isPrayed);
  const ms = [];
  ms.push(`<button class="mt" onclick="A.todaySheet()" aria-label="${esc(HOME.salahToday)}, ${esc(HOME.nOfFivePrayed(prayed))}"><small>${HOME.salahToday}${ic("chev", "i mchev")}</small><div class="mv"><b>${excusedAll ? "–" : prayed}</b>${excusedAll ? "" : "/5"}</div><div class="seg">${sts.map(s => `<i class="${sk(s) || "f"}"></i>`).join("")}</div></button>`);
  if (sunnahOn()) {
    const m = st.sunnahMeasureDay(S, key);
    const label = m.kind === "rakahs" ? TIER.muakkadah.name : MEASURE.raghibahWitr;
    const pips = 6, on = m.of ? Math.round(m.got / m.of * pips) : 0;
    ms.push(`<div class="mt"><small>${label}</small><div class="mv"><b>${m.excused ? "–" : m.got}</b>${m.excused ? "" : `/${m.of}`}</div><div class="seg s">${Array.from({ length: pips }, (_, i) => `<i class="${i < on ? "on" : ""}"></i>`).join("")}</div></div>`);
  }
  if (isOn(S, "deeds")) {
    const list = store.amalForDay(S, key), done = list.filter(a => day.amal[a.id]?.done).length, n = Math.min(list.length, 7);
    ms.push(`<div class="mt"><small>${DEEDS.title}</small><div class="mv"><b>${done}</b>/${list.length}</div><div class="seg a">${Array.from({ length: n }, (_, i) => `<i class="${i < Math.round(done / (list.length || 1) * n) ? "on" : ""}"></i>`).join("")}</div></div>`);
  }
  return `<div class="meters">${ms.join("")}</div>`;
}

/* ----- today's prayers sheet ----- */
function todayTile(p, key, now) {
  const d = parseKey(key), s0 = store.prayerStatus(S, key, p), day = store.getDay(S, key);
  const t = timesFor(d, S.settings)[p], end = windowEnd(d, p, S.settings);
  const cur = currentWindow(now, S.settings), open = cur && cur.p === p && dkey(cur.date) === key;
  let sub = fmt12(t), cls = s0 ? sk(s0) : "", right;
  if (s0 === "madeup" && day.at?.[p]) sub += ` · ${HOME.madeUpAt(fmt12(new Date(day.at[p])))}`;
  else if (s0 === "missed" || (!s0 && now >= end)) sub += ` · ${HOME.endedAt(fmt12(end))}`;
  if (open && !s0) { sub += ` · ${COMMON.now}`; cls = "now"; right = `<span class="pill nowp">${STATUS_EXTRA.openNow}</span>`; }
  else if (s0) right = pill(s0);
  else right = `<span class="pill">${now < t ? X.later : STATUS_EXTRA.tapToLog}</span>`;
  const chips = s0 === "missed" || s0 === "excused" ? [] : chipsFor(p, key);
  let ext = chips.length ? `<div class="scs">${chips.join("")}</div>` : "";
  if (s0 === "missed" && isOn(S, "makeups") && canStillMakeUp(d, p, now, S.settings))
    ext = `<div class="mkup"><span>${HOME.stillTime}</span><button class="ubtn" onclick="event.stopPropagation();A.madeItUp('${p}','${key}')">${ic("madeup", "")}${HOME.madeItUp}</button></div>`;
  return `<div class="tt ${cls}" role="button" tabindex="0" onclick="A.prayerSheet('${p}','${key}')">${marker(open && !s0 ? "" : s0)}<div class="t"><b>${esc(pName(p, key))}</b><small>${esc(sub)}</small></div>${right}${ic("chev", "i tchev")}${ext ? `<div class="ext">${ext}</div>` : ""}</div>`;
}
A.todaySheet = () => showSheet(() => {
  const now = NOW(), key = todayKey();
  const prayed = PRAYERS.filter(p => store.isPrayed(store.prayerStatus(S, key, p))).length;
  return `<div class="sh"><div class="lhd"><div><h3>${HOME.todaysPrayers}</h3><p class="sub">${esc(longDate(now))} · <b>${prayed} of 5</b> ${HOME.prayedWord}</p></div><button class="cls" onclick="A.closeSheet()" aria-label="${COMMON.close}">${ic("close")}</button></div>
    <div class="tlist">${PRAYERS.map(p => todayTile(p, key, now)).join("")}</div>${sunnahOn() ? chipLegend() : ""}<p class="foot" style="margin-top:8px">${HOME.tapToChange}</p></div>`;
});

/* ----- catch up on yesterday (CU2) ----- */
let cu = { sel: {} };
function yesterdayUnlogged(now) {
  const yk = dkey(addDays(now, -1)), y = parseKey(yk);
  if (!st.tracked(S, y, now)) return [];
  const cur = currentWindow(now, S.settings);
  return PRAYERS.filter(p => !store.prayerStatus(S, yk, p) && !(cur && cur.p === p && dkey(cur.date) === yk));
}
function catchBlock(now) {
  const list = yesterdayUnlogged(now);
  if (!list.length) return "";
  const names = list.map(p => pName(p, dkey(addDays(now, -1))));
  const line = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0];
  return `<button class="catch" onclick="A.catchSheet()"><span class="ic">${ic("history")}</span><div class="t"><b>${LOG.catchUpTitle}</b><small>${esc(LOG.notLoggedList(line))}</small></div><span class="link">${LOG.review}${ic("chev")}</span></button>`;
}
A.catchSheet = () => { cu = { sel: {} }; showSheet(catchHTML); };
function catchHTML() {
  const now = NOW(), yk = dkey(addDays(now, -1)), y = parseKey(yk), list = yesterdayUnlogged(now);
  const segs = [["congregation", "dcheck", "kc"], ["ontime", "check", ""], ["madeup", "madeup", "kr"], ["missed", "dash", "km"]];
  const canMake = now < madeUpDeadline(y, S.settings);
  const n = Object.keys(cu.sel).length;
  return `<div class="sh"><h3>${LOG.catchUpTitle}</h3><p class="sub">${esc(LOG.catchUpSub(longDate(y), list.length))}</p>
    ${list.map(p => `<div class="cu"><div class="cuh"><b>${esc(pName(p, yk))}</b><small>${fmt12(timesFor(y, S.settings)[p])}</small></div><div class="segc">${segs.map(([k, i, c]) => `<button class="${cu.sel[p] === k ? "sel " + c : ""} ${c}" ${k === "madeup" && !canMake ? "disabled" : ""} aria-pressed="${cu.sel[p] === k}" onclick="A.cuPick('${p}','${k}')">${ic(i, "")}${T.STATUS_SHORT[k]}</button>`).join("")}</div></div>`).join("")}
    <p class="fine">${LOG.madeUpExplain}</p>
    <div class="shfoot"><button class="gbtn" onclick="A.closeSheet()">${COMMON.notNow}</button><button class="pbtn" ${n ? "" : "disabled"} onclick="A.cuSave()">${LOG.saveNofM(n, list.length)}</button></div></div>`;
}
A.cuPick = (p, k) => { if (cu.sel[p] === k) delete cu.sel[p]; else cu.sel[p] = k; refreshLive(); };
A.cuSave = () => {
  const now = NOW(), yk = dkey(addDays(now, -1)), snap = snapshot(yk);
  const entries = Object.entries(cu.sel); if (!entries.length) return;
  if (yk < S.createdKey) S.createdKey = yk;
  for (const [p, k] of entries) store.setPrayer(S, yk, p, k, now);
  closeSheet(); commit(); toast(X.loggedN(entries.length), undoable(snap));
};

/* ----- good deeds block ----- */
function deedsBlock(key) {
  const list = store.amalForDay(S, key), day = store.getDay(S, key);
  const done = list.filter(a => day.amal[a.id]?.done).length;
  return `<section class="sec" data-tour="deeds"><h2>${DEEDS.title} <span>${DEEDS.nOfMDone(done, list.length)}</span></h2><div class="card">${deedsCard(key, { read: true })}</div></section>`;
}

/* ----- This week tiles (W3) ----- */
const OPENED = "zad-wk-opened";
const readOpened = () => { try { return JSON.parse(localStorage.getItem(OPENED) || "{}"); } catch (e) { return {}; } };
function markOpened(k) { try { const o = readOpened(); o[k] = 1; localStorage.setItem(OPENED, JSON.stringify(o)); } catch (e) { /* private mode */ } }
function weekTiles(now) {
  // The first month a user sees is Abū Bakr: remember that month once.
  if (!Number.isInteger(S.settings.sahabiStart)) { S.settings.sahabiStart = monthIndex(now); commit(); }
  setSahabiStart(S.settings.sahabiStart);
  // The approved sets are a separate chunk (content.js starts loading it at once); draw again when it lands.
  if (!contentReady()) loadContent().then(() => render()).catch(e => console.warn("content", e));
  const c = thisWeek(now), opened = readOpened(), mk = `${now.getFullYear()}-${now.getMonth()}`;
  const tiles = [
    ["ayah", c.ayah.title || c.ayah.en, 0], ["hadith", c.hadith.title || c.hadith.en, 0], ["dua", c.dua.title || c.dua.en, 0],
    ["seerah", c.seerah.title, 0], ["sahabi", c.sahabi.name, 2], ["sunnah", c.sunnah.title, 1],
  ];
  const names = { ...WEEK_UI.tabs, sahabi: WEEK_UI.sahabi("").replace(/ · $/, ""), sunnah: WEEK_UI.sunnah("").replace(/ · $/, "") };
  const html = tiles.map(([id, title, monthly]) => {
    const ok = !!opened[(monthly === 2 ? mk + "-" + now.getDate() : monthly ? mk : c.weekKey) + id];
    const fact = id === "sahabi" ? `<div class="fx">${esc(c.sahabi.recap ? WEEK_UI.recapTile : c.sahabi.fact)}</div>` : "";
    return `<button class="wt ${monthly ? "mo" : ""} ${fact ? "hasfx" : ""}" onclick="A.weekItem('${id}')"><div class="k"><b>${names[id]}</b><span>${X.arLabel[id]}</span></div><div class="ti">${esc(title)}</div>${fact}<span class="dt ${ok ? "" : "new"}">${ok ? ic("check", "") : ""}</span></button>`;
  }).join("");
  return `<section class="sec"><h2>${HOME.thisWeek}</h2><p class="wsub">${esc(c.rangeLabel)} · ${X.afterJumuah}</p><div class="wgrid">${html}</div><div class="wleg"><span><i></i>${X.notOpened}</span><span>${X.goldChange}</span></div></section>`;
}
const sahabiKick = () => WEEK_UI.sahabi("").replace(/ · $/, "");
/** Sahabi of the month: today's fact, then the earlier facts of this month (newest first), then Past months. */
function sahabiSheet(now) {
  const sb = thisWeek(now).sahabi, mon = MON[now.getMonth()].slice(0, 3);
  markOpened(`${now.getFullYear()}-${now.getMonth()}-${now.getDate()}sahabi`);
  const earlier = sb.earlier.length ? `<h4 class="fh">${esc(sb.recap ? WEEK_UI.recapAll : WEEK_UI.earlierThisMonth)}</h4><ul class="fl">${sb.earlier.map(e => `<li><b>${esc(WEEK_UI.factDay(e.day, mon))}</b><span>${esc(e.text)}</span></li>`).join("")}</ul>` : "";
  openSheet(zz(`<div class="sh wd"><div class="lhd"><span class="kick">${esc(sahabiKick())}</span><button class="cls" onclick="A.closeSheet()" aria-label="${COMMON.close}">${ic("close")}</button></div>
    <h3 style="margin-top:8px">${esc(sb.name)}</h3><div class="src">${esc(sb.title)}</div>
    ${sb.recap ? `<div class="rc"><h4>${esc(WEEK_UI.recapTitle(sb.name))}</h4><p>${esc(WEEK_UI.recapLead(sb.name))}</p>
      <ul>${sb.recap.highlights.map(h => `<li><span>${esc(h.text)}</span><small>${esc(WEEK_UI.factDay(h.day, mon))} · ${esc(h.src)}</small></li>`).join("")}</ul></div>`
    : `<h4 class="fh">${esc(WEEK_UI.todaysFact)} <small>${esc(WEEK_UI.factDay(sb.day, mon))}</small></h4><div class="en">${esc(sb.fact)}</div>${sb.src ? `<div class="src">${esc(sb.src)}</div>` : ""}`}
    ${earlier}
    <button class="pastbtn" onclick="A.pastMonths()"><span><b>${esc(WEEK_UI.pastMonths)}</b><small>${esc(WEEK_UI.pastMonthsSub)}</small></span>${ic("chev")}</button>
    <div class="shfoot"><button class="pbtn" onclick="A.closeSheet()">${COMMON.done}</button></div></div>`));
}
A.pastMonths = () => {
  const list = pastSahabi(NOW());
  openSheet(zz(`<div class="sh wd"><div class="lhd"><span class="kick">${esc(WEEK_UI.pastMonths)}</span><button class="cls" onclick="A.closeSheet()" aria-label="${COMMON.close}">${ic("close")}</button></div>
    ${list.length ? `<div class="pml">${list.map((m, i) => `<button class="pm" onclick="A.pastMonth(${i})"><span><b>${esc(m.name)}</b><small>${esc(m.label)} · ${esc(WEEK_UI.factsCount(m.facts.length))}</small></span>${ic("chev")}</button>`).join("")}</div>` : `<div class="en">${esc(WEEK_UI.pastNone)}</div>`}
    <div class="shfoot"><button class="pbtn" onclick="A.sahabiBack()">${COMMON.back || "Back"}</button></div></div>`));
};
A.sahabiBack = () => sahabiSheet(NOW());
A.pastMonth = i => {
  const m = pastSahabi(NOW())[i]; if (!m) return;
  openSheet(zz(`<div class="sh wd"><div class="lhd"><span class="kick">${esc(m.label)}</span><button class="cls" onclick="A.closeSheet()" aria-label="${COMMON.close}">${ic("close")}</button></div>
    <h3 style="margin-top:8px">${esc(m.name)}</h3><div class="src">${esc(m.title)}</div>
    <ul class="fl">${m.facts.map((t, d) => `<li><b>${d + 1}</b><span>${esc(t)}</span></li>`).reverse().join("")}</ul>
    <div class="shfoot"><button class="pbtn" onclick="A.pastMonths()">${COMMON.back || "Back"}</button></div></div>`));
};
/** Narrator, collection (as the book gives it) and source (book + printed page) under a card. */
const weekMeta = it => {
  const rows = [[WEEK_UI.narrator, it.narrator], [WEEK_UI.collection, it.collection], [WEEK_UI.source, it.src]].filter(r => r[1]);
  return rows.length ? `<dl class="wm">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>` : "";
};
A.weekItem = id => {
  if (!contentReady()) { loadContent().then(() => A.weekItem(id)).catch(() => {}); return; }
  const now = NOW(), c = thisWeek(now), it = c[id];
  if (id === "sahabi") { sahabiSheet(now); render(); return; }
  const monthly = id === "sunnah";
  markOpened((monthly ? `${now.getFullYear()}-${now.getMonth()}` : c.weekKey) + id);
  const kicker = { ayah: WEEK_UI.ayah, hadith: WEEK_UI.hadith, dua: WEEK_UI.dua, seerah: WEEK_UI.seerah, sahabi: WEEK_UI.sahabi("").replace(/ · $/, ""), sunnah: WEEK_UI.sunnah("").replace(/ · $/, "") }[id];
  const en = it.en || it.text, title = it.title || it.name;
  openSheet(zz(`<div class="sh wd"><div class="lhd"><span class="kick">${esc(kicker)}</span><button class="cls" onclick="A.closeSheet()" aria-label="${COMMON.close}">${ic("close")}</button></div>
    ${title ? `<h3 style="margin-top:8px">${esc(title)}</h3>` : ""}${it.ar ? `<div class="ar${id === "ayah" ? " q" : ""}${it.ar.length > 160 ? " long" : ""}" lang="ar" dir="rtl">${esc(it.ar)}</div>` : ""}${it.tr ? `<div class="tr">${esc(it.tr)}</div>` : ""}<div class="en${it.ar ? " mn" : ""}">${esc(en)}</div>${weekMeta(it)}
    <div class="shfoot"><button class="pbtn" onclick="A.closeSheet()">${COMMON.done}</button></div></div>`));
  render();
};

/* ----- "Want more from Zad?" (only when every optional module is off) ----- */
function wantMore() {
  if (["sunnah", "deeds", "makeups", "week", "progress", "tools"].some(f => isOn(S, f))) return "";
  return `<button class="more" onclick="A.go('settings');A.settingsPage('features')"><span class="pl">${ic("plus")}</span><span><b>${HOME.wantMoreTitle}</b><small>${HOME.wantMoreSub}</small></span></button>`;
}

/* ----- render ----- */
function renderHome() {
  if (UI.view !== "home") { refreshLive(); return; }
  const el = $("#v-home"); if (!el) return;
  const now = NOW(), key = todayKey(), day = store.getDay(S, key), z = zz;
  const parts = [z(heroBlock(now, key, day))];
  const attn = attnCards(now, key);
  if (attn) parts.push(z(`<div class="sec" style="padding-top:16px">${attn}</div>`));
  parts.push(z(`<div class="sec" style="padding-top:${attn ? 12 : 16}px">${metersBlock(key, day)}</div>`));
  const cb = catchBlock(now);
  if (cb) parts.push(z(`<div class="sec" style="padding-top:12px">${cb}</div>`));
  if (isOn(S, "tools")) {
    const f = toolsHomeCards();
    if (f) { try { const h = f(key); if (h) parts.push(`<div style="padding-top:12px">${h}</div>`); } catch (e) { console.warn("tools cards", e); } }
  }
  if (isOn(S, "deeds")) parts.push(withRead(z(deedsBlock(key)), now));
  if (isOn(S, "week")) parts.push(z(weekTiles(now)));
  const loc = S.settings.location || FALLBACK_LOCATION;
  parts.push(z(`<p class="foot" style="margin:14px 24px 0">${esc(HOME.chipLegendFoot(loc.label, METHOD_SHORT[S.settings.method] || S.settings.method, S.settings.asr === "hanafi" ? T.ASR_UI.hanafi : T.ASR_UI.standard, sunnahOn()))}</p>${wantMore()}<div class="spacer"></div>`));
  el.innerHTML = parts.join("");
  refreshLive();
}

onRender(renderHome);
