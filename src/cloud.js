/*
 * Cloud backup & sync (Android app and the web version): Google or Apple sign-in (after explicit consent), then the whole tracker is stored in the
 * user's own Firestore space:
 *   users/{uid}             everything except daily logs (profile, settings, amal list, qada)
 *   users/{uid}/years/{yyyy} that year's daily logs
 * Splitting by year keeps every document far below Firestore's 1 MB limit.
 * Sync = pull, merge (store.mergeStates), apply locally, push what changed.
 */
import { S, A, onCommit, applyState, render, commit } from "./app.js";
import * as store from "./store.js";
import { isNative } from "./platform.js";
import { firebaseConfig } from "./firebase-config.js";
import { currentHijri, calcParts, CALENDARS } from "./hijri.js";
import { storeCommittee, putMonth, monthId } from "./hijri-committees.js";
import { CONSENT } from "./strings.js";

/** Version (date) of the Terms of use and Privacy policy. Bump it when either changes; signed-in users are asked to agree again. */
export const TERMS_VERSION = "2026-11-15";
/** Version of the explicit consent to back up religious and health data (profile.dataConsent, privacy audit A1).
 *  Bump it when what is stored, or where, changes. */
export const DATA_CONSENT_VERSION = TERMS_VERSION;

// deletePending: uid whose account deletion started but didn't finish; sync stays paused for it so nothing is re-uploaded
// consentNeeded: signed in, but this phone has no current consent yet; nothing is uploaded until A.consentSheet's Continue
export const cloud = { available: false, user: null, syncing: false, lastSync: 0, error: "", deletePending: "", consentNeeded: false };

const META_KEY = "amal-cloud-meta";
const CONSENT_PENDING_KEY = "zad-consent-pending"; // agreed before a redirect sign-in (web), recorded once it returns
const APPLE = "apple.com";
const RELAY = /@privaterelay\.appleid\.com$/i; // "Hide my email" addresses from Sign in with Apple
let fb = null; // lazily loaded Firebase modules + instances
let pushed = {}; // hash of what was last written per document, to skip unchanged writes
let syncTimer = null; // debounced sync after a change
let signingIn = false; // consent is recorded by signIn itself
let consentAsked = false; // ask about updated terms at most once per app start
let reauthFirst = false; // the last deletion attempt needed a fresh sign-in

function loadMeta() { try { Object.assign(cloud, JSON.parse(localStorage.getItem(META_KEY) || "{}")); } catch (e) { /* none yet */ } }
function saveMeta() { try { localStorage.setItem(META_KEY, JSON.stringify({ lastSync: cloud.lastSync, deletePending: cloud.deletePending })); } catch (e) { /* ignore */ } }

/** True while this phone has no record of the current terms and data consent. */
export const needsAnyConsent = () => store.needsDataConsent(S.profile, DATA_CONSENT_VERSION) || store.needsConsent(S.profile, TERMS_VERSION);
/** Sync is paused while this user's account deletion is under way or unfinished, and while consent is missing. */
const paused = () => !cloud.user || cloud.deletePending === cloud.user.uid || needsAnyConsent();

/** The signed-in user as the app shows it. A private-relay address ("Hide my email") is shown as the Apple ID. */
export function userInfo(u, labelHidden = CONSENT.appleHidden) {
  const provider = (u.providerData || []).some(p => p?.providerId === APPLE) ? "apple" : "google";
  const relay = u.email ? RELAY.test(u.email) : provider === "apple";
  return { uid: u.uid, email: relay ? labelHidden : u.email || "", relay, provider };
}

async function firebase() {
  if (fb) return fb;
  const [{ initializeApp }, auth, fs] = await Promise.all([import("firebase/app"), import("firebase/auth"), import("firebase/firestore")]);
  const FirebaseAuthentication = isNative() ? (await import("@capacitor-firebase/authentication")).FirebaseAuthentication : null;
  const app = initializeApp(firebaseConfig);
  fb = {
    auth, fs, FirebaseAuthentication,
    // The browser needs the popup helper for Google sign-in; the Android app signs in natively instead
    a: auth.initializeAuth(app, isNative()
      ? { persistence: auth.indexedDBLocalPersistence }
      : { persistence: [auth.indexedDBLocalPersistence, auth.browserLocalPersistence], popupRedirectResolver: auth.browserPopupRedirectResolver }),
    db: fs.initializeFirestore(app, { experimentalAutoDetectLongPolling: true }),
  };
  return fb;
}

