import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { NewRecipe, RecipeService } from '@gilles-monorepo/recipe-data-access';
import { Recipe } from '@gilles-monorepo/recipe-model';
import { AddRecipeComponent } from './add-recipe.component';

describe(AddRecipeComponent.name, () => {
  it('trims form values before creating a recipe', () => {
    const addRecipe = vi.fn((recipe: NewRecipe) =>
      of(
        new Recipe(
          'new-recipe',
          recipe.title,
          recipe.ingredients,
          recipe.instructions,
        ),
      ),
    );

    const fixture = TestBed.configureTestingModule({
      imports: [AddRecipeComponent],
      providers: [
        provideRouter([]),
        {
          provide: RecipeService,
          useValue: { addRecipe },
        },
      ],
    }).createComponent(AddRecipeComponent);
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.componentInstance.form.setValue({
      title: '  Gratin  ',
      ingredients: [
        { name: '  Pommes de terre  ', quantity: ' 1 ', unit: ' kg ' },
      ],
      instructions: ['Cuire au four.'],
    });

    fixture.componentInstance.submit();

    expect(addRecipe).toHaveBeenCalledWith({
      title: '  Gratin  ',
      ingredients: [{ name: 'Pommes de terre', quantity: '1', unit: 'kg' }],
      instructions: ['Cuire au four.'],
    });
    expect(navigate).toHaveBeenCalledWith(['/']);
  });
});
