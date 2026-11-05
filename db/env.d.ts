declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    STRIPE_SECRET_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;
    STRIPE_SHIPPING_RATE_ID?: string;
    RESEND_API_KEY?: string;
    ORDER_EMAIL_FROM?: string;
    ORDER_EMAIL_ENABLED?: string;
    ADMIN_USER_IDS?: string;
    ADMIN_EMAILS?: string;
    ADMIN_LOGIN_USERNAME?: string;
    ADMIN_LOGIN_PASSWORD_HASH?: string;
    ADMIN_SESSION_SECRET?: string;
  }
}
