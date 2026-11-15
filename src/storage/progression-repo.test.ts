import { describe, expect, it } from 'vitest';
import { emptyProgression, TECHNIQUE_IDS } from '../game/progression';
import { createMemoryBackend, Store } from './store';
import { loadProgression, parseProgression, PROGRESSION_KEY, saveProgression } from './progression-repo';

const NOW = '2026-11-15T10:00:00.000Z';

describe('dépôt de progression', () => {
  it('sans donnée, repart de l’état initial', () => {
    const store = new Store(createMemoryBackend());
    expect(loadProgression(store, NOW)).toEqual(emptyProgression(NOW));
  });

  it('enregistre puis relit la progression à l’identique', () => {
    const store = new Store(createMemoryBackend());
    const p = emptyProgression(NOW);
    p.techniques.repos.sessions.push({ endedAt: NOW, keystrokes: 10, correct: 9, precision: 0.9 });
    expect(saveProgression(store, p)).toBe(true);
    expect(loadProgression(store, NOW)).toEqual(p);
  });

  it('une donnée illisible retombe sur l’état initial, sans erreur', () => {
    const backend = createMemoryBackend();
    backend.setItem(`kf.${PROGRESSION_KEY}`, JSON.stringify({ schemaVersion: 1, data: { techniques: {} } }));
    expect(loadProgression(new Store(backend), NOW)).toEqual(emptyProgression(NOW));
  });

  it('parseProgression rejette une précision hors de 0..1', () => {
    const data = {
      techniques: Object.fromEntries(
        TECHNIQUE_IDS.map((id) => [
          id,
          { unlockedAt: null, sessions: id === 'repos' ? [{ endedAt: NOW, keystrokes: 1, correct: 1, precision: 2 }] : [] },
        ]),
      ),
    };
    expect(() => parseProgression(data)).toThrow(/precision/);
  });

  it('n’écrit que les agrégats, sans aucune frappe individuelle', () => {
    const backend = createMemoryBackend();
    saveProgression(new Store(backend), emptyProgression(NOW));
    const raw = backend.getItem(`kf.${PROGRESSION_KEY}`) ?? '';
    expect(raw).not.toMatch(/key|char|typed/i);
  });
});
