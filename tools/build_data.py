#!/usr/bin/env python3
"""
Construit les fichiers JSON de l'appli à partir des CSV de PokéAPI.

Usage :
    python tools/build_data.py <dossier pokeapi/data/v2/csv> <sprites_tree.txt> [dossier_sortie]

- Le dossier CSV vient de https://github.com/PokeAPI/pokeapi (data/v2/csv)
- sprites_tree.txt = liste des fichiers du dépôt https://github.com/PokeAPI/sprites
  (git ls-tree -r --name-only HEAD sprites/pokemon > sprites_tree.txt)
Les données « à la main » (data/curated/*.json) ne sont pas touchées par ce script.
"""
import csv, json, os, sys, collections

CSV = sys.argv[1]
TREE = sys.argv[2]
OUT = sys.argv[3] if len(sys.argv) > 3 else os.path.join(os.path.dirname(__file__), '..', 'data')
FR, EN = '5', '9'


def rows(name):
    with open(os.path.join(CSV, name + '.csv'), encoding='utf-8') as f:
        yield from csv.DictReader(f)


def names(table, key, field='name', lang=FR):
    d = {}
    for r in rows(table):
        if r['local_language_id'] == lang and r.get(field):
            d[int(r[key])] = r[field]
    return d


def i(v):
    return int(v) if v not in (None, '') else None


def dump(path, obj):
    full = os.path.join(OUT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))


# ---------------------------------------------------------------- noms
sp_fr = names('pokemon_species_names', 'pokemon_species_id')
sp_en = names('pokemon_species_names', 'pokemon_species_id', lang=EN)
genus_fr = names('pokemon_species_names', 'pokemon_species_id', 'genus')
type_fr = names('type_names', 'type_id')
item_fr = names('item_names', 'item_id')
move_fr = names('move_names', 'move_id')
move_en = names('move_names', 'move_id', lang=EN)
abil_fr = names('ability_names', 'ability_id')
abil_en = names('ability_names', 'ability_id', lang=EN)
loc_fr = names('location_names', 'location_id')
loc_en = names('location_names', 'location_id', lang=EN)
area_fr = names('location_area_prose', 'location_area_id')
region_fr = names('region_names', 'region_id')
ver_fr = names('version_names', 'version_id')
egg_fr = names('egg_group_prose', 'egg_group_id')
meth_fr = names('encounter_method_prose', 'encounter_method_id')
cond_fr = names('encounter_condition_value_prose', 'encounter_condition_value_id')
mmeth_fr = names('pokemon_move_method_prose', 'pokemon_move_method_id')
form_fr, formpk_fr = {}, {}
for r in rows('pokemon_form_names'):
    if r['local_language_id'] == FR:
        if r['form_name']:
            form_fr[int(r['pokemon_form_id'])] = r['form_name']
        if r['pokemon_name']:
            formpk_fr[int(r['pokemon_form_id'])] = r['pokemon_name']

items = {int(r['id']): r['identifier'] for r in rows('items')}
types = {int(r['id']): r['identifier'] for r in rows('types')}
regions = {int(r['id']): r['identifier'] for r in rows('regions')}

# ---------------------------------------------------------------- sprites
tree = set()
with open(TREE, encoding='utf-8') as f:
    for line in f:
        tree.add(line.strip())
HOME = 'sprites/pokemon/other/home/'
BASE = 'sprites/pokemon/'


def sprite_info(fname):
    """fname sans extension -> {'d':dossier,'s':shiny?,'f':femelle?}"""
    for d in (HOME, BASE):
        if d + fname + '.png' in tree:
            return {
                'p': ('h/' if d == HOME else 'b/') + fname,
                's': (d + 'shiny/' + fname + '.png') in tree,
                'f': (d + 'female/' + fname + '.png') in tree,
                'sf': (d + 'shiny/female/' + fname + '.png') in tree,
            }
    return None

