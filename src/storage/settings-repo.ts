import type { Difficulty, ParentCode, Settings } from '../data/types';
import type { Store } from './store';

/** Clé de stockage : kf.settings (docs/data-contracts.md). */
export const SETTINGS_KEY = 'settings';

export const DEFAULT_SETTINGS: Settings = {
  schemaVersion: 1,
  difficulty: 'facile',
  sessionMinutes: 5,
  proposePause: true,
  parentCode: null,
};

const DIFFICULTIES: readonly Difficulty[] = ['facile', 'moyen', 'difficile'];

function fail(path: string): never {
  throw new Error(`réglages invalides : ${path}`);
}

function parseParentCode(value: unknown): ParentCode | null {
  if (value === null) return null;
  if (typeof value !== 'object' || value === null) fail('parentCode');
  const p = value as Record<string, unknown>;
  if (p.algo !== 'PBKDF2-SHA256') fail('parentCode.algo');
  if (typeof p.iterations !== 'number' || !Number.isInteger(p.iterations) || p.iterations < 1) {
    fail('parentCode.iterations');
  }
  if (typeof p.salt !== 'string' || typeof p.hash !== 'string') fail('parentCode.salt/hash');
  return { algo: 'PBKDF2-SHA256', iterations: p.iterations, salt: p.salt as string, hash: p.hash as string };
}

/** Valide les données brutes (sans l'enveloppe) et les renvoie typées. */
export function parseSettings(raw: unknown): Settings {
  if (typeof raw !== 'object' || raw === null) fail('data');
  const s = raw as Record<string, unknown>;
  if (!DIFFICULTIES.includes(s.difficulty as Difficulty)) fail('difficulty');
  if (s.sessionMinutes !== 5 && s.sessionMinutes !== 10) fail('sessionMinutes');
  if (typeof s.proposePause !== 'boolean') fail('proposePause');
  return {
    schemaVersion: 1,
    difficulty: s.difficulty as Difficulty,
    sessionMinutes: s.sessionMinutes,
    proposePause: s.proposePause,
    parentCode: parseParentCode(s.parentCode),
  };
}

export function loadSettings(store: Store): Settings {
  return store.read(SETTINGS_KEY, parseSettings) ?? DEFAULT_SETTINGS;
}

export function saveSettings(store: Store, settings: Settings): boolean {
  return store.write(SETTINGS_KEY, {
    difficulty: settings.difficulty,
    sessionMinutes: settings.sessionMinutes,
    proposePause: settings.proposePause,
    parentCode: settings.parentCode,
  });
}
