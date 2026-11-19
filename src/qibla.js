/*
 * Qibla: the direction and distance to the Kaʿbah from a point, and the small pieces of compass maths the Qibla
 * page (views/qibla.js) runs on every sensor reading. Pure functions, no DOM, so tests can import it.
 *
 * Angles are degrees clockwise from North in [0, 360). The bearing is the great-circle initial bearing
 * (the direction you set off in along the shortest path over the globe), measured from TRUE north.
 *
 * Magnetic vs true north: `deviceorientationabsolute` (Android / Chrome WebView, from the rotation-vector
 * sensor) and iOS `webkitCompassHeading` are both referenced to MAGNETIC north on most devices. We do not
 * correct for magnetic declination. A useful World Magnetic Model needs the full 12th-degree coefficient set
 * (≈170 numbers, replaced every 5 years); a dipole-only shortcut is wrong by 5–10° in many places, which is
 * worse than an honest limitation. Declination is within about ±5° across most of Europe, Africa, the Middle
 * East, South and South-East Asia, but it reaches 10–15° in parts of North America (e.g. −14° in Maine,
 * +14° in Seattle) and 20°+ in New Zealand. The page therefore says the number is "from true North", and
 * the live dial is a guide; a map or the sun are the precise check. If the app ever needs better, apply a
 * declination here (heading_true = heading_magnetic + declination) — a native compass plugin on iOS can give
 * trueHeading directly once location permission is granted.
 */

/** The Kaʿbah, Makkah. */
export const KAABA = Object.freeze({ lat: 21.4225, lng: 39.8262 });

/** Mean Earth radius (IUGG), km. */
export const EARTH_KM = 6371.0088;
export const KM_PER_MI = 1.609344;

const RAD = Math.PI / 180;

/** An angle folded into [0, 360). */
export function norm360(a) {
  const x = a % 360;
  return x < 0 ? x + 360 : x === 0 ? 0 : x; // `=== 0` turns -0 into 0
}

/** The signed shortest turn from `from` to `to`, in (-180, 180]. Positive = clockwise (turn right). */
export function angleDiff(from, to) {
  const d = norm360(to - from);
  return d > 180 ? d - 360 : d;
}

/** Great-circle initial bearing from point `a` to point `b` ({lat, lng} in degrees), degrees from true North. */
export function bearing(a, b = KAABA) {
  const f1 = a.lat * RAD, f2 = b.lat * RAD, dl = (b.lng - a.lng) * RAD;
  const y = Math.sin(dl) * Math.cos(f2);
  const x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
  return norm360(Math.atan2(y, x) / RAD);
}

/** Great-circle (haversine) distance in km. */
export function distanceKm(a, b = KAABA) {
  const dLat = (b.lat - a.lat) * RAD, dLng = (b.lng - a.lng) * RAD;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Whether a location is usable: finite lat in [-90, 90] and lng in [-180, 180]. */
export function validLocation(loc) {
  return !!loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng) && Math.abs(loc.lat) <= 90 && Math.abs(loc.lng) <= 180;
}

/** Bearing, distance and whether the point is (practically) at the Kaʿbah, where a direction means nothing. */
export function qiblaFor(loc) {
  if (!validLocation(loc)) return null;
  const km = distanceKm(loc);
  return { bearing: bearing(loc), km, mi: km / KM_PER_MI, atKaaba: km < 0.05 };
}

/** Countries that give road distances in miles. `locale` like "en-US"; falls back to km. */
const MILE_REGIONS = new Set(["US", "GB", "LR", "MM"]);
export function usesMiles(locale = "") {
  const region = String(locale).split(/[-_]/)[1];
  return !!region && MILE_REGIONS.has(region.toUpperCase());
}

