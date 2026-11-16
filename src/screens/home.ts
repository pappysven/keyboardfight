import { h } from '../app/dom';
import type { Screen } from '../app/router';
import { activeList, selectList } from '../game/selection';
import { DISPLAY_LABELS } from '../game/revision';
import { createAppStore } from '../storage/store';
import { loadRevisionLists } from '../storage/revision-repo';

export const homeScreen: Screen = {
  mount(root, navigate) {
    const lists = loadRevisionLists(createAppStore());

    function render(): void {
      const current = activeList(lists);
      root.replaceChildren(
        h(
          'main',
          { className: 'screen screen--home' },
          h('h1', { className: 'title' }, 'KeyboardFight'),
          h('p', { className: 'lead' }, 'Tape juste, puis frappe fort.'),
          lists.length > 0
            ? h(
                'section',
                { className: 'panel-section', 'aria-labelledby': 'h-choice' },
                h('h2', { className: 'section-title', id: 'h-choice' }, 'Liste à jouer'),
                h(
                  'div',
                  { className: 'chips' },
                  ...lists.map((l) =>
                    h(
                      'button',
                      {
                        className: 'btn btn--small',
                        'aria-pressed': String(current?.id === l.id),
                        onClick: () => {
                          selectList(l.id);
                          render();
                        },
                      },
                      `${l.name} · ${DISPLAY_LABELS[l.displayMode]}`,
                    ),
                  ),
                ),
              )
            : h('p', { className: 'lead' }, 'Aucune liste : le combat utilise un mot de démonstration.'),
          h(
            'div',
            { className: 'actions' },
            h('button', { className: 'btn btn--primary', onClick: () => navigate('combat') }, 'Jouer'),
            h('button', { className: 'btn', onClick: () => navigate('parent') }, 'Espace parent'),
          ),
        ),
      );
    }

    render();
    return () => {};
  },
};
