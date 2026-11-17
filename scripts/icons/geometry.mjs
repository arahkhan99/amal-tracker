// Zad logo (Concept 6), traced as vector paths. All coordinates are in the 512 x 512 space of the
// original master (assets/zad-icon-512.png): hand-tuned cubic Béziers checked against the raster outline.
// Builders below place the symbol on any canvas by translate/scale.

// ---- outline pieces (named so the body and band share the exact same seam curve S)
const TIP = "M298.6 154.2 Q300.6 151.4 302.7 154.2";
export const P = {
  // diamond dot (rounded corners)
  dot: "M298.6 61.1 Q300.6 59 302.6 61.1 L332 90.6 Q334 92.6 332 94.6 L302.6 124.2 Q300.6 126.2 298.6 124.2 L269.2 94.6 Q267.2 92.6 269.2 90.6 Z",
  dotInner: "M300.6 67.3 L325.8 92.6 L300.6 118 L275.4 92.6 Z",
  // the letter body: tip, left edge, corner, lower-left facet, elbow, inner (concave) edge, tail, lower edge, then up the seam S and the right edge
  body: TIP + " C316 172 340 200 357 222" + // right edge of the top arm (drawn from the tip down)
    " C370 237 375 252 374.5 268 C374 300 372 322 365 343 C350 378 303 410 240 430" + // seam S, top to bottom
    " C175 418 125 400 96.6 384.2 Q94.4 382.6 97 381.1" + // lower edge of the tail to the tail tip
    " C135 377 175 371.5 213 358.8 C262 340 305 318 334 291.5" + // inner (concave) edge back up to the elbow
    " C318 262 283 240 267.6 222 Q264.3 219.3 265.7 215.5 C271 202 288 170 298.6 154.2 Z",
  // the outer gold band (side face): from its top point T down the seam S to the lower tip, back along the outer edge
  band: "M357 222 C370 237 375 252 374.5 268 C374 300 372 322 365 343 C350 378 303 410 240 430 C228 433 219 436 213.6 442" +
    " Q212.6 444.4 215 445 C236 450.5 278 447 312 426 C355 399 391 362 390.4 300 C390.3 266 379 242 357 222 Z",
  // seam S on its own (for the dark crease between the body and the band)
  seam: "M357 222 C370 237 375 252 374.5 268 C374 300 372 322 365 343 C350 378 303 410 240 430 C228 433 219 436 213.6 442",
  // honey highlight running along the outer half of the band (stroked, clipped to the band)
  bandHi: "M379 262 C385.5 300 383.5 345 360 376 C336 406 290 431 226 442.5",
  // lighter lower band of the crescent (light colourway only; clipped to the body)
  lowBand: "M140 404 C200 398 290 375 338 346 C354 336 366 325 377 311 L410 320 L410 470 L120 470 Z",
  // gold rim on the top arm: inner edge from the right edge round the left side to the elbow (outside part is clipped by the body)
  rim1: "M336 186 L321 182.5 C312 177 301 179 294 188 C287 197 284 210 283.5 219 C285 228 300 240 312 252 C322 262 331 275 337 290 L334 291.5 L310 270 L240 230 L250 140 L345 140 Z",
  // gold rim along the concave edge of the crescent, widening into the gold tail tip
  rim2: "M334 291.5 C337 298.5 333.5 305 325 313.5 C296 341 250 365 203 383 C175 391 140 388.5 116 386.2 C111 386 107 387.5 104 390 L100 430 L60 400 L60 340 L200 330 L312 288 Z",
};

export const COL = {
  forest: "#0F3D2E", gold: "#C9A227", honey: "#E5C55C", parchment: "#F8F4EA",
  bgCurrent: ["#1F372C", "#182E24"], // the current icon's dark green (centre, edge)
  bgApp: ["#134535", "#0F3D2E"],     // the app's forest green
};

