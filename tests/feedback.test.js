// Send feedback / Report a mistake: the Firestore payload, the mailto link and the item ids (src/feedback.js).
import { describe, it, expect } from "vitest";
import { buildPayload, buildMailto, mailBody, itemId, deviceLabel, validEmail, clip, LIMITS, TYPES, ITEM_ID, FEEDBACK_EMAIL, reportLink } from "../src/feedback.js";

const base = { type: "content", message: "The page number looks wrong.", item: { id: "hadith:H45", title: "Hadith H45 · More pleased than the traveller" },
  parts: ["source"], email: "raheem@example.com", includeDevice: true, appVersion: "2026.11.15.1230", platform: "android", device: "Android 15 · Pixel 8" };
const ALLOWED = ["type", "message", "itemId", "itemTitle", "parts", "email", "appVersion", "platform", "device"];

describe("item ids", () => {
  it("always carry the kind", () => {
    expect(itemId("hadith", "H45")).toBe("hadith:H45");
    expect(itemId("ayah", "A07")).toBe("ayah:A07");
    expect(itemId("sahabi", "ABUBAKR", 12)).toBe("sahabi:ABUBAKR#12");
    expect(itemId("adhkar", "evening", 1)).toBe("adhkar:evening#1");
    expect(itemId("hizb", 6, 3)).toBe("hizb:6#3");
    expect(itemId("quran", "indopak15", "p12")).toBe("quran:indopak15#p12");
    expect(itemId("durud", 7)).toBe("durud:7");
  });
  it("rejects malformed or overlong ids", () => {
    expect(itemId("Hadith", "H45")).toBe("");
    expect(itemId("hadith", "H 45")).toBe("");
    expect(itemId("hadith", "")).toBe("");
    expect(itemId("quran", "x".repeat(40))).toBe("");
    expect(ITEM_ID.test("H45")).toBe(false);
  });
});

describe("buildPayload", () => {
  it("builds the full document with only the allowed fields", () => {
    const p = buildPayload(base);
    expect(p).toEqual({ type: "content", message: "The page number looks wrong.", itemId: "hadith:H45", itemTitle: "Hadith H45 · More pleased than the traveller",
      parts: ["source"], email: "raheem@example.com", appVersion: "2026.11.15.1230", platform: "android", device: "Android 15 · Pixel 8" });
    expect(Object.keys(p).every(k => ALLOWED.includes(k))).toBe(true);
    expect(p.uid).toBeUndefined(); // added by cloud.sendFeedback
    expect(p.createdAt).toBeUndefined();
  });
  it("needs a message and a known type", () => {
    expect(buildPayload({ ...base, message: "   " })).toBeNull();
    expect(buildPayload({ ...base, type: "spam" })).toBeNull();
    for (const t of TYPES) expect(buildPayload({ ...base, type: t }).type).toBe(t);
  });
  it("keeps every value within the rules' limits", () => {
    const p = buildPayload({ ...base, message: "x".repeat(5000), item: { id: "hadith:H45", title: "t".repeat(400) },
      parts: ["arabic", "translation", "source", "text", "layout", "translit", "other", "qtext"], appVersion: "v".repeat(50), device: "d".repeat(200) });
    expect(p.message.length).toBe(LIMITS.message);
    expect(p.itemTitle.length).toBe(LIMITS.itemTitle);
    expect(p.parts.length).toBe(LIMITS.parts);
    expect(p.appVersion.length).toBe(LIMITS.appVersion);
    expect(p.device.length).toBe(LIMITS.device);
  });
  it("never splits an emoji or other surrogate pair at the cut", () => {
    const p = buildPayload({ ...base, message: "a".repeat(LIMITS.message - 1) + "😀😀" });
    expect(p.message).toBe("a".repeat(LIMITS.message - 1));
    expect(clip("ab😀", 3)).toBe("ab");
  });
  it("drops unknown parts, a bad item id, and parts without an item", () => {
    const p = buildPayload({ ...base, parts: ["source", "prayerLog", "source"] });
    expect(p.parts).toEqual(["source"]);
    const q = buildPayload({ ...base, item: { id: "H45", title: "x" } });
    expect(q.itemId).toBeUndefined(); expect(q.itemTitle).toBeUndefined(); expect(q.parts).toBeUndefined();
    const r = buildPayload({ ...base, item: null });
    expect(r.itemId).toBeUndefined(); expect(r.parts).toBeUndefined();
  });
  it("leaves out the email when empty or invalid, and device details when the box is unticked", () => {
    expect(buildPayload({ ...base, email: "" }).email).toBeUndefined();
    expect(buildPayload({ ...base, email: "not an email" }).email).toBeUndefined();
    const p = buildPayload({ ...base, includeDevice: false });
    expect(p.appVersion).toBeUndefined(); expect(p.platform).toBeUndefined(); expect(p.device).toBeUndefined();
    expect(buildPayload({ ...base, platform: "windows" }).platform).toBe("web");
  });
  it("never includes personal tracker data, even if it is passed in", () => {
    const p = buildPayload({ ...base, days: { "2026-11-12": { prayers: { Fajr: "missed" }, note: "private" } }, location: { lat: 51.5, lng: -0.1 }, uid: "u1", name: "Raheem" });
    expect(Object.keys(p).every(k => ALLOWED.includes(k))).toBe(true);
    expect(JSON.stringify(p)).not.toMatch(/private|51\.5|Raheem|missed/);
  });
});

