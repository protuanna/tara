-- Soft-delete for expenses: "Xóa" on /expenses now asks for confirmation
-- and just marks a row deleted rather than removing it, so a mis-tapped
-- delete on a money ledger doesn't lose the record outright.

alter table expenses add column deleted_at timestamptz;
