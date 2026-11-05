CREATE TABLE checkout_orders (
 id text PRIMARY KEY NOT NULL,
 session_id text UNIQUE,
 status text NOT NULL,
 data text NOT NULL,
 payment_data text
);
