import type { BlockedWord } from '../data/types';
import type { Store } from './store';

/** Clé de stockage : kf.blocked-words (docs/data-contracts.md). */
export const BLOCKED_KEY = 'blocked-words';

export function parseBlockedWords(raw: unknown): BlockedWord[] {
  if (typeof raw !== 'object' || raw === null) throw new Error('mots bloqués invalides');
  const entries = (raw as { entries?: unknown }).entries;
  if (!Array.isArray(entries)) throw new Error('mots bloqués invalides : entries');
  return entries.map((e, i) => {
    const entry = e as Record<string, unknown>;
    if (typeof entry.word !== 'string') throw new Error(`mots bloqués invalides : entries[${i}].word`);
    if (entry.reason !== 'parent' && entry.reason !== 'auto') {
      throw new Error(`mots bloqués invalides : entries[${i}].reason`);
    }
    if (typeof entry.addedAt !== 'string') throw new Error(`mots bloqués invalides : entries[${i}].addedAt`);
    return { word: entry.word, reason: entry.reason, addedAt: entry.addedAt };
  });
}

export function loadBlockedWords(store: Store): BlockedWord[] {
  return store.read(BLOCKED_KEY, parseBlockedWords) ?? [];
}

export function saveBlockedWords(store: Store, entries: BlockedWord[]): boolean {
  return store.write(BLOCKED_KEY, { entries });
}
