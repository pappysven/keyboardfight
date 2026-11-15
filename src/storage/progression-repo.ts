import type { Progression, SessionRecord, TechniqueId, TechniqueProgress } from '../data/types';
import { emptyProgression, TECHNIQUE_IDS } from '../game/progression';
import type { Store } from './store';

/** Clé de stockage : kf.progression (docs/data-contracts.md). */
export const PROGRESSION_KEY = 'progression';

function fail(path: string): never {
  throw new Error(`progression invalide : ${path}`);
}

function asRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail(path);
  return value as Record<string, unknown>;
}

function parseSession(value: unknown, path: string): SessionRecord {
  const s = asRecord(value, path);
  if (typeof s.endedAt !== 'string') fail(`${path}.endedAt`);
  if (typeof s.keystrokes !== 'number' || typeof s.correct !== 'number') fail(`${path}.keystrokes`);
  if (typeof s.precision !== 'number' || s.precision < 0 || s.precision > 1) fail(`${path}.precision`);
  return {
    endedAt: s.endedAt as string,
    keystrokes: s.keystrokes as number,
    correct: s.correct as number,
    precision: s.precision as number,
  };
}

function parseTechnique(value: unknown, path: string): TechniqueProgress {
  const t = asRecord(value, path);
  if (t.unlockedAt !== null && typeof t.unlockedAt !== 'string') fail(`${path}.unlockedAt`);
  if (!Array.isArray(t.sessions)) fail(`${path}.sessions`);
  return {
    unlockedAt: t.unlockedAt as string | null,
    sessions: (t.sessions as unknown[]).map((s, i) => parseSession(s, `${path}.sessions[${i}]`)),
  };
}

/** Valide la donnée brute (sans l'enveloppe) et la renvoie typée. Lève une erreur sinon. */
export function parseProgression(raw: unknown): Progression {
  const data = asRecord(raw, 'data');
  const techniquesRaw = asRecord(data.techniques, 'techniques');
  const techniques = {} as Record<TechniqueId, TechniqueProgress>;
  for (const id of TECHNIQUE_IDS) {
    techniques[id] = parseTechnique(techniquesRaw[id], `techniques.${id}`);
  }
  return { schemaVersion: 1, techniques };
}

/** Charge la progression ; si elle est absente ou illisible, repart de l'état initial. */
export function loadProgression(store: Store, now: string): Progression {
  return store.read(PROGRESSION_KEY, parseProgression) ?? emptyProgression(now);
}

/** Enregistre la progression (seulement les agrégats de session, jamais les frappes). */
export function saveProgression(store: Store, progression: Progression): boolean {
  return store.write(PROGRESSION_KEY, { techniques: progression.techniques });
}
