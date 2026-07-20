import { Route } from '@angular/router';
import { environment } from '../environments/environment';

export const appRoutes: Route[] = [
  {
    path: '',
    loadChildren: () =>
      import('@gilles-monorepo/rituel-shell').then((m) =>
        m.createRituelShellRoutes({
          supabaseUrl: environment.supabase.url,
          supabaseAnonKey: environment.supabase.anonKey,
          vapidPublicKey: environment.notifications.vapidPublicKey,
        }),
      ),
  },
];