// colourway for the icon (olive body on dark green, as in the current app icon)
const ICON = {
  body: [[0, "#B4B566"], [.15, "#A7AB5C"], [.27, "#8F984D"], [.4, "#7A8946"], [.62, "#778947"], [.82, "#6C8040"], [1, "#5E7438"]],
  rim1: [[0, "#FCD172"], [.2, "#EBBF66"], [.45, "#DAAB58"], [.55, "#A98A44"], [.66, "#716334"], [.8, "#584D2A"], [1, "#4D4527"]],
  rim2: [[0, "#937643"], [.1, "#B78E4D"], [.2, "#D8AA5E"], [.4, "#EAB85B"], [.72, "#EEBA5E"], [1, "#E6BE5D"]],
  band: [[0, "#6E7A3C"], [.12, "#9E8D45"], [.3, "#C49C48"], [.55, "#D0A650"], [.8, "#D9AD54"], [1, "#CBA04B"]],
  dot: ["#F7D271", "#E3BD64", "#D2A852"], bandHi: "#F4C865", seam: "#2B4824", halo: "#0D2118",
};
// colourway for light backgrounds (forest body with a lighter lower band, as in the original symbol art)
const LIGHT = {
  body: [[0, "#1D3B2E"], [.5, "#183629"], [1, "#132E23"]],
  low: [[0, "#557A44"], [.5, "#4A6E3D"], [1, "#3F6236"]],
  rim1: [[0, "#E6BC5E"], [.45, "#D5A84C"], [.7, "#C99B40"], [1, "#BE913A"]],
  rim2: [[0, "#C2953C"], [.2, "#D3A64B"], [.5, "#DDB257"], [1, "#D6AA4E"]],
  band: [[0, "#C29540"], [.3, "#CFA24A"], [.7, "#DAAF55"], [1, "#C99C45"]],
  dot: ["#C5A04A", "#B69444", "#A3843A"], bandHi: "#EDC66C", seam: "#0E271D", halo: null, outline: "#D2A54B",
};
export const WAYS = { icon: ICON, light: LIGHT };

const stops = s => s.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join("");

/** The symbol in 512-space. id: unique prefix for defs. way: "icon" | "light". */
export function symbol(id, way = "icon") {
  const W = WAYS[way];
  // soft dark halo round the shapes (the original has a painted shadow edge): a blurred outline plus a faint crisp one
  const sil = `<path d="${P.body}"/><path d="${P.band}"/><path d="${P.dot}"/>`;
  const halo = W.halo ? `<g fill="${W.halo}" stroke="${W.halo}" stroke-width="5" stroke-linejoin="round" opacity=".75" filter="url(#${id}h)">${sil}</g><g fill="none" stroke="${W.halo}" stroke-width="2.4" stroke-linejoin="round" opacity=".55">${sil}</g>` : "";
  return `<defs>
<linearGradient id="${id}b" gradientUnits="userSpaceOnUse" x1="300" y1="228" x2="340" y2="420">${stops(W.body)}</linearGradient>
<linearGradient id="${id}r1" gradientUnits="userSpaceOnUse" x1="300" y1="154" x2="300" y2="292">${stops(W.rim1)}</linearGradient>
<linearGradient id="${id}r2" gradientUnits="userSpaceOnUse" x1="336" y1="0" x2="150" y2="0">${stops(W.rim2)}</linearGradient>
<linearGradient id="${id}n" gradientUnits="userSpaceOnUse" x1="0" y1="230" x2="0" y2="447">${stops(W.band)}</linearGradient>
${W.low ? `<linearGradient id="${id}l" gradientUnits="userSpaceOnUse" x1="150" y1="0" x2="390" y2="0">${stops(W.low)}</linearGradient>` : ""}
<linearGradient id="${id}d" gradientUnits="userSpaceOnUse" x1="276" y1="68" x2="326" y2="118"><stop offset="0" stop-color="${W.dot[1]}"/><stop offset="1" stop-color="${W.dot[2]}"/></linearGradient>
<linearGradient id="${id}s" gradientUnits="userSpaceOnUse" x1="0" y1="232" x2="0" y2="300"><stop offset="0" stop-color="${W.seam}" stop-opacity="0"/><stop offset="1" stop-color="${W.seam}" stop-opacity=".9"/></linearGradient>
<filter id="${id}h" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="1.8"/></filter>
<clipPath id="${id}c"><path d="${P.body}"/></clipPath><clipPath id="${id}k"><path d="${P.band}"/></clipPath>
</defs>${halo}
<path d="${P.band}" fill="url(#${id}n)"/><path d="${P.bandHi}" fill="none" stroke="${W.bandHi}" stroke-opacity=".55" stroke-width="7" stroke-linecap="round" clip-path="url(#${id}k)"/>
<path d="${P.body}" fill="url(#${id}b)"/>
<g clip-path="url(#${id}c)">${W.low ? `<path d="${P.lowBand}" fill="url(#${id}l)"/>` : ""}<path d="${P.rim1}" fill="url(#${id}r1)"/><path d="${P.rim2}" fill="url(#${id}r2)"/><path d="${P.seam}" fill="none" stroke="url(#${id}s)" stroke-width="7" stroke-linecap="round"/>${W.outline ? `<path d="${P.body}" fill="none" stroke="${W.outline}" stroke-width="10" stroke-linejoin="round"/>` : ""}</g>
<path d="${P.dot}" fill="${W.dot[0]}"/><path d="${P.dotInner}" fill="url(#${id}d)"/>`;
}

