import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  EMPTY_SHOPPING_LIST_STATE,
  RecipeService,
  ShoppingListService,
} from '@gilles-monorepo/recipe-data-access';
import { Recipe } from '@gilles-monorepo/recipe-model';
import { of } from 'rxjs';
import { ShoppingListComponent } from './shopping-list.component';

describe(ShoppingListComponent.name, () => {
  let component: ShoppingListComponent;
  let fixture: ComponentFixture<ShoppingListComponent>;
  let shoppingListService: {
    getShoppingListState: ReturnType<typeof vi.fn>;
    saveShoppingListState: ReturnType<typeof vi.fn>;
    clearShoppingListState: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    shoppingListService = {
      getShoppingListState: vi.fn(() => of(EMPTY_SHOPPING_LIST_STATE)),
      saveShoppingListState: vi.fn(() => of(undefined)),
      clearShoppingListState: vi.fn(() => of(undefined)),
    };

    await TestBed.configureTestingModule({
      imports: [ShoppingListComponent],
      providers: [
        provideRouter([]),
        {
          provide: RecipeService,
          useValue: {
            getRecipes: () =>
              of([
                new Recipe(
                  'pasta',
                  'Pâtes',
                  [{ quantity: '200', unit: 'g', name: 'spaghetti' }],
                  [],
                ),
                new Recipe(
                  'soup',
                  'Soupe',
                  [{ quantity: '100', unit: 'g', name: 'Spaghetti' }],
                  [],
                ),
              ]),
          },
        },
        {
          provide: ShoppingListService,
          useValue: shoppingListService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShoppingListComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders a merged shopping list from selected recipes', () => {
    fixture.detectChanges();

    const checkboxes = fixture.nativeElement.querySelectorAll(
      'section:first-of-type input[type="checkbox"]',
    );
    checkboxes[0].click();
    checkboxes[1].click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('300 g spaghetti');
    expect(shoppingListService.saveShoppingListState).toHaveBeenLastCalledWith({
      selectedRecipeIds: ['pasta', 'soup'],
      multipliersByRecipeId: {},
      checkedItemIds: [],
      customItems: [],
    });
  });

  it('adds and removes a custom shopping list item', () => {
    fixture.detectChanges();

    const inputs = fixture.nativeElement.querySelectorAll('form input');
    inputs[0].value = '2';
    inputs[1].value = 'kg';
    inputs[2].value = 'farine';
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('2 kg farine');
    expect(fixture.nativeElement.textContent).toContain('Ajout manuel');
    expect(shoppingListService.saveShoppingListState).toHaveBeenLastCalledWith({
      selectedRecipeIds: [],
      multipliersByRecipeId: {},
      checkedItemIds: [],
      customItems: [
        {
          id: 'custom-0',
          quantity: '2',
          unit: 'kg',
          name: 'farine',
          recipeTitles: ['Ajout manuel'],
        },
      ],
    });

    fixture.nativeElement
      .querySelector('button[aria-label="Retirer 2 kg farine"]')
      .click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('2 kg farine');
    expect(shoppingListService.saveShoppingListState).toHaveBeenLastCalledWith({
      selectedRecipeIds: [],
      multipliersByRecipeId: {},
      checkedItemIds: [],
      customItems: [],
    });
  });

  it('restores persisted recipe selection, multiplier, checked state, and custom items', async () => {
    shoppingListService.getShoppingListState.mockReturnValue(
      of({
        selectedRecipeIds: ['pasta'],
        multipliersByRecipeId: { pasta: 2 },
        checkedItemIds: ['spaghetti::g', 'custom-4'],
        customItems: [
          {
            id: 'custom-4',
            quantity: '1',
            unit: '',
            name: 'citron',
            recipeTitles: ['Ajout manuel'],
          },
        ],
      }),
    );

    fixture = TestBed.createComponent(ShoppingListComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(
      fixture.nativeElement.querySelector('#shopping-recipe-pasta').checked,
    ).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('400 g spaghetti');
    expect(fixture.nativeElement.textContent).toContain('1 citron');
    const persistedGeneratedItem = Array.from<HTMLInputElement>(
      fixture.nativeElement.querySelectorAll('input'),
    ).find((input) => input.id === 'shopping-item-spaghetti::g');
    expect(persistedGeneratedItem?.checked).toBe(true);
    expect(
      fixture.nativeElement.querySelector('#shopping-item-custom-4').checked,
    ).toBe(true);
  });

  it('clears the persisted shopping list state', () => {
    fixture.detectChanges();

    fixture.nativeElement.querySelector('form input:last-of-type').value =
      'farine';
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    fixture.nativeElement.querySelector('button').click();
    fixture.detectChanges();

    expect(shoppingListService.clearShoppingListState).toHaveBeenCalledOnce();
  });
});
