// Onglets « Équipes » et « Combat » de l'onglet Outils : créer ses équipes (stats, IV, EV, nature, talent, objet,
// attaques), puis choisir un adversaire pour voir la meilleure attaque et s'il vaut mieux attaquer ou changer.
// Utilise le moteur de battle.js et les utilitaires de app.js (h, img, typeBadge, persist, S…).

// version-groupes pour lesquels on a les attaques apprises (data/moves/<n>.json)
const MVG_FILES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 23, 24, 25];
const WEATHER = [['', 'Aucune'], ['sun', 'Soleil'], ['rain', 'Pluie'], ['sand', 'Tempête de sable'], ['snow', 'Neige / grêle']];

function battleState() {
  const st = S.save.settings.battle || (S.save.settings.battle = {});
  if (!st.teams || !st.teams.length) st.teams = [{ id: 't' + Date.now(), name: 'Mon équipe', mvg: 25, mons: [null, null, null, null, null, null] }];
  if (!st.teams.some((t) => t.id === st.cur)) st.cur = st.teams[0].id;
  st.calc = Object.assign({ team: st.cur, active: 0, opp: null, field: { weather: '', crit: false } }, st.calc || {});
  if (!st.teams.some((t) => t.id === st.calc.team)) st.calc.team = st.cur;
  return st;
}
const curTeam = (st, id) => st.teams.find((t) => t.id === (id || st.cur)) || st.teams[0];

function mvgOptions() {
  const by = new Map();
  for (const g of Object.values(S.core.games)) {
    if (!MVG_FILES.includes(g.mvg) || g.extra) continue;
    if (!by.has(g.mvg)) by.set(g.mvg, []);
    if (!by.get(g.mvg).includes(g.name)) by.get(g.mvg).push(g.name);
  }
  return [...by.entries()].map(([mvg, names]) => [mvg, names.join(' / ')]);
}
// génération d'un groupe de versions, et valeurs des attaques à l'époque de ce jeu
function genOfMvg(mvg) { const g = Object.values(S.core.games).find((x) => x.mvg === mvg); return g ? g.gen : 9; }
async function useGame(mvg) {
  if (!S.movesChanges) S.movesChanges = (await readJSON('moves-changes.json')) || [];
  if (!S.core._stpast) S.core._stpast = (await readJSON('stats-past.json')) || {};
  if (S.core._movesVg !== mvg) { S.core._moves = Battle.movesForGame(S.moves.moves, S.movesChanges, mvg, S.core.vgOrder); S.core._movesVg = mvg; }
  return genOfMvg(mvg);
}
async function ensureMvg(mvg) {
  if (!S.movesVg[mvg]) S.movesVg[mvg] = (await readJSON(`moves/${mvg}.json`)) || { machines: {}, learn: {} };
  return S.movesVg[mvg];
}
// attaques que le Pokémon peut apprendre dans ce jeu (sinon : celles de sa forme de base, sinon dans Écarlate/Violet)
function learnable(pkId, mvg) {
  const pk = S.core.pokemon[pkId];
  if (!pk) return [];
  for (const g of [mvg, 25]) {
    const data = S.movesVg[g];
    if (!data) continue;
    const list = data.learn[pkId] || data.learn[S.defPk[pk.sp]];
    if (list && list.length) return [...new Set(list.map((x) => x[0]))].filter((m) => S.moves.moves[m]);
  }
  return [];
}
// attaques apprises par montée de niveau jusqu'au niveau donné (ce qu'un Pokémon sauvage ou de dresseur a le plus souvent)
function levelMoves(pkId, mvg, lvl) {
  const pk = S.core.pokemon[pkId];
  if (!pk) return [];
  for (const g of [mvg, 25]) {
    const data = S.movesVg[g];
    if (!data) continue;
    const list = data.learn[pkId] || data.learn[S.defPk[pk.sp]];
    if (list && list.length) return [...new Set(list.filter((x) => x[1] === 1 && x[2] <= lvl).map((x) => x[0]))].filter((m) => S.moves.moves[m]);
  }
  return [];
}
const damaging = (mids) => mids.filter((m) => { const mv = (S.core._moves || S.moves.moves)[m]; return mv && mv[2] !== 1; });

function newMon(sid) {
  const pkId = S.defPk[sid] || sid;
  const pk = S.core.pokemon[pkId];
  const ab = pk && pk.ab && pk.ab[0] ? pk.ab[0][0] : 0;
  return { sp: sid, pk: pkId, lvl: 50, nature: 'hardy', ab, item: '', tera: pk ? pk.types[0] : 0, teraOn: false, moves: [0, 0, 0, 0], iv: [31, 31, 31, 31, 31, 31], ev: [0, 0, 0, 0, 0, 0], hpPct: 100, burned: false, boosts: [0, 0, 0, 0, 0, 0] };
}
function speciesDatalist() {
  if ($('dl-species')) return;
  const dl = h('datalist', { id: 'dl-species' });
  for (const sp of Object.values(S.core.species)) dl.append(h('option', { value: sp.fr }));
  document.body.append(dl);
}
function findSpecies(txt) {
  const n = norm(txt).trim();
  if (!n) return null;
  const sp = Object.values(S.core.species).find((s) => norm(s.fr) === n || norm(s.en) === n || String(s.id) === n);
  return sp ? sp.id : null;
}
function monSprite(mon) {
  const pk = S.core.pokemon[mon.pk];
  const f = pk && pk.forms ? S.core.forms[pk.forms[0]] : S.defForm[mon.sp];
  return img((f && f.spr) || (S.defForm[mon.sp] || {}).spr, false, false, '');
}
function variantName(pkId) {
  const pk = S.core.pokemon[pkId];
  const sp = S.core.species[pk.sp];
  return pk.def ? sp.fr : ((S.core.forms[pk.forms[0]] || {}).name || pk.ident);
}
const moveLabel = (mid) => { const mv = (S.core._moves || S.moves.moves)[mid]; return mv ? `${mv[0]} — ${S.core.types[mv[1]] || '?'}, ${CLASS_FR[mv[2]] || ''}${mv[3] ? ', ' + mv[3] : ''}` : '—'; };
// arrondi vers le bas à une décimale, comme le calculateur de Showdown
const pctTxt = (p) => (Math.floor(p * 10 + 1e-9) / 10).toString().replace('.', ',') + ' %';

