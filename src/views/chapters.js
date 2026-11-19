/*
 * Chapters: a tab's row of names over its chapters, side by side. Used by Today (Now · Today, views/home.js),
 * Progress and Read, so they all look and behave the same: swipe (scroll-snap) or tap a name; keyboard: arrows,
 * Home, End; no animation with reduced motion; each chapter scrolls on its own; the chapters off screen are out of
 * the tab order. The bar of names scrolls sideways when they don't fit (narrow phones, large text) and keeps the
 * active one in view. Styles: css/today.css (.zt-cb, .zt-track, .zt-ch) and css/progress.css (.ch-scroll).
 *
 * Swiping stays smooth (19 Nov 2026: "lag when swiping between chapters"):
 * - During a swipe only the names' classes change (once a frame at most, and only when the chapter under the middle
 *   of the screen changes), so the name underline follows the finger.
 * - `inert` (what keeps the hidden chapters out of the tab order) restyles a chapter's whole subtree: tens of ms on a
 *   phone for Progress. A chapter coming into view loses it as soon as it is half on screen (it is then about to be
 *   tapped); the chapters going off screen get it back only once the swipe has settled and the page is idle.
 * - Nothing reads layout right after a write (no forced style recalc), redraws never move the track while it is
 *   moving, and redraws that change nothing touch nothing.
 *
 * const ch = makeChapters({ prefix: "pr", label, get: () => UI.x, set: id => { UI.x = id; } });
 * ch.ensure(el, ids, names) builds the frame when the list changed; fill ch.top() and ch.panel(id); then ch.land().
 */
import { esc } from "../util.js";

const reduceMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const idle = fn => (typeof requestIdleCallback === "function" ? requestIdleCallback(fn, { timeout: 600 }) : setTimeout(fn, 120));
const unidle = h => (typeof cancelIdleCallback === "function" ? cancelIdleCallback(h) : clearTimeout(h));

/** Replace a node's content only when it changed; keep keyboard focus on the same control (data-f). */
export function setHTML(node, html) {
  if (!node || node._h === html) return;
  const f = node.contains(document.activeElement) ? document.activeElement.dataset?.f : null;
  node._h = html; node.innerHTML = html;
  if (f) node.querySelector(`[data-f="${f}"]`)?.focus({ preventScroll: true });
}

/*
 * Leaving a tab resets it (19 Nov 2026): when it is shown again it starts at its first chapter, every chapter
 * scrolled to the top; tapping the bottom-bar icon of the tab you are on does the same at once. app.js go() and
 * A.tab call resetChapters(viewElement) for that; every chapters frame registers itself here, so Today, Read and
 * Progress all get it without code of their own. A deep link that sets a chapter after the reset (the Provisions
 * chip, #makeups, A.readChapter) still lands on that chapter: only the tab being left is reset.
 */
const ALL = new Set();
/** Reset every chapters frame inside `root`. now: it is on screen (a same-tab tap), so scroll there right away;
 *  otherwise the frame goes back to its first chapter and its next land() (when shown) scrolls everything up. */
export function resetChapters(root, { now = false } = {}) {
  if (!root) return;
  for (const c of ALL) if (c.inside(root)) c.reset(now);
}

/** Which chapter is under the middle of the track (0-based). */
export const chapterAt = (scrollLeft, width, n) => (width > 0 ? Math.max(0, Math.min(n - 1, Math.round(scrollLeft / width))) : 0);

/**
 * scrollBar: the bar of names may scroll sideways (Progress, Read). Today's two names always fit, so its bar is plain.
 */
