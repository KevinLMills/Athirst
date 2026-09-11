/* =========================================================================
   ATHIRST — core loop MVP
   All tunable numbers live in CONFIG below. No save/persistence (by design
   for this MVP pass) — every page load starts fresh.
   ========================================================================= */

const CONFIG = {
  startingPopulation: 6,
  startingWater: 12,

  waterPerWellWorker: 4,      // water produced per worker on Water Collection
  waterConsumedPerPerson: 2,  // water drunk per person per turn, regardless of job

  productionPerConstructionWorker: 3,
  constructionUnlockPopulation: 5,

  spoutCost: 150,             // production points needed to win

  // Population grows by floor(netWaterThisTurn / growthDivisor) when
  // netWaterThisTurn >= growthDivisor.
  growthDivisor: 5,

  // On a deficit turn (water bank went negative), lose people proportional
  // to the size of the deficit, minimum 1. Water bank resets to 0 after.
  deathDivisor: 3,
};

const state = {
  population: CONFIG.startingPopulation,
  water: CONFIG.startingWater,
  productionTotal: 0,
  researchTotal: 0, // unused in MVP, reserved for a future Research site
  turn: 1,
  workers: {
    construction: 0, // well workers = population - all-other-site workers
  },
  constructionUnlocked: false,
  spoutBuilt: false,
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

  counterPopulation: document.getElementById('counter-population'),
  counterWater: document.getElementById('counter-water'),
  counterResearch: document.getElementById('counter-research'),
  counterProduction: document.getElementById('counter-production'),

  toast: document.getElementById('turn3-toast'),

  wellWorkerBadge: document.getElementById('well-worker-badge'),
  wellVillagers: document.getElementById('well-villagers'),

  constructionCard: document.getElementById('site-construction'),
  constructionWorkerBadge: document.getElementById('construction-worker-badge'),
  constructionVillagers: document.getElementById('construction-villagers'),
  constructionMinus: document.getElementById('construction-minus'),
  constructionPlus: document.getElementById('construction-plus'),
  constructionFootnote: document.getElementById('construction-footnote'),
  constructionThreshold: document.getElementById('construction-threshold'),

  spoutProgressText: document.getElementById('spout-progress-text'),
  spoutProgressFill: document.getElementById('spout-progress-fill'),

  turnNumber: document.getElementById('turn-number'),
  endTurnBtn: document.getElementById('end-turn-btn'),

  winModal: document.getElementById('win-modal'),
  continueAfterWin: document.getElementById('continue-after-win'),
  loseModal: document.getElementById('lose-modal'),
  restartBtn: document.getElementById('restart-btn'),
};

el.constructionThreshold.textContent = CONFIG.constructionUnlockPopulation;

/* ------------------------------- Helpers -------------------------------- */
function wellWorkers() {
  return state.population - state.workers.construction;
}

function villagerSVG() {
  return `<svg class="villager-icon" viewBox="0 0 20 26" aria-hidden="true">
    <circle class="v-head" cx="10" cy="6" r="6"/>
    <path class="v-body" d="M2 26 C 2 16, 5 13, 10 13 C 15 13, 18 16, 18 26 Z"/>
  </svg>`;
}

function renderVillagers(container, count) {
  const cap = 10;
  const shown = Math.min(count, cap);
  let html = villagerSVG().repeat(shown);
  if (count > cap) {
    html += `<span class="villager-overflow">+${count - cap}</span>`;
  }
  container.innerHTML = html;
}

function signed(n) {
  return (n > 0 ? '+' : '') + n;
}

