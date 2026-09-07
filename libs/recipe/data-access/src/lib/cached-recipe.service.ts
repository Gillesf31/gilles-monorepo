import { signal } from '@angular/core';
import { Recipe, type RecipeIngredient } from '@gilles-monorepo/recipe-model';
import {
  catchError,
  concat,
  defer,
  EMPTY,
  Observable,
  of,
  tap,
  throwError,
} from 'rxjs';
import { NewRecipe, RecipeReadStatus, RecipeService } from './recipe.service';

export const RECIPE_CACHE_STORAGE_KEY = 'recipe-api-catalogue-cache';
const RECIPE_CACHE_VERSION = 1;

type RecipeCacheStorage = Pick<Storage, 'getItem' | 'setItem'>;

type StoredRecipe = {
  readonly id: string;
  readonly title: string;
  readonly ingredients: readonly RecipeIngredient[];
  readonly instructions: readonly string[];
  readonly isWorkInProgress: boolean;
  readonly isPinned: boolean;
};

type RecipeCacheDocument = {
  readonly version: typeof RECIPE_CACHE_VERSION;
  readonly savedAt: string;
  readonly recipes: readonly StoredRecipe[];
};

export class CachedRecipeService extends RecipeService {
  private readonly readStatusState = signal<RecipeReadStatus>({
    mode: 'checking',
    cachedAt: null,
  });

  readonly readStatus = this.readStatusState.asReadonly();

  constructor(
    private readonly remote: RecipeService,
    private readonly storage: RecipeCacheStorage | undefined = browserStorage(),
    private readonly now: () => Date = () => new Date(),
  ) {
    super();
  }

  getRecipes(): Observable<Recipe[]> {
    return defer(() => {
      const cached = this.readCache();
      this.setStatus('checking', cached?.savedAt ?? null);

      const remoteRecipes = this.remote.getRecipes().pipe(
        tap((recipes) => {
          const savedAt = this.writeCache(recipes);
          this.setStatus('live', savedAt);
        }),
        catchError((error: unknown) => {
          if (cached) {
            this.setStatus('cached', cached.savedAt);
            return EMPTY;
          }

          this.setStatus('unavailable', null);
          return throwError(() => error);
        }),
      );

      return cached
        ? concat(of([...cached.recipes]), remoteRecipes)
        : remoteRecipes;
    });
  }

  getRecipe(id: string): Observable<Recipe | undefined> {
    return defer(() => {
      const cached = this.readCache();
      const cachedRecipe = cached?.recipes.find((recipe) => recipe.id === id);
      this.setStatus('checking', cached?.savedAt ?? null);

      const remoteRecipe = this.remote.getRecipe(id).pipe(
        tap((recipe) => {
          const savedAt = recipe
            ? this.updateCachedRecipes((recipes) =>
                upsertRecipe(recipes, recipe),
              )
            : this.updateCachedRecipes((recipes) =>
                recipes.filter((item) => item.id !== id),
              );
          this.setStatus('live', savedAt);
        }),
        catchError((error: unknown) => {
          if (cached) {
            this.setStatus('cached', cached.savedAt);
            return cachedRecipe ? EMPTY : of(undefined);
          }

          this.setStatus('unavailable', null);
          return throwError(() => error);
        }),
      );

      return cachedRecipe
        ? concat(of(cachedRecipe), remoteRecipe)
        : remoteRecipe;
    });
  }

  addRecipe(recipe: NewRecipe): Observable<Recipe> {
    return this.remote.addRecipe(recipe).pipe(
      tap((created) => {
        const cachedAt = this.updateCachedRecipes((recipes) => [
          ...recipes,
          created,
        ]);
        this.setStatus('live', cachedAt);
      }),
    );
  }

  updateRecipe(id: string, recipe: NewRecipe): Observable<Recipe> {
    return this.remote.updateRecipe(id, recipe).pipe(
      tap((updated) => {
        const cachedAt = this.updateCachedRecipes((recipes) =>
          upsertRecipe(recipes, updated),
        );
        this.setStatus('live', cachedAt);
      }),
    );
  }

