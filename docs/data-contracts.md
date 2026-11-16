# Contrats de données locales

Toutes les données vivent dans le navigateur de l'enfant (localStorage). Rien n'est envoyé ailleurs.

## Stockage

| Élément | Valeur |
|---|---|
| Backend | `localStorage`, repli sur mémoire volatile si bloqué (`src/storage/store.ts`) |
| Préfixe des clés | `kf.` |
| Enveloppe | `{ "schemaVersion": 1, "data": … }` |

- Une clé dont le `schemaVersion` ne correspond pas à la version courante est traitée comme **absente**. Toute évolution incompatible doit ajouter une migration avant d'incrémenter la version.
- Une lecture illisible (JSON cassé, forme inattendue) renvoie également « absente ». Aucune erreur n'est affichée à l'enfant.
- Les écritures peuvent échouer (quota, stockage bloqué) : l'appelant reçoit `false`.

## Clés

| Clé | Contenu | Type TypeScript |
|---|---|---|
| `kf.profile` | Profil local | `Profile` |
| `kf.settings` | Réglages, dont le code parent haché | `Settings` |
| `kf.progression` | Arbre de techniques et sessions | `Progression` |
| `kf.blocked-words` | Mots bloqués | `BlockedWords` |
| `kf.revision-lists` | Listes de révision | `RevisionLists` |

Les types sont dans `src/data/types.ts`. Ce fichier est la référence de code ; ce document est la référence humaine.

## Profil — `kf.profile`

```json
{
  "schemaVersion": 1,
  "data": {
    "displayName": "Prénom",
    "createdAt": "2026-11-15T18:00:00.000Z"
  }
}
```

- `displayName` : texte court, saisi par le parent. Jamais utilisé dans une requête.

## Réglages — `kf.settings`

```json
{
  "schemaVersion": 1,
  "data": {
    "difficulty": "facile",
    "sessionMinutes": 5,
    "proposePause": true,
    "parentCode": null,
    "defaultListId": null,
    "trainingTechnique": "repos",
    "soundEnabled": true
  }
}
```

- `difficulty` : `"facile"` | `"moyen"` | `"difficile"` (plancher de vie, voir docs/pedagogie.md).
- `soundEnabled` : bruitages du combat, `true` par défaut ; une donnée sans ce champ se lit comme `true` (D-031).
- `trainingTechnique` : étape travaillée (`TechniqueId`), `"repos"` par défaut (D-028).
- `defaultListId` : identifiant de la liste jouée par défaut (`null` = la première). Champ ajouté sans changer la version : une donnée sans ce champ se lit comme `null` (D-026).
- `sessionMinutes` : `5` | `10`.
- `parentCode` : `null` tant que le code n'est pas défini. Sinon :
  ```json
  { "algo": "PBKDF2-SHA256", "iterations": 310000, "salt": "<base64>", "hash": "<base64>" }
  ```
  **Le code parent n'est jamais stocké en clair.** Hachage PBKDF2-SHA256, 310 000 itérations, sel de 16 octets. Code de 4 caractères minimum.

## Progression — `kf.progression`

```json
{
  "schemaVersion": 1,
  "data": {
    "techniques": {
      "repos":      { "unlockedAt": "2026-11-15T18:00:00.000Z", "sessions": [] },
      "haute":      { "unlockedAt": null, "sessions": [] },
      "basse":      { "unlockedAt": null, "sessions": [] },
      "maj-accents":{ "unlockedAt": null, "sessions": [] },
      "chiffres":   { "unlockedAt": null, "sessions": [] },
      "mots":       { "unlockedAt": null, "sessions": [] },
      "phrases":    { "unlockedAt": null, "sessions": [] }
    }
  }
}
```

Chaque session enregistrée :

```json
{ "endedAt": "2026-11-15T18:12:00.000Z", "keystrokes": 84, "correct": 79, "precision": 0.94 }
```

- `precision` = `correct / keystrokes`, entre 0 et 1, arrondie à 2 décimales.
- Pas de durée ni de score « vitesse » : la précision est la seule mesure qui décide du déblocage.
- Les identifiants d'étape : voir `TechniqueId` dans `src/data/types.ts` et docs/progression.md.

## Mots bloqués — `kf.blocked-words`

```json
{
  "schemaVersion": 1,
  "data": {
    "entries": [
      { "word": "exemple", "reason": "parent", "addedAt": "2026-11-15T18:00:00.000Z" }
    ]
  }
}
```

- `reason` : `"parent"` (ajouté par le parent) ou `"auto"` (ajouté par le jeu après des erreurs répétées ; le seuil reste à définir).
- Un mot bloqué n'apparaît pas dans les exercices de l'enfant.

## Listes de révision — `kf.revision-lists`

```json
{
  "schemaVersion": 1,
  "data": {
    "lists": [
      {
        "id": "liste-1",
        "name": "Semaine du 16",
        "displayMode": "cache-3s",
        "words": ["mot1", "mot2"],
        "createdAt": "2026-11-15T18:00:00.000Z"
      }
    ]
  }
}
```

`displayMode` :

| Valeur | Affichage | Usage |
|---|---|---|
| `"affiche"` | Le mot reste visible pendant la frappe | Premiers pas, mots nouveaux |
| `"cache-3s"` | Le mot est visible 3 secondes, puis masqué | Mémorisation de l'orthographe |
| `"dictee"` | Le mot n'est jamais affiché ; il est lu par la voix du Mac (D-024) | Dictée |

- Les mots de l'enfant ne sont jamais copiés dans le dépôt, ni dans les tests, ni dans la documentation. Les tests utilisent des chaînes fictives.
