import { env } from 'cloudflare:workers';
import { headers } from 'next/headers';
import { getChatGPTUser } from '@/app/chatgpt-auth';

const SESSION_COOKIE = 'doko_admin_session';
const SESSION_MAX_AGE = 8 * 60 * 60;
const encoder = new TextEncoder();
function base64url(bytes: ArrayBuffer | Uint8Array) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let value = '';
  for (const byte of view) value += String.fromCharCode(byte);
  return btoa(value)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}
function fromBase64url(value: string) {
  const normalized =
    value.replaceAll('-', '+').replaceAll('_', '/') +
    '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(normalized);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
async function signingKey() {
  const secret = env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) return null;
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}
async function createSession(username: string) {
  const key = await signingKey();
  if (!key) return null;
  const payload = base64url(
    encoder.encode(
      JSON.stringify({
        username,
        expires: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
      }),
    ),
  );
  const signature = base64url(
    await crypto.subtle.sign('HMAC', key, encoder.encode(payload)),
  );
  return `${payload}.${signature}`;
}
async function sessionUsername(value: string | null) {
  if (!value) return null;
  const [payload, signature] = value.split('.');
  if (!payload || !signature) return null;
  const key = await signingKey();
  if (
    !key ||
    !(await crypto.subtle.verify(
      'HMAC',
      key,
      fromBase64url(signature),
      encoder.encode(payload),
    ))
  )
    return null;
  try {
    const decoded = JSON.parse(
      new TextDecoder().decode(fromBase64url(payload)),
    ) as { username?: string; expires?: number };
    return decoded.username &&
      decoded.expires &&
      decoded.expires >= Math.floor(Date.now() / 1000)
      ? decoded.username
      : null;
  } catch {
    return null;
  }
}
async function passwordMatches(password: string) {
  const stored = (env.ADMIN_LOGIN_PASSWORD_HASH || '')
    .trim()
    .replace(/^("|')|("|')$/g, '');
  if (!stored || password.length > 256) return false;
  const [scheme, iterationsText, saltText, digestText] = stored.split('$');
  const iterations = Number(iterationsText);
  if (
    scheme !== 'pbkdf2' ||
    !Number.isInteger(iterations) ||
    iterations < 100000 ||
    iterations > 500000 ||
    !saltText ||
    !digestText
  )
    return false;
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits'],
    );
    const bits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: fromBase64url(saltText),
        iterations,
        hash: 'SHA-256',
      },
      key,
      256,
    );
    const actual = base64url(bits);
    const expected = encoder.encode(digestText),
      received = encoder.encode(actual);
    return (
      received.length === expected.length &&
      received.every((byte, index) => byte === expected[index])
    );
  } catch {
    return false;
  }
}
export async function authenticatePassword(username: string, password: string) {
  const configuredUsername = (env.ADMIN_LOGIN_USERNAME || '').trim();
  if (
    !configuredUsername ||
    username.length > 120 ||
    password.length > 256 ||
    username.trim() !== configuredUsername ||
    !(await passwordMatches(password))
  )
    return null;
  return createSession(username);
}
export function sessionCookieHeader(value: string) {
  return `${SESSION_COOKIE}=${value}; Path=/; Max-Age=${SESSION_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;
}
export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}
async function cookieValue(request?: Request) {
  const requestHeaders = request?.headers ?? (await headers());
  const cookie = requestHeaders
    .get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  return cookie?.slice(SESSION_COOKIE.length + 1) ?? null;
}
// Authorization is checked on every mutation. Never grant admin to the first visitor.
export async function isAdmin(request?: Request) {
  const user = await getChatGPTUser();
  const ids = (env.ADMIN_USER_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const emails = (env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (
    user &&
    (ids.includes(user.userId) || emails.includes(user.email.toLowerCase()))
  )
    return true;
  return !!(await sessionUsername(await cookieValue(request)));
}
