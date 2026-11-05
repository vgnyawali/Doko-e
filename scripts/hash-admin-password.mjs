import { randomBytes, pbkdf2Sync } from 'node:crypto';
const password = process.argv[2];
if (!password || password.length < 12) {
  console.error(
    'Usage: node scripts/hash-admin-password.mjs "a-password-at-least-12-characters"',
  );
  process.exit(1);
}
const iterations = 150000;
const salt = randomBytes(16);
const digest = pbkdf2Sync(password, salt, iterations, 32, 'sha256');
const base64url = (value) => value.toString('base64url');
console.log(`pbkdf2$${iterations}$${base64url(salt)}$${base64url(digest)}`);
