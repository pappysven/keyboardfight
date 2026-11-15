import type { Progression, SessionRecord, TechniqueId, TechniqueProgress } from '../data/types';

/**
 * Arbre de techniques et règle de déblocage (docs/progression.md).
 * Fonctions pures : aucun accès au stockage ici (voir src/storage/progression-repo.ts).
 */

export const TECHNIQUE_IDS: readonly TechniqueId[] = [
  'repos',
  'haute',
  'basse',
  'maj-accents',
  'chiffres',
  'mots',
  'phrases',
];

export const TECHNIQUE_LABELS: Record<TechniqueId, string> = {
  repos: 'Rangée de repos',
  haute: 'Rangée haute',
  basse: 'Rangée basse',
  'maj-accents': 'Majuscules et accents',
  chiffres: 'Chiffres',
  mots: 'Mots',
  phrases: 'Phrases',
};

/** Prérequis de chaque étape : toutes doivent être maîtrisées. */
export const PREREQUISITES: Record<TechniqueId, readonly TechniqueId[]> = {
  repos: [],
  haute: ['repos'],
  basse: ['repos'],
  'maj-accents': ['haute', 'basse'],
  chiffres: ['haute', 'basse'],
  mots: ['maj-accents', 'chiffres'],
  phrases: ['mots'],
};

/** Critère de maîtrise : précision ≥ 90 % sur les 3 dernières sessions (D-016, provisoire). */
export const MASTERY_PRECISION = 0.9;
export const MASTERY_SESSIONS = 3;

export function emptyProgression(now: string): Progression {
  const techniques = {} as Record<TechniqueId, TechniqueProgress>;
  for (const id of TECHNIQUE_IDS) {
    techniques[id] = { unlockedAt: id === 'repos' ? now : null, sessions: [] };
  }
  return { schemaVersion: 1, techniques };
}

export function isMastered(sessions: readonly SessionRecord[]): boolean {
  if (sessions.length < MASTERY_SESSIONS) return false;
  return sessions.slice(-MASTERY_SESSIONS).every((s) => s.precision >= MASTERY_PRECISION);
}

export interface RecordResult {
  progression: Progression;
  /** Étapes débloquées par cette session. */
  unlocked: TechniqueId[];
}

/**
 * Ajoute une session à une étape déjà ouverte, puis ouvre les étapes dont les prérequis
 * sont maîtrisés. Une session sans frappe n'est pas enregistrée. Une étape ouverte reste ouverte.
 */
export function recordSession(
  progression: Progression,
  technique: TechniqueId,
  session: SessionRecord,
  now: string,
): RecordResult {
  const current = progression.techniques[technique];
  if (session.keystrokes === 0 || current.unlockedAt === null) {
    return { progression, unlocked: [] };
  }

  const techniques: Record<TechniqueId, TechniqueProgress> = {
    ...progression.techniques,
    [technique]: { ...current, sessions: [...current.sessions, session] },
  };

  const unlocked: TechniqueId[] = [];
  for (const id of TECHNIQUE_IDS) {
    const step = techniques[id];
    if (step.unlockedAt !== null) continue;
    const ready = PREREQUISITES[id].every((pre) => isMastered(techniques[pre].sessions));
    if (ready) {
      techniques[id] = { ...step, unlockedAt: now };
      unlocked.push(id);
    }
  }

  return { progression: { schemaVersion: 1, techniques }, unlocked };
}
