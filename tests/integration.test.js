// Integration pass (8 Nov): cloud merge of tool progress, the new-install prayer-time method, and plurals.
import { describe, it, expect } from "vitest";
import * as store from "../src/store.js";
import { PROGRESS, plural, STR } from "../src/strings.js";

const state = (over = {}) => ({ ...store.defaultState(new Date(2026, 10, 8)), profile: { name: "A", onboarded: true }, ...over });

describe("mergeStates: tool progress (S.tools)", () => {
  it("keeps reading done on either phone", () => {
    const local = state({ updatedAt: 10, tools: {
      quran: { mushaf: "indopak15", pages: { indopak15: 40 }, read: { "2026-11-08": ["indopak15:39"] } },
      durud: { "2026-11-06": { read: [1, 2, 3] } },
      hizb: { weeks: { "2026-11-07": { read: { 1: 5 } } }, khatms: 2 },
    } });
    const remote = state({ updatedAt: 20, tools: {
      quran: { mushaf: "indopak15", pages: { indopak15: 55, madani15: 3 }, read: { "2026-11-08": ["indopak15:54"], "2026-11-07": ["madani15:3"] } },
      durud: { "2026-11-06": { read: [3, 4] } },
      hizb: { weeks: { "2026-11-07": { read: { 2: 9 } } }, khatms: 1 },
      adhkar: { "2026-11-08": { morning: { c: {}, done: 99 } } },
    } });
    const m = store.mergeStates(local, remote);
    expect(m.tools.quran.pages).toEqual({ indopak15: 55, madani15: 3 }); // remote saved last
    expect(m.tools.quran.read["2026-11-08"].sort()).toEqual(["indopak15:39", "indopak15:54"]);
    expect(m.tools.quran.read["2026-11-07"]).toEqual(["madani15:3"]);
    expect(m.tools.durud["2026-11-06"].read.sort()).toEqual([1, 2, 3, 4]);
    expect(m.tools.hizb.weeks["2026-11-07"].read).toEqual({ 1: 5, 2: 9 });
    expect(m.tools.hizb.khatms).toBe(2);
    expect(m.tools.adhkar["2026-11-08"].morning.done).toBe(99);
  });
  it("works when only one side has tools", () => {
    const local = state({ updatedAt: 30, tools: { quran: { pages: { indopak15: 7 } } } });
    expect(store.mergeStates(local, state({ updatedAt: 1 })).tools.quran.pages.indopak15).toBe(7);
    expect(store.mergeStates(state({ updatedAt: 1 }), local).tools.quran.pages.indopak15).toBe(7);
  });
});

describe("strings", () => {
  it("pluralises counts", () => {
    expect(plural(1, "prayer")).toBe("1 prayer");
    expect(plural(2, "prayer")).toBe("2 prayers");
    expect(plural(1200, "prayer")).toBe("1,200 prayers");
    expect(PROGRESS.madeUpCap(1)).toMatch(/^1 prayer was made up/);
    expect(PROGRESS.madeUpCap(3)).toMatch(/^3 prayers were made up/);
  });
  it("holds the screen labels that used to live in the views", () => {
    for (const g of ["HOME_X", "PROGRESS_L", "MAKEUPS_X", "SETUP_X", "SETTINGS_X"]) expect(typeof STR[g]).toBe("object");
    expect(STR.HOME_X.celebSub(1)).toBe("1 day in a row");
  });
});

describe("prayer-time method", () => {
  it("is Karachi for new installs only", () => {
    expect(store.defaultState().settings.method).toBe("Karachi");
    expect(store.normalize({ profile: { onboarded: true }, settings: { method: "MuslimWorldLeague" } }).settings.method).toBe("MuslimWorldLeague");
  });
});
