/*
 * Send feedback / Report a mistake: the pure parts (no DOM, no Firebase), so they can be unit-tested.
 *  - buildPayload: the Firestore document for a signed-in user (collection "feedback", see firestore.rules).
 *    cloud.sendFeedback adds uid and createdAt (server time).
 *  - buildMailto: the mailto: link for a signed-out user (their own mail app sends it).
 * Only what the user typed, the item they were looking at and (only if ticked) app version, platform and
 * device model are ever sent. Never the prayer log, notes, location or anything else from the tracker.
 */
import { FEEDBACK as F, GUIDE } from "./strings.js";

export const FEEDBACK_EMAIL = GUIDE.email;
export const TYPES = ["idea", "bug", "content", "other"];
export const PARTS = ["arabic", "qtext", "translit", "translation", "source", "text", "layout", "other"];
export const PLATFORMS = ["android", "ios", "web"];
/** Same limits as firestore.rules. */
export const LIMITS = { message: 2000, itemId: 40, itemTitle: 160, parts: 6, email: 254, appVersion: 20, device: 80, mailto: 1900 };

/** "hadith:H45", "sahabi:ABUBAKR#12", "quran:indopak15#p12": the kind, then the item's own id. */
export const ITEM_ID = /^[a-z]+:[A-Za-z0-9_.#-]{1,32}$/;
export function itemId(kind, id, sub) {
  const s = `${kind}:${id}${sub != null && sub !== "" ? "#" + sub : ""}`;
  return ITEM_ID.test(s) && s.length <= LIMITS.itemId ? s : "";
}

/** Trim and cut to `max` characters without splitting a surrogate pair. */
export function clip(s, max) {
  let t = String(s ?? "").replace(/\r\n?/g, "\n").trim();
  if (t.length <= max) return t;
  t = t.slice(0, max);
  return /[\uD800-\uDBFF]$/.test(t) ? t.slice(0, -1) : t;
}

export const validEmail = s => typeof s === "string" && s.length <= LIMITS.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/** A short device line from the user agent: "Android 15 · Pixel 8", "iOS 18.1 · iPhone", "Web · Chrome 142 · Windows". */
export function deviceLabel(ua = "", platform = "web") {
  let out;
  const and = ua.match(/Android\s+([\d.]+)(?:;\s*([^;)]+))?/);
  const ios = ua.match(/(iPhone|iPad|iPod)[^)]*?OS\s+([\d_]+)/);
  if (and) {
    const model = (and[2] || "").replace(/\s*Build\/.*$/, "").trim();
    out = [`Android ${and[1]}`, model && model !== "K" && !/^wv$/i.test(model) ? model : ""];
  } else if (ios) out = [`iOS ${ios[2].replace(/_/g, ".")}`, ios[1]];
  else {
    const br = ua.match(/(Edg|Firefox|Chrome|Version)\/(\d+)/);
    const name = br ? { Edg: "Edge", Version: "Safari" }[br[1]] || br[1] : "";
    const os = /Windows/.test(ua) ? "Windows" : /Mac OS X|Macintosh/.test(ua) ? "macOS" : /CrOS/.test(ua) ? "ChromeOS" : /Linux/.test(ua) ? "Linux" : "";
    out = ["Web", name && `${name} ${br[2]}`, os];
  }
  if (platform !== "web" && out[0] === "Web") out[0] = platform === "ios" ? "iOS" : "Android";
  return clip(out.filter(Boolean).join(" · "), LIMITS.device);
}

/** Only known part keys, at most LIMITS.parts, no repeats. */
const cleanParts = parts => [...new Set((parts || []).filter(p => PARTS.includes(p)))].slice(0, LIMITS.parts);

/**
 * The feedback document (without uid and createdAt). Returns null when there is no message or the type is unknown.
 * input: { type, message, item?: { id, title }, parts?, email?, includeDevice, appVersion, platform, device }
 */
export function buildPayload(input) {
  const type = TYPES.includes(input.type) ? input.type : null;
  const message = clip(input.message, LIMITS.message);
  if (!type || !message) return null;
  const out = { type, message };
  const id = input.item?.id && ITEM_ID.test(input.item.id) && input.item.id.length <= LIMITS.itemId ? input.item.id : "";
  if (id) {
    out.itemId = id;
    const title = clip(input.item.title, LIMITS.itemTitle);
    if (title) out.itemTitle = title;
    const parts = cleanParts(input.parts);
    if (parts.length) out.parts = parts;
  }
  const email = clip(input.email, LIMITS.email);
  if (email && validEmail(email)) out.email = email;
  if (input.includeDevice) {
    out.appVersion = clip(input.appVersion || "", LIMITS.appVersion);
    out.platform = PLATFORMS.includes(input.platform) ? input.platform : "web";
    const d = clip(input.device || "", LIMITS.device);
    if (d) out.device = d;
    if (!out.appVersion) delete out.appVersion;
  }
  return out;
}

/** The text of a mailto body (also the readable form of a payload). */
export function mailBody(p) {
  const lines = [p.message, "", "---", `${F.mailType}: ${F.types[p.type] || p.type}`];
  if (p.itemId) lines.push(`${F.mailItem}: ${p.itemId}${p.itemTitle ? ` (${p.itemTitle})` : ""}`);
  if (p.parts?.length) lines.push(`${F.mailParts}: ${p.parts.map(k => F.parts[k] || k).join(", ")}`);
  if (p.appVersion || p.platform) lines.push(`${F.mailApp}: ${[`Zad ${p.appVersion || ""}`.trim(), p.platform].filter(Boolean).join(" · ")}`);
  if (p.device) lines.push(`${F.mailDevice}: ${p.device}`);
  return lines.join("\n");
}

/**
 * mailto: link for a signed-out user. Same input as buildPayload (the email field is ignored: the mail app sends
 * from the user's own address). Long messages are cut (with "…") so the link stays under LIMITS.mailto characters.
 * Returns "" when there is nothing to send.
 */
export function buildMailto(input, to = FEEDBACK_EMAIL) {
  const p = buildPayload({ ...input, email: "" });
  if (!p) return "";
  const subject = `Zad · ${F.types[p.type]}${p.itemId ? ` · ${p.itemId}` : ""}`;
  const url = msg => `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mailBody({ ...p, message: msg }))}`;
  let u = url(p.message);
  if (u.length <= LIMITS.mailto) return u;
  // Cut the message (binary search on its length) until the link fits
  let lo = 0, hi = p.message.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (url(clip(p.message, mid) + "…").length <= LIMITS.mailto) lo = mid; else hi = mid - 1;
  }
  return url(clip(p.message, lo) + "…");
}

/* ---------- small HTML pieces shared by the views ---------- */
export const FLAG_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 21V4"/><path d="M5 4h12l-2.5 4.5L17 13H5"/></svg>';
/** The quiet "Report a mistake" link under a content sheet's Done button. */
export const reportLink = onclick => `<button type="button" class="fb-rep" onclick="${onclick}">${FLAG_SVG}<span>${F.reportMistake}</span></button>`;
