import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
// Authorization is checked on every mutation. Never grant admin to the first visitor.
export async function isAdmin() {
  const user = await getChatGPTUser();
  const ids = (env.ADMIN_USER_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const emails = (env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return (
    !!user &&
    (ids.includes(user.userId) || emails.includes(user.email.toLowerCase()))
  );
}
