import type { BlockedWord, DisplayMode, RevisionList } from '../data/types';
import { normalizeWord } from './blocked-words';

/**
 * Listes de révision : règles pures. Le stockage est dans src/storage/revision-repo.ts.
 * Les modes d'affichage sont décrits dans docs/data-contracts.md.
 */

export const DISPLAY_MODES: readonly DisplayMode[] = ['affiche', 'cache-3s', 'dictee'];

export const DISPLAY_LABELS: Record<DisplayMode, string> = {
  affiche: 'Affiché',
  'cache-3s': 'Caché après 3 s',
  dictee: 'Dictée',
};

/** Délai avant de masquer le mot en mode « cache-3s ». */
export const HIDE_DELAY_MS = 3000;

/**
 * Ce que l'enfant voit du mot, `elapsedMs` après son apparition.
 * Renvoie null quand le mot est masqué.
 */
export function visibleWord(mode: DisplayMode, word: string, elapsedMs: number): string | null {
  switch (mode) {
    case 'affiche':
      return word;
    case 'cache-3s':
      return elapsedMs < HIDE_DELAY_MS ? word : null;
    case 'dictee':
      // Pas de source audio pour l'instant : le mot n'est jamais affiché.
      return null;
  }
}

/** Retire les mots bloqués d'une liste, sans toucher à la liste stockée. */
export function playableWords(words: readonly string[], blocked: readonly BlockedWord[]): string[] {
  const banned = new Set(blocked.map((b) => b.word));
  return words.filter((w) => !banned.has(w));
}

/**
 * Découpe la saisie du parent (retours à la ligne, virgules, points-virgules).
 * Renvoie les mots valides, normalisés et sans doublon, et les saisies refusées.
 */
export function parseWordsInput(text: string): { words: string[]; rejected: string[] } {
  const words: string[] = [];
  const rejected: string[] = [];
  for (const raw of text.split(/[\n,;]+/)) {
    if (raw.trim() === '') continue;
    const word = normalizeWord(raw);
    if (word === null) {
      rejected.push(raw.trim());
    } else if (!words.includes(word)) {
      words.push(word);
    }
  }
  return { words, rejected };
}

export function createList(
  lists: readonly RevisionList[],
  input: { id: string; name: string; displayMode: DisplayMode; words: string[] },
  now: string,
): RevisionList[] {
  return [...lists, { ...input, createdAt: now }];
}

export function removeList(lists: readonly RevisionList[], id: string): RevisionList[] {
  return lists.filter((l) => l.id !== id);
}
