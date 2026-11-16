# Foundation API (improvement round, 8 Nov 2026)

This is for the UI agents. It covers every exported function and data shape the Foundation built, and how to call each one. The rules come from `docs/madhhab-rules.md` and the "User picks" in `docs/PROGRESS.md`.

**General rules**
- All of these functions are pure, or change `S` in place. None of them commit. After a change, call `commit()` from `app.js`. It saves, reschedules, renders and syncs.
- Internal keys never change:
  - prayer keys: `Fajr`, `Dhuhr`, `Asr`, `Maghrib`, `Isha`;
  - view ids: `home`, `tracker`, `tools`, `qada`, `progress`;
  - amal ids: `quran`, `morning` and the rest.
- What the user reads always comes from `src/strings.js`.
- Day keys are `"YYYY-MM-DD"` (`util.dkey`).

---

## 1. Data model (`S`, version 2)

```js
S = {
  version: 2, createdKey, updatedAt, profile: { name, onboarded, consent },
  settings: {
    // existing
    preQada, leadMin, prayerAlerts, evening, method, location, carryQuran, reflection, seerah, lock,
    // new
    madhhab: "hanafi" | "shafii" | "maliki" | "hanbali",   // default "hanafi"
    asr: "hanafi" | "shafi",          // follows madhhab (setMadhhab); setAsr overrides
    asrChosen?: true,                 // asr was set explicitly
    madhhabChosen?: true,             // madhhab picked by the user
    madhhabAsk?: true,                // show the one-time "Zad now uses Hanafī ʿAsr" sheet (see §2.4)
    asrBefore?: "shafi",              // what asr was before that migration
    jumuah: true,                     // Friday: Dhuhr shows the Jumuʿah sunnah list, named "Jumuʿah"
    sunnahGhayr: true,                // ghayr muʾakkadah chips shown (outlined)
    sunnahNafl: false,                // nafl chips hidden by default
    excusedDays: true,                // offer Excused days (hayd/nifās)
    makeupNudge: true,                // "Still time to make up ʿAsr today" reminder (notify.js)
    features: { sunnah, deeds, makeups, week, progress, tools },   // booleans, all true by default
    hiddenTools: [],                  // subset of ["adhkar","durud","hizb","quran"]
    provisions: { on: false, homeFull: false, home: false, tracker: false, best: 1, weights: "v1", offered: false },
                                      // provisions & levels (points.js): switch, sisters' rule, Home / Tracker chips,
                                      // best level shown (never goes down), weights version, one-time offer shown
  },
  amalList: [...],                    // built-ins now named "Qurʾān recitation", "Morning adhkār", …
  days: { [key]: Day },
  lastQuran,
  excusedMode: null | { since: key },
  qada: { Fajr, Dhuhr, Asr, Maghrib, Isha, Witr, fasts, goal, fastGoal, monthLog, dayLog, addedLog },
                                      // dayLog: { "YYYY-MM-DD": { prayers, fasts } } make-ups completed per day,
                                      // written next to monthLog (unchanged) by madeUpPrayer / madeUpFast
}

Day = {
  prayers: { Fajr: Status, … },       // missing = not logged
  amal: { [id]: { done, detail } }, note: "",
  at?: { [prayer]: ms },              // when the status was logged ("made up at 7:40 AM")
  sunnah?: { [itemId]: true },        // sunnah chips, ids from madhhab.js (e.g. "fajr-b2")
  witr?: "done" | "madeup" | "missed",
  witrQ?: true,                       // this missed Witr was added to make-ups
  witrAuto?: true,                    // Witr marked missed because ʿIshāʾ was missed (Hanafi)
  excused?: true,                     // excused day: unlogged prayers count as "excused"
  remember?: { [prayer]: true },      // remembrance at prayer time, only on excused prayers (setRemember)
  first?: ms,                         // first time anything was logged for the day (markLogged); set once,
                                      // never overwritten; the cloud merge keeps the earlier of two copies
  u: ms,
}

Status = "congregation" | "ontime" | "madeup" | "missed" | "excused"
```

**Made up** means the prayer was prayed after its window ended but before the next Fajr. It is never added to make-ups. (This is not the same as praying back an owed prayer in the Make-ups screen, which is `madeUpPrayer`.)

