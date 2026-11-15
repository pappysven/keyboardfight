import { h } from '../app/dom';
import type { Screen } from '../app/router';
import { startCombat, nextWord, keystroke, type CombatEvent, type CombatState } from '../game/combat';
import { accumulate, emptySession, setLastSession, toSessionRecord, type SessionStats } from '../game/session';
import { recordSession } from '../game/progression';
import { createAppStore } from '../storage/store';
import { loadSettings } from '../storage/settings-repo';
import { loadProgression, saveProgression } from '../storage/progression-repo';
import { createSpriteView, type SpriteView } from '../sprites/sprite';
import { loadManifest, POSE_NAMES, type LoadedManifest } from '../sprites/manifest';

const MAX_HP = 100;
/** Mot de démonstration fictif : aucune liste réelle dans le dépôt (AGENTS.md). */
const DEMO_WORD = 'abcd';
/** Étape travaillée tant que le choix d'étape n'existe pas. */
const TRAINING_TECHNIQUE = 'repos' as const;

export const fightScreen: Screen = {
  mount(root, navigate) {
    let player: SpriteView | undefined;
    let opponent: SpriteView | undefined;
    let cancelled = false;
    const settings = loadSettings(createAppStore());
    let state: CombatState = startCombat(settings.difficulty, MAX_HP, DEMO_WORD);
    let stats: SessionStats = emptySession();
    let pauseTimer: number | undefined;

    const status = h('p', { className: 'status', role: 'status' }, 'Chargement du personnage…');
    const stage = h('div', { className: 'arena' });
    const hpFill = h('div', { className: 'hp__fill' });
    const hp = h('div', { className: 'hp', 'aria-label': 'Vie' }, hpFill);
    const word = h('p', { className: 'word', 'aria-live': 'off' });
    const feedback = h('p', { className: 'feedback', role: 'status' }, ' ');
    const pauseSlot = h('div', { className: 'pause-slot' });
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
        pauseSlot,
        status,
        poseBar,
        h(
          'div',
          { className: 'actions' },
          h('button', { className: 'btn btn--primary', onClick: finish }, 'Terminer le combat'),
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
        } else if (event.type === 'defeat') feedback.textContent = 'Le combat est terminé.';
      }
    }

    /** Pause proposée, jamais imposée : le combat continue si l'enfant ne la prend pas. */
    function showPause(): void {
      pauseSlot.replaceChildren(
        h(
          'div',
          { className: 'pause', role: 'status' },
          h('p', {}, 'Pause proposée : tu peux souffler un moment, ou continuer.'),
          h('button', { className: 'btn btn--small', onClick: () => pauseSlot.replaceChildren() }, 'Continuer'),
        ),
      );
    }

    /** Enregistre la session en mémoire et passe à l'écran de résultat. */
    function finish(): void {
      window.clearTimeout(pauseTimer);
      window.removeEventListener('keydown', onKeydown);
      const now = new Date().toISOString();
      const store = createAppStore();
      const current = loadProgression(store, now);
      const { progression, unlocked } = recordSession(
        current,
        TRAINING_TECHNIQUE,
        toSessionRecord(stats, now),
        now,
      );
      saveProgression(store, progression);
      setLastSession({ stats, unlocked });
      navigate('resultat');
    }

    function onKeydown(event: KeyboardEvent): void {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key.length !== 1) return;
      const step = keystroke(state, event.key, performance.now());
      state = step.state;
      stats = accumulate(stats, step.events);
      announce(step.events);
      if (step.events.some((e) => e.type === 'defeat')) {
        finish();
        return;
      }
      if (step.events.some((e) => e.type === 'word-done')) {
        state = nextWord(state, DEMO_WORD);
      }
      render();
    }

    render();
    window.addEventListener('keydown', onKeydown);
    if (settings.proposePause) {
      pauseTimer = window.setTimeout(showPause, settings.sessionMinutes * 60_000);
    }

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
      window.clearTimeout(pauseTimer);
      window.removeEventListener('keydown', onKeydown);
      player?.destroy();
      opponent?.destroy();
    };
  },
};
