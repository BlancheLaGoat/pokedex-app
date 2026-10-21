# Vraies cartes du jeu pour l'onglet Carte (images Bulbagarden Archives, chargées par internet,
# jamais copiées dans l'appli).
#
# Chaque carte :
#   layers : une ou plusieurs images {url, w, h} (w, h = taille de l'image d'origine, sert au rapport largeur/hauteur)
#            - une seule image : crop = partie affichée, en % de l'image (x0 y0 x1 y1)
#            - plusieurs images : canvas = [largeur, hauteur] en pixels, et pour chaque image crop (en %) et
#              at = [x, y, largeur] (place et largeur de la partie gardée sur le canevas)
#   pos    : une ligne par lieu : « identifiant x y » en % de l'image (« identifiant x y Ln » pour l'image n, à partir de 0).
#            « identifiant X Y c » = position directe en pixels du canevas (lieux hors carte, dans un coin).
#            Un identifiant « @Nom » ajoute une ville sans rencontre (juste l'étiquette).
#   ns     : taille des pastilles (1 = normale)
#   pix    : image en pixels (affichage net, sans lissage) ; bg : couleur du fond autour des images.
import re, sys

ARCH = 'https://archives.bulbagarden.net/media/upload/'


def thumb(path, width):
    """Miniature servie par Bulbagarden Archives (plus légère que l'image d'origine)."""
    name = path.split('/')[-1]
    return f'{ARCH}thumb/{path}/{width}px-{name}'


IMG_MAPS = {
    'kanto': {
        'source': 'Carte de Kanto (Rouge Feu / Vert Feuille), Bulbagarden Archives', 'pix': True,
        'layers': [{'url': ARCH + '7/7c/KantoTownMap.png', 'w': 240, 'h': 160}], 'crop': [10, 9.5, 90, 100],
        'pos': """
pallet-town 28.2 77.1
kanto-route-1 28.2 69.6
viridian-city 28.2 62.1
kanto-route-22 24.2 62.1
kanto-route-23 21.5 52
kanto-victory-road-1 21.5 45
kanto-victory-road-2 21.5 42.3
indigo-plateau 21.5 36.9
kanto-route-2 28.2 56.6
viridian-forest 28.2 47.5
pewter-city 28.2 42.3
kanto-route-3 37 36.9
mt-moon 44.8 36.9
kanto-route-4 53.4 36.9
cerulean-city 61.5 36.9
cerulean-cave 57.5 31
kanto-route-24 61.5 30
kanto-route-25 66.5 25.2
kanto-route-5 61.5 44.5
kanto-underground-path 63.8 57
saffron-city 61.5 52.4
kanto-route-6 61.5 60
vermilion-city 61.5 67.1
ss-anne 58.5 71.5
digletts-cave 64.8 67.1
kanto-route-11 68.5 67.1
kanto-route-9 68.3 36.9
kanto-power-plant 74.9 36.9
rock-tunnel 74.9 42.3
kanto-route-10 74.9 47.4
lavender-town 74.9 52.4
pokemon-tower 77.3 54.6
kanto-route-8 68.3 52.4
kanto-route-7 56.5 52.4
celadon-city 51.6 52.4
kanto-route-16 43 52.4
kanto-route-17 37.6 68
kanto-route-18 46 84.5
fuchsia-city 54.9 82.5
kanto-safari-zone 56.9 78.5
kanto-route-12 74.9 63
kanto-route-13 72 77.6
kanto-route-14 66.5 80.2
kanto-route-15 61 82.5
kanto-sea-route-19 54.9 88.5
kanto-sea-route-20 48.5 92.2
seafoam-islands 41.5 92.2
cinnabar-island 28.2 92.2
pokemon-mansion 30.6 93.8
kanto-sea-route-21 28.2 85
""",
    },
    'sevii': {
        'source': 'Carte des Îles Sevii (Rouge Feu / Vert Feuille, trois pages de la Carte), Bulbagarden Archives', 'pix': True, 'bg': '#9cc0f8',
        'ns': 0.6, 'layers': [
            {'url': ARCH + '6/62/Sevii_Islands_1_2_and_3_Town_Map.png', 'w': 192, 'h': 144, 'crop': [3, 25, 92, 97], 'at': [0, 0, 171]},
            {'url': ARCH + 'b/bb/Sevii_Islands_4_and_5_Town_Map.png', 'w': 192, 'h': 144, 'crop': [12, 28, 88, 98], 'at': [171, 0, 146]},
            {'url': ARCH + '1/19/Sevii_Islands_6_and_7_Town_Map.png', 'w': 192, 'h': 144, 'crop': [10, 8, 88, 99], 'at': [83, 104, 150]},
        ], 'canvas': [317, 235],
        'pos': """
one-island 10 58 L0
kindle-road 14 45 L0
mt-ember 14.5 31 L0
treasure-beach 10 73 L0
@Ile 2 43.5 63 L0
cape-brink 43.5 52 L0
@Ile 3 81 80 L0
bond-bridge 69.5 80 L0
berry-forest 64.5 80 L0
three-isle-port 82.5 87.5 L0
four-island 17 35 L1
icefall-cave 21.5 39.5 L1
five-island 72.5 75 L1
five-isle-meadow 77 79 L1
memorial-pillar 81.5 92 L1
water-labyrinth 67 70 L1
resort-gorgeous 73 64 L1
lost-cave 81 64 L1
@Ile 6 76.5 41 L2
water-path 82 36 L2
green-path 72 30 L2
pattern-bush 79 28 L2
outcast-island 66.5 23 L2
kanto-altering-cave 68.5 13 L2
ruin-valley 78 55 L2
@Ile 7 27 58 L2
trainer-tower 27 47 L2
canyon-entrance 29.5 64 L2
sevault-canyon 32 73 L2
tanoby-ruins 16 81.5 L2
monean-chamber 14 89 L2
liptoo-chamber 22 89 L2
weepth-chamber 30 89 L2
dilford-chamber 38 89 L2
scufib-chamber 18 96 L2
rixy-chamber 26 96 L2
viapos-chamber 34 96 L2
navel-rock 25 150 c
birth-island 25 190 c
""",
    },
}


