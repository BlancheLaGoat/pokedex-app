#!/usr/bin/env python3
"""
Cartes schématiques des régions (positions saisies à la main, grille 100 x 74).
Génère data/curated/maps.json.

Format d'un nœud : "identifiant x y"  (identifiant PokéAPI du lieu)
                  "@Nom x y"           (ville sans rencontre, juste pour se repérer)
Format des chemins : "a>b>c" relie les nœuds dans l'ordre (décoratif).
Les lieux avec des rencontres mais sans position sont listés sous la carte.
"""
import json, os, re

MAPS = {}

MAPS['kanto'] = dict(name='Kanto', nodes='''
pallet-town 14 58
kanto-route-1 14 50
viridian-city 14 42
kanto-route-22 8 42
kanto-route-23 4 32
kanto-victory-road-1 3 23
kanto-victory-road-2 8 23
indigo-plateau 4 14
kanto-route-2 14 33
viridian-forest 18 29
pewter-city 14 22
kanto-route-3 23 22
mt-moon 32 20
kanto-route-4 40 20
cerulean-city 48 20
cerulean-cave 41 13
kanto-route-24 48 12
kanto-route-25 57 8
kanto-route-5 48 28
kanto-underground-path 55 36
saffron-city 48 36
kanto-route-6 48 44
vermilion-city 48 52
ss-anne 42 56
kanto-route-11 57 52
digletts-cave 63 47
kanto-route-9 60 20
kanto-route-10 70 24
kanto-power-plant 77 22
rock-tunnel 70 31
lavender-town 70 38
pokemon-tower 77 41
kanto-route-8 60 36
kanto-route-7 41 36
celadon-city 34 36
kanto-route-16 24 36
kanto-route-17 24 48
kanto-route-18 30 60
fuchsia-city 40 60
kanto-safari-zone 40 53
kanto-route-12 70 46
kanto-route-13 66 54
kanto-route-14 61 59
kanto-route-15 51 62
kanto-sea-route-19 40 67
kanto-sea-route-20 29 68
seafoam-islands 22 68
cinnabar-island 14 68
pokemon-mansion 7 68
kanto-sea-route-21 14 63
''', paths='''
pallet-town>kanto-route-1>viridian-city>kanto-route-2>pewter-city>kanto-route-3>mt-moon>kanto-route-4>cerulean-city>kanto-route-24>kanto-route-25
viridian-city>kanto-route-22>kanto-route-23>kanto-victory-road-1>indigo-plateau
cerulean-city>kanto-route-5>saffron-city>kanto-route-6>vermilion-city>kanto-route-11>kanto-route-12
cerulean-city>kanto-route-9>kanto-route-10>rock-tunnel>lavender-town>kanto-route-12>kanto-route-13>kanto-route-14>kanto-route-15>fuchsia-city
lavender-town>kanto-route-8>saffron-city>kanto-route-7>celadon-city>kanto-route-16>kanto-route-17>kanto-route-18>fuchsia-city
fuchsia-city>kanto-sea-route-19>kanto-sea-route-20>seafoam-islands>cinnabar-island>kanto-sea-route-21>pallet-town
kanto-route-2>viridian-forest
''')

MAPS['sevii'] = dict(name='Îles Sevii', nodes='''
one-island 14 16
kindle-road 14 8
mt-ember 22 4
treasure-beach 10 24
cape-brink 34 8
three-isle-port 40 26
bond-bridge 32 22
berry-forest 46 32
four-island 58 14
icefall-cave 64 8
five-island 72 30
five-isle-meadow 78 24
memorial-pillar 86 32
water-labyrinth 66 22
resort-gorgeous 70 42
lost-cave 78 44
kanto-altering-cave 22 40
outcast-island 28 48
water-path 36 52
green-path 28 56
pattern-bush 22 60
ruin-valley 40 62
canyon-entrance 52 52
sevault-canyon 58 58
trainer-tower 66 54
tanoby-ruins 50 68
monean-chamber 40 72
liptoo-chamber 44 72
weepth-chamber 48 72
dilford-chamber 52 72
scufib-chamber 56 72
rixy-chamber 60 72
viapos-chamber 64 72
birth-island 92 62
navel-rock 92 50
''', paths='''
one-island>kindle-road>mt-ember
one-island>treasure-beach
three-isle-port>bond-bridge
three-isle-port>berry-forest
four-island>icefall-cave
five-island>five-isle-meadow>memorial-pillar
five-island>water-labyrinth
five-island>resort-gorgeous>lost-cave
outcast-island>water-path>green-path>pattern-bush
water-path>ruin-valley
canyon-entrance>sevault-canyon>trainer-tower
sevault-canyon>tanoby-ruins
''')

