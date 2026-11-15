# Hijri date (round 2)

## Settings
`S.settings.hijri = { method, committee, adjust }`
- `method`: `umalqura` (default, as before) | `civil` | `tbla` (Intl `islamic-civil` / `islamic-tbla`, listed only if the engine supports them) | `committee`.
- `committee`: a committee id from `COMMITTEES` in `src/hijri-committees.js` (only `chc-na` since 14 Nov 2026; the user removed the other two). To add one, add a row there and create its Firestore document.
- `adjust`: -2..+2 days, applied on top of any method (for a committee, the shifted day is looked up in the committee data, so month starts line up).
- Region suggestion (`suggestedHijri`): US/Canada (locale region or time zone) get CHC suggested; everyone else stays on Umm al-Qura with the adjustment control. It is only a tag in the sheet; nothing is switched automatically.

## API (`src/hijri.js`)
- `hijriLabel(date)` unchanged signature, now reads the user's settings via `setHijriSource` (registered by `views/settings.js`). `hijriMonth(date)` too.
- `hijriParts(date | "YYYY-MM-DD", settings?)` returns `{y, m, d, source}`; source is `calc`, `committee` or `fallback`.
- `calcParts(dayNum, calendar)`, `calendarAvailable(method)`, `normalizeHijri`, `currentHijri`.

## Committee data
Firestore: `hijriCommittees/{id}` = `{ name, editors: [uid] }` and `hijriCommittees/{id}/months/{YYYY-MM}` (Hijri year, zero-padded month, e.g. `1448-05`) = `{ startDate: "YYYY-MM-DD", updatedBy, updatedAt, note }`.

Flow: sign-in / coming online / opening the sheet -> `cloud.refreshHijriCommittee(id)` reads the months and the editors list -> `storeCommittee` writes them to localStorage (`zad-hijri-committees`) with a cached offset -> `hijriParts` reads only that cache. Offline or signed out the cache (or plain calculation) is used.

Maths (`committeeParts`):
- Between two known starts: day = days since the start + 1 (29 or 30 day months come out of the data).
- After the latest known start (next month undecided): calculated date + cached offset, where the offset is the shift (-3..+3) that makes the calculation show day 1 on the committee's start. This predicts the 29/30 boundary until the decision arrives.
- A long time after the last decision, or before the first: same fallback, marked `fallback`.
- No data: plain calculation.

## Rules
Read: any signed-in user. Create/update a month: only uids in the committee document's `editors`, month id `YYYY-MM`, fields exactly `startDate, updatedBy (= own uid), updatedAt (= server time), note (<= 200 chars)`. Delete and writes to the committee document: nobody from the app (manage `editors` and the committee doc in the Firebase console). Tests: `tests/rules.test.js` (`npm run test:rules`), date maths: `tests/hijri.test.js`.

## Updating a month
Editor: Settings -> Hijri date -> follow the committee -> "Update this month's start" (only shown to editors) -> pick the month, the Gregorian date of the 1st, save. The date must be within 3 days of the calculated start. Or in the Firebase console add a document `hijriCommittees/chc-na/months/1448-06` with the four fields. To make someone an editor, add their uid to `editors` on `hijriCommittees/chc-na` in the console.
