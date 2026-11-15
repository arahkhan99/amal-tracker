/*
 * Cloud backup & sync (Android app and the web version): Google sign-in, then the whole tracker is stored in the
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

/** Version (date) of the Terms of use and Privacy policy. Bump it when either changes; signed-in users are asked to agree again. */
export const TERMS_VERSION = "2026-11-03";

// deletePending: uid whose account deletion started but didn't finish; sync stays paused for it so nothing is re-uploaded
export const cloud = { available: false, user: null, syncing: false, lastSync: 0, error: "", deletePending: "" };

const META_KEY = "amal-cloud-meta";
const CONSENT_PENDING_KEY = "zad-consent-pending"; // agreed before a redirect sign-in (web), recorded once it returns
let fb = null; // lazily loaded Firebase modules + instances
let pushed = {}; // hash of what was last written per document, to skip unchanged writes
let syncTimer = null; // debounced sync after a change
let signingIn = false; // consent is recorded by signIn itself
let consentAsked = false; // ask about updated terms at most once per app start
let reauthFirst = false; // the last deletion attempt needed a fresh Google sign-in

function loadMeta() { try { Object.assign(cloud, JSON.parse(localStorage.getItem(META_KEY) || "{}")); } catch (e) { /* none yet */ } }
function saveMeta() { try { localStorage.setItem(META_KEY, JSON.stringify({ lastSync: cloud.lastSync, deletePending: cloud.deletePending })); } catch (e) { /* ignore */ } }

/** Sync is paused while this user's account deletion is under way or unfinished. */
const paused = () => !cloud.user || cloud.deletePending === cloud.user.uid;

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
    cloud.user = u ? { uid: u.uid, email: u.email } : null;
    render();
    if (u) sync().then(checkConsent);
    if (u) refreshHijri();
  });
  onCommit(() => { if (cloud.user) { clearTimeout(syncTimer); syncTimer = setTimeout(sync, 3000); } });
  window.addEventListener("online", () => { if (cloud.user) { sync(); refreshHijri(); } });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && cloud.user) sync(); });
}

/* ---------- terms consent ---------- */
/** Save that the user agreed to the current terms (synced with the rest of the profile). */
export function recordConsent() {
  S.profile.consent = { version: TERMS_VERSION, at: new Date().toISOString() };
  commit();
}

function checkConsent() {
  if (!cloud.user || signingIn) return;
  let pending = null;
  try { pending = sessionStorage.getItem(CONSENT_PENDING_KEY); sessionStorage.removeItem(CONSENT_PENDING_KEY); } catch (e) { /* none */ }
  if (pending === TERMS_VERSION) { recordConsent(); return; }
  if (consentAsked || !store.needsConsent(S.profile, TERMS_VERSION)) return;
  consentAsked = true;
  A.consentSheet?.();
}

/* ---------- sign-in ---------- */
/** Sign in with Google. The caller has shown the "By signing in you agree…" line, so consent is recorded on success. */
export async function signIn() {
  const { auth, a, FirebaseAuthentication } = await firebase();
  signingIn = true;
  try {
    if (FirebaseAuthentication) {
      const r = await FirebaseAuthentication.signInWithGoogle();
      await auth.signInWithCredential(a, auth.GoogleAuthProvider.credential(r.credential?.idToken));
    } else {
      const provider = new auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      try { await auth.signInWithPopup(a, provider); }
      catch (e) {
        // Popups can be blocked (or unsupported in a Home Screen app); fall back to a full-page redirect
        if (["auth/popup-blocked", "auth/operation-not-supported-in-this-environment", "auth/web-storage-unsupported"].includes(e.code)) {
          try { sessionStorage.setItem(CONSENT_PENDING_KEY, TERMS_VERSION); } catch (e2) { /* asked again after the redirect */ }
          await auth.signInWithRedirect(a, provider);
          return;
        }
        throw e;
      }
    }
    await sync();
    recordConsent(); // after the merge, so the restored profile keeps it
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
  saveMeta();
}

/* ---------- delete account ---------- */
/** Error from deleteAccount; `step` is "data" (cloud backup not fully deleted) or "auth" (backup deleted, sign-in not). */
export class DeleteError extends Error {
  constructor(step, cause) { super(cause?.message || step); this.step = step; this.code = cause?.code; this.cause = cause; }
}

/**
 * Permanently delete the user's cloud backup (users/{uid}/years/* and users/{uid}) and their Firebase sign-in.
 * Data on this phone is left alone. Sync stays paused from the start until the deletion finishes or the user
 * signs out / keeps the account, so a pending sync can't upload the data again.
 */
export async function deleteAccount() {
  if (!cloud.user) throw new DeleteError("data", new Error("not signed in"));
  const { auth, fs, db, a, FirebaseAuthentication } = await firebase();
  const uid = cloud.user.uid;
  // On a retry after "requires recent login", confirm with Google first, while the tap still allows a popup
  if (reauthFirst && a.currentUser?.uid === uid) {
    try { await reauthenticate(a.currentUser); reauthFirst = false; }
    catch (e) { throw new DeleteError("auth", e); } // only set once the backup is already deleted
  }
  clearTimeout(syncTimer);
  cloud.deletePending = uid;
  saveMeta();
  render();
  if (running) await running.catch(() => {}); // let an in-flight sync finish before deleting underneath it

  try {
    const years = await fs.getDocs(fs.collection(db, "users", uid, "years"));
    for (const d of years.docs) await fs.deleteDoc(d.ref);
    await fs.deleteDoc(fs.doc(db, "users", uid));
  } catch (e) { throw new DeleteError("data", e); }

  try {
    const user = a.currentUser;
    if (!user || user.uid !== uid) throw Object.assign(new Error("signed out"), { code: "auth/no-current-user" });
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

async function reauthenticate(user) {
  const { auth, FirebaseAuthentication } = await firebase();
  if (FirebaseAuthentication) {
    const r = await FirebaseAuthentication.signInWithGoogle();
    await auth.reauthenticateWithCredential(user, auth.GoogleAuthProvider.credential(r.credential?.idToken));
  } else {
    const provider = new auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await auth.reauthenticateWithPopup(user, provider);
  }
}

/** Stop an unfinished deletion and keep the account: sync resumes and uploads this phone's data again. */
export function keepAccount() {
  cloud.deletePending = "";
  saveMeta();
  return sync();
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
