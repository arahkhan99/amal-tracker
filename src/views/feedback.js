/* Send feedback (Settings → Help & tour) and "Report a mistake" (content sheets on Home, the readers' Aa sheet,
   the Qurʾān page menu). One sheet for both. Signed in: saved to Firestore (cloud.sendFeedback). Signed out: opens
   the user's email app with the message ready (mailto). The pure parts live in ../feedback.js. */
import { Capacitor } from "@capacitor/core";
import { A, $, NOW, openSheet } from "../app.js";
import { cloud, sendFeedback } from "../cloud.js";
import { esc, MON } from "../util.js";
import { FEEDBACK as F, COMMON, WEEK_UI } from "../strings.js";
import { thisWeek, contentReady, loadContent } from "../content.js";
import { TYPES, LIMITS, FEEDBACK_EMAIL, FLAG_SVG, itemId, buildPayload, buildMailto, deviceLabel, validEmail, clip } from "../feedback.js";
import { T } from "./tools/core.js";
import { TT } from "./tools/strings-tools.js";
import { autoSet } from "./tools/adhkar.js";
import { manzilToday } from "./tools/hizb.js";
import { quranMushaf, mushafName } from "./tools/quran.js";

const APP_VERSION = typeof __APP_VERSION__ === "undefined" ? "dev" : __APP_VERSION__;
const svg = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const ICON = {
  send: '<path d="M21 3L10 14"/><path d="M21 3l-7 18-4-7-7-4z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3.5 7.5l8.5 6 8.5-6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.01"/>', chev: '<path d="M9 6l6 6-6 6"/>',
};

/** "What looks wrong?" choices for each kind of item. */
const PARTS = {
  ayah: ["arabic", "translation", "source", "other"],
  hadith: ["translation", "source", "other"],
  dua: ["arabic", "translit", "translation", "source", "other"],
  seerah: ["text", "source", "other"],
  sunnah: ["text", "source", "other"],
  sahabi: ["text", "source", "other"],
  adhkar: ["arabic", "translit", "translation", "other"],
  aftersalah: ["arabic", "translit", "translation", "other"],
  durud: ["arabic", "translit", "translation", "other"],
  hizb: ["arabic", "translit", "translation", "source", "other"],
  manzil: ["qtext", "translation", "other"],
  quran: ["qtext", "layout", "translation", "other"],
};

/* ---------- state of the open sheet ---------- */
// item: { id, short, title, kind, parts[], facts?[{ n, label }], fact? } ; parts: chosen part keys
let st = null;
let busy = false;

const device = () => deviceLabel(navigator.userAgent || "", Capacitor.getPlatform());
const signedIn = () => !!cloud.user;

function fresh(item = null) {
  st = { type: item ? "content" : "idea", item, parts: [], message: "", email: (!cloud.user?.relay && cloud.user?.email) || "", includeDevice: true, error: "" };
  busy = false;
}

