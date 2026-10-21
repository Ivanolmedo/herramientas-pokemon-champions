# Herramientas Pokémon Champions

**Versión 1.0** — Calculadora de daños y Teambuilder orientados a **Pokémon Champions** (VGC).

Proyecto de fans, pensado para ser más claro y usable que herramientas genéricas al construir y analizar equipos.

> **No oficial.** No está afiliado ni respaldado por Nintendo, Game Freak, Creatures ni The Pokémon Company.  
> Pokémon y sus nombres son marcas registradas de sus respectivos propietarios.

---

## Qué incluye

### Calculadora (`calc.html`)
- Cálculo **bilateral** (tu Pokémon ↔ adversario)
- Nivel 50 (formato Champions)
- **Stat Points (SP)** con barras 0–32
- Boosts de stats (±6) para setup / Intimidate / etc.
- Campo: clima, terreno, Helping Hand, pantallas, **Fairy Aura**
- Autocompletado de especies, sets y movimientos
- Guardar **una línea de daño** como nota
- Enviar Pokémon al Teambuilder

### Teambuilder (`teambuilder.html`)
- 6 slots con editor (SP, moves, item, nature, ability)
- Import / export formato **Showdown** (sin romper el formato)
- Guardar / cargar equipos en el navegador (`localStorage`)
- Análisis defensivo (balance neto de tipos)
- Cobertura ofensiva y speed control
- Detector de amenazas (meta + lógica de cobertura)
- Sugerencia de **leads en pareja**
- Notas de cálculo por Pokémon

---

## Demo / uso local

1. Sirve la carpeta con cualquier servidor estático (recomendado: **Live Server** en VS Code/Cursor).
2. Abre `index.html`, `calc.html` o `teambuilder.html`.
3. Calc y Teambuilder deben abrirse en el **mismo origen** (mismo `localhost`/dominio) para transferir Pokémon y notas.

```bash
# Ejemplo rápido
npx serve .
# o
python -m http.server 5500
```

---

## Publicar (gratis)

### GitHub Pages
1. Sube este repositorio a GitHub.
2. **Settings → Pages → Deploy from branch** → `main` / root.
3. La web quedará en  
   `https://<usuario>.github.io/<repo>/`

### Cloudflare Pages / Netlify / Vercel
Conecta el repo y publica la carpeta raíz (sitio estático).

---

## Estructura

```
├── index.html
├── calc.html
├── teambuilder.html
├── css/
│   └── styles.min.css
└── js/
    ├── common.min.js
    ├── sprites.min.js
    ├── move-autocomplete.min.js
    ├── calc.min.js
    └── teambuilder.min.js
```

Los `.min.js` / `.min.css` son la versión de **producción** (minificada).

Dependencias por CDN:
- Tailwind CSS
- Font Awesome
- [@smogon/calc](https://github.com/smogon/damage-calc)
- Sets Champions (Showdown / Smogon)

---

## Avisos

- Los nombres de Pokémon, habilidades y movimientos deben estar en **inglés** (motor Smogon).
- Los datos de meta (Pikalytics) pueden fallar por CORS; en ese caso se usa una lista de respaldo.
- Las notas y equipos guardados viven en **tu navegador** (`localStorage`), no en un servidor.

---

## Roadmap posible

- Más idiomas (ES/EN en toda la UI)
- Mejorar mapeo de sprites de formes nuevas
- Partir módulos del teambuilder para mantenimiento
- Ajustes de scoring de amenazas / leads con feedback de jugadores

---

## Licencia / uso

Código del proyecto: úsalo y modifícalo libremente para uso personal o comunitario no comercial.  
Respeta las marcas y políticas de Nintendo / The Pokémon Company.

Si esta tool te sirve, compártela con tu comunidad VGC.
