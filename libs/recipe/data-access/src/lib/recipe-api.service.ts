import { inject } from '@angular/core';
import { from, map, Observable } from 'rxjs';
import {
  normalizeRecipeIngredients,
  Recipe,
  type RecipeIngredientValue,
} from '@gilles-monorepo/recipe-model';
import { NewRecipe, RecipeService } from './recipe.service';
import { SUPABASE_CLIENT } from '@gilles-monorepo/supabase';

interface RecipeRow {
  id: string;
  title: string;
  ingredients: RecipeIngredientValue[];
  instructions: string[];
}

function toRecipe(row: RecipeRow): Recipe {
  return new Recipe(
    row.id,
    row.title,
    normalizeRecipeIngredients(row.ingredients),
    row.instructions,
  );
}

export class RecipeApiService extends RecipeService {
  private readonly supabase = inject(SUPABASE_CLIENT);

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

  updateRecipe(id: string, recipe: NewRecipe): Observable<Recipe> {
    return from(
      this.supabase
        .from('recipes')
        .update({
          title: recipe.title,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
        })
        .eq('id', id)
        .select()
        .single()
        .throwOnError(),
    ).pipe(map(({ data }) => toRecipe(data as RecipeRow)));
  }
}
