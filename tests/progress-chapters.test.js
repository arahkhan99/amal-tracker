// The redesign's Progress tab: its chapters follow the features (features.progressChapters), and Make-ups
// links (#makeups, #qada, the old tab) land on the Make-ups chapter while Progress is on (routes.landing).
import { describe, it, expect } from "vitest";
import * as store from "../src/store.js";
import * as F from "../src/features.js";
import { resolveView, landing, tabFor } from "../src/routes.js";
import { PROG, NAV } from "../src/strings.js";

const DAY = new Date(2026, 10, 17);
const fresh = () => { const S = store.defaultState(DAY); S.profile.onboarded = true; return S; };

describe("Progress chapters follow the features", () => {
  it("everything on except provisions (off by default): Reflections · Week · Charts · Make-ups", () => {
    expect(F.progressChapters(fresh())).toEqual(["reflect", "week", "charts", "makeups"]);
  });
  it("provisions on: Provisions sits before Make-ups", () => {
    const S = fresh(); S.settings.provisions.on = true;
    expect(F.progressChapters(S)).toEqual(["reflect", "week", "charts", "provisions", "makeups"]);
  });
  it("make-ups off: no Make-ups chapter", () => {
    const S = fresh(); F.setFeature(S, "makeups", false);
    expect(F.progressChapters(S)).toEqual(["reflect", "week", "charts"]);
  });
  it("Progress off: no chapters (Make-ups is its own page then)", () => {
    const S = fresh(); S.settings.provisions.on = true; F.setFeature(S, "progress", false);
    expect(F.progressChapters(S)).toEqual([]);
  });
  it("Reflections always comes first", () => {
    const S = fresh(); S.settings.provisions.on = true;
    expect(F.progressChapters(S)[0]).toBe("reflect");
  });
  it("every chapter has a name in strings.js", () => {
    const S = fresh(); S.settings.provisions.on = true;
    for (const c of F.progressChapters(S)) expect(PROG.chapters[c]).toBeTruthy();
    expect(PROG.chapters.makeups).toBe(NAV.qada);
  });
});

describe("#makeups opens the Make-ups chapter", () => {
  it("#makeups and #qada land on Progress, at Make-ups, while Progress is on", () => {
    const S = fresh();
    for (const h of ["#makeups", "#qada", "makeups"]) expect(landing(resolveView(h), S)).toEqual({ view: "progress", chapter: "makeups" });
  });
  it("with Progress off, Make-ups stays its own page (the tab opens it)", () => {
    const S = fresh(); F.setFeature(S, "progress", false);
    expect(landing(resolveView("#makeups"), S)).toEqual({ view: "qada", chapter: null });
    expect(tabFor("qada")).toBe("progress");
  });
  it("other views are left alone", () => {
    const S = fresh();
    expect(landing("progress", S)).toEqual({ view: "progress", chapter: null });
    expect(landing("home", S)).toEqual({ view: "home", chapter: null });
  });
});