/** "4,794 km" / "2,979 mi"; under 10 one decimal ("3.4 km"). */
export function formatDistance(km, { miles = false, locale } = {}) {
  const v = miles ? km / KM_PER_MI : km;
  const digits = v < 10 ? 1 : 0;
  const n = new Intl.NumberFormat(locale || "en", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(v);
  return `${n} ${miles ? "mi" : "km"}`;
}

/** A compass point for a bearing, 16-wind: 118.99 → "ESE". */
const POINTS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
export function compassPoint(deg) { return POINTS[Math.round(norm360(deg) / 22.5) % 16]; }

/**
 * Compass heading from a `deviceorientationabsolute` alpha, corrected for screen orientation.
 * alpha grows counter-clockwise (W3C), so the top edge of the device points at 360 − alpha. When the screen is
 * rotated (screen.orientation.angle 90 / 180 / 270, counter-clockwise), the top of the SCREEN is that many
 * degrees clockwise of the device's top edge, so it is added.
 */
export function headingFromAlpha(alpha, screenAngle = 0) {
  if (!Number.isFinite(alpha)) return null;
  return norm360(360 - alpha + (Number(screenAngle) || 0));
}

/** iOS: webkitCompassHeading is already clockwise from (magnetic) North for the device's top edge. */
export function headingFromWebkit(compassHeading, screenAngle = 0) {
  if (!Number.isFinite(compassHeading) || compassHeading < 0) return null; // -1 = not calibrated / unknown
  return norm360(compassHeading + (Number(screenAngle) || 0));
}

/**
 * Low-pass filter for a heading that wraps around: moves `prev` a fraction `k` of the SHORTEST way towards
 * `next`, so 359° → 1° steps through 0°, not back through 180°. `prev` null starts at `next`.
 */
export function smoothHeading(prev, next, k = 0.15) {
  if (prev == null || !Number.isFinite(prev)) return norm360(next);
  return norm360(prev + angleDiff(prev, next) * k);
}

/**
 * A frame-rate-independent smoothing factor: the same feel at 60 and 120 Hz. `tau` is the time constant in ms
 * (≈ the time to cover 63% of a step).
 */
export function smoothingFactor(dtMs, tau = 120) {
  if (!(dtMs > 0)) return 0;
  return 1 - Math.exp(-dtMs / tau);
}

/**
 * Circular spread (standard deviation, degrees) of recent headings; ~0 for a steady phone, large when readings
 * jump. Works across the 0/360 seam.
 */
export function circularSpread(angles) {
  if (!angles || angles.length < 2) return 0;
  let s = 0, c = 0;
  for (const a of angles) { s += Math.sin(a * RAD); c += Math.cos(a * RAD); }
  const R = Math.min(1, Math.hypot(s, c) / angles.length);
  if (R <= 1e-9) return 180;
  return Math.sqrt(-2 * Math.log(R)) / RAD;
}

/**
 * Jitter (degrees, RMS of the second difference) of consecutive raw headings. A phone turning smoothly has a
 * steady step from reading to reading, so this stays small even while it turns; a disturbed magnetometer
 * (near metal, uncalibrated) jumps about and this grows. Across the 0/360 seam each step is the shortest turn.
 */
export function headingJitter(angles) {
  if (!angles || angles.length < 3) return 0;
  let sum = 0, n = 0;
  for (let i = 2; i < angles.length; i++) {
    const d = angleDiff(angles[i - 1], angles[i]) - angleDiff(angles[i - 2], angles[i - 1]);
    sum += d * d; n++;
  }
  return Math.sqrt(sum / n);
}

/** Degrees: within this of the Qibla counts as facing it; it stops counting beyond EXIT (hysteresis, no flicker). */
export const FACING_ENTER = 3;
export const FACING_EXIT = 5;
/** Jitter above CALIBRATE shows the figure-8 tip (it hides again below STEADY); above BROKEN for a few
 *  seconds the live dial gives way to the static one. */
export const JITTER_CALIBRATE = 8;
export const JITTER_STEADY = 4;
export const JITTER_BROKEN = 30;
/** iOS webkitCompassAccuracy above this (± degrees) is poor. */
export const POOR_ACCURACY = 20;

/** Facing state with hysteresis: true within ±ENTER, stays true until beyond ±EXIT. */
export function facing(heading, qibla, wasFacing = false) {
  if (!Number.isFinite(heading) || !Number.isFinite(qibla)) return false;
  const off = Math.abs(angleDiff(heading, qibla));
  return wasFacing ? off <= FACING_EXIT : off <= FACING_ENTER;
}

/** Which way to turn: "facing" | "left" | "right" (from the signed offset heading → qibla). */
export function turnHint(heading, qibla, isFacing) {
  if (isFacing) return "facing";
  return angleDiff(heading, qibla) < 0 ? "left" : "right";
}
