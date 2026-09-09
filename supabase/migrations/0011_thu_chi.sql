-- The "Chi" (expense-only) ledger becomes "Thu Chi" (income + expense) —
-- same table, a new `type` column distinguishes cash in ("thu") from cash
-- out ("chi") instead of adding a second table. Existing rows are all
-- expenses, so the column defaults/backfills to 'chi' cleanly.
create type cash_entry_type as enum ('thu', 'chi');

alter table expenses add column type cash_entry_type not null default 'chi';
