// The pending-log queue (src/pending.js): one-tap logs from widgets, notification buttons, the tile and the
// ongoing notification, merged into the app with the same rules as a manual log.
import { describe, it, expect, afterEach } from "vitest";
import * as store from "../src/store.js";
import { timesFor } from "../src/times.js";
import { applyPendingLogs, mergePendingLogs, applyEntriesNow, validEntry, makeEntry, loadSeen, SEEN_MS } from "../src/pending.js";

const DAY = new Date(2026, 10, 5); // Thu 5 Nov 2026 (Chicago, the test TZ)
const KEY = "2026-11-05";
const fresh = () => {
  const S = store.defaultState(DAY);
  S.createdKey = "2026-11-01";
  S.profile.onboarded = true;
  S.settings.location = { lat: 41.88, lng: -87.63, label: "Chicago", source: "city" };
  return S;
};
const T = (S, d = DAY) => timesFor(d, S.settings);
let n = 0;
const entry = (o) => ({ id: `e${++n}`, date: KEY, prayer: "Asr", status: "ontime", src: "widget", ...o });
const memStorage = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };

describe("validEntry / makeEntry", () => {
  it("accepts the shared format and refuses anything else", () => {
    expect(validEntry({ id: "a", date: KEY, prayer: "Asr", status: "ontime", at: 1, src: "tile" })).toBe(true);
    expect(validEntry({ id: "a", date: KEY, prayer: "Sunrise", status: "ontime", at: 1 })).toBe(false);
    expect(validEntry({ id: "a", date: KEY, prayer: "Asr", status: "missed", at: 1 })).toBe(false);
    expect(validEntry({ id: "a", date: "5/11/2026", prayer: "Asr", status: "ontime", at: 1 })).toBe(false);
    expect(validEntry({ date: KEY, prayer: "Asr", status: "ontime", at: 1 })).toBe(false);
  });
  it("makes entries with a fresh id", () => {
    const a = makeEntry(KEY, "Asr", "ontime", "notif", 5), b = makeEntry(KEY, "Asr", "ontime", "notif", 5);
    expect(a).toMatchObject({ date: KEY, prayer: "Asr", status: "ontime", src: "notif", at: 5 });
    expect(a.id).not.toBe(b.id);
    expect(validEntry(a)).toBe(true);
  });
});

