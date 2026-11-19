// Setup "Can you read Arabic?", the Home tour steps and the one-time tips' seen flags (src/guide.js).
import { describe, it, expect } from "vitest";
import * as store from "../src/store.js";
import * as F from "../src/features.js";
import * as G from "../src/guide.js";
import { GUIDE } from "../src/strings.js";

const NOW = new Date(2026, 10, 14, 15, 0);
const fresh = () => { const S = store.defaultState(NOW); S.profile.onboarded = true; return S; };
const ids = (S, env) => G.tourSteps(S, env).map(s => s.id);

describe("reading answer → tool prefs", () => {
  it("Yes turns transliteration and meaning off; A little and Not yet turn both on", () => {
    expect(G.readingPrefs("yes")).toEqual({ translit: false, translation: false });
    expect(G.readingPrefs("little")).toEqual({ translit: true, translation: true });
    expect(G.readingPrefs("notyet")).toEqual(G.readingPrefs("little"));
  });
  it("applyReading sets S.tools.prefs and keeps the other prefs", () => {
    const S = fresh();
    expect(G.applyReading(S, "notyet")).toBe(true);
    expect(S.settings.reading).toBe("notyet");
    expect(S.tools.prefs).toEqual({ translit: true, translation: true, size: 1, evWords: true });
    S.tools.prefs.size = 3;
    G.applyReading(S, "yes");
    expect(S.tools.prefs).toMatchObject({ translit: false, translation: false, size: 3, evWords: true });
  });
  it("rejects an unknown answer", () => {
    const S = fresh();
    expect(G.applyReading(S, "fluent")).toBe(false);
    expect(S.settings.reading).toBeUndefined();
  });
  it("readingOf reads the saved answer, or infers one for users who never answered", () => {
    const S = fresh();
    expect(G.readingOf(S)).toBe("yes");
    S.tools = { prefs: { translit: true, translation: false } };
    expect(G.readingOf(S)).toBe("little");
    G.applyReading(S, "notyet");
    expect(G.readingOf(S)).toBe("notyet");
  });
  it("the answer survives normalize (sync and reload)", () => {
    const S = fresh(); G.applyReading(S, "little");
    const back = store.normalize(JSON.parse(JSON.stringify(S)));
    expect(back.settings.reading).toBe("little");
    expect(back.tools.prefs.translit).toBe(true);
  });
  it("has copy for all three answers", () => {
    for (const k of G.READING) { expect(GUIDE.readOpts[k][0]).toBeTruthy(); expect(GUIDE.readShort[k]).toBeTruthy(); }
  });
});

describe("tour steps follow the features", () => {
  it("everything on: 7 steps; Progress covers Make-ups, the calendar replaces Tracker", () => {
    const S = fresh();
    expect(ids(S)).toEqual(["prayer", "status", "deeds", "read", "progress", "calendar", "finish"]);
    const pr = G.tourSteps(S).find(s => s.id === "progress");
    expect(pr.tabs).toEqual(["progress"]);
    expect(pr.variant).toBe("both");
    expect(G.tourSteps(S).find(s => s.id === "calendar").target).toBe("cal");
  });
  it("Just prayers: no Good Deeds, Read, Progress or Make-ups", () => {
    const S = fresh(); F.applyPreset(S, "prayers");
    expect(ids(S)).toEqual(["prayer", "status", "calendar", "finish"]);
  });
  it("each switch removes only its own step", () => {
    for (const [f, gone] of [["deeds", "deeds"], ["tools", "read"]]) {
      const S = fresh(); F.setFeature(S, f, false); if (f === "tools") F.setFeature(S, "week", false);
      expect(ids(S)).not.toContain(gone);
      expect(ids(S)).toHaveLength(6);
    }
    const S = fresh(); F.setFeature(S, "makeups", false);
    expect(G.tourSteps(S).find(s => s.id === "progress").variant).toBe("progress");
    F.setFeature(S, "makeups", true); F.setFeature(S, "progress", false);
    expect(G.tourSteps(S).find(s => s.id === "progress").variant).toBe("makeups");
    F.setFeature(S, "makeups", false);
    expect(ids(S)).not.toContain("progress");
  });
  it("all tools hidden and no weekly readings hides the Read step (the tab is gone)", () => {
    const S = fresh(); for (const t of F.TOOLS) F.setToolHidden(S, t, true);
    expect(ids(S)).toContain("read"); // the weekly readings still live in Read
    F.setFeature(S, "week", false);
    expect(ids(S)).not.toContain("read");
  });
  it("without the one-tap buttons, step 1 points at the Today chapter and Every choice is dropped", () => {
    const S = fresh(), st = G.tourSteps(S, { hasDots: false });
    expect(st.map(s => s.id)).not.toContain("status");
    expect(st[0]).toMatchObject({ id: "prayer", target: "today", variant: "today" });
  });
  it("always ends with You're all set", () => {
    const S = fresh(); F.applyPreset(S, "prayers");
    expect(G.tourSteps(S).at(-1).id).toBe("finish");
  });
});

describe("seen flags (S.settings.help)", () => {
  it("the tour is due only after setup queues it, and never again once ended", () => {
    const S = fresh();
    expect(G.tourDue(S)).toBe(false); // existing users don't get it unasked
    G.queueTour(S);
    expect(G.tourDue(S)).toBe(true);
    G.endTour(S);
    expect(G.tourDue(S)).toBe(false);
    expect(S.settings.help.tour).toBe("done");
  });
  it("not due before setup has finished", () => {
    const S = fresh(); S.profile.onboarded = false; G.queueTour(S);
    expect(G.tourDue(S)).toBe(false);
  });
  it("tool tips show once each, for Adhkār, Qurʾān and Hizb only", () => {
    const S = fresh();
    for (const t of G.TIP_TOOLS) expect(G.tipDue(S, t)).toBe(true);
    expect(G.tipDue(S, "durud")).toBe(false);
    G.dismissTip(S, "adhkar");
    expect(G.tipDue(S, "adhkar")).toBe(false);
    expect(G.tipDue(S, "quran")).toBe(true);
  });
  it("Replay queues the tour again and brings the tips back", () => {
    const S = fresh(); G.queueTour(S); G.endTour(S);
    for (const t of G.TIP_TOOLS) G.dismissTip(S, t);
    G.replayTour(S);
    expect(G.tourDue(S)).toBe(true);
    for (const t of G.TIP_TOOLS) expect(G.tipDue(S, t)).toBe(true);
  });
  it("Help & tour is New until opened", () => {
    const S = fresh();
    expect(G.helpIsNew(S)).toBe(true);
    G.markHelpOpened(S);
    expect(G.helpIsNew(S)).toBe(false);
  });
  it("flags live in settings, so they persist and travel with the cloud merge", () => {
    const S = fresh(); G.endTour(S); G.dismissTip(S, "hizb"); G.markHelpOpened(S);
    const back = store.normalize(JSON.parse(JSON.stringify(S)));
    expect(back.settings.help).toEqual({ tour: "done", tips: { hizb: true }, opened: true });
    const other = fresh(); other.updatedAt = 1; back.updatedAt = 2;
    expect(store.mergeStates(other, back).settings.help.tips.hizb).toBe(true);
  });
});
