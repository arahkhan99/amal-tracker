// Visual + smoke check: serves dist/, walks every screen and sheet at phone size,
// fails on any console error, and writes PNGs to shots/. Also screenshots the
// prototype (if PROTO env var points at it) for side-by-side comparison.
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const dist = join(root, "dist"), out = join(root, "shots");
mkdirSync(out, { recursive: true });
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".woff2": "font/woff2", ".woff": "font/woff", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml" };
const server = createServer((req, res) => {
  let p = join(dist, decodeURIComponent(req.url.split("?")[0]));
  if (!existsSync(p) || statSync(p).isDirectory()) p = join(dist, "index.html");
  res.writeHead(200, { "content-type": types[extname(p)] || "application/octet-stream" });
  res.end(readFileSync(p));
}).listen(4390);
const URL0 = "http://localhost:4390/";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, geolocation: { latitude: 41.8781, longitude: -87.6298 }, permissions: ["geolocation"] });
const page = await ctx.newPage();
const errors = [];
page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", e => errors.push(String(e)));
const shot = async name => { await page.waitForTimeout(350); await page.screenshot({ path: join(out, name + ".png") }); };
const click = sel => page.locator(sel).first().click();

await page.goto(URL0);
await shot("00-onboard-name");
await page.fill("#obName", "Raheem");
await click("text=Continue");
await shot("01-onboard-location");
await click("text=Skip for now");
await page.fill("#obYears", "1");
await click("button:has-text('Fill')");
await shot("02-onboard-qada");
await click("text=Continue");
await shot("03-onboard-goal");
await click("text=Start tracking");
await shot("10-home-empty");

// Seed some history so progress screens have data
await page.evaluate(() => {
  const S = JSON.parse(localStorage.getItem("amal-tracker-v1"));
  const pad = n => String(n).padStart(2, "0");
  const k = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const now = new Date();
  for (let i = 1; i <= 40; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const prayers = {};
    ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"].forEach((p, j) => { prayers[p] = (i + j) % 9 === 0 ? "missed" : (p === "Fajr" || (i + j) % 3 === 0) ? "congregation" : "ontime"; });
    const amal = { quran: { done: true, detail: "Al-Baqarah " + (160 - i) }, morning: { done: true, detail: "" } };
    if (i % 2) amal.evening = { done: true, detail: "" };
    if (i % 4 === 0) amal.salawat = { done: true, detail: "100 salawat" };
    S.days[k(d)] = { prayers, amal, note: "" };
  }
  S.createdKey = k(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 40));
  S.lastQuran = "Al-Baqarah 159";
  localStorage.setItem("amal-tracker-v1", JSON.stringify(S));
});
await page.reload();
await shot("11-home-history");

await click("#prayerList .row");
await shot("12-sheet-prayer");
await click("#sheet .opt:has-text('In congregation')");
await click("#amalList .check");
await shot("13-sheet-quran");
await click("text=Save detail");
await page.locator("#amalList .check").nth(3).click();
await shot("14-sheet-salawat");
await click("text=Save detail");
await page.locator("#prayerList .row").nth(1).click();
await click("#sheet .opt:has-text('Missed')");
await shot("15-home-logged");

await click("#nav [data-v=tracker]");
await shot("20-tracker-today");
await click("#prevDay");
await shot("21-tracker-yesterday");
await page.fill("#dayNote", "Prayed Maghrib at the masjid with family");
await page.waitForTimeout(600); // note autosave debounce
await page.locator("#dayStrip button").last().click();
await click("#addAmalBtn");
await shot("22-sheet-add-amal");
await page.fill("#nIn", "Tahajjud");
await click("text=Add to my list");

await click("#nav [data-v=qada]");
await shot("30-qada");
await click("#qadaList .act:not([disabled])");
await click("text=Change goal");
await shot("31-sheet-goal");
await click("#sheet >> text=Cancel");
await click("text=Adjust what you owe");
await shot("32-sheet-balance");
await click("#sheet >> text=Done");

await click("#nav [data-v=progress]");
for (const r of ["day", "week", "month", "year"]) { await click(`#progSeg [data-r=${r}]`); await shot(`4${["day", "week", "month", "year"].indexOf(r)}-progress-${r}`); }
await click("#progSeg [data-r=month]");
await page.locator("#progBody .grid button.l3, #progBody .grid button.l4, #progBody .grid button.l2").first().click();
await shot("44-progress-day-picked");

await click("#nav [data-v=home]");
await click("[aria-label=Settings]");
await shot("50-settings");
await page.mouse.wheel(0, 900);
await shot("51-settings-bottom");
await click("text=Calculation method");
await shot("52-sheet-method");
await click("#sheet .opt:has-text('Muslim World League')");
await click("text=Daily amal list");
await shot("53-sheet-amal-list");
await click("#sheet >> text=Save");
await click("#v-settings button.row:has-text('Location')");
await click("text=Use my current location");
await page.waitForFunction(() => JSON.parse(localStorage.getItem("amal-tracker-v1")).settings.location, null, { timeout: 20000 });
await page.waitForTimeout(500);
await shot("54-after-location");

// Offline: reload with network off; service worker should serve everything
await click("[aria-label=Back]");
await page.waitForTimeout(1500);
await ctx.setOffline(true);
await page.reload();
await shot("60-offline-home");
const offlineOk = await page.locator("#prayerList .row").count();
await ctx.setOffline(false);

// Prototype for comparison
if (process.env.PROTO) {
  const p2 = await ctx.newPage();
  await p2.goto("file:///" + process.env.PROTO.replace(/\\/g, "/"));
  await p2.waitForTimeout(1500);
  await p2.screenshot({ path: join(out, "proto-home.png") });
  for (const v of ["tracker", "qada", "progress"]) {
    await p2.locator(`#nav [data-v=${v}]`).click();
    await p2.waitForTimeout(300);
    await p2.screenshot({ path: join(out, `proto-${v}.png`) });
  }
}

await browser.close();
server.close();
const real = errors.filter(e => !/bigdatacloud|open-meteo|ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(e));
console.log(`offline prayer rows: ${offlineOk}`);
console.log(real.length ? "CONSOLE ERRORS:\n" + real.join("\n") : "no console errors");
process.exit(real.length || offlineOk !== 5 ? 1 : 0);