export function makeChapters({ prefix, label, get, set, scrollBar = true }) {
  let ids = [], el = null;
  let moving = false, settleT = null, raf = 0, inertJob = null, shown = -1;
  let target = -1; // the chapter a tap or key is scrolling to (the names don't follow that scroll)
  let toTop = false; // reset while hidden: scroll every chapter to the top on the next land()
  const q = s => (el ? el.querySelector(s) : null);
  const track = () => q(".zt-track");
  const bar = () => q(".zt-cb");
  const tabOf = id => q(`#${prefix}-tab-${id}`);
  const panelOf = id => q(`#${prefix}-ch-${id}`);
  const clamp = i => Math.max(0, Math.min(ids.length - 1, i));
  const index = () => Math.max(0, ids.indexOf(get()));

  /** Fade the bar's edge where more names are hidden. */
  function edges() {
    const b = bar(); if (!b || !scrollBar) return;
    const l = b.scrollLeft, w = b.clientWidth, sw = b.scrollWidth;
    b.classList.toggle("fl", l > 2);
    b.classList.toggle("fr", l + w < sw - 2);
  }
  /** Scroll the bar (only sideways) so the active name is fully in view. Reads first, then writes. */
  function reveal(i, smooth = false) {
    if (!scrollBar) return;
    const b = bar(), t = tabOf(ids[i]);
    if (!b || !t) return;
    const sw = b.scrollWidth, cw = b.clientWidth, sl = b.scrollLeft;
    if (sw > cw) {
      const pad = 24, left = t.offsetLeft - pad, right = t.offsetLeft + t.offsetWidth + pad - cw;
      let x = sl;
      if (left < x) x = left; else if (right > x) x = right;
      x = Math.max(0, Math.min(x, sw - cw));
      if (Math.abs(x - sl) > 1) b.scrollTo({ left: x, behavior: smooth && !reduceMotion() ? "smooth" : "auto" });
    }
    edges();
  }
  /** The names: only the ones whose state changes are touched. */
  function markTabs(i) {
    ids.forEach((c, j) => {
      const tab = tabOf(c); if (!tab) return;
      const on = i === j;
      if (tab.classList.contains("on") === on && tab.tabIndex === (on ? 0 : -1)) return;
      tab.classList.toggle("on", on);
      tab.setAttribute("aria-selected", String(on));
      tab.tabIndex = on ? 0 : -1;
    });
  }
  /** Let chapter i be used (it is coming into view). */
  function wake(i) {
    const p = panelOf(ids[i]);
    if (p && p.inert) p.inert = false;
  }
  /** Take the chapters off screen out of the tab order: now, or once the page is idle (after a swipe). */
  function settleInert(now = false) {
    if (inertJob) { unidle(inertJob); inertJob = null; }
    const run = () => {
      inertJob = null;
      if (moving) return; // a new swipe began: its end schedules this again
      const i = index(), many = ids.length > 1;
      ids.forEach((c, j) => { const p = panelOf(c), want = many && i !== j; if (p && p.inert !== want) p.inert = want; });
    };
    if (now) run(); else inertJob = idle(run);
  }
  /** Chapter i is the current one: names now, the chapter usable now, the others inert later (or now). */
  function mark(i, { smooth = false, now = false } = {}) {
    if (ids[i] !== get()) set(ids[i]);
    markTabs(i);
    reveal(i, smooth);
    wake(i);
    shown = i;
    settleInert(now);
  }
  /** Show chapter i (or an id). focus: move focus to its name (keyboard). */
  function show(i, { focus = false, instant = false } = {}) {
    if (typeof i === "string") i = ids.indexOf(i);
    const tr = track(); if (!tr || i < 0 || i >= ids.length) return;
    const left = i * tr.clientWidth, smooth = !instant && !reduceMotion() && Math.abs(tr.scrollLeft - left) > 1;
    mark(i, { smooth, now: !smooth });
    target = smooth ? i : -1;
    if (smooth) {
      moving = true; // until the scroll settles (scrollend, or the timer the scroll events keep pushing back)
      clearTimeout(settleT); settleT = setTimeout(onSettle, 900);
    }
    tr.scrollTo({ left, behavior: smooth ? "smooth" : "instant" });
    if (focus) tabOf(ids[i])?.focus();
  }

  /* ---------- the track: follow the swipe cheaply, finish the work once it settles ---------- */
  function onScroll() {
    moving = true;
    if (!raf) raf = requestAnimationFrame(follow);
    clearTimeout(settleT);
    settleT = setTimeout(onSettle, 140); // where scrollend isn't supported (and as a safety net)
  }
  /** Once a frame while moving: the chapter under the middle of the screen gets the underline. */
  function follow() {
    raf = 0;
    if (target >= 0) return; // a tap or key chose the chapter: keep its name lit on the way there
    const tr = track(); if (!tr) return;
    const i = chapterAt(tr.scrollLeft, tr.clientWidth, ids.length);
    if (i === shown) return;
    shown = i;
    if (ids[i] !== get()) set(ids[i]);
    markTabs(i);
    wake(i); // half on screen: about to be tapped
  }
  function onSettle() {
    clearTimeout(settleT); settleT = null;
    if (!moving) return;
    moving = false; target = -1;
    const tr = track(); if (!tr || !tr.clientWidth) return;
    const i = clamp(chapterAt(tr.scrollLeft, tr.clientWidth, ids.length));
    mark(i, { smooth: true });
  }

  /** Build the frame (top row, bar, chapters) when the list of chapters changed. Returns true when it was rebuilt. */
  function ensure(root, list, names) {
    el = root;
    if (el.dataset.sig === list.join() && track()) return false;
    ids = list.slice();
    shown = -1; moving = false; target = -1;
    const many = ids.length > 1, cur = index();
    const barHTML = many ? `<div class="zt-cb${scrollBar ? " ch-scroll" : ""}" role="tablist" aria-label="${esc(label)}">${ids.map((c, i) => `<button type="button" role="tab" id="${prefix}-tab-${c}" aria-controls="${prefix}-ch-${c}" aria-selected="${i === cur}" tabindex="${i === cur ? 0 : -1}" class="${i === cur ? "on" : ""}" data-i="${i}">${esc(names[c] || c)}</button>`).join("")}</div>` : "";
    el.innerHTML = `<div class="zt-top"></div>${barHTML}<div class="zt-track ${many ? "" : "one"}">${ids.map((c, i) => `<section class="zt-ch" id="${prefix}-ch-${c}" ${many ? `role="tabpanel" aria-labelledby="${prefix}-tab-${c}"${i === cur ? "" : " inert"}` : ""}></section>`).join("")}</div>`;
    el.dataset.sig = ids.join();
    const tr = track();
    tr.addEventListener("scroll", onScroll, { passive: true });
    tr.addEventListener("scrollend", onSettle, { passive: true });
    // a finger still on the glass: not settled yet, whatever the timer says
    tr.addEventListener("touchstart", () => { moving = true; target = -1; clearTimeout(settleT); }, { passive: true });
    tr.addEventListener("touchend", () => { clearTimeout(settleT); settleT = setTimeout(onSettle, 140); }, { passive: true });
    const b = bar();
    if (b) {
      b.addEventListener("click", e => { const t = e.target.closest("[role=tab]"); if (t) show(+t.dataset.i); });
      if (scrollBar) b.addEventListener("scroll", edges, { passive: true });
      b.addEventListener("keydown", e => {
        const k = e.key, n = ids.length, i = index();
        const to = k === "ArrowRight" ? (i + 1) % n : k === "ArrowLeft" ? (i - 1 + n) % n : k === "Home" ? 0 : k === "End" ? n - 1 : -1;
        if (to < 0) return;
        e.preventDefault(); show(to, { focus: true });
      });
    }
    return true;
  }
  /**
   * After filling the chapters: land on the remembered chapter without animating (on open, after a rotation).
   * Redraws while the track is moving (the 20 s tick, a sync) leave it alone, so they never pull a swipe back.
   */
  function land() {
    if (!el || !ids.length) return;
    if (!ids.includes(get())) set(ids[0]);
    if (moving) return;
    const i = index(), tr = track();
    if (tr && tr.clientWidth && chapterAt(tr.scrollLeft, tr.clientWidth, ids.length) !== i) tr.scrollTo({ left: i * tr.clientWidth, behavior: "instant" });
    if (i !== shown || tabOf(ids[i])?.tabIndex !== 0 || (ids.length > 1 && panelOf(ids[i])?.inert)) mark(i, { now: true });
    if (toTop && tr && tr.clientWidth) { toTop = false; for (const c of ids) { const p = panelOf(c); if (p && p.scrollTop) p.scrollTop = 0; } }
  }
  /** Back to the first chapter, scrolled to the top (see resetChapters). */
  function reset(now = false) {
    if (!ids.length) return;
    if (get() !== ids[0]) set(ids[0]);
    const tr = track();
    if (!now || !tr || !tr.clientWidth) { toTop = true; return; }
    toTop = false;
    const smooth = !reduceMotion(), cur = index();
    ids.forEach((c, j) => {
      const p = panelOf(c); if (!p || !p.scrollTop) return;
      if (j === cur && smooth) p.scrollTo({ top: 0, behavior: "smooth" }); else p.scrollTop = 0;
    });
    show(0);
  }
  addEventListener("resize", () => { if (el?.classList.contains("on")) { moving = false; land(); } });

  ALL.add({ inside: root => !!el && (root === el || root.contains(el)), reset });
  return { ensure, show, land, reset, top: () => q(".zt-top"), panel: panelOf, ids: () => ids.slice(), index };
}
