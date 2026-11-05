// Store screenshots: serves dist/ (run `npx vite build` first), sets up Zad with a made-up
// user ("Raheem") and made-up history, and captures six screens at the exact sizes
// Google Play and the App Store ask for. Output: store-shots/<size>/NN-name.png
//
//   node scripts/store-screenshots.mjs              all sizes
//   SIZES=play node scripts/store-screenshots.mjs   one size (play | ios69)
//   STATUS_BAR=0 ...                                leave the status-bar area blank
//   SHOT_DATE=2026-10-29 ...                        the "today" shown in the screenshots
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const dist = join(root, "dist"), outRoot = join(root, "store-shots");
if (!existsSync(join(dist, "index.html"))) { console.error("dist/ is missing: run `npx vite build` first"); process.exit(1); }

// Each size: CSS viewport x 3 = the store's pixel size. Insets mimic the real phone's status bar and home indicator.
const SIZES = {
  play: { dir: "google-play-phone-1080x2400", width: 360, height: 800, insetTop: 24, insetBottom: 16, os: "android" },
  ios69: { dir: "app-store-6.9in-1320x2868", width: 440, height: 956, insetTop: 62, insetBottom: 34, os: "ios" },
};
const pick = (process.env.SIZES || "play,ios69").split(",").map(s => s.trim()).filter(Boolean);
const showStatusBar = process.env.STATUS_BAR !== "0";

const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".woff2": "font/woff2", ".woff": "font/woff", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml" };
const PORT = 4392;
const server = createServer((req, res) => {
  let p = join(dist, decodeURIComponent(req.url.split("?")[0]));
  if (!existsSync(p) || statSync(p).isDirectory()) p = join(dist, "index.html");
  res.writeHead(200, { "content-type": types[extname(p)] || "application/octet-stream" });
  res.end(readFileSync(p));
}).listen(PORT);

// A fixed late-month Thursday afternoon so Week and Month have plenty of data and every run looks the same:
// Fajr and Dhuhr are logged, Asr is current. Override with SHOT_DATE=YYYY-MM-DD.
const [Y, M, D] = (process.env.SHOT_DATE || "2026-10-29").split("-").map(Number);
const TZ = "America/Chicago";
// 4:10 PM in TZ, whatever time zone this machine is in
const utcGuess = Date.UTC(Y, M - 1, D, 16, 10, 0);
const tzOffsetH = Number(new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "shortOffset" }).formatToParts(utcGuess).find(p => p.type === "timeZoneName").value.replace("GMT", "") || 0);
const CLOCK = new Date(utcGuess - tzOffsetH * 3600e3);
const LOCATION = { lat: 41.8781, lng: -87.6298, label: "Chicago, IL" }; // made-up user, public city coordinates

const browser = await chromium.launch();
const errors = [];