// ------------------------------------------------------------------ éléments de saisie
function sel(value, options, onchange, attrs) {
  const s = h('select', Object.assign({ onchange: (e) => onchange(e.target.value) }, attrs || {}));
  for (const [v, l] of options) s.append(h('option', { value: v, selected: String(v) === String(value) }, l));
  return s;
}
function num(value, min, max, onchange, attrs) {
  return h('input', Object.assign({ type: 'number', min, max, value, onchange: (e) => { let v = e.target.value === '' ? min : Math.round(+e.target.value); v = Math.max(min, Math.min(max, v)); onchange(v); } }, attrs || {}));
}
function field(label, el) { return h('label', { class: 'tm-field' }, h('span', null, label), el); }

// fiche d'un Pokémon : variante, niveau, nature, talent, objet, téra, attaques, IV/EV et stats calculées
function monEditor(mon, mvg, redraw, opts) {
  opts = opts || {};
  const pk = S.core.pokemon[mon.pk];
  const sp = S.core.species[mon.sp];
  const box = h('div', { class: 'tm-card' });
  const head = h('div', { class: 'tm-head' }, monSprite(mon), h('div', null, h('div', { class: 'tm-name' }, variantName(mon.pk)), h('div', null, ...pk.types.map(typeBadge))));
  if (opts.onRemove) head.append(h('button', { class: 'tm-x', title: 'Retirer', onclick: opts.onRemove }, '✕'));
  box.append(head);
  const g = h('div', { class: 'tm-grid' });
  if (sp.vars.length > 1) g.append(field('Forme', sel(mon.pk, sp.vars.map((p) => [p, variantName(p)]), (v) => { mon.pk = +v; const p2 = S.core.pokemon[mon.pk]; mon.ab = p2.ab[0] ? p2.ab[0][0] : 0; mon.moves = [0, 0, 0, 0]; redraw(); })));
  g.append(field('Niveau', num(mon.lvl, 1, 100, (v) => { mon.lvl = v; redraw(); })));
  g.append(field('Nature', sel(mon.nature, Object.entries(Battle.NATURES).sort((a, b) => a[1][0].localeCompare(b[1][0], 'fr')).map(([k, n]) => [k, n[0] + (n[1] !== n[2] ? ` (+${Battle.STAT_SHORT[n[1]]} −${Battle.STAT_SHORT[n[2]]})` : ' (neutre)')]), (v) => { mon.nature = v; redraw(); })));
  g.append(field('Talent', sel(mon.ab, pk.ab.map(([id, hidden]) => [id, ((S.core.abilities[id] || {}).fr || '?') + (hidden ? ' (caché)' : '')]), (v) => { mon.ab = +v; redraw(); })));
  g.append(field('Objet', sel(mon.item, Battle.ITEMS, (v) => { mon.item = v; mon.itemName = ''; redraw(); })));
  if (mvg >= 25) g.append(field('Téracristal', sel(mon.tera, Object.entries(Battle.TYPE_FR).map(([t, n]) => [t, n]), (v) => { mon.tera = +v; redraw(); })));
  box.append(g);
  if (mon.itemName && !mon.item) box.append(h('div', { class: 'muted', style: 'font-size:11px;margin:-4px 0 6px' }, 'Objet tenu : ' + mon.itemName + ' (sans effet sur les dégâts dans ce calcul)'));
  // attaques
  const pool = learnable(mon.pk, mvg).sort((a, b) => S.moves.moves[a][0].localeCompare(S.moves.moves[b][0], 'fr'));
  const mv = h('div', { class: 'tm-moves' });
  for (let i = 0; i < 4; i++) {
    const cur = mon.moves[i] || 0; // attaque venue d'une sauvegarde ou d'un lieu de combat : on la garde même si elle n'est pas dans la liste du jeu
    mv.append(sel(cur, [[0, '— attaque ' + (i + 1) + ' —'], ...(cur && !pool.includes(cur) && S.moves.moves[cur] ? [cur] : []).concat(pool).map((m) => [m, moveLabel(m)])], (v) => { mon.moves[i] = +v; redraw(); }));
  }
  if (!pool.length) mv.append(h('div', { class: 'muted' }, 'Pas de liste d\'attaques pour ce Pokémon dans ce jeu.'));
  box.append(mv);
  box.append(statTable(mon, redraw));
  return box;
}

function statTable(mon, redraw) {
  const pk = S.core.pokemon[mon.pk];
  const b = Battle.build(S.core, mon, genOfMvg(S.core._movesVg || 25));
  const nat = Battle.NATURES[mon.nature] || Battle.NATURES.hardy;
  const oldGen = genOfMvg(S.core._movesVg || 25) <= 2; // Gen 1-2 : pas de limite de 510 (Stat Exp), 255 par stat
  const t = h('table', { class: 't tm-stats' }, h('tr', null, h('th', null, ''), h('th', null, 'Base'), h('th', null, 'IV'), h('th', null, 'EV'), h('th', null, 'Stat')));
  for (let i = 0; i < 6; i++) {
    const cls = nat[1] !== nat[2] && i === nat[1] ? 'up' : nat[1] !== nat[2] && i === nat[2] ? 'down' : '';
    t.append(h('tr', null, h('td', { class: cls }, Battle.STAT_SHORT[i] + (cls === 'up' ? ' +' : cls === 'down' ? ' −' : '')), h('td', null, b.base[i]),
      h('td', null, num(mon.iv[i], 0, 31, (v) => { mon.iv[i] = v; redraw(); })),
      h('td', null, num(mon.ev[i], 0, oldGen ? 255 : 252, (v) => { mon.ev[i] = v; redraw(); }, oldGen ? {} : { step: 4 })),
      h('td', { class: 'tm-final ' + cls }, b.stats[i])));
  }
  const total = mon.ev.reduce((a, x) => a + (+x || 0), 0);
  const fixedNote = (mon.fixed || []).length === 6 ? h('div', { class: 'muted', style: 'font-size:11px' }, (mon.lvl === 50 ? 'Stats données par Bulbapedia (niveau 50) : IV et EV ne changent rien.' : 'Stats de Bulbapedia valables au niveau 50 seulement : ici, calcul avec les IV et EV saisis.')) : '';
  const foot = oldGen ? h('div', { class: 'tm-evtotal' }, 'EV = racine carrée de la Stat Exp (255 au maximum par stat)') : h('div', { class: 'tm-evtotal' + (total > 510 ? ' over' : '') }, `EV : ${total} / 510` + (total > 510 ? ' — trop d\'EV, le jeu en autorise 510 au total' : ''));
  const quick = h('div', { class: 'tm-quick' },
    h('button', { onclick: () => { mon.iv = [31, 31, 31, 31, 31, 31]; redraw(); } }, 'IV 31 partout'),
    h('button', { onclick: () => { mon.ev = [0, 0, 0, 0, 0, 0]; redraw(); } }, 'EV à 0'));
  return h('div', null, t, fixedNote, foot, quick);
}

