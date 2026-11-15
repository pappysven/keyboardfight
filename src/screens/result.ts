import { h } from '../app/dom';
import type { Screen } from '../app/router';

export const resultScreen: Screen = {
  mount(root, navigate) {
    root.append(
      h(
        'main',
        { className: 'screen screen--result' },
        h('h1', { className: 'title' }, 'Résultat'),
        h('p', { className: 'lead' }, 'Écran provisoire : les statistiques de session arrivent au lot suivant.'),
        h(
          'div',
          { className: 'actions' },
          h('button', { className: 'btn btn--primary', onClick: () => navigate('accueil') }, 'Retour à l’accueil'),
        ),
      ),
    );
    return () => {};
  },
};
