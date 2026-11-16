import { describe, expect, it } from 'vitest';
import { createSfx, SOUNDS } from './sfx';

function fakeWindow() {
  const log = { contexts: 0, oscillators: 0, closed: 0 };
  const param = { setValueAtTime() {}, exponentialRampToValueAtTime() {} };
  class FakeAudioContext {
    state = 'running';
    currentTime = 0;
    destination = {};
    constructor() {
      log.contexts += 1;
    }
    createOscillator() {
      log.oscillators += 1;
      return { type: 'square', frequency: param, connect: (n: unknown) => n, start() {}, stop() {} };
    }
    createGain() {
      return { gain: param, connect: (n: unknown) => n };
    }
    resume() {
      return Promise.resolve();
    }
    close() {
      log.closed += 1;
      return Promise.resolve();
    }
  }
  return { win: { AudioContext: FakeAudioContext } as unknown as Window, log };
}

describe('bruitages', () => {
  it('joue une note par oscillateur et ne crée qu’un seul contexte audio', () => {
    const { win, log } = fakeWindow();
    const sfx = createSfx(true, win);
    sfx.play('hit');
    sfx.play('combo');
    expect(log.contexts).toBe(1);
    expect(log.oscillators).toBe(SOUNDS.hit.length + SOUNDS.combo.length);
  });

  it('désactivé : aucun contexte audio n’est créé', () => {
    const { win, log } = fakeWindow();
    createSfx(false, win).play('hit');
    expect(log.contexts).toBe(0);
  });

  it('sans Web Audio : ne lève pas d’erreur', () => {
    expect(() => createSfx(true, {} as Window).play('ko')).not.toThrow();
  });

  it('ferme le contexte audio en quittant', () => {
    const { win, log } = fakeWindow();
    const sfx = createSfx(true, win);
    sfx.play('hit');
    sfx.close();
    expect(log.closed).toBe(1);
  });

  it('tous les sons durent moins d’une seconde', () => {
    for (const notes of Object.values(SOUNDS)) {
      expect(Math.max(...notes.map((n) => n.t + n.d))).toBeLessThan(1);
    }
  });
});
