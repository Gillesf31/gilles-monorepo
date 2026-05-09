create table if not exists public.shopping_lists (
  id text primary key,
  selected_recipe_ids text[] not null default '{}',
  multipliers_by_recipe_id jsonb not null default '{}',
  checked_item_ids text[] not null default '{}',
  custom_items jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

insert into public.shopping_lists (id)
values ('default')
on conflict (id) do nothing;
