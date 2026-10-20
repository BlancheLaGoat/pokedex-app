#!/usr/bin/env python3
"""
Ajoute les lieux de capture d'Écarlate / Violet (+ Masque Turquoise et Disque Indigo),
que PokéAPI n'a pas, à partir des tables de capture de Bulbapedia (Template:Catch/entry9).

Entrée  : data/curated/sv/bulbapedia-catch.tsv   (page \t section \t biome \t E|S \t paramètres)
          data/curated/sv/names-fr.json         (noms français des lieux)
Sortie  : data/enc/40.json, 41.json (base), 42/52 (Masque Turquoise), 43/53 (Disque Indigo)
          + lieux, zones, méthodes et conditions ajoutés à data/core.json
À relancer après tools/build_data.py.
"""
import json, os, re, collections

ROOT = os.path.join(os.path.dirname(__file__), '..')
D = lambda *p: os.path.join(ROOT, 'data', *p)
core = json.load(open(D('core.json'), encoding='utf-8'))
names_fr = json.load(open(D('curated/sv/names-fr.json'), encoding='utf-8'))
rows = [l.rstrip('\n').split('\t') for l in open(D('curated/sv/bulbapedia-catch.tsv'), encoding='utf-8') if l.strip()]

KITAKAMI = {'Mossui Town', 'Kitakami Hall', 'Loyalty Plaza', 'Timeless Woods', 'Kitakami Wilds', 'Paradise Barrens', 'Apple Hills',
            'Oni Mountain', 'Crystal Pool', 'Wistful Fields', 'Dreaded Den', 'Fellhorn Gorge', 'Mossfell Confluence', "Reveler's Road",
            "Oni's Maw", 'Kitakami Road', 'Infernal Pass', 'Chilling Waterhead', 'Tengu Mountain'}
BLUEBERRY = {'Canyon Biome', 'Savanna Biome', 'Polar Biome', 'Coastal Biome', 'Savanna Plaza', 'Polar Plaza', 'Coastal Plaza',
             'Central Plaza', 'Canyon Plaza', 'Chargestone Cavern', 'Torchlit Labyrinth', 'League Club Room', 'Terarium',
             'Blueberry Academy', 'Area Zero Underdepths'}
# versions : (Écarlate, Violet)
VERS = {'base': (40, 41), 'kitakami': (42, 52), 'blueberry': (43, 53)}
BIOME = {'P': 'Prairie', 'Fo': 'Forêt', 'T': 'Ville', 'D': 'Désert', 'Mo': 'Montagne', 'Sn': 'Plaine enneigée', 'Sw': 'Marais',
         'L': 'Lac', 'Ri': 'Rivière', 'Oc': 'Mer', 'U': 'Souterrain', 'Ro': 'Zone rocheuse', 'Ca': 'Grotte', 'Be': 'Plage',
         'Fl': 'Champ de fleurs', 'Ba': 'Bambouseraie', 'W': 'Terres désolées', 'V': 'Volcan', 'Mi': 'Mine', 'Ol': 'Oliveraie',
         'Ru': 'Ruines', 'Cw': 'Grotte', 'Cs': ''}
