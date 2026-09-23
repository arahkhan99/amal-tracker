// Builds the Android APK with Gradle and copies it to PrayerTracker.apk in the project root.
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

writeFileSync(join(android, "local.properties"), `sdk.dir=${sdk.replace(/\\/g, "\\\\")}\n`);
const env = { ...process.env, JAVA_HOME: java, ANDROID_HOME: sdk };
const gradlew = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
execSync(`${gradlew} assembleDebug --no-daemon`, { cwd: android, env, stdio: "inherit" });

const apk = join(android, "app", "build", "outputs", "apk", "debug", "app-debug.apk");
copyFileSync(apk, join(root, "PrayerTracker.apk"));
console.log("APK ready: " + join(root, "PrayerTracker.apk"));