MAPS['johto'] = dict(name='Johto', nodes='''
new-bark-town 80 46
johto-route-29 70 46
cherrygrove-city 60 48
johto-route-30 60 40
johto-route-31 54 32
violet-city 48 32
sprout-tower 48 26
dark-cave 58 25
johto-route-32 48 42
ruins-of-alph 40 40
union-cave 48 51
johto-route-33 44 57
azalea-town 38 57
slowpoke-well 37 63
ilex-forest 30 57
johto-route-34 30 49
goldenrod-city 30 41
johto-route-35 30 33
national-park 30 26
johto-route-36 38 26
johto-route-37 40 20
ecruteak-city 40 14
burned-tower 35 9
bell-tower 45 7
johto-route-38 32 14
johto-route-39 24 14
olivine-city 22 22
johto-sea-route-40 16 28
johto-sea-route-41 12 36
whirl-islands 18 40
cianwood-city 8 40
johto-route-47 4 48
johto-route-48 8 56
safari-zone-gate 12 60
johto-safari-zone 16 65
johto-route-42 52 14
mt-mortar 58 18
@Acajou 64 14
johto-route-43 64 7
lake-of-rage 66 2
team-rocket-hq 67 19
johto-route-44 72 14
ice-path 80 14
blackthorn-city 85 20
dragons-den 92 18
johto-route-45 84 30
johto-route-46 78 38
johto-route-27 88 47
tohjo-falls 93 44
johto-route-26 95 36
kanto-route-27 88 47
kanto-route-26 95 36
kanto-route-28 95 58
mt-silver 97 66
''', paths='''
new-bark-town>johto-route-29>cherrygrove-city>johto-route-30>johto-route-31>violet-city>johto-route-32>union-cave>johto-route-33>azalea-town>ilex-forest>johto-route-34>goldenrod-city>johto-route-35>national-park>johto-route-36>johto-route-37>ecruteak-city
violet-city>johto-route-36
ecruteak-city>johto-route-38>johto-route-39>olivine-city>johto-sea-route-40>johto-sea-route-41>cianwood-city>johto-route-47>johto-route-48>safari-zone-gate>johto-safari-zone
ecruteak-city>johto-route-42>@Acajou>johto-route-44>ice-path>blackthorn-city>johto-route-45>johto-route-46>johto-route-29
@Acajou>johto-route-43>lake-of-rage
new-bark-town>kanto-route-27>tohjo-falls>kanto-route-26
kanto-route-28>mt-silver
''')

MAPS['hoenn'] = dict(name='Hoenn', nodes='''
littleroot-town 24 64
hoenn-route-101 24 57
@Rosyères 24 50
hoenn-route-103 24 43
hoenn-route-102 16 50
petalburg-city 8 50
hoenn-route-104 4 41
petalburg-woods 4 33
rustboro-city 6 25
hoenn-route-116 13 21
rusturf-tunnel 20 24
verdanturf-town 26 31
hoenn-route-117 31 31
@Lavandia 37 31
new-mauville 44 34
hoenn-route-110 37 41
slateport-city 37 50
hoenn-route-109 37 58
hoenn-route-105 4 59
hoenn-route-106 8 67
dewford-town 14 68
granite-cave 8 73
hoenn-route-107 21 69
hoenn-route-108 28 67
abandoned-ship 31 62
hoenn-route-111 37 22
desert-ruins 44 18
mirage-tower 44 23
hoenn-route-112 31 18
fiery-path 34 13
jagged-pass 27 15
lavaridge-town 22 17
hoenn-route-113 26 8
fallarbor-town 18 8
hoenn-route-114 12 12
meteor-falls 9 17
hoenn-route-115 3 16
hoenn-route-118 47 31
hoenn-route-119 53 21
fortree-city 53 11
hoenn-route-120 62 10
hoenn-route-121 70 12
hoenn-safari-zone 72 5
lilycove-city 80 12
team-aqua-hideout 87 7
hoenn-route-122 64 18
mt-pyre 64 25
hoenn-route-123 56 31
hoenn-route-124 85 20
mossdeep-city 94 20
hoenn-route-125 94 12
shoal-cave 98 6
sootopolis-city 79 30
cave-of-origin 74 30
hoenn-route-126 79 38
seafloor-cavern 86 41
hoenn-route-127 90 30
hoenn-route-128 90 40
ever-grande-city 96 48
hoenn-victory-road 98 40
hoenn-route-129 82 52
hoenn-route-130 74 56
mirage-island 72 62
hoenn-route-131 66 60
sky-pillar 66 67
pacifidlog-town 60 62
hoenn-route-132 54 62
hoenn-route-133 48 64
hoenn-route-134 42 64
southern-island 60 72
team-magma-hideout 30 11
magma-hideout 30 11
ancient-tomb 44 72
island-cave 50 70
desert-underpass 46 13
artisan-cave 99 26
marine-cave 76 64
terra-cave 20 4
''', paths='''
littleroot-town>hoenn-route-101>@Rosyères>hoenn-route-102>petalburg-city>hoenn-route-104>petalburg-woods>rustboro-city>hoenn-route-116>rusturf-tunnel>verdanturf-town>hoenn-route-117>@Lavandia
@Rosyères>hoenn-route-103>hoenn-route-110>slateport-city>hoenn-route-109>hoenn-route-108>hoenn-route-107>dewford-town>hoenn-route-106>hoenn-route-105>petalburg-city
@Lavandia>hoenn-route-110
@Lavandia>hoenn-route-111>hoenn-route-112>jagged-pass>lavaridge-town
hoenn-route-111>hoenn-route-113>fallarbor-town>hoenn-route-114>meteor-falls>hoenn-route-115>rustboro-city
@Lavandia>hoenn-route-118>hoenn-route-119>fortree-city>hoenn-route-120>hoenn-route-121>lilycove-city>hoenn-route-124>mossdeep-city>hoenn-route-125
hoenn-route-121>hoenn-route-122>mt-pyre>hoenn-route-123>hoenn-route-118
hoenn-route-124>sootopolis-city>hoenn-route-126>hoenn-route-127>hoenn-route-128>ever-grande-city>hoenn-victory-road
hoenn-route-128>hoenn-route-129>hoenn-route-130>hoenn-route-131>pacifidlog-town>hoenn-route-132>hoenn-route-133>hoenn-route-134>hoenn-route-109
''')

