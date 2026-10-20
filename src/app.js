/* Pokédex — interface */
'use strict';

const SPRITE_ROOT = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/';
const TYPE_COLORS = {
  normal: '#9099a1', fighting: '#ce4069', flying: '#8fa8dd', poison: '#ab6ac8', ground: '#d97746', rock: '#c7b78b',
  bug: '#90c12c', ghost: '#5269ac', steel: '#5a8ea1', fire: '#ff9c54', water: '#4d90d5', grass: '#63bb5b',
  electric: '#f3d23b', psychic: '#f97176', ice: '#74cec0', dragon: '#0a6dc4', dark: '#5a5366', fairy: '#ec8fe6',
  stellar: '#40b5a5', unknown: '#68a090', shadow: '#604e82',
};
const KIND_LABEL = {
  wild: 'Sauvage', unique: 'Unique', evo: 'Évolution', tradeEvo: 'Évo. par échange', egg: 'Œuf',
  exclusive: 'Exclusivité', tradeOnly: 'Échange requis', event: 'Événement', go: 'Pokémon GO',
  none: 'Introuvable', unknown: 'Données manquantes', transfer: 'Transfert',
};
const KIND_CLASS = {
  wild: 'k-wild', unique: 'k-unique', evo: 'k-evo', tradeEvo: 'k-trade', egg: 'k-egg', exclusive: 'k-trade',
  tradeOnly: 'k-trade', event: 'k-event', go: 'k-event', none: 'k-none', unknown: 'k-none', transfer: 'k-trade',
};
// nom français d'un objet à partir de son identifiant (ex. metal-coat -> Peau Métal)
function itemFr(ident) { const id = S.core.itemIdent && S.core.itemIdent[ident]; return (id && S.core.items[id]) || ident; }
// libellé court d'une évolution par échange : échange simple ou avec objet tenu
function tradeEvoLabel(info) {
  if (!info || !info.via) return 'Évo. par échange';
  return info.via.tradeItem ? 'Échange + ' + itemFr(info.via.tradeItem) : 'Échange simple';
}
const CLASS_FR = { 1: 'Statut', 2: 'Physique', 3: 'Spéciale' };

const S = {
  core: null, engine: null, global: null, gen1: null, moves: null, movesVg: {},
  view: { type: 'global' }, tab: 'dex',
  opts: { trade: true, egg: true, event: true, shiny: false, forms: false, battle: false, colors: true, scope: 'regional' },
  f: { q: '', type: '', gen: '', cat: '', obt: '', stage: '', status: '' },
  save: { version: 1, tracking: {}, settings: {} },
  sel: null, drawer: { tab: 'obt', ctx: null, shiny: false, female: false },
  defForm: {}, defPk: {},
};

// ------------------------------------------------------------------ utilitaires
const $ = (id) => document.getElementById(id);
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'html') e.innerHTML = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(String(k)));
  return e;
}
function toast(msg, action, onAction) {
  const t = $('toast');
  t.innerHTML = '';
  t.append(h('span', null, msg));
  if (action) t.append(h('button', { onclick: () => { t.classList.add('hidden'); onAction(); } }, action));
  t.classList.remove('hidden');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.add('hidden'), action ? 6000 : 2200);
}
const pad = (n, l = 3) => String(n).padStart(l, '0');
const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function spriteUrl(spr, shiny, female) {
  if (!spr) return '';
  const home = spr.p.startsWith('h/');
  const name = spr.p.slice(2);
  let p = 'pokemon/' + (home ? 'other/home/' : '');
  const sh = shiny && spr.s;
  const fe = female && (sh ? spr.sf : spr.f);
  if (sh) p += 'shiny/';
  if (fe) p += 'female/';
  return SPRITE_ROOT + p + name + '.png';
}
function img(spr, shiny, female, alt) {
  const i = h('img', { loading: 'lazy', alt: alt || '', src: spriteUrl(spr, shiny, female) });
  i.onerror = () => { i.style.visibility = 'hidden'; };
  return i;
}
function typeBadge(tid) {
  const id = S.core.typeIdent[tid];
  return h('span', { class: 'type', style: `background:${TYPE_COLORS[id] || '#777'}` }, S.core.types[tid]);
}
function ballImg(ident) {
  const i = h('img', { src: SPRITE_ROOT + 'items/' + ident + '.png', alt: '' });
  i.onerror = () => { i.style.display = 'none'; };
  return i;
}

// ------------------------------------------------------------------ données
async function readJSON(rel) {
  const txt = await window.api.readData(rel);
  return txt ? JSON.parse(txt) : null;
}

async function init() {
  S.core = await readJSON('core.json');
  S.global = await readJSON('curated/global.json');
  S.gen1 = await readJSON('curated/gen1.json');
  S.sv = await readJSON('curated/sv.json');
  S.others = await readJSON('curated/others.json');
  S.za = await readJSON('curated/za.json');
  S.moves = await readJSON('moves.json');
  S.maps = (await readJSON('curated/maps.json')) || { maps: {}, byFamily: {} };
  S.match = (await readJSON('curated/matching-balls.json')) || { species: {}, forms: {}, female: {} };
  Object.assign(S.core.ballNames, { 'strange-ball': 'Étrange Ball', 'cherish-ball': 'Mémoire Ball' }, S.core.ballNames);
  S.global.exclusives = ((await readJSON('curated/exclusives.json')) || {}).versions;
  S.global.livingdex = (await readJSON('curated/livingdex.json')) || null;
  S.engine = new PokeEngine(S.core, S.global, { gen1: S.gen1, sv: S.sv, others: S.others, za: S.za }, readJSON);
  for (const p of Object.values(S.core.pokemon)) {
    if (p.def) {
      S.defPk[p.sp] = p.id;
      const f = p.forms.map((x) => S.core.forms[x]).find((x) => x.pdef) || S.core.forms[p.forms[0]];
      S.defForm[p.sp] = f;
    }
  }
  const saved = await window.api.loadSave();
  if (saved && saved.tracking) S.save = Object.assign(S.save, saved);
  if (S.save.settings.opts) Object.assign(S.opts, S.save.settings.opts);
  S.easy = Object.assign({ mode: 'simple', sort: 'num', sheet: true }, S.save.settings.easy || {});
  if (S.save.settings.view) S.view = S.save.settings.view;
  await Promise.all(Object.keys(S.core.games).map((v) => S.engine.ensure(+v)));
  setupToolbar();
  renderNav();
  render();
  $('btn-export').onclick = async () => { if (await window.api.exportSave(S.save)) toast('Suivi exporté'); };
  $('btn-import').onclick = async () => {
    const d = await window.api.importSave();
    if (d && d.tracking) { S.save.tracking = d.tracking; persist(); renderNav(); render(); toast('Suivi importé'); }
  };
  $('btn-journal').onclick = () => window.api.openJournal();
  window.api.appVersion().then((v) => { $('app-version').textContent = 'Suivi par jeu · v' + v; });
  window.api.onUpdate((u) => {
    if (u.state === 'downloading') toast('Mise à jour v' + u.version + ' en cours de téléchargement…');
    if (u.state === 'ready') {
      const b = $('update-bar');
      b.innerHTML = '';
      b.append(h('span', null, 'Version ' + u.version + ' prête.'), h('button', { onclick: () => window.api.installUpdate() }, 'Redémarrer et installer'));
      b.classList.remove('hidden');
    }
  });
  $('drawer-close').onclick = () => { S.sel = null; $('drawer').classList.add('closed'); $('drawer').classList.remove('wide'); render(); };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $('drawer-close').click(); });
}

// ------------------------------------------------------------------ sauvegarde du suivi
let saveTimer = null;
function persist() {
  S.save.settings.opts = S.opts;
  S.save.settings.view = S.view;
  S.save.settings.easy = S.easy;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => window.api.writeSave(S.save), 300);
}
function rec(v, key) { return (S.save.tracking[v] || {})[key]; }
function setRec(v, key, patch) {
  const t = (S.save.tracking[v] = S.save.tracking[v] || {});
  const r = Object.assign({}, t[key] || {}, patch);
  if (!r.c && !r.s && !r.b) delete t[key]; else t[key] = r;
  persist();
}
function isC(v, key) { const r = rec(v, key); return !!(r && (r.c || r.s)); }
function isS(v, key) { const r = rec(v, key); return !!(r && r.s); }
function toggle(v, key, shiny) {
  const r = rec(v, key) || {};
  if (shiny) setRec(v, key, { s: r.s ? 0 : 1, c: r.s ? r.c : 1 });
  else setRec(v, key, r.c || r.s ? { c: 0, s: 0 } : { c: 1 });
}

// ------------------------------------------------------------------ contexte
function famOf(key) { return S.core.families.find((f) => f.key === key); }
function viewVersions() {
  const v = S.view;
  if (v.type === 'version') return [v.v];
  if (v.type === 'family') {
    return Object.values(S.core.games).filter((g) => g.fam === v.fam && (g.dlc || null) === (v.dlc || null) && !g.extra).map((g) => g.id);
  }
  return [];
}
function allMainVersions() { return Object.values(S.core.games).filter((g) => !g.extra).map((g) => g.id); }
function vName(v) {
  const g = S.core.games[v];
  return g.dlc ? `${g.name} — ${famOf(g.fam).dlc.find((d) => d.key === g.dlc).name}` : g.name;
}
function shortV(v) {
  const g = S.core.games[v];
  const n = g.name.replace("Let's Go ", 'LG ');
  return n.length > 10 ? n.split(/[ -]/).map((w) => w[0]).join('') : n;
}

// liste des entrées affichées
function items() {
  const out = [];
  const pushForms = (sid, vlist) => {
    const sp = S.core.species[sid];
    const df = S.defForm[sid];
    if (sp.gd && df && df.spr && df.spr.f) out.push({ sid, key: 'g' + sid, female: true, num: null, form: null });
    const seen = new Set();
    const forms = [];
    if (vlist) {
      for (const v of vlist) for (const f of S.engine.formsIn(v, sid, S.opts.battle)) if (!seen.has(f.id)) { seen.add(f.id); forms.push(f); }
    } else {
      for (const pid of sp.vars) for (const fid of S.core.pokemon[pid].forms) {
        const f = S.core.forms[fid];
        if (!f.def && (S.opts.battle || !f.battle)) forms.push(f);
      }
    }
    forms.sort((a, b) => a.order - b.order);
    for (const f of forms) out.push({ sid, key: 'f' + f.id, form: f, num: null });
  };
  if (S.view.type === 'global') {
    const ids = Object.keys(S.core.species).map(Number).sort((a, b) => a - b);
    for (const sid of ids) {
      out.push({ sid, key: String(sid), num: '#' + pad(sid, 4) });
      if (S.opts.forms || S.tab === 'forms') pushForms(sid, null);
    }
  } else {
    const vs = viewVersions();
    const seen = new Set();
    for (const v of vs) for (const x of S.engine.scope(v, S.opts.scope)) {
      if (seen.has(x.sid)) continue;
      seen.add(x.sid);
      out.push({ sid: x.sid, key: String(x.sid), num: x.num });
      if (S.opts.forms || S.tab === 'forms') pushForms(x.sid, vs);
    }
  }
  if (S.tab === 'forms') return out.filter((x) => x.form || x.female);
  return out;
}

// statut d'une espèce dans le contexte affiché (meilleur cas pour un groupe)
function ctxInfo(sid) {
  const vs = viewVersions();
  if (!vs.length) return null;
  let best = null;
  for (const v of vs) {
    const i = S.engine.status(v).get(sid);
    if (!i) continue;
    const score = !i.avail ? 0 : i.needTrade ? 1 : 2;
    if (!best || score > best.score) best = { ...i, score, v };
  }
  return best;
}

function caughtCtx(it) {
  const vs = S.view.type === 'global' ? [...allMainVersions(), 'global'] : viewVersions();
  return { c: vs.some((v) => isC(v, it.key)), s: vs.some((v) => isS(v, it.key)) };
}

