// Firestore security rules (firestore.rules), checked against the Firestore emulator.
// Run with `npm run test:rules`. In the normal `npm test` run there is no emulator,
// so this whole file is skipped.
import { describe, it, beforeAll, afterAll, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, serverTimestamp, query, where } from "firebase/firestore";

const emulator = process.env.FIRESTORE_EMULATOR_HOST;

describe.skipIf(!emulator)("firestore.rules", () => {
  let env;
  const alice = () => env.authenticatedContext("alice").firestore();
  const bob = () => env.authenticatedContext("bob").firestore();
  const anon = () => env.unauthenticatedContext().firestore();
  const main = { state: "{}", updatedAt: 1, savedAt: 1 };
  const year = { days: "{}", savedAt: 1 };

  beforeAll(async () => {
    const [host, port] = emulator.split(":");
    env = await initializeTestEnvironment({
      projectId: "demo-zad",
      firestore: { rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8"), host, port: Number(port) },
    });
  });
  afterAll(async () => { await env?.cleanup(); });

  // Seed Alice's data (rules bypassed) so reads have something to find
  beforeEach(async () => {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async ctx => {
      const db = ctx.firestore();
      await setDoc(doc(db, "users/alice"), main);
      await setDoc(doc(db, "users/alice/years/2026"), year);
      await setDoc(doc(db, "other/thing"), { x: 1 });
      await setDoc(doc(db, "hijriCommittees/chc-na"), { name: "CHC", editors: ["alice"] });
      await setDoc(doc(db, "hijriCommittees/chc-na/months/1448-05"), { startDate: "2026-10-12", updatedBy: "alice", updatedAt: 1, note: "" });
    });
  });

  describe("owner", () => {
    it("can read and write users/{uid}", async () => {
      await assertSucceeds(getDoc(doc(alice(), "users/alice")));
      await assertSucceeds(setDoc(doc(alice(), "users/alice"), { ...main, updatedAt: 2 }));
      await assertSucceeds(updateDoc(doc(alice(), "users/alice"), { updatedAt: 3 }));
    });
    it("can create users/{uid} the first time", async () => {
      await env.withSecurityRulesDisabled(ctx => deleteDoc(doc(ctx.firestore(), "users/alice")));
      await assertSucceeds(setDoc(doc(alice(), "users/alice"), main));
    });
    it("can read, list and write users/{uid}/years/{yyyy}", async () => {
      await assertSucceeds(getDoc(doc(alice(), "users/alice/years/2026")));
      await assertSucceeds(getDocs(collection(alice(), "users/alice/years")));
      await assertSucceeds(setDoc(doc(alice(), "users/alice/years/2027"), year));
    });
    it("can save tool progress (S.tools) inside the main state document", async () => {
      const state = JSON.stringify({ settings: {}, tools: { quran: { mushaf: "indopak15", pages: { indopak15: 42 } }, hizb: { weeks: {}, khatms: 1 } } });
      await assertSucceeds(setDoc(doc(alice(), "users/alice"), { ...main, state, updatedAt: 4 }));
      await assertFails(setDoc(doc(bob(), "users/alice"), { ...main, state, updatedAt: 5 }));
    });
    it("can delete their own documents", async () => {
      await assertSucceeds(deleteDoc(doc(alice(), "users/alice/years/2026")));
      await assertSucceeds(deleteDoc(doc(alice(), "users/alice")));
    });
  });

  describe("another signed-in user", () => {
    it("cannot read someone else's documents", async () => {
      await assertFails(getDoc(doc(bob(), "users/alice")));
      await assertFails(getDoc(doc(bob(), "users/alice/years/2026")));
      await assertFails(getDocs(collection(bob(), "users/alice/years")));
    });
    it("cannot write, overwrite or delete them", async () => {
      await assertFails(setDoc(doc(bob(), "users/alice"), main));
      await assertFails(updateDoc(doc(bob(), "users/alice"), { updatedAt: 9 }));
      await assertFails(setDoc(doc(bob(), "users/alice/years/2027"), year));
      await assertFails(deleteDoc(doc(bob(), "users/alice")));
      await assertFails(deleteDoc(doc(bob(), "users/alice/years/2026")));
    });
    it("cannot list all users", async () => {
      await assertFails(getDocs(collection(bob(), "users")));
    });
  });

  describe("signed out", () => {
    it("cannot read or write any user's data", async () => {
      await assertFails(getDoc(doc(anon(), "users/alice")));
      await assertFails(getDoc(doc(anon(), "users/alice/years/2026")));
      await assertFails(getDocs(collection(anon(), "users")));
      await assertFails(setDoc(doc(anon(), "users/alice"), main));
      await assertFails(setDoc(doc(anon(), "users/alice/years/2027"), year));
      await assertFails(setDoc(doc(anon(), "users/nobody"), main));
    });
  });

  describe("hijriCommittees", () => {
    const month = (uid, extra = {}) => ({ startDate: "2026-11-11", updatedBy: uid, updatedAt: serverTimestamp(), note: "sighted", ...extra });
    it("any signed-in user can read a committee and its months", async () => {
      await assertSucceeds(getDoc(doc(bob(), "hijriCommittees/chc-na")));
      await assertSucceeds(getDoc(doc(bob(), "hijriCommittees/chc-na/months/1448-05")));
      await assertSucceeds(getDocs(collection(bob(), "hijriCommittees/chc-na/months")));
    });
    it("signed-out users cannot read (they use the offline cache)", async () => {
      await assertFails(getDoc(doc(anon(), "hijriCommittees/chc-na")));
      await assertFails(getDocs(collection(anon(), "hijriCommittees/chc-na/months")));
    });
    it("an editor can add and change a month", async () => {
      await assertSucceeds(setDoc(doc(alice(), "hijriCommittees/chc-na/months/1448-06"), month("alice")));
      await assertSucceeds(setDoc(doc(alice(), "hijriCommittees/chc-na/months/1448-05"), month("alice", { startDate: "2026-10-13" })));
    });
    it("a non-editor cannot write a month", async () => {
      await assertFails(setDoc(doc(bob(), "hijriCommittees/chc-na/months/1448-06"), month("bob")));
      await assertFails(setDoc(doc(bob(), "hijriCommittees/chc-na/months/1448-05"), month("bob")));
      await assertFails(deleteDoc(doc(bob(), "hijriCommittees/chc-na/months/1448-05")));
    });
    it("signed-out users cannot write a month", async () => {
      await assertFails(setDoc(doc(anon(), "hijriCommittees/chc-na/months/1448-06"), month("alice")));
    });
    it("nobody can edit the committee document or its editors list from the app", async () => {
      await assertFails(setDoc(doc(alice(), "hijriCommittees/chc-na"), { name: "CHC", editors: ["alice", "bob"] }));
      await assertFails(setDoc(doc(bob(), "hijriCommittees/chc-na"), { name: "CHC", editors: ["bob"] }));
    });
    it("a committee with no editors list, or that does not exist, accepts no writes", async () => {
      await assertFails(setDoc(doc(alice(), "hijriCommittees/ghost/months/1448-06"), month("alice")));
    });
    it("rejects malformed months even from an editor", async () => {
      await assertFails(setDoc(doc(alice(), "hijriCommittees/chc-na/months/1448-13"), month("alice")));
      await assertFails(setDoc(doc(alice(), "hijriCommittees/chc-na/months/1448-06"), month("alice", { startDate: "tomorrow" })));
      await assertFails(setDoc(doc(alice(), "hijriCommittees/chc-na/months/1448-06"), month("alice", { updatedBy: "bob" })));
      await assertFails(setDoc(doc(alice(), "hijriCommittees/chc-na/months/1448-06"), month("alice", { extra: 1 })));
    });
  });

  describe("feedback", () => {
    const fb = (uid, extra = {}) => ({ type: "content", message: "The page number looks wrong.", itemId: "hadith:H45", itemTitle: "Hadith H45 · More pleased than the traveller",
      parts: ["source"], email: "a@b.co", appVersion: "2026.11.15", platform: "android", device: "Android 15 · Pixel 8", createdAt: serverTimestamp(), uid, ...extra });
    const seed = () => env.withSecurityRulesDisabled(async ctx => {
      await setDoc(doc(ctx.firestore(), "feedback/a1"), { type: "idea", message: "hi", createdAt: 1, uid: "alice" });
      await setDoc(doc(ctx.firestore(), "feedback/b1"), { type: "idea", message: "hi", createdAt: 1, uid: "bob" });
    });
    it("a signed-in user can send feedback as themselves, with or without the optional fields", async () => {
      await assertSucceeds(setDoc(doc(alice(), "feedback/n1"), fb("alice")));
      await assertSucceeds(setDoc(doc(alice(), "feedback/n2"), { type: "idea", message: "x", createdAt: serverTimestamp(), uid: "alice" }));
    });
    it("signed-out users cannot send (they use the email app)", async () => {
      await assertFails(setDoc(doc(anon(), "feedback/n1"), fb("alice")));
    });
    it("rejects another uid, unknown fields, bad types and oversized values", async () => {
      await assertFails(setDoc(doc(alice(), "feedback/n1"), fb("bob")));
      await assertFails(setDoc(doc(alice(), "feedback/n1"), fb("alice", { extra: 1 })));
      await assertFails(setDoc(doc(alice(), "feedback/n1"), fb("alice", { type: "spam" })));
      await assertFails(setDoc(doc(alice(), "feedback/n1"), fb("alice", { message: "" })));
      await assertFails(setDoc(doc(alice(), "feedback/n1"), fb("alice", { message: "x".repeat(2001) })));
      await assertFails(setDoc(doc(alice(), "feedback/n1"), fb("alice", { itemId: "H45" })));
      await assertFails(setDoc(doc(alice(), "feedback/n1"), fb("alice", { itemTitle: "x".repeat(161) })));
      await assertFails(setDoc(doc(alice(), "feedback/n1"), fb("alice", { parts: ["log"] })));
      await assertFails(setDoc(doc(alice(), "feedback/n1"), fb("alice", { platform: "windows" })));
      await assertFails(setDoc(doc(alice(), "feedback/n1"), fb("alice", { device: "x".repeat(81) })));
      await assertFails(setDoc(doc(alice(), "feedback/n1"), fb("alice", { createdAt: 5 })));
    });
    it("nobody can change feedback once sent", async () => {
      await seed();
      await assertFails(updateDoc(doc(alice(), "feedback/a1"), { message: "changed" }));
      await assertFails(setDoc(doc(alice(), "feedback/a1"), fb("alice")));
    });
    it("the sender can read and delete only their own (for Delete account)", async () => {
      await seed();
      await assertSucceeds(getDocs(query(collection(alice(), "feedback"), where("uid", "==", "alice"))));
      await assertFails(getDocs(collection(alice(), "feedback")));
      await assertFails(getDoc(doc(alice(), "feedback/b1")));
      await assertFails(deleteDoc(doc(alice(), "feedback/b1")));
      await assertFails(getDoc(doc(anon(), "feedback/a1")));
      await assertSucceeds(deleteDoc(doc(alice(), "feedback/a1")));
    });
  });

  describe("everything else", () => {
    it("is closed, even to signed-in users", async () => {
      await assertFails(getDoc(doc(alice(), "other/thing")));
      await assertFails(setDoc(doc(alice(), "other/new"), { x: 1 }));
      await assertFails(getDocs(collection(alice(), "other")));
      await assertFails(setDoc(doc(alice(), "alice/data"), { x: 1 }));
      await assertFails(getDoc(doc(anon(), "other/thing")));
    });
  });
});
