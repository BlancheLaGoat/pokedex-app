"""Anciennes stats de base (avant les changements de la 2e, 6e, 7e, 8e… génération) et stat « Spécial » de la 1re génération.

Source : PokeAPI, data/v2/csv/pokemon_stats_past.csv (copie dans tools/sources/pokeapi-pokemon_stats_past.csv).
Chaque ligne donne la valeur valable JUSQU'À la génération `generation_id` incluse.
Sortie : data/stats-past.json = {n° Pokémon: [[dernière génération, stat, valeur], …]}
stat : 0 PV, 1 Attaque, 2 Défense, 3 Attaque Spéciale, 4 Défense Spéciale, 5 Vitesse, 6 Spécial (1re génération).
"""
import csv, json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STAT = {1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 9: 6}
out = {}
with open(os.path.join(ROOT, 'tools', 'sources', 'pokeapi-pokemon_stats_past.csv'), encoding='utf-8') as f:
    for r in csv.DictReader(f):
        out.setdefault(r['pokemon_id'], []).append([int(r['generation_id']), STAT[int(r['stat_id'])], int(r['base_stat'])])
with open(os.path.join(ROOT, 'data', 'stats-past.json'), 'w', encoding='utf-8') as f:
    json.dump(out, f, separators=(',', ':'))
print(len(out), 'Pokémon')
