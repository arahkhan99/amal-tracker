// Builds the Android APK with Gradle and copies it to Zad.apk in the project root.
// --debug   builds a debuggable APK instead of the release one
// --bundle  builds the release App Bundle for Google Play and copies it to Zad.aab instead
import { execSync } from "node:child_process";
import { copyFileSync, existsSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const android = join(root, "android");

const sdk = process.env.ANDROID_HOME || join(process.env.LOCALAPPDATA || "", "Android", "Sdk");
let java = process.env.JAVA_HOME;
if (!java || !existsSync(java)) {
  const base = "C:\\Program Files\\Eclipse Adoptium";
  const jdk = existsSync(base) && readdirSync(base).find(d => d.startsWith("jdk-21"));
  if (jdk) java = join(base, jdk);
}
if (!existsSync(sdk)) throw new Error("Android SDK not found. Run scripts/setup-android-sdk.ps1 first.");
if (!java) throw new Error("JDK 21 not found. Run: winget install EclipseAdoptium.Temurin.21.JDK");
if (!existsSync(join(android, "keystore.properties"))) throw new Error("android/keystore.properties missing. Copy it from C:/Users/chito/amal-tracker-signing/");

writeFileSync(join(android, "local.properties"), `sdk.dir=${sdk.replace(/\\/g, "\\\\")}\n`);
// Version code = minutes since 1 Jan 2026 (same rule as the GitHub build), so every new build is an upgrade
const now = new Date();
const versionCode = String(Math.floor((now - Date.UTC(2026, 0, 1)) / 60000));
// Same format as the GitHub build and the Settings screen: YYYY.MM.DD.HHmm (UTC)
const iso = now.toISOString();
const versionName = `${iso.slice(0, 4)}.${iso.slice(5, 7)}.${iso.slice(8, 10)}.${iso.slice(11, 13)}${iso.slice(14, 16)}`;
const env = { ...process.env, JAVA_HOME: java, ANDROID_HOME: sdk, APP_VERSION_CODE: versionCode, APP_VERSION_NAME: versionName };
const gradlew = process.platform === "win32" ? `"${join(android, "gradlew.bat")}"` : "./gradlew";
if (process.argv.includes("--bundle")) {
  // Signed release App Bundle (.aab) for uploading to Google Play
  execSync(`${gradlew} bundleRelease --no-daemon`, { cwd: android, env, stdio: "inherit" });
  const aab = join(android, "app", "build", "outputs", "bundle", "release", "app-release.aab");
  copyFileSync(aab, join(root, "Zad.aab"));
  console.log("App Bundle ready: " + join(root, "Zad.aab"));
} else {
  // --debug builds a debuggable app (needed by scripts/emulator-check.mjs); same signing key
  const variant = process.argv.includes("--debug") ? "debug" : "release";
  const task = variant === "debug" ? "assembleDebug" : "assembleRelease";
  execSync(`${gradlew} ${task} --no-daemon`, { cwd: android, env, stdio: "inherit" });

  const apk = join(android, "app", "build", "outputs", "apk", variant, `app-${variant}.apk`);
  copyFileSync(apk, join(root, "Zad.apk"));
  console.log("APK ready: " + join(root, "Zad.apk"));
}
