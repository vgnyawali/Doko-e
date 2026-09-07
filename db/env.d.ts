declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    ADMIN_USER_IDS?: string;
    ADMIN_EMAILS?: string;
  }
}
