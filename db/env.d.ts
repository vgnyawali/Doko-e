declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    ADMIN_USER_IDS?: string;
    ADMIN_EMAILS?: string;
    ADMIN_LOGIN_USERNAME?: string;
    ADMIN_LOGIN_PASSWORD_HASH?: string;
    ADMIN_SESSION_SECRET?: string;
  }
}