/* ---------- the sheet ---------- */
function formHTML() {
  const it = st.item, out = !signedIn();
  const chips = TYPES.map(k => `<button type="button" class="fb-chip${k === st.type ? " on" : ""}" role="radio" aria-checked="${k === st.type}" data-t="${k}" onclick="A.fbType('${k}')">${esc(F.types[k])}</button>`).join("");
  const facts = it?.facts?.length > 1 ? `<div class="field fb-fact"><label for="fbFact">${esc(F.whichFact)}</label><select id="fbFact" onchange="A.fbFact(this.value)">${it.facts.map(f => `<option value="${f.n}"${f.n === it.fact ? " selected" : ""}>${esc(f.label)}</option>`).join("")}</select></div>` : "";
  const itemBox = it ? `<div class="fb-item"><span class="fb-item-ic">${FLAG_SVG}</span><div class="t"><small>${esc(F.reporting)}</small><b id="fbItemT">${esc(it.title)}</b></div><button type="button" class="fb-x" aria-label="${esc(F.removeItem)}" onclick="A.fbClearItem()">${svg(ICON.x)}</button></div>${facts}` : "";
  const parts = it?.parts?.length ? `<div class="fb-lab" id="fbPartsL">${esc(F.whatWrong)} <span>${esc(F.optional)}</span></div><div class="fb-chips sm" role="group" aria-labelledby="fbPartsL">${it.parts.map(p => `<button type="button" class="fb-chip${st.parts.includes(p) ? " on" : ""}" aria-pressed="${st.parts.includes(p)}" onclick="A.fbPart(this,'${p}')">${esc(F.parts[p])}</button>`).join("")}</div>` : "";
  const types = it ? "" : `<div class="fb-lab" id="fbTypeL">${esc(F.about)}</div><div class="fb-chips" role="radiogroup" aria-labelledby="fbTypeL">${chips}</div>`;
  const email = out ? "" : `<div class="field"><label for="fbEmail">${esc(F.email)} <span>${esc(F.optional)}</span></label><input id="fbEmail" type="email" inputmode="email" autocomplete="email" maxlength="${LIMITS.email}" placeholder="name@example.com" value="${esc(st.email)}" aria-describedby="fbEmailH" oninput="A.fbEmail(this.value)"><small class="fb-hint" id="fbEmailH">${esc(F.emailHint)}</small></div>`;
  const so = out ? `<div class="fb-so">${svg(ICON.info)}<span>${F.signedOut} ${esc(FEEDBACK_EMAIL)}.</span></div>` : "";
  const btn = out ? `${svg(ICON.mail)}${esc(F.openMail)}` : `${svg(ICON.send)}${esc(busy ? F.sending : F.send)}`;
  return `<div class="fb"><div class="sheet-head"><h3>${esc(it ? F.reportTitle : F.title)}</h3><button type="button" class="link-btn" onclick="A.closeSheet()">${esc(COMMON.cancel)}</button></div>
  <p>${esc(it ? F.reportLead : F.lead)}</p>
  ${itemBox}${types}${parts}
  <div class="field"><label for="fbMsg">${esc(it ? F.messageReport : F.message)}</label><textarea id="fbMsg" maxlength="${LIMITS.message}" placeholder="${esc(F.placeholder[st.type])}" aria-describedby="fbCount" oninput="A.fbInput(this.value)">${esc(st.message)}</textarea><div class="fb-count" id="fbCount" aria-live="polite">${esc(F.count(st.message.length, LIMITS.message))}</div></div>
  ${email}
  <label class="chk"><input type="checkbox"${st.includeDevice ? " checked" : ""} onchange="A.fbDevice(this.checked)"><span><b>${esc(F.device)}</b><small>${esc(F.deviceSub(`Zad ${APP_VERSION} · ${device()}`))}</small></span></label>
  ${so}
  <p class="note err" id="fbErr" role="alert">${esc(st.error)}</p>
  <div class="cta"><button type="button" class="btn primary" id="fbSend" onclick="A.fbSend()"${st.message.trim() && !busy ? "" : " disabled"}>${btn}</button></div>
  <p class="note">${esc(F.never)}</p>
  <p class="note fb-mailto">${esc(F.preferEmail)} <a href="mailto:${FEEDBACK_EMAIL}">${esc(FEEDBACK_EMAIL)}</a></p></div>`;
}

function thanksHTML(how) {
  const it = st.item;
  const lead = it ? `${esc(F.thanksItem)} <b>${esc(it.short)}</b>. ${esc(F.thanksItemEnd)}` : esc(F.thanks);
  const reply = how !== "mail" && st.email && validEmail(st.email.trim()) ? ` ${esc(F.thanksReply)}` : "";
  const sub = how === "mail" ? F.mailNext : how === "queued" ? F.queued : F.sent;
  return `<div class="fb"><div class="fb-done"><span class="fb-done-ic">${svg(ICON.check)}</span><h3>${esc(F.thanksTitle)}</h3>
    <p>${lead}${reply}</p><p class="sm">${esc(sub)}</p></div><div class="cta"><button type="button" class="btn primary" onclick="A.closeSheet()">${esc(COMMON.done)}</button></div></div>`;
}

const draw = () => openSheet(formHTML());
const sendBtn = () => $("#fbSend");
function refreshBtn() { const b = sendBtn(); if (b) b.disabled = busy || !st.message.trim(); }

