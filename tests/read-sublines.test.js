// Read (19 Nov 2026): Yā-Sīn morning and evening on For today and in the Qurʾān chapter, and the sub-lines restored
// from the old Tools hub (parity M11, decision e): "Your wird is voluntary…", durūd "n of 40" and "Last read",
// and Qurʾān "n pages today".
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as store from "../src/store.js";
import { timesFor } from "../src/times.js";

const S = store.defaultState(new Date(2026, 10, 1));
S.profile.onboarded = true;
S.createdKey = "2026-11-01";
const FRI = new Date(2026, 10, 20);
const clock = { now: new Date(+timesFor(FRI, S.settings).Asr + 20 * 60000) };
vi.mock("../src/app.js", () => ({
  S, UI: { view: "tools" }, A: {}, $: () => null, $$: () => [], NOW: () => clock.now, todayKey: () => "2026-11-20",
  onRender() {}, onCommit() {}, commit() {}, render() {}, go() {}, toast() {}, touched() {}, revision: () => 1, avatarBtn: () => "",
  glossBtn: () => "", openSheet() {}, closeSheet() {},
}));
vi.mock("../src/platform.js", () => ({ isNative: () => false, pageUrl: p => p }));
vi.mock("../src/cloud.js", () => ({ cloud: { available: false, user: null } }));
vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: () => "web", isNativePlatform: () => false } }));
globalThis.addEventListener ||= () => {};
globalThis.document ||= { addEventListener() {}, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], documentElement: { dataset: {} } };

const { _chapters: R, _grp } = await import("../src/views/read.js");
const { READ } = await import("../src/strings.js");
const { TT } = await import("../src/views/tools/strings-tools.js");
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

describe("Read → For today", () => {
  beforeEach(() => { S.tools = {}; delete S.days["2026-11-20"]; });
  it("lists Yā-Sīn morning and evening (chosen as daily readings), each with Read and a tick", () => {
    S.settings.dailyDeeds = [...store.dailyIds({ ...S, settings: { ...S.settings, dailyDeeds: undefined } }), "yasinAm", "yasinPm"];
    _grp.later = true; // the morning's half is past at ʿAsr: under "Later today", opened
    const h = R.today(clock.now);
    _grp.later = false; delete S.settings.dailyDeeds;
    for (const id of ["yasinAm", "yasinPm"]) {
      expect(h).toContain(esc(READ.item[id]));
      expect(h).toContain(`onclick="A.readOpen('${id}')"`);
      expect(h).toContain(`onclick="A.readTick('${id}')"`);
    }
  });
  it("ends with the voluntary note", () => {
    const h = R.today(clock.now);
    expect(h).toContain(esc(TT.voluntary));
    expect(h.indexOf(esc(TT.voluntary))).toBeGreaterThan(h.indexOf("rd-list"));
  });
  it("durūd shows n of 40 and when it was last read", () => {
    S.tools.durud = { "2026-11-13": { read: [1, 2, 3], done: 1 }, "2026-11-20": { read: Array.from({ length: 12 }, (_, i) => i + 1) } };
    const h = R.today(clock.now);
    expect(h).toContain(READ.durudOf(12, 40));
    expect(h).toContain(READ.durudLast("Fri 13 Nov"));
    expect(R.adhkar(clock.now)).toContain(READ.durudLast("Fri 13 Nov"));
  });
  it("Qurʾān recitation shows the pages read today", () => {
    S.tools.quran = { read: { "2026-11-20": [10, 11, 12] } };
    expect(R.today(clock.now)).toContain(TT.pagesToday(3));
  });
  it("an excused day takes Yā-Sīn off For today, but the Qurʾān chapter keeps it", () => {
    store.ensureDay(S, "2026-11-20").excused = true;
    expect(R.today(clock.now)).not.toContain(esc(READ.item.yasinAm));
    expect(R.quran(clock.now)).toContain(esc(READ.yasinRow));
    expect(R.quran(clock.now)).toContain(`A.readOpen('yasin')`);
  });
});
