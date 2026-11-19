/* Settings → Appearance: text size and Arabic text size (Mode, light/dark, is app.js applyTheme).
 * Both are stored as a step index (S.settings.textSize, S.settings.arSize) and applied as CSS variables on <html>:
 *  - --ui-scale: the whole interface, on top of the phone's own text size (theme.css zooms each view, the tab bar
 *    and sheets; tablet.css multiplies its own zoom by it).
 *  - --ar-scale: Arabic text only (.ar[lang=ar], the readers' --tl-ar, the set-up and Appearance samples).
 * Each reader's Aa still changes its own size on top of this. */

/** Text size steps: one smaller than the phone's size, the phone's own size (default), then larger. */
export const TEXT_SIZES = [0.92, 1, 1.1, 1.2, 1.32];
export const TEXT_DEFAULT = 1;
/** Arabic text size steps; the middle one is the size each screen was designed at. */
export const AR_SIZES = [0.85, 0.93, 1, 1.12, 1.25];
export const AR_DEFAULT = 2;

const pick = (v, list, d) => (Number.isInteger(v) && v >= 0 && v < list.length ? v : d);
export const textSizeIndex = S => pick(S?.settings?.textSize, TEXT_SIZES, TEXT_DEFAULT);
export const arSizeIndex = S => pick(S?.settings?.arSize, AR_SIZES, AR_DEFAULT);
export const textScale = S => TEXT_SIZES[textSizeIndex(S)];
export const arScale = S => AR_SIZES[arSizeIndex(S)];

/** Set a size step (kind "text" | "ar"); out-of-range values are clamped. Returns the stored index. */
export function setSize(S, kind, i) {
  const list = kind === "ar" ? AR_SIZES : TEXT_SIZES;
  const n = Math.max(0, Math.min(list.length - 1, Math.round(Number(i) || 0)));
  S.settings[kind === "ar" ? "arSize" : "textSize"] = n;
  return n;
}

/** Write --ui-scale and --ar-scale onto `root` (the <html> element by default). Unchanged values are skipped. */
export function applyScales(S, root = typeof document !== "undefined" ? document.documentElement : null) {
  if (!root?.style) return;
  const ui = String(textScale(S)), ar = String(arScale(S));
  if (root.style.getPropertyValue?.("--ui-scale") !== ui) root.style.setProperty("--ui-scale", ui);
  if (root.style.getPropertyValue?.("--ar-scale") !== ar) root.style.setProperty("--ar-scale", ar);
}
