import { env } from 'cloudflare:workers';
import { headers } from 'next/headers';
import { Buffer } from 'node:buffer';
import { database } from './repository';
import { parsePasswordHash, verifyPassword } from './adminCredentials';

const COOKIE = 'doko_partner_session';
const MAX_AGE = 12 * 60 * 60;
const encoder = new TextEncoder();
const b64 = (value: ArrayBuffer | Uint8Array) =>
  Buffer.from(
    value instanceof Uint8Array ? value : new Uint8Array(value),
  ).toString('base64url');
const unb64 = (value: string) => Buffer.from(value, 'base64url');
const secret = () => (env.PARTNER_SESSION_SECRET || '').trim();

async function key() {
  if (secret().length < 32) return null;
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}
export async function hashInviteToken(token: string) {
  return b64(await crypto.subtle.digest('SHA-256', encoder.encode(token)));
}
export function createInviteToken() {
  return b64(crypto.getRandomValues(new Uint8Array(32)));
}
export async function hashPartnerPassword(password: string) {
  const iterations = 150000,
    salt = crypto.getRandomValues(new Uint8Array(16));
  const material = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const digest = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    material,
    256,
  );
  return `pbkdf2$${iterations}$${b64(salt)}$${b64(digest)}`;
}
export function validPartnerPassword(password: string) {
  return password.length >= 12 && password.length <= 256;
}
async function signedSession(id: string, version: number) {
  const signingKey = await key();
  if (!signingKey) throw Error('Partner session configuration is incomplete.');
  const payload = b64(
    encoder.encode(
      JSON.stringify({
        id,
        version,
        expires: Math.floor(Date.now() / 1000) + MAX_AGE,
      }),
    ),
  );
  const signature = b64(
    await crypto.subtle.sign('HMAC', signingKey, encoder.encode(payload)),
  );
  return `${payload}.${signature}`;
}
async function cookie(request?: Request) {
  const source = request?.headers ?? (await headers());
  return (
    source
      .get('cookie')
      ?.split(';')
      .map((x) => x.trim())
      .find((x) => x.startsWith(`${COOKIE}=`))
      ?.slice(COOKIE.length + 1) || null
  );
}
export async function partnerSession(request?: Request) {
  const value = await cookie(request);
  if (!value) return null;
  const [payload, signature] = value.split('.');
  const signingKey = await key();
  if (!payload || !signature || !signingKey) return null;
  if (
    !(await crypto.subtle.verify(
      'HMAC',
      signingKey,
      unb64(signature),
      encoder.encode(payload),
    ))
  )
    return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(unb64(payload))) as {
      id: string;
      version: number;
      expires: number;
    };
    if (!data.id || data.expires < Math.floor(Date.now() / 1000)) return null;
    const row = await database()
      .prepare(
        `SELECT m.id,m.partner_id,m.email,m.role,m.status,m.session_version,p.status partner_status,p.name,p.slug,p.profile_data,p.created_at,p.updated_at FROM partner_memberships m JOIN partners p ON p.id=m.partner_id WHERE m.id=?`,
      )
      .bind(data.id)
      .first<Record<string, unknown>>();
    if (
      !row ||
      row.status !== 'active' ||
      row.partner_status !== 'active' ||
      Number(row.session_version) !== data.version
    )
      return null;
    return row;
  } catch {
    return null;
  }
}
export async function authenticatePartner(email: string, password: string) {
  const rows = await database()
    .prepare(
      `SELECT m.id,m.password_hash,m.session_version FROM partner_memberships m JOIN partners p ON p.id=m.partner_id WHERE lower(m.email)=lower(?) AND m.status='active' AND p.status='active'`,
    )
    .bind(email.trim())
    .all<{
      id: string;
      password_hash: string | null;
      session_version: number;
    }>();
  if (rows.results.length !== 1) return null;
  const row = rows.results[0],
    hash = parsePasswordHash(row.password_hash || '');
  if (!hash || password.length > 256 || !verifyPassword(password, hash))
    return null;
  return signedSession(row.id, row.session_version);
}
export async function createPartnerSession(id: string, version: number) {
  return signedSession(id, version);
}
export function sessionCookie(value: string) {
  return `${COOKIE}=${value}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;
}
export function clearPartnerCookie() {
  return `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}
