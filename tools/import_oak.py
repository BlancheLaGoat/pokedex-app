#!/usr/bin/env python3
"""
Défi du Prof. Chen (Professor Oak Challenge) : import des listes de Mewlax (r/ProfessorOak).
Le défi : avant chaque badge (ou étape clé), attraper tous les Pokémon disponibles à ce moment-là.

Source : tools/sources/oak-guides.json — les onglets « un jeu » des feuilles « Gen N POC List » de Mewlax
(CSV de chaque onglet, clé « gN|Nom de l'onglet »). Sortie : data/curated/oak.json.

Les textes sont traduits en français par règles (noms de Pokémon, lieux, objets, tournures courantes) ;
les remarques libres du guide peuvent garder des morceaux en anglais.
"""
import csv, io, json, os, re, unicodedata

HERE = os.path.dirname(__file__)
ROOT = os.path.join(HERE, '..')
SRC = os.path.join(HERE, 'sources', 'oak-guides.json')
OUT = os.path.join(ROOT, 'data', 'curated', 'oak.json')
core = json.load(open(os.path.join(ROOT, 'data', 'core.json'), encoding='utf-8'))

# onglet → (version de l'appli, variante)
TABS = {
    'Red': (1, ''), 'Blue': (2, ''), 'Yellow': (3, ''), 'Gold': (4, ''), 'Silver': (5, ''), 'Crystal': (6, ''),
    'Ruby': (7, ''), 'Sapphire': (8, ''), 'Emerald': (9, ''), 'FireRed': (10, ''), 'LeafGreen': (11, ''),
    'Colosseum': (19, ''), 'XD: Gale of Darkness': (20, ''),
    'Diamond': (12, ''), 'Pearl': (13, ''), 'Platinum': (14, ''),
    'HeartGold (w/o Pokewalker)': (15, 'Sans Pokéwalker'), 'HeartGold (w/ Pokewalker)': (15, 'Avec Pokéwalker'),
    'SoulSilver (w/o Pokewalker)': (16, 'Sans Pokéwalker'), 'SoulSilver (w/ Pokewalker)': (16, 'Avec Pokéwalker'),
    'Black': (17, ''), 'White': (18, ''), 'Black 2': (21, ''), 'White 2': (22, ''),
    'X': (23, ''), 'Y': (24, ''), 'Omega Ruby': (25, ''), 'Alpha Sapphire': (26, ''),
    'Sun': (27, ''), 'Moon': (28, ''), 'Ultra Sun': (29, ''), 'Ultra Moon': (30, ''),
    "Let's Go Pikachu": (31, ''), "Let's Go Eevee": (32, ''),
    'Sword Base': (33, 'Jeu de base'), 'Sword+DLC': (33, 'Avec les DLC'), 'Shield Base': (34, 'Jeu de base'), 'Shield+DLC': (34, 'Avec les DLC'),
    'Brilliant Diamond': (37, ''), 'Shining Pearl': (38, ''), 'Legends Arceus': (39, ''),
    'Scarlet': (40, 'Jeu de base'), 'Scarlet+DLC': (40, 'Avec les DLC'), 'Violet': (41, 'Jeu de base'), 'Violet+DLC': (41, 'Avec les DLC'),
    'Legends ZA': (47, 'Jeu de base'), 'Legends ZA+DLC': (47, 'Avec le DLC'),
}


def ascii_norm(s):
    s = unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '', s)


# ---------------------------------------------------------------- espèces
SP_IDX = {ascii_norm(sp['ident']): int(sid) for sid, sp in core['species'].items()}
SP_IDX.update({ascii_norm(sp['en']): int(sid) for sid, sp in core['species'].items() if sp.get('en')})
REGIONAL = {'alolan': "d'Alola", 'galarian': 'de Galar', 'hisuian': 'de Hisui', 'paldean': 'de Paldea'}


def species_of(name):
    """« Alolan Raichu », « Mega Charizard X », « Rotom (Wash) » → (n°, précision de forme en français)."""
    n = name.strip()
    form = ''
    m = re.match(r'^(Alolan|Galarian|Hisuian|Paldean)\s+(.*)$', n, re.I)
    if m:
        form = 'forme ' + REGIONAL[m.group(1).lower()]
        n = m.group(2)
    m = re.match(r'^Mega\s+(.*?)(?:\s+([XYZ]))?$', n)
    if m:
        form = 'Méga' + (' ' + m.group(2) if m.group(2) else '')
        n = m.group(1)
    par = re.search(r'\((.*?)\)', n)
    if par:
        form = (form + ' ' if form else '') + par.group(1)
        n = re.sub(r'\s*\(.*?\)', '', n)
    sid = SP_IDX.get(ascii_norm(n))
    return sid, form