/* -------------------------------- Render -------------------------------- */
function render() {
  el.counterPopulation.textContent = state.population;
  el.counterResearch.textContent = signed(0);
  el.turnNumber.textContent = state.turn;

  const well = wellWorkers();
  el.wellWorkerBadge.textContent = `${well} worker${well === 1 ? '' : 's'}`;
  renderVillagers(el.wellVillagers, well);

  // Preview this turn's projected water/production change based on current
  // worker assignment, so the counters feel responsive to reassignment.
  const projectedWaterChange = well * CONFIG.waterPerWellWorker - state.population * CONFIG.waterConsumedPerPerson;
  const projectedProduction = state.workers.construction * CONFIG.productionPerConstructionWorker;
  el.counterWater.textContent = signed(projectedWaterChange);
  el.counterProduction.textContent = signed(projectedProduction);

  // Construction site
  if (state.constructionUnlocked) {
    el.constructionCard.classList.remove('locked');
    el.constructionFootnote.innerHTML = `Each worker adds <strong>${CONFIG.productionPerConstructionWorker}</strong> production per turn.`;
    el.constructionWorkerBadge.textContent = `${state.workers.construction} worker${state.workers.construction === 1 ? '' : 's'}`;
    renderVillagers(el.constructionVillagers, state.workers.construction);
    el.constructionMinus.disabled = state.workers.construction <= 0;
    el.constructionPlus.disabled = well <= 0;
  } else {
    el.constructionCard.classList.add('locked');
    el.constructionWorkerBadge.textContent = '0 workers';
    renderVillagers(el.constructionVillagers, 0);
    el.constructionMinus.disabled = true;
    el.constructionPlus.disabled = true;
  }

  // Spout progress
  const pct = Math.min(100, (state.productionTotal / CONFIG.spoutCost) * 100);
  el.spoutProgressFill.style.width = pct + '%';
  el.spoutProgressText.textContent = `${Math.floor(state.productionTotal)} / ${CONFIG.spoutCost}`;
}

/* ----------------------------- Turn resolution --------------------------- */
function endTurn() {
  if (state.gameOver) return;

  const well = wellWorkers();
  const waterProduced = well * CONFIG.waterPerWellWorker;
  const waterConsumed = state.population * CONFIG.waterConsumedPerPerson;
  const netWater = waterProduced - waterConsumed;

  state.water += netWater;

  const productionGained = state.workers.construction * CONFIG.productionPerConstructionWorker;
  state.productionTotal += productionGained;

  // Population growth / decline
  if (netWater >= CONFIG.growthDivisor) {
    const growth = Math.floor(netWater / CONFIG.growthDivisor);
    state.population += growth;
  } else if (state.water < 0) {
    const deficit = Math.abs(state.water);
    const deaths = Math.max(1, Math.ceil(deficit / CONFIG.deathDivisor));
    state.population = Math.max(0, state.population - deaths);
    state.water = 0;
  }

  // Unlock construction
  if (!state.constructionUnlocked && state.population >= CONFIG.constructionUnlockPopulation) {
    state.constructionUnlocked = true;
  }

  // Keep construction workers valid if population dropped
  if (state.workers.construction > state.population) {
    state.workers.construction = state.population;
  }

  state.turn += 1;

  render();

  if (state.turn === 3 && !state.shownTurn3Toast) {
    el.toast.classList.remove('hidden');
    state.shownTurn3Toast = true;
  } else {
    el.toast.classList.add('hidden');
  }

  if (state.population <= 0) {
    state.gameOver = true;
    el.loseModal.classList.remove('hidden');
    return;
  }

  if (!state.spoutBuilt && state.productionTotal >= CONFIG.spoutCost) {
    state.spoutBuilt = true;
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

el.constructionPlus.addEventListener('click', () => {
  if (wellWorkers() > 0) {
    state.workers.construction += 1;
    render();
  }
});

el.constructionMinus.addEventListener('click', () => {
  if (state.workers.construction > 0) {
    state.workers.construction -= 1;
    render();
  }
});

el.endTurnBtn.addEventListener('click', endTurn);

el.continueAfterWin.addEventListener('click', () => {
  el.winModal.classList.add('hidden');
});

el.restartBtn.addEventListener('click', () => {
  window.location.reload();
});

render();
