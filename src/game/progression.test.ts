import { describe, expect, it } from 'vitest';
import type { SessionRecord } from '../data/types';
import { emptyProgression, isMastered, recordSession } from './progression';

const NOW = '2026-11-15T10:00:00.000Z';

function session(precision: number, keystrokes = 10): SessionRecord {
  return { endedAt: NOW, keystrokes, correct: Math.round(keystrokes * precision), precision };
}

describe('état initial', () => {
  it('seule la rangée de repos est ouverte au départ', () => {
    const p = emptyProgression(NOW);
    expect(p.techniques.repos.unlockedAt).toBe(NOW);
    expect(p.techniques.haute.unlockedAt).toBeNull();
    expect(p.techniques.phrases.unlockedAt).toBeNull();
  });
});

describe('critère de maîtrise', () => {
  it('exige 3 sessions', () => {
    expect(isMastered([session(1), session(1)])).toBe(false);
  });

  it('exige 90 % sur chacune des 3 dernières sessions', () => {
    expect(isMastered([session(0.5), session(0.9), session(0.95), session(0.9)])).toBe(true);
    expect(isMastered([session(0.9), session(0.89), session(0.95)])).toBe(false);
  });
});

describe('déblocage', () => {
  it('3 sessions à 90 % sur la rangée de repos ouvrent haute et basse, pas les suivantes', () => {
    let p = emptyProgression(NOW);
    let unlocked: string[] = [];
    for (let i = 0; i < 3; i++) {
      const r = recordSession(p, 'repos', session(0.95), NOW);
      p = r.progression;
      unlocked = r.unlocked;
    }
    expect(unlocked.sort()).toEqual(['basse', 'haute']);
    expect(p.techniques['maj-accents'].unlockedAt).toBeNull();
  });

  it('majuscules et chiffres exigent haute ET basse maîtrisées', () => {
    let p = emptyProgression(NOW);
    for (let i = 0; i < 3; i++) p = recordSession(p, 'repos', session(1), NOW).progression;
    for (let i = 0; i < 3; i++) p = recordSession(p, 'haute', session(1), NOW).progression;
    expect(p.techniques['maj-accents'].unlockedAt).toBeNull();
    for (let i = 0; i < 3; i++) p = recordSession(p, 'basse', session(1), NOW).progression;
    expect(p.techniques['maj-accents'].unlockedAt).toBe(NOW);
    expect(p.techniques.chiffres.unlockedAt).toBe(NOW);
  });

  it('une étape verrouillée ne reçoit pas de session', () => {
    const p = emptyProgression(NOW);
    const r = recordSession(p, 'mots', session(1), NOW);
    expect(r.progression.techniques.mots.sessions).toHaveLength(0);
  });

  it('une session sans frappe n’est pas enregistrée', () => {
    const p = emptyProgression(NOW);
    const r = recordSession(p, 'repos', session(0, 0), NOW);
    expect(r.progression.techniques.repos.sessions).toHaveLength(0);
  });

  it('une étape ouverte le reste, même si la précision baisse ensuite', () => {
    let p = emptyProgression(NOW);
    for (let i = 0; i < 3; i++) p = recordSession(p, 'repos', session(1), NOW).progression;
    expect(p.techniques.haute.unlockedAt).toBe(NOW);
    for (let i = 0; i < 3; i++) p = recordSession(p, 'repos', session(0.2), NOW).progression;
    expect(p.techniques.haute.unlockedAt).toBe(NOW);
  });
});
