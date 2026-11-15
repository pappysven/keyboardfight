/**
 * Manifeste de personnage : un fichier JSON par personnage, dans public/sprites/<id>/manifest.json.
 * Changer de personnage = changer de manifeste, sans toucher au code du jeu.
 * Format détaillé : docs/design.md.
 */
export const POSE_NAMES = ['idle', 'punch', 'kick', 'special', 'hit', 'win', 'ko'] as const;
export type PoseName = (typeof POSE_NAMES)[number];

export interface FrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PoseDef {
  /** Planche PNG, chemin relatif au fichier manifeste. */
  sheet: string;
  frameCount: number;
  /** Durée d'affichage d'une image, en millisecondes. */
  frameDuration: number;
  frames: FrameRect[];
}

export interface SpriteManifest {
  schemaVersion: 1;
  id: string;
  name: string;
  poses: Record<PoseName, PoseDef>;
}

export interface LoadedManifest {
  manifest: SpriteManifest;
  /** URL absolue du fichier manifeste : sert de base aux chemins de planches. */
  url: URL;
}

export class ManifestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ManifestError';
  }
}

function fail(path: string, message: string): never {
  throw new ManifestError(`${path} : ${message}`);
}

function asObject(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(path, 'objet attendu');
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length === 0) fail(path, 'texte non vide attendu');
  return value as string;
}

function asNonNegativeInt(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    fail(path, 'entier positif ou nul attendu');
  }
  return value;
}

function asPositiveInt(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    fail(path, 'entier strictement positif attendu');
  }
  return value;
}

function parseRect(value: unknown, path: string): FrameRect {
  const r = asObject(value, path);
  return {
    x: asNonNegativeInt(r.x, `${path}.x`),
    y: asNonNegativeInt(r.y, `${path}.y`),
    w: asPositiveInt(r.w, `${path}.w`),
    h: asPositiveInt(r.h, `${path}.h`),
  };
}

function parseSheetPath(value: unknown, path: string): string {
  const sheet = asString(value, path);
  const isAbsolute = sheet.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(sheet);
  if (isAbsolute || sheet.split('/').includes('..')) {
    fail(path, 'chemin relatif au manifeste attendu (pas de / initial, pas de ..)');
  }
  return sheet;
}

function parsePose(value: unknown, path: string): PoseDef {
  const p = asObject(value, path);
  const frameCount = asPositiveInt(p.frameCount, `${path}.frameCount`);
  if (!Array.isArray(p.frames)) fail(`${path}.frames`, 'liste attendue');
  const framesRaw = p.frames as unknown[];
  if (framesRaw.length !== frameCount) {
    fail(`${path}.frameCount`, `vaut ${frameCount}, mais ${framesRaw.length} cadres sont déclarés`);
  }
  return {
    sheet: parseSheetPath(p.sheet, `${path}.sheet`),
    frameCount,
    frameDuration: asPositiveInt(p.frameDuration, `${path}.frameDuration`),
    frames: framesRaw.map((frame, i) => parseRect(frame, `${path}.frames[${i}]`)),
  };
}

/** Valide un objet JSON déjà lu et le renvoie typé. Lève une ManifestError précise sinon. */
export function parseManifest(input: unknown): SpriteManifest {
  const root = asObject(input, 'manifeste');
  if (root.schemaVersion !== 1) fail('schemaVersion', 'seule la version 1 est connue');

  const posesRaw = asObject(root.poses, 'poses');
  for (const key of Object.keys(posesRaw)) {
    if (!(POSE_NAMES as readonly string[]).includes(key)) fail(`poses.${key}`, 'pose inconnue');
  }

  const poses = {} as Record<PoseName, PoseDef>;
  for (const pose of POSE_NAMES) {
    if (!(pose in posesRaw)) fail(`poses.${pose}`, 'pose manquante');
    poses[pose] = parsePose(posesRaw[pose], `poses.${pose}`);
  }

  return {
    schemaVersion: 1,
    id: asString(root.id, 'id'),
    name: asString(root.name, 'name'),
    poses,
  };
}

/** Télécharge et valide un manifeste. `fetchFn` est injectable pour les tests. */
export async function loadManifest(
  url: URL,
  fetchFn: (input: string) => Promise<Response> = (input) => fetch(input),
): Promise<LoadedManifest> {
  const response = await fetchFn(url.href);
  if (!response.ok) {
    throw new ManifestError(`manifeste introuvable (${response.status}) : ${url.pathname}`);
  }
  const json: unknown = await response.json();
  return { manifest: parseManifest(json), url };
}

/** URL absolue de la planche d'une pose. */
export function sheetUrl(loaded: LoadedManifest, pose: PoseName): string {
  return new URL(loaded.manifest.poses[pose].sheet, loaded.url).href;
}
