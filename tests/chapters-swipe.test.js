// Regression (19 Nov 2026): "lag when swiping between chapters". Two causes found with a 4x-throttled Playwright
// profile: (1) :has() rules made every "on" class change (a chapter name, the toast) restyle and repaint every ".t"
// element in the app (Chromium merges the targets of all :has() rules into one invalidation set); (2) each settled
// swipe toggled `inert` on whole chapters and then read layout (a forced full style recalc), 90 ms after the snap.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { chapterAt } from "../src/views/chapters.js";

const cssFiles = () => ["src/styles.css", ...readdirSync("src/css").map(f => join("src/css", f))].filter(f => f.endsWith(".css"));
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, "");

describe("chapters stay cheap to swipe", () => {
  it("no stylesheet uses :has() (it made every class change restyle the whole app)", () => {
    for (const f of cssFiles()) expect(stripComments(readFileSync(f, "utf8")), f).not.toMatch(/:has\(/);
  });
  it("chapterAt: the chapter under the middle of the track", () => {
    expect(chapterAt(0, 390, 3)).toBe(0);
    expect(chapterAt(194, 390, 3)).toBe(0);
    expect(chapterAt(196, 390, 3)).toBe(1);
    expect(chapterAt(780, 390, 3)).toBe(2);
    expect(chapterAt(5000, 390, 3)).toBe(2); // overscroll
    expect(chapterAt(-40, 390, 3)).toBe(0);
    expect(chapterAt(100, 0, 3)).toBe(0); // not laid out yet
  });
  it("the swipe handler does no layout reads or inert changes per scroll event (only a rAF-throttled follow)", () => {
    const src = readFileSync("src/views/chapters.js", "utf8");
    const onScroll = src.slice(src.indexOf("function onScroll()"), src.indexOf("function follow()"));
    expect(onScroll).toMatch(/requestAnimationFrame\(follow\)/);
    expect(onScroll).not.toMatch(/inert|offset|clientWidth|scrollLeft|getBoundingClientRect/);
  });
});
