/*
 * "Update location when I travel" (S.settings.autoLocation, on by default).
 * When Zad starts or comes back to the foreground (at most once every 10 minutes), and the saved location
 * came from "Use my current location" (location.source "gps"), read the position quietly. Only when
 * location access is already allowed: this never asks for permission. If the phone is more than 3 km
 * from the saved point, save the new (rounded) location with its place name and commit, which recalculates
 * the times, redraws Home (its footer shows the place) and the widget snapshot and reschedules the reminders.
 * It updates quietly; the "Prayer times updated for …" toast shows only after a real trip (over 25 km) to a
 * place with another name.
 * A searched city (source "city") never changes on its own. An older save that didn't record how it was chosen
 * (source "unknown", saved before 15 Nov 2026) follows the phone too, but only when location access is already
 * allowed (a searched city almost never comes with it); the first reading then marks it "gps". A "gps" location is per phone: the cloud merge (store.mergeStates) keeps each
 * phone's own, so two signed-in phones in different places don't flip each other's times; a searched city
 * still syncs. The "Location updated" toast waits for the app lock (heldToast). Errors are swallowed and nothing about the
 * location is logged (crash reports must never carry it).
 */
import { TRAVEL } from "./strings.js";

/** Moved further than this from the saved point: update the location and its place name. */
export const TRAVEL_KM = 3;
/** Only a move this far (a real trip) shows "Prayer times updated for …"; nearer moves update quietly. */
export const TRAVEL_TOAST_KM = 25;
export const TRAVEL_THROTTLE_MS = 10 * 60e3;

/** Great-circle distance in km between two {lat, lng} points. */
export function distanceKm(a, b) {
  const R = 6371, rad = x => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Whether the travel check applies to these settings at all. */
export function travelEnabled(settings) {
  const loc = settings?.location;
  return settings?.autoLocation !== false && !!loc && typeof loc.lat === "number" && (loc.source === "gps" || loc.source === "unknown");
}

/**
 * A toast that waits while `isHeld()` (the app lock is up), so "Location updated" never shows over the lock
 * screen. Returns { toast(msg, opts), flush() }: toast shows now or queues; flush (call it on unlock) shows
 * what was queued, in order, if nothing holds it any more.
 */
export function heldToast(isHeld, show) {
  const queue = [];
  return {
    toast(msg, opts) { if (isHeld()) queue.push([msg, opts]); else show(msg, opts); },
    flush() { while (queue.length && !isHeld()) show(...queue.shift()); },
  };
}

let lastCheck = 0;
/** Tests only: forget the last check time. */
export function _resetTravel() { lastCheck = 0; }

/**
 * Run the check. deps: { locationGranted, quietPosition, cityName, commit, toast, now? }.
 * Resolves to true when the location was updated.
 */
export async function checkTravel(S, deps) {
  const now = deps.now ?? Date.now();
  if (!travelEnabled(S.settings)) return false;
  if (lastCheck && now - lastCheck < TRAVEL_THROTTLE_MS) return false;
  lastCheck = now;
  try {
    if (!(await deps.locationGranted())) return false;
    const saved = S.settings.location;
    const pos = await deps.quietPosition();
    if (!pos || typeof pos.lat !== "number" || typeof pos.lng !== "number") return false;
    if (distanceKm(saved, pos) <= TRAVEL_KM) {
      // Still where it was saved: an older "unknown" save is now known to follow the phone
      if (saved.source !== "unknown" || S.settings.location !== saved) return false;
      S.settings.location = { ...saved, source: "gps" };
      deps.commit();
      return false;
    }
    let label = await deps.cityName(pos.lat, pos.lng).catch(() => "");
    if (!label || label === "Your location") label = TRAVEL.fallbackLabel;
    // The user may have changed the location (or the switch) while we were waiting
    if (S.settings.location !== saved || !travelEnabled(S.settings)) return false;
    S.settings.location = { lat: pos.lat, lng: pos.lng, label, source: "gps" };
    deps.commit();
    if (label !== saved.label && distanceKm(saved, pos) > TRAVEL_TOAST_KM) deps.toast(TRAVEL.updated(label));
    return true;
  } catch (e) {
    return false; // quiet: no permission prompt, no log
  }
}

/**
 * How Settings presents the saved location (views/settings.js, the Location row and sheet): current location is
 * the default way, a chosen city the fallback. { kind: "gps" | "city" | "unknown" | "none", label, follows }.
 * follows: prayer times follow the phone when it travels (a "gps" location with autoLocation on).
 */
export function locationSummary(settings = {}) {
  const loc = settings.location;
  if (!loc || typeof loc.lat !== "number") return { kind: "none", label: "", follows: false };
  const kind = loc.source === "gps" ? "gps" : loc.source === "city" ? "city" : "unknown";
  return { kind, label: loc.label || TRAVEL.fallbackLabel, follows: kind === "gps" && settings.autoLocation !== false };
}
