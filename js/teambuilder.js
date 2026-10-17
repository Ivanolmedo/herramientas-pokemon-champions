/**
 * teambuilder.js - Lógica básica del Teambuilder
 * Por ahora solo feedback visual de los slots.
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('%c[Teambuilder] teambuilder.js cargado', 'color: #ea580c; font-weight: bold;');

  document.querySelectorAll('.team-slot').forEach(slot => {
    slot.addEventListener('click', () => {
      const slotNum = Number(slot.dataset.slot) + 1;
      // Placeholder: más adelante abrirá un modal de selección
      alert(`Slot ${slotNum}\n\nAquí se abrirá el selector de Pokémon (próximamente).`);
    });
  });
});
