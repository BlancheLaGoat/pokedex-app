#!/usr/bin/env python3
"""
Importe la feuille « National living dex » (onglets 4th gen, 5th gen, 6th gen) :
où capturer chaque Pokémon dans les jeux de la 4e, 5e et 6e génération pour faire un Pokédex vivant.
Sources : data/curated/livingdex/g4.txt, g5.txt, g6.txt (id|lieu|jeu 1|jeu 2|condition|objet)
Sortie : data/curated/livingdex.json
"""
import json, os

HERE = os.path.dirname(__file__)
SRC = os.path.join(HERE, '..', 'data', 'curated', 'livingdex')
OUT = os.path.join(HERE, '..', 'data', 'curated', 'livingdex.json')
GAMES = {
    'g4': {'HG': 15, 'SS': 16, 'Plat': 14, 'D': 12, 'P': 13},
    'g5': {'N': 17, 'B': 18, 'N2': 21, 'B2': 22},
    'g6': {'X': 23, 'Y': 24, 'RO': 25, 'SA': 26},
}
NONE = {'g4': {'X', ''}, 'g5': {'X', ''}, 'g6': {''}}

out = {'_info': "Feuille Google « National living dex » (onglets 4th gen, 5th gen, 6th gen), importée par tools/import_livingdex.py",
       'url': 'https://docs.google.com/spreadsheets/d/1mMOIKXHfhrz30g8fTJWAjzlkJdblw-mekOUcrL8CsJw'}
for tab, gmap in GAMES.items():
    rows = {}
    for line in open(os.path.join(SRC, tab + '.txt'), encoding='utf-8'):
        line = line.rstrip('\n')
        if not line.strip():
            continue
        sid, loc, g1, g2, cond, item = (line.split('|') + [''] * 6)[:6]
        games = [gmap[g] for g in (g1.strip(), g2.strip()) if g not in NONE[tab] and g in gmap]
        l = loc.strip()
        kind = 'egg' if l.lower() in ('œuf', 'oeuf') else 'transfer' if l in ('Poké Fret', 'Transfert') else 'event' if l == 'Event' else 'catch'
        item = item.strip()
        rows[sid.strip()] = {'loc': l, 'games': games, 'cond': cond.strip(), 'item': '' if item == 'X' else item, 'kind': kind}
    out[tab] = rows
json.dump(out, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False)
print({k: len(v) for k, v in out.items() if k.startswith('g')})
