// Drives the installed Android app on a running emulator through its WebView (debug builds only):
// onboarding, GPS location, logging, and checks that reminders are actually scheduled.
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const adb = join(process.env.LOCALAPPDATA, "Android", "Sdk", "platform-tools", "adb.exe");
const sh = c => execSync(`"${adb}" ${c}`).toString().trim();
const out = join(root, "shots"); mkdirSync(out, { recursive: true });
const cap = name => writeFileSync(join(out, `emu-${name}.png`), execSync(`"${adb}" exec-out screencap -p`));
const wait = ms => new Promise(r => setTimeout(r, ms));
const PKG = "com.amaltracker.app";

sh(`shell pm clear ${PKG}`);
for (const p of ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION", "POST_NOTIFICATIONS"]) sh(`shell pm grant ${PKG} android.permission.${p}`);
sh("emu geo fix -0.1276 51.5072"); // London
sh(`shell monkey -p ${PKG} -c android.intent.category.LAUNCHER 1`);
await wait(9000);
const pid = sh(`shell pidof ${PKG}`);
sh(`forward tcp:9333 localabstract:webview_devtools_remote_${pid}`);

// Raw DevTools protocol (Playwright can't attach to an Android WebView)
const targets = await (await fetch("http://localhost:9333/json")).json();
const ws = new WebSocket(targets.find(t => t.type === "page").webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener("open", r, { once: true }));
let seq = 0; const waiting = new Map(); const errors = [];
ws.addEventListener("message", e => {
  const m = JSON.parse(e.data);
  if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); }
  if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description || "exception");
  if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errors.push(m.params.args.map(a => a.value ?? JSON.stringify(a.preview?.properties?.map(p => p.name + "=" + p.value) ?? a.description)).join(" "));
});
const send = (method, params = {}) => new Promise(r => { const id = ++seq; waiting.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
await send("Runtime.enable");
const ev = async expr => {
  const r = await send("Runtime.evaluate", { expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true });
  if (r.result.exceptionDetails) throw new Error(expr + " -> " + JSON.stringify(r.result.exceptionDetails.exception?.description));
  return r.result.result.value;
};
const click = sel => ev(`const el = document.querySelector(${JSON.stringify(sel)}); if (!el) throw new Error("missing ${sel.replace(/"/g, "'")}"); el.click();`);
const clickText = (sel, text) => ev(`const el = [...document.querySelectorAll(${JSON.stringify(sel)})].find(e => e.textContent.includes(${JSON.stringify(text)}) && e.offsetParent !== null); if (!el) throw new Error("missing text ${text}"); el.click();`);
const fill = (sel, v) => ev(`const el = document.querySelector(${JSON.stringify(sel)}); el.value = ${JSON.stringify(v)}; el.dispatchEvent(new Event("input"));`);
const state = () => ev('return JSON.parse(localStorage.getItem("amal-tracker-v1") || "null");');

await fill("#obName", "Raheem");
await clickText("button", "Continue"); await wait(600);
await clickText("button", "Use my location");
for (let i = 0; i < 60 && !(await state())?.settings.location; i++) await wait(500);
await wait(800);
cap("10-onboard-location");
await clickText("button", "Continue"); await wait(600);
await fill("#ob_Fajr", "30");
await clickText("button", "Continue"); await wait(600);
await clickText("button", "Start tracking");
await wait(3000);
cap("11-home");

await click("#prayerList .row"); await wait(600);
await clickText("#sheet .opt", "On time");
await wait(2000);
const pending = await ev("return await window.Capacitor.Plugins.LocalNotifications.getPending();");
const loc = (await state()).settings.location;
cap("12-home-logged");

await click("#nav [data-v=tracker]"); await wait(800); cap("20-tracker");
await click("#nav [data-v=qada]"); await wait(800); cap("30-qada");
await click("#nav [data-v=progress]"); await wait(800); cap("40-progress");
sh("shell input keyevent KEYCODE_BACK"); await wait(1200);
const afterBack = await ev('return document.querySelector(".view.on").id;');
await click("[aria-label=Settings]"); await wait(800); cap("50-settings");
const lockVisible = await ev('return document.querySelector("#lockRow").offsetParent !== null;');

console.log("location:", JSON.stringify(loc));
console.log("pending notifications:", pending.notifications.length);
console.log("sample:", pending.notifications.slice(0, 3).map(n => `${n.title} @ ${n.schedule?.at}`).join(" | "));
console.log("back button went to:", afterBack);
console.log("lock row visible on Android:", lockVisible);
console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "no errors");
ws.close();
process.exit(errors.length || !pending.notifications.length || afterBack !== "v-home" ? 1 : 0);
