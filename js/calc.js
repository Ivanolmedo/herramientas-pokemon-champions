/**
 * calc.js - Versión corregida
 * - Manejo correcto de movimientos sin daño
 * - Aplicación completa de Stat Points desde sets
 * - Auto-activación de clima / terreno según habilidad
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('%c[Calc] Versión corregida iniciada', 'color: #ea580c; font-weight: bold;');

  if (typeof calc === 'undefined') {
    console.error('❌ @smogon/calc no se cargó');
    return;
  }

  // ======================================================
  // UTILIDADES
  // ======================================================
  function spToEVs(sp) {
    sp = Number(sp) || 0;
    if (sp <= 0) return 0;
    if (sp >= 32) return 252;
    return 4 + (sp - 1) * 8;
  }

  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // ======================================================
// SPRITES
// ======================================================
function toID(text) {
  return (text || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function updateSprite(side) {
  const speciesInput = document.getElementById(`${side}-species`);
  const spriteImg = document.getElementById(`${side}-sprite`);
  if (!speciesInput || !spriteImg) return;

  const name = speciesInput.value.trim();
  if (!name) {
    spriteImg.classList.add('hidden');
    spriteImg.src = '';
    return;
  }

  // Intentamos obtener el id correcto desde calc si es posible
  let spriteId = toID(name);

  // Casos especiales comunes de formes
  const specials = {
    'charizardmegax': 'charizard-megax',
    'charizardmegay': 'charizard-megay',
    'venusaurmega': 'venusaur-mega',
    'blastoisemega': 'blastoise-mega',
    'gengarmega': 'gengar-mega',
    'gyaradosmega': 'gyarados-mega',
    'kangaskhanmega': 'kangaskhan-mega',
    'pinsirmega': 'pinsir-mega',
    'aerodactylmega': 'aerodactyl-mega',
    'mewtwomegax': 'mewtwo-megax',
    'mewtwomegay': 'mewtwo-megay',
    'ampharosmega': 'ampharos-mega',
    'scizormega': 'scizor-mega',
    'heracrossmega': 'heracross-mega',
    'houndoommega': 'houndoom-mega',
    'tyranitarmega': 'tyranitar-mega',
    'blazikenmega': 'blaziken-mega',
    'gardevoirmega': 'gardevoir-mega',
    'mawilemega': 'mawile-mega',
    'aggronmega': 'aggron-mega',
    'medichammega': 'medicham-mega',
    'manectricmega': 'manectric-mega',
    'banettemega': 'banette-mega',
    'absolmega': 'absol-mega',
    'garchompmega': 'garchomp-mega',
    'lucariomega': 'lucario-mega',
    'abomasnowmega': 'abomasnow-mega',
    'beedrillmega': 'beedrill-mega',
    'pidgeotmega': 'pidgeot-mega',
    'slowbromega': 'slowbro-mega',
    'steelixmega': 'steelix-mega',
    'sceptilemega': 'sceptile-mega',
    'swamperttmega': 'swampert-mega',
    'sableyemega': 'sableye-mega',
    'sharpedomega': 'sharpedo-mega',
    'cameruptmega': 'camerupt-mega',
    'altariamega': 'altaria-mega',
    'glaliemega': 'glalie-mega',
    'salamencemega': 'salamence-mega',
    'metagrossmega': 'metagross-mega',
    'latiasmega': 'latias-mega',
    'latiosmega': 'latios-mega',
    'rayquazamega': 'rayquaza-mega',
    'lopunnymega': 'lopunny-mega',
    'gallademega': 'gallade-mega',
    'audinomega': 'audino-mega',
    'dianciemega': 'diancie-mega'
  };

  if (specials[spriteId]) {
    spriteId = specials[spriteId];
  }

  // Usamos sprites de Pokémon Showdown (gen5 - estables y ligeros)
  const url = `https://play.pokemonshowdown.com/sprites/gen5/${spriteId}.png`;

  spriteImg.src = url;
  spriteImg.alt = name;
  spriteImg.classList.remove('hidden');

  // Si falla la carga, ocultamos el icono
  spriteImg.onerror = () => {
    spriteImg.classList.add('hidden');
  };
}

  // ======================================================
  // STAT POINTS
  // ======================================================
  function setupSPControls() {
    document.querySelectorAll('.sp-slider, .sp-input').forEach(el => {
      el.addEventListener('input', function () {
        const side = this.dataset.side;
        const stat = this.dataset.stat;
        let value = Math.max(0, Math.min(32, Number(this.value) || 0));

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

  // ======================================================
  // CREAR POKEMON
  // ======================================================
  function createPokemon(side) {
    const gen = calc.Generations.get(9);
    const name = document.getElementById(`${side}-species`)?.value?.trim();
    if (!name) return null;

    const sp = {};
    ['hp', 'atk', 'def', 'spa', 'spd', 'spe'].forEach(stat => {
      const input = document.querySelector(`.sp-input[data-side="${side}"][data-stat="${stat}"]`);
      sp[stat] = Number(input?.value) || 0;
    });

    const options = {
      level: 50,
      nature: document.getElementById(`${side}-nature`)?.value || 'Serious',
      ability: document.getElementById(`${side}-ability`)?.value || undefined,
      item: document.getElementById(`${side}-item`)?.value || undefined,
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
      console.warn(`Error creando ${side}:`, e.message);
      return null;
    }
  }

  // ======================================================
  // FIELD
  // ======================================================
function createField(attackerSide, defenderSide) {
  const weatherBtn = document.querySelector('.field-btn[data-group="weather"].active');
  const terrainBtn = document.querySelector('.field-btn[data-group="terrain"].active');
  const formatBtn  = document.querySelector('.field-btn:not([data-group]).active');

  return new calc.Field({
    gameType: formatBtn?.dataset.value === 'singles' ? 'Singles' : 'Doubles',
    weather: weatherBtn?.dataset.value === 'none' ? undefined : weatherBtn?.dataset.value,
    terrain: terrainBtn?.dataset.value === 'none' ? undefined : terrainBtn?.dataset.value,
    attackerSide: {
      isHelpingHand: document.getElementById(`${attackerSide}-helping-hand`)?.checked || false,
      isReflect:     document.getElementById(`${attackerSide}-reflect`)?.checked || false,
      isLightScreen: document.getElementById(`${attackerSide}-lightscreen`)?.checked || false,
      isAuroraVeil:  document.getElementById(`${attackerSide}-auroraveil`)?.checked || false,
      isTailwind:    document.getElementById(`${attackerSide}-tailwind`)?.checked || false,
      isFriendGuard: document.getElementById(`${attackerSide}-friendguard`)?.checked || false,
    },
    defenderSide: {
      isHelpingHand: document.getElementById(`${defenderSide}-helping-hand`)?.checked || false,
      isReflect:     document.getElementById(`${defenderSide}-reflect`)?.checked || false,
      isLightScreen: document.getElementById(`${defenderSide}-lightscreen`)?.checked || false,
      isAuroraVeil:  document.getElementById(`${defenderSide}-auroraveil`)?.checked || false,
      isTailwind:    document.getElementById(`${defenderSide}-tailwind`)?.checked || false,
      isFriendGuard: document.getElementById(`${defenderSide}-friendguard`)?.checked || false,
    }
  });
}

  // ======================================================
  // CÁLCULO DE UN LADO (con manejo de movimientos sin daño)
  // ======================================================
  function calculateSide(attacker, defender, attackerSideName, resultsId) {
    const container = document.getElementById(resultsId);
    if (!container) return;

    if (!attacker || !defender) {
      container.innerHTML = `<p class="text-sm text-slate-400 text-center py-4">Faltan datos</p>`;
      return;
    }

    const gen = calc.Generations.get(9);
    const field = createField(attackerSideName, attackerSideName === 'my' ? 'opp' : 'my');

    let html = '';
    let hasMoves = false;

    document.querySelectorAll(`.move-input[data-side="${attackerSideName}"]`).forEach(input => {
      const moveName = input.value?.trim();
      if (!moveName) return;
      hasMoves = true;

      try {
        const move = new calc.Move(gen, moveName);

        // Si el movimiento no hace daño (status, Protect, Stealth Rock, etc.)
        if (move.category === 'Status' || move.basePower === 0) {
          html += `
            <div class="border border-slate-200 rounded-xl p-3 bg-slate-50/60">
              <div class="flex justify-between items-center mb-1">
                <span class="font-semibold text-sm">${moveName}</span>
                <span class="text-slate-400 text-sm">Status / No damage</span>
              </div>
              <p class="text-xs text-slate-500">This move does not deal direct damage</p>
            </div>`;
          return;
        }

        const result = calc.calculate(gen, attacker, defender, move, field);

        // Protección extra por si damage no es un array
        if (!result.damage || !Array.isArray(result.damage) || result.damage.length === 0) {
          html += `
            <div class="border border-slate-200 rounded-xl p-3 bg-slate-50/60">
              <div class="flex justify-between items-center mb-1">
                <span class="font-semibold text-sm">${moveName}</span>
                <span class="text-slate-400 text-sm">No damage data</span>
              </div>
            </div>`;
          return;
        }

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
            <strong>${moveName}</strong>: ${err.message || 'Error calculating'}
          </div>`;
      }
    });

    container.innerHTML = hasMoves ? html : `<p class="text-sm text-slate-400 text-center py-4">Sin movimientos</p>`;
  }

  // ======================================================
  // FUNCIÓN PRINCIPAL
  // ======================================================
  function runCalculation() {
    updateSprite('my');
    updateSprite('opp');

    const myPokemon  = createPokemon('my');
    const oppPokemon = createPokemon('opp');


    updateFinalStats('my', myPokemon);
    updateFinalStats('opp', oppPokemon);

    calculateSide(myPokemon, oppPokemon, 'my',  'results-my-to-opp');
    calculateSide(oppPokemon, myPokemon, 'opp', 'results-opp-to-my');
  }

  function updateFinalStats(side, pokemon) {
    if (!pokemon) return;
    const container = document.getElementById(`${side}-final-stats`);
    if (!container) return;
    const source = pokemon.rawStats || pokemon.stats || {};
    container.querySelectorAll('[data-stat]').forEach(el => {
      el.textContent = source[el.dataset.stat] ?? '—';
    });
  }

  // ======================================================
  // AUTO-ACTIVAR CLIMA / TERRENO SEGÚN HABILIDAD
  // ======================================================
  const WEATHER_ABILITIES = {
    'Drought': 'Sun',
    'Drizzle': 'Rain',
    'Sand Stream': 'Sand',
    'Snow Warning': 'Snow',
    'Orichalcum Pulse': 'Sun',
    'Desolate Land': 'Sun',
    'Primordial Sea': 'Rain'
  };

  const TERRAIN_ABILITIES = {
    'Electric Surge': 'Electric',
    'Grassy Surge': 'Grassy',
    'Psychic Surge': 'Psychic',
    'Misty Surge': 'Misty',
    'Hadron Engine': 'Electric'
  };

  function applyWeatherTerrainFromAbility(side, abilityName) {
    if (!abilityName) return;

    // Weather
    if (WEATHER_ABILITIES[abilityName]) {
      const weather = WEATHER_ABILITIES[abilityName];
      document.querySelectorAll('.field-btn[data-group="weather"]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === weather);
      });
    }

    // Terrain
    if (TERRAIN_ABILITIES[abilityName]) {
      const terrain = TERRAIN_ABILITIES[abilityName];
      document.querySelectorAll('.field-btn[data-group="terrain"]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === terrain);
      });
    }
  }

  // ======================================================
  // APLICAR SET COMPLETO (corregido el mapeo de SP)
  // ======================================================
  function applySet(side, setData, speciesName) {
    document.getElementById(`${side}-species`).value = speciesName;

    if (setData.nature)  document.getElementById(`${side}-nature`).value = setData.nature;
    if (setData.ability) document.getElementById(`${side}-ability`).value = setData.ability;
    if (setData.item)    document.getElementById(`${side}-item`).value = setData.item;

    // === Stat Points - mapeo robusto ===
    if (setData.sps) {
      // Claves posibles en el archivo de Smogon
      const keyMap = {
        hp: 'hp',
        at: 'atk', atk: 'atk',
        df: 'def', def: 'def',
        sa: 'spa', spa: 'spa',
        sd: 'spd', spd: 'spd',
        sp: 'spe', spe: 'spe'
      };

      // Primero poner todo a 0
      ['hp', 'atk', 'def', 'spa', 'spd', 'spe'].forEach(stat => {
        const num = document.querySelector(`.sp-input[data-side="${side}"][data-stat="${stat}"]`);
        const sld = document.querySelector(`.sp-slider[data-side="${side}"][data-stat="${stat}"]`);
        if (num) num.value = 0;
        if (sld) sld.value = 0;
      });

      // Ahora aplicar los valores del set
      for (const [key, value] of Object.entries(setData.sps)) {
        const stat = keyMap[key];
        if (!stat) continue;

        const num = document.querySelector(`.sp-input[data-side="${side}"][data-stat="${stat}"]`);
        const sld = document.querySelector(`.sp-slider[data-side="${side}"][data-stat="${stat}"]`);
        if (num) num.value = value;
        if (sld) sld.value = value;
      }

      updateSPCounter(side);
    }

    // Moves
    if (setData.moves && Array.isArray(setData.moves)) {
      document.querySelectorAll(`.move-input[data-side="${side}"]`).forEach((input, i) => {
        input.value = setData.moves[i] || '';
      });
    }

    // Auto-activar clima / terreno
    if (setData.ability) {
      applyWeatherTerrainFromAbility(side, setData.ability);
    }
    updateSprite(side);
    runCalculation();
  }

  // ======================================================
  // AUTOCOMPLETADO BÁSICO
  // ======================================================
  function setupBasicAutocomplete() {
    if (!calc.SPECIES) {
      setTimeout(setupBasicAutocomplete, 300);
      return;
    }

    const speciesList = Object.keys(calc.SPECIES[9] || calc.SPECIES).sort();
    const abilityList = Object.keys(calc.ABILITIES[9] || calc.ABILITIES).sort();
    const itemList    = Object.keys(calc.ITEMS[9] || calc.ITEMS).sort();
    const moveList    = Object.keys(calc.MOVES[9] || calc.MOVES).sort();

    function attach(input, list) {
      if (!input.parentElement.classList.contains('autocomplete-wrapper')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'autocomplete-wrapper';
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

        const matches = list.filter(i => i.toLowerCase().includes(val)).slice(0, 12);
        close();
        if (!matches.length) return;

        listEl = document.createElement('div');
        listEl.className = 'autocomplete-list';

        matches.forEach(item => {
          const div = document.createElement('div');
          div.className = 'autocomplete-item';
          div.textContent = item;
          div.addEventListener('mousedown', e => {
            e.preventDefault();
            input.value = item;
            close();
            input.dispatchEvent(new Event('change'));
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

      document.addEventListener('click', e => { if (!wrapper.contains(e.target)) close(); });
    }

    document.querySelectorAll('#my-species, #opp-species').forEach(i => attach(i, speciesList));
    document.querySelectorAll('#my-ability, #opp-ability').forEach(i => attach(i, abilityList));
    document.querySelectorAll('#my-item, #opp-item').forEach(i => attach(i, itemList));
    document.querySelectorAll('.move-input').forEach(i => attach(i, moveList));
  }

  // ======================================================
  // AUTOCOMPLETADO DE SETS
  // ======================================================
  function setupSetsAutocomplete() {
  if (typeof SETDEX_CHAMPIONS === 'undefined') {
    console.warn('SETDEX_CHAMPIONS aún no disponible...');
    setTimeout(setupSetsAutocomplete, 500);
    return;
  }

  console.log('%c[Sets] Datos de Champions cargados', 'color: #16a34a; font-weight: bold;');

  // Lista de todos los sets
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

  // También añadimos todas las species en blanco (sin set)
  const allSpecies = Object.keys(calc.SPECIES[9] || calc.SPECIES || {}).sort();
  allSpecies.forEach(sp => {
    allSets.push({
      label: sp,
      species: sp,
      setName: '(Blank)',
      data: null,
      isSet: false
    });
  });

  function attachSets(input, side) {
    if (!input.parentElement.classList.contains('autocomplete-wrapper')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'autocomplete-wrapper';
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

      // Priorizamos sets que coincidan + species en blanco
      const matches = allSets
        .filter(s => s.label.toLowerCase().includes(val) || s.species.toLowerCase().includes(val))
        .slice(0, 18);

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
            applySet(side, item.data, item.species);
          } else {
            // Solo poner el nombre (set en blanco)
            document.getElementById(`${side}-species`).value = item.species;
            // Limpiar el resto de campos para que sea realmente "blank"
            document.getElementById(`${side}-ability`).value = '';
            document.getElementById(`${side}-item`).value = '';
            document.getElementById(`${side}-nature`).value = 'Serious';

            // Poner todos los SP a 0
            ['hp', 'atk', 'def', 'spa', 'spd', 'spe'].forEach(stat => {
              const num = document.querySelector(`.sp-input[data-side="${side}"][data-stat="${stat}"]`);
              const sld = document.querySelector(`.sp-slider[data-side="${side}"][data-stat="${stat}"]`);
              if (num) num.value = 0;
              if (sld) sld.value = 0;
            });
            updateSPCounter(side);

            // Limpiar moves
            document.querySelectorAll(`.move-input[data-side="${side}"]`).forEach(inp => inp.value = '');
          }

          input.value = item.species;
          close();
          runCalculation();
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

    document.addEventListener('click', e => { if (!wrapper.contains(e.target)) close(); });
  }

  const myInput  = document.getElementById('my-species');
  const oppInput = document.getElementById('opp-species');
  if (myInput)  attachSets(myInput, 'my');
  if (oppInput) attachSets(oppInput, 'opp');
}

  // ======================================================
  // EVENTOS
  // ======================================================
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

  const watch = [
  '#my-species', '#my-nature', '#my-ability', '#my-item',
  '#opp-species', '#opp-nature', '#opp-ability', '#opp-item',
  '.move-input',
  '#my-helping-hand', '#opp-helping-hand',
  '#my-reflect', '#opp-reflect',
  '#my-lightscreen', '#opp-lightscreen',
  '#my-auroraveil', '#opp-auroraveil',
  '#my-tailwind', '#opp-tailwind',
  '#my-friendguard', '#opp-friendguard'
];

  document.querySelectorAll(watch.join(',')).forEach(el => {
    el.addEventListener('change', runCalculation);
    el.addEventListener('input', debounce(runCalculation, 400));
  });

  document.getElementById('btn-copy-result')?.addEventListener('click', () => {
    const text = (document.getElementById('results-my-to-opp')?.innerText || '') + '\n\n' +
                 (document.getElementById('results-opp-to-my')?.innerText || '');
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('btn-copy-result');
      const orig = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-check mr-1"></i> Copied!';
      setTimeout(() => btn.innerHTML = orig, 1500);
    });
  });

  // ======================================================
  // INICIALIZACIÓN
  // ======================================================
  setupSPControls();
  updateSPCounter('my');
  updateSPCounter('opp');
  setupBasicAutocomplete();
  setupSetsAutocomplete();
  runCalculation();
});