import {
  ApplicationServer,
  importVapidKeys,
  PushMessageError,
  Urgency,
} from '@negrel/webpush';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type RoutineRow = {
  id: string;
  name: string;
};

type RituelProfileRow = {
  active_household_id: string;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization) {
    return json({ error: 'Missing authorization' }, 401);
  }

  const supabaseUrl = requireSecret('SUPABASE_URL');
  const publicKey =
    Deno.env.get('SUPABASE_ANON_KEY') ??
    Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  if (!publicKey) {
    return json({ error: 'Missing Supabase public key' }, 500);
  }

  const authenticatedClient = createClient(supabaseUrl, publicKey, {
    global: { headers: { Authorization: authorization } },
  });
  const {
    data: { user },
    error: authError,
  } = await authenticatedClient.auth.getUser();

  if (authError || !user) {
    return json({ error: 'Invalid session' }, 401);
  }

  const adminClient = createClient(
    supabaseUrl,
    requireSecret('SUPABASE_SERVICE_ROLE_KEY'),
  );
  const { data: profile, error: profileError } = await adminClient
    .from('rituel_profiles')
    .select('active_household_id')
    .eq('user_id', user.id)
    .maybeSingle<RituelProfileRow>();

  if (profileError) {
    return json({ error: profileError.message }, 500);
  }
  if (!profile) {
    return json({ error: 'No Rituel household found' }, 404);
  }

  const { data: subscription, error: subscriptionError } = await adminClient
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('household_id', profile.active_household_id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle<PushSubscriptionRow>();

  if (subscriptionError) {
    return json({ error: subscriptionError.message }, 500);
  }
  if (!subscription) {
    return json({ error: 'No Push subscription found' }, 404);
  }

  const { data: routine, error: routineError } = await adminClient
    .from('routines')
    .select('id, name')
    .eq('household_id', profile.active_household_id)
    .order('next_due_date', { ascending: true })
    .limit(1)
    .maybeSingle<RoutineRow>();

  if (routineError) {
    return json({ error: routineError.message }, 500);
  }
  if (!routine) {
    return json({ error: 'Create a routine before testing reminders' }, 409);
  }

  try {
    const vapidKeys = await importVapidKeys(
      JSON.parse(requireSecret('RITUEL_VAPID_KEYS')),
    );
    const applicationServer = await ApplicationServer.new({
      contactInformation: supabaseUrl,
      vapidKeys,
    });
    const subscriber = applicationServer.subscribe({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    });

    await subscriber.pushTextMessage(
      JSON.stringify({
        notification: {
          title: 'Rituel reminder',
          body: `${routine.name} is ready for a test reminder.`,
          icon: '/icons/rituel-icon.svg',
          tag: `rituel-test-${routine.id}`,
          data: {
            onActionClick: {
              default: {
                operation: 'openWindow',
                url: `/tasks/${routine.id}/edit`,
              },
            },
          },
        },
      }),
      { ttl: 60, urgency: Urgency.High, topic: 'rituel-test' },
    );

    return json({ sent: true, routineId: routine.id });
  } catch (error) {
    if (error instanceof PushMessageError && error.isGone()) {
      await adminClient
        .from('push_subscriptions')
        .delete()
        .eq('id', subscription.id);
    }

    return json(
      {
        error:
          error instanceof Error ? error.message : 'Push notification failed',
      },
      502,
    );
  }
});

function requireSecret(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: corsHeaders,
  });
}