export async function initCloud() {
  if (!firebaseConfig.apiKey) return;
  cloud.available = true;
  loadMeta();
  const { auth, a } = await firebase();
  auth.onAuthStateChanged(a, u => {
    cloud.user = u ? userInfo(u) : null;
    cloud.consentNeeded = false;
    if (u && !signingIn) {
      // Consent first, upload after: a pending consent from a redirect sign-in (web) is recorded before the first
      // sync; without a current consent nothing is uploaded until the re-consent sheet's Continue.
      if (applyPendingConsent()) sync().then(() => { recordAllConsent(); });
      else if (needsAnyConsent()) askConsent();
      else sync();
    }
    render();
    if (u) refreshHijri();
  });
  onCommit(() => { if (cloud.user && !paused()) { clearTimeout(syncTimer); syncTimer = setTimeout(sync, 3000); } });
  window.addEventListener("online", () => { if (cloud.user) { sync(); refreshHijri(); } });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && cloud.user) sync(); });
}

/* ---------- consent ---------- */
/** Write both records (terms + explicit data consent) into the profile, without saving. */
function writeConsent(at = new Date().toISOString()) {
  S.profile.consent = { version: TERMS_VERSION, at };
  S.profile.dataConsent = { version: DATA_CONSENT_VERSION, at, scope: store.DATA_CONSENT_SCOPE };
}
/** Save that the user agreed to the current terms and to backing up their data (synced with the rest of the profile). */
export function recordAllConsent() {
  writeConsent();
  cloud.consentNeeded = false;
  commit();
}
/** Kept for older callers: agreeing now always records both. */
export const recordConsent = recordAllConsent;

/** Re-consent sheet answered with Continue (A.consentSheet): record, then start syncing. */
export function agreeConsent() {
  recordAllConsent();
  return sync();
}

function askConsent() {
  cloud.consentNeeded = true;
  clearTimeout(syncTimer);
  if (consentAsked) return;
  consentAsked = true;
  A.consentSheet?.();
}

/** After a redirect sign-in (web): the consent given before leaving the page. True if it was recorded. */
function applyPendingConsent() {
  let p = null;
  try { p = JSON.parse(sessionStorage.getItem(CONSENT_PENDING_KEY) || "null"); sessionStorage.removeItem(CONSENT_PENDING_KEY); } catch (e) { /* none */ }
  if (!p || p.terms !== TERMS_VERSION || p.data !== DATA_CONSENT_VERSION) return false;
  writeConsent(p.at);
  store.save(S);
  return true;
}

/* ---------- sign-in ---------- */
const POPUP_FALLBACK = ["auth/popup-blocked", "auth/operation-not-supported-in-this-environment", "auth/web-storage-unsupported"];

/** Web: the provider object for a popup or redirect sign-in. */
function webProvider(auth, provider) {
  if (provider === "apple") {
    const p = new auth.OAuthProvider(APPLE);
    p.addScope("email"); p.addScope("name"); // Apple sends the name on the very first sign-in only
    return p;
  }
  const p = new auth.GoogleAuthProvider();
  p.setCustomParameters({ prompt: "select_account" });
  return p;
}

/** Native: sign in with the plugin and return a Firebase credential for the JS SDK (skipNativeAuth), plus the
 *  plugin's result. `native` asks the plugin to also sign in its own (native) Firebase session, which iOS needs
 *  to revoke an Apple token. */
async function nativeCredential(provider, native = false) {
  const { auth, FirebaseAuthentication } = await firebase();
  if (provider === "apple") {
    const r = await FirebaseAuthentication.signInWithApple(native ? { skipNativeAuth: false } : undefined);
    const cred = new auth.OAuthProvider(APPLE).credential({ idToken: r.credential?.idToken, rawNonce: r.credential?.nonce });
    return { cred, r };
  }
  const r = await FirebaseAuthentication.signInWithGoogle();
  return { cred: auth.GoogleAuthProvider.credential(r.credential?.idToken), r };
}

/** First word of a name Apple (or Google) gave us; Apple only sends it on the first sign-in, so it's used once to
 *  fill an empty name and never asked for again. */
