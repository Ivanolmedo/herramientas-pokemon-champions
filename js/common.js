/**
 * common.js - Funciones compartidas entre páginas
 * Herramientas Pokémon Champions
 */

document.addEventListener('DOMContentLoaded', () => {
  // Resaltar el link activo según la página actual
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  console.log('%c[Herramientas Champions] common.js cargado', 'color: #ea580c; font-weight: bold;');
});
