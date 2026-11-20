/*
 * The time-of-day band (Direction B "Time of day", 19 Nov 2026; design-review/mockups2/redesign/declutter, NOTES.md
 * "Direction B across the app"). Every page opens in a softly tinted band: dawn, day, afternoon, dusk or night, at the
 * app's prayer boundaries. The tint is one attribute on <html> (data-band), written by app.js on each render only
 * when it changes (so once per prayer boundary); css/band.css maps it to static colour tokens on every `.zb` band.
 * Nothing runs on scroll or swipe, and no view has to know which band it is.
 *
 * Shared markup helpers for a page band (Read, Progress, Settings, set-up, Qibla, readers):
 *   bandHead({ title, right, back, backLabel, lead, extra, tabs })  → <header class="zb zb-pg">…</header>
 * and the sticky status-bar cover for pages that scroll in #screen (bandCover()).
 */
import { timesFor } from "./times.js";
import { esc } from "./util.js";

export const BANDS = ["dawn", "day", "afternoon", "dusk", "night"];
/**
 * The band at `now`, at the app's prayer boundaries: dawn from Fajr to sunrise, day from sunrise to ʿAsr,
 * afternoon from ʿAsr to Maghrib, dusk from Maghrib to ʿIshāʾ, night from ʿIshāʾ to Fajr.
 */
export function bandAt(now, settings, t = timesFor(now, settings)) {
  if (now < t.Fajr) return "night";
  if (now < t.Sunrise) return "dawn";
  if (now < t.Asr) return "day";
  if (now < t.Maghrib) return "afternoon";
  if (now < t.Isha) return "dusk";
  return "night";
}

/** Write <html data-band> for `now` (timesFor is memoised, so this is a lookup); touches the DOM only on a change. */
export function syncBand(settings, now = new Date(), root = typeof document !== "undefined" ? document.documentElement : null) {
  const b = bandAt(now, settings);
  if (root && root.dataset.band !== b) root.dataset.band = b;
  return b;
}

const chevL = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6l-6 6 6 6"/></svg>';

/**
 * A page band. title: the page name (Amiri); right: HTML at the top right (the initial, Done, an icon button);
 * back: onclick of the "‹ backLabel" link above the title; lead: a quiet line under the title; extra: HTML after
 * it (a progress bar, chips); cls: more classes on the band.
 */
export function bandHead({ title = "", right = "", back = "", backLabel = "", lead = "", extra = "", cls = "", h = "h1", titleHTML = "" } = {}) {
  const r0 = back ? `<button type="button" class="zb-back" data-f="zb-back" onclick="${back}">${chevL}<span>${esc(backLabel)}</span></button>` : "";
  const r1 = title || titleHTML || right ? `<div class="zb-r1">${title || titleHTML ? `<${h} class="zb-t">${titleHTML || esc(title)}</${h}>` : ""}${right}</div>` : "";
  return `<header class="zb zb-pg${back ? " has-back" : ""}${cls ? " " + cls : ""}">${r0}${r1}${lead ? `<p class="zb-lead">${lead}</p>` : ""}${extra}</header>`;
}

/** The sticky cover behind the status bar for a page scrolling in #screen (sits under the band, over the content). */
export const bandCover = () => '<i class="zb-sb" aria-hidden="true"></i>';

/** A thin progress bar inside a band, with a line under it ("7 of 20 done · Saved as you read"). pct 0–100. */
export const bandBar = (pct, left = "", right = "", label = "") => `<div class="zb-bar"${label ? ` role="progressbar" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}"` : ""}><i style="width:${Math.max(0, Math.min(100, pct)).toFixed(1)}%"></i></div>${left || right ? `<div class="zb-bline"><span>${left}</span><span>${right}</span></div>` : ""}`;