def spread(pos, d, rounds=80):
    """Écarte un peu les pastilles qui se chevauchent (lieux voisins ou au même endroit sur la carte)."""
    import math
    keys = sorted(pos)
    P = {k: list(pos[k]) for k in keys}
    for _ in range(rounds):
        moved = False
        for i, a in enumerate(keys):
            for b in keys[i + 1:]:
                dx, dy = P[b][0] - P[a][0], P[b][1] - P[a][1]
                dist = math.hypot(dx, dy)
                if dist >= d:
                    continue
                if dist < 1e-6:
                    ang = (sum(map(ord, a + b)) * 47 % 360) * math.pi / 180
                    dx, dy, dist = math.cos(ang) * 0.01, math.sin(ang) * 0.01, 0.01
                push = (d - dist) / 2 / dist
                P[a][0] -= dx * push; P[a][1] -= dy * push
                P[b][0] += dx * push; P[b][1] += dy * push
                moved = True
        if not moved:
            break
    for k in keys:
        pos[k] = (round(P[k][0], 2), round(P[k][1], 2))


def place_img(res, im, key):
    """Remplace les positions schématiques par celles de la vraie carte (repère : largeur 100)."""
    layers = im['layers']
    if 'canvas' in im:
        CW, CH = im['canvas']
    else:
        L = layers[0]
        x0, y0, x1, y1 = im.get('crop', [0, 0, 100, 100])
        CW, CH = (x1 - x0) / 100 * L['w'], (y1 - y0) / 100 * L['h']
        layers = [dict(L, crop=[x0, y0, x1, y1], at=[0, 0, CW])]
    k = 100 / CW
    geo, out_layers = [], []
    for L in layers:
        x0, y0, x1, y1 = L.get('crop', [0, 0, 100, 100])
        cx, cy, cw, ch = x0 / 100 * L['w'], y0 / 100 * L['h'], (x1 - x0) / 100 * L['w'], (y1 - y0) / 100 * L['h']
        ox, oy, aw = L['at']
        s = aw / cw
        geo.append((ox, oy, s, cx, cy, L['w'], L['h']))
        out_layers.append({'url': L['url'], 'x': round(ox * k, 3), 'y': round(oy * k, 3), 'w': round(aw * k, 3), 'h': round(ch * s * k, 3),
                           'vb': [round(cx, 2), round(cy, 2), round(cw, 2), round(ch, 2)], 'iw': L['w'], 'ih': L['h']})
    pos = {}
    for line in im['pos'].strip().split('\n'):
        parts = line.split()
        if parts[-1] == 'c':
            ident, px, py = ' '.join(parts[:-3]), float(parts[-3]), float(parts[-2])
        else:
            li = 0
            if re.fullmatch(r'L\d+', parts[-1]):
                li = int(parts[-1][1:]); parts = parts[:-1]
            ident, x, y = ' '.join(parts[:-2]), float(parts[-2]), float(parts[-1])
            ox, oy, s, cx, cy, w, h = geo[li]
            px, py = ox + (x / 100 * w - cx) * s, oy + (y / 100 * h - cy) * s
        pos[ident] = (round(px * k, 2), round(py * k, 2))
    if im.get('spread'):
        spread(pos, im['spread'])
    ids = {n['id'] for n in res['nodes']}
    missing = [i for i in ids if i not in pos]
    unknown = [i for i in pos if i not in ids and not i.startswith('@')]
    if missing or unknown:
        print(f'  {key} : hors carte {sorted(missing)} ; inconnus {sorted(unknown)}', file=sys.stderr)
    nodes = [dict(n, x=pos[n['id']][0], y=pos[n['id']][1]) for n in res['nodes'] if n['id'] in pos]
    nodes += [{'id': i, 'x': p[0], 'y': p[1]} for i, p in pos.items() if i.startswith('@') and i not in ids]
    res['nodes'] = nodes
    res['paths'] = []
    res['img'] = {'H': round(CH * k, 3), 'layers': out_layers, 'source': im['source'], 'pix': bool(im.get('pix')),
                  'bg': im.get('bg'), 'ns': im.get('ns', 1)}


# ---- cartes dont les positions viennent des cartes « <Région> <lieu> Map.png » de Bulbagarden
# (même carte avec le lieu surligné : la zone surlignée donne la position), retouchées à la main
# quand plusieurs lieux tombent au même endroit.
IMG_MAPS['hoenn'] = {
    'source': 'Carte de Hoenn (Rubis / Saphir / Émeraude), Bulbagarden Archives', 'pix': True, 'ns': 0.7,
    'layers': [{'url': ARCH + '1/1f/Hoenn_RSE_Map.png', 'w': 257, 'h': 159}], 'crop': [0, 4, 100, 92],
    'pos': """
littleroot-town 17.3 68.1
hoenn-route-101 17.3 64
@Rosyères 17.3 59.5
hoenn-route-103 20 53
hoenn-route-102 12.5 59.5
petalburg-city 7.8 59.5
hoenn-route-104 4.7 47.5
petalburg-woods 4.7 52.8
rustboro-city 4.7 40.7
hoenn-route-116 10 40.5
rusturf-tunnel 14.5 38.5
verdanturf-town 17.3 42.9
hoenn-route-117 23.3 42.8
@Lavandia 31.2 43
new-mauville 30.4 49.1
hoenn-route-110 29.6 57
slateport-city 29.6 65.8
hoenn-route-109 29.6 77.7
hoenn-route-105 4.7 72
hoenn-route-106 5 76.5
dewford-town 11 83.2
granite-cave 8.5 80
hoenn-route-107 17.3 83
hoenn-route-108 24.9 83
abandoned-ship 22 86.5
hoenn-route-111 29.6 22
desert-ruins 29.6 28.9
mirage-tower 32.5 19
hoenn-route-112 26 33
fiery-path 25.5 27.7
jagged-pass 22.8 25.5
lavaridge-town 20.4 27.8
hoenn-route-113 21.8 12.6
fallarbor-town 14.2 12.8
hoenn-route-114 8.6 16.5
meteor-falls 5.5 21.5
hoenn-route-115 4.7 28
hoenn-route-118 37.4 42.8
hoenn-route-119 38.9 25.2
fortree-city 42.2 12.8
hoenn-route-120 45.1 17
hoenn-route-121 50.5 27.7
hoenn-safari-zone 55 23.5
lilycove-city 62.4 28
team-aqua-hideout 65.5 31.5
hoenn-route-122 54.5 40
mt-pyre 54.5 35.5
hoenn-route-123 48.2 42.8
hoenn-route-124 71.6 32.7
mossdeep-city 80.8 37.9
hoenn-route-125 82 27.5
shoal-cave 78.5 32
sootopolis-city 70.2 48
cave-of-origin 72.5 51.5
hoenn-route-126 66 52
seafloor-cavern 77 57.5
hoenn-route-127 79.4 47.8
hoenn-route-128 82 58.5
ever-grande-city 88.8 58
hoenn-victory-road 88.8 51.5
hoenn-route-129 80.9 62.9
hoenn-route-130 73.3 62.9
mirage-island 73.2 67.5
hoenn-route-131 63.8 62.9
sky-pillar 63.8 58.5
pacifidlog-town 57.7 63.1
hoenn-route-132 52.9 62.9
hoenn-route-133 45.1 62.9
hoenn-route-134 35.8 62.9
southern-island 42 83
team-magma-hideout 21.5 21.5
magma-hideout 21.5 21.5
ancient-tomb 46.5 24
island-cave 4.7 67.3
desert-underpass 14 10.7
artisan-cave 73.2 72.3
marine-cave 75.5 43.5
terra-cave 7.8 12.6
""",
}

