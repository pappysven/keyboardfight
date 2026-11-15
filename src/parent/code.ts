import type { ParentCode } from '../data/types';

/**
 * Code parent : seulement un hachage PBKDF2-SHA256 est stocké, jamais le code (AGENTS.md, règle 6).
 * Protection de confort contre une erreur de clic, pas contre une personne déterminée :
 * tout le stockage est local.
 */
export const PARENT_CODE_MIN_LENGTH = 4;
export const PBKDF2_ITERATIONS = 310_000;

export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function fromBase64(text: string): Uint8Array {
  return Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
}

async function derive(code: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(code) as BufferSource,
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    key,
    256,
  );
  return toBase64(new Uint8Array(bits));
}

/** Crée le bloc à stocker pour un nouveau code. Lève une erreur si le code est trop court. */
export async function createParentCode(
  code: string,
  iterations: number = PBKDF2_ITERATIONS,
): Promise<ParentCode> {
  if (code.length < PARENT_CODE_MIN_LENGTH) {
    throw new Error(`Le code doit compter au moins ${PARENT_CODE_MIN_LENGTH} caractères.`);
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return {
    algo: 'PBKDF2-SHA256',
    iterations,
    salt: toBase64(salt),
    hash: await derive(code, salt, iterations),
  };
}

export async function verifyParentCode(code: string, stored: ParentCode): Promise<boolean> {
  const hash = await derive(code, fromBase64(stored.salt), stored.iterations);
  return hash === stored.hash;
}
