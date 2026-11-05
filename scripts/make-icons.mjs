// Renders the app icon and splash screens from ONE source image: assets/zad-icon-512.png
// (a seamless full-bleed square icon). To change the icon, replace that file and re-run.
// Outputs web icons to public/icons and, if the Android/iOS projects exist, launcher icons and splash.
// `node scripts/make-icons.mjs ios` (or android / web) renders only that platform.
import { chromium } from "playwright";
import { mkdirSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { inflateSync, deflateSync } from "node:zlib";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SOURCE = join(root, "assets", "zad-icon-512.png");
const FOREST = ["#1B5A43", "#0F3D2E"]; // splash gradient (top highlight, base)

const only = process.argv[2]; // optional: web | android | ios
const want = (p) => !only || only === p;
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent("<html><body></body></html>");

// Load the art once into the page and measure it: the edge colour (used as the fill around a
// scaled-down copy and as the Android adaptive-icon background) and the radius of the artwork
// (bright pixels) from the centre, as a fraction of the side, so it can be fitted into safe zones.
const info = await page.evaluate(async (src) => {
  const img = new Image(); img.src = src; await img.decode();
  window.art = img;
  const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
  const x = c.getContext("2d"); x.drawImage(img, 0, 0);
  const W = c.width, H = c.height, d = x.getImageData(0, 0, W, H).data;
  const sum = [0, 0, 0]; let n = 0, maxR = 0;
  for (let y = 0; y < H; y++) for (let i = 0; i < W; i++) {
    const k = (y * W + i) * 4;
    if (i < 3 || y < 3 || i >= W - 3 || y >= H - 3) { sum[0] += d[k]; sum[1] += d[k + 1]; sum[2] += d[k + 2]; n++; }
    if (0.3 * d[k] + 0.59 * d[k + 1] + 0.11 * d[k + 2] > 70) maxR = Math.max(maxR, Math.hypot(i + 0.5 - W / 2, y + 0.5 - H / 2));
  }
  const edge = "#" + sum.map((v) => Math.round(v / n).toString(16).padStart(2, "0")).join("").toUpperCase();
  return { edge, artRadius: maxR / W + 0.02 }; // +2% for the letter's soft shadow
}, "data:image/png;base64," + readFileSync(SOURCE).toString("base64"));
console.log(`source ${SOURCE}: edge colour ${info.edge}, art radius ${info.artRadius.toFixed(3)} of side`);

/** Draw the art into a size x size PNG.
 *  scale: art side as a fraction of the canvas (centred; the rest is filled with the edge colour)
 *  shape: "square" | "rounded" (corner radius `radius` x side) | "circle"; outside the shape is transparent
 *  transparent: leave the area outside the art transparent instead of filling it */
async function icon(size, { scale = 1, shape = "square", radius = 0.22, transparent = false } = {}) {
  const b64 = await page.evaluate(({ size, scale, shape, radius, transparent, edge, artRadius }) => {
    const c = document.createElement("canvas"); c.width = c.height = size;
    const x = c.getContext("2d");
    x.beginPath();
    if (shape === "circle") x.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    else if (shape === "rounded") x.roundRect(0, 0, size, size, radius * size);
    else x.rect(0, 0, size, size);
    x.clip();
    if (!transparent) { x.fillStyle = edge; x.fillRect(0, 0, size, size); }
    const s = size * scale, o = (size - s) / 2;
    let art = window.hq(s);
    if (scale < 1 && !transparent) {
      // The art has a slight vignette, so a scaled-down copy would show a faint square. Fade it
      // radially (outside the artwork's own radius) into the edge-colour fill: no straight seams.
      const f = document.createElement("canvas"); f.width = f.height = art.width;
      const fx = f.getContext("2d"), n = f.width;
      fx.drawImage(art, 0, 0); fx.globalCompositeOperation = "destination-in";
      const g = fx.createRadialGradient(n / 2, n / 2, n * artRadius, n / 2, n / 2, n * 0.5);
      g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)");
      fx.fillStyle = g; fx.fillRect(0, 0, n, n);
      art = f;
    }
    x.drawImage(art, o, o, s, s);
    return c.toDataURL("image/png").split(",")[1];
  }, { size, scale, shape, radius, transparent, edge: info.edge, artRadius: info.artRadius });
  return Buffer.from(b64, "base64");
}