MAPS['sinnoh'] = dict(name='Sinnoh', nodes='''
twinleaf-town 20 66
lake-verity 13 62
sinnoh-route-201 26 62
@Bonaugure 31 59
sinnoh-route-202 31 52
@Féli-Cité 31 44
sinnoh-route-218 21 44
canalave-city 12 44
iron-island 4 38
sinnoh-route-203 38 44
oreburgh-gate 44 44
oreburgh-city 50 44
oreburgh-mine 52 50
sinnoh-route-207 57 40
mt-coronet 62 31
spear-pillar 62 24
sinnoh-route-208 68 40
hearthome-city 74 40
sinnoh-route-204 31 34
ravaged-path 26 31
floaroma-town 31 25
floaroma-meadow 25 22
valley-windworks 36 26
fuego-ironworks 40 30
sinnoh-route-205 37 20
eterna-forest 43 17
old-chateau 43 11
eterna-city 51 16
sinnoh-route-206 51 26
wayward-cave 46 31
sinnoh-route-211 60 16
celestic-town 70 16
sinnoh-route-210 80 16
sinnoh-route-209 78 33
lost-tower 83 31
solaceon-town 82 24
solaceon-ruins 77 24
sinnoh-route-215 88 22
veilstone-city 94 24
sinnoh-route-214 94 33
ruin-maniac-cave 98 37
valor-lakefront 92 42
lake-valor 86 46
sinnoh-route-213 83 53
pastoria-city 76 53
great-marsh 76 59
sinnoh-route-212 72 47
trophy-garden 67 50
sinnoh-route-216 66 10
sinnoh-route-217 66 4
acuity-lakefront 72 4
lake-acuity 77 2
snowpoint-city 57 4
snowpoint-temple 50 4
sinnoh-route-222 90 60
sunyshore-city 96 62
sinnoh-sea-route-223 98 54
sinnoh-victory-road 97 46
sinnoh-pokemon-league 92 48
sinnoh-route-219 34 68
sinnoh-sea-route-220 40 71
sinnoh-route-221 47 70
maniac-tunnel 36 34
sinnoh-route-224 99 28
sinnoh-route-225 88 5
stark-mountain 82 7
sinnoh-sea-route-226 94 11
sinnoh-route-227 88 12
sinnoh-route-228 94 17
resort-area 99 8
sinnoh-route-229 99 14
sinnoh-sea-route-230 92 14
''', paths='''
twinleaf-town>sinnoh-route-201>@Bonaugure>sinnoh-route-202>@Féli-Cité>sinnoh-route-203>oreburgh-gate>oreburgh-city>sinnoh-route-207>mt-coronet>sinnoh-route-208>hearthome-city>sinnoh-route-209>solaceon-town>sinnoh-route-210>celestic-town>sinnoh-route-211>eterna-city
@Féli-Cité>sinnoh-route-218>canalave-city
@Féli-Cité>sinnoh-route-204>floaroma-town>sinnoh-route-205>eterna-forest>eterna-city>sinnoh-route-206>sinnoh-route-207
solaceon-town>sinnoh-route-215>veilstone-city>sinnoh-route-214>valor-lakefront>sinnoh-route-213>pastoria-city>sinnoh-route-212>hearthome-city
mt-coronet>sinnoh-route-216>sinnoh-route-217>snowpoint-city
sinnoh-route-217>acuity-lakefront>lake-acuity
pastoria-city>sinnoh-route-222>sunyshore-city>sinnoh-sea-route-223>sinnoh-pokemon-league
@Bonaugure>sinnoh-route-219>sinnoh-sea-route-220>sinnoh-route-221
twinleaf-town>lake-verity
''')

MAPS['unova'] = dict(name='Unys', nodes='''
nuvema-town 78 62
unova-route-1 78 54
accumula-town 78 46
unova-route-2 71 41
striaton-city 64 39
dreamyard 60 33
unova-route-3 58 45
wellspring-cave 55 51
nacrene-city 50 47
pinwheel-forest 44 51
castelia-city 36 59
castelia-sewers 42 63
liberty-garden 30 66
unova-route-4 36 47
desert-resort 29 47
relic-castle 24 44
@Méanville 36 37
unova-route-16 43 33
lostlorn-forest 47 28
unova-route-5 28 37
driftveil-drawbridge 22 37
driftveil-city 15 39
cold-storage 9 41
unova-route-6 15 29
chargestone-cave 15 21
mistralton-city 15 13
mistralton-cave 9 13
unova-route-7 23 13
celestial-tower 23 6
twist-mountain 33 10
icirrus-city 42 8
moor-of-icirrus 46 3
dragonspiral-tower 51 3
unova-route-8 42 14
@Janusia 60 12
unova-route-9 68 12
unova-route-10 76 12
unova-victory-road 82 6
unova-victory-road-2 86 6
unova-route-11 64 22
village-bridge 70 22
unova-route-12 76 26
@Ébenelle 81 26
unova-route-13 88 26
giant-chasm 90 18
undella-town 94 34
undella-bay 97 40
seaside-cave 99 46
unova-route-14 92 42
abundant-shrine 89 50
@Volucité 83 50
unova-route-15 77 50
marvelous-bridge 70 52
unova-route-17 64 70
unova-route-18 58 66
p2-laboratory 62 73
aspertia-city 6 66
unova-route-19 9 59
floccesy-town 14 56
unova-route-20 19 61
floccesy-ranch 22 55
virbank-city 26 69
virbank-complex 30 73
humilau-city 98 62
unova-route-21 97 54
unova-route-22 94 66
unova-route-23 84 12
reversal-mountain 80 36
strange-house 67 17
clay-tunnel 10 25
relic-passage 19 42
challengers-cave 98 20
underground-ruins 92 20
''', paths='''
nuvema-town>unova-route-1>accumula-town>unova-route-2>striaton-city>unova-route-3>wellspring-cave>nacrene-city>pinwheel-forest>castelia-city>unova-route-4>@Méanville>unova-route-5>driftveil-drawbridge>driftveil-city>unova-route-6>chargestone-cave>mistralton-city>unova-route-7>twist-mountain>icirrus-city>unova-route-8>@Janusia>unova-route-9>unova-route-10>unova-victory-road
unova-route-4>desert-resort>relic-castle
@Méanville>unova-route-16>lostlorn-forest
striaton-city>dreamyard
@Janusia>unova-route-11>village-bridge>unova-route-12>@Ébenelle>unova-route-13>undella-town>unova-route-14>abundant-shrine
undella-town>undella-bay
@Ébenelle>giant-chasm
nuvema-town>unova-route-17>unova-route-18>p2-laboratory
aspertia-city>unova-route-19>floccesy-town>unova-route-20>virbank-city
floccesy-town>floccesy-ranch
humilau-city>unova-route-21
humilau-city>unova-route-22
icirrus-city>dragonspiral-tower
''')

