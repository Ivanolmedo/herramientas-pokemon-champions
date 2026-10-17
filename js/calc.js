/**
 * calc.js - Calculadora de Daños usando @smogon/calc
 * Interfaz amigable + motor oficial de Smogon
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('%c[Calc] calc.js cargado', 'color: #ea580c; font-weight: bold;');

  // Comprobar que la librería de Smogon se cargó correctamente
  if (typeof calc === 'undefined') {
    console.error('No se pudo cargar @smogon/calc. Revisa la conexión o los scripts.');
    const out = document.getElementById('damage-output');
    if (out) {
      out.innerHTML = `
        <div class="text-center text-red-500 py-6">
          <i class="fa-solid fa-triangle-exclamation text-2xl mb-2"></i>
          <p>Error cargando la librería de cálculo de Smogon.<br>Recarga la página o revisa la consola.</p>
        </div>`;
    }
    return;
  }

  console.log('%c[Calc] @smogon/calc listo', 'color: #16a34a; font-weight: bold;', calc);

  // === Field buttons ===
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

  // === HP bar ===
  const currentHpInput = document.getElementById('p2-current-hp');
  const maxHpDisplay = document.getElementById('p2-max-hp-display');
  const hpBar = document.getElementById('p2-hp-bar');
  const maxHpInput = document.getElementById('p2-hp');

  function updateHpBar() {
    const current = Number(currentHpInput?.value) || 0;
    const max = Number(maxHpInput?.value) || 1;
    const percent = Math.min(100, Math.max(0, (current / max) * 100));

    if (hpBar) {
      hpBar.style.width = percent + '%';
      if (percent > 50) hpBar.className = 'h-full bg-green-500 rounded-full transition-all';
      else if (percent > 20) hpBar.className = 'h-full bg-yellow-500 rounded-full transition-all';
      else hpBar.className = 'h-full bg-red-500 rounded-full transition-all';
    }
    if (maxHpDisplay) maxHpDisplay.textContent = max;
  }

  currentHpInput?.addEventListener('input', updateHpBar);
  maxHpInput?.addEventListener('input', () => {
    if (Number(currentHpInput.value) > Number(maxHpInput.value)) {
      currentHpInput.value = maxHpInput.value;
    }
    updateHpBar();
    runCalculation();
  });
  updateHpBar();

  // === Escuchar cambios ===
  const inputsToWatch = document.querySelectorAll(
    '#p1-species, #p1-level, #p1-tera, #p1-nature, #p1-ability, #p1-item, ' +
    '#p1-hp, #p1-atk, #p1-def, #p1-spa, #p1-spd, #p1-spe, ' +
    '#p2-species, #p2-level, #p2-tera, #p2-nature, #p2-ability, #p2-item, ' +
    '#p2-hp, #p2-atk, #p2-def, #p2-spa, #p2-spd, #p2-spe, #p2-current-hp, ' +
    '.move-input, #field-helping-hand, #field-friend-guard, #field-protect'
  );

  inputsToWatch.forEach(el => {
    el.addEventListener('change', runCalculation);
    el.addEventListener('input', debounce(runCalculation, 450));
  });

  // Botón copy
  document.getElementById('btn-copy-result')?.addEventListener('click', () => {
    const text = document.getElementById('damage-output')?.innerText || '';
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('btn-copy-result');
      const original = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-check mr-1"></i> Copied!';
      setTimeout(() => { btn.innerHTML = original; }, 1500);
    });
  });

  // Primera ejecución
  runCalculation();

  // ====================== CÁLCULO ======================

  function runCalculation() {
    const output = document.getElementById('damage-output');
    if (!output) return;

    try {
      const gen = calc.Generations.get(9); // Gen 9 base (Champions usa mecánicas propias, se ajustará)

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

      // Attacker
      const attacker = new calc.Pokemon(gen, p1Name, {
        level: Number(document.getElementById('p1-level')?.value) || 50,
        nature: document.getElementById('p1-nature')?.value || 'Serious',
        ability: document.getElementById('p1-ability')?.value || undefined,
        item: document.getElementById('p1-item')?.value || undefined,
        teraType: document.getElementById('p1-tera')?.value || undefined,
      });

      // Defender
      const defender = new calc.Pokemon(gen, p2Name, {
        level: Number(document.getElementById('p2-level')?.value) || 50,
        nature: document.getElementById('p2-nature')?.value || 'Serious',
        ability: document.getElementById('p2-ability')?.value || undefined,
        item: document.getElementById('p2-item')?.value || undefined,
        teraType: document.getElementById('p2-tera')?.value || undefined,
      });

      // Field
      const weatherBtn = document.querySelector('.field-btn[data-group="weather"].active');
      const terrainBtn = document.querySelector('.field-btn[data-group="terrain"].active');
      const formatBtn  = document.querySelector('.field-btn:not([data-group]).active');

      const field = new calc.Field({
        gameType: (formatBtn?.dataset.value === 'singles') ? 'Singles' : 'Doubles',
        weather: (weatherBtn?.dataset.value === 'none') ? undefined : weatherBtn?.dataset.value,
        terrain: (terrainBtn?.dataset.value === 'none') ? undefined : terrainBtn?.dataset.value,
        attackerSide: {
          isHelpingHand: document.getElementById('field-helping-hand')?.checked || false,
        },
        defenderSide: {
          isFriendGuard: document.getElementById('field-friend-guard')?.checked || false,
          isProtected: document.getElementById('field-protect')?.checked || false,
        }
      });

      // Moves
      const moveInputs = document.querySelectorAll('.move-input[data-side="p1"]');
      let html = '';
      let hasAnyMove = false;

      moveInputs.forEach((input) => {
        const moveName = input.value?.trim();
        if (!moveName) return;

        hasAnyMove = true;
        try {
          const move = new calc.Move(gen, moveName);
          const result = calc.calculate(gen, attacker, defender, move, field);

          const range = result.range();
          const desc = result.fullDesc();
          const koChance = result.kochance();

          html += `
            <div class="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span class="font-semibold text-slate-800">${moveName}</span>
                <span class="text-orange-600 font-bold text-lg">${range[0]}&nbsp;-&nbsp;${range[1]}%</span>
              </div>
              <p class="text-sm text-slate-600 mb-1">${desc}</p>
              ${koChance && koChance.text ? `<p class="text-xs text-slate-500">${koChance.text}</p>` : ''}
            </div>`;
        } catch (err) {
          html += `
            <div class="border border-red-200 rounded-xl p-3 bg-red-50 text-sm text-red-600">
              <strong>${moveName}</strong>: ${err.message || 'Invalid move or data'}
            </div>`;
        }
      });

      if (!hasAnyMove) {
        html = `
          <div class="text-center text-slate-400 py-6">
            <p>Enter at least one move for the Attacker</p>
          </div>`;
      }

      output.innerHTML = html;

    } catch (err) {
      console.error(err);
      output.innerHTML = `
        <div class="text-center text-red-500 py-6">
          <i class="fa-solid fa-triangle-exclamation text-2xl mb-2"></i>
          <p class="font-medium">Error calculating damage</p>
          <p class="text-sm mt-1">${err.message || err}</p>
          <p class="text-xs mt-2 text-slate-400">Use English names (e.g. "Flutter Mane", "Incineroar", "Moonblast")</p>
        </div>`;
    }
  }

  function debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }
});