# ---------------------------------------------------------------- jeux
versions = {int(r['id']): r for r in rows('versions')}
vgs = {int(r['id']): r for r in rows('version_groups')}

# Familles de jeux (définies à la main : regroupement, DLC, Pokédex utilisé)
FAMILIES = [
    dict(key='rbj', name='Rouge / Bleu / Jaune', gen=1, versions=[1, 2, 3], extra=[44, 45, 46], dex=[2], curated='gen1'),
    dict(key='oac', name='Or / Argent / Cristal', gen=2, versions=[4, 5, 6], dex=[3]),
    dict(key='rse', name='Rubis / Saphir / Émeraude', gen=3, versions=[7, 8, 9], dex=[4]),
    dict(key='rfvf', name='Rouge Feu / Vert Feuille', gen=3, versions=[10, 11], dex=[2]),
    dict(key='col', name='Pokémon Colosseum', gen=3, versions=[19], dex=[]),
    dict(key='xd', name='Pokémon XD : Le Souffle des Ténèbres', gen=3, versions=[20], dex=[]),
    dict(key='dpp', name='Diamant / Perle / Platine', gen=4, versions=[12, 13, 14], dex=[5], dexByVersion={14: [6]}),
    dict(key='hgss', name='Or HeartGold / Argent SoulSilver', gen=4, versions=[15, 16], dex=[7]),
    dict(key='nb', name='Noir / Blanc', gen=5, versions=[17, 18], dex=[8]),
    dict(key='nb2', name='Noir 2 / Blanc 2', gen=5, versions=[21, 22], dex=[9]),
    dict(key='xy', name='X / Y', gen=6, versions=[23, 24], dex=[12, 13, 14]),
    dict(key='rosa', name='Rubis Oméga / Saphir Alpha', gen=6, versions=[25, 26], dex=[15]),
    dict(key='sl', name='Soleil / Lune', gen=7, versions=[27, 28], dex=[16]),
    dict(key='usul', name='Ultra-Soleil / Ultra-Lune', gen=7, versions=[29, 30], dex=[21]),
    dict(key='lgpe', name="Let's Go Pikachu / Évoli", gen=7, versions=[31, 32], dex=[26], curated='gen1'),
    dict(key='eb', name='Épée / Bouclier', gen=8, versions=[33, 34], dex=[27], dlc=[
        dict(key='eb-ia', name="L'Île solitaire de l'Armure", versions=[35, 50], dex=[28]),
        dict(key='eb-tc', name='Les Terres enneigées de la Couronne', versions=[36, 51], dex=[29]),
    ]),
    dict(key='dete', name='Diamant Étincelant / Perle Scintillante', gen=8, versions=[37, 38], dex=[5]),
    dict(key='pla', name='Légendes Pokémon : Arceus', gen=8, versions=[39], dex=[30]),
    dict(key='ev', name='Écarlate / Violet', gen=9, versions=[40, 41], dex=[31], dlc=[
        dict(key='ev-mt', name='Le Masque Turquoise', versions=[42, 52], dex=[32]),
        dict(key='ev-di', name='Le Disque Indigo', versions=[43, 53], dex=[33]),
    ]),
    dict(key='za', name='Légendes Pokémon : Z-A', gen=9, versions=[47], dex=[34], dlc=[
        dict(key='za-md', name='Méga-Dimension', versions=[48], dex=[35]),
    ]),
]
# Groupe de version utilisé pour les attaques / la présence (les DLC partagent le jeu de base)
MOVES_VG = {21: 20, 22: 20, 26: 25, 27: 25}

