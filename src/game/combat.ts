import type { Difficulty } from '../data/types';
import { applyRiposte } from './difficulty';

/**
 * Moteur de combat pur : une saisie = un événement, aucune dépendance au DOM ni au temps réel.
 * Règles : docs/pedagogie.md. Valeurs provisoires : voir docs/decisions.md (D-012 à D-014).
 */

/** Nombre de bonnes touches rapides d'affilée pour déclencher un combo. */
export const COMBO_LENGTH = 5;
/** Intervalle maximal entre deux bonnes touches pour rester « rapide ». */
export const COMBO_MAX_GAP_MS = 1200;
/** Dégâts d'une riposte, en fraction des PV max (provisoire). */
export const RIPOSTE_DAMAGE_RATIO = 0.1;

export interface CombatState {
  readonly difficulty: Difficulty;
  readonly maxHp: number;
  readonly hp: number;
  /** Mot en cours de saisie. */
  readonly target: string;
  /** Position de la prochaine lettre attendue. */
  readonly index: number;
  /** Fautes commises sur le mot en cours. */
  readonly wordErrors: number;
  /** Bonnes touches rapides consécutives (0 à COMBO_LENGTH - 1). */
  readonly streak: number;
  /** Horodatage (ms) de la dernière bonne touche du mot en cours, ou null. */
  readonly lastCorrectAt: number | null;
}

export type CombatEvent =
  | { type: 'hit' }
  | { type: 'combo' }
  | { type: 'riposte'; damage: number }
  | { type: 'word-done'; perfect: boolean };

export interface CombatStep {
  state: CombatState;
  events: CombatEvent[];
}

export function startCombat(difficulty: Difficulty, maxHp: number, target: string): CombatState {
  return {
    difficulty,
    maxHp,
    hp: maxHp,
    target,
    index: 0,
    wordErrors: 0,
    streak: 0,
    lastCorrectAt: null,
  };
}

/**
 * Passe au mot suivant : vie, plancher et série de bonnes touches sont conservés
 * (le combo se compte « d'affilée », pas par mot). Seule la saisie repart à zéro.
 */
export function nextWord(state: CombatState, target: string): CombatState {
  return { ...state, target, index: 0, wordErrors: 0 };
}

/** Traite une touche saisie à l'instant `timeMs`. Renvoie le nouvel état et les événements. */
export function keystroke(state: CombatState, key: string, timeMs: number): CombatStep {
  const expected = state.target.charAt(state.index);

  if (state.index >= state.target.length || expected === '') {
    return { state, events: [] };
  }

  if (key !== expected) {
    const damage = Math.ceil(state.maxHp * RIPOSTE_DAMAGE_RATIO);
    const hp = applyRiposte(state.hp, damage, state.difficulty, state.maxHp);
    return {
      state: { ...state, hp, wordErrors: state.wordErrors + 1, streak: 0, lastCorrectAt: null },
      events: [{ type: 'riposte', damage }],
    };
  }

  const quick =
    state.lastCorrectAt !== null && timeMs - state.lastCorrectAt <= COMBO_MAX_GAP_MS;
  const streak = quick ? state.streak + 1 : 1;
  const events: CombatEvent[] = [{ type: 'hit' }];
  const index = state.index + 1;
  let next: CombatState = { ...state, index, lastCorrectAt: timeMs, streak };

  if (streak >= COMBO_LENGTH) {
    events.push({ type: 'combo' });
    next = { ...next, streak: 0 };
  }

  if (index === state.target.length) {
    events.push({ type: 'word-done', perfect: state.wordErrors === 0 });
  }

  return { state: next, events };
}
