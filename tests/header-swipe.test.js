import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("Today header alignment and calendar swipe (20 Nov)", () => {
  it("header: greeting and name share a left column; date spans the full width under them", () => {
    const css = readFileSync("src/css/today.css", "utf8");
    expect(css).toContain(".zt-head .zt-top{display:grid;grid-template-columns:minmax(0,1fr) auto");
    expect(css).toContain(".zt-head .zt-date{grid-column:1 / -1");
    const home = readFileSync("src/views/home.js", "utf8");
    expect(home).toContain('<div class="zt-hd-l"><b class="zt-hi');
  });
  it("provisions chip: the level sits inside the ring", () => {
    const src = readFileSync("src/views/provisions.js", "utf8");
    expect(src).toContain('class="pv-chip ring"');
    expect(src).toContain('<span class="pv-lv" aria-hidden="true">${esc(P.lv(s.level))}</span>');
  });
  it("calendar swipe: sideways 50px+ changes month, small or vertical moves don't", async () => {
    const src = readFileSync("src/views/calendar.js", "utf8");
    const m = src.match(/swipeStep: \(dx, dy, ms = 200\) => (.*?) };/);
    const swipeStep = new Function("dx", "dy", "ms", `ms = ms ?? 200; return ${m[1]};`);
    expect(swipeStep(-80, 5)).toBe(1);   // swipe left → next month
    expect(swipeStep(90, -10)).toBe(-1); // swipe right → previous month
    expect(swipeStep(30, 0)).toBe(0);    // too short
    expect(swipeStep(-80, 70)).toBe(0);  // mostly vertical (scrolling)
    expect(swipeStep(-80, 0, 1200)).toBe(0); // too slow (a drag, not a swipe)
  });
});
