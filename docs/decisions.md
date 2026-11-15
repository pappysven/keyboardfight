# Journal des décisions

Chaque choix structurant est noté ici : date, contexte, décision, conséquences.
Une décision remplacée n'est pas effacée : on ajoute une nouvelle entrée qui la référence.

---

## D-001 — Stack : Vite + TypeScript, sans framework
- **Date** : 2026-11-15
- **Contexte** : appli web locale, un seul utilisateur, écrans simples, besoin de rester léger et lisible.
- **Décision** : Vite + TypeScript strict. HTML/CSS et DOM natif. Canvas uniquement si l'arène l'exige (à décider au lot combat).
- **Conséquences** : pas de runtime de framework à maintenir ; l'aide `h()` de `src/app/dom.ts` remplace les templates. Les textes passent toujours par `textContent`.

## D-002 — Pas de backend, pas de service tiers
- **Date** : 2026-11-15
- **Contexte** : les données sont celles d'un enfant de 9 ans.
- **Décision** : tout reste dans le navigateur. Aucun serveur, aucune télémétrie, aucun appel réseau hors ressources du site. Pas de polices chargées depuis un CDN : elles sont installées via `@fontsource`.
- **Conséquences** : pas de synchronisation entre appareils (hors périmètre). Sauvegarde/export éventuel à traiter plus tard, en local.

## D-003 — Stockage : localStorage derrière une couche d'accès
- **Date** : 2026-11-15
- **Contexte** : données petites (profil, réglages, progression, listes de mots). Safari peut refuser localStorage en navigation privée.
- **Décision** : `src/storage/store.ts` expose `read/write/remove`. Backend = localStorage, avec repli sur une mémoire volatile si le stockage est bloqué. Chaque valeur est enveloppée avec son `schemaVersion`.
- **Conséquences** : si les listes deviennent volumineuses, seul le backend change (IndexedDB), pas les écrans.

## D-004 — Cible : Safari macOS récent, clavier AZERTY Mac par défaut
- **Date** : 2026-11-15
- **Contexte** : c'est l'ordinateur de l'enfant.
- **Décision** : tester d'abord sur Safari macOS, disposition AZERTY. Les touches par étape sont décrites pour AZERTY (docs/progression.md).
- **Conséquences** : les accents composés (touches mortes) et les chiffres (Maj) doivent être vérifiés sur la machine réelle avant le lot « mots ».

## D-005 — Sprites : affichage x3, `image-rendering: pixelated`
- **Date** : 2026-11-15
- **Contexte** : pixel art vu de côté ; le flou de mise à l'échelle abîme les sprites.
- **Décision** : les cadres sont affichés à 3 × leur taille native, sans lissage. Facteur entier uniquement.
- **Conséquences** : un sprite 32×32 occupe 96×96 px à l'écran.

## D-006 — Manifeste de personnage en JSON, une pose = une planche
- **Date** : 2026-11-15
- **Contexte** : changer de personnage (y compris un personnage provisoire ou privé) sans toucher au code.
- **Décision** : un fichier `manifest.json` par personnage, avec les sept poses obligatoires (idle, punch, kick, special, hit, win, ko). Chaque pose porte sa planche, la liste des cadres (x, y, w, h), `frameCount` et `frameDuration`. Le chargeur refuse tout manifeste incohérent avec un message précis.
- **Conséquences** : `frameDuration` est la durée **d'une image** (en ms) et non la durée totale de la pose. Une pose sans animation a `frameCount: 1`.

## D-007 — Sprites privés hors du dépôt
- **Date** : 2026-11-15
- **Contexte** : un personnage peut être basé sur l'enfant ou sur un proche.
- **Décision** : `.gitignore` exclut `/private/`, `/data/` et tout `public/sprites/*` sauf `placeholder/`. Un sprite privé se place localement dans `public/sprites/<id>/` sans jamais être commité.
- **Conséquences** : le dépôt ne contient que le personnage provisoire. Un autre poste doit recevoir les sprites privés à part.

