import { Route } from '@angular/router';
import { environment } from '../environments/environment';

export const appRoutes: Route[] = [
  {
    path: '',
    loadChildren: () =>
      import('@gilles-monorepo/shell').then((m) =>
        m.createShellRoutes(environment.supabase.url, environment.supabase.anonKey)
      ),
  },
];
