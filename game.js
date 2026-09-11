/* =========================================================================
   ATHIRST — core loop + progression tracks + spout transition
   All tunable numbers live in CONFIG. Track rewards mutate CONFIG directly
   so every site's footnote/rate always reflects the current upgraded value.
   No save/persistence by design — every page load starts fresh.
   ========================================================================= */

const CONFIG = {
  startingPopulation: 6,
  startingWater: 12,

  waterPerWellWorker: 4,
  waterConsumedPerPerson: 2,

  productionPerConstructionWorker: 3,
  researchPerResearchWorker: 3,
  productionPerEngineeringWorker: 5,
  researchPerScholarWorker: 5,

  growthDivisor: 5,   // +1 population per this many net-surplus water in a turn
  deathDivisor: 3,    // higher = gentler die-off during a shortage

  postSpoutGrowthPct: 0.04, // 4% population growth per turn once the spout is built

  constructionUnlockPopulation: 5,
  researchUnlockPopulation: 10,
};

/* --------------------------- Progression tracks -------------------------
   Cumulative totals move along these lists. Each threshold is claimed once,
   in order, applying a permanent effect to CONFIG/state. The Water Spout is
   simply the milestone at 150 production — not a separate system.
   ------------------------------------------------------------------------- */
const PRODUCTION_TRACK = [
  { at: 20, name: 'Sturdier Buckets', desc: '+1 water per Water Collection worker.',
    apply: () => { CONFIG.waterPerWellWorker += 1; } },
  { at: 60, name: 'Skilled Builders', desc: '+1 production per Construction worker.',
    apply: () => { CONFIG.productionPerConstructionWorker += 1; } },
  { at: 110, name: 'Deeper Wells', desc: '+2 water per Water Collection worker.',
    apply: () => { CONFIG.waterPerWellWorker += 2; } },
  { at: 150, name: 'Water Spout', desc: 'Water becomes limitless — everyone can be reassigned.',
    isSpout: true, apply: () => { state.spoutBuilt = true; state.water = Infinity; } },
  { at: 250, name: 'Engineering Techniques', desc: '+2 production per Engineering worker.',
    apply: () => { CONFIG.productionPerEngineeringWorker += 2; } },
];

const RESEARCH_TRACK = [
  { at: 15, name: 'Better Hydration Habits', desc: '-1 water consumed per person.',
    apply: () => { CONFIG.waterConsumedPerPerson = Math.max(1, CONFIG.waterConsumedPerPerson - 1); } },
  { at: 40, name: 'Community Planning', desc: 'Population grows more easily from surplus.',
    apply: () => { CONFIG.growthDivisor = Math.max(2, CONFIG.growthDivisor - 1); } },
  { at: 80, name: 'Resilience', desc: 'Shortages cost fewer lives.',
    apply: () => { CONFIG.deathDivisor += 1; } },
  { at: 130, name: "Scholars' Wisdom", desc: '+2 research per Scholars worker.',
    apply: () => { CONFIG.researchPerScholarWorker += 2; } },
  { at: 190, name: 'Advanced Irrigation', desc: '+2 water per Water Collection worker.',
    apply: () => { CONFIG.waterPerWellWorker += 2; } },
];