/* ---------- actions ---------- */
/** Open the sheet. Pass an item (from the report helpers below) for "Report a mistake". */
A.feedback = (item = null) => { fresh(item); draw(); const s = $("#sheet"); if (s) s.scrollTop = 0; };
A.fbType = k => {
  if (!TYPES.includes(k)) return;
  st.type = k;
  document.querySelectorAll("#sheet .fb-chip[data-t]").forEach(b => { const on = b.dataset.t === k; b.classList.toggle("on", on); b.setAttribute("aria-checked", on); });
  const m = $("#fbMsg"); if (m) m.placeholder = F.placeholder[k];
};
A.fbPart = (el, p) => {
  const i = st.parts.indexOf(p);
  if (i >= 0) st.parts.splice(i, 1); else st.parts.push(p);
  el.classList.toggle("on", i < 0); el.setAttribute("aria-pressed", i < 0);
};
A.fbInput = v => {
  st.message = v;
  const c = $("#fbCount"); if (c) c.textContent = F.count(v.length, LIMITS.message);
  refreshBtn();
};
A.fbEmail = v => { st.email = v; if (st.error) { st.error = ""; const e = $("#fbErr"); if (e) e.textContent = ""; } };
A.fbDevice = on => { st.includeDevice = !!on; };
A.fbClearItem = () => { st.item = null; st.parts = []; st.type = "content"; draw(); $("#fbMsg")?.focus(); };
A.fbFact = n => {
  const it = st.item; if (!it?.facts) return;
  const f = it.facts.find(x => String(x.n) === String(n)); if (!f) return;
  Object.assign(it, sahabiItemFields(it.sb, f.n));
  const t = $("#fbItemT"); if (t) t.textContent = it.title;
};

function input() {
  return { type: st.type, message: st.message, item: st.item, parts: st.parts, email: st.email.trim(), includeDevice: st.includeDevice,
    appVersion: APP_VERSION, platform: Capacitor.getPlatform(), device: device() };
}
function showError(msg) { st.error = msg; const e = $("#fbErr"); if (e) e.textContent = msg; }

A.fbSend = async () => {
  if (busy || !st.message.trim()) return;
  if (!signedIn()) {
    const url = buildMailto(input());
    if (!url) return;
    const a = Object.assign(document.createElement("a"), { href: url });
    document.body.appendChild(a); a.click(); a.remove();
    openSheet(thanksHTML("mail"));
    return;
  }
  if (st.email.trim() && !validEmail(st.email.trim())) { showError(F.emailBad); $("#fbEmail")?.focus(); return; }
  const data = buildPayload(input());
  if (!data) return;
  busy = true; showError("");
  const b = sendBtn(); if (b) { b.disabled = true; b.lastChild.textContent = F.sending; }
  const write = sendFeedback(data);
  write.catch(e => console.warn("feedback", e));
  // Offline: Firestore queues the write and sends it when the connection is back, so thank them now.
  // Online: wait for the server (up to 8 s; a slow network counts as queued).
  const wait = navigator.onLine === false ? 0 : 8000;
  const how = await Promise.race([write.then(() => "sent"), new Promise(r => setTimeout(() => r("queued"), wait))]).catch(() => "error");
  busy = false;
  if (how === "error") { if (b?.isConnected) { b.lastChild.textContent = F.send; refreshBtn(); } showError(F.failed); return; }
  if ($("#scrim").classList.contains("on") && $("#fbMsg")) openSheet(thanksHTML(how));
};

/* ---------- items for "Report a mistake" ---------- */
const mk = (kind, rawId, sub, name, extra = {}) => {
  const id = itemId(kind, rawId, sub);
  const short = `${F.kind[kind]} ${rawId}${sub != null && sub !== "" ? "#" + sub : ""}`;
  return { id, kind, short, title: clip(name ? `${short} · ${name}` : short, LIMITS.itemTitle), parts: PARTS[kind] || ["other"], ...extra };
};

/** Fields of a Companion item for fact `n` (1-based). */
function sahabiItemFields(sb, n) {
  const short = `${sb.name}, ${F.fact(n)}`;
  return { fact: n, id: itemId("sahabi", sb.key || "X", n), short, title: clip(`${F.kind.sahabi} · ${short}`, LIMITS.itemTitle) };
}

