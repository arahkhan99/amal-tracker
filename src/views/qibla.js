/*
 * The Qibla page: the bearing to the Kaʿbah from the saved location, the distance to Makkah, and a live compass
 * dial where the phone has one. Maths in ../qibla.js; styles in ../css/qibla.css.
 *
 * Use:
 *   el.innerHTML = qiblaView(S.settings.location);   // {lat, lng, label} or null (→ "Set your location")
 *   mountQibla(el, { onBack });                       // starts the sensors; Back → onBack, else A.closeQibla, else history.back()
 *   unmountQibla();                                   // when leaving the page (also safe to call twice)
 * "Change" calls A.openLocation?.() (the app's location sheet).
 *
 * Sensors:
 *   Android / Chrome WebView: `deviceorientationabsolute`, heading = 360 − alpha (+ screen angle), starts on mount.
 *   iOS: `deviceorientation` with webkitCompassHeading, after DeviceOrientationEvent.requestPermission(), which
 *        must come from a tap, so the page shows "Start compass" first.
 *   Anything else: `deviceorientation` only if it carries webkitCompassHeading or absolute === true.
 *   No reading within a few seconds (desktop, phones without a magnetometer) → the static dial, North up, with
 *   the Qibla marked and the bearing in words.
 * Per frame (requestAnimationFrame) the only DOM write is the dial's CSS transform; everything else (facing,
 * turn left/right, hints, mode) is a data attribute that changes only when its value changes. Listeners, the
 * frame loop and timers stop on unmount and while the page is hidden, and start again when it is shown.
 * Magnetic vs true North: see the note at the top of ../qibla.js (not corrected; the page says so).
 */
import { tick as hTick, done as hDone } from "../haptics.js";
import { esc } from "../util.js";
import {
  qiblaFor, compassPoint, formatDistance, usesMiles, headingFromAlpha, headingFromWebkit, smoothHeading,
  smoothingFactor, headingJitter, facing, turnHint, angleDiff, POOR_ACCURACY, JITTER_CALIBRATE, JITTER_STEADY, JITTER_BROKEN,
} from "../qibla.js";

/* Strings live here while the page is not wired in; they can move to strings.js with the navigation. */
export const QB = {
  title: "Qibla",
  back: "Back",
  change: "Change",
  noLocation: "Set your location to find the Qibla.",
  setLocation: "Set location",
  fromNorth: "from true North",
  distance: "Distance to Makkah",
  start: "Start compass",
  startSub: "Uses your phone's compass to point the way.",
  finding: "Finding North…",
  facing: "Facing the Qibla",
  left: "Turn left",
  right: "Turn right",
  none: deg => `Compass not available on this device — the Qibla is at ${deg}° from North`,
  denied: deg => `Compass access was not allowed — the Qibla is at ${deg}° from North`,
  calibrate: "Calibrate: move your phone in a figure-8",
  flat: "Hold your phone flat",
  foot: "Bearing from true North. Phone compasses read magnetic North and can be a few degrees off: keep the phone flat and away from metal and magnets.",
  dial: deg => `Compass dial. The Qibla, toward the Kaʿbah, is at ${deg}° from North.`,
};

const NO_READING_MS = 3000;   // no usable reading in this long → the compass is not available
const BROKEN_MS = 4000;       // readings this jumpy for this long → static dial until they settle
const SETTLE_MS = 2000;       // steady this long → live again
const FLAT_BETA = 65;         // |beta| beyond this: the phone is held upright, the heading is unreliable
const SAMPLES = 24;           // raw readings kept for the jitter check
const SMOOTH_TAU = 110;       // ms; low-pass time constant