IMG_MAPS['sinnoh'] = {
    'source': 'Carte de Sinnoh (Diamant / Perle / Platine), Bulbagarden Archives', 'pix': True, 'ns': 0.75,
    'layers': [{'url': ARCH + 'a/ac/Sinnoh.png', 'w': 216, 'h': 168}],
    'pos': """
twinleaf-town 12 91.7
lake-verity 7.2 85.4
sinnoh-route-201 13.7 87.5
@Bonaugure 18.5 87.5
sinnoh-route-202 18.5 83.3
@Féli-Cité 16.9 77.1
sinnoh-route-218 10.4 75
canalave-city 5.6 72.9
iron-island 12 41.7
sinnoh-route-203 21.5 75
oreburgh-gate 24.8 75
oreburgh-city 30.4 76.4
oreburgh-mine 30.4 81
sinnoh-route-207 33.1 70.8
mt-coronet 40.1 50.7
spear-pillar 41.2 58.3
sinnoh-route-208 42.6 70.8
hearthome-city 49.3 68.8
sinnoh-route-204 18.5 68.8
ravaged-path 18.5 65
floaroma-town 18.5 60.4
floaroma-meadow 15.5 57.5
valley-windworks 24.5 62.5
fuego-ironworks 18.8 54.5
sinnoh-route-205 23.1 55.8
eterna-forest 23.4 47.9
old-chateau 20.5 45
eterna-city 32.6 47.2
sinnoh-route-206 31.5 60.7
wayward-cave 28.5 57
sinnoh-route-211 41.5 45.8
celestic-town 48.1 45.8
sinnoh-route-210 56.1 49.9
sinnoh-route-209 56.5 69.6
lost-tower 54 73.5
solaceon-town 59 62.5
solaceon-ruins 61.5 59
sinnoh-route-215 63.7 54.2
veilstone-city 72 56.3
sinnoh-route-214 73.6 67
ruin-maniac-cave 76 64
maniac-tunnel 73.4 62
valor-lakefront 68.5 76
lake-valor 71.5 79
sinnoh-route-213 70.6 85.7
pastoria-city 62.3 85.4
great-marsh 62.3 80.5
sinnoh-route-212 50.3 84.1
trophy-garden 50.3 78
sinnoh-route-216 34.7 29.2
sinnoh-route-217 31.5 19
acuity-lakefront 33.5 10.5
lake-acuity 30 6.3
snowpoint-city 38 6.3
snowpoint-temple 41 3
sinnoh-route-222 79.9 79.2
sunyshore-city 88.2 77.1
sinnoh-sea-route-223 86.6 64.3
sinnoh-victory-road 86.6 58
sinnoh-pokemon-league 86.6 51.8
sinnoh-route-219 18.5 92
sinnoh-sea-route-220 20.1 95.8
sinnoh-route-221 27.1 95.8
sinnoh-route-224 91.4 45.8
sinnoh-route-225 63.9 25
stark-mountain 76.9 8.3
sinnoh-sea-route-226 73.9 20.8
sinnoh-route-227 76.8 15.2
sinnoh-route-228 80.1 25.3
resort-area 83.3 37.5
sinnoh-route-229 81.7 33.4
sinnoh-sea-route-230 73.6 33.3
""",
}

IMG_MAPS['unova'] = {
    # fond : carte de Noir 2 / Blanc 2 (celle où la Route Victoire est surlignée, à l'endroit de sa pastille)
    'source': 'Carte d’Unys (Noir 2 / Blanc 2), Bulbagarden Archives', 'pix': True, 'ns': 0.75,
    'layers': [{'url': ARCH + '8/8f/Unova_Victory_Road_B2W2_Map.png', 'w': 256, 'h': 168}],
    'pos': """
nuvema-town 90.6 94
unova-route-1 90.6 88.1
accumula-town 90.6 82.1
unova-route-2 90.1 76.1
striaton-city 89.1 70.2
dreamyard 93.4 70.2
unova-route-3 84.2 70.2
wellspring-cave 84 65.5
nacrene-city 79.3 70.2
pinwheel-forest 75.8 74.4
castelia-city 51.6 77.4
castelia-sewers 60.9 85.1
liberty-garden 28.9 86.3
unova-route-4 51.6 69
desert-resort 48 61.9
relic-castle 44.9 61.9
@Méanville 51.6 54.2
unova-route-16 56.3 54.2
lostlorn-forest 57 50
unova-route-5 46.9 54.2
driftveil-drawbridge 40.6 53
driftveil-city 28.9 54.2
cold-storage 29.5 59.5
unova-route-6 22.2 46.9
chargestone-cave 16.4 47.6
mistralton-city 15.6 39.9
mistralton-cave 25 42.3
unova-route-7 22.2 32.7
celestial-tower 21.1 29.8
twist-mountain 28.1 32.7
icirrus-city 28.9 25.6
moor-of-icirrus 34.4 21.4
dragonspiral-tower 25.8 18.5
unova-route-8 34 25.6
@Janusia 51.6 25.6
unova-route-9 46.9 25.6
unova-route-10 73 18.5
unova-victory-road 68.5 12.5
unova-victory-road-2 71.9 9.5
challengers-cave 75.5 8
unova-route-11 56.3 25.6
village-bridge 62.5 24.4
unova-route-12 69.1 25.6
@Ébenelle 74.2 25.6
unova-route-13 80.8 32.7
giant-chasm 81.3 21.4
undella-town 87.5 39.9
undella-bay 90.5 35.6
seaside-cave 91.8 31.5
unova-route-14 80.7 47
abundant-shrine 77 45.8
unova-route-15 69.1 54.2
marvelous-bridge 62.5 53
unova-route-17 85.9 94
unova-route-18 81.6 94
p2-laboratory 83.6 89.9
aspertia-city 5.5 91.1
unova-route-19 6.8 79.9
floccesy-town 13 75
unova-route-20 19.9 75.6
floccesy-ranch 16 70.2
virbank-city 27 75.6
virbank-complex 25 82.1
humilau-city 93 22.5
unova-route-21 91.8 27.4
unova-route-22 85.9 21.4
unova-route-23 76.7 15.6
reversal-mountain 80.5 39.9
strange-house 77.3 35.1
clay-tunnel 28.1 45.8
underground-ruins 31 44
relic-passage 41 70.2
""",
}