SECTION_FR = {'Northern Mountain': 'Montagne nord', 'Southern Mountain': 'Montagne sud', 'Northern Passage': 'Passage nord',
              'Western Passage': 'Passage ouest', 'Mountain': 'Montagne', 'Depths': 'Profondeurs', 'Crater': 'Cratère',
              'Lake Caves': 'Grottes du lac', 'Small Cave': 'Petite grotte', 'Grassy Cave': 'Grotte herbeuse',
              'Waterfall Cave': 'Grotte de la cascade', 'Lower Field': 'Champ inférieur', 'Upper Field': 'Champ supérieur',
              'Northern Section': 'Partie nord', 'Central Section': 'Partie centrale', 'Eastern Section': 'Partie est',
              'Western Section': 'Partie ouest', 'Iceberg Cave': "Grotte de l'iceberg", 'Bridgeside Cave': 'Grotte près du pont',
              'Station No. 3 Cave': 'Grotte du Poste n° 3', 'Foot of Oni Mountain': 'Pied du Mont Strueux', 'Stream Cave': 'Grotte du ruisseau',
              'West Cave': 'Grotte ouest', 'North Cave': 'Grotte nord', 'Wisteria Pond': 'Étang des glycines', 'Patchy Field': 'Champ clairsemé',
              'Craggy Cliffs': 'Falaises escarpées', 'Nature Preserve': 'Réserve naturelle', 'East Bridge Cave': 'Grotte du pont est',
              'Lower West Bridge Cave': 'Grotte du pont ouest (bas)', 'Outdoor Classroom Cave': 'Grotte de la classe en plein air',
              'Cliffside Cave': 'Grotte de la falaise', 'Savanna entrance': 'Entrée de la savane', 'Northeast Savanna': 'Savane nord-est',
              'Midwest Savanna': 'Savane centre-ouest', 'Central Plaza Cave': 'Grotte du Poste Central', 'Savanna Plaza Cave': 'Grotte du Poste Savane',
              'North Mountain Cave': 'Grotte de la montagne nord', 'East Mountain Cave': 'Grotte de la montagne est',
              'Polar Plaza Cave': 'Grotte du Poste Polaire', 'Southeast Beach': 'Plage sud-est', 'Torchlit Mountain': 'Montagne des torches',
              'Coastal Plaza Island': 'Île du Poste Côtier', 'Rest Area Cave': 'Grotte de la halte',
              'Special encounters': '', 'Fixed encounters': '', 'Wild encounters': '', 'Terastallized encounters': ''}

# méthodes et conditions ajoutées
METHODS = {9001: ('sv-land', 'Au sol'), 9002: ('sv-water', "À la surface de l'eau"), 9003: ('sv-underwater', "Sous l'eau"),
           9004: ('sv-overland', 'En vol bas'), 9005: ('sv-sky', 'Dans le ciel'), 9006: ('sv-fixed', 'Fixe (réapparaît)'),
           9007: ('sv-tera', 'Fixe Téracristal')}
METHOD_ID = {v[0]: k for k, v in METHODS.items()}
for k, (ident, fr) in METHODS.items():
    core['encMethods'][str(k)] = {'ident': ident, 'fr': fr}
GIFT, STATIC, TRADE = 18, 20, 36
TIMES = {'morning': (9101, 'Le matin'), 'day': (9102, 'En journée'), 'evening': (9103, 'Le soir'), 'night': (9104, 'La nuit')}
for k, (cid, fr) in TIMES.items():
    core['encConds'][str(cid)] = fr

# variétés par espèce, pour les formes (Wooper-Paldea, Tauros Combat…)
vars_by_sp = collections.defaultdict(list)
for p in core['pokemon'].values():
    vars_by_sp[p['sp']].append(p)
slug = lambda s: re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def pokemon_id(dex, form):
    m = re.match(r'(\d+)(?:-(.+))?', dex)
    sid = int(m.group(1))
    tokens = []
    if m.group(2): tokens += slug(m.group(2)).split('-')
    if form: tokens += [t for t in slug(form).split('-') if t not in ('form', 'forme', 'breed', 'normal')]
    tokens = [{'paldean': 'paldea', 'alolan': 'alola', 'galarian': 'galar', 'hisuian': 'hisui'}.get(t, t) for t in tokens]
    cands = vars_by_sp.get(sid, [])
    if tokens:
        best = [p for p in cands if all(t in p['ident'].split('-') for t in tokens)]
        if best: return best[0]['id']
    d = [p for p in cands if p['def']]
    return (d or cands or [{'id': None}])[0]['id']


def parse_params(s):
    # sépare les paramètres de premier niveau (ignore les | dans [[...]] et {{...}})
    out, cur, depth = [], '', 0
    i = 0
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
        m = re.match(r'^\s*([a-zA-Z0-9_]+)\s*=(.*)$', p, re.S)
        if m and not re.match(r'^\d', m.group(1)): named[m.group(1)] = m.group(2).strip()
        else: pos.append(p.strip())
    return pos, named


def levels(s):
    s = re.sub(r'\[\[.*?\]\]', '', s).strip()
    nums = [int(x) for x in re.findall(r'\d+', s)]
    return (min(nums), max(nums)) if nums else (0, 0)


