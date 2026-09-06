-- Tara Shop – initial schema
-- Mirrors the domain model captured from the design prototype; see
-- docs/design/tara-shop-prototype-notes.md and
-- docs/design/tara-shop-prototype-logic.js for the source-of-truth rules
-- this schema encodes.

create extension if not exists "pgcrypto";

-- Order fulfillment lifecycle (delivery pipeline).
create type fulfillment_status as enum ('pending', 'processing', 'done', 'cancel');

-- Order payment lifecycle. 'debt' means "delivered, customer owes for it".
create type payment_status as enum ('paid', 'debt', 'unpaid');

create type payment_method as enum ('cash', 'qr', 'debt', 'unpaid');

create type discount_type as enum ('vnd', 'pct');

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price integer not null check (price >= 0), -- VND, no decimals
  category_id uuid references categories(id) on delete set null,
  image_url text,
  created_at timestamptz not null default now()
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  created_at timestamptz not null default now()
);

-- Sentinel walk-in customer ("Khách lẻ" in the prototype). Every order needs
-- a customer_id; orders that aren't tied to a real customer point here
-- instead of using a nullable FK, so debt/order-history queries don't need
-- special-casing NULL.
insert into customers (id, name, phone)
values ('00000000-0000-0000-0000-000000000001', 'Khách lẻ', null);

create table orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete restrict,
  fulfillment_status fulfillment_status not null default 'pending',
  payment_status payment_status not null default 'unpaid',
  payment_method payment_method not null default 'unpaid',
  subtotal integer not null default 0 check (subtotal >= 0),
  fee integer not null default 0 check (fee >= 0),
  discount_amount integer not null default 0 check (discount_amount >= 0),
  discount_raw integer not null default 0,
  discount_type discount_type not null default 'vnd',
  total integer not null default 0 check (total >= 0),
  created_at timestamptz not null default now()
);

create index orders_customer_id_idx on orders (customer_id);
create index orders_created_at_idx on orders (created_at desc);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  -- Snapshot name/price at time of sale so editing a product later doesn't
  -- rewrite historical orders (see prototype notes).
  name text not null,
  price integer not null check (price >= 0),
  qty integer not null check (qty > 0)
);

create index order_items_order_id_idx on order_items (order_id);

-- Derived debt per customer: sum of orders delivered-but-unpaid
-- (payment_status = 'debt'). This replaces the mutable `customer.debt`
-- counter from the prototype so debt can't drift out of sync with orders.
-- To "collect" a customer's debt (mirrors collectDebt() in the prototype),
-- update their debt orders' payment_status to 'paid' rather than mutating a
-- counter, e.g.:
--   update orders set payment_status = 'paid', payment_method = 'cash'
--   where customer_id = :customer_id and payment_status = 'debt';
create view customer_debts as
select
  c.id as customer_id,
  c.name,
  c.phone,
  coalesce(sum(o.total) filter (where o.payment_status = 'debt'), 0) as debt
from customers c
left join orders o on o.customer_id = c.id
where c.id <> '00000000-0000-0000-0000-000000000001'
group by c.id, c.name, c.phone;

-- Row Level Security: enable now, add policies once auth/roles are defined.
-- Until then, all access from the client should go through the anon key
-- with policies added per-table (or via server-side service-role calls).
alter table categories enable row level security;
alter table products enable row level security;
alter table customers enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