for (const key of pick) {
  const size = SIZES[key];
  if (!size) { console.error(`unknown size "${key}" (use: ${Object.keys(SIZES).join(", ")})`); continue; }
  const out = join(outRoot, size.dir);
  mkdirSync(out, { recursive: true });

  const ctx = await browser.newContext({
    viewport: { width: size.width, height: size.height }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    timezoneId: TZ, locale: "en-US", serviceWorkers: "block",
    geolocation: { latitude: LOCATION.lat, longitude: LOCATION.lng }, permissions: ["geolocation"],
  });
  await ctx.clock.install({ time: CLOCK });
  // Simulated safe areas (the app reads these variables) and an optional plain status bar.
  await ctx.addInitScript(({ size, showStatusBar, clock }) => {
    const apply = () => {
      const r = document.documentElement.style;
      r.setProperty("--safe-area-inset-top", size.insetTop + "px");
      r.setProperty("--safe-area-inset-bottom", size.insetBottom + "px");
      if (!showStatusBar || document.getElementById("storeStatusBar")) return;
      const t = new Date(clock);
      const h = t.getHours() % 12 || 12, m = String(t.getMinutes()).padStart(2, "0");
      const bar = document.createElement("div");
      bar.id = "storeStatusBar";
      const ios = size.os === "ios";
      bar.style.cssText = `position:fixed;top:0;left:0;right:0;height:${size.insetTop}px;z-index:9999;pointer-events:none;display:flex;align-items:center;justify-content:space-between;padding:${ios ? "6px 34px 0 46px" : "0 16px"};font:600 ${ios ? 17 : 13}px/1 -apple-system,system-ui,sans-serif;box-sizing:border-box`;
      const icon = (w) => `<svg width="${w}" height="12" viewBox="0 0 ${w} 12" fill="currentColor" aria-hidden="true">` +
        // signal bars
        `<rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5" width="3" height="7" rx="1"/><rect x="10" y="2" width="3" height="10" rx="1"/>` +
        // battery
        `<rect x="${w - 26}" y="1" width="22" height="10" rx="3" fill="none" stroke="currentColor" stroke-width="1.2"/><rect x="${w - 24}" y="3" width="16" height="6" rx="1.5"/><rect x="${w - 3}" y="4" width="2" height="4" rx="1"/></svg>`;
      bar.innerHTML = `<span>${h}:${m}</span>${icon(46)}`;
      document.body.appendChild(bar);
      const phone = document.getElementById("phone");
      const tint = () => { bar.style.color = ["home", "onboard"].includes(phone?.dataset.view) ? "#F8F4EA" : "#23302B"; };
      tint();
      if (phone) new MutationObserver(tint).observe(phone, { attributes: true, attributeFilter: ["data-view"] });
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply); else apply();
  }, { size, showStatusBar, clock: CLOCK.getTime() });

  const page = await ctx.newPage();
  page.on("console", m => { if (m.type() === "error") errors.push(`[${key}] ${m.text()}`); });
  page.on("pageerror", e => errors.push(`[${key}] ${e}`));
  const settle = () => page.waitForTimeout(450);
  const shot = async name => {
    await settle();
    await page.evaluate(() => {
      document.activeElement?.blur?.();
      document.querySelectorAll(".screen").forEach(el => el.scrollTop = 0); // every shot starts at the top
      document.getElementById("toast")?.classList.remove("on"); // hide confirmation toasts
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(out, name + ".png") });
  };
  const click = sel => page.locator(sel).first().click();

  // Onboarding with a made-up name
  await page.goto(`http://localhost:${PORT}/`);
  await page.fill("#obName", "Raheem");
  await click("text=Continue");
  await click("text=Skip for now");
  await page.fill("#obYears", "1");
  await click("button:has-text('Fill')");
  await click("text=Continue");
  await click("text=Start tracking");

  // Made-up history: 60 days of mostly-kept prayers, adhkar and Quran, some qada made up
  await page.evaluate(loc => {
    const S = JSON.parse(localStorage.getItem("amal-tracker-v1"));
    const pad = n => String(n).padStart(2, "0");
    const k = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const ym = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    const now = new Date();
    for (let i = 1; i <= 60; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const prayers = {};
      ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"].forEach((p, j) => {
        prayers[p] = (i * 7 + j * 3) % 23 === 0 ? "missed" : (p === "Maghrib" || p === "Isha" || (i + j) % 3 === 0) ? "congregation" : "ontime";
      });
      const amal = { quran: { done: i % 5 !== 0, detail: "Al-Baqarah " + Math.max(1, 200 - i * 2) }, morning: { done: i % 7 !== 3, detail: "" } };
      if (i % 3 !== 1) amal.evening = { done: true, detail: "" };
      if (i % 4 === 0) amal.salawat = { done: true, detail: "100 salawat" };
      if (i % 9 === 0) amal.sadaqah = { done: true, detail: "Food bank" };
      S.days[k(d)] = { prayers, amal, note: i === 1 ? "Prayed Maghrib at the masjid with family" : "" };
    }
    S.createdKey = k(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 60));
    S.lastQuran = "Al-Baqarah 198";
    S.settings.location = loc;
    // Some qada already made up this month and last month
    const thisM = ym(now), lastM = ym(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    S.qada.monthLog = { ...(S.qada.monthLog || {}), [lastM]: { prayers: 22, fasts: 2 }, [thisM]: { prayers: 9, fasts: 1 } };
    for (const p of ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]) S.qada[p] = Math.max(0, (S.qada[p] || 0) - 31);
    localStorage.setItem("amal-tracker-v1", JSON.stringify(S));
  }, LOCATION);
  await page.reload();
  await settle();

  // Log today's prayers so far
  await page.locator("#prayerList .row").nth(0).click();
  await click("#sheet .opt:has-text('In congregation')");
  await settle();
  await page.locator("#prayerList .row").nth(1).click();
  await click("#sheet .opt:has-text('On time')");
  await settle();
  await page.locator("#amalList .check").nth(1).click(); // morning adhkar
  await settle();
  await shot("01-home");

  await click("#nav [data-v=tracker]");
  await shot("02-tracker");

  await click("#nav [data-v=qada]");
  await shot("03-qada");

  await click("#nav [data-v=progress]");
  await click("#progSeg [data-r=week]");
  await shot("04-progress-week");
  await click("#progSeg [data-r=month]");
  await shot("05-progress-month");

  await click("#nav [data-v=home]");
  await click("[aria-label=Settings]");
  await shot("06-settings");

  await ctx.close();
  console.log(`${size.dir}: 6 screenshots -> ${out}`);
}

await browser.close();
server.close();
const real = errors.filter(e => !/bigdatacloud|open-meteo|Failed to load resource/.test(e));
console.log(real.length ? "CONSOLE ERRORS:\n" + real.join("\n") : "no console errors");
process.exit(real.length ? 1 : 0);