MAPS['kalos'] = dict(name='Kalos', nodes='''
@Bourg Croquis 52 72
aquacorde-town 52 66
kalos-route-2 52 60
santalune-forest 52 54
kalos-route-3 52 48
@Quarellis 52 44
kalos-route-22 60 44
kalos-route-4 52 40
lumiose-city 52 33
team-flare-secret-hq 58 30
kalos-route-5 43 33
@Romant-sous-Bois 35 33
kalos-route-6 35 26
parfum-palace 35 20
kalos-route-7 27 33
connecting-cave 22 36
kalos-route-8 16 40
ambrette-town 10 38
sea-spirits-den 4 32
kalos-route-9 7 46
glittering-cave 4 52
cyllage-city 12 54
kalos-route-10 16 61
@Géosenge 22 66
kalos-route-11 28 67
reflection-cave 32 73
shalour-city 37 66
tower-of-mastery 36 60
kalos-route-12 46 70
azure-bay 42 74
@Port Tempères 60 70
kalos-route-13 62 56
kalos-route-14 66 33
laverre-city 76 30
kalos-route-15 78 22
lost-hotel 85 22
@Flusselles 78 14
kalos-route-16 69 10
frost-cavern 61 8
kalos-route-17 86 10
@Anistar 93 10
kalos-route-18 94 22
terminus-cave 88 28
couriway-town 94 33
kalos-route-19 96 42
@Neuvartault 96 52
kalos-route-20 88 54
pokemon-village 83 58
kalos-route-21 97 61
kalos-victory-road 97 68
''', paths='''
@Bourg Croquis>aquacorde-town>kalos-route-2>santalune-forest>kalos-route-3>@Quarellis>kalos-route-4>lumiose-city>kalos-route-5>@Romant-sous-Bois>kalos-route-7>connecting-cave>kalos-route-8>ambrette-town>kalos-route-9>cyllage-city>kalos-route-10>@Géosenge>kalos-route-11>shalour-city>kalos-route-12>@Port Tempères>kalos-route-13>lumiose-city>kalos-route-14>laverre-city>kalos-route-15>@Flusselles>kalos-route-17>@Anistar>kalos-route-18>couriway-town>kalos-route-19>@Neuvartault>kalos-route-21>kalos-victory-road
@Romant-sous-Bois>kalos-route-6>parfum-palace
@Flusselles>kalos-route-16>lumiose-city
@Neuvartault>kalos-route-20>pokemon-village
@Quarellis>kalos-route-22
ambrette-town>sea-spirits-den
''')

MAPS['alola'] = dict(name='Alola', nodes='''
iki-town 24 5
mahalo-trail 30 9
ruins-of-conflict 34 3
alola-route-1 20 15
melemele-meadow 13 3
alola-route-3 9 6
verdant-cavern 4 10
alola-route-2 6 16
hauoli-cemetery 9 22
hauoli-city 16 26
ten-carat-hill 3 26
kalae-bay 30 20
seaward-cave 25 30
melemele-sea 33 28
heahea-city 10 46
heahea-beach 4 42
alola-route-4 17 48
paniola-town 24 50
paniola-ranch 24 43
alola-route-5 31 47
brooklet-hill 37 44
alola-route-6 24 57
royal-avenue 18 62
alola-route-7 11 59
wela-volcano-park 6 65
alola-route-8 15 69
lush-jungle 29 65
konikoni-city 33 70
alola-route-9 38 73
memorial-hill 39 63
akala-outskirts 37 56
ruins-of-life 42 52
hano-beach 22 73
digletts-tunnel 30 59
dividing-peak-tunnel 14 42
aether-paradise 48 38
malie-city 61 23
malie-garden 61 29
alola-route-16 56 17
ulaula-beach 56 29
alola-route-10 66 17
mount-hokulani 70 7
alola-route-11 72 24
alola-route-12 80 22
blush-mountain 84 16
alola-route-13 88 28
tapu-village 94 24
alola-route-14 97 32
thrifty-megamart 92 32
haina-desert 82 32
ruins-of-abundance 87 34
alola-route-15 90 9
alola-route-17 96 14
ulaula-meadow 76 31
mount-lanakila 78 3
seafolk-village 60 46
poni-wilds 69 46
ancient-poni-path 76 50
poni-breaker-coast 84 46
ruins-of-hope 90 42
exeggutor-island 97 48
poni-grove 66 56
poni-gauntlet 59 55
poni-plains 64 64
poni-meadow 72 66
vast-poni-canyon 79 58
altar-of-the-sunne 82 66
altar-of-the-moone 86 66
resolution-cave 91 61
poni-coast 69 72
lake-of-the-sunne 74 1
lake-of-the-moone 82 1
sandy-cave 3 32
''', paths='''
iki-town>mahalo-trail>ruins-of-conflict
iki-town>alola-route-1>hauoli-city>alola-route-2>verdant-cavern
alola-route-2>alola-route-3>melemele-meadow
hauoli-city>hauoli-cemetery
alola-route-1>kalae-bay
heahea-city>alola-route-4>paniola-town>alola-route-5>brooklet-hill
paniola-town>alola-route-6>royal-avenue>alola-route-7>wela-volcano-park>alola-route-8>lush-jungle>konikoni-city>alola-route-9>memorial-hill>akala-outskirts>ruins-of-life
malie-city>alola-route-10>mount-hokulani
malie-city>alola-route-11>alola-route-12>blush-mountain>alola-route-13>tapu-village>alola-route-14
alola-route-12>haina-desert>ruins-of-abundance
tapu-village>alola-route-15>alola-route-17
seafolk-village>poni-wilds>ancient-poni-path>poni-breaker-coast>ruins-of-hope
ancient-poni-path>vast-poni-canyon>altar-of-the-sunne
poni-grove>poni-plains>poni-meadow
''')