IMG_MAPS['kalos'] = {
    # fond : carte de X / Y ; chaque carte Bulbagarden a une épingle rouge, celle de Kiloude est recouverte
    # par le même coin pris sur une autre carte (Baie Azur) pour avoir un fond propre
    'source': 'Carte de Kalos (X / Y), Bulbagarden Archives', 'ns': 0.75,
    'layers': [
        {'url': ARCH + '7/7d/Kalos_Kiloude_City_Map.png', 'w': 256, 'h': 168, 'at': [0, 0, 256]},
        {'url': ARCH + '3/3f/Kalos_Azure_Bay_Map.png', 'w': 256, 'h': 168, 'crop': [73.83, 83.33, 79.3, 93.45], 'at': [189, 140, 14]},
    ], 'canvas': [256, 168],
    'pos': """
@Bourg Croquis 66.3 86.3
aquacorde-town 66.3 75
kalos-route-2 65.6 69.5
santalune-forest 66.4 64.3
kalos-route-3 62.5 62
@Neuvartault 61.7 56.5
kalos-route-22 66.8 55.7
kalos-route-4 54.7 52.4
lumiose-city 51.9 36.9
team-flare-secret-hq 55.3 33.5
kalos-route-5 46.3 47.5
@Cromlac'h 41.0 57.7
kalos-route-6 33.8 50.8
parfum-palace 29.3 44.6
kalos-route-7 29.8 58.5
connecting-cave 22.2 57.7
kalos-route-8 18.8 66.8
ambrette-town 22.6 75.6
sea-spirits-den 25.0 17.9
kalos-route-9 27.8 76.4
glittering-cave 36.3 75.6
cyllage-city 17.0 57.3
kalos-route-10 11.6 51.8
@Géosenge 9.0 47.6
kalos-route-11 9.6 43.2
reflection-cave 12.5 39.9
shalour-city 14.8 36.3
tower-of-mastery 16.8 32.5
kalos-route-12 23.2 32.8
azure-bay 27.3 25.5
@Port Tempères 34.3 29.8
kalos-route-13 41.5 33.4
kalos-route-14 51.1 25
laverre-city 51.5 11.3
kalos-route-15 58.5 20.1
lost-hotel 59.3 26.2
@Flusselles 68.3 29.8
kalos-route-16 59.5 33.5
frost-cavern 72.2 23.2
kalos-route-17 77.2 34.1
@Anistar 87.9 38.1
kalos-route-18 89.8 42.3
terminus-cave 96.1 37.5
couriway-town 92.9 45.8
kalos-route-19 87.8 51
@Névépolis 84.7 56
kalos-route-20 81.7 65.9
pokemon-village 80.4 75.6
kalos-route-21 77.3 54.8
kalos-victory-road 73.4 54.8
""",
}

# Alola : les quatre îles (cartes de Soleil / Lune), chacune recadrée et posée sur un même fond de mer
IMG_MAPS['alola'] = {
    'source': 'Cartes des îles d’Alola (Soleil / Lune), Bulbagarden Archives', 'ns': 0.7, 'spread': 2.3, 'bg': '#2a9cf0',
    'layers': [
        {'url': ARCH + 'a/a8/Melemele_Island_Map.png', 'w': 320, 'h': 240, 'crop': [22, 15, 88, 85], 'at': [0, 28.8, 211.2]},
        {'url': ARCH + '8/82/Ula%27ula_Island_Map.png', 'w': 320, 'h': 240, 'crop': [20, 3, 86, 97], 'at': [211.2, 0, 211.2]},
        {'url': ARCH + 'e/ee/Poni_Island_Map.png', 'w': 320, 'h': 240, 'crop': [12, 18, 72, 80], 'at': [9.6, 261.6, 192]},
        {'url': ARCH + '3/33/Akala_Island_Map.png', 'w': 320, 'h': 240, 'crop': [22, 8, 82, 100], 'at': [220.8, 225.6, 192]},
    ], 'canvas': [422.4, 446.4],
    'pos': """
iki-town 48.9 39.2 L0
mahalo-trail 48.7 38.5 L0
ruins-of-conflict 48.6 37.2 L0
alola-route-1 60.5 56.2 L0
melemele-meadow 51.9 32.1 L0
alola-route-3 52.2 33.2 L0
verdant-cavern 41.1 36.3 L0
alola-route-2 38.7 38.9 L0
hauoli-cemetery 37.8 41.7 L0
hauoli-city 43.9 59.2 L0
ten-carat-hill 62.1 58.7 L0
kalae-bay 59.7 37.7 L0
seaward-cave 51.9 32.1 L0
melemele-sea 67.6 69 L0
sandy-cave 30 45 L0
heahea-city 39.1 62.6 L3
heahea-beach 33 62 L3
alola-route-4 41.9 56.3 L3
paniola-town 45.8 46 L3
paniola-ranch 45.5 45.9 L3
alola-route-5 45 37.1 L3
brooklet-hill 44.6 36.5 L3
alola-route-6 49.1 52.9 L3
royal-avenue 57.2 48.9 L3
alola-route-7 62.5 30 L3
wela-volcano-park 61.6 32.8 L3
alola-route-8 48.5 21.6 L3
dividing-peak-tunnel 56 24 L3
lush-jungle 46.5 33.1 L3
konikoni-city 29.2 76.3 L3
alola-route-9 39.9 78.1 L3
memorial-hill 37.9 81.2 L3
akala-outskirts 40.8 81 L3
ruins-of-life 41.8 78.5 L3
hano-beach 63.9 66.1 L3
digletts-tunnel 40 76.7 L3
aether-paradise 205 222 c
malie-city 59.5 35.3 L1
malie-garden 60.2 36.5 L1
alola-route-16 34.6 47.3 L1
ulaula-beach 74.7 72.6 L1
alola-route-10 46.5 38.5 L1
mount-hokulani 44.9 37.8 L1
alola-route-11 58.8 46.5 L1
alola-route-12 68.2 60 L1
blush-mountain 69.9 61.8 L1
alola-route-13 55.5 65 L1
tapu-village 44.5 66 L1
alola-route-14 45.4 85.9 L1
thrifty-megamart 47.1 85.1 L1
haina-desert 55.2 67.4 L1
ruins-of-abundance 55.7 59.8 L1
alola-route-15 33.2 68.7 L1
alola-route-17 35.8 23.5 L1
ulaula-meadow 33.2 49.4 L1
mount-lanakila 44.8 69.2 L1
lake-of-the-sunne 34.5 45.7 L1
lake-of-the-moone 34.5 45.7 L1
seafolk-village 34.1 64.3 L2
poni-wilds 38.6 53.9 L2
ancient-poni-path 47.4 49 L2
poni-breaker-coast 56.2 63.4 L2
ruins-of-hope 57.1 64.1 L2
exeggutor-island 31.7 63.9 L2
poni-grove 56.4 58.6 L2
poni-gauntlet 53.3 32.9 L2
poni-plains 59.2 48.1 L2
poni-meadow 59.8 48 L2
vast-poni-canyon 48.3 50.7 L2
altar-of-the-sunne 46.9 45 L2
altar-of-the-moone 46.9 45 L2
resolution-cave 58.4 44.5 L2
poni-coast 63.3 41.2 L2
""",
}

