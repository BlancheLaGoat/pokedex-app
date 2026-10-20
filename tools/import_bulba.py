#!/usr/bin/env python3
"""
Lieux de capture de Diamant Étincelant / Perle Scintillante, Légendes Arceus, Légendes Z-A (+ Méga-Dimension)
et Rubis Oméga / Saphir Alpha, à partir des tables de capture de Bulbapedia
(Template:Catch/entrybdsp, entryla, entryza, entryoras).

Entrée : data/curated/bulba/catch.tsv (page \t section \t biome \t modèle \t paramètres), data/curated/bulba/names-fr.json
Sortie : data/enc/{25,26,37,38,39,47,48}.json + lieux/zones/méthodes ajoutés à data/core.json
À relancer après tools/build_data.py (et tools/import_sv.py).
"""
import json, os, re, collections

ROOT = os.path.join(os.path.dirname(__file__), '..')
D = lambda *p: os.path.join(ROOT, 'data', *p)
core = json.load(open(D('core.json'), encoding='utf-8'))
fr_names = json.load(open(D('curated/bulba/names-fr.json'), encoding='utf-8'))
rows = [l.rstrip('\n').split('\t') for l in open(D('curated/bulba/catch.tsv'), encoding='utf-8') if l.strip()]

slug = lambda s: re.sub(r'[^a-z0-9]+', '-', s.lower().replace('é', 'e').replace("'", '')).strip('-')
TEMPLATES = {'entrybdsp': ('bdsp', (37, 38), 4), 'entryoras': ('oras', (25, 26), 3), 'entryla': ('la', (39,), 9),
             'entryza': ('za', (47,), 6)}

# méthodes ajoutées
METHODS = {
    9201: ('bp-radar', 'Poké Radar'), 9202: ('bp-swarm', 'Essaim'), 9203: ('bp-honey', 'Arbre à Miel'),
    9204: ('bp-underground', 'Grand Souterrain'), 9205: ('bp-horde', 'Horde'), 9206: ('bp-tallgrass', 'Hautes herbes'),
    9207: ('bp-seaweed', 'Algues (Plongée)'), 9208: ('bp-dive', 'Plongée'), 9209: ('bp-sand', 'Sable'),
    9210: ('bp-flock', 'Nuée'), 9211: ('bp-backlot', 'Arrière-cour du Manoir'), 9212: ('bp-wild', 'Sauvage'),
    9213: ('bp-alpha', 'Baron (Alpha)'), 9214: ('bp-fossil', 'Fossile'),
}
for k, (ident, frn) in METHODS.items():
    core['encMethods'][str(k)] = {'ident': ident, 'fr': frn}
MID = {v[0]: k for k, v in METHODS.items()}
WALK, OLD, GOOD, SUPER, SURF, SMASH, GIFT, GIFTEGG, STATIC, TRADE = 1, 2, 3, 4, 5, 6, 18, 19, 20, 36
TIMES = {'morning': (9101, 'Le matin'), 'day': (9102, 'En journée'), 'evening': (9103, 'Le soir'), 'night': (9104, 'La nuit')}
for k, (cid, frn) in TIMES.items():
    core['encConds'][str(cid)] = frn

OLD_METHOD = {'Grass': WALK, 'Cave': WALK, 'Building': WALK, 'Surf': SURF, 'Fish Old': OLD, 'Fish Good': GOOD, 'Fish Super': SUPER,
              'Fishing': SUPER, 'Rock Smash': SMASH, 'Gift': GIFT, 'Starter': GIFT, 'Trade': TRADE, 'Egg': GIFTEGG,
              'Poké Radar': MID['bp-radar'], 'Swarm': MID['bp-swarm'], 'Honey': MID['bp-honey'], 'Horde Encounter': MID['bp-horde'],
              'Tall grass': MID['bp-tallgrass'], 'Seaweed': MID['bp-seaweed'], 'Dive': MID['bp-dive'], 'Sand': MID['bp-sand'],
              'Flocks': MID['bp-flock'], 'Backlot': MID['bp-backlot'], 'Special': STATIC, 'yes': STATIC, 'Only One': STATIC}
FOSSILS = {'Helix', 'Dome', 'Amber', 'Root', 'Claw', 'Skull', 'Armor', 'Cover', 'Plume', 'Jaw', 'Sail'}

