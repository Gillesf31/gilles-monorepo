import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    loadChildren: () =>
      import('@gilles-monorepo/shell').then((m) => m.createShellRoutes()),
  },
];