# ---------------------------------------------------------------- dictionnaires de traduction
def title_from_ident(ident):
    w = re.sub(r'^(sv|la|bdsp|oras|za)-', '', ident)
    w = re.sub(r'^(kanto|johto|hoenn|sinnoh|unova|kalos|alola|galar|paldea)-(route|sea-route|victory-road)', r'\2', w)
    return ' '.join(x.capitalize() for x in w.split('-'))


COMMON = {'mine', 'cave', 'tower', 'lake', 'forest', 'island', 'bridge', 'ruins', 'road', 'beach', 'garden', 'pokecenter', 'pokemart', 'underwater'}


def en_pattern(en):
    words = en.split()
    parts = []
    for w in words:
        if w.lower() in ('mt', 'mount'):
            parts.append(r'(?:Mt\.?|Mount)')
        elif len(w) > 3 and w.endswith('s'):
            parts.append(re.escape(w[:-1]) + r"['’]?s")
        else:
            parts.append(re.escape(w))
    return r'\b' + r'\s+'.join(parts) + r'\b'


REPL = []  # (regex compilé, remplacement)
# lieux : nom anglais tiré de l'identifiant PokéAPI → nom français
seen = set()
locs = []
for l in core['locations'].values():
    en = title_from_ident(l['ident'])
    if not l.get('fr') or en.lower() in seen or len(en) < 4 or re.fullmatch(r'(Route|Sea Route) \d+', en) or en == l['fr']:
        continue
    if ' ' not in en and (len(en) < 7 or en.lower() in COMMON):
        continue
    seen.add(en.lower())
    fr = re.sub(r'\b([A-ZÉÈ]{4,})\b', lambda m: m.group(1).capitalize(), l['fr'])
    locs.append((en, fr))
    # « Pewter » tout court pour « Pewter City » (noms des arènes)
    m = re.match(r'^(.*) (City|Town)$', en)
    if m and m.group(1).lower() not in seen:
        seen.add(m.group(1).lower())
        locs.append((m.group(1), fr))
locs.append(('Fuschia', 'Parmanie'))
locs.append(('Mahogany', 'Acajou'))
# objets
items = []
for ident, iid in core['itemIdent'].items():
    fr = core['items'].get(str(iid))
    en = ' '.join(x.capitalize() for x in ident.split('-'))
    if fr and len(en) >= 5 and en != fr:
        items.append((en, fr))
# espèces : anglais → français
species = [(sp['en'], sp['fr']) for sp in core['species'].values() if sp.get('en') and sp['en'] != sp['fr']]
species += [("Farfetch'd", 'Canarticho'), ("Sirfetch'd", 'Palarticho'), ('Mr. Mime', 'M. Mime'), ('Mr. Rime', 'M. Glaquette'), ('Nidoran F', 'Nidoran♀'), ('Nidoran M', 'Nidoran♂'), ('Mr Mime', 'M. Mime'), ('Mime Jr', 'Mime Jr.'), ('Farfetchd', "Canarticho"), ('Flabebe', 'Flabébé')]
for en, fr in sorted(locs + items + species, key=lambda x: -len(x[0])):
    REPL.append((re.compile(en_pattern(en)), fr))