/** Single-colour silhouette of the symbol (512-space), for masks and notification icons. */
export const silhouette = (fill = "#fff") => `<g fill="${fill}"><path d="${P.body}"/><path d="${P.band}"/><path d="${P.dot}"/></g>`;

// the symbol's extent in 512-space (computed by the build from the real paths; stored for layout)
export const BOX = { x0: 94.4, y0: 59, x1: 391, y1: 449.2 };

// ---- wordmark "ZĀD", traced from Zad_Logo_6_Wordmark.png (coordinates in that image's 432 x 630 space;
// cap height 513.3 to baseline 618.8). Classical serif capitals with a macron over the A.
export const WORD = {
  Z: "M68.8 514.1 L135.9 513.8 Q138.6 514.4 137.9 517.8 L84 610.4 Q84.4 612.6 86.6 612.6 L119.5 612.3 C128.6 611.4 134.3 605.6 138.9 597.4 L141.9 597.6 L137.2 617.6 Q136.6 618.6 135.2 618.6 L64.6 618.8 Q61.9 618.3 62.5 615.4 L117.7 521 Q117.6 519.6 115.6 519.5 L96 519.5 C82.6 519.5 74.6 521.5 69.7 531.2 L65.6 536.2 L63.9 534.6 L68 515.4 Q68.2 514.3 68.8 514.1 Z",
  macron: "M192 494.6 L224.8 494.8 Q226.8 495 226.8 497 L226.6 500 Q226.2 501.9 224 502 L192.4 501.9 Q190.2 501.7 190.2 499.5 L190.2 496.8 Q190.4 494.8 192 494.6 Z",
  A: "M205.2 514.4 Q209.6 512.6 214.5 515.6 L255.6 611.5 C258.5 614.3 262.6 613.6 263.2 617 Q262.8 618.7 261 618.8 L233.8 618.9 Q231.3 618.7 231.4 617.4 C231.6 613.3 235.6 614.6 236.6 610.2 L226.8 585 Q225.6 583.6 223.6 583.5 L186.4 583.6 Q184.4 583.8 183.8 584.6 L174.4 607.6 C173.4 612.6 180.4 613.4 181.4 617.2 Q181 618.8 179.4 619 L158.6 619 Q156.4 618.8 156.5 617.6 C156.8 613.8 160.6 614.9 163.9 611.9 C166.6 608.4 167.8 604.6 169.8 600.2 Z" +
     " M188.2 577.4 L222.6 576.9 Q223.6 576.2 223.3 575.1 L206.5 534.4 Q205.4 533 204.2 534.4 L187.2 573.9 Q186.8 576.9 188.2 577.4 Z",
  D: "M279.6 513.2 L320.5 513.3 C333 513.6 342 515.2 352.3 520.3 C362 526 370.5 535.5 374.3 548.3 C379 574 374.5 599 349.8 612.3 C335 619.3 322.4 619 306.5 618.7 L280.6 618.8 Q278.9 618.4 279.3 617 C281 612.2 285.6 614.4 287.4 608.7 L287.6 523.5 C284.6 517 280.5 518.6 278.6 515.1 Q278.6 513.5 279.6 513.2 Z" +
     " M305.6 519.3 L319.5 519 C343.4 519.7 355.3 534.2 358.6 556.7 C361.2 570.6 358.5 587.9 350.3 599.8 C342.8 608.2 339.4 609.7 328.5 612 C321.2 613.2 309.8 613.7 303.8 608.8 C302.3 605 302.6 540 302.8 522.5 Q303.2 519.6 305.6 519.3 Z",
};
// the symbol's place in the original wordmark image: bbox x 28..360, y 22..447
export const WORD_SYM = { s: 425 / 387.2, cx: 194, top: 22 };
