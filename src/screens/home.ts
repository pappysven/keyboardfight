import { h } from '../app/dom';
import type { Screen } from '../app/router';
import { activeList, selectList } from '../game/selection';
import { DISPLAY_LABELS } from '../game/revision';
import { createAppStore } from '../storage/store';
import { loadRevisionLists } from '../storage/revision-repo';
import { loadSettings, saveSettings } from '../storage/settings-repo';
import { loadProgression } from '../storage/progression-repo';
import { TECHNIQUE_IDS, TECHNIQUE_LABELS } from '../game/progression';

export const homeScreen: Screen = {
  mount(root, navigate) {
    const store = createAppStore();
    const lists = loadRevisionLists(store);
    const settings = loadSettings(store);
    const progression = loadProgression(store, new Date().toISOString());
    const unlockedSteps = TECHNIQUE_IDS.filter((id) => progression.techniques[id].unlockedAt !== null);

    function render(): void {
      const current = activeList(lists, settings.defaultListId);
      root.replaceChildren(
        h(
          'main',
          { className: 'screen screen--home' },
          h('h1', { className: 'title' }, 'KeyboardFight'),
          h('p', { className: 'lead' }, 'Tape juste, puis frappe fort.'),
          h(
            'section',
            { className: 'panel-section', 'aria-labelledby': 'h-step' },
            h('h2', { className: 'section-title', id: 'h-step' }, 'Étape à travailler'),
            h(
              'div',
              { className: 'chips' },
              ...unlockedSteps.map((id) =>
                h(
                  'button',
                  {
                    className: 'btn btn--small',
                    'aria-pressed': String(settings.trainingTechnique === id),
                    onClick: () => {
                      settings.trainingTechnique = id;
                      saveSettings(store, settings);
                      render();
                    },
                  },
                  TECHNIQUE_LABELS[id],
                ),
              ),
            ),
          ),
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
                          settings.defaultListId = l.id;
                          saveSettings(store, settings);
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
