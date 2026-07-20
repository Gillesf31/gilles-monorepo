-- Rituel is a single shared home board. Every installed app is joined to the
-- same household automatically; there is no pairing or invite-code flow.
alter table public.rituel_households
  add column if not exists is_global boolean not null default false;

update public.rituel_households
set is_global = false;

with first_household as (
  select id
  from public.rituel_households
  order by created_at, id
  limit 1
)
update public.rituel_households
set is_global = true
where id = (select id from first_household);

create unique index if not exists rituel_households_one_global_idx
  on public.rituel_households (is_global)
  where is_global;

create or replace function public.ensure_rituel_household()
returns table (id uuid, invite_code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  global_household_id uuid;
begin
  if current_user_id is null then
    raise exception 'An authenticated Rituel session is required';
  end if;

  select household.id into global_household_id
  from public.rituel_households as household
  where household.is_global;

  if global_household_id is null then
    insert into public.rituel_households (owner_id, is_global)
    values (current_user_id, true)
    returning public.rituel_households.id into global_household_id;
  end if;

  insert into public.rituel_household_members (household_id, user_id)
  values (global_household_id, current_user_id)
  on conflict do nothing;

  insert into public.rituel_profiles (user_id, active_household_id)
  values (current_user_id, global_household_id)
  on conflict (user_id) do update
    set active_household_id = excluded.active_household_id,
        updated_at = now();

  return query
  select household.id, household.invite_code
  from public.rituel_households as household
  where household.id = global_household_id;
end;
$$;

update public.rituel_profiles
set active_household_id = (
  select id from public.rituel_households where is_global
);
