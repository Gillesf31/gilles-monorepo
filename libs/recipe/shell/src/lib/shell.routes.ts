import { isDevMode } from '@angular/core';
import { Route } from '@angular/router';
import { provideAppVersionCheck } from '@gilles-monorepo/app-version';
import {
  RecipeApiService,
  RecipeInMemoryService,
  RecipeService,
  ShoppingListApiService,
  ShoppingListInMemoryService,
  ShoppingListService,
} from '@gilles-monorepo/recipe-data-access';
import { provideSupabaseClient } from '@gilles-monorepo/supabase';
import { ThemeService } from '@gilles-monorepo/ui-theme';
import { ShellComponent } from './shell.component';

export function createShellRoutes(
  supabaseUrl: string,
  supabaseAnonKey: string,
): Route[] {
  return [
    {
      path: '',
      component: ShellComponent,
      providers: [
        provideAppVersionCheck(),
        provideSupabaseClient(supabaseUrl, supabaseAnonKey),
        ThemeService,
        {
          provide: RecipeService,
          useClass: isDevMode() ? RecipeInMemoryService : RecipeApiService,
        },
        {
          provide: ShoppingListService,
          useClass: isDevMode()
            ? ShoppingListInMemoryService
            : ShoppingListApiService,
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
          path: 'courses',
          loadComponent: () =>
            import('@gilles-monorepo/feature-shopping-list').then(
              (m) => m.ShoppingListComponent,
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