# lieux et zones synthétiques
next_loc, next_area = 9000, 90000
loc_ids, area_ids = {}, {}
REGION = {'base': 10, 'kitakami': 10, 'blueberry': 10}


def loc_for(page, group):
    global next_loc
    if page not in loc_ids:
        lid = next_loc; next_loc += 1
        loc_ids[page] = lid
        core['locations'][str(lid)] = {'fr': names_fr.get(page, page), 'ident': 'sv-' + slug(page), 'reg': REGION[group], 'en': page}
    return loc_ids[page]


def area_for(page, section, biome, group):
    global next_area
    key = (page, section, biome)
    if key not in area_ids:
        aid = next_area; next_area += 1
        area_ids[key] = aid
        lid = loc_for(page, group)
        sec = section.split(':', 1)[1] if ':' in section else section
        sec = '' if sec == 'Pokémon' else SECTION_FR.get(sec, sec)
        parts = [names_fr.get(page, page)] + [x for x in (sec, BIOME.get(biome, biome)) if x]
        core['areas'][str(aid)] = {'l': lid, 'ident': slug(sec + ' ' + biome), 'fr': ' — '.join(parts)}
    return area_ids[key]


enc = {v: collections.defaultdict(list) for pair in VERS.values() for v in pair}
missing_pk = []
for page, section, biome, kind, params in rows:
    group = 'kitakami' if page in KITAKAMI else 'blueberry' if page in BLUEBERRY else 'base'
    pos, named = parse_params(params)
    if len(pos) < 4: continue
    pid = pokemon_id(pos[0], named.get('form', ''))
    if not pid: missing_pk.append(pos[:2]); continue
    in_s, in_v = pos[2].lower() == 'yes', pos[3].lower() == 'yes'
    area = area_for(page, section, biome, group)
    if kind == 'E':
        lo, hi = levels(pos[4]) if len(pos) > 4 else (0, 0)
        rate = 0
        times = []
        if named.get('all'):
            rate = int(re.sub(r'\D', '', named['all']) or 0)
        else:
            vals = {}
            for t in TIMES:
                raw = named.get(t, pos[5] if len(pos) > 5 else '')
                vals[t] = int(re.sub(r'\D', '', raw) or 0)
            rate = max(vals.values())
            if any(v == 0 for v in vals.values()): times = [TIMES[t][0] for t, v in vals.items() if v > 0]
        meths = [m for m in ('land', 'watersurface', 'underwater', 'overland', 'sky') if named.get(m, '').lower() == 'yes'] or ['land']
        mid_map = {'land': 'sv-land', 'watersurface': 'sv-water', 'underwater': 'sv-underwater', 'overland': 'sv-overland', 'sky': 'sv-sky'}
        for m in meths[:1] + [x for x in meths[1:] if x in ('watersurface', 'underwater')]:
            rec = [area, METHOD_ID[mid_map[m]], times, lo, hi, min(rate, 100)]
            for v, ok in zip(VERS[group], (in_s, in_v)):
                if ok: enc[v][pid].append(rec)
    else:
        how = pos[4] if len(pos) > 4 else ''
        lv = levels(pos[5]) if len(pos) > 5 else (0, 0)
        once = (pos[6] if len(pos) > 6 else '').lower().startswith('only')
        tera = 'TeraGem' in (pos[5] if len(pos) > 5 else '')
        if how == 'Gift': meth = GIFT
        elif how == 'Trade': meth = TRADE
        elif once: meth = STATIC
        else: meth = METHOD_ID['sv-tera' if tera else 'sv-fixed']
        rec = [area, meth, [], lv[0], lv[1], 100]
        for v, ok in zip(VERS[group], (in_s, in_v)):
            if ok: enc[v][pid].append(rec)

for v, d in enc.items():
    # dédoublonne
    out = {}
    for pid, lst in d.items():
        seen, uniq = set(), []
        for r in lst:
            k = json.dumps(r)
            if k not in seen: seen.add(k); uniq.append(r)
        out[pid] = uniq
    json.dump(out, open(D('enc', f'{v}.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
json.dump(core, open(D('core.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('lieux', len(loc_ids), 'zones', len(area_ids), {v: len(d) for v, d in enc.items()})
print('non reliés', missing_pk[:20])
