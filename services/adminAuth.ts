import { env } from 'cloudflare:workers';
import { headers } from 'next/headers';

import { normalizeCredential, parsePasswordHash, verifyPassword } from './adminCredentials';

// Read bindings during requests; hosted values come from Sites, not local files.
function credentials() {
  return {
    username: normalizeCredential(env.ADMIN_LOGIN_USERNAME),
    passwordHash: normalizeCredential(env.ADMIN_LOGIN_PASSWORD_HASH),
    sessionSecret: normalizeCredential(env.ADMIN_SESSION_SECRET),
  };
}
export function adminAuthDiagnostics() {
  const c = credentials();
  return {
    usernameConfigured: Boolean(c.username),
    passwordHashConfigured: Boolean(c.passwordHash),
    sessionSecretConfigured: Boolean(c.sessionSecret),
    hashStartsWithPbkdf2: c.passwordHash.startsWith('pbkdf2$'),
  };
}
export class AdminConfigurationError extends Error {}

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
  const secret = credentials().sessionSecret;
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
export async function authenticatePassword(username: string, password: string) {
  const c = credentials();
  const hash = parsePasswordHash(c.passwordHash);
  if (!c.username || !hash || c.sessionSecret.length < 32)
    throw new AdminConfigurationError('Admin login configuration is incomplete or invalid.');
  if (username.length > 120 || password.length > 256 ||
      username.trim() !== c.username || !verifyPassword(password, hash)) return null;
  return createSession(c.username);
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
  return !!(await sessionUsername(await cookieValue(request)));
}
