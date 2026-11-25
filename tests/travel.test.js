import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Platform: a fake phone with a fake Geolocation plugin
const plat = vi.hoisted(() => ({ native: true }));
const geo = vi.hoisted(() => ({
  perm: "granted",
  pos: { latitude: 41.88, longitude: -87.63 },
  checkPermissions: null, requestPermissions: null, getCurrentPosition: null,
}));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => plat.native, getPlatform: () => "android" } }));
vi.mock("@capacitor/geolocation", () => ({ Geolocation: geo }));

const platform = await import("../src/platform.js");
const store = await import("../src/store.js");
const { checkTravel, distanceKm, travelEnabled, _resetTravel, TRAVEL_THROTTLE_MS, heldToast } = await import("../src/travel.js");
const { timesFor, currentWindow, nextPrayer } = await import("../src/times.js");
const { dkey, PRAYERS } = await import("../src/util.js");

const HOME = { lat: 41.88, lng: -87.63, label: "Chicago, IL", source: "gps" };
// 1° of latitude is about 111.2 km, so these points are due north of HOME
const north = km => ({ latitude: HOME.lat + km / 111.195, longitude: HOME.lng });

function setup(loc = HOME, extra = {}) {
  const S = store.defaultState(new Date(2026, 10, 5));
  S.profile.onboarded = true;
  S.settings.location = { ...loc };
  Object.assign(S.settings, extra);
  return S;
}
function deps(over = {}) {
  return {
    locationGranted: platform.locationGranted,
    quietPosition: platform.quietPosition,
    cityName: vi.fn(async () => "Milwaukee, WI"),
    commit: vi.fn(), toast: vi.fn(),
    now: 1e12,
    ...over,
  };
}

beforeEach(() => {
  _resetTravel();
  plat.native = true;
  geo.perm = "granted";
  geo.pos = north(100);
  geo.checkPermissions = vi.fn(async () => ({ location: geo.perm, coarseLocation: geo.perm }));
  geo.requestPermissions = vi.fn(async () => ({ location: "granted" }));
  geo.getCurrentPosition = vi.fn(async () => ({ coords: geo.pos }));
});

describe("distance threshold", () => {
  it("measures distance in km", () => {
    expect(distanceKm(HOME, { lat: HOME.lat + 1, lng: HOME.lng })).toBeCloseTo(111.2, 0);
    expect(distanceKm(HOME, HOME)).toBe(0);
  });
  it("2 km away: no change", async () => {
    geo.pos = north(2);
    const S = setup(), d = deps();
    expect(await checkTravel(S, d)).toBe(false);
    expect(S.settings.location).toEqual(HOME);
    expect(d.commit).not.toHaveBeenCalled();
    expect(d.toast).not.toHaveBeenCalled();
  });
  it("4 km away: updates the location (rounded) and commits, quietly", async () => {
    geo.pos = north(4);
    const S = setup(), d = deps();
    expect(await checkTravel(S, d)).toBe(true);
    const loc = S.settings.location;
    expect(loc.source).toBe("gps");
    expect(loc.label).toBe("Milwaukee, WI");
    expect(loc.lat).toBe(Math.round(north(4).latitude * 100) / 100);
    expect(loc.lng).toBe(HOME.lng);
    expect(d.cityName).toHaveBeenCalledWith(loc.lat, loc.lng);
    expect(d.commit).toHaveBeenCalledTimes(1);
    expect(d.toast).not.toHaveBeenCalled();
  });
  it("a real trip (over 25 km) to another place shows the toast", async () => {
    geo.pos = north(30);
    const S = setup(), d = deps();
    expect(await checkTravel(S, d)).toBe(true);
    expect(d.toast).toHaveBeenCalledWith("Prayer times updated for Milwaukee, WI");
  });
  it("moved but the place name is the same: updates quietly, no toast", async () => {
    geo.pos = north(5);
    const S = setup(), d = deps({ cityName: async () => "Chicago, IL" });
    expect(await checkTravel(S, d)).toBe(true);
    expect(S.settings.location.lat).toBe(Math.round(north(5).latitude * 100) / 100);
    expect(d.commit).toHaveBeenCalledTimes(1);
    expect(d.toast).not.toHaveBeenCalled();
  });
  it("falls back to “Current location” when the city name can't be found", async () => {
    const S = setup(), d = deps({ cityName: async () => "Your location" });
    await checkTravel(S, d);
    expect(S.settings.location.label).toBe("Current location");
    expect(d.toast).toHaveBeenCalledWith("Prayer times updated for Current location");
  });
  it("prayer times follow the new location after the update", async () => {
    geo.pos = { latitude: 21.42, longitude: 39.83 }; // Makkah
    const S = setup(), before = timesFor(new Date(2026, 10, 5), S.settings);
    await checkTravel(S, deps());
    const after = timesFor(new Date(2026, 10, 5), S.settings);
    expect(+after.Dhuhr).not.toBe(+before.Dhuhr);
  });
});