/** Report the item a Home "This week" sheet shows. */
A.fbReport = kind => {
  if (!contentReady()) { loadContent().then(() => A.fbReport(kind)).catch(() => {}); return; }
  const now = NOW(), c = thisWeek(now);
  if (kind === "sahabi") {
    const sb = c.sahabi, mon = MON[now.getMonth()].slice(0, 3);
    const today = sb.fact ? [{ n: Math.min(sb.day, sb.facts.length), label: `${F.today} (${WEEK_UI.factDay(sb.day, mon)}) · ${headline(sb.fact)}` }] : [];
    const facts = [...today, ...sb.earlier.map(e => ({ n: e.day, label: `${WEEK_UI.factDay(e.day, mon)} · ${headline(e.text)}` }))];
    const n = facts[0]?.n || 1;
    A.feedback({ kind: "sahabi", parts: PARTS.sahabi, sb: { key: sb.key, name: sb.name }, facts, ...sahabiItemFields(sb, n) });
    return;
  }
  const it = c[kind]; if (!it?.id) return;
  A.feedback(mk(kind, it.id, null, it.title || it.name || headline(it.en || it.text || "")));
};
const headline = (s, n = 48) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s; };

/** The item a reader is on (for its Aa sheet), read from what is on screen. */
function readerItem(tool) {
  const v = document.querySelector("#v-tools");
  if (!v) return null;
  if (tool === "adhkar" || tool === "afterSalah") {
    const cards = [...v.querySelectorAll(".tl-ad[data-n], .tl-fold")];
    const cur = v.querySelector(".tl-ad.now") || v.querySelector(".tl-ad[data-n]");
    if (!cur) return null;
    const n = +cur.dataset.n, title = (cur.getAttribute("aria-label") || "").split(",")[0].trim();
    const total = cards.length;
    if (tool === "adhkar") {
      const set = T.set || autoSet(NOW());
      const it = mk("adhkar", set, n, `${set === "morning" ? TT.morningTitle : TT.eveningTitle} ${n}${title ? ", " + title : ""}`);
      return { ...it, short: `${set === "morning" ? TT.morningTitle : TT.eveningTitle} ${n}`, sub: F.inDhikr(n, total, title) };
    }
    const it = mk("aftersalah", n, null, title);
    return { ...it, short: `${TT.asTitle} ${n}`, sub: F.inDhikr(n, total, title) };
  }
  if (tool === "durud") {
    const n = T.durudN || 1, name = TT.durudNo(n);
    return { ...mk("durud", n, null, ""), short: name, title: name, sub: F.inItem(name) };
  }
  const pick = sel => {
    const secs = [...v.querySelectorAll(sel)], top = ($("#screen")?.getBoundingClientRect().top || 0) + 90;
    return { secs, el: secs.find(s => s.getBoundingClientRect().bottom > top) || secs[0] };
  };
  if (tool === "hizb") {
    const m = T.manzil || manzilToday(), { secs, el } = pick(".tl-hz[data-i]");
    if (!el) return null;
    const i = +el.dataset.i + 1, name = `${TT.manzil(m)}, ${i} of ${secs.length}`;
    return { ...mk("hizb", m, i, ""), short: `${F.kind.hizb}, ${name}`, title: `${F.kind.hizb} · ${name}`, sub: F.inItem(name) };
  }
  if (tool === "manzil") {
    const { secs, el } = pick(".tl-mz");
    if (!el) return null;
    const n = +(el.querySelector(".tl-no")?.textContent || secs.indexOf(el) + 1), ref = el.getAttribute("aria-label") || "";
    return { ...mk("manzil", n, null, ref), sub: F.inDhikr(n, secs.length, ref) };
  }
  return null;
}
const lastReader = {};
/** The "Report a mistake" row for a reader's Aa sheet (views/tools/index.js calls it). */
A.fbAaRow = tool => {
  const it = readerItem(tool); if (!it) return "";
  lastReader[tool] = it;
  return `<button type="button" class="fb-aarow" onclick="A.fbReportTool('${tool}')"><span class="ic">${FLAG_SVG}</span><span class="t"><b>${esc(F.reportMistake)}</b><small>${esc(it.sub)}</small></span><span class="chev">${svg(ICON.chev)}</span></button>`;
};
A.fbReportTool = tool => { const it = lastReader[tool] || readerItem(tool); if (it) A.feedback(it); };

/** The Qurʾān page menu's Report button: the page and muṣḥaf on screen. */
A.fbReportQuran = () => {
  const m = quranMushaf(), p = T.page || 1;
  const surah = document.querySelector("#v-tools .tl-qt b")?.textContent.trim() || "";
  const it = mk("quran", m, "p" + p, "");
  const title = clip([F.kind.quran, F.page(p), surah, mushafName(m)].filter(Boolean).join(" · "), LIMITS.itemTitle);
  A.feedback({ ...it, short: `${F.kind.quran} · ${F.page(p)}`, title });
};
