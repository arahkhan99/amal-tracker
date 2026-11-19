/*
 * Chapters: a tab's row of names over its chapters, side by side. The same component as Today's Now · Today
 * (views/home.js), so it looks and behaves the same: swipe (scroll-snap) or tap a name; keyboard: arrows, Home, End;
 * no animation with reduced motion; each chapter scrolls on its own; the chapter off screen is out of the tab order.
 * The bar of names scrolls sideways when they don't fit (narrow phones, large text) and keeps the active one in view.
 * Styles: css/today.css (.zt-cb, .zt-track, .zt-ch) and css/progress.css (.ch-scroll, the sideways bar).
 *
 * const ch = makeChapters({ prefix: "pr", label, get: () => UI.x, set: id => { UI.x = id; } });
 * ch.ensure(el, ids, names) builds the frame when the list changed; fill ch.top() and ch.panel(id); then ch.land().
 */
import { esc } from "../util.js";

const reduceMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Replace a node's content only when it changed; keep keyboard focus on the same control (data-f). */
export function setHTML(node, html) {
  if (!node || node._h === html) return;
  const f = node.contains(document.activeElement) ? document.activeElement.dataset?.f : null;
  node._h = html; node.innerHTML = html;
  if (f) node.querySelector(`[data-f="${f}"]`)?.focus({ preventScroll: true });
}

export function makeChapters({ prefix, label, get, set }) {
  let ids = [], el = null, scrollT = null;
  const q = s => (el ? el.querySelector(s) : null);
  const track = () => q(".zt-track");
  const bar = () => q(".zt-cb");
  const tabOf = id => q(`#${prefix}-tab-${id}`);
  const clamp = i => Math.max(0, Math.min(ids.length - 1, i));
  const index = () => Math.max(0, ids.indexOf(get()));

  /** Fade the bar's edge where more names are hidden. */
  function edges() {
    const b = bar(); if (!b) return;
    b.classList.toggle("fl", b.scrollLeft > 2);
    b.classList.toggle("fr", b.scrollLeft + b.clientWidth < b.scrollWidth - 2);
  }
  /** Scroll the bar (only sideways) so the active name is fully in view. */
  function reveal(i, smooth = false) {
    const b = bar(), t = tabOf(ids[i]);
    if (!b || !t) return;
    if (b.scrollWidth > b.clientWidth) {
      const pad = 24, left = t.offsetLeft - pad, right = t.offsetLeft + t.offsetWidth + pad - b.clientWidth;
      let x = b.scrollLeft;
      if (left < x) x = left; else if (right > x) x = right;
      x = Math.max(0, Math.min(x, b.scrollWidth - b.clientWidth));
      if (Math.abs(x - b.scrollLeft) > 1) b.scrollTo({ left: x, behavior: smooth && !reduceMotion() ? "smooth" : "auto" });
    }
    edges();
  }
  function mark(i, smooth) {
    ids.forEach((c, j) => {
      const tab = tabOf(c), panel = q(`#${prefix}-ch-${c}`);
      if (tab) { tab.setAttribute("aria-selected", String(i === j)); tab.tabIndex = i === j ? 0 : -1; tab.classList.toggle("on", i === j); }
      if (panel) panel.inert = ids.length > 1 && i !== j;
    });
    reveal(i, smooth);
  }
  /** Show chapter i (or an id). focus: move focus to its name (keyboard). */
  function show(i, { focus = false, instant = false } = {}) {
    if (typeof i === "string") i = ids.indexOf(i);
    const tr = track(); if (!tr || i < 0 || i >= ids.length) return;
    set(ids[i]);
    mark(i, true);
    tr.scrollTo({ left: i * tr.clientWidth, behavior: instant || reduceMotion() ? "auto" : "smooth" });
    if (focus) tabOf(ids[i])?.focus();
  }
  function onTrackScroll() {
    const tr = track(); if (!tr || !tr.clientWidth) return;
    const i = clamp(Math.round(tr.scrollLeft / tr.clientWidth));
    if (ids[i] !== get()) set(ids[i]);
    mark(i, true);
  }
  /** Build the frame (top row, bar, chapters) when the list of chapters changed. Returns true when it was rebuilt. */
  function ensure(root, list, names) {
    el = root;
    if (el.dataset.sig === list.join() && track()) return false;
    ids = list.slice();
    const many = ids.length > 1;
    const barHTML = many ? `<div class="zt-cb ch-scroll" role="tablist" aria-label="${esc(label)}">${ids.map((c, i) => `<button type="button" role="tab" id="${prefix}-tab-${c}" aria-controls="${prefix}-ch-${c}" aria-selected="${i === index()}" tabindex="${i === index() ? 0 : -1}" data-i="${i}">${esc(names[c] || c)}</button>`).join("")}</div>` : "";
    el.innerHTML = `<div class="zt-top"></div>${barHTML}<div class="zt-track ${many ? "" : "one"}">${ids.map(c => `<section class="zt-ch" id="${prefix}-ch-${c}" ${many ? `role="tabpanel" aria-labelledby="${prefix}-tab-${c}"` : ""}></section>`).join("")}</div>`;
    el.dataset.sig = ids.join();
    track().addEventListener("scroll", () => { clearTimeout(scrollT); scrollT = setTimeout(onTrackScroll, 90); }, { passive: true });
    const b = bar();
    if (b) {
      b.addEventListener("click", e => { const t = e.target.closest("[role=tab]"); if (t) show(+t.dataset.i); });
      b.addEventListener("scroll", edges, { passive: true });
      b.addEventListener("keydown", e => {
        const k = e.key, n = ids.length, i = index();
        const to = k === "ArrowRight" ? (i + 1) % n : k === "ArrowLeft" ? (i - 1 + n) % n : k === "Home" ? 0 : k === "End" ? n - 1 : -1;
        if (to < 0) return;
        e.preventDefault(); show(to, { focus: true });
      });
    }
    return true;
  }
  /** After filling the chapters: land on the remembered chapter without animating (on open, after a rotation). */
  function land() {
    if (!el || !ids.length) return;
    if (!ids.includes(get())) set(ids[0]);
    const i = index(), tr = track();
    if (tr && tr.clientWidth && Math.round(tr.scrollLeft / tr.clientWidth) !== i) tr.scrollLeft = i * tr.clientWidth;
    mark(i, false);
  }
  addEventListener("resize", () => { if (el?.classList.contains("on")) land(); });

  return { ensure, show, land, top: () => q(".zt-top"), panel: id => q(`#${prefix}-ch-${id}`), ids: () => ids.slice() };
}
