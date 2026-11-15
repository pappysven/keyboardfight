import { describe, expect, it } from 'vitest';
import { createMemoryBackend, Store } from './store';
import { loadRevisionLists, parseRevisionLists, saveRevisionLists, REVISION_KEY } from './revision-repo';

const NOW = '2026-11-15T10:00:00.000Z';

describe('dépôt des listes de révision', () => {
  it('sans donnée : liste vide', () => {
    expect(loadRevisionLists(new Store(createMemoryBackend()))).toEqual([]);
  });

  it('enregistre puis relit à l’identique', () => {
    const store = new Store(createMemoryBackend());
    const lists = [{ id: 'l1', name: 'Semaine', displayMode: 'cache-3s' as const, words: ['motA'], createdAt: NOW }];
    saveRevisionLists(store, lists);
    expect(loadRevisionLists(store)).toEqual(lists);
  });

  it('rejette un mode d’affichage inconnu', () => {
    expect(() =>
      parseRevisionLists({ lists: [{ id: 'l', name: 'n', displayMode: 'video', words: [], createdAt: NOW }] }),
    ).toThrow(/displayMode/);
  });

  it('une donnée illisible vaut liste vide', () => {
    const backend = createMemoryBackend();
    backend.setItem(`kf.${REVISION_KEY}`, JSON.stringify({ schemaVersion: 1, data: { lists: 'nope' } }));
    expect(loadRevisionLists(new Store(backend))).toEqual([]);
  });
});
