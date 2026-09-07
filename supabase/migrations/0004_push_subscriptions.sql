-- Web Push subscriptions (Push API + VAPID). One row per browser/device
-- that has granted notification permission and subscribed — this is a
-- single-tenant shop app with no auth, so subscriptions aren't scoped to a
-- user, just fanned out to on send.

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

create policy "push_subscriptions_rw" on push_subscriptions
  for all to anon, authenticated using (true) with check (true);
