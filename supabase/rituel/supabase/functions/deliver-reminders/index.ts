import {
  ApplicationServer,
  importVapidKeys,
  PushMessageError,
  Urgency,
} from '@negrel/webpush';
import { createClient } from '@supabase/supabase-js';

type PushSubscriptionRow = {
  id: string;
  household_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  time_zone: string;
};

type RoutineRow = {
  id: string;
  household_id: string;
  name: string;
  next_due_date: string;
};

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const publicKey =
    Deno.env.get('SUPABASE_ANON_KEY') ??
    Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  if (!publicKey || request.headers.get('apikey') !== publicKey) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = requireSecret('SUPABASE_URL');
  const adminClient = createClient(
    supabaseUrl,
    requireSecret('SUPABASE_SERVICE_ROLE_KEY'),
  );
  const now = new Date();
  const { data: subscriptions, error: subscriptionsError } = await adminClient
    .from('push_subscriptions')
    .select('id, household_id, endpoint, p256dh, auth, time_zone')
    .returns<PushSubscriptionRow[]>();

  if (subscriptionsError) {
    return Response.json({ error: subscriptionsError.message }, { status: 500 });
  }

  const dueSubscriptions = (subscriptions ?? []).flatMap((subscription) => {
    const localTime = getLocalTime(subscription.time_zone, now);
    return localTime?.hour === 8 && localTime.minute < 5
      ? [{ subscription, localTime }]
      : [];
  });

  if (dueSubscriptions.length === 0) {
    return Response.json({ sent: 0 });
  }

  const latestLocalDate = dueSubscriptions.reduce(
    (latest, { localTime }) =>
      localTime.date > latest ? localTime.date : latest,
    dueSubscriptions[0].localTime.date,
  );
  const { data: routines, error: routinesError } = await adminClient
    .from('routines')
    .select('id, household_id, name, next_due_date')
    .lte('next_due_date', latestLocalDate)
    .returns<RoutineRow[]>();

  if (routinesError) {
    return Response.json({ error: routinesError.message }, { status: 500 });
  }

  const routinesByHousehold = Map.groupBy(
    routines ?? [],
    (routine) => routine.household_id,
  );
  const applicationServer = await createApplicationServer(supabaseUrl);
  let sent = 0;

  for (const { subscription, localTime } of dueSubscriptions) {
    const householdRoutines = routinesByHousehold.get(subscription.household_id) ?? [];
    for (const routine of householdRoutines) {
      if (routine.next_due_date > localTime.date) {
        continue;
      }

      const { error: claimError } = await adminClient
        .from('notification_deliveries')
        .insert({
          routine_id: routine.id,
          push_subscription_id: subscription.id,
          delivery_date: localTime.date,
          kind: 'due',
        });

      if (claimError) {
        if (claimError.code === '23505') {
          continue;
        }
        console.error('Could not claim reminder delivery', claimError);
        continue;
      }

      try {
        await sendReminder(applicationServer, subscription, routine);
        const { error: sentError } = await adminClient
          .from('notification_deliveries')
          .update({ sent_at: new Date().toISOString() })
          .eq('routine_id', routine.id)
          .eq('push_subscription_id', subscription.id)
          .eq('delivery_date', localTime.date);
        if (sentError) {
          console.error('Could not mark reminder as sent', sentError);
        }
        sent += 1;
      } catch (error) {
        if (error instanceof PushMessageError && error.isGone()) {
          await adminClient
            .from('push_subscriptions')
            .delete()
            .eq('id', subscription.id);
          continue;
        }

        await adminClient
          .from('notification_deliveries')
          .update({
            failure_reason:
              error instanceof Error ? error.message : 'Push notification failed',
          })
          .eq('routine_id', routine.id)
          .eq('push_subscription_id', subscription.id)
          .eq('delivery_date', localTime.date);
        console.error('Could not send reminder', error);
      }
    }
  }

  return Response.json({ sent });
});

function getLocalTime(
  timeZone: string,
  now: Date,
): { date: string; hour: number; minute: number } | null {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
    const value = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value;
    const year = value('year');
    const month = value('month');
    const day = value('day');
    const hour = value('hour');
    const minute = value('minute');

    if (!year || !month || !day || !hour || !minute) {
      return null;
    }
    return {
      date: `${year}-${month}-${day}`,
      hour: Number(hour),
      minute: Number(minute),
    };
  } catch {
    console.error('Ignoring invalid Push subscription time zone', timeZone);
    return null;
  }
}

async function createApplicationServer(supabaseUrl: string) {
  const vapidKeys = await importVapidKeys(
    JSON.parse(requireSecret('RITUEL_VAPID_KEYS')),
  );
  return ApplicationServer.new({
    contactInformation: supabaseUrl,
    vapidKeys,
  });
}

async function sendReminder(
  applicationServer: ApplicationServer,
  subscription: PushSubscriptionRow,
  routine: RoutineRow,
) {
  const subscriber = applicationServer.subscribe({
    endpoint: subscription.endpoint,
    keys: { p256dh: subscription.p256dh, auth: subscription.auth },
  });

  await subscriber.pushTextMessage(
    JSON.stringify({
      notification: {
        title: 'Rituel reminder',
        body: `Today: ${routine.name}`,
        icon: '/icons/rituel-icon.svg',
        tag: `rituel-due-${routine.id}`,
        data: {
          onActionClick: {
            default: { operation: 'openWindow', url: `/tasks/${routine.id}/edit` },
          },
        },
      },
    }),
    { ttl: 60 * 60, urgency: Urgency.High, topic: `rituel-${routine.id}` },
  );
}

function requireSecret(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}
