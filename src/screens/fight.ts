import { h } from '../app/dom';
import type { Screen } from '../app/router';
import { startCombat, nextWord, keystroke, type CombatEvent, type CombatState } from '../game/combat';
import { accumulate, emptySession, setLastSession, toSessionRecord, type SessionStats } from '../game/session';
import { recordSession, TECHNIQUE_LABELS } from '../game/progression';
import { playableWords, HIDE_DELAY_MS, visibleWord } from '../game/revision';
import { CombatOutcome, ENEMY_MAX_HP, enemyAfterHit, listFinished } from '../game/boss';
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
    const chosen = activeList(loadRevisionLists(store), settings.defaultListId);
    const mode: DisplayMode = chosen?.displayMode ?? 'affiche';
    const pool = chosen
      ? playableWords(chosen.words, loadBlockedWords(store))
      : [];
    const words = pool.length > 0 ? pool : [DEMO_WORD];
    let wordIndex = 0;
    let wordShownAt = performance.now();
    // Le Gardien : vie propre, et la fin de liste lui donne la victoire (D-029).
    const hasList = pool.length > 0;
    let enemyHp = ENEMY_MAX_HP;
    let wordsDone = 0;
    let ended = false;

    let state: CombatState = startCombat(settings.difficulty, MAX_HP, words[0] ?? DEMO_WORD);
    let stats: SessionStats = emptySession();
    let pauseTimer: number | undefined;
    let hideTimer: number | undefined;
    let playerPoseTimer: number | undefined;
    let opponentPoseTimer: number | undefined;

    const status = h('p', { className: 'status', role: 'status' }, 'Chargement du personnage…');
    const stage = h('div', { className: 'arena' });
    // Décor d'arène : image pixel art, servie depuis public/decor/.
    stage.style.backgroundImage = `url("${import.meta.env.BASE_URL}decor/arene.png")`;
    const enemyFill = h('div', { className: 'hp__fill hp__fill--enemy' });
    const enemyBar = h('div', { className: 'hp hp--enemy', 'aria-label': 'Vie du Gardien' }, enemyFill);
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
        h(
          'p',
          { className: 'hud' },
          `COMBAT · ${TECHNIQUE_LABELS[settings.trainingTechnique]}${chosen ? ` · ${chosen.name}` : ''}`,
        ),
        enemyBar,
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
          h('button', { className: 'btn btn--primary', onClick: () => endFight('stopped', 0) }, 'Terminer le combat'),
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
      enemyFill.style.width = `${(enemyHp / ENEMY_MAX_HP) * 100}%`;
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

    /** Joue une pose courte puis revient au repos. Ne fait rien tant que le sprite n'est pas chargé. */
    function flash(
      sprite: SpriteView | undefined,
      pose: 'punch' | 'kick' | 'win' | 'hit' | 'ko',
      ms: number,
      which: 'player' | 'opponent',
    ): void {
      if (!sprite) return;
      if (which === 'player') window.clearTimeout(playerPoseTimer);
      else window.clearTimeout(opponentPoseTimer);
      sprite.setPose(pose);
      if (pose === 'ko') return; // le KO reste affiché
      const timer = window.setTimeout(() => sprite.setPose('idle'), ms);
      if (which === 'player') playerPoseTimer = timer;
      else opponentPoseTimer = timer;
    }

    /** Mouvement court sur le sprite : avancée, recul ou secousse (classes CSS). */
    function motion(sprite: SpriteView | undefined, cls: 'lunge-right' | 'lunge-left' | 'shake'): void {
      if (!sprite) return;
      const el = sprite.el;
      el.classList.remove('lunge-right', 'lunge-left', 'shake');
      void el.offsetWidth; // relance l'animation si elle est déjà en cours
      el.classList.add(cls);
      window.setTimeout(() => el.classList.remove(cls), 320);
    }

    function animate(events: CombatEvent[]): void {
      for (const event of events) {
        if (event.type === 'hit') {
          // Le héros avance et frappe ; l'ennemi encaisse.
          flash(player, 'punch', 250, 'player');
          motion(player, 'lunge-right');
          flash(opponent, 'hit', 200, 'opponent');
          motion(opponent, 'shake');
        } else if (event.type === 'combo') {
          flash(player, 'kick', 600, 'player');
          motion(player, 'lunge-right');
        } else if (event.type === 'word-done' && event.perfect) {
          flash(player, 'win', 700, 'player');
        } else if (event.type === 'riposte') {
          // L'ennemi bondit vers le héros, qui encaisse.
          flash(opponent, 'punch', 300, 'opponent');
          motion(opponent, 'lunge-left');
          flash(player, 'hit', 300, 'player');
          motion(player, 'shake');
        } else if (event.type === 'defeat') {
          flash(player, 'ko', 0, 'player');
        }
      }
    }

    function announce(events: CombatEvent[]): void {
      animate(events);
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

    /** Enregistre la session en mémoire puis passe au résultat, après un court délai si besoin. */
    function endFight(outcome: CombatOutcome, delayMs: number): void {
      if (ended) return;
      ended = true;
      window.setTimeout(() => {
        window.clearTimeout(pauseTimer);
        window.clearTimeout(hideTimer);
        window.clearTimeout(playerPoseTimer);
        window.clearTimeout(opponentPoseTimer);
        window.removeEventListener('keydown', onKeydown);
        stopSpeaking();
        const now = new Date().toISOString();
        const current = loadProgression(store, now);
        // L'étape choisie reçoit la session si elle est ouverte ; sinon la rangée de repos.
        const technique =
          current.techniques[settings.trainingTechnique].unlockedAt !== null
            ? settings.trainingTechnique
            : TRAINING_TECHNIQUE;
        const { progression, unlocked } = recordSession(
          current,
          technique,
          toSessionRecord(stats, now),
          now,
        );
        saveProgression(store, progression);
        setLastSession({ stats, unlocked, outcome });
        navigate('resultat');
      }, delayMs);
    }

    function onKeydown(event: KeyboardEvent): void {
      if (ended) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key.length !== 1) return;
      const step = keystroke(state, event.key, performance.now());
      state = step.state;
      stats = accumulate(stats, step.events);
      announce(step.events);
      if (step.events.some((e) => e.type === 'defeat')) {
        endFight('child-defeat', 0);
        return;
      }
      if (step.events.some((e) => e.type === 'hit')) {
        enemyHp = enemyAfterHit(enemyHp);
        if (enemyHp === 0) {
          feedback.textContent = 'Le Gardien est vaincu !';
          flash(opponent, 'ko', 0, 'opponent');
          endFight('victory', 900);
          return;
        }
      }
      if (step.events.some((e) => e.type === 'word-done')) {
        wordsDone += 1;
        if (hasList && listFinished(wordsDone, pool.length)) {
          if (settings.difficulty === 'facile') {
            // En facile, l'enfant ne peut pas perdre : la liste recommence.
            feedback.textContent = 'La liste recommence.';
            wordsDone = 0;
          } else {
            feedback.textContent = 'La liste est finie : le Gardien gagne.';
            flash(opponent, 'win', 0, 'opponent');
            endFight('enemy-wins', 900);
            return;
          }
        }
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

    const base = import.meta.env.BASE_URL;
    const heroUrl = new URL(`${base}sprites/perso/manifest.json`, window.location.href);
    const enemyUrl = new URL(`${base}sprites/ennemi/manifest.json`, window.location.href);
    Promise.all([loadManifest(heroUrl), loadManifest(enemyUrl)])
      .then(([hero, enemy]: [LoadedManifest, LoadedManifest]) => {
        if (cancelled) return;
        player = createSpriteView(hero, 'idle');
        // L'ennemi fait face au héros, à gauche : son dessin regarde à droite, on le retourne.
        opponent = createSpriteView(enemy, 'idle', { flip: true });
        stage.append(player.el, opponent.el);
        status.textContent = `${hero.manifest.name} contre ${enemy.manifest.name}`;
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
      window.clearTimeout(playerPoseTimer);
      window.clearTimeout(opponentPoseTimer);
      window.removeEventListener('keydown', onKeydown);
      stopSpeaking();
      player?.destroy();
      opponent?.destroy();
    };
  },
};
