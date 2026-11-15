# AGENTS.md

Guide pour tout agent (Claude Code ou autre) et pour l'humain qui relit le projet.

## Rôles

| Acteur | Fait | Ne fait pas |
|---|---|---|
| **Claude Code** | Écrit le code et la documentation, lance le build et les tests, ouvre les PR vers `main`. | Merger. Décider seul du design ou de la pédagogie. |
| **Humain (propriétaire du projet)** | Décide du design, de la pédagogie et des réglages. Relit les PR et **merge**. | — |
| **GitHub Actions** | Build, tests, puis publication sur GitHub Pages à chaque push sur `main` (docs/deploy.md). | — |

Une PR est toujours ouverte vers `main`, avec le récapitulatif : ce qui est fait, ce qui reste, les questions ouvertes.

## Commandes

```bash
npm install          # dépendances (une fois, puis après chaque changement de package.json)
npm run dev          # serveur de dev → http://localhost:5173/keyboardfight/
npm run typecheck    # TypeScript strict, sans émission
npm test             # tests unitaires (Vitest)
npm run build        # typecheck + build de production dans dist/
npm run preview      # sert dist/ localement, pour vérifier le build
```

Avant chaque commit : `npm test` et `npm run build` doivent passer.

## Stack et conventions de code

- **Vite + TypeScript strict** (`strict`, `noUncheckedIndexedAccess`). Aucun `any` implicite ; pas de `as` pour contourner une erreur sans commentaire.
- **Sans framework.** HTML/CSS et DOM natif. Canvas seulement si l'arène l'exige, et alors décidé dans docs/decisions.md.
- **Pas de backend, pas de service tiers, pas de télémétrie.** Les polices sont auto-hébergées (`@fontsource`).
- **Dépendances minimales.** Toute nouvelle dépendance est justifiée dans docs/decisions.md.
- **Textes de l'interface en français**, avec accents et apostrophes typographiques.
- **Insertion de texte** uniquement via `textContent` (aide `h()` dans `src/app/dom.ts`). Jamais `innerHTML` avec une donnée.
- **Organisation** : `src/app` (routeur, aides DOM), `src/screens` (écrans), `src/sprites` (manifeste, rendu), `src/storage` (accès aux données), `src/data` (types des données), `src/game` (règles pures).
- **Logique pure testée** : la règle de combat, la validation des manifestes, le stockage. Les tests ne touchent jamais au stockage réel de l'appareil.
- **Tokens de design** : les couleurs passent par les variables CSS de `src/style.css` (docs/design.md).

## Vie privée (règles strictes)

1. **Aucune donnée de l'enfant ne sort de l'ordinateur.** Pas d'appel réseau pour des données, pas de logs distants, pas de capture envoyée à un service.
2. **Aucune liste de mots dans le dépôt.** Ni dans le code, ni dans les tests, ni dans la documentation. Les tests utilisent des chaînes fictives (`motA`, `test-1`).
3. **Aucun prénom ni statistique réelle** dans le dépôt, les exemples ou les captures.
4. **Sprites privés hors dépôt** : `/private/`, `/data/` et `public/sprites/*` (sauf `placeholder/`) sont ignorés par git (docs/decisions.md, D-007).
5. **Aucun secret.** Pas de clé, de jeton ou de mot de passe dans le code, les variables d'environnement ou la documentation.
6. **Code parent jamais en clair** : seulement un hachage (PBKDF2), voir docs/data-contracts.md.
7. **Pas de journal de frappe persisté** au-delà des agrégats de session (touches justes et frappées).

## Documentation à tenir à jour

| Fichier | Contenu | Quand le mettre à jour |
|---|---|---|
| `docs/pedagogie.md` | Principes TDAH et règles de combat | Règle de jeu ou principe changé |
| `docs/progression.md` | Arbre de techniques, touches, critères | Étape, touche ou critère changé |
| `docs/design.md` | Palette, typographie, sprites, manifeste | Token, format ou échelle changé |
| `docs/data-contracts.md` | Schémas des données locales | Tout changement de forme de donnée (+ `schemaVersion`) |
| `docs/decisions.md` | Journal des décisions | Tout choix structurant |
| `docs/deploy.md` | Publication GitHub Pages | Workflow ou base Vite changés |

## Procédure pour un lot

1. Lire les documents concernés et le journal des décisions.
2. Travailler sur la branche de travail indiquée par la session ; ne pousser que sur celle-ci.
3. Coder, tester, builder. Mettre à jour la documentation et `decisions.md` si un choix a été fait.
4. Ouvrir une PR vers `main` avec : ce qui est fait, ce qui reste, les questions ouvertes.
5. Ne jamais merger. Ne jamais contourner un test qui échoue.

## Ce qui ne se fait pas sans l'humain

- Merger une PR, modifier les réglages GitHub (Pages, branches protégées, secrets).
- Ajouter une donnée personnelle, un sprite à l'effigie d'une personne réelle, ou une liste de mots réelle.
- Changer une règle pédagogique (plancher de vie, seuil de 90 %, durée de session).
