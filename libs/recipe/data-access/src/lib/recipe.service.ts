import type { Signal } from '@angular/core';
import { Observable } from 'rxjs';
import { Recipe } from '@gilles-monorepo/recipe-model';

export type NewRecipe = Pick<
  Recipe,
  'title' | 'ingredients' | 'instructions' | 'isWorkInProgress'
>;

export type RecipeReadMode =
  | 'checking'
  | 'live'
  | 'cached'
  | 'unavailable';

export type RecipeReadStatus = {
  readonly mode: RecipeReadMode;
  readonly cachedAt: string | null;
};

export abstract class RecipeService {
  abstract readonly readStatus: Signal<RecipeReadStatus>;

  abstract getRecipes(): Observable<Recipe[]>;
  abstract getRecipe(id: string): Observable<Recipe | undefined>;
  abstract addRecipe(recipe: NewRecipe): Observable<Recipe>;
  abstract updateRecipe(id: string, recipe: NewRecipe): Observable<Recipe>;
  abstract setPinned(id: string, isPinned: boolean): Observable<Recipe>;
  abstract deleteRecipe(id: string): Observable<void>;
}
