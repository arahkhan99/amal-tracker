/* Community (#v-community): only with Zad Plus (S.settings.plus, features.plusOn). Premium isn't built yet,
   so this is a placeholder page; Leaderboard · Circles · Family · Mentoring come later. */
import { UI, $, onRender, avatarBtn } from "../app.js";
import { esc } from "../util.js";
import { NAV, TODAY } from "../strings.js";

onRender(() => {
  if (UI.view !== "community") return;
  const el = $("#v-community"); if (!el) return;
  el.innerHTML = `<div class="zc"><div class="zt-top page"><span class="zt-pg">${esc(NAV.community)}</span>${avatarBtn()}</div>
    <header class="zt-chh"><h1 class="zt-title">${esc(NAV.community)}</h1><p class="zt-sub">${esc(TODAY.communityLead)}</p></header>
    <div class="zt-card pad"><p class="zt-note">${esc(TODAY.communitySoon)}</p></div></div>`;
});
