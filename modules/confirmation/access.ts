import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
const lifetime = 60 * 60 * 24 * 7;
export function receiptCookieName(sessionId: string) {
  return `doko_receipt_${createHash('sha256').update(sessionId).digest('hex').slice(0, 24)}`;
}
function signature(sessionId: string, expires: string, key: string) {
  return createHmac('sha256', key.trim())
    .update(`doko-order-receipt:v1:${sessionId}:${expires}`)
    .digest('hex');
}
// Separate, HttpOnly proof binds order access to the browser that opened Checkout.
export function receiptCookie(
  sessionId: string,
  key: string,
  now = Date.now(),
) {
  const expires = String(Math.floor(now / 1000) + lifetime);
  return `${receiptCookieName(sessionId)}=${expires}.${signature(sessionId, expires, key)}; Path=/api/checkout/confirmation; HttpOnly; Secure; SameSite=Lax; Max-Age=${lifetime}`;
}
export function canReadReceipt(
  sessionId: string,
  cookies: string,
  key: string,
  now = Date.now(),
) {
  const name = receiptCookieName(sessionId) + '=';
  const value =
    cookies
      .split(';')
      .map((x) => x.trim())
      .find((x) => x.startsWith(name))
      ?.slice(name.length) || '';
  const [expires, sig] = value.split('.');
  if (
    !/^\d+$/.test(expires || '') ||
    !sig ||
    !/^[a-f0-9]{64}$/.test(sig) ||
    Number(expires) < Math.floor(now / 1000)
  )
    return false;
  return timingSafeEqual(
    Buffer.from(sig, 'hex'),
    Buffer.from(signature(sessionId, expires, key), 'hex'),
  );
}
