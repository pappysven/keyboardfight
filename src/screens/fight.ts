import { h } from '../app/dom';
import type { Screen } from '../app/router';
import { startCombat, nextWord, keystroke, type CombatEvent, type CombatState } from '../game/combat';
import { accumulate, emptySession, setLastSession, toSessionRecord, type SessionStats } from '../game/session';
import { recordSession } from '../game/progression';
import { playableWords, HIDE_DELAY_MS, visibleWord } from '../game/revision';
import { activeList } from '../game/selection';
import type { DisplayMode } from '../data/types';
import { createAppStore } from '../storage/store';
import { loadSettings } from '../storage/settings-repo';
import { loadProgression, saveProgression } from '../storage/progression-repo';
import { loadBlockedWords } from '../storage/blocked-repo';
import { loadRevisionLists } from '../storage/revision-repo';
import { speak, stopSpeaking } from '../audio/speech';
import { createSpriteView, type SpriteView } from '../sprites/sprite';
import { loadManifest, POSE_NAMES, type LoadedManifest } from '../sprites/manifest';

const MAX_HP = 100;
/** Mot de démonstration fictif, utilisé seulement sans liste de révision (AGENTS.md). */
const DEMO_WORD = 'abcd';
/** Étape travaillée tant que le choix d'étape n'existe pas. */
const TRAINING_TECHNIQUE = 'repos' as const;

export const fightScreen: Screen = {
  mount(root, navigate) {
    let player: SpriteView | undefined;
    let opponent: SpriteView | undefined;
    let cancelled = false;

    const store = createAppStore();
    const settings = loadSettings(store);

    // Mots : liste choisie à l'accueil (mots bloqués retirés), sinon le mot de démonstration.
    const chosen = activeList(loadRevisionLists(store));
    const mode: DisplayMode = chosen?.displayMode ?? 'affiche';
    const pool = chosen
      ? playableWords(chosen.words, loadBlockedWords(store))
      : [];
    const words = pool.length > 0 ? pool : [DEMO_WORD];
    let wordIndex = 0;
    let wordShownAt = performance.now();

    let state: CombatState = startCombat(settings.difficulty, MAX_HP, words[0] ?? DEMO_WORD);
    let stats: SessionStats = emptySession();
    let pauseTimer: number | undefined;
    let hideTimer: number | undefined;

    const status = h('p', { className: 'status', role: 'status' }, 'Chargement du personnage…');
    const stage = h('div', { className: 'arena' });
    const hpFill = h('div', { className: 'hp__fill' });
    const hp = h('div', { className: 'hp', 'aria-label': 'Vie' }, hpFill);
    const word = h('p', { className: 'word', 'aria-live': 'off' });
    const feedback = h('p', { className: 'feedback', role: 'status' }, ' ');
    const pauseSlot = h('div', { className: 'pause-slot' });
    /** Dictée seulement : relecture du mot. Hors tabulation pour ne pas interférer avec la frappe. */
    const replay = h(
      'button',
      {
        className: 'btn btn--small',
        tabindex: '-1',
        hidden: mode !== 'dictee',
        onClick: () => speak(state.target),
      },
      'Réécouter',
    );
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
        h('p', { className: 'hud' }, chosen ? `COMBAT · ${chosen.name}` : 'COMBAT'),
        stage,
        hp,
        word,
        replay,
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

    /** Mot restant à taper : masqué (underscores) quand le mode le cache. */
    function render(): void {
      const typed = state.target.slice(0, state.index);
      const rest = state.target.slice(state.index);
      const shown = visibleWord(mode, rest, performance.now() - wordShownAt);
      word.replaceChildren(
        h('span', { className: 'word__done' }, typed),
        h('span', { className: 'word__todo' }, shown ?? '_'.repeat(rest.length)),
      );
      hpFill.style.width = `${(state.hp / state.maxHp) * 100}%`;
    }

    /** Passe au mot suivant de la liste et relance le délai de masquage éventuel. */
    function startNextWord(): void {
      wordIndex = (wordIndex + 1) % words.length;
      state = nextWord(state, words[wordIndex] ?? DEMO_WORD);
      wordShownAt = performance.now();
      window.clearTimeout(hideTimer);
      if (mode === 'cache-3s') {
        hideTimer = window.setTimeout(render, HIDE_DELAY_MS);
      }
      if (mode === 'dictee') speak(state.target);
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
      window.clearTimeout(hideTimer);
      window.removeEventListener('keydown', onKeydown);
      stopSpeaking();
      const now = new Date().toISOString();
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
        startNextWord();
      }
      render();
    }

    render();
    window.addEventListener('keydown', onKeydown);
    if (mode === 'cache-3s') {
      hideTimer = window.setTimeout(render, HIDE_DELAY_MS);
    }
    if (mode === 'dictee') speak(state.target);
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
      window.clearTimeout(hideTimer);
      window.removeEventListener('keydown', onKeydown);
      stopSpeaking();
      player?.destroy();
      opponent?.destroy();
    };
  },
};
