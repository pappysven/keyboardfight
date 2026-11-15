/**
 * Schémas des données locales. La version de référence est docs/data-contracts.md.
 * Toute évolution incompatible incrémente le schemaVersion correspondant.
 */

export type Difficulty = 'facile' | 'moyen' | 'difficile';

/** Modes d'affichage d'une liste de révision. */
export type DisplayMode = 'affiche' | 'cache-3s' | 'dictee';

/** Identifiants des étapes de l'arbre de techniques (docs/progression.md). */
export type TechniqueId =
  | 'repos'
  | 'haute'
  | 'basse'
  | 'maj-accents'
  | 'chiffres'
  | 'mots'
  | 'phrases';

export interface Profile {
  schemaVersion: 1;
  displayName: string;
  createdAt: string; // ISO 8601
}

export interface ParentCode {
  algo: 'PBKDF2-SHA256';
  iterations: number;
  salt: string; // base64
  hash: string; // base64, jamais le code en clair
}

export interface Settings {
  schemaVersion: 1;
  difficulty: Difficulty;
  sessionMinutes: 5 | 10;
  proposePause: boolean;
  parentCode: ParentCode | null;
}

export interface SessionRecord {
  endedAt: string; // ISO 8601
  keystrokes: number;
  correct: number;
  precision: number; // 0..1
}

export interface TechniqueProgress {
  unlockedAt: string | null;
  sessions: SessionRecord[];
}

export interface Progression {
  schemaVersion: 1;
  techniques: Record<TechniqueId, TechniqueProgress>;
}

export interface BlockedWord {
  word: string;
  reason: 'parent' | 'auto';
  addedAt: string;
}

export interface BlockedWords {
  schemaVersion: 1;
  entries: BlockedWord[];
}

export interface RevisionList {
  id: string;
  name: string;
  displayMode: DisplayMode;
  words: string[];
  createdAt: string;
}

export interface RevisionLists {
  schemaVersion: 1;
  lists: RevisionList[];
}
