import { describe, expect, it } from 'vitest';
import { applyRiposte, hpFloor } from './difficulty';

describe('plancher de vie', () => {
  it('facile : la vie ne descend jamais sous 25 %', () => {
    expect(hpFloor('facile', 100)).toBe(25);
    expect(applyRiposte(30, 50, 'facile', 100)).toBe(25);
    expect(applyRiposte(25, 10, 'facile', 100)).toBe(25);
  });

  it('moyen et difficile : plancher à 0 %', () => {
    expect(hpFloor('moyen', 100)).toBe(0);
    expect(hpFloor('difficile', 100)).toBe(0);
    expect(applyRiposte(10, 50, 'moyen', 100)).toBe(0);
    expect(applyRiposte(10, 50, 'difficile', 100)).toBe(0);
  });

  it('une riposte qui ne dépasse pas le plancher retire bien les PV', () => {
    expect(applyRiposte(80, 20, 'facile', 100)).toBe(60);
  });
});