  setPinned(id: string, isPinned: boolean): Observable<Recipe> {
    return this.remote.setPinned(id, isPinned).pipe(
      tap((updated) => {
        const cachedAt = this.updateCachedRecipes((recipes) =>
          upsertRecipe(recipes, updated),
        );
        this.setStatus('live', cachedAt);
      }),
    );
  }

  deleteRecipe(id: string): Observable<void> {
    return this.remote.deleteRecipe(id).pipe(
      tap(() => {
        const cachedAt = this.updateCachedRecipes((recipes) =>
          recipes.filter((recipe) => recipe.id !== id),
        );
        this.setStatus('live', cachedAt);
      }),
    );
  }

  private readCache(): { savedAt: string; recipes: Recipe[] } | undefined {
    if (!this.storage) {
      return undefined;
    }

    try {
      const rawDocument = this.storage.getItem(RECIPE_CACHE_STORAGE_KEY);
      if (!rawDocument) {
        return undefined;
      }

      const document: unknown = JSON.parse(rawDocument);
      if (!isRecipeCacheDocument(document)) {
        return undefined;
      }

      return {
        savedAt: document.savedAt,
        recipes: document.recipes.map(toRecipe),
      };
    } catch {
      return undefined;
    }
  }

  private writeCache(recipes: readonly Recipe[]): string | null {
    if (!this.storage) {
      return null;
    }

    const savedAt = this.now().toISOString();
    const document: RecipeCacheDocument = {
      version: RECIPE_CACHE_VERSION,
      savedAt,
      recipes: recipes.map(toStoredRecipe),
    };

    try {
      this.storage.setItem(RECIPE_CACHE_STORAGE_KEY, JSON.stringify(document));
      return savedAt;
    } catch {
      return null;
    }
  }

  private updateCachedRecipes(
    update: (recipes: readonly Recipe[]) => readonly Recipe[],
  ): string | null {
    const cached = this.readCache();
    return cached ? this.writeCache(update(cached.recipes)) : null;
  }

  private setStatus(
    mode: RecipeReadStatus['mode'],
    cachedAt: string | null,
  ): void {
    this.readStatusState.set({ mode, cachedAt });
  }
}

function browserStorage(): RecipeCacheStorage | undefined {
  return typeof localStorage === 'undefined' ? undefined : localStorage;
}

function upsertRecipe(
  recipes: readonly Recipe[],
  updated: Recipe,
): readonly Recipe[] {
  const exists = recipes.some((recipe) => recipe.id === updated.id);
  return exists
    ? recipes.map((recipe) => (recipe.id === updated.id ? updated : recipe))
    : [...recipes, updated];
}

function toStoredRecipe(recipe: Recipe): StoredRecipe {
  return {
    id: recipe.id,
    title: recipe.title,
    ingredients: recipe.ingredients.map((ingredient) => ({ ...ingredient })),
    instructions: [...recipe.instructions],
    isWorkInProgress: recipe.isWorkInProgress,
    isPinned: recipe.isPinned,
  };
}

function toRecipe(recipe: StoredRecipe): Recipe {
  return new Recipe(
    recipe.id,
    recipe.title,
    recipe.ingredients.map((ingredient) => ({ ...ingredient })),
    [...recipe.instructions],
    recipe.isWorkInProgress,
    recipe.isPinned,
  );
}

function isRecipeCacheDocument(value: unknown): value is RecipeCacheDocument {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value['version'] === RECIPE_CACHE_VERSION &&
    typeof value['savedAt'] === 'string' &&
    !Number.isNaN(Date.parse(value['savedAt'])) &&
    Array.isArray(value['recipes']) &&
    value['recipes'].every(isStoredRecipe)
  );
}

function isStoredRecipe(value: unknown): value is StoredRecipe {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value['id'] === 'string' &&
    typeof value['title'] === 'string' &&
    Array.isArray(value['ingredients']) &&
    value['ingredients'].every(isStoredIngredient) &&
    Array.isArray(value['instructions']) &&
    value['instructions'].every((step) => typeof step === 'string') &&
    typeof value['isWorkInProgress'] === 'boolean' &&
    typeof value['isPinned'] === 'boolean'
  );
}

function isStoredIngredient(value: unknown): value is RecipeIngredient {
  return (
    isRecord(value) &&
    typeof value['name'] === 'string' &&
    typeof value['quantity'] === 'string' &&
    typeof value['unit'] === 'string'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