// ------------------------------------------------------------------ filtres
function setupToolbar() {
  const opt = (sel, list) => { sel.innerHTML = ''; for (const [v, l] of list) sel.append(h('option', { value: v }, l)); };
  opt($('f-type'), [['', 'Tous les types'], ...Object.entries(S.core.types).filter(([k]) => +k < 19).map(([k, v]) => [k, v])]);
  opt($('f-gen'), [['', 'Toutes les générations'], ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((g) => [g, g + 'e génération'])]);
  opt($('f-cat'), [['', 'Toutes catégories'], ['starter', 'Starters'], ['leg', 'Légendaires'], ['myth', 'Fabuleux'],
    ['baby', 'Bébés'], ['fossil', 'Fossiles'], ['ub', 'Ultra-Chimères'], ['paradox', 'Paradoxes'],
    ['unique', 'Uniques dans ce jeu'], ['exclHere', 'Exclusifs à cette version'], ['choice', 'Au choix'],
    ['gd', 'Différences mâle/femelle'], ['regional', 'Formes régionales'], ['mega', 'Méga-Évolutions'],
    ['gmax', 'Gigamax'], ['hasForms', 'Avec formes alternatives']]);
  opt($('f-obt'), [['', 'Toutes obtentions'], ['wild', 'Sauvage'], ['unique', 'Unique / cadeau / fixe'], ['evo', 'Évolution'],
    ['egg', 'Œuf'], ['trade', 'Nécessite un échange'], ['tradeEvo', 'Évolution par échange'], ['exclusive', "Exclusif à l'autre version"],
    ['event', 'Événement / GO'], ['none', 'Introuvable dans ce jeu']]);
  opt($('f-stage'), [['', 'Toutes étapes'], ['avant', 'Avant la ligue'], ['apres', 'Après la ligue'], ['echange', 'Échange uniquement']]);
  opt($('f-status'), [['', 'Tous'], ['caught', 'Capturés'], ['missing', 'Manquants'], ['missingObt', 'Manquants obtenables'],
    ['shiny', 'Shiny capturés'], ['missingShiny', 'Shiny manquants']]);
  for (const [id, k] of [['f-type', 'type'], ['f-gen', 'gen'], ['f-cat', 'cat'], ['f-obt', 'obt'], ['f-stage', 'stage'], ['f-status', 'status']]) {
    $(id).onchange = (e) => { S.f[k] = e.target.value; renderContent(); };
  }
  let qt;
  $('q').oninput = (e) => { clearTimeout(qt); qt = setTimeout(() => { S.f.q = e.target.value; renderContent(); }, 120); };
}

function renderChips() {
  const c = $('chips');
  c.innerHTML = '';
  const chip = (label, key, cls, title) => h('span', {
    class: 'chip ' + (S.opts[key] ? 'on ' : '') + (cls || ''), title,
    onclick: () => { S.opts[key] = !S.opts[key]; persist(); render(); },
  }, label);
  c.append(
    chip('Échanges', 'trade', '', 'Compter les Pokémon qui demandent un échange avec un autre joueur'),
    chip('Œufs', 'egg', '', 'Compter les Pokémon obtenus par reproduction'),
    chip('Événements / GO', 'event', '', 'Compter les distributions et Pokémon GO'),
    h('span', { class: 'chip-sep' }),
    chip('★ Shiny', 'shiny', 'shinychip', 'Afficher et compter les shiny'),
    chip('Formes', 'forms', '', 'Afficher les formes alternatives et les différences mâle/femelle'),
    chip('Formes de combat', 'battle', '', 'Inclure Méga-Évolutions, Gigamax et formes de combat'),
    h('span', { class: 'chip-sep' }),
    chip('Couleurs', 'colors', '', 'Contour coloré : légendaires, fossiles, uniques, exclusivités, échanges'),
  );
  if (S.view.type !== 'global') {
    c.append(h('span', { class: 'chip-sep' }),
      h('span', { class: 'chip ' + (S.opts.scope === 'regional' ? 'on' : ''), onclick: () => { S.opts.scope = 'regional'; persist(); render(); } }, 'Pokédex régional'),
      h('span', { class: 'chip ' + (S.opts.scope === 'national' ? 'on' : ''), onclick: () => { S.opts.scope = 'national'; persist(); render(); } }, 'Tous les Pokémon du jeu'));
  }
}

function hasRegional(sid) {
  return S.core.species[sid].vars.some((pid) => /-(alola|galar|hisui|paldea)/.test(S.core.pokemon[pid].ident));
}

function passFilters(it) {
  const sp = S.core.species[it.sid];
  const f = S.f;
  if (f.q) {
    const q = norm(f.q);
    const hay = norm(sp.fr + ' ' + sp.en + ' ' + (it.form ? it.form.name : '') + ' ' + (it.num || '') + ' ' + sp.id);
    if (!hay.includes(q)) return false;
  }
  const pk = it.form ? S.core.pokemon[it.form.pk] : S.core.pokemon[S.defPk[it.sid]];
  if (f.type && !pk.types.includes(+f.type)) return false;
  if (f.gen && sp.gen !== +f.gen) return false;
  const info = ctxInfo(it.sid);
  if (f.cat) {
    const c = f.cat;
    const set = S.engine.sets;
    const ok = {
      starter: set.starters.has(sp.id), leg: sp.leg, myth: sp.myth, baby: sp.baby, fossil: set.fossils.has(sp.id),
      ub: set.ub.has(sp.id), paradox: set.paradox.has(sp.id), gd: sp.gd,
      regional: it.form ? /alola|galar|hisui|paldea/.test(it.form.ident) : hasRegional(sp.id),
      mega: it.form ? it.form.mega : sp.vars.some((p) => /-mega/.test(S.core.pokemon[p].ident)),
      gmax: it.form ? /gmax/.test(it.form.ident) : sp.vars.some((p) => /-gmax/.test(S.core.pokemon[p].ident)),
      hasForms: sp.vars.length > 1 || S.core.pokemon[S.defPk[sp.id]].forms.length > 1,
      unique: info && info.kind === 'unique',
      exclHere: info && info.exclusiveHere,
      choice: info && info.choice,
    }[c];
    if (!ok) return false;
  }
  if (f.obt) {
    if (!info) return false;
    const k = info.kind;
    const ok = {
      wild: k === 'wild', unique: k === 'unique', evo: k === 'evo', egg: k === 'egg', trade: info.needTrade,
      tradeEvo: k === 'tradeEvo', exclusive: k === 'exclusive', event: k === 'event' || k === 'go', none: !info.avail,
    }[f.obt];
    if (!ok) return false;
  }
  if (f.stage) {
    if (!info) return false;
    const st = S.engine.stageLabel(info, info.v);
    if ({ avant: 'Avant la ligue', apres: 'Après la ligue', echange: 'Échange' }[f.stage] !== st) return false;
  }
  if (f.status) {
    const cs = caughtCtx(it);
    const ok = {
      caught: cs.c, missing: !cs.c, shiny: cs.s, missingShiny: !cs.s,
      missingObt: !cs.c && (!info || S.engine.obtainable(info, S.opts)),
    }[f.status];
    if (!ok) return false;
  }
  return true;
}

// ------------------------------------------------------------------ barre latérale
function pctFor(versions, kind = 'c') {
  let total = 0, got = 0;
  const seen = new Set();
  for (const v of versions) for (const x of S.engine.scope(v, 'regional')) {
    if (seen.has(x.sid)) continue;
    seen.add(x.sid); total++;
    if (versions.some((w) => (kind === 's' ? isS : isC)(w, String(x.sid)))) got++;
  }
  return total ? Math.floor((got / total) * 100) : 0;
}

function renderNav() {
  const nav = $('nav');
  nav.innerHTML = '';
  const isActive = (v) => JSON.stringify(v) === JSON.stringify(S.view);
  const go = (view) => { S.view = view; if ((view.type !== 'version' && S.tab === 'route') || (view.type === 'global' && S.tab === 'map') || (view.type !== 'global' && S.tab === 'easy')) S.tab = 'dex'; persist(); renderNav(); render(); };
  const totalGlobal = Object.keys(S.core.species).length;
  let got = 0;
  const vs = [...allMainVersions(), 'global'];
  for (const sid of Object.keys(S.core.species)) if (vs.some((v) => isC(v, sid))) got++;
  nav.append(h('button', { class: 'nav-item' + (isActive({ type: 'global' }) ? ' active' : ''), onclick: () => go({ type: 'global' }) },
    h('span', { class: 'caret' }, '◆'), h('span', { class: 'lbl' }, 'Pokédex national (tous les jeux)'),
    h('span', { class: 'pct' }, `${got}/${totalGlobal}`)));
  let lastGen = 0;
  const openFams = S.save.settings.open || (S.save.settings.open = {});
  for (const fam of S.core.families) {
    if (fam.gen !== lastGen) { nav.append(h('div', { class: 'nav-gen' }, fam.gen + 'e génération')); lastGen = fam.gen; }
    const famVersions = fam.versions;
    const wrap = h('div', { class: 'nav-fam' + (openFams[fam.key] ? ' open' : '') });
    const head = h('button', {
      class: 'nav-item' + (isActive({ type: 'family', fam: fam.key }) ? ' active' : ''),
      onclick: (e) => {
        if (e.target.classList.contains('caret')) { openFams[fam.key] = !openFams[fam.key]; persist(); renderNav(); return; }
        openFams[fam.key] = true; go({ type: 'family', fam: fam.key });
      },
    }, h('span', { class: 'caret' }, '▶'), h('span', { class: 'lbl' }, fam.name), h('span', { class: 'pct' }, pctFor(famVersions) + ' %'));
    const kids = h('div', { class: 'nav-children' });
    const addV = (v) => kids.append(h('button', {
      class: 'nav-item' + (isActive({ type: 'version', v }) ? ' active' : ''), onclick: () => go({ type: 'version', v }),
    }, h('span', { class: 'caret' }, h('i', { class: 'vdot', style: `background:${vColor(v)}` })), h('span', { class: 'lbl' }, S.core.games[v].name), h('span', { class: 'pct' }, pctFor([v]) + ' %')));
    famVersions.forEach(addV);
    if (fam.extra && fam.extra.length) { kids.append(h('div', { class: 'nav-sub' }, 'Versions japonaises')); fam.extra.forEach(addV); }
    for (const d of fam.dlc || []) {
      kids.append(h('div', { class: 'nav-sub' }, 'DLC'));
      kids.append(h('button', {
        class: 'nav-item' + (isActive({ type: 'family', fam: fam.key, dlc: d.key }) ? ' active' : ''),
        onclick: () => go({ type: 'family', fam: fam.key, dlc: d.key }),
      }, h('span', { class: 'caret' }), h('span', { class: 'lbl' }, d.name), h('span', { class: 'pct' }, pctFor(d.versions) + ' %')));
      for (const v of d.versions) kids.append(h('button', {
        class: 'nav-item' + (isActive({ type: 'version', v }) ? ' active' : ''), style: 'padding-left:26px',
        onclick: () => go({ type: 'version', v }),
      }, h('span', { class: 'lbl' }, S.core.games[v].name), h('span', { class: 'pct' }, pctFor([v]) + ' %')));
    }
    wrap.append(head, kids);
    nav.append(wrap);
  }
}

// ------------------------------------------------------------------ rendu principal
function render() {
  renderHead();
  renderChips();
  renderLegend();
  renderContent();
  if (S.sel != null) renderDrawer();
}

