// Two-page spreads for the muṣḥaf reader on tablets in landscape (docs/build/tablet.md).
//
// A printed muṣḥaf opens right to left: the right-hand page is the earlier one. In every layout Zad ships,
// pages 1 and 2 are the two ornamented opening pages (al-Fātiḥah | start of al-Baqarah) and face each
// other, so spreads are 1|2, 3|4, 5|6 … (the odd page on the right). A mushaf index may override this with
// `spreadFirst` (the right-hand page of the first full spread; pages before it stand alone). A mushaf with an
// odd page count ends on a single page.
// Pure functions only (no DOM), so they can be tested in Node.

/** The tablet layout (src/css/tablet.css uses the same numbers) and, within it, landscape = two-page spread. */
export const TABLET_QUERY = "(min-width: 768px) and (min-height: 540px)";
export const SPREAD_QUERY = TABLET_QUERY + " and (orientation: landscape)";

/** Right-hand page of the first full spread for a mushaf. All current layouts: 1. */
const SPREAD_FIRST = { indopak15: 1, madani15: 1, indopak13: 1 };
export const spreadFirst = (id, index) => (index && Number.isInteger(index.spreadFirst) ? index.spreadFirst : SPREAD_FIRST[id] || 1);

const clamp = (n, total) => Math.min(Math.max(1, Math.round(+n) || 1), Math.max(1, total));

/** The pages shown together with page n, in reading order: [right, left] or [single]. */
export function spreadPages(n, total, first = 1) {
  n = clamp(n, total);
  if (n < first) return [n];
  const a = n - ((n - first) % 2);
  return a + 1 <= total ? [a, a + 1] : [a];
}

/** First page of the spread d spreads away from the one holding page n (d > 0: forward). Stays put at either end. */
export function stepSpread(n, d, total, first = 1) {
  let cur = spreadPages(n, total, first);
  for (let i = 0; i < Math.abs(d); i++) {
    const next = d > 0 ? cur[cur.length - 1] + 1 : cur[0] - 1;
    if (next < 1 || next > total) break;
    cur = spreadPages(next, total, first);
  }
  return cur[0];
}

/** True when page n is on screen in the spread that starts at (or holds) page start. */
export const inSpread = (n, start, total, first = 1) => spreadPages(start, total, first).includes(n);
