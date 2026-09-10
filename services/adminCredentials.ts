import { pbkdf2Sync, timingSafeEqual } from 'node:crypto';

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

export function verifyPassword(password: string, hash: NonNullable<ReturnType<typeof parsePasswordHash>>) {
  // Same UTF-8 input, decoded salt, SHA-256 and 32-byte output as the generator.
  const actual = pbkdf2Sync(password, hash.salt, hash.iterations, 32, 'sha256');
  return timingSafeEqual(actual, hash.digest);
}
