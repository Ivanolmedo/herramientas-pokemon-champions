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
    alert(`Nota guardada:\n${note.text}`);
  }

  function sendToTeam(side) {
    const name = document.getElementById(side + '-species')?.value?.trim();
    if (!name) {
      alert('Selecciona un Pokémon primero.');
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
    alert(`"${name}" listo para el Teambuilder.\nAbre teambuilder.html con el mismo Live Server.`);
  }

  document.getElementById('btn-send-my-to-team')?.addEventListener('click', () => sendToTeam('p1'));
  document.getElementById('btn-send-opp-to-team')?.addEventListener('click', () => sendToTeam('p2'));

  // ---------- Calculation ----------
  function calcSideMoves(gen, attacker, defender, field, side, attackerName) {
    const inputs = document.querySelectorAll(`.move-input[data-side="${side}"]`);
    let blocks = [];
    inputs.forEach(input => {
      const moveName = input.value?.trim();
      if (!moveName) return;
      try {
        const move = new calc.Move(gen, moveName);
        const result = calc.calculate(gen, attacker, defender, move, field);
        const range = result.range();
        const desc = result.fullDesc();
        let koText = '';
        try {
          const ko = result.kochance();
          if (ko && ko.text) koText = ko.text;
        } catch (e) {}
        const summary = `${range[0]} – ${range[1]}%` + (koText ? ` (${koText})` : '');
        blocks.push({ moveName, range, desc, koText, summary, attackerName });
      } catch (err) {
        blocks.push({ error: true, moveName, message: err.message || 'Invalid move' });
      }
    });
    return blocks;
  }

  function renderBlocks(title, blocks, colorClass) {
    if (!blocks.length) return '';
    let html = `<div class="mb-4"><h4 class="font-semibold text-sm ${colorClass} mb-2">${title}</h4><div class="space-y-2">`;
    blocks.forEach(b => {
      if (b.error) {
        html += `<div class="border border-red-200 rounded-xl p-3 bg-red-50 text-sm text-red-600"><strong>${b.moveName}</strong>: ${b.message}</div>`;
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
        output.innerHTML = `<div class="text-center text-slate-400 py-6"><p>Escribe al menos un movimiento</p></div>`;
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

  window.runCalculation = runCalculation;
  runCalculation();
});
