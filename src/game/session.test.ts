import { describe, expect, it } from 'vitest';
import { accumulate, emptySession, precision } from './session';

describe('statistiques de session', () => {
  it('compte les bonnes touches et les fautes dans les touches frappées', () => {
    let s = emptySession();
    s = accumulate(s, [{ type: 'hit' }]);
    s = accumulate(s, [{ type: 'hit' }]);
    s = accumulate(s, [{ type: 'riposte', damage: 10 }]);
    expect(s.keystrokes).toBe(3);
    expect(s.correct).toBe(2);
    expect(precision(s)).toBe(0.67);
  });

  it('compte mots, PERFECT, combos et défaite', () => {
    let s = emptySession();
    s = accumulate(s, [{ type: 'word-done', perfect: true }, { type: 'combo' }]);
    s = accumulate(s, [{ type: 'word-done', perfect: false }]);
    s = accumulate(s, [{ type: 'defeat' }]);
    expect(s.words).toBe(2);
    expect(s.perfects).toBe(1);
    expect(s.combos).toBe(1);
    expect(s.defeat).toBe(true);
  });

  it('précision nulle sans touche frappée', () => {
    expect(precision(emptySession())).toBe(0);
  });

  it('ne modifie pas l’état précédent', () => {
    const before = emptySession();
    accumulate(before, [{ type: 'hit' }]);
    expect(before.keystrokes).toBe(0);
  });
});
