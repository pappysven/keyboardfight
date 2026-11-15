import { h } from '../app/dom';
import type { Screen } from '../app/router';
import { getLastSession, precision, type SessionStats } from '../game/session';
import { TECHNIQUE_LABELS } from '../game/progression';

/** Message encourageant : jamais de jugement sur la vitesse. */
function message(stats: SessionStats): string {
  if (stats.defeat) return 'Tu as tenu bon. On recommence quand tu veux.';
  if (stats.perfects > 0) return 'Des mots sans faute : c’est exactement ce qu’on cherche.';
  return 'Bonne session. Chaque touche juste compte.';
}

function stat(label: string, value: string): HTMLElement {
  return h('div', { className: 'stat' }, h('span', { className: 'stat__value' }, value), h('span', { className: 'stat__label' }, label));
}

export const resultScreen: Screen = {
  mount(root, navigate) {
    const result = getLastSession();
    const children: (HTMLElement | string | null)[] = [h('h1', { className: 'title' }, 'Résultat')];

    if (!result) {
      children.push(h('p', { className: 'lead' }, 'Aucun combat à afficher. Lance une partie pour voir ton résultat.'));
    } else {
      const stats = result.stats;
      children.push(
        h('p', { className: 'lead' }, message(stats)),
        result.unlocked.length > 0
          ? h(
              'p',
              { className: 'unlock', role: 'status' },
              `Nouvelle étape débloquée : ${result.unlocked.map((id) => TECHNIQUE_LABELS[id]).join(', ')}`,
            )
          : null,
        h(
          'div',
          { className: 'stats' },
          stat('Précision', `${Math.round(precision(stats) * 100)} %`),
          stat('Mots', String(stats.words)),
          stat('PERFECT', String(stats.perfects)),
          stat('Combos', String(stats.combos)),
        ),
      );
    }

    children.push(
      h(
        'div',
        { className: 'actions' },
        h('button', { className: 'btn btn--primary', onClick: () => navigate('combat') }, 'Rejouer'),
        h('button', { className: 'btn', onClick: () => navigate('accueil') }, 'Retour à l’accueil'),
      ),
    );

    root.append(h('main', { className: 'screen screen--result' }, ...children));
    return () => {};
  },
};
