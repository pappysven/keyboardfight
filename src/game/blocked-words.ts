import type { BlockedWord } from '../data/types';

export const MAX_WORD_LENGTH = 40;

/**
 * Normalise une saisie parent : minuscules, sans espaces autour.
 * Renvoie null si la saisie n'est pas un mot (vide, trop longue, caractères interdits).
 */
export function normalizeWord(input: string): string | null {
  const word = input.trim().toLocaleLowerCase('fr-FR');
  if (word.length === 0 || word.length > MAX_WORD_LENGTH) return null;
  if (!/^[\p{L}'’-]+$/u.test(word)) return null;
  return word;
}

/** Ajoute un mot bloqué. Un doublon ne change rien. */
export function addBlockedWord(
  entries: readonly BlockedWord[],
  word: string,
  now: string,
): BlockedWord[] {
  if (entries.some((e) => e.word === word)) return [...entries];
  return [...entries, { word, reason: 'parent', addedAt: now }];
}

export function removeBlockedWord(entries: readonly BlockedWord[], word: string): BlockedWord[] {
  return entries.filter((e) => e.word !== word);
}