/* ------------------------------ Site scenes ------------------------------ */
const SCENES = {
  construction: `<svg viewBox="0 0 200 120" class="scene-svg">
    <rect x="0" y="90" width="200" height="30" class="ground"/>
    <rect x="55" y="55" width="90" height="40" class="hut-body"/>
    <polygon points="45,55 100,25 155,55" class="hut-roof"/>
    <rect x="90" y="70" width="20" height="25" class="hut-door"/>
  </svg>`,
  research: `<svg viewBox="0 0 200 120" class="scene-svg">
    <rect x="0" y="90" width="200" height="30" class="ground"/>
    <polygon points="60,95 100,40 140,95" class="tent-body"/>
    <polygon points="90,95 100,70 110,95" class="tent-flap"/>
    <rect x="140" y="75" width="30" height="20" rx="2" class="tent-scroll"/>
    <line x1="145" y1="82" x2="165" y2="82" stroke="#5B4E44" stroke-width="1.5"/>
    <line x1="145" y1="87" x2="165" y2="87" stroke="#5B4E44" stroke-width="1.5"/>
  </svg>`,
  engineering: `<svg viewBox="0 0 200 120" class="scene-svg">
    <rect x="0" y="90" width="200" height="30" class="ground"/>
    <rect x="45" y="55" width="80" height="40" class="hut-body"/>
    <polygon points="35,55 85,25 135,55" class="hut-roof"/>
    <circle cx="155" cy="75" r="20" class="gear-body"/>
    <circle cx="155" cy="75" r="12" class="gear-ring"/>
    <circle cx="155" cy="75" r="4" class="gear-hub"/>
  </svg>`,
  scholars: `<svg viewBox="0 0 200 120" class="scene-svg">
    <rect x="0" y="90" width="200" height="30" class="ground"/>
    <rect x="50" y="55" width="100" height="40" class="temple-body"/>
    <polygon points="40,55 100,28 160,55" class="temple-roof"/>
    <rect x="60" y="60" width="10" height="30" class="temple-column"/>
    <rect x="95" y="60" width="10" height="30" class="temple-column"/>
    <rect x="130" y="60" width="10" height="30" class="temple-column"/>
  </svg>`,
};

/* ---------------------- Assignable site definitions ----------------------
   The Water Well itself is bespoke in the HTML (it's the leftover pool with
   no +/- of its own). Everything else is generated from this list.
   ------------------------------------------------------------------------- */
const SITE_DEFS = [
  {
    id: 'construction', label: 'Construction', resource: 'production',
    rateKey: 'productionPerConstructionWorker',
    unlocked: () => state.population >= CONFIG.constructionUnlockPopulation,
    lockedText: () => `Available at Population ${CONFIG.constructionUnlockPopulation}`,
  },
  {
    id: 'research', label: 'Research', resource: 'research',
    rateKey: 'researchPerResearchWorker',
    unlocked: () => state.population >= CONFIG.researchUnlockPopulation,
    lockedText: () => `Available at Population ${CONFIG.researchUnlockPopulation}`,
  },
  {
    id: 'engineering', label: 'Engineering', resource: 'production',
    rateKey: 'productionPerEngineeringWorker',
    unlocked: () => state.spoutBuilt,
    lockedText: () => `Unlocks once the Water Spout is built`,
  },
  {
    id: 'scholars', label: "Scholars' Hall", resource: 'research',
    rateKey: 'researchPerScholarWorker',
    unlocked: () => state.spoutBuilt,
    lockedText: () => `Unlocks once the Water Spout is built`,
  },
];

/* --------------------------------- State --------------------------------- */
const state = {
  population: CONFIG.startingPopulation,
  water: CONFIG.startingWater,
  productionTotal: 0,
  researchTotal: 0,
  turn: 1,
  workers: { construction: 0, research: 0, engineering: 0, scholars: 0 },
  productionMilestoneIndex: 0,
  researchMilestoneIndex: 0,
  spoutBuilt: false,
  winModalShown: false,
  gameOver: false,
  shownTurn3Toast: false,
};