// ------------------------------------------------------------------ onglet Équipes
async function renderTeams(content) {
  const st = battleState();
  const team = curTeam(st);
  await ensureMvg(team.mvg);
  const gen = await useGame(team.mvg);
  speciesDatalist();
  const redraw = () => { persist(); renderTools(); };
  const bar = h('div', { class: 'tool-ctrl' });
  bar.append(field('Équipe', sel(team.id, st.teams.map((t) => [t.id, t.name]), (v) => { st.cur = v; redraw(); })));
  bar.append(h('button', { class: 'tm-btn', onclick: () => { const t = { id: 't' + Date.now(), name: 'Équipe ' + (st.teams.length + 1), mvg: team.mvg, mons: [null, null, null, null, null, null] }; st.teams.push(t); st.cur = t.id; redraw(); } }, '+ Nouvelle équipe'));
  const nameIn = h('input', { value: team.name, onchange: (e) => { team.name = e.target.value.trim() || team.name; redraw(); } });
  bar.append(field('Nom', nameIn));
  if (st.teams.length > 1) bar.append(h('button', { class: 'tm-btn danger', onclick: () => { if (!confirm('Supprimer l\'équipe « ' + team.name + ' » ?')) return; st.teams = st.teams.filter((t) => t !== team); st.cur = st.teams[0].id; redraw(); } }, 'Supprimer'));
  bar.append(field('Jeu', sel(team.mvg, mvgOptions(), async (v) => { team.mvg = +v; await ensureMvg(team.mvg); redraw(); })));
  content.append(bar);
  content.append(h('div', { class: 'muted', style: 'font-size:12px;margin-bottom:10px' }, 'Le jeu choisi sert pour la liste des attaques et leur puissance, précision et type à l\'époque de ce jeu.' + (gen <= 2 ? ' En 1re et 2e génération, les stats utilisent les DV (0 à 15) et la « Stat Exp » : saisis IV = 2 × DV et EV = racine carrée de la Stat Exp (fait automatiquement pour un Pokémon pris dans une sauvegarde). En 1re génération, la stat Spécial unique n\'est pas reproduite.' : '')));
  const grid = h('div', { class: 'tm-team' });
  team.mons.forEach((mon, i) => {
    if (!mon) {
      const inp = h('input', { list: 'dl-species', placeholder: 'Nom du Pokémon…' });
      const add = () => { const sid = findSpecies(inp.value); if (!sid) { toast('Pokémon introuvable : ' + inp.value); return; } team.mons[i] = newMon(sid); redraw(); };
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });
      inp.addEventListener('change', () => { if (findSpecies(inp.value)) add(); });
      grid.append(h('div', { class: 'tm-card tm-empty' }, h('div', { class: 'muted' }, 'Emplacement ' + (i + 1)), inp, h('button', { class: 'tm-btn', onclick: add }, 'Ajouter')));
    } else grid.append(monEditor(mon, team.mvg, redraw, { onRemove: () => { team.mons[i] = null; redraw(); } }));
  });
  content.append(grid);
  content.append(boxPanel(st, team, redraw));
}

// ------------------------------------------------------------------ Pokémon des boîtes d'une sauvegarde (onglet Équipes)
const NATURE_KEYS = ['hardy', 'lonely', 'brave', 'adamant', 'naughty', 'bold', 'docile', 'relaxed', 'impish', 'lax', 'timid', 'hasty', 'serious', 'jolly',
  'naive', 'modest', 'mild', 'quiet', 'bashful', 'rash', 'calm', 'gentle', 'sassy', 'careful', 'quirky'];
// objets qui changent les dégâts (Battle.ITEMS) ; objets de type et Plaques -> type
const ITEM_BATTLE = new Set(['choice-band', 'choice-specs', 'choice-scarf', 'life-orb', 'expert-belt', 'muscle-band', 'wise-glasses', 'assault-vest', 'eviolite']);
const ITEM_TYPE = { 'silk-scarf': 1, 'black-belt': 2, 'sharp-beak': 3, 'poison-barb': 4, 'soft-sand': 5, 'hard-stone': 6, 'silver-powder': 7, 'spell-tag': 8, 'metal-coat': 9,
  charcoal: 10, 'mystic-water': 11, 'miracle-seed': 12, magnet: 13, 'twisted-spoon': 14, 'never-melt-ice': 15, 'dragon-fang': 16, 'black-glasses': 17, 'fairy-feather': 18,
  'fist-plate': 2, 'sky-plate': 3, 'toxic-plate': 4, 'earth-plate': 5, 'stone-plate': 6, 'insect-plate': 7, 'spooky-plate': 8, 'iron-plate': 9, 'flame-plate': 10,
  'splash-plate': 11, 'meadow-plate': 12, 'zap-plate': 13, 'mind-plate': 14, 'icicle-plate': 15, 'draco-plate': 16, 'dread-plate': 17, 'pixie-plate': 18 };
