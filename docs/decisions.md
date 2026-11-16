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

## D-016 — Critère de maîtrise : 3 dernières sessions, chacune ≥ 90 %
- **Date** : 2026-11-15
- **Contexte** : docs/progression.md dit « précision ≥ 90 % sur 3 sessions » sans préciser « consécutives » ou non.
- **Décision** : une étape est maîtrisée si ses 3 **dernières** sessions ont chacune une précision ≥ 0,90. Implémenté dans `isMastered` (`src/game/progression.ts`). Une étape dont les prérequis sont maîtrisés s'ouvre, et ne se referme jamais.
- **Statut** : **provisoire**. L'humain doit confirmer ou changer la règle (question ouverte de la PR).

## D-017 — Persistance : agrégats de session dans kf.progression
- **Date** : 2026-11-15
- **Contexte** : la progression doit survivre au rechargement, sans garder de trace des frappes (AGENTS.md, règle 7).
- **Décision** : `kf.progression` (localStorage, via `src/storage/store.ts`) contient, par étape, la date de déblocage et la liste des sessions (`endedAt`, `keystrokes`, `correct`, `precision`). Un chargement illisible repart de l'état initial, sans erreur. Les statistiques de la session en cours (écran de résultat) ne sont pas persistées.
- **Conséquences** : le lot espace parent devra pouvoir remettre la progression à zéro. Le format de `docs/data-contracts.md` est inchangé.

## D-018 — Code parent : PBKDF2 local, déverrouillé pour une visite
- **Date** : 2026-11-15
- **Contexte** : l'espace parent doit être protégé d'un clic malheureux de l'enfant. Rien ne quitte l'appareil.
- **Décision** :
  - Code de 4 caractères minimum, haché en PBKDF2-SHA256 (310 000 itérations, sel aléatoire de 16 octets). Seul le hachage est stocké (`src/parent/code.ts`).
  - Le déverrouillage vaut pour la visite : quitter l'écran re-verrouille. Il ne survit pas au rechargement.
- **Conséquences** : c'est une protection de confort, pas une sécurité contre une personne déterminée (le code est local). Pas de récupération : un code oublié se remet à zéro en effaçant les données du navigateur. À documenter pour le parent.

## D-019 — Réglages appliqués au combat ; pause proposée, jamais imposée
- **Date** : 2026-11-15
- **Contexte** : difficulté, durée de session et pause sont réglés par le parent (docs/pedagogie.md).
- **Décision** :
  - La difficulté du combat vient de `kf.settings`.
  - Une fois la durée écoulée, si la pause est activée, un bandeau propose une pause avec un bouton « Continuer ». Le combat n'est jamais arrêté ni bloqué.
  - Pas de compte à rebours affiché.
- **Conséquences** : la durée réglée n'arrête pas la session ; elle sert seulement à déclencher la proposition.

## D-020 — Mots bloqués : saisie normalisée, pas encore utilisés
- **Date** : 2026-11-15
- **Contexte** : le parent doit pouvoir écarter des mots, en attendant les listes de révision.
- **Décision** : saisie en minuscules, sans espaces autour, 40 caractères au plus, lettres / tiret / apostrophe uniquement (`src/game/blocked-words.ts`). Un doublon ne change rien. Les exercices n'utilisent pas encore la liste.
- **Conséquences** : le lot listes de révision devra filtrer les mots bloqués. Le texte de l'écran le précise au parent.

## D-021 — Modes d'affichage : masquage côté jeu, dictée sans audio pour l'instant
- **Date** : 2026-11-15
- **Contexte** : une liste de révision a un mode d'affichage (docs/data-contracts.md).
- **Décision** (`src/game/revision.ts`) :
  - `affiche` : le mot reste visible.
  - `cache-3s` : le mot est visible 3 s après son apparition, puis remplacé par des tirets bas de même longueur. Les lettres déjà tapées restent visibles.
  - `dictee` : le mot n'est jamais affiché. Il est lu à voix haute (D-024).
- **Conséquences** : le mot masqué n'est jamais écrit dans le DOM (seulement des tirets bas).

## D-022 — Jeu : première liste, mots bloqués retirés à la lecture
- **Date** : 2026-11-15
- **Contexte** : le choix de liste n'existe pas encore dans l'écran de combat.
- **Décision** : le combat joue la première liste enregistrée, en retirant les mots bloqués (`playableWords`). Sans liste, le mot de démonstration `abcd` sert de repli. Les mots bloqués sont filtrés à la lecture, pas à l'écriture de la liste : un mot bloqué plus tard disparaît sans toucher à la liste.
- **Statut** : **provisoire**, le choix de la liste à jouer viendra avec le lot suivant.

