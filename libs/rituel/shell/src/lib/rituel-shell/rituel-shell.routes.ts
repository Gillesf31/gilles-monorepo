import { Route } from '@angular/router';
import { RituelShellComponent } from './rituel-shell';
import { provideRituelShell } from './rituel-shell.providers';

export function createRituelShellRoutes(): Route[] {
  return [
    {
      path: '',
      component: RituelShellComponent,
      providers: [provideRituelShell()],
      children: [
        {
          path: '',
          pathMatch: 'full',
          loadComponent: () =>
            import('@gilles-monorepo/feature-dashboard').then(
              (m) => m.RituelDashboardComponent,
            ),
        },
        {
          path: 'tasks/new',
          loadComponent: () =>
            import('@gilles-monorepo/feature-create-task').then(
              (m) => m.CreateRoutineComponent,
            ),
        },
      ],
    },
  ];
}
