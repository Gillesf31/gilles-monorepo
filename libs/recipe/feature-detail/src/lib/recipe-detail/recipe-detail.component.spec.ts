import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { of } from 'rxjs';
import { RecipeService } from '@gilles-monorepo/recipe-data-access';
import {
  normalizeRecipeIngredients,
  Recipe,
} from '@gilles-monorepo/recipe-model';
import { RecipeDetailComponent } from './recipe-detail.component';

describe(RecipeDetailComponent.name, () => {
  it('renders the selected recipe details', async () => {
    const recipe = new Recipe(
      'recipe-1',
      'Ratatouille',
      normalizeRecipeIngredients([
        { name: 'Courgette', quantity: '2', unit: 'pièce' },
      ]),
      ['Couper les légumes.', 'Laisser mijoter.'],
    );

    const fixture = TestBed.configureTestingModule({
      imports: [RecipeDetailComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ id: recipe.id })) },
        },
        {
          provide: RecipeService,
          useValue: {
            getRecipe: () => of(recipe),
            deleteRecipe: vi.fn(),
          },
        },
      ],
    }).createComponent(RecipeDetailComponent);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ratatouille');
    expect(fixture.nativeElement.textContent).toContain('Couper les légumes.');
  });
});