# Hisui : les cinq zones + le village (cartes de Légendes Pokémon : Arceus), positions tirées des cartes
# « Hisui <lieu> Map.png » (captures du jeu recalées sur les cartes de zone : même échelle pour les cinq)
_HZ = 512
IMG_MAPS['hisui'] = {
    'source': 'Cartes des zones de Hisui (Légendes Pokémon : Arceus), Bulbagarden Archives', 'ns': 0.8, 'spread': 2.6, 'bg': '#1d2128',
    'layers': [
        {'url': thumb('b/be/Alabaster_Icelands_Map.png', 500), 'w': 1024, 'h': 1024, 'at': [0, 0, _HZ]},
        {'url': thumb('f/f7/Coronet_Highlands_Map.png', 500), 'w': 1024, 'h': 1024, 'at': [_HZ, 0, _HZ]},
        {'url': thumb('5/51/Cobalt_Coastlands_Map.png', 500), 'w': 1024, 'h': 1024, 'at': [2 * _HZ, 0, _HZ]},
        {'url': thumb('8/89/Jubilife_Village_Map.png', 500), 'w': 1024, 'h': 1024, 'at': [0, _HZ, _HZ]},
        {'url': thumb('3/31/Obsidian_Fieldlands_Map.png', 500), 'w': 1024, 'h': 1024, 'at': [_HZ, _HZ, _HZ]},
        {'url': thumb('2/2f/Crimson_Mirelands_Map.png', 500), 'w': 1024, 'h': 1024, 'at': [2 * _HZ, _HZ, _HZ]},
    ], 'canvas': [3 * _HZ, 2 * _HZ],
    'pos': """
la-jubilife-village 40 38 L3
la-galaxy-hall 46 12 L3
la-arenas-approach 27.6 60.9 L0
la-avalanche-slopes 15.9 75.0 L0
la-avaluggs-legacy 55.1 47.2 L0
la-bonechill-wastes 56.4 66.5 L0
la-crevasse-passage 63.1 78.9 L0
la-glacier-terrace 27.8 25.6 L0
la-hearts-crag 80.6 40.8 L0
la-hibernal-cave 41.0 74.0 L0
la-ice-column-chamber 21.7 76.0 L0
la-icebound-falls 32.4 89.0 L0
la-icepeak-arena 14.9 49.2 L0
la-icepeak-cavern 36.3 46.0 L0
la-lake-acuity 48.2 14.4 L0
la-pearl-settlement 69.7 27.0 L0
la-secret-hollow 43.0 27.4 L0
la-snowfall-hot-spring 18.8 37.1 L0
la-snowpoint-temple 67.6 7.2 L0
la-whiteout-valley 55.5 80.6 L0
la-ancient-quarry 52.3 81.1 L1
la-bolderoll-ravine 12.5 69.4 L1
la-celestica-ruins 61.7 42.8 L1
la-celestica-trail 53.5 66.7 L1
la-clamberclaw-cliffs 74.4 50.6 L1
la-cloudcap-pass 25.6 25.9 L1
la-fabled-spring 19.6 85.8 L1
la-heavenward-lookout 92.1 86.5 L1
la-lonely-spring 86.1 61.7 L1
la-primeval-grotto 46.9 57.1 L1
la-sacred-plaza 28.5 50.9 L1
la-sonorous-path 65.2 72.1 L1
la-stone-portal 30.3 24.8 L1
la-stonetooth-rows 9.2 58.3 L1
la-temple-of-sinnoh 20.5 15.2 L1
la-wayward-cave 74.6 80.5 L1
la-wayward-wood 57.2 91.4 L1
la-aipom-hill 29.5 79.6 L2
la-bathers-lagoon 51.0 83.8 L2
la-castaway-shore 51.4 44.6 L2
la-crossing-slope 14.5 71.5 L2
la-deadwood-haunt 68.1 81.6 L2
la-firespit-island 82.8 16.3 L2
la-ginkgo-landing 27.8 65.1 L2
la-hideaway-bay 47.5 92.0 L2
la-islespy-shore 35.2 16.7 L2
la-lava-dome-sanctum 84.3 15.5 L2
la-lunkers-lair 87.3 42.1 L2
la-molten-arena 81.6 12.6 L2
la-sands-reach 81.6 71.2 L2
la-seagrass-haven 70.5 28.3 L2
la-seaside-hollow 51.6 31.9 L2
la-spring-path 17.8 26.1 L2
la-tidal-passage 65.6 39.4 L2
la-tombolo-walk 89.8 87.0 L2
la-tranquility-cove 59.4 60.3 L2
la-veilstone-cape 64.2 37.3 L2
la-windbreak-stand 22.7 39.6 L2
la-aspiration-hill 40.2 25.2 L4
la-deertrack-heights 64.4 44.2 L4
la-deertrack-path 51.6 36.9 L4
la-floaro-gardens 14.3 19.2 L4
la-grandtree-arena 85.5 90.0 L4
la-grueling-grove 85.3 14.8 L4
la-horseshoe-plains 62.1 18.9 L4
la-lake-verity 15.3 44.6 L4
la-natures-pantry 65.6 66.2 L4
la-obsidian-falls 86.9 48.8 L4
la-oreburrow-tunnel 92.3 58.6 L4
la-ramanas-island 33.0 83.4 L4
la-sandgem-flats 19.4 73.0 L4
la-the-heartwood 76.7 80.6 L4
la-tidewater-dam 64.6 75.2 L4
la-windswept-run 46.7 59.3 L4
la-worn-bridge 79.1 32.0 L4
la-bolderoll-slope 63.9 49.5 L5
la-brava-arena 38.5 11.6 L5
la-cloudpool-ridge 37.3 22.1 L5
la-cottonsedge-prairie 81.8 60.6 L5
la-diamond-heath 52.5 26.5 L5
la-diamond-settlement 53.7 33.2 L5
la-droning-meadow 82.0 69.0 L5
la-gapejaw-bog 33.4 67.0 L5
la-golden-lowlands 27.0 52.4 L5
la-holm-of-trials 44.1 89.0 L5
la-lake-valor 73.2 28.7 L5
la-scarlet-bog 53.1 58.3 L5
la-shrouded-ruins 56.6 16.8 L5
la-sludge-mound 58.8 77.5 L5
la-solaceon-ruins 43.8 40.4 L5
la-ursas-ring 70.1 84.0 L5
""",
}

