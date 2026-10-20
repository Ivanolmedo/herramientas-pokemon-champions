/**
 * sprites.js — URLs de sprites actualizadas (Showdown dex + fallbacks)
 */
(function (global) {
  const FORM_MAP = {
    charizardmegax: 'charizard-megax',
    charizardmegay: 'charizard-megay',
    garchompmega: 'garchomp-mega',
    garchompmegaz: 'garchomp-mega',
    salamencemega: 'salamence-mega',
    tyranitarmega: 'tyranitar-mega',
    floetteeternal: 'floette-eternal',
    floettemega: 'floette-eternal',
    arcaninehisui: 'arcanine-hisui',
    arcaninehisuian: 'arcanine-hisui',
    basculegion: 'basculegion-m',
    basculegionf: 'basculegion-f',
    basculegionm: 'basculegion-m',
    indeedeef: 'indeedee-f',
    indeedeem: 'indeedee-m',
    raichumegay: 'raichu',
    raichumegax: 'raichu',
    staraptormega: 'staraptor',
    golisopodmega: 'golisopod',
    gengarmega: 'gengar-mega',
    gardevoirmega: 'gardevoir-mega',
    metagrossmega: 'metagross-mega'
  };

  function spriteId(name) {
    let id = (name || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[’']/g, '')
      .replace(/♀/g, 'f')
      .replace(/♂/g, 'm')
      .replace(/[^a-z0-9]+/g, '')
      .replace(/^mega/, '');

    id = id
      .replace(/hisuian/g, 'hisui')
      .replace(/galarian/g, 'galar')
      .replace(/alolan/g, 'alola')
      .replace(/paldean/g, 'paldea');

    if (FORM_MAP[id]) id = FORM_MAP[id];

    // Insertar guiones en formes comunes si vienen pegados
    id = id
      .replace(/^(arcanine)(hisui)$/, '$1-$2')
      .replace(/^(garchomp)(mega.*)$/, '$1-$2')
      .replace(/^(salamence)(mega)$/, '$1-$2')
      .replace(/^(tyranitar)(mega)$/, '$1-$2')
      .replace(/^(floette)(eternal)$/, '$1-$2')
      .replace(/^(indeedee)(f|m)$/, '$1-$2')
      .replace(/^(basculegion)(f|m)$/, '$1-$2');

    return id;
  }

  function spriteUrl(name) {
    const id = spriteId(name);
    // dex: más actualizado que gen5 (incluye Hisui en muchos casos)
    return `https://play.pokemonshowdown.com/sprites/dex/${id}.png`;
  }

  function spriteUrlFallback(name) {
    const id = spriteId(name).replace(/-/g, '');
    return `https://play.pokemonshowdown.com/sprites/gen5/${id}.png`;
  }

  function spriteImgHtml(name, className) {
    const cls = className || 'w-10 h-10 object-contain';
    const primary = spriteUrl(name);
    const fallback = spriteUrlFallback(name);
    return `<img src="${primary}" alt="${String(name || '').replace(/"/g, '')}" class="${cls}" loading="lazy"
      onerror="if(!this.dataset.fb){this.dataset.fb=1;this.src='${fallback}';}else{this.style.display='none';}">`;
  }

  global.ChampSprites = { spriteId, spriteUrl, spriteUrlFallback, spriteImgHtml };
})(typeof window !== 'undefined' ? window : globalThis);
