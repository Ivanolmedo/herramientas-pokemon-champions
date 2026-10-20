/**
 * move-autocomplete.js — búsqueda cómoda de movimientos
 * Uso: setupMoveAutocomplete('#edit-move1, #edit-move2, .move-input, #my-move1');
 */
(function (global) {
  let CACHED_MOVES = null;

  function collectMoveNames() {
    if (CACHED_MOVES) return CACHED_MOVES;
    const names = new Set();
    try {
      if (typeof calc !== 'undefined') {
        if (calc.MOVES && calc.MOVES[9]) {
          for (const id in calc.MOVES[9]) {
            const m = calc.MOVES[9][id];
            if (m && m.name) names.add(m.name);
          }
        }
        const gen = calc.Generations.get(9);
        if (gen && gen.moves) {
          // algunas builds exponen .list
          const list = gen.moves.list || [];
          list.forEach(m => { if (m && m.name) names.add(m.name); });
        }
      }
    } catch (e) {}
    // fallback mínimo si no hay data
    if (names.size < 20) {
      ['Protect', 'Fake Out', 'Tailwind', 'Trick Room', 'U-turn', 'Parting Shot',
        'Earthquake', 'Close Combat', 'Flare Blitz', 'Wood Hammer', 'Make It Rain',
        'Shadow Ball', 'Moonblast', 'Heat Wave', 'Hyper Voice', 'Thunderbolt',
        'Icy Wind', 'Electroweb', 'Follow Me', 'Rage Powder', 'Spore', 'Swords Dance',
        'Nasty Plot', 'Calm Mind', 'Quiver Dance', 'Iron Head', 'Play Rough'
      ].forEach(n => names.add(n));
    }
    CACHED_MOVES = [...names].sort((a, b) => a.localeCompare(b));
    return CACHED_MOVES;
  }

  function setupMoveAutocomplete(selector) {
    if (typeof calc === 'undefined' && !CACHED_MOVES) {
      setTimeout(() => setupMoveAutocomplete(selector), 400);
      return;
    }
    const all = collectMoveNames();

    document.querySelectorAll(selector).forEach(input => {
      if (!input || input.dataset.moveAc === '1') return;
      input.dataset.moveAc = '1';

      if (!input.parentElement.classList.contains('move-ac-wrapper')) {
        const wrap = document.createElement('div');
        wrap.className = 'move-ac-wrapper relative w-full';
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

      const open = () => {
        const q = input.value.trim().toLowerCase();
        if (q.length < 1) return close();
        const matches = all.filter(n => n.toLowerCase().includes(q)).slice(0, 14);
        close();
        if (!matches.length) return;
        listEl = document.createElement('div');
        listEl.className = 'autocomplete-list absolute z-[60] left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg max-h-52 overflow-y-auto mt-1';
        matches.forEach((name, i) => {
          const div = document.createElement('div');
          div.className = 'autocomplete-item px-3 py-2 text-sm cursor-pointer hover:bg-orange-50';
          div.textContent = name;
          div.addEventListener('mousedown', e => {
            e.preventDefault();
            input.value = name;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            close();
          });
          listEl.appendChild(div);
        });
        wrapper.appendChild(listEl);
      };

      input.addEventListener('input', open);
      input.addEventListener('focus', open);
      input.addEventListener('keydown', e => {
        if (!listEl) return;
        const items = listEl.querySelectorAll('.autocomplete-item');
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          active = Math.min(active + 1, items.length - 1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          active = Math.max(active - 1, 0);
        } else if (e.key === 'Enter' && active >= 0) {
          e.preventDefault();
          items[active].dispatchEvent(new Event('mousedown'));
        } else if (e.key === 'Escape') close();
        items.forEach((it, i) => {
          it.classList.toggle('bg-orange-100', i === active);
        });
      });
      document.addEventListener('click', e => {
        if (!wrapper.contains(e.target)) close();
      });
    });
  }

  global.setupMoveAutocomplete = setupMoveAutocomplete;
})(typeof window !== 'undefined' ? window : globalThis);
