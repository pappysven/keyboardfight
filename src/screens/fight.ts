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
import { createSfx } from '../audio/sfx';
import { createSpriteView, type SpriteView } from '../sprites/sprite';
import { loadManifest, POSE_NAMES, type LoadedManifest } from '../sprites/manifest';
import { createArena } from './fight-fx';
import { drawFight } from '../game/roster';

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
    // Arène : décor, combattants, barres de vie et effets (src/screens/fight-fx.ts).
    // Adversaire et décor tirés au sort, différents du combat précédent (D-032).
    const draw = drawFight();
    let enemyName = 'Gardien';
    const arena = createArena(`${import.meta.env.BASE_URL}decor/${draw.decorId}.png`);
    // En dictée, la voix lit le mot : pas de bruitages par-dessus (D-031).
    const sfx = createSfx(settings.soundEnabled && mode !== 'dictee');
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
    // Outil de développement uniquement : absent de la version publiée.
    const poseBar = import.meta.env.DEV
      ? h(
          'div',
          { className: 'pose-bar', 'aria-label': 'Poses de test' },
          ...POSE_NAMES.map((pose) =>
            h('button', { className: 'btn btn--small', onClick: () => player?.setPose(pose) }, pose),
          ),
        )
      : null;

    root.append(
      h(
        'main',
        { className: 'screen screen--fight' },
        h(
          'p',
          { className: 'hud' },
          `COMBAT · ${TECHNIQUE_LABELS[settings.trainingTechnique]}${chosen ? ` · ${chosen.name}` : ''}`,
        ),
        arena.el,
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
      arena.setHp('hero', state.hp / state.maxHp);
      arena.setHp('enemy', enemyHp / ENEMY_MAX_HP);
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

    /** Traduit les événements du moteur en poses, mouvements et effets dans l'arène. */
    function animate(events: CombatEvent[]): void {
      for (const event of events) {
        if (event.type === 'hit') {
          // Le héros avance et frappe ; l'adversaire encaisse.
          flash(player, 'punch', 240, 'player');
          arena.move('hero', 'lunge');
          flash(opponent, 'hit', 220, 'opponent');
          arena.move('enemy', 'recoil');
          arena.struck('enemy');
          arena.spark('enemy');
          arena.damage('enemy', '-1');
          sfx.play('hit');
        } else if (event.type === 'combo') {
          flash(player, 'kick', 520, 'player');
          arena.move('hero', 'dash');
          arena.zoom();
          arena.shake(true);
          arena.banner('COMBO !', 'gold');
          sfx.play('combo');
        } else if (event.type === 'word-done' && event.perfect) {
          flash(player, 'win', 700, 'player');
          arena.move('hero', 'hop');
          arena.banner('PERFECT !', 'gold');
          sfx.play('perfect');
        } else if (event.type === 'riposte') {
          // L'adversaire bondit vers le héros, qui encaisse.
          flash(opponent, 'punch', 300, 'opponent');
          arena.move('enemy', 'lunge');
          flash(player, 'hit', 300, 'player');
          arena.move('hero', 'recoil');
          arena.struck('hero');
          arena.spark('hero');
          arena.damage('hero', `-${event.damage}`);
          arena.shake();
          sfx.play('riposte');
        } else if (event.type === 'defeat') {
          flash(player, 'ko', 0, 'player');
          arena.move('hero', 'fall');
          arena.banner('K.O.', 'danger');
          sfx.play('ko');
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
        setLastSession({ stats, unlocked, outcome, enemyName });
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
        render();
        endFight('child-defeat', 1200);
        return;
      }
      if (step.events.some((e) => e.type === 'hit')) {
        enemyHp = enemyAfterHit(enemyHp);
        if (enemyHp === 0) {
          feedback.textContent = `Le ${enemyName} est vaincu !`;
          render();
          flash(opponent, 'ko', 0, 'opponent');
          arena.move('enemy', 'fall');
          flash(player, 'win', 1600, 'player');
          arena.move('hero', 'hop');
          arena.shake(true);
          arena.banner('K.O. !', 'gold');
          sfx.play('victory');
          endFight('victory', 1500);
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
            feedback.textContent = `La liste est finie : le ${enemyName} gagne.`;
            render();
            flash(opponent, 'win', 1600, 'opponent');
            arena.move('enemy', 'hop');
            arena.banner('FIN DE LISTE', 'info');
            endFight('enemy-wins', 1500);
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
    const enemyUrl = new URL(`${base}sprites/${draw.enemyId}/manifest.json`, window.location.href);
    Promise.all([loadManifest(heroUrl), loadManifest(enemyUrl)])
      .then(([hero, enemy]: [LoadedManifest, LoadedManifest]) => {
        if (cancelled) return;
        player = createSpriteView(hero, 'idle');
        // L'ennemi fait face au héros, à gauche : son dessin regarde à droite, on le retourne.
        opponent = createSpriteView(enemy, 'idle', { flip: true });
        arena.mount('hero', player.el, hero.manifest.name);
        arena.mount('enemy', opponent.el, enemy.manifest.name);
        enemyName = enemy.manifest.name;
        status.textContent = '';
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
      arena.destroy();
      sfx.close();
      player?.destroy();
      opponent?.destroy();
    };
  },
};
