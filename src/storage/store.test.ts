import { describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION, createMemoryBackend, Store } from './store';

function asString(raw: unknown): string {
  if (typeof raw !== 'string') throw new Error('chaîne attendue');
  return raw;
}

describe('Store', () => {
  it('écrit puis relit une valeur', () => {
    const backend = createMemoryBackend();
    const store = new Store(backend);
    expect(store.write('profile', 'Léo')).toBe(true);
    expect(store.read('profile', asString)).toBe('Léo');
  });

  it('enveloppe la donnée avec le schemaVersion courant', () => {
    const backend = createMemoryBackend();
    new Store(backend).write('settings', { difficulty: 'facile' });
    const raw = JSON.parse(backend.getItem('kf.settings') ?? 'null') as { schemaVersion: number };
    expect(raw.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('renvoie undefined pour une clé absente', () => {
    expect(new Store(createMemoryBackend()).read('absent', asString)).toBeUndefined();
  });

  it('renvoie undefined pour un JSON cassé, sans lever d’erreur', () => {
    const backend = createMemoryBackend();
    backend.setItem('kf.profile', '{pas du json');
    expect(new Store(backend).read('profile', asString)).toBeUndefined();
  });

  it('ignore une donnée d’une autre version de schéma', () => {
    const backend = createMemoryBackend();
    backend.setItem('kf.profile', JSON.stringify({ schemaVersion: 99, data: 'x' }));
    expect(new Store(backend).read('profile', asString)).toBeUndefined();
  });

  it('renvoie false quand le backend refuse l’écriture (quota, stockage bloqué)', () => {
    const backend = createMemoryBackend();
    backend.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    expect(new Store(backend).write('profile', 'Léo')).toBe(false);
  });

  it('supprime une clé', () => {
    const store = new Store(createMemoryBackend());
    store.write('profile', 'Léo');
    store.remove('profile');
    expect(store.read('profile', asString)).toBeUndefined();
  });
});
