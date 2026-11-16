/* Explicit consent before cloud backup (privacy audit A1/A2, design-review/mockups2/consent c1-c3) and the
 * sign-in buttons (Google + Sign in with Apple) shared by Settings → Cloud backup and onboarding → Log in.
 *  - consentBlock / signInButtons: the "what is stored" block, the unticked box and the buttons, which stay
 *    disabled until the box is ticked (A.consentTick).
 *  - A.consentSheet (c3): signed-in users without a current consent (TERMS_VERSION / DATA_CONSENT_VERSION changed).
 *    Sync stays paused (cloud.js) until Continue. */
import { A, $, toast, openSheet, closeSheet } from "../app.js";
import { esc } from "../util.js";
import { isNative } from "../platform.js";
import { Capacitor } from "@capacitor/core";
import { cloud, signOut, agreeConsent } from "../cloud.js";
import { CONSENT as C, SETTINGS as T, SETUP_X } from "../strings.js";
import "../css/consent.css";

const SITE = "https://arahkhan99.github.io/amal-tracker/";
const page = p => (isNative() ? SITE + p : p);
const ext = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>';
export const GOOGLE_G = `<svg viewBox="0 0 24 24" class="gg" aria-hidden="true"><path fill="#4285F4" d="M22 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.6a4.8 4.8 0 0 1-2.1 3.1v2.6h3.4c2-1.8 3.1-4.5 3.1-7.5z"/><path fill="#34A853" d="M12 22.5c2.8 0 5.2-.9 6.9-2.5l-3.4-2.6c-.9.6-2.1 1-3.5 1a6.1 6.1 0 0 1-5.8-4.2H2.7v2.7A10.5 10.5 0 0 0 12 22.5z"/><path fill="#FBBC05" d="M6.2 14.2a6.2 6.2 0 0 1 0-4V7.5H2.7a10.5 10.5 0 0 0 0 9.4z"/><path fill="#EA4335" d="M12 5.9c1.5 0 2.9.5 4 1.6l3-3A10.5 10.5 0 0 0 2.7 7.5l3.5 2.7A6.2 6.2 0 0 1 12 5.9z"/></svg>`;
/** Apple logo glyph (Apple's Sign in with Apple guidelines: the logo, then "Sign in with Apple", one colour). */
export const APPLE_LOGO = '<svg viewBox="0 0 24 24" class="al" aria-hidden="true"><path d="M16.37 12.6c-.02-2.33 1.9-3.45 1.99-3.5-1.08-1.59-2.77-1.8-3.37-1.83-1.43-.15-2.8.85-3.53.85-.73 0-1.85-.83-3.04-.81-1.56.02-3.01.91-3.81 2.31-1.63 2.82-.42 6.99 1.17 9.28.78 1.12 1.7 2.38 2.91 2.33 1.17-.05 1.61-.75 3.02-.75 1.41 0 1.81.75 3.04.73 1.26-.02 2.05-1.14 2.82-2.27.89-1.3 1.25-2.56 1.27-2.63-.03-.01-2.44-.94-2.47-3.71zM14.06 5.75c.64-.78 1.08-1.87.96-2.95-.93.04-2.05.62-2.72 1.4-.6.69-1.12 1.8-.98 2.86 1.03.08 2.09-.53 2.74-1.31z"/></svg>';

/** Sign in with Apple is offered everywhere: natively on iOS, and through Firebase's Apple OAuth flow on Android
 *  and the web, so someone who started on an iPhone can restore their backup on any phone (docs/build/apple-sign-in.md). */
/** Off until Sign in with Apple is set up in the Apple Developer and Firebase consoles (docs/build/apple-sign-in.md);
 *  until then the button would only fail. Flip to true once that's done. */
export const APPLE_READY = false;
export const appleAvailable = () => APPLE_READY;
const appleFirst = () => Capacitor.getPlatform() === "ios";

const policyLink = cls => `<a class="${cls}" href="${page("privacy.html#sensitive")}" target="_blank" rel="noopener">${ext}${esc(C.policy)}</a>`;
export const termsLine = () => esc(C.terms).replace("{terms}", `<a href="${page("terms.html")}" target="_blank" rel="noopener">${esc(C.termsLink)}</a>`);

