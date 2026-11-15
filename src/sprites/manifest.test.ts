import { describe, expect, it } from 'vitest';
import placeholder from '../../public/sprites/placeholder/manifest.json';
import { ManifestError, parseManifest, POSE_NAMES, sheetUrl } from './manifest';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe('parseManifest', () => {
  it('accepte le manifeste provisoire fourni dans le dépôt', () => {
    const manifest = parseManifest(placeholder);
    expect(manifest.id).toBe('placeholder');
    for (const pose of POSE_NAMES) {
      expect(manifest.poses[pose].frames).toHaveLength(manifest.poses[pose].frameCount);
    }
  });

  it('refuse une pose manquante', () => {
    const input = clone(placeholder) as { poses: Record<string, unknown> };
    delete input.poses.ko;
    expect(() => parseManifest(input)).toThrow(/poses\.ko : pose manquante/);
  });

  it('refuse un frameCount qui ne correspond pas au nombre de cadres', () => {
    const input = clone(placeholder);
    input.poses.idle.frameCount = 5;
    expect(() => parseManifest(input)).toThrow(ManifestError);
    expect(() => parseManifest(input)).toThrow(/poses\.idle\.frameCount/);
  });

  it('refuse une pose inconnue (faute de frappe dans le manifeste)', () => {
    const input = clone(placeholder) as { poses: Record<string, unknown> };
    input.poses.jump = input.poses.idle;
    expect(() => parseManifest(input)).toThrow(/pose inconnue/);
  });

  it('refuse un chemin de planche absolu ou remontant', () => {
    const absolute = clone(placeholder);
    absolute.poses.idle.sheet = '/etc/sheet.png';
    expect(() => parseManifest(absolute)).toThrow(/chemin relatif/);

    const parent = clone(placeholder);
    parent.poses.idle.sheet = '../sheet.png';
    expect(() => parseManifest(parent)).toThrow(/chemin relatif/);
  });

  it('refuse une durée nulle ou une coordonnée négative', () => {
    const duration = clone(placeholder);
    duration.poses.idle.frameDuration = 0;
    expect(() => parseManifest(duration)).toThrow(/frameDuration/);

    const coord = clone(placeholder);
    const first = coord.poses.idle.frames[0];
    if (!first) throw new Error("cadre attendu");
    first.x = -1;
    expect(() => parseManifest(coord)).toThrow(/frames\[0\]\.x/);
  });

  it('refuse une version de schéma inconnue', () => {
    const input = clone(placeholder);
    input.schemaVersion = 2;
    expect(() => parseManifest(input)).toThrow(/schemaVersion/);
  });
});

describe('sheetUrl', () => {
  it('résout la planche par rapport à l’URL du manifeste', () => {
    const loaded = {
      manifest: parseManifest(placeholder),
      url: new URL('https://example.test/keyboardfight/sprites/placeholder/manifest.json'),
    };
    expect(sheetUrl(loaded, 'idle')).toBe(
      'https://example.test/keyboardfight/sprites/placeholder/sheet.png',
    );
  });
});