/** Splash: the icon as a rounded tile (~32% of the short side, soft shadow) on the forest gradient. */
async function splash(w, h) {
  const b64 = await page.evaluate(({ w, h, forest }) => {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const x = c.getContext("2d");
    // = CSS radial-gradient(circle at 50% 0%, forest[0] 0%, forest[1] 60%) (farthest-corner radius)
    const g = x.createRadialGradient(w / 2, 0, 0, w / 2, 0, Math.hypot(w / 2, h));
    g.addColorStop(0, forest[0]); g.addColorStop(0.6, forest[1]); g.addColorStop(1, forest[1]);
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    const t = Math.round(Math.min(w, h) * 0.32), o = [(w - t) / 2, (h - t) / 2];
    x.save();
    x.shadowColor = "rgba(0,0,0,.35)"; x.shadowBlur = t * 0.12; x.shadowOffsetY = t * 0.04;
    x.beginPath(); x.roundRect(o[0], o[1], t, t, t * 0.22); x.fillStyle = "#000"; x.fill();
    x.restore();
    x.save(); x.beginPath(); x.roundRect(o[0], o[1], t, t, t * 0.22); x.clip();
    x.drawImage(window.hq(t), o[0], o[1], t, t);
    x.restore();
    return c.toDataURL("image/png").split(",")[1];
  }, { w, h, forest: FOREST });
  return Buffer.from(b64, "base64");
}

// High-quality resampling: step down by halves (avoids aliasing on big reductions), then a final
// smoothed draw. Upscaling (iOS 1024 / big splash tiles) is a single high-quality draw.
await page.evaluate(() => {
  window.hq = (target) => {
    target = Math.max(1, Math.round(target));
    let cur = window.art, w = cur.width;
    while (w / 2 >= target) {
      const c = document.createElement("canvas"); c.width = c.height = Math.round(w / 2);
      const x = c.getContext("2d"); x.imageSmoothingQuality = "high"; x.drawImage(cur, 0, 0, c.width, c.height);
      cur = c; w = c.width;
    }
    const c = document.createElement("canvas"); c.width = c.height = target;
    const x = c.getContext("2d"); x.imageSmoothingQuality = "high"; x.drawImage(cur, 0, 0, target, target);
    return c;
  };
});

// Scale that puts the artwork inside a centred safe circle of radius `r` (fraction of the side).
const fit = (r) => Math.min(1, r / info.artRadius);

const web = join(root, "public", "icons");
if (want("web")) {
  mkdirSync(web, { recursive: true });
  writeFileSync(join(web, "icon-192.png"), await icon(192));
  writeFileSync(join(web, "icon-512.png"), await icon(512));
  // Maskable: everything important inside the central 80% circle (radius 0.40), with a little margin
  writeFileSync(join(web, "icon-maskable-512.png"), await icon(512, { scale: fit(0.38) }));
  writeFileSync(join(web, "apple-touch-icon.png"), pngWithoutAlpha(await icon(180)));
  console.log("web icons written");
}

