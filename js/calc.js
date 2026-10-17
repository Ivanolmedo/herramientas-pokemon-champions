/**
 * calc.js
 * Calculadora bilateral para Pokémon Champions
 * - Mi Pokémon  ↔  Adversario
 * - Daño en ambas direcciones
 * - Efectos de campo separados por lado
 * - Stat Points + barras sincronizadas
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('%c[Calc] Calculadora bilateral iniciada', 'color: #ea580c; font-weight: bold;');

  if (typeof calc === 'undefined') {
    console.error('❌ @smogon/calc no se cargó');
    return;
  }

  // ============================================
  // 1. UTILIDADES
  // ============================================

  // Conversión SP → EVs (regla oficial de Champions)
  function spToEVs(sp) {
    sp = Number(sp) || 0;
    if (sp <= 0) return 0;
    if (sp >= 32) return 252;
    return 4 + (sp - 1) * 8;
  }

  // Debounce para no calcular demasiado seguido
  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // ============================================
  // 2. SINCRONIZACIÓN DE STAT POINTS (barras + números)
  // ============================================
  function setupSPControls() {
    document.querySelectorAll('.sp-slider, .sp-input').forEach(el => {
      el.addEventListener('input', function () {
        const side = this.dataset.side;   // "my" o "opp"
        const stat = this.dataset.stat;   // hp, atk, def...
        let value = Math.max(0, Math.min(32, Number(this.value) || 0));

        // Actualizar ambos controles del mismo stat
        const numberInput = document.querySelector(`.sp-input[data-side="${side}"][data-stat="${stat}"]`);
        const sliderInput = document.querySelector(`.sp-slider[data-side="${side}"][data-stat="${stat}"]`);

        if (numberInput) numberInput.value = value;
        if (sliderInput) sliderInput.value = value;

        updateSPCounter(side);
        runCalculation();
      });
    });
  }

  function updateSPCounter(side) {
    const stats = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
    let total = 0;

    stats.forEach(stat => {
      const input = document.querySelector(`.sp-input[data-side="${side}"][data-stat="${stat}"]`);
      total += Number(input?.value) || 0;
    });

    const counter = document.getElementById(`${side}-sp-remaining`);
    if (counter) {
      counter.textContent = `${total} / 66`;
      counter.classList.toggle('text-red-600', total > 66);
      counter.classList.toggle('text-orange-600', side === 'my' && total <= 66);
      counter.classList.toggle('text-blue-600', side === 'opp' && total <= 66);
    }
  }

  // ============================================
  // 3. CREAR OBJETO POKEMON
  // ============================================
  function createPokemon(side) {
    const prefix = side; // "my" o "opp"
    const gen = calc.Generations.get(9);

    const name = document.getElementById(`${prefix}-species`)?.value?.trim();
    if (!name) return null;

    const sp = {};
    ['hp', 'atk', 'def', 'spa', 'spd', 'spe'].forEach(stat => {
      const input = document.querySelector(`.sp-input[data-side="${side}"][data-stat="${stat}"]`);
      sp[stat] = Number(input?.value) || 0;
    });

    const options = {
      level: 50,
      nature: document.getElementById(`${prefix}-nature`)?.value || 'Serious',
      ability: document.getElementById(`${prefix}-ability`)?.value || undefined,
      item: document.getElementById(`${prefix}-item`)?.value || undefined,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: {
        hp:  spToEVs(sp.hp),
        atk: spToEVs(sp.atk),
        def: spToEVs(sp.def),
        spa: spToEVs(sp.spa),
        spd: spToEVs(sp.spd),
        spe: spToEVs(sp.spe)
      }
    };

    try {
      return new calc.Pokemon(gen, name, options);
    } catch (e) {
      console.warn(`No se pudo crear ${side}:`, e.message);
      return null;
    }
  }

  // ============================================
  // 4. CREAR FIELD (con efectos por lado)
  // ============================================
  function createField(attackerSide, defenderSide) {
    // attackerSide y defenderSide son "my" o "opp"

    const weatherBtn = document.querySelector('.field-btn[data-group="weather"].active');
    const terrainBtn = document.querySelector('.field-btn[data-group="terrain"].active');
    const formatBtn  = document.querySelector('.field-btn:not([data-group]).active');

    return new calc.Field({
      gameType: formatBtn?.dataset.value === 'singles' ? 'Singles' : 'Doubles',
      weather: weatherBtn?.dataset.value === 'none' ? undefined : weatherBtn?.dataset.value,
      terrain: terrainBtn?.dataset.value === 'none' ? undefined : terrainBtn?.dataset.value,

      // Lado del atacante
      attackerSide: {
        isHelpingHand: document.getElementById(`${attackerSide}-helping-hand`)?.checked || false,
        isReflect:     document.getElementById(`${attackerSide}-reflect`)?.checked || false,
        isLightScreen: document.getElementById(`${attackerSide}-lightscreen`)?.checked || false,
        isFriendGuard: document.getElementById(`${attackerSide}-friendguard`)?.checked || false,
      },

      // Lado del defensor
      defenderSide: {
        isHelpingHand: document.getElementById(`${defenderSide}-helping-hand`)?.checked || false,
        isReflect:     document.getElementById(`${defenderSide}-reflect`)?.checked || false,
        isLightScreen: document.getElementById(`${defenderSide}-lightscreen`)?.checked || false,
        isFriendGuard: document.getElementById(`${defenderSide}-friendguard`)?.checked || false,
      }
    });
  }

  // ============================================
  // 5. CALCULAR DAÑO DE UN LADO HACIA EL OTRO
  // ============================================
  function calculateSide(attacker, defender, attackerSideName, resultsContainerId) {
    const container = document.getElementById(resultsContainerId);
    if (!container) return;

    if (!attacker || !defender) {
      container.innerHTML = `<p class="text-sm text-slate-400 text-center py-4">Faltan datos</p>`;
      return;
    }

    const gen = calc.Generations.get(9);
    const field = createField(attackerSideName, attackerSideName === 'my' ? 'opp' : 'my');

    let html = '';
    let hasMoves = false;

    // Buscar los 4 movimientos del lado atacante
    document.querySelectorAll(`.move-input[data-side="${attackerSideName}"]`).forEach(input => {
      const moveName = input.value?.trim();
      if (!moveName) return;

      hasMoves = true;

      try {
        const move = new calc.Move(gen, moveName);
        const result = calc.calculate(gen, attacker, defender, move, field);

        const range = result.range();
        const desc = result.fullDesc();
        const ko = result.kochance();

        html += `
          <div class="border border-slate-200 rounded-xl p-3 bg-slate-50/60">
            <div class="flex justify-between items-center mb-1">
              <span class="font-semibold text-sm">${moveName}</span>
              <span class="font-bold text-orange-600">${range[0]} – ${range[1]}%</span>
            </div>
            <p class="text-xs text-slate-600">${desc}</p>
            ${ko?.text ? `<p class="text-xs text-slate-500 mt-1">${ko.text}</p>` : ''}
          </div>`;
      } catch (err) {
        html += `
          <div class="border border-red-200 rounded-xl p-3 bg-red-50 text-xs text-red-600">
            <strong>${moveName}</strong>: ${err.message || 'Movimiento inválido'}
          </div>`;
      }
    });

    if (!hasMoves) {
      html = `<p class="text-sm text-slate-400 text-center py-4">Sin movimientos</p>`;
    }

    container.innerHTML = html;
  }

  // ============================================
  // 6. FUNCIÓN PRINCIPAL
  // ============================================
  function runCalculation() {
    const myPokemon  = createPokemon('my');
    const oppPokemon = createPokemon('opp');

    // Actualizar stats finales mostrados
    updateFinalStats('my', myPokemon);
    updateFinalStats('opp', oppPokemon);

    // Calcular ambas direcciones
    calculateSide(myPokemon, oppPokemon, 'my',  'results-my-to-opp');
    calculateSide(oppPokemon, myPokemon, 'opp', 'results-opp-to-my');
  }

  function updateFinalStats(side, pokemon) {
    if (!pokemon) return;

    const container = document.getElementById(`${side}-final-stats`);
    if (!container) return;

    const source = pokemon.rawStats || pokemon.stats || {};
    container.querySelectorAll('[data-stat]').forEach(el => {
      const stat = el.dataset.stat;
      el.textContent = source[stat] ?? '—';
    });
  }

  // ============================================
  // 7. EVENTOS
  // ============================================

  // Botones de Field (Weather / Terrain / Format)
  document.querySelectorAll('.field-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.dataset.group;
      if (group) {
        document.querySelectorAll(`.field-btn[data-group="${group}"]`).forEach(b => b.classList.remove('active'));
      } else {
        btn.parentElement.querySelectorAll('.field-btn').forEach(b => b.classList.remove('active'));
      }
      btn.classList.add('active');
      runCalculation();
    });
  });

  // Checkboxes de efectos por lado + otros inputs
  const watchSelectors = [
    '#my-species', '#my-nature', '#my-ability', '#my-item',
    '#opp-species', '#opp-nature', '#opp-ability', '#opp-item',
    '.move-input',
    '#my-helping-hand', '#opp-helping-hand',
    '#my-reflect', '#opp-reflect',
    '#my-lightscreen', '#opp-lightscreen',
    '#my-friendguard', '#opp-friendguard'
  ];

  document.querySelectorAll(watchSelectors.join(',')).forEach(el => {
    el.addEventListener('change', runCalculation);
    el.addEventListener('input', debounce(runCalculation, 400));
  });

  // Botón copiar
  document.getElementById('btn-copy-result')?.addEventListener('click', () => {
    const text = document.getElementById('results-my-to-opp')?.innerText + '\n\n' +
                 document.getElementById('results-opp-to-my')?.innerText;
    navigator.clipboard.writeText(text || '').then(() => {
      const btn = document.getElementById('btn-copy-result');
      const original = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-check mr-1"></i> Copied!';
      setTimeout(() => btn.innerHTML = original, 1500);
    });
  });

  // ============================================
  // INICIALIZACIÓN
  // ============================================
  setupSPControls();
  updateSPCounter('my');
  updateSPCounter('opp');
  runCalculation();
});