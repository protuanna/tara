-- PayOS integration: every order gets a payment QR at creation time.
-- payOS requires a unique numeric orderCode per payment link — a dedicated
-- sequence guarantees that without collision risk (orders.id is a UUID,
-- not numeric, so it can't double as the orderCode).
create sequence payos_order_code_seq start with 700000 increment by 1;

alter table orders
  add column payos_order_code bigint unique default nextval('payos_order_code_seq'),
  add column payos_qr_code text,
  add column payos_checkout_url text,
  add column payos_payment_link_id text;