const svg = (d, cls = "") => `<svg class="qb-i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const ICON = {
  back: '<path d="M15 5l-7 7 7 7"/>',
  pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.01"/>',
  turn: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/>',
};

/* ---------- the dial (SVG, 300 × 300, centre 150) ---------- */
const C = 150, R = 138;
const pt = (deg, r) => { const a = (deg - 90) * Math.PI / 180; return [C + r * Math.cos(a), C + r * Math.sin(a)]; };
const f1 = n => Math.round(n * 10) / 10;

function dialSvg(bearing) {
  let ticks = "";
  for (let d = 0; d < 360; d += 5) {
    const major = d % 30 === 0, card = d % 90 === 0;
    const [x1, y1] = pt(d, R - 3), [x2, y2] = pt(d, R - (card ? 16 : major ? 12 : 7));
    ticks += `<line class="${card ? "tc" : major ? "tj" : "tn"}" x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}"/>`;
  }
  const labels = [["N", 0], ["E", 90], ["S", 180], ["W", 270]].map(([t, d]) => {
    const [x, y] = pt(d, R - 34);
    return `<text class="ql${t === "N" ? " qn" : ""}" x="${f1(x)}" y="${f1(y)}" transform="rotate(${d} ${f1(x)} ${f1(y)})">${t}</text>`;
  }).join("");
  // degree numbers every 30° except the cardinals, and except one that the Qibla tick would sit on
  const nums = [30, 60, 120, 150, 210, 240, 300, 330].filter(d => bearing == null || Math.abs(angleDiff(d, bearing)) > 9).map(d => {
    const [x, y] = pt(d, R - 26);
    return `<text class="qd" x="${f1(x)}" y="${f1(y)}" transform="rotate(${d} ${f1(x)} ${f1(y)})">${d}</text>`;
  }).join("");
  let qibla = "";
  if (bearing != null) {
    // the Qibla line from the hub to the Kaʿbah marker, drawn pointing up and rotated to the bearing; the marker
    // is drawn upright in that frame, so it stands upright when the phone faces the Qibla. On the static dial
    // (North up) CSS turns it back upright with --qb-kb.
    qibla = `<g class="qq" transform="rotate(${f1(bearing)} ${C} ${C})">
      <line class="qq-line" x1="${C}" y1="${C - 14}" x2="${C}" y2="${C - 62}"/>
      <circle class="qq-halo" cx="${C}" cy="${C - 80}" r="22"/>
      <g class="qq-kaaba">
        <rect class="qk-body" x="${C - 12}" y="${C - 92}" width="24" height="24" rx="2.5"/>
        <rect class="qk-band" x="${C - 12}" y="${C - 86}" width="24" height="3.6"/>
        <rect class="qk-door" x="${C + 3}" y="${C - 79.5}" width="5" height="9" rx="1"/>
      </g>
      <line class="qq-tick" x1="${C}" y1="${C - R + 1}" x2="${C}" y2="${C - R + 20}"/>
    </g>`;
  }
  return `<svg class="qb-dsvg" viewBox="0 0 300 300" aria-hidden="true">
    <circle class="qf" cx="${C}" cy="${C}" r="${R}"/>
    <g class="qt">${ticks}</g>${nums}${labels}${qibla}
  </svg>`;
}

/**
 * The page. `location`: the app's S.settings.location ({lat, lng, label}); null shows "Set your location".
 * `opts.locale` picks km or miles (default: the phone's language).
 */
export function qiblaView(location, opts = {}) {
  const locale = opts.locale || (typeof navigator !== "undefined" && navigator.language) || "en";
  const miles = opts.miles ?? usesMiles(locale);
  const q = qiblaFor(location);
  // the time-of-day band (css/band.css): "‹ Today" (where it was opened: opts.backLabel), the title in Amiri
  const back = opts.backLabel ? `<span>${esc(opts.backLabel)}</span>` : "";
  const top = `<i class="zb-sb" aria-hidden="true"></i><header class="zb zb-pg has-back qb-top"><button type="button" class="zb-back" data-qb="back" aria-label="${esc(QB.back)}">${svg(ICON.back)}${back}</button><div class="zb-r1"><h1 class="zb-t qb-pg">${esc(QB.title)}</h1></div></header>`;

  if (!q) {
    return `<div class="qb" data-mode="noloc">${top}
      <div class="qb-empty"><div class="qb-emptydial">${dialSvg(null)}</div>
        <p>${esc(QB.noLocation)}</p>
        <button type="button" class="qb-btn" data-qb="change">${svg(ICON.pin)}${esc(QB.setLocation)}</button></div></div>`;
  }

  const deg = Math.round(q.bearing) % 360;
  const label = (location.label || "").trim() || `${location.lat.toFixed(2)}, ${location.lng.toFixed(2)}`;
  return `<div class="qb" data-mode="init" data-turn="" data-hint="" data-bearing="${q.bearing.toFixed(3)}" style="--qb-kb:${f1(-q.bearing)}deg">${top}
    <div class="qb-body">
      <div class="qb-loc">${svg(ICON.pin, "qb-pin")}<span class="qb-place">${esc(label)}</span><button type="button" class="qb-link" data-qb="change">${esc(QB.change)}</button></div>
      <div class="qb-num"><b>${deg}<span class="qb-deg">°</span></b><small>${compassPoint(q.bearing)} · ${esc(QB.fromNorth)}</small></div>
      <div class="qb-dial" role="img" aria-label="${esc(QB.dial(deg))}">
        <span class="qb-lub" aria-hidden="true"></span>
        <div class="qb-card">${dialSvg(q.bearing)}</div>
        <span class="qb-hub" aria-hidden="true"></span>
      </div>
      <div class="qb-state" aria-live="polite">
        <p class="qb-turn"><span class="qb-s-facing">${esc(QB.facing)}</span><span class="qb-s-left">${esc(QB.left)}</span><span class="qb-s-right">${esc(QB.right)}</span></p>
        <p class="qb-wait">${esc(QB.finding)}</p>
        <div class="qb-perm"><button type="button" class="qb-btn" data-qb="start">${svg(ICON.compass)}${esc(QB.start)}</button><small>${esc(QB.startSub)}</small></div>
        <p class="qb-msg qb-m-none">${svg(ICON.info)}<span>${esc(QB.none(deg))}</span></p>
        <p class="qb-msg qb-m-denied">${svg(ICON.info)}<span>${esc(QB.denied(deg))}</span></p>
      </div>
      <div class="qb-hints"><p class="qb-hint qb-h-calibrate">${svg(ICON.turn)}<span>${esc(QB.calibrate)}</span></p>
      <p class="qb-hint qb-h-flat">${svg(ICON.info)}<span>${esc(QB.flat)}</span></p></div>
      <div class="qb-facts"><span>${esc(QB.distance)}</span><b>${esc(formatDistance(q.km, { miles, locale }))}</b></div>
      <p class="qb-foot">${esc(QB.foot)}</p>
    </div></div>`;
}

