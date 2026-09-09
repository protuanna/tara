-- Expense ledger ("Chi") — a simple flat list of money the shop paid out
-- (restock, rent, utilities, wages, ...), separate from the order/revenue
-- side of the schema. No expense-category table: each row is just a
-- freeform name + amount + optional note, matching what the home-screen
-- "Chi" quick action needs (a list, and a way to add an entry) without
-- inventing a taxonomy nobody asked for.

create table expenses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount integer not null check (amount > 0), -- VND, no decimals
  note text,
  created_at timestamptz not null default now()
);

create index expenses_created_at_idx on expenses (created_at desc);

alter table expenses enable row level security;

create policy "expenses_rw" on expenses
  for all to anon, authenticated using (true) with check (true);