/** The unticked consent box. Ticking it enables every [data-consent] button (A.consentTick). */
const box = (id, cls) => `<label class="${cls}"><input type="checkbox" id="${id}" oninput="A.consentTick(this)" onchange="A.consentTick(this)"><span><b>${esc(C.agree)}</b></span></label>`;

/** Google and Apple buttons, disabled until the box is ticked. `fn` is called with "google" or "apple". */
export function signInButtons(fn, { onboarding = false } = {}) {
  const g = `<button class="btn ${onboarding ? "white" : "primary"} sib" data-consent disabled onclick="${fn}('google')">${GOOGLE_G}<span>${esc(onboarding ? SETUP_X.continueGoogle : T.signInGoogle)}</span></button>`;
  const a = appleAvailable() ? `<button class="btn apple sib" data-consent disabled onclick="${fn}('apple')">${APPLE_LOGO}<span>${esc(onboarding ? C.continueApple : C.signInApple)}</span></button>` : "";
  return appleFirst() ? a + g : g + a;
}

/** c1: Settings → Cloud backup, signed out. */
export function signInSheetHtml() {
  return `<div class="cs"><h3>${esc(T.cloud)}</h3><p>${esc(C.settingsLead)}</p>
  <div class="cs-box"><p class="cs-what">${C.what}</p>${policyLink("cs-pol")}</div>
  ${box("cloudOk", "chk")}
  <div class="cta col">${signInButtons("A.cloudSignIn")}</div>
  <p class="terms">${termsLine()}</p></div>`;
}

/** c2: the bottom of onboarding → Log in. */
export function loginBottomHtml() {
  return `<div class="ocs"><p>${C.what}</p>${policyLink("pol")}</div>
  ${box("obOk", "ochk")}
  <div class="ob-sib">${signInButtons("A.obRestore", { onboarding: true })}</div>
  <button class="btn ghost eq" onclick="A.obStart()">${esc(C.notNow)}</button>
  <p class="terms">${termsLine()}</p>`;
}

/** True when the consent box on screen (Settings sheet or onboarding) is ticked. */
export const consentTicked = () => !!($("#cloudOk")?.checked || $("#obOk")?.checked || $("#reOk")?.checked);

A.consentTick = el => {
  el.closest("label")?.classList.toggle("on", el.checked);
  const root = el.closest(".cs, .onb-inner") || document;
  for (const b of root.querySelectorAll("[data-consent]")) b.disabled = !el.checked;
};

/** A friendly message for a failed sign-in. */
export function signInError(e) {
  if (e?.code === "auth/account-exists-with-different-credential") return C.otherProvider;
  return T.signInFailed;
}

/* ---------- c3: re-consent for signed-in users ---------- */
A.consentSheet = () => {
  if (!cloud.user) return;
  openSheet(`<div class="cs"><h3>${esc(C.reTitle)}</h3>
  <p>${esc(C.reLead)}</p>
  <ul class="cs-chg">${C.reBullets.map(b => `<li>${esc(b)}</li>`).join("")}</ul>
  <div class="cs-box"><p class="cs-what">${C.reWhat(esc(cloud.user.email || ""))}</p>${policyLink("cs-pol")}</div>
  ${box("reOk", "chk")}
  <div class="cta col"><button class="btn primary" data-consent disabled onclick="A.consentAgree()">${esc(C.reContinue)}</button><button class="btn ghost" onclick="A.consentLater()">${esc(C.reSignOut)}</button></div>
  <p class="note c">${esc(C.reNote)}</p>
  <button class="cs-del" onclick="A.deleteSheet()">${esc(C.reDelete)}</button></div>`);
};
A.consentAgree = async () => {
  if (!$("#reOk")?.checked) { toast(C.tickFirst); return; }
  closeSheet();
  await agreeConsent();
  toast(cloud.error || C.reThanks);
};
A.consentLater = async () => { closeSheet(); await signOut().catch(() => {}); toast(T.signedOutToast); };

