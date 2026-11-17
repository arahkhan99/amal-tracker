// Export the refined Zad logo to every platform size, rasterised straight from the vector art.
// It writes into an OUTPUT folder that mirrors the repo layout (android/..., ios/..., public/icons/...),
// so the result can be reviewed and then copied over the real files in one step.
//
//   node scripts/icons/export.mjs --out design-review/icon-export-test [--bg current|forest] [--splash]
//
// Writing straight into the repo needs an explicit  --out . --write-repo  (do that only once the logo is approved).
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { inflateSync, deflateSync } from "node:zlib";
import { chromium } from "playwright";
import { symbol, silhouette } from "./geometry.mjs";

const REPO = resolve(new URL("../..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const OUT = arg("--out") ? resolve(arg("--out")) : null;
if (!OUT) { console.error("usage: export.mjs --out <folder> [--bg current|forest] [--splash]"); process.exit(1); }
if (OUT === REPO && !process.argv.includes("--write-repo")) { console.error("refusing to write into the repo without --write-repo"); process.exit(1); }
const BGK = arg("--bg") || "current";
const BG = { current: { flat: "#1A3126", grad: ["#1F372C", "#182E24"] }, forest: { flat: "#0F3D2E", grad: ["#134535", "#0F3D2E"] } }[BGK];
const SPLASH = process.argv.includes("--splash");

// ---- art (same composition rules as build.mjs)
const MEC = { cx: 240.3, cy: 249.0, r: 201.4 };   // symbol's enclosing circle in 512-space, incl. halo
const fitT = (cx, cy, r) => { const s = r / MEC.r; return `translate(${(cx - MEC.cx * s).toFixed(3)} ${(cy - MEC.cy * s).toFixed(3)}) scale(${s.toFixed(5)})`; };
const bgFill = (n, id) => `<defs><radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${n / 2}" cy="${n * .46}" r="${n * .65}"><stop offset="0" stop-color="${BG.grad[0]}"/><stop offset="1" stop-color="${BG.grad[1]}"/></radialGradient></defs><rect width="${n}" height="${n}" fill="url(#${id})"/>`;
const svg = (vb, inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="100%" height="100%" style="display:block">${inner}</svg>`;
const ART = {
  // full square icon (iOS, store, web, legacy Android): the current composition, symbol at 2x of the 512 master
  square: () => svg("0 0 1024 1024", bgFill(1024, "g") + `<g transform="scale(2)">${symbol("a")}</g>`),
  // legacy rounded-square launcher icon (Android 7 and older)
  rounded: () => svg("0 0 1024 1024", `<defs><clipPath id="k"><rect width="1024" height="1024" rx="225"/></clipPath></defs><g clip-path="url(#k)">${bgFill(1024, "g")}<g transform="scale(2)">${symbol("a")}</g></g>`),
  // legacy round launcher icon: symbol fitted inside the circle
  round: () => svg("0 0 1024 1024", `<defs><clipPath id="k"><circle cx="512" cy="512" r="512"/></clipPath></defs><g clip-path="url(#k)">${bgFill(1024, "g")}<g transform="${fitT(512, 512, 400)}">${symbol("a")}</g></g>`),
  // adaptive foreground: 108 dp, transparent, enclosing circle r 31 dp (the safe zone is r 33)
  fg: () => svg("0 0 108 108", `<g transform="${fitT(54, 54, 31)}">${symbol("a")}</g>`),
  // web maskable: everything inside the central 80% circle (r 0.40), here r 0.36
  maskable: () => svg("0 0 512 512", `<rect width="512" height="512" fill="${BG.flat}"/><g transform="${fitT(256, 256, 184)}">${symbol("a")}</g>`),
  // notification small icon: white disc with the letter cut out (24 dp)
  stat: () => svg("0 0 24 24", `<defs><mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><rect width="24" height="24" fill="#fff"/><g transform="${fitT(12, 12, 7.3)}">${silhouette("#000")}</g></mask></defs><circle cx="12" cy="12" r="10.75" fill="#fff" mask="url(#m)"/>`),
};

const br = await chromium.launch();
const page = await (await br.newContext({ deviceScaleFactor: 1 })).newPage();
async function render(html, w, h = w) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<body style="margin:0;background:transparent"><div id="s" style="width:${w}px;height:${h}px">${html}</div></body>`);
  return page.locator("#s").screenshot({ omitBackground: true });
}
const put = (rel, buf) => { const p = join(OUT, rel); mkdirSync(join(p, ".."), { recursive: true }); writeFileSync(p, buf); return rel; };
const written = [];

// ---- Android
const RES = "android/app/src/main/res";
const DENS = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [d, k] of Object.entries(DENS)) {
  written.push(put(`${RES}/mipmap-${d}/ic_launcher.png`, await render(ART.rounded(), 48 * k)));
  written.push(put(`${RES}/mipmap-${d}/ic_launcher_round.png`, await render(ART.round(), 48 * k)));
  written.push(put(`${RES}/mipmap-${d}/ic_launcher_foreground.png`, await render(ART.fg(), 108 * k)));
  written.push(put(`${RES}/drawable-${d}/ic_stat_zad.png`, await render(ART.stat(), 24 * k)));
}
written.push(put(`${RES}/values/ic_launcher_background.xml`, `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Adaptive icon background for the refined (vector) Zad logo: scripts/icons/export.mjs -->
    <color name="ic_launcher_background">${BG.flat}</color>
</resources>
`));