function levelFromExp(sid, exp) {
  const sv = S.saveMaps, tbl = sv && sv.exp && sv.exp[sv.growth[sid]];
  if (!tbl || exp == null) return 50;
  let l = 1;
  while (l < 100 && tbl[l] <= exp) l++;
  return l;
}
// Pokémon lu dans la sauvegarde -> fiche d'équipe
function monFromSave(m, gen) {
  const mon = newMon(m.sid);
  const d = m.d;
  if (!d) return mon;
  const pk = S.core.pokemon[mon.pk];
  mon.lvl = d.lvl || levelFromExp(m.sid, d.exp);
  mon.nature = NATURE_KEYS[d.nature] || 'hardy';
  if (pk && pk.ab) {
    if (d.ab && pk.ab.some((a) => a[0] === d.ab)) mon.ab = d.ab;
    else if (d.abSlot != null) { const a = pk.ab.filter((x) => !x[1])[d.abSlot] || pk.ab[0]; if (a) mon.ab = a[0]; }
  }
  const iid = d.item && S.saveMaps.items[gen] ? S.saveMaps.items[gen][d.item] : 0;
  const info = iid ? S.saveMaps.itemInfo[iid] : null;
  if (info) { mon.item = ITEM_BATTLE.has(info[0]) ? info[0] : ITEM_TYPE[info[0]] ? 'type-' + ITEM_TYPE[info[0]] : ''; mon.itemName = info[1]; }
  mon.moves = d.moves.map((x) => (S.moves.moves[x] ? x : 0));
  mon.iv = d.iv.slice();
  mon.ev = d.ev.slice();
  mon.shiny = !!m.shiny;
  return mon;
}
async function loadBox(st, team) {
  const f = await window.api.openGameSave();
  if (!f) return false;
  if (f.tooBig) { toast('Fichier trop gros : c\'est sûrement la ROM, choisis le fichier de sauvegarde.'); return false; }
  S.saveMaps = S.saveMaps && S.saveMaps.exp ? S.saveMaps : await readJSON('save-species.json');
  const r = window.SaveReader.readSave(new Uint8Array(f.data), S.saveMaps);
  if (!r) { toast('Sauvegarde non reconnue (mêmes jeux que l\'import du Pokédex).'); return false; }
  const g = S.core.games[r.guess];
  st.box = { label: r.label, file: f.name, mvg: g ? g.mvg : null, mons: r.mons.filter((m) => S.core.species[m.sid]).map((m) => ({ where: m.where, mon: monFromSave(m, r.gen) })) };
  if (g && MVG_FILES.includes(g.mvg) && !team.mons.some(Boolean)) team.mvg = g.mvg; // équipe vide : on passe sur le jeu de la sauvegarde
  return true;
}
function boxPanel(st, team, redraw) {
  const box = h('div', { class: 'box tm-box' });
  const head = h('h4', null, 'Mes boîtes (sauvegarde)');
  const load = h('button', { class: 'tm-btn', onclick: async () => { if (await loadBox(st, team)) redraw(); } }, st.box ? 'Charger une autre sauvegarde…' : 'Charger une sauvegarde…');
  box.append(head, h('div', { class: 'tool-ctrl' }, load, st.box ? h('button', { class: 'tm-btn', onclick: () => { st.box = null; redraw(); } }, 'Oublier') : ''));
  if (!st.box) { box.append(h('div', { class: 'muted', style: 'font-size:12px' }, 'Charge ta sauvegarde (mêmes fichiers que l\'import du Pokédex) puis clique sur un Pokémon de l\'équipe ou des boîtes pour l\'ajouter, avec son niveau, sa nature, son talent, son objet, ses attaques, ses IV et ses EV.')); return box; }
  const free = team.mons.indexOf(null);
  const q = h('input', { placeholder: 'Filtrer (nom)…', value: S.boxFilter || '', oninput: (e) => { S.boxFilter = e.target.value; draw(); } });
  box.append(h('div', { class: 'muted', style: 'font-size:12px;margin-bottom:6px' }, `${st.box.label} — ${st.box.file} · ${st.box.mons.length} Pokémon` + (free < 0 ? ' · équipe pleine : retire un Pokémon pour en ajouter un.' : '')), q);
  const list = h('div', { class: 'tm-boxlist' });
  box.append(list);
  const draw = () => {
    list.innerHTML = '';
    const n = norm(S.boxFilter || '').trim();
    let where = null, row = null;
    for (const x of st.box.mons) {
      const sp = S.core.species[x.mon.sp];
      if (n && !norm(sp.fr).includes(n) && !norm(sp.en).includes(n)) continue;
      if (x.where !== where) { where = x.where; list.append(h('div', { class: 'tm-boxwhere' }, where)); row = h('div', { class: 'tm-boxrow' }); list.append(row); }
      const m = x.mon;
      row.append(h('button', { class: 'tm-boxmon', disabled: free < 0, title: [moveNames(m), m.itemName ? '@ ' + m.itemName : ''].filter(Boolean).join(' · '),
        onclick: () => { const i = team.mons.indexOf(null); if (i < 0) return; team.mons[i] = JSON.parse(JSON.stringify(m)); toast(sp.fr + ' ajouté à ' + team.name); redraw(); } },
        img((S.defForm[m.sp] || {}).spr, !!m.shiny, false, ''), h('span', null, sp.fr), h('small', null, 'niv. ' + m.lvl)));
    }
    if (!list.children.length) list.append(h('div', { class: 'muted' }, 'Aucun Pokémon.'));
  };
  draw();
  return box;
}
const moveNames = (m) => m.moves.filter(Boolean).map((x) => (S.moves.moves[x] || ['?'])[0]).join(', ');

