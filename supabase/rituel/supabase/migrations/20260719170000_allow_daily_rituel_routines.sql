-- The web form and domain model support daily routines. Existing databases
-- were created before that option was included in the frequency constraint.
alter table public.routines
  drop constraint if exists routines_frequency_check;

alter table public.routines
  add constraint routines_frequency_check
  check (
    frequency in (
      'daily',
      'weekly',
      'every-two-weeks',
      'monthly',
      'every-three-months'
    )
  );
