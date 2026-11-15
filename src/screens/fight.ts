import { h } from '../app/dom';
import type { Screen } from '../app/router';
import { startCombat, nextWord, keystroke, type CombatEvent, type CombatState } from '../game/combat';
import type { Difficulty } from '../data/types';
import { createSpriteView, type SpriteView } from '../sprites/sprite';
import { loadManifest, POSE_NAMES, type LoadedManifest } from '../sprites/manifest';

/** Réglages provisoires tant que l'espace parent n'existe pas. */
const DIFFICULTY: Difficulty = 'facile';
const MAX_HP = 100;
/** Mot de démonstration fictif : aucune liste réelle dans le dépôt (AGENTS.md). */
const DEMO_WORD = 'abcd';

export const fightScreen: Screen = {
  mount(root, navigate) {
    let player: SpriteView | undefined;
    let opponent: SpriteView | undefined;
    let cancelled = false;
    let state: CombatState = startCombat(DIFFICULTY, MAX_HP, DEMO_WORD);

    const status = h('p', { className: 'status', role: 'status' }, 'Chargement du personnage…');
    const stage = h('div', { className: 'arena' });
    const hpFill = h('div', { className: 'hp__fill' });
    const hp = h('div', { className: 'hp', 'aria-label': 'Vie' }, hpFill);
    const word = h('p', { className: 'word', 'aria-live': 'off' });
    const feedback = h('p', { className: 'feedback', role: 'status' }, ' ');
    const poseBar = h(
      'div',
      { className: 'pose-bar', 'aria-label': 'Poses de test' },
      ...POSE_NAMES.map((pose) =>
        h('button', { className: 'btn btn--small', onClick: () => player?.setPose(pose) }, pose),
      ),
    );

    root.append(
      h(
        'main',
        { className: 'screen screen--fight' },
        h('p', { className: 'hud' }, 'COMBAT'),
        stage,
        hp,
        word,
        feedback,
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

    function render(): void {
      const typed = state.target.slice(0, state.index);
      const rest = state.target.slice(state.index);
      word.replaceChildren(
        h('span', { className: 'word__done' }, typed),
        h('span', { className: 'word__todo' }, rest),
      );
      hpFill.style.width = `${(state.hp / state.maxHp) * 100}%`;
    }

    function announce(events: CombatEvent[]): void {
      for (const event of events) {
        if (event.type === 'riposte') feedback.textContent = 'Riposte ! Un peu de vie en moins.';
        else if (event.type === 'combo') feedback.textContent = 'COMBO !';
        else if (event.type === 'word-done') {
          feedback.textContent = event.perfect ? 'PERFECT !' : 'Mot terminé. Bien joué.';
        }
      }
    }

    function onKeydown(event: KeyboardEvent): void {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key.length !== 1) return;
      const step = keystroke(state, event.key, performance.now());
      state = step.state;
      announce(step.events);
      if (step.events.some((e) => e.type === 'word-done')) {
        state = nextWord(state, DEMO_WORD);
      }
      render();
    }

    render();
    window.addEventListener('keydown', onKeydown);

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
      window.removeEventListener('keydown', onKeydown);
      player?.destroy();
      opponent?.destroy();
    };
  },
};
