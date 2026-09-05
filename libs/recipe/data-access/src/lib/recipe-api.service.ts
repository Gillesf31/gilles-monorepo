import { inject, signal } from '@angular/core';
import { from, map, Observable } from 'rxjs';
import {
  normalizeRecipeIngredients,
  Recipe,
  type RecipeIngredientValue,
} from '@gilles-monorepo/recipe-model';
import {
  NewRecipe,
  RecipeReadStatus,
  RecipeService,
} from './recipe.service';
import { SUPABASE_CLIENT } from '@gilles-monorepo/util-supabase';

interface RecipeRow {
  id: string;
  title: string;
  ingredients: RecipeIngredientValue[];
  instructions: string[];
  is_work_in_progress?: boolean;
  is_pinned?: boolean;
}

function toRecipe(row: RecipeRow): Recipe {
  return new Recipe(
    row.id,
    row.title,
    normalizeRecipeIngredients(row.ingredients),
    row.instructions,
    row.is_work_in_progress ?? false,
    row.is_pinned ?? false,
  );
}

export class RecipeApiService extends RecipeService {
  private readonly supabase = inject(SUPABASE_CLIENT);
  readonly readStatus = signal<RecipeReadStatus>({
    mode: 'live',
    cachedAt: null,
  }).asReadonly();

  getRecipes(): Observable<Recipe[]> {
    return from(
      this.supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false })
        .throwOnError(),
    ).pipe(map(({ data }) => (data as RecipeRow[]).map(toRecipe)));
  }

  getRecipe(id: string): Observable<Recipe | undefined> {
    return from(
      this.supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single()
        .throwOnError(),
    ).pipe(map(({ data }) => (data ? toRecipe(data as RecipeRow) : undefined)));
  }

  addRecipe(recipe: NewRecipe): Observable<Recipe> {
    return from(
      this.supabase
        .from('recipes')
        .insert({
          title: recipe.title,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          is_work_in_progress: recipe.isWorkInProgress,
        })
        .select()
        .single()
        .throwOnError(),
    ).pipe(map(({ data }) => toRecipe(data as RecipeRow)));
  }

  deleteRecipe(id: string): Observable<void> {
    return from(
      this.supabase.from('recipes').delete().eq('id', id).throwOnError(),
    ).pipe(map(() => undefined));
  }

  setPinned(id: string, isPinned: boolean): Observable<Recipe> {
    return from(
      this.supabase
        .from('recipes')
        .update({ is_pinned: isPinned })
        .eq('id', id)
        .select()
        .single()
        .throwOnError(),
    ).pipe(map(({ data }) => toRecipe(data as RecipeRow)));
  }

  updateRecipe(id: string, recipe: NewRecipe): Observable<Recipe> {
    return from(
      this.supabase
        .from('recipes')
        .update({
          title: recipe.title,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          is_work_in_progress: recipe.isWorkInProgress,
        })
        .eq('id', id)
        .select()
        .single()
        .throwOnError(),
    ).pipe(map(({ data }) => toRecipe(data as RecipeRow)));
  }
}