describe("when it runs", () => {
  it("only for a GPS location with the switch on", () => {
    expect(travelEnabled(setup().settings)).toBe(true);
    expect(travelEnabled(setup(HOME, { autoLocation: false }).settings)).toBe(false);
    expect(travelEnabled(setup({ ...HOME, source: "city" }).settings)).toBe(false);
    const none = setup(); none.settings.location = null;
    expect(travelEnabled(none.settings)).toBe(false);
  });
  it("switch off: never reads the position", async () => {
    const S = setup(HOME, { autoLocation: false }), d = deps();
    expect(await checkTravel(S, d)).toBe(false);
    expect(geo.getCurrentPosition).not.toHaveBeenCalled();
    expect(geo.checkPermissions).not.toHaveBeenCalled();
  });
  it("a searched city never changes on its own", async () => {
    const city = { lat: 51.51, lng: -0.13, label: "London, England, GB", source: "city" };
    const S = setup(city), d = deps();
    geo.pos = north(5000);
    expect(await checkTravel(S, d)).toBe(false);
    expect(S.settings.location).toEqual(city);
    expect(geo.getCurrentPosition).not.toHaveBeenCalled();
  });
  it("never prompts for permission: no permission means no reading", async () => {
    geo.perm = "prompt";
    const S = setup(), d = deps();
    expect(await checkTravel(S, d)).toBe(false);
    expect(geo.checkPermissions).toHaveBeenCalled();
    expect(geo.requestPermissions).not.toHaveBeenCalled();
    expect(geo.getCurrentPosition).not.toHaveBeenCalled();
    expect(S.settings.location).toEqual(HOME);
  });
  it("with permission: still never asks, and reads quietly (low accuracy, cached, short timeout)", async () => {
    await checkTravel(setup(), deps());
    expect(geo.requestPermissions).not.toHaveBeenCalled();
    const opts = geo.getCurrentPosition.mock.calls[0][0];
    expect(opts.enableHighAccuracy).toBe(false);
    expect(opts.maximumAge).toBe(10 * 60e3);
    expect(opts.timeout).toBeLessThanOrEqual(10000);
  });
  it("web without a permissions API: skipped", async () => {
    plat.native = false;
    expect(await platform.locationGranted()).toBe(false);
  });
  it("errors are swallowed", async () => {
    geo.getCurrentPosition = vi.fn(async () => { throw new Error("timeout"); });
    const S = setup(), d = deps();
    await expect(checkTravel(S, d)).resolves.toBe(false);
    expect(S.settings.location).toEqual(HOME);
    expect(d.toast).not.toHaveBeenCalled();
  });
  it("throttled to once every 10 minutes", async () => {
    geo.pos = north(1);
    const S = setup();
    await checkTravel(S, deps({ now: 1e12 }));
    await checkTravel(S, deps({ now: 1e12 + 5 * 60e3 }));
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1);
    await checkTravel(S, deps({ now: 1e12 + TRAVEL_THROTTLE_MS + 1 }));
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(2);
  });
  it("leaves a location the user changed meanwhile alone", async () => {
    const S = setup();
    const city = { lat: 51.51, lng: -0.13, label: "London", source: "city" };
    const d = deps({ cityName: async () => { S.settings.location = city; return "Milwaukee, WI"; } });
    expect(await checkTravel(S, d)).toBe(false);
    expect(S.settings.location).toBe(city);
    expect(d.commit).not.toHaveBeenCalled();
  });
});

