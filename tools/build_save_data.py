"""Données pour lire les Pokémon des sauvegardes en détail (onglet Outils → Équipes).

Complète data/save-species.json (index internes des espèces Gen 1 / Gen 3, déjà présents) avec :
  growth   : n° national -> courbe d'expérience (pokemon_species.csv)
  exp      : courbe -> expérience minimale pour chaque niveau 1 à 100 (experience.csv)
  items    : génération -> {index de l'objet dans le jeu : id PokeAPI} (item_game_indices.csv)
  itemInfo : id PokeAPI -> [identifiant, nom français] (items.csv, item_names.csv)

Usage : python tools/build_save_data.py [chemin/vers/pokeapi/data/v2/csv]
"""
import csv, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PK = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'pokeapi', 'data', 'v2', 'csv')
OUT = os.path.join(ROOT, 'data', 'save-species.json')


def rows(name):
    with open(os.path.join(PK, name), encoding='utf-8') as f:
        return list(csv.DictReader(f))


data = json.load(open(OUT, encoding='utf-8'))
data['growth'] = {r['id']: int(r['growth_rate_id']) for r in rows('pokemon_species.csv')}
exp = {}
for r in rows('experience.csv'):
    exp.setdefault(r['growth_rate_id'], [0] * 100)[int(r['level']) - 1] = int(r['experience'])
data['exp'] = exp
items, used = {}, set()
for r in rows('item_game_indices.csv'):
    g = int(r['generation_id'])
    if 2 <= g <= 8:
        items.setdefault(str(g), {})[r['game_index']] = int(r['item_id'])
        used.add(int(r['item_id']))
data['items'] = items
ident = {int(r['id']): r['identifier'] for r in rows('items.csv')}
fr = {int(r['item_id']): r['name'] for r in rows('item_names.csv') if r['local_language_id'] == '5'}
data['itemInfo'] = {str(i): [ident.get(i, ''), fr.get(i, ident.get(i, ''))] for i in sorted(used)}
data['_info'] = ('Index internes des espèces → n° national (PokeAPI pokemon_game_indices : Rouge pour la Gen 1, Rubis pour la Gen 3) ; '
                 'courbes d\'expérience et index des objets par génération (tools/build_save_data.py)')
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
print({k: len(v) for k, v in data.items()})
