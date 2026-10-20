# Pokédex — suivi par jeu

Appli desktop (Electron) pour suivre ses Pokédex jeu par jeu : obtention, exclusivités, évolutions, talents, attaques, formes, shiny, Balls et route optimisée.

## Installer

Télécharge `Pokedex-Setup-x.y.z.exe` dans les [Releases](https://github.com/BlancheLaGoat/pokedex-app/releases) et lance-le. L'appli se met ensuite à jour toute seule : au démarrage elle vérifie s'il existe une nouvelle release, la télécharge en arrière-plan et propose « Redémarrer et installer » (sinon elle s'installe à la fermeture). Le suivi est conservé.

## Publier une mise à jour

1. Changer `"version"` dans `package.json` (ex. `1.5.0` → `1.5.1`).
2. Commit puis **Push origin** dans GitHub Desktop.
3. Le workflow `.github/workflows/build.yml` construit l'installeur et crée la release `v1.5.1` tout seul ; les applis installées la récupèrent automatiquement.

Si le numéro de version n'a pas changé, le push fait seulement un build de test (onglet Actions).

## Lancer en développement

```
npm install
npm start
```

Construire l'installeur : `npm run dist` (dossier `dist/`).

Les sprites sont chargés depuis le dépôt PokeAPI sur GitHub (connexion nécessaire au premier affichage, ensuite mis en cache). Le suivi est sauvegardé dans `%APPDATA%/pokedex-blanche/pokedex-suivi.json` ; les boutons Exporter / Importer permettent de le sauvegarder ailleurs.

## Ce que fait l'appli

- **Pokédex national** : les 1025 espèces, un Pokémon compte dès qu'il est coché dans n'importe quel jeu (ou coché directement dans le national).
- **Groupes de jeux** (ex. Rouge / Bleu / Jaune) : chaque version a son propre suivi, le groupe fait le total. Les versions japonaises sont rangées à part.
- **DLC séparés** du jeu principal (Île de l'Armure, Terres de la Couronne, Masque Turquoise, Disque Indigo, Méga-Dimension). Un DLC voit les rencontres de son jeu de base, jamais l'inverse.
- **Obtention par version** : lieux, méthode, niveaux, taux de rencontre, cadeaux, Pokémon fixes, échanges PNJ, évolutions, œufs, exclusivités de version, évolutions par échange.
- **Uniques** : starters, fossiles, légendaires, fabuleux, cadeaux, Pokémon fixes, Ultra-Chimères, événements.
- **Choix exclusifs** (Gen 1) : starter, fossile du Mont Sélénite, Dojo, Évoli unique — un seul compte quand les échanges sont désactivés.
- **Avant / après la ligue / échange uniquement** (Gen 1 pour l'instant).
- **Route optimisée** (Gen 1 : Rouge, Bleu, Jaune, versions JP, Let's Go) : étapes badge par badge, meilleur lieu pour chaque Pokémon, options pour exclure les échanges et les œufs. Les autres jeux ont une vue « par lieu ».
- **Shiny**, **différences mâle/femelle** (sprites distincts), **formes alternatives** (régionales, Prismillon, Pikachu casquettes, Méga, Gigamax…).
- **Balls assorties** : jusqu'à 3 Balls légales choisies par couleur/thème pour chaque Pokémon, forme et shiny (feuille « Legal Matching Pokéballs 2.1 » de u/OracleLink, importée par `tools/import_matching_balls.py`).
- **Codes couleur** (bouton « Couleurs ») : contour doré = légendaire / fabuleux, marron = fossile, violet = obtenable une seule fois dans le jeu, couleur officielle de la version = exclusivité de cette version (ex. rouge pour Rouge, bleu pour Bleu), pointillés = échange nécessaire (couleur de la version qui l'a, ou orange pour une évolution par échange). Exclusivités vérifiées sur la page « Version-exclusive Pokémon » de Bulbapedia (`tools/import_exclusives.py`), couleurs des versions d'après ses modèles `{{<version> color}}`.
- **Clic sur la case** = capturé, **clic droit** = shiny, **bouton ⋯** en haut à droite = fiche du Pokémon.
- **Carte interactive** (onglet Carte de la fiche) : carte schématique de la région, clic sur un lieu = Pokémon de ce lieu zone par zone, capturés grisés. Positions éditables dans `tools/maps_data.py`. Cartes Paldea, Septentria et Terra-Dôme incluses. Cartes Hisui, Illumis et Extra Illumis incluses ; Diamant Étincelant/Perle Scintillante utilise la carte de Sinnoh et Rubis Oméga/Saphir Alpha celle de Hoenn (pas de lieux de capture dans PokéAPI).
- **Fiche** : taux de capture, répartition des sexes, groupes Œuf, chaîne d'évolution avec conditions, talents de la génération du jeu (talent caché + comment l'obtenir), attaques du jeu (niveau, CT/CS/DT, œuf, tuteur), Balls utilisables et Ball enregistrée par jeu.

- **Le plus simple** (Pokédex national) : pour chaque Pokémon, le jeu et l'endroit le plus simple / rapide ou avec le plus de chances (%), deux autres jeux, et les conseils de la feuille « National living dex » (4e, 5e, 6e génération). Les événements ne sont jamais proposés.

## Données

- `data/core.json`, `data/enc/`, `data/moves/` : générés depuis [PokeAPI](https://github.com/PokeAPI/pokeapi) (qui agrège Bulbapedia / Serebii / Veekun) par `tools/build_data.py`.
- `data/curated/` : données saisies à la main (étapes de la Gen 1, échanges PNJ, choix exclusifs, notes, Balls par jeu, talents cachés).

**Écarlate / Violet** (+ Masque Turquoise et Disque Indigo) : lieux, biomes, niveaux, moments de la journée et Pokémon fixes importés des tables de capture de Bulbapedia (`data/curated/sv/bulbapedia-catch.tsv`, script `tools/import_sv.py`, à relancer après `build_data.py`). Étapes conseillées, légendaires et choix dans `data/curated/sv.json`. Le « poids » est la fréquence relative d'apparition ; les raids Téracristal ne sont pas comptés.

**Diamant Étincelant / Perle Scintillante, Légendes Arceus, Légendes Z-A (+ Méga-Dimension), Rubis Oméga / Saphir Alpha** : lieux importés des tables de capture de Bulbapedia (`data/curated/bulba/`, script `tools/import_bulba.py`), légendaires dans `data/curated/others.json` et `za.json`. Les Pokémon absents de ces tables sont marqués « Données manquantes ».

**Corrections manuelles** : `data/curated/extra-encounters.json` (rencontres oubliées par les bases, ex. Concours de Capture d'Insectes d'Or/Argent/Cristal), appliqué par `tools/import_extra.py`.

Limite connue : lieux incomplets pour le Bleu japonais.

Pour régénérer les données :

```
git clone --depth 1 --filter=blob:none --sparse https://github.com/PokeAPI/pokeapi.git
cd pokeapi && git sparse-checkout set data/v2/csv && cd ..
git clone --depth 1 --filter=blob:none --no-checkout https://github.com/PokeAPI/sprites.git
cd sprites && git ls-tree -r --name-only HEAD sprites/pokemon > ../sprites_tree.txt && cd ..
python tools/build_data.py pokeapi/data/v2/csv sprites_tree.txt data
python tools/import_sv.py
python tools/import_bulba.py
python tools/import_extra.py
python tools/import_exclusives.py
python tools/import_livingdex.py
python tools/maps_data.py
```

## Journal

Bouton « Journal » dans l'appli : liste chaque modification avec le code touché (`journal/entries.js`).

## Crédits

- Données : [PokeAPI](https://github.com/PokeAPI/pokeapi) et [Bulbapedia](https://bulbapedia.bulbagarden.net) (contenu sous licence CC BY-NC-SA).
- Sprites : [PokeAPI/sprites](https://github.com/PokeAPI/sprites).
- Balls assorties : feuille « Legal Matching Pokéballs 2.1 » de u/OracleLink.
- Lieux conseillés 4e / 5e / 6e génération : feuille Google « National living dex ».
- Projet de fan non commercial. Pokémon et les noms associés appartiennent à Nintendo, Creatures et Game Freak.
