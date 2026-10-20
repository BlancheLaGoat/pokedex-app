// Lecture des sauvegardes des jeux Pokémon (Gen 1 à 7, Let's Go, Diamant Étincelant / Perle Scintillante).
// Renvoie les Pokémon possédés (équipe + boîtes PC) : espèce (n° national), shiny, forme, version d'origine.
// Formats documentés d'après PKHeX (offsets, chiffrement) ; code écrit pour cette appli.
(function (root) {
  'use strict';

  const u16 = (d, o) => d[o] | (d[o + 1] << 8);
  const u32 = (d, o) => (d[o] | (d[o + 1] << 8) | (d[o + 2] << 16) | (d[o + 3] << 24)) >>> 0;

  // ---------------------------------------------------------------- utilitaires
  function crc16ccitt(d, start, len) {
    let top = 0xFF, bot = 0xFF;
    for (let i = start; i < start + len; i++) {
      let x = d[i] ^ top;
      x ^= x >> 4;
      top = (bot ^ (x >> 3) ^ (x << 4)) & 0xFF;
      bot = (x ^ (x << 5)) & 0xFF;
    }
    return (top << 8) | bot;
  }

  // ordre des 4 blocs (Gen 4 et après) : bloc déchiffré i = bloc chiffré BLOCK_POS[sv*4+i]
  const BLOCK_POS = [
    0, 1, 2, 3, 0, 1, 3, 2, 0, 2, 1, 3, 0, 3, 1, 2, 0, 2, 3, 1, 0, 3, 2, 1,
    1, 0, 2, 3, 1, 0, 3, 2, 2, 0, 1, 3, 3, 0, 1, 2, 2, 0, 3, 1, 3, 0, 2, 1,
    1, 2, 0, 3, 1, 3, 0, 2, 2, 1, 0, 3, 3, 1, 0, 2, 2, 3, 0, 1, 3, 2, 0, 1,
    1, 2, 3, 0, 1, 3, 2, 0, 2, 1, 3, 0, 3, 1, 2, 0, 2, 3, 1, 0, 3, 2, 1, 0,
  ];

  function lcrng(data, seed, start, end) {
    let s = seed >>> 0;
    for (let i = start; i < end; i += 2) {
      s = (Math.imul(s, 0x41C64E6D) + 0x6073) >>> 0;
      data[i] ^= (s >>> 16) & 0xFF;
      data[i + 1] ^= (s >>> 24) & 0xFF;
    }
  }

  // déchiffre une fiche Gen 4 à 8 (format « stocké ») ; renvoie null si vide ou invalide
  function decrypt45678(raw, kind) {
    const d = Uint8Array.from(raw);
    const blk = kind === 45 ? 32 : kind === 67 ? 56 : 80;
    const end = 8 + blk * 4;
    if (d.subarray(0, end).every((x) => x === 0)) return null;
    const pid = u32(d, 0);
    const seed = kind === 45 ? u16(d, 6) : pid; // Gen 4/5 : somme de contrôle ; Gen 6+ : clé de chiffrement
    lcrng(d, seed, 8, end);
    const sv = kind === 45 ? ((pid & 0x3E000) >>> 13) % 24 : ((pid >>> 13) & 31) % 24;
    const src = d.slice(8, end);
    for (let b = 0; b < 4; b++) d.set(src.subarray(BLOCK_POS[sv * 4 + b] * blk, BLOCK_POS[sv * 4 + b] * blk + blk), 8 + b * blk);
    let sum = 0;
    for (let i = 8; i < end; i += 2) sum = (sum + u16(d, i)) & 0xFFFF;
    if (sum !== u16(d, 6)) return null; // emplacement vide ou données corrompues
    return d;
  }

  function mon(sid, shiny, form, origin, where) { return { sid, shiny: !!shiny, form: form || 0, origin: origin ?? null, where }; }

  // ---------------------------------------------------------------- Gen 1
  function readGen1(d, maps) {
    const sumOk = (start, end, at) => { let s = 0; for (let i = start; i < end; i++) s = (s + d[i]) & 0xFF; return ((~s) & 0xFF) === d[at]; };
    const intl = sumOk(0x2598, 0x3523, 0x3523);
    const jpn = !intl && sumOk(0x2598, 0x3594, 0x3594);
    if (!intl && !jpn) return null;
    const O = intl ? { party: 0x2F2C, cur: 0x30C0, curIdx: 0x284C, boxes: 12, name: 11 } : { party: 0x2ED5, cur: 0x302D, curIdx: 0x2842, boxes: 8, name: 6 };
    const out = [];
    const species = (i) => maps.g1[i] || 0;
    // équipe : nombre, liste des espèces, puis fiches de 44 octets
    const n = d[O.party];
    if (n <= 6) for (let i = 0; i < n; i++) { const s = species(d[O.party + 1 + i]); if (s) out.push(mon(s, false, 0, null, 'Équipe')); }
    const listSize = 1 + 21 + 20 * 33 + 20 * O.name * 2;
    const half = O.boxes / 2;
    const cur = d[O.curIdx] & 0x7F;
    const initialized = (d[O.curIdx] & 0x80) !== 0;
    for (let b = 0; b < O.boxes; b++) {
      const ofs = b === cur ? O.cur : (b < half ? 0x4000 + b * listSize : 0x6000 + (b - half) * listSize);
      if (b !== cur && !initialized) continue; // boîtes jamais utilisées : données vides
      const c = d[ofs];
      if (c > 20) continue;
      for (let i = 0; i < c; i++) { const s = species(d[ofs + 1 + i]); if (s) out.push(mon(s, false, 0, null, 'Boîte ' + (b + 1))); }
    }
    return { gen: 1, family: 'rbj', label: 'Rouge / Bleu / Jaune' + (jpn ? ' (japonais)' : ''), versions: jpn ? [44, 45, 46, 3] : [1, 2, 3], mons: out };
  }

  // ---------------------------------------------------------------- Gen 2
  function readGen2(d) {
    const sum16 = (start, end) => { let s = 0; for (let i = start; i <= end; i++) s = (s + d[i]) & 0xFFFF; return s; };
    const cands = [
      { name: 'Or / Argent', versions: [4, 5], party: 0x288A, cur: 0x2D6C, curIdx: 0x2724, chkEnd: 0x2D68, chkAt: 0x2D69, crystal: false },
      { name: 'Cristal', versions: [6], party: 0x2865, cur: 0x2D10, curIdx: 0x2700, chkEnd: 0x2B82, chkAt: 0x2D0D, crystal: true },
    ];
    const O = cands.find((c) => sum16(0x2009, c.chkEnd) === u16(d, c.chkAt));
    if (!O) return null;
    const out = [];
    const shinyDV = (o) => {
      const atk = d[o] >> 4, def = d[o] & 15, spe = d[o + 1] >> 4, spc = d[o + 1] & 15;
      return def === 10 && spe === 10 && spc === 10 && [2, 3, 6, 7, 10, 11, 14, 15].includes(atk);
    };
    // équipe : nombre, espèces (0xFD = œuf), fiches de 48 octets (DV en +0x15)
    const n = d[O.party];
    if (n <= 6) for (let i = 0; i < n; i++) {
      const s = d[O.party + 1 + i];
      if (!s || s === 0xFD || s > 251) continue;
      out.push(mon(s, shinyDV(O.party + 8 + i * 48 + 0x15), 0, null, 'Équipe'));
    }
    const listSize = 1 + 21 + 20 * 32 + 20 * 11 * 2; // 0x44E
    const cur = d[O.curIdx] & 0x7F;
    for (let b = 0; b < 14; b++) {
      const ofs = b === cur ? O.cur : (b < 7 ? 0x4000 + b * (listSize + 2) : 0x6000 + (b - 7) * (listSize + 2));
      const c = d[ofs];
      if (c > 20) continue;
      for (let i = 0; i < c; i++) {
        const s = d[ofs + 1 + i];
        if (!s || s === 0xFD || s > 251) continue;
        out.push(mon(s, shinyDV(ofs + 22 + i * 32 + 0x15), 0, null, 'Boîte ' + (b + 1)));
      }
    }
    return { gen: 2, family: 'oac', label: O.name, versions: O.versions, mons: out };
  }

  // ---------------------------------------------------------------- Gen 3
  const G3_ORDERS = ['GAEM', 'GAME', 'GEAM', 'GEMA', 'GMAE', 'GMEA', 'AGEM', 'AGME', 'AEGM', 'AEMG', 'AMGE', 'AMEG',
    'EGAM', 'EGMA', 'EAGM', 'EAMG', 'EMGA', 'EMAG', 'MGAE', 'MGEA', 'MAGE', 'MAEG', 'MEGA', 'MEAG'];
  const G3_ORIGIN = { 1: 8, 2: 7, 3: 9, 4: 10, 5: 11 }; // Saphir, Rubis, Émeraude, Rouge Feu, Vert Feuille

  function readPK3(d, o, maps, where) {
    const pid = u32(d, o), otid = u32(d, o + 4);
    if (pid === 0 && otid === 0 && u16(d, o + 0x1C) === 0) return null;
    const key = (pid ^ otid) >>> 0;
    const data = new Uint8Array(48);
    for (let i = 0; i < 48; i += 4) {
      const v = (u32(d, o + 0x20 + i) ^ key) >>> 0;
      data[i] = v & 0xFF; data[i + 1] = (v >>> 8) & 0xFF; data[i + 2] = (v >>> 16) & 0xFF; data[i + 3] = v >>> 24;
    }
    let sum = 0;
    for (let i = 0; i < 48; i += 2) sum = (sum + u16(data, i)) & 0xFFFF;
    if (sum !== u16(d, o + 0x1C)) return null;
    const order = G3_ORDERS[pid % 24];
    const g = order.indexOf('G') * 12, m = order.indexOf('M') * 12;
    const internal = u16(data, g);
    const sid = maps.g3[internal] || 0;
    if (!sid) return null;
    const ivs = u32(data, m + 4);
    if (ivs & 0x40000000) return null; // œuf
    const origin = G3_ORIGIN[(u16(data, m + 2) >> 7) & 0xF] ?? null;
    const shiny = ((otid & 0xFFFF) ^ (otid >>> 16) ^ (pid & 0xFFFF) ^ (pid >>> 16)) < 8;
    return mon(sid, shiny, 0, origin, where);
  }

  function readGen3(d, maps) {
    if (d.length < 0x10000) return null;
    const slotOk = (slot) => {
      const ids = new Set();
      let zero = -1;
      for (let s = 0; s < 14; s++) {
        const ofs = slot * 0xE000 + s * 0x1000;
        if (ofs + 0x1000 > d.length) return null;
        if (u32(d, ofs + 0xFF8) !== 0x08012025) return null;
        const id = u16(d, ofs + 0xFF4);
        ids.add(id);
        if (id === 0) zero = ofs;
      }
      return ids.size === 14 ? zero : null;
    };
    const z0 = slotOk(0), z1 = d.length >= 0x1C000 ? slotOk(1) : null;
    if (z0 == null && z1 == null) return null;
    let slot = z0 == null ? 1 : z1 == null ? 0 : (u32(d, z1 + 0xFFC) > u32(d, z0 + 0xFFC) ? 1 : 0);
    const sector = (id) => { for (let s = 0; s < 14; s++) { const ofs = slot * 0xE000 + s * 0x1000; if (u16(d, ofs + 0xFF4) === id) return ofs; } return -1; };
    const small = sector(0);
    const a = u32(d, small + 0xAC);
    let game;
    if (a === 1) game = 'frlg';
    else if (a === 0) game = 'rs';
    else { let any = false; for (let i = small + 0x890; i < small + 0xF2C; i++) if (d[i]) { any = true; break; } game = any ? 'e' : 'rs'; }
    const large = sector(1);
    const pc = game === 'frlg' ? 0x34 : 0x234;
    const out = [];
    const n = d[large + pc];
    if (n <= 6) for (let i = 0; i < n; i++) { const r = readPK3(d, large + pc + 4 + i * 100, maps, 'Équipe'); if (r) out.push(r); }
    // boîtes : secteurs 5 à 13 mis bout à bout (0xF80 octets utiles chacun), 4 octets puis 14 × 30 × 80
    const storage = new Uint8Array(9 * 0xF80);
    for (let id = 5; id <= 13; id++) { const ofs = sector(id); if (ofs >= 0) storage.set(d.subarray(ofs, ofs + 0xF80), (id - 5) * 0xF80); }
    for (let b = 0; b < 14; b++) for (let i = 0; i < 30; i++) {
      const r = readPK3(storage, 4 + (b * 30 + i) * 80, maps, 'Boîte ' + (b + 1));
      if (r) out.push(r);
    }
    const info = { rs: ['Rubis / Saphir', [7, 8], 'rse'], e: ['Émeraude', [9], 'rse'], frlg: ['Rouge Feu / Vert Feuille', [10, 11], 'rfvf'] }[game];
    return { gen: 3, family: info[2], label: info[0], versions: info[1], mons: out };
  }

  // ---------------------------------------------------------------- Gen 4 à 8 (fiches chiffrées)
  const ORIGIN = {
    7: 15, 8: 16, 10: 12, 11: 13, 12: 14, // HeartGold, SoulSilver, Diamant, Perle, Platine
    20: 18, 21: 17, 22: 22, 23: 21, // Blanc, Noir, Blanc 2, Noir 2
    24: 23, 25: 24, 26: 26, 27: 25, // X, Y, Saphir Alpha, Rubis Oméga
    30: 27, 31: 28, 32: 29, 33: 30, // Soleil, Lune, Ultra-Soleil, Ultra-Lune
    42: 31, 43: 32, 48: 37, 49: 38, // Let's Go Pikachu / Évoli, Diamant Étincelant, Perle Scintillante
  };

  function readEnc(d, o, size, kind, where) {
    if (o + size > d.length) return null;
    const p = decrypt45678(d.subarray(o, o + size), kind);
    if (!p) return null;
    const sid = u16(p, 8);
    if (!sid || sid > 1025) return null;
    let pid, iv, form, origin, shinyMax = kind === 45 ? 8 : 16;
    if (kind === 45) { pid = u32(p, 0); iv = u32(p, 0x38); form = p[0x40] >> 3; origin = p[0x5F]; }
    else if (kind === 67) { pid = u32(p, 0x18); iv = u32(p, 0x74); form = p[0x1D] >> 3; origin = p[0xDF]; }
    else { pid = u32(p, 0x1C); iv = u32(p, 0x8C); form = u16(p, 0x24); origin = p[0xDE]; }
    if (iv & 0x40000000) return null; // œuf
    const tid = u16(p, 0x0C), sidt = u16(p, 0x0E);
    const shiny = (tid ^ sidt ^ (pid & 0xFFFF) ^ (pid >>> 16)) < shinyMax;
    return mon(sid, shiny, form, ORIGIN[origin] ?? null, where);
  }

  function readGen4(d) {
    if (d.length !== 0x80000) return null;
    const types = [
      { key: 'dp', label: 'Diamant / Perle', versions: [12, 13], family: 'dpp', gSize: 0xC100, sStart: 0xC100, sSize: 0x121E0, party: 0x98, box: 4, pad: 0 },
      { key: 'pt', label: 'Platine', versions: [14], family: 'dpp', gSize: 0xCF2C, sStart: 0xCF2C, sSize: 0x121E4, party: 0xA0, box: 4, pad: 0 },
      { key: 'hgss', label: 'HeartGold / SoulSilver', versions: [15, 16], family: 'hgss', gSize: 0xF628, sStart: 0xF700, sSize: 0x12310, party: 0x98, box: 0, pad: 0x10 },
    ];
    // pied de bloc : taille du bloc puis signature
    const validAt = (ofs, size) => ofs + size <= d.length && u32(d, ofs + size - 0xC) === size && [0x20060623, 0x20070903].includes(u32(d, ofs + size - 0x8));
    const T = types.find((t) => validAt(0, t.gSize) || validAt(0x40000, t.gSize));
    if (!T) return null;
    const newest = (begin, size) => {
      const ok0 = validAt(begin, size), ok1 = validAt(begin + 0x40000, size);
      if (!ok0) return begin + 0x40000;
      if (!ok1) return begin;
      const f = begin + size - 0x14;
      const a = [u32(d, f), u32(d, f + 4)], b = [u32(d, f + 0x40000), u32(d, f + 0x40004)];
      const cmp = (x, y) => (x === 0xFFFFFFFF ? -1 : y === 0xFFFFFFFF ? 1 : x - y);
      const r = cmp(a[0], b[0]) || cmp(a[1], b[1]);
      return r >= 0 ? begin : begin + 0x40000;
    };
    const g = newest(0, T.gSize), s = newest(T.sStart, T.sSize);
    const out = [];
    const n = d[g + T.party - 4];
    if (n <= 6) for (let i = 0; i < n; i++) { const r = readEnc(d, g + T.party + i * 236, 136, 45, 'Équipe'); if (r) out.push(r); }
    for (let b = 0; b < 18; b++) for (let i = 0; i < 30; i++) {
      const r = readEnc(d, s + T.box + b * (30 * 136 + T.pad) + i * 136, 136, 45, 'Boîte ' + (b + 1));
      if (r) out.push(r);
    }
    return { gen: 4, family: T.family, label: T.label, versions: T.versions, mons: out };
  }

  function readGen5(d) {
    if (d.length !== 0x80000) return null;
    const ok = (main, len) => { const f = main - 0x100; return u16(d, f + len + 0x10 - 2) === crc16ccitt(d, f, len); };
    let T = null;
    if (ok(0x24000, 0x8C)) T = { label: 'Noir / Blanc', versions: [17, 18], family: 'nb' };
    else if (ok(0x26000, 0x94)) T = { label: 'Noir 2 / Blanc 2', versions: [21, 22], family: 'nb2' };
    if (!T) return null;
    const out = [];
    const party = 0x18E00, n = d[party + 4];
    if (n <= 6) for (let i = 0; i < n; i++) { const r = readEnc(d, party + 8 + i * 220, 136, 45, 'Équipe'); if (r) out.push(r); }
    for (let b = 0; b < 24; b++) for (let i = 0; i < 30; i++) {
      const r = readEnc(d, 0x400 + b * (30 * 136 + 0x10) + i * 136, 136, 45, 'Boîte ' + (b + 1));
      if (r) out.push(r);
    }
    return { gen: 5, ...T, mons: out };
  }

  function readGen67(d) {
    const beef = d.length >= 0x1F0 && u32(d, d.length - 0x1F0) === 0x42454546;
    const T = {
      0x65600: { label: 'X / Y', versions: [23, 24], family: 'xy', party: 0x14200, box: 0x22600, boxes: 31 },
      0x76000: { label: 'Rubis Oméga / Saphir Alpha', versions: [25, 26], family: 'rosa', party: 0x14200, box: 0x33000, boxes: 31 },
      0x6BE00: { label: 'Soleil / Lune', versions: [27, 28], family: 'sl', party: 0x1400, box: 0x4E00, boxes: 32 },
      0x6CC00: { label: 'Ultra-Soleil / Ultra-Lune', versions: [29, 30], family: 'usul', party: 0x1600, box: 0x5200, boxes: 32 },
    }[d.length];
    if (!T || !beef) return null;
    const out = [];
    const n = d[T.party + 6 * 260];
    if (n <= 6) for (let i = 0; i < n; i++) { const r = readEnc(d, T.party + i * 260, 232, 67, 'Équipe'); if (r) out.push(r); }
    for (let b = 0; b < T.boxes; b++) for (let i = 0; i < 30; i++) {
      const r = readEnc(d, T.box + (b * 30 + i) * 232, 232, 67, 'Boîte ' + (b + 1));
      if (r) out.push(r);
    }
    return { gen: T.versions[0] >= 27 ? 7 : 6, label: T.label, versions: T.versions, family: T.family, mons: out };
  }

  function readLGPE(d) {
    if (d.length !== 0x100000 || u32(d, 0xB8800 - 0x1F0) !== 0x42454546) return null;
    const out = [];
    for (let i = 0; i < 1000; i++) {
      const r = readEnc(d, 0x5C00 + i * 260, 232, 67, 'Boîte ' + (Math.floor(i / 25) + 1));
      if (r) out.push(r);
    }
    return { gen: 7, label: "Let's Go Pikachu / Évoli", versions: [31, 32], family: 'lgpe', mons: out };
  }

  function readBDSP(d) {
    if (![0xE9828, 0xEDC20, 0xEED8C, 0xEF0A4].includes(d.length)) return null;
    const out = [];
    const party = 0x14098, n = d[party + 0x810];
    if (n <= 6) for (let i = 0; i < n; i++) { const r = readEnc(d, party + i * 0x158, 0x148, 8, 'Équipe'); if (r) out.push(r); }
    for (let b = 0; b < 40; b++) for (let i = 0; i < 30; i++) {
      const r = readEnc(d, 0x14EF4 + (b * 30 + i) * 0x158, 0x148, 8, 'Boîte ' + (b + 1));
      if (r) out.push(r);
    }
    return { gen: 8, label: 'Diamant Étincelant / Perle Scintillante', versions: [37, 38], family: 'dete', mons: out };
  }

  // ---------------------------------------------------------------- point d'entrée
  // tailles connues ; les émulateurs ajoutent parfois un pied (horloge, DeSmuME…) qu'on enlève
  const SIZES = [0x8000, 0x20000, 0x10000, 0x80000, 0x65600, 0x76000, 0x6BE00, 0x6CC00, 0x100000, 0xE9828, 0xEDC20, 0xEED8C, 0xEF0A4];

  function readSave(buf, maps) {
    let d = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    if (!SIZES.includes(d.length)) {
      const base = SIZES.filter((s) => d.length > s && d.length - s <= 0x200).sort((a, b) => b - a)[0];
      if (base) d = d.subarray(0, base);
    }
    const readers = d.length === 0x8000 ? [(x) => readGen1(x, maps), readGen2]
      : d.length === 0x20000 || d.length === 0x10000 ? [(x) => readGen3(x, maps)]
      : d.length === 0x80000 ? [readGen4, readGen5]
      : d.length === 0x100000 ? [readLGPE]
      : [readGen67, readBDSP];
    for (const r of readers) {
      try {
        const res = r(d);
        if (res) {
          // version la plus probable : origine la plus fréquente parmi les Pokémon du jeu
          const count = {};
          for (const m of res.mons) if (m.origin && res.versions.includes(m.origin)) count[m.origin] = (count[m.origin] || 0) + 1;
          const best = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
          res.guess = best ? +best[0] : res.versions[0];
          return res;
        }
      } catch (e) { /* format suivant */ }
    }
    return null;
  }

  const api = { readSave, decrypt45678, crc16ccitt };
  if (typeof module !== 'undefined') module.exports = api;
  root.SaveReader = api;
})(typeof window !== 'undefined' ? window : globalThis);
