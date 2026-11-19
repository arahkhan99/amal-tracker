/*
 * Routes: the names a link or the address bar can use (#today, #read, #calendar …) and the view ids behind them.
 * The view ids stay as they were before the redesign ("home" is the Today tab, "tools" the Read tab), so older
 * links and saved places keep working: #home → Today, #tools → Read, #tracker → the calendar, #qada → Make-ups.
 * No DOM here, so tests can import it. app.js go() runs every view name through resolveView().
 */

import { progressChapters } from "./features.js";

/** Public route name → view id. */
const ROUTES = {
  today: "home", home: "home", now: "home",
  read: "tools", tools: "tools",
  calendar: "calendar", tracker: "calendar", // the Tracker tab is gone: its job is the calendar
  progress: "progress",
  makeups: "qada", qada: "qada",
  community: "community",
  settings: "settings",
  qibla: "qibla",
  onboard: "onboard",
};
/** View id → the name shown in the address bar. */
const NAMES = { home: "today", tools: "read", calendar: "calendar", progress: "progress", qada: "makeups", community: "community", settings: "settings", qibla: "qibla" };

/** The view id for a route or view name (old names redirect); null when unknown. */
export function resolveView(name) {
  const k = String(name || "").replace(/^#\/?/, "").toLowerCase();
  return Object.prototype.hasOwnProperty.call(ROUTES, k) ? ROUTES[k] : null;
}

/** The public name of a view for the address bar ("" for views that don't get one, such as onboarding). */
export function routeName(view) { return NAMES[view] || ""; }

/**
 * Where a view actually opens: Make-ups (#makeups, #qada, the old tab) is a chapter of Progress while Progress
 * has one, so it lands on Progress at the Make-ups chapter. With Progress off it stays its own page.
 * Returns { view, chapter } (chapter: a Progress chapter id, or null).
 */
export function landing(view, S) {
  if (view === "qada" && progressChapters(S).includes("makeups")) return { view: "progress", chapter: "makeups" };
  return { view, chapter: null };
}

/**
 * Which bottom-bar tab is lit for a view: pages pushed from a tab light that tab
 * (the calendar is part of Today; Make-ups is part of Progress, or its own tab when Progress is off).
 */
export function tabFor(view) {
  if (view === "calendar") return "home";
  if (view === "qada") return "progress";
  return view;
}

/* ---------- leaving a tab resets it (19 Nov 2026; views/chapters.js resetChapters) ---------- */
/** Pages opened over a tab that return to it (Settings, the Qibla page, set-up): they belong to no tab. */
export const OVER_PAGES = ["settings", "qibla", "onboard"];
/** The bottom-bar tab a view belongs to, or null for a page opened over a tab. */
export function tabOf(view) { return !view || OVER_PAGES.includes(view) ? null : tabFor(view); }
/**
 * Which tab to reset when going to `view` while `lastTab` was the tab last shown: the tab being left, when the
 * new view belongs to another tab. Pages opened over a tab (Settings, Qibla) leave it alone, so back finds it as it was.
 */
export function tabToReset(lastTab, view) {
  const t = tabOf(view);
  return t && lastTab && t !== lastTab ? lastTab : null;
}
/** The views that make up a tab (the calendar is part of Today; Make-ups of Progress). */
export function viewsOfTab(tab) { return tab === "home" ? ["home", "calendar"] : tab === "progress" ? ["progress", "qada"] : [tab]; }
