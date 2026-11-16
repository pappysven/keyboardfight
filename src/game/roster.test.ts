import { describe, expect, it } from 'vitest';
import { parseManifest } from '../sprites/manifest';
import { DECOR_IDS, drawFight, ENEMY_IDS, pickRandom } from './roster';

describe('tirage au sort', () => {
  it('ne retire jamais le précédent quand il y a le choix', () => {
    for (let i = 0; i < 50; i++) {
      expect(pickRandom(['a', 'b', 'c'], 'b', () => i / 50)).not.toBe('b');
    }
  });

  it('peut tirer chaque élément', () => {
    const seen = new Set([0, 0.34, 0.67, 0.999].map((r) => pickRandom(['a', 'b', 'c'], null, () => r)));
    expect(seen).toEqual(new Set(['a', 'b', 'c']));
  });

  it('une liste d’un seul élément le renvoie toujours', () => {
    expect(pickRandom(['seul'], 'seul')).toBe('seul');
  });

  it('deux combats de suite changent d’adversaire et de décor', () => {
    const first = drawFight(() => 0);
    const second = drawFight(() => 0);
    expect(second.enemyId).not.toBe(first.enemyId);
    expect(second.decorId).not.toBe(first.decorId);
  });
});

// Fichiers réellement présents dans public/, vus par Vite au moment des tests.
const manifests = import.meta.glob('../../public/sprites/*/manifest.json', { eager: true, import: 'default' });
const sheets = import.meta.glob('../../public/sprites/*/sheet.png', { eager: true, query: '?url', import: 'default' });
const decors = import.meta.glob('../../public/decor/*.png', { eager: true, query: '?url', import: 'default' });

describe('fichiers du catalogue', () => {
  it('chaque adversaire a un manifeste valide et sa planche', () => {
    for (const id of ENEMY_IDS) {
      const manifest = parseManifest(manifests[`../../public/sprites/${id}/manifest.json`]);
      expect(manifest.id).toBe(id);
      expect(sheets[`../../public/sprites/${id}/sheet.png`]).toBeDefined();
    }
  });

  it('chaque décor existe', () => {
    for (const id of DECOR_IDS) expect(decors[`../../public/decor/${id}.png`]).toBeDefined();
  });
});
