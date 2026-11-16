import { describe, expect, it } from 'vitest';
import { createMemoryBackend, Store } from './store';
import { DEFAULT_SETTINGS, loadSettings, parseSettings, saveSettings, SETTINGS_KEY } from './settings-repo';
import { BLOCKED_KEY, loadBlockedWords, parseBlockedWords, saveBlockedWords } from './blocked-repo';

describe('réglages', () => {
  it('sans donnée, renvoie les réglages par défaut', () => {
    expect(loadSettings(new Store(createMemoryBackend()))).toEqual(DEFAULT_SETTINGS);
  });

  it('enregistre puis relit les réglages', () => {
    const store = new Store(createMemoryBackend());
    const next = { ...DEFAULT_SETTINGS, difficulty: 'moyen' as const, sessionMinutes: 10 as const, proposePause: false };
    saveSettings(store, next);
    expect(loadSettings(store)).toEqual(next);
  });

  it('mémorise la liste par défaut entre deux lectures', () => {
    const store = new Store(createMemoryBackend());
    saveSettings(store, { ...DEFAULT_SETTINGS, defaultListId: 'l-42' });
    expect(loadSettings(store).defaultListId).toBe('l-42');
  });

  it('une ancienne donnée sans defaultListId vaut null, sans erreur', () => {
    const backend = createMemoryBackend();
    backend.setItem(
      `kf.${SETTINGS_KEY}`,
      JSON.stringify({
        schemaVersion: 1,
        data: { difficulty: 'facile', sessionMinutes: 5, proposePause: true, parentCode: null },
      }),
    );
    expect(loadSettings(new Store(backend)).defaultListId).toBeNull();
  });

  it('rejette une difficulté ou une durée inconnue', () => {
    expect(() => parseSettings({ ...DEFAULT_SETTINGS, difficulty: 'impossible' })).toThrow(/difficulty/);
    expect(() => parseSettings({ ...DEFAULT_SETTINGS, sessionMinutes: 7 })).toThrow(/sessionMinutes/);
  });

  it('une donnée illisible retombe sur les défauts', () => {
    const backend = createMemoryBackend();
    backend.setItem(`kf.${SETTINGS_KEY}`, JSON.stringify({ schemaVersion: 1, data: { difficulty: 'x' } }));
    expect(loadSettings(new Store(backend))).toEqual(DEFAULT_SETTINGS);
  });

  it('ne stocke que le hachage du code parent', () => {
    const backend = createMemoryBackend();
    saveSettings(new Store(backend), {
      ...DEFAULT_SETTINGS,
      parentCode: { algo: 'PBKDF2-SHA256', iterations: 1000, salt: 'c2FsdA==', hash: 'aGFzaA==' },
    });
    expect(backend.getItem(`kf.${SETTINGS_KEY}`)).toContain('aGFzaA==');
  });
});

describe('mots bloqués', () => {
  it('enregistre puis relit la liste', () => {
    const store = new Store(createMemoryBackend());
    expect(loadBlockedWords(store)).toEqual([]);
    saveBlockedWords(store, [{ word: 'motA', reason: 'parent', addedAt: '2026-11-15T10:00:00.000Z' }]);
    expect(loadBlockedWords(store).map((e) => e.word)).toEqual(['motA']);
  });

  it('rejette une raison inconnue', () => {
    expect(() => parseBlockedWords({ entries: [{ word: 'x', reason: 'autre', addedAt: 'x' }] })).toThrow(/reason/);
  });

  it('une donnée illisible vaut liste vide', () => {
    const backend = createMemoryBackend();
    backend.setItem(`kf.${BLOCKED_KEY}`, '{pas du json');
    expect(loadBlockedWords(new Store(backend))).toEqual([]);
  });
});
