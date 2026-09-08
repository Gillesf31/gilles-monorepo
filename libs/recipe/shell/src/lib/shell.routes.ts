import { Route } from '@angular/router';
import { provideAppVersionCheck } from '@gilles-monorepo/feature-app-version';
import {
  CachedRecipeService,
  RecipeApiService,
  RecipeService,
} from '@gilles-monorepo/recipe-data-access';
import { provideTheme } from '@gilles-monorepo/feature-theme';
import { ShellComponent } from './shell.component';

export function createShellRoutes(): Route[] {
  return [
    {
      path: '',
      component: ShellComponent,
      providers: [
        provideAppVersionCheck(),
        provideTheme(),
        RecipeApiService,
        {
          provide: RecipeService,
          useFactory: (apiService: RecipeApiService) =>
            new CachedRecipeService(apiService),
          deps: [RecipeApiService],
        },
      ],
      children: [
        {
          path: '',
          loadComponent: () =>
            import('@gilles-monorepo/feature-list').then(
              (m) => m.RecipeListComponent,
            ),
        },
        {
          path: 'add',
          loadComponent: () =>
            import('@gilles-monorepo/feature-add').then(
              (m) => m.AddRecipeComponent,
            ),
        },
        {
          path: 'recipe/:id',
          loadComponent: () =>
            import('@gilles-monorepo/feature-detail').then(
              (m) => m.RecipeDetailComponent,
            ),
        },
        {
          path: 'recipe/:id/edit',
          loadComponent: () =>
            import('@gilles-monorepo/feature-edit').then(
              (m) => m.EditRecipeComponent,
            ),
        },
      ],
    },
  ];
}
