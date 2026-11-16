import { h } from '../app/dom';
import type { Screen } from '../app/router';
import type { Difficulty, DisplayMode, RevisionList, Settings } from '../data/types';
import { addBlockedWord, normalizeWord, removeBlockedWord, MAX_WORD_LENGTH } from '../game/blocked-words';
import { emptyProgression } from '../game/progression';
import { createParentCode, PARENT_CODE_MIN_LENGTH, verifyParentCode } from '../parent/code';
import { loadBlockedWords, saveBlockedWords } from '../storage/blocked-repo';
import { loadRevisionLists, saveRevisionLists } from '../storage/revision-repo';
import { createList, DISPLAY_LABELS, DISPLAY_MODES, parseWordsInput, removeList } from '../game/revision';
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
    let lists: RevisionList[] = loadRevisionLists(store);
    let formMode: DisplayMode = 'affiche';
    // Saisie en cours de la liste : conservée entre deux rendus.
    let formName = '';
    let formWords = '';
    let codeCurrent = '';
    let codeNext = '';
    let codeConfirm = '';
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

    function revisionSection(): HTMLElement {
      const name = textInput({ type: 'text', autocomplete: 'off', 'aria-label': 'Nom de la liste', maxlength: '60' });
      name.value = formName;
      name.addEventListener('input', () => {
        formName = name.value;
      });
      const words = h('textarea', {
        className: 'input input--area',
        rows: '5',
        autocomplete: 'off',
        spellcheck: 'false',
        'aria-label': 'Mots, un par ligne ou séparés par des virgules',
      });
      words.value = formWords;
      words.addEventListener('input', () => {
        formWords = words.value;
      });
      return h(
        'section',
        { className: 'panel-section', 'aria-labelledby': 'h-lists' },
        h('h2', { className: 'section-title', id: 'h-lists' }, 'Listes de révision'),
        h(
          'form',
          {
            className: 'form',
            onSubmit: (e: Event) => {
              e.preventDefault();
              error = '';
              notice = '';
              const parsed = parseWordsInput(words.value);
              const title = name.value.trim();
              if (title === '') {
                error = 'Donne un nom à la liste.';
              } else if (parsed.words.length === 0) {
                error = 'Aucun mot valide (lettres, tiret, apostrophe ; 40 caractères max).';
              } else {
                lists = createList(
                  lists,
                  { id: `l-${Date.now().toString(36)}`, name: title, displayMode: formMode, words: parsed.words },
                  new Date().toISOString(),
                );
                saveRevisionLists(store, lists);
                formName = '';
                formWords = '';
                notice = parsed.rejected.length > 0
                  ? `Liste créée. ${parsed.rejected.length} saisie(s) refusée(s).`
                  : 'Liste créée.';
              }
              render();
            },
          },
          field('Nom', name),
          h('p', { className: 'label' }, 'Affichage du mot'),
          h(
            'div',
            { className: 'chips' },
            ...DISPLAY_MODES.map((m) =>
              h(
                'button',
                {
                  type: 'button',
                  className: 'btn btn--small',
                  'aria-pressed': String(formMode === m),
                  onClick: () => {
                    formMode = m;
                    render();
                  },
                },
                DISPLAY_LABELS[m],
              ),
            ),
          ),
          field('Mots', words),
          h('button', { className: 'btn btn--primary', type: 'submit' }, 'Créer la liste'),
        ),
        lists.length === 0
          ? h('p', { className: 'label' }, 'Aucune liste.')
          : h(
              'ul',
              { className: 'word-list' },
              ...lists.map((l) =>
                h(
                  'li',
                  { className: 'word-list__item' },
                  h('span', {}, `${l.name} · ${DISPLAY_LABELS[l.displayMode]} · ${l.words.length} mot(s)`),
                  h(
                    'button',
                    {
                      className: 'btn btn--small',
                      onClick: () => {
                        if (!window.confirm(`Supprimer la liste « ${l.name} » ?`)) return;
                        lists = removeList(lists, l.id);
                        saveRevisionLists(store, lists);
                        notice = 'Liste supprimée.';
                        error = '';
                        render();
                      },
                    },
                    'Supprimer',
                  ),
                ),
              ),
            ),
      );
    }

    /** Changement du code : il faut connaître l'ancien. Pas de récupération (D-018). */
    function codeSection(): HTMLElement {
      const current = textInput({ type: 'password', autocomplete: 'current-password', 'aria-label': 'Code actuel' });
      const next = textInput({ type: 'password', autocomplete: 'new-password', 'aria-label': 'Nouveau code' });
      const confirm = textInput({ type: 'password', autocomplete: 'new-password', 'aria-label': 'Confirmer le nouveau code' });
      // Les saisies survivent aux rendus (une erreur reconstruit la section).
      current.value = codeCurrent;
      next.value = codeNext;
      confirm.value = codeConfirm;
      current.addEventListener('input', () => {
        codeCurrent = current.value;
      });
      next.addEventListener('input', () => {
        codeNext = next.value;
      });
      confirm.addEventListener('input', () => {
        codeConfirm = confirm.value;
      });
      return h(
        'section',
        { className: 'panel-section', 'aria-labelledby': 'h-code' },
        h('h2', { className: 'section-title', id: 'h-code' }, 'Code parent'),
        h(
          'form',
          {
            className: 'form',
            onSubmit: (e: Event) => {
              e.preventDefault();
              void changeCode(current.value, next.value, confirm.value);
            },
          },
          field('Code actuel', current),
          field('Nouveau code', next),
          field('Confirme le nouveau code', confirm),
          h('button', { className: 'btn', type: 'submit' }, 'Changer le code'),
        ),
      );
    }

    async function changeCode(old: string, first: string, second: string): Promise<void> {
      error = '';
      notice = '';
      if (!settings.parentCode || !(await verifyParentCode(old, settings.parentCode))) {
        error = 'Code actuel incorrect.';
        return render();
      }
      if (first !== second) {
        error = 'Les deux nouveaux codes ne correspondent pas.';
        return render();
      }
      try {
        settings = { ...settings, parentCode: await createParentCode(first) };
        saveSettings(store, settings);
        codeCurrent = '';
        codeNext = '';
        codeConfirm = '';
        notice = 'Code changé.';
      } catch (e) {
        error = e instanceof Error ? e.message : 'Impossible de changer le code.';
      }
      render();
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
        revisionSection(),
        codeSection(),
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
