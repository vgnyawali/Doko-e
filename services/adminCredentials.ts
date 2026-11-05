import { createHmac, pbkdf2Sync, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';

// Normalize copied configuration, never the password entered by the user.
export function normalizeCredential(value: string | undefined): string {
  const trimmed = (value || '').trim();
  const first = trimmed[0];
  return (first === '"' || first === "'") && trimmed.at(-1) === first
    ? trimmed.slice(1, -1).trim()
    : trimmed;
}

export function parsePasswordHash(stored: string) {
  const parts = stored.split('$');
  const [scheme, rounds, salt, digest] = parts;
  const iterations = Number(rounds);
  if (parts.length !== 4 || scheme !== 'pbkdf2' ||
      !Number.isInteger(iterations) || iterations < 100000 || iterations > 500000 ||
      !/^[A-Za-z0-9_-]{22}$/.test(salt || '') ||
      !/^[A-Za-z0-9_-]{43}$/.test(digest || '')) return null;
  return { iterations, salt: Buffer.from(salt, 'base64url'), digest: Buffer.from(digest, 'base64url') };
}

// PBKDF2's single SHA-256 block (32 bytes), for runtimes that reject native
// PBKDF2 at the configured iteration count. Never reduce the work factor.
export function deriveCompatiblePassword(password: string, salt: Uint8Array, iterations: number) {
  if (!Number.isInteger(iterations) || iterations < 100000 || iterations > 500000)
    throw new Error('Unsupported password work factor');
  const key = Buffer.from(password, 'utf8');
  let u = createHmac('sha256', key).update(salt).update(Buffer.from([0, 0, 0, 1])).digest();
  const result = Buffer.from(u);
  for (let i = 1; i < iterations; i++) {
    u = createHmac('sha256', key).update(u).digest();
    for (let j = 0; j < 32; j++) result[j] ^= u[j];
  }
  return result;
}

export function verifyPassword(password: string, hash: NonNullable<ReturnType<typeof parsePasswordHash>>) {
  // Same UTF-8 input, decoded salt, SHA-256 and 32-byte output as the generator.
  let actual: Buffer;
  try {
    actual = pbkdf2Sync(password, hash.salt, hash.iterations, 32, 'sha256');
  } catch {
    actual = deriveCompatiblePassword(password, hash.salt, hash.iterations);
  }
  return timingSafeEqual(actual, hash.digest);
}
