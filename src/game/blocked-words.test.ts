import { describe, expect, it } from 'vitest';
import { addBlockedWord, MAX_WORD_LENGTH, normalizeWord, removeBlockedWord } from './blocked-words';

describe('normalizeWord', () => {
  it('met en minuscules, enlève les espaces autour, garde accents et tirets', () => {
    expect(normalizeWord('  Été ')).toBe('été');
    expect(normalizeWord("aujourd'hui")).toBe("aujourd'hui");
    expect(normalizeWord('porte-monnaie')).toBe('porte-monnaie');
  });

  it('refuse vide, chiffres, espaces internes et mots trop longs', () => {
    expect(normalizeWord('   ')).toBeNull();
    expect(normalizeWord('mot1')).toBeNull();
    expect(normalizeWord('deux mots')).toBeNull();
    expect(normalizeWord('a'.repeat(MAX_WORD_LENGTH + 1))).toBeNull();
  });
});

describe('liste de mots bloqués', () => {
  const NOW = '2026-11-15T10:00:00.000Z';

  it('ajoute un mot une seule fois', () => {
    let list = addBlockedWord([], 'motA', NOW);
    list = addBlockedWord(list, 'motA', NOW);
    expect(list).toHaveLength(1);
    expect(list[0]).toEqual({ word: 'motA', reason: 'parent', addedAt: NOW });
  });

  it('retire un mot', () => {
    const list = addBlockedWord(addBlockedWord([], 'motA', NOW), 'motB', NOW);
    expect(removeBlockedWord(list, 'motA').map((e) => e.word)).toEqual(['motB']);
  });
});