/* ---------------------------- DOM references ---------------------------- */
const el = {
  startScreen: document.getElementById('start-screen'),
  gameScreen: document.getElementById('game-screen'),
  playBtn: document.getElementById('play-btn'),
  howtoBtn: document.getElementById('howto-btn'),
  howtoModal: document.getElementById('howto-modal'),
  closeHowto: document.getElementById('close-howto'),
  resetBtn: document.getElementById('reset-btn'),

  counterPopulation: document.getElementById('counter-population'),
  counterWater: document.getElementById('counter-water'),
  counterResearch: document.getElementById('counter-research'),
  counterProduction: document.getElementById('counter-production'),
  waterBankValue: document.getElementById('water-bank-value'),

  toast: document.getElementById('notification-toast'),

  wellWorkerBadge: document.getElementById('well-worker-badge'),
  wellVillagers: document.getElementById('well-villagers'),
  wellFootnote: document.getElementById('well-footnote'),

  assignableSites: document.getElementById('assignable-sites'),

  productionTrackText: document.getElementById('production-track-text'),
  productionTrackFill: document.getElementById('production-track-fill'),
  productionTrackNext: document.getElementById('production-track-next'),
  researchTrackText: document.getElementById('research-track-text'),
  researchTrackFill: document.getElementById('research-track-fill'),
  researchTrackNext: document.getElementById('research-track-next'),

  turnNumber: document.getElementById('turn-number'),
  endTurnBtn: document.getElementById('end-turn-btn'),

  winModal: document.getElementById('win-modal'),
  continueAfterWin: document.getElementById('continue-after-win'),
  loseModal: document.getElementById('lose-modal'),
  restartBtn: document.getElementById('restart-btn'),
};

/* ------------------------------- Helpers -------------------------------- */
function assignedElsewhere() {
  return Object.values(state.workers).reduce((a, b) => a + b, 0);
}

function wellWorkers() {
  return state.population - assignedElsewhere();
}

function signed(n) {
  return (n > 0 ? '+' : '') + n;
}

function villagerSVG(bodyClass) {
  return `<svg class="villager-icon" viewBox="0 0 20 26" aria-hidden="true">
    <circle class="v-head" cx="10" cy="6" r="6"/>
    <path class="v-body" style="fill:${bodyClass}" d="M2 26 C 2 16, 5 13, 10 13 C 15 13, 18 16, 18 26 Z"/>
  </svg>`;
}

const SITE_COLORS = {
  well: '#145DA0',
  construction: '#8B5A2B',
  research: '#6E4620',
  engineering: '#4A5A5F',
  scholars: '#E0AD00',
};

function renderVillagers(container, count, colorKey) {
  const cap = 10;
  const shown = Math.min(count, cap);
  let html = villagerSVG(SITE_COLORS[colorKey] || '#145DA0').repeat(shown);
  if (count > cap) html += `<span class="villager-overflow">+${count - cap}</span>`;
  container.innerHTML = html;
}

/* ------------------------------ Toast queue ------------------------------ */
let toastQueue = [];
let toastBusy = false;

function showToast(message) {
  toastQueue.push(message);
  processToastQueue();
}

function processToastQueue() {
  if (toastBusy || toastQueue.length === 0) return;
  toastBusy = true;
  const msg = toastQueue.shift();
  el.toast.textContent = msg;
  el.toast.classList.remove('hidden');
  setTimeout(() => {
    el.toast.classList.add('hidden');
    toastBusy = false;
    setTimeout(processToastQueue, 250);
  }, 3200);
}

function flashCounter(node, good) {
  node.classList.remove('flash-good', 'flash-bad');
  // force reflow so the animation can restart if triggered twice quickly
  void node.offsetWidth;
  node.classList.add(good ? 'flash-good' : 'flash-bad');
  setTimeout(() => node.classList.remove('flash-good', 'flash-bad'), 900);
}

/* --------------------------- Site card rendering -------------------------- */
function renderAssignableSites() {
  el.assignableSites.innerHTML = SITE_DEFS.map(site => {
    const unlocked = site.unlocked();
    const count = state.workers[site.id];
    const rate = CONFIG[site.rateKey];
    const resourceLabel = site.resource === 'production' ? 'production' : 'research';

    return `
      <article class="site-card ${unlocked ? '' : 'locked'}" id="site-${site.id}">
        <div class="site-header">
          <h2>${site.label}</h2>
          <div class="worker-controls">
            <button class="stepper" data-site="${site.id}" data-action="minus" ${count <= 0 ? 'disabled' : ''} aria-label="Remove worker">−</button>
            <div class="worker-badge">${count} worker${count === 1 ? '' : 's'}</div>
            <button class="stepper" data-site="${site.id}" data-action="plus" ${wellWorkers() <= 0 ? 'disabled' : ''} aria-label="Add worker">+</button>
          </div>
        </div>
        <div class="site-scene">
          ${SCENES[site.id]}
          <div class="villager-row" id="${site.id}-villagers"></div>
        </div>
        <p class="site-footnote">${unlocked
          ? `Each worker adds <strong>${rate}</strong> ${resourceLabel} per turn.`
          : site.lockedText()}</p>
      </article>
    `;
  }).join('');

  SITE_DEFS.forEach(site => {
    const container = document.getElementById(`${site.id}-villagers`);
    if (container) renderVillagers(container, state.workers[site.id], site.id);
  });
}