function renderHead() {
  const v = S.view;
  let title = 'Pokédex national', sub = 'Tous les jeux réunis : un Pokémon compte dès qu\'il est coché dans n\'importe quelle version.';
  const banner = $('banner');
  banner.classList.add('hidden');
  if (v.type === 'family') {
    const fam = famOf(v.fam);
    const d = v.dlc && fam.dlc.find((x) => x.key === v.dlc);
    title = d ? d.name : fam.name;
    sub = (d ? 'DLC de ' + fam.name + ' · ' : '') + 'Groupe : cocher une version remplit le total, chaque version garde son propre suivi.';
  } else if (v.type === 'version') {
    const g = S.core.games[v.v];
    title = vName(v.v);
    const dex = g.dex.map((d) => S.core.dex[d] && S.core.dex[d].name).filter(Boolean).join(' + ');
    sub = famOf(g.fam).name + (dex ? ' · ' + dex : '');
  }
  if (v.type !== 'global') {
    const vs = viewVersions();
    const missing = vs.filter((x) => !S.engine.hasEncounterData(x));
    const notes = [];
    const partial = vs.filter((x) => (S.global.incompleteEncounters || []).includes(x));
    if (partial.length && !missing.length) notes.push('Lieux de capture incomplets dans la base de données pour ce jeu : les Pokémon sans lieu connu sont marqués « Données manquantes » plutôt qu\'« Introuvable ».');
    if (missing.length) notes.push('Les lieux de capture ne sont pas encore disponibles pour ce jeu dans la base de données : seuls le Pokédex, les évolutions, les talents, les attaques et les formes sont renseignés.');
    if (!vs.some((x) => S.engine.cur(x)) && !missing.length) {
      notes.push(vs.some((x) => S.engine.hasStages(x))
        ? 'Route optimisée pas encore saisie pour ce jeu (vue « par lieu »). Le filtre avant / après la ligue fonctionne.'
        : 'Étapes avant / après la ligue et route optimisée pas encore saisies pour ce jeu : le filtre « Avant / Après la ligue » est désactivé ici.');
    }
    for (const x of vs) {
      const cx = S.engine.cur(x); const n = cx && S.engine.ref(cx.notes, x);
      if (n) { notes.push(...n); break; }
    }
    if (notes.length) { banner.innerHTML = ''; notes.forEach((n) => banner.append(h('div', null, n))); banner.classList.remove('hidden'); }
  }
  // filtre avant / après la ligue grisé pour les jeux qui n'ont pas cette information
  const stagesOk = v.type === 'global' || viewVersions().some((x) => S.engine.hasStages(x));
  for (const o of $('f-stage').options) if (o.value === 'avant' || o.value === 'apres') o.disabled = !stagesOk;
  $('f-stage').title = stagesOk ? '' : 'Avant / après la ligue pas encore saisi pour ce jeu';
  if (!stagesOk && (S.f.stage === 'avant' || S.f.stage === 'apres')) { S.f.stage = ''; $('f-stage').value = ''; }
  $('title').textContent = title;
  $('subtitle').textContent = sub;
  // onglets
  const tabs = $('tabs');
  tabs.innerHTML = '';
  const t = (key, label) => tabs.append(h('button', { class: 'tab' + (S.tab === key ? ' active' : ''), onclick: () => { S.tab = key; render(); } }, label));
  t('dex', 'Pokédex');
  if (v.type === 'version') t('route', 'Route optimisée');
  if (v.type !== 'global') t('map', 'Carte');
  if (v.type === 'global') t('easy', 'Le plus simple');
  t('forms', 'Formes alternatives');
  $('toolbar').classList.toggle('hidden', S.tab === 'map');
  $('chips').classList.toggle('hidden', S.tab === 'map');
  renderProgress();
}

function renderProgress() {
  const p = $('progress');
  p.innerHTML = '';
  const label = S.view.type === 'version' ? 'ce jeu' : S.view.type === 'family' ? 'ce groupe' : 'tout';
  const actions = h('div', { class: 'head-actions' }, h('button', { class: 'btn-reset', title: 'Décocher tous les Pokémon de la vue affichée', onclick: resetView }, '⟲ Réinitialiser ' + label));
  const its = items().filter((x) => S.tab === 'forms' || !(x.form || x.female));
  const total = its.length;
  let c = 0, s = 0;
  for (const it of its) { const cs = caughtCtx(it); if (cs.c) c++; if (cs.s) s++; }
  let obt = total;
  if (S.view.type !== 'global' && S.tab !== 'forms') {
    const vs = viewVersions();
    const sids = its.map((x) => x.sid);
    obt = Math.max(...vs.map((v) => S.engine.countObtainable(v, sids, S.opts)));
    if (vs.length > 1) {
      // groupe : union des obtenables de chaque version
      const set = new Set();
      for (const v of vs) for (const sid of sids) if (S.engine.obtainable(S.engine.status(v).get(sid), S.opts)) set.add(sid);
      obt = set.size;
    }
  }
  const bar = (label, n, d, cls) => h('div', { class: 'prog' },
    h('div', { class: 'prog-top' }, h('span', null, label), h('b', null, `${n} / ${d}`)),
    h('div', { class: 'bar ' + (cls || '') }, h('span', { style: `width:${d ? (n / d) * 100 : 0}%` })));
  p.append(bar('Capturés', c, total));
  if (S.view.type !== 'global' && S.tab !== 'forms') p.append(bar('Obtenables (options actives)', Math.min(c, obt), obt));
  if (S.opts.shiny) p.append(bar('Shiny', s, total, 'shiny'));
  p.append(actions);
}

function renderContent() {
  const content = $('content');
  content.innerHTML = '';
  if (S.tab === 'route' && S.view.type === 'version') return renderRoute(content);
  if (S.tab === 'easy' && S.view.type === 'global') return renderEasy(content);
  if (S.tab === 'map' && S.view.type !== 'global') {
    S.mainMap = S.mainMap || {};
    const vs = viewVersions();
    const v = vs.includes(S.mainMap.v) ? S.mainMap.v : vs[0];
    S.mainMap.v = v;
    const wrap = h('div', { class: 'main-map' });
    if (vs.length > 1) {
      const sw = h('div', { class: 'd-switch', style: 'margin:0 0 10px' });
      for (const x of vs) sw.append(h('button', { class: x === v ? 'on' : '', onclick: () => { S.mainMap.v = x; renderContent(); } }, S.core.games[x].name));
      wrap.append(sw);
    }
    const tmp = h('div');
    renderMapInto(tmp, null, v, S.mainMap, () => { const y = content.scrollTop; renderContent(); content.scrollTop = y; });
    // carte à gauche, détail du lieu à droite
    const left = h('div', { class: 'mm-left' }), right = h('div', { class: 'mm-right' });
    for (const el of [...tmp.children]) {
      if (el.classList.contains('d-switch') || el.classList.contains('map-wrap') || el.classList.contains('map-legend')) left.append(el);
      else right.append(el);
    }
    if (!S.mainMap.mapLoc) right.prepend(h('div', { class: 'box' }, 'Clique sur une route ou un lieu de la carte pour voir les Pokémon qu\'on y trouve. Ceux que tu as déjà capturés dans ' + S.core.games[v].name + ' sont grisés.'));
    wrap.append(h('div', { class: 'mm-grid' }, left, right));
    content.append(wrap);
    renderProgress();
    return;
  }
  const list = items().filter(passFilters);
  if (!list.length) { content.append(h('div', { class: 'empty' }, 'Aucun Pokémon ne correspond à ces filtres.')); renderProgress(); return; }
  const grid = h('div', { class: 'grid' });
  for (const it of list) grid.append(card(it));
  content.append(grid);
  renderProgress();
}

function card(it) {
  const sp = S.core.species[it.sid];
  const f = it.form || S.defForm[it.sid];
  const cs = caughtCtx(it);
  const info = ctxInfo(it.sid);
  const ok = !info || S.engine.obtainable(info, S.opts);
  const el = h('div', { class: 'card' + (cs.c ? ' caught' : '') + (cs.s && S.opts.shiny ? ' sh' : '') + (ok ? '' : ' off') + (S.sel === it.sid ? ' sel' : '') });
  const mark = S.opts.colors ? cardMark(it, info) : null;
  if (mark) {
    el.style.borderColor = mark.color;
    el.style.borderWidth = '2px';
    el.style.borderStyle = mark.dashed ? 'dashed' : 'solid';
    if (mark.second) el.style.boxShadow = `inset 0 0 0 2px ${mark.second}`;
    el.title = mark.label;
  }
  const tv = toggleTarget(it);
  el.title = (mark ? mark.label + '\n' : '') + (tv ? 'Clic : capturé' + (tv !== 'global' && S.view.type === 'family' ? ' (' + S.core.games[tv].name + ')' : '') + ' · clic droit : shiny' : '');
  el.onclick = () => {
    if (!tv) return;
    if (S.view.type !== 'version' && cs.c) uncheckEverywhere(it);
    else toggle(tv, it.key);
    refreshAfterToggle();
  };
  el.oncontextmenu = (e) => { e.preventDefault(); if (!tv) return; toggle(tv, it.key, true); refreshAfterToggle(); };
  const acts = h('div', { class: 'acts' });
  if (S.opts.shiny && tv) acts.append(h('button', { class: 'tg star' + (isS(tv, it.key) ? ' on' : ''), title: 'Shiny', onclick: (e) => { e.stopPropagation(); toggle(tv, it.key, true); refreshAfterToggle(); } }, '★'));
  acts.append(h('button', { class: 'tg menu', title: 'Ouvrir la fiche', onclick: (e) => { e.stopPropagation(); openDrawer(it.sid); } }, '⋯'));
  el.append(acts);
  if (cs.c) el.append(h('div', { class: 'check' }, '✓'));
  el.append(h('div', { class: 'num' }, it.num || (it.female ? '♀' : 'forme')));
  el.append(h('div', { class: 'img' }, img(f && f.spr, S.opts.shiny && cs.s, it.female, sp.fr)));
  el.append(h('div', { class: 'name' }, sp.fr + (it.female ? ' ♀' : '')));
  el.append(h('div', { class: 'form' }, it.form ? (it.form.fname || it.form.name) : it.female ? 'Différence femelle' : (sp.gd ? 'Diff. mâle/femelle' : '')));
  const pk = it.form ? S.core.pokemon[it.form.pk] : S.core.pokemon[S.defPk[it.sid]];
  const meta = h('div', { class: 'meta' });
  pk.types.forEach((t) => meta.append(typeBadge(t)));
  if (info && !it.form && !it.female) {
    const lbl = info.kind === 'unique' ? (info.uniqueLabel || 'Unique') : info.kind === 'exclusive'
      ? 'Exclu ' + info.exclusiveTo.map(shortV).join('/') : info.kind === 'tradeEvo' ? tradeEvoLabel(info) : KIND_LABEL[info.kind];
    meta.append(h('span', { class: 'pill ' + (KIND_CLASS[info.kind] || '') }, lbl));
    if (info.post) meta.append(h('span', { class: 'pill post' }, 'Après ligue'));
    if (info.exclusiveHere && S.view.type === 'version') meta.append(h('span', { class: 'pill excl' }, 'Exclusif'));
    if (info.choice && !S.opts.trade) meta.append(h('span', { class: 'pill k-unique' }, 'Au choix'));
    if ((info.kind === 'wild' || info.kind === 'evo') && info.uniqueLabel) meta.append(h('span', { class: 'pill k-unique' }, info.uniqueLabel));
  } else if (!info && !it.form && !it.female) {
    if (sp.myth) meta.append(h('span', { class: 'pill k-event' }, 'Fabuleux'));
    else if (sp.leg) meta.append(h('span', { class: 'pill k-unique' }, 'Légendaire'));
    else if (S.engine.sets.starters.has(sp.id)) meta.append(h('span', { class: 'pill k-unique' }, 'Starter'));
  }
  el.append(meta);
  el.append(matchRow(it));
  // puces de versions
  const vs = S.view.type === 'family' ? viewVersions() : [];
  if (vs.length) {
    const row = h('div', { class: 'vchips' });
    for (const v of vs) {
      const i = S.engine.status(v).get(it.sid);
      const na = !it.form && !it.female && (!i || !i.avail);
      row.append(h('span', {
        class: 'vchip' + (isC(v, it.key) ? ' on' : '') + (isS(v, it.key) && S.opts.shiny ? ' sh' : '') + (na ? ' na' : ''),
        title: S.core.games[v].name + (S.opts.shiny ? ' (clic droit : shiny)' : ''),
        onclick: (e) => { e.stopPropagation(); toggle(v, it.key); refreshAfterToggle(); },
        oncontextmenu: (e) => { e.preventDefault(); e.stopPropagation(); toggle(v, it.key, true); refreshAfterToggle(); },
      }, shortV(v)));
    }
    el.append(row);
  } else if (S.view.type === 'global' && !it.form && !it.female) {
    const n = allMainVersions().filter((v) => isC(v, it.key)).length;
    if (n) el.append(h('div', { class: 'vchips' }, h('span', { class: 'vchip on' }, `${n} jeu${n > 1 ? 'x' : ''}`)));
  }
  return el;
}

// décoche un Pokémon dans toutes les versions de la vue (groupe ou national), avec annulation
function uncheckEverywhere(it) {
  const vs = S.view.type === 'global' ? [...Object.keys(S.core.games).map(Number), 'global'] : viewVersions();
  const backup = [];
  for (const v of vs) {
    const r = rec(v, it.key);
    if (r && (r.c || r.s)) { backup.push([v, { ...r }]); setRec(v, it.key, { c: 0, s: 0 }); }
  }
  if (backup.length > 1) toast(`Décoché dans ${backup.length} jeux`, 'Annuler', () => {
    for (const [v, r] of backup) setRec(v, it.key, r);
    refreshAfterToggle();
  });
}

