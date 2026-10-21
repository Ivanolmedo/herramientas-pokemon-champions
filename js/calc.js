/**
 * calc.js — Calculadora Champions v0.8
 * Bilateral, SP, boosts, Fairy Aura, notas por movimiento, transfer teambuilder
 */
document.addEventListener('DOMContentLoaded', () => {
  console.log('%c[Calc] v0.8 cargado', 'color: #ea580c; font-weight: bold;');

  if (typeof calc === 'undefined') {
    const out = document.getElementById('damage-output');
    if (out) {
      out.innerHTML = `<div class="text-center text-red-500 py-6">
        <p>Error cargando @smogon/calc. Revisa la conexión.</p></div>`;
    }
    return;
  }

  // ---------- Utils ----------
  function debounce(fn, delay) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
  }

  function toID(text) {
    return (text || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  function clampSP(v) {
    v = Number(v) || 0;
    return Math.max(0, Math.min(32, v));
  }

  /** Champions SP (0-32) → EVs aproximados para @smogon/calc (0-252) */
  function spToEV(sp) {
    sp = clampSP(sp);
    if (sp <= 0) return 0;
    if (sp >= 32) return 252;
    return Math.round((sp / 32) * 252);
  }

  function readBoosts(side) {
    const root = document.getElementById(side + '-boosts');
    const boosts = {};
    if (!root) return boosts;
    root.querySelectorAll('[data-boost]').forEach(sel => {
      const stat = sel.dataset.boost;
      const v = Number(sel.value) || 0;
      if (stat && v !== 0) boosts[stat] = v;
    });
    return boosts;
  }

  function readSP(side) {
    const sps = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    document.querySelectorAll(`.sp-input[data-side="${side}"]`).forEach(el => {
      const stat = el.dataset.stat;
      if (stat) sps[stat] = clampSP(el.value);
    });
    return sps;
  }

  function updateSPTotal(side) {
    const sps = readSP(side);
    const total = Object.values(sps).reduce((a, b) => a + b, 0);
    const el = document.getElementById(side + '-sp-total');
    if (el) {
      el.textContent = `${total} / 66`;
      el.classList.toggle('text-red-600', total > 66);
      el.classList.toggle('text-orange-600', total <= 66);
    }
  }

  function updateSprite(side) {
    const name = document.getElementById(side + '-species')?.value?.trim();
    const img = document.getElementById(side + '-sprite');
    if (!img) return;
    if (!name) {
      img.classList.add('hidden');
      return;
    }
    if (window.ChampSprites) {
      img.src = ChampSprites.spriteUrl(name);
      img.onerror = function () {
        this.onerror = null;
        this.src = ChampSprites.spriteUrlFallback(name);
      };
    } else {
      img.src = `https://play.pokemonshowdown.com/sprites/dex/${toID(name)}.png`;
    }
    img.classList.remove('hidden');
  }

  // ---------- SP sync ----------
  document.querySelectorAll('.sp-slider, .sp-input').forEach(el => {
    el.addEventListener('input', function () {
      const side = this.dataset.side;
      const stat = this.dataset.stat;
      const val = clampSP(this.value);
      const slider = document.querySelector(`.sp-slider[data-side="${side}"][data-stat="${stat}"]`);
      const input = document.querySelector(`.sp-input[data-side="${side}"][data-stat="${stat}"]`);
      if (slider) slider.value = val;
      if (input) input.value = val;
      updateSPTotal(side);
      runCalculation();
    });
  });
  updateSPTotal('p1');
  updateSPTotal('p2');

  // ---------- Field buttons ----------
  document.querySelectorAll('.field-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.dataset.group;
      if (group) {
        document.querySelectorAll(`.field-btn[data-group="${group}"]`).forEach(b => b.classList.remove('active'));
      }
      btn.classList.add('active');
      runCalculation();
    });
  });

  // ---------- Watch inputs ----------
  const watch = document.querySelectorAll(
    '#p1-species, #p1-nature, #p1-ability, #p1-item, ' +
    '#p2-species, #p2-nature, #p2-ability, #p2-item, ' +
    '.move-input, .boost-select, ' +
    '#field-helping-hand, #field-helping-hand-def, #field-friend-guard, ' +
    '#field-aurora-veil, #field-reflect, #field-light-screen, #field-fairy-aura'
  );
  watch.forEach(el => {
    el.addEventListener('change', runCalculation);
    el.addEventListener('input', debounce(runCalculation, 400));
  });

  document.getElementById('p1-species')?.addEventListener('input', () => updateSprite('p1'));
  document.getElementById('p2-species')?.addEventListener('input', () => updateSprite('p2'));

  document.getElementById('btn-copy-result')?.addEventListener('click', () => {
    const text = document.getElementById('damage-output')?.innerText || '';
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('btn-copy-result');
      const o = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-check mr-1"></i>Copiado';
      setTimeout(() => { btn.innerHTML = o; }, 1500);
    });
  });

  // ---------- Build Pokemon ----------
  function buildPokemon(side) {
    const gen = calc.Generations.get(9);
    const name = document.getElementById(side + '-species')?.value?.trim();
    if (!name) return null;

    const sps = readSP(side);
    const boosts = readBoosts(side);

    const opts = {
      level: 50,
      nature: document.getElementById(side + '-nature')?.value || 'Serious',
      ability: document.getElementById(side + '-ability')?.value?.trim() || undefined,
      item: document.getElementById(side + '-item')?.value?.trim() || undefined,
      evs: {
        hp: spToEV(sps.hp),
        atk: spToEV(sps.atk),
        def: spToEV(sps.def),
        spa: spToEV(sps.spa),
        spd: spToEV(sps.spd),
        spe: spToEV(sps.spe)
      },
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      boosts
    };

    // limpiar ability/item vacíos
    if (!opts.ability) delete opts.ability;
    if (!opts.item) delete opts.item;
    if (!Object.keys(boosts).length) delete opts.boosts;

    return new calc.Pokemon(gen, name, opts);
  }

  function buildField() {
    const weatherBtn = document.querySelector('.field-btn[data-group="weather"].active');
    const terrainBtn = document.querySelector('.field-btn[data-group="terrain"].active');
    const weather = weatherBtn?.dataset.value;
    const terrain = terrainBtn?.dataset.value;

    return new calc.Field({
      gameType: 'Doubles',
      weather: (!weather || weather === 'none') ? undefined : weather,
      terrain: (!terrain || terrain === 'none') ? undefined : terrain,
      isFairyAura: document.getElementById('field-fairy-aura')?.checked || false,
      attackerSide: {
        isHelpingHand: document.getElementById('field-helping-hand')?.checked || false
      },
      defenderSide: {
        isHelpingHand: document.getElementById('field-helping-hand-def')?.checked || false,
        isFriendGuard: document.getElementById('field-friend-guard')?.checked || false,
        isReflect: document.getElementById('field-reflect')?.checked || false,
        isLightScreen: document.getElementById('field-light-screen')?.checked || false,
        isAuroraVeil: document.getElementById('field-aurora-veil')?.checked || false
      }
    });
  }

  // ---------- Notes / Transfer ----------
  function saveSingleNote(species, moveName, summary) {
    if (!species) return;
    const note = {
      id: 'n_' + Date.now(),
      text: `${moveName}: ${summary}`,
      date: new Date().toISOString(),
      source: 'calc',
      species
    };
    let queue = [];
    try { queue = JSON.parse(localStorage.getItem('champions_pending_notes') || '[]'); } catch (e) {}
    queue.push(note);
    localStorage.setItem('champions_pending_notes', JSON.stringify(queue));
    if (typeof showToast === 'function') showToast('Nota guardada: ' + note.text, 'success'); else alert('Nota guardada');
  }

  function sendToTeam(side) {
    const name = document.getElementById(side + '-species')?.value?.trim();
    if (!name) {
      if (typeof showToast === 'function') showToast('Selecciona un Pokémon primero', 'warn'); else alert('Selecciona un Pokémon primero.');
      return;
    }
    const sps = readSP(side);
    const poke = {
      species: name,
      nature: document.getElementById(side + '-nature')?.value || 'Serious',
      ability: document.getElementById(side + '-ability')?.value?.trim() || '',
      item: document.getElementById(side + '-item')?.value?.trim() || '',
      sps,
      moves: [
        document.getElementById(side + '-move1')?.value?.trim() || '',
        document.getElementById(side + '-move2')?.value?.trim() || '',
        document.getElementById(side + '-move3')?.value?.trim() || '',
        document.getElementById(side + '-move4')?.value?.trim() || ''
      ],
      notes: [],
      transferredAt: Date.now()
    };
    localStorage.setItem('champions_transfer_poke', JSON.stringify(poke));
    console.log('[Calc → Team]', poke);
    if (typeof showToast === 'function') showToast('"' + name + '" listo para el Teambuilder', 'success'); else alert(name + ' listo');
  }

  document.getElementById('btn-send-my-to-team')?.addEventListener('click', () => sendToTeam('p1'));
  document.getElementById('btn-send-opp-to-team')?.addEventListener('click', () => sendToTeam('p2'));

  // ---------- Calculation ----------
  function calcSideMoves(gen, attacker, defender, field, side, attackerName) {
    const inputs = document.querySelectorAll(`.move-input[data-side="${side}"]`);
    const blocks = [];

    inputs.forEach(input => {
      const moveName = input.value?.trim();
      if (!moveName) return;

      try {
        const move = new calc.Move(gen, moveName);

        // Movimientos de estado (Nasty Plot, Protect, Tailwind…): no mostrar en resultados de daño
        const category = (move.category || '').toString().toLowerCase();
        if (category === 'status' || move.category === calc.MoveCategory?.Status) {
          return;
        }
        // basePower 0 suele ser status / no dañino
        if (move.bp === 0 || move.basePower === 0) {
          // algunas moves de daño tienen bp dinámico; si category no es status, seguimos
          if (category === 'status' || !category) {
            // si no hay categoría clara y bp 0, omitir
            if (category === 'status') return;
          }
        }
        if (category === 'status') return;

        const result = calc.calculate(gen, attacker, defender, move, field);

        // Inmunidad / 0 daño: no listar
        const damage = result.damage;
        if (Array.isArray(damage) && damage.length && damage.every(d => !d || d === 0)) {
          return;
        }

        const range = result.range();
        // 0–0 %: no listar (status residual o inmunidad)
        if (!range || (range[0] === 0 && range[1] === 0)) {
          return;
        }

        const desc = result.fullDesc();
        let koText = '';
        try {
          const ko = result.kochance();
          if (ko && ko.text) koText = ko.text;
        } catch (e) {
          // kochance a veces falla con daño 0; ya filtramos arriba
        }

        const summary = `${range[0]} – ${range[1]}%` + (koText ? ` (${koText})` : '');
        blocks.push({ moveName, range, desc, koText, summary, attackerName });
      } catch (err) {
        const msg = (err && err.message) ? String(err.message) : '';
        // Errores típicos de inmunidad / Fake Out vs Ghost / damage[length-1]===0 → omitir
        if (
          /damage\[/i.test(msg) ||
          /immune/i.test(msg) ||
          /no damage/i.test(msg) ||
          /=== 0/i.test(msg)
        ) {
          return;
        }
        // Solo errores “reales” (nombre inválido, etc.)
        blocks.push({ error: true, moveName, message: msg || 'Invalid move' });
      }
    });

    return blocks;
  }

  function renderBlocks(title, blocks, colorClass) {
    if (!blocks.length) return '';
    let html = `<div class="mb-4"><h4 class="font-semibold text-sm ${colorClass} mb-2">${title}</h4><div class="space-y-2">`;
    blocks.forEach(b => {
      if (b.error) {
        html += `<div class="border border-amber-200 rounded-xl p-3 bg-amber-50 text-sm text-amber-800"><strong>${b.moveName}</strong>: ${b.message}</div>`;
        return;
      }
      html += `
        <div class="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-1">
            <span class="font-semibold text-slate-800">${b.moveName}</span>
            <span class="text-orange-600 font-bold text-lg">${b.range[0]}&nbsp;–&nbsp;${b.range[1]}%</span>
          </div>
          <p class="text-sm text-slate-600 mb-1">${b.desc}</p>
          ${b.koText ? `<p class="text-xs text-slate-500 mb-2">${b.koText}</p>` : ''}
          <button type="button" class="text-[11px] text-orange-600 hover:underline font-semibold btn-note"
            data-species="${b.attackerName}" data-move="${b.moveName}" data-summary="${b.summary.replace(/"/g, '&quot;')}">
            <i class="fa-solid fa-note-sticky mr-1"></i>Guardar esta línea como nota
          </button>
        </div>`;
    });
    html += '</div></div>';
    return html;
  }

  function runCalculation() {
    const output = document.getElementById('damage-output');
    if (!output) return;

    try {
      const gen = calc.Generations.get(9);
      const p1Name = document.getElementById('p1-species')?.value?.trim();
      const p2Name = document.getElementById('p2-species')?.value?.trim();

      if (!p1Name || !p2Name) {
        output.innerHTML = `<div class="text-center text-slate-400 py-8"><p>Elige ambos Pokémon para calcular</p></div>`;
        return;
      }

      const attacker = buildPokemon('p1');
      const defender = buildPokemon('p2');
      if (!attacker || !defender) {
        output.innerHTML = `<div class="text-center text-red-500 py-6"><p>No se pudo crear uno de los Pokémon (nombre en inglés)</p></div>`;
        return;
      }

      const field = buildField();

      // Mi Pokémon → Adversario
      const offBlocks = calcSideMoves(gen, attacker, defender, field, 'p1', p1Name);

      // Adversario → Mi Pokémon (field sides invertidos de forma simple: mismo field)
      const fieldRev = buildField();
      // Intercambiar helping hand de lados para el cálculo inverso
      const tmpHH = fieldRev.attackerSide.isHelpingHand;
      fieldRev.attackerSide.isHelpingHand = fieldRev.defenderSide.isHelpingHand;
      fieldRev.defenderSide.isHelpingHand = tmpHH;

      const defBlocks = calcSideMoves(gen, defender, attacker, fieldRev, 'p2', p2Name);

      if (!offBlocks.length && !defBlocks.length) {
        output.innerHTML = `<div class="text-center text-slate-400 py-6">
          <p>No hay movimientos ofensivos con daño para mostrar</p>
          <p class="text-xs mt-1">(Estado, inmunidades y 0 daño se ocultan)</p>
        </div>`;
        return;
      }

      let html = '';
      html += renderBlocks(`${p1Name} → ${p2Name}`, offBlocks, 'text-orange-700');
      html += renderBlocks(`${p2Name} → ${p1Name}`, defBlocks, 'text-slate-700');
      output.innerHTML = html;

      output.querySelectorAll('.btn-note').forEach(btn => {
        btn.addEventListener('click', () => {
          saveSingleNote(btn.dataset.species, btn.dataset.move, btn.dataset.summary);
        });
      });
    } catch (err) {
      console.error(err);
      output.innerHTML = `<div class="text-center text-red-500 py-6">
        <p class="font-medium">Error</p>
        <p class="text-sm mt-1">${err.message || err}</p>
        <p class="text-xs mt-2 text-slate-400">Usa nombres en inglés (Gholdengo, Incineroar, Make It Rain…)</p>
      </div>`;
    }
  }

  // Move autocomplete
  if (typeof setupMoveAutocomplete === 'function') {
    setupMoveAutocomplete('.move-input, #p1-move1, #p1-move2, #p1-move3, #p1-move4, #p2-move1, #p2-move2, #p2-move3, #p2-move4');
  }

  // ---------- Autocomplete de Pokémon + sets ----------
  function setupSpeciesAutocomplete() {
    if (typeof calc === 'undefined') {
      setTimeout(setupSpeciesAutocomplete, 400);
      return;
    }

    const entries = [];

    if (typeof SETDEX_CHAMPIONS !== 'undefined') {
      for (const species in SETDEX_CHAMPIONS) {
        for (const setName in SETDEX_CHAMPIONS[species]) {
          entries.push({
            label: `${species} ${setName}`,
            species,
            setName,
            data: SETDEX_CHAMPIONS[species][setName],
            isSet: true
          });
        }
      }
    }

    try {
      const unique = new Set();
      if (calc.SPECIES && calc.SPECIES[9]) {
        for (const id in calc.SPECIES[9]) {
          const s = calc.SPECIES[9][id];
          if (s && s.name) unique.add(s.name);
        }
      }
      if (typeof SETDEX_CHAMPIONS !== 'undefined') {
        Object.keys(SETDEX_CHAMPIONS).forEach(sp => unique.add(sp));
      }
      [...unique].sort().forEach(sp => {
        entries.push({ label: sp, species: sp, setName: '(Blank)', data: null, isSet: false });
      });
    } catch (e) {
      console.warn('[Calc] species list:', e);
    }

    function applySetToSide(side, setData, speciesName) {
      document.getElementById(side + '-species').value = speciesName;
      if (setData) {
        if (setData.nature) document.getElementById(side + '-nature').value = setData.nature;
        if (setData.ability) document.getElementById(side + '-ability').value = setData.ability;
        if (setData.item) document.getElementById(side + '-item').value = setData.item;
        if (setData.sps) {
          const keyMap = { hp: 'hp', at: 'atk', atk: 'atk', df: 'def', def: 'def', sa: 'spa', spa: 'spa', sd: 'spd', spd: 'spd', sp: 'spe', spe: 'spe' };
          ['hp', 'atk', 'def', 'spa', 'spd', 'spe'].forEach(stat => {
            const slider = document.querySelector(`.sp-slider[data-side="${side}"][data-stat="${stat}"]`);
            const input = document.querySelector(`.sp-input[data-side="${side}"][data-stat="${stat}"]`);
            if (slider) slider.value = 0;
            if (input) input.value = 0;
          });
          for (const [key, value] of Object.entries(setData.sps)) {
            const stat = keyMap[key];
            if (!stat) continue;
            const val = clampSP(value);
            const slider = document.querySelector(`.sp-slider[data-side="${side}"][data-stat="${stat}"]`);
            const input = document.querySelector(`.sp-input[data-side="${side}"][data-stat="${stat}"]`);
            if (slider) slider.value = val;
            if (input) input.value = val;
          }
          updateSPTotal(side);
        }
        if (setData.moves) {
          for (let i = 0; i < 4; i++) {
            const el = document.getElementById(`${side}-move${i + 1}`);
            if (el) el.value = setData.moves[i] || '';
          }
        }
      }
      updateSprite(side);
      runCalculation();
    }

    function bindSpeciesInput(inputId, side) {
      const input = document.getElementById(inputId);
      if (!input || input.dataset.speciesAc === '1') return;
      input.dataset.speciesAc = '1';

      if (!input.parentElement.classList.contains('species-ac-wrapper')) {
        const wrap = document.createElement('div');
        wrap.className = 'species-ac-wrapper relative w-full';
        input.parentNode.insertBefore(wrap, input);
        wrap.appendChild(input);
      }
      const wrapper = input.parentElement;
      let listEl = null;
      let active = -1;

      const close = () => {
        if (listEl) listEl.remove();
        listEl = null;
        active = -1;
      };

      input.addEventListener('input', () => {
        const q = input.value.trim().toLowerCase();
        if (q.length < 1) return close();
        const matches = entries
          .filter(e => e.label.toLowerCase().includes(q) || e.species.toLowerCase().includes(q))
          .slice(0, 16);
        close();
        if (!matches.length) return;

        listEl = document.createElement('div');
        listEl.className = 'autocomplete-list absolute z-[60] left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto mt-1';

        matches.forEach(item => {
          const div = document.createElement('div');
          div.className = 'autocomplete-item px-3 py-2 text-sm cursor-pointer hover:bg-orange-50';
          div.innerHTML = item.isSet
            ? `<strong>${item.species}</strong> <span class="text-slate-500 text-xs">${item.setName}</span>`
            : `<strong>${item.species}</strong> <span class="text-slate-400 text-xs">(Blank)</span>`;
          div.addEventListener('mousedown', e => {
            e.preventDefault();
            if (item.isSet && item.data) applySetToSide(side, item.data, item.species);
            else {
              input.value = item.species;
              updateSprite(side);
              runCalculation();
            }
            close();
          });
          listEl.appendChild(div);
        });
        wrapper.appendChild(listEl);
      });

      input.addEventListener('keydown', e => {
        if (!listEl) return;
        const items = listEl.querySelectorAll('.autocomplete-item');
        if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, items.length - 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); }
        else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); items[active].dispatchEvent(new Event('mousedown')); }
        else if (e.key === 'Escape') close();
        items.forEach((it, i) => it.classList.toggle('bg-orange-100', i === active));
      });

      document.addEventListener('click', e => {
        if (!wrapper.contains(e.target)) close();
      });
    }

    bindSpeciesInput('p1-species', 'p1');
    bindSpeciesInput('p2-species', 'p2');
    console.log('%c[Calc] Autocomplete especies:', 'color: #16a34a', entries.length, 'entradas');
  }

  setupSpeciesAutocomplete();

  window.runCalculation = runCalculation;
  runCalculation();
});