// ------------------------------------------------------------------ lieux de combat (Tour de Combat, Zone, Métro, Château, Arbre…)
// data/facilities.json (tools/import_facilities.py, d'après Bulbapedia)
async function facData() {
  if (!S.facilities) S.facilities = (await readJSON('facilities.json')) || { facilities: [] };
  return S.facilities.facilities;
}
// Arbre de Combat : certaines fiches n'existent que dans Soleil/Lune ou que dans Ultra-Soleil/Ultra-Lune
const setInGame = (s, mvg) => !s.only || (mvg !== 17 && mvg !== 18) || (s.only === 'sm' ? mvg === 17 : mvg === 18);
function facSetTrainers(f) {
  if (f._byset) return f._byset;
  f._byset = {};
  for (const t of f.trainers) for (const i of t.pool) (f._byset[i] = f._byset[i] || []).push(t);
  return f._byset;
}
function monFromSet(f, i, lvl, iv) {
  const s = f.sets[i];
  const m = newMon(s.sp);
  Object.assign(m, { lvl, nature: s.nature, ev: s.ev.slice(), iv: Array(6).fill(iv == null ? 31 : iv), moves: s.moves.slice(), item: s.item, itemName: s.itemName, src: { fac: f.id, set: i } });
  if (s.ab) m.ab = s.ab;
  if (s.stats) m.fixed = s.stats.slice();
  return m;
}
const trainerLabel = (t) => `${t.n != null ? '#' + t.n + ' ' : ''}${t.cls} ${t.name}${t.team ? ' — ' + t.team : ''}${t.lvl !== 50 ? ' (niv. ' + t.lvl + ')' : ''}${t.iv != null ? ' · IV ' + t.iv : ''}`;
// une fiche : sprite, objet, attaques, nature, EV (ou stats), dresseurs qui l'utilisent
function setRow(f, i, mvg, onPick, showUsers) {
  const s = f.sets[i];
  const sp = S.core.species[s.sp];
  const mvs = s.moves.filter(Boolean).map((m) => ((S.core._moves || S.moves.moves)[m] || ['?'])[0]).join(', ');
  const nat = Battle.NATURES[s.nature] ? Battle.NATURES[s.nature][0] : s.nature;
  const evTxt = s.stats ? 'stats : ' + s.stats.join(' / ') : 'EV : ' + s.ev.map((v, k) => (v ? v + ' ' + Battle.STAT_SHORT[k] : '')).filter(Boolean).join(', ');
  const users = showUsers ? (facSetTrainers(f)[i] || []) : [];
  const nums = users.map((t) => t.n).filter((n) => n != null);
  const ivs = [...new Set(users.map((t) => t.iv).filter((v) => v != null))].sort((a, b) => a - b);
  const who = users.length ? `${users.length} dresseur${users.length > 1 ? 's' : ''}` + (nums.length ? ` (n° ${Math.min(...nums)} à ${Math.max(...nums)})` : '') + (ivs.length ? ` · IV ${ivs.join(', ')}` : '') : '';
  return h('button', { class: 'fac-set', onclick: onPick },
    img((S.defForm[s.sp] || {}).spr, false, false, ''),
    h('div', null, h('b', null, sp ? sp.fr : '?'), s.itemName ? h('span', { class: 'muted' }, ' @ ' + s.itemName) : '',
      h('div', null, mvs || '—'), h('div', { class: 'muted' }, (s.stats ? (s.ab && S.core.abilities[s.ab] ? 'Talent ' + S.core.abilities[s.ab].fr + ' · ' : '') : nat + ' · ') + evTxt),
      who ? h('div', { class: 'muted' }, who) : ''));
}
async function facilityPicker(C, mvg, redraw, team) {
  const all = await facData();
  // tous les lieux, ceux du jeu de l'équipe en premier
  const list = all.filter((f) => f.mvg.includes(mvg)).concat(all.filter((f) => !f.mvg.includes(mvg)));
  if (!list.length) return null;
  const box = h('div', { class: 'fac-box' });
  if (!list.some((f) => f.id === C.fac)) C.fac = '';
  const bar = h('div', { class: 'tm-grid' });
  const lieu = h('select', { onchange: (e) => { C.fac = e.target.value; C.facTrainer = null; C.facQuery = ''; redraw(); } }, h('option', { value: '', selected: !C.fac }, '— aucun (Pokémon au choix) —'));
  const grp = (label, fs) => { if (fs.length) lieu.append(h('optgroup', { label }, ...fs.map((f) => h('option', { value: f.id, selected: f.id === C.fac }, f.name)))); };
  grp('Jeu de l\'équipe', list.filter((f) => f.mvg.includes(mvg)));
  grp('Autres jeux', list.filter((f) => !f.mvg.includes(mvg)));
  bar.append(field('Lieu de combat', lieu));
  box.append(bar);
  const f = list.find((x) => x.id === C.fac);
  if (!f) return box;
  if (!f.mvg.includes(mvg) && team) {
    // lieu d'un autre jeu : les calculs suivent le jeu de l'équipe -> on propose de basculer
    const names = mvgOptions().filter(([v]) => f.mvg.includes(v));
    box.append(h('div', { class: 'tm-verdict warn', style: 'margin:6px 0;padding:8px' },
      `Ton équipe « ${team.name} » est réglée sur un autre jeu : les dégâts sont calculés avec les règles de ce jeu-là. `,
      ...names.map(([v, n]) => h('button', { class: 'tm-btn', style: 'margin-left:6px', onclick: async () => { team.mvg = v; await ensureMvg(v); redraw(); } }, 'Passer l\'équipe sur ' + n))));
  }
  C.facMode = C.facMode || 'pk';
  bar.append(field('Chercher par', sel(C.facMode, [['pk', 'Pokémon'], ['trainer', 'dresseur (nom anglais)']], (v) => { C.facMode = v; redraw(); })));
  const hasLvlModes = f.trainers.some((t) => t.lvl !== 50);
  if (!hasLvlModes && !f.sets.some((s) => s.stats)) bar.append(field('Niveau', sel(C.facLvl || 50, [[50, '50'], [100, '100 (Ouvert)']], (v) => { C.facLvl = +v; redraw(); })));
  const lvl = hasLvlModes || f.sets.some((s) => s.stats) ? 50 : (C.facLvl || 50);
  const pick = (i, t) => {
    const users = facSetTrainers(f)[i] || [];
    const l = t ? t.lvl : hasLvlModes && users.length ? users[0].lvl : lvl; // Rubis / Saphir : fiches du mode niveau 50 ou 100
    C.opp = monFromSet(f, i, l, t && t.iv != null ? t.iv : C.facIv);
    if (t) C.opp.src.trainer = trainerLabel(t);
    redraw();
  };
  const results = h('div', { class: 'fac-list' });
  if (C.facMode === 'trainer') {
    const tl = f.trainers.filter((t) => t.pool.some((i) => setInGame(f.sets[i], mvg)));
    const idx = C.facTrainer != null && tl[C.facTrainer] ? C.facTrainer : null;
    bar.append(field('Dresseur', sel(idx == null ? '' : idx, [['', '— choisir —'], ...tl.map((t, k) => [k, trainerLabel(t)])], (v) => { C.facTrainer = v === '' ? null : +v; redraw(); })));
    if (idx != null) for (const i of tl[idx].pool) if (setInGame(f.sets[i], mvg)) results.append(setRow(f, i, mvg, () => pick(i, tl[idx]), false));
  } else {
    const present = [...new Set(f.sets.filter((s) => setInGame(s, mvg)).map((s) => s.sp))].sort((a, b) => S.core.species[a].fr.localeCompare(S.core.species[b].fr, 'fr'));
    // liste déroulante classique (la liste de suggestions d'un champ texte ne défile pas dans Electron)
    const curSid = findSpecies(C.facQuery || '');
    bar.append(field('Pokémon', sel(present.includes(curSid) ? curSid : '', [['', `— choisir (${present.length} Pokémon) —`], ...present.map((sid) => [sid, S.core.species[sid].fr])],
      (v) => { C.facQuery = v ? S.core.species[v].fr : ''; redraw(); })));
    const ivs = [...new Set(f.trainers.map((t) => t.iv).filter((v) => v != null))].sort((a, b) => a - b);
    bar.append(field('IV des Pokémon', sel(C.facIv ?? 31, [[31, '31'], ...ivs.filter((v) => v !== 31).map((v) => [v, String(v)])], (v) => { C.facIv = +v; redraw(); })));
    const sid = findSpecies(C.facQuery || '');
    if (sid) {
      const idxs = f.sets.map((s, i) => i).filter((i) => f.sets[i].sp === sid && setInGame(f.sets[i], mvg));
      if (!idxs.length) results.append(h('div', { class: 'muted' }, 'Ce Pokémon n\'apparaît pas dans ce lieu.'));
      idxs.forEach((i) => results.append(setRow(f, i, mvg, () => pick(i, null), true)));
    }
  }
  box.append(results);
  box.append(h('div', { class: 'muted', style: 'font-size:11px' }, 'Source : listes des dresseurs de Bulbapedia (noms des dresseurs en anglais). Clique sur une fiche pour la prendre comme adversaire. Les IV dépendent du n° du dresseur' + (f.trainers.some((t) => t.iv != null) ? ' (indiqués pour chaque dresseur)' : ' ; Bulbapedia ne les donne pas pour ce lieu : 31 par défaut') + '. ' + (f.sets.some((s) => s.stats) ? 'Ici, Bulbapedia donne le talent et les stats au niveau 50 (pas la nature ni les EV).' : 'Le talent est tiré au hasard parmi ceux du Pokémon.')));
  return box;
}

