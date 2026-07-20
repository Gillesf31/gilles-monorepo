import { Route } from '@angular/router';
import { RituelShellComponent } from './rituel-shell';
import {
  provideRituelShell,
  RituelServerConfiguration,
} from './rituel-shell.providers';

export function createRituelShellRoutes(
  serverConfiguration?: RituelServerConfiguration,
): Route[] {
  return [
    {
      path: '',
      component: RituelShellComponent,
      providers: [provideRituelShell(serverConfiguration)],
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
        {
          path: 'tasks/:id/edit',
          loadComponent: () =>
            import('@gilles-monorepo/feature-edit-task').then(
              (m) => m.EditRoutineComponent,
            ),
        },
      ],
    },
  ];
}