export const givenName = n => (typeof n === "string" ? n.trim().split(/\s+/)[0] || "" : "");

/**
 * Sign in with Google or Apple. `consent` must be true: the caller showed the consent block and the box is ticked.
 * The terms and data-consent records are written before the first sync, so they exist before anything is uploaded;
 * after the merge they are saved (and synced) again.
 */
export async function signIn({ provider = "google", consent = false } = {}) {
  if (consent !== true) throw Object.assign(new Error("consent required"), { code: "zad/consent-required" });
  const { auth, a, FirebaseAuthentication } = await firebase();
  signingIn = true;
  try {
    let name = "";
    if (FirebaseAuthentication) {
      const { cred, r } = await nativeCredential(provider);
      await auth.signInWithCredential(a, cred);
      name = r.user?.displayName || "";
    } else {
      let res;
      try { res = await auth.signInWithPopup(a, webProvider(auth, provider)); }
      catch (e) {
        // Popups can be blocked (or unsupported in a Home Screen app); fall back to a full-page redirect
        if (POPUP_FALLBACK.includes(e.code)) {
          try { sessionStorage.setItem(CONSENT_PENDING_KEY, JSON.stringify({ terms: TERMS_VERSION, data: DATA_CONSENT_VERSION, at: new Date().toISOString() })); } catch (e2) { /* asked again after the redirect */ }
          await auth.signInWithRedirect(a, webProvider(auth, provider));
          return;
        }
        throw e;
      }
      name = res?.user?.displayName || auth.getAdditionalUserInfo?.(res)?.profile?.name?.firstName || "";
    }
    if (a.currentUser) cloud.user = userInfo(a.currentUser);
    writeConsent(); // before the first push
    if (!S.profile.name && givenName(name)) S.profile.name = givenName(name);
    store.save(S);
    await sync();
    recordAllConsent(); // again after the merge, so the restored profile keeps it
  } finally {
    signingIn = false;
  }
}

export async function signOut() {
  const { auth, a, FirebaseAuthentication } = await firebase();
  clearTimeout(syncTimer);
  if (FirebaseAuthentication) await FirebaseAuthentication.signOut().catch(() => {});
  await auth.signOut(a);
  pushed = {};
  reauthFirst = false;
  cloud.deletePending = "";
  cloud.consentNeeded = false;
  consentAsked = false;
  saveMeta();
}

/* ---------- delete account ---------- */
/** Error from deleteAccount; `step` is "data" (cloud backup not fully deleted) or "auth" (backup deleted, sign-in not). */
export class DeleteError extends Error {
  constructor(step, cause) { super(cause?.message || step); this.step = step; this.code = cause?.code; this.cause = cause; }
}

/**
 * Permanently delete the user's cloud backup (users/{uid}/years/* and users/{uid}), the feedback they sent, and
 * their Firebase sign-in.
 * Data on this phone is left alone. Sync stays paused from the start until the deletion finishes or the user
 * signs out / keeps the account, so a pending sync can't upload the data again.
 */
