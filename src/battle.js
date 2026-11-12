// Moteur de combat : statistiques, natures, table des types, calcul des dégâts (formule des jeux depuis la 5e génération,
// comme le calculateur de Pokémon Showdown) et conseil « attaquer ou changer ».
// Aucune dépendance à l'interface : tout passe par les données de core.json / moves.json.
(function () {
  'use strict';

  const STAT_FR = ['PV', 'Attaque', 'Défense', 'Atq. Spé.', 'Déf. Spé.', 'Vitesse'];
  const STAT_SHORT = ['PV', 'Atq', 'Déf', 'ASp', 'DSp', 'Vit'];

  // [nom français, stat augmentée, stat baissée] (1 Atq, 2 Déf, 3 Atq Spé, 4 Déf Spé, 5 Vit ; 0 = neutre)
  const NATURES = {
    hardy: ['Hardi', 0, 0], lonely: ['Solo', 1, 2], brave: ['Brave', 1, 5], adamant: ['Rigide', 1, 3], naughty: ['Mauvais', 1, 4],
    bold: ['Assuré', 2, 1], docile: ['Docile', 0, 0], relaxed: ['Relax', 2, 5], impish: ['Malin', 2, 3], lax: ['Lâche', 2, 4],
    timid: ['Timide', 5, 1], hasty: ['Pressé', 5, 2], serious: ['Sérieux', 0, 0], jolly: ['Jovial', 5, 3], naive: ['Naïf', 5, 4],
    modest: ['Modeste', 3, 1], mild: ['Doux', 3, 2], quiet: ['Discret', 3, 5], bashful: ['Pudique', 0, 0], rash: ['Foufou', 3, 4],
    calm: ['Calme', 4, 1], gentle: ['Gentil', 4, 2], sassy: ['Malpoli', 4, 5], careful: ['Prudent', 4, 3], quirky: ['Bizarre', 0, 0],
  };
  const natureMult = (nat, i) => { const n = NATURES[nat] || NATURES.hardy; return n[1] === n[2] ? 1 : i === n[1] ? 1.1 : i === n[2] ? 0.9 : 1; };

  // table des types (génération 6 et suivantes) : attaquant -> { défenseur: multiplicateur }
  const T = { normal: 1, fighting: 2, flying: 3, poison: 4, ground: 5, rock: 6, bug: 7, ghost: 8, steel: 9, fire: 10, water: 11, grass: 12, electric: 13, psychic: 14, ice: 15, dragon: 16, dark: 17, fairy: 18 };
  const CHART_SRC = {
    normal: { rock: 0.5, ghost: 0, steel: 0.5 },
    fighting: { normal: 2, flying: 0.5, poison: 0.5, rock: 2, bug: 0.5, ghost: 0, steel: 2, psychic: 0.5, ice: 2, dark: 2, fairy: 0.5 },
    flying: { fighting: 2, rock: 0.5, bug: 2, steel: 0.5, grass: 2, electric: 0.5 },
    poison: { poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, grass: 2, fairy: 2 },
    ground: { flying: 0, poison: 2, rock: 2, bug: 0.5, steel: 2, fire: 2, grass: 0.5, electric: 2 },
    rock: { fighting: 0.5, flying: 2, ground: 0.5, bug: 2, steel: 0.5, fire: 2, ice: 2 },
    bug: { fighting: 0.5, flying: 0.5, poison: 0.5, ghost: 0.5, steel: 0.5, fire: 0.5, grass: 2, psychic: 2, dark: 2, fairy: 0.5 },
    ghost: { normal: 0, ghost: 2, psychic: 2, dark: 0.5 },
    steel: { rock: 2, steel: 0.5, fire: 0.5, water: 0.5, electric: 0.5, ice: 2, fairy: 2 },
    fire: { rock: 0.5, bug: 2, steel: 2, fire: 0.5, water: 0.5, grass: 2, ice: 2, dragon: 0.5 },
    water: { ground: 2, rock: 2, fire: 2, water: 0.5, grass: 0.5, dragon: 0.5 },
    grass: { flying: 0.5, poison: 0.5, ground: 2, rock: 2, bug: 0.5, steel: 0.5, fire: 0.5, water: 2, grass: 0.5, dragon: 0.5 },
    electric: { flying: 2, ground: 0, water: 2, grass: 0.5, electric: 0.5, dragon: 0.5 },
    psychic: { fighting: 2, poison: 2, steel: 0.5, psychic: 0.5, dark: 0 },
    ice: { flying: 2, ground: 2, steel: 0.5, fire: 0.5, water: 0.5, grass: 2, ice: 0.5, dragon: 2 },
    dragon: { steel: 0.5, dragon: 2, fairy: 0 },
    dark: { fighting: 0.5, ghost: 2, psychic: 2, dark: 0.5, fairy: 0.5 },
    fairy: { fighting: 2, poison: 0.5, steel: 0.5, fire: 0.5, dragon: 2, dark: 2 },
  };
  const CHART = {};
  for (const [a, row] of Object.entries(CHART_SRC)) { CHART[T[a]] = {}; for (const [d, m] of Object.entries(row)) CHART[T[a]][T[d]] = m; }
  // différences des anciennes générations : 2 à 5 (Acier résiste à Spectre et Ténèbres, pas de Fée) et 1
  function eff1(atk, def, gen) {
    if (gen && gen <= 5) {
      if (atk === 18 || def === 18) return 1;
      if (def === 9 && (atk === 8 || atk === 17)) return 0.5;
    }
    if (gen === 1) {
      if (atk === 8 && def === 14) return 0; // Spectre sans effet sur Psy (bug de la 1re génération)
      if ((atk === 4 && def === 7) || (atk === 7 && def === 4)) return 2;
      if (atk === 15 && def === 10) return 1;
      if (atk === 17 || def === 17 || atk === 9 || def === 9) return 1;
    }
    return CHART[atk] && CHART[atk][def] != null ? CHART[atk][def] : 1;
  }
  const effectiveness = (atk, defTypes, gen) => defTypes.reduce((m, d) => m * eff1(atk, d, gen), 1);
  const PHYS_TYPES = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]); // avant la 4e génération : la catégorie dépend du type

  // valeurs des attaques pour un jeu donné (puissance, précision, PP, type d'époque) ; vgOrder : ordre des jeux
  function movesForGame(current, changes, vg, vgOrder) {
    const ord = (v) => vgOrder[v] ?? 999;
    const o = ord(vg);
    const res = {};
    const byMove = new Map();
    for (const c of changes) { if (o < ord(c[1])) { if (!byMove.has(c[0])) byMove.set(c[0], []); byMove.get(c[0]).push(c); } }
    for (const [id, mv] of Object.entries(current)) {
      const list = byMove.get(+id);
      if (!list) { res[id] = mv; continue; }
      const m = mv.slice();
      // du changement le plus récent au plus ancien : la valeur la plus ancienne gagne
      list.sort((a, b) => ord(b[1]) - ord(a[1]));
      for (const [, , type, pow, pp, acc] of list) { if (type != null) m[1] = type; if (pow != null) m[3] = pow; if (pp != null) m[5] = pp; if (acc != null) m[4] = acc; }
      res[id] = m;
    }
    return res;
  }
  // types d'un Pokémon dans une génération donnée (pokemon.tpast : { dernière génération : types })
  function typesInGen(pk, gen) {
    if (!gen || !pk.tpast) return pk.types.slice();
    const keys = Object.keys(pk.tpast).map(Number).filter((g) => g >= gen).sort((a, b) => a - b);
    return keys.length ? pk.tpast[keys[0]].slice() : pk.types.slice();
  }

  // stats de base à l'époque du jeu (data/stats-past.json, chargé dans core._stpast) ; 1re génération : Spécial pour ASp et DSp
  function statsInGen(core, pk, gen) {
    const st = pk.st.slice();
    const past = gen && core._stpast && core._stpast[pk.id];
    if (!past) return st;
    const best = {};
    for (const [last, i, v] of past) if (last >= gen && (!best[i] || last < best[i][0])) best[i] = [last, v];
    for (const [i, [, v]] of Object.entries(best)) { if (+i === 6) { st[3] = v; st[4] = v; } else st[+i] = v; }
    return st;
  }

  // objets gérés par le calcul
  const TYPE_FR = { 1: 'Normal', 2: 'Combat', 3: 'Vol', 4: 'Poison', 5: 'Sol', 6: 'Roche', 7: 'Insecte', 8: 'Spectre', 9: 'Acier', 10: 'Feu', 11: 'Eau', 12: 'Plante', 13: 'Électrik', 14: 'Psy', 15: 'Glace', 16: 'Dragon', 17: 'Ténèbres', 18: 'Fée' };
  const ITEMS = [
    ['', 'Aucun objet'],
    ['choice-band', 'Bandeau Choix (Attaque × 1,5)'],
    ['choice-specs', 'Lunettes Choix (Atq. Spé. × 1,5)'],
    ['choice-scarf', 'Mouchoir Choix (Vitesse × 1,5)'],
    ['life-orb', 'Orbe Vie (dégâts × 1,3)'],
    ['expert-belt', 'Ceinture Pro (super efficace × 1,2)'],
    ['muscle-band', 'Bandeau Muscle (physique × 1,1)'],
    ['wise-glasses', 'Lunettes Sages (spécial × 1,1)'],
    ['assault-vest', 'Veste de Combat (Déf. Spé. × 1,5)'],
    ['eviolite', 'Évoluroc (Déf. et Déf. Spé. × 1,5 si pas au dernier stade)'],
    ...Object.entries(TYPE_FR).map(([t, n]) => ['type-' + t, 'Objet de type ' + n + ' (attaques ' + n + ' × 1,2)']),
  ];

  // attaques à part
  const FIXED = { 69: 'level', 101: 'level', 82: 40, 49: 20 }; // Frappe Atlas, Ombre Nocturne, Draco-Rage, Sonic Boom
  const HALF_HP = new Set([162]); // Croc Fatal
  // nombre de coups (3 = moyenne des attaques de 2 à 5 coups)
  const MULTI = { 24: 2, 155: 2, 530: 2, 751: 2, 458: 2, 41: 2, 544: 2, 818: 3, 331: 3, 350: 3, 333: 3, 42: 3, 541: 3, 799: 3, 292: 3, 31: 3, 154: 3, 3: 3, 4: 3, 140: 3, 131: 3, 594: 3 };
  const FIXED_HITS = new Set([24, 155, 530, 751, 458, 41, 544, 818]);
  const ALWAYS_CRIT = new Set([818, 524, 480]); // Torrent de Coups, Souffle Glacé, Yama Arashi
  const USE_DEF = new Set([473, 540, 548]); // Choc Psy, Frappe Psy, Lame Ointe : visent la Défense
  const BODY_PRESS = 776, FOUL_PLAY = 492, FACADE = 263, ERUPTION = new Set([284, 323]);
  const WEIGHT_TARGET = new Set([67, 447]); // Balayage, Nœud Herbe
  const WEIGHT_RATIO = new Set([484, 535]); // Tacle Lourd, Tacle Feu
  const GYRO = 360, ELECTRO_BALL = 486;

  function calcStat(base, i, iv, ev, lvl, nat) {
    if (i === 0) return base === 1 ? 1 : Math.floor((2 * base + iv + Math.floor(ev / 4)) * lvl / 100) + lvl + 10;
    return Math.floor((Math.floor((2 * base + iv + Math.floor(ev / 4)) * lvl / 100) + 5) * natureMult(nat, i));
  }
  // min− (IV 0, EV 0, nature défavorable), min (IV 31, EV 0, neutre), max (IV 31, EV 252, neutre), max+ (IV 31, EV 252, favorable)
  function statRange(base, i, lvl) {
    const s = (iv, ev, m) => (i === 0 ? calcStat(base, 0, iv, ev, lvl) : Math.floor((Math.floor((2 * base + iv + Math.floor(ev / 4)) * lvl / 100) + 5) * m));
    return [s(0, 0, 0.9), s(31, 0, 1), s(31, 252, 1), s(31, 252, 1.1)];
  }
  const boostMult = (b) => (b >= 0 ? (2 + b) / 2 : 2 / (2 - b));

  // un Pokémon prêt au combat à partir de la fiche saisie
  function build(core, mon, gen) {
    if (!mon || !mon.sp) return null;
    const pk = core.pokemon[mon.pk] || core.pokemon[mon.sp];
    if (!pk) return null;
    const lvl = Math.max(1, Math.min(100, +mon.lvl || 50));
    const iv = (mon.iv || []).length === 6 ? mon.iv : [31, 31, 31, 31, 31, 31];
    const ev = (mon.ev || []).length === 6 ? mon.ev : [0, 0, 0, 0, 0, 0];
    // stats données telles quelles (Tour de Combat de Diamant Étincelant / Perle Scintillante : Bulbapedia donne les stats au niveau 50)
    const base = statsInGen(core, pk, gen);
    const stats = (mon.fixed || []).length === 6 && lvl === 50 ? mon.fixed.map(Number) : base.map((b, i) => calcStat(b, i, +iv[i] || 0, +ev[i] || 0, lvl, mon.nature));
    const sp = core.species[pk.sp];
    if (!core._finalStage) { core._finalStage = new Set(); const hasChild = new Set(Object.values(core.species).map((s) => s.from).filter(Boolean)); for (const id of Object.keys(core.species)) if (!hasChild.has(+id)) core._finalStage.add(+id); }
    return {
      mon, pk, sp, lvl, stats, base, ab: (!gen || gen >= 3) && mon.ab && core.abilities[mon.ab] ? core.abilities[mon.ab].en : '', item: mon.item || '', types: typesInGen(pk, gen), gen: gen || 9,
      tera: +mon.tera || 0, teraOn: !!mon.teraOn && +mon.tera > 0 && (!gen || gen >= 9), boosts: mon.boosts || [0, 0, 0, 0, 0, 0],
      hpPct: mon.hpPct == null || mon.hpPct === '' ? 100 : Math.max(0, Math.min(100, +mon.hpPct)), burned: !!mon.burned, notFinal: !core._finalStage.has(pk.sp),
      name: sp ? sp.fr : pk.ident,
    };
  }
  const defTypes = (b) => (b.teraOn ? [b.tera] : b.types);

  function speed(b, field) {
    let s = Math.floor(b.stats[5] * boostMult(b.boosts[5] || 0));
    if (b.item === 'choice-scarf') s = Math.floor(s * 1.5);
    const w = field && field.weather;
    if ((w === 'rain' && b.ab === 'Swift Swim') || (w === 'sun' && b.ab === 'Chlorophyll') || (w === 'sand' && b.ab === 'Sand Rush') || (w === 'snow' && b.ab === 'Slush Rush')) s *= 2;
    return s;
  }

  const ATE = { Aerilate: 3, Pixilate: 18, Refrigerate: 15, Galvanize: 13 };
  const PINCH = { Blaze: 10, Torrent: 11, Overgrow: 12, Swarm: 7 };
  const IMMUNE = { Levitate: 5, 'Earth Eater': 5, 'Flash Fire': 10, 'Well-Baked Body': 10, 'Water Absorb': 11, 'Storm Drain': 11, 'Dry Skin': 11, 'Volt Absorb': 13, 'Lightning Rod': 13, 'Motor Drive': 13, 'Sap Sipper': 12 };
  const fr = (x) => String(x).replace('.', ',');

  // dégâts d'une attaque de A sur D : { rolls (16 jets, total de tous les coups), min, max, pct, reasons, eff, … }
  function damage(core, A, D, mid, field) {
    field = field || {};
    const mv = core._moves[mid];
    if (!mv) return null;
    const gen = field.gen || 9;
    let [name, type0, cat, pow0, acc] = mv;
    if (gen <= 3 && cat !== 1) cat = PHYS_TYPES.has(type0) ? 2 : 3;
    const out = { mid, name, type: type0, cat, acc, reasons: [], rolls: [0], min: 0, max: 0, hits: 1, pct: [0, 0] };
    if (cat === 1) { out.status = true; return out; }
    let type = type0;
    let pow = pow0;
    const reasons = out.reasons;
    if (type === 1 && ATE[A.ab]) { type = ATE[A.ab]; pow = pow && Math.floor(pow * 1.2); reasons.push('talent : devient type ' + TYPE_FR[type]); }
    out.type = type;
    let eff = effectiveness(type, defTypes(D), gen);
    if (IMMUNE[D.ab] === type && A.ab !== 'Mold Breaker') { eff = 0; reasons.push('immunisé grâce à son talent'); }
    if (D.ab === 'Wonder Guard' && eff <= 1) { eff = 0; reasons.push('Garde Mystik : seules les attaques super efficaces touchent'); }
    out.eff = eff;
    if (eff === 0) { if (!reasons.length) reasons.push('aucun effet sur ce type'); return out; }

    const lvl = A.lvl;
    const hp = D.stats[0];
    if (FIXED[mid] != null || HALF_HP.has(mid)) {
      const v = HALF_HP.has(mid) ? Math.max(1, Math.floor(hp * D.hpPct / 100 / 2)) : FIXED[mid] === 'level' ? lvl : FIXED[mid];
      out.rolls = [v]; out.min = out.max = v; out.fixed = true; out.pct = [v / hp * 100, v / hp * 100];
      reasons.push('dégâts fixes');
      return out;
    }
    const wA = A.pk.w / 10, wD = D.pk.w / 10;
    if (WEIGHT_TARGET.has(mid)) pow = wD < 10 ? 20 : wD < 25 ? 40 : wD < 50 ? 60 : wD < 100 ? 80 : wD < 200 ? 100 : 120;
    if (WEIGHT_RATIO.has(mid)) { const r = wA / wD; pow = r >= 5 ? 120 : r >= 4 ? 100 : r >= 3 ? 80 : r >= 2 ? 60 : 40; }
    if (mid === GYRO) pow = Math.min(150, Math.floor(25 * speed(D, field) / Math.max(1, speed(A, field))) + 1);
    if (mid === ELECTRO_BALL) { const r = speed(A, field) / Math.max(1, speed(D, field)); pow = r >= 4 ? 150 : r >= 3 ? 120 : r >= 2 ? 80 : r >= 1 ? 60 : 40; }
    if (ERUPTION.has(mid)) pow = Math.max(1, Math.floor(150 * A.hpPct / 100));
    if (mid === FACADE && A.burned) pow *= 2;
    if (!pow) { out.unknown = true; reasons.push('puissance variable, non calculée'); return out; }
    if (A.ab === 'Technician' && pow <= 60) { pow = Math.floor(pow * 1.5); reasons.push('Technicien'); }
    if (A.ab === 'Water Bubble' && type === 11) pow *= 2;
    if (A.ab === 'Steelworker' && type === 9) pow = Math.floor(pow * 1.5);
    if (A.ab === 'Transistor' && type === 13) pow = Math.floor(pow * 1.3);
    if (A.ab === "Dragon's Maw" && type === 16) pow = Math.floor(pow * 1.5);
    if (PINCH[A.ab] === type && A.hpPct <= 33.4) { pow = Math.floor(pow * 1.5); reasons.push('talent de type activé (PV bas)'); }
    if (A.item === 'type-' + type) { pow = Math.floor(pow * (gen <= 3 ? 1.1 : 1.2)); reasons.push('objet de type'); } // × 1,1 avant la 4e génération
    if (A.item === 'muscle-band' && cat === 2) pow = Math.floor(pow * 1.1);
    if (A.item === 'wise-glasses' && cat === 3) pow = Math.floor(pow * 1.1);
    out.power = pow;

    const crit = !!field.crit || ALWAYS_CRIT.has(mid);
    const physical = cat === 2;
    let aIdx = physical ? 1 : 3;
    let atkSrc = A;
    if (mid === BODY_PRESS) aIdx = 2;
    if (mid === FOUL_PLAY) atkSrc = D;
    const dIdx = physical || USE_DEF.has(mid) ? 2 : 4;
    let ab = atkSrc.boosts[aIdx] || 0, db = D.boosts[dIdx] || 0;
    if (crit) { ab = Math.max(0, ab); db = Math.min(0, db); }
    let atk = Math.floor(atkSrc.stats[aIdx] * boostMult(ab));
    if ((A.ab === 'Huge Power' || A.ab === 'Pure Power') && physical) atk *= 2;
    if (A.ab === 'Hustle' && physical) atk = Math.floor(atk * 1.5);
    if (A.ab === 'Guts' && A.burned && physical) atk = Math.floor(atk * 1.5);
    if (A.ab === 'Gorilla Tactics' && physical) atk = Math.floor(atk * 1.5);
    if (A.ab === 'Solar Power' && !physical && field.weather === 'sun') atk = Math.floor(atk * 1.5);
    if (A.item === 'choice-band' && physical) { atk = Math.floor(atk * 1.5); reasons.push('Bandeau Choix'); }
    if (A.item === 'choice-specs' && !physical) { atk = Math.floor(atk * 1.5); reasons.push('Lunettes Choix'); }
    if (D.ab === 'Thick Fat' && (type === 10 || type === 15)) { atk = Math.floor(atk / 2); reasons.push('Isograisse : moitié des dégâts'); }
    if (D.ab === 'Heatproof' && type === 10) atk = Math.floor(atk / 2);
    if (D.ab === 'Water Bubble' && type === 10) atk = Math.floor(atk / 2);
    if (D.ab === 'Purifying Salt' && type === 8) atk = Math.floor(atk / 2);
    let def = Math.floor(D.stats[dIdx] * boostMult(db));
    if (dIdx === 4 && D.item === 'assault-vest') def = Math.floor(def * 1.5);
    if (D.item === 'eviolite' && D.notFinal) def = Math.floor(def * 1.5);
    if (D.ab === 'Fur Coat' && dIdx === 2) def *= 2;
    if (field.weather === 'sand' && gen >= 4 && dIdx === 4 && D.types.includes(6)) def = Math.floor(def * 1.5);
    if (field.weather === 'snow' && gen >= 9 && dIdx === 2 && D.types.includes(15)) def = Math.floor(def * 1.5);

    let base = Math.floor(Math.floor(Math.floor(2 * lvl / 5 + 2) * pow * atk / Math.max(1, def)) / 50) + 2;
    if (field.weather === 'sun') { if (type === 10) { base = Math.floor(base * 1.5); reasons.push('soleil'); } if (type === 11) base = Math.floor(base * 0.5); }
    if (field.weather === 'rain') { if (type === 11) { base = Math.floor(base * 1.5); reasons.push('pluie'); } if (type === 10) base = Math.floor(base * 0.5); }
    if (crit) { base = Math.floor(base * (gen >= 6 ? 1.5 : 2)); reasons.push('coup critique (× ' + (gen >= 6 ? '1,5' : '2') + ')'); }
    const own = A.types.includes(type);
    let stab = 1;
    if (A.teraOn && A.tera === type) stab = own ? 2 : 1.5;
    else if (own) stab = 1.5;
    if (A.ab === 'Adaptability' && stab > 1) stab = stab === 1.5 ? 2 : 2.25;
    if (stab > 1) reasons.push('même type que le Pokémon (× ' + fr(stab) + ')');
    if (eff >= 2) reasons.push('super efficace (× ' + eff + ')');
    if (eff < 1) reasons.push('peu efficace (× ' + fr(eff) + ')');
    const burnHalf = A.burned && physical && A.ab !== 'Guts' && mid !== FACADE;
    let other = 1;
    if (A.item === 'life-orb') { other *= 1.3; reasons.push('Orbe Vie'); }
    if (A.item === 'expert-belt' && eff > 1) other *= 1.2;
    if (A.ab === 'Tinted Lens' && eff < 1) other *= 2;
    if ((D.ab === 'Multiscale' || D.ab === 'Shadow Shield') && D.hpPct >= 100) { other *= 0.5; reasons.push('dégâts divisés par 2 (talent, PV pleins)'); }
    if ((D.ab === 'Filter' || D.ab === 'Solid Rock' || D.ab === 'Prism Armor') && eff > 1) other *= 0.75;
    if (D.ab === 'Ice Scales' && !physical) other *= 0.5;
    if (D.ab === 'Dry Skin' && type === 10) other *= 1.25;
    const hits = MULTI[mid] || 1;
    out.hits = hits;
    if (hits > 1) reasons.push(FIXED_HITS.has(mid) ? hits + ' coups' : 'compté pour 3 coups (2 à 5)');
    if (burnHalf) reasons.push('brûlure : dégâts physiques divisés par 2');
    const rolls = [];
    for (let r = 85; r <= 100; r++) {
      let d = Math.floor(base * r / 100);
      d = Math.floor(d * stab);
      d = Math.floor(d * eff);
      if (burnHalf) d = Math.floor(d / 2);
      d = Math.floor(d * other);
      rolls.push(Math.max(1, d) * hits);
    }
    out.rolls = rolls;
    out.min = rolls[0]; out.max = rolls[15];
    out.pct = [rolls[0] / hp * 100, rolls[15] / hp * 100];
    return out;
  }

  // chances de mettre K.O. en 1 à 4 coups
  function koChance(rolls, hpLeft) {
    const res = [];
    let dist = new Map([[0, 1]]);
    for (let n = 1; n <= 4; n++) {
      const nd = new Map();
      for (const [s, p] of dist) for (const r of rolls) { const k = Math.min(hpLeft, s + r); nd.set(k, (nd.get(k) || 0) + p / rolls.length); }
      dist = nd;
      res.push(dist.get(hpLeft) || 0);
      if (res[n - 1] >= 1) break;
    }
    return res;
  }
  // nombre de coups pour le K.O. (au moins 50 % de chance)
  function hitsToKO(dmg, D) {
    if (!dmg || dmg.status || dmg.unknown || !dmg.max) return { n: Infinity, chance: 0, txt: dmg && dmg.eff === 0 ? 'aucun effet' : '—' };
    const hpLeft = Math.max(1, Math.round(D.stats[0] * D.hpPct / 100));
    const ch = koChance(dmg.rolls, hpLeft);
    for (let i = 0; i < ch.length; i++) {
      if (ch[i] >= 0.5) {
        const n = i + 1;
        const sure = ch[i] >= 0.9999;
        return { n, chance: ch[i], txt: (sure ? '' : fr(Math.round(ch[i] * 1000) / 10) + ' % de chance de ') + (n === 1 ? 'K.O. en 1 coup' : 'K.O. en ' + n + ' coups') + (sure ? ' garanti' : '') };
      }
    }
    const avg = dmg.rolls.reduce((a, b) => a + b, 0) / dmg.rolls.length;
    const n = Math.ceil(hpLeft / avg);
    return { n, chance: 0, txt: 'environ ' + n + ' coups' };
  }

  function rankMoves(core, A, D, mids, field) {
    const rows = [];
    for (const mid of mids) {
      const d = damage(core, A, D, mid, field);
      if (!d) continue;
      d.ko = hitsToKO(d, D);
      const avg = d.rolls.reduce((a, b) => a + b, 0) / d.rolls.length;
      d.avgPct = avg / D.stats[0] * 100;
      const acc = d.acc || 100;
      d.score = d.status || d.unknown ? -1 : (d.ko.n === Infinity ? 0 : 1000 / d.ko.n) * (acc / 100) + d.avgPct * (acc / 100);
      rows.push(d);
    }
    rows.sort((a, b) => b.score - a.score);
    return rows;
  }

  // générateur pseudo-aléatoire à graine fixe : mêmes résultats à chaque affichage
  function rng(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }

  // simulation du duel (jets de dégâts au hasard, précision, égalité de Vitesse) : chances de gagner et PV restants
  function simulate(A, O, best, threat, entry, sA, sO, N) {
    N = N || 4000;
    const rnd = rng(A.stats.join('') * 7 + O.stats.join('') * 13 + (best ? best.mid : 0) + (threat ? threat.mid * 31 : 0));
    const hit = (d) => d && d.max > 0 && rnd() * 100 < (d.acc || 100);
    const roll = (d) => d.rolls[Math.floor(rnd() * d.rolls.length)];
    const hpA0 = Math.max(0, Math.round(A.stats[0] * A.hpPct / 100)), hpO0 = Math.max(0, Math.round(O.stats[0] * O.hpPct / 100));
    let wins = 0, draws = 0, hpLeft = 0, turnsSum = 0;
    for (let k = 0; k < N; k++) {
      let a = hpA0, o = hpO0;
      if (entry && hit(entry)) a -= roll(entry);
      if (a <= 0) continue;
      let t = 0;
      while (a > 0 && o > 0 && t < 40) {
        t++;
        const meFirst = sA > sO || (sA === sO && rnd() < 0.5);
        if (meFirst) { if (hit(best)) o -= roll(best); if (o > 0 && hit(threat)) a -= roll(threat); }
        else { if (hit(threat)) a -= roll(threat); if (a > 0 && hit(best)) o -= roll(best); }
      }
      if (o <= 0 && a > 0) { wins++; hpLeft += a / A.stats[0]; turnsSum += t; }
      else if (a > 0 && o > 0) draws++;
    }
    return { p: (wins + draws / 2) / N, hpLeft: wins ? hpLeft / wins * 100 : 0, turns: wins ? turnsSum / wins : 0 };
  }

  // duel A contre O, chacun avec sa meilleure attaque ; entryMid : attaque reçue en entrant (celle que l'adversaire
  // lançait sur le Pokémon qu'on retire)
  function duel(core, A, O, aMoves, oMoves, field, switchIn, entryMid) {
    const mine = rankMoves(core, A, O, aMoves, field);
    const theirs = rankMoves(core, O, A, oMoves, field);
    const best = mine.find((d) => !d.status && !d.unknown && d.max > 0) || null;
    const threat = theirs.find((d) => !d.status && !d.unknown && d.max > 0) || null;
    const sA = speed(A, field), sO = speed(O, field);
    const nA = best ? best.ko.n : Infinity;
    let nO = threat ? threat.ko.n : Infinity;
    let entry = null, entryHit = 0;
    if (switchIn) {
      entry = entryMid ? damage(core, O, A, entryMid, field) : threat;
      if (entry && (entry.status || entry.unknown)) entry = null;
      if (entry && threat) {
        const avg = threat.rolls.reduce((x, y) => x + y, 0) / threat.rolls.length;
        entryHit = Math.min(A.hpPct, entry.max / A.stats[0] * 100);
        const left = A.hpPct - entryHit;
        nO = left <= 0 ? 0 : Math.ceil((A.stats[0] * left / 100) / avg);
      }
    }
    const first = sA > sO ? 'me' : sA < sO ? 'them' : 'tie';
    const sim = A.hpPct <= 0 ? { p: 0, hpLeft: 0, turns: 0 } : simulate(A, O, best, threat, entry, sA, sO);
    const win = sim.p >= 0.6 ? true : sim.p > 0.4 ? null : false;
    return { A, O, mine, theirs, best, threat, entry, sA, sO, nA, nO, first, win, entryHit, switchIn: !!switchIn, winP: sim.p, hpLeft: sim.hpLeft, turns: sim.turns };
  }

  // conseil : classer tous les Pokémon de l'équipe par chances de gagner contre l'adversaire
  function advise(core, team, activeIdx, O, movesOf, oMoves, field) {
    const curB = team[activeIdx];
    const cur0 = curB ? duel(core, curB, O, movesOf(activeIdx), oMoves, field, false) : null;
    const entryMid = cur0 && cur0.threat ? cur0.threat.mid : null;
    const res = team.map((B, i) => (B ? Object.assign(i === activeIdx ? cur0 : duel(core, B, O, movesOf(i), oMoves, field, true, entryMid), { idx: i }) : null));
    const cur = res[activeIdx];
    if (!cur) return { res, ranking: [], verdict: null };
    // à chances presque égales, rester vaut mieux que changer (pas de tour perdu)
    const score = (r) => r.winP + (r.idx === activeIdx ? 0.0499 : 0) + r.hpLeft / 100000;
    const ranking = res.filter((r) => r && r.A.hpPct > 0).sort((a, b) => score(b) - score(a));
    const top = ranking[0];
    let verdict;
    // changer coûte un tour et un coup encaissé : déjà compté dans la simulation, on garde seulement une petite marge
    if (!top || top === cur || top.winP <= cur.winP + 0.05) verdict = { kind: cur.winP >= 0.6 ? 'attack' : cur.winP > 0.4 ? 'tie' : 'attack-risky', d: cur };
    else verdict = { kind: top.winP >= 0.6 ? 'switch' : 'switch-risky', d: cur, to: top };
    return { res, ranking, verdict };
  }

  window.Battle = { movesForGame, typesInGen, statsInGen, STAT_FR, STAT_SHORT, NATURES, ITEMS, TYPE_FR, natureMult, effectiveness, calcStat, statRange, build, speed, damage, hitsToKO, rankMoves, duel, advise };
})();