MAPS['galar'] = dict(name='Galar', nodes='''
postwick 50 72
slumbering-weald 42 72
galar-route-1 50 66
wedgehurst 50 60
galar-route-2 58 60
meetup-spot 50 54
rolling-fields 44 50
dappled-grove 55 48
watchtower-ruins 39 45
east-lake-axewell 50 45
west-lake-axewell 44 41
axews-eye 50 39
south-lake-miloch 57 41
giants-seat 47 34
north-lake-miloch 56 34
motostoke-riverbank 62 46
bridge-field 37 33
stony-wilderness 42 28
dusty-bowl 50 28
giants-mirror 58 28
hammerlocke-hills 50 22
giants-cap 42 22
lake-of-outrage 34 23
motostoke 68 52
motostoke-outskirts 66 45
galar-route-3 76 52
galar-mine 81 48
galar-route-4 86 44
turffield 89 38
galar-route-5 93 44
hulbury 96 51
galar-mine-no-2 96 59
hammerlocke 50 16
galar-route-6 37 14
stow-on-side 27 14
glimwood-tangle 20 10
ballonlea 14 6
galar-route-7 58 12
galar-route-8 66 9
circhester 72 4
galar-route-9 83 4
spikemuth 93 8
galar-route-10 50 8
wyndon 50 2
energy-plant 44 10
''', paths='''
postwick>galar-route-1>wedgehurst>galar-route-2
wedgehurst>meetup-spot>rolling-fields>watchtower-ruins>bridge-field>stony-wilderness>giants-cap>hammerlocke-hills>hammerlocke
meetup-spot>dappled-grove>south-lake-miloch>north-lake-miloch>giants-mirror>hammerlocke-hills
rolling-fields>east-lake-axewell>axews-eye>giants-seat>dusty-bowl>hammerlocke-hills
motostoke>motostoke-outskirts>motostoke-riverbank>dappled-grove
motostoke>galar-route-3>galar-mine>galar-route-4>turffield>galar-route-5>hulbury>galar-mine-no-2
hammerlocke>galar-route-6>stow-on-side>glimwood-tangle>ballonlea
hammerlocke>galar-route-7>galar-route-8>circhester>galar-route-9>spikemuth
hammerlocke>galar-route-10>wyndon
postwick>slumbering-weald
''')

MAPS['armor'] = dict(name="Île de l'Armure", nodes='''
master-dojo 22 48
fields-of-honor 22 40
soothing-wetlands 32 40
forest-of-focus 42 30
challenge-beach 40 56
brawlers-cave 46 48
challenge-road 53 44
courageous-cavern 59 40
loop-lagoon 65 47
training-lowlands 70 31
warm-up-tunnel 61 23
potbottom-desert 79 15
workout-sea 82 41
stepping-stone-sea 88 26
insular-sea 14 20
honeycalm-sea 16 61
honeycalm-island 8 67
''', paths='''
master-dojo>fields-of-honor>soothing-wetlands>forest-of-focus>training-lowlands>warm-up-tunnel>potbottom-desert
soothing-wetlands>challenge-beach>brawlers-cave>challenge-road>courageous-cavern>loop-lagoon>workout-sea
training-lowlands>stepping-stone-sea
''')

MAPS['tundra'] = dict(name='Terres de la Couronne', nodes='''
slippery-slope 34 66
freezington 26 58
frostpoint-field 42 54
giants-bed 52 44
old-cemetery 61 52
galar-iceberg-ruins 40 40
snowslide-slope 48 30
galar-rock-peak-ruins 36 26
tunnel-to-the-top 58 25
path-to-the-peak 48 18
crown-shrine 50 9
three-point-pass 68 46
ballimere-lake 80 40
lakeside-cave 87 48
dyna-tree-hill 76 30
giants-foot 74 58
split-decision-ruins 64 64
roaring-sea-caves 84 64
frigid-sea 93 56
max-lair 93 40
galar-iron-ruins 90 24
''', paths='''
slippery-slope>freezington>frostpoint-field>giants-bed>snowslide-slope>path-to-the-peak>crown-shrine
giants-bed>old-cemetery>three-point-pass>ballimere-lake>lakeside-cave
ballimere-lake>dyna-tree-hill
giants-bed>giants-foot>roaring-sea-caves>frigid-sea
''')

MAPS['orre'] = dict(name='Orre', nodes='''
outskirt-stand 20 50
phenac-city 30 60
pyrite-town 46 40
pyrite-cave 50 32
pyrite-bldg 42 46
agate-village 64 30
mt-battle 80 20
realgam-tower 70 52
gateon-port 86 56
the-under 50 56
snagem-hideout 14 30
cipher-lab 34 22
shadow-pokemon-lab 26 14
cipher-key-lair 60 66
citadark-isle 90 70
pokemon-hq-lab 76 64
pokespot 56 18
onbs 40 66
''', paths='''
outskirt-stand>phenac-city>pyrite-town>agate-village>mt-battle
pyrite-town>realgam-tower>gateon-port
''')