// ------------------------------------------------------------------ onglet Combat
function boostRow(mon, redraw) {
  const r = h('div', { class: 'tm-boosts' });
  mon.boosts = mon.boosts || [0, 0, 0, 0, 0, 0];
  for (let i = 1; i < 6; i++) {
    r.append(field(Battle.STAT_SHORT[i], sel(mon.boosts[i], [...Array(13).keys()].map((k) => [k - 6, (k - 6 > 0 ? '+' : '') + (k - 6)]), (v) => { mon.boosts[i] = +v; redraw(); })));
  }
  return r;
}
function stateRow(mon, mvg, redraw) {
  const r = h('div', { class: 'tm-grid' });
  r.append(field('PV restants (%)', num(mon.hpPct ?? 100, 0, 100, (v) => { mon.hpPct = v; redraw(); })));
  r.append(field('Brûlé', h('input', { type: 'checkbox', checked: !!mon.burned, onchange: (e) => { mon.burned = e.target.checked; redraw(); } })));
  if (mvg >= 25) r.append(field('Téracristal activé', h('input', { type: 'checkbox', checked: !!mon.teraOn, onchange: (e) => { mon.teraOn = e.target.checked; redraw(); } })));
  return h('div', null, r, boostRow(mon, redraw));
}

function dmgTable(rows, D, title, limit) {
  const t = h('table', { class: 't tm-dmg' }, h('tr', null, h('th', null, 'Attaque'), h('th', null, 'Type'), h('th', null, 'Dégâts'), h('th', null, 'Résultat'), h('th', null, 'Préc.'), h('th', null, 'Pourquoi')));
  let shown = 0;
  rows.forEach((d, i) => {
    if (limit && shown >= limit) return;
    if (d.status) { if (!limit) t.append(h('tr', { class: 'muted' }, h('td', null, d.name), h('td', null, typeBadge(d.type)), h('td', { colspan: 4 }, 'attaque de statut (pas de dégâts)'))); return; }
    shown++;
    const best = i === 0 && !d.unknown && d.max > 0;
    t.append(h('tr', { class: best ? 'tm-best' : '' },
      h('td', null, (best ? '★ ' : '') + d.name),
      h('td', null, typeBadge(d.type), ' ', h('span', { class: 'muted' }, CLASS_FR[d.cat] || '')),
      h('td', null, d.unknown || d.eff === 0 ? '—' : `${pctTxt(d.pct[0])} – ${pctTxt(d.pct[1])}`, h('div', { class: 'muted' }, d.unknown || d.eff === 0 ? '' : `${d.min} – ${d.max} PV`)),
      h('td', null, d.ko.txt),
      h('td', null, d.acc ? d.acc + ' %' : '—'),
      h('td', { class: 'tm-why' }, d.reasons.join(' · ') || 'dégâts normaux')));
  });
  return h('div', { class: 'box' }, h('h4', null, title), t);
}

