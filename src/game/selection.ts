import type { RevisionList } from '../data/types';

/**
 * Liste choisie pour le prochain combat. Mémoire seulement : elle repart de la première
 * liste au rechargement de la page (décision D-025).
 */
let selectedListId: string | null = null;

export function selectList(id: string | null): void {
  selectedListId = id;
}

/** Liste à jouer : la choisie si elle existe encore, sinon la première, sinon aucune. */
export function activeList(lists: readonly RevisionList[]): RevisionList | undefined {
  return lists.find((l) => l.id === selectedListId) ?? lists[0];
}
