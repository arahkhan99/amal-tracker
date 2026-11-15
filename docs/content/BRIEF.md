# Content brief: Home cards from the source books

App: Zad, a free Muslim worship tracker. The app's purpose: "helping Muslims intentionally prepare provisions for the Ākhirah through consistency, accountability, and daily worship." The audience is ordinary Muslims of every level, mostly Hanafi, in South Asia and the diaspora.

## Sources (local only, never copied into the repo as files)
Folder: `C:\Users\chito\zad-sources\` (see its README.md)
- hadith/Riyad-us-Saliheen-English.pdf: a SCAN of 1255 pages. Render pages with
  `node C:/Users/chito/amal-tracker/design-review/hizb-work/m1/render.cjs "<pdf>" "<outdir>" 1.3 <from> <to> <prefix>`
  (put outdir in your scratchpad), then Read the jpgs.
- hadith/MaarifulHadithVolume1.pdf, MaarifulHadithVolume3.pdf, 370ProvisionsForTheSeekerzadUtTalibeen.pdf: text. Use `pdftotext -layout -f A -l B file -`.
- sirah/Seeratul Mustafa Abridged.pdf: text.
- sahabah/hayat/*.pdf (Hayat al-Sahabah, English, 3 parts): text. Printed page = PDF + 2, except vol. 2 up to about pdf p. 134, where it is PDF + 1. Always check the page header.
- sahabah/isabah-1/*.pdf (al-Isabah, Arabic, 8 vols): a SCAN. Use it only to look up particular entries, using render.cjs.
- fiqh/Ascent to Felicity.pdf: text.

## Hard rules
1. **Everything must come from these books.** Never add anything from memory. Every item cites book, volume or part, and the page as PRINTED in the book (also give the PDF page, as `pdf p. N`). If you can't find a page for an item, drop the item.
2. **Use our own wording.** These are copyrighted modern translations. Rewrite in plain, accurate English and never copy their English sentences. Short fixed phrases are fine, and so are the words of a hadith where a literal rendering is unavoidable, but keep them short. Stay faithful to the meaning and never add to it.
3. **Arabic** is optional. Include it only when the book prints it as selectable text, copied character for character. Never type Arabic yourself, and never take it from a scan.
4. **No hadith gradings.** Don't write "sahih", "hasan", "weak" or similar. You may name the collection the book cites (Bukhari, Muslim, Tirmidhi…), as the book gives it.
5. **No repeats** within your set.
6. **Tone:** gentle and encouraging, matching the app's theme of consistency, accountability, worship and preparing for the Ākhirah. Leave out fiqh disputes and politically charged material. Avoid anything about the fitnah between the Sahabah.
7. **Style:**
   - Use light academic transliteration: macrons and ʿ ʾ, no dots under letters. Examples: Allah, the Prophet ﷺ (write "the Prophet ﷺ"), Qurʾān, ṣalāh → "salāh", Ākhirah, Abū Bakr → "Abū Bakr".
   - Use "ʿAlī", "ʿUmar", "ʿĀʾishah", and "raḍiyallāhu ʿanhu" → "(may Allah be pleased with him)" only on first mention per item, or not at all.
   - British/plain English, short sentences.
8. Do NOT touch any file in the repo other than your own output file. Never commit, push or deploy.
9. When finished, run a self-check: re-open each cited page and confirm the item matches. Then report the count, the items you dropped, and any doubts.

## Output format (Markdown, one `###` block per item)
```
### <ID>
- **Title:** (if the set uses titles)
- **Arabic:** (optional, see rule 3)
- **Text:** our English
- **Narrator:** (hadith only, as the book gives it)
- **Collection:** (hadith only, as the book cites it, e.g. "Bukhari and Muslim")
- **Source:** Book name, vol/part, p. N (pdf p. M)
- **Note:** (optional, for the reviewer: anything uncertain)
```

## Approach (internal: never mention it in the app's text)
All wording follows the Hanafi Deobandi approach:
- **ʿAqīdah:** follow the Māturīdī/Ashʿarī way. For Allah's attributes (yad, wajh, istiwāʾ, nuzūl, etc.), don't use wording that suggests a body, place or direction. Either keep the Arabic term ("His Yad") or follow the Deobandi translators: Mufti Taqi Usmani, Mawlānā Thānawī, Mawlānā Manẓūr Nuʿmānī (the author of Maʿārif al-Ḥadīth).
- **Fiqh:** practical advice must agree with the Hanafi school, as Ascent to Felicity and Maʿārif al-Ḥadīth explain it. Leave out a hadith that, as written, seems to teach a non-Hanafi practice (e.g. rafʿ al-yadayn, loud āmīn, Witr as one rakʿah) unless the book itself explains it the Hanafi way, and then follow that explanation.
- **Ṣaḥābah:** all of them are upright (ʿudūl). Speak of every Companion with respect and never in a way that faults one of them.
- **The Prophet ﷺ:** treat him with full adab: "the Prophet ﷺ", "the Messenger of Allah ﷺ".
- **Tasawwuf:** where the books mention dhikr, the heart, sincerity, scholars and pious people, present it positively and in a balanced way, as the books do.
- **When a book's own commentary explains a hadith** (as Nuʿmānī often does), follow that explanation.

## Sahabi order (user, 13 Nov)
The months go in order of rank: the four caliphs in order, then the rest of the Ten Promised Paradise (as listed in the hadith: Ṭalḥah, al-Zubayr, ʿAbd al-Raḥmān ibn ʿAwf, Saʿd ibn Abī Waqqāṣ, Saʿīd ibn Zayd, Abū ʿUbaydah), then the others. The first month shown in the app is Abū Bakr. The list continues month by month and starts again at the end. It doesn't follow a fixed calendar month.
Proposed order after the Ten: Khadījah, Fāṭimah, ʿĀʾishah, Bilāl, Muṣʿab, Muʿādh, Salmān, Abū Dharr (18 months in all).
