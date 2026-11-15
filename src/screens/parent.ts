import { h } from '../app/dom';
import type { Screen } from '../app/router';

export const parentScreen: Screen = {
  mount(root, navigate) {
    root.append(
      h(
        'main',
        { className: 'screen screen--parent' },
        h('h1', { className: 'title' }, 'Espace parent'),
        h(
          'p',
          { className: 'lead' },
          'Écran provisoire. La protection par code et les réglages arrivent au lot suivant.',
        ),
        h(
          'div',
          { className: 'actions' },
          h('button', { className: 'btn', onClick: () => navigate('accueil') }, 'Retour'),
        ),
      ),
    );
    return () => {};
  },
};
