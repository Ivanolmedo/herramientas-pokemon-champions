/**
 * calc-bridge.js
 * Puente Calculadora → Teambuilder:
 * - Enviar Pokémon al teambuilder
 * - Guardar cálculo como nota
 *
 * INSTRUCCIONES:
 * 1. En calc.html, añade antes de </body>:
 *    <script src="js/calc-bridge.js"></script>
 * 2. Añade estos botones en el panel de Mi Pokémon (ajusta IDs si usas my-/opp-):
 *
 * <button id="btn-send-my-to-team" type="button"
 *   class="mt-2 w-full py-2 text-sm bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-xl font-semibold">
 *   Enviar a Teambuilder
 * </button>
 * <button id="btn-save-note-my" type="button"
 *   class="mt-2 w-full py-2 text-sm bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-semibold">
 *   Guardar cálculo como nota
 * </button>
 *
 * Usa Live Server para que calc y teambuilder compartan localStorage.
 */
(function () {
  function getVal(ids) {
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el && el.value != null && String(el.value).trim() !== '') return String(el.value).trim();
    }
    return '';
  }

  function getSP(prefix, stat) {
    const candidates = [
      document.querySelector(`#${prefix}-sp-controls .edit-sp-input[data-stat="${stat}"]`),
      document.querySelector(`.${prefix}-sp-input[data-stat="${stat}"]`),
      document.querySelector(`[data-side="${prefix}"][data-stat="${stat}"]`),
      document.getElementById(`${prefix}-${stat}`),
      document.getElementById(`${prefix}-sp-${stat}`),
      document.querySelector(`#${prefix}-sp-controls input[data-stat="${stat}"]`)
    ];
    for (const el of candidates) {
      if (el && el.value != null) return Number(el.value) || 0;
    }
    return 0;
  }

  function readPokemon(side) {
    const prefix = side === 'opp' ? 'opp' : 'my';
    // Compatibilidad con IDs antiguos p1/p2
    const alt = side === 'opp' ? 'p2' : 'p1';

    const species = getVal([
      `${prefix}-species`, `species-${prefix}`, `${alt}-species`
    ]);
    if (!species) return null;

    return {
      species,
      nature: getVal([`${prefix}-nature`, `${alt}-nature`]) || 'Serious',
      ability: getVal([`${prefix}-ability`, `${alt}-ability`]),
      item: getVal([`${prefix}-item`, `${alt}-item`]),
      sps: {
        hp: getSP(prefix, 'hp') || getSP(alt, 'hp'),
        atk: getSP(prefix, 'atk') || getSP(alt, 'atk'),
        def: getSP(prefix, 'def') || getSP(alt, 'def'),
        spa: getSP(prefix, 'spa') || getSP(alt, 'spa'),
        spd: getSP(prefix, 'spd') || getSP(alt, 'spd'),
        spe: getSP(prefix, 'spe') || getSP(alt, 'spe')
      },
      moves: [
        getVal([`${prefix}-move1`, `${alt}-move1`, `${prefix}-move-1`]),
        getVal([`${prefix}-move2`, `${alt}-move2`, `${prefix}-move-2`]),
        getVal([`${prefix}-move3`, `${alt}-move3`, `${prefix}-move-3`]),
        getVal([`${prefix}-move4`, `${alt}-move4`, `${prefix}-move-4`])
      ],
      notes: [],
      transferredAt: Date.now()
    };
  }

  function sendPokemonToTeambuilder(side) {
    const poke = readPokemon(side || 'my');
    if (!poke) {
      alert('Selecciona un Pokémon primero.');
      return;
    }
    localStorage.setItem('champions_transfer_poke', JSON.stringify(poke));
    console.log('[Calc → Team] Guardado:', poke);
    alert(`"${poke.species}" listo para el Teambuilder.\nAbre o recarga el Teambuilder (mismo Live Server).`);
  }

  function buildCalcNoteText() {
    const mySpecies = getVal(['my-species', 'p1-species']) || 'Mi Pokémon';
    const oppSpecies = getVal(['opp-species', 'p2-species']) || 'Rival';

    const pickText = (ids) => {
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el) {
          const t = (el.innerText || el.textContent || '').trim();
          if (t) return t.slice(0, 800);
        }
      }
      return '';
    };

    const myToOpp = pickText(['results-my-to-opp', 'damage-output', 'results-p1-to-p2']);
    const oppToMy = pickText(['results-opp-to-my', 'results-p2-to-p1']);

    let body = '';
    if (myToOpp) body += `${mySpecies} → ${oppSpecies}:\n${myToOpp}\n`;
    if (oppToMy) body += `${oppSpecies} → ${mySpecies}:\n${oppToMy}`;
    if (!body) body = 'Cálculo guardado (no se detectó texto de resultados; revisa IDs de contenedores).';
    return body.trim();
  }

  function saveCalcAsNote(side) {
    const poke = readPokemon(side || 'my');
    if (!poke) {
      alert('Selecciona un Pokémon primero.');
      return;
    }
    const note = {
      id: 'n_' + Date.now(),
      text: buildCalcNoteText(),
      date: new Date().toISOString(),
      source: 'calc',
      species: poke.species
    };
    let queue = [];
    try {
      queue = JSON.parse(localStorage.getItem('champions_pending_notes') || '[]');
    } catch (e) {}
    queue.push(note);
    localStorage.setItem('champions_pending_notes', JSON.stringify(queue));
    console.log('[Calc] Nota guardada:', note);
    alert(`Nota guardada para "${poke.species}".\nEn el Teambuilder se asignará al Pokémon con el mismo nombre.`);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-send-my-to-team')?.addEventListener('click', () => sendPokemonToTeambuilder('my'));
    document.getElementById('btn-send-opp-to-team')?.addEventListener('click', () => sendPokemonToTeambuilder('opp'));
    document.getElementById('btn-save-note-my')?.addEventListener('click', () => saveCalcAsNote('my'));
    document.getElementById('btn-save-note-opp')?.addEventListener('click', () => saveCalcAsNote('opp'));
    // Exponer por si se llaman desde HTML inline
    window.sendPokemonToTeambuilder = sendPokemonToTeambuilder;
    window.saveCalcAsNote = saveCalcAsNote;
  });
})();