---

## 2. `src/store.js`

### 2.1 Constants
| Export | Value |
|---|---|
| `VERSION` | `2` |
| `STATUSES` | `["congregation","ontime","madeup","missed","excused"]`, in display order |
| `PRAYED` / `isPrayed(s)` | the statuses congregation, ontime and madeup |
| `WITR_STATUSES` | `["done","madeup","missed"]` |
| `DEFAULT_AMAL` | the built-in good deeds, named from `strings.DEED_NAME` |

### 2.2 Load, save, migrate (unchanged signatures)
- `defaultState(now)`: a new state, with Hanafi as the madhhab.
- `normalize(s, now)`: fills in missing fields and runs the migration. It never drops a field.
- `load(storage)` / `save(S, storage)`.
- `mergeStates(local, remote)`: settings, features, `excusedMode` and qada come from the side saved last. Days merge one at a time by `day.u`, except that `day.first` keeps the earlier stamp of the two copies and `settings.provisions.best` keeps the higher level.
- `normalize` fills `settings.provisions` (defaults above, bad values reset) and `qada.dayLog` (`{}`) on older saves.
- **The migration is keyed on fields, so it is safe to run again:**
  - The state already has a `madhhab`: nothing changes.
  - The old state has `asr: "hanafi"`: Hanafi, with `asrChosen: true`. This was an explicit choice, because the old default was "shafi".
  - The old state has `asr: "shafi"`: we can't tell whether the user chose it. It becomes Hanafi (asr "hanafi"), with `asrBefore: "shafi"`. If the profile is onboarded, `madhhabAsk` is set to true.
  - Built-in good deeds are renamed to the new spelling only if the user never renamed them.

### 2.3 Prayers
| Function | Does |
|---|---|
| `getDay(S,key)` / `ensureDay(S,key)` | As before. |
| `statusOf(day,p)` / `prayerStatus(S,key,p)` | The logged status. On an excused day, an unlogged prayer gives `"excused"`. Otherwise `null`. **Use this instead of `day.prayers[p]`.** |
| `setPrayer(S,key,p,status\|null,now)` | Returns the previous stored status. **Missed** adds 1 to `qada[p]`. Changing away from missed (to anything, or to null) removes it. For Hanafi, **ʿIshāʾ marked missed** also marks an unlogged Witr missed (`qada.Witr` +1, `witrAuto`). Changing ʿIshāʾ back undoes that. Stamps `day.at[p]`. |
| `setWitr(S,key,"done"\|"madeup"\|"missed"\|null,now)` | Missed adds to `qada.Witr` only where Witr is owed (Hanafi). Changing away from missed removes it, but only if it was added. |

### 2.4 Madhhab
- `setMadhhab(S, m)`: sets madhhab, sets asr from the madhhab, and clears `madhhabAsk`.
- `setAsr(S, "hanafi"|"shafi")`: overrides the ʿAsr method alone.
- `answerMadhhabAsk(S, m = "hanafi")`: call it from the one-time sheet. Use `MADHHAB_UI.askTitle`, `askLead`, `askKeep` and `askChoose` for its text.

### 2.5 Sunnah
| Function | Returns |
|---|---|
| `sunnahChips(S,key,prayer,{all})` | The chips to draw for one fard: `[{id, prayer, when, rakahs, tier, label:"2 before", display:"solid"\|"outline"\|"hidden", tierName, allowed, done}]`.<br>The list is empty when the fard's status allows no chips (missed, excused; made up except Fajr's 2 before).<br>Pass `prayer = "day"` for Ishrāq, Duhā and Tahajjud (only when nafl is on).<br>On Friday with `jumuah`, Dhuhr gives the Jumuʿah list. |
| `setSunnah(S,key,id,done)` | `true` if done. `false` if the chip is refused because its fard's status doesn't allow it, or the id is unknown. |
| `sunnahDone(S,key,id)` | Whether the chip is logged and still allowed. Logs are kept when a fard becomes missed; they just stop counting. |
| `witrChip(S,key)` | `{chip:"Witr 3", tag:"wājib"\|"sunnah"\|"Sunnah", line, settingsLine, row, tier, status, done, inQada, rakahs, allowed}`. Show it on the ʿIshāʾ row. |
| `sunnahOpts(S,key)` | `{date, jumuah, ghayr, nafl}` for the `madhhab.js` functions. |

