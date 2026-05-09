import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { RecipeService } from '@gilles-monorepo/recipe-data-access';
import {
  normalizeRecipeIngredients,
  Recipe,
} from '@gilles-monorepo/recipe-model';
import { RecipeListComponent } from './recipe-list.component';

describe(RecipeListComponent.name, () => {
  it('renders recipes from the recipe service', () => {
    const recipe = new Recipe(
      'recipe-1',
      'Soupe aux tomates',
      normalizeRecipeIngredients(['Tomates', 'Basilic']),
      ['Mixer les ingrédients.'],
    );

    const fixture = TestBed.configureTestingModule({
      imports: [RecipeListComponent],
      providers: [
        provideRouter([]),
        {
          provide: RecipeService,
          useValue: {
            getRecipes: () => of([recipe]),
            deleteRecipe: vi.fn(),
          },
        },
      ],
    }).createComponent(RecipeListComponent);

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Mes recettes');
    expect(fixture.nativeElement.textContent).toContain('Soupe aux tomates');
  });
});