export async function deleteAccount() {
  if (!cloud.user) throw new DeleteError("data", new Error("not signed in"));
  const { auth, fs, db, a, FirebaseAuthentication } = await firebase();
  const uid = cloud.user.uid;
  // On a retry after "requires recent login", confirm with Google first, while the tap still allows a popup
  let appleToken = "";
  if (reauthFirst && a.currentUser?.uid === uid) {
    try { appleToken = await reauthenticate(a.currentUser); reauthFirst = false; }
    catch (e) { throw new DeleteError("auth", e); } // only set once the backup is already deleted
  }
  // Sign in with Apple: confirm with Apple first (while the tap still allows a popup) to get a fresh token, so the
  // app's access to the Apple ID is revoked below (App Store guideline 5.1.1(v)). Nothing is deleted if cancelled.
  else if (isAppleUser(a.currentUser) && a.currentUser?.uid === uid) {
    try { appleToken = await reauthenticate(a.currentUser); }
    catch (e) { throw new DeleteError("confirm", e); }
  }
  clearTimeout(syncTimer);
  cloud.deletePending = uid;
  saveMeta();
  render();
  if (running) await running.catch(() => {}); // let an in-flight sync finish before deleting underneath it

  // Feedback this user sent (feedback/{id} with uid == theirs). Best effort: a failure here is logged and never
  // blocks deleting the account itself.
  try {
    const sent = await fs.getDocs(fs.query(fs.collection(db, "feedback"), fs.where("uid", "==", uid)));
    for (const d of sent.docs) await fs.deleteDoc(d.ref);
  } catch (e) { console.warn("delete feedback", e); }

  try {
    const years = await fs.getDocs(fs.collection(db, "users", uid, "years"));
    for (const d of years.docs) await fs.deleteDoc(d.ref);
    await fs.deleteDoc(fs.doc(db, "users", uid));
  } catch (e) { throw new DeleteError("data", e); }

  try {
    const user = a.currentUser;
    if (!user || user.uid !== uid) throw Object.assign(new Error("signed out"), { code: "auth/no-current-user" });
    if (appleToken) await revokeApple(appleToken).catch(e => console.warn("revoke apple", e)); // best effort
    try { await auth.deleteUser(user); }
    catch (e) {
      if (e.code !== "auth/requires-recent-login") throw e;
      // Firebase only deletes a sign-in that is recent: confirm with Google once more, then retry once
      reauthFirst = true;
      await reauthenticate(user);
      await auth.deleteUser(user);
    }
  } catch (e) { throw new DeleteError("auth", e); }
  reauthFirst = false;

  if (FirebaseAuthentication) await FirebaseAuthentication.signOut().catch(() => {});
  cloud.user = null;
  cloud.error = "";
  cloud.lastSync = 0;
  cloud.deletePending = "";
  pushed = {};
  saveMeta();
  render();
}

export const isAppleUser = user => !!user?.providerData?.some(p => p?.providerId === APPLE);

/** Confirm the sign-in again with the provider the user signed in with. For Apple it returns the token to revoke:
 *  the authorization code on iOS, the OAuth access token on Android and the web ("" if none came back). */
async function reauthenticate(user) {
  const { auth } = await firebase();
  const apple = isAppleUser(user);
  if (fb.FirebaseAuthentication) {
    // iOS revokes through the plugin's native session, so for Apple the plugin signs in natively too
    const { cred, r } = await nativeCredential(apple ? "apple" : "google", apple);
    await auth.reauthenticateWithCredential(user, cred);
    return apple ? r.credential?.authorizationCode || r.credential?.accessToken || "" : "";
  }
  const res = await auth.reauthenticateWithPopup(user, webProvider(auth, apple ? "apple" : "google"));
  return apple ? auth.OAuthProvider.credentialFromResult?.(res)?.accessToken || "" : "";
}

/** Revoke Sign in with Apple's token for Zad (the Apple ID's "Apps using Apple ID" list drops Zad). */
async function revokeApple(token) {
  const { auth, a, FirebaseAuthentication } = await firebase();
  if (FirebaseAuthentication) await FirebaseAuthentication.revokeAccessToken({ token });
  else await auth.revokeAccessToken(a, token);
}

/** Stop an unfinished deletion and keep the account: sync resumes and uploads this phone's data again. */
export function keepAccount() {
  cloud.deletePending = "";
  saveMeta();
  return sync();
}

/* ---------- feedback ---------- */
/** Send feedback (views/feedback.js) as feedback/{auto id}. Resolves once the server has it; while offline Firestore
 *  keeps it queued in memory and sends it when the connection is back (lost if the app is closed first). */
export async function sendFeedback(data) {
  if (!cloud.user) throw new Error("not signed in");
  const { fs, db } = await firebase();
  return fs.addDoc(fs.collection(db, "feedback"), { ...data, uid: cloud.user.uid, createdAt: fs.serverTimestamp() });
}

/* ---------- sync ---------- */
const hash = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };

let running = null;
export function sync() {
  if (paused()) return Promise.resolve();
  if (running) return running.then(() => sync());
  running = doSync().finally(() => { running = null; });
  return running;
}

