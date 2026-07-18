import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import {
  InMemoryRoutineRepository,
  RoutineRepository,
} from '@gilles-monorepo/rituel-data-access';
import { provideTheme } from '@gilles-monorepo/feature-theme';

export function provideRituelShell(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideTheme(),
    {
      provide: RoutineRepository,
      useFactory: () => new InMemoryRoutineRepository(),
    },
  ]);
}
