/*
 * Moteur de disponibilité : pour une version donnée, calcule pour chaque espèce
 * comment (et quand) on peut l'obtenir. Chaque version est calculée séparément :
 * les jeux ne se mélangent jamais (seules les versions sœurs servent à détecter
 * les exclusivités, et un DLC voit les rencontres de son jeu de base, jamais l'inverse).
 */
(function (root) {
  const UNIQUE_METHODS = new Set([
    'gift', 'gift-egg', 'static', 'pokeflute', 'npc-trade', 'roaming-grass', 'roaming-water',
    'snag', 'snag-rematch', 'fossil-revive',
  ]);
  const UNDISCOVERED = 15; // groupe œuf « Inconnu »
  // versions jumelles : une exclusivité se juge face à la version sœur (Jaune, Cristal, Émeraude, Platine : face à tout le groupe)
  const PAIRS = { 1: [2], 2: [1], 44: [45], 45: [44], 4: [5], 5: [4], 7: [8], 8: [7], 12: [13], 13: [12] };
  // méthodes qui ne donnent le Pokémon qu'une seule fois
  const ONCE_METHODS = new Set(['gift', 'gift-egg', 'static', 'pokeflute', 'npc-trade', 'roaming-grass', 'roaming-water',
    'snag', 'snag-rematch', 'bp-fossil', 'fossil-revive']);
  // comment un Pokémon d'une génération précédente arrive dans le jeu
  const TRANSFER_NOTE = {
    2: 'Transfert depuis Rouge / Bleu / Jaune (Time Capsule)',
    3: 'Échange depuis un autre jeu de 3e génération (pas de transfert depuis la 2e génération)',
    4: 'Transfert depuis un jeu GBA (Parc des Amis / Pal Park) ou échange',
    5: 'Transfert depuis un jeu de 4e génération (Poké Transfert) ou échange',
    6: 'Transfert via Poké Transporter / Banque Pokémon, ou échange',
    7: 'Transfert via la Banque Pokémon, ou échange',
    8: 'Transfert via Pokémon HOME, ou échange',
    9: 'Transfert via Pokémon HOME, ou échange',
  };
  // DLC -> version de base (même couleur)
  const DLC_BASE = { 35: 33, 50: 34, 36: 33, 51: 34, 42: 40, 52: 41, 43: 40, 53: 41, 48: 47 };
  // Région de la famille (pour les évolutions régionales : Raichu d'Alola, etc.)
  const FAMILY_REGION = { sl: 7, usul: 7, eb: 8, pla: 9, ev: 10, za: 6 };

  class Engine {
    constructor(core, global, curated, loader) {
      this.core = core;
      this.global = global;
      this.curated = curated; // { gen1: {...} }
      this.load = loader; // async (rel) => objet JSON ou null
      this.enc = {};
      this.baseCache = {};
      this.statusCache = {};
      this.children = {};
      for (const s of Object.values(core.species)) {
        if (s.from) (this.children[s.from] = this.children[s.from] || []).push(s.id);
      }
      this.sets = {
        starters: new Set(global.starters),
        fossils: new Set(global.fossils),
        ub: new Set(global.ultraBeasts),
        paradox: new Set(global.paradox),
      };
    }

    game(v) { return this.core.games[v]; }

    cur(v) {
      const g = this.game(v);
      for (const c of Object.values(this.curated)) if (c.families.includes(g.fam)) return c;
      return null;
    }

    // résout les références "@1" des fichiers curated
    ref(obj, v) {
      if (!obj) return undefined;
      let x = obj[v];
      let guard = 0;
      while (typeof x === 'string' && x.startsWith('@') && guard++ < 5) x = obj[x.slice(1)];
      return x;
    }

    async ensure(v) {
      const vs = [v];
      if (DLC_BASE[v]) vs.push(DLC_BASE[v]);
      for (const sib of this.siblings(v)) { vs.push(sib); if (DLC_BASE[sib]) vs.push(DLC_BASE[sib]); }
      for (const x of vs) {
        if (!(x in this.enc)) this.enc[x] = (await this.load(`enc/${x}.json`)) || {};
      }
    }

    // versions sœurs (même famille, même DLC, versions JP comprises)
    siblings(v) {
      const g = this.game(v);
      return Object.values(this.core.games)
        .filter((o) => o.fam === g.fam && o.dlc === g.dlc && o.id !== g.id)
        .map((o) => o.id);
    }

    // jeux sans étapes détaillées : seulement avant (1) / après (2) la ligue, d'après global.postgame
    postInfo(v) {
      const cur = this.cur(v);
      if (cur && cur.segments.length) return null;
      const g = this.game(v);
      if (g.dlc) return null; // les DLC n'ont pas de ligue
      const pg = this.global.postgame || {};
      const p = pg[g.fam];
      if (!p) return null;
      if (!p._set) { p._set = new Set(p.locs || []); p._conds = new Set(pg.conds || []); }
      return p;
    }

    lateSpecies(p, v, sid) {
      return ((p.species || {})[v] || []).includes(sid) || (p.afterSpecies && sid >= p.afterSpecies);
    }

    // le jeu sait-il dire « avant / après la ligue » ?
    hasStages(v) {
      const cur = this.cur(v);
      return (cur && cur.segments.length > 0) || !!this.postInfo(v);
    }

    locSeg(cur, locIdent, method, v, conds, areaIdent) {
      if (!cur || !cur.segments.length) {
        const p = v != null && this.postInfo(v);
        if (!p) return null;
        const byV = (p.locsByVersion || {})[v] || [];
        const late = p._set.has(locIdent) || p._set.has(locIdent + '/' + areaIdent) || byV.includes(locIdent)
          || (conds || []).some((c) => p._conds.has(c))
          || /apr-s-le-pokedex-national|post-national-pokedex/.test(areaIdent || ''); // zones « Après le Pokédex National »
        return late ? 2 : 1;
      }
      let seg = null;
      for (const s of cur.segments) if (s.locs.includes(locIdent)) { seg = s.id; break; }
      if (seg == null) return null;
      const m = cur.methodMinSegment[method];
      return m ? Math.max(seg, m) : seg;
    }

    locName(lid, cur) {
      const l = this.core.locations[lid];
      if (!l) return '?';
      return (cur && cur.locationNames[l.ident]) || l.fr;
    }

    // rencontres directes d'une espèce dans une version (+ jeu de base si DLC)
    directEntries(v, sid) {
      const cur = this.cur(v);
      const out = [];
      const sources = [v];
      if (DLC_BASE[v]) sources.push(DLC_BASE[v]);
      const sp = this.core.species[sid];
      for (const src of sources) {
        const enc = this.enc[src] || {};
        for (const pid of sp.vars) {
          const list = enc[pid];
          if (!list) continue;
          for (const [area, method, conds, min, max, rate] of list) {
            const a = this.core.areas[area];
            const lid = a ? a.l : null;
            const m = this.core.encMethods[method];
            const loc = this.core.locations[lid];
            out.push({
              pid, area, lid, method: m.ident, methodFr: m.fr, conds, min, max, rate,
              unique: UNIQUE_METHODS.has(m.ident),
              seg: loc ? this.locSeg(cur, loc.ident, m.ident, v, conds, a ? a.ident : '') : null,
              locFr: this.locName(lid, cur), areaFr: a ? a.fr : '', areaIdent: a ? a.ident : '',
              fromBase: src !== v,
            });
          }
        }
      }
      return out;
    }

    uniqueLabel(sid, entries) {
      const s = this.core.species[sid];
      if (this.sets.starters.has(sid)) return 'Starter';
      if (this.sets.fossils.has(sid)) return 'Fossile';
      if (s.myth) return 'Fabuleux';
      if (s.leg) return 'Légendaire';
      if (this.sets.ub.has(sid)) return 'Ultra-Chimère';
      const m = entries && entries[0] && entries[0].method;
      return { gift: 'Cadeau', 'gift-egg': 'Œuf offert', static: 'Fixe', pokeflute: 'Fixe', 'npc-trade': 'Échange PNJ',
        'roaming-grass': 'Errant', 'roaming-water': 'Errant', snag: 'Pokémon Obscur', 'snag-rematch': 'Pokémon Obscur' }[m] || 'Unique';
    }

    evoRowApplies(row, v) {
      if (!row.reg) return true;
      const g = this.game(v);
      return FAMILY_REGION[g.fam] === row.reg;
    }

    // ------------------------------------------------ calcul sans exclusivités
    base(v) {
      if (this.baseCache[v]) return this.baseCache[v];
      const map = new Map();
      this.baseCache[v] = map;
      const g = this.game(v);
      const cur = this.cur(v);
      const special = this.ref(cur && cur.special, v) || {};
      const overrides = this.ref(cur && cur.overrides, v) || {};
      const npcTrades = this.ref(cur && cur.npcTrades, v) || {};
      const canBreed = g.gen >= 2 && !this.global.noBreedingFamilies.includes(g.fam);
      const visiting = new Set();
      const pinfo = this.postInfo(v);

      const compute = (sid) => {
        if (map.has(sid)) return map.get(sid);
        if (visiting.has(sid)) return { sid, avail: false, kind: 'none' };
        visiting.add(sid);
        const sp = this.core.species[sid];
        let info = { sid, avail: false, kind: 'none', needTrade: false, needEgg: false, seg: null, entries: [] };
        const entries = this.directEntries(v, sid);
        const npc = npcTrades[sid];
        if (npc) {
          const give = compute(npc.give);
          for (const e of entries) {
            if (e.method !== 'npc-trade') continue;
            e.give = npc.give;
            e.seg = Math.max(npc.seg || 0, e.seg || 0, give.seg || 0) || null;
            if (!give.avail || give.needTrade) e.blocked = true;
          }
          for (let k = entries.length - 1; k >= 0; k--) if (entries[k].blocked) entries.splice(k, 1);
        }
        if (entries.length) {
          const wild = entries.filter((e) => !e.unique);
          const segs = entries.map((e) => e.seg).filter((x) => x != null);
          info = {
            sid, avail: true, kind: wild.length ? 'wild' : 'unique', needTrade: false, needEgg: false,
            seg: segs.length ? Math.min(...segs) : null, entries,
          };
          if (!wild.length) info.uniqueLabel = this.uniqueLabel(sid, entries);
          else if (sp.leg || sp.myth) info.uniqueLabel = sp.myth ? 'Fabuleux' : 'Légendaire';
        } else if (special[sid]) {
          info = { sid, avail: true, kind: special[sid].status, needTrade: false, needEgg: false, seg: special[sid].seg ?? null, entries: [],
            note: special[sid].note, uniqueLabel: special[sid].label || (sp.myth ? 'Fabuleux' : (sp.leg ? 'Légendaire' : 'Spécial')) };
        }
        // évolution (aussi quand le Pokémon existe à l'état sauvage : on garde l'étape la plus tôt)
        if (sp.from && info.kind !== 'event' && info.kind !== 'go') {
          const pre = compute(sp.from);
          if (pre.avail) {
            const rows = (this.core.evolutions[sid] || []).filter((r) => this.evoRowApplies(r, v));
            let best = null;
            for (const r of rows) {
              let seg = pre.seg;
              let itemNote = null;
              if (r.item && cur && cur.itemSegment[r.item] != null) {
                seg = seg == null ? cur.itemSegment[r.item] : Math.max(seg, cur.itemSegment[r.item]);
                itemNote = cur.itemNotes[r.item];
              }
              const cand = { row: r, seg, trade: r.trade || pre.needTrade, egg: pre.needEgg, itemNote };
              if (!best || (best.trade && !cand.trade) || (best.trade === cand.trade && (cand.seg ?? 99) < (best.seg ?? 99))) best = cand;
            }
            if (best) {
              const via = { from: sp.from, txt: best.row.txt, itemNote: best.itemNote, trade: !!best.row.trade, tradeItem: best.row.trade ? best.row.item : null };
              if (!info.avail) {
                info = {
                  sid, avail: true, kind: best.row.trade ? 'tradeEvo' : 'evo', needTrade: best.trade, needEgg: best.egg,
                  seg: best.seg, entries: [], via,
                };
              } else if (!best.trade && !best.egg) {
                info.via = via;
                if (best.seg != null && (info.seg == null || best.seg < info.seg)) {
                  info.seg = best.seg;
                  info.kind = 'evo';
                }
              }
            }
          }
        }
        // avant / après la ligue (jeux sans étapes détaillées) : réglé ici pour que les évolutions en héritent
        if (pinfo && info.avail && !info.needTrade && ['unique', 'wild', 'evo', 'egg', 'tradeEvo'].includes(info.kind)) {
          if (info.seg == null) info.seg = 1; // Pokémon fixes / cadeaux saisis à la main sans lieu
          if (this.lateSpecies(pinfo, v, sid)) info.seg = 2;
        }
        visiting.delete(sid);
        map.set(sid, info);
        return info;
      };

      for (const sid of Object.keys(this.core.species)) compute(+sid);

      // œufs : une espèce absente peut naître d'une évolution disponible
      if (canBreed) {
        const eggFrom = (sid, depth = 0) => {
          if (depth > 3) return null;
          for (const c of this.children[sid] || []) {
            const ci = map.get(c);
            if (ci && ci.avail && ci.kind !== 'egg') return ci;
            const deeper = eggFrom(c, depth + 1);
            if (deeper) return deeper;
          }
          return null;
        };
        for (const [sid, info] of map) {
          if (info.avail) continue;
          const sp = this.core.species[sid];
          if (sp.eggs.includes(UNDISCOVERED) && !sp.baby) continue;
          const src = eggFrom(sid);
          if (src) {
            map.set(sid, { sid, avail: true, kind: 'egg', needTrade: src.needTrade, needEgg: true, seg: src.seg, entries: [],
              via: { from: src.sid, txt: 'Œuf (reproduction de ' + this.core.species[src.sid].fr + ')' } });
          }
        }
        // les évolutions d'une espèce obtenue par œuf
        let changed = true;
        while (changed) {
          changed = false;
          for (const [sid, info] of map) {
            if (info.avail) continue;
            const sp = this.core.species[sid];
            const pre = sp.from && map.get(sp.from);
            if (!pre || !pre.avail) continue;
            const rows = (this.core.evolutions[sid] || []).filter((r) => this.evoRowApplies(r, v));
            if (!rows.length) continue;
            const r = rows.find((x) => !x.trade) || rows[0];
            map.set(sid, { sid, avail: true, kind: r.trade ? 'tradeEvo' : 'evo', needTrade: r.trade || pre.needTrade,
              needEgg: pre.needEgg, seg: pre.seg, entries: [], via: { from: sp.from, txt: r.txt, trade: !!r.trade, tradeItem: r.trade ? r.item : null } });
            changed = true;
          }
        }
      }

      // corrections saisies à la main
      for (const [sid, o] of Object.entries(overrides)) {
        const info = map.get(+sid);
        if (!info) continue;
        if (o.status === 'trade') Object.assign(info, { avail: true, kind: 'tradeOnly', needTrade: true, seg: null, note: o.note });
        else if (o.status === 'none') Object.assign(info, { avail: false, kind: 'none', note: o.note });
        else if (o.status === 'unique') Object.assign(info, { avail: true, kind: 'unique', needTrade: false, needEgg: false,
          seg: o.seg ?? info.seg, note: o.note, uniqueLabel: o.label || 'Échange PNJ' });
      }

      // étape avant / après ligue
      for (const info of map.values()) {
        if (pinfo && info.avail) {
          if (info.seg == null && !info.needTrade && ['unique', 'wild', 'evo', 'egg', 'tradeEvo'].includes(info.kind)) info.seg = 1;
          if (info.seg != null && this.lateSpecies(pinfo, v, info.sid)) info.seg = 2;
          info.post = info.seg === 2;
        }
        if (cur && cur.segments.length && info.seg != null) {
          const segObj = cur.segments.find((s) => s.id === info.seg);
          info.post = !!(segObj && segObj.postgame);
        }
      }
      // choix exclusifs
      const groups = this.ref(cur && cur.choiceGroups, v) || [];
      for (const gr of groups) for (const sid of gr.species) {
        const info = map.get(sid);
        if (info) info.choice = gr;
      }

      // « obtenable une seule fois » : cadeau, Pokémon fixe, échange PNJ, choix exclusif, légendaire unique…
      // sauf si on peut en refaire par reproduction dans ce jeu
      const breedable = (sid) => {
        const sp = this.core.species[sid];
        return canBreed && !(sp.eggs.includes(UNDISCOVERED) && !sp.baby);
      };
      const onceEntry = (e) => ONCE_METHODS.has(e.method);
      for (const [sid, info] of map) {
        if (!info.avail || info.needTrade || breedable(sid)) continue;
        if (info.kind === 'unique' && (info.entries.length ? info.entries.every(onceEntry) : special[sid] && special[sid].once !== false)) info.once = true;
        if (info.choice) info.once = true;
      }
      // les évolutions d'un Pokémon unique (non reproductible) sont uniques aussi
      let more = true;
      while (more) {
        more = false;
        for (const [sid, info] of map) {
          if (info.once || !info.avail || info.needTrade || !info.via || info.kind === 'egg') continue;
          if (info.entries && info.entries.some((e) => !onceEntry(e))) continue;
          const pre = map.get(info.via.from);
          if (pre && pre.once && !breedable(sid)) { info.once = true; more = true; }
        }
      }
      return map;
    }

    // ------------------------------------------------ avec exclusivités de version
    hasEncounterData(v) {
      const e = this.enc[v];
      const b = DLC_BASE[v] ? this.enc[DLC_BASE[v]] : null;
      // une version avec moins de 30 Pokémon rencontrables est considérée comme non renseignée
      // (ex. Bleu japonais : seulement quelques entrées dans PokéAPI)
      const n = (e ? Object.keys(e).length : 0) + (b ? Object.keys(b).length : 0);
      return n >= 30;
    }

    status(v) {
      if (this.statusCache[v]) return this.statusCache[v];
      const base = this.base(v);
      const sibs = this.siblings(v).filter((s) => !this.game(s).extra || this.game(v).extra);
      const sibMaps = sibs.map((s) => [s, this.base(s)]);
      const map = new Map();
      for (const [sid, info] of base) {
        const copy = { ...info };
        const incomplete = (this.global.incompleteEncounters || []).includes(v);
        if (!copy.avail && (!this.hasEncounterData(v) || incomplete)) {
          copy.kind = 'unknown';
        } else if (!copy.avail) {
          const partial = (this.global.partialEncounters || []).includes(v);
          const where = sibMaps.filter(([, m]) => m.get(sid) && m.get(sid).avail && !m.get(sid).needTrade).map(([s]) => s);
          if (where.length) {
            copy.avail = true; copy.kind = 'exclusive'; copy.needTrade = true; copy.exclusiveTo = where;
          } else if (partial) {
            copy.kind = 'unknown';
          }
        } else {
          // exclusif à cette version ?
          const rivals = sibMaps.filter(([s]) => !PAIRS[v] || PAIRS[v].includes(s));
          const missingIn = rivals.filter(([, m]) => !(m.get(sid) && m.get(sid).avail && !m.get(sid).needTrade)).map(([s]) => s);
          if (rivals.length && missingIn.length === rivals.length && !copy.needTrade && !incomplete) copy.exclusiveHere = true;
        }
        this.applyOfficialExclusives(v, sid, copy, sibs);
        // toujours introuvable : fabuleux = événement, ancien Pokémon = transfert depuis un jeu précédent
        if (!copy.avail && copy.kind === 'none') {
          const sp = this.core.species[sid];
          const g = this.game(v);
          if (sp.myth) Object.assign(copy, { avail: true, kind: 'event', note: copy.note || 'Distribution événementielle uniquement' });
          else if (sp.gen < g.gen) Object.assign(copy, { avail: true, kind: 'transfer', needTrade: true, note: TRANSFER_NOTE[g.gen] || 'Transfert depuis un autre jeu' });
        }
        map.set(sid, copy);
      }
      this.statusCache[v] = map;
      return map;
    }

    // Exclusivités officielles (Bulbapedia « Version-exclusive Pokémon ») : elles priment sur le calcul
    applyOfficialExclusives(v, sid, info, sibs) {
      const X = this.global.exclusives;
      if (!X || !X[v]) return;
      if (info.kind === 'event' || info.kind === 'go') return;
      const mine = X[v][sid];
      const sibFlags = sibs.filter((s) => X[s]).map((s) => [s, X[s][sid]]);
      if (mine === false) {
        const where = sibFlags.filter(([, b]) => b !== false).map(([s]) => s);
        if (!where.length) return;
        Object.assign(info, { avail: true, kind: 'exclusive', needTrade: true, exclusiveTo: where, exclusiveHere: false, post: false });
      } else if (mine === true) {
        const rivals = sibFlags.filter(([s]) => !PAIRS[v] || PAIRS[v].includes(s));
        info.exclusiveHere = rivals.length > 0 && rivals.every(([, b]) => b === false);
        if (info.kind === 'exclusive' || !info.avail || info.kind === 'unknown') {
          Object.assign(info, { avail: true, kind: info.entries && info.entries.length ? info.kind : 'wild', needTrade: false,
            exclusiveTo: undefined, note: info.note || 'Présent dans cette version (Bulbapedia) ; lieu non renseigné' });
          if (info.kind === 'exclusive') info.kind = 'wild';
        }
      } else {
        // non listé : présent dans toutes les versions du groupe
        info.exclusiveHere = false;
        if (info.kind === 'exclusive') {
          Object.assign(info, { kind: 'wild', needTrade: false, exclusiveTo: undefined, entries: info.entries || [],
            note: 'Présent dans toutes les versions (Bulbapedia) ; lieu non renseigné dans cette version' });
        }
      }
    }

    obtainable(info, opts) {
      if (!info || !info.avail) return false;
      if (info.needTrade && !opts.trade) return false;
      if (info.needEgg && !opts.egg) return false;
      if ((info.kind === 'event' || info.kind === 'go') && !opts.event) return false;
      return true;
    }

    // compte les obtenables d'une liste en tenant compte des choix (un seul par groupe sans échange)
    countObtainable(v, sids, opts) {
      const st = this.status(v);
      let n = 0;
      const groups = new Map();
      for (const sid of sids) {
        const info = st.get(sid);
        if (!this.obtainable(info, opts)) continue;
        if (!opts.trade && info.choice && !info.needTrade) {
          const k = info.choice.label;
          if (!groups.has(k)) { groups.set(k, true); n++; }
          continue;
        }
        n++;
      }
      return n;
    }

    stageLabel(info, v) {
      if (!info || !info.avail) return '—';
      if (info.needTrade) return 'Échange';
      if (info.kind === 'event') return 'Événement';
      if (info.kind === 'go') return 'Pokémon GO';
      if (!this.hasStages(v) || info.seg == null) return '—';
      return info.post ? 'Après la ligue' : 'Avant la ligue';
    }

    // ------------------------------------------------ le plus simple, tous jeux confondus
    // Note de « difficulté » d'une façon d'obtenir l'espèce dans une version (plus c'est bas, plus c'est simple et rapide) :
    // avancée dans le jeu (niveau des Pokémon du lieu ou étape saisie), après la ligue, méthode, rareté,
    // + les étapes en plus (évolution, œuf, échange).
    entryCost(v, e) {
      const cur = this.cur(v);
      let c;
      if (cur && cur.segments.length && e.seg != null) {
        const segObj = cur.segments.find((s) => s.id === e.seg);
        c = (e.seg - 1) * 0.6 + (segObj && segObj.postgame ? 2 : 0);
      } else {
        c = Math.min(e.min || 5, 70) / 8 + (e.seg === 2 ? 3 : 0);
      }
      const m = e.method;
      const METHOD = { walk: 0, 'old-rod': 0.3, 'good-rod': 0.6, 'super-rod': 1, surf: 0.5, gift: 0.2, 'gift-egg': 1, static: 0.4, 'npc-trade': 0.5,
        headbutt: 1, 'rock-smash': 1, overworld: 0, 'sv-land': 0, 'sv-water': 0.3, 'sv-fixed': 0.4, 'sv-tera': 2,
        sos: 1.5, 'bp-wild': 0.5, wanderer: 0.5, 'dynamax-adventure': 3, 'max-raid': 3, 'island-scan': 2.5, 'pokeradar': 1.5,
        'overworld-special': 4, 'overworld-flying-special': 4, 'overworld-water-special': 4 };
      if (m === 'npc-trade') c += 1; // il faut aussi le Pokémon demandé
      c += m in METHOD ? METHOD[m] : /^overworld|^sv-/.test(m) ? 0.4 : /roam/.test(m) ? 3 : 1;
      if (!e.unique && e.rate && !/^sv-/.test(m)) c += e.rate >= 20 ? 0 : e.rate >= 10 ? 0.4 : e.rate >= 5 ? 1 : e.rate >= 1 ? 2 : 3;
      c += (e.conds || []).length * 0.3;
      if (e.fromBase) c += 0.1;
      if (this.game(v).dlc) c += 1; // DLC à acheter et souvent tard dans le jeu
      return c;
    }

    evoCost(row, preLevel) {
      if (!row) return 2;
      if (row.lvl) return Math.max(0.3, (row.lvl - (preLevel || 5)) / 10);
      if (row.item) return 1.2;
      if (/Bonheur|Amitié|amitié/.test(row.txt)) return 1.5;
      return 2;
    }

    // { cost, level, how } pour une espèce dans une version, ou null
    howEasy(v, sid, opts, depth = 0) {
      const info = this.status(v).get(sid);
      if (!info || !info.avail || depth > 4) return null;
      if (info.kind === 'exclusive' || info.kind === 'tradeOnly' || info.kind === 'transfer') return null;
      if ((info.kind === 'event' || info.kind === 'go') && !opts.event) return null;
      if (info.needEgg && !opts.egg) return null;
      if (info.needTrade && !opts.trade) return null;
      let best = null;
      for (const e of info.entries) {
        if (e.method === 'npc-trade' && !opts.trade) continue;
        const c = this.entryCost(v, e);
        if (!best || c < best.cost) best = { cost: c, level: e.min, entry: e };
      }
      if (info.via && info.kind !== 'egg') {
        const pre = this.howEasy(v, info.via.from, opts, depth + 1);
        if (pre) {
          const row = (this.core.evolutions[sid] || []).find((r) => r.txt === info.via.txt && this.evoRowApplies(r, v));
          const c = pre.cost + this.evoCost(row, pre.level) + (info.via.trade ? 6 : 0);
          const lvl = row && row.lvl ? Math.max(row.lvl, pre.level || 0) : pre.level;
          if (!best || c < best.cost) best = { cost: c, level: lvl, evo: { from: info.via.from, txt: info.via.txt, trade: info.via.trade }, pre };
        }
      }
      if (info.kind === 'egg' && info.via) {
        const par = this.howEasy(v, info.via.from, opts, depth + 1);
        if (par) best = { cost: par.cost + 2.5, level: 1, egg: info.via.from, pre: par };
      }
      if (!best && (info.kind === 'unique' || info.kind === 'wild')) {
        const sp = this.core.species[sid];
        // sans lieu connu : un Pokémon fixe saisi à la main reste simple, un sauvage « lieu non renseigné » passe après le reste
        const base = info.kind === 'wild' ? 6 : sp.leg || sp.myth ? 4 : 2.5;
        best = { cost: base + (info.post ? 3 : 0) + (this.game(v).dlc ? 1 : 0), level: null, fixed: true };
      }
      if (!best && (info.kind === 'event' || info.kind === 'go')) best = { cost: 15, level: null, event: true };
      if (!best) return null;
      if (info.needTrade && !best.evo) best.cost += 6;
      best.info = info;
      return best;
    }

    // meilleures options pour une espèce, triées (une seule version par famille de jeux)
    easiest(sid, opts) {
      const key = sid + '|' + (opts.trade ? 1 : 0) + (opts.egg ? 1 : 0) + (opts.event ? 1 : 0);
      this.easyCache = this.easyCache || {};
      if (this.easyCache[key]) return this.easyCache[key];
      const res = [];
      for (const g of Object.values(this.core.games)) {
        if (g.extra) continue;
        const r = this.howEasy(g.id, sid, opts);
        if (r) res.push({ v: g.id, ...r });
      }
      res.sort((a, b) => a.cost - b.cost || a.v - b.v);
      const seen = new Set();
      const out = [];
      for (const r of res) {
        const fk = this.game(r.v).fam + '|' + (this.game(r.v).dlc || '');
        if (seen.has(fk)) continue;
        seen.add(fk);
        out.push(r);
      }
      this.easyCache[key] = out;
      return out;
    }

    // ------------------------------------------------ Pokédex d'une version
    scope(v, mode) {
      const ck = v + ':' + mode;
      this.scopeCache = this.scopeCache || {};
      if (this.scopeCache[ck]) return this.scopeCache[ck];
      return (this.scopeCache[ck] = this.scopeRaw(v, mode));
    }

    scopeRaw(v, mode) {
      const g = this.game(v);
      const list = [];
      const seen = new Set();
      for (const d of g.dex) {
        const dex = this.core.dex[d];
        if (!dex) continue;
        for (const [num, sid] of dex.list) {
          if (seen.has(sid)) continue;
          seen.add(sid);
          list.push({ sid, num: (dex.prefix ? dex.prefix + '-' : '') + String(num).padStart(3, '0'), n: num });
        }
      }
      if (mode === 'national' || !list.length) {
        const pres = new Set();
        for (const pid of this.core.presence[g.mvg] || []) pres.add(this.core.pokemon[pid].sp);
        const extra = [...pres].filter((s) => !seen.has(s)).sort((a, b) => a - b);
        if (mode === 'national') {
          const all = [...new Set([...list.map((x) => x.sid), ...extra])].sort((a, b) => a - b);
          return all.map((sid) => ({ sid, num: '#' + String(sid).padStart(4, '0'), n: sid }));
        }
        return extra.map((sid) => ({ sid, num: '#' + String(sid).padStart(4, '0'), n: sid }));
      }
      return list;
    }

    // formes présentes dans une version (hors forme par défaut)
    formsIn(v, sid, includeBattle) {
      const g = this.game(v);
      const pres = new Set(this.core.presence[g.mvg] || []);
      const order = this.core.vgOrder;
      const out = [];
      for (const pid of this.core.species[sid].vars) {
        for (const fid of this.core.pokemon[pid].forms) {
          const f = this.core.forms[fid];
          if (f.def) continue;
          if (f.battle && !includeBattle) continue;
          const pOk = pres.size ? pres.has(f.pk) : true;
          const vgOk = f.vg == null || (order[f.vg] || 0) <= (order[g.mvg] || 0);
          if (pOk && vgOk) out.push(f);
        }
      }
      return out;
    }

    // ------------------------------------------------ route optimisée
    route(v, opts) {
      const cur = this.cur(v);
      const st = this.status(v);
      const scope = this.scope(v, opts.scope || 'regional');
      const numOf = new Map(scope.map((x) => [x.sid, x]));
      const buckets = new Map();
      const extra = { trade: [], egg: [], event: [], none: [], unsorted: [] };
      for (const { sid } of scope) {
        const info = st.get(sid);
        if (!info || !info.avail) { extra.none.push(sid); continue; }
        if (info.kind === 'event' || info.kind === 'go') { extra.event.push(sid); continue; }
        if (info.needTrade) { extra.trade.push(sid); continue; }
        if (info.needEgg && !opts.egg) { extra.egg.push(sid); continue; }
        if (!cur || info.seg == null) { extra.unsorted.push(sid); continue; }
        if (!buckets.has(info.seg)) buckets.set(info.seg, []);
        buckets.get(info.seg).push(sid);
      }
      const rank = { unique: 0, wild: 1, evo: 2, egg: 3, tradeEvo: 4 };
      const sortFn = (a, b) => {
        const ia = st.get(a), ib = st.get(b);
        return (rank[ia.kind] ?? 9) - (rank[ib.kind] ?? 9) || numOf.get(a).n - numOf.get(b).n;
      };
      const segments = cur ? cur.segments.map((s) => ({ ...s, list: (buckets.get(s.id) || []).sort(sortFn) })) : [];
      // meilleur lieu dans l'étape
      const bestSpot = (sid) => {
        const info = st.get(sid);
        const es = info.entries.filter((e) => e.seg === info.seg);
        es.sort((a, b) => (b.rate || 0) - (a.rate || 0));
        return es[0] || info.entries[0] || null;
      };
      return { segments, extra, bestSpot, numOf, curated: !!cur };
    }
  }

  root.PokeEngine = Engine;
  if (typeof module !== 'undefined') module.exports = Engine;
})(typeof window !== 'undefined' ? window : globalThis);
