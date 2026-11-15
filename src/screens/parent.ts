import { h } from '../app/dom';
import type { Screen } from '../app/router';
import type { Difficulty, Settings } from '../data/types';
import { addBlockedWord, normalizeWord, removeBlockedWord, MAX_WORD_LENGTH } from '../game/blocked-words';
import { emptyProgression } from '../game/progression';
import { createParentCode, PARENT_CODE_MIN_LENGTH, verifyParentCode } from '../parent/code';
import { loadBlockedWords, saveBlockedWords } from '../storage/blocked-repo';
import { loadSettings, saveSettings } from '../storage/settings-repo';
import { saveProgression } from '../storage/progression-repo';
import { createAppStore, type Store } from '../storage/store';

/**
 * Déverrouillage valable pour une visite seulement : quitter l'écran re-verrouille.
 * Module-level : l'état ne survit pas au rechargement de la page.
 */
let unlocked = false;

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  facile: 'Facile',
  moyen: 'Moyen',
  difficile: 'Difficile',
};
const DIFFICULTIES: readonly Difficulty[] = ['facile', 'moyen', 'difficile'];

export const parentScreen: Screen = {
  mount(root, navigate) {
    let active = true;
    const store: Store = createAppStore();
    let settings: Settings = loadSettings(store);
    let blocked = loadBlockedWords(store);
    let error = '';
    let notice = '';

    function render(): void {
      if (!active) return;
      root.replaceChildren(view());
    }

    function message(): HTMLElement[] {
      const out: HTMLElement[] = [];
      if (error) out.push(h('p', { className: 'error', role: 'alert' }, error));
      if (notice) out.push(h('p', { className: 'notice', role: 'status' }, notice));
      return out;
    }

    function field(label: string, input: HTMLElement): HTMLElement {
      return h('label', { className: 'field' }, h('span', { className: 'field__label' }, label), input);
    }

    function textInput(attrs: Record<string, string>): HTMLInputElement {
      return h('input', { className: 'input', ...attrs });
    }

    /** Première visite : création du code. */
    function setupView(): HTMLElement[] {
      const code = textInput({ type: 'password', autocomplete: 'new-password', 'aria-label': 'Nouveau code' });
      const confirm = textInput({ type: 'password', autocomplete: 'new-password', 'aria-label': 'Confirmer le code' });
      return [
        h('p', { className: 'lead' }, `Crée un code parent (au moins ${PARENT_CODE_MIN_LENGTH} caractères) pour protéger cet espace.`),
        h(
          'form',
          {
            className: 'form',
            onSubmit: (e: Event) => {
              e.preventDefault();
              void create(code.value, confirm.value);
            },
          },
          field('Code', code),
          field('Confirme le code', confirm),
          h('button', { className: 'btn btn--primary', type: 'submit' }, 'Créer le code'),
        ),
        ...message(),
      ];
    }

    async function create(first: string, second: string): Promise<void> {
      error = '';
      notice = '';
      if (first !== second) {
        error = 'Les deux codes ne correspondent pas.';
        return render();
      }
      try {
        const parentCode = await createParentCode(first);
        settings = { ...settings, parentCode };
        saveSettings(store, settings);
        unlocked = true;
        notice = 'Code créé.';
      } catch (e) {
        error = e instanceof Error ? e.message : 'Impossible de créer le code.';
      }
      render();
    }

    /** Visites suivantes : saisie du code. */
    function lockView(): HTMLElement[] {
      const code = textInput({ type: 'password', autocomplete: 'current-password', 'aria-label': 'Code parent' });
      return [
        h('p', { className: 'lead' }, 'Saisis le code parent pour continuer.'),
        h(
          'form',
          {
            className: 'form',
            onSubmit: (e: Event) => {
              e.preventDefault();
              void unlock(code.value);
            },
          },
          field('Code', code),
          h('button', { className: 'btn btn--primary', type: 'submit' }, 'Déverrouiller'),
        ),
        ...message(),
      ];
    }

    async function unlock(value: string): Promise<void> {
      error = '';
      notice = '';
      if (!settings.parentCode) return render();
      const ok = await verifyParentCode(value, settings.parentCode);
      if (ok) {
        unlocked = true;
      } else {
        error = 'Code incorrect.';
      }
      render();
    }

    function updateSettings(next: Settings): void {
      settings = next;
      saveSettings(store, settings);
      error = '';
      notice = 'Réglages enregistrés.';
      render();
    }

    function settingsSection(): HTMLElement {
      return h(
        'section',
        { className: 'panel-section', 'aria-labelledby': 'h-settings' },
        h('h2', { className: 'section-title', id: 'h-settings' }, 'Réglages'),
        h(
          'p',
          { className: 'label' },
          'Difficulté',
        ),
        h(
          'div',
          { className: 'chips' },
          ...DIFFICULTIES.map((d) =>
            h(
              'button',
              {
                className: 'btn btn--small',
                'aria-pressed': String(settings.difficulty === d),
                onClick: () => updateSettings({ ...settings, difficulty: d }),
              },
              DIFFICULTY_LABELS[d],
            ),
          ),
        ),
        h('p', { className: 'label' }, 'Durée d’une session'),
        h(
          'div',
          { className: 'chips' },
          ...([5, 10] as const).map((minutes) =>
            h(
              'button',
              {
                className: 'btn btn--small',
                'aria-pressed': String(settings.sessionMinutes === minutes),
                onClick: () => updateSettings({ ...settings, sessionMinutes: minutes }),
              },
              `${minutes} min`,
            ),
          ),
        ),
        h(
          'label',
          { className: 'toggle' },
          h('input', {
            type: 'checkbox',
            checked: settings.proposePause,
            onChange: (e: Event) =>
              updateSettings({ ...settings, proposePause: (e.target as HTMLInputElement).checked }),
          }),
          h('span', {}, 'Proposer une pause à la fin de la session'),
        ),
      );
    }

    function blockedSection(): HTMLElement {
      const word = textInput({
        type: 'text',
        autocomplete: 'off',
        autocapitalize: 'off',
        spellcheck: 'false',
        maxlength: String(MAX_WORD_LENGTH),
        'aria-label': 'Mot à bloquer',
      });
      return h(
        'section',
        { className: 'panel-section', 'aria-labelledby': 'h-blocked' },
        h('h2', { className: 'section-title', id: 'h-blocked' }, 'Mots bloqués'),
        h(
          'p',
          { className: 'label' },
          'Lettres, tiret et apostrophe seulement. Les exercices n’utilisent pas encore cette liste.',
        ),
        h(
          'form',
          {
            className: 'form form--row',
            onSubmit: (e: Event) => {
              e.preventDefault();
              const normalized = normalizeWord(word.value);
              error = '';
              notice = '';
              if (!normalized) {
                error = 'Saisie non valide.';
              } else {
                blocked = addBlockedWord(blocked, normalized, new Date().toISOString());
                saveBlockedWords(store, blocked);
                notice = 'Mot bloqué.';
              }
              render();
            },
          },
          word,
          h('button', { className: 'btn', type: 'submit' }, 'Bloquer'),
        ),
        blocked.length === 0
          ? h('p', { className: 'label' }, 'Aucun mot bloqué.')
          : h(
              'ul',
              { className: 'word-list' },
              ...blocked.map((entry) =>
                h(
                  'li',
                  { className: 'word-list__item' },
                  h('span', {}, entry.word),
                  h(
                    'button',
                    {
                      className: 'btn btn--small',
                      onClick: () => {
                        blocked = removeBlockedWord(blocked, entry.word);
                        saveBlockedWords(store, blocked);
                        notice = 'Mot débloqué.';
                        error = '';
                        render();
                      },
                    },
                    'Débloquer',
                  ),
                ),
              ),
            ),
      );
    }

    function progressionSection(): HTMLElement {
      return h(
        'section',
        { className: 'panel-section', 'aria-labelledby': 'h-progress' },
        h('h2', { className: 'section-title', id: 'h-progress' }, 'Progression'),
        h('p', { className: 'label' }, 'Efface les étapes débloquées et les sessions. Irréversible.'),
        h(
          'button',
          {
            className: 'btn btn--danger',
            onClick: () => {
              if (!window.confirm('Remettre toute la progression à zéro ?')) return;
              saveProgression(store, emptyProgression(new Date().toISOString()));
              error = '';
              notice = 'Progression remise à zéro.';
              render();
            },
          },
          'Remettre à zéro',
        ),
      );
    }

    function panelView(): HTMLElement[] {
      return [
        settingsSection(),
        blockedSection(),
        progressionSection(),
        h(
          'div',
          { className: 'actions' },
          h(
            'button',
            {
              className: 'btn',
              onClick: () => {
                unlocked = false;
                render();
              },
            },
            'Verrouiller',
          ),
        ),
        ...message(),
      ];
    }

    function view(): HTMLElement {
      const body = !settings.parentCode ? setupView() : unlocked ? panelView() : lockView();
      return h(
        'main',
        { className: 'screen screen--parent' },
        h('h1', { className: 'title' }, 'Espace parent'),
        ...body,
        h('div', { className: 'actions' }, h('button', { className: 'btn', onClick: () => navigate('accueil') }, 'Retour à l’accueil')),
      );
    }

    render();
    return () => {
      active = false;
      unlocked = false;
    };
  },
};
