import { describe, expect, it } from 'vitest';
import { createParentCode, PARENT_CODE_MIN_LENGTH, verifyParentCode } from './code';

// Itérations réduites pour les tests ; la valeur de production est PBKDF2_ITERATIONS.
const FAST = 1000;

describe('code parent', () => {
  it('accepte le bon code et refuse les autres', async () => {
    const stored = await createParentCode('code-test', FAST);
    expect(await verifyParentCode('code-test', stored)).toBe(true);
    expect(await verifyParentCode('code-faux', stored)).toBe(false);
    expect(await verifyParentCode('CODE-TEST', stored)).toBe(false);
  });

  it('ne stocke jamais le code en clair', async () => {
    const stored = await createParentCode('code-test', FAST);
    expect(JSON.stringify(stored)).not.toContain('code-test');
    expect(stored.algo).toBe('PBKDF2-SHA256');
    expect(stored.iterations).toBe(FAST);
  });

  it('change de sel à chaque création', async () => {
    const a = await createParentCode('code-test', FAST);
    const b = await createParentCode('code-test', FAST);
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });

  it(`refuse un code de moins de ${PARENT_CODE_MIN_LENGTH} caractères`, async () => {
    await expect(createParentCode('abc', FAST)).rejects.toThrow(/au moins/);
  });
});