describe("applyPendingLogs", () => {
  it("logs a tap like a manual log: status, time of the log and day.first", () => {
    const S = fresh(), at = +T(S).Asr + 10 * 60000;
    const r = applyPendingLogs(S, [entry({ at, status: "congregation" })]);
    expect(r.changed).toBe(true);
    expect(S.days[KEY].prayers.Asr).toBe("congregation");
    expect(S.days[KEY].at.Asr).toBe(at);
    expect(S.days[KEY].first).toBe(at);
    expect(r.processed).toHaveLength(1);
  });

  it("keeps an earlier day.first", () => {
    const S = fresh(), t = T(S);
    store.setPrayer(S, KEY, "Fajr", "ontime", new Date(+t.Fajr + 60000));
    const first = S.days[KEY].first;
    applyPendingLogs(S, [entry({ at: +t.Asr + 60000 })]);
    expect(S.days[KEY].first).toBe(first);
  });

  it("applies each id once: duplicates in one queue and across merges", () => {
    const S = fresh(), at = +T(S).Asr + 60000;
    const e = entry({ at });
    const r1 = applyPendingLogs(S, [e, { ...e }]);
    expect(r1.applied).toEqual([e.id]);
    expect(r1.processed).toEqual([e.id]);
    // An undo, then the same log again (the queue failed to clear): the log must not come back
    const u = entry({ status: "undo", at: at + 1000 });
    const r2 = applyPendingLogs(S, [e, u], { seen: r1.seen });
    expect(S.days[KEY].prayers.Asr).toBeUndefined();
    const r3 = applyPendingLogs(S, [e], { seen: r2.seen });
    expect(r3.changed).toBe(false);
    expect(r3.processed).toEqual([e.id]);
    expect(S.days[KEY].prayers.Asr).toBeUndefined();
  });

  it("forgets merged ids after a few days", () => {
    const S = fresh(), at = +T(S).Asr + 60000, e = entry({ at });
    const r1 = applyPendingLogs(S, [e], { now: new Date(at) });
    const r2 = applyPendingLogs(S, [], { seen: r1.seen, now: new Date(at + SEEN_MS + 1) });
    expect(r2.seen).toEqual([]);
  });

  it("leaves a log already there: the same status is a no-op, a later in-app change wins", () => {
    const S = fresh(), t = T(S), tap = +t.Asr + 5 * 60000;
    store.setPrayer(S, KEY, "Asr", "ontime", new Date(tap - 60000));
    const r = applyPendingLogs(S, [entry({ at: tap })]);
    expect(r.changed).toBe(false);
    expect(r.applied).toHaveLength(1);
    expect(S.days[KEY].at.Asr).toBe(tap - 60000);

    // Logged "congregation" in the app after the widget's "on time" tap: the app's log stays
    const S2 = fresh();
    store.setPrayer(S2, KEY, "Asr", "congregation", new Date(tap + 60000));
    const r2 = applyPendingLogs(S2, [entry({ at: tap, status: "ontime" })]);
    expect(S2.days[KEY].prayers.Asr).toBe("congregation");
    expect(r2.refused[0].reason).toBe("newer");
    expect(r2.processed).toHaveLength(1); // still cleared from the queue

    // An in-app log made before the tap is replaced, as a manual change would
    const S3 = fresh();
    store.setPrayer(S3, KEY, "Asr", "ontime", new Date(tap - 60000));
    applyPendingLogs(S3, [entry({ at: tap, status: "congregation" })]);
    expect(S3.days[KEY].prayers.Asr).toBe("congregation");
  });

  it("refuses a log made before the prayer began", () => {
    const S = fresh(), t = T(S);
    const r = applyPendingLogs(S, [entry({ at: +t.Asr - 60000 })]);
    expect(r.changed).toBe(false);
    expect(r.refused).toEqual([{ id: r.processed[0], reason: "notStarted" }]);
    expect(S.days[KEY]).toBeUndefined();
    // A future day's prayer is refused too
    const r2 = applyPendingLogs(S, [entry({ date: "2026-11-06", prayer: "Fajr", at: +t.Isha + 60000 })]);
    expect(r2.refused[0].reason).toBe("notStarted");
  });

  it("undo puts back what was there before the log", () => {
    const S = fresh(), t = T(S), at = +t.Asr + 60000;
    const r1 = applyPendingLogs(S, [entry({ at }), entry({ status: "undo", at: at + 5000 })]);
    expect(r1.changed).toBe(true);
    expect(S.days[KEY].prayers.Asr).toBeUndefined();
    expect(S.days[KEY].first).toBeUndefined(); // the log that stamped it is gone
    expect(S.days[KEY].at?.Asr).toBeUndefined();
  });

  it("undo of a log merged in an earlier session (the widget still shows Undo)", () => {
    const S = fresh(), t = T(S), at = +t.Asr + 60000;
    const r1 = applyPendingLogs(S, [entry({ at, status: "congregation" })]);
    expect(S.days[KEY].prayers.Asr).toBe("congregation");
    applyPendingLogs(S, [entry({ status: "undo", at: at + 60000 })], { seen: r1.seen });
    expect(S.days[KEY].prayers.Asr).toBeUndefined();
  });

  it("undo restores an earlier status and its time, and leaves an in-app change alone", () => {
    const S = fresh(), t = T(S), tap = +t.Asr + 10 * 60000;
    store.setPrayer(S, KEY, "Asr", "ontime", new Date(tap - 60000));
    applyPendingLogs(S, [entry({ at: tap, status: "congregation" }), entry({ status: "undo", at: tap + 1000 })]);
    expect(S.days[KEY].prayers.Asr).toBe("ontime");
    expect(S.days[KEY].at.Asr).toBe(tap - 60000);

    const S2 = fresh();
    const r = applyPendingLogs(S2, [entry({ at: tap })]);
    store.setPrayer(S2, KEY, "Asr", "missed", new Date(tap + 60000)); // changed in the app
    applyPendingLogs(S2, [entry({ status: "undo", at: tap + 120000 })], { seen: r.seen });
    expect(S2.days[KEY].prayers.Asr).toBe("missed");
  });

  it("undo with nothing to undo does nothing", () => {
    const S = fresh();
    const r = applyPendingLogs(S, [entry({ status: "undo", at: +T(S).Asr + 60000 })]);
    expect(r.changed).toBe(false);
    expect(r.refused[0].reason).toBe("nothing");
  });

  it("applies in time order, whatever the queue order", () => {
    const S = fresh(), at = +T(S).Asr + 60000;
    applyPendingLogs(S, [entry({ status: "undo", at: at + 2000 }), entry({ at: at + 1000, status: "congregation" }), entry({ at })]);
    // on time, then congregation, then undo (back to on time)
    expect(S.days[KEY].prayers.Asr).toBe("ontime");
  });

  it("day change: an entry keeps its own date (ʿIshāʾ tapped after midnight, a tap merged days later)", () => {
    const S = fresh(), t = T(S);
    const afterMidnight = +new Date(2026, 10, 6, 0, 30);
    applyPendingLogs(S, [entry({ prayer: "Isha", at: afterMidnight })]);
    expect(S.days[KEY].prayers.Isha).toBe("ontime");
    expect(S.days["2026-11-06"]).toBeUndefined();
    // Merged three days later
    const S2 = fresh();
    applyPendingLogs(S2, [entry({ prayer: "Maghrib", at: +t.Maghrib + 60000 })], { now: new Date(2026, 10, 8, 9, 0) });
    expect(S2.days[KEY].prayers.Maghrib).toBe("ontime");
  });

  it("a tap on a day before the tracked range extends it", () => {
    const S = fresh();
    S.createdKey = "2026-11-05";
    const d = new Date(2026, 10, 4), key = "2026-11-04";
    applyPendingLogs(S, [entry({ date: key, prayer: "Isha", at: +timesFor(d, S.settings).Isha + 60000 })]);
    expect(S.createdKey).toBe(key);
  });

  describe("time-zone change", () => {
    const was = process.env.TZ;
    afterEach(() => { process.env.TZ = was; });
    it("uses the entry's date and the moment of the tap, not the phone's new zone", () => {
      const S = fresh(), t = T(S), at = +t.Asr + 60000; // tapped in Chicago
      process.env.TZ = "Asia/Tokyo"; // then flew to Tokyo (already 6 Nov there)
      const r = applyPendingLogs(S, [entry({ at })]);
      expect(r.changed).toBe(true);
      expect(S.days[KEY].prayers.Asr).toBe("ontime");
      expect(S.days["2026-11-06"]).toBeUndefined();
      // A tap before ʿAsr began is still refused in the new zone
      const r2 = applyPendingLogs(fresh(), [entry({ at: +t.Asr - 60000 })]);
      expect(r2.refused[0].reason).toBe("notStarted");
    });
  });

  it("remembrance: only on an excused prayer that has begun, and undoable", () => {
    const S = fresh(), t = T(S), at = +t.Asr + 60000;
    // Not an excused day: refused
    expect(applyPendingLogs(S, [entry({ status: "remember", at })]).refused[0].reason).toBe("notExcused");
    store.setExcusedDay(S, KEY, true, DAY);
    // Before ʿAsr: refused
    expect(applyPendingLogs(S, [entry({ status: "remember", at: +t.Asr - 60000 })]).refused[0].reason).toBe("notStarted");
    const r = applyPendingLogs(S, [entry({ status: "remember", at })]);
    expect(r.changed).toBe(true);
    expect(store.remembered(S.days[KEY], "Asr")).toBe(true);
    expect(S.days[KEY].first).toBe(at);
    expect(S.days[KEY].prayers.Asr).toBeUndefined(); // never logged as a prayer
    applyPendingLogs(S, [entry({ status: "undo", at: at + 1000 })], { seen: r.seen });
    expect(store.remembered(S.days[KEY], "Asr")).toBe(false);
    expect(S.days[KEY].first).toBeUndefined();
  });

  it("refuses malformed entries but still clears them", () => {
    const S = fresh();
    const r = applyPendingLogs(S, [{ id: "bad", date: KEY, prayer: "Asr", status: "ontime" }, null, "x"]);
    expect(r.processed).toEqual(["bad"]);
    expect(r.refused[0].reason).toBe("invalid");
  });
});

