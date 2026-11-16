import { describe, expect, it } from 'vitest';
import { enemyAfterHit, ENEMY_MAX_HP, listFinished } from './boss';

describe('vie du Gardien', () => {
  it('chaque bonne touche retire 1 point, sans passer sous zéro', () => {
    expect(enemyAfterHit(ENEMY_MAX_HP)).toBe(ENEMY_MAX_HP - 1);
    expect(enemyAfterHit(1)).toBe(0);
    expect(enemyAfterHit(0)).toBe(0);
  });
});

describe('fin de liste', () => {
  it('finie quand tous les mots ont été tapés une fois', () => {
    expect(listFinished(2, 3)).toBe(false);
    expect(listFinished(3, 3)).toBe(true);
  });

  it('une liste vide n’est jamais finie', () => {
    expect(listFinished(0, 0)).toBe(false);
  });
});
