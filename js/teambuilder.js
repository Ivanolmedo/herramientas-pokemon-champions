/**
 * teambuilder.js - Versión final actual
 * - Sin conversión EVs/SP (números directos)
 * - Aviso si > 66 SP
 * - Análisis defensivo con balance neto
 * - Cobertura ofensiva + Speed Control
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('%c[Teambuilder] Cargado', 'color: #ea580c; font-weight: bold;');

  // ======================================================
  // ESTADO
  // ======================================================
  let team = [null, null, null, null, null, null];
  let currentEditingSlot = null;

  // ======================================================
  // UTILIDADES
  // ======================================================
  function toID(text) {
    return (text || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  function validateSP(sp) {
    sp = Number(sp) || 0;
    if (sp < 0) return 0;
    if (sp > 32) return 32;
    return sp;
  }

  function checkSPLimit(poke, slotIndex) {
    if (!poke || !poke.sps) return;
    const total = Object.values(poke.sps).reduce((sum, v) => sum + (Number(v) || 0), 0);
    if (total > 66) {
      alert(`⚠️ Slot ${slotIndex + 1} (${poke.species}) tiene ${total} Stat Points.\nEl máximo es 66. Revisa la distribución.`);
    }
  }

  // ======================================================
  // RENDER SLOTS
  // ======================================================
  function renderTeamSlots() {
    const container = document.getElementById('team-slots');
    if (!container) return;
    container.innerHTML = '';

    team.forEach((poke, index) => {
      const slot = document.createElement('div');
      slot.className = `team-slot relative bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-3 cursor-pointer hover:border-orange-300 hover:bg-orange-50/50 transition min-h-[140px] flex flex-col items-center justify-center text-center group`;
      slot.dataset.slot = index;

      if (poke && poke.species) {
        slot.classList.remove('border-dashed', 'border-slate-200');
        slot.classList.add('border-orange-200', 'bg-white');

        const spriteId = toID(poke.species);
        slot.innerHTML = `
          <img src="https://play.pokemonshowdown.com/sprites/gen5/${spriteId}.png" 
               alt="${poke.species}" class="w-16 h-16 object-contain mb-1"
               onerror="this.style.display='none'">
          <p class="font-semibold text-sm text-slate-800 leading-tight">${poke.species}</p>
          <p class="text-xs text-slate-500 mt-0.5 truncate w-full px-1">${poke.item || 'Sin objeto'}</p>
          <button class="absolute top-1.5 right-1.5 w-6 h-6 bg-red-100 hover:bg-red-200 text-red-600 rounded-full text-xs opacity-0 group-hover:opacity-100 transition remove-btn" data-slot="${index}">
            <i class="fa-solid fa-xmark"></i>
          </button>
        `;
      } else {
        slot.innerHTML = `
          <div class="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 mb-2">
            <i class="fa-solid fa-plus text-xl"></i>
          </div>
          <p class="text-xs text-slate-400">Slot ${index + 1}</p>
        `;
      }

      slot.addEventListener('click', (e) => {
        if (e.target.closest('.remove-btn')) return;
        openEditor(index);
      });

      container.appendChild(slot);
    });

    document.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = Number(btn.dataset.slot);
        team[idx] = null;
        renderTeamSlots();
        updateTypeAnalysis();
        updateAssistance();
        if (currentEditingSlot === idx) closeEditor();
      });
    });
  }

  // ======================================================
  // EDITOR
  // ======================================================
  function openEditor(slotIndex) {
    currentEditingSlot = slotIndex;
    const editor = document.getElementById('pokemon-editor');
    document.getElementById('editing-slot-label').textContent = `Slot ${slotIndex + 1}`;
    editor.classList.remove('hidden');

    const poke = team[slotIndex];

    document.getElementById('edit-species').value = poke?.species || '';
    document.getElementById('edit-nature').value  = poke?.nature  || 'Serious';
    document.getElementById('edit-ability').value = poke?.ability || '';
    document.getElementById('edit-item').value    = poke?.item    || '';
    document.getElementById('edit-move1').value   = poke?.moves?.[0] || '';
    document.getElementById('edit-move2').value   = poke?.moves?.[1] || '';
    document.getElementById('edit-move3').value   = poke?.moves?.[2] || '';
    document.getElementById('edit-move4').value   = poke?.moves?.[3] || '';

    const sps = poke?.sps || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    ['hp', 'atk', 'def', 'spa', 'spd', 'spe'].forEach(stat => {
      const val = sps[stat] || 0;
      const slider = document.querySelector(`.edit-sp-slider[data-stat="${stat}"]`);
      const input  = document.querySelector(`.edit-sp-input[data-stat="${stat}"]`);
      if (slider) slider.value = val;
      if (input)  input.value  = val;
    });

    updateEditSPCounter();
    updateEditSprite();
    editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function closeEditor() {
    document.getElementById('pokemon-editor').classList.add('hidden');
    currentEditingSlot = null;
  }

  function saveCurrentPokemon() {
    if (currentEditingSlot === null) return;

    const sps = {};
    ['hp', 'atk', 'def', 'spa', 'spd', 'spe'].forEach(stat => {
      const input = document.querySelector(`.edit-sp-input[data-stat="${stat}"]`);
      sps[stat] = validateSP(input?.value);
    });

    const species = document.getElementById('edit-species').value.trim();
    if (!species) {
      alert('Debes indicar un Pokémon');
      return;
    }

    team[currentEditingSlot] = {
      species,
      nature:  document.getElementById('edit-nature').value,
      ability: document.getElementById('edit-ability').value.trim(),
      item:    document.getElementById('edit-item').value.trim(),
      sps,
      moves: [
        document.getElementById('edit-move1').value.trim(),
        document.getElementById('edit-move2').value.trim(),
        document.getElementById('edit-move3').value.trim(),
        document.getElementById('edit-move4').value.trim()
      ]
    };

    checkSPLimit(team[currentEditingSlot], currentEditingSlot);
    renderTeamSlots();
    updateTypeAnalysis();
    updateAssistance();
    closeEditor();
  }

  // ======================================================
  // STAT POINTS
  // ======================================================
  function setupEditSPControls() {
    document.querySelectorAll('.edit-sp-slider, .edit-sp-input').forEach(el => {
      el.addEventListener('input', function () {
        const stat = this.dataset.stat;
        let value = validateSP(this.value);

        const slider = document.querySelector(`.edit-sp-slider[data-stat="${stat}"]`);
        const input  = document.querySelector(`.edit-sp-input[data-stat="${stat}"]`);
        if (slider) slider.value = value;
        if (input)  input.value  = value;

        updateEditSPCounter();
      });
    });
  }

  function updateEditSPCounter() {
    let total = 0;
    document.querySelectorAll('.edit-sp-input').forEach(input => {
      total += Number(input.value) || 0;
    });

    const counter = document.getElementById('edit-sp-remaining');
    if (counter) {
      counter.textContent = `${total} / 66`;
      counter.classList.toggle('text-red-600', total > 66);
      counter.classList.toggle('text-orange-600', total <= 66);
    }
  }

  // ======================================================
  // SPRITES
  // ======================================================
  function updateEditSprite() {
    const name = document.getElementById('edit-species').value.trim();
    const img  = document.getElementById('edit-sprite');
    if (!img) return;

    if (!name) {
      img.classList.add('hidden');
      return;
    }

    img.src = `https://play.pokemonshowdown.com/sprites/gen5/${toID(name)}.png`;
    img.alt = name;
    img.classList.remove('hidden');
    img.onerror = () => img.classList.add('hidden');
  }

  // ======================================================
  // AUTOCOMPLETADO
  // ======================================================
  function setupSetsAutocomplete() {
    if (typeof SETDEX_CHAMPIONS === 'undefined' || typeof calc === 'undefined') {
      setTimeout(setupSetsAutocomplete, 400);
      return;
    }

    const allSets = [];

    for (const species in SETDEX_CHAMPIONS) {
      for (const setName in SETDEX_CHAMPIONS[species]) {
        allSets.push({
          label: `${species} ${setName}`,
          species,
          setName,
          data: SETDEX_CHAMPIONS[species][setName],
          isSet: true
        });
      }
    }

    const allSpecies = Object.keys(calc.SPECIES?.[9] || calc.SPECIES || {}).sort();
    allSpecies.forEach(sp => {
      allSets.push({
        label: sp,
        species: sp,
        setName: '(Blank)',
        data: null,
        isSet: false
      });
    });

    const input = document.getElementById('edit-species');
    if (!input) return;

    if (!input.parentElement.classList.contains('autocomplete-wrapper')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'autocomplete-wrapper flex-1';
      input.parentNode.insertBefore(wrapper, input);
      wrapper.appendChild(input);
    }

    const wrapper = input.parentElement;
    let listEl = null;
    let active = -1;

    const close = () => {
      if (listEl) {
        listEl.remove();
        listEl = null;
        active = -1;
      }
    };

    input.addEventListener('input', () => {
      const val = input.value.trim().toLowerCase();
      if (val.length < 1) return close();

      const matches = allSets
        .filter(s => s.label.toLowerCase().includes(val) || s.species.toLowerCase().includes(val))
        .slice(0, 16);

      close();
      if (!matches.length) return;

      listEl = document.createElement('div');
      listEl.className = 'autocomplete-list';

      matches.forEach(item => {
        const div = document.createElement('div');
        div.className = 'autocomplete-item';

        if (item.isSet) {
          div.innerHTML = `<strong>${item.species}</strong> <span class="text-slate-500 text-xs">${item.setName}</span>`;
        } else {
          div.innerHTML = `<strong>${item.species}</strong> <span class="text-slate-400 text-xs">(Blank)</span>`;
        }

        div.addEventListener('mousedown', e => {
          e.preventDefault();

          if (item.isSet && item.data) {
            applySetToEditor(item.data, item.species);
          } else {
            document.getElementById('edit-species').value = item.species;
            document.getElementById('edit-ability').value = '';
            document.getElementById('edit-item').value = '';
            document.getElementById('edit-nature').value = 'Serious';
            ['hp','atk','def','spa','spd','spe'].forEach(stat => {
              document.querySelector(`.edit-sp-slider[data-stat="${stat}"]`).value = 0;
              document.querySelector(`.edit-sp-input[data-stat="${stat}"]`).value = 0;
            });
            document.getElementById('edit-move1').value = '';
            document.getElementById('edit-move2').value = '';
            document.getElementById('edit-move3').value = '';
            document.getElementById('edit-move4').value = '';
            updateEditSPCounter();
          }

          input.value = item.species;
          updateEditSprite();
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
      else if (e.key === 'Enter' && active >= 0) {
        e.preventDefault();
        items[active].dispatchEvent(new Event('mousedown'));
      } else if (e.key === 'Escape') close();
      items.forEach((it, i) => it.classList.toggle('active', i === active));
    });

    document.addEventListener('click', e => {
      if (!wrapper.contains(e.target)) close();
    });
  }

  function applySetToEditor(setData, speciesName) {
    document.getElementById('edit-species').value = speciesName;
    if (setData.nature)  document.getElementById('edit-nature').value  = setData.nature;
    if (setData.ability) document.getElementById('edit-ability').value = setData.ability;
    if (setData.item)    document.getElementById('edit-item').value    = setData.item;

    if (setData.sps) {
      const keyMap = {
        hp: 'hp', at: 'atk', atk: 'atk',
        df: 'def', def: 'def',
        sa: 'spa', spa: 'spa',
        sd: 'spd', spd: 'spd',
        sp: 'spe', spe: 'spe'
      };

      ['hp','atk','def','spa','spd','spe'].forEach(stat => {
        document.querySelector(`.edit-sp-slider[data-stat="${stat}"]`).value = 0;
        document.querySelector(`.edit-sp-input[data-stat="${stat}"]`).value = 0;
      });

      for (const [key, value] of Object.entries(setData.sps)) {
        const stat = keyMap[key];
        if (!stat) continue;
        const val = validateSP(value);
        document.querySelector(`.edit-sp-slider[data-stat="${stat}"]`).value = val;
        document.querySelector(`.edit-sp-input[data-stat="${stat}"]`).value = val;
      }
      updateEditSPCounter();
    }

    if (setData.moves) {
      document.getElementById('edit-move1').value = setData.moves[0] || '';
      document.getElementById('edit-move2').value = setData.moves[1] || '';
      document.getElementById('edit-move3').value = setData.moves[2] || '';
      document.getElementById('edit-move4').value = setData.moves[3] || '';
    }

    updateEditSprite();
  }



  // ======================================================
  // ANÁLISIS COMPLETO
  // ======================================================
  function updateTypeAnalysis() {
    const container = document.getElementById('team-analysis');
    if (!container) return;

    const activePokes = team.filter(p => p && p.species);
    if (activePokes.length === 0) {
      container.innerHTML = `<p class="text-center py-8 text-slate-400">Agrega Pokémon a tu equipo para ver el análisis.</p>`;
      return;
    }

    // Tabla de tipos (TYPE_CHART[defendingType][attackingType])
    const TYPE_CHART = {
      Normal:   { Normal:1, Fire:1, Water:1, Electric:1, Grass:1, Ice:1, Fighting:2, Poison:1, Ground:1, Flying:1, Psychic:1, Bug:1, Rock:1, Ghost:0, Dragon:1, Dark:1, Steel:1, Fairy:1 },
      Fire:     { Normal:1, Fire:0.5, Water:2, Electric:1, Grass:0.5, Ice:0.5, Fighting:1, Poison:1, Ground:2, Flying:1, Psychic:1, Bug:0.5, Rock:2, Ghost:1, Dragon:1, Dark:1, Steel:0.5, Fairy:0.5 },
      Water:    { Normal:1, Fire:0.5, Water:0.5, Electric:2, Grass:2, Ice:0.5, Fighting:1, Poison:1, Ground:1, Flying:1, Psychic:1, Bug:1, Rock:1, Ghost:1, Dragon:1, Dark:1, Steel:0.5, Fairy:1 },
      Electric: { Normal:1, Fire:1, Water:1, Electric:0.5, Grass:1, Ice:1, Fighting:1, Poison:1, Ground:2, Flying:0.5, Psychic:1, Bug:1, Rock:1, Ghost:1, Dragon:1, Dark:1, Steel:0.5, Fairy:1 },
      Grass:    { Normal:1, Fire:2, Water:0.5, Electric:0.5, Grass:0.5, Ice:2, Fighting:1, Poison:2, Ground:0.5, Flying:2, Psychic:1, Bug:2, Rock:1, Ghost:1, Dragon:1, Dark:1, Steel:1, Fairy:1 },
      Ice:      { Normal:1, Fire:2, Water:1, Electric:1, Grass:1, Ice:0.5, Fighting:2, Poison:1, Ground:1, Flying:1, Psychic:1, Bug:1, Rock:2, Ghost:1, Dragon:1, Dark:1, Steel:2, Fairy:1 },
      Fighting: { Normal:1, Fire:1, Water:1, Electric:1, Grass:1, Ice:1, Fighting:1, Poison:1, Ground:1, Flying:2, Psychic:2, Bug:0.5, Rock:0.5, Ghost:1, Dragon:1, Dark:0.5, Steel:1, Fairy:2 },
      Poison:   { Normal:1, Fire:1, Water:1, Electric:1, Grass:0.5, Ice:1, Fighting:0.5, Poison:0.5, Ground:2, Flying:1, Psychic:2, Bug:0.5, Rock:1, Ghost:1, Dragon:1, Dark:1, Steel:1, Fairy:0.5 },
      Ground:   { Normal:1, Fire:1, Water:2, Electric:0, Grass:2, Ice:2, Fighting:1, Poison:0.5, Ground:1, Flying:1, Psychic:1, Bug:1, Rock:0.5, Ghost:1, Dragon:1, Dark:1, Steel:1, Fairy:1 },
      Flying:   { Normal:1, Fire:1, Water:1, Electric:2, Grass:0.5, Ice:2, Fighting:0.5, Poison:1, Ground:0, Flying:1, Psychic:1, Bug:0.5, Rock:2, Ghost:1, Dragon:1, Dark:1, Steel:1, Fairy:1 },
      Psychic:  { Normal:1, Fire:1, Water:1, Electric:1, Grass:1, Ice:1, Fighting:0.5, Poison:1, Ground:1, Flying:1, Psychic:0.5, Bug:2, Rock:1, Ghost:2, Dragon:1, Dark:2, Steel:1, Fairy:1 },
      Bug:      { Normal:1, Fire:2, Water:1, Electric:1, Grass:0.5, Ice:1, Fighting:0.5, Poison:1, Ground:0.5, Flying:2, Psychic:1, Bug:1, Rock:2, Ghost:1, Dragon:1, Dark:1, Steel:1, Fairy:1 },
      Rock:     { Normal:0.5, Fire:0.5, Water:2, Electric:1, Grass:2, Ice:1, Fighting:2, Poison:0.5, Ground:2, Flying:0.5, Psychic:1, Bug:1, Rock:1, Ghost:1, Dragon:1, Dark:1, Steel:2, Fairy:1 },
      Ghost:    { Normal:0, Fire:1, Water:1, Electric:1, Grass:1, Ice:1, Fighting:0, Poison:0.5, Ground:1, Flying:1, Psychic:1, Bug:0.5, Rock:1, Ghost:2, Dragon:1, Dark:2, Steel:1, Fairy:1 },
      Dragon:   { Normal:1, Fire:0.5, Water:0.5, Electric:0.5, Grass:0.5, Ice:2, Fighting:1, Poison:1, Ground:1, Flying:1, Psychic:1, Bug:1, Rock:1, Ghost:1, Dragon:2, Dark:1, Steel:1, Fairy:2 },
      Dark:     { Normal:1, Fire:1, Water:1, Electric:1, Grass:1, Ice:1, Fighting:2, Poison:1, Ground:1, Flying:1, Psychic:0, Bug:2, Rock:1, Ghost:0.5, Dragon:1, Dark:0.5, Steel:1, Fairy:2 },
      Steel:    { Normal:0.5, Fire:2, Water:1, Electric:1, Grass:0.5, Ice:0.5, Fighting:2, Poison:0, Ground:2, Flying:0.5, Psychic:0.5, Bug:0.5, Rock:0.5, Ghost:1, Dragon:0.5, Dark:1, Steel:0.5, Fairy:0.5 },
      Fairy:    { Normal:1, Fire:1, Water:1, Electric:1, Grass:1, Ice:1, Fighting:0.5, Poison:2, Ground:1, Flying:1, Psychic:1, Bug:0.5, Rock:1, Ghost:1, Dragon:0, Dark:0.5, Steel:2, Fairy:1 }
    };

    const typesList = Object.keys(TYPE_CHART);

    // --- Defensive ---
    const weakCount = {}, resistCount = {}, immuneCount = {};
    typesList.forEach(t => {
      weakCount[t] = 0;
      resistCount[t] = 0;
      immuneCount[t] = 0;
    });

    function getPokemonTypes(speciesName) {
      try {
        if (typeof calc !== 'undefined') {
          const gen = calc.Generations.get(9);
          const species = gen.species.get(toID(speciesName));
          if (species && species.types) return species.types;
        }
      } catch (e) {}
      return null;
    }

    activePokes.forEach(poke => {
      const defendTypes = getPokemonTypes(poke.species);
      if (!defendTypes) return;

      typesList.forEach(attackType => {
        let multiplier = 1;
        defendTypes.forEach(defType => {
          const chart = TYPE_CHART[defType];
          if (chart && chart[attackType] !== undefined) {
            multiplier *= chart[attackType];
          }
        });

        if (multiplier === 0) immuneCount[attackType]++;
        else if (multiplier >= 2) weakCount[attackType]++;
        else if (multiplier <= 0.5) resistCount[attackType]++;
      });
    });

    // Balance neto
    const riskScore = {};
    typesList.forEach(t => {
      riskScore[t] = (weakCount[t] || 0) - (resistCount[t] || 0) - (immuneCount[t] || 0);
    });

    // --- Offensive Coverage ---
    const coveredTypes = new Set();
    const allMoves = [];

    activePokes.forEach(poke => {
      (poke.moves || []).forEach(moveName => {
        if (!moveName) return;
        allMoves.push(moveName);

        try {
          if (typeof calc !== 'undefined') {
            const gen = calc.Generations.get(9);
            const move = gen.moves.get(toID(moveName));
            if (!move || !move.type) return;

            const moveType = move.type;
            typesList.forEach(defType => {
              const chart = TYPE_CHART[defType];
              if (chart && chart[moveType] >= 2) {
                coveredTypes.add(defType);
              }
            });
          }
        } catch (e) {}
      });
    });

    const uncoveredTypes = typesList.filter(t => !coveredTypes.has(t));

    // --- Speed Control ---
    const SPEED_CONTROL_MOVES = {
      'Tailwind': 'Tailwind',
      'Trick Room': 'Trick Room',
      'Icy Wind': 'Icy Wind',
      'Electroweb': 'Electroweb',
      'Thunder Wave': 'Thunder Wave',
      'Scary Face': 'Scary Face',
      'String Shot': 'String Shot',
      'Bulldoze': 'Bulldoze',
      'Rock Tomb': 'Rock Tomb',
      'Low Sweep': 'Low Sweep',
      'Sticky Web': 'Sticky Web'
    };

    const foundSpeedControl = new Set();
    allMoves.forEach(moveName => {
      const clean = moveName.trim();
      if (SPEED_CONTROL_MOVES[clean]) {
        foundSpeedControl.add(SPEED_CONTROL_MOVES[clean]);
      }
    });

    // ========== HTML ==========
    let html = `
      <div class="space-y-6">
        <!-- DEFENSIVE -->
        <div>
          <h4 class="font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <i class="fa-solid fa-shield text-orange-500"></i> Perfil Defensivo
          </h4>
          <p class="text-xs text-slate-500 mb-3">
            Balance neto: debilidades − resistencias/inmunidades (${activePokes.length} Pokémon)
          </p>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
    `;

    typesList.forEach(type => {
      const score = riskScore[type];
      let bg = 'bg-slate-100 text-slate-700';
      let text = 'Equilibrado';

      if (score >= 2) {
        bg = 'bg-red-100 text-red-800 border border-red-200';
        text = `Alta debilidad`;
      } else if (score === 1) {
        bg = 'bg-orange-100 text-orange-800 border border-orange-200';
        text = `Ligeramente débil`;
      } else if (score <= -2) {
        bg = 'bg-green-100 text-green-800 border border-green-200';
        text = `Muy resistente`;
      } else if (score === -1) {
        bg = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
        text = `Resistente`;
      }

      html += `
        <div class="rounded-xl px-2 py-2.5 text-center ${bg}">
          <div class="font-bold">${type}</div>
          <div class="text-[11px] mt-0.5 opacity-90">${text}</div>
        </div>
      `;
    });

    html += `</div>`;

    const highRisk = typesList.filter(t => riskScore[t] >= 2);
    const lowRisk = typesList.filter(t => riskScore[t] === 1);

    if (highRisk.length > 0) {
      html += `
        <div class="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          <i class="fa-solid fa-triangle-exclamation mr-1.5"></i>
          <strong>Alta debilidad</strong> a: <strong>${highRisk.join(', ')}</strong>
        </div>
      `;
    }
    if (lowRisk.length > 0) {
      html += `
        <div class="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-800">
          <i class="fa-solid fa-circle-exclamation mr-1.5"></i>
          Ligeramente débil a: <strong>${lowRisk.join(', ')}</strong>
        </div>
      `;
    }

    html += `</div>`;

    // OFFENSIVE
    html += `
      <div>
        <h4 class="font-semibold text-slate-700 mb-2 flex items-center gap-2">
          <i class="fa-solid fa-crosshairs text-orange-500"></i> Cobertura Ofensiva
        </h4>
    `;

    if (uncoveredTypes.length === 0) {
      html += `
        <div class="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
          <i class="fa-solid fa-check mr-1.5"></i>
          El equipo tiene super efectivo contra <strong>todos</strong> los tipos.
        </div>
      `;
    } else {
      html += `
        <p class="text-xs text-slate-500 mb-2">Tipos a los que el equipo <strong>no</strong> les pega super efectivo:</p>
        <div class="flex flex-wrap gap-1.5">
          ${uncoveredTypes.map(t => `
            <span class="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-medium">${t}</span>
          `).join('')}
        </div>
      `;
    }

    html += `</div>`;

    // SPEED CONTROL
    html += `
      <div>
        <h4 class="font-semibold text-slate-700 mb-2 flex items-center gap-2">
          <i class="fa-solid fa-gauge-high text-orange-500"></i> Speed Control
        </h4>
    `;

    if (foundSpeedControl.size === 0) {
      html += `
        <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <i class="fa-solid fa-circle-exclamation mr-1.5"></i>
          El equipo <strong>no tiene</strong> herramientas de speed control detectadas.
        </div>
      `;
    } else {
      html += `
        <div class="flex flex-wrap gap-1.5">
          ${[...foundSpeedControl].map(sc => `
            <span class="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium">
              <i class="fa-solid fa-check mr-1"></i>${sc}
            </span>
          `).join('')}
        </div>
      `;
    }

    html += `</div></div>`;

    container.innerHTML = html;
  }

  // ======================================================
  // IMPORT / EXPORT
  // ======================================================
  function exportTeam() {
    let text = '';
    team.forEach(poke => {
      if (!poke || !poke.species) return;

      text += `${poke.species}${poke.item ? ' @ ' + poke.item : ''}\n`;
      if (poke.ability) text += `Ability: ${poke.ability}\n`;

      const sps = [];
      if (poke.sps?.hp)  sps.push(`${poke.sps.hp} HP`);
      if (poke.sps?.atk) sps.push(`${poke.sps.atk} Atk`);
      if (poke.sps?.def) sps.push(`${poke.sps.def} Def`);
      if (poke.sps?.spa) sps.push(`${poke.sps.spa} SpA`);
      if (poke.sps?.spd) sps.push(`${poke.sps.spd} SpD`);
      if (poke.sps?.spe) sps.push(`${poke.sps.spe} Spe`);
      if (sps.length) text += `EVs: ${sps.join(' / ')}\n`;

      if (poke.nature) text += `${poke.nature} Nature\n`;
      (poke.moves || []).forEach(m => { if (m) text += `- ${m}\n`; });
      text += '\n';
    });

    navigator.clipboard.writeText(text.trim()).then(() => {
      alert('Equipo exportado y copiado al portapapeles');
    });
  }

  function openImportModal() {
    document.getElementById('import-modal').classList.remove('hidden');
    document.getElementById('import-modal').classList.add('flex');
  }

  function closeImportModal() {
    document.getElementById('import-modal').classList.add('hidden');
    document.getElementById('import-modal').classList.remove('flex');
  }

  function importTeam() {
    const text = document.getElementById('import-text').value.trim();
    if (!text) return;

    const blocks = text.split(/\n\s*\n/);
    const newTeam = [null, null, null, null, null, null];
    let slot = 0;

    blocks.forEach(block => {
      if (slot >= 6) return;
      const lines = block.trim().split('\n').map(l => l.trim()).filter(l => l);
      if (!lines[0]) return;

      let species = lines[0];
      let item = '';
      if (lines[0].includes(' @ ')) {
        const parts = lines[0].split(' @ ');
        species = parts[0].trim();
        item = parts[1].trim();
      }

      const nickMatch = species.match(/\(([^)]+)\)$/);
      if (nickMatch) species = nickMatch[1].trim();

      const poke = {
        species: species,
        item: item,
        ability: '',
        nature: 'Serious',
        sps: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        moves: []
      };

      lines.slice(1).forEach(line => {
        if (line.startsWith('Ability:')) {
          poke.ability = line.replace('Ability:', '').trim();
        } 
        else if (line.endsWith('Nature')) {
          poke.nature = line.replace('Nature', '').trim();
        } 
        else if (line.startsWith('EVs:')) {
          const evPart = line.replace('EVs:', '').trim();
          const parts = evPart.split('/').map(p => p.trim());

          parts.forEach(part => {
            const match = part.match(/(\d+)\s*(HP|Atk|Def|SpA|SpD|Spe)/i);
            if (match) {
              const value = Number(match[1]);
              const statRaw = match[2].toLowerCase();
              const statMap = {
                'hp': 'hp', 'atk': 'atk', 'def': 'def',
                'spa': 'spa', 'spd': 'spd', 'spe': 'spe'
              };
              const stat = statMap[statRaw];
              if (stat) {
                // Sin conversión: se guarda el número tal cual
                poke.sps[stat] = validateSP(value);
              }
            }
          });
        } 
        else if (line.startsWith('- ')) {
          poke.moves.push(line.replace('- ', '').trim());
        }
      });

      newTeam[slot] = poke;
      slot++;
    });

    team = newTeam;

    // Avisar si algún Pokémon se pasa de 66 SP
    team.forEach((poke, i) => {
      if (poke) checkSPLimit(poke, i);
    });

    renderTeamSlots();
    updateTypeAnalysis();
    updateAssistance();
    closeImportModal();
  }

  // ======================================================
  // EVENTOS
  // ======================================================
  document.getElementById('btn-close-editor')?.addEventListener('click', closeEditor);
  document.getElementById('btn-save-pokemon')?.addEventListener('click', saveCurrentPokemon);
  document.getElementById('btn-remove-pokemon')?.addEventListener('click', () => {
    if (currentEditingSlot !== null) {
      team[currentEditingSlot] = null;
      renderTeamSlots();
      updateTypeAnalysis();
      updateAssistance();
      closeEditor();
    }
  });

  document.getElementById('btn-export')?.addEventListener('click', exportTeam);
  document.getElementById('btn-import')?.addEventListener('click', openImportModal);
  document.getElementById('btn-close-import')?.addEventListener('click', closeImportModal);
  document.getElementById('btn-cancel-import')?.addEventListener('click', closeImportModal);
  document.getElementById('btn-confirm-import')?.addEventListener('click', importTeam);

  document.getElementById('btn-clear')?.addEventListener('click', () => {
    if (confirm('¿Seguro que quieres borrar todo el equipo?')) {
      team = [null, null, null, null, null, null];
      renderTeamSlots();
      updateTypeAnalysis();
      updateAssistance();
      closeEditor();
    }
  });

  document.getElementById('edit-species')?.addEventListener('input', updateEditSprite);

  // ======================================================
// ASISTENCIA - Amenazas + Leads
// ======================================================

// Lista estática de amenazas populares (meta Champions actual)
// Orden aproximado por relevancia. Fácil de actualizar.
const META_THREATS = [
  { name: "Rillaboom", tags: ["Grassy", "Fake Out", "Priority"] },
  { name: "Incineroar", tags: ["Intimidate", "Fake Out", "Pivot"] },
  { name: "Sneasler", tags: ["Unburden", "Dire Claw", "Offensive"] },
  { name: "Gholdengo", tags: ["Good as Gold", "Make It Rain", "Special"] },
  { name: "Salamence-Mega", tags: ["Intimidate", "Hyper Voice", "Mega"] },
  { name: "Kingambit", tags: ["Supreme Overlord", "Sucker Punch", "Priority"] },
  { name: "Garchomp", tags: ["Rough Skin", "Ground", "Dragon"] },
  { name: "Garchomp-Mega-Z", tags: ["Rough Skin", "Special", "Mega"] },
  { name: "Volcarona", tags: ["Quiver Dance", "Bug", "Fire"] },
  { name: "Floette-Mega", tags: ["Fairy Aura", "Moonblast", "Mega"] },
  { name: "Arcanine-Hisui", tags: ["Rock Head", "Head Smash", "Physical"] },
  { name: "Farigiraf", tags: ["Armor Tail", "Psychic", "Support"] },
  { name: "Indeedee", tags: ["Psychic Surge", "Follow Me", "Support"] },
  { name: "Archaludon", tags: ["Stamina", "Body Press", "Steel"] },
  { name: "Pelipper", tags: ["Drizzle", "Hurricane", "Rain"] },
  { name: "Basculegion", tags: ["Swift Swim", "Wave Crash", "Water"] },
  { name: "Excadrill", tags: ["Sand Rush", "Iron Head", "Ground"] },
  { name: "Tyranitar-Mega", tags: ["Sand Stream", "Rock Slide", "Mega"] },
  { name: "Whimsicott", tags: ["Prankster", "Tailwind", "Speed Control"] },
  { name: "Amoonguss", tags: ["Regenerator", "Spore", "Redirection"] }
];

// Movimientos típicos de lead
const LEAD_TOOLS = {
  "Fake Out": "Fake Out",
  "Tailwind": "Tailwind",
  "Sticky Web": "Sticky Web",
  "Thunder Wave": "Thunder Wave",
  "Spore": "Spore",
  "Icy Wind": "Icy Wind",
  "Electroweb": "Electroweb",
  "Follow Me": "Follow Me",
  "Rage Powder": "Rage Powder",
  "Wide Guard": "Wide Guard",
  "Quick Guard": "Quick Guard",
  "Ally Switch": "Ally Switch"
};

function updateAssistance() {
  updateThreatDetector();
  updateLeadSuggestions();
}

function updateThreatDetector() {
  const container = document.getElementById('threat-detector');
  if (!container) return;

  const activePokes = team.filter(p => p && p.species);
  if (activePokes.length === 0) {
    container.innerHTML = `<p class="text-slate-400">Agrega Pokémon para analizar amenazas...</p>`;
    return;
  }

  // Usamos el mismo TYPE_CHART que ya tienes en updateTypeAnalysis
  // (asumimos que está disponible en el scope)

  let html = `<div class="space-y-2">`;

  META_THREATS.forEach(threat => {
    // Análisis muy básico por ahora: miramos si el equipo tiene debilidad neta al tipo principal del threat
    // (versión simple, se puede mejorar mucho después)

    const isOnTeam = activePokes.some(p => p.species.toLowerCase().includes(threat.name.toLowerCase().split('-')[0]));

    let status = "neutral";
    let statusText = "Revisar";
    let statusClass = "bg-slate-100 text-slate-600";

    if (isOnTeam) {
      statusText = "En tu equipo";
      statusClass = "bg-blue-50 text-blue-700";
    }

    html += `
      <div class="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
        <div class="flex items-center gap-2">
          <img src="https://play.pokemonshowdown.com/sprites/gen5/${toID(threat.name)}.png" 
               class="w-8 h-8 object-contain" onerror="this.style.display='none'">
          <div>
            <p class="font-medium text-sm">${threat.name}</p>
            <p class="text-[11px] text-slate-500">${threat.tags.join(" · ")}</p>
          </div>
        </div>
        <span class="text-xs px-2 py-1 rounded-lg ${statusClass}">${statusText}</span>
      </div>
    `;
  });

  html += `</div>
    <p class="text-[11px] text-slate-400 mt-3">
      Datos orientativos basados en meta actual de Champions (Pikalytics). 
      Próximamente se podrá conectar a datos en vivo.
    </p>`;

  container.innerHTML = html;
}

function updateLeadSuggestions() {
  const container = document.getElementById('lead-suggestions');
  if (!container) return;

  const activePokes = team.filter(p => p && p.species);
  if (activePokes.length === 0) {
    container.innerHTML = `<p class="text-slate-400">Agrega Pokémon para ver posibles leads...</p>`;
    return;
  }

  const leadCandidates = [];

  activePokes.forEach(poke => {
    const tools = [];
    (poke.moves || []).forEach(move => {
      if (LEAD_TOOLS[move]) tools.push(LEAD_TOOLS[move]);
    });

    // También detectamos por habilidad
    if (poke.ability === "Prankster") tools.push("Prankster");
    if (poke.ability === "Intimidate") tools.push("Intimidate");

    if (tools.length > 0) {
      leadCandidates.push({
        species: poke.species,
        tools: [...new Set(tools)]
      });
    }
  });

  if (leadCandidates.length === 0) {
    container.innerHTML = `
      <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
        <i class="fa-solid fa-circle-exclamation mr-1.5"></i>
        No se detectaron herramientas clásicas de lead (Fake Out, Tailwind, Follow Me, etc.).
      </div>
    `;
    return;
  }

  let html = `<div class="space-y-2">`;
  leadCandidates.forEach(cand => {
    html += `
      <div class="p-3 bg-blue-50 border border-blue-100 rounded-xl">
        <p class="font-medium text-sm text-blue-900">${cand.species}</p>
        <p class="text-xs text-blue-700 mt-1">
          Herramientas: ${cand.tools.join(", ")}
        </p>
      </div>
    `;
  });
  html += `</div>`;

  container.innerHTML = html;
}

  // ======================================================
  // INICIALIZACIÓN
  // ======================================================
  setupEditSPControls();
  setupSetsAutocomplete();
  renderTeamSlots();
  updateTypeAnalysis();
  updateAssistance();
});