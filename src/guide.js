/*
 * Setup "Can you read Arabic?", the Home tour and the one-time tool tips: the logic only (no DOM),
 * so it can be tested. Drawing lives in views/onboarding.js, views/tour.js and views/help.js.
 *
 * Everything "seen" is kept in S.settings.help, so it persists and syncs with the rest of the settings:
 *   S.settings.help = {
 *     tour: "pending" | "done",   // "pending" from the end of setup (or Replay) until the tour is finished or skipped
 *     tips: { adhkar: true, ... }, // tool tips already dismissed with Got it
 *     opened: true,                // Settings → Help & tour has been opened (drops the "New" tag)
 *   }
 * The reading answer is S.settings.reading ("yes" | "little" | "notyet"). It sets the tools' prefs
 * (S.tools.prefs, see views/tools/core.js prefs()).
 */
import { isOn, navTabs } from "./features.js";

/* ---------- reading ---------- */
export const READING = ["yes", "little", "notyet"];

/** What each answer sets. "Not yet" behaves like "A little" (no separate layout). */
export function readingPrefs(answer) {
  return answer === "yes" ? { translit: false, translation: false } : { translit: true, translation: true };
}

/** Defaults of the tools' reading switches (S.tools.prefs); views/tools/core.js prefs() starts from a copy of these. */
export const PREF_DEFAULTS = Object.freeze({ translit: false, translation: false, size: 1, evWords: true });

/** Save the answer and set the tools' transliteration and meaning switches. Caller commits. */
export function applyReading(S, answer) {
  if (!READING.includes(answer)) return false;
  S.settings.reading = answer;
  const tools = (S.tools ||= {});
  tools.prefs = { ...PREF_DEFAULTS, ...(tools.prefs || {}), ...readingPrefs(answer) };
  return true;
}

/** The current answer. Users who never answered get one read off their switches. */
export function readingOf(S) {
  const r = S?.settings?.reading;
  if (READING.includes(r)) return r;
  const p = S?.tools?.prefs;
  return p && (p.translit || p.translation) ? "little" : "yes";
}

/* ---------- seen flags ---------- */
export function helpState(S) {
  const h = (S.settings.help ||= {});
  if (!h.tips || typeof h.tips !== "object") h.tips = {};
  return h;
}

/** Called when setup finishes: the tour shows the next time Home opens. */
export function queueTour(S) { helpState(S).tour = "pending"; }
export function tourDue(S) { return !!S?.profile?.onboarded && S?.settings?.help?.tour === "pending"; }
/** Finished or skipped: never shown again (until Replay). */
export function endTour(S) { helpState(S).tour = "done"; }

export const TIP_TOOLS = ["adhkar", "quran", "hizb"];
export function tipDue(S, tool) { return TIP_TOOLS.includes(tool) && !S?.settings?.help?.tips?.[tool]; }
export function dismissTip(S, tool) { helpState(S).tips[tool] = true; }

/** Replay the tour: queue it again and bring the tool tips back. */
export function replayTour(S) { const h = helpState(S); h.tour = "pending"; h.tips = {}; }

export function helpIsNew(S) { return !S?.settings?.help?.opened; }
export function markHelpOpened(S) { helpState(S).opened = true; }

/* ---------- tour steps ---------- */
/**
 * The tour's steps for this user, in order. Steps whose tab or feature is hidden are left out.
 * env.hasDots: whether Home is showing the ··· button right now (the Now card with an unlogged prayer).
 * Without it the "Every choice" step is dropped and step 1 points at "Salāh today" instead.
 * Each step: { id, target: "now" | "today" | "dots" | "deeds" | "tab", tabs?: [view ids], variant? }
 */
export function tourSteps(S, env = {}) {
  const tabs = navTabs(S).map(t => t.id);
  const hasDots = env.hasDots !== false;
  const out = [];
  out.push(hasDots ? { id: "prayer", target: "now" } : { id: "prayer", target: "today", variant: "today" });
  if (hasDots) out.push({ id: "status", target: "dots" });
  if (isOn(S, "deeds")) out.push({ id: "deeds", target: "deeds" });
  if (tabs.includes("tools")) out.push({ id: "tools", target: "tab", tabs: ["tools"] });
  if (tabs.includes("progress")) out.push({ id: "progress", target: "tab", tabs: ["progress"] });
  const tq = tabs.includes("qada");
  out.push({ id: "tracker", target: "tab", tabs: tq ? ["tracker", "qada"] : ["tracker"], variant: tq ? "makeups" : "only" });
  out.push({ id: "finish", target: null });
  return out;
}
