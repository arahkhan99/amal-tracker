/*
 * Drag a sheet down to close it, as on iPhone. Only when the sheet is scrolled to the top and the finger moves
 * mostly downward; otherwise the sheet scrolls as usual. Released far enough (or flicked), it closes
 * (app.js closeSheet slides it the rest of the way); otherwise it springs back (css/polish.css .settle).
 * Touch only: a mouse closes with the scrim, Escape or ✕. Sliders, inputs and horizontal swipes are left alone.
 */
import { closeSheet } from "./app.js";

const CLOSE_PX = 110, FLICK = 0.6; // px, px per ms

export function initSheetDrag(sheet = document.querySelector("#sheet")) {
  if (!sheet || typeof sheet.addEventListener !== "function") return;
  let y0 = 0, x0 = 0, dy = 0, lastY = 0, lastT = 0, v = 0, state = null; // null | "maybe" | "drag" | "no"
  sheet.addEventListener("touchstart", e => {
    if (e.touches.length !== 1 || e.target.closest?.("input,textarea,select,[type=range],.no-drag")) { state = "no"; return; }
    const t = e.touches[0];
    y0 = lastY = t.clientY; x0 = t.clientX; lastT = e.timeStamp; dy = 0; v = 0;
    state = sheet.scrollTop <= 0 ? "maybe" : "no";
  }, { passive: true });
  sheet.addEventListener("touchmove", e => {
    if (state === "no" || state === null) return;
    const t = e.touches[0], ddy = t.clientY - y0, ddx = t.clientX - x0;
    if (state === "maybe") {
      if (Math.abs(ddy) < 6 && Math.abs(ddx) < 6) return;
      if (ddy <= 0 || Math.abs(ddx) > Math.abs(ddy)) { state = "no"; return; }
      state = "drag";
      sheet.classList.add("dragging");
    }
    e.preventDefault(); // don't scroll or bounce while the sheet follows the finger
    dy = Math.max(0, ddy);
    v = (t.clientY - lastY) / Math.max(1, e.timeStamp - lastT);
    lastY = t.clientY; lastT = e.timeStamp;
    sheet.style.transform = `translateY(${dy}px)`;
  }, { passive: false });
  const end = () => {
    if (state !== "drag") { state = null; return; }
    state = null;
    sheet.classList.remove("dragging");
    if (dy > CLOSE_PX || v > FLICK) { closeSheet(); return; }
    sheet.classList.add("settle");
    sheet.style.transform = "";
    setTimeout(() => sheet.classList.remove("settle"), 360);
  };
  sheet.addEventListener("touchend", end);
  sheet.addEventListener("touchcancel", end);
}
