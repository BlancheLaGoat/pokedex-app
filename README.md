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
- **Stats** (onglet Stats de la fiche) : stats de base et valeurs au niveau 50 et 100 (Min −, Min, Max, Max +).
- **Usine de Combat** (Outils → Combat → Lieu de combat) : Émeraude et Platine / HGSS. Choisis le niveau (50 ou Ouvert), la série et « Pokémon de » (tes Pokémon loués, ceux plus forts après des échanges, adversaires, 7e adversaire, Meneur) : l'appli ne propose que les fiches possibles avec leurs IV. Un clic ajoute un Pokémon loué à ton équipe ou prend la fiche comme adversaire. Règles lues dans le code du jeu (pret/pokeemerald `battle_factory.c`, pret/pokeplatinum `battle_factory_helpers.c`) ; n° des fiches de Platine d'après les données extraites par RainingChain (`tools/sources/platinum-frontier-set-ids.tsv`).
- **Équipes** (Outils → Équipes) : plusieurs équipes de 6, avec pour chaque Pokémon forme, niveau, nature, talent, objet, Téracristal, 4 attaques (liste du jeu choisi), IV, EV et stats calculées. **Mes boîtes** : charge une sauvegarde et clique sur un Pokémon de l'équipe ou des boîtes PC pour l'ajouter avec son niveau, sa nature, son talent, son objet, ses attaques, ses IV et ses EV (Gen 1 et 2 : DV et Stat Exp convertis).
- **Combat** (Outils → Combat) : choisis ton équipe, ton Pokémon au combat et un adversaire (niveau, nature, IV, EV, attaques). L'appli calcule les dégâts de chaque attaque (formule de calc.pokemonshowdown.com, adaptée à la génération du jeu de l'équipe : puissance, précision et type des attaques à l'époque, anciens types des Pokémon, ancienne table des types, physique/spécial selon le type avant la 4e génération, coup critique ×2 avant la 6e), indique la meilleure et pourquoi, puis conseille d'attaquer ou de changer de Pokémon : chaque membre de l'équipe a ses chances de gagner le duel (4 000 duels simulés), et l'appli donne l'ordre conseillé. Moteur dans `src/battle.js`, écrans dans `src/teams.js`. **Lieux de combat** : pour Rubis/Saphir, Émeraude, Diamant/Perle, Platine/HGSS, Noir/Blanc (1 et 2), X/Y/ROSA, Soleil/Lune (et Ultra), Épée/Bouclier et Diamant Étincelant/Perle Scintillante, l'adversaire se choisit dans la liste des Pokémon de la Tour / Zone / Métro / Château / Arbre de Combat (objet, attaques, nature, EV, IV selon le dresseur), par Pokémon ou par dresseur, d'après les listes de dresseurs de Bulbapedia (`tools/import_facilities.py` → `data/facilities.json`).
- **Carte interactive** (onglet Carte de la fiche) : vraie carte du jeu pour chaque région (Johto : carte du PokéMatos de HGSS ; chargée depuis Bulbagarden Archives, connexion internet nécessaire ; seul Extra Illumis reste en schéma), clic sur un lieu = Pokémon de ce lieu zone par zone, capturés grisés. Positions sur les vraies cartes dans `tools/maps_img.py` (la plupart calculées depuis les cartes « <Région> <lieu> Map.png » de Bulbagarden, où le lieu est surligné), schémas dans `tools/maps_data.py`. Cartes Paldea, Septentria et Terra-Dôme incluses. Cartes Hisui, Illumis et Extra Illumis incluses ; Diamant Étincelant/Perle Scintillante utilise la carte de Sinnoh et Rubis Oméga/Saphir Alpha celle de Hoenn (pas de lieux de capture dans PokéAPI).
- **Fiche** : taux de capture, répartition des sexes, groupes Œuf, chaîne d'évolution avec conditions, talents de la génération du jeu (talent caché + comment l'obtenir), attaques du jeu (niveau, CT/CS/DT, œuf, tuteur), Balls utilisables et Ball enregistrée par jeu.

- **Le plus simple** (Pokédex national) : pour chaque Pokémon, le jeu et l'endroit le plus simple / rapide ou avec le plus de chances (%), deux autres jeux, et les conseils de la feuille « National living dex » (4e, 5e, 6e génération). Les événements ne sont jamais proposés.