# Illumis (Légendes Pokémon : Z-A) : carte du jeu ; positions tirées des cartes « Kalos <lieu> Map.png »,
# zones sauvages placées d'après leur description (secteur ou place où elles se trouvent)
IMG_MAPS['lumiose'] = {
    'source': 'Carte d’Illumis (Légendes Pokémon : Z-A), Bulbagarden Archives', 'ns': 0.6, 'spread': 2.0,
    'layers': [
        {'url': thumb('d/d0/Kalos_In_the_Zone_Map.png', 1024), 'w': 1477, 'h': 1477, 'at': [0, 0, 1477]},
        {'url': thumb('1/13/Kalos_Triathlon_Rouge_Map.png', 1024), 'w': 1477, 'h': 1477, 'crop': [21.5, 70.8, 26.5, 75.6], 'at': [317.6, 1045.7, 73.9]},
    ], 'canvas': [1477, 1477],
    'pos': """
za-centrico-plaza 51.3 50.5
za-academie-etoile 61.4 26.8
za-bleu-sector-1 45.5 63
za-bleu-sector-2 38.8 58.4
za-bleu-sector-3 44.6 72.7
za-bleu-sector-4 28.4 62.9
za-bleu-sector-5 33.2 80.2
za-bleu-sector-6 24.8 71.9
za-bleu-sector-7 37.3 89.9
za-bleu-sector-8 22.2 79.3
za-bleu-sector-9 16.1 73.8
za-bleu-sector-10 14.7 66.5
za-jaune-sector-1 59.4 43.1
za-jaune-sector-2 65.7 48.8
za-jaune-sector-3 63.9 39.8
za-jaune-sector-4 67.2 32.1
za-jaune-sector-5 72.5 34.6
za-jaune-sector-6 75.7 50.1
za-jaune-sector-7 76.6 23
za-jaune-sector-8 82.3 29.7
za-jaune-sector-9 84 47.2
za-jaune-sector-10 83.8 56
za-jaune-sector-11 90.4 41.9
za-jaune-sector-12 92.1 52.9
za-jaune-street 75.3 41.2
za-magenta-sector-1 35.4 50.5
za-magenta-sector-2 38.5 41.2
za-magenta-sector-3 23.9 51.7
za-magenta-sector-4 30.1 34.6
za-magenta-sector-5 11.9 56.4
za-magenta-sector-6 13.3 48.1
za-magenta-sector-7 21.5 31.8
za-magenta-sector-8 13.8 30.6
za-magenta-sector-9 20.4 21.1
za-magenta-street 24.4 41.5
za-rouge-sector-1 44.2 32.9
za-rouge-sector-2 54.6 36.4
za-rouge-sector-3 32.5 18.8
za-rouge-sector-4 36.8 17.7
za-rouge-sector-5 45.1 18.2
za-rouge-sector-6 60 21
za-rouge-sector-7 42.6 10
za-rouge-sector-8 63.1 11.1
za-vert-sector-1 62.3 57.3
za-vert-sector-2 53 63.4
za-vert-sector-3 70.8 64.8
za-vert-sector-4 54.5 74.5
za-vert-sector-5 61.7 77.7
za-vert-sector-6 84.8 68.7
za-vert-sector-7 77.3 78.4
za-vert-sector-8 66.7 85.2
za-vert-sector-9 55.7 88
za-saison-canalside 67.9 54.8
za-saison-canal 20 38
za-the-sewers 29.4 50.9
za-aymlis-park 42.8 83.5
za-hotel-z 65.5 85.9
za-pokemon-research-lab-kalos 53.6 95.4
za-quasartico-inc-building 26.7 25.8
za-lysandre-labs 35.8 39.1
za-north-boulevard 25 13
za-south-boulevard 73 89
za-autumnal-avenue 35 62
za-hibernal-avenue 68 33
za-wild-zone-1 53 92
za-wild-zone-2 60.5 64
za-wild-zone-3 51 27.7
za-wild-zone-4 56.9 13.9
za-wild-zone-5 42 61
za-wild-zone-6 90 52
za-wild-zone-7 29 43.6
za-wild-zone-8 72.7 42.9
za-wild-zone-9 11.9 56.4
za-wild-zone-10 14.7 66.5
za-wild-zone-11 72 58
za-wild-zone-12 42.8 83.5
za-wild-zone-13 44 5
za-wild-zone-14 9.1 42.9
za-wild-zone-15 80 17
za-wild-zone-16 37.3 70
za-wild-zone-17 77.3 78.4
za-wild-zone-18 18 18
za-wild-zone-19 82.3 29.7
za-wild-zone-20 51.3 53.5
""",
}

