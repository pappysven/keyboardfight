import { describe, expect, it } from 'vitest';
import type { RevisionList } from '../data/types';
import { activeList, selectList } from './selection';

const list = (id: string): RevisionList => ({
  id,
  name: id,
  displayMode: 'affiche',
  words: ['motA'],
  createdAt: '2026-11-16T10:00:00.000Z',
});

describe('liste active', () => {
  it('sans choix, prend la première liste', () => {
    selectList(null);
    expect(activeList([list('a'), list('b')])?.id).toBe('a');
  });

  it('prend la liste choisie', () => {
    selectList('b');
    expect(activeList([list('a'), list('b')])?.id).toBe('b');
  });

  it('retombe sur la première si la liste choisie a été supprimée', () => {
    selectList('disparue');
    expect(activeList([list('a')])?.id).toBe('a');
  });

  it('sans choix pendant la visite, prend la liste par défaut enregistrée', () => {
    selectList(null);
    expect(activeList([list('a'), list('b')], 'b')?.id).toBe('b');
  });

  it('un choix de la visite l’emporte sur la liste par défaut', () => {
    selectList('a');
    expect(activeList([list('a'), list('b')], 'b')?.id).toBe('a');
  });

  it('aucune liste : rien à jouer', () => {
    selectList(null);
    expect(activeList([])).toBeUndefined();
  });
});