PHRASES = [
    (r'^Evolve (.+?) at Lv (\d+)', r'Faire évoluer \1 au niv. \2'),
    (r'\bEvolve\b', 'Faire évoluer'), (r'\bevolve\b', 'faire évoluer'), (r'\bEvolved\b', 'Évolué'),
    (r'with high happiness/friendship', "avec beaucoup d'amitié"), (r'high happiness/friendship', "beaucoup d'amitié"),
    (r'with high (happiness|friendship)', "avec beaucoup d'amitié"), (r'high (happiness|friendship)', "beaucoup d'amitié"),
    (r'during the day', 'de jour'), (r'at night', 'de nuit'), (r'during the night', 'de nuit'),
    (r'\bwhile holding\b', 'en tenant'), (r'\bholding\b', 'en tenant'), (r'\bknowing\b', 'en connaissant'),
    (r'\busing an?\b', 'avec'), (r'\bUse an?\b', 'Utiliser'), (r'\buse an?\b', 'utiliser'), (r'\bwith an?\b', 'avec'),
    (r'\bTrade for\b', 'Échange contre'), (r'\btrade for\b', 'échange contre'), (r'\bTrade\b', 'Échange'), (r'\btrade\b', 'échange'),
    (r'\bBreed\b', 'Œuf de'), (r'\bHatch from egg\b', "Éclosion d'un Œuf"), (r'\bEgg\b', 'Œuf'), (r'\begg\b', 'œuf'),
    (r'\bGift from\b', 'Cadeau de'), (r'\bGiven by\b', 'Donné par'), (r'\bgiven by\b', 'donné par'), (r'\bGift\b', 'Cadeau'),
    (r'\bPurchase for\b', 'Acheter pour'), (r'\bPurchase\b', 'Acheter'), (r'\bpurchased\b', 'acheté'), (r'\bBuy\b', 'Acheter'),
    (r'\bFish with Old Rod\b', 'Pêche (Canne)'), (r'\bFish with Good Rod\b', 'Pêche (Super Canne)'), (r'\bFish with Super Rod\b', 'Pêche (Méga Canne)'),
    (r'\bOld Rod\b', 'Canne'), (r'\bGood Rod\b', 'Super Canne'), (r'\bSuper Rod\b', 'Méga Canne'), (r'\bFish with\b', 'Pêche avec'), (r'\bFishing\b', 'Pêche'),
    (r'\bSurfing\b', 'Surf'), (r'\bHeadbutt\b', "Coup d'Boule"), (r'\bRock Smash\b', 'Éclate-Roc'), (r'\bSweet Scent\b', 'Doux Parfum'),
    (r'\bStatic Encounter\b', 'Rencontre fixe'), (r'\bStatic encounter\b', 'Rencontre fixe'), (r'\bOverworld Encounter\b', '(visible)'),
    (r'\bRandom Encounter\b', '(aléatoire)'), (r'\bRare Spawn\b', 'Apparition rare'), (r'\bShaking Grass\b', 'Herbe qui bouge'),
    (r'\bRustling Grass\b', 'Herbe qui bouge'), (r'\bShaking Tree\b', 'Arbre qui bouge'), (r'\bDust Cloud\b', 'Nuage de poussière'),
    (r'\bRippling Water\b', 'Eau qui ondule'), (r'\bFishing Spot\b', 'Point de pêche'), (r'\bHidden Grotto\b', 'Trouée Cachée'),
    (r'\bPok[eé] Radar\b', 'Poké Radar'), (r'\bSOS Call\b', 'Appel à l\'aide (SOS)'), (r'\bMax Raid Battle\b', 'Raid Dynamax'),
    (r'\bTera Raid Battle\b', 'Raid Téracristal'), (r'\bTera Raid\b', 'Raid Téracristal'), (r'\bRed Beam\b', 'rayon rouge'), (r'\bPurple Beam\b', 'rayon violet'),
    (r'\bDen\b', 'Antre'), (r'\b(\d) Star\b', r'\1 étoile(s)'), (r'\bSnag[e]? from\b', 'Capturer (Snag) sur'), (r'\bIsland Scan\b', 'Scanner d\'Île'),
    (r'\bPokemon Center\b', 'Centre Pokémon'), (r'\bPoke Mart\b', 'Boutique'), (r'\bPokemon\b', 'Pokémon'), (r'\bPokémon Center\b', 'Centre Pokémon'),
    (r'\bAlpha\b', 'Baron'), (r'\bMass Outbreak\b', 'Apparitions massives'), (r'\bSpace-Time Distortion\b', 'Distorsion spatio-temporelle'),
    (r'\bMorning/Day\b', 'Matin / Jour'), (r'\bMorning\b', 'Matin'), (r'\bDay\b', 'Jour'), (r'\bNight\b', 'Nuit'), (r'\bEvening\b', 'Soir'),
    (r'\bwhilst\b', 'pendant que'), (r'\bwhile\b', 'pendant que'), (r'\bhailing\b', 'il grêle'), (r'\braining\b', 'il pleut'),
    (r'\bRain\b', 'Pluie'), (r'\bThunderstorm\b', 'Orage'), (r'\bSnowstorm\b', 'Tempête de neige'), (r'\bSnow\b', 'Neige'),
    (r'\bSandstorm\b', 'Tempête de sable'), (r'\bOvercast\b', 'Nuageux'), (r'\bHeavy Fog\b', 'Brouillard'), (r'\bFog\b', 'Brouillard'),
    (r'\bIntense Sun\b', 'Soleil intense'), (r'\bNormal Weather\b', 'Temps normal'), (r'\bAll Weather\b', 'Tous les temps'),
    (r'\bStarter\b', 'Starter'), (r'\bOptional\b', 'Facultatif'), (r'\bonly\b', 'seulement'), (r'\bVersion Exclusive\b', 'Exclusif à la version'),
    (r'\bFloor\b', 'Étage'), (r'\bOutside\b', 'Extérieur'), (r'\bInside\b', 'Intérieur'), (r'\bNorth\b', 'Nord'), (r'\bSouth\b', 'Sud'),
    (r'\bEast\b', 'Est'), (r'\bWest\b', 'Ouest'), (r'\bArea\b', 'Zone'), (r'\bany body of water\b', "n'importe quelle étendue d'eau"),
    (r'\bAny body of water\b', "N'importe quelle étendue d'eau"), (r'\bRevive\b', 'Faire revivre'), (r'\bFossil\b', 'Fossile'),
    (r'\bSame Lv as your Pok[eé]mon\b', 'même niveau que ton Pokémon'), (r'\bLv\b', 'niv.'), (r'\bat Lv\b', 'au niv.'),
]
PHRASES = [(re.compile(a), b) for a, b in PHRASES]