MAPS['paldea'] = dict(name='Paldea', labels=True, nodes="""
sv:Cabo Poco 44 72
sv:Poco Path 48 66
sv:Inlet Grotto 38 70
sv:South Province (Area One) 52 60
sv:Mesagoza 50 48
sv:Naranja Academy 46 44
sv:Uva Academy 54 44
sv:Pokémon League (Paldea) 64 46
sv:South Province (Area Two) 40 56
sv:Los Platos 36 62
sv:South Province (Area Three) 32 48
sv:Cortondo 26 52
sv:South Province (Area Four) 62 58
sv:Artazon 66 64
sv:South Province (Area Five) 74 54
sv:Levincia 84 50
sv:South Province (Area Six) 24 64
sv:Alfornada 18 70
sv:Alfornada Cavern 12 64
sv:East Province (Area One) 78 40
sv:East Province (Area Two) 88 32
sv:East Province (Area Three) 86 62
sv:Tagtree Thicket 76 28
sv:Zapapico 92 22
sv:West Province (Area One) 22 42
sv:Cascarrafa 14 40
sv:Porto Marinada 6 46
sv:Asado Desert 22 32
sv:West Province (Area Two) 12 28
sv:West Province (Area Three) 30 22
sv:Medali 36 18
sv:Socarrat Trail 38 28
sv:Colonnade Hollow 70 36
sv:Dalizapa Passage 60 22
sv:North Province (Area One) 42 10
sv:North Province (Area Two) 72 12
sv:North Province (Area Three) 30 6
sv:Glaseado Mountain 54 10
sv:Montenevera 64 4
sv:Casseroya Lake 20 12
sv:Great Crater of Paldea 50 34
sv:Area Zero 50 29
sv:Zero Lab 56 30
sv:West Paldean Sea 2 56
sv:South Paldean Sea 30 74
sv:East Paldean Sea 98 44
sv:North Paldean Sea 50 1
""", paths="""
sv:Cabo Poco>sv:Poco Path>sv:South Province (Area One)>sv:Mesagoza
sv:Mesagoza>sv:South Province (Area Two)>sv:Los Platos
sv:Mesagoza>sv:South Province (Area Three)>sv:Cortondo
sv:South Province (Area Two)>sv:South Province (Area Six)>sv:Alfornada
sv:Mesagoza>sv:South Province (Area Four)>sv:Artazon
sv:South Province (Area Four)>sv:South Province (Area Five)>sv:Levincia
sv:South Province (Area Five)>sv:East Province (Area Three)
sv:Levincia>sv:East Province (Area One)>sv:East Province (Area Two)>sv:Zapapico
sv:East Province (Area One)>sv:Tagtree Thicket
sv:South Province (Area Three)>sv:West Province (Area One)>sv:Cascarrafa>sv:Porto Marinada
sv:West Province (Area One)>sv:Asado Desert>sv:West Province (Area Two)
sv:Asado Desert>sv:West Province (Area Three)>sv:Medali
sv:West Province (Area Three)>sv:North Province (Area Three)>sv:Casseroya Lake
sv:West Province (Area Three)>sv:North Province (Area One)>sv:Glaseado Mountain>sv:Montenevera>sv:North Province (Area Two)
sv:Glaseado Mountain>sv:Dalizapa Passage
sv:Mesagoza>sv:Pokémon League (Paldea)
sv:Great Crater of Paldea>sv:Area Zero
""")

MAPS['kitakami'] = dict(name='Septentria', labels=True, nodes="""
sv:Mossui Town 40 52
sv:Kitakami Road 50 58
sv:Loyalty Plaza 54 44
sv:Kitakami Hall 58 38
sv:Apple Hills 68 54
sv:Reveler's Road 62 30
sv:Oni Mountain 34 22
sv:Oni's Maw 40 30
sv:Chilling Waterhead 28 32
sv:Crystal Pool 22 18
sv:Paradise Barrens 18 42
sv:Kitakami Wilds 80 40
sv:Fellhorn Gorge 10 28
sv:Mossfell Confluence 46 66
sv:Wistful Fields 70 66
sv:Timeless Woods 86 58
sv:Infernal Pass 44 14
sv:Dreaded Den 74 22
""", paths="""
sv:Mossui Town>sv:Kitakami Road>sv:Loyalty Plaza>sv:Kitakami Hall>sv:Reveler's Road
sv:Kitakami Road>sv:Apple Hills>sv:Wistful Fields>sv:Timeless Woods
sv:Kitakami Road>sv:Mossfell Confluence
sv:Mossui Town>sv:Paradise Barrens>sv:Fellhorn Gorge
sv:Mossui Town>sv:Oni's Maw>sv:Oni Mountain>sv:Crystal Pool
sv:Oni Mountain>sv:Infernal Pass
sv:Oni's Maw>sv:Chilling Waterhead
sv:Kitakami Hall>sv:Kitakami Wilds
sv:Reveler's Road>sv:Dreaded Den
""")