SECTION_DROP = re.compile(r'(Generation|Brilliant Diamond|Shining Pearl|Legends|Omega Ruby|Alpha Sapphire|^Pokémon$|Pokémon Legends)', re.I)
WORDS = {'Rare Spawns': 'Apparitions rares', 'Visible Encounters': 'Pokémon visibles', 'Exterior': 'Extérieur', 'Interior': 'Intérieur',
         'Surfing': 'Surf', 'Fishing': 'Pêche', 'Special': 'Spécial', 'Changing Pokémon': 'Pokémon variables', 'Gift Pokémon': 'Cadeau',
         'Shaking ore deposits': 'Gisements qui tremblent', 'Shaking trees': 'Arbres qui tremblent', 'Unown Research Notes': 'Notes sur les Zarbi',
         'Alpha Pokémon': 'Barons', 'Fixed alpha Pokémon spawns': 'Barons fixes', 'Space-time distortion': 'Distorsion spatio-temporelle',
         'Massive mass outbreaks': 'Apparitions massives', 'Mass outbreaks': 'Apparitions massives', 'Mass outbreak': 'Apparition massive', 'Massive mass outbreak': 'Apparition massive', 'Wild Pokémon': 'Pokémon sauvages'}

MOVES_FR = {'Strength': 'Force', 'Defog': 'Anti-Brume', 'Rock Climb': 'Escalade', 'Waterfall': 'Cascade', 'Surf': 'Surf', 'Rock Smash': 'Éclate-Roc', 'Flash': 'Flash', 'Cut': 'Coupe'}
EXTRA = {'Fixed Alpha': 'Barons fixes', 'In the air': 'Dans les airs', 'Swarm': 'Essaim', 'hidden Pokémon': 'Pokémon cachés', 'Water': 'Eau',
         'Space-time distortions': 'Distorsions spatio-temporelles', 'Base Encounters': 'Rencontres de base', 'Horde Encounter': 'Horde',
         'Grass': 'Herbes', 'Cave': 'Grotte', 'Rock Smash': 'Éclate-Roc', 'Tall grass': 'Hautes herbes', 'Seaweed': 'Algues', 'Underwater': 'Sous l\'eau',
         'Poké Radar': 'Poké Radar', 'Honey Tree': 'Arbre à Miel', 'Static': 'Fixe', 'Gift': 'Cadeau', 'Land': 'Au sol', 'Trees': 'Arbres',
         'Ore deposits': 'Gisements', 'Statues': 'Statues'}


def tr(x):
    x = WORDS.get(x, EXTRA.get(x, x))
    x = re.sub(r'TM\|\d+\|([A-Za-z ]+)', lambda m: 'CT ' + MOVES_FR.get(m.group(1), m.group(1)), x)
    x = re.sub(r'HM\|\d+\|([A-Za-z ]+)', lambda m: 'CS ' + MOVES_FR.get(m.group(1), m.group(1)), x)
    x = x.replace('Added after obtaining the National Pokédex', 'Après le Pokédex National').replace('Added after obtaining ', 'Après ')
    x = x.replace('Added after defeating ', 'Après avoir battu ')
    x = re.sub(r'mcolor\|([^|]+)\|\w+', lambda m: MOVES_FR.get(m.group(1), m.group(1)), x)
    x = re.sub(r'Added after earning the badge\|(\w+)', r'Après le Badge \1', x)
    x = {'Flying': 'Vol', 'Fishing': 'Pêche'}.get(x, x)
    x = re.sub(r'Hyperspace Wild Zone (\d+)', r"Zone sauvage d'Extra Illumis n° \1", x)
    return x


vars_by_sp = collections.defaultdict(list)
for p in core['pokemon'].values():
    vars_by_sp[p['sp']].append(p)


def pokemon_id(dex, form):
    m = re.match(r'(\d+)', dex)
    if not m: return None
    sid = int(m.group(1))
    form = (form or '').replace('&nbsp;', ' ')
    tokens = [t for t in slug(form).split('-') if t and t not in ('form', 'forme', 'normal', 'breed', 'mode')]
    tokens = [{'paldean': 'paldea', 'alolan': 'alola', 'galarian': 'galar', 'hisuian': 'hisui', 'kantonian': ''}.get(t, t) for t in tokens]
    tokens = [t for t in tokens if t]
    cands = vars_by_sp.get(sid, [])
    if tokens:
        best = [p for p in cands if all(t in p['ident'].split('-') for t in tokens)]
        if best: return best[0]['id']
    d = [p for p in cands if p['def']]
    return (d or cands or [{'id': None}])[0]['id']


def parse_params(s):
    out, cur, depth, i = [], '', 0, 0
    while i < len(s):
        c2 = s[i:i + 2]
        if c2 in ('[[', '{{'): depth += 1; cur += c2; i += 2; continue
        if c2 in (']]', '}}'): depth -= 1; cur += c2; i += 2; continue
        if s[i] == '|' and depth == 0: out.append(cur); cur = ''
        else: cur += s[i]
        i += 1
    out.append(cur)
    pos, named = [], {}
    for p in out:
        m = re.match(r'^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=(.*)$', p, re.S)
        if m: named[m.group(1)] = m.group(2).strip()
        else: pos.append(p.strip())
    return pos, named


