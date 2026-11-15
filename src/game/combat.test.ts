import { describe, expect, it } from 'vitest';
import {
  COMBO_LENGTH,
  COMBO_MAX_GAP_MS,
  keystroke,
  nextWord,
  RIPOSTE_DAMAGE_RATIO,
  startCombat,
  type CombatEvent,
  type CombatState,
} from './combat';

/** Tape une suite de touches à intervalle régulier, à partir de t0. */
function type(state: CombatState, keys: string, gapMs: number, t0 = 0): CombatState {
  let s = state;
  let t = t0;
  for (const key of keys) {
    s = keystroke(s, key, t).state;
    t += gapMs;
  }
  return s;
}

const WORD = 'motA';

describe('saisie', () => {
  it('une bonne touche avance la saisie et déclenche un hit', () => {
    const { state, events } = keystroke(startCombat('moyen', 100, WORD), 'm', 0);
    expect(state.index).toBe(1);
    expect(events).toEqual([{ type: 'hit' }]);
  });

  it('une mauvaise touche déclenche une riposte et ne fait pas avancer', () => {
    const { state, events } = keystroke(startCombat('moyen', 100, WORD), 'x', 0);
    expect(state.index).toBe(0);
    expect(state.wordErrors).toBe(1);
    expect(events).toEqual([{ type: 'riposte', damage: Math.ceil(100 * RIPOSTE_DAMAGE_RATIO) }]);
  });

  it('terminer le mot sans faute donne un PERFECT', () => {
    let s = startCombat('moyen', 100, WORD);
    let lastEvents: CombatEvent[] = [];
    for (const [i, key] of [...WORD].entries()) {
      const step = keystroke(s, key, i * 300);
      s = step.state;
      lastEvents = step.events;
    }
    expect(lastEvents).toContainEqual({ type: 'word-done', perfect: true });
  });

  it('terminer le mot avec une faute ne donne pas de PERFECT', () => {
    let s = startCombat('moyen', 100, WORD);
    s = keystroke(s, 'z', 0).state;
    let last = { state: s, events: [] as ReturnType<typeof keystroke>['events'] };
    for (const [i, key] of [...WORD].entries()) {
      last = keystroke(last.state, key, 500 * (i + 1));
    }
    expect(last.events).toContainEqual({ type: 'word-done', perfect: false });
  });

  it('nextWord repart à zéro sans toucher à la vie', () => {
    const hurt = keystroke(startCombat('moyen', 100, WORD), 'z', 0).state;
    const next = nextWord(hurt, 'autre');
    expect(next.index).toBe(0);
    expect(next.wordErrors).toBe(0);
    expect(next.target).toBe('autre');
    expect(next.hp).toBe(hurt.hp);
  });
});

describe('combo', () => {
  it(`${COMBO_LENGTH} bonnes touches rapides d'affilée déclenchent un combo`, () => {
    const word = 'abcdefgh';
    let s = startCombat('moyen', 100, word);
    const events: string[] = [];
    let t = 0;
    for (const key of word.slice(0, COMBO_LENGTH)) {
      const step = keystroke(s, key, t);
      events.push(...step.events.map((e) => e.type));
      s = step.state;
      t += 300;
    }
    expect(events).toContain('combo');
  });

  it('une pause trop longue coupe la série', () => {
    const word = 'abcdefgh';
    let s = startCombat('moyen', 100, word);
    let t = 0;
    const types: string[] = [];
    for (const [i, key] of [...word.slice(0, 4)].entries()) {
      const gap = i === 2 ? COMBO_MAX_GAP_MS + 1 : 300;
      const step = keystroke(s, key, t);
      types.push(...step.events.map((e) => e.type));
      s = step.state;
      t += gap;
    }
    const after = keystroke(s, word.charAt(4), t);
    expect(s.streak).toBeLessThan(COMBO_LENGTH);
    expect(after.state.streak).toBeLessThan(COMBO_LENGTH);
    expect(types).not.toContain('combo');
  });

  it('une faute remet la série à zéro', () => {
    const word = 'abcdefgh';
    let s = startCombat('moyen', 100, word);
    s = type(s, 'abc', 300);
    s = keystroke(s, 'z', 1000).state;
    expect(s.streak).toBe(0);
  });
});

describe('plancher de vie pendant la saisie', () => {
  it('facile : de nombreuses fautes ne descendent jamais sous 25 %', () => {
    let s = startCombat('facile', 100, WORD);
    for (let i = 0; i < 50; i++) s = keystroke(s, 'z', i * 100).state;
    expect(s.hp).toBe(25);
  });

  it('difficile : les fautes peuvent amener la vie à 0', () => {
    let s = startCombat('difficile', 100, WORD);
    for (let i = 0; i < 50; i++) s = keystroke(s, 'z', i * 100).state;
    expect(s.hp).toBe(0);
  });
});
