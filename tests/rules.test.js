// Firestore security rules (firestore.rules), checked against the Firestore emulator.
// Run with `npm run test:rules`. In the normal `npm test` run there is no emulator,
// so this whole file is skipped.
import { describe, it, beforeAll, afterAll, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs } from "firebase/firestore";

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
