/**
 * calc-enhancements.js — v0.8
 * - Fairy Aura
 * - Boosts de stats
 * - Enviar a teambuilder
 * - Nota de UN movimiento
 * - Autocomplete de moves
 * - Sprites actualizados
 *
 * En calc.html, DESPUÉS de calc.js:
 *   <script src="js/sprites.js"></script>
 *   <script src="js/move-autocomplete.js"></script>
 *   <script src="js/calc-enhancements.js"></script>
 *
 * HTML extra necesario: ver calc-v08-snippet.html
 */
(function () {
  function $(id) { return document.getElementById(id); }

  function getVal(ids) {
    for (const id of ids) {
      const el = $(id);
      if (el && el.value != null && String(el.value).trim() !== '') return String(el.value).trim();
    }
    return '';
  }

  function getSP(prefix, stat) {
    const sels = [
      document.querySelector(`#${prefix}-sp-controls .edit-sp-input[data-stat="${stat}"]`),
      document.querySelector(`.${prefix}-sp-input[data-stat="${stat}"]`),
      document.querySelector(`#${prefix}-sp-controls input[data-stat="${stat}"]`),
      $(`${prefix}-${stat}`),
      $(`${prefix}-sp-${stat}`),
      $(`p1-${stat}`),
      $(`p2-${stat}`)
    ];
    // p1/p2 según prefix
    if (prefix === 'my' || prefix === 'p1') {
      sels.push($(`p1-${stat}`));
    }
    if (prefix === 'opp' || prefix === 'p2') {
      sels.push($(`p2-${stat}`));
    }
    for (const el of sels) {
      if (el && el.value != null && el.value !== '') return Number(el.value) || 0;
    }
    return 0;
  }

  /** Boosts ±6 desde #my-boosts / #opp-boosts o #p1-boosts / #p2-boosts */
  function readBoosts(side) {
    const prefixes = side === 'opp' || side === 'p2'
      ? ['opp', 'p2']
      : ['my', 'p1'];
    const boosts = {};
    for (const prefix of prefixes) {
      const root = $(`${prefix}-boosts`);
      if (!root) continue;
      root.querySelectorAll('[data-boost]').forEach(sel => {
        const stat = sel.dataset.boost;
        const v = Number(sel.value) || 0;
        if (stat && v !== 0) boosts[stat] = v;
      });
    }
    return boosts;
  }

  /** Fairy Aura (y hook para otros field flags) */
  function isFairyAuraOn() {
    return !!( $('field-fairy-aura')?.checked );
  }

  /**
   * Extiende un Field de @smogon/calc si la función global createField existe.
   * Si no, expone helpers para que calc.js los use.
   */
  function applyFieldEnhancements(fieldObj) {
    if (!fieldObj) return fieldObj;
    fieldObj.isFairyAura = isFairyAuraOn();
    return fieldObj;
  }

  function readPokemon(side) {
    const isOpp = side === 'opp' || side === 'p2';
    const prefix = isOpp ? 'opp' : 'my';
    const alt = isOpp ? 'p2' : 'p1';

    const species = getVal([`${prefix}-species`, `${alt}-species`, `species-${prefix}`]);
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
      boosts: readBoosts(isOpp ? 'opp' : 'my'),
      moves: [
        getVal([`${prefix}-move1`, `${alt}-move1`]),
        getVal([`${prefix}-move2`, `${alt}-move2`]),
        getVal([`${prefix}-move3`, `${alt}-move3`]),
        getVal([`${prefix}-move4`, `${alt}-move4`])
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
    console.log('[Calc → Team]', poke);
    alert(`"${poke.species}" listo para el Teambuilder (Live Server).`);
  }

  /** Guarda UNA línea de daño como nota */
  function saveSingleMoveNote(species, moveName, summaryLine) {
    if (!species) {
      alert('Selecciona un Pokémon primero.');
      return;
    }
    const text = `${moveName}: ${summaryLine}`.trim();
    const note = {
      id: 'n_' + Date.now(),
      text,
      date: new Date().toISOString(),
      source: 'calc',
      species
    };
    let queue = [];
    try { queue = JSON.parse(localStorage.getItem('champions_pending_notes') || '[]'); } catch (e) {}
    queue.push(note);
    localStorage.setItem('champions_pending_notes', JSON.stringify(queue));
    console.log('[Calc] Nota simple:', note);
    alert(`Nota guardada:\n${text}`);
  }

  /**
   * Helper para que calc.js, al pintar cada línea de resultado, pueda:
   * appendSaveNoteButton(container, { species, move, summary })
   */
  function appendSaveNoteButton(container, { species, move, summary }) {
    if (!container) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ml-2 text-[11px] text-orange-600 hover:underline font-semibold';
    btn.textContent = 'Guardar nota';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      saveSingleMoveNote(species, move || 'Move', summary || '');
    });
    container.appendChild(btn);
  }

  function wireBoostListeners() {
    document.querySelectorAll('.boost-select, [data-boost]').forEach(el => {
      el.addEventListener('change', () => {
        if (typeof window.runCalculation === 'function') window.runCalculation();
      });
    });
    $('field-fairy-aura')?.addEventListener('change', () => {
      if (typeof window.runCalculation === 'function') window.runCalculation();
    });
  }

  function updateCalcSprites() {
    if (!window.ChampSprites) return;
    ['my', 'opp', 'p1', 'p2'].forEach(prefix => {
      const name = getVal([`${prefix}-species`]);
      const img = $(`${prefix}-sprite`) || $(`sprite-${prefix}`);
      if (img && name) {
        img.src = ChampSprites.spriteUrl(name);
        img.onerror = function () {
          this.onerror = null;
          this.src = ChampSprites.spriteUrlFallback(name);
        };
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Fairy Aura: si createField existe, lo envolvemos
    if (typeof window.createField === 'function') {
      const original = window.createField;
      window.createField = function () {
        const f = original.apply(this, arguments);
        return applyFieldEnhancements(f);
      };
    }

    // Boosts en createPokemon si existe
    if (typeof window.createPokemon === 'function') {
      const origPoke = window.createPokemon;
      window.createPokemon = function (side) {
        const poke = origPoke.apply(this, arguments);
        try {
          const boosts = readBoosts(side === 1 || side === 'p2' || side === 'opp' ? 'opp' : 'my');
          if (poke && boosts && Object.keys(boosts).length) {
            poke.boosts = Object.assign({}, poke.boosts || {}, boosts);
          }
        } catch (e) {}
        return poke;
      };
    }

    wireBoostListeners();

    if (typeof setupMoveAutocomplete === 'function') {
      setupMoveAutocomplete(
        '.move-input, #my-move1, #my-move2, #my-move3, #my-move4, ' +
        '#opp-move1, #opp-move2, #opp-move3, #opp-move4, ' +
        '#p1-move1, #p1-move2, #p1-move3, #p1-move4, ' +
        '#p2-move1, #p2-move2, #p2-move3, #p2-move4'
      );
    }

    $('btn-send-my-to-team')?.addEventListener('click', () => sendPokemonToTeambuilder('my'));
    $('btn-send-opp-to-team')?.addEventListener('click', () => sendPokemonToTeambuilder('opp'));

    // Delegación: botones .btn-save-single-note con data-move y data-summary
    document.body.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-save-single-note');
      if (!btn) return;
      e.preventDefault();
      const side = btn.dataset.side || 'my';
      const species = getVal([side === 'opp' ? 'opp-species' : 'my-species', side === 'opp' ? 'p2-species' : 'p1-species']);
      saveSingleMoveNote(species, btn.dataset.move || 'Move', btn.dataset.summary || btn.dataset.result || '');
    });

    window.CalcEnhancements = {
      readBoosts,
      isFairyAuraOn,
      applyFieldEnhancements,
      readPokemon,
      sendPokemonToTeambuilder,
      saveSingleMoveNote,
      appendSaveNoteButton,
      updateCalcSprites
    };

    console.log('%c[Calc v0.8] enhancements listos', 'color: #ea580c; font-weight: bold;');
  });
})();
