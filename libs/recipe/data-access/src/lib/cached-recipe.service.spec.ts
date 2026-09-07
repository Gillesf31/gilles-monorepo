import { signal } from '@angular/core';
import { Recipe } from '@gilles-monorepo/recipe-model';
import {
  firstValueFrom,
  lastValueFrom,
  Observable,
  of,
  throwError,
  toArray,
} from 'rxjs';
import {
  CachedRecipeService,
  RECIPE_CACHE_STORAGE_KEY,
} from './cached-recipe.service';
import { NewRecipe, RecipeReadStatus, RecipeService } from './recipe.service';

const savedAt = new Date('2026-08-15T14:30:00.000Z');
const soup = new Recipe(
  'soup',
  'Soupe',
  [{ name: 'Tomate', quantity: '4', unit: '' }],
  ['Mijoter.'],
);

class MemoryStorage implements Pick<Storage, 'getItem' | 'setItem'> {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe(CachedRecipeService.name, () => {
  it('persists a successful remote catalogue and reports live data', async () => {
    const storage = new MemoryStorage();
    const service = createService(
      remoteService({ getRecipes: () => of([soup]) }),
      storage,
    );

    expect(await firstValueFrom(service.getRecipes())).toEqual([soup]);
    expect(service.readStatus()).toEqual({
      mode: 'live',
      cachedAt: savedAt.toISOString(),
    });
    expect(storage.getItem(RECIPE_CACHE_STORAGE_KEY)).toContain(
      '"title":"Soupe"',
    );
  });

  it('emits the cached catalogue immediately and then refreshes it remotely', async () => {
    const storage = new MemoryStorage();
    await firstValueFrom(
      createService(
        remoteService({ getRecipes: () => of([soup]) }),
        storage,
      ).getRecipes(),
    );
    const freshSoup = new Recipe('soup', 'Soupe fraîche', [], ['Servir.']);
    const service = createService(
      remoteService({ getRecipes: () => of([freshSoup]) }),
      storage,
    );

    const emissions = await lastValueFrom(service.getRecipes().pipe(toArray()));

    expect(emissions.map((recipes) => recipes[0].title)).toEqual([
      'Soupe',
      'Soupe fraîche',
    ]);
    expect(service.readStatus().mode).toBe('live');
  });

  it('keeps cached recipes when the remote catalogue is unavailable', async () => {
    const storage = new MemoryStorage();
    await firstValueFrom(
      createService(
        remoteService({ getRecipes: () => of([soup]) }),
        storage,
      ).getRecipes(),
    );
    const service = createService(
      remoteService({
        getRecipes: () => throwError(() => new Error('API unavailable')),
      }),
      storage,
    );

    expect(await lastValueFrom(service.getRecipes())).toEqual([soup]);
    expect(service.readStatus()).toEqual({
      mode: 'cached',
      cachedAt: savedAt.toISOString(),
    });
  });

  it('reports unavailable and preserves the remote error without a cache', async () => {
    const service = createService(
      remoteService({
        getRecipes: () => throwError(() => new Error('API unavailable')),
      }),
      new MemoryStorage(),
    );

    await expect(firstValueFrom(service.getRecipes())).rejects.toThrow(
      'API unavailable',
    );
    expect(service.readStatus()).toEqual({
      mode: 'unavailable',
      cachedAt: null,
    });
  });

  it('serves a recipe detail from the cached catalogue', async () => {
    const storage = new MemoryStorage();
    await firstValueFrom(
      createService(
        remoteService({ getRecipes: () => of([soup]) }),
        storage,
      ).getRecipes(),
    );
    const service = createService(
      remoteService({
        getRecipe: () => throwError(() => new Error('Network unavailable')),
      }),
      storage,
    );

    expect(await lastValueFrom(service.getRecipe('soup'))).toEqual(soup);
    expect(service.readStatus().mode).toBe('cached');
  });

  it('does not read the previous Supabase catalogue as local API data', async () => {
    const storage = new MemoryStorage();
    storage.setItem(
      'recipe-catalogue-cache',
      JSON.stringify({
        version: 1,
        savedAt: savedAt.toISOString(),
        recipes: [soup],
      }),
    );
    const service = createService(
      remoteService({
        getRecipes: () => throwError(() => new Error('API unavailable')),
      }),
      storage,
    );
    await expect(firstValueFrom(service.getRecipes())).rejects.toThrow(
      'API unavailable',
    );
    expect(service.readStatus().mode).toBe('unavailable');
  });

  it('evicts a cached detail when the API confirms it no longer exists', async () => {
    const storage = new MemoryStorage();
    const service = createService(
      remoteService({
        getRecipes: () => of([soup]),
        getRecipe: () => of(undefined),
      }),
      storage,
    );
    await firstValueFrom(service.getRecipes());
    expect(await lastValueFrom(service.getRecipe(soup.id))).toBeUndefined();
    const offline = createService(
      remoteService({
        getRecipes: () => throwError(() => new Error('Offline')),
      }),
      storage,
    );
    expect(await lastValueFrom(offline.getRecipes())).toEqual([]);
  });

  it.each([
    ['malformed JSON', '{'],
    [
      'an unsupported cache version',
      JSON.stringify({
        version: 2,
        savedAt: savedAt.toISOString(),
        recipes: [],
      }),
    ],
  ])('ignores %s', async (_description, storedValue) => {
    const storage = new MemoryStorage();
    storage.setItem(RECIPE_CACHE_STORAGE_KEY, storedValue);
    const service = createService(
      remoteService({
        getRecipes: () => throwError(() => new Error('Unavailable')),
      }),
      storage,
    );

    await expect(firstValueFrom(service.getRecipes())).rejects.toThrow(
      'Unavailable',
    );
    expect(service.readStatus().mode).toBe('unavailable');
  });

  it('keeps an existing cache coherent after successful online mutations', async () => {
    const storage = new MemoryStorage();
    const cake = new Recipe('cake', 'Gâteau', [], ['Cuire.']);
    const updatedSoup = new Recipe(
      'soup',
      'Soupe épicée',
      soup.ingredients,
      soup.instructions,
    );
    const pinnedSoup = new Recipe(
      'soup',
      updatedSoup.title,
      updatedSoup.ingredients,
      updatedSoup.instructions,
      false,
      true,
    );
    const remote = remoteService({
      getRecipes: () => of([soup]),
      addRecipe: () => of(cake),
      updateRecipe: () => of(updatedSoup),
      setPinned: () => of(pinnedSoup),
      deleteRecipe: () => of(undefined),
    });
    const service = createService(remote, storage);
    await firstValueFrom(service.getRecipes());

    await firstValueFrom(service.addRecipe(newRecipe('Gâteau')));
    await firstValueFrom(
      service.updateRecipe('soup', newRecipe('Soupe épicée')),
    );
    await firstValueFrom(service.setPinned('soup', true));
    await firstValueFrom(service.deleteRecipe('cake'));

    const offlineService = createService(
      remoteService({
        getRecipes: () => throwError(() => new Error('Offline')),
      }),
      storage,
    );
    const cachedRecipes = await lastValueFrom(offlineService.getRecipes());

    expect(cachedRecipes).toEqual([pinnedSoup]);
  });
});

function createService(
  remote: RecipeService,
  storage: MemoryStorage,
): CachedRecipeService {
  return new CachedRecipeService(remote, storage, () => savedAt);
}

function newRecipe(title: string): NewRecipe {
  return {
    title,
    ingredients: [],
    instructions: [],
    isWorkInProgress: false,
  };
}

function remoteService(
  overrides: Partial<{
    getRecipes: () => Observable<Recipe[]>;
    getRecipe: (id: string) => Observable<Recipe | undefined>;
    addRecipe: (recipe: NewRecipe) => Observable<Recipe>;
    updateRecipe: (id: string, recipe: NewRecipe) => Observable<Recipe>;
    setPinned: (id: string, isPinned: boolean) => Observable<Recipe>;
    deleteRecipe: (id: string) => Observable<void>;
  }> = {},
): RecipeService {
  return {
    readStatus: signal<RecipeReadStatus>({
      mode: 'live',
      cachedAt: null,
    }).asReadonly(),
    getRecipes: overrides.getRecipes ?? (() => of([])),
    getRecipe: overrides.getRecipe ?? (() => of(undefined)),
    addRecipe:
      overrides.addRecipe ??
      (() => throwError(() => new Error('Unexpected addRecipe call'))),
    updateRecipe:
      overrides.updateRecipe ??
      (() => throwError(() => new Error('Unexpected updateRecipe call'))),
    setPinned:
      overrides.setPinned ??
      (() => throwError(() => new Error('Unexpected setPinned call'))),
    deleteRecipe:
      overrides.deleteRecipe ??
      (() => throwError(() => new Error('Unexpected deleteRecipe call'))),
  };
}
