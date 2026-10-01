/*
 * Cloud backup & sync (Android app only): Google sign-in, then the whole tracker is stored in the
 * user's own Firestore space:
 *   users/{uid}             everything except daily logs (profile, settings, amal list, qada)
 *   users/{uid}/years/{yyyy} that year's daily logs
 * Splitting by year keeps every document far below Firestore's 1 MB limit.
 * Sync = pull, merge (store.mergeStates), apply locally, push what changed.
 */
import { S, onCommit, applyState, render } from "./app.js";
import * as store from "./store.js";
import { isNative } from "./platform.js";
import { firebaseConfig } from "./firebase-config.js";

export const cloud = { available: false, user: null, syncing: false, lastSync: 0, error: "" };

const META_KEY = "amal-cloud-meta";
let fb = null; // lazily loaded Firebase modules + instances
let pushed = {}; // hash of what was last written per document, to skip unchanged writes

function loadMeta() { try { Object.assign(cloud, JSON.parse(localStorage.getItem(META_KEY) || "{}")); } catch (e) { /* none yet */ } }
function saveMeta() { try { localStorage.setItem(META_KEY, JSON.stringify({ lastSync: cloud.lastSync })); } catch (e) { /* ignore */ } }

async function firebase() {
  if (fb) return fb;
  const [{ initializeApp }, auth, fs, { FirebaseAuthentication }] = await Promise.all([
    import("firebase/app"), import("firebase/auth"), import("firebase/firestore"), import("@capacitor-firebase/authentication"),
  ]);
  const app = initializeApp(firebaseConfig);
  fb = {
    auth, fs, FirebaseAuthentication,
    a: auth.initializeAuth(app, { persistence: auth.indexedDBLocalPersistence }),
    db: fs.initializeFirestore(app, { experimentalAutoDetectLongPolling: true }),
  };
  return fb;
}

export async function initCloud() {
  if (!isNative() || !firebaseConfig.apiKey) return;
  cloud.available = true;
  loadMeta();
  const { auth, a } = await firebase();
  auth.onAuthStateChanged(a, u => {
    cloud.user = u ? { uid: u.uid, email: u.email } : null;
    render();
    if (u) sync();
  });
  let t = null;
  onCommit(() => { if (cloud.user) { clearTimeout(t); t = setTimeout(sync, 3000); } });
  window.addEventListener("online", () => cloud.user && sync());
  document.addEventListener("visibilitychange", () => { if (!document.hidden && cloud.user) sync(); });
}

export async function signIn() {
  const { auth, a, FirebaseAuthentication } = await firebase();
  const r = await FirebaseAuthentication.signInWithGoogle();
  const cred = auth.GoogleAuthProvider.credential(r.credential?.idToken);
  await auth.signInWithCredential(a, cred);
  await sync();
}

export async function signOut() {
  const { auth, a, FirebaseAuthentication } = await firebase();
  await FirebaseAuthentication.signOut().catch(() => {});
  await auth.signOut(a);
  pushed = {};
}

const hash = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };

let running = null;
export function sync() {
  if (!cloud.user) return Promise.resolve();
  if (running) return running.then(() => sync());
  running = doSync().finally(() => { running = null; });
  return running;
}

async function doSync() {
  const { fs, db } = await firebase();
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