const pctInt = (p) => Math.round(p * 100) + ' %';
function verdictBox(adv, O, mvg) {
  const v = adv.verdict;
  if (!v) return null;
  const d = v.d;
  const speedTxt = (x) => `${x.A.name} : ${x.sA} de Vitesse contre ${x.sO} → ` + (x.first === 'me' ? x.A.name + ' attaque en premier' : x.first === 'them' ? x.O.name + ' attaque en premier' : 'égalité de Vitesse (au hasard)');
  const koLine = (x) => (x.best ? `${x.A.name} met ${x.O.name} K.O. en ${x.nA === Infinity ? '?' : x.nA} coup${x.nA > 1 ? 's' : ''} avec ${x.best.name}` : `${x.A.name} n'a pas d'attaque qui fait des dégâts`) + ' ; ' +
    (x.threat ? `${x.O.name} le met K.O. en ${x.nO === Infinity ? '?' : x.nO === 0 ? '0' : x.nO} coup${x.nO > 1 ? 's' : ''} avec ${x.threat.name}` : `${x.O.name} ne peut pas lui faire de dégâts`) +
    (x.switchIn && x.entry ? ` (en entrant, il encaisse ${x.entry.name} : jusqu'à ${pctTxt(x.entryHit)})` : '') + '.';
  const chance = (x) => `Chances de gagner : ${pctInt(x.winP)}` + (x.winP > 0 ? `, il finit en moyenne avec ${Math.round(x.hpLeft)} % de PV` : '') + '.';
  let title, cls, lines;
  if (v.kind === 'attack') { title = `Reste et attaque avec ${d.best.name}`; cls = 'ok'; lines = [koLine(d), speedTxt(d), chance(d)]; }
  else if (v.kind === 'tie') { title = `Reste et attaque avec ${d.best.name} (duel serré)`; cls = 'warn'; lines = [koLine(d), speedTxt(d), chance(d), 'Aucun autre Pokémon ne fait nettement mieux.']; }
  else if (v.kind === 'switch' || v.kind === 'switch-risky') {
    title = `Change pour ${v.to.A.name}`; cls = v.kind === 'switch' ? 'info' : 'warn';
    lines = [`Si ${d.A.name} reste : ${pctInt(d.winP)} de chances de gagner.`, `${v.to.A.name} : ${koLine(v.to)}`, speedTxt(v.to), chance(v.to)];
    if (v.kind === 'switch-risky') lines.push('Aucun Pokémon ne gagne à coup sûr, mais c\'est le meilleur choix.');
  } else { title = d.best ? `Reste et attaque avec ${d.best.name} (duel difficile)` : 'Aucune bonne option'; cls = 'bad'; lines = [koLine(d), speedTxt(d), chance(d), 'Aucun autre Pokémon de l\'équipe ne fait mieux : inflige le plus de dégâts possible.']; }
  const order = h('div', { class: 'tm-order' }, h('b', null, 'Ordre conseillé contre ' + O.name + ' : '),
    ...adv.ranking.map((r, i) => h('span', { class: 'tm-rank' + (i === 0 ? ' first' : '') }, `${i + 1}. ${r.A.name}${r.idx === d.idx ? ' (au combat)' : ''} — ${pctInt(r.winP)}`)));
  return h('div', { class: 'tm-verdict ' + cls }, h('div', { class: 'tm-vtitle' }, title), ...lines.map((l) => h('div', null, l)), order,
    h('div', { class: 'muted', style: 'margin-top:6px;font-size:11px' }, 'Chances calculées en simulant 4 000 fois le duel (jets de dégâts, précision, égalité de Vitesse) : chacun utilise sa meilleure attaque, sans soin, baie ni statut. Un Pokémon qui entre encaisse d\'abord l\'attaque que l\'adversaire lançait sur celui qui sort. Puissance, précision et type des attaques, types des Pokémon, table des types, coup critique et catégorie physique/spéciale suivent la génération du jeu choisi.' + (genOfMvg(mvg) <= 2 ? ' En 1re et 2e génération, les stats et la formule de dégâts diffèrent un peu : résultat approximatif.' : '')));
}

