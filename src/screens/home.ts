import { h } from '../app/dom';
import type { Screen } from '../app/router';

export const homeScreen: Screen = {
  mount(root, navigate) {
    root.append(
      h(
        'main',
        { className: 'screen screen--home' },
        h('h1', { className: 'title' }, 'KeyboardFight'),
        h('p', { className: 'lead' }, 'Tape juste, puis frappe fort.'),
        h(
          'div',
          { className: 'actions' },
          h('button', { className: 'btn btn--primary', onClick: () => navigate('combat') }, 'Jouer'),
          h('button', { className: 'btn', onClick: () => navigate('parent') }, 'Espace parent'),
        ),
      ),
    );
    return () => {};
  },
};
