// Regression (19 Nov 2026): "I unticked Evening adhkār and it keeps coming back as done."
// The readers keep "done" as a stamp in S.tools, and the cloud merge (store.mergeTools) joins both copies' maps, so a
// stamp deleted on this phone came straight back from the cloud copy on the next sync (3 s after the untick, or on
// resume). Clearing a stamp now leaves a note (S.tools.cleared) that the merge honours.
import { describe, it, expect } from "vitest";
import * as store from "../src/store.js";
import { timesFor } from "../src/times.js";
import { dkey } from "../src/util.js";
import { setReadDone, isReadDone, readItems } from "../src/reading.js";
import { readsByDay } from "../src/points.js";

const TUE = new Date(2026, 10, 17), FRI = new Date(2026, 10, 20);
const fresh = (day = TUE) => { const S = store.defaultState(day); S.profile.onboarded = true; S.createdKey = dkey(new Date(2026, 10, 1)); return S; };
const at = (S, day, p, min = 20) => new Date(+timesFor(day, S.settings)[p] + min * 60000);
const copy = o => JSON.parse(JSON.stringify(o));
/** One sync round as cloud.js does it: pull the cloud copy, merge, apply; the merged state is what gets pushed. */
const sync = (S, cloud) => store.mergeStates(S, cloud);

// [item, day, when] — every Read item, at a time it is on For today
const ITEMS = [["morning", TUE, "Dhuhr"], ["evening", TUE, "Asr"], ["hizb", TUE, "Asr"], ["quran", TUE, "Asr"],
  ["manzil", TUE, "Asr"], ["mulk", TUE, "Isha"], ["kahf", FRI, "Asr"], ["durud", FRI, "Asr"]];

describe("an untick stays unticked after a cloud sync", () => {
  for (const [id, day, p] of ITEMS) {
    it(`${id}: tick, sync, untick, sync → still not done (and the cloud copy agrees)`, () => {
      const S = fresh(day), now = at(S, day, p);
      expect(readItems(S, now).some(i => i.id === id)).toBe(true);
      setReadDone(S, id, true, now); S.updatedAt = 1000;
      const cloud = copy(S); // pushed
      expect(isReadDone(S, id, now)).toBe(true);
      setReadDone(S, id, false, now); S.updatedAt = 2000;
      expect(isReadDone(S, id, now)).toBe(false);
      const merged = sync(S, cloud);
      expect(isReadDone(merged, id, now)).toBe(false);
      // the other way round too: a phone that still has the tick takes the untick from the cloud
      expect(isReadDone(store.mergeStates(cloud, copy(merged)), id, now)).toBe(false);
      expect(isReadDone(store.mergeStates(copy(cloud), copy(S)), id, now)).toBe(false);
    });
    it(`${id}: tick again after the untick → done, and it survives the sync`, () => {
      const S = fresh(day), now = at(S, day, p);
      setReadDone(S, id, true, now); S.updatedAt = 1000;
      const cloud = copy(S);
      setReadDone(S, id, false, now);
      const cloud2 = copy(sync(S, cloud)); // the untick reached the cloud
      setReadDone(S, id, true, now); S.updatedAt = 3000; // ticked again (NOW() can lag the real clock a little)
      expect(isReadDone(sync(S, cloud2), id, now)).toBe(true);
    });
  }

  it("the Provisions count (readsByDay) also drops an unticked reading after the sync", () => {
    const S = fresh(), now = at(S, TUE, "Isha");
    setReadDone(S, "mulk", true, now);
    const cloud = copy(S);
    setReadDone(S, "mulk", false, now);
    expect(readsByDay(sync(S, cloud))[dkey(TUE)] || []).not.toContain("mulk");
  });

  it("a tick made on the other phone after this phone's untick is kept", () => {
    const S = fresh(), now = at(S, TUE, "Asr");
    setReadDone(S, "evening", true, now);
    const cloud = copy(S);
    setReadDone(S, "evening", false, now);
    // the other phone (not synced yet) finishes the evening adhkār later
    const later = Date.now() + 60000;
    cloud.tools.adhkar[dkey(TUE)].evening.done = later; cloud.updatedAt = later;
    expect(sync(S, cloud).tools.adhkar[dkey(TUE)].evening.done).toBe(later);
  });

  it("a tick never synced anywhere else is unaffected (no notes are written for a tick)", () => {
    const S = fresh(), now = at(S, TUE, "Asr");
    setReadDone(S, "evening", true, now);
    expect(S.tools.cleared).toBeUndefined();
    expect(isReadDone(sync(S, fresh()), "evening", now)).toBe(true);
  });
});

describe("store.restoreTools (the Undo of a Read tick)", () => {
  it("Undo of a tick stays undone after a sync", () => {
    const S = fresh(), now = at(S, TUE, "Asr");
    const snap = copy(S.tools || {});
    setReadDone(S, "evening", true, now);
    const cloud = copy(S); // the tick synced before Undo was tapped
    store.restoreTools(S, snap);
    store.setAmal(S, dkey(TUE), "evening", false); // read.js restores the day too
    expect(isReadDone(S, "evening", now)).toBe(false);
    expect(isReadDone(sync(S, cloud), "evening", now)).toBe(false);
  });
  it("Undo of an untick brings the tick back, also over a clear that already synced", () => {
    const S = fresh(), now = at(S, TUE, "Asr");
    setReadDone(S, "evening", true, now);
    const snap = copy(S.tools), day = copy(S.days[dkey(TUE)]);
    setReadDone(S, "evening", false, now);
    const cloud = copy(S); // the untick (and its note) synced
    store.restoreTools(S, snap); S.days[dkey(TUE)] = day; day.u = Date.now() + 1;
    expect(isReadDone(S, "evening", now)).toBe(true);
    expect(isReadDone(sync(S, cloud), "evening", now)).toBe(true);
  });
});

describe("store.mergeTools notes", () => {
  it("keeps the later note per stamp and forgets expired ones", () => {
    const now = Date.now();
    const a = { cleared: { "read/2026-11-17/mulk": now - 10, "manzil/2026-11-17/evening": now - store.CLEARED_MS - 5 } };
    const b = { cleared: { "read/2026-11-17/mulk": -(now - 5) }, read: { "2026-11-17": { mulk: now - 100 } } };
    const m = store.mergeTools(a, b);
    expect(m.cleared).toEqual({ "read/2026-11-17/mulk": -(now - 5) });
    expect(m.read["2026-11-17"].mulk).toBe(now - 100); // the clear was undone later
  });
  it("clearToolStamp removes the stamp and notes it", () => {
    const S = fresh();
    S.tools = { manzil: { "2026-11-17": { evening: 5 } } };
    expect(store.clearToolStamp(S, "manzil/2026-11-17/evening")).toBe(5);
    expect(S.tools.manzil["2026-11-17"]).toEqual({});
    expect(S.tools.cleared["manzil/2026-11-17/evening"]).toBeGreaterThan(5);
  });
});
