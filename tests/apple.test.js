// Sign in with Apple on native (iOS / Android) through @capacitor-firebase/authentication, with skipNativeAuth:
// the plugin returns Apple's ID token + raw nonce and the Firebase JS SDK signs in with an apple.com OAuth credential.
// Everything is an in-memory fake.
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as store from "../src/store.js";

const h = vi.hoisted(() => ({ S: null, log: [], docs: new Map(), currentUser: null, plugin: null }));

vi.mock("../src/app.js", () => ({
  get S() { return h.S; }, A: {}, onCommit() {}, render() {}, commit() {},
  applyState(next) { for (const k of Object.keys(h.S)) delete h.S[k]; Object.assign(h.S, next); },
}));
vi.mock("../src/platform.js", () => ({ isNative: () => true }));
vi.mock("../src/firebase-config.js", () => ({ firebaseConfig: { apiKey: "test" } }));
vi.mock("firebase/app", () => ({ initializeApp: () => ({}) }));
vi.mock("@capacitor-firebase/authentication", () => {
  h.plugin = {
    signInWithApple: vi.fn(async opts => {
      h.log.push("plugin apple" + (opts?.skipNativeAuth === false ? " native" : ""));
      return { user: { displayName: "Yusuf Ali" }, credential: { providerId: "apple.com", idToken: "apple-id-token", nonce: "raw-nonce", authorizationCode: "auth-code" } };
    }),
    signInWithGoogle: vi.fn(async () => { h.log.push("plugin google"); return { credential: { idToken: "g-token" } }; }),
    revokeAccessToken: vi.fn(async ({ token }) => { h.log.push("plugin revoke " + token); }),
    signOut: vi.fn(async () => {}),
  };
  return { FirebaseAuthentication: h.plugin };
});
vi.mock("firebase/auth", () => {
  class GoogleAuthProvider { static credential(t) { return { providerId: "google.com", idToken: t }; } }
  class OAuthProvider { constructor(id) { this.providerId = id; } credential(o) { return { providerId: this.providerId, ...o }; } }
  return {
    GoogleAuthProvider, OAuthProvider, indexedDBLocalPersistence: {},
    initializeAuth: () => ({ get currentUser() { return h.currentUser; } }),
    onAuthStateChanged() {},
    async signInWithCredential(a, cred) {
      h.log.push("js signIn " + JSON.stringify(cred));
      h.currentUser = { uid: "ios1", email: "q@privaterelay.appleid.com", providerData: [{ providerId: cred.providerId }] };
    },
    async reauthenticateWithCredential(u, cred) { h.log.push("js reauth " + cred.providerId); },
    async deleteUser(u) { h.log.push("deleteUser " + u.uid); },
    async signOut() {},
  };
});
vi.mock("firebase/firestore", () => {
  const ref = (...parts) => ({ path: parts.slice(1).join("/") });
  return {
    initializeFirestore: () => ({}), doc: ref, collection: ref, query: c => c, where: () => ({}),
    async getDocs(c) { const docs = [...h.docs.keys()].filter(p => p.startsWith(c.path + "/") && !p.slice(c.path.length + 1).includes("/")).map(p => ({ ref: { path: p }, data: () => h.docs.get(p) })); return { docs, forEach: f => docs.forEach(f) }; },
    async getDoc(r) { return { exists: () => h.docs.has(r.path), data: () => h.docs.get(r.path) }; },
    async setDoc(r, v) { h.log.push("set " + r.path); h.docs.set(r.path, v); },
    async deleteDoc(r) { h.log.push("delete " + r.path); h.docs.delete(r.path); },
    serverTimestamp: () => 0,
  };
});

const { signIn, deleteAccount, cloud, DATA_CONSENT_VERSION } = await import("../src/cloud.js");

beforeEach(() => {
  h.S = store.defaultState(); h.S.profile.onboarded = true;
  h.log = []; h.docs = new Map(); h.currentUser = null; cloud.user = null; cloud.deletePending = "";
  if (h.plugin) Object.values(h.plugin).forEach(f => f.mockClear());
});

describe("Sign in with Apple (native plugin)", () => {
  it("passes Apple's ID token and raw nonce to an apple.com OAuth credential, then records consent before uploading", async () => {
    await signIn({ provider: "apple", consent: true });
    expect(h.plugin.signInWithApple).toHaveBeenCalledTimes(1);
    expect(h.plugin.signInWithGoogle).not.toHaveBeenCalled();
    expect(h.log[1]).toBe('js signIn {"providerId":"apple.com","idToken":"apple-id-token","rawNonce":"raw-nonce"}');
    expect(h.log.slice(2)).toContain("set users/ios1");
    expect(JSON.parse(h.docs.get("users/ios1").state).profile.dataConsent.version).toBe(DATA_CONSENT_VERSION);
    expect(h.S.profile.name).toBe("Yusuf"); // Apple sends the name on the first sign-in only
    expect(cloud.user).toMatchObject({ provider: "apple", relay: true });
  });

  it("keeps an existing name", async () => {
    h.S.profile.name = "Abu Bakr";
    await signIn({ provider: "apple", consent: true });
    expect(h.S.profile.name).toBe("Abu Bakr");
  });

  it("Google still uses the Google flow", async () => {
    await signIn({ provider: "google", consent: true });
    expect(h.log[0]).toBe("plugin google");
    expect(h.log[1]).toContain('"providerId":"google.com"');
  });

  it("refuses without consent before opening Apple's sheet", async () => {
    await expect(signIn({ provider: "apple" })).rejects.toThrow("consent required");
    expect(h.log).toEqual([]);
  });

  it("deleting the account re-confirms with Apple (native session) and revokes the authorization code", async () => {
    await signIn({ provider: "apple", consent: true });
    h.log = [];
    await deleteAccount();
    expect(h.log[0]).toBe("plugin apple native");
    expect(h.log[1]).toBe("js reauth apple.com");
    expect(h.log.slice(-2)).toEqual(["plugin revoke auth-code", "deleteUser ios1"]);
    expect(h.plugin.signOut).toHaveBeenCalled();
  });

  it("if the Apple confirmation fails (e.g. cancelled), the account is still deleted, without revoking", async () => {
    await signIn({ provider: "apple", consent: true });
    h.log = [];
    h.plugin.signInWithApple.mockRejectedValueOnce(Object.assign(new Error("The user canceled the sign-in flow."), { code: "1001" }));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await deleteAccount();
    warn.mockRestore();
    expect(h.log.some(l => l.includes("revoke"))).toBe(false);
    expect(h.log.at(-1)).toBe("deleteUser ios1");
    expect(h.docs.has("users/ios1")).toBe(false);
    expect(cloud.user).toBeNull();
  });
});
