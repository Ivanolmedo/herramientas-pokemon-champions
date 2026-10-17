# Herramientas Pokémon Champions

Calculadora de daños y Teambuilder pensados para **Pokémon Champions** (formato VGC).

Diseño inspirado en [pokemonvgc.es](https://pokemonvgc.es/), orientado a ser claro y amigable.

## Estado actual

- [x] Estructura base (Inicio, Calculadora, Teambuilder)
- [x] Diseño visual consistente (Tailwind + estilo cálido naranja)
- [x] Navegación compartida en español
- [x] **Integración de `@smogon/calc`** (motor oficial de Smogon)
- [ ] Autocompletado de especies / moves / abilities / items
- [ ] EVs / IVs / boosts completos
- [ ] Soporte específico de mecánicas Champions
- [ ] Teambuilder funcional
- [ ] Conexión Teambuilder ↔ Calculadora
- [ ] Soporte bilingüe completo (ES / EN)

## Cómo usarlo

1. Abre `index.html` o `calc.html` en el navegador (o usa un servidor local).
2. En la calculadora escribe nombres **en inglés**:
   - Species: `Flutter Mane`, `Incineroar`, `Ogerpon`, etc.
   - Moves: `Moonblast`, `Knock Off`, `Ivy Cudgel`, etc.
3. Los resultados aparecen automáticamente arriba.

## Estructura del proyecto

```
herramientas-pokemon-champions/
├── index.html
├── calc.html               ← Calculadora con @smogon/calc
├── teambuilder.html
├── css/styles.css
├── js/
│   ├── common.js
│   ├── calc.js             ← Lógica + integración Smogon
│   └── teambuilder.js
└── README.md
```

## Notas técnicas

- Se usa la versión de navegador de `@smogon/calc` vía unpkg.
- Generación actual: **Gen 9** (base). Las mecánicas específicas de Champions se añadirán después.
- Los nombres de especies, movimientos, habilidades e items deben escribirse en **inglés** (como en Pokémon Showdown / Smogon).

## Próximos pasos recomendados

1. Añadir autocompletado (usando los datos que ya trae `@smogon/calc`).
2. Mejorar el panel de stats (EVs + IVs + naturaleza real).
3. Empezar el selector de Pokémon del Teambuilder.

---

Hecho con ❤️ para la comunidad de Pokémon Champions / VGC.
