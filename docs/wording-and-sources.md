# Wording and sources: proposals awaiting the user's approval (7 Nov 2026)

Nothing here is applied yet. The user asked to see the list before any change is made.

## 1. English-first wording

**Rule:** the English word is the main label everywhere. The Arabic term may appear small, in info sheets.

**Suggestion:** a Settings switch, "Use Arabic terms", that swaps the labels back.

### Changes proposed

| Now | Proposed |
|---|---|
| Amal | Actions (nav bar, Home, Progress, Settings "Actions list", "Add an action") |
| Qada | Make-ups (nav bar, screen title, "Added to make-ups", setup step) |
| Salah today | Prayers today |
| Jama'ah (status) | In congregation |
| Fard | Obligatory |
| Wajib (Witr) | Necessary |
| Sunnah mu'akkadah / ghayr mu'akkadah / nafl | Emphasised sunnah / Non-emphasised sunnah / Voluntary |
| Raghibah (Maliki) | Highly desired |
| Madhhab | School of thought |
| Hayd / nifas | Excused days (menstruation or postnatal bleeding) |
| Adhkar / dhikr | Morning & evening remembrance / Remembrance |
| Durud | Blessings on the Prophet ﷺ ("Forty blessings") |
| Istighfar | Seeking forgiveness |
| Dua | Supplication (open question: keep "Dua"?) |
| Tahajjud / Duha / Ishraq | Night prayer / Mid-morning prayer / Sunrise prayer |
| Mushaf | Quran style |
| Para / Juz | Part (with "Para 5" or "Juz 5" shown small) |
| Manzil | Day 1 to 7 |
| Ākhirah | Hereafter |

### Kept as they are
These are names, or are widely known:
- Allah
- Quran
- Fajr, Dhuhr, Asr, Maghrib, Isha
- Witr
- Sunnah, as "Sunnah prayers"
- Jumu'ah (or "Friday prayer"?)
- Awwabin
- Ramadan and the Hijri months
- Zad
- Hizb al-A'zam, with an English subtitle

## 2. Sources and method

**Method:**
- Every item stores its exact source: book, edition, and number or page.
- Claude drafts only from sources on the approved list.
- The user reviews each item, and a second scholar checks it.
- Each item carries an "approved" mark, and nothing ships without one.
- No gradings.

| Content | Proposed source | Status |
|---|---|---|
| Quran Arabic | Free IndoPak digital text laid out to match Taj Company 13- and 15-line pages; Tanzil Uthmani for the 15-line Uthmani | Checked against the Taj print |
| Quran translation | Mufti Taqi Usmani (main); M.A.S. Abdul Haleem, published by OUP (second) | Both copyrighted, so permission is needed |
| Hadith Arabic | The primary collections only: Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasa'i, Ibn Majah, Muwatta, Ahmad. Numbering as on Sunnah.com | Edition to confirm |
| Hadith English | Our own wording | User reviews |
| Adhkar | The user's four screenshots; references from the primary books, al-Adhkar (Nawawi), 'Amal al-Yawm wal-Laylah (Ibn al-Sunni) | |
| Forty durud | The user's PDF (Shaykh Zakariya) | |
| Hizb al-A'zam | Mulla Ali al-Qari's text | Edition needed |
| Seerah | Ibn Hisham; Seerat al-Mustafa (Idris Kandhlawi); ar-Raheeq al-Makhtum | User picks |
| Sahabah | al-Isabah (Ibn Hajar); Siyar A'lam an-Nubala (Dhahabi); Hayat as-Sahabah (Yusuf Kandhlawi) | User picks |
| Fiqh rulings | Hanafi: Nur al-Idah with Maraqi al-Falah; Radd al-Muhtar. Other schools: to name | User picks |
| The 60 reflections in `src/reflections.js` | Re-source each from the approved list, or remove it | |
| Prayer-time method | Proposed default: University of Islamic Sciences, Karachi | User decides |
