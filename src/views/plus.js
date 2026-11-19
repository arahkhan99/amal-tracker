/* Settings → Zad Plus (mockup final/fin-plus-*). What it would include, "Price · To be set", and a "Choose a plan"
 * button that stays disabled ("Coming soon"): no payments exist yet, and nothing here sets settings.plus.
 * Zad Plus appears nowhere else: one quiet Settings row and this page (final/NOTES.md, "Zad Plus has no adverts"). */
import { esc } from "../util.js";
import { PLUS as P } from "../strings.js";

const ICON = {
  bars: '<path d="M7 18v-5M12 18V7M17 18v-8"/>',
  people: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2a5 5 0 0 1 5.5 5.8"/>',
  family: '<circle cx="8" cy="7" r="3"/><circle cx="17" cy="10" r="2.2"/><path d="M2.5 20a5.5 5.5 0 0 1 11 0M13.5 20a3.5 3.5 0 0 1 7 0"/>',
  mentor: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5"/>',
};

/** The page. `head` is Settings' page header (title with the "‹ Settings" link). */
export function plusPage({ head }) {
  const items = P.items.map(([ic, t, s]) => `<div class="pl-row"><span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[ic]}</svg></span><span class="t"><b>${esc(t)}</b><small>${esc(s)}</small></span></div>`).join("");
  return `${head(P.title)}<p class="spage-lead pl-lead">${esc(P.lead)}</p>
  <section class="sgroup pl"><div class="card scard pl-card">${items}</div>
  <div class="pl-price"><span>${esc(P.price)}</span><em>${esc(P.priceTbd)}</em></div>
  <button type="button" class="pl-choose" disabled aria-disabled="true">${esc(P.choose)}<span class="pl-soon">${esc(P.soon)}</span></button>
  <p class="sfoot center">${esc(P.free)}</p></section><div class="space"></div>`;
}
