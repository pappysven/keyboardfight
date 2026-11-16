/**
 * Le Gardien : vie propre et fin de liste (décision D-029, provisoire).
 */

/** Bonnes touches nécessaires pour vaincre le Gardien. */
export const ENEMY_MAX_HP = 20;

export function enemyAfterHit(hp: number): number {
  return Math.max(0, hp - 1);
}

/** La liste est finie quand chacun de ses mots a été tapé une fois. */
export function listFinished(wordsDone: number, listLength: number): boolean {
  return listLength > 0 && wordsDone >= listLength;
}

/** Issue d'un combat, transmise à l'écran de résultat. */
export type CombatOutcome = 'victory' | 'child-defeat' | 'enemy-wins' | 'stopped';
