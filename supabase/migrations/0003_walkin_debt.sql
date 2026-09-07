-- customer_debts previously excluded the walk-in customer ("Khách lẻ") by
-- id, matching the original design prototype where an anonymous customer
-- can't be billed later. Product decision reversed: a "pay later" sale to a
-- walk-in is still money the shop is owed, just not attributable to one
-- named person — ordersService.deliver() now marks that as debt like any
-- other customer (see src/lib/services/ordersService.ts), and it should
-- surface here too, landing on the "Khách lẻ" row as one lump sum.
create or replace view customer_debts as
select
  c.id as customer_id,
  c.name,
  c.phone,
  coalesce(sum(o.total) filter (where o.payment_status = 'debt'), 0) as debt
from customers c
left join orders o on o.customer_id = c.id
group by c.id, c.name, c.phone;

-- create or replace view preserves view options in Postgres as long as the
-- column list is unchanged, but re-asserting this is cheap insurance:
-- views run with the *owner's* privileges by default, which would let this
-- one silently bypass RLS (see migration 0002).
alter view customer_debts set (security_invoker = true);
