# CoC7 Conteneurs

Module Foundry VTT (v13/v14) pour le système Call of Cthulhu 7e (CoC7) : fait d'un objet un **conteneur** (sac à main, valise, sac à dos…) dans lequel on glisse d'autres objets, et qui reste sur la **fiche du personnage**.

## Utilisation
0. **Créer un conteneur neuf** : bouton « Nouveau conteneur » en haut du dossier Objets (MJ), ou la petite valise à côté du « + » de la section Objets sur une fiche. On choisit un modèle (sac à main, sac à dos, valise, besace, mallette, trousse, coffret, malle), un nom, une image et une description.
1. Sur la fiche, onglet **Possessions**, le MJ clique sur l'icône « valise » d'un objet : il devient un conteneur.
2. Glisser un objet de la fiche (ou du dossier Objets) **sur la ligne du conteneur** : il y est rangé (l'original est retiré de la fiche).
3. Cliquer sur l'icône valise pour **ouvrir** le conteneur : on y voit son contenu, on peut y glisser d'autres objets, cliquer sur la flèche pour **sortir** un objet, ou le glisser vers la fiche.
4. Le MJ peut détruire un objet du conteneur ou retirer le statut de conteneur (quand il est vide).

## Poupées russes
Un conteneur peut en contenir d'autres, sans limite de niveaux : glisse un conteneur dans un autre (ex. un coffret de maquillage dans un sac à main). Sa tuile porte un badge doré avec le nombre d'objets qu'il contient ; un clic sur son nom l'ouvre dans une seconde fenêtre. On peut aussi glisser un objet directement sur la tuile du conteneur pour le ranger dedans, et déplacer un objet d'un conteneur à un autre.

## Notes
- Aucune modification de CoC7 : le contenu est enregistré dans les données de l'objet. Module désactivé, le conteneur reste un objet normal.
- Supprimer un conteneur supprime aussi son contenu.
- Types acceptés dans un conteneur : objet, livre, sort, arme, armure.

## Installation
Manifeste : `https://github.com/magisterphamtom/coc7-conteneurs/releases/latest/download/module.json`

Licence MIT.
