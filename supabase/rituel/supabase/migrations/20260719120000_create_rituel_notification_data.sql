-- A Supabase anonymous user is Rituel's initial single-person household
-- identity. This keeps browser data and Push subscriptions scoped without
-- introducing a visible account flow in the MVP.
create table if not exists public.rituel_households (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.rituel_households (id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  note text,
  first_due_date date not null,
  next_due_date date not null,
  frequency text not null check (
    frequency in ('daily', 'weekly', 'every-two-weeks', 'monthly', 'every-three-months')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists routines_household_next_due_date_idx
  on public.routines (household_id, next_due_date);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.rituel_households (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  time_zone text not null check (char_length(btrim(time_zone)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_time_zone_idx
  on public.push_subscriptions (time_zone);

comment on column public.push_subscriptions.time_zone is
  'IANA time-zone identifier, for example America/Toronto.';

-- The worker claims a delivery before calling the Push provider. The unique
-- key makes retries idempotent for one routine/device/local calendar date.
create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines (id) on delete cascade,
  push_subscription_id uuid not null references public.push_subscriptions (id) on delete cascade,
  delivery_date date not null,
  kind text not null check (kind in ('due', 'reminder')),
  sent_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  unique (routine_id, push_subscription_id, delivery_date)
);

create index if not exists notification_deliveries_pending_idx
  on public.notification_deliveries (sent_at)
  where sent_at is null;

create or replace function public.set_rituel_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_routines_updated_at
  before update on public.routines
  for each row execute function public.set_rituel_updated_at();

create trigger set_push_subscriptions_updated_at
  before update on public.push_subscriptions
  for each row execute function public.set_rituel_updated_at();

alter table public.rituel_households enable row level security;
alter table public.routines enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_deliveries enable row level security;

create policy "Rituel households belong to their signed-in identity"
  on public.rituel_households
  for all
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Rituel routines belong to their household"
  on public.routines
  for all
  to authenticated
  using (household_id = auth.uid())
  with check (household_id = auth.uid());

create policy "Rituel Push subscriptions belong to their household"
  on public.push_subscriptions
  for all
  to authenticated
  using (household_id = auth.uid())
  with check (household_id = auth.uid());

-- Only the server-side scheduled worker reads or writes delivery records; it
-- uses the service-role key, which bypasses RLS. The browser never needs them.
