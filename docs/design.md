# Design

## Palette

Toutes les couleurs passent par des tokens CSS sur `:root` (`src/style.css`). Pas de couleur en dur ailleurs.

| Token | Hex | Usage | Contraste sur le fond |
|---|---|---|---|
| `--color-bg` | `#14122b` | Fond de page | — |
| `--color-panel` | `#23204a` | Panneaux, arène | — |
| `--color-panel-edge` | `#3b3778` | Bordures | — |
| `--color-ink` | `#f4f1de` | Texte principal | 16,1 : 1 |
| `--color-muted` | `#b8b4dc` | Texte secondaire | 9,2 : 1 |
| `--color-primary` | `#5be38a` | Action principale, bonne touche | 11,1 : 1 |
| `--color-danger` | `#ff7b7b` | Riposte, dégâts | 7,3 : 1 |
| `--color-gold` | `#ffd166` | Titres, PERFECT, focus | 12,7 : 1 |
| `--color-info` | `#6ec6ff` | Libellés HUD, survol | 9,7 : 1 |

Tous les textes atteignent au moins 7 : 1 (niveau AAA). Le thème est sombre uniquement.

## Typographie

| Usage | Police | Source |
|---|---|---|
| HUD, titres, libellés de combat | **Press Start 2P** | `@fontsource/press-start-2p` (auto-hébergée) |
| Textes, consignes, boutons | **Atkinson Hyperlegible** | `@fontsource/atkinson-hyperlegible` (auto-hébergée) |

- Corps de texte : 18 px (17 px sur petit écran). Boutons : 1,05 rem minimum, 56 px de hauteur minimum.
- Les polices sont servies depuis le site : aucune requête vers un CDN.

## Sprites

- Pixel art, cadres natifs (par exemple 32 × 32).
- Affichage **× 3** (96 × 96 px pour un cadre 32 × 32).
- `image-rendering: pixelated` ; aucun lissage ; facteur d'échelle entier uniquement.
- Constante : `SPRITE_SCALE` dans `src/sprites/sprite.ts`.

## Manifeste de personnage

Un personnage = un dossier `public/sprites/<id>/` contenant :

- `manifest.json` (ce document) ;
- une ou plusieurs planches PNG référencées par le manifeste.

Le jeu charge `sprites/placeholder/manifest.json` aujourd'hui. Pour changer de personnage, on change seulement le chemin du manifeste : le code ne change pas.

### Format

```json
{
  "schemaVersion": 1,
  "id": "placeholder",
  "name": "Provisoire (rectangles)",
  "poses": {
    "idle": {
      "sheet": "sheet.png",
      "frameCount": 2,
      "frameDuration": 400,
      "frames": [
        { "x": 0,  "y": 0, "w": 32, "h": 32 },
        { "x": 32, "y": 0, "w": 32, "h": 32 }
      ]
    }
  }
}
```

Les sept poses sont **toutes obligatoires** : `idle`, `punch`, `kick`, `special`, `hit`, `win`, `ko`.

| Champ | Type | Règle |
|---|---|---|
| `schemaVersion` | `1` | Seule la version 1 est connue. |
| `id` | texte | Identifiant du personnage, unique. |
| `name` | texte | Nom affiché (texte alternatif de l'image). |
| `poses.<pose>.sheet` | texte | Planche PNG, chemin **relatif** au manifeste (pas de `/` initial, pas de `..`, pas d'URL). |
| `poses.<pose>.frameCount` | entier ≥ 1 | Doit être égal au nombre d'éléments de `frames`. |
| `poses.<pose>.frameDuration` | entier ≥ 1 | Durée d'**une** image, en millisecondes. |
| `poses.<pose>.frames[]` | liste | Un rectangle `{x, y, w, h}` par image, en pixels de la planche. `x` et `y` ≥ 0 ; `w` et `h` ≥ 1. |

Une incohérence provoque une erreur précise à l'exécution (`ManifestError`), affichée sur l'écran de combat. Le code de validation est dans `src/sprites/manifest.ts`, couvert par des tests.

### Sens des poses

Implémenté dans `src/screens/fight.ts` (fonction `animate`).

| Pose | Quand | Durée |
|---|---|---|
| `idle` | Repos, en attente de la saisie. Retour après chaque pose courte. | — |
| `punch` | Bonne touche : le personnage frappe. Après une faute : l'adversaire riposte. | 250 ms (personnage) / 300 ms (adversaire) |
| `special` | Combo : bonnes touches rapides d'affilée. | 600 ms |
| `hit` | Riposte : le personnage est touché. | 300 ms |
| `ko` | Défaite : le personnage reste au KO. | jusqu'à la fin |
| `kick`, `win` | Pas encore branchées (victoire et coups de pied : lot suivant). | — |

### Sprites privés

Un personnage basé sur une personne réelle **ne va jamais dans le dépôt**. Le `.gitignore` exclut `public/sprites/*` sauf `placeholder/`. Voir docs/decisions.md (D-007).

## Placeholder

Le personnage provisoire (`public/sprites/placeholder/`) est une planche PNG de rectangles colorés, générée une fois. Il sert à valider le chargeur, pas à montrer le graphisme définitif.
