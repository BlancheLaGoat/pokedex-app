"""Anciennes valeurs des attaques (puissance, précision, PP, type) avant chaque changement de génération.

Source : PokeAPI, data/v2/csv/move_changelog.csv (copie dans tools/sources/pokeapi-move_changelog.csv).
Chaque ligne donne les valeurs qu'avait l'attaque AVANT le groupe de versions `changed_in_version_group_id`.
Sortie : data/moves-changes.json = [[attaque, groupe_de_versions_du_changement, type, puissance, pp, précision], …]
(null = valeur inchangée).
"""
import csv, json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = []
with open(os.path.join(ROOT, 'tools', 'sources', 'pokeapi-move_changelog.csv'), encoding='utf-8') as f:
    for r in csv.DictReader(f):
        v = lambda k: int(r[k]) if r[k] else None
        row = [int(r['move_id']), int(r['changed_in_version_group_id']), v('type_id'), v('power'), v('pp'), v('accuracy')]
        if any(x is not None for x in row[2:]):
            out.append(row)
with open(os.path.join(ROOT, 'data', 'moves-changes.json'), 'w', encoding='utf-8') as f:
    json.dump(out, f, separators=(',', ':'))
print(len(out), 'changements')