VERSION_SHORT = {
    1: 'Rouge', 2: 'Bleu', 3: 'Jaune', 44: 'Rouge (JP)', 45: 'Vert (JP)', 46: 'Bleu (JP)',
    4: 'Or', 5: 'Argent', 6: 'Cristal', 7: 'Rubis', 8: 'Saphir', 9: 'Émeraude', 10: 'Rouge Feu', 11: 'Vert Feuille',
    12: 'Diamant', 13: 'Perle', 14: 'Platine', 15: 'HeartGold', 16: 'SoulSilver', 17: 'Noir', 18: 'Blanc',
    19: 'Colosseum', 20: 'XD', 21: 'Noir 2', 22: 'Blanc 2', 23: 'X', 24: 'Y', 25: 'Rubis Oméga', 26: 'Saphir Alpha',
    27: 'Soleil', 28: 'Lune', 29: 'Ultra-Soleil', 30: 'Ultra-Lune', 31: "Let's Go Pikachu", 32: "Let's Go Évoli",
    33: 'Épée', 34: 'Bouclier', 35: 'Épée', 50: 'Bouclier', 36: 'Épée', 51: 'Bouclier', 37: 'Diamant Étincelant',
    38: 'Perle Scintillante', 39: 'Légendes Arceus', 40: 'Écarlate', 41: 'Violet', 42: 'Écarlate', 52: 'Violet',
    43: 'Écarlate', 53: 'Violet', 47: 'Légendes Z-A', 48: 'Légendes Z-A',
}

games = {}
for fam in FAMILIES:
    def add(vlist, dex, fam_key, dlc_key=None, dex_by=None):
        for v in vlist:
            vg = int(versions[v]['version_group_id'])
            games[v] = dict(
                id=v, ident=versions[v]['identifier'], name=VERSION_SHORT.get(v, ver_fr.get(v)),
                full=ver_fr.get(v), vg=vg, gen=int(vgs[vg]['generation_id']), fam=fam_key, dlc=dlc_key,
                dex=(dex_by or {}).get(v, dex), mvg=MOVES_VG.get(vg, vg),
                extra=v in fam.get('extra', []),
            )
    add(fam['versions'] + fam.get('extra', []), fam['dex'], fam['key'], None, fam.get('dexByVersion'))
    for d in fam.get('dlc', []):
        add(d['versions'], d['dex'], fam['key'], d['key'])

# ---------------------------------------------------------------- Pokédex
pokedexes = {int(r['id']): r for r in rows('pokedexes')}
pokedex_fr = names('pokedex_prose', 'pokedex_id')
dexnums = collections.defaultdict(list)
for r in rows('pokemon_dex_numbers'):
    dexnums[int(r['pokedex_id'])].append((int(r['pokedex_number']), int(r['species_id'])))
used_dex = sorted({d for g in games.values() for d in g['dex']} | {1})
DEX_PREFIX = {12: 'C', 13: 'Ct', 14: 'M'}  # Kalos Centre / Côtes / Monts
dex_out = {}
for d in used_dex:
    dex_out[d] = dict(id=d, ident=pokedexes[d]['identifier'], name=pokedex_fr.get(d, pokedexes[d]['identifier']),
                      prefix=DEX_PREFIX.get(d, ''), list=sorted(dexnums[d]))

# ---------------------------------------------------------------- espèces
egg_groups = collections.defaultdict(list)
for r in rows('pokemon_egg_groups'):
    egg_groups[int(r['species_id'])].append(int(r['egg_group_id']))

species = {}
for r in rows('pokemon_species'):
    sid = int(r['id'])
    species[sid] = dict(
        id=sid, ident=r['identifier'], fr=sp_fr.get(sid, r['identifier']), en=sp_en.get(sid, ''),
        genus=genus_fr.get(sid, ''), gen=int(r['generation_id']), from_=i(r['evolves_from_species_id']),
        chain=int(r['evolution_chain_id']), cap=int(r['capture_rate']), gr=int(r['gender_rate']),
        gd=r['has_gender_differences'] == '1', baby=r['is_baby'] == '1', leg=r['is_legendary'] == '1',
        myth=r['is_mythical'] == '1', hatch=i(r['hatch_counter']), eggs=egg_groups.get(sid, []),
        fsw=r['forms_switchable'] == '1', order=int(r['order']), vars=[],
    )