/* ---------- sensors ---------- */
let st = null;

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
function screenAngle() {
  const a = typeof screen !== "undefined" && screen.orientation && screen.orientation.angle;
  if (Number.isFinite(a)) return a;
  const w = typeof window !== "undefined" ? window.orientation : 0; // older iOS: 0, 90, -90, 180
  return Number.isFinite(w) ? w : 0;
}
// A counter step taps lightly, its last count gives a gentle "done" (haptics.js: works on iPhone too)
function vibrate(ms) { if (ms >= 25) hDone(ms); else hTick(ms); }

/** Set a data attribute only when it changes (no style work otherwise). */
function setData(k, v) {
  if (!st || st.root.dataset[k] === v) return;
  st.root.dataset[k] = v;
}
function setMode(m) {
  if (!st) return;
  st.mode = m;
  setData("mode", m);
  if (m !== "live") { st.card.style.transform = ""; st.shown = null; setData("turn", ""); setData("hint", ""); st.facing = false; st.root.classList.remove("is-facing"); }
}

function pickSource() {
  if (typeof window === "undefined") return null;
  if ("ondeviceorientationabsolute" in window) return "absolute";
  if (typeof window.DeviceOrientationEvent?.requestPermission === "function") return "webkit";
  if ("DeviceOrientationEvent" in window) return "generic";
  return null;
}

function onReading(e) {
  if (!st) return;
  let h = null, poor = false;
  if (st.source === "absolute") {
    h = headingFromAlpha(e.alpha, screenAngle());
  } else if (Number.isFinite(e.webkitCompassHeading)) {
    h = headingFromWebkit(e.webkitCompassHeading, screenAngle());
    const acc = e.webkitCompassAccuracy;
    poor = Number.isFinite(acc) && (acc < 0 || acc > POOR_ACCURACY);
  } else if (e.absolute === true) {
    h = headingFromAlpha(e.alpha, screenAngle());
  }
  if (h == null) return;
  const t = now();
  st.raw = h;
  st.samples.push(h);
  if (st.samples.length > SAMPLES) st.samples.shift();
  const jit = headingJitter(st.samples);

  // calibration tip: poor iOS accuracy, or readings jumping about (hysteresis so it does not flicker)
  st.calib = poor || (st.calib ? jit > JITTER_STEADY : jit > JITTER_CALIBRATE);
  const upright = Number.isFinite(e.beta) && Math.abs(e.beta) > FLAT_BETA;

  // badly unstable for a while → static dial with the bearing in words; back to live once it settles
  if (jit > JITTER_BROKEN) { st.badSince ??= t; st.goodSince = null; } else { st.goodSince ??= t; if (jit < JITTER_STEADY) st.badSince = null; }
  if (st.mode === "live" && st.badSince != null && t - st.badSince > BROKEN_MS) setMode("none");
  else if (st.mode !== "live" && (st.mode === "waiting" || (st.mode === "none" && st.goodSince != null && t - st.goodSince > SETTLE_MS && st.badSince == null))) {
    clearTimeout(st.noReading);
    setMode("live");
  }
  if (st.mode === "live") setData("hint", st.calib ? "calibrate" : upright ? "flat" : "");
  if (st.raf == null) st.raf = requestAnimationFrame(frame);
}

