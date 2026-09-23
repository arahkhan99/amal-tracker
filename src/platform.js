import { Capacitor } from "@capacitor/core";

export const isNative = () => Capacitor.isNativePlatform();

/* ---------- location ---------- */
export async function currentPosition() {
  if (isNative()) {
    const { Geolocation } = await import("@capacitor/geolocation");
    const perm = await Geolocation.requestPermissions().catch(() => null);
    if (perm && perm.location === "denied") throw new Error("denied");
    const p = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 15000 });
    return { lat: p.coords.latitude, lng: p.coords.longitude };
  }
  if (!navigator.geolocation) throw new Error("unsupported");
  return new Promise((res, rej) => navigator.geolocation.getCurrentPosition(
    p => res({ lat: p.coords.latitude, lng: p.coords.longitude }), rej, { timeout: 15000, maximumAge: 36e5 }));
}

/** City name for coordinates (needs internet; falls back to a generic label). */
export async function cityName(lat, lng) {
  try {
    const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
    const j = await r.json();
    const city = j.city || j.locality;
    // "Chicago, IL" in the US and Canada, "London, United Kingdom" elsewhere
    const region = ["US", "CA"].includes(j.countryCode) ? j.principalSubdivisionCode?.split("-")[1] : j.countryName;
    if (city) return region ? `${city}, ${region}` : city;
  } catch (e) { /* offline */ }
  return "Your location";
}

/** Look up a city by name. Returns [{lat, lng, label}]. */
export async function searchCity(q) {
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=en&format=json`);
  const j = await r.json();
  return (j.results || []).map(x => ({ lat: x.latitude, lng: x.longitude, label: [x.name, x.admin1, x.country_code].filter(Boolean).join(", ") }));
}

/* ---------- files ---------- */
export async function saveFile(name, text, mime) {
  if (isNative()) {
    const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    const res = await Filesystem.writeFile({ path: name, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
    await Share.share({ title: name, url: res.uri });
    return;
  }
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function pickFile(accept) {
  return new Promise(res => {
    const i = Object.assign(document.createElement("input"), { type: "file", accept });
    i.onchange = () => { const f = i.files[0]; if (!f) return res(null); const r = new FileReader(); r.onload = () => res(r.result); r.readAsText(f); };
    i.click();
  });
}

/* ---------- app lock ---------- */
export async function biometryAvailable() {
  if (!isNative()) return false;
  try {
    const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth");
    const r = await BiometricAuth.checkBiometry();
    return r.isAvailable || r.deviceIsSecure;
  } catch (e) { return false; }
}

export async function authenticate() {
  const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth");
  await BiometricAuth.authenticate({ reason: "Unlock your tracker", cancelTitle: "Cancel", allowDeviceCredential: true, androidTitle: "Prayer & Amal Tracker", androidSubtitle: "Unlock to continue" });
}
