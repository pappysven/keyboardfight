import type { DisplayMode, RevisionList } from '../data/types';
import type { Store } from './store';

/** Clé de stockage : kf.revision-lists (docs/data-contracts.md). */
export const REVISION_KEY = 'revision-lists';

const MODES: readonly DisplayMode[] = ['affiche', 'cache-3s', 'dictee'];

export function parseRevisionLists(raw: unknown): RevisionList[] {
  if (typeof raw !== 'object' || raw === null) throw new Error('listes invalides');
  const lists = (raw as { lists?: unknown }).lists;
  if (!Array.isArray(lists)) throw new Error('listes invalides : lists');
  return lists.map((item, i) => {
    const l = item as Record<string, unknown>;
    if (typeof l.id !== 'string' || typeof l.name !== 'string') throw new Error(`listes invalides : lists[${i}]`);
    if (!MODES.includes(l.displayMode as DisplayMode)) throw new Error(`listes invalides : lists[${i}].displayMode`);
    if (!Array.isArray(l.words) || !l.words.every((w) => typeof w === 'string')) {
      throw new Error(`listes invalides : lists[${i}].words`);
    }
    if (typeof l.createdAt !== 'string') throw new Error(`listes invalides : lists[${i}].createdAt`);
    return {
      id: l.id,
      name: l.name,
      displayMode: l.displayMode as DisplayMode,
      words: l.words as string[],
      createdAt: l.createdAt,
    };
  });
}

export function loadRevisionLists(store: Store): RevisionList[] {
  return store.read(REVISION_KEY, parseRevisionLists) ?? [];
}

export function saveRevisionLists(store: Store, lists: RevisionList[]): boolean {
  return store.write(REVISION_KEY, { lists });
}
