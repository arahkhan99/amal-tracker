// Renders the app icon (crescent on forest green, from the prototype's logo) to PNGs.
// Outputs web icons to public/icons and, if the Android project exists, launcher icons.
import { chromium } from "playwright";
import { mkdirSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

function svg(size, { pad = 0, round = 0 } = {}) {
  const s = size, r = round * s;
  const scale = 1 - pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="g" cx="50%" cy="0%" r="100%"><stop offset="0" stop-color="#1B5A43"/><stop offset=".6" stop-color="#0F3D2E"/></radialGradient>
    <pattern id="st" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M10 .7 L12 8 L19.3 10 L12 12 L10 19.3 L8 12 L.7 10 L8 8 Z" fill="none" stroke="#E5C55C" stroke-width=".35"/></pattern>
    <mask id="m"><rect width="100" height="100" fill="#fff"/><circle cx="58" cy="44" r="22" fill="#000"/></mask>
    <clipPath id="c"><rect width="100" height="100" rx="${round * 100}"/></clipPath>
  </defs>
  <g clip-path="url(#c)">
    <rect width="100" height="100" fill="url(#g)"/>
    <rect width="100" height="100" fill="url(#st)" opacity=".13"/>
    <g transform="translate(${50 - 50 * scale} ${50 - 50 * scale}) scale(${scale})">
      <circle cx="47" cy="52" r="26" fill="#E5C55C" mask="url(#m)"/>
      <path d="M71 26 L72.6 31 L77.8 31 L73.6 34 L75.2 39 L71 36 L66.8 39 L68.4 34 L64.2 31 L69.4 31 Z" fill="#F4E9C8"/>
    </g>
  </g></svg>`;
}

const browser = await chromium.launch();
const page = await browser.newPage();
async function render(size, file, opts) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg(size, opts)}</body></html>`);
  await page.locator("svg").screenshot({ path: file, omitBackground: true });
}

const web = join(root, "public", "icons");
mkdirSync(web, { recursive: true });
await render(192, join(web, "icon-192.png"), { pad: 0.08 });
await render(512, join(web, "icon-512.png"), { pad: 0.08 });
await render(512, join(web, "icon-maskable-512.png"), { pad: 0.2 });
await render(180, join(web, "apple-touch-icon.png"), { pad: 0.1 });

const res = join(root, "android", "app", "src", "main", "res");
if (existsSync(res)) {
  const dens = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
  for (const [d, px] of Object.entries(dens)) {
    const dir = join(res, `mipmap-${d}`);
    mkdirSync(dir, { recursive: true });
    await render(px, join(dir, "ic_launcher.png"), { pad: 0.1, round: 0.22 });
    await render(px, join(dir, "ic_launcher_round.png"), { pad: 0.1, round: 0.5 });
    await render(Math.round(px * 2.25), join(dir, "ic_launcher_foreground.png"), { pad: 0.26 });
  }
  // Splash screens: crescent centered on forest green (replaces Capacitor's default logo)
  const splash = { "drawable": [480, 320], "drawable-port-mdpi": [320, 480], "drawable-port-hdpi": [480, 800], "drawable-port-xhdpi": [720, 1280], "drawable-port-xxhdpi": [960, 1600], "drawable-port-xxxhdpi": [1280, 1920],
    "drawable-land-mdpi": [480, 320], "drawable-land-hdpi": [800, 480], "drawable-land-xhdpi": [1280, 720], "drawable-land-xxhdpi": [1600, 960], "drawable-land-xxxhdpi": [1920, 1280] };
  for (const [dir, [w, h]] of Object.entries(splash)) {
    if (!existsSync(join(res, dir))) continue;
    const icon = Math.round(Math.min(w, h) * 0.32);
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(`<html><body style="margin:0;width:${w}px;height:${h}px;display:grid;place-items:center;background:radial-gradient(circle at 50% 0%,#1B5A43 0%,#0F3D2E 60%)">${svg(icon, { pad: 0.05, round: 0.24 })}</body></html>`);
    await page.screenshot({ path: join(res, dir, "splash.png") });
  }
  // Use the PNGs directly instead of Capacitor's default adaptive icon XML
  const anydpi = join(res, "mipmap-anydpi-v26");
  if (existsSync(anydpi)) rmSync(anydpi, { recursive: true, force: true });
  console.log("android icons written");
}
const ios = join(root, "ios", "App", "App", "Assets.xcassets");
if (existsSync(ios)) {
  // iOS rounds the corners itself, so the icon is a full square with no transparency
  await page.setViewportSize({ width: 1024, height: 1024 });
  await page.setContent(`<html><body style="margin:0;background:#0F3D2E">${svg(1024, { pad: 0.1 })}</body></html>`);
  await page.screenshot({ path: join(ios, "AppIcon.appiconset", "AppIcon-512@2x.png"), clip: { x: 0, y: 0, width: 1024, height: 1024 } });
  const icon = 700;
  await page.setViewportSize({ width: 2732, height: 2732 });
  await page.setContent(`<html><body style="margin:0;width:2732px;height:2732px;display:grid;place-items:center;background:radial-gradient(circle at 50% 0%,#1B5A43 0%,#0F3D2E 60%)">${svg(icon, { pad: 0.05, round: 0.24 })}</body></html>`);
  for (const f of ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"])
    await page.screenshot({ path: join(ios, "Splash.imageset", f) });
  console.log("ios icons written");
}
await browser.close();
console.log("icons written");