def clean(s):
    s = re.sub(r'<br\s*/?>.*', '', s or '')
    # « color2|000|Titre|Texte » (accolades coupées) -> dernier morceau
    if 'color2|' in s:
        s = re.sub(r'\{*color2\|[0-9A-Fa-f]+\|', '', s).split('|')[-1]
    s = re.sub(r'^Only during\s+', 'Pendant la ', s)
    s = re.sub(r'Side Mission (\d+)', r'mission secondaire \1', s)
    s = re.sub(r'\{\{color2\|[^|]*\|[^|]*\|([^}]*)\}\}', r'\1', s)
    s = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]', r'\1', s)
    s = re.sub(r'<[^>]+>|\{\{|\}\}', '', s)
    return s.strip(' |')


def levels(s):
    s = re.sub(r'\[\[.*?\]\]', '', s or '')
    nums = [int(x) for x in re.findall(r'\d+', s)]
    return (min(nums), max(nums)) if nums else (0, 0)


def pct(s):
    m = re.search(r'([\d.]+)\s*%', s or '')
    return round(float(m.group(1))) if m else 0


# lieux existants de PokéAPI (même identifiant -> même carte)
by_ident = {l['ident']: int(k) for k, l in core['locations'].items()}
REGION = {'bdsp': 4, 'oras': 3, 'la': 9, 'za': 6}
PREFIX = {'bdsp': ['sinnoh-', ''], 'oras': ['hoenn-', ''], 'la': [], 'za': []}
next_loc, next_area = 9400, 94000
loc_ids, area_ids = {}, {}


def loc_for(page, game):
    global next_loc
    key = (game in ('la', 'za'), page)
    if key in loc_ids: return loc_ids[key]
    for pre in PREFIX[game]:
        lid = by_ident.get(pre + slug(page))
        if lid:
            loc_ids[key] = lid
            return lid
    lid = next_loc; next_loc += 1
    core['locations'][str(lid)] = {'fr': fr_names.get(page, page).split('#')[0], 'ident': game + '-' + slug(page), 'reg': REGION[game], 'en': page}
    loc_ids[key] = lid
    return lid


def area_for(page, section, div, game):
    global next_area
    sec = section.split(':', 1)[1] if ':' in section else section
    sec = clean(sec)
    if SECTION_DROP.search(sec): sec = ''
    label = clean(div.split('|', 1)[1]) if '|' in div else ''
    sec, label = tr(sec), tr(label)
    key = (game, page, sec, label)
    if key in area_ids: return area_ids[key]
    lid = loc_for(page, game)
    aid = next_area; next_area += 1
    area_ids[key] = aid
    base = core['locations'][str(lid)]['fr']
    parts = [base] + [x for x in (sec, label) if x and x != base]
    core['areas'][str(aid)] = {'l': lid, 'ident': slug(sec + ' ' + label), 'fr': ' — '.join(parts)}
    return aid


enc = collections.defaultdict(lambda: collections.defaultdict(list))
unmatched = []
for page, section, div, tpl, params in rows:
    game, versions, _ = TEMPLATES[tpl]
    pos, named = parse_params(params)
    if len(pos) < 3: continue
    # le nom du Pokémon est en 2e position, sauf quand form= est placé avant (entryoras)
    pid = pokemon_id(pos[0], named.get('form', ''))
    if not pid: unmatched.append(params[:40]); continue
    area = area_for(page, section, div, game)
    if game in ('bdsp', 'oras'):
        if len(pos) < 6: continue
        flags = (pos[2].lower() == 'yes', pos[3].lower() == 'yes')
        how = pos[4]
        meth = OLD_METHOD.get(how)
        if how in FOSSILS: meth = MID['bp-fossil']
        if meth is None: meth = WALK if re.match(r'^\d?F|^B\d', how) else STATIC
        if 'Underground' in page and meth == WALK: meth = MID['bp-underground']
        lo, hi = levels(pos[5])
        conds, rate = [], 0
        if named.get('all'): rate = pct(named['all'])
        elif game == 'bdsp' and len(pos) >= 9:
            vals = {'morning': pct(pos[6]), 'day': pct(pos[7]), 'night': pct(pos[8])}
            rate = max(vals.values())
            if 0 in vals.values(): conds = [TIMES[t][0] for t, v in vals.items() if v > 0]
        elif len(pos) > 6: rate = pct(pos[6])
        if meth in (GIFT, STATIC, TRADE, GIFTEGG, MID['bp-fossil']): rate = 100
        rec = [area, meth, conds, lo, hi, min(rate, 100)]
        for v, ok in zip(versions, flags):
            if ok: enc[v][pid].append(rec)
    else:
        lo, hi = levels(pos[2])
        alpha = named.get('alpha', '').lower() == 'yes'
        conds = []
        if game == 'la':
            times = {t: named.get(t, pos[3 + i] if len(pos) > 3 + i else '') for i, t in enumerate(('morning', 'day', 'evening', 'night'), start=1)}
            if not named.get('all') and not all('✔' in (v or '') for v in times.values()):
                conds = [TIMES[t][0] for t, v in times.items() if '✔' in (v or '')]
            if alpha and len(pos) > 3: lo, hi = levels(pos[3]) if pos[3] else (lo, hi)
        else:
            if not (len(pos) > 3 and pos[3]):
                d_ok = '✔' in (named.get('day', pos[4] if len(pos) > 4 else '') or '')
                n_ok = '✔' in (named.get('night', pos[5] if len(pos) > 5 else '') or '')
                if d_ok != n_ok: conds = [TIMES['day'][0] if d_ok else TIMES['night'][0]]
        label = div.lower()
        if 'gift' in label: meth = GIFT
        elif alpha: meth = MID['bp-alpha']
        else: meth = MID['bp-wild']
        rec = [area, meth, conds, lo, hi, 0 if meth != GIFT else 100]
        vs = versions
        if game == 'za' and 'yperspace' in (page + section + div): vs = (48,)
        for v in vs: enc[v][pid].append(rec)

