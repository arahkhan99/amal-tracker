// Light academic transliteration of the surah names (macrons + ʿ and ʾ only, no dots under letters),
// per the Zad wording rule. Draft, pending scholar review.
export const SURAH_TR = [
  "Al-Fātihah", "Al-Baqarah", "Āl ʿImrān", "An-Nisāʾ", "Al-Māʾidah", "Al-Anʿām", "Al-Aʿrāf", "Al-Anfāl", "At-Tawbah", "Yūnus",
  "Hūd", "Yūsuf", "Ar-Raʿd", "Ibrāhīm", "Al-Hijr", "An-Nahl", "Al-Isrāʾ", "Al-Kahf", "Maryam", "Tā Hā",
  "Al-Anbiyāʾ", "Al-Hajj", "Al-Muʾminūn", "An-Nūr", "Al-Furqān", "Ash-Shuʿarāʾ", "An-Naml", "Al-Qasas", "Al-ʿAnkabūt", "Ar-Rūm",
  "Luqmān", "As-Sajdah", "Al-Ahzāb", "Sabaʾ", "Fātir", "Yā Sīn", "As-Sāffāt", "Sād", "Az-Zumar", "Ghāfir",
  "Fussilat", "Ash-Shūrā", "Az-Zukhruf", "Ad-Dukhān", "Al-Jāthiyah", "Al-Ahqāf", "Muhammad", "Al-Fath", "Al-Hujurāt", "Qāf",
  "Adh-Dhāriyāt", "At-Tūr", "An-Najm", "Al-Qamar", "Ar-Rahmān", "Al-Wāqiʿah", "Al-Hadīd", "Al-Mujādilah", "Al-Hashr", "Al-Mumtahanah",
  "As-Saff", "Al-Jumuʿah", "Al-Munāfiqūn", "At-Taghābun", "At-Talāq", "At-Tahrīm", "Al-Mulk", "Al-Qalam", "Al-Hāqqah", "Al-Maʿārij",
  "Nūh", "Al-Jinn", "Al-Muzzammil", "Al-Muddaththir", "Al-Qiyāmah", "Al-Insān", "Al-Mursalāt", "An-Nabaʾ", "An-Nāziʿāt", "ʿAbasa",
  "At-Takwīr", "Al-Infitār", "Al-Mutaffifīn", "Al-Inshiqāq", "Al-Burūj", "At-Tāriq", "Al-Aʿlā", "Al-Ghāshiyah", "Al-Fajr", "Al-Balad",
  "Ash-Shams", "Al-Layl", "Ad-Duhā", "Ash-Sharh", "At-Tīn", "Al-ʿAlaq", "Al-Qadr", "Al-Bayyinah", "Az-Zalzalah", "Al-ʿĀdiyāt",
  "Al-Qāriʿah", "At-Takāthur", "Al-ʿAsr", "Al-Humazah", "Al-Fīl", "Quraysh", "Al-Māʿūn", "Al-Kawthar", "Al-Kāfirūn", "An-Nasr",
  "Al-Masad", "Al-Ikhlās", "Al-Falaq", "An-Nās",
];
if (SURAH_TR.length !== 114) throw new Error("SURAH_TR must have 114 names");

// Para starts in South Asian (IndoPak) mushafs, Hafs/Kufi ayah numbers. They match the Arab juz
// starts except paras 4, 7, 11, 14, 20, 21 and 23, which begin a few ayahs earlier or later than the Tanzil (Arab) juz starts
// (Lan tanālū 3:92, Wa idhā samiʿū 5:83, Yaʿtadhirūn 9:94, Rubamā 15:2, Amman khalaqa 27:60,
// Utlu mā ūhiya 29:45, Wa mā liya 36:22). The build checks each one starts a page in the layout.
export const INDOPAK_PARA_STARTS = [
  [1, 1], [2, 142], [2, 253], [3, 92], [4, 24], [4, 148], [5, 83], [6, 111], [7, 88], [8, 41],
  [9, 94], [11, 6], [12, 53], [15, 2], [17, 1], [18, 75], [21, 1], [23, 1], [25, 21], [27, 60],
  [29, 45], [33, 31], [36, 22], [39, 32], [41, 47], [46, 1], [51, 31], [58, 1], [67, 1], [78, 1],
];
