-- Lets application code mint a fresh payOS orderCode outside of an INSERT's
-- column default — needed when regenerating a payment link during
-- ordersService.update(): payOS payment links can't be modified in place
-- (only cancelled + recreated), and reusing a cancelled link's orderCode
-- isn't documented as safe, so an edited order always gets a brand new one.
create or replace function next_payos_order_code() returns bigint
language sql
as $$ select nextval('payos_order_code_seq') $$;

grant execute on function next_payos_order_code() to anon, authenticated;
