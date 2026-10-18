/**
 * teambuilder.js - Versión mejorada
 * - Autocompletado de sets + blank
 * - Barras de SP sincronizadas correctamente
 * - Análisis básico de tipos (resistencias / debilidades)
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('%c[Teambuilder] Versión mejorada iniciada', 'color: #ea580c; font-weight: bold;');

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

  function spToEVs(sp) {
    sp = Number(sp) || 0;
    if (sp <= 0) return 0;
    if (sp >= 32) return 252;
    return 4 + (sp - 1) * 8;
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
      sps[stat] = Number(input?.value) || 0;
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

    renderTeamSlots();
    updateTypeAnalysis();
    closeEditor();
  }

  // ======================================================
  // STAT POINTS (barras bien sincronizadas)
  // ======================================================
  function setupEditSPControls() {
    document.querySelectorAll('.edit-sp-slider, .edit-sp-input').forEach(el => {
      el.addEventListener('input', function () {
        const stat = this.dataset.stat;
        let value = Math.max(0, Math.min(32, Number(this.value) || 0));

        // Sincronizar ambos controles
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
  // AUTOCOMPLETADO DE SETS + BLANK
  // ======================================================
  function setupSetsAutocomplete() {
    if (typeof SETDEX_CHAMPIONS === 'undefined' || typeof calc === 'undefined') {
      setTimeout(setupSetsAutocomplete, 400);
      return;
    }

    const allSets = [];

    // Sets de Champions
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

    // Species en blanco
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

    // Envolver en wrapper
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
            // Aplicar set completo
            applySetToEditor(item.data, item.species);
          } else {
            // Solo species en blanco
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

    // Stat Points
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
        document.querySelector(`.edit-sp-slider[data-stat="${stat}"]`).value = value;
        document.querySelector(`.edit-sp-input[data-stat="${stat}"]`).value = value;
      }
      updateEditSPCounter();
    }

    // Moves
    if (setData.moves) {
      document.getElementById('edit-move1').value = setData.moves[0] || '';
      document.getElementById('edit-move2').value = setData.moves[1] || '';
      document.getElementById('edit-move3').value = setData.moves[2] || '';
      document.getElementById('edit-move4').value = setData.moves[3] || '';
    }

    updateEditSprite();
  }

  // ======================================================
  // ANÁLISIS DE TIPOS
  // ======================================================
  function updateTypeAnalysis() {
    const container = document.getElementById('team-analysis');
    if (!container) return;

    const activePokes = team.filter(p => p && p.species);
    if (activePokes.length === 0) {
      container.innerHTML = `<p class="text-center py-8 text-slate-400">Agrega Pokémon a tu equipo para ver el análisis.</p>`;
      return;
    }

    if (typeof calc === 'undefined') {
      container.innerHTML = `<p class="text-center py-4 text-slate-400">Cargando datos de tipos...</p>`;
      return;
    }

    const gen = calc.Generations.get(9);
    const types = ['Normal','Fire','Water','Electric','Grass','Ice','Fighting','Poison','Ground','Flying','Psychic','Bug','Rock','Ghost','Dragon','Dark','Steel','Fairy'];

    // Contadores
    const weak = {};      // cuántos Pokémon son débiles a este tipo
    const resist = {};    // cuántos resisten
    const immune = {};    // cuántos son inmunes

    types.forEach(t => {
      weak[t] = 0;
      resist[t] = 0;
      immune[t] = 0;
    });

    activePokes.forEach(poke => {
      try {
        const species = gen.species.get(toID(poke.species));
        if (!species) return;

        const type1 = species.types[0];
        const type2 = species.types[1] || null;

        types.forEach(attackType => {
          let effectiveness = 1;

          // Multiplicamos la efectividad de ambos tipos
          const t1 = gen.types.get(toID(type1));
          const t2 = type2 ? gen.types.get(toID(type2)) : null;

          if (t1 && t1.damageTaken) {
            const mod = t1.damageTaken[attackType] ?? t1.damageTaken[toID(attackType)];
            if (mod === 0) effectiveness = 0;
            else if (mod === 1) effectiveness *= 2;
            else if (mod === 2) effectiveness *= 0.5;
          }
          if (t2 && t2.damageTaken && effectiveness > 0) {
            const mod = t2.damageTaken[attackType] ?? t2.damageTaken[toID(attackType)];
            if (mod === 0) effectiveness = 0;
            else if (mod === 1) effectiveness *= 2;
            else if (mod === 2) effectiveness *= 0.5;
          }

          if (effectiveness === 0) immune[attackType]++;
          else if (effectiveness >= 2) weak[attackType]++;
          else if (effectiveness <= 0.5) resist[attackType]++;
        });
      } catch (e) {
        console.warn('Error analizando', poke.species, e);
      }
    });

    // Generar HTML
    let html = `
      <div class="mb-4">
        <p class="text-sm text-slate-600 mb-3">Análisis basado en ${activePokes.length} Pokémon del equipo</p>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
    `;

    types.forEach(type => {
      const w = weak[type];
      const r = resist[type];
      const i = immune[type];

      let color = 'bg-slate-100 text-slate-700';
      let label = 'Neutral';

      if (w >= 3) {
        color = 'bg-red-100 text-red-700 border border-red-200';
        label = `${w} débiles`;
      } else if (w === 2) {
        color = 'bg-orange-100 text-orange-700 border border-orange-200';
        label = `${w} débiles`;
      } else if (i > 0 || r >= 3) {
        color = 'bg-green-100 text-green-700 border border-green-200';
        label = i > 0 ? `${i} inmune` : `${r} resisten`;
      } else if (r > 0) {
        color = 'bg-emerald-50 text-emerald-700';
        label = `${r} resisten`;
      }

      html += `
        <div class="rounded-xl px-2 py-2 text-center ${color}">
          <div class="font-semibold">${type}</div>
          <div class="text-[11px] mt-0.5 opacity-80">${label}</div>
        </div>
      `;
    });

    html += `</div></div>`;

    // Resumen de problemas
    const bigWeaknesses = types.filter(t => weak[t] >= 3);
    if (bigWeaknesses.length > 0) {
      html += `
        <div class="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
          <i class="fa-solid fa-triangle-exclamation mr-1.5"></i>
          <strong>Atención:</strong> Tu equipo tiene 3 o más Pokémon débiles a: 
          <strong>${bigWeaknesses.join(', ')}</strong>
        </div>
      `;
    }

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

      const evs = [];
      if (poke.sps?.hp)  evs.push(`${spToEVs(poke.sps.hp)} HP`);
      if (poke.sps?.atk) evs.push(`${spToEVs(poke.sps.atk)} Atk`);
      if (poke.sps?.def) evs.push(`${spToEVs(poke.sps.def)} Def`);
      if (poke.sps?.spa) evs.push(`${spToEVs(poke.sps.spa)} SpA`);
      if (poke.sps?.spd) evs.push(`${spToEVs(poke.sps.spd)} SpD`);
      if (poke.sps?.spe) evs.push(`${spToEVs(poke.sps.spe)} Spe`);
      if (evs.length) text += `EVs: ${evs.join(' / ')}\n`;

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
      const lines = block.trim().split('\n');
      if (!lines[0]) return;

      let species = lines[0];
      let item = '';
      if (lines[0].includes(' @ ')) {
        [species, item] = lines[0].split(' @ ');
      }

      const poke = {
        species: species.trim(),
        item: item.trim(),
        ability: '',
        nature: 'Serious',
        sps: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        moves: []
      };

      lines.slice(1).forEach(line => {
        line = line.trim();
        if (line.startsWith('Ability:')) poke.ability = line.replace('Ability:', '').trim();
        else if (line.endsWith('Nature')) poke.nature = line.replace('Nature', '').trim();
        else if (line.startsWith('- ')) poke.moves.push(line.replace('- ', '').trim());
      });

      newTeam[slot] = poke;
      slot++;
    });

    team = newTeam;
    renderTeamSlots();
    updateTypeAnalysis();
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
  updateTypeAnalysis();
});