# ---------------------------------------------------------------- variétés (pokemon)
ptypes = collections.defaultdict(list)
for r in rows('pokemon_types'):
    ptypes[int(r['pokemon_id'])].append(int(r['type_id']))
ptypes_past = collections.defaultdict(lambda: collections.defaultdict(list))
for r in rows('pokemon_types_past'):
    ptypes_past[int(r['pokemon_id'])][int(r['generation_id'])].append(int(r['type_id']))
pab = collections.defaultdict(list)
for r in rows('pokemon_abilities'):
    pab[int(r['pokemon_id'])].append([int(r['ability_id']), int(r['is_hidden']), int(r['slot'])])
pab_past = collections.defaultdict(lambda: collections.defaultdict(list))
for r in rows('pokemon_abilities_past'):
    pab_past[int(r['pokemon_id'])][int(r['generation_id'])].append(
        [i(r['ability_id']), int(r['is_hidden']), int(r['slot'])])
stats = collections.defaultdict(lambda: [0] * 6)
for r in rows('pokemon_stats'):
    stats[int(r['pokemon_id'])][int(r['stat_id']) - 1] = int(r['base_stat'])

pokemon = {}
for r in rows('pokemon'):
    pid, sid = int(r['id']), int(r['species_id'])
    pokemon[pid] = dict(id=pid, sp=sid, ident=r['identifier'], def_=r['is_default'] == '1',
                        types=ptypes[pid], tpast={g: v for g, v in ptypes_past[pid].items()},
                        ab=sorted(pab[pid], key=lambda x: x[2]),
                        abpast={g: v for g, v in pab_past[pid].items()},
                        st=stats[pid], h=int(r['height']), w=int(r['weight']), forms=[])
    species[sid]['vars'].append(pid)

# ---------------------------------------------------------------- formes
forms = {}
for r in rows('pokemon_forms'):
    fid, pid = int(r['id']), int(r['pokemon_id'])
    p = pokemon[pid]
    sid = p['sp']
    fident = r['form_identifier']
    # Sprite : variété par défaut -> id du pokemon ; forme cosmétique -> "<espèce>-<forme>"
    cands = []
    if r['is_default'] == '1':
        cands.append(str(pid))
    if fident:
        cands.append(f'{sid}-{fident}')
    cands.append(str(pid))
    spr = None
    for c in cands:
        spr = sprite_info(c)
        if spr:
            break
    name = formpk_fr.get(fid) or (species[sid]['fr'] + (f' ({form_fr[fid]})' if fid in form_fr else ''))
    forms[fid] = dict(id=fid, pk=pid, sp=sid, ident=fident, def_=r['is_default'] == '1' and p['def_'],
                      pdef=r['is_default'] == '1', fname=form_fr.get(fid, ''), name=name,
                      battle=r['is_battle_only'] == '1', mega=r['is_mega'] == '1',
                      vg=i(r['introduced_in_version_group_id']), spr=spr, order=int(r['order']))
    p['forms'].append(fid)

# ---------------------------------------------------------------- présence par jeu (via les attaques)
mm = {int(r['id']): r['identifier'] for r in rows('pokemon_move_methods')}
presence = collections.defaultdict(set)
moves_by_vg = collections.defaultdict(lambda: collections.defaultdict(list))
for r in rows('pokemon_moves'):
    vg, pid = int(r['version_group_id']), int(r['pokemon_id'])
    presence[vg].add(pid)
    moves_by_vg[vg][pid].append([int(r['move_id']), int(r['pokemon_move_method_id']), i(r['level']) or 0])

machines = collections.defaultdict(dict)
for r in rows('machines'):
    it = items.get(int(r['item_id']), '')
    label = it.upper().replace('TM', 'CT').replace('HM', 'CS').replace('TR', 'DT')
    machines[int(r['version_group_id'])][int(r['move_id'])] = label

