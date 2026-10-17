/**
 * calc.js - Versión robusta (SP + Items + sincronización de barras)
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('%c[Calc] Iniciando versión robusta...', 'color: #ea580c; font-weight: bold;');

  if (typeof calc === 'undefined') {
    console.error('❌ @smogon/calc no se cargó');
    return;
  }
  console.log('✅ @smogon/calc cargado correctamente');

  // ============================================
  // 1. SINCRONIZACIÓN BARRAS ↔ NÚMEROS
  // ============================================
  function setupSPControls() {
    // Todos los inputs de número y range
    const allSPInputs = document.querySelectorAll('.sp-input, input[type="range"][data-stat]');

    allSPInputs.forEach(el => {
      el.addEventListener('input', function () {
        const side = this.dataset.side;
        const stat = this.dataset.stat;
        let value = Number(this.value) || 0;

        // Limitar entre 0 y 32
        value = Math.max(0, Math.min(32, value));

        // Actualizar AMBOS controles (número y barra)
        const numberInput = document.getElementById(`${side}-sp-${stat}`);
        const sliderInput = document.getElementById(`${side}-sp-${stat}-slider`);

        if (numberInput) numberInput.value = value;
        if (sliderInput) sliderInput.value = value;

        // Actualizar contador de SP usados
        updateSPCounter(side);

        // Recalcular daño
        runCalculation();
      });
    });
  }

  function updateSPCounter(side) {
    const stats = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
    let total = 0;

    stats.forEach(stat => {
      const val = Number(document.getElementById(`${side}-sp-${stat}`)?.value) || 0;
      total += val;
    });

    const counter = document.getElementById(`${side}-sp-remaining`);
    if (counter) {
      counter.textContent = `${total} / 66`;
      if (total > 66) {
        counter.classList.remove('text-orange-600', 'text-blue-600');
        counter.classList.add('text-red-600');
      } else {
        counter.classList.remove('text-red-600');
        counter.classList.add(side === 'p1' ? 'text-orange-600' : 'text-blue-600');
      }
    }
  }

  // ============================================
  // 2. CONVERSIÓN SP → EVs (regla oficial Champions)
  // ============================================
  // Primer SP = 4 EVs, cada SP adicional = 8 EVs
  function spToEVs(sp) {
    sp = Number(sp) || 0;
    if (sp <= 0) return 0;
    if (sp >= 32) return 252; // máximo clásico
    return 4 + (sp - 1) * 8;
  }

  // ============================================
  // 3. FUNCIÓN PRINCIPAL DE CÁLCULO
  // ============================================
  function runCalculation() {
    const output = document.getElementById('damage-output');
    if (!output) return;

    try {
      const gen = calc.Generations.get(9);

      const p1Name = document.getElementById('p1-species')?.value?.trim();
      const p2Name = document.getElementById('p2-species')?.value?.trim();

      if (!p1Name || !p2Name) {
        output.innerHTML = `
          <div class="text-center text-slate-400 py-8">
            <i class="fa-solid fa-arrow-down text-2xl mb-2"></i>
            <p>Enter both Pokémon species to calculate damage</p>
          </div>`;
        return;
      }

      // --- Leer Stat Points ---
      const p1SP = {
        hp:  Number(document.getElementById('p1-sp-hp')?.value)  || 0,
        atk: Number(document.getElementById('p1-sp-atk')?.value) || 0,
        def: Number(document.getElementById('p1-sp-def')?.value) || 0,
        spa: Number(document.getElementById('p1-sp-spa')?.value) || 0,
        spd: Number(document.getElementById('p1-sp-spd')?.value) || 0,
        spe: Number(document.getElementById('p1-sp-spe')?.value) || 0,
      };

      const p2SP = {
        hp:  Number(document.getElementById('p2-sp-hp')?.value)  || 0,
        atk: Number(document.getElementById('p2-sp-atk')?.value) || 0,
        def: Number(document.getElementById('p2-sp-def')?.value) || 0,
        spa: Number(document.getElementById('p2-sp-spa')?.value) || 0,
        spd: Number(document.getElementById('p2-sp-spd')?.value) || 0,
        spe: Number(document.getElementById('p2-sp-spe')?.value) || 0,
      };

      // --- Crear Attacker ---
      const attackerOptions = {
        level: 50,
        nature: document.getElementById('p1-nature')?.value || 'Serious',
        ability: document.getElementById('p1-ability')?.value || undefined,
        item: document.getElementById('p1-item')?.value || undefined,
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        evs: {
          hp:  spToEVs(p1SP.hp),
          atk: spToEVs(p1SP.atk),
          def: spToEVs(p1SP.def),
          spa: spToEVs(p1SP.spa),
          spd: spToEVs(p1SP.spd),
          spe: spToEVs(p1SP.spe),
        }
      };

      const attacker = new calc.Pokemon(gen, p1Name, attackerOptions);

      // --- Crear Defender ---
      const defenderOptions = {
        level: 50,
        nature: document.getElementById('p2-nature')?.value || 'Serious',
        ability: document.getElementById('p2-ability')?.value || undefined,
        item: document.getElementById('p2-item')?.value || undefined,
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        evs: {
          hp:  spToEVs(p2SP.hp),
          atk: spToEVs(p2SP.atk),
          def: spToEVs(p2SP.def),
          spa: spToEVs(p2SP.spa),
          spd: spToEVs(p2SP.spd),
          spe: spToEVs(p2SP.spe),
        }
      };

      const defender = new calc.Pokemon(gen, p2Name, defenderOptions);

      // --- Mostrar stats finales reales ---
      updateFinalDisplay('p1', attacker);
      updateFinalDisplay('p2', defender);

      // --- Debug en consola (muy útil) ---
      console.log('Attacker EVs enviados:', attackerOptions.evs);
      console.log('Attacker stats finales:', attacker.rawStats || attacker.stats);
      console.log('Attacker item:', attacker.item);
      console.log('Defender EVs enviados:', defenderOptions.evs);
      console.log('Defender stats finales:', defender.rawStats || defender.stats);

      // --- Field ---
      const weatherBtn = document.querySelector('.field-btn[data-group="weather"].active');
      const terrainBtn = document.querySelector('.field-btn[data-group="terrain"].active');
      const formatBtn  = document.querySelector('.field-btn:not([data-group]).active');

      const field = new calc.Field({
        gameType: (formatBtn?.dataset.value === 'singles') ? 'Singles' : 'Doubles',
        weather: (weatherBtn?.dataset.value === 'none') ? undefined : weatherBtn?.dataset.value,
        terrain: (terrainBtn?.dataset.value === 'none') ? undefined : terrainBtn?.dataset.value,
        attackerSide: {
          isHelpingHand: document.getElementById('field-helping-hand')?.checked || false
        },
        defenderSide: {
          isFriendGuard: document.getElementById('field-friend-guard')?.checked || false,
          isProtected: document.getElementById('field-protect')?.checked || false
        }
      });

      // --- Calcular movimientos ---
      let html = '';
      let hasMove = false;

      document.querySelectorAll('.move-input[data-side="p1"]').forEach(input => {
        const moveName = input.value?.trim();
        if (!moveName) return;
        hasMove = true;

        try {
          const move = new calc.Move(gen, moveName);
          const result = calc.calculate(gen, attacker, defender, move, field);

          const range = result.range();
          const desc = result.fullDesc();
          const ko = result.kochance();

          html += `
            <div class="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span class="font-semibold text-slate-800">${moveName}</span>
                <span class="text-orange-600 font-bold text-lg">${range[0]} – ${range[1]}%</span>
              </div>
              <p class="text-sm text-slate-600">${desc}</p>
              ${ko && ko.text ? `<p class="text-xs text-slate-500 mt-1">${ko.text}</p>` : ''}
            </div>`;
        } catch (err) {
          html += `
            <div class="border border-red-200 rounded-xl p-3 bg-red-50 text-sm text-red-600">
              <strong>${moveName}</strong>: ${err.message || 'Invalid move'}
            </div>`;
        }
      });

      if (!hasMove) {
        html = `<div class="text-center text-slate-400 py-6"><p>Enter at least one move for the Attacker</p></div>`;
      }

      output.innerHTML = html;

    } catch (err) {
      console.error('Error en cálculo:', err);
      output.innerHTML = `
        <div class="text-center text-red-500 py-6">
          <i class="fa-solid fa-triangle-exclamation text-2xl mb-2"></i>
          <p class="font-medium">Error calculating damage</p>
          <p class="text-sm mt-1">${err.message || err}</p>
        </div>`;
    }
  }

  function updateFinalDisplay(side, pokemon) {
    const stats = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
    const source = pokemon.rawStats || pokemon.stats || {};

    stats.forEach(stat => {
      const el = document.getElementById(`${side}-final-${stat}`);
      if (el) {
        el.textContent = source[stat] ?? '—';
      }
    });
  }

  // ============================================
  // 4. EVENTOS ADICIONALES
  // ============================================
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

  // Otros campos
  const otherFields = [
    '#p1-species', '#p1-nature', '#p1-ability', '#p1-item',
    '#p2-species', '#p2-nature', '#p2-ability', '#p2-item',
    '.move-input',
    '#field-helping-hand', '#field-friend-guard', '#field-protect'
  ];

  document.querySelectorAll(otherFields.join(',')).forEach(el => {
    el.addEventListener('change', runCalculation);
    el.addEventListener('input', debounce(runCalculation, 400));
  });

  // Botón copiar
  document.getElementById('btn-copy-result')?.addEventListener('click', () => {
    const text = document.getElementById('damage-output')?.innerText || '';
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('btn-copy-result');
      const original = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-check mr-1"></i> Copied!';
      setTimeout(() => btn.innerHTML = original, 1500);
    });
  });

  // Utilidad debounce
  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // ============================================
  // INICIALIZACIÓN
  // ============================================
  setupSPControls();
  updateSPCounter('p1');
  updateSPCounter('p2');
  runCalculation();
});
