import { isDevMode } from '@angular/core';
import { Route } from '@angular/router';
import { provideSupabaseClient, RecipeApiService, RecipeInMemoryService, RecipeService } from '@gilles-monorepo/data-access';
import { ThemeService } from '@gilles-monorepo/ui-theme';
import { ShellComponent } from './shell.component';

export function createShellRoutes(supabaseUrl: string, supabaseAnonKey: string): Route[] {
  return [
  {
    path: '',
    component: ShellComponent,
    providers: [
      provideSupabaseClient(supabaseUrl, supabaseAnonKey),
      ThemeService,
      {
        provide: RecipeService,
        useClass: isDevMode() ? RecipeInMemoryService : RecipeApiService,
      },
    ],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('@gilles-monorepo/feature-list').then((m) => m.RecipeListComponent),
      },
      {
        path: 'add',
        loadComponent: () =>
          import('@gilles-monorepo/feature-add').then((m) => m.AddRecipeComponent),
      },
      {
        path: 'recipe/:id',
        loadComponent: () =>
          import('@gilles-monorepo/feature-detail').then((m) => m.RecipeDetailComponent),
      },
      {
        path: 'recipe/:id/edit',
        loadComponent: () =>
          import('@gilles-monorepo/feature-edit').then((m) => m.EditRecipeComponent),
      },
    ],
  },
  ];
}
