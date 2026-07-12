alter table public.recipes
add column if not exists is_work_in_progress boolean not null default false;
