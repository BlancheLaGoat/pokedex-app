#!/usr/bin/env python3
"""
Exclusivités de version officielles, d'après la page « Version-exclusive Pokémon » de Bulbapedia.
Entrée : data/curated/bulba/version-exclusives.txt  (section|modèle|paramètres du modèle Vex…)
Sortie : data/curated/exclusives.json
  { "versions": { "<version>": { "<id espèce>": true|false } }, "forms": { "<version>": { "<id variété>": true|false } } }
  true = disponible dans cette version, false = absent (échange nécessaire). Les espèces absentes du fichier
  ne sont pas des exclusivités de version dans ce groupe.
"""
import json, os, re, collections

ROOT = os.path.join(os.path.dirname(__file__), '..')
D = lambda *p: os.path.join(ROOT, 'data', *p)
core = json.load(open(D('core.json'), encoding='utf-8'))

# section -> versions de chaque colonne (une colonne peut couvrir plusieurs versions)
COLUMNS = {
    # Modèle Vex1 : paramètres dans l'ordre Rouge, Bleu JP, Vert JP (= Bleu international), Jaune (vérifié sur Template:Vex1)
    'Generation I': [[1, 44], [46], [2, 45], [3]],
    'Generation II': [[4], [5], [6]],
    'Ruby': [[7], [8], [9]], 'Emerald (National Pokédex)': [[7], [8], [9]],
    'FireRed': [[10], [11]], 'Diamond': [[12], [13], [14]], 'HeartGold': [[15], [16]],
    'Black': [[17], [18]], 'White Forest': [[17], [18]], 'Black 2 and White 2': [[21], [22]],
    'X and Y': [[23], [24]], 'Omega Ruby and Alpha Sapphire': [[25], [26]],
    'Sun and Moon': [[27], [28]], 'Ultra Sun and Ultra Moon': [[29], [30]], '{{LGPE': [[31], [32]],
    'Sword and Shield': [[33], [34]], 'The Isle of Armor': [[35], [50]], 'The Crown Tundra': [[36], [51]],
    'Brilliant Diamond and Shining Pearl': [[37], [38]],
    'Scarlet and Violet': [[40], [41]], 'The Teal Mask': [[42], [52]], 'The Indigo Disk': [[43], [53]],
}
FORM_TOKEN = {'A': 'alola', 'G': 'galar', 'H': 'hisui', 'P': 'paldea'}

vars_by_sp = collections.defaultdict(list)
for p in core['pokemon'].values():
    vars_by_sp[p['sp']].append(p)

out = collections.defaultdict(dict)
forms = collections.defaultdict(dict)
skipped = []
for line in open(D('curated/bulba/version-exclusives.txt'), encoding='utf-8'):
    parts = line.rstrip('\n').split('|')
    # la section peut contenir des « | » (ex. « Ruby|Sapphire|Emerald ») : on cherche le modèle Vex…
    idx = next((i for i, x in enumerate(parts) if re.match(r'^Vex\w*$', x) and not x.startswith('VexHeader') and not x.startswith('VexFooter')), None)
    if idx is None: continue
    sec = parts[0]
    cols = COLUMNS.get(sec)
    if not cols: continue
    params = parts[idx + 1:]
    named = {p.split('=', 1)[0]: p.split('=', 1)[1] for p in params if '=' in p}
    pos = [p for p in params if '=' not in p]
    dex = pos[0]
    m = re.match(r'(\d+)(.*)', dex)
    sid = int(m.group(1))
    suffix = m.group(2)
    flags = [f.strip().lower() == 'yes' for f in pos[2:2 + len(cols)]]
    if len(flags) < len(cols): flags += [False] * (len(cols) - len(flags))
    form = named.get('form', '').strip('-')
    if suffix and not form:
        skipped.append(line.strip()[:60]); continue    # méga, gigamax… (formes de combat)
    if form:
        tok = FORM_TOKEN.get(form, form.split(' ')[0].lower())
        pk = next((p for p in vars_by_sp[sid] if tok in p['ident'].split('-') and
                   all(t.lower() in p['ident'] for t in form.split(' ')[1:])), None)
        if not pk: skipped.append(line.strip()[:60]); continue
        for vs, ok in zip(cols, flags):
            for v in vs: forms[v][pk['id']] = forms[v].get(pk['id'], False) or ok
        continue
    for vs, ok in zip(cols, flags):
        for v in vs: out[v][sid] = out[v].get(sid, False) or ok

res = {'_info': "Exclusivités de version d'après Bulbapedia (Version-exclusive Pokémon). true = disponible, false = échange nécessaire.",
       'versions': {str(v): d for v, d in sorted(out.items())}, 'forms': {str(v): d for v, d in sorted(forms.items())}}
json.dump(res, open(D('curated/exclusives.json'), 'w', encoding='utf-8'), ensure_ascii=False)
print({v: sum(1 for x in d.values() if x) for v, d in sorted(out.items())})
print('ignorés', len(skipped), skipped[:8])
