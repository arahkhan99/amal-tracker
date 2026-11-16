// Scroll targets under the tablet CSS zoom (.view zoom 1.15, #screen at 1): everything in screen px (review fix).
import { describe, it, expect } from "vitest";
import { zoomOf, topIn, stickyBottom } from "../src/util.js";
import { PREF_DEFAULTS } from "../src/guide.js";

const Z = 1.15;
// a fake element laid out at `top`/`height` CSS px inside a view zoomed by z, in a scroller scrolled by `scroll`
const el = (top, height, z = Z, cssTop = "0px") => ({ offsetHeight: height, offsetTop: top, cssTop, getBoundingClientRect: () => ({ top: 100 + top * z - 500, height: height * z }) });
const scroller = { scrollTop: 500, getBoundingClientRect: () => ({ top: 100, height: 800 }) };
globalThis.getComputedStyle = e => ({ top: e.cssTop });

describe("zoom-aware scroll helpers", () => {
  it("zoomOf reads the zoom off the element (1 on phones)", () => {
    expect(zoomOf(el(0, 40))).toBeCloseTo(Z);
    expect(zoomOf(el(0, 40, 1))).toBe(1);
    expect(zoomOf(null)).toBe(1);
    expect(zoomOf({ offsetHeight: 0, getBoundingClientRect: () => ({ height: 0 }) })).toBe(1);
  });
  it("topIn gives scrollTop units, not the unzoomed offsetTop", () => {
    const e = el(1000, 40);
    expect(topIn(e, scroller)).toBeCloseTo(1000 * Z); // offsetTop would say 1000: 150 px short on a tablet
    expect(topIn(el(1000, 40, 1), scroller)).toBeCloseTo(1000);
  });
  it("stickyBottom scales the bar's CSS top too", () => {
    expect(stickyBottom(el(0, 40, Z, "10px"))).toBeCloseTo(50 * Z);
    expect(stickyBottom(el(0, 40, 1, "10px"))).toBeCloseTo(50);
    expect(stickyBottom(null)).toBe(44);
  });
});

describe("tool reading defaults live in one place", () => {
  it("guide.js exports them, frozen", () => {
    expect(PREF_DEFAULTS).toEqual({ translit: false, translation: false, size: 1, evWords: true });
    expect(Object.isFrozen(PREF_DEFAULTS)).toBe(true);
  });
});