**Logging order:** chips can be logged before the fard (for example 4 before Zuhr while the fard is still unlogged).

### 2.6 Excused days (hayd/nifās)
| Function | Does |
|---|---|
| `setExcusedDay(S,key,on,now)` | **On:** sets the day flag, and clears Missed prayers and a missed Witr (their make-ups come off). Prayed prayers stay as they are.<br>**Off:** removes the flag. |
| `setExcusedRange(S,from,to,on,now)` | Every day in the range. Returns the count of days, for the "Mark n days excused" sheet. |
| `startExcused(S,key,now)` | Turns excused mode on from `key`. |
| `syncExcusedMode(S,todayKey)` | Flags every day from `since` to today. **Call it at start-up and at the midnight rollover** (a request for main.js). Returns the number of newly flagged days. |
| `endExcused(S,key,{excusedPrayers},now)` | Ends the mode and unflags `key`. The listed prayers are stored as "excused". Suggested call: `times.startedPrayers(today, now, S.settings)` minus the prayer that is open now. |
| `isExcusedDay(S,key)` | |
| `amalForDay(S,key)` | The good deeds list for that day.<br>On an excused day, `quran` becomes `{id:"listen", name:"Listen to Qurʾān", swappedFrom:"quran"}`, and `{id:"dua", name:"Duʿāʾ & istighfār", excusedOnly:true}` is added.<br>**Home, Tracker and Progress should render from this, not from `S.amalList`.** |

### 2.7 Make-ups
- `qadaKeys(S)`: the rows to show. This is `PRAYERS` plus `"Witr"` for Hanafi.
- `qadaOwed(S)`: the total. It includes Witr only where Witr is owed.
- `qadaSplit(S)`: `{fard, witr}`, used for "1,770 fard + 356 Witr to go".
- `madeUpPrayer(S,p\|"Witr",now)`, `madeUpFast`: as before, and also count the make-up in `qada.dayLog[dkey(now)]`. `monthLog`, `addedToday`, `lastDetail`: unchanged.
- `markLogged(day,now)`: stamps `day.first` once. Called by `setPrayer` / `setWitr` (with a status), `setSunnah` (accepted), `setAmal` (done), `setRemember` (on) and tools' `tickAmal`. Clearing, `setExcusedDay` and viewing never stamp. `setSunnah` and `setAmal` take an optional last `now`.
- `setRemember(S,key,p,on,now)`: remembrance at prayer time; refused (false) unless `statusOf(day,p)` is excused. `remembered(day,p)` reads it.
- `defaultProvisions()`, `recordLevel(S,level)`: true when `level` is a new best (show the level-up), and stores it.

### Provisions (`src/points.js`, pure)
- `WEIGHTS.v1`, `CURRENT`, `needFor(n) = 100·n·(n−1)`, `levelFor(total)`.
- `dayProvisions(day,{w,homeFull,makeups,madhhab})` → `{total, parts}`; `dayBreakdown(S,key,{today})` applies the settings.
- `provisions(S,{version,from,to,today,homeFull})` → `{total, level, need, next, toNext, byDay, version, daysLogged, since}`. Days before `createdKey` or after `today` count nothing.
- `makeupsByDay(S,{today})`: exact from `dayLog`; a month's `monthLog` total beyond its `dayLog` entries is spread evenly over that month's other days in range, at most 5 a day.
- `displayLevel(S,opts)` = max(`settings.provisions.best`, computed level). `weekRange(today)` → `{from,to}`.

---