# Légendes Z-A : Pokémon hors zones sauvages (secteurs de la ville, égouts…), d'après les fiches Pokémon de Bulbapedia
SECTOR_FR = {'Vert': 'Vert', 'Bleu': 'Bleu', 'Magenta': 'Magenta', 'Rouge': 'Rouge', 'Jaune': 'Jaune'}
za_special = {'47': {}, '48': {}}
en_to_sid = {s2['en']: s2['id'] for s2 in core['species'].values()}
avail = D('curated/bulba/za-availability.tsv')
if os.path.exists(avail):
    for line in open(avail, encoding='utf-8'):
        if not line.strip(): continue
        name, ver, none, once, gift, trade, evo, links = (line.rstrip('\n').split('\t') + [''] * 8)[:8]
        sid = en_to_sid.get(name)
        if not sid: continue
        pid = next(p2['id'] for p2 in vars_by_sp[sid] if p2['def'])
        links = [l for l in links.split(';') if l and l != 'Evolution']
        if gift == '1':
            za_special[ver][str(sid)] = {'status': 'event', 'note': 'Cadeau Mystère (distribution)'}
            continue
        if none == '1' and not links:
            za_special[ver][str(sid)] = {'status': 'event', 'note': "Pas de capture en jeu : échange ou transfert uniquement"}
            continue
        if not links: continue
        if sid in {s3 for s3 in (int(k) for k in [])}: pass
        already = any(str(pid) in enc[int(ver)] for _ in [0])
        if already and once != '1': continue
        for l in links:
            m = re.match(r'(Vert|Bleu|Magenta|Rouge|Jaune) Sector (\d+)', l)
            if m and l not in fr_names: fr_names[l] = f'Secteur {SECTOR_FR[m.group(1)]} n° {m.group(2)}'
            area = area_for(l, '', '', 'za')
            meth = STATIC if once == '1' else MID['bp-wild']
            enc[int(ver)][pid].append([area, meth, [], 0, 0, 100 if once == '1' else 0])
za_special['48']['721'] = {'status': 'unique', 'label': 'Fabuleux', 'note': "Volcanion — mission secondaire 194 « Volcanion Unleashed », Labo Pokémon du secteur Vert (un seul exemplaire)"}
json.dump({'_info': 'Généré par tools/import_bulba.py (Légendes Z-A : distributions et échanges).', 'families': ['za'], 'segments': [],
           'methodMinSegment': {}, 'methodNotes': {}, 'itemSegment': {}, 'itemNotes': {}, 'locationNames': {}, 'npcTrades': {}, 'overrides': {},
           'choiceGroups': {'47': [{'label': 'Starter (un seul au choix)', 'species': [152, 498, 158]}]}, 'special': za_special,
           'notes': {'47': ["Lieux d'après les tables de capture et les fiches Pokémon de Bulbapedia. Les Pokémon non listés sont marqués « Données manquantes »."], '48': '@47'}},
          open(D('curated/za.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

for v, d in enc.items():
    out = {}
    for pid, lst in d.items():
        seen, uniq = set(), []
        for r in lst:
            k = json.dumps(r)
            if k not in seen: seen.add(k); uniq.append(r)
        out[pid] = uniq
    json.dump(out, open(D('enc', f'{v}.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
json.dump(core, open(D('core.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('lieux', len(set(loc_ids.values())), 'zones', len(area_ids), {v: len(d) for v, d in sorted(enc.items())})
print('non reliés', unmatched[:10])
