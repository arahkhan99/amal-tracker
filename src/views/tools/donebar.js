/* The bar at the bottom of a reader: "Evening adhkār done · Ticks it off for today" with a tick, and Next.
   It ticks the same item as For today in Read (src/reading.js), so both always agree. */
import { S, NOW, esc, I } from "./core.js";
import { readItems } from "../../reading.js";
import { READ } from "../../strings.js";

/**
 * The bar for Read item `id`, or "" when that item isn't on today's list (then the reader keeps its own controls).
 * next: the onclick of Next ("" hides it); prev: the onclick of a small Previous button.
 */
export function doneBar(id, { next = "", prev = "" } = {}) {
  const it = id && readItems(S, NOW()).find(x => x.id === id);
  if (!it) return "";
  return `<div class="rd-bar">${prev ? `<button type="button" class="rd-prev" aria-label="${esc(READ.previous)}" onclick="${prev}">${I.back}</button>` : ""}
    <button type="button" class="rd-tickl" role="checkbox" aria-checked="${it.done}" onclick="A.readTick('${id}')"><span class="rd-bx${it.done ? " on" : ""}">${it.done ? I.check : ""}</span><span class="t"><b>${esc(READ.barTitle(it.title))}</b><small>${esc(it.done ? READ.barDone : READ.barSub)}</small></span></button>
    ${next ? `<button type="button" class="rd-next" onclick="${next}">${esc(READ.next)}${I.chev}</button>` : ""}</div>`;
}
