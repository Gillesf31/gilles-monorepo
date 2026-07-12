import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  Router,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { of } from 'rxjs';
import { NewRecipe, RecipeService } from '@gilles-monorepo/recipe-data-access';
import {
  normalizeRecipeIngredients,
  Recipe,
} from '@gilles-monorepo/recipe-model';
import { EditRecipeComponent } from './edit-recipe.component';

describe(EditRecipeComponent.name, () => {
  it('loads the selected recipe and saves trimmed changes', async () => {
    const recipe = new Recipe(
      'recipe-1',
      'Soupe',
      normalizeRecipeIngredients(['Tomates']),
      ['Mixer.'],
    );
    const updateRecipe = vi.fn((id: string, value: NewRecipe) =>
      of(new Recipe(id, value.title, value.ingredients, value.instructions)),
    );

    const fixture = TestBed.configureTestingModule({
      imports: [EditRecipeComponent],
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
            updateRecipe,
          },
        },
      ],
    }).createComponent(EditRecipeComponent);
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.form.controls.title.value).toBe('Soupe');

    fixture.componentInstance.form.setValue({
      title: '  Soupe tomate  ',
      ingredients: [{ name: ' Tomates ', quantity: ' 4 ', unit: '' }],
      instructions: ['Mixer longtemps.'],
      isWorkInProgress: true,
    });
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit'));

    expect(updateRecipe).toHaveBeenCalledWith(recipe.id, {
      title: '  Soupe tomate  ',
      ingredients: [{ name: 'Tomates', quantity: '4', unit: '' }],
      instructions: ['Mixer longtemps.'],
      isWorkInProgress: true,
    });
    expect(navigate).toHaveBeenCalledWith(['/recipe', recipe.id]);
  });
});