// Delegated click handling for dynamically generated +/- buttons
el.assignableSites.addEventListener('click', (e) => {
  const btn = e.target.closest('.stepper');
  if (!btn || btn.disabled) return;
  const siteId = btn.dataset.site;
  const action = btn.dataset.action;
  if (action === 'plus' && wellWorkers() > 0) {
    state.workers[siteId] += 1;
  } else if (action === 'minus' && state.workers[siteId] > 0) {
    state.workers[siteId] -= 1;
  }
  render();
});

/* ------------------------------ Track rendering --------------------------- */
function renderTrack(track, index, total, textEl, fillEl, nextEl) {
  if (index >= track.length) {
    textEl.textContent = `${Math.floor(total)} total`;
    fillEl.style.width = '100%';
    nextEl.textContent = 'All upgrades unlocked for now.';
    return;
  }
  const milestone = track[index];
  const prevThreshold = index === 0 ? 0 : track[index - 1].at;
  const span = milestone.at - prevThreshold;
  const progressInSpan = Math.max(0, total - prevThreshold);
  const pct = Math.min(100, (progressInSpan / span) * 100);

  textEl.textContent = `${Math.floor(total)} / ${milestone.at}`;
  fillEl.style.width = pct + '%';
  nextEl.textContent = `Next: ${milestone.name} — ${milestone.desc}`;
}

/* -------------------------------- Render -------------------------------- */
function render() {
  el.counterPopulation.textContent = state.population;
  el.turnNumber.textContent = state.turn;

  const well = Math.max(0, wellWorkers());
  el.wellWorkerBadge.textContent = `${well} worker${well === 1 ? '' : 's'}`;
  renderVillagers(el.wellVillagers, well, 'well');

  if (state.spoutBuilt) {
    el.waterBankValue.textContent = '∞';
    el.counterWater.textContent = '∞';
    el.wellFootnote.innerHTML = `Water is limitless now — working here is optional.`;
  } else {
    el.waterBankValue.textContent = Math.floor(state.water);
    const projectedWaterChange = well * CONFIG.waterPerWellWorker - state.population * CONFIG.waterConsumedPerPerson;
    el.counterWater.textContent = signed(projectedWaterChange);
    el.wellFootnote.innerHTML = `Each worker collects <strong id="well-rate">${CONFIG.waterPerWellWorker}</strong> water per turn.`;
  }

  const projectedProduction = state.workers.construction * CONFIG.productionPerConstructionWorker
    + (state.spoutBuilt ? state.workers.engineering * CONFIG.productionPerEngineeringWorker : 0);
  const projectedResearch = state.workers.research * CONFIG.researchPerResearchWorker
    + (state.spoutBuilt ? state.workers.scholars * CONFIG.researchPerScholarWorker : 0);
  el.counterProduction.textContent = signed(projectedProduction);
  el.counterResearch.textContent = signed(projectedResearch);

  renderAssignableSites();

  renderTrack(PRODUCTION_TRACK, state.productionMilestoneIndex, state.productionTotal,
    el.productionTrackText, el.productionTrackFill, el.productionTrackNext);
  renderTrack(RESEARCH_TRACK, state.researchMilestoneIndex, state.researchTotal,
    el.researchTrackText, el.researchTrackFill, el.researchTrackNext);
}