for vg, d in moves_by_vg.items():
    out = {}
    for pid, lst in d.items():
        seen = set()
        uniq = []
        for m in sorted(lst, key=lambda x: (x[1], x[2], x[0])):
            k = tuple(m)
            if k not in seen:
                seen.add(k)
                uniq.append(m)
        out[pid] = uniq
    dump(f'moves/{vg}.json', dict(machines=machines.get(vg, {}), learn=out))

moves = {}
for r in rows('moves'):
    mid = int(r['id'])
    moves[mid] = [move_fr.get(mid, move_en.get(mid, r['identifier'])), i(r['type_id']), i(r['damage_class_id']),
                  i(r['power']), i(r['accuracy']), i(r['pp']), int(r['generation_id'])]
dump('moves.json', dict(moves=moves, methods={k: mmeth_fr.get(k, v) for k, v in mm.items()}))

# ---------------------------------------------------------------- talents
abil_desc = {}
for r in rows('ability_flavor_text'):
    if r['language_id'] == FR:
        abil_desc[int(r['ability_id'])] = r['flavor_text'].replace('\n', ' ')  # garde la plus récente
abilities = {}
for r in rows('abilities'):
    aid = int(r['id'])
    if r.get('is_main_series', '1') == '0':
        continue
    abilities[aid] = dict(fr=abil_fr.get(aid, abil_en.get(aid, r['identifier'])), en=abil_en.get(aid, ''),
                          d=abil_desc.get(aid, ''), gen=int(r['generation_id']))

# ---------------------------------------------------------------- évolutions
trig = {int(r['id']): r['identifier'] for r in rows('evolution_triggers')}
loc_ident = {int(r['id']): r['identifier'] for r in rows('locations')}


def lname(lid):
    return loc_fr.get(lid) or loc_en.get(lid) or loc_ident.get(lid, '?')


TIME = {'day': 'de jour', 'night': 'de nuit', 'dusk': 'au crépuscule', 'full-moon': 'à la pleine lune'}
TRIG_TXT = {
    'shed': "Niveau 20 avec une place libre dans l'équipe et une Poké Ball dans le Sac",
    'spin': "Tourner sur soi en tenant un En-cas",
    'tower-of-darkness': "Gravir la Tour de l'Obscurité",
    'tower-of-waters': "Gravir la Tour de l'Eau",
    'three-critical-hits': "Infliger 3 coups critiques en un seul combat",
    'take-damage': "Subir au moins 49 PV de dégâts puis passer sous l'arche de pierre",
    'agile-style-move': "Utiliser la capacité 20 fois en Style Rapide",
    'strong-style-move': "Utiliser la capacité 20 fois en Style Puissant",
    'recoil-damage': "Subir au moins 294 PV de dégâts de contrecoup sans être K.O.",
    'use-move': "Utiliser la capacité 20 fois",
    'three-defeated-bisharp': "Vaincre 3 Scalproie menant des Scalpion (en tenant un Couronne de Chef)",
    'gimmighoul-coins': "Monter de niveau avec 999 Pièces de Mordudor",
    'meltan-candies': "400 Bonbons Meltan (Pokémon GO)",
}