## 3. `src/rules/madhhab.js`
| Export | Notes |
|---|---|
| `MADHHABS`, `DEFAULT_MADHHAB` | `["hanafi","shafii","maliki","hanbali"]`, `"hanafi"` |
| `TIERS` | `muakkadah` (solid), `ghayr` (outline), `nafl` (hidden), plus Maliki's `raghibah` (solid) and `nafilahMuakkadah` (solid). Each has `{display, measured, glossary}`. |
| `getMadhhab(id)` | `{id, asr, sunnah:[Item], witr:{status, inQada, rakahs, tier}, measure}` |
| `madhhabOf(S \| settings)` | The id, with Hanafi as the fallback. |
| `asrMethod(m)`, `witrRule(m)`, `witrInQada(m)` | |
| `catalogue(m)`, `itemById(id,m)`, `DAY_NAFL` | `Item = {id, prayer, when:"before"\|"after", rakahs, tier, jumuah?, name?, afterWitr?, review?}` |
| `sunnahFor(m, prayer, {date, jumuah, ghayr, nafl})` | The visible chips for one fard. Witr is not included. |
| `sunnahForDay(m, opts)` | `{Fajr:[…], …, day:[…]}` |
| `sunnahAllowed(item, status, {excusedDay})` | Missed or excused: no chips. Made up: only Fajr's 2 before. Prayed or unlogged: allowed. |
| `measureTarget(m,{date,jumuah})` | Hanafi `{kind:"rakahs", of:12}` (14 on a Jumuʿah Friday). Shāfiʿī and Hanbalī: 10. Mālikī: `{kind:"raghibahWitr", of:2}`. |
| `measuredItems(m, opts)` | The items that count toward the measure. |
| `chipLabel(item)` | "2 before", "4 after", "2 after Witr", "Awwābīn 4" |
| `tierLabel(tier)` | `{name, short, gloss, line, display}` from `strings.TIER` |
| `witrLabel(m)` | `{chip, tag, line, settingsLine, row, tier}` |
| `madhhabInfo(m)`, `madhhabOptions()`, `summary(m)` | Name, the one-line summary, and `isDefault`. Use these for the setup picker and the Settings sheet. |
| `measureLabel(m, got, of)` | `{title:"Emphasised"\|"Raghībah + Witr", value:"8/12"}` |
| `tierKey(m,{ghayr,nafl})` | The tier ids to show in the chip legend, ending with the Witr tier. |
| `isFriday(d)`, `middleOfNight(maghrib, nextFajr)` | |

**Needs scholar review** (`review: true`, not spelled out in madhhab-rules.md):
- Shāfiʿī and Hanbalī: 4 before ʿAsr (ghayr muʾakkadah), and the Jumuʿah list (2 before, 2 after).
- Mālikī: the full nāfilah muʾakkadah list (4 before and 4 after Zuhr, 4 before ʿAsr, 2 after Maghrib, 2 after ʿIshāʾ).

**Chip drawing:**
- `display: "solid"`: a filled chip.
- `display: "outline"`: an outlined chip.
- Nafl appears only with `sunnahNafl`.
- Witr gets its own chip with `tag`.
- Long-press opens the tier info: `tierLabel()` plus `glossary.gloss(TIERS[tier].glossary)`.

---

## 4. `src/times.js` (additions)
| Export | |
|---|---|
| `ASR` | Now `strings.ASR_LABEL`. `params()` falls back to the madhhab when `settings.asr` is missing. |
| `ishaBestBefore(date, settings)` | The middle of the night, from Maghrib(date) to Fajr(date+1). Use it for "Best before 11:02 PM". |
| `madeUpDeadline(date, settings)` | The next Fajr. |
| `canStillMakeUp(date, p, now, settings)` | True when the window is over and the next Fajr hasn't come. Use it for "I made it up" and the nudge. |
| `startedPrayers(date, now, settings)` | The prayers of `date` that have started. |
| `WEEK_START = 6` | Saturday |
| `weekIndex(date, start=6)` | Sat 0 … Fri 6 |
| `weekStartDate(date, offset, start)`, `weekDates(date, offset, start)`, `weekKey(date)`, `weeksBetween(a,b)` | |
| `weekRangeLabel(date, offset)` | "Sat 7 – Fri 13 Nov" |
| `manzilFor(date)` | Hizb manzil: Saturday is 1, Friday is 7. |

Day letters for a Saturday week: `strings.WEEK_LETTERS_SAT` = S S M T W T F.

---

## 5. `src/stats.js`
Excused prayers and excused days are left out of every percentage, and they never break a streak. Made up counts as prayed.

`opts.settings` (pass `S.settings`) makes today's prayers count as due once their time has started. Without it, today's unlogged prayers aren't counted.

