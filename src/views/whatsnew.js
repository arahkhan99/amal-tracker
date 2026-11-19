/* What's new: one calm screen, shown once to people who used Zad before the redesign, on the first open after the
 * update. Never to new users: finishing set-up marks it seen (views/onboarding.js completeSetup).
 * The flag lives in S.profile.whatsNew, so it travels with the cloud backup: a backup restored from before the
 * update shows it once on the new phone, and never again after Continue.
 * The rule and the markup are here (no DOM, so tests can use them); views/onboarding.js draws it in #v-onboard. */
import { esc } from "../util.js";
import { WHATS_NEW as W } from "../strings.js";

/** Bump only for a change big enough to explain again. */
export const WHATS_NEW_ID = "redesign-2026-11";

/** True for someone who finished set-up before this version and hasn't seen this screen. */
export const whatsNewDue = S => !!S?.profile?.onboarded && S.profile.whatsNew !== WHATS_NEW_ID;

/** Record that it was seen (or isn't needed: a new user who has just finished set-up). */
export function markWhatsNewSeen(S) {
  if (S?.profile) S.profile.whatsNew = WHATS_NEW_ID;
}

// one small outline icon per line: Today's two parts, the calendar, Read, one-tap logging
const ICON = [
  '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2.5 12h2M19.5 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  '<path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5z"/><path d="M12 6.5v13"/>',
  '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
];

/** The screen's body (logo, title, the four lines). `logo` is the set-up logo markup. */
export function whatsNewBody(logo = "") {
  const rows = W.lines.map((t, i) => `<div class="ob-row"><span class="ob-ico"><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[i] || ICON[3]}</svg></span><span class="t"><b>${esc(t)}</b></span></div>`).join("");
  return `<div class="ob-readyhead">${logo}</div><header class="ob-head"><h1>${esc(W.title)}</h1><p class="ob-sub">${esc(W.lead)}</p></header>
  <div class="ob-card ob-list wn">${rows}</div>`;
}
