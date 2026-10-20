#!/usr/bin/env python3
"""
Convertit l'export de la feuille « Legal Matching Pokéballs 2.1 » (reddit u/OracleLink)
en data/curated/matching-balls.json, rattaché aux espèces / formes de l'appli.

Entrée : data/curated/matching-balls-source.txt (une ligne par Pokémon)
  numéro|nom anglais (forme)|balls normales|balls shiny
  VIV|motif|balls|            (Prismillon)
  ALC|crème/décoration|balls| (Charmilly)
"""
import json, os, re, sys, unicodedata

ROOT = os.path.join(os.path.dirname(__file__), '..')
core = json.load(open(os.path.join(ROOT, 'data/core.json'), encoding='utf-8'))
src = open(os.path.join(ROOT, 'data/curated/matching-balls-source.txt'), encoding='utf-8').read().strip().split('\n')

BALL = lambda b: {'poke': 'poke-ball'}.get(b, b + '-ball')
slug = lambda s: re.sub(r'[^a-z0-9]+', '-', unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode().lower().replace("'", '').replace('%', '')).strip('-')
# formes « regroupées » dans la feuille = forme par défaut de l'espèce
GENERIC = {'all', 'both', 'all-drives', 'plates', 'no-plate', 'normal', 'incarnate', 'confined', 'plant', 'midday',
           'baile', '50', 'teal-mask', 'original', 'land', 'male', 'red-striped', 'chest', 'combat-breed', 'single-strike',
           'amped', 'west', 'spring', 'red', 'green', 'curly'}
ALIASES = {'10': '10', 'ice-rider': 'ice', 'shadow-rider': 'shadow', 'pom-pom': 'pom-pom', 'pau': 'pau', 'combat-breed': 'paldea-combat-breed',
           'blaze-breed': 'paldea-blaze-breed', 'aqua-breed': 'paldea-aqua-breed', 'dusk-mane': 'dusk', 'dawn-wings': 'dawn',
           'wellspring': 'wellspring-mask', 'hearthflame': 'hearthflame-mask', 'cornerstone': 'cornerstone-mask',
           'pharoah': 'pharaoh', 'roaming': 'roaming', 'origin': 'origin', 'kyurem-white': 'white', 'low-key': 'low-key'}

forms_by_sp = {}
for f in core['forms'].values():
    forms_by_sp.setdefault(f['sp'], []).append(f)

out = {'_info': "Balls assorties légales (feuille « Legal Matching Pokéballs 2.1 » de reddit u/OracleLink). "
                "n = Pokémon normal, s = shiny. Jusqu'à 3 Balls par Pokémon, choisies par couleur/thème.",
       'species': {}, 'forms': {}, 'female': {}}
unmatched = []
alc_shiny = {}
for line in src:
    kind, name, normal, shiny = (line.split('|') + ['', ''])[:4]
    n = [BALL(b) for b in normal.split()] if normal else []
    s = [BALL(b) for b in shiny.split()] if shiny else []
    rec = {'n': n, 's': s or n}
    if kind == 'VIV':
        f = next((x for x in forms_by_sp[666] if x['ident'] == slug(name)), None)
        if f: out['forms'][f['id']] = {'n': n, 's': n}
        else: unmatched.append(line)
        continue
    if kind == 'ALC':
        cream, sweet = name.split('/')
        if sweet == '2' or not n:
            continue
        if 'Shiny' in cream:  # ligne shiny commune à toutes les crèmes pour une décoration
            alc_shiny[slug(sweet)] = n
            continue
        ident = slug(cream) + '-' + slug(sweet)
        f = next((x for x in forms_by_sp[869] if x['ident'] == ident), None)
        if f: out['forms'][f['id']] = {'n': n, 's': n}
        else: unmatched.append(line)
        continue
    sid = int(kind)
    m = re.match(r'^(.*?)\*?\s*(?:\((.+)\))?$', name.strip())
    tag = m.group(2)
    if not tag:
        out['species'][sid] = rec
        continue
    t = slug(tag)
    sp = core['species'][str(sid)]
    if t == 'female':
        # variété femelle distincte (Mistigrix, Wimessir…) ou simple différence de sexe
        fem = next((x for x in forms_by_sp[sid] if x['ident'] == 'female'), None)
        if fem and not fem['def']: out['forms'][fem['id']] = rec
        else: out['female'][sid] = rec
        continue
    cand = [ALIASES.get(t, t), t]
    f = next((x for x in forms_by_sp[sid] if x['ident'] in cand and not x['battle']), None)
    if not f:
        f = next((x for x in forms_by_sp[sid] if any(c and x['ident'].startswith(c) for c in cand) and not x['battle']), None)
    if f and not f['def']:
        out['forms'][f['id']] = rec
        if t in GENERIC and sid not in out['species']: out['species'][sid] = rec
    elif t in GENERIC or (f and f['def']):
        out['species'].setdefault(sid, rec)
    else:
        unmatched.append(line)
        out['species'].setdefault(sid, rec)

for f in forms_by_sp[869]:
    r = out['forms'].get(f['id'])
    if r:
        for sw, balls in alc_shiny.items():
            if f['ident'].endswith(sw): r['s'] = balls
json.dump(out, open(os.path.join(ROOT, 'data/curated/matching-balls.json'), 'w', encoding='utf-8'), ensure_ascii=False)
missing = [s for s in core['species'] if int(s) not in out['species']]
print(len(out['species']), 'espèces,', len(out['forms']), 'formes,', len(out['female']), 'femelles')
print('non reliés :', unmatched)
print('espèces sans données :', missing)
