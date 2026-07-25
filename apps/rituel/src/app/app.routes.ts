import { Route } from '@angular/router';
import { environment } from '../environments/environment';

export const appRoutes: Route[] = [
  {
    path: '',
    loadChildren: () =>
      import('@gilles-monorepo/rituel-shell').then((m) =>
        m.createRituelShellRoutes(environment.serverConfiguration),
      ),
  },
];
