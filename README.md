# CoC7 Conteneurs

Module Foundry VTT (v13/v14) pour le système Call of Cthulhu 7e (CoC7) : fait d'un objet un **conteneur** (sac à main, valise, sac à dos…) dans lequel on glisse d'autres objets, et qui reste sur la **fiche du personnage**.

## Utilisation
1. Sur la fiche, onglet **Possessions**, le MJ clique sur l'icône « valise » d'un objet : il devient un conteneur.
2. Glisser un objet de la fiche (ou du dossier Objets) **sur la ligne du conteneur** : il y est rangé (l'original est retiré de la fiche).
3. Cliquer sur l'icône valise pour **ouvrir** le conteneur : on y voit son contenu, on peut y glisser d'autres objets, cliquer sur la flèche pour **sortir** un objet, ou le glisser vers la fiche.
4. Le MJ peut détruire un objet du conteneur ou retirer le statut de conteneur (quand il est vide).

## Notes
- Aucune modification de CoC7 : le contenu est enregistré dans les données de l'objet. Module désactivé, le conteneur reste un objet normal.
- Supprimer un conteneur supprime aussi son contenu.
- Types acceptés dans un conteneur : objet, livre, sort, arme, armure.

## Installation
Manifeste : `https://github.com/magisterphamtom/coc7-conteneurs/releases/latest/download/module.json`

Licence MIT.
