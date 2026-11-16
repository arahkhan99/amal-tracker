// Account deletion and terms consent. Firebase is replaced with in-memory fakes, so nothing here touches a real project.
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as store from "../src/store.js";

const h = vi.hoisted(() => ({
  S: null, commits: 0, docs: new Map(), log: [], deleteUserErrors: [], reauthError: null, currentUser: null,
  authCb: null, commitHooks: [], A: {}, popupUser: null, popupError: null, session: new Map(),
}));

vi.mock("../src/app.js", () => ({
  get S() { return h.S; },
  get A() { return h.A; },
  onCommit(f) { h.commitHooks.push(f); }, render() {},
  applyState(next) { for (const k of Object.keys(h.S)) delete h.S[k]; Object.assign(h.S, next); },
  commit() { h.commits++; h.S.updatedAt = Date.now(); for (const f of h.commitHooks) f(); },
}));
vi.mock("../src/platform.js", () => ({ isNative: () => false }));
vi.mock("../src/firebase-config.js", () => ({ firebaseConfig: { apiKey: "test" } }));
vi.mock("firebase/app", () => ({ initializeApp: () => ({}) }));
vi.mock("firebase/auth", () => {
  class GoogleAuthProvider { constructor() { this.providerId = "google.com"; } setCustomParameters() {} static credential() { return {}; } }
  class OAuthProvider {
    constructor(id) { this.providerId = id; this.scopes = []; }
    addScope(x) { this.scopes.push(x); }
    credential(o) { return { providerId: this.providerId, ...o }; }
    static credentialFromResult(r) { return r?._cred || null; }
  }
  return {
    GoogleAuthProvider, OAuthProvider,
    async signInWithPopup(a, provider) {
      h.log.push("popup " + provider.providerId);
      if (h.popupError) throw Object.assign(new Error(h.popupError), { code: h.popupError });
      h.currentUser = h.popupUser;
      h.authCb?.(h.currentUser);
      return { user: h.popupUser, _cred: { accessToken: "apple-at" } };
    },
    async signInWithRedirect(a, provider) { h.log.push("redirect " + provider.providerId); },
    getAdditionalUserInfo: () => null,
    async revokeAccessToken(a, token) { h.log.push("revoke " + token); },
    indexedDBLocalPersistence: {}, browserLocalPersistence: {}, browserPopupRedirectResolver: {},
    initializeAuth: () => ({ get currentUser() { return h.currentUser; } }),
    onAuthStateChanged(a, cb) { h.authCb = cb; },
    async deleteUser(u) {
      h.log.push("deleteUser " + u.uid);
      const e = h.deleteUserErrors.shift();
      if (e) throw Object.assign(new Error(e), { code: e });
    },
    async reauthenticateWithPopup(u, provider) {
      h.log.push("reauth " + u.uid + (provider?.providerId === "apple.com" ? " apple" : ""));
      if (h.reauthError) throw Object.assign(new Error(h.reauthError), { code: h.reauthError });
      return { user: u, _cred: { accessToken: "apple-at" } };
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
    query: (c, w) => ({ ...c, w }),
    where: (field, op, value) => ({ field, op, value }),
    async getDocs(c) {
      if (c.path === "feedback" && h.feedbackError) throw new Error(h.feedbackError);
      const docs = [...h.docs.keys()].filter(p => p.startsWith(c.path + "/") && !p.slice(c.path.length + 1).includes("/"))
        .filter(p => !c.w || h.docs.get(p)?.[c.w.field] === c.w.value)
        .map(p => ({ ref: { path: p }, data: () => h.docs.get(p) }));
      return { docs, forEach: f => docs.forEach(f) };
    },
    async getDoc(r) { return { exists: () => h.docs.has(r.path), data: () => h.docs.get(r.path) }; },
    async setDoc(r, v) { h.log.push("set " + r.path); h.docs.set(r.path, v); },
    async deleteDoc(r) { h.log.push("delete " + r.path); h.docs.delete(r.path); },
    serverTimestamp: () => 0,
  };
});

// cloud.js touches window/document/sessionStorage in initCloud and the redirect path
globalThis.window ??= { addEventListener() {} };
globalThis.document ??= { addEventListener() {}, hidden: false };
globalThis.sessionStorage = { getItem: k => h.session.get(k) ?? null, setItem: (k, v) => h.session.set(k, String(v)), removeItem: k => h.session.delete(k) };

const cloudMod = await import("../src/cloud.js");
const { cloud, deleteAccount, sync, recordConsent, TERMS_VERSION, DATA_CONSENT_VERSION, keepAccount, signIn, agreeConsent, initCloud, needsAnyConsent, userInfo } = cloudMod;
const consented = () => ({ consent: { version: TERMS_VERSION, at: "2026-11-15T09:00:00.000Z" }, dataConsent: { version: DATA_CONSENT_VERSION, at: "2026-11-15T09:00:00.000Z", scope: "cloud-backup-sensitive" } });

function signedIn(uid = "u1") {
  h.S = store.defaultState();
  h.S.profile.onboarded = true;
  Object.assign(h.S.profile, consented());
  h.docs = new Map([
    [`users/${uid}`, { state: JSON.stringify({ ...h.S, days: undefined }), updatedAt: 0 }],
    [`users/${uid}/years/2025`, { days: "{}" }],
    [`users/${uid}/years/2026`, { days: "{}" }],
    ["users/other", { state: "{}" }],
    ["users/other/years/2026", { days: "{}" }],
  ]);
  h.log = []; h.deleteUserErrors = []; h.reauthError = null; h.commits = 0; h.feedbackError = null;
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

  it("also deletes the feedback this user sent (and only theirs), before the backup", async () => {
    h.docs.set("feedback/f1", { uid: "u1", message: "a" });
    h.docs.set("feedback/f2", { uid: "other", message: "b" });
    h.docs.set("feedback/f3", { uid: "u1", message: "c" });
    await deleteAccount();
    expect(h.log).toEqual(["delete feedback/f1", "delete feedback/f3", "delete users/u1/years/2025", "delete users/u1/years/2026", "delete users/u1", "deleteUser u1"]);
    expect([...h.docs.keys()]).toEqual(["users/other", "users/other/years/2026", "feedback/f2"]);
  });

  it("still deletes the account when deleting feedback fails", async () => {
    h.feedbackError = "permission-denied";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await deleteAccount();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
    expect(h.log).toEqual(["delete users/u1/years/2025", "delete users/u1/years/2026", "delete users/u1", "deleteUser u1"]);
    expect(cloud.user).toBeNull();
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

describe("explicit consent before any upload (privacy audit A1/A2)", () => {
  const fresh = (uid = "u9") => {
    h.S = store.defaultState(); h.S.profile.onboarded = true; h.S.profile.name = "";
    h.docs = new Map(); h.log = []; h.commits = 0; h.session = new Map(); h.popupError = null;
    h.popupUser = { uid, email: "x@y.z", providerData: [{ providerId: "google.com" }] };
    h.currentUser = null; cloud.user = null; cloud.deletePending = ""; cloud.consentNeeded = false;
  };

  it("TERMS_VERSION is 2026-11-15, so consent given for 2026-11-03 is asked again", () => {
    expect(TERMS_VERSION).toBe("2026-11-15");
    expect(DATA_CONSENT_VERSION >= TERMS_VERSION).toBe(true);
    h.S = store.defaultState();
    h.S.profile.consent = { version: "2026-11-03", at: "x" };
    expect(needsAnyConsent()).toBe(true);
    Object.assign(h.S.profile, consented());
    expect(needsAnyConsent()).toBe(false);
  });

  it("needsDataConsent: missing, wrong scope, older and current", () => {
    expect(store.defaultState().profile.dataConsent).toBeNull();
    expect(store.needsDataConsent({}, "2026-11-15")).toBe(true);
    expect(store.needsDataConsent({ dataConsent: { version: "2026-11-15", at: "t" } }, "2026-11-15")).toBe(true); // no scope
    expect(store.needsDataConsent({ dataConsent: { version: "2026-11-03", at: "t", scope: "cloud-backup-sensitive" } }, "2026-11-15")).toBe(true);
    expect(store.needsDataConsent({ dataConsent: { version: "2026-11-15", at: "t", scope: "cloud-backup-sensitive" } }, "2026-11-15")).toBe(false);
  });

  it("signIn refuses without consent and uploads nothing", async () => {
    fresh();
    const e = await signIn({ provider: "google" }).catch(x => x);
    expect(e.code).toBe("zad/consent-required");
    expect(h.log).toEqual([]);
  });

  it("signIn records both consents before the first push, and the uploaded profile carries them", async () => {
    fresh();
    await signIn({ provider: "google", consent: true });
    const firstSet = h.log.findIndex(l => l.startsWith("set "));
    expect(firstSet).toBeGreaterThan(-1);
    const main = JSON.parse(h.docs.get("users/u9").state);
    expect(main.profile.consent.version).toBe(TERMS_VERSION);
    expect(main.profile.dataConsent).toMatchObject({ version: DATA_CONSENT_VERSION, scope: "cloud-backup-sensitive" });
    expect(needsAnyConsent()).toBe(false);
  });

  it("a restored (older) cloud profile without consent does not remove the consent just given", async () => {
    fresh();
    const old = store.defaultState(); old.profile.onboarded = true; old.profile.name = "Raheem"; old.updatedAt = Date.now() + 1e6;
    h.S.profile.onboarded = false; // a new phone restoring its backup
    h.docs.set("users/u9", { state: JSON.stringify({ ...old, days: undefined }), updatedAt: old.updatedAt });
    await signIn({ provider: "google", consent: true });
    expect(h.S.profile.name).toBe("Raheem");
    expect(store.needsDataConsent(h.S.profile, DATA_CONSENT_VERSION)).toBe(false);
    expect(JSON.parse(h.docs.get("users/u9").state).profile.dataConsent.version).toBe(DATA_CONSENT_VERSION);
  });

  it("mergeStates keeps the newest consent from either side", () => {
    const local = store.defaultState(); local.profile.onboarded = true; local.updatedAt = 1;
    local.profile.dataConsent = { version: "2026-11-15", at: "b", scope: "cloud-backup-sensitive" };
    const remote = store.defaultState(); remote.profile.onboarded = true; remote.updatedAt = 2; // newer, but no consent
    expect(store.mergeStates(local, remote).profile.dataConsent.version).toBe("2026-11-15");
    remote.profile.dataConsent = { version: "2027-01-01", at: "c", scope: "cloud-backup-sensitive" };
    expect(store.mergeStates(local, remote).profile.dataConsent.version).toBe("2027-01-01");
  });

  it("with an existing session and no current consent: no sync at start, nor after edits, until Continue", async () => {
    fresh("u7");
    h.S.profile.consent = { version: "2026-11-03", at: "old" }; // agreed to the old terms only
    h.A = { consentSheet: vi.fn() };
    vi.useFakeTimers();
    try {
      await initCloud();
      h.authCb({ uid: "u7", email: "a@b.c", providerData: [{ providerId: "google.com" }] });
      expect(cloud.consentNeeded).toBe(true);
      expect(h.A.consentSheet).toHaveBeenCalledTimes(1);
      // an edit meanwhile must not schedule an upload
      h.S.profile.name = "edited"; (await import("../src/app.js")).commit();
      await vi.advanceTimersByTimeAsync(5000);
      await sync();
      expect(h.log.filter(l => l.startsWith("set "))).toEqual([]);
      // Continue on the re-consent sheet
      vi.useRealTimers();
      await agreeConsent();
      expect(cloud.consentNeeded).toBe(false);
      expect(h.log).toContain("set users/u7");
      expect(JSON.parse(h.docs.get("users/u7").state).profile.dataConsent.version).toBe(DATA_CONSENT_VERSION);
    } finally { vi.useRealTimers(); h.commitHooks.length = 0; h.A = {}; }
  });

  it("redirect sign-in (web): the consent saved before leaving is recorded before the first sync", async () => {
    fresh("u8");
    h.popupError = "auth/popup-blocked";
    await signIn({ provider: "apple", consent: true });
    expect(h.log).toEqual(["popup apple.com", "redirect apple.com"]);
    expect(JSON.parse(h.session.get("zad-consent-pending"))).toMatchObject({ terms: TERMS_VERSION, data: DATA_CONSENT_VERSION });
    // the page comes back signed in
    h.A = { consentSheet: vi.fn() };
    await initCloud();
    h.authCb({ uid: "u8", email: "r@privaterelay.appleid.com", providerData: [{ providerId: "apple.com" }] });
    await new Promise(r => setTimeout(r, 0)); await sync();
    expect(h.A.consentSheet).not.toHaveBeenCalled();
    expect(JSON.parse(h.docs.get("users/u8").state).profile.dataConsent.version).toBe(DATA_CONSENT_VERSION);
    expect(h.session.has("zad-consent-pending")).toBe(false);
    h.commitHooks.length = 0; h.A = {};
  });
});

describe("Sign in with Apple on the web (Firebase OAuth provider apple.com)", () => {
  it("signs in with the apple.com provider, uses the name Apple gives once, and hides relay emails", async () => {
    h.S = store.defaultState(); h.S.profile.onboarded = true; h.S.profile.name = "";
    h.docs = new Map(); h.log = []; h.session = new Map(); h.popupError = null; cloud.user = null;
    h.popupUser = { uid: "ap1", email: "abc@privaterelay.appleid.com", displayName: "Aisha Khan", providerData: [{ providerId: "apple.com" }] };
    await signIn({ provider: "apple", consent: true });
    expect(h.log[0]).toBe("popup apple.com");
    expect(h.S.profile.name).toBe("Aisha");
    expect(cloud.user).toMatchObject({ uid: "ap1", relay: true, provider: "apple" });
    expect(cloud.user.email).not.toContain("privaterelay");
    // a second sign-in without a name keeps the one saved
    expect(userInfo({ uid: "g", email: "a@gmail.com", providerData: [{ providerId: "google.com" }] })).toMatchObject({ email: "a@gmail.com", relay: false, provider: "google" });
  });

  it("account deletion confirms with Apple first and revokes the token before deleting the sign-in", async () => {
    signedIn("ap2");
    h.currentUser = { uid: "ap2", providerData: [{ providerId: "apple.com" }] };
    await deleteAccount();
    expect(h.log[0]).toBe("reauth ap2 apple");
    expect(h.log.slice(-2)).toEqual(["revoke apple-at", "deleteUser ap2"]);
  });

  it("if the Apple confirmation is cancelled nothing is deleted", async () => {
    signedIn("ap3");
    h.currentUser = { uid: "ap3", providerData: [{ providerId: "apple.com" }] };
    h.reauthError = "auth/popup-closed-by-user";
    const e = await deleteAccount().catch(x => x);
    expect(e.step).toBe("confirm");
    expect(h.log).toEqual(["reauth ap3 apple"]);
    expect(h.docs.has("users/ap3")).toBe(true);
    expect(cloud.deletePending).toBe("");
  });
});
