# Madhhab rules (reviewed by the user, an Islamic scholar, on 5 Nov 2026)

These rules decide the app's Asr time, the sunnah list for each madhhab and its labels, and how Witr is treated. They are the source of truth for the code. Don't change them without the user's review.

Hanafi is the default. Users can switch in setup or in Settings → Madhhab.

## One-line summaries (setup and Settings)

| Madhhab | Line |
|---|---|
| Hanafi | Later Asr · 12 emphasised sunnahs · Witr is wajib |
| Shafi'i | Earlier Asr · 10 emphasised sunnahs · Witr is sunnah |
| Hanbali | Earlier Asr · 10 emphasised sunnahs · Witr is sunnah |
| Maliki | Earlier Asr · Witr is sunnah · 2 before Fajr are raghibah |

## Details

### Hanafi
- **Asr:** begins when an object's shadow is twice its length (plus the midday shadow). This is the later time, `Madhab.Hanafi` in adhan.
- **12 emphasised daily sunnahs (sunnah mu'akkadah, the rawatib):**
  - 2 before Fajr
  - 4 before Dhuhr
  - 2 after Dhuhr
  - 2 after Maghrib
  - 2 after Isha
- **Jumu'ah:** 4 before and 4 after.
- **Ghayr mu'akkadah:** 4 before Asr, 4 before Isha.
- **Nafl:** 2 more after Dhuhr; Awwabin, which is 4 more after the 2 of Maghrib (6 in all); 2 after Witr.
- **Witr:** wajib (obligatory in practice, but distinct from fard in Hanafi terminology). A missed Witr is owed, so it is counted in qada.

### Shafi'i
- **Asr:** begins when the shadow equals the object's length. This is the earlier time.
- **10 emphasised sunnahs (mu'akkadah):** 2 before Fajr, 2 before Dhuhr, 2 after Dhuhr, 2 after Maghrib, 2 after Isha. Before Dhuhr is 2, not 4.
- **Witr:** sunnah mu'akkadah, not wajib. It isn't counted in qada.

### Hanbali
- **Asr:** the earlier time.
- **10 emphasised sunnahs:** the same as Shafi'i, based on the narration of Ibn Umar. A secondary position in the school aligns with 12, but 10 is the madhhab default.
- **Witr:** sunnah mu'akkadah. It isn't counted in qada.

### Maliki
Its own taxonomy; **don't use the rawatib structure or the term "sunnah mu'akkadah" for it.**
- **Asr:** the earlier time.
- **Witr:** the only daily prayer formally categorised as **Sunnah**. It isn't counted in qada.
- **2 before Fajr (Subh):** **Raghibah**, a rank above an ordinary voluntary prayer (nafilah) and slightly below a formal sunnah.
- **4 before or after Dhuhr, 4 before Asr, etc.:** **Nafilah mu'akkadah** (emphasised voluntary prayers).
- **Chip labels for Maliki users:** Sunnah (Witr), Raghibah (Fajr), Nafilah mu'akkadah (the others).
- **The sunnah measure on Progress for Maliki users:** "Raghibah + Witr" rather than "x/12" or "x/10".

## Rulings confirmed by the user (5 Nov 2026)
- **Missed prayer:** a fard marked Missed shows no sunnah chips, because its sunnah isn't made up with it.
- **Made-up Fajr:** it may keep its "2 before" chip (the Hanafi view that it is made up with the fard before zawal). This is optional and not required.
- **Excused days (hayd/nifas):** the amal "Quran recitation" becomes "Listen to Qur'an", alongside dua and istighfar. Progress shows recitation as excused, not missed.
- **Isha:** show "best before" the middle of the night, counted from Maghrib to Fajr.
