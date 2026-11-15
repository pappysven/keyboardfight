# Progression : arbre de techniques

## Arbre

```
                 ┌── haute ──┬── maj-accents ──┐
repos ───────────┤           │                 ├── mots ── phrases
                 └── basse ──┴── chiffres ─────┘
```

- `repos` est la première étape, toujours disponible.
- `haute` et `basse` s'ouvrent après `repos`.
- `maj-accents` et `chiffres` s'ouvrent après `haute` **et** `basse`.
- `mots` s'ouvre après `maj-accents` **et** `chiffres`.
- `phrases` s'ouvre après `mots`.

## Étapes et touches (disposition AZERTY, Mac)

| Id | Étape | Touches / contenu | Prérequis |
|---|---|---|---|
| `repos` | Rangée de repos | `Q S D F` · `J K L M` · Espace. Repères : F et J (touches à relief). | — |
| `haute` | Rangée haute | `A Z E R T` · `Y U I O P` | `repos` |
| `basse` | Rangée basse | `W X C V B N` · `,` `;` | `repos` |
| `maj-accents` | Majuscules et accents | Maj + lettres ; accents `é è à ç` sur la rangée des chiffres ; accents composés (ê, ë, ô…) par touches mortes. | `haute`, `basse` |
| `chiffres` | Chiffres | `0` à `9` (rangée des chiffres, avec Maj sur AZERTY). | `haute`, `basse` |
| `mots` | Mots | Mots entiers issus des listes de révision. | `maj-accents`, `chiffres` |
| `phrases` | Phrases | Phrases courtes issues des listes de révision. | `mots` |

> Les touches du Mac cible (chiffres avec Maj, touches mortes des accents composés) restent à vérifier sur la machine réelle avant le lot « mots ».

## Critère de déblocage

Une étape se débloque lorsque **toutes ses prérequises** sont maîtrisées : **précision ≥ 90 % sur chacune des 3 dernières sessions** de la prérequise.

- Précision d'une session = touches justes / touches frappées (bonnes + fautes).
- Aucun critère de vitesse.
- Choix provisoire (D-016) : « 3 sessions » = les 3 dernières, consécutives. Reste à confirmer (question ouverte).
- Une étape débloquée ne se referme jamais.

## Enregistrement

- Une session est enregistrée à la fin du combat, sur l'étape travaillée. Aujourd'hui, c'est la rangée de repos, en attendant le choix d'étape.
- Une étape verrouillée ne reçoit pas de session.
- Seuls les agrégats sont stockés (durée non, frappes individuelles non) : voir docs/data-contracts.md et D-017.

## Déblocage et rejeu

- Une étape débloquée reste accessible : l'enfant peut la rejouer à tout moment.
- Un rejeu ne retire rien à la progression.