/* ------------------------- Milestone processing --------------------------- */
function processMilestones() {
  while (state.productionMilestoneIndex < PRODUCTION_TRACK.length
    && state.productionTotal >= PRODUCTION_TRACK[state.productionMilestoneIndex].at) {
    const m = PRODUCTION_TRACK[state.productionMilestoneIndex];
    m.apply();
    if (!m.isSpout) showToast(`Production milestone: ${m.name} — ${m.desc}`);
    state.productionMilestoneIndex += 1;
  }
  while (state.researchMilestoneIndex < RESEARCH_TRACK.length
    && state.researchTotal >= RESEARCH_TRACK[state.researchMilestoneIndex].at) {
    const m = RESEARCH_TRACK[state.researchMilestoneIndex];
    m.apply();
    showToast(`Research milestone: ${m.name} — ${m.desc}`);
    state.researchMilestoneIndex += 1;
  }
}

/* ----------------------------- Turn resolution --------------------------- */
function endTurn() {
  if (state.gameOver) return;

  const well = Math.max(0, wellWorkers());

  if (!state.spoutBuilt) {
    const waterProduced = well * CONFIG.waterPerWellWorker;
    const waterConsumed = state.population * CONFIG.waterConsumedPerPerson;
    const netWater = waterProduced - waterConsumed;
    state.water += netWater;

    if (netWater >= CONFIG.growthDivisor) {
      const growth = Math.floor(netWater / CONFIG.growthDivisor);
      state.population += growth;
      flashCounter(el.counterPopulation, true);
    } else if (state.water < 0) {
      const deficit = Math.abs(state.water);
      const deaths = Math.max(1, Math.ceil(deficit / CONFIG.deathDivisor));
      state.population = Math.max(0, state.population - deaths);
      state.water = 0;
      flashCounter(el.counterPopulation, false);
    }
  } else {
    const growth = Math.max(1, Math.round(state.population * CONFIG.postSpoutGrowthPct));
    state.population += growth;
    flashCounter(el.counterPopulation, true);
  }

  const productionGained = state.workers.construction * CONFIG.productionPerConstructionWorker
    + (state.spoutBuilt ? state.workers.engineering * CONFIG.productionPerEngineeringWorker : 0);
  const researchGained = state.workers.research * CONFIG.researchPerResearchWorker
    + (state.spoutBuilt ? state.workers.scholars * CONFIG.researchPerScholarWorker : 0);
  state.productionTotal += productionGained;
  state.researchTotal += researchGained;

  processMilestones();

  // Keep assigned workers valid if population shrank
  let overflow = assignedElsewhere() - state.population;
  const ids = ['scholars', 'engineering', 'research', 'construction'];
  let i = 0;
  while (overflow > 0 && i < ids.length) {
    const id = ids[i];
    const take = Math.min(overflow, state.workers[id]);
    state.workers[id] -= take;
    overflow -= take;
    i += 1;
  }

  state.turn += 1;
  render();

  if (state.turn === 3 && !state.shownTurn3Toast) {
    showToast("Keep enough hands on Water Collection — the well won't fill itself, and everyone still needs to drink.");
    state.shownTurn3Toast = true;
  }

  if (state.population <= 0) {
    state.gameOver = true;
    el.loseModal.classList.remove('hidden');
    return;
  }

  if (state.spoutBuilt && !state.winModalShown) {
    state.winModalShown = true;
    el.winModal.classList.remove('hidden');
  }
}

/* ------------------------------- Event wiring ---------------------------- */
el.playBtn.addEventListener('click', () => {
  el.startScreen.classList.add('hidden');
  el.gameScreen.classList.remove('hidden');
  render();
});

el.howtoBtn.addEventListener('click', () => el.howtoModal.classList.remove('hidden'));
el.closeHowto.addEventListener('click', () => el.howtoModal.classList.add('hidden'));

el.endTurnBtn.addEventListener('click', endTurn);

el.continueAfterWin.addEventListener('click', () => {
  el.winModal.classList.add('hidden');
});

el.restartBtn.addEventListener('click', () => window.location.reload());
el.resetBtn.addEventListener('click', () => {
  if (window.confirm('Reset your progress and start over from Turn 1?')) {
    window.location.reload();
  }
});

render();