// ---- iOS: one 1024 universal icon, no alpha channel
const ios = "ios/App/App/Assets.xcassets";
written.push(put(`${ios}/AppIcon.appiconset/AppIcon-512@2x.png`, rgb(await render(ART.square(), 1024))));

// ---- Web
written.push(put("public/icons/icon-192.png", await render(ART.square(), 192)));
written.push(put("public/icons/icon-512.png", await render(ART.square(), 512)));
written.push(put("public/icons/icon-maskable-512.png", await render(ART.maskable(), 512)));
written.push(put("public/icons/apple-touch-icon.png", rgb(await render(ART.square(), 180))));

// ---- Splash screens (optional; same design as scripts/make-icons.mjs: icon tile on the forest gradient)
if (SPLASH) {
  const splash = (w, h) => { const t = Math.round(Math.min(w, h) * .32), x = (w - t) / 2, y = (h - t) / 2;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block"><defs>
      <radialGradient id="sp" gradientUnits="userSpaceOnUse" cx="${w / 2}" cy="0" r="${Math.hypot(w / 2, h)}"><stop offset="0" stop-color="#1B5A43"/><stop offset=".6" stop-color="#0F3D2E"/></radialGradient>
      <filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="${t * .04}" stdDeviation="${t * .06}" flood-color="#000" flood-opacity=".35"/></filter>
      <clipPath id="tc"><rect x="${x}" y="${y}" width="${t}" height="${t}" rx="${t * .22}"/></clipPath></defs>
      <rect width="${w}" height="${h}" fill="url(#sp)"/><rect x="${x}" y="${y}" width="${t}" height="${t}" rx="${t * .22}" filter="url(#sh)"/>
      <g clip-path="url(#tc)"><g transform="translate(${x} ${y}) scale(${t / 1024})">${bgFill(1024, "g")}<g transform="scale(2)">${symbol("a")}</g></g></g></svg>`; };
  const SPL = { "drawable": [480, 320], "drawable-port-mdpi": [320, 480], "drawable-port-hdpi": [480, 800], "drawable-port-xhdpi": [720, 1280], "drawable-port-xxhdpi": [960, 1600], "drawable-port-xxxhdpi": [1280, 1920],
    "drawable-land-mdpi": [480, 320], "drawable-land-hdpi": [800, 480], "drawable-land-xhdpi": [1280, 720], "drawable-land-xxhdpi": [1600, 960], "drawable-land-xxxhdpi": [1920, 1280] };
  for (const [dir, [w, h]] of Object.entries(SPL)) written.push(put(`${RES}/${dir}/splash.png`, await render(splash(w, h), w, h)));
  const big = rgb(await render(splash(2732, 2732), 2732, 2732));
  for (const f of ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"]) written.push(put(`${ios}/Splash.imageset/${f}`, big));
}
await br.close();
console.log(`wrote ${written.length} files into ${OUT} (background ${BGK} ${BG.flat})`);
for (const f of written) console.log("  " + f);

/** Re-encode an 8-bit RGBA PNG as RGB (iOS rejects app icons with an alpha channel). From scripts/make-icons.mjs. */
function rgb(buf) {
  if (buf[25] === 2) return buf;
  let pos = 8, width = 0, height = 0; const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), type = buf.toString("ascii", pos + 4, pos + 8), data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") { width = data.readUInt32BE(0); height = data.readUInt32BE(4); if (data[8] !== 8 || data[9] !== 6 || data[12] !== 0) throw new Error("expected 8-bit non-interlaced RGBA PNG"); }
    else if (type === "IDAT") idat.push(data);
    pos += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat)), bpp = 4, stride = width * bpp, out = Buffer.alloc(height * (1 + width * 3));
  let prev = Buffer.alloc(stride), cur = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0; let v = line[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      cur[i] = v & 255;
    }
    const o = y * (1 + width * 3); out[o] = 0;
    for (let x = 0; x < width; x++) cur.copy(out, o + 1 + x * 3, x * 4, x * 4 + 3);
    [prev, cur] = [cur, prev];
  }
  const chunk = (type, data) => { const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, "ascii"), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([buf.subarray(0, 8), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(out, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}
function crc32(b) { let c = ~0; for (let i = 0; i < b.length; i++) { c ^= b[i]; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1)); } return ~c >>> 0; }
