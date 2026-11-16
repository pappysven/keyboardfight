/**
 * Adversaires et décors disponibles, et tirage au sort d'un combat (décision D-032).
 * Pour en ajouter : déposer les fichiers dans public/, puis ajouter l'identifiant ici.
 */

/** Dossiers de public/sprites/ contenant un manifest.json d'adversaire. */
export const ENEMY_IDS: readonly string[] = ['ennemi', 'ennemi-bronze', 'ennemi-givre'];

/** Fichiers de public/decor/ (sans l'extension .png). */
export const DECOR_IDS: readonly string[] = ['arene', 'arene-aube', 'arene-brume'];

/**
 * Tire un élément au hasard, différent du précédent quand la liste le permet.
 * `random` est injectable pour les tests.
 */
export function pickRandom<T>(items: readonly T[], previous: T | null, random: () => number = Math.random): T {
  const pool = items.length > 1 ? items.filter((item) => item !== previous) : items;
  const picked = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
  if (picked === undefined) throw new Error('liste vide');
  return picked;
}

let lastEnemy: string | null = null;
let lastDecor: string | null = null;

/** Tirage d'un combat : jamais le même adversaire ni le même décor deux fois de suite. */
export function drawFight(random: () => number = Math.random): { enemyId: string; decorId: string } {
  lastEnemy = pickRandom(ENEMY_IDS, lastEnemy, random);
  lastDecor = pickRandom(DECOR_IDS, lastDecor, random);
  return { enemyId: lastEnemy, decorId: lastDecor };
}
