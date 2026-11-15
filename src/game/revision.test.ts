import { describe, expect, it } from 'vitest';
import { createList, HIDE_DELAY_MS, parseWordsInput, playableWords, removeList, visibleWord } from './revision';

describe('modes d’affichage', () => {
  it('affiché : le mot reste visible', () => {
    expect(visibleWord('affiche', 'motA', 60_000)).toBe('motA');
  });

  it('caché après 3 s : visible avant le délai, masqué après', () => {
    expect(visibleWord('cache-3s', 'motA', HIDE_DELAY_MS - 1)).toBe('motA');
    expect(visibleWord('cache-3s', 'motA', HIDE_DELAY_MS)).toBeNull();
  });

  it('dictée : le mot n’est jamais affiché', () => {
    expect(visibleWord('dictee', 'motA', 0)).toBeNull();
  });
});

describe('mots bloqués', () => {
  it('retire les mots bloqués sans modifier la liste', () => {
    const words = ['motA', 'motB'];
    const blocked = [{ word: 'motA', reason: 'parent' as const, addedAt: 'x' }];
    expect(playableWords(words, blocked)).toEqual(['motB']);
    expect(words).toEqual(['motA', 'motB']);
  });
});

describe('saisie du parent', () => {
  it('découpe par ligne, virgule ou point-virgule, normalise et dédoublonne', () => {
    const { words, rejected } = parseWordsInput('Chat\nchien, OISEAU; chat\n');
    expect(words).toEqual(['chat', 'chien', 'oiseau']);
    expect(rejected).toEqual([]);
  });

  it('signale les saisies refusées', () => {
    const { words, rejected } = parseWordsInput('bon, mauvais1, deux mots');
    expect(words).toEqual(['bon']);
    expect(rejected).toEqual(['mauvais1', 'deux mots']);
  });
});

describe('listes', () => {
  const NOW = '2026-11-15T10:00:00.000Z';

  it('crée puis supprime une liste', () => {
    const created = createList([], { id: 'l1', name: 'Semaine', displayMode: 'affiche', words: ['motA'] }, NOW);
    expect(created).toHaveLength(1);
    expect(created[0]?.createdAt).toBe(NOW);
    expect(removeList(created, 'l1')).toEqual([]);
  });
});
