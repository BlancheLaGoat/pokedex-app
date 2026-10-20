#!/usr/bin/env python3
"""
Ajoute les rencontres saisies à la main (data/curated/extra-encounters.json) aux fichiers data/enc/<version>.json.
À relancer après tools/build_data.py, import_sv.py et import_bulba.py. Sans effet si déjà appliqué (dédoublonnage).
"""
import json, os

ROOT = os.path.join(os.path.dirname(__file__), '..')
D = lambda *p: os.path.join(ROOT, 'data', *p)
core = json.load(open(D('core.json'), encoding='utf-8'))
extra = json.load(open(D('curated/extra-encounters.json'), encoding='utf-8'))

for mid, (ident, fr) in extra['methods'].items():
    core['encMethods'][mid] = {'ident': ident, 'fr': fr}
mid_by_ident = {m['ident']: int(k) for k, m in core['encMethods'].items()}
loc_by_ident = {l['ident']: int(k) for k, l in core['locations'].items()}
next_area = max(int(k) for k in core['areas']) + 1
def_pk = {p['sp']: p['id'] for p in core['pokemon'].values() if p['def']}

added = 0
for e in extra['entries']:
    lid = loc_by_ident[e['location']]
    aid = next((int(k) for k, a in core['areas'].items() if a['l'] == lid and a['fr'] == e['area']), None)
    if aid is None:
        aid = next_area; next_area += 1
        core['areas'][str(aid)] = {'l': lid, 'ident': 'extra', 'fr': e['area']}
    meth = mid_by_ident[e['method']]
    for v in e['versions']:
        path = D('enc', f'{v}.json')
        enc = json.load(open(path, encoding='utf-8')) if os.path.exists(path) else {}
        for sid, lo, hi, rate in e['pokemon']:
            pid = str(def_pk[sid])
            rec = [aid, meth, e.get('conds', []), lo, hi, rate]
            lst = enc.setdefault(pid, [])
            if rec not in lst:
                lst.append(rec); added += 1
        json.dump(enc, open(path, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
json.dump(core, open(D('core.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('rencontres ajoutées :', added)
