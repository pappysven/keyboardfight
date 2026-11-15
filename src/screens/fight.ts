import { h } from '../app/dom';
import type { Screen } from '../app/router';
import { createSpriteView, type SpriteView } from '../sprites/sprite';
import { loadManifest, POSE_NAMES, type LoadedManifest } from '../sprites/manifest';

/**
 * Écran de combat : squelette seulement. La logique de frappe arrive au lot suivant.
 * Affiche les deux sprites provisoires et un sélecteur de poses pour vérifier le chargeur.
 */
export const fightScreen: Screen = {
  mount(root, navigate) {
    let player: SpriteView | undefined;
    let opponent: SpriteView | undefined;
    let cancelled = false;

    const status = h('p', { className: 'status', role: 'status' }, 'Chargement du personnage…');
    const stage = h('div', { className: 'arena' });
    const poseBar = h(
      'div',
      { className: 'pose-bar', 'aria-label': 'Poses de test' },
      ...POSE_NAMES.map((pose) =>
        h('button', {
          className: 'btn btn--small',
          onClick: () => player?.setPose(pose),
        }, pose),
      ),
    );

    root.append(
      h(
        'main',
        { className: 'screen screen--fight' },
        h('p', { className: 'hud' }, 'COMBAT'),
        stage,
        status,
        poseBar,
        h(
          'div',
          { className: 'actions' },
          h('button', { className: 'btn btn--primary', onClick: () => navigate('resultat') }, 'Terminer (provisoire)'),
          h('button', { className: 'btn', onClick: () => navigate('accueil') }, 'Retour'),
        ),
      ),
    );

    const url = new URL(`${import.meta.env.BASE_URL}sprites/placeholder/manifest.json`, window.location.href);
    loadManifest(url)
      .then((loaded: LoadedManifest) => {
        if (cancelled) return;
        player = createSpriteView(loaded, 'idle');
        opponent = createSpriteView(loaded, 'idle', { flip: true });
        stage.append(player.el, opponent.el);
        status.textContent = `Personnage : ${loaded.manifest.name}`;
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        status.textContent = `Impossible de charger le personnage. ${message}`;
      });

    return () => {
      cancelled = true;
      player?.destroy();
      opponent?.destroy();
    };
  },
};