async function renderCalc(content) {
  const st = battleState();
  const C = st.calc;
  const team = curTeam(st, C.team);
  const mvg = team.mvg;
  await ensureMvg(mvg);
  await ensureMvg(25);
  speciesDatalist();
  const gen = await useGame(mvg);
  const fieldG = Object.assign({}, C.field, { gen });
  const redraw = () => { persist(); renderTools(); };
  const bar = h('div', { class: 'tool-ctrl' });
  bar.append(field('Mon équipe', sel(team.id, st.teams.map((t) => [t.id, t.name]), (v) => { C.team = v; C.active = 0; redraw(); })));
  bar.append(field('Météo', sel(C.field.weather, WEATHER, (v) => { C.field.weather = v; redraw(); })));
  bar.append(field('Coup critique', h('input', { type: 'checkbox', checked: !!C.field.crit, onchange: (e) => { C.field.crit = e.target.checked; redraw(); } })));
  content.append(bar);
  const mons = team.mons;
  if (!mons.some(Boolean)) { content.append(h('div', { class: 'box' }, 'Cette équipe est vide : ajoute des Pokémon dans l\'onglet « Équipes ».')); return; }
  if (!mons[C.active]) C.active = mons.findIndex(Boolean);

  const cols = h('div', { class: 'tm-cols' });
  // côté joueur
  const left = h('div', { class: 'box' }, h('h4', null, 'Mon Pokémon au combat'));
  const pick = h('div', { class: 'tm-pick' });
  mons.forEach((m, i) => { if (m) pick.append(h('button', { class: 'tm-pickbtn' + (i === C.active ? ' active' : '') + ((m.hpPct ?? 100) <= 0 ? ' ko' : ''), onclick: () => { C.active = i; redraw(); } }, monSprite(m), h('span', null, variantName(m.pk)), h('small', null, (m.hpPct ?? 100) + ' %'))); });
  left.append(pick);
  const A0 = mons[C.active];
  left.append(stateRow(A0, mvg, redraw));
  if (!A0.moves.some(Boolean)) left.append(h('div', { class: 'muted', style: 'font-size:12px' }, 'Aucune attaque choisie pour ce Pokémon : le calcul prend toutes celles qu\'il peut apprendre.'));
  // côté adversaire
  const right = h('div', { class: 'box' }, h('h4', null, 'Pokémon adverse'));
  const inp = h('input', { list: 'dl-species', placeholder: 'Nom du Pokémon adverse…', value: C.opp ? S.core.species[C.opp.sp].fr : '' });
  const setOpp = () => { const sid = findSpecies(inp.value); if (!sid) { toast('Pokémon introuvable : ' + inp.value); return; } C.opp = newMon(sid); C.opp.lvl = A0.lvl; redraw(); };
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') setOpp(); });
  inp.addEventListener('change', () => { if (findSpecies(inp.value) && (!C.opp || findSpecies(inp.value) !== C.opp.sp)) setOpp(); });
  const fac = await facilityPicker(C, mvg, redraw, team);
  if (fac) right.append(fac);
  right.append(h('div', { class: 'tm-oppsearch' }, inp, h('button', { class: 'tm-btn', onclick: setOpp }, 'Choisir')));
  if (C.opp) {
    if (C.opp.src || C.opp.itemName) right.append(h('div', { class: 'muted', style: 'font-size:12px;margin-bottom:6px' },
      [C.opp.src && C.opp.src.trainer ? 'Dresseur : ' + C.opp.src.trainer : C.opp.src ? 'Fiche du lieu de combat' : '', C.opp.itemName && C.opp.item ? 'Objet tenu : ' + C.opp.itemName : ''].filter(Boolean).join(' · ')));
    right.append(monEditor(C.opp, mvg, redraw));
    right.append(stateRow(C.opp, mvg, redraw));
    if (!C.opp.moves.some(Boolean)) right.append(field('Attaques adverses inconnues : le calcul prend', sel(C.oppPool || 'level', [['level', 'celles qu\'il apprend par niveau, jusqu\'à son niveau'], ['all', 'le pire cas : toutes celles qu\'il peut apprendre (CT, œufs…)']], (v) => { C.oppPool = v; redraw(); })));
  }
  cols.append(left, right);
  content.append(cols);
  if (!C.opp) { content.append(h('div', { class: 'box' }, 'Choisis un Pokémon adverse pour voir les dégâts et le conseil.')); return; }

  // calculs
  const built = mons.map((m) => (m ? Battle.build(S.core, m, gen) : null));
  const O = Battle.build(S.core, C.opp, gen);
  const movesOf = (i) => { const m = mons[i]; const chosen = m.moves.filter(Boolean); return chosen.length ? chosen : damaging(learnable(m.pk, mvg)); };
  const oChosen = C.opp.moves.filter(Boolean);
  let oMoves = oChosen;
  if (!oMoves.length) {
    if ((C.oppPool || 'level') === 'level') oMoves = damaging(levelMoves(C.opp.pk, mvg, C.opp.lvl));
    if (!oMoves.length) oMoves = damaging(learnable(C.opp.pk, mvg));
  }
  const adv = Battle.advise(S.core, built, C.active, O, movesOf, oMoves, fieldG);
  const cur = adv.res[C.active];
  content.append(verdictBox(adv, O, mvg));
  const A = built[C.active];
  content.append(h('div', { class: 'muted', style: 'margin:4px 0 8px;font-size:12px' }, `Stats : ${A.name} ${A.stats.join(' / ')} — ${O.name} ${O.stats.join(' / ')} (PV / Atq / Déf / ASp / DSp / Vit)`));
  content.append(dmgTable(cur.mine, O, `Attaques de ${A.name} sur ${O.name}`));
  content.append(dmgTable(cur.theirs, A, `Attaques de ${O.name} sur ${A.name}` + (oChosen.length ? '' : ' (les plus dangereuses parmi celles retenues)'), oChosen.length ? 0 : 6));
  // toute l'équipe
  const t = h('table', { class: 't tm-team-table' }, h('tr', null, h('th', null, 'Pokémon'), h('th', null, 'Sa meilleure attaque'), h('th', null, 'Pire attaque reçue'), h('th', null, 'Vitesse'), h('th', null, 'Chances de gagner')));
  for (const r of adv.ranking.concat(adv.res.filter((x) => x && x.A.hpPct <= 0))) {
    const verdict = r.A.hpPct <= 0 ? 'K.O.' : pctInt(r.winP) + (r.winP > 0 ? ` (finit à ~${Math.round(r.hpLeft)} % PV)` : '');
    t.append(h('tr', { class: r.idx === C.active ? 'tm-best' : '' },
      h('td', null, r.A.name + (r.idx === C.active ? ' (au combat)' : '')),
      h('td', null, r.best ? `${r.best.name} : ${pctTxt(r.best.pct[0])} – ${pctTxt(r.best.pct[1])}, ${r.best.ko.txt}` : 'aucune'),
      h('td', null, r.threat ? `${r.threat.name} : ${pctTxt(r.threat.pct[0])} – ${pctTxt(r.threat.pct[1])}` + (r.switchIn && r.entry ? ` (en entrant : ${r.entry.name}, jusqu'à −${pctTxt(r.entryHit)})` : '') : 'aucune'),
      h('td', null, `${r.sA} contre ${r.sO}`),
      h('td', { class: 'tm-duel ' + (r.A.hpPct <= 0 || r.winP <= 0.4 ? 'bad' : r.winP >= 0.6 ? 'ok' : 'warn') }, verdict)));
  }
  content.append(h('div', { class: 'box' }, h('h4', null, `Toute l'équipe contre ${O.name}`), t,
    h('div', { class: 'muted', style: 'font-size:11px;margin-top:6px' }, 'Classés du meilleur au pire. Pour les Pokémon qui ne sont pas au combat, le calcul compte le coup qu\'ils encaissent en entrant.')));
}

// ------------------------------------------------------------------ onglet Stats de la fiche Pokédex
function paneStats(pane, sid) {
  const sp = S.core.species[sid];
  const pids = sp.vars.filter((p) => S.core.pokemon[p]);
  let pid = S.drawer.stPk && pids.includes(S.drawer.stPk) ? S.drawer.stPk : (S.defPk[sid] || pids[0]);
  if (pids.length > 1) pane.append(sel(pid, pids.map((p) => [p, variantName(p)]), (v) => { S.drawer.stPk = +v; renderDrawer(); }, { class: 'st-select' }));
  const pk = S.core.pokemon[pid];
  const bars = h('div', { class: 'box' }, h('h4', null, 'Stats de base', h('span', { class: 'muted' }, 'Total ' + pk.st.reduce((a, b) => a + b, 0))));
  pk.st.forEach((v, i) => {
    const col = v < 50 ? '#e3350d' : v < 80 ? '#e8913a' : v < 100 ? '#e8d23a' : v < 130 ? '#3fb67a' : '#5b9cf0';
    bars.append(h('div', { class: 'st-row' }, h('span', { class: 'st-lab' }, Battle.STAT_FR[i]), h('b', null, v), h('div', { class: 'st-bar' }, h('i', { style: `width:${Math.min(100, v / 2.55)}%;background:${col}` }))));
  });
  pane.append(bars);
  for (const lvl of [50, 100]) {
    const t = h('table', { class: 't' }, h('tr', null, h('th', null, 'Niveau ' + lvl), h('th', null, 'Min −'), h('th', null, 'Min'), h('th', null, 'Max'), h('th', null, 'Max +')));
    pk.st.forEach((b, i) => {
      const r = Battle.statRange(b, i, lvl);
      t.append(h('tr', null, h('td', null, Battle.STAT_FR[i]), ...r.map((x) => h('td', null, x))));
    });
    pane.append(h('div', { class: 'box' }, t));
  }
  pane.append(h('div', { class: 'muted', style: 'font-size:12px' }, 'Min − : 0 IV, 0 EV, nature défavorable · Min : 31 IV, 0 EV, nature neutre · Max : 31 IV, 252 EV, nature neutre · Max + : 31 IV, 252 EV, nature favorable. Les PV ne dépendent pas de la nature.'));
}