## D-023 — Saisie des listes : normalisation et refus explicites
- **Date** : 2026-11-15
- **Contexte** : le parent colle une liste de mots, avec des fautes de saisie possibles.
- **Décision** : découpe par retour à la ligne, virgule ou point-virgule. Chaque mot est normalisé comme les mots bloqués (`normalizeWord`), les doublons sont retirés, et les saisies refusées sont comptées dans la notice. Rien n'est silencieusement modifié.
- **Conséquences** : un mot refusé (chiffre, espace) n'entre pas dans la liste ; le parent le voit dans la notice.

## D-024 — Dictée : synthèse vocale du Mac, aucune donnée ne sort
- **Date** : 2026-11-15
- **Contexte** : la dictée doit faire entendre le mot. Choix de l'humain : la voix du Mac.
- **Décision** (`src/audio/speech.ts`) : la lecture passe par la synthèse vocale du navigateur, en `fr-FR`, avec une voix française installée si elle existe. Le mot est lu au début de chaque mot et sur demande (« Réécouter »). La lecture s'arrête en quittant l'écran.
- **Conséquences** : sur Safari macOS, les voix sont celles du système : la lecture est locale. Aucun enregistrement à gérer. Si la synthèse n'est pas disponible, la dictée reste jouable sans son (le bouton ne fait rien).
- **Question ouverte** : le choix de la voix (qualité, voix française disponible sur le Mac) reste à vérifier sur la machine réelle.

## D-025 — Choix de la liste à jouer : sur l'accueil, en mémoire
- **Date** : 2026-11-16
- **Contexte** : le combat jouait toujours la première liste. Il faut pouvoir choisir.
- **Décision** : l'accueil affiche une puce par liste (« Liste à jouer »). Le choix est gardé en mémoire (`src/game/selection.ts`) et n'est pas enregistré : au rechargement de la page, la première liste revient. Si la liste choisie a été supprimée, on retombe sur la première. Sans liste, le mot de démonstration sert.
- **Conséquences** : le titre du combat affiche le nom de la liste jouée. Une préférence persistante (liste par défaut) pourra venir avec l'espace parent si le besoin se confirme.

## D-026 — Liste par défaut mémorisée dans kf.settings
- **Date** : 2026-11-16
- **Contexte** : D-025 gardait le choix en mémoire seulement. Le parent a dit oui à une mémorisation entre deux visites.
- **Décision** : `defaultListId` rejoint `kf.settings`. Choisir une liste sur l'accueil l'enregistre. Le combat joue la liste choisie pendant la visite, sinon la liste par défaut, sinon la première.
- **Schéma** : ajout compatible, donc `schemaVersion` reste à 1. Une donnée sans le champ se lit comme `null`. Les tests couvrent les deux cas.
- **Conséquences** : si la liste par défaut est supprimée, on retombe sur la première, sans erreur.

## D-027 — Changer le code parent : il faut l'ancien
- **Date** : 2026-11-16
- **Contexte** : le code est parfois à remplacer. Sans récupération (D-018), changer le code ne doit pas être ouvert à quiconque a accès à l'écran.
- **Décision** : dans l'espace parent, changer le code demande l'ancien code, puis le nouveau deux fois. Le nouveau code suit les mêmes règles (4 caractères minimum, PBKDF2, sel neuf).
- **Conséquences** : un code oublié se remet toujours à zéro en effaçant les données du navigateur. Les saisies de ce formulaire restent en place après une erreur.

## D-028 — Étape travaillée : choisie à l'accueil, mémorisée
- **Date** : 2026-11-16
- **Contexte** : toutes les sessions allaient sur la rangée de repos, même une fois d'autres étapes ouvertes.
- **Décision** : `trainingTechnique` rejoint `kf.settings` (défaut `repos`). L'accueil propose les étapes débloquées ; le choix est enregistré. La session va sur cette étape si elle est ouverte, sinon sur la rangée de repos. Le titre du combat affiche l'étape.
- **Schéma** : ajout compatible (`schemaVersion` reste à 1). Absent = `repos` ; une valeur inconnue est refusée à la lecture.
