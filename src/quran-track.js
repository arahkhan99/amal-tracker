/*
 * Automatic Qurʾān reading in the mushaf reader (the Qurʾān goal, src/quran-goal.js), without the DOM so tests can
 * drive the clock. views/tools/quran.js creates one tracker while the reader is open and feeds it:
 *   show(keys)   a page (or a tablet's two-page spread) is on screen; keys like "indopak15:12"
 *   turn(next)   the user turns away from it (next = forward, to the following page)
 *   interact()   any touch, tap, key or scroll in the reader
 *   hidden(h)    the app went to the background (true) or came back (false)
 *   tick()       a 5 s beat from the reader's one interval (only while the reader is open and the app visible)
 *   stop()       the reader closed
 * A page counts once it has been on screen for PAGE_MS of visible time, or when the user turns forward past it after
 * TURN_MS, so flicking through pages counts nothing. Minutes count only while the reader is visible and the user did
 * something in the last IDLE_MS; time in the background never counts. Seconds are handed over in whole seconds
 * (onSec) at least every FLUSH_MS, on hide and on stop, so a crash loses little and saving stays rare.
 */
export const PAGE_MS = 20000, TURN_MS = 10000, IDLE_MS = 120000, FLUSH_MS = 60000;

export function createTracker({ now = () => Date.now(), onPages = () => {}, onSec = () => {} } = {}) {
  let cur = null, sig = "", seen = 0, since = 0, visible = true, last = now(), accAt = now(), ms = 0, flushedAt = now();
  const counted = new Set();
  const pageMs = () => seen + (visible && cur ? now() - since : 0);
  function count() {
    if (!cur) return;
    const add = cur.filter(k => !counted.has(k));
    if (!add.length) return;
    add.forEach(k => counted.add(k));
    onPages(add);
  }
  function accrue() {
    const t = now();
    if (visible) { const until = Math.min(t, last + IDLE_MS); if (until > accAt) ms += until - accAt; }
    accAt = t;
  }
  function flush(force = false) {
    accrue();
    if (!force && now() - flushedAt < FLUSH_MS) return;
    flushedAt = now();
    const s = Math.floor(ms / 1000);
    if (s > 0) { ms -= s * 1000; onSec(s); }
  }
  const api = {
    show(keys) {
      const next = (keys || []).map(String), s = next.join("|");
      if (s === sig) return;
      accrue();
      if (pageMs() >= PAGE_MS) count();
      cur = next.length ? next : null; sig = s; seen = 0; since = now(); last = now();
    },
    turn(forward = true) {
      accrue(); last = now();
      const t = pageMs();
      if (t >= PAGE_MS || (forward && t >= TURN_MS)) count();
    },
    interact() { accrue(); last = now(); },
    hidden(h) {
      if (h === !visible) return;
      if (h) { accrue(); seen += cur ? now() - since : 0; visible = false; flush(true); }
      else { visible = true; since = now(); last = now(); accAt = now(); }
    },
    tick() {
      if (visible && pageMs() >= PAGE_MS) count();
      flush();
    },
    stop() {
      if (visible && pageMs() >= PAGE_MS) count();
      flush(true);
      cur = null; sig = "";
    },
    /** For tests: visible time on the current page (ms) and the seconds not yet handed over. */
    _state: () => ({ pageMs: pageMs(), ms, visible }),
  };
  return api;
}