// réinitialise le suivi du jeu / groupe affiché
function resetView() {
  let vs, label;
  if (S.view.type === 'version') { vs = [S.view.v]; label = vName(S.view.v); }
  else if (S.view.type === 'family') {
    const fam = famOf(S.view.fam);
    const d = S.view.dlc && fam.dlc.find((x) => x.key === S.view.dlc);
    vs = viewVersions(); label = d ? d.name : fam.name;
  } else { vs = [...Object.keys(S.core.games).map(Number), 'global']; label = 'tous les jeux'; }
  const n = vs.reduce((a, v) => a + Object.keys(S.save.tracking[v] || {}).length, 0);
  if (!n) { toast('Rien à réinitialiser'); return; }
  if (!window.confirm(`Réinitialiser le suivi de ${label} ? (${n} Pokémon cochés)`)) return;
  const backup = {};
  for (const v of vs) if (S.save.tracking[v]) { backup[v] = S.save.tracking[v]; delete S.save.tracking[v]; }
  persist();
  renderNav(); render();
  toast(`Suivi de ${label} réinitialisé`, 'Annuler', () => {
    Object.assign(S.save.tracking, backup);
    persist(); renderNav(); render();
  });
}

// ------------------------------------------------------------------ codes couleur des cases
const MARK = { leg: '#E8B502', fossil: '#B0703C', once: '#B57BFF', trade: '#E8913A' };
function vColor(v) { return (S.global.versionColors || {})[v] || '#888'; }
function cardMark(it, info) {
  if (it.form || it.female) return null;
  const sp = S.core.species[it.sid];
  const fossil = (S.global.fossilFamilies || []).includes(it.sid) && (!info || info.kind !== 'wild');
  const marks = [];
  if (sp.leg || sp.myth) marks.push({ color: MARK.leg, label: sp.myth ? 'Fabuleux' : 'Légendaire' });
  if (fossil) marks.push({ color: MARK.fossil, label: 'Fossile' });
  if (info && info.once && !sp.leg && !sp.myth && !fossil) marks.push({ color: MARK.once, label: 'Obtenable une seule fois dans ce jeu' + (info.choice ? ' (' + info.choice.label + ')' : info.uniqueLabel ? ' (' + info.uniqueLabel + ')' : '') });
  // exclusif à une version
  const vs = viewVersions();
  if (vs.length > 1) {
    const where = vs.filter((v) => { const i = S.engine.status(v).get(it.sid); return i && i.exclusiveHere; });
    if (where.length) marks.push({ color: vColor(where[0]), label: 'Exclusif à ' + where.map((v) => S.core.games[v].name).join(' / ') });
  } else if (info && info.exclusiveHere) marks.push({ color: vColor(info.v), label: 'Exclusif à ' + S.core.games[info.v].name });
  if (info && info.kind === 'exclusive') marks.push({ color: vColor(info.exclusiveTo[0]), dashed: true, label: 'Échange requis : exclusif à ' + info.exclusiveTo.map((x) => S.core.games[x].name).join(' / ') });
  else if (info && info.kind === 'tradeEvo') marks.push({ color: MARK.trade, dashed: true, label: 'Évolution par échange : ' + (info.via.tradeItem ? 'échanger en tenant ' + itemFr(info.via.tradeItem) : 'échange simple, sans objet') });
  else if (info && (info.kind === 'tradeOnly' || info.kind === 'transfer')) marks.push({ color: MARK.trade, dashed: true, label: info.note || 'Échange requis' });
  if (!marks.length) return null;
  return { ...marks[0], second: marks[1] && marks[1].color, label: marks.map((m) => m.label).join(' · ') };
}

