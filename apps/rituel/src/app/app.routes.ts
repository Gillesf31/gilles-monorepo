import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    loadChildren: () =>
      import('@gilles-monorepo/rituel-shell').then((m) =>
        m.createRituelShellRoutes(),
      ),
  },
];
