/**
 * Couche d'accès au stockage local. Aucune donnée ne quitte l'ordinateur.
 *
 * - Backend par défaut : localStorage (Safari peut le refuser en navigation privée :
 *   on bascule alors sur une mémoire volatile, sans planter).
 * - Chaque valeur est enveloppée avec son schemaVersion (voir docs/data-contracts.md).
 * - Toutes les lectures/écritures sont protégées : une donnée illisible vaut "absente".
 */
export const STORAGE_PREFIX = 'kf.';
export const CURRENT_SCHEMA_VERSION = 1;

export interface Backend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface Envelope {
  schemaVersion: number;
  data: unknown;
}

export function createMemoryBackend(): Backend {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

/** localStorage si disponible et utilisable, sinon mémoire volatile. */
export function createBrowserBackend(win: Window = window): Backend {
  try {
    const ls = win.localStorage;
    const probe = `${STORAGE_PREFIX}probe`;
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return createMemoryBackend();
  }
}

export class Store {
  constructor(
    private readonly backend: Backend,
    private readonly prefix: string = STORAGE_PREFIX,
  ) {}

  /**
   * Lit une clé. `parse` reçoit la donnée brute et doit lever une erreur si elle est invalide.
   * Renvoie undefined si la clé est absente, illisible ou d'une autre version de schéma.
   */
  read<T>(key: string, parse: (raw: unknown) => T): T | undefined {
    try {
      const text = this.backend.getItem(this.prefix + key);
      if (text === null) return undefined;
      const envelope = JSON.parse(text) as Envelope;
      if (envelope.schemaVersion !== CURRENT_SCHEMA_VERSION) return undefined;
      return parse(envelope.data);
    } catch {
      return undefined;
    }
  }

  /** Écrit une clé. Renvoie false si l'écriture a échoué (quota, stockage bloqué). */
  write(key: string, data: unknown): boolean {
    try {
      const envelope: Envelope = { schemaVersion: CURRENT_SCHEMA_VERSION, data };
      this.backend.setItem(this.prefix + key, JSON.stringify(envelope));
      return true;
    } catch {
      return false;
    }
  }

  remove(key: string): void {
    try {
      this.backend.removeItem(this.prefix + key);
    } catch {
      // rien à faire : la clé n'est pas lisible de toute façon
    }
  }
}

export function createAppStore(win: Window = window): Store {
  return new Store(createBrowserBackend(win));
}