# Galar : carte du jeu (Bouclier) ; positions tirées des captures « Galar <lieu> Map.png » (même carte au 1:1,
# recalées en hauteur, le curseur donne le lieu)
IMG_MAPS['galar'] = {
    'source': 'Carte de Galar (Épée / Bouclier), Bulbagarden Archives', 'ns': 0.85, 'spread': 2.6,
    'layers': [{'url': thumb('b/be/Galar_Sh.png', 1024), 'w': 1920, 'h': 4932}], 'crop': [12, 10, 93, 99],
    'pos': """
postwick 50.8 96.76
slumbering-weald 34.2 97.4
galar-route-1 50.8 93.67
wedgehurst 50.8 89.94
galar-route-2 59.6 88.16
meetup-spot 45 82.4
rolling-fields 40 78.83
dappled-grove 33.3 79.48
watchtower-ruins 36.3 71.53
east-lake-axewell 47.1 71.53
west-lake-axewell 34.2 74.94
axews-eye 42.9 75.26
south-lake-miloch 55.4 76.4
giants-seat 60.8 77.21
north-lake-miloch 58.8 70.88
motostoke-riverbank 57.9 66.99
bridge-field 55.4 61.8
stony-wilderness 54.2 56.77
dusty-bowl 50 54.66
giants-mirror 54.6 54.66
hammerlocke-hills 52.9 51.82
giants-cap 43.3 54.66
lake-of-outrage 39.6 52.55
motostoke 47.5 65.21
motostoke-outskirts 62.1 65.04
galar-route-3 27.5 65.04
galar-mine 16.7 62.45
galar-route-4 17.1 59.37
turffield 22.9 57.58
galar-route-5 36.7 57.42
hulbury 71.3 57.42
galar-mine-no-2 72.5 61.96
hammerlocke 48.8 49.07
energy-plant 48.8 47.2
galar-route-6 28.3 47.28
stow-on-side 23.3 44.69
glimwood-tangle 23.3 36.58
ballonlea 18.8 34.47
galar-route-7 65.4 49.23
galar-route-8 68.8 43.55
circhester 80 37.55
galar-route-9 88.8 39.5
spikemuth 87.5 49.07
galar-route-10 49.2 32.6
wyndon 48.3 22.14
""",
}

# Île de l'Armure et Terres de la Couronne : cartes du jeu ; positions tirées des captures « Galar <lieu> Map.png »
# (recalées sur la carte entière, le curseur donne le lieu)
IMG_MAPS['armor'] = {
    'source': 'Carte de l’Île de l’Armure (Épée / Bouclier), Bulbagarden Archives', 'ns': 0.85, 'spread': 2.8,
    'layers': [{'url': thumb('f/f9/Galar_Isle_of_Armor_SwSh.png', 1024), 'w': 1540, 'h': 1540}], 'crop': [3, 8, 93, 92],
    'pos': """
master-dojo 56 60.5
fields-of-honor 50.5 67
soothing-wetlands 50.5 54.6
forest-of-focus 42.3 45.9
challenge-beach 33.9 50.5
brawlers-cave 62.4 47.4
challenge-road 63.9 38.1
courageous-cavern 42.3 57.2
loop-lagoon 32.5 64.9
training-lowlands 52.6 38.1
warm-up-tunnel 52.6 32
potbottom-desert 56.7 27.8
workout-sea 62.4 73.7
stepping-stone-sea 17.5 54.1
insular-sea 20.8 30.2
honeycalm-sea 43.2 21.4
honeycalm-island 34.5 27.8
""",
}

IMG_MAPS['tundra'] = {
    'source': 'Carte des Terres de la Couronne (Épée / Bouclier), Bulbagarden Archives', 'ns': 0.85, 'spread': 2.8,
    'layers': [{'url': thumb('6/61/Galar_Crown_Tundra_SwSh.png', 1024), 'w': 1984, 'h': 2060}], 'crop': [8, 2, 96, 94],
    'pos': """
freezington 28.2 44.6
slippery-slope 28.2 37.9
frostpoint-field 32.1 49.6
giants-bed 45.8 54.8
old-cemetery 46.1 60.6
galar-iceberg-ruins 50.9 35.9
snowslide-slope 50.9 35.9
galar-rock-peak-ruins 46.1 54.8
tunnel-to-the-top 56.1 23.9
path-to-the-peak 52.7 17.1
crown-shrine 49.4 12.8
three-point-pass 80.3 50.1
ballimere-lake 40.9 82.8
lakeside-cave 63.3 71.4
dyna-tree-hill 49.7 82.8
giants-foot 64.5 56.3
split-decision-ruins 80.3 50.4
roaring-sea-caves 67 43.1
frigid-sea 87.6 41.1
max-lair 28.2 37.9
galar-iron-ruins 46.1 54.8
""",
}

# Paldea et Septentria (Écarlate / Violet) : cartes du jeu ; positions tirées des cartes « Paldea <lieu> Map.png »
# (morceaux de la carte du jeu avec le lieu entouré en rose, retrouvés sur la carte entière)
IMG_MAPS['paldea'] = {
    'source': 'Carte de Paldea (Écarlate / Violet), Bulbagarden Archives', 'ns': 0.8, 'spread': 2.6,
    'layers': [{'url': thumb('2/2a/Paldea.png', 1024), 'w': 3000, 'h': 3000}], 'crop': [2, 8, 98, 99],
    'pos': """
sv-cabo-poco 48.8 95.3
sv-poco-path 48.6 92.9
sv-inlet-grotto 49.8 91.4
sv-south-province-area-one 51.4 85.9
sv-mesagoza 47.7 74.8
sv-naranja-academy 47.8 72.1
sv-uva-academy 47.8 72.1
sv-pok-mon-league-paldea 40.2 68.3
sv-south-province-area-two 33.6 74
sv-los-platos 48 87.1
sv-south-province-area-three 62.3 73.4
sv-cortondo 28.6 76.4
sv-south-province-area-four 34.6 86.1
sv-artazon 74.8 74.1
sv-south-province-area-five 64 83.6
sv-levincia 82.4 57.2
sv-south-province-area-six 17.6 87.6
sv-alfornada 17.1 88.2
sv-alfornada-cavern 17.1 86
sv-east-province-area-one 73.3 67.5
sv-east-province-area-two 77.9 59.6
sv-east-province-area-three 75.9 49.9
sv-tagtree-thicket 65.7 43.4
sv-zapapico 62.8 53.6
sv-west-province-area-one 21.9 64.4
sv-cascarrafa 29.9 52.6
sv-porto-marinada 10.1 49.4
sv-asado-desert 19.9 53.1
sv-west-province-area-two 18.6 46
sv-west-province-area-three 39.3 43.4
sv-medali 39.9 46
sv-socarrat-trail 22.3 20
sv-colonnade-hollow 24.4 44.9
sv-dalizapa-passage 52.9 46.4
sv-north-province-area-one 72.2 27.6
sv-north-province-area-two 89.4 26.7
sv-north-province-area-three 43.9 15.7
sv-glaseado-mountain 52.4 32.7
sv-montenevera 54.6 28.5
sv-casseroya-lake 24.3 28.8
sv-great-crater-of-paldea 48.2 60.7
sv-area-zero 48.2 62.5
sv-zero-lab 48.2 64
sv-west-paldean-sea 7.5 62.3
sv-south-paldean-sea 51.6 93.1
sv-east-paldean-sea 91.7 64.5
sv-north-paldean-sea 46.5 13.8
""",
}