SECTION = [
    (r'^Part (\d+) - Pre Badge (\d+) from (.+?) Gym$', r'Partie \1 — Avant le badge \2 (Arène de \3)'),
    (r'^Part (\d+) - Pre Badge (\d+) from (.+)$', r'Partie \1 — Avant le badge \2 (\3)'),
    (r'^Part (\d+) - Pre (.+)$', r'Partie \1 — Avant : \2'), (r'^Part (\d+) - (.+)$', r'Partie \1 — \2'), (r'^Part (\d+)$', r'Partie \1'),
    (r'^Choices \(Pick [Oo]ne (.+?)\)$', r'Au choix : un seul \1'), (r'^Choices \((.+?)\)$', r'Au choix : \1'),
    (r'\bBadges (\d+) to (\d+)\b', r'badges \1 à \2'), (r'\bPost[- ]?[Gg]ame\b', 'Après la ligue'), (r'\bElite Four\b', 'Conseil 4'), (r'\bChampion\b', 'Maître'), (r'\bPre Badge\b', 'Avant le badge'), (r'\bGym\b', 'Arène'),
    (r'\bIMPORTANT NOTE\b', 'NOTE IMPORTANTE'), (r'\bOptional Pokemon\b', 'Pokémon facultatifs'), (r'\bNational Dex Pokemon\b', 'Pokémon du Pokédex National'),
    (r'\bBonus Section\b', 'Section bonus'), (r'\bEnd of the Challenge\b', 'Fin du défi'), (r'\bEnd of Challenge\b', 'Fin du défi'),
]
SECTION = [(re.compile(a, re.I if i < 7 else 0), b) for i, (a, b) in enumerate(SECTION)]


REGION_ADJ = [(re.compile(r'\b(Alolan|Galarian|Hisuian|Paldean|Johtonian|Kantonian)\s+(\S+)'), lambda m: m.group(2) + ' ' + {
    'Alolan': "d'Alola", 'Galarian': 'de Galar', 'Hisuian': 'de Hisui', 'Paldean': 'de Paldea', 'Johtonian': 'de Johto', 'Kantonian': 'de Kanto'}[m.group(1)])]
WORDS = [(re.compile(r'\b' + a + r'\b'), b) for a, b in [
    ('Fixed Encounter', 'Rencontre fixe'), ('Bamboo Forest', 'Bambouseraie'), ('Forest', 'Forêt'), ('Desert', 'Désert'), ('Beach', 'Plage'),
    ('Ocean', 'Mer'), ('River', 'Rivière'), ('Swamp', 'Marais'), ('Flower', 'Fleurs'), ('Mountain', 'Montagne'), ('Rocky', 'Rocheux'),
    ('Snowfield', 'Champ de neige'), ('Lake', 'Lac'), ('Ruins', 'Ruines'), ('Cave', 'Grotte'), ('Town', 'Ville'), ('Defeat', 'Battre'),
    ('defeat', 'battre'), ('after', 'après'), ('After', 'Après'), ('before', 'avant'), ('Before', 'Avant'), ('Catch', 'Attraper'),
    ('catch', 'attraper'), ('Talk to', 'Parler à'), ('the', 'le'), ('and', 'et'), ('from', 'de'), ('in', 'à'), ('on', 'sur'), ('or', 'ou')]]