MAPS['blueberry'] = dict(name='Terra-Dôme', labels=True, nodes="""
sv:Central Plaza 50 38
sv:League Club Room 50 48
sv:Savanna Biome 28 50
sv:Savanna Plaza 32 60
sv:Coastal Biome 72 52
sv:Coastal Plaza 76 62
sv:Canyon Biome 28 22
sv:Canyon Plaza 32 12
sv:Torchlit Labyrinth 18 30
sv:Polar Biome 72 22
sv:Polar Plaza 76 12
sv:Chargestone Cavern 82 30
sv:Area Zero Underdepths 50 68
""", paths="""
sv:Central Plaza>sv:Savanna Biome>sv:Savanna Plaza
sv:Central Plaza>sv:Coastal Biome>sv:Coastal Plaza
sv:Central Plaza>sv:Canyon Biome>sv:Canyon Plaza
sv:Central Plaza>sv:Polar Biome>sv:Polar Plaza
sv:Canyon Biome>sv:Torchlit Labyrinth
sv:Polar Biome>sv:Chargestone Cavern
sv:Central Plaza>sv:League Club Room
""")


# ---- Légendes Arceus (Hisui) : identifiants "la-..." créés par tools/import_bulba.py
la = lambda n: 'la-' + re.sub(r'[^a-z0-9]+', '-', n.lower().replace("'", '')).strip('-')
HISUI = """
Jubilife Village|20|64
Galaxy Hall|14|60
Aspiration Hill|26|56
Horseshoe Plains|30|48
Windswept Run|20|46
Nature's Pantry|12|42
Grueling Grove|18|36
Worn Bridge|32|40
Obsidian Falls|10|52
Heart's Crag|6|58
Lake Verity|8|68
Floaro Gardens|28|34
Deertrack Heights|36|54
Deertrack Path|38|46
Sandgem Flats|30|64
Ramanas Island|38|70
Oreburrow Tunnel|42|42
Tidewater Dam|24|42
The Heartwood|4|38
Grandtree Arena|4|30
Golden Lowlands|52|58
Diamond Settlement|48|50
Diamond Heath|44|56
Sludge Mound|58|52
Scarlet Bog|54|66
Gapejaw Bog|62|62
Bolderoll Slope|58|46
Bolderoll Ravine|64|42
Solaceon Ruins|50|44
Holm of Trials|64|70
Lake Valor|68|56
Droning Meadow|48|68
Cloudpool Ridge|66|48
Shrouded Ruins|44|64
Ursa's Ring|54|50
Ginkgo Landing|74|44
Veilstone Cape|94|40
Castaway Shore|80|60
Tombolo Walk|88|54
Islespy Shore|84|46
Bathers' Lagoon|76|38
Tranquility Cove|90|66
Firespit Island|97|58
Seagrass Haven|80|32
Lunker's Lair|94|48
Sand's Reach|72|52
Hideaway Bay|82|70
Deadwood Haunt|74|66
Seaside Hollow|97|34
Aipom Hill|90|28
Crossing Slope|72|30
Windbreak Stand|70|36
Celestica Trail|40|30
Celestica Ruins|36|24
Ancient Quarry|52|36
Clamberclaw Cliffs|46|38
Primeval Grotto|56|28
Sacred Plaza|52|20
Stonetooth Rows|62|30
Cloudcap Pass|60|24
Fabled Spring|64|36
Heavenward Lookout|46|26
Wayward Cave|34|36
Wayward Wood|30|28
Arena's Approach|58|36
Sonorous Path|44|22
Spring Path|40|36
Snowfall Hot Spring|24|12
Whiteout Valley|34|10
Lake Acuity|30|2
Bonechill Wastes|42|6
Avalanche Slopes|50|12
Glacier Terrace|58|6
Icebound Falls|66|12
Icepeak Cavern|72|8
Avalugg's Legacy|80|4
Crevasse Passage|72|2
Ice Column Chamber|82|12
Pearl Settlement|40|16
Lonely Spring|56|16
Snowpoint Temple|88|4
Cottonsedge Prairie|40|60
Secret Hollow|62|18
"""
MAPS['hisui'] = dict(name='Hisui', labels=True, nodes='\n'.join(f"{la(n)} {x} {y}" for n, x, y in (l.split('|') for l in HISUI.strip().split('\n'))),
                     paths=f"""
{la('Jubilife Village')}>{la('Aspiration Hill')}>{la('Horseshoe Plains')}>{la('Deertrack Path')}>{la('Oreburrow Tunnel')}>{la('Diamond Settlement')}>{la('Golden Lowlands')}>{la('Sludge Mound')}>{la('Cloudpool Ridge')}>{la('Ginkgo Landing')}>{la("Sand's Reach")}>{la('Castaway Shore')}
{la('Diamond Settlement')}>{la('Solaceon Ruins')}>{la('Ancient Quarry')}>{la('Celestica Trail')}>{la('Celestica Ruins')}
{la('Ancient Quarry')}>{la('Heavenward Lookout')}>{la('Sacred Plaza')}>{la('Pearl Settlement')}>{la('Whiteout Valley')}>{la('Bonechill Wastes')}>{la('Avalanche Slopes')}>{la('Glacier Terrace')}>{la('Icebound Falls')}>{la('Icepeak Cavern')}
{la('Horseshoe Plains')}>{la('Windswept Run')}>{la("Nature's Pantry")}>{la('Grueling Grove')}
{la('Jubilife Village')}>{la('Sandgem Flats')}>{la('Ramanas Island')}
""")

# ---- Légendes Z-A (Illumis) : disposition schématique des arrondissements et zones sauvages
import math
za = lambda n: 'za-' + re.sub(r'[^a-z0-9]+', '-', n.lower().replace('é', 'e').replace("'", '')).strip('-')
lum = ['Centrico Plaza 50 37']
for dist, (cx, cy), n in [('Vert', (50, 12), 9), ('Bleu', (84, 30), 10), ('Magenta', (72, 64), 9), ('Rouge', (28, 64), 8), ('Jaune', (16, 30), 12)]:
    for i in range(1, n + 1):
        a = 2 * math.pi * (i - 1) / n
        lum.append(f"{dist} Sector {i} {round(cx + 13 * math.cos(a), 1)} {round(cy + 9 * math.sin(a), 1)}")
