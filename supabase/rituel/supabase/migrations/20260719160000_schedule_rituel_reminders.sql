-- The cron job runs in UTC. The Edge Function maps each subscription back to
-- its IANA zone and only sends during that device's local 8 AM hour.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'rituel_project_url') then
    perform vault.create_secret(
      'https://hamvnwyhltzihooexqkh.supabase.co',
      'rituel_project_url'
    );
  end if;

  if not exists (select 1 from vault.secrets where name = 'rituel_publishable_key') then
    perform vault.create_secret(
      'sb_publishable_VY_u4amy5tuIcExqesV7Lw_2NWU6iZW',
      'rituel_publishable_key'
    );
  end if;
end;
$$;

select cron.schedule(
  'deliver-rituel-reminders',
  '*/5 * * * *',
  $schedule$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'rituel_project_url') || '/functions/v1/deliver-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'rituel_publishable_key')
      ),
      body := jsonb_build_object('scheduled_at', now())
    );
  $schedule$
);
