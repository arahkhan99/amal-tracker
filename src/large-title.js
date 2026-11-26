/*
 * Large titles, as on iPhone (polish pass, 25 Nov 2026): on a page whose big title scrolls away with the page
 * (the band header .zb-pg: Settings and its pages, and the other full pages built the same way), a slim frosted
 * bar with the title in small type fades in at the top once the big one has gone under it. Tapping the bar scrolls
 * back to the top. Read and Progress keep their header in place (their chapters scroll beneath it), so they never
 * need it. One passive scroll listener on #screen, one rAF per frame at most; nothing runs while a sheet is up.
 */
import { onRender } from "./app.js";

let bar = null, raf = 0;

function check() {
  raf = 0;
  const screen = document.querySelector("#screen");
  const t = screen?.querySelector(".view.on .zb-pg .zb-t");
  if (!bar || !t) { bar?.classList.remove("on"); return; }
  const top = screen.getBoundingClientRect().top, barH = bar.offsetHeight || 0;
  const gone = t.getBoundingClientRect().bottom < top + barH;
  if (gone && bar.textContent !== t.textContent) bar.querySelector("b").textContent = t.textContent;
  bar.classList.toggle("on", gone);
}
const soon = () => { if (!raf) raf = requestAnimationFrame(check); };

export function initLargeTitles() {
  const phone = document.querySelector("#phone"), screen = document.querySelector("#screen");
  if (!phone || !screen || typeof screen.addEventListener !== "function") return;
  bar = document.createElement("div");
  bar.className = "ltbar";
  bar.setAttribute("aria-hidden", "true"); // the page's own heading is what screen readers use
  bar.innerHTML = "<b></b>";
  bar.addEventListener("click", () => screen.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }));
  phone.appendChild(bar);
  screen.addEventListener("scroll", soon, { passive: true });
  onRender(soon);
}