function renderLegend() {
  const el = $('legend');
  el.innerHTML = '';
  if (!S.opts.colors || S.tab !== 'dex') { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  const item = (color, label, dashed) => h('span', { class: 'lg-item' }, h('i', { style: `border:2px ${dashed ? 'dashed' : 'solid'} ${color}` }), label);
  el.append(item(MARK.leg, 'Légendaire / Fabuleux'), item(MARK.fossil, 'Fossile'), item(MARK.once, 'Une seule fois'));
  const vs = S.view.type === 'global' ? [] : [...new Set([...viewVersions(), ...viewVersions().flatMap((v) => S.engine.siblings(v).filter((x) => !S.core.games[x].extra))])];
  for (const v of vs) el.append(item(vColor(v), 'Exclusif ' + S.core.games[v].name));
  if (vs.length) el.append(item('#9aa0ad', 'Pointillés = échange requis', true), item(MARK.trade, 'Évolution / échange', true));
}

// version cochée par un clic sur la carte
function toggleTarget(it) {
  if (S.view.type === 'version') return S.view.v;
  if (S.view.type === 'global') return 'global';
  const vs = viewVersions();
  const ok = vs.find((v) => { const i = S.engine.status(v).get(it.sid); return i && i.avail && !i.needTrade; });
  return ok || vs[0];
}

// Balls assorties (feuille « Legal Matching Pokéballs »)
function matchFor(it, shiny) {
  const m = S.match;
  let r = null;
  if (it.form) r = m.forms[it.form.id];
  else if (it.female) r = m.female[it.sid];
  if (!r) r = m.species[it.sid];
  if (!r) return [];
  return (shiny ? r.s : r.n) || [];
}
function ballUsable(b, v) {
  const g = S.core.games[v];
  const B = g && S.core.balls[g.vg];
  return !B || (B.stored && B.balls.includes(b));
}
function matchRow(it) {
  const balls = matchFor(it, S.opts.shiny);
  const row = h('div', { class: 'mballs', title: 'Balls assorties' + (S.opts.shiny ? ' (shiny)' : '') });
  const v = S.view.type === 'version' ? S.view.v : null;
  for (const b of balls) {
    const ok = !v || ballUsable(b, v);
    const i = ballImg(b);
    const wrap = h('span', { class: 'mball' + (ok ? '' : ' no'), title: (S.core.ballNames[b] || b) + (ok ? '' : ' — pas utilisable dans ce jeu') }, i);
    row.append(wrap);
  }
  return row;
}

function refreshAfterToggle() {
  const y = $('content').scrollTop;
  renderContent();
  $('content').scrollTop = y;
  renderNav();
  if (S.sel != null) renderDrawer();
}

// ------------------------------------------------------------------ route optimisée
// ------------------------------------------------------------------ le plus simple (Pokédex national)
function easyHow(r, short) {
  const name = (x) => S.core.species[x].fr;
  if (r.entry) {
    const e = r.entry;
    const where = e.areaFr && e.areaFr !== e.locFr && !e.areaFr.startsWith(e.locFr) ? e.locFr + ' — ' + e.areaFr : (e.areaFr || e.locFr);
    const conds = e.conds.map((c) => S.core.encConds[c]).join(', ');
    return [where, methodShort(e) + (e.give ? ' contre ' + name(e.give) : ''), e.min ? 'niv. ' + (e.min === e.max ? e.min : e.min + '-' + e.max) : null, conds].filter(Boolean).join(' · ');
  }
  if (r.evo) return 'Évolution de ' + name(r.evo.from) + ' (' + r.evo.txt + ')' + (short ? '' : ' ← ' + name(r.evo.from) + ' : ' + easyHow(r.pre, true));
  if (r.egg) return 'Œuf de ' + name(r.egg) + (short ? '' : ' ← ' + name(r.egg) + ' : ' + easyHow(r.pre, true));
  if (r.event) return 'Événement' + (r.info.note ? ' : ' + r.info.note : '');
  return (r.info.uniqueLabel || 'Pokémon fixe / cadeau') + (r.info.note ? ' · ' + r.info.note : '');
}

function easyLine(r, first) {
  const st = S.engine.stageLabel(r.info, r.v);
  return h('div', { class: 'easy-line' + (first ? ' first' : '') },
    h('span', { class: 'easy-game', style: `border-color:${vColor(r.v)}` }, vName(r.v)),
    h('span', { class: 'easy-how' }, easyHow(r)),
    chancePill(r),
    r.sheet ? h('span', { class: 'pill sheet', title: 'Même lieu que la feuille « National living dex »' }, '✓ feuille') : null,
    st !== '—' ? h('span', { class: 'pill' + (r.info.post ? ' post' : '') }, st) : null);
}

function chancePill(r) {
  const c = r.chance;
  const t = c == null ? '? %' : (c >= 10 ? Math.round(c) : c) + ' %';
  const cls = c == null ? '' : c >= 30 ? ' hi' : c >= 10 ? ' mid' : ' lo';
  const tip = c == null ? 'Chance de rencontre inconnue' : r.entry && r.entry.unique ? 'Cadeau / Pokémon fixe : toujours là' : 'Chance de tomber dessus à cet endroit' + (r.evo || r.egg ? ' (forme de base)' : '');
  return h('span', { class: 'pill chance' + cls, title: tip }, t);
}

// pas de moyen en jeu : seulement des événements (souvent terminés)
function easyNone(best) {
  if (!best.eventOnly) return h('span', { class: 'muted' }, 'Rien avec les options actives (échanges, œufs)');
  const notes = [...new Set(best.eventOnly.map((x) => x.info.note).filter(Boolean))];
  return h('div', { class: 'easy-event' },
    h('span', { class: 'pill ev' }, 'Événement seulement'), ' Pas obtenable en jouant : il faut une distribution (souvent terminée), un bonus ou un transfert.',
    best.eventOnly.length ? h('div', { class: 'easy-alt' }, best.eventOnly.map((x) => vName(x.v)).join(', ') + (notes.length ? ' · ' + notes.slice(0, 2).join(' · ') : '')) : null);
}

// conseils de la feuille « National living dex » (4e, 5e, 6e génération)
const SHEET_TABS = [['g4', '4G'], ['g5', '5G'], ['g6', '6G']];
function sheetLines(sid, all) {
  const ld = S.global.livingdex;
  if (!ld) return [];
  const out = [];
  for (const [tab, lbl] of SHEET_TABS) {
    const r = ld[tab] && ld[tab][sid];
    if (!r || (!all && r.kind !== 'catch')) continue;
    const txt = r.kind === 'egg' ? 'Œuf (reproduction)' : r.kind === 'transfer' ? 'Transfert depuis un jeu plus ancien' : r.kind === 'event' ? 'Événement' : r.loc;
    out.push(h('div', { class: 'sheet-line' }, h('span', { class: 'sheet-gen' }, lbl),
      r.games.length ? h('span', null, ...r.games.map((v) => h('span', { class: 'easy-game', style: `border-color:${vColor(v)}` }, shortV(v)))) : null,
      h('span', null, [txt, r.cond, r.item ? 'objet : ' + r.item : ''].filter(Boolean).join(' · '))));
  }
  return out;
}

function renderEasy(content) {
  const list = items().filter((x) => !x.form && !x.female).filter(passFilters);
  const seg = (label, key, choices) => h('div', { class: 'easy-seg' }, h('span', { class: 'muted' }, label),
    ...choices.map(([k, l]) => h('button', { class: S.easy[key] === k ? 'on' : '', onclick: () => { S.easy[key] = k; persist(); renderContent(); } }, l)));
  content.append(h('div', { class: 'easy-ctrl' },
    seg('Choisir le jeu :', 'mode', [['simple', 'Le plus simple'], ['chance', 'Le plus de chances (%)']]),
    seg('Trier la liste :', 'sort', [['num', 'N° Pokédex'], ['chanceDesc', '% de chance ↓'], ['chanceAsc', '% de chance ↑'], ['cost', 'Les plus simples d\'abord']]),
    S.global.livingdex ? seg('Feuille living dex :', 'sheet', [[true, 'Afficher'], [false, 'Masquer']]) : null));
  const bestOf = new Map(list.map((it) => [it.sid, S.engine.easiest(it.sid, S.opts, S.easy.mode)]));
  const ch = (sid) => { const b = bestOf.get(sid)[0]; return b ? (b.chance ?? -1) : -2; };
  const co = (sid) => { const b = bestOf.get(sid)[0]; return b ? b.cost : 1e9; };
  if (S.easy.sort === 'chanceDesc') list.sort((a, b) => ch(b.sid) - ch(a.sid) || co(a.sid) - co(b.sid));
  if (S.easy.sort === 'chanceAsc') list.sort((a, b) => (ch(a.sid) < 0 ? 999 : ch(a.sid)) - (ch(b.sid) < 0 ? 999 : ch(b.sid)) || co(a.sid) - co(b.sid));
  if (S.easy.sort === 'cost') list.sort((a, b) => co(a.sid) - co(b.sid));
  content.append(h('div', { class: 'box' }, 'Pour chaque Pokémon, le jeu où il est le plus simple et le plus rapide à obtenir : le plus tôt dans l\'aventure, '
    + 'sans conditions, avec une bonne fréquence, sans évolution ni œuf si possible. Les deux suivants sont d\'autres jeux. '
    + '« Le plus de chances » choisit plutôt l\'endroit où il apparaît le plus souvent (cadeau ou Pokémon fixe = 100 %, ? = taux inconnu ; pour une évolution ou un œuf, c\'est le % de la forme de base). '
    + 'Les événements (distributions, tickets, bonus de sauvegarde, codes) ne sont jamais proposés : ils ne sont souvent plus disponibles. '
    + 'Les boutons Échanges / Œufs changent les possibilités. Clique sur une ligne pour la fiche complète.'));
  if (!list.length) { content.append(h('div', { class: 'empty' }, 'Aucun Pokémon ne correspond à ces filtres.')); renderProgress(); return; }
  const t = h('table', { class: 't easy-table' }, h('tr', null, h('th', null, ''), h('th', null, 'Pokémon'), h('th', null, S.easy.mode === 'chance' ? 'Le plus de chances' : 'Le plus simple'), h('th', null, 'Sinon'), S.easy.sheet ? h('th', null, 'Feuille living dex (4G / 5G / 6G)') : null));
  const LIMIT = 150;
  let shown = 0;
  const addRows = () => {
    for (const it of list.slice(shown, shown + LIMIT)) {
      const sp = S.core.species[it.sid];
      const best = bestOf.get(it.sid);
      const cs = caughtCtx(it);
      t.append(h('tr', { class: cs.c ? 'caught' : '', onclick: () => openDrawer(it.sid) },
        h('td', null, img(S.defForm[it.sid] && S.defForm[it.sid].spr, false, false, sp.fr)),
        h('td', null, h('div', { class: 'muted' }, it.num), h('b', null, sp.fr)),
        h('td', null, best[0] ? easyLine(best[0], true) : easyNone(best)),
        h('td', { class: 'easy-alt' }, ...best.slice(1, 3).map((r) => h('div', null, h('span', { class: 'easy-game', style: `border-color:${vColor(r.v)}` }, vName(r.v)), ' ', easyHow(r, true), ' ', chancePill(r)))),
        S.easy.sheet ? h('td', { class: 'easy-alt' }, ...sheetLines(it.sid, true)) : null));
    }
    shown += LIMIT;
  };
  addRows();
  content.append(t);
  if (shown < list.length) {
    const more = h('button', { class: 'ghost', style: 'margin:12px auto;display:block', onclick: () => { addRows(); if (shown >= list.length) more.remove(); } }, 'Afficher la suite');
    content.append(more);
  }
  renderProgress();
}

function renderRoute(content) {
  const v = S.view.v;
  const r = S.engine.route(v, S.opts);
  const st = S.engine.status(v);
  const g = S.core.games[v];
  const row = (sid, extra) => {
    const sp = S.core.species[sid];
    const info = st.get(sid);
    const key = String(sid);
    let where = '';
    if (extra) where = extra;
    else if (info.kind === 'evo' || info.kind === 'tradeEvo' || info.kind === 'egg') {
      where = (info.kind === 'egg' ? '' : 'Évolution de ' + S.core.species[info.via.from].fr + ' — ') + info.via.txt + (info.via.itemNote ? ' (' + info.via.itemNote + ')' : '');
    } else {
      const b = r.bestSpot(sid);
      if (b) where = `${b.areaFr || b.locFr} · ${methodShort(b)} · Niv. ${b.min}${b.max !== b.min ? '-' + b.max : ''}${b.rate && !b.unique ? ' · ' + rateTxt(b.method, b.rate) : ''}${b.give ? ' · contre ' + S.core.species[b.give].fr : ''}`;
      else if (info.note) where = info.note;
    }
    const done = isC(v, key);
    return h('div', { class: 'route-row' + (done ? ' done' : ''), title: 'Clic : capturé', onclick: () => { toggle(v, key); refreshAfterToggle(); } },
      h('span', { class: 'tg' + (done ? ' on' : '') }, done ? '✓' : ''),
      img(S.defForm[sid] && S.defForm[sid].spr, false, false),
      h('div', { class: 'rr-main' },
        h('div', { class: 'rr-name' }, sp.fr, ' ',
          info.kind === 'unique' ? h('span', { class: 'pill k-unique' }, info.uniqueLabel || 'Unique') : null,
          info.kind === 'egg' ? h('span', { class: 'pill k-egg' }, 'Œuf') : null,
          info.exclusiveHere ? h('span', { class: 'pill excl' }, 'Exclusif') : null),
        h('div', { class: 'rr-where', title: where }, where)),
      matchRow({ sid, key }),
      h('button', { class: 'tg menu', title: 'Ouvrir la fiche', onclick: (e) => { e.stopPropagation(); openDrawer(sid); } }, '⋯'));
  };
  if (!r.curated) {
    content.append(h('div', { class: 'box' }, 'La route par étapes n\'est pas encore saisie pour ce jeu. En attendant, voici les Pokémon regroupés par lieu (meilleur taux de rencontre).'));
    const byLoc = new Map();
    for (const { sid } of S.engine.scope(v, S.opts.scope)) {
      const info = st.get(sid);
      if (!info.avail || info.needTrade) continue;
      const b = info.entries.slice().sort((a, b2) => (b2.rate || 0) - (a.rate || 0))[0];
      const k = b ? b.locFr : (info.kind === 'egg' ? 'Œufs' : info.kind === 'evo' ? 'Évolutions' : 'Autres');
      if (!byLoc.has(k)) byLoc.set(k, []);
      byLoc.get(k).push(sid);
    }
    const keys = [...byLoc.keys()].sort((a, b) => (['Évolutions', 'Œufs', 'Autres'].includes(a) ? 1 : 0) - (['Évolutions', 'Œufs', 'Autres'].includes(b) ? 1 : 0) || a.localeCompare(b, 'fr'));
    for (const k of keys) {
      const seg = h('div', { class: 'route-seg' }, h('div', { class: 'route-head' }, h('h3', null, k), h('span', { class: 'badge' }, byLoc.get(k).length + ' Pokémon')));
      const l = h('div', { class: 'route-list' });
      byLoc.get(k).forEach((sid) => l.append(row(sid)));
      seg.append(l);
      content.append(seg);
    }
    return;
  }
  const cur = S.engine.cur(v);
  const groups = S.engine.ref(cur.choiceGroups, v) || [];
  const shownGroups = new Set();
  for (const s of r.segments) {
    if (!s.list.length) continue;
    const left = s.list.filter((sid) => !isC(v, String(sid))).length;
    const seg = h('div', { class: 'route-seg' },
      h('div', { class: 'route-head' },
        h('div', { style: 'display:flex;align-items:center' }, h('span', { class: 'route-step' }, s.id), h('h3', null, s.name)),
        h('span', { class: 'badge' }, (s.badge ? s.badge + ' · ' : '') + (s.postgame ? 'Après la ligue · ' : '') + `${left} restant${left > 1 ? 's' : ''} / ${s.list.length}`)));
    for (const gr of groups) {
      if (shownGroups.has(gr.label) || !gr.species.some((x) => s.list.includes(x))) continue;
      shownGroups.add(gr.label);
      seg.append(h('div', { class: 'choice-box' }, `${gr.label} : ${gr.species.map((x) => S.core.species[x].fr).join(' / ')}`,
        S.opts.trade ? ' — les autres demandent un échange.' : ' — un seul compte sans échange.'));
    }
    const l = h('div', { class: 'route-list' });
    s.list.forEach((sid) => l.append(row(sid)));
    seg.append(l);
    content.append(seg);
  }
  const extraSec = (title, list, why) => {
    if (!list.length) return;
    const seg = h('div', { class: 'route-seg' }, h('div', { class: 'route-head' }, h('h3', null, title), h('span', { class: 'badge' }, list.length + ' Pokémon')));
    const l = h('div', { class: 'route-list' });
    list.forEach((sid) => l.append(row(sid, why(sid))));
    seg.append(l);
    content.append(seg);
  };
  const tradeWhy = (sid) => {
    const i = st.get(sid);
    if (i.kind === 'exclusive') return 'Exclusif à ' + i.exclusiveTo.map((x) => S.core.games[x].name).join(' / ');
    if (i.kind === 'tradeEvo') return 'Évolution de ' + S.core.species[i.via.from].fr + ' — ' + tradeEvoLabel(i);
    return i.note || 'Échange nécessaire';
  };
  if (S.opts.trade) extraSec('Échanges nécessaires', r.extra.trade, tradeWhy);
  extraSec('Œufs (désactivés)', r.extra.egg, (sid) => st.get(sid).via.txt);
  if (S.opts.event) extraSec('Événements / Pokémon GO', r.extra.event, (sid) => st.get(sid).note || '');
  extraSec('Non classés', r.extra.unsorted, () => 'Étape non renseignée');
  extraSec('Introuvables dans ce jeu', r.extra.none, () => 'Transfert depuis un autre jeu');
  if (!S.opts.trade && r.extra.trade.length) content.append(h('div', { class: 'box muted' }, `${r.extra.trade.length} Pokémon demandent un échange (option « Échanges » désactivée).`));
  if (g.dlc) content.append(h('div', { class: 'box muted' }, 'Ce DLC compte aussi les rencontres du jeu de base de la même version.'));
}

function rateTxt(method, rate) {
  if (!rate || method === 'sv-fixed' || method === 'sv-tera') return '';
  return /^sv-/.test(method) ? 'poids ' + rate : rate + ' %';
}

function methodShort(e) {
  const m = {
    walk: 'Herbes / grotte', 'old-rod': 'Canne', 'good-rod': 'Super Canne', 'super-rod': 'Méga Canne', surf: 'Surf',
    gift: 'Cadeau', static: 'Fixe', 'npc-trade': 'Échange PNJ', pokeflute: 'Poké Flûte', 'rock-smash': 'Éclate-Roc',
    headbutt: "Coup d'Boule", overworld: 'Visible', 'overworld-water': 'Visible (eau)', 'overworld-flying': 'Visible (vol)',
    'overworld-special': 'Visible (rare)', 'sv-land': 'Au sol', 'sv-water': 'Surface de l\'eau', 'sv-underwater': 'Sous l\'eau',
    'sv-overland': 'En vol bas', 'sv-sky': 'Dans le ciel', 'sv-fixed': 'Fixe (réapparaît)', 'sv-tera': 'Fixe Téracristal', 'overworld-flying-special': 'Visible (vol, rare)', 'overworld-water-special': 'Visible (eau, rare)',
  }[e.method];
  return m || e.methodFr;
}

// ------------------------------------------------------------------ fiche détaillée
function openDrawer(sid) {
  S.sel = sid;
  if (S.view.type === 'version') S.drawer.ctx = S.view.v;
  else if (S.view.type === 'family') S.drawer.ctx = viewVersions()[0];
  else if (!S.drawer.ctx || S.drawer.ctx === 'all') S.drawer.ctx = 'all';
  S.drawer.female = false;
  if (S.drawer.tab !== 'map') S.drawer.mapLoc = null;
  $('drawer').classList.remove('closed');
  renderDrawer();
  document.querySelectorAll('.card.sel').forEach((c) => c.classList.remove('sel'));
}

function renderDrawer() {
  const sid = S.sel;
  const sp = S.core.species[sid];
  const body = $('drawer-body');
  body.innerHTML = '';
  const df = S.defForm[sid];
  const pk = S.core.pokemon[S.defPk[sid]];
  const head = h('div', { class: 'd-head' });
  const spriteBox = h('div', { class: 'd-sprite' }, img(df && df.spr, S.drawer.shiny, S.drawer.female, sp.fr));
  const info = h('div', null,
    h('div', { class: 'muted', style: 'font-size:12px' }, '#' + pad(sid, 4) + ' · ' + sp.gen + 'e génération'),
    h('div', { class: 'd-name' }, sp.fr),
    h('div', { class: 'd-sub' }, sp.genus + (sp.en ? ' · ' + sp.en : '')),
    h('div', { class: 'meta' }, ...pk.types.map(typeBadge)));
  const sw = h('div', { class: 'd-switch' },
    h('button', { class: S.drawer.shiny ? '' : 'on', onclick: () => { S.drawer.shiny = false; renderDrawer(); } }, 'Normal'),
    h('button', { class: S.drawer.shiny ? 'on' : '', onclick: () => { S.drawer.shiny = true; renderDrawer(); } }, '★ Shiny'));
  if (sp.gd) sw.append(
    h('button', { class: S.drawer.female ? '' : 'on', onclick: () => { S.drawer.female = false; renderDrawer(); } }, '♂ Mâle'),
    h('button', { class: S.drawer.female ? 'on' : '', onclick: () => { S.drawer.female = true; renderDrawer(); } }, '♀ Femelle'));
  info.append(sw);
  head.append(spriteBox, info);
  body.append(head);
  if (sp.gd && !(df && df.spr && df.spr.f)) body.append(h('div', { class: 'box', style: 'margin:10px 20px 0' }, 'Différence mâle/femelle légère (pas de sprite distinct disponible).'));

  // contexte de jeu
  const ctx = h('div', { class: 'd-ctx' }, h('span', { class: 'muted' }, 'Jeu :'));
  const sel = h('select', { onchange: (e) => { S.drawer.ctx = e.target.value === 'all' ? 'all' : +e.target.value; renderDrawer(); } });
  sel.append(h('option', { value: 'all' }, 'Tous les jeux'));
  for (const fam of S.core.families) {
    const og = h('optgroup', { label: fam.name });
    for (const v of [...fam.versions, ...(fam.extra || []), ...(fam.dlc || []).flatMap((d) => d.versions)]) {
      og.append(h('option', { value: v, selected: S.drawer.ctx === v }, vName(v)));
    }
    sel.append(og);
  }
  ctx.append(sel);
  body.append(ctx);

  const tabs = h('div', { class: 'd-tabs' });
  const T = [['obt', 'Obtention'], ['map', 'Carte'], ['evo', 'Évolution'], ['ab', 'Talents'], ['mv', 'Attaques'], ['forms', 'Formes'], ['balls', 'Balls'], ['track', 'Suivi']];
  for (const [k, l] of T) tabs.append(h('button', { class: 'd-tab' + (S.drawer.tab === k ? ' active' : ''), onclick: () => { S.drawer.tab = k; renderDrawer(); } }, l));
  body.append(tabs);
  const pane = h('div', { class: 'd-body' });
  body.append(pane);
  $('drawer').classList.toggle('wide', S.drawer.tab === 'map');
  const fn = { map: paneMap, obt: paneObtention, evo: paneEvolution, ab: paneAbilities, mv: paneMoves, forms: paneForms, balls: paneBalls, track: paneTrack }[S.drawer.tab];
  fn(pane, sid);
}

function genderText(gr) {
  if (gr === -1) return 'Asexué';
  if (gr === 0) return '100 % mâle';
  if (gr === 8) return '100 % femelle';
  return `${(100 - gr * 12.5).toFixed(1).replace('.0', '')} % ♂ · ${(gr * 12.5).toFixed(1).replace('.0', '')} % ♀`;
}

function versionBlock(v, sid) {
  const i = S.engine.status(v).get(sid);
  const g = S.core.games[v];
  const box = h('div', { class: 'box' });
  const lbl = !i ? '—' : i.kind === 'unique' ? (i.uniqueLabel || 'Unique') : KIND_LABEL[i.kind];
  box.append(h('h4', null, h('span', null, vName(v)),
    h('span', null, h('span', { class: 'pill ' + (KIND_CLASS[i && i.kind] || '') }, lbl), ' ',
      i && i.avail ? h('span', { class: 'pill' + (i.post ? ' post' : '') }, S.engine.stageLabel(i, v)) : null)));
  if (!i) return box;
  if (i.kind === 'exclusive') box.append(h('div', null, 'Exclusif à ' + i.exclusiveTo.map((x) => S.core.games[x].name).join(' / ') + ' : échange nécessaire.'));
  if (i.exclusiveHere) box.append(h('div', null, 'Exclusif à cette version.'));
  if (i.via) box.append(h('div', null, (i.kind === 'egg' ? '' : 'Évolution de ' + S.core.species[i.via.from].fr + ' : ') + i.via.txt + (i.via.itemNote ? ' — ' + i.via.itemNote : '')));
  if (i.choice) box.append(h('div', { class: 'note' }, i.choice.label + ' : ' + i.choice.species.map((x) => S.core.species[x].fr).join(' / ')));
  if (i.note) box.append(h('div', { class: 'note' }, i.note));
  if (i.entries.length) {
    const t = h('table', { class: 't' }, h('tr', null, h('th', null, 'Lieu'), h('th', null, 'Méthode'), h('th', null, 'Niv.'), h('th', null, 'Taux')));
    const seen = new Set();
    for (const e of i.entries.slice().sort((a, b) => (a.seg ?? 99) - (b.seg ?? 99) || (b.rate || 0) - (a.rate || 0))) {
      const pkf = S.core.pokemon[e.pid];
      const formTxt = pkf && !pkf.def ? ' [' + (S.core.forms[pkf.forms[0]].fname || pkf.ident) + ']' : '';
      const conds = e.conds.map((c) => S.core.encConds[c]).join(', ');
      const k = [e.locFr, e.areaFr, e.method, e.min, e.max, conds, formTxt].join('|');
      if (seen.has(k)) continue;
      seen.add(k);
      t.append(h('tr', null,
        h('td', null, (e.areaFr || e.locFr + (e.areaIdent ? ' (' + e.areaIdent + ')' : '')) + formTxt + (e.fromBase ? ' (jeu de base)' : '')),
        h('td', null, methodShort(e) + (conds ? ' · ' + conds : '') + (e.give ? ' · contre ' + S.core.species[e.give].fr : '')),
        h('td', null, e.min === e.max ? e.min : `${e.min}-${e.max}`),
        h('td', null, e.unique ? '—' : rateTxt(e.method, e.rate) || '—')));
    }
    box.append(t);
  }
  return box;
}

function paneObtention(pane, sid) {
  const sp = S.core.species[sid];
  const kv = h('dl', { class: 'kv' },
    h('dt', null, 'Taux de capture'), h('dd', null, `${sp.cap} / 255`),
    h('dt', null, 'Répartition'), h('dd', null, genderText(sp.gr)),
    h('dt', null, 'Groupes Œuf'), h('dd', null, sp.eggs.map((e) => S.core.eggGroups[e]).join(', ') || '—'),
    h('dt', null, 'Éclosion'), h('dd', null, sp.hatch != null ? `${sp.hatch} cycles` : '—'),
    h('dt', null, 'Catégorie'), h('dd', null, [sp.myth && 'Fabuleux', sp.leg && 'Légendaire', sp.baby && 'Bébé',
      S.engine.sets.starters.has(sid) && 'Starter', S.engine.sets.fossils.has(sid) && 'Fossile',
      S.engine.sets.ub.has(sid) && 'Ultra-Chimère', S.engine.sets.paradox.has(sid) && 'Paradoxe'].filter(Boolean).join(', ') || 'Standard'));
  pane.append(kv);
  if (S.drawer.ctx === 'all') {
    const best = S.engine.easiest(sid, S.opts, S.easy.mode).slice(0, 5);
    const eb = h('div', { class: 'box easy-box' }, h('h4', null, S.easy.mode === 'chance' ? 'Le plus de chances' : 'Le plus simple',
      h('span', { class: 'muted' }, S.easy.mode === 'chance' ? 'du % le plus haut au plus bas' : 'du plus simple au moins simple')));
    if (!best.length && !best.eventOnly) eb.append(h('div', { class: 'muted' }, 'Aucun jeu ne permet de l\'obtenir avec les options actives (échanges, œufs).'));
    best.forEach((r, i) => eb.append(easyLine(r, i === 0)));
    if (!best.length && best.eventOnly) eb.append(easyNone(best));
    pane.append(eb);
    const sl = sheetLines(sid, true);
    if (sl.length) pane.append(h('div', { class: 'box easy-box' }, h('h4', null, 'Feuille « National living dex »',
      h('a', { href: S.global.livingdex.url, target: '_blank', class: 'muted' }, 'ouvrir')), ...sl));
    for (const fam of S.core.families) {
      const groups = [{ name: fam.name, vs: [...fam.versions] }, ...(fam.dlc || []).map((d) => ({ name: d.name, vs: d.versions }))];
      for (const gr of groups) {
        const parts = gr.vs.map((v) => {
          const i = S.engine.status(v).get(sid);
          const lbl = !i ? '—' : i.kind === 'unique' ? (i.uniqueLabel || 'Unique') : KIND_LABEL[i.kind];
          return h('span', { class: 'pill ' + (KIND_CLASS[i && i.kind] || ''), style: 'cursor:pointer', onclick: () => { S.drawer.ctx = v; renderDrawer(); } }, S.core.games[v].name + ' : ' + lbl);
        });
        pane.append(h('div', { class: 'box' }, h('h4', null, gr.name), h('div', { class: 'meta' }, ...parts)));
      }
    }
    return;
  }
  const v = S.drawer.ctx;
  const extra = S.core.games[v].extra;
  const sibs = [v, ...S.engine.siblings(v).filter((x) => !!S.core.games[x].extra === !!extra)];
  for (const x of sibs) pane.append(versionBlock(x, sid));
}

function paneEvolution(pane, sid) {
  const sp = S.core.species[sid];
  const chain = Object.values(S.core.species).filter((s) => s.chain === sp.chain);
  const root = chain.find((s) => !s.from || !chain.some((c) => c.id === s.from)) || sp;
  const ctxV = S.drawer.ctx === 'all' ? null : S.drawer.ctx;
  const tree = h('div', { class: 'evo-tree' });
  const walk = (s, depth) => {
    const node = h('div', { class: 'evo-node' + (s.id === sid ? ' cur' : ''), style: `margin-left:${depth * 26}px`, onclick: () => openDrawer(s.id) },
      img(S.defForm[s.id] && S.defForm[s.id].spr, false, false));
    const txt = h('div', null, h('div', { style: 'font-weight:600' }, s.fr));
    if (s.from) {
      const rows = S.core.evolutions[s.id] || [];
      for (const r of rows) txt.append(h('div', { class: 'evo-cond' }, '← ' + r.txt + (r.form ? ' [' + (S.core.forms[r.form] ? S.core.forms[r.form].name : 'forme') + ']' : '')));
      if (!rows.length) txt.append(h('div', { class: 'evo-cond' }, '← condition non renseignée'));
    }
    if (ctxV) {
      const i = S.engine.status(ctxV).get(s.id);
      if (i) txt.append(h('span', { class: 'pill ' + (KIND_CLASS[i.kind] || '') }, S.core.games[ctxV].name + ' : ' + (i.kind === 'unique' ? i.uniqueLabel : KIND_LABEL[i.kind])));
    }
    node.append(txt);
    tree.append(node);
    chain.filter((c) => c.from === s.id).sort((a, b) => a.id - b.id).forEach((c) => walk(c, depth + 1));
  };
  walk(root, 0);
  pane.append(tree);
  if (chain.length === 1) pane.append(h('div', { class: 'muted', style: 'margin-top:10px' }, 'Ce Pokémon n\'évolue pas.'));
}

function abilitiesFor(pk, gen) {
  let list = pk.ab.map((x) => x.slice());
  const pastGens = Object.keys(pk.abpast || {}).map(Number).filter((g) => g >= gen).sort((a, b) => a - b);
  if (pastGens.length) {
    const past = pk.abpast[pastGens[0]];
    for (const [aid, hidden, slot] of past) {
      list = list.filter((x) => x[2] !== slot);
      if (aid) list.push([aid, hidden, slot]);
    }
  }
  return list.filter(([aid, hidden]) => S.core.abilities[aid] && S.core.abilities[aid].gen <= gen && (!hidden || gen >= 5)).sort((a, b) => a[2] - b[2]);
}

function paneAbilities(pane, sid) {
  const v = S.drawer.ctx === 'all' ? Math.max(...allMainVersions().filter((x) => S.core.games[x].mvg !== 30 && S.core.games[x].mvg !== 31)) : S.drawer.ctx;
  const g = S.core.games[v];
  if (S.global.noAbilityVg.includes(g.vg)) { pane.append(h('div', { class: 'box' }, S.global.hiddenAbility[g.vg] || 'Pas de talents dans ce jeu.')); return; }
  if (S.drawer.ctx === 'all') pane.append(h('div', { class: 'muted', style: 'margin-bottom:8px' }, 'Talents actuels (choisis un jeu pour voir ceux de sa génération).'));
  const sp = S.core.species[sid];
  const pres = new Set(S.core.presence[g.mvg] || []);
  for (const pid of sp.vars) {
    const pk = S.core.pokemon[pid];
    if (!pk.def && pres.size && !pres.has(pid)) continue;
    if (/-mega|-gmax/.test(pk.ident) && !pres.has(pid)) continue;
    const ab = abilitiesFor(pk, g.gen);
    if (!ab.length) continue;
    const box = h('div', { class: 'box' }, h('h4', null, pk.def ? sp.fr : (S.core.forms[pk.forms[0]] || {}).name || pk.ident));
    for (const [aid, hidden] of ab) {
      const a = S.core.abilities[aid];
      box.append(h('div', { style: 'margin:6px 0' },
        h('b', null, a.fr), hidden ? h('span', { class: 'pill k-event', style: 'margin-left:6px' }, 'Talent caché') : null,
        h('div', { class: 'muted', style: 'font-size:12px' }, a.d)));
    }
    pane.append(box);
  }
  const note = S.global.hiddenAbility[g.vg];
  if (note) pane.append(h('div', { class: 'note' }, 'Obtention du talent caché dans ' + g.name + ' : ' + note));
}

async function paneMoves(pane, sid) {
  const v = S.drawer.ctx === 'all' ? 40 : S.drawer.ctx;
  const g = S.core.games[v];
  if (!S.movesVg[g.mvg]) S.movesVg[g.mvg] = (await readJSON(`moves/${g.mvg}.json`)) || { machines: {}, learn: {} };
  if (S.sel !== sid || S.drawer.tab !== 'mv') return;
  const data = S.movesVg[g.mvg];
  const sp = S.core.species[sid];
  const pids = sp.vars.filter((p) => data.learn[p]);
  if (!pids.length) { pane.append(h('div', { class: 'box' }, 'Pas de données d\'attaques pour ' + g.name + '.')); return; }
  if (S.drawer.ctx === 'all') pane.append(h('div', { class: 'muted', style: 'margin-bottom:8px' }, 'Attaques dans Écarlate/Violet (choisis un jeu pour un autre).'));
  let pid = S.drawer.mvPk && pids.includes(S.drawer.mvPk) ? S.drawer.mvPk : pids[0];
  if (pids.length > 1) {
    const s = h('select', { style: 'margin-bottom:10px', onchange: (e) => { S.drawer.mvPk = +e.target.value; renderDrawer(); } });
    for (const p of pids) s.append(h('option', { value: p, selected: p === pid }, S.core.pokemon[p].def ? sp.fr : (S.core.forms[S.core.pokemon[p].forms[0]] || {}).name));
    pane.append(s);
  }
  const list = data.learn[pid];
  const byM = new Map();
  for (const [mid, meth, lvl] of list) { if (!byM.has(meth)) byM.set(meth, []); byM.get(meth).push([mid, lvl]); }
  const order = [1, 4, 2, 3];
  const methods = [...byM.keys()].sort((a, b) => (order.indexOf(a) + 1 || 9) - (order.indexOf(b) + 1 || 9));
  for (const m of methods) {
    let rows = byM.get(m);
    if (m === 1) rows.sort((a, b) => a[1] - b[1]);
    if (m === 4) rows.sort((a, b) => (data.machines[a[0]] || 'ZZ').localeCompare(data.machines[b[0]] || 'ZZ', 'fr', { numeric: true }));
    const t = h('table', { class: 't' }, h('tr', null, h('th', null, m === 1 ? 'Niv.' : m === 4 ? 'CT' : ''), h('th', null, 'Attaque'), h('th', null, 'Type'), h('th', null, 'Cat.'), h('th', null, 'Puis.'), h('th', null, 'Préc.'), h('th', null, 'PP')));
    for (const [mid, lvl] of rows) {
      const mv = S.moves.moves[mid];
      if (!mv) continue;
      t.append(h('tr', null, h('td', null, m === 1 ? (lvl || 'Évo') : m === 4 ? (data.machines[mid] || '') : ''),
        h('td', null, mv[0]), h('td', null, mv[1] ? typeBadge(mv[1]) : ''), h('td', null, CLASS_FR[mv[2]] || ''),
        h('td', null, mv[3] ?? '—'), h('td', null, mv[4] ?? '—'), h('td', null, mv[5] ?? '')));
    }
    pane.append(h('div', { class: 'box' }, h('h4', null, S.moves.methods[m] || 'Autre'), t));
  }
}

function formFamilies(f) {
  const out = [];
  for (const fam of S.core.families) {
    const vs = [...fam.versions, ...(fam.dlc || []).flatMap((d) => d.versions)];
    if (vs.some((v) => S.engine.formsIn(v, f.sp, true).some((x) => x.id === f.id))) out.push(fam);
  }
  return out;
}

function paneForms(pane, sid) {
  const sp = S.core.species[sid];
  const grid = h('div', { class: 'forms-grid' });
  const df = S.defForm[sid];
  const cardF = (spr, name, sub, female) => h('div', { class: 'form-card' }, img(spr, S.drawer.shiny, female), h('div', { style: 'font-weight:600' }, name), h('div', { class: 'muted' }, sub));
  grid.append(cardF(df && df.spr, sp.fr, 'Forme de base'));
  if (sp.gd && df && df.spr && df.spr.f) grid.append(cardF(df.spr, sp.fr + ' ♀', 'Différence femelle', true));
  const forms = [];
  for (const pid of sp.vars) for (const fid of S.core.pokemon[pid].forms) { const f = S.core.forms[fid]; if (!f.def) forms.push(f); }
  forms.sort((a, b) => a.order - b.order);
  for (const f of forms) {
    const fams = formFamilies(f).map((x) => x.name).join(' · ');
    grid.append(cardF(f.spr, f.fname || f.name, [f.mega && 'Méga', f.battle && 'Combat uniquement', /gmax/.test(f.ident) && 'Gigamax'].filter(Boolean).join(' · ') + (fams ? ' — ' + fams : '')));
  }
  pane.append(grid);
  if (!forms.length && !sp.gd) pane.append(h('div', { class: 'muted', style: 'margin-top:10px' }, 'Pas de forme alternative.'));
}

function matchSection(pane, sid) {
  const v = S.drawer.ctx === 'all' ? null : S.drawer.ctx;
  const sp = S.core.species[sid];
  const box = h('div', { class: 'box' }, h('h4', null, 'Balls assorties', h('span', { class: 'muted', style: 'font-weight:400;font-size:11px' }, 'couleur / thème, légales')));
  const line = (label, it, shiny) => {
    const balls = matchFor(it, shiny);
    if (!balls.length) return;
    const wrap = h('div', { class: 'balls' });
    for (const b of balls) {
      const ok = !v || ballUsable(b, v);
      wrap.append(h('span', { class: 'ball' + (ok ? '' : ' no'), title: ok ? '' : 'Pas utilisable dans ' + S.core.games[v].name }, ballImg(b), S.core.ballNames[b] || b));
    }
    box.append(h('div', { class: 'match-grid' }, h('span', { class: 'muted' }, label), wrap));
  };
  line('Normal', { sid }, false);
  line('★ Shiny', { sid }, true);
  if (S.match.female[sid]) { line('♀', { sid, female: true }, false); line('♀ ★', { sid, female: true }, true); }
  const forms = [];
  for (const pid of sp.vars) for (const fid of S.core.pokemon[pid].forms) if (S.match.forms[fid]) forms.push(S.core.forms[fid]);
  for (const f of forms.slice(0, 30)) { line(f.fname || f.name, { sid, form: f }, false); }
  if (v) box.append(h('div', { class: 'muted', style: 'font-size:11px;margin-top:4px' }, 'Grisé : Ball impossible à utiliser dans ' + S.core.games[v].name + '.'));
  box.append(h('div', { class: 'muted', style: 'font-size:11px;margin-top:4px' }, 'Source : feuille « Legal Matching Pokéballs 2.1 » (u/OracleLink).'));
  pane.append(box);
}

function paneBalls(pane, sid) {
  matchSection(pane, sid);
  if (S.drawer.ctx === 'all') { pane.append(h('div', { class: 'box' }, 'Choisis un jeu pour voir les Balls utilisables.')); return; }
  const v = S.drawer.ctx;
  const g = S.core.games[v];
  const B = S.core.balls[g.vg];
  if (!B) { pane.append(h('div', { class: 'box' }, 'Liste des Balls non renseignée pour ce jeu.')); return; }
  const info = S.engine.status(v).get(sid);
  const rules = [];
  let allowed = new Set(B.balls);
  if (!B.stored) rules.push('Dans ce jeu, la Ball n\'est pas enregistrée sur le Pokémon : pas de Ball assortie possible.');
  if (info && info.avail) {
    const es = info.entries;
    const wild = es.filter((e) => !e.unique);
    const safari = es.filter((e) => /safari|great-marsh/.test((S.core.locations[e.lid] || {}).ident || ''));
    if (info.kind === 'unique' && es.every((e) => ['gift', 'npc-trade', 'gift-egg'].includes(e.method))) {
      rules.push('Reçu en cadeau ou par échange PNJ : la Ball est imposée par le jeu.');
      allowed = new Set();
    } else if (safari.length && safari.length === wild.length && B.balls.includes('safari-ball')) {
      rules.push('Uniquement au Parc Safari / Grand Marais : Safari Ball seulement.');
      allowed = new Set(['safari-ball']);
    } else if (safari.length) rules.push('Aussi capturable au Parc Safari (Safari Ball) ; ailleurs, toutes les Balls du jeu.');
    if (info.kind === 'egg') rules.push(g.gen >= 6 ? 'Par œuf : le bébé hérite de la Ball de la mère (ou du parent non-Métamorph à partir de la 7e génération).' : 'Par œuf : naît dans une Poké Ball.');
    if (info.kind === 'evo' || info.kind === 'tradeEvo') rules.push('Par évolution : garde la Ball de ' + S.core.species[info.via.from].fr + '.');
    if (S.engine.sets.ub.has(sid)) rules.push('Ultra-Chimère : l\'Ultra Ball (Beast Ball) a un bonus ×5, les autres Balls ×0,1.');
    if (info.kind === 'unique' && es.some((e) => e.method === 'static')) rules.push('Pokémon fixe : une seule tentative par sauvegarde (sauf réapparition après la ligue).');
  } else if (info && !info.avail) rules.push('Pas capturable dans ce jeu.');
  for (const r of rules) pane.append(h('div', { class: 'box' }, r));
  const wrap = h('div', { class: 'balls' });
  for (const b of B.balls) {
    const lim = (B.limited || []).includes(b);
    wrap.append(h('span', { class: 'ball' + (lim ? ' lim' : '') + (allowed.has(b) ? '' : ' no'), title: lim ? 'Quantité limitée dans ce jeu' : '' }, ballImg(b), S.core.ballNames[b]));
  }
  pane.append(h('h4', { style: 'margin:14px 0 8px' }, 'Balls du jeu'), wrap);
  if ((B.limited || []).length) pane.append(h('div', { class: 'muted', style: 'font-size:12px;margin-top:8px' }, 'Bordure en pointillés : Ball disponible en quantité limitée.'));
}

function paneTrack(pane, sid) {
  const key = String(sid);
  const row = (v, label, present) => {
    const g = S.core.games[v];
    const r = rec(v, key) || {};
    const balls = g && S.core.balls[g.vg];
    const el = h('div', { class: 'track-row', style: present ? '' : 'opacity:.4' },
      h('button', { class: 'tg' + (isC(v, key) ? ' on' : ''), onclick: () => { toggle(v, key); refreshAfterToggle(); } }, '●'),
      h('button', { class: 'tg star' + (isS(v, key) ? ' on' : ''), onclick: () => { toggle(v, key, true); refreshAfterToggle(); } }, '★'),
      h('span', { class: 'tr-name' }, label));
    if (balls && balls.stored) {
      const s = h('select', { onchange: (e) => { setRec(v, key, { b: e.target.value || undefined }); } }, h('option', { value: '' }, 'Ball…'));
      const mt = new Set([...matchFor({ sid }, false), ...matchFor({ sid }, true)]);
      for (const b of balls.balls) s.append(h('option', { value: b, selected: r.b === b }, S.core.ballNames[b] + (mt.has(b) ? ' ★ assortie' : '')));
      el.append(s);
    }
    return el;
  };
  pane.append(h('div', { class: 'muted', style: 'margin-bottom:8px;font-size:12px' }, 'Coche ce Pokémon dans chaque jeu où tu l\'as. Le Pokédex national et les groupes se remplissent tout seuls.'));
  pane.append(row('global', 'Pokédex national (coche directe)', true));
  for (const fam of S.core.families) {
    pane.append(h('div', { class: 'nav-sub', style: 'padding-left:0' }, fam.name));
    const vs = [...fam.versions, ...(fam.extra || []), ...(fam.dlc || []).flatMap((d) => d.versions)];
    for (const v of vs) {
      const inGame = S.engine.scope(v, 'national').some((x) => x.sid === sid);
      pane.append(row(v, vName(v), inGame));
    }
  }
}

// ------------------------------------------------------------------ carte interactive
const TOWN_EXTRA = new Set(['postwick', 'wedgehurst', 'motostoke', 'turffield', 'hulbury', 'hammerlocke', 'stow-on-side', 'ballonlea',
  'circhester', 'spikemuth', 'wyndon', 'freezington', 'master-dojo', 'one-island', 'four-island', 'five-island', 'three-isle-port',
  'indigo-plateau', 'ever-grande-city', 'seafolk-village', 'tapu-village', 'outskirt-stand', 'agate-village', 'gateon-port',
  'sv-cabo-poco', 'sv-mesagoza', 'sv-los-platos', 'sv-cortondo', 'sv-artazon', 'sv-levincia', 'sv-alfornada', 'sv-zapapico',
  'sv-cascarrafa', 'sv-porto-marinada', 'sv-medali', 'sv-montenevera', 'sv-mossui-town', 'sv-central-plaza', 'sv-savanna-plaza',
  'sv-coastal-plaza', 'sv-canyon-plaza', 'sv-polar-plaza', 'sv-naranja-academy', 'sv-uva-academy', 'sv-pok-mon-league-paldea']);
function nodeKind(id) {
  if (id[0] === '@' || /-(town|city|village)$/.test(id) || TOWN_EXTRA.has(id)) return 'town';
  if (/route/.test(id)) return 'route';
  return 'spot';
}
// lieu -> Pokémon rencontrés dans une version (avec les zones précises)
function locIndex(v) {
  S.locIdx = S.locIdx || {};
  if (S.locIdx[v]) return S.locIdx[v];
  const idx = {};
  const enc = S.engine.enc[v] || {};
  const cur = S.engine.cur(v);
  for (const [pid, list] of Object.entries(enc)) {
    const pk = S.core.pokemon[pid];
    if (!pk) continue;
    for (const [area, method, conds, min, max, rate] of list) {
      const a = S.core.areas[area];
      if (!a) continue;
      const loc = S.core.locations[a.l];
      const m = S.core.encMethods[method];
      const L = (idx[loc.ident] = idx[loc.ident] || { lid: a.l, ident: loc.ident, name: (cur && cur.locationNames[loc.ident]) || loc.fr, list: [] });
      L.list.push({ sid: pk.sp, pid: +pid, area, areaFr: a.fr, areaIdent: a.ident, method: m.ident, methodFr: m.fr, conds, min, max, rate });
    }
  }
  return (S.locIdx[v] = idx);
}
function nodeName(id, v, node) {
  if (id[0] === '@') return id.slice(1);
  if (node && node.name) return node.name;
  const idx = locIndex(v);
  if (idx[id]) return idx[id].name;
  const l = Object.values(S.core.locations).find((x) => x.ident === id);
  return l ? l.fr : id;
}
function routeNum(id) { const m = id.match(/route-(\d+)/); return m ? m[1] : ''; }

function mapContextVersion(sid) {
  if (S.drawer.ctx !== 'all') return S.drawer.ctx;
  for (const v of allMainVersions().sort((a, b) => b - a)) {
    const i = S.engine.status(v).get(sid);
    if (i && i.entries && i.entries.some((e) => !e.fromBase)) return v;
  }
  return null;
}

function paneMap(pane, sid) {
  return renderMapInto(pane, sid, mapContextVersion(sid), S.drawer, renderDrawer);
}

function renderMapInto(pane, sid, v, st, rerender) {
  if (!v) { pane.append(h('div', { class: 'box' }, 'Choisis un jeu en haut pour afficher sa carte.')); return; }
  const g = S.core.games[v];
  const keys = S.maps.byFamily[g.dlc || g.fam] || [];
  if (!keys.length || !S.engine.hasEncounterData(v)) {
    pane.append(h('div', { class: 'box' }, 'Pas de carte pour ' + vName(v) + ' : la base de données n\'a pas les lieux de capture de ce jeu.'));
    return;
  }
  if (st === S.drawer && S.drawer.ctx === 'all') pane.append(h('div', { class: 'muted', style: 'margin-bottom:8px;font-size:12px' }, 'Carte de ' + vName(v) + ' (choisis un autre jeu en haut si besoin).'));
  const idx = locIndex(v);
  // carte affichée : celle choisie, sinon celle où ce Pokémon apparaît
  let mk = st.mapKey && keys.includes(st.mapKey) ? st.mapKey : null;
  if (!mk) mk = keys.find((k) => S.maps.maps[k].nodes.some((n) => idx[n.id] && idx[n.id].list.some((x) => x.sid === sid))) || keys[0];
  const map = S.maps.maps[mk];
  if (keys.length > 1) {
    const sw = h('div', { class: 'd-switch', style: 'margin:0 0 8px' });
    for (const k of keys) sw.append(h('button', { class: k === mk ? 'on' : '', onclick: () => { st.mapKey = k; st.mapLoc = null; rerender(); } }, S.maps.maps[k].name));
    pane.append(sw);
  }
  const pos = {};
  for (const n of map.nodes) pos[n.id] = n;
  const NS = 'http://www.w3.org/2000/svg';
  const sv = (tag, attrs, ...kids) => { const e = document.createElementNS(NS, tag); for (const [k, val] of Object.entries(attrs || {})) e.setAttribute(k, val); kids.forEach((k) => k && e.append(k)); return e; };
  const svg = sv('svg', { viewBox: '-4 -5 108 84', class: 'map-svg' });
  for (const p of map.paths) {
    const pts = p.map((id) => pos[id]).filter(Boolean).map((n) => n.x + ',' + n.y).join(' ');
    svg.append(sv('polyline', { points: pts, class: 'm-path' }));
  }
  const caughtSet = (list) => { const s2 = new Set(list.map((x) => x.sid)); let c = 0; for (const x of s2) if (isC(v, String(x))) c++; return [c, s2.size]; };
  for (const n of map.nodes) {
    const L = idx[n.id];
    const kind = nodeKind(n.id);
    const has = !!L;
    const here = has && L.list.some((x) => x.sid === sid);
    const [c, t] = has ? caughtSet(L.list) : [0, 0];
    const done = has && c === t;
    const cls = ['m-node', 'm-' + kind, has ? 'has' : 'empty', here ? 'here' : '', done ? 'done' : '', st.mapLoc === n.id ? 'sel' : ''].join(' ');
    const gEl = sv('g', { class: cls, transform: `translate(${n.x},${n.y})` });
    const title = sv('title'); title.textContent = nodeName(n.id, v, n) + (has ? ` — ${c}/${t} capturés` : '');
    gEl.append(title);
    if (kind === 'town') gEl.append(sv('rect', { x: -1.8, y: -1.8, width: 3.6, height: 3.6, rx: 0.6 }));
    else if (kind === 'route') gEl.append(sv('circle', { r: 1.7 }));
    else gEl.append(sv('rect', { x: -1.5, y: -1.5, width: 3, height: 3, rx: 0.4, transform: 'rotate(45)' }));
    if (here) gEl.append(sv('circle', { r: 3.2, class: 'm-ring' }));
    const big = st !== S.drawer;
    const lab = kind === 'route' ? routeNum(n.id) : (kind === 'town' || ((big || map.labels) && has) ? (n.label || nodeName(n.id, v, n)) : '');
    if (lab) {
      const t2 = sv('text', { y: kind === 'route' ? 0.65 : (kind === 'town' ? 4.6 : 4), class: kind === 'route' ? 'm-num' : (kind === 'town' ? 'm-label' : 'm-label m-small') });
      t2.textContent = lab.length > 16 ? lab.slice(0, 15) + '…' : lab;
      gEl.append(t2);
    }
    if (has) gEl.addEventListener('click', () => { st.mapLoc = n.id; rerender(); });
    svg.append(gEl);
  }
  pane.append(h('div', { class: 'map-wrap' }, svg));
  pane.append(h('div', { class: 'map-legend' },
    h('span', null, h('i', { class: 'lg here' }), 'Ce Pokémon'), h('span', null, h('i', { class: 'lg has' }), 'Pokémon à capturer'),
    h('span', null, h('i', { class: 'lg done' }), 'Tout capturé'), h('span', null, h('i', { class: 'lg lg-empty' }), 'Sans rencontre')));

  // détail du lieu sélectionné
  const sel = st.mapLoc && idx[st.mapLoc];
  if (sel) {
    const [c, t] = caughtSet(sel.list);
    const box = h('div', { class: 'box loc-box' }, h('h4', null, h('span', null, sel.name), h('span', { class: 'muted' }, `${c} / ${t} capturés · ${vName(v)}`)));
    const byArea = new Map();
    for (const x of sel.list) { const k = x.areaFr || sel.name; if (!byArea.has(k)) byArea.set(k, []); byArea.get(k).push(x); }
    for (const [area, list] of byArea) {
      if (byArea.size > 1 || area !== sel.name) box.append(h('div', { class: 'nav-sub', style: 'padding-left:0' }, area));
      // une ligne par Pokémon + méthode (niveaux et taux regroupés)
      const rows = new Map();
      for (const x of list) {
        const k = x.pid + '|' + x.method + '|' + x.conds.join(',');
        const r = rows.get(k);
        if (r) { r.min = Math.min(r.min, x.min); r.max = Math.max(r.max, x.max); r.rate = Math.min(100, (r.rate || 0) + (x.rate || 0)); }
        else rows.set(k, { ...x });
      }
      const sorted = [...rows.values()].sort((a, b) => (isC(v, String(a.sid)) - isC(v, String(b.sid))) || (b.rate || 0) - (a.rate || 0));
      for (const x of sorted) {
        const sp = S.core.species[x.sid];
        const pk = S.core.pokemon[x.pid];
        const form = pk && !pk.def ? S.core.forms[pk.forms[0]] : null;
        const caught = isC(v, String(x.sid));
        const conds = x.conds.map((cc) => S.core.encConds[cc]).join(', ');
        box.append(h('div', { class: 'loc-row' + (caught ? ' caught' : '') + (x.sid === sid ? ' cur' : ''), title: 'Clic : capturé dans ' + g.name,
          onclick: () => { toggle(v, String(x.sid)); refreshAfterToggle(); } },
          img((form || S.defForm[x.sid] || {}).spr, false, false),
          h('div', { class: 'lr-main' },
            h('div', { class: 'lr-name' }, sp.fr + (form ? ' (' + (form.fname || '') + ')' : ''), caught ? h('span', { class: 'lr-check' }, '✓') : null),
            h('div', { class: 'lr-where' }, methodShort(x) + (conds ? ' · ' + conds : '') + ' · Niv. ' + (x.min === x.max ? x.min : x.min + '-' + x.max) + (x.rate && !['gift', 'static', 'npc-trade', 'pokeflute', 'sv-fixed', 'sv-tera'].includes(x.method) ? ' · ' + rateTxt(x.method, x.rate) : ''))),
          h('button', { class: 'tg menu', title: 'Ouvrir la fiche', onclick: (e) => { e.stopPropagation(); openDrawer(x.sid); } }, '⋯')));
      }
    }
    pane.append(box);
  } else {
    if (st === S.drawer) pane.append(h('div', { class: 'muted', style: 'font-size:12px;margin:6px 0' }, 'Clique sur un lieu pour voir ses Pokémon.'));
  }
  // lieux où se trouve ce Pokémon + lieux sans position sur la carte
  const placed = new Set(map.nodes.map((n) => n.id));
  const allPlaced = new Set(keys.flatMap((k) => S.maps.maps[k].nodes.map((n) => n.id)));
  const herePlaces = sid ? Object.values(idx).filter((L) => L.list.some((x) => x.sid === sid)) : [];
  if (sid && herePlaces.length) {
    const wrap = h('div', { class: 'meta', style: 'margin-top:8px' }, h('span', { class: 'muted', style: 'font-size:12px;margin-right:4px' }, S.core.species[sid].fr + ' :'));
    for (const L of herePlaces) wrap.append(h('span', { class: 'pill k-wild', style: 'cursor:pointer', onclick: () => {
      const k = keys.find((kk) => S.maps.maps[kk].nodes.some((n) => n.id === L.ident));
      if (k) st.mapKey = k;
      st.mapLoc = L.ident; rerender();
    } }, L.name + (allPlaced.has(L.ident) ? '' : ' (hors carte)')));
    pane.append(wrap);
  }
  const others = Object.values(idx).filter((L) => !allPlaced.has(L.ident));
  if (others.length) {
    const wrap = h('div', { class: 'meta', style: 'margin-top:8px' }, h('span', { class: 'muted', style: 'font-size:12px;margin-right:4px' }, 'Autres lieux :'));
    for (const L of others) wrap.append(h('span', { class: 'pill', style: 'cursor:pointer', onclick: () => { st.mapLoc = L.ident; rerender(); } }, L.name));
    pane.append(wrap);
  }
  void placed;
}

init().catch((e) => {
  console.error(e);
  $('title').textContent = 'Erreur de chargement';
  $('subtitle').textContent = String(e);
});
