const HIJRI_MONTHS = ["Muharram", "Safar", "Rabi' al-Awwal", "Rabi' al-Thani", "Jumada al-Ula", "Jumada al-Akhirah", "Rajab", "Sha'ban", "Ramadan", "Shawwal", "Dhu al-Qa'dah", "Dhu al-Hijjah"];

/** "25 Rabi' al-Awwal 1448", computed offline with the Umm al-Qura calendar. */
export function hijriLabel(date) {
  try {
    const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", { day: "numeric", month: "numeric", year: "numeric" }).formatToParts(date);
    const get = t => parseInt(parts.find(x => x.type === t)?.value, 10);
    const d = get("day"), m = get("month"), y = get("year") || get("relatedYear");
    if (!d || !m || !y) return "";
    return `${d} ${HIJRI_MONTHS[m - 1]} ${y}`;
  } catch (e) {
    return "";
  }
}

/** True during Ramadan, used for the year view's "best month" note. */
export function hijriMonth(date) {
  try {
    const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", { month: "numeric" }).formatToParts(date);
    return parseInt(parts.find(x => x.type === "month")?.value, 10) || 0;
  } catch (e) { return 0; }
}