describe("migration of older settings", () => {
  const older = () => store.normalize({ profile: { onboarded: true }, settings: { method: "Karachi", location: { lat: 41.8781, lng: -87.6298, label: "Chicago, IL" } } });
  it("a saved location without a source is \"unknown\"; with location access it follows the phone and becomes gps", async () => {
    const S = older();
    expect(S.settings.location).toEqual({ lat: 41.88, lng: -87.63, label: "Chicago, IL", source: "unknown" });
    expect(S.settings.autoLocation).toBe(true);
    expect(travelEnabled(S.settings)).toBe(true);
    geo.pos = north(40);
    const d = deps();
    expect(await checkTravel(S, d)).toBe(true);
    expect(S.settings.location).toMatchObject({ label: "Milwaukee, WI", source: "gps" });
    expect(d.toast).toHaveBeenCalledWith("Prayer times updated for Milwaukee, WI");
  });
  it("\"unknown\" and still in the same place: marked gps quietly, label kept", async () => {
    const S = older();
    geo.pos = north(1);
    const d = deps();
    expect(await checkTravel(S, d)).toBe(false);
    expect(S.settings.location).toEqual({ lat: 41.88, lng: -87.63, label: "Chicago, IL", source: "gps" });
    expect(d.commit).toHaveBeenCalledTimes(1);
    expect(d.toast).not.toHaveBeenCalled();
  });
  it("\"unknown\" without location access (likely a searched city): left alone", async () => {
    geo.perm = "denied";
    const S = older();
    geo.pos = north(5000);
    const d = deps();
    expect(await checkTravel(S, d)).toBe(false);
    expect(S.settings.location.label).toBe("Chicago, IL");
    expect(S.settings.location.source).toBe("unknown");
    expect(geo.getCurrentPosition).not.toHaveBeenCalled();
    expect(d.commit).not.toHaveBeenCalled();
  });
  it("keeps a gps or unknown source through another normalize; anything else becomes unknown", () => {
    const n = source => store.normalize({ settings: { location: { lat: 1, lng: 2, label: "X", source } } }).settings.location.source;
    expect(n("gps")).toBe("gps");
    expect(n("unknown")).toBe("unknown");
    expect(n("weird")).toBe("unknown");
  });
  it("keeps a city source and an off switch", () => {
    const S = store.normalize({ settings: { autoLocation: false, location: { lat: 1, lng: 2, label: "X", source: "city" } } });
    expect(S.settings.location.source).toBe("city");
    expect(S.settings.autoLocation).toBe(false);
  });
  it("new installs: switch on, no location", () => {
    const S = store.defaultState();
    expect(S.settings.autoLocation).toBe(true);
    expect(S.settings.location).toBe(null);
  });
});

describe("time zones (a traveler's phone changes zone)", () => {
  const was = process.env.TZ;
  afterEach(() => { process.env.TZ = was; });
  it("times are shown in the phone's own zone and fall on today's date", () => {
    process.env.TZ = "Asia/Tokyo";
    const settings = { ...store.defaultState().settings, location: { lat: 35.68, lng: 139.69, label: "Tokyo", source: "gps" } };
    const day = new Date(2026, 10, 5);
    expect(day.getTimezoneOffset()).toBe(-540); // the zone change took effect
    const t = timesFor(day, settings);
    for (const p of PRAYERS) expect(dkey(t[p])).toBe("2026-11-05");
    // Tokyo in early November: Fajr a little after 4:30 AM, Dhuhr about 11:25 AM, Isha after 6 PM local
    expect(t.Fajr.getHours()).toBe(4);
    expect(t.Dhuhr.getHours()).toBe(11);
    expect(t.Isha.getHours()).toBeGreaterThanOrEqual(18);
    for (let i = 1; i < PRAYERS.length; i++) expect(+t[PRAYERS[i]]).toBeGreaterThan(+t[PRAYERS[i - 1]]);
    const noon = new Date(2026, 10, 5, 12, 0);
    expect(currentWindow(noon, settings)?.p).toBe("Dhuhr");
    expect(nextPrayer(noon, settings).p).toBe("Asr");
  });
  it("the same moment gets the right day key after the zone changes", () => {
    const moment = new Date(Date.UTC(2026, 10, 5, 20, 0)); // 2 PM in Chicago, 5 AM next day in Tokyo
    process.env.TZ = "America/Chicago";
    expect(dkey(moment)).toBe("2026-11-05");
    process.env.TZ = "Asia/Tokyo";
    expect(dkey(moment)).toBe("2026-11-06");
  });
});

