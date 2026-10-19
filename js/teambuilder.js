/**
 * teambuilder.js
 * Versión con conexión a Pikalytics + detector de amenazas
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('%c[Teambuilder] Cargado', 'color: #ea580c; font-weight: bold;');

  // ======================================================
  // ESTADO
  // ======================================================
  let team = [null, null, null, null, null, null];
  let currentEditingSlot = null;
  let dynamicThreats = null; // se llena si Pikalytics responde

  // ======================================================
  // TABLA DE TIPOS
  // ======================================================
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
      alert(`⚠️ Slot ${slotIndex + 1} (${poke.species}) tiene ${total} Stat Points.\nEl máximo es 66.`);
    }
  }

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

  // ======================================================
  // PIKALYTICS
  // ======================================================
  const PIKALYTICS_FORMAT = 'gen9championsvgc2026regmc';
  const PIKALYTICS_URL = `https://www.pikalytics.com/ai/pokedex/${PIKALYTICS_FORMAT}`;

  // Lista de respaldo (se usa si falla el fetch)
  const META_THREATS_FALLBACK = [
    { name: "Rillaboom", types: ["Grass"], tags: ["Grassy Surge", "Fake Out"], weather: null, terrain: "Grassy", hasIntimidate: false, hasFakeOut: true, hasPriority: true },
    { name: "Incineroar", types: ["Fire", "Dark"], tags: ["Intimidate", "Fake Out"], weather: null, terrain: null, hasIntimidate: true, hasFakeOut: true, hasPriority: false },
    { name: "Sneasler", types: ["Fighting", "Poison"], tags: ["Unburden", "Priority"], weather: null, terrain: null, hasIntimidate: false, hasFakeOut: false, hasPriority: true },
    { name: "Gholdengo", types: ["Steel", "Ghost"], tags: ["Good as Gold"], weather: null, terrain: null, hasIntimidate: false, hasFakeOut: false, hasPriority: false },
    { name: "Salamence-Mega", types: ["Dragon", "Flying"], tags: ["Aerilate"], weather: null, terrain: null, hasIntimidate: false, hasFakeOut: false, hasPriority: false },
    { name: "Kingambit", types: ["Dark", "Steel"], tags: ["Supreme Overlord", "Sucker Punch"], weather: null, terrain: null, hasIntimidate: false, hasFakeOut: false, hasPriority: true },
    { name: "Garchomp", types: ["Dragon", "Ground"], tags: ["Rough Skin"], weather: null, terrain: null, hasIntimidate: false, hasFakeOut: false, hasPriority: false },
    { name: "Volcarona", types: ["Bug", "Fire"], tags: ["Quiver Dance"], weather: null, terrain: null, hasIntimidate: false, hasFakeOut: false, hasPriority: false },
    { name: "Farigiraf", types: ["Normal", "Psychic"], tags: ["Armor Tail"], weather: null, terrain: null, hasIntimidate: false, hasFakeOut: false, hasPriority: false },
    { name: "Indeedee", types: ["Psychic", "Normal"], tags: ["Psychic Surge"], weather: null, terrain: "Psychic", hasIntimidate: false, hasFakeOut: false, hasPriority: false },
    { name: "Archaludon", types: ["Steel", "Dragon"], tags: ["Stamina"], weather: null, terrain: null, hasIntimidate: false, hasFakeOut: false, hasPriority: false },
    { name: "Pelipper", types: ["Water", "Flying"], tags: ["Drizzle"], weather: "Rain", terrain: null, hasIntimidate: false, hasFakeOut: false, hasPriority: false },
    { name: "Basculegion", types: ["Water", "Ghost"], tags: ["Swift Swim"], weather: null, terrain: null, hasIntimidate: false, hasFakeOut: false, hasPriority: false },
    { name: "Excadrill", types: ["Ground", "Steel"], tags: ["Sand Rush"], weather: "Sand", terrain: null, hasIntimidate: false, hasFakeOut: false, hasPriority: false },
    { name: "Whimsicott", types: ["Grass", "Fairy"], tags: ["Prankster", "Tailwind"], weather: null, terrain: null, hasIntimidate: false, hasFakeOut: false, hasPriority: false },
    { name: "Amoonguss", types: ["Grass", "Poison"], tags: ["Regenerator", "Spore"], weather: null, terrain: null, hasIntimidate: false, hasFakeOut: false, hasPriority: false }
  ];

  async function loadMetaFromPikalytics() {
    try {
      const res = await fetch(PIKALYTICS_URL, {
        method: 'GET',
        headers: { 'Accept': 'text/markdown, text/plain, */*' }
      });

      if (!res.ok) throw new Error('HTTP ' + res.status);

      const text = await res.text();
      const lines = text.split('\n');
      const threats = [];

      for (const line of lines) {
        // | 1 | **Rillaboom** | 35.20% | ...
        const match = line.match(/^\|\s*(\d+)\s*\|\s*\*\*([^*]+)\*\*\s*\|/);
        if (match) {
          const rank = Number(match[1]);
          const name = match[2].trim();

          if (rank <= 25 && name) {
            let types = [];
            try {
              if (typeof calc !== 'undefined') {
                const gen = calc.Generations.get(9);
                const species = gen.species.get(toID(name));
                if (species && species.types) types = species.types;
              }
            } catch (e) {}

            threats.push({
              name,
              types: types.length ? types : ["Normal"],
              tags: [`#${rank} Usage`],
              weather: null,
              terrain: null,
              hasIntimidate: false,
              hasFakeOut: false,
              hasPriority: false
            });
          }
        }
      }

      if (threats.length >= 10) {
        dynamicThreats = threats;
        console.log('%c[Pikalytics] Meta cargada correctamente', 'color: #16a34a', threats.map(t => t.name));
        return true;
      }

      console.warn('[Pikalytics] No se extrajeron suficientes Pokémon');
      return false;
    } catch (err) {
      console.warn('[Pikalytics] Falló la carga (CORS o red):', err.message);
      return false;
    }
  }

  function getThreatList() {
    return (dynamicThreats && dynamicThreats.length > 0) ? dynamicThreats : META_THREATS_FALLBACK;
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

        slot.innerHTML = `
          <img src="https://play.pokemonshowdown.com/sprites/gen5/${toID(poke.species)}.png" 
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
        updateAllAnalysis();
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
    updateAllAnalysis();
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
      allSets.push({ label: sp, species: sp, setName: '(Blank)', data: null, isSet: false });
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

    const close = () => { if (listEl) { listEl.remove(); listEl = null; active = -1; } };

    input.addEventListener('input', () => {
      const val = input.value.trim().toLowerCase();
      if (val.length < 1) return close();

      const matches = allSets.filter(s => s.label.toLowerCase().includes(val) || s.species.toLowerCase().includes(val)).slice(0, 16);
      close();
      if (!matches.length) return;

      listEl = document.createElement('div');
      listEl.className = 'autocomplete-list';

      matches.forEach(item => {
        const div = document.createElement('div');
        div.className = 'autocomplete-item';
        div.innerHTML = item.isSet
          ? `<strong>${item.species}</strong> <span class="text-slate-500 text-xs">${item.setName}</span>`
          : `<strong>${item.species}</strong> <span class="text-slate-400 text-xs">(Blank)</span>`;

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
            ['edit-move1','edit-move2','edit-move3','edit-move4'].forEach(id => document.getElementById(id).value = '');
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
      else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); items[active].dispatchEvent(new Event('mousedown')); }
      else if (e.key === 'Escape') close();
      items.forEach((it, i) => it.classList.toggle('active', i === active));
    });

    document.addEventListener('click', e => { if (!wrapper.contains(e.target)) close(); });
  }

  function applySetToEditor(setData, speciesName) {
    document.getElementById('edit-species').value = speciesName;
    if (setData.nature)  document.getElementById('edit-nature').value  = setData.nature;
    if (setData.ability) document.getElementById('edit-ability').value = setData.ability;
    if (setData.item)    document.getElementById('edit-item').value    = setData.item;

    if (setData.sps) {
      const keyMap = { hp:'hp', at:'atk', atk:'atk', df:'def', def:'def', sa:'spa', spa:'spa', sd:'spd', spd:'spd', sp:'spe', spe:'spe' };
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
  // ANÁLISIS
  // ======================================================
  function updateAllAnalysis() {
    updateTypeAnalysis();
    updateThreatDetector();
    updateLeadSuggestions();
  }

  function updateTypeAnalysis() {
    const container = document.getElementById('team-analysis');
    if (!container) return;

    const activePokes = team.filter(p => p && p.species);
    if (activePokes.length === 0) {
      container.innerHTML = `<p class="text-center py-8 text-slate-400">Agrega Pokémon a tu equipo para ver el análisis.</p>`;
      return;
    }

    const typesList = Object.keys(TYPE_CHART);
    const weakCount = {}, resistCount = {}, immuneCount = {};
    typesList.forEach(t => { weakCount[t] = 0; resistCount[t] = 0; immuneCount[t] = 0; });

    activePokes.forEach(poke => {
      const defendTypes = getPokemonTypes(poke.species);
      if (!defendTypes) return;
      typesList.forEach(attackType => {
        let mult = 1;
        defendTypes.forEach(dt => {
          if (TYPE_CHART[dt] && TYPE_CHART[dt][attackType] !== undefined) mult *= TYPE_CHART[dt][attackType];
        });
        if (mult === 0) immuneCount[attackType]++;
        else if (mult >= 2) weakCount[attackType]++;
        else if (mult <= 0.5) resistCount[attackType]++;
      });
    });

    const riskScore = {};
    typesList.forEach(t => {
      riskScore[t] = (weakCount[t] || 0) - (resistCount[t] || 0) - (immuneCount[t] || 0);
    });

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
            typesList.forEach(defType => {
              if (TYPE_CHART[defType] && TYPE_CHART[defType][move.type] >= 2) coveredTypes.add(defType);
            });
          }
        } catch(e) {}
      });
    });
    const uncoveredTypes = typesList.filter(t => !coveredTypes.has(t));

    const SPEED_CONTROL = ['Tailwind','Trick Room','Icy Wind','Electroweb','Thunder Wave','Scary Face','Bulldoze','Rock Tomb','Low Sweep','Sticky Web'];
    const foundSC = new Set();
    allMoves.forEach(m => { if (SPEED_CONTROL.includes(m)) foundSC.add(m); });

    let html = `<div class="space-y-6">
      <div>
        <h4 class="font-semibold text-slate-700 mb-2"><i class="fa-solid fa-shield text-orange-500 mr-1"></i> Perfil Defensivo</h4>
        <p class="text-xs text-slate-500 mb-3">Balance neto (${activePokes.length} Pokémon)</p>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">`;

    typesList.forEach(type => {
      const score = riskScore[type];
      let bg = 'bg-slate-100 text-slate-700', text = 'Equilibrado';
      if (score >= 2) { bg = 'bg-red-100 text-red-800 border border-red-200'; text = 'Alta debilidad'; }
      else if (score === 1) { bg = 'bg-orange-100 text-orange-800 border border-orange-200'; text = 'Ligeramente débil'; }
      else if (score <= -2) { bg = 'bg-green-100 text-green-800 border border-green-200'; text = 'Muy resistente'; }
      else if (score === -1) { bg = 'bg-emerald-50 text-emerald-700 border border-emerald-200'; text = 'Resistente'; }

      html += `<div class="rounded-xl px-2 py-2.5 text-center ${bg}"><div class="font-bold">${type}</div><div class="text-[11px] mt-0.5">${text}</div></div>`;
    });
    html += `</div>`;

    const highRisk = typesList.filter(t => riskScore[t] >= 2);
    const lowRisk = typesList.filter(t => riskScore[t] === 1);
    if (highRisk.length) html += `<div class="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800"><i class="fa-solid fa-triangle-exclamation mr-1"></i> <strong>Alta debilidad</strong> a: <strong>${highRisk.join(', ')}</strong></div>`;
    if (lowRisk.length) html += `<div class="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-800"><i class="fa-solid fa-circle-exclamation mr-1"></i> Ligeramente débil a: <strong>${lowRisk.join(', ')}</strong></div>`;
    html += `</div>`;

    html += `<div><h4 class="font-semibold text-slate-700 mb-2"><i class="fa-solid fa-crosshairs text-orange-500 mr-1"></i> Cobertura Ofensiva</h4>`;
    if (uncoveredTypes.length === 0) {
      html += `<div class="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800"><i class="fa-solid fa-check mr-1"></i> Super efectivo contra todos los tipos.</div>`;
    } else {
      html += `<p class="text-xs text-slate-500 mb-2">Sin super efectivo contra:</p><div class="flex flex-wrap gap-1.5">${uncoveredTypes.map(t => `<span class="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs">${t}</span>`).join('')}</div>`;
    }
    html += `</div>`;

    html += `<div><h4 class="font-semibold text-slate-700 mb-2"><i class="fa-solid fa-gauge-high text-orange-500 mr-1"></i> Speed Control</h4>`;
    if (foundSC.size === 0) {
      html += `<div class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800"><i class="fa-solid fa-circle-exclamation mr-1"></i> Sin herramientas de speed control detectadas.</div>`;
    } else {
      html += `<div class="flex flex-wrap gap-1.5">${[...foundSC].map(sc => `<span class="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs"><i class="fa-solid fa-check mr-1"></i>${sc}</span>`).join('')}</div>`;
    }
    html += `</div></div>`;

    container.innerHTML = html;

    window._lastRiskScore = riskScore;
    window._lastCoveredTypes = coveredTypes;
  }

  // ======================================================
  // DETECTOR DE AMENAZAS
  // ======================================================
  function calculateThreatScore(threat, activePokes, riskScore, coveredTypes) {
    let score = 0;
    const threatTypes = threat.types || [];

    // Cobertura ofensiva
    let coverageCount = 0;
    activePokes.forEach(poke => {
      let hasSE = false;
      (poke.moves || []).forEach(moveName => {
        try {
          if (typeof calc === 'undefined') return;
          const gen = calc.Generations.get(9);
          const move = gen.moves.get(toID(moveName));
          if (!move || !move.type) return;
          threatTypes.forEach(defType => {
            if (TYPE_CHART[defType] && TYPE_CHART[defType][move.type] >= 2) hasSE = true;
          });
        } catch(e) {}
      });
      if (hasSE) coverageCount++;
    });

    if (coverageCount === 0) score += 3;
    else if (coverageCount === 1) score += 1;

    // Defensiva
    let defScore = 0;
    threatTypes.forEach(t => {
      const r = riskScore[t] || 0;
      if (r >= 2) defScore += 2;
      else if (r === 1) defScore += 1;
    });
    if (threatTypes.length === 2) {
      const r1 = riskScore[threatTypes[0]] || 0;
      const r2 = riskScore[threatTypes[1]] || 0;
      if (r1 >= 2 && r2 >= 2) defScore = 5;
    }
    score += defScore;

    // Extras
    const teamWeathers = new Set();
    const teamTerrains = new Set();
    activePokes.forEach(p => {
      if (p.ability === "Drizzle") teamWeathers.add("Rain");
      if (p.ability === "Drought") teamWeathers.add("Sun");
      if (p.ability === "Sand Stream") teamWeathers.add("Sand");
      if (p.ability === "Snow Warning") teamWeathers.add("Snow");
      if (p.ability === "Grassy Surge") teamTerrains.add("Grassy");
      if (p.ability === "Psychic Surge") teamTerrains.add("Psychic");
      if (p.ability === "Electric Surge") teamTerrains.add("Electric");
      if (p.ability === "Misty Surge") teamTerrains.add("Misty");
    });

    if (threat.weather && teamWeathers.size > 0 && !teamWeathers.has(threat.weather)) score += 1;
    if (threat.terrain && teamTerrains.size > 0 && !teamTerrains.has(threat.terrain)) score += 1;

    if (threat.hasIntimidate) {
      const hasAnswer = activePokes.some(p => ["Defiant","Competitive","Clear Body","Full Metal Body"].includes(p.ability));
      if (!hasAnswer) score += 1;
    }

    if (threat.hasFakeOut) {
      const hasGhost = activePokes.some(p => {
        const t = getPokemonTypes(p.species);
        return t && t.includes("Ghost");
      });
      const hasAnti = activePokes.some(p => p.ability === "Armor Tail" || (p.species || "").includes("Farigiraf"));
      if (!hasGhost && !hasAnti) score += 1;
    }

    if (threat.hasPriority) {
      const hasAnti = activePokes.some(p => p.ability === "Armor Tail" || p.ability === "Psychic Surge" || (p.species || "").includes("Farigiraf"));
      if (!hasAnti) score += 1;
    }

    return score;
  }

  function updateThreatDetector() {
    const container = document.getElementById('threat-detector');
    if (!container) return;

    const activePokes = team.filter(p => p && p.species);
    if (activePokes.length === 0) {
      container.innerHTML = `<p class="text-slate-400">Agrega Pokémon para analizar amenazas...</p>`;
      return;
    }

    const riskScore = window._lastRiskScore || {};
    const coveredTypes = window._lastCoveredTypes || new Set();

    const scored = getThreatList().map(t => ({
      ...t,
      score: calculateThreatScore(t, activePokes, riskScore, coveredTypes)
    })).filter(t => t.score >= 2).sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      container.innerHTML = `<div class="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800"><i class="fa-solid fa-check mr-1"></i> No se detectaron amenazas graves o ligeras.</div>`;
      return;
    }

    let html = `<div class="space-y-2">`;
    scored.forEach(t => {
      const grave = t.score >= 4;
      const bg = grave ? "bg-red-50 border-red-200" : "bg-orange-50 border-orange-200";
      const badge = grave
        ? `<span class="text-xs px-2 py-1 rounded-lg bg-red-100 text-red-700 font-medium">Grave</span>`
        : `<span class="text-xs px-2 py-1 rounded-lg bg-orange-100 text-orange-700 font-medium">Ligera</span>`;

      html += `
        <div class="flex items-center justify-between p-3 rounded-xl border ${bg}">
          <div class="flex items-center gap-3">
            <img src="https://play.pokemonshowdown.com/sprites/gen5/${toID(t.name)}.png" class="w-9 h-9 object-contain" onerror="this.style.display='none'">
            <div>
              <p class="font-semibold text-sm">${t.name}</p>
              <p class="text-[11px] text-slate-500">${t.tags.join(" · ")}</p>
            </div>
          </div>
          ${badge}
        </div>`;
    });
    html += `</div>`;
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

    const LEAD_TOOLS = ["Fake Out","Tailwind","Sticky Web","Thunder Wave","Spore","Icy Wind","Electroweb","Follow Me","Rage Powder","Wide Guard","Quick Guard"];
    const candidates = [];

    activePokes.forEach(poke => {
      const tools = [];
      (poke.moves || []).forEach(m => { if (LEAD_TOOLS.includes(m)) tools.push(m); });
      if (poke.ability === "Prankster") tools.push("Prankster");
      if (poke.ability === "Intimidate") tools.push("Intimidate");
      if (tools.length) candidates.push({ species: poke.species, tools: [...new Set(tools)] });
    });

    if (candidates.length === 0) {
      container.innerHTML = `<div class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800"><i class="fa-solid fa-circle-exclamation mr-1"></i> No se detectaron herramientas clásicas de lead.</div>`;
      return;
    }

    let html = `<div class="space-y-2">`;
    candidates.forEach(c => {
      html += `<div class="p-3 bg-blue-50 border border-blue-100 rounded-xl"><p class="font-medium text-sm text-blue-900">${c.species}</p><p class="text-xs text-blue-700 mt-1">Herramientas: ${c.tools.join(", ")}</p></div>`;
    });
    html += `</div>`;
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
    navigator.clipboard.writeText(text.trim()).then(() => alert('Equipo exportado y copiado al portapapeles'));
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
        species, item,
        ability: '', nature: 'Serious',
        sps: { hp:0, atk:0, def:0, spa:0, spd:0, spe:0 },
        moves: []
      };

      lines.slice(1).forEach(line => {
        if (line.startsWith('Ability:')) poke.ability = line.replace('Ability:', '').trim();
        else if (line.endsWith('Nature')) poke.nature = line.replace('Nature', '').trim();
        else if (line.startsWith('EVs:')) {
          line.replace('EVs:', '').trim().split('/').map(p => p.trim()).forEach(part => {
            const match = part.match(/(\d+)\s*(HP|Atk|Def|SpA|SpD|Spe)/i);
            if (match) {
              const statMap = { hp:'hp', atk:'atk', def:'def', spa:'spa', spd:'spd', spe:'spe' };
              const stat = statMap[match[2].toLowerCase()];
              if (stat) poke.sps[stat] = validateSP(match[1]);
            }
          });
        }
        else if (line.startsWith('- ')) poke.moves.push(line.replace('- ', '').trim());
      });

      newTeam[slot] = poke;
      slot++;
    });

    team = newTeam;
    team.forEach((p, i) => { if (p) checkSPLimit(p, i); });
    renderTeamSlots();
    updateAllAnalysis();
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
      updateAllAnalysis();
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
      updateAllAnalysis();
      closeEditor();
    }
  });

  document.getElementById('edit-species')?.addEventListener('input', updateEditSprite);

  // ======================================================
  // INICIALIZACIÓN
  // ======================================================
  setupEditSPControls();
  setupSetsAutocomplete();
  renderTeamSlots();
  updateAllAnalysis();

  // Intentar cargar meta de Pikalytics
  loadMetaFromPikalytics().then(success => {
    if (success) {
      updateAllAnalysis(); // refrescar con datos frescos
    }
  });
});