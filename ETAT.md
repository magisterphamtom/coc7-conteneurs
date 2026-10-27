# État
- v0.1.0 : écrite sans test en conditions réelles (pas de Foundry côté Claude). À tester : voir README et liste de tests.
- Points incertains : sélecteurs de la fiche CoC7 v3 (`li.item[data-item-uuid]`, `.item-controls`), hook `renderApplicationV2`, glisser-déposer sur la ligne.
- À faire : fiche PNJ (npc-v2), capacité/poids, affichage du nombre d'objets dans le nom, confirmation avant suppression d'un conteneur plein.

- v0.4.0 : thème repris des variables --c7cc-* de coc7-cartes-chat (aperçu validé en Chromium sur les 5 thèmes + défaut ; non testé dans Foundry).

## v0.4.1 — performances
- (annulé en 0.4.2) limiter le décor à `.tab.possessions` faisait disparaître la valise sur certaines fiches ; on parcourt de nouveau toute la fiche (coût négligeable).
- Filtre des autres fenêtres : < 0,1 µs par rendu.
- `updateItem` : ignoré si aucune fenêtre ouverte ou si le changement ne touche ni flags, ni nom, ni image ; rendus groupés (un par image).
