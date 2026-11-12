"""Pokémon des lieux de combat (Tour de Combat, Zone de Combat, Métro, Château, Arbre…) d'après Bulbapedia.

Sources (extraites des pages « List of Battle … Trainers » de Bulbapedia, dans tools/sources/) :
  bulbapedia-facility-sets.tsv     : chaque fiche une seule fois, par jeu
      colonnes : jeu, n°, n° national, nom anglais, objet, 4 attaques,
                 nature + 6 EV (PV, Atq, Déf, ASp, DSp, Vit) ; pour Diamant Étincelant / Perle Scintillante :
                 talent, objet, 4 attaques puis les 6 stats au niveau 50 (pas de nature ni d'EV sur Bulbapedia)
  bulbapedia-facility-pools.tsv    : jeu, classe du dresseur, dresseurs (titre de la rubrique), équipe, n° des fiches
  bulbapedia-facility-trainers.tsv : jeu, n° du dresseur, classe, nom (RS : modes et IV ; Château : nom X/Y et nom ROSA)
Diamant / Perle : données du jeu (dp-tower-sets.tsv, dp-tower-trainers.tsv, extraites de battle/b_tower de la décompilation
  pret/pokeplatinum). Platine / HGSS : Meneurs d'après Bulbapedia (bulbapedia-frontier-brains-gen4.tsv).
Émeraude : complété par le tableur « Emerald Battle Frontier Complete » (copie en TSV : emerald-frontier-sets.tsv,
  emerald-frontier-trainers.tsv) : listes complètes des dresseurs et équipes des Meneurs.
Noms anglais -> identifiants avec les CSV de PokeAPI.

Usage : python tools/import_facilities.py [chemin/vers/pokeapi/data/v2/csv]
Sortie : data/facilities.json
"""
import csv, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'tools', 'sources')
PK = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'pokeapi', 'data', 'v2', 'csv')

# jeu -> nom affiché, groupes de versions (data/moves/<n>.json), génération, IV selon le n° du dresseur (Bulbapedia)
FACILITIES = {
    'rs': ('Tour de Combat (Rubis / Saphir)', [5], 3, None),
    'e': ('Zone de Combat (Émeraude)', [6], 3, [(1, 100, 3), (101, 120, 6), (121, 140, 9), (141, 160, 12), (161, 180, 15), (181, 200, 18), (201, 220, 21), (221, 300, 31)]),
    # Diamant / Perle : la page de Bulbapedia indique 16 pour 181-200 et rien pour 201-220 (coquille) ; on suit la 2e liste
    # de la page Génération IV : 0, 4, 8, 12, 16, 20, 24, 31
    'dp': ('Tour de Combat (Diamant / Perle)', [8], 4, [(1, 100, 0), (101, 120, 4), (121, 140, 8), (141, 160, 12), (161, 180, 16), (181, 200, 20), (201, 220, 24), (221, 300, 31)]),
    'ptgs': ('Zone de Combat (Platine / HeartGold / SoulSilver)', [9, 10], 4, [(1, 100, 3), (101, 120, 6), (121, 140, 9), (141, 160, 12), (161, 180, 15), (181, 200, 18), (201, 220, 21), (221, 300, 31)]),
    'subway': ('Métro de Combat (Noir / Blanc / Noir 2 / Blanc 2)', [11, 14], 5, None),
    'maison': ('Château de Combat (X / Y / Rubis Oméga / Saphir Alpha)', [15, 16], 6, [(1, 50, 3), (51, 70, 7), (71, 90, 11), (91, 110, 15), (111, 160, 19), (161, 180, 23), (181, 200, 27), (201, 300, 31)]),
    'tree': ('Arbre de Combat (Soleil / Lune / Ultra-Soleil / Ultra-Lune)', [17, 18], 7, None),
    'swsh': ('Tour de Combat (Épée / Bouclier)', [20], 8, None),
    'bdsp': ('Tour de Combat (Diamant Étincelant / Perle Scintillante)', [23], 8, None),
}
NATURES = ['hardy', 'lonely', 'brave', 'adamant', 'naughty', 'bold', 'docile', 'relaxed', 'impish', 'lax', 'timid', 'hasty', 'serious', 'jolly',
           'naive', 'modest', 'mild', 'quiet', 'bashful', 'rash', 'calm', 'gentle', 'sassy', 'careful', 'quirky']