const res = join(root, "android", "app", "src", "main", "res");
if (want("android") && existsSync(res)) {
  // Adaptive icon (Android 8+): 108dp layers, the launcher shows the central 72dp and keeps the
  // 66dp circle (radius 33/108) unclipped under any mask. The foreground is the full art (opaque,
  // so it stays seamless under parallax) scaled so the letter + diamond sit inside that circle;
  // the background is the art's edge colour.
  const fgScale = fit((33 / 108) * 0.97);
  const dens = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
  for (const [d, px] of Object.entries(dens)) {
    const dir = join(res, `mipmap-${d}`);
    mkdirSync(dir, { recursive: true });
    // Legacy icons (Android 7 and older, or launchers without adaptive support)
    writeFileSync(join(dir, "ic_launcher.png"), await icon(px, { shape: "rounded", radius: 0.22 }));
    writeFileSync(join(dir, "ic_launcher_round.png"), await icon(px, { shape: "circle", scale: fit(0.46) }));
    writeFileSync(join(dir, "ic_launcher_foreground.png"), await icon(px * 2.25, { scale: fgScale }));
  }
  const anydpi = join(res, "mipmap-anydpi-v26");
  mkdirSync(anydpi, { recursive: true });
  const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`;
  writeFileSync(join(anydpi, "ic_launcher.xml"), adaptive);
  writeFileSync(join(anydpi, "ic_launcher_round.xml"), adaptive);
  mkdirSync(join(res, "values"), { recursive: true });
  writeFileSync(join(res, "values", "ic_launcher_background.xml"), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Adaptive icon background: the edge colour of assets/zad-icon-512.png (written by scripts/make-icons.mjs) -->
    <color name="ic_launcher_background">${info.edge}</color>
</resources>
`);
  // Splash screens: icon tile centred on forest green (replaces Capacitor's default logo)
  const splashes = { "drawable": [480, 320], "drawable-port-mdpi": [320, 480], "drawable-port-hdpi": [480, 800], "drawable-port-xhdpi": [720, 1280], "drawable-port-xxhdpi": [960, 1600], "drawable-port-xxxhdpi": [1280, 1920],
    "drawable-land-mdpi": [480, 320], "drawable-land-hdpi": [800, 480], "drawable-land-xhdpi": [1280, 720], "drawable-land-xxhdpi": [1600, 960], "drawable-land-xxxhdpi": [1920, 1280] };
  for (const [dir, [w, h]] of Object.entries(splashes)) {
    if (!existsSync(join(res, dir))) continue;
    writeFileSync(join(res, dir, "splash.png"), await splash(w, h));
  }
  console.log("android icons written");
}

const ios = join(root, "ios", "App", "App", "Assets.xcassets");
if (want("ios") && existsSync(ios)) {
  // App Store icon: 1024x1024, full square (iOS rounds the corners), no transparency:
  // re-encoded as RGB so the PNG has no alpha channel at all. (Upscaled from the 512px source.)
  const iconFile = join(ios, "AppIcon.appiconset", "AppIcon-512@2x.png");
  writeFileSync(iconFile, pngWithoutAlpha(await icon(1024)));
  if (pngColorType(readFileSync(iconFile)) !== 2) throw new Error("iOS app icon still has an alpha channel");
  // Splash (Capacitor's Splash.imageset: three 2732x2732 copies)
  const img = pngWithoutAlpha(await splash(2732, 2732));
  for (const f of ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"])
    writeFileSync(join(ios, "Splash.imageset", f), img);
  console.log("ios icons written");
}
await browser.close();
console.log("icons written");

/** PNG IHDR color type: 2 = RGB, 6 = RGBA. */
function pngColorType(buf) { return buf[25]; }

/** Re-encode an 8-bit RGBA PNG as RGB (drops the alpha channel; the images are opaque already). */
function pngWithoutAlpha(buf) {
  if (pngColorType(buf) === 2) return buf;
  let pos = 8, width = 0, height = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), type = buf.toString("ascii", pos + 4, pos + 8), data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 6 || data[12] !== 0) throw new Error("expected 8-bit non-interlaced RGBA PNG");
    } else if (type === "IDAT") idat.push(data);
    pos += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat)), bpp = 4, stride = width * bpp;
  const out = Buffer.alloc(height * (1 + width * 3));
  let prev = Buffer.alloc(stride), cur = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      cur[i] = v & 255;
    }
    const o = y * (1 + width * 3);
    out[o] = 0;
    for (let x = 0; x < width; x++) cur.copy(out, o + 1 + x * 3, x * 4, x * 4 + 3);
    [prev, cur] = [cur, prev];
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([buf.subarray(0, 8), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(out, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

function crc32(b) {
  let c = ~0;
  for (let i = 0; i < b.length; i++) { c ^= b[i]; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1)); }
  return ~c >>> 0;
}
