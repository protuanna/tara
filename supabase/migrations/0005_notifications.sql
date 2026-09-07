-- In-app notification feed, backing the header bell icon. Populated
-- alongside Web Push sends (see /api/push/send) so there's a persistent,
-- in-app record of what was pushed, not just the OS-level notification.

create table notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table notifications enable row level security;

create policy "notifications_rw" on notifications
  for all to anon, authenticated using (true) with check (true);
