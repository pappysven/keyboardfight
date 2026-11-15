import { h } from '../app/dom';
import type { Screen } from '../app/router';
import { getLastSession, precision, type SessionStats } from '../game/session';

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
    const stats = getLastSession();
    const children: (HTMLElement | string)[] = [h('h1', { className: 'title' }, 'Résultat')];

    if (!stats) {
      children.push(h('p', { className: 'lead' }, 'Aucun combat à afficher. Lance une partie pour voir ton résultat.'));
    } else {
      children.push(
        h('p', { className: 'lead' }, message(stats)),
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