IMG_MAPS['kitakami'] = {
    'source': 'Carte de Septentria (Le Masque Turquoise), Bulbagarden Archives', 'ns': 0.85, 'spread': 2.8,
    'layers': [{'url': thumb('0/01/Kitakami.png', 1024), 'w': 3400, 'h': 3400}], 'crop': [10, 10, 95, 95],
    'pos': """
sv-mossui-town 57.3 73.6
sv-kitakami-road 49.7 85.3
sv-loyalty-plaza 55 68
sv-kitakami-hall 60 70.5
sv-apple-hills 47.4 72.7
sv-reveler-s-road 70.1 74.9
sv-oni-mountain 46.6 47.9
sv-oni-s-maw 53.3 59.8
sv-chilling-waterhead 62.2 46.2
sv-crystal-pool 47.7 49.4
sv-paradise-barrens 29.5 26.4
sv-kitakami-wilds 69.7 28
sv-fellhorn-gorge 83.1 49.5
sv-mossfell-confluence 85.9 76.6
sv-wistful-fields 26.2 65.2
sv-timeless-woods 74.5 22.1
sv-infernal-pass 46 45.8
sv-dreaded-den 43 42
""",
}

# Terra-Dôme (Le Disque Indigo) : carte du jeu (version où presque rien n'est marqué), lieux placés d'après
# leur zone (Polaire au nord-ouest, Côtière au nord-est, Canyon au sud-ouest, Savane au sud-est)
IMG_MAPS['blueberry'] = {
    'source': 'Carte du Terra-Dôme (Le Disque Indigo), Bulbagarden Archives', 'ns': 0.9, 'spread': 3,
    'layers': [{'url': thumb('7/72/SV_Flower_spawners_map_Blueberry.png', 1024), 'w': 1360, 'h': 1360}], 'crop': [4, 4, 96, 96],
    'pos': """
sv-central-plaza 48 50
sv-league-club-room 51 46.5
sv-polar-biome 32 32
sv-polar-plaza 18 26
sv-coastal-biome 70 32
sv-coastal-plaza 57 18
sv-torchlit-labyrinth 64 22
sv-canyon-biome 32 68
sv-canyon-plaza 23 73
sv-savanna-biome 70 68
sv-savanna-plaza 60 82
sv-chargestone-cavern 13 50
sv-area-zero-underdepths 48 56
""",
}

# Orre : carte de Pokémon Colosseum ; lieux placés d'après les losanges de la carte et la description de
# Bulbapedia (Mt. Battle au nord, Pyrite au sud-ouest, Phenac au sud-est, repaire Snagem au nord-est…).
# Les lieux propres à XD (Port Gateon, Labo HQ, Île Citadark…) sont placés d'après leur description.
IMG_MAPS['orre'] = {
    'source': 'Carte d’Orre (Pokémon Colosseum), Bulbagarden Archives', 'spread': 3,
    'layers': [{'url': ARCH + '4/41/Orre_Map.png', 'w': 640, 'h': 480}], 'crop': [3, 5, 97, 92],
    'pos': """
mt-battle 47 13
agate-village 15 26
shadow-pokemon-lab 46.5 41
cipher-lab 46.5 41
pyrite-town 19 55
pyrite-bldg 21.5 57
pyrite-cave 22 61
the-under 18 59.5
onbs 17 52
realgam-tower 47 56
phenac-city 57 62
snagem-hideout 76 33
outskirt-stand 81 59
cipher-key-lair 88 42
gateon-port 7 33
citadark-isle 6 48
pokemon-hq-lab 21 14
pokespot 33 72
""",
}


# Johto : carte du PokéMatos de HeartGold / SoulSilver (DS), aussi utilisée pour Or / Argent / Cristal ;
# positions tirées des cartes « Johto <lieu> Map.png » (même carte, lieu surligné). Fond : la carte du
# Mont Creuset, dont la case surlignée est recouverte par le même coin pris sur la carte de la Tour Carillon.
IMG_MAPS['johto'] = {
    'source': 'Carte de Johto (PokéMatos de HeartGold / SoulSilver), Bulbagarden Archives', 'pix': True, 'ns': 0.8, 'spread': 2.4,
    'layers': [
        {'url': ARCH + '7/7c/Johto_Mt_Mortar_Map.png', 'w': 212, 'h': 145, 'at': [0, 0, 212]},
        {'url': ARCH + '4/4f/Johto_Bell_Tower_Map.png', 'w': 212, 'h': 145, 'crop': [48.58, 32.41, 53.77, 40.0], 'at': [103, 47, 11]},
    ], 'canvas': [212, 145],
    'pos': """
new-bark-town 77.8 75.2
johto-route-29 70.3 75.2
cherrygrove-city 60.8 75.2
johto-route-30 62.5 63.1
johto-route-31 58.7 52.9
violet-city 53.1 50.7
sprout-tower 55.2 47.6
dark-cave 69 53.1
johto-route-32 51.4 67.3
ruins-of-alph 47.7 55.8
union-cave 51.4 80.7
johto-route-33 51.7 83.2
azalea-town 45.3 86.2
slowpoke-well 47.8 83.2
ilex-forest 40.9 83.8
johto-route-34 40.4 77.6
goldenrod-city 36.3 66.9
johto-route-35 40.4 55
national-park 38.2 44.8
johto-route-36 44.4 47.8
johto-route-37 44.3 43.3
ecruteak-city 42 34.6
burned-tower 40.1 31
bell-tower 43.9 31
johto-route-38 34.5 37
johto-route-39 29.6 39.1
olivine-city 30.4 50
johto-sea-route-40 25.7 56.2
johto-sea-route-41 23.7 65.6
whirl-islands 25 69.7
cianwood-city 17.4 66.9
johto-route-47 10.1 72.2
johto-route-48 9.3 63.7
safari-zone-gate 11 57.5
johto-safari-zone 7 54
johto-route-42 47 36.6
mt-mortar 51.4 36.6
@Acajou 59 36.6
johto-route-43 58.6 29.1
lake-of-rage 59 17.2
team-rocket-hq 60.5 39.5
johto-route-44 66.1 36.9
ice-path 70.5 35.5
blackthorn-city 75.7 34.1
dragons-den 77.8 31
johto-route-45 73.7 55.6
johto-route-46 69.4 69.1
johto-route-27 86 75.2
kanto-route-27 86 75.2
tohjo-falls 93 75.2
johto-route-26 97.5 70
kanto-route-26 97.5 70
kanto-route-28 96.5 57.5
mt-silver 89 51
""",
}
