-- Tara Shop – open RLS policies (single-tenant, no auth)
--
-- 0001 enabled RLS on every table with zero policies, which correctly
-- denies ALL access — including from the anon/publishable key the app
-- uses. This project has no per-user auth (one shop, one device/anon key),
-- so grant full read/write to anon + authenticated on every table.
--
-- If auth is ever added later, replace these "using (true)" policies with
-- ones scoped to auth.uid() / a shop_id column — don't just disable RLS.

create policy "categories_rw" on categories
  for all to anon, authenticated using (true) with check (true);

create policy "products_rw" on products
  for all to anon, authenticated using (true) with check (true);

create policy "customers_rw" on customers
  for all to anon, authenticated using (true) with check (true);

create policy "orders_rw" on orders
  for all to anon, authenticated using (true) with check (true);

create policy "order_items_rw" on order_items
  for all to anon, authenticated using (true) with check (true);

-- Views run with the *view owner's* privileges by default in Postgres,
-- which silently bypasses RLS on the underlying tables unless
-- security_invoker is set. Harmless right now (everything is already
-- open above), but set it so this stays correct if RLS is ever tightened.
alter view customer_debts set (security_invoker = true);
