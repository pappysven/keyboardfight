# Pédagogie et règles de combat

Public : un enfant de 9 ans, TDAH. Objectif : apprendre à taper au clavier et réviser l'orthographe de listes de mots, sans fatigue ni découragement.

## Principes TDAH

- **Sessions courtes** : 5 à 10 minutes (réglage parent, défaut 5 min). Une session se termine d'elle-même.
- **Pas de chrono punitif** : aucun compte à rebours, aucun « trop lent », aucune vitesse affichée comme une note.
- **Précision avant vitesse** : un mot juste mais lent vaut mieux qu'un mot rapide et faux. Le PERFECT ne tient pas compte du temps.
- **Pause proposée** : à la fin de la durée choisie, le jeu propose une pause. Elle n'est jamais imposée ni bloquante ; continuer ne retire rien.
- **Aucune distraction pendant la saisie** :
  - pas de notification, de pop-up, de son non demandé ;
  - pas d'animation en dehors de l'arène de combat ;
  - le retour sur chaque touche reste court et visuel, dans l'arène ;
  - le focus ne quitte jamais la zone de saisie.
- **Pas de honte** : un message d'erreur reste neutre et encourageant. L'erreur a une conséquence de jeu (la riposte), pas un jugement.
- **Progression par critère, pas par temps** : une étape se débloque sur la précision (voir docs/progression.md).

## Règles de combat

Le combat est un jeu de combat en pixel art vu de côté. Chaque bonne touche est un coup.

| Élément | Règle |
|---|---|
| **Coup** | Chaque bonne touche porte un coup à l'adversaire. |
| **Combo** | 5 bonnes touches rapides d'affilée font un combo. Une faute coupe le combo. « Rapide » = intervalle entre deux bonnes touches ≤ 1,2 s (valeur provisoire, D-012). |
| **PERFECT** | Un mot tapé entièrement sans aucune faute. Indépendant de la vitesse. |
| **Riposte** | Une erreur déclenche une riposte de l'adversaire, qui retire 10 % des PV max à l'enfant (valeur provisoire, D-013). |
| **Plancher de vie** | La vie de l'enfant ne descend jamais sous le plancher de sa difficulté (ci-dessous). |

### Plancher de vie par difficulté

| Difficulté | Plancher | Conséquence |
|---|---|---|
| **Facile** | 25 % des PV max | L'enfant ne peut pas perdre. |
| **Moyen** | 0 % | Une défaite est possible. |
| **Difficile** | 0 % | Une défaite est possible. |

Implémentation : `src/game/difficulty.ts` (`hpFloor`, `applyRiposte`), couverte par des tests. Moteur de combat : `src/game/combat.ts` (D-014).

### Défaite

Possible seulement en moyen et difficile, quand une riposte amène la vie à 0. Le combat s'arrête alors et l'écran de résultat s'affiche, avec un message encourageant : « Tu as tenu bon. On recommence quand tu veux. » Aucune touche n'a plus d'effet. En facile, la défaite n'arrive jamais (D-015).

### Résultat

L'écran de résultat montre la précision, le nombre de mots, les PERFECT et les combos de la session. Il ne montre aucune vitesse ni aucun temps. Les statistiques restent en mémoire : aucune donnée n'est enregistrée pour l'instant (D-015).
