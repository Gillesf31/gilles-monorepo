alter table public.routines
  add column notification_time time without time zone not null default '08:00'
  constraint routines_notification_time_minute_check check (
    notification_time < time '24:00'
    and extract(second from notification_time) = 0
  );

comment on column public.routines.notification_time is
  'Daily reminder time, interpreted in each receiving Push subscription time zone.';

-- Reuse the existing job and its request configuration, checking every minute.
select cron.schedule(jobname, '* * * * *', command)
from cron.job
where jobname = 'deliver-rituel-reminders';
