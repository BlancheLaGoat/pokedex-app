/*
 * Moteur de disponibilité : pour une version donnée, calcule pour chaque espèce
 * comment (et quand) on peut l'obtenir. Chaque version est calculée séparément :
 * les jeux ne se mélangent jamais (seules les versions sœurs servent à détecter
 * les exclusivités, et un DLC voit les rencontres de son jeu de base, jamais l'inverse).
 */
(function (root) {
  const UNIQUE_METHODS = new Set([
    'gift', 'gift-egg', 'static', 'pokeflute', 'npc-trade', 'roaming-grass', 'roaming-water',
    'snag', 'snag-rematch',
  ]);
  const UNDISCOVERED = 15; // groupe œuf « Inconnu »
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

    locSeg(cur, locIdent, method) {
      if (!cur) return null;
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
              seg: loc ? this.locSeg(cur, loc.ident, m.ident) : null,
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
              const via = { from: sp.from, txt: best.row.txt, itemNote: best.itemNote };
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
              needEgg: pre.needEgg, seg: pre.seg, entries: [], via: { from: sp.from, txt: r.txt } });
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
        if (cur && info.seg != null) {
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
          const missingIn = sibMaps.filter(([, m]) => !(m.get(sid) && m.get(sid).avail && !m.get(sid).needTrade)).map(([s]) => s);
          if (sibMaps.length && missingIn.length === sibMaps.length && !copy.needTrade && !incomplete) copy.exclusiveHere = true;
        }
        map.set(sid, copy);
      }
      this.statusCache[v] = map;
      return map;
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
      if (!this.cur(v) || info.seg == null) return '—';
      return info.post ? 'Après la ligue' : 'Avant la ligue';
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