async function doSync() {
  const { fs, db } = await firebase();
  if (paused()) return;
  const uid = cloud.user.uid;
  cloud.syncing = true; cloud.error = ""; render();
  try {
    // Pull
    const mainRef = fs.doc(db, "users", uid);
    const [mainSnap, yearsSnap] = await Promise.all([fs.getDoc(mainRef), fs.getDocs(fs.collection(db, "users", uid, "years"))]);
    let remote = null;
    if (mainSnap.exists()) {
      remote = JSON.parse(mainSnap.data().state);
      remote.days = {};
      yearsSnap.forEach(d => Object.assign(remote.days, JSON.parse(d.data().days)));
    }

    // Merge and apply locally (only if something actually changed)
    const merged = store.mergeStates(S, remote);
    if (JSON.stringify(merged) !== JSON.stringify(S)) applyState(merged);
    if (paused() || cloud.user.uid !== uid) return; // deletion started (or the user changed) meanwhile: write nothing

    // Push the main document and each year that changed
    const { days, ...rest } = S;
    const writes = [];
    const mainJson = JSON.stringify(rest);
    if (pushed.main !== hash(mainJson) || !remote) {
      writes.push(fs.setDoc(mainRef, { state: mainJson, updatedAt: S.updatedAt || 0, savedAt: fs.serverTimestamp() }).then(() => { pushed.main = hash(mainJson); }));
    }
    const byYear = {};
    for (const [k, v] of Object.entries(days)) (byYear[k.slice(0, 4)] ||= {})[k] = v;
    for (const [y, d] of Object.entries(byYear)) {
      const json = JSON.stringify(d);
      if (pushed[y] === hash(json)) continue;
      writes.push(fs.setDoc(fs.doc(db, "users", uid, "years", y), { days: json, savedAt: fs.serverTimestamp() }).then(() => { pushed[y] = hash(json); }));
    }
    await Promise.all(writes);
    cloud.lastSync = Date.now();
    saveMeta();
  } catch (e) {
    cloud.error = navigator.onLine ? "Couldn't sync. It will try again." : "Offline. Will sync when you're back online.";
    console.warn("sync", e);
  } finally {
    cloud.syncing = false;
    render();
  }
}

/* ---------- Hijri moon-sighting committees ----------
 *   hijriCommittees/{id}                   { name, editors: [uid] }   read by anyone signed in, written in the Firebase console only
 *   hijriCommittees/{id}/months/{YYYY-MM}  { startDate, updatedBy, updatedAt, note }   written by the committee's editors
 * Everything fetched is cached (hijri-committees.js) so the date works offline and when signed out. */
export const hijriEditors = {}; // committee id -> true when the signed-in user is one of its editors

/** Fetch a committee's months (and whether this user can edit them) and cache them. Quiet on failure: the cache stays. */
export async function refreshHijriCommittee(id) {
  if (!id || !cloud.user) return false;
  try {
    const { fs, db } = await firebase();
    const [top, months] = await Promise.all([fs.getDoc(fs.doc(db, "hijriCommittees", id)), fs.getDocs(fs.collection(db, "hijriCommittees", id, "months"))]);
    const calc = n => calcParts(n, CALENDARS.umalqura);
    storeCommittee(id, months.docs.map(d => { const v = d.data(); return { id: d.id, startDate: v.startDate, note: v.note, updatedAt: v.updatedAt?.toMillis?.() || 0 }; }), calc);
    hijriEditors[id] = !!(top.exists() && Array.isArray(top.data().editors) && top.data().editors.includes(cloud.user.uid));
    render();
    return true;
  } catch (e) { console.warn("hijri committee", e); return false; }
}
/** Refresh the committee the user follows (called after sign-in and when the phone comes back online). */
export function refreshHijri() {
  const h = currentHijri();
  return h.method === "committee" ? refreshHijriCommittee(h.committee) : Promise.resolve(false);
}
/** Editors only: set the Gregorian date of the 1st of a Hijri month. Throws if the rules refuse it or there is no network. */
export async function saveCommitteeMonth(id, hy, hm, startDate, note = "") {
  if (!cloud.user) throw new Error("not signed in");
  const { fs, db } = await firebase();
  await fs.setDoc(fs.doc(db, "hijriCommittees", id, "months", monthId(hy, hm)), { startDate, updatedBy: cloud.user.uid, updatedAt: fs.serverTimestamp(), note: String(note).slice(0, 200) });
  putMonth(id, hy, hm, startDate, n => calcParts(n, CALENDARS.umalqura), note);
  render();
}