def tr(text, section=False):
    t = text.strip()
    if section:
        for rx, b in SECTION:
            t = rx.sub(b, t)
    for rx, fr in REPL:  # lieux, objets et espèces d'abord (avant de traduire « South », « Forest »…)
        t = rx.sub(fr, t)
    for rx, b in PHRASES + REGION_ADJ + WORDS:
        t = rx.sub(b, t)
    t = re.sub(r"\b([Dd])e ([AEIOUÉÈYaeiouéèy])", r"\1'\2", t)  # de Argenta → d'Argenta
    return t


# ---------------------------------------------------------------- lecture d'un onglet
def parse(csv_text):
    rows = list(csv.reader(io.StringIO(csv_text)))
    parts, intro = [], []
    part, group = None, None
    unknown = set()
    for i, r in enumerate(rows):
        if i < 2 or len(r) < 5:
            continue
        a, b, name, how, note = (r + [''] * 5)[:5]
        if a in ('TRUE', 'FALSE') and name.strip():
            sid, form = species_of(name)
            if not sid:
                unknown.add(name)
                continue
            if part is None:
                part = {'title': 'Début', 'notes': [], 'groups': []}
                parts.append(part)
            if group is None:
                group = {'kind': 'main', 'title': '', 'mons': []}
                part['groups'].append(group)
            hows = [tr(x.strip().lstrip('-').strip()) for x in how.split('\n') if x.strip().lstrip('-').strip()]
            mon = {'sid': sid, 'how': hows}
            if form:
                mon['form'] = form
            if note.strip():
                mon['note'] = tr(note)
            group['mons'].append(mon)
            continue
        text = b.strip()
        if not text:
            continue
        low = text.lower()
        if re.match(r'^part \d+', low):
            part = {'title': tr(text.split('\n')[0], True), 'notes': [tr(x, True) for x in text.split('\n')[1:] if x.strip()], 'groups': []}
            parts.append(part)
            group = None
        elif low.startswith('end of'):
            group = None
        elif low.startswith('choices'):
            group = {'kind': 'choice', 'title': tr(text, True), 'mons': []}
            (part or parts.append({'title': 'Début', 'notes': [], 'groups': []}) or parts[-1])['groups'].append(group)
        elif low.startswith('pokemon in this section'):
            group = {'kind': 'main', 'title': '', 'mons': []}
            (part or parts.append({'title': 'Début', 'notes': [], 'groups': []}) or parts[-1])['groups'].append(group)
        elif re.match(r'^(optional|national dex|bonus)', low):
            group = {'kind': 'optional', 'title': tr(text, True), 'mons': []}
            (part or parts.append({'title': 'Début', 'notes': [], 'groups': []}) or parts[-1])['groups'].append(group)
        else:
            (part['notes'] if part else intro).append(tr(text.strip('*'), True))
    for p in parts:
        p['groups'] = [g for g in p['groups'] if g['mons']]
    return {'intro': intro, 'parts': [p for p in parts if p['groups'] or p['notes']]}, unknown


src = json.load(open(SRC, encoding='utf-8'))
out = {'_info': "Défi du Prof. Chen — listes de Mewlax (r/ProfessorOak, feuilles « Gen N POC List »), traduites automatiquement. tools/import_oak.py",
       'games': {}}
missing = set()
for key, text in src.items():
    tab = key.split('|', 1)[1].replace('\\/', '/').replace('\\x27', "'")
    if tab not in TABS:
        print('onglet ignoré :', tab)
        continue
    v, variant = TABS[tab]
    data, unknown = parse(text)
    missing |= unknown
    data['variant'] = variant
    out['games'].setdefault(str(v), []).append(data)
for v in out['games']:
    out['games'][v].sort(key=lambda d: (d['variant'] not in ('', 'Sans Pokéwalker', 'Jeu de base'), d['variant']))
json.dump(out, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
n = sum(len(g['mons']) for vs in out['games'].values() for d in vs for p in d['parts'] for g in p['groups'])
print('jeux :', len(out['games']), '· listes :', sum(len(x) for x in out['games'].values()), '· lignes Pokémon :', n, '· noms inconnus :', sorted(missing)[:20])
print('taille :', os.path.getsize(OUT))
