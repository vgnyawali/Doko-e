import { pbkdf2Sync, timingSafeEqual } from 'node:crypto';

const password = process.argv[2];
const stored = process.argv[3];
if (!password || !stored) {
  console.error('Usage: node scripts/verify-admin-password.mjs "password" "pbkdf2$150000$..."');
  process.exit(1);
}
const [scheme, iterationsText, saltText, digestText] = stored.trim().split('$');
const iterations = Number(iterationsText);
if (scheme !== 'pbkdf2' || !Number.isInteger(iterations) || !saltText || !digestText) {
  console.error('Invalid hash format. Expected pbkdf2$iterations$salt$digest.');
  process.exit(1);
}
const expected = Buffer.from(digestText, 'base64url');
const actual = pbkdf2Sync(password, Buffer.from(saltText, 'base64url'), iterations, expected.length, 'sha256');
console.log(timingSafeEqual(actual, expected) ? 'MATCH' : 'NO MATCH');
