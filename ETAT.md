# État
- v0.1.0 : écrite sans test en conditions réelles (pas de Foundry côté Claude). À tester : voir README et liste de tests.
- Points incertains : sélecteurs de la fiche CoC7 v3 (`li.item[data-item-uuid]`, `.item-controls`), hook `renderApplicationV2`, glisser-déposer sur la ligne.
- À faire : fiche PNJ (npc-v2), capacité/poids, affichage du nombre d'objets dans le nom, confirmation avant suppression d'un conteneur plein.

- v0.4.0 : thème repris des variables --c7cc-* de coc7-cartes-chat (aperçu validé en Chromium sur les 5 thèmes + défaut ; non testé dans Foundry).

## v0.4.1 — performances
- (annulé en 0.4.2) limiter le décor à `.tab.possessions` faisait disparaître la valise sur certaines fiches ; on parcourt de nouveau toute la fiche (coût négligeable).
- Filtre des autres fenêtres : < 0,1 µs par rendu.
- `updateItem` : ignoré si aucune fenêtre ouverte ou si le changement ne touche ni flags, ni nom, ni image ; rendus groupés (un par image).

## v0.5.0 — préparation publication
- Interface en français et en anglais (`lang/fr.json`, `lang/en.json`, clés `CC.*`).
- Poids et capacité : poids × quantité des objets rangés (imbriqués compris), capacité réglable par le MJ (clic sur la jauge), dépassement refusé pour le conteneur et tous ses parents.
- Testé en Chromium avec Foundry simulé (rangement, dépassement, imbriqué, FR/EN) ; **non testé dans Foundry**.
- `module.json` : langues, description bilingue ; le zip de release contient `lang/`. Texte de la fiche foundryvtt.com : `docs/fiche-foundryvtt-com.md`.

## v0.6.0 — Investigateurs de l'Ombre
- Le module accepte aussi le système `investigateurs-ombre` (relationships.systems) : conteneur = objet `equipement` ; armes, tomes, sorts et équipement rangeables.
- Fiches Investigateurs de l'Ombre : boutons sur les lignes `.io-objet[data-item-id]` de l'inventaire, valise à côté du « + » de l'équipement, dépôt sur la ligne.
- Les objets rangés sous CoC7 ressortent avec le type du nouveau système (item → equipement, book → tome, weapon → arme, spell → sort).
- Testé et validé par Stéphane dans Foundry (monde « Par-delà les Montagnes Hallucinées » migré).

## v0.6.1 — correctif CoC7 9.2
- CoC7 9.2 masque tout `.item-control` sans `data-action` (hauteur 0, clics ignorés) : les boutons valise du module (ouvrir un conteneur, « nouveau conteneur » à côté du « + ») étaient dans la page mais invisibles. Règle CSS ajoutée en fin de `styles/style.css`. Vérifié dans Foundry 14.368 + CoC7 9.2 (fiche v3).

## v0.6.2 — icônes visibles
- Boutons de l'en-tête des fenêtres de conteneur (menu ⋮, fermer ✕) invisibles : le style imposait la police du titre à ces boutons, qui sont eux-mêmes des icônes Font Awesome. Police du titre limitée au titre. Vérifié dans Foundry 14.368 + CoC7 9.2.
- Flèche « sortir » et corbeille des objets : fond crème, icône brun foncé, **toujours visibles** (avant : seulement au survol).

## v0.7.0 — apparence au choix et nombre d'objets
- Deux réglages **par joueur** (portée client) : « Apparence de la fenêtre du conteneur » (style des cartes de chat d'origine / fiche thématique / fiche CoC7 de base beige à bandeau vert) et « Thème de la fenêtre » (automatique ou un des 5 thèmes).
- Fiche thématique : variables `--ft-*` relues dans les feuilles de style du module « Fiches thématiques » et posées sur la fenêtre ; les `url()` relatives sont converties en chemins complets. Style d'origine avec le même thème que le chat : rien n'est recopié (héritage du `body`).
- Fiche CoC7 de base : papier `assets/art/page-light.webp`, bandeau `--color-window-decoration`, titres `--color-labels`.
- Liste d'équipement : pastille avec le nombre d'objets sur la valise et « (n) » à côté du nom (idée d'un utilisateur). Un conteneur vide n'affiche rien. Sur les fiches Investigateurs de l'Ombre : pastille seulement.
- Piège vu en test : un fichier CSS/JS copié sur le PC peut ne pas être remplacé (ancien contenu servi) — toujours revérifier la taille du fichier installé.
- Testé et validé par Stéphane dans Foundry (monde 1933).
- Confirmation avant suppression d'un conteneur non vide (fiche et corbeille de la fenêtre).