# objets qui changent les dégâts dans src/battle.js (ITEMS) ; objets de type -> type
BATTLE_ITEMS = {'choice-band', 'choice-specs', 'choice-scarf', 'life-orb', 'expert-belt', 'muscle-band', 'wise-glasses', 'assault-vest', 'eviolite'}
TYPE_ITEMS = {
    'silk-scarf': 1, 'black-belt': 2, 'sharp-beak': 3, 'poison-barb': 4, 'soft-sand': 5, 'hard-stone': 6, 'silver-powder': 7, 'spell-tag': 8,
    'metal-coat': 9, 'charcoal': 10, 'mystic-water': 11, 'miracle-seed': 12, 'magnet': 13, 'twisted-spoon': 14, 'never-melt-ice': 15,
    'dragon-fang': 16, 'black-glasses': 17, 'fairy-feather': 18,
    'fist-plate': 2, 'sky-plate': 3, 'toxic-plate': 4, 'earth-plate': 5, 'stone-plate': 6, 'insect-plate': 7, 'spooky-plate': 8, 'iron-plate': 9,
    'flame-plate': 10, 'splash-plate': 11, 'meadow-plate': 12, 'zap-plate': 13, 'mind-plate': 14, 'icicle-plate': 15, 'draco-plate': 16,
    'dread-plate': 17, 'pixie-plate': 18,
}
# anciennes graphies de Bulbapedia -> nom actuel
ALIAS = {'faintattack': 'feintattack', 'hijumpkick': 'highjumpkick', 'smellingsalt': 'smellingsalts', 'vicegrip': 'visegrip', 'stick': 'leek'}
key = lambda s: ALIAS.get(re.sub(r'[^a-z0-9]', '', s.lower()), re.sub(r'[^a-z0-9]', '', s.lower()))


def read(name):
    with open(os.path.join(SRC, name), encoding='utf-8', newline='') as f:
        r = list(csv.reader(f, delimiter='\t'))
    return r[1:] if r and r[0][0] == 'jeu' else r


def names(fname, idcol, lang):
    d = {}
    with open(os.path.join(PK, fname), encoding='utf-8') as f:
        for r in csv.DictReader(f):
            if r['local_language_id'] == lang:
                d.setdefault(key(r['name']) if lang == '9' else int(r[idcol]), int(r[idcol]) if lang == '9' else r['name'])
    return d


core = json.load(open(os.path.join(ROOT, 'data', 'core.json'), encoding='utf-8'))
moves = json.load(open(os.path.join(ROOT, 'data', 'moves.json'), encoding='utf-8'))['moves']
species = {key(s['en']): s['id'] for s in core['species'].values()}
abilities = {key(a['en']): int(i) for i, a in core['abilities'].items()}
move_en = names('move_names.csv', 'move_id', '9')
item_en = names('item_names.csv', 'item_id', '9')
item_fr = names('item_names.csv', 'item_id', '5')
with open(os.path.join(PK, 'items.csv'), encoding='utf-8') as f:
    item_ident = {int(r['id']): r['identifier'] for r in csv.DictReader(f)}

missing = {}
def miss(kind, v):
    missing.setdefault(kind, set()).add(v)


def item_of(txt):
    # « Choice Band Choice Band » (icône + nom) -> Choice Band
    h = len(txt) // 2
    if txt[:h].strip() == txt[h:].strip():
        txt = txt[:h].strip()
    if txt in ('', '-', 'None'):
        return '', ''
    iid = item_en.get(key(txt))
    if not iid:
        miss('objet', txt)
        return '', txt
    ident = item_ident.get(iid, '')
    battle = ident if ident in BATTLE_ITEMS else ('type-%d' % TYPE_ITEMS[ident] if ident in TYPE_ITEMS else '')
    return battle, item_fr.get(iid, txt)


def move_of(txt):
    if txt in ('', '-'):
        return 0
    mid = move_en.get(key(txt))
    if not mid or str(mid) not in moves:
        miss('attaque', txt)
        return 0
    return mid


