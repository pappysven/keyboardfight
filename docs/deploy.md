# Déploiement

L'appli est publiée sur **GitHub Pages**, à l'adresse : `https://pappysven.github.io/keyboardfight/`.

## Fonctionnement

1. Un push sur `main` (en pratique : le merge d'une PR) lance `.github/workflows/deploy.yml`.
2. Le workflow installe les dépendances (`npm ci`), lance les tests (`npm test`) et le build (`npm run build`).
3. Le dossier `dist/` est publié sur GitHub Pages.

Si les tests ou le build échouent, rien n'est publié.

## Réglage initial du dépôt (une seule fois)

Dans GitHub : **Settings → Pages → Build and deployment → Source : GitHub Actions**.

Sans ce réglage, le job `deploy` échoue.

## Base Vite

`vite.config.ts` fixe `base: '/keyboardfight/'`. Tous les chemins générés (scripts, polices, sprites) commencent donc par `/keyboardfight/`.

Si le dépôt est renommé, changer cette valeur **et** l'URL ci-dessus.

## Vérifier en local

```bash
npm run build
npm run preview
```

Puis ouvrir l'adresse affichée par `vite preview`, qui inclut le préfixe `/keyboardfight/`.

## Dépannage

| Symptôme | Cause probable |
|---|---|
| Page blanche, scripts en 404 | `base` différent du nom du dépôt. |
| Job `deploy` en erreur « Pages not enabled » | Réglage Settings → Pages non fait (voir ci-dessus). |
| Sprites absents en ligne | Le dossier `public/sprites/placeholder/` n'est pas suivi par git (vérifier le `.gitignore`). |
