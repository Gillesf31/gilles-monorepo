import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import {
  RecipeReadStatus,
  RecipeService,
} from '@gilles-monorepo/recipe-data-access';
import {
  normalizeRecipeIngredients,
  Recipe,
} from '@gilles-monorepo/recipe-model';
import { RecipeListComponent } from './recipe-list.component';

function recipe(
  id: string,
  title: string,
  isPinned = false,
  ingredient = 'Tomate',
): Recipe {
  return new Recipe(
    id,
    title,
    normalizeRecipeIngredients([ingredient]),
    ['Mixer les ingrédients.'],
    false,
    isPinned,
  );
}

function setup(
  recipes: Recipe[],
  setPinned = vi.fn(
    (id: string, isPinned: boolean): Observable<Recipe> => {
      const current = recipes.find((candidate) => candidate.id === id);
      if (!current) return throwError(() => new Error('Recipe not found'));
      return of(
        new Recipe(
          current.id,
          current.title,
          current.ingredients,
          current.instructions,
          current.isWorkInProgress,
          isPinned,
        ),
      );
    },
  ),
  readStatus = signal<RecipeReadStatus>({
    mode: 'live',
    cachedAt: null,
  }),
) {
  const fixture = TestBed.configureTestingModule({
    imports: [RecipeListComponent],
    providers: [
      provideRouter([]),
      {
        provide: RecipeService,
        useValue: {
          readStatus,
          getRecipes: () => of(recipes),
          setPinned,
          deleteRecipe: vi.fn(),
        },
      },
    ],
  }).createComponent(RecipeListComponent);
  fixture.detectChanges();

  return { fixture, setPinned };
}

function renderedTitles(element: HTMLElement): string[] {
  return Array.from(element.querySelectorAll('h2'), (heading) =>
    heading.textContent?.trim() ?? '',
  );
}

function cardFor(element: HTMLElement, title: string): HTMLElement {
  const card = Array.from(element.querySelectorAll<HTMLElement>('article')).find(
    (candidate) => candidate.textContent?.includes(title),
  );
  if (!card) throw new Error(`Card for ${title} not found`);
  return card;
}

describe(RecipeListComponent.name, () => {
  it('renders recipes from the recipe service', () => {
    const { fixture } = setup([recipe('recipe-1', 'Soupe aux tomates')]);
    const element: HTMLElement = fixture.nativeElement;

    expect(element.textContent).toContain('Mes recettes');
    expect(element.querySelector('a[href="/courses"]')).toBeNull();
    expect(element.querySelector('a[href="/add"]')).not.toBeNull();
    expect(element.textContent).toContain('Soupe aux tomates');
  });

  it('places pinned recipes alphabetically before unpinned recipes while preserving unpinned order', () => {
    const { fixture } = setup([
      recipe('recent', 'Soupe récente'),
      recipe('zebra', 'Zèbre', true),
      recipe('eclair', 'Éclair', true),
      recipe('older', 'Soupe ancienne', false, 'Pomme'),
    ]);
    const element: HTMLElement = fixture.nativeElement;

    expect(renderedTitles(element)).toEqual([
      'Éclair',
      'Zèbre',
      'Soupe récente',
      'Soupe ancienne',
    ]);

    const search = element.querySelector<HTMLInputElement>('input[type=search]');
    if (!search) throw new Error('Search input not found');
    search.value = 'tomate';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(renderedTitles(element)).toEqual([
      'Éclair',
      'Zèbre',
      'Soupe récente',
    ]);
  });

  it('persists a pin and moves the updated recipe into the pinned group', () => {
    const { fixture, setPinned } = setup([
      recipe('recent', 'Zèbre'),
      recipe('pinned', 'Éclair', true),
    ]);
    const element: HTMLElement = fixture.nativeElement;
    const pinButton = cardFor(element, 'Zèbre').querySelector<HTMLButtonElement>(
      'button[aria-label="Épingler la recette"]',
    );
    if (!pinButton) throw new Error('Pin button not found');

    pinButton.click();
    fixture.detectChanges();

    expect(setPinned).toHaveBeenCalledWith('recent', true);
    expect(renderedTitles(element)).toEqual(['Éclair', 'Zèbre']);
    expect(
      cardFor(element, 'Zèbre').querySelector(
        'button[aria-label="Désépingler la recette"]',
      ),
    ).not.toBeNull();
  });

  it('keeps the previous state and reports an error when pinning fails', () => {
    const setPinned = vi
      .fn()
      .mockReturnValue(throwError(() => new Error('Request failed')));
    const { fixture } = setup(
      [recipe('recent', 'Zèbre'), recipe('pinned', 'Éclair', true)],
      setPinned,
    );
    const element: HTMLElement = fixture.nativeElement;
    const pinButton = cardFor(element, 'Zèbre').querySelector<HTMLButtonElement>(
      'button[aria-label="Épingler la recette"]',
    );
    if (!pinButton) throw new Error('Pin button not found');

    pinButton.click();
    fixture.detectChanges();

    expect(renderedTitles(element)).toEqual(['Éclair', 'Zèbre']);
    expect(element.querySelector('[role=alert]')?.textContent).toContain(
      'Impossible de modifier l’épinglage',
    );
    const enabledPinButton = cardFor(
      element,
      'Zèbre',
    ).querySelector<HTMLButtonElement>(
      'button[aria-label="Épingler la recette"]',
    );
    expect(enabledPinButton?.disabled).toBe(false);
  });

  it('shows cached recipes while hiding all server-backed controls', () => {
    const { fixture } = setup(
      [recipe('recipe-1', 'Soupe aux tomates')],
      undefined,
      signal<RecipeReadStatus>({
        mode: 'cached',
        cachedAt: '2026-08-15T14:30:00.000Z',
      }),
    );
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('[role=status]')?.textContent).toContain(
      'Mode hors ligne',
    );
    expect(element.textContent).toContain('Soupe aux tomates');
    expect(element.querySelector('a[href="/add"]')).toBeNull();
    expect(element.querySelector('a[href="/courses"]')).toBeNull();
    expect(element.querySelector('button[aria-label="Épingler la recette"]')).toBeNull();
    expect(element.querySelector('button[aria-label="Supprimer la recette"]')).toBeNull();
    expect(element.textContent).toContain('Voir la recette');
  });

  it('shows an explicit error and retries when no cached catalogue exists', () => {
    const recipes = [recipe('recipe-1', 'Soupe aux tomates')];
    const getRecipes = vi
      .fn()
      .mockReturnValueOnce(throwError(() => new Error('Unavailable')))
      .mockReturnValueOnce(of(recipes));
    const readStatus = signal<RecipeReadStatus>({
      mode: 'unavailable',
      cachedAt: null,
    });
    const fixture = TestBed.configureTestingModule({
      imports: [RecipeListComponent],
      providers: [
        provideRouter([]),
        {
          provide: RecipeService,
          useValue: {
            readStatus,
            getRecipes,
            setPinned: vi.fn(),
            deleteRecipe: vi.fn(),
          },
        },
      ],
    }).createComponent(RecipeListComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain(
      'Aucune copie locale',
    );

    readStatus.set({ mode: 'live', cachedAt: null });
    fixture.nativeElement.querySelector('button').click();
    fixture.detectChanges();

    expect(getRecipes).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('Soupe aux tomates');
  });
});