function frame(t) {
  if (!st) return;
  st.raf = requestAnimationFrame(frame);
  if (st.raw == null) return;
  const dt = st.lastT == null ? 16 : Math.min(250, t - st.lastT);
  st.lastT = t;
  st.smooth = smoothHeading(st.smooth, st.raw, st.smooth == null ? 1 : smoothingFactor(dt, SMOOTH_TAU));
  if (st.mode !== "live") return;
  // the one per-frame write; skipped when the dial would not visibly move
  if (st.shown == null || Math.abs(angleDiff(st.shown, st.smooth)) > 0.05) {
    st.shown = st.smooth;
    st.card.style.transform = `rotate(${(-st.smooth).toFixed(2)}deg)`;
  }
  const f = facing(st.smooth, st.bearing, st.facing);
  if (f !== st.facing) {
    st.facing = f;
    st.root.classList.toggle("is-facing", f);
    if (f) vibrate(10);
  }
  setData("turn", turnHint(st.smooth, st.bearing, f));
}

function listen() {
  if (!st || st.listening) return;
  st.listening = true;
  st.evName = st.source === "absolute" ? "deviceorientationabsolute" : "deviceorientation";
  window.addEventListener(st.evName, onReading);
  if (st.mode !== "live" && st.mode !== "none") setMode("waiting");
  clearTimeout(st.noReading);
  st.noReading = setTimeout(() => { if (st && st.raw == null) setMode("none"); }, NO_READING_MS);
}
function stopSensors() {
  if (!st) return;
  if (st.listening) window.removeEventListener(st.evName, onReading);
  st.listening = false;
  if (st.raf != null) cancelAnimationFrame(st.raf);
  st.raf = null; st.lastT = null;
  clearTimeout(st.noReading);
}

async function startIOS() {
  if (!st) return;
  try {
    const r = await window.DeviceOrientationEvent.requestPermission();
    if (!st) return;
    if (r === "granted") { st.granted = true; listen(); } else setMode("denied");
  } catch { if (st) setMode("none"); }
}

function onVisibility() {
  if (!st) return;
  if (document.hidden) { stopSensors(); return; }
  // shown again: carry on where it was (iOS only once permission was given)
  if (st.source && (st.source !== "webkit" || st.granted) && st.mode !== "denied") {
    st.raw = null; st.samples = []; st.badSince = st.goodSince = null;
    if (st.mode === "live") setMode("waiting");
    listen();
  }
}

function onClick(e) {
  const b = e.target.closest?.("[data-qb]");
  if (!b || !st) return;
  const A = window.A || {};
  const act = b.dataset.qb;
  if (act === "back") { if (st.onBack) st.onBack(); else if (A.closeQibla) A.closeQibla(); else history.back(); }
  else if (act === "change") A.openLocation?.();
  else if (act === "start") startIOS();
}

/** Start the page's sensors. `el` holds qiblaView()'s markup. */
export function mountQibla(el, { onBack } = {}) {
  unmountQibla();
  const root = el?.querySelector?.(".qb") || el;
  if (!root) return;
  st = {
    el, root, onBack, card: root.querySelector(".qb-card") || { style: {} }, bearing: Number(root.dataset.bearing),
    mode: root.dataset.mode, source: null, granted: false, listening: false, raw: null, smooth: null, shown: null,
    lastT: null, raf: null, samples: [], facing: false, calib: false, badSince: null, goodSince: null, noReading: null,
  };
  el.addEventListener("click", onClick);
  document.addEventListener("visibilitychange", onVisibility);
  if (st.mode === "noloc" || !Number.isFinite(st.bearing)) return;
  st.source = pickSource();
  if (!st.source) setMode("none");
  else if (st.source === "webkit") setMode("permission");
  else if (!document.hidden) listen();
}

/** Stop everything mountQibla started. */
export function unmountQibla() {
  if (!st) return;
  stopSensors();
  st.el?.removeEventListener?.("click", onClick);
  document.removeEventListener("visibilitychange", onVisibility);
  st = null;
}

/** For tests and the mock page: feed a heading as if from the sensor (Android path). */
export function _simulateHeading(deg, extra = {}) {
  if (!st) return;
  if (!st.source) st.source = "absolute";
  onReading({ alpha: (360 - deg) % 360, beta: 0, ...extra });
}
