import type { SessionRecord, TechniqueId } from '../data/types';
import type { CombatEvent } from './combat';
import type { CombatOutcome } from './boss';

/**
 * Statistiques d'une session de combat. Calculées en mémoire uniquement :
 * rien n'est enregistré tant que la progression n'existe pas (docs/data-contracts.md).
 */
export interface SessionStats {
  /** Touches traitées : bonnes + fautes. */
  keystrokes: number;
  correct: number;
  words: number;
  perfects: number;
  combos: number;
  defeat: boolean;
}

export function emptySession(): SessionStats {
  return { keystrokes: 0, correct: 0, words: 0, perfects: 0, combos: 0, defeat: false };
}

/** Ajoute les événements d'une touche aux statistiques. Ne modifie pas l'entrée. */
export function accumulate(stats: SessionStats, events: CombatEvent[]): SessionStats {
  let next = { ...stats };
  for (const event of events) {
    switch (event.type) {
      case 'hit':
        next = { ...next, keystrokes: next.keystrokes + 1, correct: next.correct + 1 };
        break;
      case 'riposte':
        next = { ...next, keystrokes: next.keystrokes + 1 };
        break;
      case 'combo':
        next = { ...next, combos: next.combos + 1 };
        break;
      case 'word-done':
        next = {
          ...next,
          words: next.words + 1,
          perfects: next.perfects + (event.perfect ? 1 : 0),
        };
        break;
      case 'defeat':
        next = { ...next, defeat: true };
        break;
    }
  }
  return next;
}

/** Précision = bonnes touches / touches frappées, entre 0 et 1. */
export function precision(stats: SessionStats): number {
  if (stats.keystrokes === 0) return 0;
  return Math.round((stats.correct / stats.keystrokes) * 100) / 100;
}

/** Convertit les statistiques en agrégat persistable : aucune frappe individuelle. */
export function toSessionRecord(stats: SessionStats, endedAt: string): SessionRecord {
  return { endedAt, keystrokes: stats.keystrokes, correct: stats.correct, precision: precision(stats) };
}

export interface SessionResult {
  stats: SessionStats;
  unlocked: TechniqueId[];
  outcome: CombatOutcome;
  /** Nom de l'adversaire affronté, pour le message de résultat. */
  enemyName: string;
}

let lastSession: SessionResult | null = null;

/** Mémorise la dernière session pour l'écran de résultat (en mémoire seulement). */
export function setLastSession(result: SessionResult): void {
  lastSession = result;
}

export function getLastSession(): SessionResult | null {
  return lastSession;
}
