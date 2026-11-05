// Account deletion and terms consent. Firebase is replaced with in-memory fakes, so nothing here touches a real project.
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as store from "../src/store.js";

const h = vi.hoisted(() => ({
  S: null, commits: 0, docs: new Map(), log: [], deleteUserErrors: [], reauthError: null, currentUser: null,
}));

vi.mock("../src/app.js", () => ({
  get S() { return h.S; },
  A: {},
  onCommit() {}, render() {}, applyState() {},
  commit() { h.commits++; },
}));
vi.mock("../src/platform.js", () => ({ isNative: () => false }));
vi.mock("../src/firebase-config.js", () => ({ firebaseConfig: { apiKey: "test" } }));
vi.mock("firebase/app", () => ({ initializeApp: () => ({}) }));
vi.mock("firebase/auth", () => {
  class GoogleAuthProvider { setCustomParameters() {} static credential() { return {}; } }
  return {
    GoogleAuthProvider,
    indexedDBLocalPersistence: {}, browserLocalPersistence: {}, browserPopupRedirectResolver: {},
    initializeAuth: () => ({ get currentUser() { return h.currentUser; } }),
    onAuthStateChanged() {},
    async deleteUser(u) {
      h.log.push("deleteUser " + u.uid);
      const e = h.deleteUserErrors.shift();
      if (e) throw Object.assign(new Error(e), { code: e });
    },
    async reauthenticateWithPopup(u) {
      h.log.push("reauth " + u.uid);
      if (h.reauthError) throw Object.assign(new Error(h.reauthError), { code: h.reauthError });
    },
    async signOut() { h.log.push("signOut"); },
  };
});
vi.mock("firebase/firestore", () => {
  const ref = (...parts) => ({ path: parts.slice(1).join("/") });
  return {
    initializeFirestore: () => ({}),
    doc: ref,
    collection: ref,
    async getDocs(c) {
      const docs = [...h.docs.keys()].filter(p => p.startsWith(c.path + "/") && !p.slice(c.path.length + 1).includes("/"))
        .map(p => ({ ref: { path: p }, data: () => h.docs.get(p) }));
      return { docs, forEach: f => docs.forEach(f) };
    },
    async getDoc(r) { return { exists: () => h.docs.has(r.path), data: () => h.docs.get(r.path) }; },
    async setDoc(r, v) { h.log.push("set " + r.path); h.docs.set(r.path, v); },
    async deleteDoc(r) { h.log.push("delete " + r.path); h.docs.delete(r.path); },
    serverTimestamp: () => 0,
  };
});

const cloudMod = await import("../src/cloud.js");
const { cloud, deleteAccount, sync, recordConsent, TERMS_VERSION, keepAccount } = cloudMod;

function signedIn(uid = "u1") {
  h.S = store.defaultState();
  h.S.profile.onboarded = true;
  h.docs = new Map([
    [`users/${uid}`, { state: JSON.stringify({ ...h.S, days: undefined }), updatedAt: 0 }],
    [`users/${uid}/years/2025`, { days: "{}" }],
    [`users/${uid}/years/2026`, { days: "{}" }],
    ["users/other", { state: "{}" }],
    ["users/other/years/2026", { days: "{}" }],
  ]);
  h.log = []; h.deleteUserErrors = []; h.reauthError = null; h.commits = 0;
  h.currentUser = { uid };
  cloud.user = { uid, email: "a@b.c" };
  cloud.deletePending = ""; cloud.lastSync = 123;
}