def emerald_from_sheet(sets, trainers):
    """Émeraude : complète avec le tableur « Emerald Battle Frontier Complete » (données du jeu).
    Listes des 300 dresseurs (deux pages de Bulbapedia sont coupées : Pokémon Ranger, Psychic), fiche de Zarbi
    utilisée par aucun dresseur, et équipes des Meneurs (symboles Argent et Or, IV fixes)."""
    sheet = read('emerald-frontier-sets.tsv')
    sig = lambda sp, nat, it, mv, ev: (sp, nat, it, tuple(sorted(m for m in mv if m)), tuple(ev))
    have = {sig(s['sp'], s['nature'], s['itemName'], s['moves'], s['ev']): i for i, s in enumerate(sets)}
    by_inst, brains = {}, {}
    for r in sheet:
        entry, name, inst, nat, item, mv, ev, iv = r[1], r[2], r[3], r[4], r[5], [x.rstrip('*') for x in r[6:10]], [int(x) for x in r[11].split('/')], r[12]
        sid = species.get(key(name))
        if not sid:
            miss('Pokémon (tableur)', name)
            continue
        battle_item, item_name = item_of(item)
        s = {'sp': sid, 'item': battle_item, 'itemName': item_name, 'moves': [move_of(x) for x in mv], 'nature': nat.lower(), 'ev': ev}
        k = sig(sid, s['nature'], item_name, s['moves'], ev)
        if k not in have:
            have[k] = len(sets)
            sets.append(s)
        if entry.isdigit():
            by_inst[(key(name), inst)] = have[k]
            sets[have[k]].setdefault('no', []).append(int(entry))  # n° de fiche dans le jeu (Usine de Combat)
        elif '†' not in entry:  # Noland : équipe tirée au hasard comme les autres dresseurs (simple exemple dans le tableur)
            brains.setdefault(entry, (int(iv) if iv else None, []))[1].append(have[k])
    pools = {}
    for r in read('emerald-frontier-trainers.tsv'):
        ids = []
        for c in r[4].split(' ; '):
            m = re.match(r'(.+?) (\d+)$', c.strip())
            if m and (key(m.group(1)), m.group(2)) in by_inst:
                ids.append(by_inst[(key(m.group(1)), m.group(2))])
            else:
                miss('fiche (tableur)', c)
        pools[int(r[1])] = ids
    for t in trainers:
        if t.get('n') in pools:
            t['pool'] = pools[t['n']]
    for name, (iv, pool) in brains.items():
        who, sym = name.split(' ', 1)
        t = {'cls': 'Meneur', 'name': who + ' (symbole ' + ('Argent' if sym.startswith('Silver') else 'Or') + ')', 'pool': pool, 'lvl': 50}
        if iv is not None:
            t['iv'] = iv
        trainers.append(t)


