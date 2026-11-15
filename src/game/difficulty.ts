import type { Difficulty } from '../data/types';

/**
 * Plancher de vie par difficulté, en fraction des PV max.
 * Facile : la vie de l'enfant ne descend jamais sous 25 %, il ne peut pas perdre.
 */
export const HP_FLOOR_RATIO: Record<Difficulty, number> = {
  facile: 0.25,
  moyen: 0,
  difficile: 0,
};

export function hpFloor(difficulty: Difficulty, maxHp: number): number {
  return Math.ceil(maxHp * HP_FLOOR_RATIO[difficulty]);
}

/** Applique une riposte sans jamais passer sous le plancher de la difficulté. */
export function applyRiposte(
  hp: number,
  damage: number,
  difficulty: Difficulty,
  maxHp: number,
): number {
  return Math.max(hpFloor(difficulty, maxHp), hp - damage);
}
