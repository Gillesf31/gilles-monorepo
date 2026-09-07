import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, signal } from '@angular/core';
import { Recipe } from '@gilles-monorepo/recipe-model';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { NewRecipe, RecipeReadStatus, RecipeService } from './recipe.service';

const recipesUrl = '/api/recipes';

export class RecipeApiService extends RecipeService {
  private readonly http = inject(HttpClient);
  readonly readStatus = signal<RecipeReadStatus>({
    mode: 'live',
    cachedAt: null,
  }).asReadonly();

  getRecipes(): Observable<Recipe[]> {
    return this.http.get<Recipe[]>(recipesUrl);
  }

  getRecipe(id: string): Observable<Recipe | undefined> {
    return this.http
      .get<Recipe>(`${recipesUrl}/${encodeURIComponent(id)}`)
      .pipe(
        catchError((error: unknown) =>
          error instanceof HttpErrorResponse && error.status === 404
            ? of(undefined)
            : throwError(() => error),
        ),
      );
  }

  addRecipe(recipe: NewRecipe): Observable<Recipe> {
    return this.http.post<Recipe>(recipesUrl, recipeBody(recipe));
  }

  updateRecipe(id: string, recipe: NewRecipe): Observable<Recipe> {
    return this.http.put<Recipe>(
      `${recipesUrl}/${encodeURIComponent(id)}`,
      recipeBody(recipe),
    );
  }

  setPinned(id: string, isPinned: boolean): Observable<Recipe> {
    return this.http.patch<Recipe>(
      `${recipesUrl}/${encodeURIComponent(id)}/pin`,
      { isPinned },
    );
  }

  deleteRecipe(id: string): Observable<void> {
    return this.http
      .delete(`${recipesUrl}/${encodeURIComponent(id)}`)
      .pipe(map(() => undefined));
  }
}

// A Recipe can be passed structurally as NewRecipe; send only editable fields.
function recipeBody({
  title,
  ingredients,
  instructions,
  isWorkInProgress,
}: NewRecipe): NewRecipe {
  return { title, ingredients, instructions, isWorkInProgress };
}