describe("validEmail", () => {
  it("accepts ordinary addresses and rejects junk", () => {
    expect(validEmail("a@b.co")).toBe(true);
    expect(validEmail("a@b")).toBe(false);
    expect(validEmail("a b@c.de")).toBe(false);
    expect(validEmail("x".repeat(250) + "@b.co")).toBe(false);
  });
});

describe("buildMailto", () => {
  const decode = u => { const q = new URLSearchParams(u.split("?")[1]); return { subject: q.get("subject"), body: q.get("body") }; };
  it("goes to the team address with the type and item in the subject", () => {
    const u = buildMailto(base);
    expect(u.startsWith(`mailto:${FEEDBACK_EMAIL}?subject=`)).toBe(true);
    const { subject, body } = decode(u);
    expect(subject).toBe("Zad · Mistake in content · hadith:H45");
    expect(body).toContain("The page number looks wrong.");
    expect(body).toContain("Item: hadith:H45 (Hadith H45 · More pleased than the traveller)");
    expect(body).toContain("What looks wrong: Narrator or source");
    expect(body).toContain("App: Zad 2026.11.15.1230 · android");
    expect(body).toContain("Device: Android 15 · Pixel 8");
  });
  it("never puts the typed reply email in the link (the mail app sends from the user's own address)", () => {
    expect(buildMailto(base)).not.toContain("raheem");
  });
  it("leaves out version and device when the box is unticked", () => {
    const { body } = decode(buildMailto({ ...base, includeDevice: false, item: null }));
    expect(body).not.toMatch(/App:|Device:|Item:/);
    expect(decode(buildMailto({ ...base, type: "idea", item: null })).subject).toBe("Zad · Suggestion");
  });
  it("stays under the length limit by cutting a long message", () => {
    const u = buildMailto({ ...base, message: "ص".repeat(2000) });
    expect(u.length).toBeLessThanOrEqual(LIMITS.mailto);
    const { body } = decode(u);
    expect(body.split("\n")[0].endsWith("…")).toBe(true);
    expect(body).toContain("Item: hadith:H45");
    expect(buildMailto(base).length).toBeLessThanOrEqual(LIMITS.mailto);
  });
  it("returns nothing without a message", () => {
    expect(buildMailto({ ...base, message: "" })).toBe("");
  });
  it("mailBody matches the payload", () => {
    expect(mailBody({ type: "bug", message: "m" })).toBe("m\n\n---\nType: Something’s not working");
  });
});

describe("deviceLabel", () => {
  it("reads Android, iPhone and desktop user agents", () => {
    expect(deviceLabel("Mozilla/5.0 (Linux; Android 15; Pixel 8 Build/AP3A.241105.008; wv) AppleWebKit/537.36 Chrome/142.0 Mobile Safari/537.36", "android")).toBe("Android 15 · Pixel 8");
    expect(deviceLabel("Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/142.0 Mobile Safari/537.36", "web")).toBe("Android 10");
    expect(deviceLabel("Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148", "ios")).toBe("iOS 18.1 · iPhone");
    expect(deviceLabel("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36", "web")).toBe("Web · Chrome 142 · Windows");
    expect(deviceLabel("", "web")).toBe("Web");
    expect(deviceLabel("x".repeat(300), "web").length).toBeLessThanOrEqual(LIMITS.device);
  });
});

describe("reportLink", () => {
  it("is a real button with visible text", () => {
    expect(reportLink("A.fbReport('hadith')")).toMatch(/^<button type="button" class="fb-rep" onclick="A.fbReport\('hadith'\)">.*Report a mistake<\/span><\/button>$/);
  });
});

import { quranItem, sendGate } from "../src/feedback.js";

describe("Qurʾān report item (one page, or either page of a tablet spread)", () => {
  const labels = { surah: "Al-Baqarah", mushafLabel: "IndoPak 15-line" };
  it("builds the id and title for each of the two pages", () => {
    const right = quranItem("indopak15", 12, labels), left = quranItem("indopak15", 13, labels);
    expect(right).toMatchObject({ id: "quran:indopak15#p12", kind: "quran", page: 12, short: "Qurʾān · Page 12", title: "Qurʾān · Page 12 · Al-Baqarah · IndoPak 15-line" });
    expect(left).toMatchObject({ id: "quran:indopak15#p13", page: 13, short: "Qurʾān · Page 13", title: "Qurʾān · Page 13 · Al-Baqarah · IndoPak 15-line" });
    expect(buildPayload({ ...base, item: left }).itemId).toBe("quran:indopak15#p13");
  });
  it("leaves out what isn't known", () => {
    expect(quranItem("madani15", 1).title).toBe("Qurʾān · Page 1");
  });
});

describe("send gate (a slow send never touches a newer feedback form)", () => {
  it("a send's token stops being current once the sheet is opened again", () => {
    const g = sendGate();
    g.open();
    const t = g.token();
    expect(g.isCurrent(t)).toBe(true); // same form: the thank-you may replace it
    g.open(); // closed and a new form opened while the send was slow
    expect(g.isCurrent(t)).toBe(false);
    expect(g.isCurrent(g.token())).toBe(true);
  });
});