def gen4_ev(ev):
    """Gen 4 : le jeu ne stocke que les stats qui reçoivent des EV ; chacune reçoit 510 / nombre, 255 au maximum
    (Bulbapedia écrit parfois 252 : même stat finale)."""
    n = sum(1 for v in ev if v)
    return [min(255, 510 // n) if v else 0 for v in ev] if n else ev


def dp_from_game(trainers_bp):
    """Diamant / Perle : fiches et listes des dresseurs lues dans les données du jeu (fichiers battle/b_tower/btdpm et btdtr,
    décompilation pret/pokeplatinum, identiques à pret/pokediamond). Bulbapedia a des erreurs dans 61 listes de dresseurs
    et n'a pas la page des Vétérans. Noms des dresseurs : index de Bulbapedia (même numérotation que le jeu)."""
    sets, index = [], {}
    for r in read('dp-tower-sets.tsv'):
        n, dex, item_txt, mv, nat, evs = int(r[1]), int(r[2]), r[5], r[6:10], r[10].lower(), r[11:17]
        battle_item, item_name = item_of(item_txt)
        index[n] = len(sets)
        sets.append({'sp': dex, 'item': battle_item, 'itemName': item_name, 'moves': [move_of(x) for x in mv], 'nature': nat,
                     'ev': [0 if x in ('-', '') else int(x) for x in evs]})
    names = {int(r[1]): (re.sub(r'\s*[♂♀]$', '', r[2]).strip(), r[3]) for r in trainers_bp if r[0] == 'dp'}
    rules = FACILITIES['dp'][3]
    trainers = []
    for r in read('dp-tower-trainers.tsv'):
        num, ids = int(r[1]), [index[int(x)] for x in r[3].split() if int(x) in index]
        if num <= 300:
            cls, name = names.get(num, ('?', '?'))
            t = {'cls': cls, 'name': name, 'pool': ids, 'lvl': 50, 'n': num}
            iv = next((v for a, b, v in rules if a <= num <= b), None)
            if iv is not None:
                t['iv'] = iv
            trainers.append(t)
        elif num in (306, 307):  # Palmer, Magnat de la Tour (21e et 49e combat) ; 301 à 305 : partenaires des combats multi
            trainers.append({'cls': 'Magnat de la Tour', 'name': 'Palmer (' + ('21e' if num == 306 else '49e') + ' combat)', 'pool': ids, 'lvl': 50})
    return sets, trainers


def gen4_brains(sets, trainers):
    """Platine / HGSS : équipes des Meneurs d'après leurs pages Bulbapedia (Palmer, Dahlia, Darach).
    Argenta (Battle Hall) et Thorton (Battle Factory) utilisent les Pokémon des listes normales."""
    groups = {}
    for r in read('bulbapedia-frontier-brains-gen4.tsv'):
        who, place, sym, dex, item_txt, mv, nat, evs = r[1], r[2], r[3], int(r[4]), r[6], r[7:11], r[11].lower(), r[12:18]
        battle_item, item_name = item_of(item_txt)
        groups.setdefault((who, place, sym), []).append(len(sets))
        sets.append({'sp': dex, 'item': battle_item, 'itemName': item_name, 'moves': [move_of(x) for x in mv], 'nature': nat,
                     'ev': gen4_ev([0 if x in ('-', '') else int(x) for x in evs])})
    for (who, place, sym), pool in groups.items():
        trainers.append({'cls': 'Meneur', 'name': f'{who} — {place} (symbole {sym})', 'pool': pool, 'lvl': 50})


# Usine de Combat : quelles fiches (n° dans le jeu) et quels IV selon la série.
# Émeraude : pret/pokeemerald, src/battle_factory.c (sInitialRentalMonRanges, sFixedIVTable ; n° de fiche = monId + 1).
# Platine / HGSS : pret/pokeplatinum, src/overlay104/battle_factory_helpers.c (sLevel50Pools, sOpenLevelPlayerPools,
# sOpenLevelOpponentPools).
FACTORY = {
    'e': {
        'name': 'Usine de Combat (Émeraude)',
        'lv50': [[111, 200], [163, 267], [268, 372], [373, 468], [469, 564], [565, 660], [661, 756], [373, 850]],
        'open': [[373, 468], [469, 564], [565, 660], [661, 756], [373, 882], [373, 882], [373, 882], [373, 882]],
        'iv': [3, 6, 9, 12, 15, 21, 31, 31],          # Pokémon loués et dresseurs 1 à 6
        'ivLast': [6, 9, 12, 15, 18, 31, 31, 31],     # 7e dresseur de la série
        'brain': {'name': 'Noland', 'silver': [3, 15], 'gold': [6, 31]},  # [série, IV] : 21e et 42e combat
    },
    'ptgs': {
        'name': 'Usine de Combat (Platine / HeartGold / SoulSilver)',
        'lv50': [[1, 150, 0], [151, 250, 4], [251, 350, 8], [351, 486, 12], [487, 622, 16], [623, 758, 20], [759, 894, 24], [351, 950, 31]],
        'openPlayer': [[351, 486, 0], [487, 622, 4], [623, 758, 8], [759, 894, 12], [623, 950, 16], [623, 950, 20], [623, 950, 24], [351, 950, 31]],
        'openOpp': [[351, 486, 0], [487, 622, 4], [623, 758, 8], [759, 894, 12], [351, 950, 16], [351, 950, 20], [351, 950, 24], [351, 950, 31]],
        'brain': {'name': 'Thorton', 'lv50': [[351, 486, 12], [351, 486, 31]], 'open': [[759, 950, 12], [759, 950, 31]]},
    },
}


def platinum_set_ids(sets):
    """Platine / HGSS : n° de chaque fiche dans le jeu (ordre des données extraites du jeu par RainingChain/pokemoncompletion,
    copié dans platinum-frontier-set-ids.tsv), retrouvé par Pokémon + objet + attaques."""
    sig = lambda sp, it, mv: (sp, it, tuple(sorted(m for m in mv if m)))
    have = {}
    for i, st in enumerate(sets):
        have.setdefault(sig(st['sp'], st['itemName'], st['moves']), []).append(i)
    for r in read('platinum-frontier-set-ids.tsv'):
        sid = species.get(key(r[2]))
        k = sig(sid, item_of(r[3])[1], [move_of(x) for x in r[4:8]])
        for i in have.get(k, []):
            sets[i].setdefault('no', []).append(int(r[1]))
        if k not in have:
            miss('fiche Platine', r[1] + ' ' + r[2])


out = []
sets_rows = read('bulbapedia-facility-sets.tsv')
pools_rows = read('bulbapedia-facility-pools.tsv')
trainers_rows = read('bulbapedia-facility-trainers.tsv')
for fid, (label, mvgs, gen, ivrules) in FACILITIES.items():
    sets, index = [], {}
    for r in sets_rows:
        if r[0] != fid:
            continue
        n, dex, name = int(r[1]), int(r[2]), r[3]
        tag = ''
        m = re.search(r'\*\*(S M|US UM)\*\*', name)
        if m:
            tag = 'sm' if m.group(1) == 'S M' else 'usum'
        sid = int(dex) if str(dex) in core['species'] else species.get(key(re.sub(r'\*\*.*|\\\*', '', name)))
        if not sid:
            miss('Pokémon', name)
            continue
        if fid == 'bdsp':
            ab_txt, item_txt, mv, stats = r[4], r[5], r[6:10], r[10:16]
            ab = abilities.get(key(ab_txt), 0)
            if not ab:
                miss('talent', ab_txt)
            nature, ev, fixed = 'hardy', [0] * 6, [int(x) for x in stats]
        else:
            item_txt, mv, nat, evs = r[4], r[5:9], r[9], r[10:16]
            ab, fixed = 0, None
            nature = nat.lower() if nat.lower() in NATURES else 'hardy'
            if nat.lower() not in NATURES:
                miss('nature', nat)
            ev = [0 if x in ('-', '') else int(x) for x in evs]
        battle_item, item_name = item_of(item_txt)
        s = {'sp': sid, 'item': battle_item, 'itemName': item_name, 'moves': [move_of(x) for x in mv], 'nature': nature, 'ev': ev}
        if ab:
            s['ab'] = ab
        if fixed:
            s['stats'] = fixed
        if tag:
            s['only'] = tag
        index[n] = len(sets)
        sets.append(s)
    # n° et IV de chaque dresseur
    tr_index = {}
    for r in trainers_rows:
        if r[0] != fid:
            continue
        num, cls = int(r[1]), re.sub(r'\s*[♂♀]$', '', r[2]).strip()
        iv = None
        if fid == 'rs':
            iv = int(r[5]) if r[5].isdigit() else None
        elif ivrules:
            iv = next((v for a, b, v in ivrules if a <= num <= b), None)
        for nm in {r[3], r[4]} - {''}:
            tr_index.setdefault(nm, []).append((cls, num, iv))
    trainers = []
    for r in pools_rows:
        if r[0] != fid:
            continue
        cls, head, team, ids = r[1], r[2], r[3], [int(x) for x in r[4].split()]
        lvl = 50
        m = re.search(r'\s*\(Lv\.(50|100) Mode\)', head)
        if m:
            lvl = int(m.group(1))
            head = head[:m.start()]
        pool = list(dict.fromkeys(index[i] for i in ids if i in index))  # ordre de la page
        for nm in [x.strip() for x in re.split(r',\s*(?:and\s+)?|\s+and\s+', head) if x.strip()]:
            cand = tr_index.get(nm, [])
            hit = [c for c in cand if c[0].lower().startswith(cls.lower()[:5]) or cls.lower().startswith(c[0].lower()[:5])] or cand
            num, iv = (hit[0][1], hit[0][2]) if hit else (None, None)
            t = {'cls': cls, 'name': nm, 'pool': pool, 'lvl': lvl}
            if num is not None:
                t['n'] = num
            if iv is not None:
                t['iv'] = iv
            if team:
                t['team'] = team
            trainers.append(t)
    # Château de Combat : même dresseur, nom différent dans X/Y et dans ROSA -> une seule entrée « Owen / Tancred »
    merged = {}
    for t in trainers:
        k = (t.get('n'), t['lvl'], t.get('team', ''), tuple(t['pool'])) if t.get('n') is not None else id(t)
        if k in merged:
            if t['name'] not in merged[k]['name'].split(' / '):
                merged[k]['name'] += ' / ' + t['name']
        else:
            merged[k] = t
    trainers = sorted(merged.values(), key=lambda t: (t.get('n', 999), t['name'], t.get('team', '')))
    if fid == 'e':
        emerald_from_sheet(sets, trainers)
    if fid == 'dp':
        sets, trainers = dp_from_game(trainers_rows)
    if fid == 'ptgs':
        for st in sets:
            st['ev'] = gen4_ev(st['ev'])
        platinum_set_ids(sets)
        gen4_brains(sets, trainers)
    fac = {'id': fid, 'name': label, 'mvg': mvgs, 'gen': gen, 'sets': sets, 'trainers': trainers}
    if fid in FACTORY:
        fac['factory'] = FACTORY[fid]
    out.append(fac)
    print(f'{fid:7} {len(sets):5} fiches, {len(trainers):4} dresseurs ({sum(1 for t in trainers if "iv" in t)} avec IV)')

with open(os.path.join(ROOT, 'data', 'facilities.json'), 'w', encoding='utf-8') as f:
    json.dump({'source': 'Bulbapedia (listes des dresseurs des lieux de combat) ; Émeraude : tableur « Emerald Battle Frontier Complete »', 'facilities': out}, f, ensure_ascii=False, separators=(',', ':'))
for k, v in missing.items():
    print('non reconnu —', k, ':', sorted(v)[:40])