evos = collections.defaultdict(list)
for r in rows('pokemon_evolution'):
    t = trig.get(int(r['evolution_trigger_id']), 'unclassified')
    parts = []
    item = None
    needs_trade = False
    if t == 'level-up':
        parts.append(f"Niveau {r['minimum_level']}" if r['minimum_level'] else 'Monter de niveau')
    elif t == 'trade':
        parts.append('Échange')
        needs_trade = True
    elif t == 'use-item':
        item = items.get(int(r['trigger_item_id']))
        parts.append('Utiliser ' + item_fr.get(int(r['trigger_item_id']), item))
    elif t in ('in-battle-level-up',):
        parts.append(f"Niveau {r['minimum_level']} (en combat)" if r['minimum_level'] else 'Monter de niveau en combat')
    elif t in TRIG_TXT:
        parts.append(TRIG_TXT[t])
    else:
        parts.append('Condition spéciale')
    if r['used_move_id']:
        parts.append(f"(capacité : {move_fr.get(int(r['used_move_id']))})")
    if r['held_item_id']:
        hid = int(r['held_item_id'])
        parts.append('en tenant ' + item_fr.get(hid, items.get(hid, '?')))
        if needs_trade:
            item = items.get(hid)
    if r['gender_id']:
        parts.append('(femelle)' if r['gender_id'] == '1' else '(mâle)')
    if r['time_of_day']:
        parts.append(TIME.get(r['time_of_day'], r['time_of_day']))
    if r['minimum_happiness']:
        parts.append(f"avec un Bonheur élevé (≥ {r['minimum_happiness']})")
    if r['minimum_affection']:
        parts.append(f"avec une Affection élevée (≥ {r['minimum_affection']} cœurs)")
    if r['minimum_beauty']:
        parts.append(f"avec une Beauté ≥ {r['minimum_beauty']}")
    if r['known_move_id']:
        parts.append('en connaissant ' + move_fr.get(int(r['known_move_id']), '?'))
    if r['known_move_type_id']:
        parts.append('en connaissant une capacité de type ' + type_fr.get(int(r['known_move_type_id']), '?'))
    if r['location_id']:
        parts.append('à ' + lname(int(r['location_id'])))
    if r['relative_physical_stats']:
        parts.append({'1': '(Attaque > Défense)', '-1': '(Attaque < Défense)', '0': '(Attaque = Défense)'}[
            r['relative_physical_stats']])
    if r['party_species_id']:
        parts.append('avec ' + sp_fr.get(int(r['party_species_id']), '?') + " dans l'équipe")
    if r['party_type_id']:
        parts.append("avec un Pokémon de type " + type_fr.get(int(r['party_type_id']), '?') + " dans l'équipe")
    if r['trade_species_id']:
        parts.append('contre un ' + sp_fr.get(int(r['trade_species_id']), '?'))
    if r['needs_overworld_rain'] == '1':
        parts.append('sous la pluie')
    if r['turn_upside_down'] == '1':
        parts.append('console à l\'envers')
    if r.get('needs_multiplayer') == '1':
        parts.append('(en multijoueur)')
    if r.get('near_special_rock') == '1':
        parts.append('près d\'un rocher spécial')
    if r.get('minimum_steps'):
        parts.append(f"après {r['minimum_steps']} pas (Pokémon suiveur)")
    if r.get('minimum_move_count'):
        parts.append(f"({r['minimum_move_count']} utilisations)")
    if r.get('minimum_damage_taken'):
        parts.append(f"(≥ {r['minimum_damage_taken']} PV de dégâts)")
    if r.get('region_id'):
        parts.append('(région : ' + region_fr.get(int(r['region_id']), '?') + ')')
    if r.get('percentage_chance'):
        parts.append(f"({r['percentage_chance']} % de chance)")
    evos[int(r['evolved_species_id'])].append(dict(
        t=t, txt=' '.join(parts), item=item, trade=needs_trade, lvl=i(r['minimum_level']),
        vg=i(r['version_group_id']), reg=i(r.get('region_id')), form=i(r.get('evolved_pokemon_form_id')),
        rform=i(r.get('required_pokemon_form_id')),
    ))

# ---------------------------------------------------------------- rencontres
slots = {int(r['id']): r for r in rows('encounter_slots')}
meth_ident = {int(r['id']): r['identifier'] for r in rows('encounter_methods')}
la = {int(r['id']): r for r in rows('location_areas')}
locs = {int(r['id']): r for r in rows('locations')}
cond_map = collections.defaultdict(list)
for r in rows('encounter_condition_value_map'):
    cond_map[int(r['encounter_id'])].append(int(r['encounter_condition_value_id']))
cond_vals = {int(r['id']): r for r in rows('encounter_condition_values')}