| Function | Returns |
|---|---|
| `dayPct(S,date,now)` | 0..100, or null. Excused prayers are left out. The good deeds come from `amalForDay`. |
| `weekPcts(S,now,offset,start=1)` | The legacy Monday week. Pass `start=6` for Saturday. |
| `weekSeries(S,now,offset,{settings})` | **Saturday week** for Home's This week bars and the Progress week grid: `[{date, key, future, tracked, excused, pct, statuses:{Fajr: Status\|"unlogged"\|"future"\|null}, prayed, due}]`. `null` means today, started, not logged ("now"). |
| `statusCountsRange(S,from,to,now,{settings})` | "How you prayed": `{congregation, ontime, madeup, missed, excused, unlogged, prayed, due, excusedDays, days}` |
| `statusCounts(S,n,now,opts)` | The same, for the last n days. |
| `perPrayerCounts(S,from,to,now,opts)` | `{Fajr:{…counts}, …}`, used for the jamāʿah tiles. |
| `eachPrayerSeries(S,now,{days=30, from, to, settings})` | **CH1:** `[{p, name, counts, prayedPct, onTimePct, jamaahPct}]`. For the "67% in Sep, 80% in Oct" caption, call it once per month with `from`/`to`. |
| `prayerStreak`, `onTimeStreak`, `streaks(S,now)` | `{all:{cur,best}, onTime:{cur,best}}` |
| `sunnahMeasureDay(S,key)` | `{kind, got, of, excused}`. Hanafi Witr is never counted as a sunnah. |
| `sunnahRange(S,from,to,now)` | `{kind, got, of, pct, items:[{id, label, tier, display, tierName, done, due}], witr:{done, due, pct, inQada, tier}, excusedDays, days:[{key, measure}]}` |
| `isJumuahDay(S,date)` | For the "JUM" mark. |
| `amalDayState(S,key,id,now)` | `"done"\|"missed"\|"excused"\|"pending"\|"future"\|"untracked"`, for the habit strips. Recitation on an excused day is "excused". |
| `amalRates(S,n,now)` | `[{a, rate, days}]`. Excused days are left out for Qurʾān. "listen" and "dua" are rated over excused days only. |
| `qadaClearedTotal(S)` | The total for "56 restored". |
| `monthDays`, `yearMonths`, `congregationCount`, `qadaClearedInMonth`, `qadaClearedInYear`, `avg`, `amalStreak`, `tracked` | Unchanged. |
| `insights(S,now)` | `{good, warn}`. The wording now comes from `strings.INSIGHT`, using display names. It adds "Witr on n of the last 7 nights" (Hanafi). |

---

## 6. `src/features.js`
| Export | |
|---|---|
| `FEATURES` | `["prayers","sunnah","deeds","makeups","week","progress","tools"]` |
| `SWITCHABLE`, `TOOLS` | `TOOLS` is `["adhkar","durud","hizb","quran"]`. |
| `isOn(S,f)` | `"prayers"` is always true. |
| `setFeature(S,f,on)` | |
| `applyPreset(S,"all"\|"prayers")` | Setup's "Just prayers" preset. |
| `featureCount(S)` | `{on, of}`, for "7 of 7". |
| `featureRows(S)`, `toolRows(S)` | Rows for the Features and Tools settings pages, with names and subtitles. |
| `toolVisible(S,t)`, `setToolHidden(S,t,hidden)`, `visibleTools(S)` | |
| `navTabs(S)` | `[{id, label}]`. With everything on: Home · Tracker · Tools · Make-ups · Progress. With "Just prayers": Home · Tracker. |
| `defaultFeatures()`, `justPrayersFeatures()`, `normalizeFeatures(f)` | |

Turning a module off only hides it. A Missed prayer still adds to make-ups in the background. Features live in `S.settings`, so cloud sync works with **no change to cloud.js**.

---

## 7. `src/strings.js`
There is ONE file for every UI label. Every group below is a named export, and all of them are also on `STR` (the default export).