- **Import d'une sauvegarde de jeu** (bouton en bas à gauche) : coche les Pokémon de l'équipe et des boîtes PC (shiny compris). Gen 1 à 7, Let's Go, Diamant Étincelant / Perle Scintillante. Pour la 3DS, exporter le fichier « main » avec Checkpoint ou JKSM ; pour la Switch, la sauvegarde exportée (JKSV…). La ROM ne sert à rien : il faut le fichier de sauvegarde.

- **Outils** : Équipes et Combat (voir plus haut), arbres à Coup d'Boule d'Or / Argent / Cristal (carte avec les arbres rares selon l'ID dresseur) et arbres à Miel de Diamant / Perle / Platine (arbres à Goinfrex, chances, minuteur).

- **Défi du Prof. Chen** (onglet dans chaque jeu) : les Pokémon à attraper avant chaque badge, d'après les listes de Mewlax (r/ProfessorOak), avec avancement par partie. Import : `tools/import_oak.py`.

## Données

- `data/core.json`, `data/enc/`, `data/moves/` : générés depuis [PokeAPI](https://github.com/PokeAPI/pokeapi) (qui agrège Bulbapedia / Serebii / Veekun) par `tools/build_data.py`.
- `data/facilities.json` : Pokémon des lieux de combat, extraits des pages « List of Battle … Trainers » de Bulbapedia (copie dans `tools/sources/bulbapedia-facility-*.tsv`) par `tools/import_facilities.py`. Quelques dresseurs manquent sur Bulbapedia (Vétérans de la Tour de Combat de Diamant/Perle, 9 dresseurs d'Épée/Bouclier) ; trois pages trop longues sont lues en partie (Château : Artist ; Épée/Bouclier : Poké Kid, Worker).
- `data/stats-past.json` : anciennes stats de base (ex. Pikachu avant X/Y) et stat Spécial de la 1re génération, depuis `pokemon_stats_past.csv` de PokeAPI (`tools/import_stats_past.py`) : les calculs de combat utilisent les stats de l'époque du jeu.
- Diamant / Perle : fiches et dresseurs lus dans les données du jeu (`battle/b_tower` de la décompilation [pret/pokeplatinum](https://github.com/pret/pokeplatinum), identiques à pret/pokediamond), copiés dans `tools/sources/dp-tower-*.tsv`, avec Palmer. Platine / HGSS : listes de Bulbapedia (vérifiées avec les données extraites du jeu publiées par RainingChain/pokemoncompletion : 950 fiches et 300 dresseurs identiques) et Meneurs (Palmer, Dahlia, Darach) d'après leurs pages Bulbapedia (`tools/sources/bulbapedia-frontier-brains-gen4.tsv`).
- Émeraude : listes complétées par le tableur « Emerald Battle Frontier Complete » de Hozu (copie en TSV dans `tools/sources/emerald-frontier-*.tsv`), avec les équipes des Meneurs.
- `data/save-species.json` : index internes des espèces, courbes d'expérience et index des objets par génération pour lire les sauvegardes (`tools/build_save_data.py`).
- `data/moves-changes.json` : anciennes valeurs des attaques (puissance, précision, type, PP) par génération, depuis `move_changelog.csv` de PokeAPI (`tools/import_move_changes.py`).
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
python tools/import_move_changes.py
python tools/import_stats_past.py
python tools/import_facilities.py pokeapi/data/v2/csv
python tools/build_save_data.py pokeapi/data/v2/csv
```

## Journal

Bouton « Journal » dans l'appli : liste chaque modification avec le code touché (`journal/entries.js`).

## Crédits

- Données : [PokeAPI](https://github.com/PokeAPI/pokeapi) et [Bulbapedia](https://bulbapedia.bulbagarden.net) (contenu sous licence CC BY-NC-SA).
- Sprites : [PokeAPI/sprites](https://github.com/PokeAPI/sprites).
- Balls assorties : feuille « Legal Matching Pokéballs 2.1 » de u/OracleLink.
- Lieux conseillés 4e / 5e / 6e génération : feuille Google « National living dex ».
- Cartes des régions : images de Bulbagarden Archives (liste et sources dans `tools/maps_img.py`).
- Défi du Prof. Chen : listes « POC List » de Mewlax (r/ProfessorOak).
- Projet de fan non commercial. Pokémon et les noms associés appartiennent à Nintendo, Creatures et Game Freak.
