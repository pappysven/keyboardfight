import type { RevisionList } from '../data/types';

/**
 * Liste choisie pendant la visite (mémoire). Au départ, on prend la liste par défaut
 * enregistrée dans les réglages (kf.settings.defaultListId).
 */
let selectedListId: string | null = null;

export function selectList(id: string | null): void {
  selectedListId = id;
}

/** Liste à jouer : choisie pendant la visite, sinon la par défaut, sinon la première. */
export function activeList(
  lists: readonly RevisionList[],
  defaultListId: string | null = null,
): RevisionList | undefined {
  const wanted = selectedListId ?? defaultListId;
  return lists.find((l) => l.id === wanted) ?? lists[0];
}
