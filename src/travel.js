/*
 * "Update location when I travel" (S.settings.autoLocation, on by default).
 * When Zad starts or comes back to the foreground (at most once every 30 minutes), and the saved location
 * came from "Use my current location" (location.source "gps"), read the position quietly. Only when
 * location access is already allowed: this never asks for permission. If the phone is more than 25 km
 * from the saved point, save the new (rounded) location with its city name and commit, which recalculates
 * the times, redraws Home and the widget snapshot and reschedules the reminders.
 * A searched city (source "city") never changes on its own. Errors are swallowed and nothing about the
 * location is logged (crash reports must never carry it).
 */
import { TRAVEL } from "./strings.js";

export const TRAVEL_KM = 25;
export const TRAVEL_THROTTLE_MS = 30 * 60e3;

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
  return settings?.autoLocation !== false && !!loc && typeof loc.lat === "number" && (loc.source || "gps") === "gps";
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
    if (distanceKm(saved, pos) <= TRAVEL_KM) return false;
    let label = await deps.cityName(pos.lat, pos.lng).catch(() => "");
    if (!label || label === "Your location") label = TRAVEL.fallbackLabel;
    // The user may have changed the location (or the switch) while we were waiting
    if (S.settings.location !== saved || !travelEnabled(S.settings)) return false;
    S.settings.location = { lat: pos.lat, lng: pos.lng, label, source: "gps" };
    deps.commit();
    deps.toast(TRAVEL.updated(label));
    return true;
  } catch (e) {
    return false; // quiet: no permission prompt, no log
  }
}