enc = collections.defaultdict(lambda: collections.defaultdict(dict))
used_locs, used_areas = set(), set()
for r in rows('encounters'):
    v = int(r['version_id'])
    if v not in games:
        continue
    pid = int(r['pokemon_id'])
    a = int(r['location_area_id'])
    s = slots[int(r['encounter_slot_id'])]
    m = int(s['encounter_method_id'])
    conds = tuple(sorted(c for c in cond_map.get(int(r['id']), []) if cond_vals[c]['is_default'] == '0'))
    key = (a, m, conds)
    cur = enc[v][pid].get(key)
    lo, hi, rar = int(r['min_level']), int(r['max_level']), i(s['rarity']) or 0
    if cur:
        cur[0] = min(cur[0], lo); cur[1] = max(cur[1], hi); cur[2] += rar
    else:
        enc[v][pid][key] = [lo, hi, rar]
    used_areas.add(a)
    used_locs.add(int(la[a]['location_id']))

for v, d in enc.items():
    out = {}
    for pid, entries in d.items():
        out[pid] = [[k[0], k[1], list(k[2]), lv[0], lv[1], min(lv[2], 100)] for k, lv in entries.items()]
    dump(f'enc/{v}.json', out)

locations = {}
for lid in used_locs:
    locations[lid] = dict(fr=lname(lid), ident=locs[lid]['identifier'], reg=i(locs[lid]['region_id']))
areas = {}
for a in used_areas:
    areas[a] = dict(l=int(la[a]['location_id']), ident=la[a]['identifier'] or '', fr=area_fr.get(a, ''))

# ---------------------------------------------------------------- Balls par groupe de versions
B = lambda *ids: list(ids)
BASIC = ['poke-ball', 'great-ball', 'ultra-ball', 'master-ball']
G3 = BASIC + ['net-ball', 'dive-ball', 'nest-ball', 'repeat-ball', 'timer-ball', 'luxury-ball', 'premier-ball']
G4 = G3 + ['dusk-ball', 'heal-ball', 'quick-ball']
APRI = ['fast-ball', 'level-ball', 'lure-ball', 'heavy-ball', 'love-ball', 'friend-ball', 'moon-ball']
HISUI = ['lapoke-ball', 'lagreat-ball', 'laultra-ball', 'laheavy-ball', 'laleaden-ball', 'lagigaton-ball',
         'lafeather-ball', 'lawing-ball', 'lajet-ball', 'laorigin-ball', 'master-ball']