| Group | What it holds |
|---|---|
| `APP` | Name, mission, the draft flag. |
| `NAV` | `qada` → "Make-ups". |
| `COMMON` | Shared words and helpers. |
| `PRAYER_NAME`, `prayerName(p,{date,jumuah})` | Fajr, Zuhr, ʿAsr, Maghrib, ʿIshāʾ, Jumuʿah. |
| `STATUS`, `STATUS_SHORT`, `STATUS_HELP`, `STATUS_EXTRA`, `WITR_STATUS` | Status labels and help lines. |
| `MADHHAB_NAME`, `MADHHAB_SUMMARY`, `MADHHAB_UI`, `ASR_LABEL`, `ASR_UI` | Madhhab and ʿAsr wording. |
| `TIER`, `WITR_TAG`, `WITR_UI`, `SUNNAH_NAME`, `SUNNAH_UI`, `MEASURE` | Sunnah tiers, Witr and the measure. |
| `TIMES`, `HOME`, `EXCUSED`, `DEEDS`, `DEED_NAME`, `DEED_HINT`, `TRACKER`, `LOG`, `MAKEUPS`, `PROGRESS`, `INSIGHT` | Screen text. |
| `FEATURE`, `TOOL_NAME`, `TOOL_SUB`, `TOOLS_UI`, `WEEK_UI`, `WEEK_LETTERS_SAT`, `WEEK_LETTERS_MON` | Features, Tools and This week. |
| `NOTIFY`, `SETTINGS`, `SETUP` | Notifications, Settings and setup. |

All the current strings from `src/views/*.js` are already in it, reworded (Good Deeds, Make-ups, light transliteration). Strings that take values are functions, for example `LOG.missedToast("ʿAsr")`. `SETTINGS.consentLine` holds `{terms}` and `{privacy}` placeholders for the links.

**Spelling choices for the user to confirm:**
- Duʿāʾ, istighfār, adhkār, durūd, salawāt;
- Sīrah, Hadīth, Āyah, Sahābī;
- rakʿah;
- Hanafī, Shāfiʿī, Mālikī, Hanbalī.

---

## 8. `src/glossary.js`
- `GLOSSARY[id] = {term, ar, meaning, draft:true}`.
- The ids are: `salah`, `fard`, `wajib`, `sunnah`, `sunnahMuakkadah`, `ghayrMuakkadah`, `nafl`, `witr`, `jamaah`, `jumuah`, `awwabin`, `ishraq`, `duha`, `tahajjud`, `qada`, `madhhab`, `hayd`, `adhkar`, `durud`, `salawat`, `hizb`, `manzil`, `para`, `mushaf`, `raghibah`, `nafilahMuakkadah`, `akhirah`, `rakah`, `zad`, `dua`, `istighfar` and `sadaqah`.
- `gloss(id)`: the entry for an id.
- `glossaryFor(term)`: finds an entry by the term as shown. It ignores case, ʿ ʾ and macrons, so "Jamāʿah" and "jamaah" both work.
- `GLOSSARY_IDS`: all the ids.
- While `draft` is true, show `APP.draftFlag` in the "?" pop-up.

## 9. `src/content.js`
`thisWeek(date)` uses the Saturday week, and items rotate by Saturday-week and by month. It returns the same content keys as before, plus `weekKey`, `weekStart`, `weekEnd`, `weekIndex` and `rangeLabel`. `weekNumber(date)` gives the rotation index.

---

## 10. Typical calls
```js
// prayer log sheet
const status = store.prayerStatus(S, key, p);
const chips = store.sunnahChips(S, key, p);              // [] when Missed
const witr = p === "Isha" ? store.witrChip(S, key) : null;
store.setPrayer(S, key, p, "madeup", NOW()); commit();
toast(was === "missed" ? LOG.removedToast(prayerName(p), STATUS.madeup) : LOG.setToast(prayerName(p), STATUS.madeup));

// chip tap
if (!store.setSunnah(S, key, id, !chip.done)) toast(SUNNAH_UI.notAfterMissed); else commit();

// Home: the Isha card
const best = ishaBestBefore(cur.date, S.settings); // TIMES.bestBefore(fmt12(best))

// Home: This week bars (Saturday first)
st.weekSeries(S, NOW(), 0, { settings: S.settings });

// Progress Week
const [a, b] = [weekDates(NOW())[0], NOW()];
st.statusCountsRange(S, a, b, NOW(), { settings: S.settings });
st.sunnahRange(S, a, b, NOW());
st.streaks(S, NOW());
```
