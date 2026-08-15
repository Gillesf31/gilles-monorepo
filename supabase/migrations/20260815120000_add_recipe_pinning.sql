alter table public.recipes
add column if not exists is_pinned boolean not null default false;
