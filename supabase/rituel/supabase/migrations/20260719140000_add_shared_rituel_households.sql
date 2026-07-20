-- A device's anonymous auth identity is not a household: each installation
-- receives a different identity. Households now have their own ID, an
-- invite code, and a membership list so several installed devices can share
-- routines and receive the same reminders.
alter table public.rituel_households
  add column if not exists owner_id uuid references auth.users (id) on delete cascade,
  add column if not exists invite_code text;

update public.rituel_households
set owner_id = id
where owner_id is null;

update public.rituel_households
set invite_code = upper(substr(md5(random()::text || clock_timestamp()::text || id::text), 1, 12))
where invite_code is null;

alter table public.rituel_households
  alter column owner_id set not null,
  alter column invite_code set not null,
  alter column invite_code set default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 12));

create unique index if not exists rituel_households_invite_code_idx
  on public.rituel_households (invite_code);

create table if not exists public.rituel_household_members (
  household_id uuid not null references public.rituel_households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table if not exists public.rituel_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  active_household_id uuid not null references public.rituel_households (id) on delete restrict,
  updated_at timestamptz not null default now()
);

insert into public.rituel_household_members (household_id, user_id)
select id, owner_id from public.rituel_households
on conflict do nothing;

insert into public.rituel_profiles (user_id, active_household_id)
select owner_id, id from public.rituel_households
on conflict (user_id) do nothing;

create or replace function public.is_rituel_household_member(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.rituel_household_members
    where household_id = target_household_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.ensure_rituel_household()
returns table (id uuid, invite_code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  household_id uuid;
begin
  if current_user_id is null then
    raise exception 'An authenticated Rituel session is required';
  end if;

  select active_household_id into household_id
  from public.rituel_profiles
  where user_id = current_user_id;

  if household_id is null then
    insert into public.rituel_households (owner_id)
    values (current_user_id)
    returning public.rituel_households.id into household_id;

    insert into public.rituel_household_members (household_id, user_id)
    values (household_id, current_user_id);

    insert into public.rituel_profiles (user_id, active_household_id)
    values (current_user_id, household_id);
  end if;

  return query
  select household.id, household.invite_code
  from public.rituel_households as household
  where household.id = household_id;
end;
$$;

create or replace function public.join_rituel_household(household_invite_code text)
returns table (id uuid, invite_code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  matched_household_id uuid;
begin
  if current_user_id is null then
    raise exception 'An authenticated Rituel session is required';
  end if;

  select household.id into matched_household_id
  from public.rituel_households as household
  where household.invite_code = upper(btrim(household_invite_code));

  if matched_household_id is null then
    raise exception 'Unknown Rituel household code';
  end if;

  insert into public.rituel_household_members (household_id, user_id)
  values (matched_household_id, current_user_id)
  on conflict do nothing;

  insert into public.rituel_profiles (user_id, active_household_id)
  values (current_user_id, matched_household_id)
  on conflict (user_id) do update
    set active_household_id = excluded.active_household_id,
        updated_at = now();

  return query
  select household.id, household.invite_code
  from public.rituel_households as household
  where household.id = matched_household_id;
end;
$$;

alter table public.rituel_household_members enable row level security;
alter table public.rituel_profiles enable row level security;

drop policy if exists "Rituel households belong to their signed-in identity" on public.rituel_households;
drop policy if exists "Rituel routines belong to their household" on public.routines;
drop policy if exists "Rituel Push subscriptions belong to their household" on public.push_subscriptions;

create policy "Rituel household members can read their household"
  on public.rituel_households for select to authenticated
  using (public.is_rituel_household_member(id));

create policy "Rituel household owners can update their household"
  on public.rituel_households for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "Rituel members can read their memberships"
  on public.rituel_household_members for select to authenticated
  using (user_id = auth.uid());

create policy "Rituel users can read their profile"
  on public.rituel_profiles for select to authenticated
  using (user_id = auth.uid());

create policy "Rituel members can access shared routines"
  on public.routines for all to authenticated
  using (public.is_rituel_household_member(household_id))
  with check (public.is_rituel_household_member(household_id));

create policy "Rituel members can access shared Push subscriptions"
  on public.push_subscriptions for all to authenticated
  using (public.is_rituel_household_member(household_id))
  with check (public.is_rituel_household_member(household_id));

grant execute on function public.ensure_rituel_household() to authenticated;
grant execute on function public.join_rituel_household(text) to authenticated;
