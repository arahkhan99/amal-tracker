/*
 * The one rule for every write that ADDS a log from the UI: a prayer, its sunnah chips, Witr (on ʿIshāʾ) and
 * "Remembrance at prayer time" can't be logged before that prayer's time begins. Removing a log (clearing a
 * status, unticking a chip or remembrance) is always allowed.
 * The store's setters (setPrayer / setSunnah / setWitr / setRemember) can't work out prayer times, so every
 * UI path that calls them with a new value asks logAllowed first: home.js applyStatus, toggleChip, rememberAt
 * and the yesterday catch-up. store.endExcused only writes "excused" for the prayers its callers pass, which
 * are times.startedPrayers (prayers already begun), so it never logs a prayer that hasn't started.
 */
import { notStarted, canStillMakeUp } from "./times.js";
import { PRAYERS, parseKey } from "./util.js";

/**
 * Whether prayer `p` of the day `key` ("YYYY-MM-DD") has begun at `now`, so it can be logged.
 * Anything that isn't one of the five (e.g. "day" for the day's nafl chips) has no start time: always true.
 */
export function canLog(S, key, p, now = new Date()) {
  if (!PRAYERS.includes(p)) return true;
  return !notStarted(parseKey(key), p, S.settings, now);
}

/**
 * Whether a write may go ahead. `value` is what would be stored: a status, true for a tick, or
 * null / false / undefined to remove a log, which is always allowed.
 */
export function logAllowed(S, key, p, value, now = new Date()) {
  return !value || canLog(S, key, p, now);
}

/**
 * "Made up later" means prayed after its time, before the next Fajr. So it can be chosen only once the prayer's
 * own time has ended (and the next Fajr hasn't come). A prayer already stored as made up keeps the choice.
 */
export function madeUpAllowed(S, key, p, now = new Date()) {
  if (!PRAYERS.includes(p)) return false;
  return canStillMakeUp(parseKey(key), p, now, S.settings);
}