describe("mergePendingLogs", () => {
  const plugin = logs => {
    const p = { logs: logs.slice(), cleared: [], getPending: async () => ({ logs: p.logs }), clearPending: async ({ ids }) => { p.cleared.push(...ids); p.logs = p.logs.filter(e => !ids.includes(e.id)); } };
    return p;
  };
  it("reads the queue, applies it, commits, refreshes the widgets, then clears what it handled", async () => {
    const S = fresh(), t = T(S), storage = memStorage(), order = [];
    const good = entry({ at: +t.Asr + 60000 }), early = entry({ prayer: "Maghrib", at: +t.Maghrib - 60000 });
    const pl = plugin([good, early]);
    const commit = () => order.push("commit"), refresh = async () => order.push("refresh");
    const origClear = pl.clearPending;
    pl.clearPending = async a => { order.push("clear"); return origClear(a); };
    const r = await mergePendingLogs(S, { plugin: pl, commit, refresh, storage });
    expect(S.days[KEY].prayers.Asr).toBe("ontime");
    expect(S.days[KEY].prayers.Maghrib).toBeUndefined();
    expect(order).toEqual(["commit", "refresh", "clear"]);
    expect(pl.cleared.sort()).toEqual([good.id, early.id].sort());
    expect(pl.logs).toEqual([]);
    expect(loadSeen(storage).map(x => x.id)).toContain(good.id);
    expect(r.applied).toEqual([good.id]);
  });
  it("does nothing before set-up or with an empty queue", async () => {
    const S = fresh(); S.profile.onboarded = false;
    let commits = 0;
    const pl = plugin([entry({ at: +T(S).Asr + 60000 })]);
    expect(await mergePendingLogs(S, { plugin: pl, commit: () => commits++, refresh: async () => {}, storage: memStorage() })).toBe(null);
    expect(pl.logs).toHaveLength(1);
    S.profile.onboarded = true;
    const r = await mergePendingLogs(S, { plugin: plugin([]), commit: () => commits++, refresh: async () => {}, storage: memStorage() });
    expect(r.changed).toBe(false);
    expect(commits).toBe(0);
  });
  it("is a no-op on the web (no plugin)", async () => {
    expect(await mergePendingLogs(fresh(), { storage: memStorage() })).toBe(null);
  });
});

describe("applyEntriesNow (notification buttons)", () => {
  it("applies an entry made in the app with the same rules", async () => {
    const S = fresh(), storage = memStorage();
    let commits = 0;
    const e = makeEntry(KEY, "Asr", "congregation", "notif", +T(S).Asr + 60000);
    await applyEntriesNow(S, [e], { commit: () => commits++, refresh: async () => {}, storage });
    expect(S.days[KEY].prayers.Asr).toBe("congregation");
    expect(commits).toBe(1);
    // The same entry again (the notification tapped twice) changes nothing
    await applyEntriesNow(S, [e], { commit: () => commits++, refresh: async () => {}, storage });
    expect(commits).toBe(1);
  });
});