describe("a GPS location is per phone (cloud merge)", () => {
  // Two signed-in phones in different places: neither may flip the other's location (store.mergeStates)
  const MKE = { lat: 43.04, lng: -87.91, label: "Milwaukee, WI", source: "gps" };
  const MECCA = { lat: 21.42, lng: 39.83, label: "Makkah", source: "city" };
  const LON = { lat: 51.5, lng: -0.12, label: "London", source: "city" };
  const phone = (loc, updatedAt) => { const S = setup(loc); S.updatedAt = updatedAt; if (!loc) S.settings.location = null; return S; };

  it("keeps this phone's GPS location when the other phone (also GPS) saved last", () => {
    const m = store.mergeStates(phone(HOME, 10), phone(MKE, 20));
    expect(m.settings.location).toEqual(HOME);
  });
  it("keeps this phone's GPS location when the cloud copy is newer for other reasons", () => {
    const remote = phone(MKE, 20); remote.settings.method = "MuslimWorldLeague";
    const m = store.mergeStates(phone(HOME, 10), remote);
    expect(m.settings.method).toBe("MuslimWorldLeague"); // the rest still syncs
    expect(m.settings.location).toEqual(HOME);
  });
  it("keeps this phone's GPS location over a newer searched city from another phone", () => {
    expect(store.mergeStates(phone(HOME, 10), phone(MECCA, 20)).settings.location).toEqual(HOME);
  });
  it("never takes another phone's GPS fix over a city chosen here", () => {
    expect(store.mergeStates(phone(LON, 10), phone(MKE, 20)).settings.location).toEqual(LON);
  });
  it("still syncs a searched city between phones that both use a city", () => {
    expect(store.mergeStates(phone(LON, 10), phone(MECCA, 20)).settings.location).toEqual(MECCA);
    expect(store.mergeStates(phone(MECCA, 20), phone(LON, 10)).settings.location).toEqual(MECCA);
  });
  it("a phone with no location yet takes the cloud copy's, GPS or not", () => {
    expect(store.mergeStates(phone(null, 10), phone(MKE, 20)).settings.location).toEqual(MKE);
    expect(store.mergeStates(phone(null, 10), phone(MECCA, 20)).settings.location).toEqual(MECCA);
  });
  it("a fresh install (not set up yet) restores the cloud copy as it is", () => {
    const local = phone(HOME, 10); local.profile.onboarded = false;
    expect(store.mergeStates(local, phone(MKE, 20)).settings.location).toEqual(MKE);
  });
  it("doesn't change the local state object", () => {
    const local = phone(HOME, 10), before = JSON.stringify(local);
    store.mergeStates(local, phone(MKE, 20));
    expect(JSON.stringify(local)).toBe(before);
  });
});

describe("travel toast waits for the app lock (heldToast)", () => {
  it("shows at once when unlocked, queues while locked and shows in order on unlock", () => {
    let locked = true;
    const shown = [];
    const t = heldToast(() => locked, (m, o) => shown.push([m, o]));
    t.toast("Location updated to Milwaukee, WI");
    t.toast("second", { undo: 1 });
    expect(shown).toEqual([]);
    t.flush(); // still locked (e.g. a failed unlock): nothing yet
    expect(shown).toEqual([]);
    locked = false;
    t.flush();
    expect(shown).toEqual([["Location updated to Milwaukee, WI", undefined], ["second", { undo: 1 }]]);
    t.flush();
    expect(shown.length).toBe(2);
    t.toast("now");
    expect(shown.at(-1)).toEqual(["now", undefined]);
  });
  it("checkTravel's toast goes through it", async () => {
    let locked = true;
    const show = vi.fn();
    const held = heldToast(() => locked, show);
    const S = setup(), d = deps({ toast: held.toast });
    expect(await checkTravel(S, d)).toBe(true);
    expect(d.commit).toHaveBeenCalled(); // the times are updated under the lock...
    expect(show).not.toHaveBeenCalled(); // ...but the toast waits
    locked = false; held.flush();
    expect(show).toHaveBeenCalledWith(expect.stringContaining("Milwaukee"), undefined);
  });
});