for i in range(1, 21):
    a = 2 * math.pi * (i - 1) / 20 - math.pi / 2
    lum.append(f"Wild Zone {i} {round(50 + 30 * math.cos(a), 1)} {round(37 + 26 * math.sin(a), 1)}")
lum += ['The Sewers 50 46', 'Hotel Z 44 32', 'Lysandre Labs 60 52', 'Académie Étoile 40 44', 'Aymlis Park 62 22',
        'North Boulevard 50 26', 'South Boulevard 50 50', 'Autumnal Avenue 36 36', 'Hibernal Avenue 64 36', 'Magenta Street 62 46',
        'Jaune Street 30 40', 'Saison Canalside 40 54', 'Saison Canal 38 58', 'Pokémon Research Lab (Kalos) 56 18', 'Quasartico Inc. (building) 76 56']
MAPS['lumiose'] = dict(name='Illumis', labels=True, nodes='\n'.join('zaid:' + l for l in lum), paths="")
HYPER = ['Hyperspace Lumiose 50 37', 'Hyperspace Infernal Arena 20 14', 'Hyperspace Newmoon Nightmare 80 14', 'Hyperspace Primordial Sea 14 50',
         'Hyperspace Desolate Land 86 50', 'Hyperspace Sky Pillar 50 6']
for i, t in enumerate(['Bug', 'Dark', 'Dragon', 'Electric', 'Fairy', 'Fighting', 'Fire', 'Flying', 'Ghost', 'Grass', 'Ground', 'Ice',
                       'Normal', 'Poison', 'Psychic', 'Rock', 'Steel', 'Water']):
    a = 2 * math.pi * i / 18
    HYPER.append(f"List of {t}-type hyperspace wild zones {round(50 + 30 * math.cos(a), 1)} {round(40 + 22 * math.sin(a), 1)}")
MAPS['hyperspace'] = dict(name='Extra Illumis', labels=True, nodes='\n'.join('zaid:' + l for l in HYPER), paths="")

# Cartes utilisées par chaque famille de jeux (les DLC ont la leur)
BY_FAMILY = {
    'rbj': ['kanto'], 'lgpe': ['kanto'], 'rfvf': ['kanto', 'sevii'], 'oac': ['johto', 'kanto'],
    'hgss': ['johto', 'kanto'], 'rse': ['hoenn'], 'rosa': ['hoenn'], 'dpp': ['sinnoh'], 'dete': ['sinnoh'],
    'nb': ['unova'], 'nb2': ['unova'], 'xy': ['kalos'], 'sl': ['alola'], 'usul': ['alola'],
    'eb': ['galar'], 'eb-ia': ['armor'], 'eb-tc': ['tundra'], 'col': ['orre'], 'xd': ['orre'],
    'pla': ['hisui'], 'za': ['lumiose'], 'za-md': ['hyperspace', 'lumiose'],
    'ev': ['paldea'], 'ev-mt': ['kitakami'], 'ev-di': ['blueberry'],
}


import re
# lieux d'Écarlate/Violet : "sv:Nom anglais" -> identifiant créé par tools/import_sv.py
svid = lambda x: ('sv-' + re.sub(r'[^a-z0-9]+', '-', x[3:].lower()).strip('-')) if x.startswith('sv:') else (('za-' + re.sub(r'[^a-z0-9]+', '-', x[5:].lower().replace('é', 'e').replace("'", '')).strip('-')) if x.startswith('zaid:') else x)


BP_FR = json.load(open(os.path.join(os.path.dirname(__file__), '..', 'data', 'curated', 'bulba', 'names-fr.json'), encoding='utf-8'))
SV_FR = json.load(open(os.path.join(os.path.dirname(__file__), '..', 'data', 'curated', 'sv', 'names-fr.json'), encoding='utf-8'))


def parse(m):
    nodes = []
    for line in m['nodes'].strip().split('\n'):
        parts = line.rsplit(' ', 2)
        node = {'id': svid(parts[0]), 'x': float(parts[1]), 'y': float(parts[2])}
        if parts[0].startswith('sv:'): node['name'] = SV_FR.get(parts[0][3:], parts[0][3:])
        if parts[0].startswith('zaid:'):
            en = parts[0][5:]
            node['name'] = BP_FR.get(en, en)
            m2 = re.match(r'(Vert|Bleu|Magenta|Rouge|Jaune) Sector (\d+)', en)
            if m2: node['label'] = {'Vert': 'Beau-Vert', 'Bleu': 'Valcyan', 'Magenta': 'Rosavilliers', 'Rouge': 'Maurouge', 'Jaune': 'Jaunemont'}[m2.group(1)] + ' ' + m2.group(2)
            m3 = re.match(r'Wild Zone (\d+)', en)
            if m3: node['label'] = 'ZS ' + m3.group(1)
            m4 = re.match(r'List of (\w+)-type', en)
            if m4: node['label'] = node['name'].split('(type ')[-1].rstrip(')')
        nodes.append(node)
    paths = [[svid(x) for x in p.split('>')] for p in m['paths'].strip().split('\n') if p.strip()] if m['paths'].strip() else []
    return {'name': m['name'], 'nodes': nodes, 'paths': paths, 'labels': m.get('labels', False)}


out = {'_info': 'Cartes schématiques saisies à la main (tools/maps_data.py). Grille 100 x 74.',
       'maps': {k: parse(v) for k, v in MAPS.items()}, 'byFamily': BY_FAMILY}
path = os.path.join(os.path.dirname(__file__), '..', 'data', 'curated', 'maps.json')
json.dump(out, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
print('cartes :', ', '.join(f"{k} ({len(v['nodes'])})" for k, v in out['maps'].items()))
