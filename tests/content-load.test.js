// The approved-content chunk: one pending load, one redraw, and a back-off after a failed import (review fix).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { whenContent, contentReady, loadContent, _resetContent } from "../src/content.js";

const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };

describe("content loading", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { _resetContent(); vi.useRealTimers(); });

  it("many renders before the chunk lands: one import, one redraw", async () => {
    let resolve;
    const imp = vi.fn(() => new Promise(r => { resolve = r; }));
    _resetContent(imp);
    const render = vi.fn();
    for (let i = 0; i < 10; i++) whenContent(render);
    expect(imp).toHaveBeenCalledTimes(1);
    resolve({});
    await flush();
    expect(contentReady()).toBe(true);
    expect(render).toHaveBeenCalledTimes(1);
    whenContent(render);
    expect(render).toHaveBeenCalledTimes(1);
  });

  it("after a failed import, renders don't retry; the back-off does", async () => {
    let ok = false;
    const imp = vi.fn(() => (ok ? Promise.resolve({}) : Promise.reject(new Error("offline"))));
    _resetContent(imp);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const render = vi.fn();
    whenContent(render);
    await flush();
    expect(imp).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 10; i++) whenContent(render);
    await flush();
    expect(imp).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(59000);
    expect(imp).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1000);
    await flush();
    expect(imp).toHaveBeenCalledTimes(2); // failed again: the next wait is longer
    vi.advanceTimersByTime(60000);
    await flush();
    expect(imp).toHaveBeenCalledTimes(2);
    ok = true;
    vi.advanceTimersByTime(60000);
    await flush();
    expect(imp).toHaveBeenCalledTimes(3);
    expect(contentReady()).toBe(true);
    expect(render).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("a direct loadContent() (a tap) still tries during a back-off", async () => {
    const imp = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue({});
    _resetContent(imp);
    await expect(loadContent()).rejects.toThrow("offline");
    await loadContent();
    expect(imp).toHaveBeenCalledTimes(2);
    expect(contentReady()).toBe(true);
  });
});
