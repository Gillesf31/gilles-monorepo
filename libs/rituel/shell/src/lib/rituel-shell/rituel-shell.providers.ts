import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  AngularServiceWorkerPushClient,
  BrowserPushNotificationService,
  InMemoryRoutineRepository,
  PushNotificationService,
  RoutineRepository,
  ServerRoutineRepository,
  SupabasePushSubscriptionGateway,
  SupabaseRoutineGateway,
} from '@gilles-monorepo/rituel-data-access';
import { provideAppVersionCheck } from '@gilles-monorepo/rituel-feature-app-version';
import { provideTheme } from '@gilles-monorepo/feature-theme';
import {
  provideSupabaseClient,
  SUPABASE_CLIENT,
} from '@gilles-monorepo/util-supabase';

const inMemoryNetworkDelayMs = 1_200;

export type RituelServerConfiguration = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  vapidPublicKey?: string;
};

export function provideRituelShell(
  serverConfiguration?: RituelServerConfiguration,
): EnvironmentProviders {
  const routineRepositoryProvider = serverConfiguration
    ? [
        provideSupabaseClient(
          serverConfiguration.supabaseUrl,
          serverConfiguration.supabaseAnonKey,
        ),
        {
          provide: RoutineRepository,
          useFactory: (client: SupabaseClient) =>
            new ServerRoutineRepository(new SupabaseRoutineGateway(client)),
          deps: [SUPABASE_CLIENT],
        },
        ...(serverConfiguration.vapidPublicKey
          ? [
              {
                provide: PushNotificationService,
                useFactory: (client: SupabaseClient, swPush: SwPush) =>
                  new BrowserPushNotificationService(
                    new AngularServiceWorkerPushClient(swPush),
                    new SupabasePushSubscriptionGateway(client),
                    serverConfiguration.vapidPublicKey as string,
                  ),
                deps: [SUPABASE_CLIENT, SwPush],
              },
            ]
          : []),
      ]
    : [
        {
          provide: RoutineRepository,
          useFactory: () =>
            new InMemoryRoutineRepository(
              undefined,
              undefined,
              inMemoryNetworkDelayMs,
            ),
        },
      ];

  return makeEnvironmentProviders([
    provideAppVersionCheck(!!serverConfiguration),
    provideTheme(),
    ...routineRepositoryProvider,
  ]);
}