## D-008 — Déploiement : GitHub Pages à chaque push sur main
- **Date** : 2026-11-15
- **Contexte** : accès depuis l'ordinateur de l'enfant sans serveur.
- **Décision** : `vite.config.ts` fixe `base: '/keyboardfight/'`. GitHub Actions build, teste et publie `dist/` à chaque push sur `main` (docs/deploy.md).
- **Conséquences** : un merge de PR sur `main` déclenche une mise en ligne. Le merge reste décidé par l'humain.

## D-009 — Plancher de vie par difficulté
- **Date** : 2026-11-15
- **Contexte** : l'enfant doit pouvoir s'entraîner sans perdre en niveau facile.
- **Décision** : facile = 25 % minimum de vie ; moyen et difficile = 0 %. Règle codée dans `src/game/difficulty.ts` et testée.
- **Conséquences** : en facile, l'écran de défaite n'est jamais atteint.

## D-010 — Déblocage : précision ≥ 90 % sur 3 sessions
- **Date** : 2026-11-15
- **Contexte** : la précision passe avant la vitesse ; le passage ne dépend d'aucun chrono.
- **Décision** : une étape se débloque quand ses prérequis atteignent une précision ≥ 90 % sur 3 sessions. Détail : docs/progression.md.
- **Conséquences** : « 3 sessions » reste à préciser (consécutives ou non) — voir les questions ouvertes de la PR.

## D-011 — Travail en branche et PR, merge par l'humain
- **Date** : 2026-11-15
- **Contexte** : le code est écrit par Claude Code ; l'humain garde la main sur ce qui entre dans `main`.
- **Décision** : Claude Code travaille sur une branche, ouvre une PR vers `main` et ne merge jamais.
- **Conséquences** : voir AGENTS.md (rôles).

## D-012 — Combo : 5 bonnes touches à moins de 1,2 s d'intervalle
- **Date** : 2026-11-15
- **Contexte** : le combo récompense la régularité sans punir la lenteur (pas de chrono punitif).
- **Décision** : `COMBO_LENGTH = 5`, `COMBO_MAX_GAP_MS = 1200`, codés dans `src/game/combat.ts`. Une faute remet la série à zéro. Après un combo, la série repart à zéro.
- **Statut** : **provisoire**, à calibrer sur l'enfant (question ouverte de la PR).

## D-013 — Riposte : 10 % des PV max, PERFECT indépendant du temps
- **Date** : 2026-11-15
- **Contexte** : une erreur doit avoir une conséquence de jeu, sans jugement ni chrono.
- **Décision** : une riposte retire `RIPOSTE_DAMAGE_RATIO = 0.1` des PV max, sous le plancher de la difficulté (D-009). Un PERFECT dépend uniquement de l'absence de faute sur le mot.
- **Statut** : montant de la riposte **provisoire** (équilibrage à faire).

## D-014 — Moteur de combat pur, sans DOM ni temps réel
- **Date** : 2026-11-15
- **Contexte** : les règles doivent être testables sans navigateur ni horloge.
- **Décision** : `src/game/combat.ts` reçoit chaque touche avec son horodatage (`timeMs`) et renvoie le nouvel état et les événements (`hit`, `combo`, `riposte`, `word-done`). L'écran fournit `performance.now()`.
- **Conséquences** : les règles sont couvertes par des tests unitaires. L'écran de combat ne fait que l'affichage. Le mot de démonstration est fictif (`abcd`) ; la difficulté est fixée à « facile » tant que les réglages n'existent pas.

## D-015 — Défaite et résultat : précision, sans vitesse ni enregistrement
- **Date** : 2026-11-15
- **Contexte** : l'enfant doit savoir où il en est, sans chrono ni jugement. La défaite ne doit exister qu'en moyen et difficile.
- **Décision** :
  - Le moteur émet `defeat` quand une riposte amène la vie à 0 ; aucune touche n'a plus d'effet ensuite. En facile, le plancher (D-009) rend cet événement impossible.
  - L'écran de résultat affiche précision, mots, PERFECT et combos. Aucune vitesse, aucun temps.
  - Les statistiques de session (`src/game/session.ts`) restent **en mémoire** : rien n'est enregistré avant le lot progression.
- **Conséquences** : la précision est calculée comme bonnes touches / touches frappées (bonnes + fautes). Le lot progression devra persister ces agrégats, pas les frappes (AGENTS.md, règle 7).