BALLS = {
    # balls utilisables en jeu ; 'stored' = la Ball est-elle enregistrée sur le Pokémon
    1: dict(balls=BASIC + ['safari-ball'], stored=False),
    2: dict(balls=BASIC + ['safari-ball'], stored=False),
    28: dict(balls=BASIC + ['safari-ball'], stored=False),
    29: dict(balls=BASIC + ['safari-ball'], stored=False),
    3: dict(balls=BASIC + ['safari-ball', 'park-ball'] + APRI, stored=False),
    4: dict(balls=BASIC + ['safari-ball', 'park-ball'] + APRI, stored=False),
    5: dict(balls=G3 + ['safari-ball'], stored=True),
    6: dict(balls=G3 + ['safari-ball'], stored=True),
    7: dict(balls=G3 + ['safari-ball'], stored=True),
    12: dict(balls=G3, stored=True),
    13: dict(balls=G3, stored=True),
    8: dict(balls=G4 + ['safari-ball', 'park-ball'], stored=True),
    9: dict(balls=G4 + ['safari-ball', 'park-ball'], stored=True),
    10: dict(balls=G4 + APRI + ['safari-ball', 'sport-ball', 'park-ball'], stored=True),
    11: dict(balls=G4 + ['dream-ball'], stored=True),
    14: dict(balls=G4 + ['dream-ball'], stored=True),
    15: dict(balls=G4, stored=True),
    16: dict(balls=G4, stored=True),
    17: dict(balls=G4 + ['beast-ball'] + APRI + ['dream-ball'], stored=True, limited=APRI + ['dream-ball']),
    18: dict(balls=G4 + ['beast-ball'] + APRI + ['dream-ball'], stored=True, limited=APRI + ['dream-ball']),
    19: dict(balls=BASIC + ['premier-ball'], stored=True),
    20: dict(balls=G4 + APRI + ['dream-ball', 'beast-ball', 'safari-ball', 'sport-ball'], stored=True,
            limited=APRI + ['dream-ball', 'beast-ball', 'safari-ball', 'sport-ball']),
    21: dict(balls=G4 + APRI + ['dream-ball', 'beast-ball', 'safari-ball', 'sport-ball'], stored=True,
            limited=APRI + ['dream-ball', 'beast-ball', 'safari-ball', 'sport-ball']),
    22: dict(balls=G4 + APRI + ['dream-ball', 'beast-ball', 'safari-ball', 'sport-ball'], stored=True,
            limited=APRI + ['dream-ball', 'beast-ball', 'safari-ball', 'sport-ball']),
    23: dict(balls=G4 + ['safari-ball'], stored=True),
    24: dict(balls=HISUI, stored=True),
    25: dict(balls=G4 + APRI + ['dream-ball', 'beast-ball', 'safari-ball', 'sport-ball'], stored=True,
            limited=APRI + ['dream-ball', 'beast-ball', 'safari-ball', 'sport-ball']),
    26: dict(balls=G4 + APRI + ['dream-ball', 'beast-ball', 'safari-ball', 'sport-ball'], stored=True,
            limited=APRI + ['dream-ball', 'beast-ball', 'safari-ball', 'sport-ball']),
    27: dict(balls=G4 + APRI + ['dream-ball', 'beast-ball', 'safari-ball', 'sport-ball'], stored=True,
            limited=APRI + ['dream-ball', 'beast-ball', 'safari-ball', 'sport-ball']),
}
item_by_ident = {v: k for k, v in items.items()}
ball_names = {b: item_fr.get(item_by_ident[b], b) for d in BALLS.values() for b in d['balls']}
ball_sprites = {b: b for b in ball_names}

# ---------------------------------------------------------------- export principal
core = dict(
    generated_from='PokeAPI (github.com/PokeAPI/pokeapi) + sprites PokeAPI',
    types={k: type_fr.get(k, v) for k, v in types.items() if k < 10000},
    typeIdent={k: v for k, v in types.items() if k < 10000},
    eggGroups=egg_fr, regions={k: region_fr.get(k, v) for k, v in regions.items()},
    families=FAMILIES, games=games, dex=dex_out,
    species={k: {**{kk: vv for kk, vv in v.items() if kk not in ('from_',)}, 'from': v['from_']} for k, v in species.items()},
    pokemon={k: {**{kk: vv for kk, vv in v.items() if kk != 'def_'}, 'def': v['def_']} for k, v in pokemon.items()},
    forms={k: {**{kk: vv for kk, vv in v.items() if kk != 'def_'}, 'def': v['def_']} for k, v in forms.items()},
    abilities=abilities, evolutions=evos, presence={vg: sorted(s) for vg, s in presence.items()},
    locations=locations, areas=areas,
    encMethods={k: {'ident': v, 'fr': meth_fr.get(k, v)} for k, v in meth_ident.items()},
    encConds={k: cond_fr.get(k, cond_vals[k]['identifier']) for k in cond_vals},
    items={k: item_fr.get(k, v) for k, v in items.items() if v in {e['item'] for l in evos.values() for e in l if e['item']}},
    itemIdent={v: k for k, v in items.items() if v in {e['item'] for l in evos.values() for e in l if e['item']}},
    balls=BALLS, ballNames=ball_names,
    vgOrder={k: int(v['order']) for k, v in vgs.items()},
)
dump('core.json', core)
print('OK :', len(species), 'espèces,', len(pokemon), 'variétés,', len(forms), 'formes,',
      len(games), 'versions,', len(enc), 'versions avec rencontres')
