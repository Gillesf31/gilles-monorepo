-- Existing databases need the new three-week cadence in their frequency constraint.
alter table public.routines
  drop constraint if exists routines_frequency_check;

alter table public.routines
  add constraint routines_frequency_check
  check (
    frequency in (
      'daily',
      'weekly',
      'every-two-weeks',
      'every-three-weeks',
      'monthly',
      'every-three-months'
    )
  );