describe("terms consent", () => {
  it("TERMS_VERSION is a date string", () => {
    expect(TERMS_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("needsConsent: missing, older, current and newer versions", () => {
    expect(store.needsConsent({}, "2026-11-03")).toBe(true);
    expect(store.needsConsent(undefined, "2026-11-03")).toBe(true);
    expect(store.needsConsent({ consent: null }, "2026-11-03")).toBe(true);
    expect(store.needsConsent({ consent: { version: "2026-01-01", at: "x" } }, "2026-11-03")).toBe(true);
    expect(store.needsConsent({ consent: { version: "2026-11-03", at: "x" } }, "2026-11-03")).toBe(false);
    expect(store.needsConsent({ consent: { version: "2027-02-01", at: "x" } }, "2026-11-03")).toBe(false); // agreed on a newer app
    expect(store.needsConsent({ consent: { version: 5 } }, "2026-11-03")).toBe(true);
  });

  it("default state has consent null and normalize keeps or fills it", () => {
    expect(store.defaultState().profile.consent).toBeNull();
    const c = { version: "2026-11-03", at: "2026-11-03T10:00:00.000Z" };
    expect(store.normalize({ profile: { name: "A", onboarded: true, consent: c } }).profile.consent).toEqual(c);
    expect(store.normalize({ profile: { name: "A", onboarded: true } }).profile.consent).toBeNull();
    expect(store.load({ getItem: () => JSON.stringify({ profile: { consent: c } }) }).profile.consent).toEqual(c);
  });

  it("recordConsent saves the current version with a timestamp and commits", () => {
    h.S = store.defaultState(); h.commits = 0;
    recordConsent();
    expect(h.S.profile.consent.version).toBe(TERMS_VERSION);
    expect(new Date(h.S.profile.consent.at).toISOString()).toBe(h.S.profile.consent.at);
    expect(h.commits).toBe(1);
    expect(store.needsConsent(h.S.profile, TERMS_VERSION)).toBe(false);
  });

  it("the newer side's profile (with its consent) wins a merge", () => {
    const local = store.defaultState(); local.profile.onboarded = true; local.updatedAt = 2;
    local.profile.consent = { version: TERMS_VERSION, at: "t" };
    const remote = store.defaultState(); remote.profile.onboarded = true; remote.updatedAt = 1;
    expect(store.mergeStates(local, remote).profile.consent.version).toBe(TERMS_VERSION);
  });
});

describe("deleteAccount", () => {
  beforeEach(() => signedIn());

  it("deletes every year doc, then the main doc, then the sign-in, and resets cloud state", async () => {
    await deleteAccount();
    expect(h.log).toEqual(["delete users/u1/years/2025", "delete users/u1/years/2026", "delete users/u1", "deleteUser u1"]);
    expect([...h.docs.keys()]).toEqual(["users/other", "users/other/years/2026"]);
    expect(cloud.user).toBeNull();
    expect(cloud.lastSync).toBe(0);
    expect(cloud.deletePending).toBe("");
  });

  it("re-authenticates once when the sign-in is too old, then retries", async () => {
    h.deleteUserErrors = ["auth/requires-recent-login"];
    await deleteAccount();
    expect(h.log.slice(-3)).toEqual(["deleteUser u1", "reauth u1", "deleteUser u1"]);
    expect(cloud.user).toBeNull();
  });

  it("reports the auth step and keeps sync paused when the sign-in can't be deleted", async () => {
    h.deleteUserErrors = ["auth/requires-recent-login"];
    h.reauthError = "auth/popup-closed-by-user";
    const e = await deleteAccount().catch(x => x);
    expect(e.step).toBe("auth");
    expect(e.code).toBe("auth/popup-closed-by-user");
    expect(h.docs.has("users/u1")).toBe(false);
    expect(cloud.user).not.toBeNull();
    expect(cloud.deletePending).toBe("u1");

    // A sync now must not upload the data again
    h.log = [];
    await sync();
    expect(h.log).toEqual([]);
    expect(h.docs.has("users/u1")).toBe(false);

    // Retrying confirms with Google first, then finishes
    h.reauthError = null;
    await deleteAccount();
    expect(h.log[0]).toBe("reauth u1");
    expect(h.log.at(-1)).toBe("deleteUser u1");
    expect(cloud.user).toBeNull();
  });

  it("reports the data step when Firestore fails, and keeping the account resumes sync", async () => {
    const real = h.docs.delete.bind(h.docs);
    let n = 0;
    h.docs.delete = p => { if (++n === 2) throw new Error("unavailable"); return real(p); };
    const e = await deleteAccount().catch(x => x);
    h.docs.delete = real;
    expect(e.step).toBe("data");
    expect(h.log).not.toContain("deleteUser u1");
    expect(cloud.deletePending).toBe("u1");

    h.log = [];
    await keepAccount();
    expect(cloud.deletePending).toBe("");
    expect(h.log).toContain("set users/u1");
  });
});
