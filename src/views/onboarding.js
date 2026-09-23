import { S, UI, A, $, NOW, todayKey, onRender, commit, go, toast } from "../app.js";
import { PRAYERS, esc } from "../util.js";
import { currentPosition, cityName } from "../platform.js";
import { FALLBACK_LOCATION } from "../times.js";

let step = 0;
const STEPS = 4;
const pattern = `<svg class="pattern" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice"><rect width="100%" height="100%" fill="url(#st)"/></svg>`;

function frame(body, primary, secondary = "") {
  return `<div class="onb">${pattern}<div class="onb-inner">
    <div class="logo">☾</div>
    <div class="steps">${Array.from({ length: STEPS }, (_, i) => `<i class="${i <= step ? "on" : ""}"></i>`).join("")}</div>
    ${body}<div class="grow"></div>${primary}${secondary}</div></div>`;
}

function stepName() {
  return frame(`<h1>Assalamu alaikum</h1><p class="lead">Track your five prayers, your daily amal and the qada you're making up, all on this phone. Nothing leaves your device.</p>
    <div class="panel"><div class="field"><label>What should we call you?</label><input id="obName" value="${esc(S.profile.name)}" placeholder="Your name" autocomplete="given-name"></div></div>`,
    `<button class="btn primary" onclick="A.obNext()">Continue</button>`);
}

function stepLocation() {
  const loc = S.settings.location;
  return frame(`<h1>Prayer times</h1><p class="lead">Times are calculated on your phone from your location, so they work without internet. The default method is ISNA; you can change it in Settings.</p>
    <div class="panel"><div class="field"><label>Location</label><div style="font-size:15px;font-weight:600">${loc ? esc(loc.label) : "Not set yet"}</div>
    <small class="muted" style="font-size:12px">${loc ? `${loc.lat.toFixed(3)}, ${loc.lng.toFixed(3)}` : `Until you set it, times use ${FALLBACK_LOCATION.label}.`}</small></div></div>`,
    loc ? `<button class="btn primary" onclick="A.obNext()">Continue</button>` : `<button class="btn primary" onclick="A.obGps()">Use my location</button>`,
    loc ? `<button class="btn ghost" onclick="A.obGps()">Update location</button>` : `<button class="btn ghost" onclick="A.obNext()">Skip for now</button>`);
}

function stepQada() {
  const q = S.qada;
  return frame(`<h1>What you owe</h1><p class="lead">An honest estimate is enough. After today the balance moves on its own: missed prayers add, made-up ones subtract.</p>
    <div class="panel">
      <div class="field"><label>Quick fill: years of prayers and fasts missed</label><div style="display:flex;gap:8px"><input id="obYears" type="number" inputmode="decimal" min="0" step="0.5" placeholder="e.g. 2"><button class="btn ghost" style="flex:none;padding:12px 14px;background:var(--ivory);color:var(--ink2);margin:0;width:auto" onclick="A.obYears()">Fill</button></div></div>
      <div class="qgrid" style="margin-top:14px">${[...PRAYERS, "fasts"].map(p => `<div class="field"><label>${p === "fasts" ? "Fasts" : p}</label><input type="number" inputmode="numeric" min="0" id="ob_${p}" value="${q[p]}"></div>`).join("")}</div>
    </div>`,
    `<button class="btn primary" onclick="A.obSaveQada();A.obNext()">Continue</button>`,
    `<button class="btn ghost" onclick="A.obNext()">I don't owe any</button>`);
}

function stepGoal() {
  return frame(`<h1>A monthly goal</h1><p class="lead">Pick something you can finish. Small and steady beats big and abandoned. You can change it any time.</p>
    <div class="panel">
      <div class="field"><label>Makeup prayers this month</label><div class="stepper"><button onclick="A.stepG('g',-5)">−</button><b id="gP">${S.qada.goal}</b><button onclick="A.stepG('g',5)">+</button></div></div>
      <div class="field"><label>Makeup fasts this month</label><div class="stepper"><button onclick="A.stepG('f',-1)">−</button><b id="gF">${S.qada.fastGoal}</b><button onclick="A.stepG('f',1)">+</button></div></div>
    </div>`,
    `<button class="btn primary" onclick="A.obFinish()">Start tracking</button>`);
}

let drawn = "";
function draw() {
  // Only redraw when the step or location changes, so the minute timer doesn't wipe what's being typed
  const sig = `${step}|${JSON.stringify(S.settings.location)}`;
  if (sig === drawn && $("#v-onboard").firstChild) return;
  drawn = sig;
  $("#v-onboard").innerHTML = [stepName, stepLocation, stepQada, stepGoal][step]();
}

A.obNext = () => {
  if (step === 0) { S.profile.name = $("#obName").value.trim(); }
  step = Math.min(STEPS - 1, step + 1);
  commit();
};
A.obGps = async () => {
  toast("Finding your location…");
  try {
    const { lat, lng } = await currentPosition();
    S.settings.location = { lat, lng, label: await cityName(lat, lng) };
    commit();
  } catch (e) { toast("Couldn't get your location. You can set it later in Settings."); }
};
A.obYears = () => {
  const y = parseFloat($("#obYears").value) || 0;
  // A lunar year is ~354 days of five prayers, plus one Ramadan of fasts
  for (const p of PRAYERS) $(`#ob_${p}`).value = Math.round(y * 354);
  $("#ob_fasts").value = Math.round(y * 30);
};
A.obSaveQada = () => { for (const p of [...PRAYERS, "fasts"]) S.qada[p] = Math.max(0, parseInt($(`#ob_${p}`).value) || 0); };
A.obFinish = () => {
  S.qada.goal = +$("#gP").textContent; S.qada.fastGoal = +$("#gF").textContent;
  S.profile.onboarded = true;
  S.createdKey = todayKey();
  step = 0; drawn = "";
  commit();
  go("home");
  toast(S.profile.name ? `Welcome, ${S.profile.name}` : "Welcome");
};

onRender(() => { if (UI.view === "onboard") draw(); });
export function startOnboarding() { step = 0; drawn = ""; go("onboard"); }
A.startOnboarding = startOnboarding;
